import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import type { AnalysisRequest } from "@shared/schema";

// ============================================
// Types
// ============================================

// Derived types matching the schema/routes
type Analysis = z.infer<typeof api.analyses.list.responses[200]>[number];

// ============================================
// API Hooks
// ============================================

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
      // Validate input against schema before sending
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

// ============================================
// Audio Analysis Utility
// ============================================

export interface AudioMetrics {
  durationMs: number;
  durationSamples: number;
  peakAmplitudeDb: number;
  spectralCentroid: number;
  frequencyData: number[]; // Normalized 0-100 for visualization
  lowEnergy: number;   // 0-1, energy in low frequency range (20-250Hz)
  midEnergy: number;   // 0-1, energy in mid frequency range (250-4000Hz)
  highEnergy: number;  // 0-1, energy in high frequency range (4000-20000Hz)
  // 6-band energy breakdown for detailed tonal analysis
  subBassEnergy: number;    // 0-1, 20-120Hz (sub-bass, rumble)
  bassEnergy: number;       // 0-1, 120-250Hz (bass, proximity effect zone)
  lowMidEnergy: number;     // 0-1, 250-500Hz (warmth, body, mud zone)
  midEnergy6: number;       // 0-1, 500-2000Hz (presence, punch, clarity)
  highMidEnergy: number;    // 0-1, 2000-4000Hz (bite, articulation, harsh zone)
  presenceEnergy: number;   // 0-1, 4000-8000Hz (fizz, sizzle, air)
  ultraHighEnergy: number;  // 0-1, 8000-20000Hz (sparkle, ultra-high fizz)
  hasClipping: boolean;      // True if clipping detected
  clippedSamples: number;    // Number of samples at max amplitude
  crestFactorDb: number;     // Peak to RMS ratio in dB (lower = more clipping)
  // Quality metrics
  frequencySmoothness: number;  // 0-100, higher = smoother frequency response (fewer peaks/notches)
  noiseFloorDb: number;         // dB below peak, lower (more negative) = cleaner IR
  isTruncatedIR: boolean;       // True if IR is < 200ms (tail level vs true noise floor)
}

