import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import type { InsertAnalysis } from "@shared/schema";

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
    mutationFn: async (data: InsertAnalysis) => {
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
}

export async function analyzeAudioFile(file: File): Promise<AudioMetrics> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // 1. Duration
  const durationSamples = audioBuffer.length;
  const durationMs = Math.round(audioBuffer.duration * 1000);

  // 2. Peak Amplitude (dB)
  const channelData = audioBuffer.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < Math.min(channelData.length, 8096); i++) {
    const abs = Math.abs(channelData[i]);
    if (abs > peak) peak = abs;
  }

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
  const fftSize = 8192;
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

  return {
    durationMs,
    durationSamples,
    peakAmplitudeDb: parseFloat(peakAmplitudeDb.toFixed(2)),
    spectralCentroid: parseFloat(spectralCentroid.toFixed(2)),
    frequencyData,
    lowEnergy: parseFloat(lowEnergy.toFixed(4)),
    midEnergy: parseFloat(midEnergy.toFixed(4)),
    highEnergy: parseFloat(highEnergy.toFixed(4)),
  };
}
