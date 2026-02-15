import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import type { AnalysisRequest } from "@shared/schema";

type Analysis = z.infer<typeof api.analyses.list.responses[200]>[number];

export function useHistory() {
  return useQuery({
    queryKey: [api.analyses.list.path],
    queryFn: async () => {
      const res = await fetch(api.analyses.list.path);
      if (!res.ok) throw new Error("Failed to fetch history");
      return api.analyses.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateAnalysis() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: AnalysisRequest) => {
      const validated = api.analyses.create.input.parse(data);
      const res = await fetch(api.analyses.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.analyses.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Analysis failed");
      }
      return api.analyses.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.analyses.list.path] });
      toast({
        title: "Analysis Complete",
        description: "Your IR has been processed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export interface AudioMetrics {
  durationMs: number;
  durationSamples: number;
  peakAmplitudeDb: number;
  spectralCentroid: number;
  frequencyData: number[];
  lowEnergy: number;
  midEnergy: number;
  highEnergy: number;
  subBassEnergy: number;
  bassEnergy: number;
  lowMidEnergy: number;
  midEnergy6: number;
  highMidEnergy: number;
  presenceEnergy: number;
  ultraHighEnergy: number;
  hasClipping: boolean;
  clippedSamples: number;
  crestFactorDb: number;
  frequencySmoothness: number;
  noiseFloorDb: number;
  isTruncatedIR: boolean;
  spectralTilt: number;
  rolloffFreq: number;
  smoothScore: number;
  maxNotchDepth: number;
  notchCount: number;
  logBandEnergies: number[];
  tailLevelDb: number | null;
  tailStatus: string;
}

const ANALYSIS_WINDOW_MS = 85;
const FFT_SIZE = 8192;
const NUM_LOG_BANDS = 24;
const LOG_BAND_MIN_HZ = 80;
const LOG_BAND_MAX_HZ = 10000;

function radix2FFT(real: Float64Array, imag: Float64Array): void {
  const n = real.length;
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      let tmp = real[i]; real[i] = real[j]; real[j] = tmp;
      tmp = imag[i]; imag[i] = imag[j]; imag[j] = tmp;
    }
    let k = n >> 1;
    while (k <= j) { j -= k; k >>= 1; }
    j += k;
  }
  for (let len = 2; len <= n; len *= 2) {
    const halfLen = len >> 1;
    const angle = -2 * Math.PI / len;
    const wR = Math.cos(angle);
    const wI = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let cR = 1, cI = 0;
      for (let jj = 0; jj < halfLen; jj++) {
        const idx = i + jj;
        const idx2 = idx + halfLen;
        const tR = cR * real[idx2] - cI * imag[idx2];
        const tI = cR * imag[idx2] + cI * real[idx2];
        real[idx2] = real[idx] - tR;
        imag[idx2] = imag[idx] - tI;
        real[idx] += tR;
        imag[idx] += tI;
        const newCR = cR * wR - cI * wI;
        cI = cR * wI + cI * wR;
        cR = newCR;
      }
    }
  }
}

function computePowerSpectrum(samples: Float32Array, sampleRate: number): {
  power: Float64Array;
  binCount: number;
  binSize: number;
  freqByteData: Uint8Array;
} {
  const analysisWindowSamples = Math.min(
    samples.length,
    Math.ceil(ANALYSIS_WINDOW_MS / 1000 * sampleRate)
  );

  const real = new Float64Array(FFT_SIZE);
  const imag = new Float64Array(FFT_SIZE);

  const copyLen = Math.min(analysisWindowSamples, FFT_SIZE);
  const twoPiOverN = 2 * Math.PI / (copyLen - 1);
  for (let i = 0; i < copyLen; i++) {
    real[i] = samples[i] * (0.42 - 0.5 * Math.cos(twoPiOverN * i) + 0.08 * Math.cos(2 * twoPiOverN * i));
  }

  radix2FFT(real, imag);

  const binCount = FFT_SIZE >> 1;
  const binSize = sampleRate / FFT_SIZE;
  const power = new Float64Array(binCount);

  for (let i = 0; i < binCount; i++) {
    power[i] = real[i] * real[i] + imag[i] * imag[i];
  }

  const minDb = -100;
  const maxDb = -30;
  const dbRange = maxDb - minDb;
  const freqByteData = new Uint8Array(binCount);
  for (let i = 0; i < binCount; i++) {
    const mag = Math.sqrt(power[i]);
    const db = mag > 0 ? 20 * Math.log10(mag / FFT_SIZE) : -200;
    const clamped = Math.max(minDb, Math.min(maxDb, db));
    freqByteData[i] = Math.round(((clamped - minDb) / dbRange) * 255);
  }

  return { power, binCount, binSize, freqByteData };
}