export async function analyzeAudioFile(file: File): Promise<AudioMetrics> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // 1. Duration
  const durationSamples = audioBuffer.length;
  const durationMs = Math.round(audioBuffer.duration * 1000);

  // 2. Peak Amplitude and Clipping Detection (before normalization)
  const channelData = audioBuffer.getChannelData(0);
  let peak = 0;
  let rmsSum = 0;
  let clippedSamples = 0;
  const clippingThreshold = 0.99; // Samples above this are considered clipped
  
  // Analyze full waveform for clipping detection
  for (let i = 0; i < channelData.length; i++) {
    const sample = channelData[i];
    const abs = Math.abs(sample);
    
    if (abs > peak) peak = abs;
    rmsSum += sample * sample;
    
    // Count samples at or near max amplitude (clipping indicator)
    if (abs >= clippingThreshold) {
      clippedSamples++;
    }
  }
  
  // Calculate RMS and crest factor BEFORE normalization
  const rms = Math.sqrt(rmsSum / channelData.length);
  const crestFactorLinear = peak > 0 ? peak / rms : 1;
  const crestFactorDb = 20 * Math.log10(crestFactorLinear);
  
  // Clipping detection: 
  // - More than 0.1% of samples at max = likely clipping
  // - Crest factor below 6dB is suspicious for IRs (typically 10-20dB)
  const clippingRatio = clippedSamples / channelData.length;
  const hasClipping = clippingRatio > 0.001 || crestFactorDb < 6;

  // Normalize channel data to 0dB peak
  if (peak > 0 && peak < 1.0) {
    const scale = 1.0 / peak;
    for (let i = 0; i < channelData.length; i++) {
      channelData[i] *= scale;
    }
    peak = 1.0; // After normalization, peak is 1.0 (0dB)
  }

  // Convert linear amplitude to dBFS (assuming float32 -1.0 to 1.0)
  const peakAmplitudeDb = peak > 0 ? 20 * Math.log10(peak) : -96;

  // 3. Spectral Analysis (Quick FFT approximation via OfflineContext)
  //
  // CRITICAL: Use a FIXED FFT size (8192) for ALL IRs regardless of length.
  // Variable FFT sizes produce different frequency resolution, which changes
  // the energy distribution across bands — making identical recordings at
  // different sample lengths produce wildly different tonal breakdowns.
  //
  // Zero-padding short IRs to 8192 is acoustically correct for IRs:
  // it adds frequency resolution without altering the frequency content.
  // The IR's spectral character is fully defined by its time-domain samples;
  // zeros after the signal only interpolate between existing frequency bins.
  const fftSize = 8192;
  
  // If the IR is shorter than fftSize, create a zero-padded buffer
  let analysisBuffer = audioBuffer;
  if (audioBuffer.length < fftSize) {
    const paddedCtx = new OfflineAudioContext(1, fftSize, audioBuffer.sampleRate);
    const paddedBuffer = paddedCtx.createBuffer(1, fftSize, audioBuffer.sampleRate);
    const paddedData = paddedBuffer.getChannelData(0);
    const srcData = audioBuffer.getChannelData(0);
    for (let i = 0; i < srcData.length; i++) {
      paddedData[i] = srcData[i];
    }
    // Rest is already zeros (Float32Array default)
    analysisBuffer = paddedBuffer;
  }
  
  const offlineCtx = new OfflineAudioContext(1, fftSize, audioBuffer.sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = analysisBuffer;
  
  const analyser = offlineCtx.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = 0; // Snapshot
  
  source.connect(analyser);
  analyser.connect(offlineCtx.destination);
  source.start(0);
  
  await offlineCtx.startRendering();
  
  // Get frequency data from the analyser
  const freqByteData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(freqByteData);
  
  // Calculate Spectral Centroid (Brightness)
  let numerator = 0;
  let denominator = 0;
  const binSize = audioBuffer.sampleRate / analyser.fftSize;
  
  const frequencyData: number[] = [];

  // Energy band accumulators - 3 band (legacy)
  let lowEnergySum = 0;
  let midEnergySum = 0;
  let highEnergySum = 0;
  let totalEnergy = 0;
  
  // 6-band energy accumulators for detailed tonal analysis
  let subBassSum = 0;     // 20-120Hz (sub-bass, rumble)
  let bassSum = 0;        // 120-250Hz (bass, proximity effect zone)
  let lowMidSum = 0;      // 250-500Hz (warmth, body, mud zone)
  let midSum6 = 0;        // 500-2000Hz (presence, punch, clarity)
  let highMidSum = 0;     // 2000-4000Hz (bite, articulation, harsh zone)
  let presenceSum = 0;    // 4000-8000Hz (fizz, sizzle, air)
  let ultraHighSum = 0;   // 8000-20000Hz (sparkle, ultra-high fizz)

  for (let i = 0; i < freqByteData.length; i++) {
    const magnitude = freqByteData[i];
    const frequency = i * binSize;
    
    numerator += frequency * magnitude;
    denominator += magnitude;
    
    frequencyData.push(magnitude);
    
    // Accumulate energy by frequency band
    const energy = magnitude * magnitude;
    totalEnergy += energy;
    
    // Legacy 3-band accumulation
    if (frequency >= 20 && frequency < 250) {
      lowEnergySum += energy;
    } else if (frequency >= 250 && frequency < 4000) {
      midEnergySum += energy;
    } else if (frequency >= 4000 && frequency <= 20000) {
      highEnergySum += energy;
    }
    
    // 6-band accumulation for detailed analysis
    if (frequency >= 20 && frequency < 120) {
      subBassSum += energy;
    } else if (frequency >= 120 && frequency < 250) {
      bassSum += energy;
    } else if (frequency >= 250 && frequency < 500) {
      lowMidSum += energy;
    } else if (frequency >= 500 && frequency < 2000) {
      midSum6 += energy;
    } else if (frequency >= 2000 && frequency < 4000) {
      highMidSum += energy;
    } else if (frequency >= 4000 && frequency < 8000) {
      presenceSum += energy;
    } else if (frequency >= 8000 && frequency <= 20000) {
      ultraHighSum += energy;
    }
  }
  
  const spectralCentroid = denominator > 0 ? numerator / denominator : 0;
  
  // Normalize energy bands (0-1)
  const lowEnergy = totalEnergy > 0 ? lowEnergySum / totalEnergy : 0;
  const midEnergy = totalEnergy > 0 ? midEnergySum / totalEnergy : 0;
  const highEnergy = totalEnergy > 0 ? highEnergySum / totalEnergy : 0;
  
  // Normalize 6-band energy
  const subBassEnergy = totalEnergy > 0 ? subBassSum / totalEnergy : 0;
  const bassEnergy = totalEnergy > 0 ? bassSum / totalEnergy : 0;
  const lowMidEnergy = totalEnergy > 0 ? lowMidSum / totalEnergy : 0;
  const midEnergy6 = totalEnergy > 0 ? midSum6 / totalEnergy : 0;
  const highMidEnergy = totalEnergy > 0 ? highMidSum / totalEnergy : 0;
  const presenceEnergy = totalEnergy > 0 ? presenceSum / totalEnergy : 0;
  const ultraHighEnergy = totalEnergy > 0 ? ultraHighSum / totalEnergy : 0;

  // ============================================
  // Frequency Response Smoothness (sample-size-independent)
  //
  // Zero-padding short IRs to a fixed FFT size creates spectral interpolation
  // that artificially smooths the frequency response. An 85-sample IR padded
  // to 8192 has ~96x interpolation; a 171-sample IR has ~48x. This makes
  // shorter versions of the same IR appear smoother.
  //
  // Fix: Scale the sliding window to match the IR's actual frequency
  // resolution (sampleRate / originalLength). This way the window always
  // spans approximately one resolution bandwidth, producing consistent
  // smoothness scores regardless of sample count.
  // ============================================
  const originalLength = audioBuffer.length;
  const interpolationFactor = Math.max(1, Math.round(fftSize / originalLength));
  let smoothnessVarianceSum = 0;
  let smoothnessCount = 0;
  
  const minBin = Math.floor(75 / binSize);
  const maxBin = Math.min(Math.floor(5000 / binSize), freqByteData.length - 1);
  
  const smoothWindowSize = Math.max(5, Math.ceil(interpolationFactor / 2));
  const smoothStep = Math.max(1, Math.floor(interpolationFactor / 2));
  for (let i = minBin + smoothWindowSize; i < maxBin - smoothWindowSize; i += smoothStep) {
    let localSum = 0;
    for (let j = i - smoothWindowSize; j <= i + smoothWindowSize; j++) {
      localSum += freqByteData[j];
    }
    const localAvg = localSum / (smoothWindowSize * 2 + 1);
    
    const deviation = Math.abs(freqByteData[i] - localAvg);
    smoothnessVarianceSum += deviation;
    smoothnessCount++;
  }
  
  const avgDeviation = smoothnessCount > 0 ? smoothnessVarianceSum / smoothnessCount : 0;
  const maxExpectedDeviation = 25;
  const frequencySmoothness = Math.max(0, Math.min(100, 100 * (1 - avgDeviation / maxExpectedDeviation)));

  // ============================================
  // Noise Floor Measurement (sample-size-independent)
  //
  // Problem: Very short IRs (e.g. 85 samples at 48kHz = 1.8ms) have no
  // quiet tail region — the entire signal is active impulse/decay. Measuring
  // a 15ms window is impossible when the IR is only 1.8ms long, and even
  // scanning for the "quietest region" gives the decay energy, not noise.
  //
  // Solution: Estimate noise floor from the IR's decay rate.
  // 1. Measure energy in early vs late portions of the signal
  // 2. Calculate dB/ms decay rate
  // 3. Extrapolate to a reference point (200ms) to estimate where the
  //    signal would naturally decay to — this is the effective noise floor
  // 4. For long IRs (>10ms), use the traditional scanning approach
  // ============================================
  const sampleRate = audioBuffer.sampleRate;
  const irDurationMs = (channelData.length / sampleRate) * 1000;
  const isTruncatedIR = irDurationMs < 200;

  let noiseFloorDb: number;

  if (irDurationMs < 10) {
    const halfPoint = Math.floor(channelData.length / 2);
    let earlySum = 0;
    let lateSum = 0;
    for (let i = 0; i < halfPoint; i++) {
      earlySum += channelData[i] * channelData[i];
    }
    for (let i = halfPoint; i < channelData.length; i++) {
      lateSum += channelData[i] * channelData[i];
    }
    const earlyRms = Math.sqrt(earlySum / halfPoint);
    const lateRms = Math.sqrt(lateSum / (channelData.length - halfPoint));

    if (earlyRms > 0 && lateRms > 0 && earlyRms > lateRms) {
      const earlyDb = 20 * Math.log10(earlyRms);
      const lateDb = 20 * Math.log10(lateRms);
      const decayDb = earlyDb - lateDb;
      const halfDurationMs = (halfPoint / sampleRate) * 1000;
      const decayRatePerMs = halfDurationMs > 0 ? decayDb / halfDurationMs : 0;
      const referenceMs = 200;
      noiseFloorDb = Math.min(-60, earlyDb - (decayRatePerMs * referenceMs));
    } else {
      noiseFloorDb = -96;
    }
  } else {
    const windowMs = 15;
    const adaptiveWindowMs = Math.min(windowMs, irDurationMs * 0.2);
    const windowSamples = Math.max(4, Math.floor(sampleRate * (adaptiveWindowMs / 1000)));

    const scanStart = Math.floor(channelData.length * 0.4);
    const stepSamples = Math.max(1, Math.floor(windowSamples / 2));
    let quietestRms = Infinity;

    for (let start = scanStart; start + windowSamples <= channelData.length; start += stepSamples) {
      let windowSum = 0;
      for (let i = start; i < start + windowSamples; i++) {
        windowSum += channelData[i] * channelData[i];
      }
      const windowRms = Math.sqrt(windowSum / windowSamples);
      if (windowRms < quietestRms) {
        quietestRms = windowRms;
      }
    }

    if (!isTruncatedIR) {
      const tailStart = Math.max(0, channelData.length - windowSamples);
      let tailSum = 0;
      for (let i = tailStart; i < channelData.length; i++) {
        tailSum += channelData[i] * channelData[i];
      }
      const tailRms = Math.sqrt(tailSum / (channelData.length - tailStart));
      quietestRms = Math.min(quietestRms, tailRms);
    }

    if (quietestRms === Infinity || quietestRms <= 0) {
      noiseFloorDb = -96;
    } else {
      noiseFloorDb = 20 * Math.log10(quietestRms);
    }
  }

  return {
    durationMs,
    durationSamples,
    peakAmplitudeDb: parseFloat(peakAmplitudeDb.toFixed(2)),
    spectralCentroid: parseFloat(spectralCentroid.toFixed(2)),
    frequencyData,
    lowEnergy: parseFloat(lowEnergy.toFixed(4)),
    midEnergy: parseFloat(midEnergy.toFixed(4)),
    highEnergy: parseFloat(highEnergy.toFixed(4)),
    // 6-band detailed breakdown
    subBassEnergy: parseFloat(subBassEnergy.toFixed(4)),
    bassEnergy: parseFloat(bassEnergy.toFixed(4)),
    lowMidEnergy: parseFloat(lowMidEnergy.toFixed(4)),
    midEnergy6: parseFloat(midEnergy6.toFixed(4)),
    highMidEnergy: parseFloat(highMidEnergy.toFixed(4)),
    presenceEnergy: parseFloat(presenceEnergy.toFixed(4)),
    ultraHighEnergy: parseFloat(ultraHighEnergy.toFixed(4)),
    hasClipping,
    clippedSamples,
    crestFactorDb: parseFloat(crestFactorDb.toFixed(2)),
    frequencySmoothness: parseFloat(frequencySmoothness.toFixed(1)),
    noiseFloorDb: parseFloat(noiseFloorDb.toFixed(1)),
    isTruncatedIR,
  };
}
