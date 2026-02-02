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
  hasClipping: boolean;      // True if clipping detected
  clippedSamples: number;    // Number of samples at max amplitude
  crestFactorDb: number;     // Peak to RMS ratio in dB (lower = more clipping)
  // New quality metrics
  frequencySmoothness: number;  // 0-100, higher = smoother frequency response (fewer peaks/notches)
  noiseFloorDb: number;         // dB below peak, lower (more negative) = cleaner IR
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
  // We'll create a simplified spectral centroid and freq data for the graph
  // For short IRs (e.g., 2048 samples), use a smaller FFT size to avoid
  // artificial smoothing from zero-padding
  const irLength = channelData.length;
  
  // Find the largest power-of-2 FFT size that fits the IR, clamped to [512, 8192]
  // This prevents zero-padding from artificially smoothing the frequency response
  let fftSize = 8192;
  if (irLength < 8192) {
    // Find the largest power of 2 <= irLength
    fftSize = Math.pow(2, Math.floor(Math.log2(irLength)));
    // Clamp to minimum 512 for reasonable resolution
    fftSize = Math.max(512, fftSize);
  }
  
  const offlineCtx = new OfflineAudioContext(1, fftSize, audioBuffer.sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  
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

  // Energy band accumulators
  let lowEnergySum = 0;
  let midEnergySum = 0;
  let highEnergySum = 0;
  let totalEnergy = 0;

  for (let i = 0; i < freqByteData.length; i++) {
    const magnitude = freqByteData[i];
    const frequency = i * binSize;
    
    numerator += frequency * magnitude;
    denominator += magnitude;
    
    frequencyData.push(magnitude);
    
    // Accumulate energy by frequency band
    const energy = magnitude * magnitude;
    totalEnergy += energy;
    
    if (frequency >= 20 && frequency < 250) {
      lowEnergySum += energy;
    } else if (frequency >= 250 && frequency < 4000) {
      midEnergySum += energy;
    } else if (frequency >= 4000 && frequency <= 20000) {
      highEnergySum += energy;
    }
  }
  
  const spectralCentroid = denominator > 0 ? numerator / denominator : 0;
  
  // Normalize energy bands (0-1)
  const lowEnergy = totalEnergy > 0 ? lowEnergySum / totalEnergy : 0;
  const midEnergy = totalEnergy > 0 ? midEnergySum / totalEnergy : 0;
  const highEnergy = totalEnergy > 0 ? highEnergySum / totalEnergy : 0;

  // ============================================
  // Frequency Response Smoothness
  // Measures how "bumpy" vs "smooth" the frequency curve is
  // Lower variance between adjacent bins = smoother = better
  // ============================================
  let smoothnessVarianceSum = 0;
  let smoothnessCount = 0;
  
  // Focus on actual guitar speaker output range (75Hz - 5kHz)
  // Guitar speakers: 70-75 Hz to 5000 Hz typical response
  // Above 5-6kHz has minimal musical content for cab IRs
  const minBin = Math.floor(75 / binSize);
  const maxBin = Math.min(Math.floor(5000 / binSize), freqByteData.length - 1);
  
  // Use a sliding window to detect peaks/notches
  // Compare each bin to a local average (5-bin window)
  const windowSize = 5;
  for (let i = minBin + windowSize; i < maxBin - windowSize; i++) {
    // Calculate local average
    let localSum = 0;
    for (let j = i - windowSize; j <= i + windowSize; j++) {
      localSum += freqByteData[j];
    }
    const localAvg = localSum / (windowSize * 2 + 1);
    
    // Deviation from local average (peaks/notches will have high deviation)
    const deviation = Math.abs(freqByteData[i] - localAvg);
    smoothnessVarianceSum += deviation;
    smoothnessCount++;
  }
  
  // Convert to 0-100 score (lower variance = higher score)
  // The 75Hz-5kHz range focuses on the active midrange where guitar speakers
  // naturally have more peaks/character.
  // 
  // IMPORTANT: Scale the expected deviation based on FFT size
  // Smaller FFTs have coarser frequency resolution, which means:
  // - Each bin covers a wider frequency range
  // - More natural variation between adjacent bins
  // - Higher raw deviation values for the same actual smoothness
  //
  // Baseline: FFT 8192 with maxExpectedDeviation = 25
  // Scale factor: sqrt(8192 / fftSize) to account for resolution difference
  const avgDeviation = smoothnessCount > 0 ? smoothnessVarianceSum / smoothnessCount : 0;
  const baselineFFT = 8192;
  const scaleFactor = Math.sqrt(baselineFFT / fftSize);
  const maxExpectedDeviation = 25 * scaleFactor; // Scale based on FFT resolution
  const frequencySmoothness = Math.max(0, Math.min(100, 100 * (1 - avgDeviation / maxExpectedDeviation)));

  // ============================================
  // Noise Floor Measurement
  // Analyze the tail of the IR vs the peak
  // Lower noise floor = cleaner capture
  // 
  // For short truncated IRs (< 100ms), there's no real "tail" - the decay
  // is intentionally cut off for amp modelers. Use adaptive approach:
  // - Long IRs (100ms+): Analyze last 30ms as true tail
  // - Short IRs (<100ms): Analyze last 10% as best approximation
  // ============================================
  const sampleRate = audioBuffer.sampleRate;
  const irDurationMs = (channelData.length / sampleRate) * 1000;
  
  let tailStartSample: number;
  if (irDurationMs >= 100) {
    // Long IR: use fixed 30ms tail
    tailStartSample = Math.max(0, channelData.length - Math.floor(sampleRate * 0.03));
  } else {
    // Short IR: use last 10% of samples (more meaningful for truncated IRs)
    tailStartSample = Math.max(0, Math.floor(channelData.length * 0.9));
  }
  const tailEndSample = channelData.length;
  
  let tailRmsSum = 0;
  let tailSampleCount = 0;
  
  for (let i = tailStartSample; i < tailEndSample; i++) {
    tailRmsSum += channelData[i] * channelData[i];
    tailSampleCount++;
  }
  
  const tailRms = tailSampleCount > 0 ? Math.sqrt(tailRmsSum / tailSampleCount) : 0;
  
  // Noise floor in dB relative to peak (before normalization, use original peak)
  // More negative = cleaner
  // Good IRs: -50 to -70 dB, Noisy IRs: -30 to -40 dB
  // Note: For short truncated IRs, this measures the end of the decay, not true noise floor
  const noiseFloorDb = tailRms > 0 ? 20 * Math.log10(tailRms) : -96;

  return {
    durationMs,
    durationSamples,
    peakAmplitudeDb: parseFloat(peakAmplitudeDb.toFixed(2)),
    spectralCentroid: parseFloat(spectralCentroid.toFixed(2)),
    frequencyData,
    lowEnergy: parseFloat(lowEnergy.toFixed(4)),
    midEnergy: parseFloat(midEnergy.toFixed(4)),
    highEnergy: parseFloat(highEnergy.toFixed(4)),
    hasClipping,
    clippedSamples,
    crestFactorDb: parseFloat(crestFactorDb.toFixed(2)),
    frequencySmoothness: parseFloat(frequencySmoothness.toFixed(1)),
    noiseFloorDb: parseFloat(noiseFloorDb.toFixed(1)),
  };
}