function buildLogBands(power: Float64Array, binSize: number, binCount: number): number[] {
  const logMin = Math.log(LOG_BAND_MIN_HZ);
  const logMax = Math.log(LOG_BAND_MAX_HZ);
  const logStep = (logMax - logMin) / NUM_LOG_BANDS;

  const bandEnergies: number[] = [];

  for (let b = 0; b < NUM_LOG_BANDS; b++) {
    const fLow = Math.exp(logMin + b * logStep);
    const fHigh = Math.exp(logMin + (b + 1) * logStep);
    const binLow = Math.max(1, Math.floor(fLow / binSize));
    const binHigh = Math.min(binCount - 1, Math.ceil(fHigh / binSize));

    let energy = 0;
    for (let k = binLow; k <= binHigh; k++) {
      energy += power[k];
    }
    bandEnergies.push(energy);
  }

  return bandEnergies;
}

function normalizeVector(v: number[]): number[] {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i];
  if (sum <= 0) return v.map(() => 0);
  return v.map(x => x / sum);
}

function computeDisplayBands(power: Float64Array, binSize: number, binCount: number) {
  const bands = [
    { name: "subBass", low: 20, high: 120 },
    { name: "bass", low: 120, high: 250 },
    { name: "lowMid", low: 250, high: 500 },
    { name: "mid", low: 500, high: 2000 },
    { name: "highMid", low: 2000, high: 4000 },
    { name: "presence", low: 4000, high: 8000 },
    { name: "air", low: 8000, high: 20000 },
  ];

  let totalEnergy = 0;
  const rawEnergies: number[] = [];

  for (const band of bands) {
    const binLow = Math.max(1, Math.floor(band.low / binSize));
    const binHigh = Math.min(binCount - 1, Math.ceil(band.high / binSize));
    let energy = 0;
    for (let k = binLow; k <= binHigh; k++) {
      energy += power[k];
    }
    rawEnergies.push(energy);
    totalEnergy += energy;
  }

  let lowSum = 0;
  const binLow20 = Math.max(1, Math.floor(20 / binSize));
  const binHigh250 = Math.min(binCount - 1, Math.ceil(250 / binSize));
  for (let k = binLow20; k <= binHigh250; k++) lowSum += power[k];

  let midSum = 0;
  const binLow250 = Math.max(1, Math.floor(250 / binSize));
  const binHigh4000 = Math.min(binCount - 1, Math.ceil(4000 / binSize));
  for (let k = binLow250; k <= binHigh4000; k++) midSum += power[k];

  let highSum = 0;
  const binLow4000 = Math.max(1, Math.floor(4000 / binSize));
  const binHigh20000 = Math.min(binCount - 1, Math.ceil(20000 / binSize));
  for (let k = binLow4000; k <= binHigh20000; k++) highSum += power[k];

  const totalLMH = lowSum + midSum + highSum;

  return {
    subBassEnergy: totalEnergy > 0 ? rawEnergies[0] / totalEnergy : 0,
    bassEnergy: totalEnergy > 0 ? rawEnergies[1] / totalEnergy : 0,
    lowMidEnergy: totalEnergy > 0 ? rawEnergies[2] / totalEnergy : 0,
    midEnergy6: totalEnergy > 0 ? rawEnergies[3] / totalEnergy : 0,
    highMidEnergy: totalEnergy > 0 ? rawEnergies[4] / totalEnergy : 0,
    presenceEnergy: totalEnergy > 0 ? rawEnergies[5] / totalEnergy : 0,
    ultraHighEnergy: totalEnergy > 0 ? rawEnergies[6] / totalEnergy : 0,
    lowEnergy: totalLMH > 0 ? lowSum / totalLMH : 0,
    midEnergy: totalLMH > 0 ? midSum / totalLMH : 0,
    highEnergy: totalLMH > 0 ? highSum / totalLMH : 0,
  };
}

function computeSpectralCentroid(power: Float64Array, binSize: number, binCount: number): number {
  let num = 0;
  let den = 0;
  for (let k = 1; k < binCount; k++) {
    const freq = k * binSize;
    if (freq > 20000) break;
    num += freq * power[k];
    den += power[k];
  }
  return den > 0 ? num / den : 0;
}

function computeSpectralTilt(power: Float64Array, binSize: number, binCount: number): number {
  const minFreq = 200;
  const maxFreq = 8000;
  const xs: number[] = [];
  const ys: number[] = [];

  for (let k = 1; k < binCount; k++) {
    const freq = k * binSize;
    if (freq < minFreq) continue;
    if (freq > maxFreq) break;
    if (power[k] <= 0) continue;
    xs.push(Math.log(freq));
    ys.push(Math.log(power[k]));
  }

  if (xs.length < 10) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  const n = xs.length;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumXX += xs[i] * xs[i];
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function computeRolloff(power: Float64Array, binSize: number, binCount: number, threshold: number = 0.85): number {
  let totalEnergy = 0;
  for (let k = 1; k < binCount; k++) {
    const freq = k * binSize;
    if (freq > 20000) break;
    totalEnergy += power[k];
  }

  const target = totalEnergy * threshold;
  let cumulative = 0;
  for (let k = 1; k < binCount; k++) {
    const freq = k * binSize;
    if (freq > 20000) break;
    cumulative += power[k];
    if (cumulative >= target) return freq;
  }
  return 20000;
}

function computePerceptualSmoothness(logBandEnergies: number[]): {
  smoothScore: number;
  maxNotchDepth: number;
  notchCount: number;
} {
  const n = logBandEnergies.length;
  if (n < 5) return { smoothScore: 100, maxNotchDepth: 0, notchCount: 0 };

  const dbBands = logBandEnergies.map(e => e > 0 ? 10 * Math.log10(e) : -120);

  const smoothed: number[] = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - 2); j <= Math.min(n - 1, i + 2); j++) {
      sum += dbBands[j];
      count++;
    }
    smoothed.push(sum / count);
  }

  const residuals: number[] = [];
  let maxNotchDepth = 0;
  let notchCount = 0;
  const analysisStart = 2;
  const analysisEnd = n - 1;

  for (let i = analysisStart; i < analysisEnd; i++) {
    const r = dbBands[i] - smoothed[i];
    residuals.push(r);
    const depth = -r;
    if (depth > maxNotchDepth) maxNotchDepth = depth;
    if (depth > 6) notchCount++;
  }

  if (residuals.length === 0) return { smoothScore: 100, maxNotchDepth: 0, notchCount: 0 };

  let rmsSum = 0;
  for (const r of residuals) rmsSum += r * r;
  const residualRMS = Math.sqrt(rmsSum / residuals.length);

  const maxRMS = 12;
  const smoothScore = Math.max(0, Math.min(100, 100 * (1 - residualRMS / maxRMS)));

  return {
    smoothScore: parseFloat(smoothScore.toFixed(1)),
    maxNotchDepth: parseFloat(maxNotchDepth.toFixed(1)),
    notchCount,
  };
}

function computeTailLevel(channelData: Float32Array, sampleRate: number): {
  tailLevelDb: number | null;
  tailStatus: string;
  noiseFloorDb: number;
  isTruncatedIR: boolean;
} {
  const irDurationMs = (channelData.length / sampleRate) * 1000;
  const isTruncatedIR = irDurationMs < 200;

  if (irDurationMs < 200) {
    const quarters = 4;
    const qLen = Math.floor(channelData.length / quarters);
    let noiseFloorDb: number;

    if (channelData.length < 16 || qLen < 8) {
      noiseFloorDb = -72;
    } else {
      const qRms: number[] = [];
      for (let q = 0; q < quarters; q++) {
        const qStart = q * qLen;
        const qEnd = q === quarters - 1 ? channelData.length : qStart + qLen;
        let qSum = 0;
        for (let i = qStart; i < qEnd; i++) qSum += channelData[i] * channelData[i];
        qRms.push(Math.sqrt(qSum / (qEnd - qStart)));
      }
      const q1Db = qRms[0] > 0 ? 20 * Math.log10(qRms[0]) : -96;
      const q4Db = qRms[3] > 0 ? 20 * Math.log10(qRms[3]) : -96;

      if (qRms[0] > 0 && qRms[3] > 0 && qRms[0] > qRms[3]) {
        const decayDb = q1Db - q4Db;
        const spanMs = ((quarters - 1) * qLen / sampleRate) * 1000;
        const decayRatePerMs = spanMs > 0 ? decayDb / spanMs : 0;
        const extrapolated = q1Db - (decayRatePerMs * 200);
        noiseFloorDb = Math.max(-96, Math.min(-40, extrapolated));
      } else {
        noiseFloorDb = -72;
      }
    }

    return {
      tailLevelDb: null,
      tailStatus: "N/A (short IR)",
      noiseFloorDb,
      isTruncatedIR,
    };
  }

  const tailStartMs = 120;
  const tailEndMs = 200;
  const tailStartSample = Math.floor(tailStartMs / 1000 * sampleRate);
  const tailEndSample = Math.min(channelData.length, Math.ceil(tailEndMs / 1000 * sampleRate));

  if (tailEndSample <= tailStartSample) {
    return { tailLevelDb: null, tailStatus: "N/A", noiseFloorDb: -72, isTruncatedIR };
  }

  let peak = 0;
  for (let i = 0; i < channelData.length; i++) {
    const abs = Math.abs(channelData[i]);
    if (abs > peak) peak = abs;
  }

  let tailSum = 0;
  for (let i = tailStartSample; i < tailEndSample; i++) {
    tailSum += channelData[i] * channelData[i];
  }
  const tailRms = Math.sqrt(tailSum / (tailEndSample - tailStartSample));
  const tailLevelDb = peak > 0 && tailRms > 0 ? 20 * Math.log10(tailRms / peak) : -96;

  const windowMs = 15;
  const windowSamples = Math.max(4, Math.floor(sampleRate * (windowMs / 1000)));
  const scanStart = Math.floor(channelData.length * 0.4);
  const stepSamples = Math.max(1, Math.floor(windowSamples / 2));
  let quietestRms = Infinity;

  for (let start = scanStart; start + windowSamples <= channelData.length; start += stepSamples) {
    let windowSum = 0;
    for (let i = start; i < start + windowSamples; i++) windowSum += channelData[i] * channelData[i];
    const wRms = Math.sqrt(windowSum / windowSamples);
    if (wRms < quietestRms) quietestRms = wRms;
  }

  const tailStartScan = Math.max(0, channelData.length - windowSamples);
  let tailScanSum = 0;
  for (let i = tailStartScan; i < channelData.length; i++) tailScanSum += channelData[i] * channelData[i];
  const tailScanRms = Math.sqrt(tailScanSum / (channelData.length - tailStartScan));
  quietestRms = Math.min(quietestRms, tailScanRms);

  let noiseFloorDb: number;
  if (quietestRms === Infinity || quietestRms <= 0) {
    noiseFloorDb = -96;
  } else {
    noiseFloorDb = 20 * Math.log10(quietestRms);
  }

  return {
    tailLevelDb: parseFloat(tailLevelDb.toFixed(1)),
    tailStatus: `${tailLevelDb.toFixed(1)} dBFS rel peak`,
    noiseFloorDb: parseFloat(noiseFloorDb.toFixed(1)),
    isTruncatedIR,
  };
}

export async function analyzeAudioFile(file: File): Promise<AudioMetrics> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const durationSamples = audioBuffer.length;
  const durationMs = Math.round(audioBuffer.duration * 1000);
  const sampleRate = audioBuffer.sampleRate;

  const channelData = audioBuffer.getChannelData(0);
  let peak = 0;
  let rmsSum = 0;
  let clippedSamples = 0;
  const clippingThreshold = 0.99;

  for (let i = 0; i < channelData.length; i++) {
    const sample = channelData[i];
    const abs = Math.abs(sample);
    if (abs > peak) peak = abs;
    rmsSum += sample * sample;
    if (abs >= clippingThreshold) clippedSamples++;
  }

  const rms = Math.sqrt(rmsSum / channelData.length);
  const crestFactorLinear = peak > 0 ? peak / rms : 1;
  const crestFactorDb = 20 * Math.log10(crestFactorLinear);
  const clippingRatio = clippedSamples / channelData.length;
  const hasClipping = clippingRatio > 0.001 || crestFactorDb < 6;

  if (peak > 0 && peak < 1.0) {
    const scale = 1.0 / peak;
    for (let i = 0; i < channelData.length; i++) channelData[i] *= scale;
    peak = 1.0;
  }

  const peakAmplitudeDb = peak > 0 ? 20 * Math.log10(peak) : -96;

  const { power, binCount, binSize, freqByteData } = computePowerSpectrum(channelData, sampleRate);

  const spectralCentroid = computeSpectralCentroid(power, binSize, binCount);

  const spectralTilt = computeSpectralTilt(power, binSize, binCount);

  const rolloffFreq = computeRolloff(power, binSize, binCount, 0.85);

  const logBandEnergies = buildLogBands(power, binSize, binCount);
  const normalizedLogBands = normalizeVector(logBandEnergies);

  const { smoothScore, maxNotchDepth, notchCount } = computePerceptualSmoothness(logBandEnergies);

  const displayBands = computeDisplayBands(power, binSize, binCount);

  const frequencyData: number[] = [];
  for (let i = 0; i < freqByteData.length; i++) {
    frequencyData.push(freqByteData[i]);
  }

  const tail = computeTailLevel(channelData, sampleRate);

  return {
    durationMs,
    durationSamples,
    peakAmplitudeDb: parseFloat(peakAmplitudeDb.toFixed(2)),
    spectralCentroid: parseFloat(spectralCentroid.toFixed(2)),
    frequencyData,
    lowEnergy: parseFloat(displayBands.lowEnergy.toFixed(4)),
    midEnergy: parseFloat(displayBands.midEnergy.toFixed(4)),
    highEnergy: parseFloat(displayBands.highEnergy.toFixed(4)),
    subBassEnergy: parseFloat(displayBands.subBassEnergy.toFixed(4)),
    bassEnergy: parseFloat(displayBands.bassEnergy.toFixed(4)),
    lowMidEnergy: parseFloat(displayBands.lowMidEnergy.toFixed(4)),
    midEnergy6: parseFloat(displayBands.midEnergy6.toFixed(4)),
    highMidEnergy: parseFloat(displayBands.highMidEnergy.toFixed(4)),
    presenceEnergy: parseFloat(displayBands.presenceEnergy.toFixed(4)),
    ultraHighEnergy: parseFloat(displayBands.ultraHighEnergy.toFixed(4)),
    hasClipping,
    clippedSamples,
    crestFactorDb: parseFloat(crestFactorDb.toFixed(2)),
    frequencySmoothness: smoothScore,
    noiseFloorDb: parseFloat(tail.noiseFloorDb.toFixed(1)),
    isTruncatedIR: tail.isTruncatedIR,
    spectralTilt: parseFloat(spectralTilt.toFixed(4)),
    rolloffFreq: parseFloat(rolloffFreq.toFixed(0)),
    smoothScore: smoothScore,
    maxNotchDepth: maxNotchDepth,
    notchCount: notchCount,
    logBandEnergies: normalizedLogBands.map(v => parseFloat(v.toFixed(6))),
    tailLevelDb: tail.tailLevelDb,
    tailStatus: tail.tailStatus,
  };
}
