import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { UploadCloud, Music4, Mic2, AlertCircle, PlayCircle, Loader2, Activity, Layers, Trash2, Copy, Check, CheckCircle, XCircle, Pencil, Lightbulb, List, Target, Scissors, RefreshCcw, HelpCircle, ChevronUp, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useCreateAnalysis, analyzeAudioFile, type AudioMetrics } from "@/hooks/use-analyses";
import { FrequencyGraph } from "@/components/FrequencyGraph";
import { ResultCard } from "@/components/ResultCard";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useResults } from "@/context/ResultsContext";
import { api, type BatchAnalysisResponse, type BatchIRInput } from "@shared/routes";
import { Button } from "@/components/ui/button";

// Validation schema for the form
const formSchema = z.object({
  micType: z.string().min(1, "Microphone is required"),
  micPosition: z.enum(["cap", "cap_offcenter", "capedge", "capedge_br", "capedge_dk", "cap_cone_tr", "cone"]),
  speakerModel: z.string().min(1, "Speaker model is required"),
  distance: z.string().min(1, "Distance is required (e.g. '1 inch')"),
});

type FormData = z.infer<typeof formSchema>;

// Filename parsing to auto-populate fields
// Supports formats like: SM57_cap-edge_v30-china_1in.wav, 57_cap_greenback_0.5.wav, etc.
// SM57+R121 combo blend labels and ratios
const COMBO_BLEND_LABELS = ['tight', 'balance', 'thick', 'smooth', 'ribbon_dom'] as const;
type ComboBlendLabel = typeof COMBO_BLEND_LABELS[number];

const COMBO_BLEND_INFO: Record<ComboBlendLabel, { sm57: number; r121: number; label: string }> = {
  tight: { sm57: 67, r121: 33, label: 'Tight' },
  balance: { sm57: 60, r121: 40, label: 'Balance' },
  thick: { sm57: 51, r121: 49, label: 'Thick' },
  smooth: { sm57: 45, r121: 55, label: 'Smooth' },
  ribbon_dom: { sm57: 24, r121: 76, label: 'Ribbon Dom' },
};

// Format combo IR info for display
function formatComboLabel(parsed: ParsedFilename): string | null {
  if (!parsed.isComboIR || !parsed.blendLabel) return null;
  const info = COMBO_BLEND_INFO[parsed.blendLabel];
  let label = `SM57+R121 ${info.label} (${info.sm57}:${info.r121})`;
  if (parsed.shotVariant) label += ` Shot ${parsed.shotVariant}`;
  if (parsed.r121Height) label += ` @${parsed.r121Height}"`;
  return label;
}

const MIC_PATTERNS: Record<string, string> = {
  // Order matters! More specific patterns should come first
  // IMPORTANT: Avoid short patterns that could match speaker names (e.g., "30" matches "V30")
  "sm57": "57", "57": "57",
  "r121": "121", "r-121": "121", "121": "121",
  "r92": "r92", "aear92": "r92", "aea-r92": "r92",
  "m160": "160", "160": "160",
  "md421": "421", "421": "421",
  "421kompakt": "421", "421-kompakt": "421", "kompakt": "421", "md421kmp": "421", "421kmp": "421",
  "md441boost": "md441", "441-boost": "md441", "441boost": "md441", "md441-boost": "md441", "441presence": "md441",
  "md441flat": "md441", "441-flat": "md441", "441flat": "md441", "md441-flat": "md441", "md441": "md441", "441": "md441",
  "r10": "r10",
  "m88": "m88", "88": "m88",
  "pr30": "pr30", // Removed "30" pattern - conflicts with V30 speaker
  "e906boost": "e906", "e906-boost": "e906", "906boost": "e906",
  "e906presence": "e906", "e906-presence": "e906", "906presence": "e906",
  "e906flat": "e906", "e906-flat": "e906", "906flat": "e906", "e906": "e906",
  "m201": "m201", "201": "m201",
  "sm7b": "sm7b", "sm7": "sm7b", "7b": "sm7b",
  "c414": "c414", "akgc414": "c414", "akg-c414": "c414", "414": "c414",
  "roswellcab": "roswell-cab", "roswell-cab": "roswell-cab", "roswell": "roswell-cab",
};

const POSITION_PATTERNS: Record<string, string> = {
  // New naming convention
  "capedge_br": "capedge_br", "capedgebr": "capedge_br",
  "capedge_dk": "capedge_dk", "capedgedk": "capedge_dk",
  "capedge_cone_tr": "cap_cone_tr", "capedgeconetr": "cap_cone_tr", "cone_tr": "cap_cone_tr", "cap_cone_tr": "cap_cone_tr", "capconetr": "cap_cone_tr",
  "cap_offcenter": "cap_offcenter", "capoffcenter": "cap_offcenter", "offcenter": "cap_offcenter",
  "capedge": "capedge", "cap_edge": "capedge", "edge": "capedge",
  "cap": "cap", "center": "cap",
  "cone": "cone",
  // Legacy mappings for backwards compatibility
  "cap-edge-favor-cap": "capedge_br", "favorcap": "capedge_br",
  "cap-edge-favor-cone": "capedge_dk", "favorcone": "capedge_dk",
  "cap-edge": "capedge",
  "cap-off-center": "cap_offcenter",
};

const SPEAKER_PATTERNS: Record<string, string> = {
  "g12m25": "g12m25", "greenback": "g12m25", "gb": "g12m25", "g12m": "g12m25",
  "v30china": "v30-china", "v30-china": "v30-china", "v30c": "v30-china",
  "v30blackcat": "v30-blackcat", "v30-blackcat": "v30-blackcat", "blackcat": "v30-blackcat", "v30bc": "v30-blackcat",
  "v30": "v30-china",
  "k100": "k100", "g12k100": "k100", "g12k-100": "k100",
  "g12t75": "g12t75", "t75": "g12t75", "g12t-75": "g12t75",
  "g12-65": "g12-65", "g1265": "g12-65", "65": "g12-65", "g1265her": "g12-65", "g12-65her": "g12-65",
  "g12h30": "g12h30-anniversary", "g12h30-anniversary": "g12h30-anniversary", "anniversary": "g12h30-anniversary", "h30": "g12h30-anniversary", "g12h": "g12h30-anniversary", "g12hann": "g12h30-anniversary", "g12h30ann": "g12h30-anniversary",
  "cream": "celestion-cream", "celestion-cream": "celestion-cream", "celestioncream": "celestion-cream",
  "ga12sc64": "ga12-sc64", "ga12-sc64": "ga12-sc64", "sc64": "ga12-sc64",
  "g10sc64": "g10-sc64", "g10-sc64": "g10-sc64", "g10": "g10-sc64",
};

// Extended result type to include combo IR metadata
interface ParsedFilename extends Partial<FormData> {
  isComboIR?: boolean;
  blendLabel?: ComboBlendLabel;
  r121Height?: string;
  shotVariant?: string; // A, B, C, etc. for different shots of same setup
}

function parseFilename(filename: string): ParsedFilename {
  const result: ParsedFilename = {};
  const name = filename.toLowerCase().replace('.wav', '');
  const parts = name.split(/[_\-\s]+/);
  const fullName = parts.join('');
  
  // Check for SM57+R121 combo IR first (format: Speaker_SM57_R121_BlendLabel_R121Height)
  const hasSM57 = parts.includes('sm57') || parts.includes('57') || fullName.includes('sm57');
  const hasR121 = parts.includes('r121') || parts.includes('121') || fullName.includes('r121');
  
  if (hasSM57 && hasR121) {
    result.isComboIR = true;
    // Detect blend label (support "balanced" as alias for "balance")
    let blendLabelInFilename: string | null = null;
    for (const label of COMBO_BLEND_LABELS) {
      const foundIdx = parts.findIndex(p => p === label);
      if (foundIdx !== -1) {
        result.blendLabel = label;
        blendLabelInFilename = label;
        break;
      }
    }
    // Handle aliases: "balanced" -> "balance", "combo"/"ribbondom" -> "ribbon_dom"
    if (!result.blendLabel) {
      const balancedIdx = parts.findIndex(p => p === 'balanced');
      if (balancedIdx !== -1) {
        result.blendLabel = 'balance';
        blendLabelInFilename = 'balanced';
      }
    }
    // "combo" is legacy name for ribbon_dom (24:76 unattenuated R121)
    if (!result.blendLabel) {
      const comboIdx = parts.findIndex(p => p === 'combo' || p === 'ribbondom');
      if (comboIdx !== -1) {
        result.blendLabel = 'ribbon_dom';
        blendLabelInFilename = parts[comboIdx];
      }
    }
    // All combo IRs must be labeled - no default
    // Format: Speaker_SM57_R121_BlendLabel_ShotVariant_R121Height
    // e.g., Cab_SM57_R121_Balanced_A_6in
    const blendIndex = blendLabelInFilename ? parts.indexOf(blendLabelInFilename) : -1;
    if (blendIndex !== -1 && blendIndex < parts.length - 1) {
      // Next part after blend label is shot variant (A, B, C, etc.)
      const variantPart = parts[blendIndex + 1];
      if (/^[a-z]$/i.test(variantPart)) {
        result.shotVariant = variantPart.toUpperCase();
        // R121 height comes after variant (e.g., "6in", "6", "0.5in")
        if (blendIndex + 2 < parts.length) {
          const heightPart = parts[blendIndex + 2];
          const heightMatch = heightPart.match(/^(\d+(?:\.\d+)?)/);
          if (heightMatch) {
            result.r121Height = heightMatch[1];
          }
        }
      } else {
        // No variant letter, check if it's the height directly
        const heightMatch = variantPart.match(/^(\d+(?:\.\d+)?)/);
        if (heightMatch) {
          result.r121Height = heightMatch[1];
        }
      }
    }
    // Set mic type for combo IRs
    result.micType = 'sm57_r121_combo' as any; // Will need form schema update for combo support
  } else {
    // Special handling for mics with variants (e906, md441)
    const hasE906 = parts.includes('e906') || fullName.includes('e906');
    const hasPresence = parts.includes('presence') || parts.includes('boost') || fullName.includes('presence') || fullName.includes('boost');
    const hasFlat = parts.includes('flat') || fullName.includes('flat');
    
    const hasMd441 = parts.includes('md441') || parts.includes('441') || fullName.includes('md441');
    
    if (hasE906) {
      result.micType = 'e906';
    } else if (hasMd441) {
      result.micType = 'md441';
    } else {
      // Try to find mic type from patterns
      for (const [pattern, value] of Object.entries(MIC_PATTERNS)) {
        if (parts.includes(pattern) || fullName.includes(pattern)) {
          result.micType = value;
          break;
        }
      }
    }
  }
  
  // Try to find position (check longer patterns first)
  const sortedPositions = Object.entries(POSITION_PATTERNS).sort((a, b) => b[0].length - a[0].length);
  for (const [pattern, value] of sortedPositions) {
    if (parts.includes(pattern) || fullName.includes(pattern)) {
      result.micPosition = value as FormData["micPosition"];
      break;
    }
  }
  
  // Try to find speaker
  const sortedSpeakers = Object.entries(SPEAKER_PATTERNS).sort((a, b) => b[0].length - a[0].length);
  for (const [pattern, value] of sortedSpeakers) {
    if (parts.includes(pattern) || fullName.includes(pattern)) {
      result.speakerModel = value;
      break;
    }
  }
  
  // Try to find distance - prioritize patterns with "in" or "inch" suffix
  const validDistances = ["0", "0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6"];
  
  // First, look for explicit "in" or "inch" patterns (e.g., "1in", "2.5inch", "0.5in")
  const inchMatch = name.match(/(\d+(?:\.\d+)?)\s*(?:in|inch|")/);
  if (inchMatch && validDistances.includes(inchMatch[1])) {
    result.distance = inchMatch[1];
  } else {
    // Fallback: look for standalone numbers that are valid distances
    // Check each part separately to avoid matching numbers in speaker names like "v30"
    for (const part of parts) {
      if (validDistances.includes(part)) {
        result.distance = part;
        break;
      }
    }
  }
  
  return result;
}

interface BatchIR {
  file: File;
  metrics: AudioMetrics | null;
  analyzing: boolean;
  error: string | null;
}

// Redundancy detection types and functions
interface RedundantPair {
  ir1: string;
  ir2: string;
  similarity: number;
  details: {
    frequencyCorrelation: number;
    centroidProximity: number;
    energyMatch: number;
  };
  recommendation: string;
}

// Clustered redundancy group - smarter than showing all pairs
interface RedundancyGroupMember {
  filename: string;
  centroid: number;        // Brightness (Hz)
  score: number;           // Quality score 0-100
  smoothness: number;      // Frequency smoothness 0-100
  noiseFloorDb: number;    // Noise floor in dB (lower = cleaner)
  lowEnergy: number;       // Bass 0-1
  midEnergy: number;       // Mids 0-1
  highEnergy: number;      // Highs 0-1
}

interface RedundancyGroup {
  id: number;
  members: RedundancyGroupMember[];
  avgSimilarity: number;
  selectedToKeep: string | null; // User's selection of which IR to keep
}

// Calculate Pearson correlation between two frequency arrays, normalized to [0, 1]
function calculateFrequencyCorrelation(freq1: number[], freq2: number[]): number {
  if (freq1.length !== freq2.length || freq1.length === 0) return 0;
  
  const n = freq1.length;
  const mean1 = freq1.reduce((a, b) => a + b, 0) / n;
  const mean2 = freq2.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denom1 = 0;
  let denom2 = 0;
  
  for (let i = 0; i < n; i++) {
    const diff1 = freq1[i] - mean1;
    const diff2 = freq2[i] - mean2;
    numerator += diff1 * diff2;
    denom1 += diff1 * diff1;
    denom2 += diff2 * diff2;
  }
  
  const denominator = Math.sqrt(denom1 * denom2);
  if (denominator === 0) return 0;
  
  // Pearson returns -1 to 1, normalize to 0-1 range using (r+1)/2
  // -1 (opposite) → 0, 0 (uncorrelated) → 0.5, 1 (identical) → 1
  const pearson = numerator / denominator;
  return (pearson + 1) / 2;
}

// Calculate how close two spectral centroids are (0-1, 1 = identical)
function calculateCentroidProximity(centroid1: number, centroid2: number): number {
  const maxDiff = 3000; // Hz - max expected difference for different IRs
  const diff = Math.abs(centroid1 - centroid2);
  return Math.max(0, 1 - (diff / maxDiff));
}

// Calculate energy distribution match (0-1, 1 = identical)
function calculateEnergyMatch(
  low1: number, mid1: number, high1: number,
  low2: number, mid2: number, high2: number
): number {
  // Energy values are 0-1 normalized, so differences are also 0-1
  const lowDiff = Math.abs(low1 - low2);
  const midDiff = Math.abs(mid1 - mid2);
  const highDiff = Math.abs(high1 - high2);
  const avgDiff = (lowDiff + midDiff + highDiff) / 3;
  // Clamp to ensure 0-1 range
  return Math.max(0, Math.min(1, 1 - avgDiff));
}

// Calculate overall similarity between two IRs
function calculateSimilarity(metrics1: AudioMetrics, metrics2: AudioMetrics): {
  similarity: number;
  details: RedundantPair['details'];
} {
  const frequencyCorrelation = calculateFrequencyCorrelation(
    metrics1.frequencyData,
    metrics2.frequencyData
  );
  
  const centroidProximity = calculateCentroidProximity(
    metrics1.spectralCentroid,
    metrics2.spectralCentroid
  );
  
  const energyMatch = calculateEnergyMatch(
    metrics1.lowEnergy, metrics1.midEnergy, metrics1.highEnergy,
    metrics2.lowEnergy, metrics2.midEnergy, metrics2.highEnergy
  );
  
  // Weighted average: frequency curve is most important (60/25/15)
  const similarity = (frequencyCorrelation * 0.6) + (centroidProximity * 0.25) + (energyMatch * 0.15);
  
  return {
    similarity,
    details: { frequencyCorrelation, centroidProximity, energyMatch }
  };
}

// Union-Find for clustering
class UnionFind {
  parent: number[];
  rank: number[];
  
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = Array(n).fill(0);
  }
  
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }
  
  union(x: number, y: number): void {
    const px = this.find(x);
    const py = this.find(y);
    if (px === py) return;
    if (this.rank[px] < this.rank[py]) {
      this.parent[px] = py;
    } else if (this.rank[px] > this.rank[py]) {
      this.parent[py] = px;
    } else {
      this.parent[py] = px;
      this.rank[px]++;
    }
  }
}

// Find redundancy groups using clustering instead of listing all pairs
function findRedundancyGroups(
  irs: { filename: string; metrics: AudioMetrics; score?: number }[],
  threshold: number = 0.95
): RedundancyGroup[] {
  const n = irs.length;
  if (n < 2) return [];
  
  // Build similarity matrix and union similar IRs
  const uf = new UnionFind(n);
  const similarities: Map<string, number> = new Map();
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const { similarity } = calculateSimilarity(irs[i].metrics, irs[j].metrics);
      if (similarity >= threshold) {
        uf.union(i, j);
        similarities.set(`${i}-${j}`, similarity);
      }
    }
  }
  
  // Group IRs by their cluster root
  const clusters: Map<number, number[]> = new Map();
  for (let i = 0; i < n; i++) {
    const root = uf.find(i);
    if (!clusters.has(root)) {
      clusters.set(root, []);
    }
    clusters.get(root)!.push(i);
  }
  
  // Convert clusters with 2+ members to RedundancyGroups
  const groups: RedundancyGroup[] = [];
  
  const clusterEntries = Array.from(clusters.entries());
  for (let c = 0; c < clusterEntries.length; c++) {
    const memberIndices = clusterEntries[c][1];
    if (memberIndices.length < 2) continue;
    
    // Calculate average similarity within the group
    let totalSim = 0;
    let pairCount = 0;
    for (let i = 0; i < memberIndices.length; i++) {
      for (let j = i + 1; j < memberIndices.length; j++) {
        const key = `${Math.min(memberIndices[i], memberIndices[j])}-${Math.max(memberIndices[i], memberIndices[j])}`;
        const sim = similarities.get(key);
        if (sim !== undefined) {
          totalSim += sim;
          pairCount++;
        }
      }
    }
    
    const members: RedundancyGroupMember[] = memberIndices.map((idx: number) => ({
      filename: irs[idx].filename,
      centroid: irs[idx].metrics.spectralCentroid,
      score: irs[idx].score || 85,
      smoothness: irs[idx].metrics.frequencySmoothness,
      noiseFloorDb: irs[idx].metrics.noiseFloorDb,
      lowEnergy: irs[idx].metrics.lowEnergy,
      midEnergy: irs[idx].metrics.midEnergy,
      highEnergy: irs[idx].metrics.highEnergy
    })).sort((a, b) => b.centroid - a.centroid); // Sort brightest first
    
    const avgSimilarity = pairCount > 0 ? totalSim / pairCount : threshold;
    
    groups.push({
      id: groups.length,
      members,
      avgSimilarity,
      selectedToKeep: null // User selects which to keep
    });
  }
  
  return groups.sort((a, b) => b.members.length - a.members.length);
}

// Legacy function for compatibility - converts groups back to pairs if needed
function findRedundantPairs(
  irs: { filename: string; metrics: AudioMetrics }[],
  threshold: number = 0.95
): RedundantPair[] {
  const pairs: RedundantPair[] = [];
  
  for (let i = 0; i < irs.length; i++) {
    for (let j = i + 1; j < irs.length; j++) {
      const { similarity, details } = calculateSimilarity(irs[i].metrics, irs[j].metrics);
      
      if (similarity >= threshold) {
        const centroidDiff = irs[i].metrics.spectralCentroid - irs[j].metrics.spectralCentroid;
        const recommendation = Math.abs(centroidDiff) < 50 
          ? `Either "${irs[i].filename}" or "${irs[j].filename}" can be removed`
          : centroidDiff > 0
            ? `Consider removing "${irs[i].filename}" (brighter) if you prefer the darker variant`
            : `Consider removing "${irs[j].filename}" (brighter) if you prefer the darker variant`;
        
        pairs.push({
          ir1: irs[i].filename,
          ir2: irs[j].filename,
          similarity,
          details,
          recommendation
        });
      }
    }
  }
  
  return pairs.sort((a, b) => b.similarity - a.similarity);
}

// Close call decision for user input during culling
interface CullCloseCall {
  micType: string;
  slot: number; // Which slot in this mic's allocation (1st, 2nd, etc.)
  candidates: {
    filename: string;
    score: number;
    combinedScore: number; // The calculated selection score
    brightness: string;
    position: string;
    distance: string | null;
    smoothness: number; // Raw smoothness score
    centroid: number; // Spectral centroid Hz
    midrangeHint: string; // Tonal character hint
  }[];
  selectedFilename: string | null; // User's choice, null if not yet decided
}

// Culling result type
interface CullResult {
  keep: { filename: string; reason: string; score: number; diversityContribution: number }[];
  cut: { filename: string; reason: string; score: number; mostSimilarTo: string; similarity: number }[];
  closeCallsResolved?: boolean; // True if all close calls have been resolved
}

// Cull IRs to a target count, maximizing variety and quality
// Uses per-mic-type selection: keeps best examples of each mic proportionally
// userOverrides: Map of mic type -> array of filenames user has chosen to keep
function cullIRs(
  irs: { filename: string; metrics: AudioMetrics; score?: number }[],
  targetCount: number,
  userOverrides: Map<string, string[]> = new Map()
): { result: CullResult; closeCalls: CullCloseCall[] } {
  if (irs.length <= targetCount) {
    return {
      result: {
        keep: irs.map(ir => ({ 
          filename: ir.filename, 
          reason: "All IRs kept - count already at or below target",
          score: ir.score || 85,
          diversityContribution: 1
        })),
        cut: [],
        closeCallsResolved: true
      },
      closeCalls: []
    };
  }
  
  // Track close calls for user input
  const closeCalls: CullCloseCall[] = [];
  const CLOSE_CALL_THRESHOLD = 0.05; // 5% difference in combined score triggers close call

  // Parse filenames for mic/position info
  const getMicType = (filename: string): string => {
    const lower = filename.toLowerCase();
    const mics = ['sm57', 'r121', 'm160', 'md421', 'md421kompakt', 'md441', 'pr30', 'e906', 'm201', 'sm7b', 'c414', 'r92', 'r10', 'm88', 'roswell'];
    for (const mic of mics) {
      if (lower.includes(mic)) return mic;
    }
    return 'unknown';
  };

  const getPosition = (filename: string): string => {
    const lower = filename.toLowerCase();
    if (lower.includes('cone_tr') || lower.includes('conetr')) return 'cone_tr';
    if (lower.includes('capedge_br') || lower.includes('capedgebr')) return 'capedge_br';
    if (lower.includes('capedge_dk') || lower.includes('capedgedk')) return 'capedge_dk';
    if (lower.includes('capedge') || lower.includes('cap_edge')) return 'capedge';
    if (lower.includes('cap_offcenter') || lower.includes('offcenter')) return 'cap_offcenter';
    if (lower.includes('cap')) return 'cap';
    if (lower.includes('cone')) return 'cone';
    return 'unknown';
  };

  // Build similarity matrix for diversity consideration within each mic
  const n = irs.length;
  const similarityMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const { similarity } = calculateSimilarity(irs[i].metrics, irs[j].metrics);
      similarityMatrix[i][j] = similarity;
      similarityMatrix[j][i] = similarity;
    }
  }

  // Group IRs by mic type
  const micGroups = new Map<string, number[]>();
  irs.forEach((ir, idx) => {
    const mic = getMicType(ir.filename);
    if (!micGroups.has(mic)) micGroups.set(mic, []);
    micGroups.get(mic)!.push(idx);
  });

  // Calculate how many slots each mic type gets (proportional allocation)
  const micTypes = Array.from(micGroups.keys());
  const totalIRs = irs.length;
  const micSlots = new Map<string, number>();
  let allocatedSlots = 0;
  
  // First pass: proportional allocation (at least 1 per mic if possible)
  for (const mic of micTypes) {
    const micCount = micGroups.get(mic)!.length;
    const proportion = micCount / totalIRs;
    const slots = Math.max(1, Math.round(targetCount * proportion));
    micSlots.set(mic, Math.min(slots, micCount)); // Can't keep more than exist
    allocatedSlots += micSlots.get(mic)!;
  }
  
  // Adjust if we over/under-allocated
  while (allocatedSlots > targetCount) {
    // Remove from mic with most slots that has more than 1
    let maxMic = '';
    let maxSlots = 0;
    for (const [mic, slots] of Array.from(micSlots.entries())) {
      if (slots > maxSlots && slots > 1) {
        maxSlots = slots;
        maxMic = mic;
      }
    }
    if (maxMic) {
      micSlots.set(maxMic, maxSlots - 1);
      allocatedSlots--;
    } else break;
  }
  
  while (allocatedSlots < targetCount) {
    // Add to mic with room to grow (has more IRs than slots)
    let bestMic = '';
    let bestRoom = 0;
    for (const [mic, slots] of Array.from(micSlots.entries())) {
      const available = micGroups.get(mic)!.length;
      const room = available - slots;
      if (room > bestRoom) {
        bestRoom = room;
        bestMic = mic;
      }
    }
    if (bestMic && bestRoom > 0) {
      micSlots.set(bestMic, micSlots.get(bestMic)! + 1);
      allocatedSlots++;
    } else break;
  }

  // Helper to get distance from filename
  const getDistanceFromFilename = (filename: string): string | null => {
    const match = filename.match(/(\d+(?:\.\d+)?)\s*(?:in|inch|")/i);
    return match ? match[1] : null;
  };
  
  // Helper to get position category for close call grouping
  // Only compare IRs within the same position family
  const getPositionCategory = (position: string | null): string => {
    if (!position) return 'unknown';
    const pos = position.toLowerCase();
    // Cap family: cap, cap_offcenter
    if (pos === 'cap' || pos === 'cap_offcenter') return 'cap';
    // CapEdge family: capedge, cap_cone_trn, capedge_br
    if (pos.includes('capedge') || pos === 'cap_cone_trn') return 'capedge';
    // Cone family: cone, cone_br
    if (pos.includes('cone') && !pos.includes('cap')) return 'cone';
    // Edge family
    if (pos === 'edge') return 'edge';
    return pos; // Default to exact position
  };
  
  // Helper to calculate brightness label
  const centroidRankingForCloseCall = irs.map((ir, idx) => ({ idx, centroid: ir.metrics.spectralCentroid }))
    .sort((a, b) => b.centroid - a.centroid);
  const getBrightnessLabelForCloseCall = (idx: number): string => {
    const rank = centroidRankingForCloseCall.findIndex(r => r.idx === idx);
    const total = centroidRankingForCloseCall.length;
    const percentile = rank / total;
    if (percentile <= 0.2) return 'brightest';
    if (percentile <= 0.4) return 'bright';
    if (percentile <= 0.6) return 'mid-bright';
    if (percentile <= 0.8) return 'dark';
    return 'darkest';
  };
  
  // Helper to generate midrange/tonal hint based on frequency response
  const getMidrangeHint = (idx: number): string => {
    const metrics = irs[idx].metrics;
    const centroid = metrics.spectralCentroid;
    const smoothness = metrics.frequencySmoothness || 0;
    
    // Generate helpful tonal hints based on centroid and smoothness
    const hints: string[] = [];
    
    // Centroid-based hints
    if (centroid > 2800) hints.push('crisp');
    else if (centroid > 2200) hints.push('balanced');
    else if (centroid > 1600) hints.push('warm');
    else hints.push('thick');
    
    // Smoothness-based hints
    if (smoothness >= 75) hints.push('smooth');
    else if (smoothness >= 60) hints.push('natural');
    else if (smoothness >= 45) hints.push('textured');
    else hints.push('aggressive');
    
    return hints.join(', ');
  };

  // Select best IRs from each mic group
  // Primary: score, Secondary: diversity within the mic's selections
  const selected: number[] = [];
  
  for (const [mic, indices] of Array.from(micGroups.entries())) {
    const slotsForMic = micSlots.get(mic) || 1;
    
    // Check if user has overrides for this mic
    const userChoices = userOverrides.get(mic) || [];
    
    // Sort by score (primary factor)
    const sortedByScore = [...indices].sort((a, b) => {
      const scoreA = irs[a].score || 85;
      const scoreB = irs[b].score || 85;
      return scoreB - scoreA; // Higher score first
    });
    
    if (slotsForMic === 1) {
      // Check for close call: same position CATEGORY (Cap family, CapEdge family, etc), within 3 points
      // This allows comparing Cap vs Cap Off-Center, or CapEdge vs CapEdge Cone Transition
      // But NOT comparing Cap family to Cone family
      if (sortedByScore.length >= 2 && userChoices.length === 0) {
        const topIdx = sortedByScore[0];
        const topScore = irs[topIdx].score || 85;
        const topPosCategory = getPositionCategory(getPosition(irs[topIdx].filename));
        
        // Find close candidates in the same position category (e.g., Cap + Cap Off-Center)
        const sameCategoryCloseOnes = sortedByScore.filter(idx => {
          if (idx === topIdx) return false; // Exclude the top one initially
          const posCategory = getPositionCategory(getPosition(irs[idx].filename));
          const score = irs[idx].score || 85;
          return posCategory === topPosCategory && topScore - score <= 3;
        });
        
        // Only flag close call if there are alternatives in same category
        if (sameCategoryCloseOnes.length >= 1) {
          const allCandidates = [topIdx, ...sameCategoryCloseOnes];
          closeCalls.push({
            micType: mic,
            slot: 1,
            candidates: allCandidates.slice(0, 3).map(idx => ({
              filename: irs[idx].filename,
              score: irs[idx].score || 85,
              combinedScore: (irs[idx].score || 85) / 100,
              brightness: getBrightnessLabelForCloseCall(idx),
              position: getPosition(irs[idx].filename),
              distance: getDistanceFromFilename(irs[idx].filename),
              smoothness: irs[idx].metrics.frequencySmoothness || 0,
              centroid: Math.round(irs[idx].metrics.spectralCentroid),
              midrangeHint: getMidrangeHint(idx)
            })),
            selectedFilename: null
          });
        }
      }
      
      // Use user choice if available, otherwise best score
      if (userChoices.length > 0) {
        const chosenIdx = indices.find(i => irs[i].filename === userChoices[0]);
        selected.push(chosenIdx !== undefined ? chosenIdx : sortedByScore[0]);
      } else {
        selected.push(sortedByScore[0]);
      }
    } else {
      // Select multiple: start with best, then consider diversity
      const micSelected: number[] = [sortedByScore[0]];
      const micRemaining = new Set(sortedByScore.slice(1));
      let slotNumber = 2; // Start from slot 2 since slot 1 is the best
      
      while (micSelected.length < slotsForMic && micRemaining.size > 0) {
        // Calculate combined scores for all remaining candidates
        const candidateScores: { idx: number; combinedScore: number }[] = [];
        
        for (const candidateIdx of Array.from(micRemaining)) {
          // Quality score (60% weight)
          const qualityScore = ((irs[candidateIdx].score || 85) - 70) / 30;
          
          // Diversity from already selected within this mic (25% weight)
          let minSim = 1;
          for (const selIdx of micSelected) {
            minSim = Math.min(minSim, similarityMatrix[candidateIdx][selIdx]);
          }
          const diversityScore = 1 - minSim;
          
          // Position variety bonus (15% weight)
          const coveredPositions = new Set(micSelected.map(i => getPosition(irs[i].filename)));
          const candidatePos = getPosition(irs[candidateIdx].filename);
          const positionBonus = coveredPositions.has(candidatePos) ? 0 : 1;
          
          const combinedScore = (qualityScore * 0.6) + (diversityScore * 0.25) + (positionBonus * 0.15);
          candidateScores.push({ idx: candidateIdx, combinedScore });
        }
        
        // Sort by combined score
        candidateScores.sort((a, b) => b.combinedScore - a.combinedScore);
        
        // Check for close call: same position CATEGORY, within threshold
        if (candidateScores.length >= 2 && userChoices.length < slotNumber) {
          const topIdx = candidateScores[0].idx;
          const topCombined = candidateScores[0].combinedScore;
          const topPosCategory = getPositionCategory(getPosition(irs[topIdx].filename));
          
          // Filter to same position category, within threshold
          const sameCategoryCloseOnes = candidateScores.slice(1).filter(c => {
            const posCategory = getPositionCategory(getPosition(irs[c.idx].filename));
            return posCategory === topPosCategory && topCombined - c.combinedScore <= CLOSE_CALL_THRESHOLD;
          });
          
          // Only flag if there are alternatives in same category
          if (sameCategoryCloseOnes.length >= 1) {
            const allCandidates = [candidateScores[0], ...sameCategoryCloseOnes];
            closeCalls.push({
              micType: mic,
              slot: slotNumber,
              candidates: allCandidates.slice(0, 4).map(c => ({
                filename: irs[c.idx].filename,
                score: irs[c.idx].score || 85,
                combinedScore: c.combinedScore,
                brightness: getBrightnessLabelForCloseCall(c.idx),
                position: getPosition(irs[c.idx].filename),
                distance: getDistanceFromFilename(irs[c.idx].filename),
                smoothness: irs[c.idx].metrics.frequencySmoothness || 0,
                centroid: Math.round(irs[c.idx].metrics.spectralCentroid),
                midrangeHint: getMidrangeHint(c.idx)
              })),
              selectedFilename: null
            });
          }
        }
        
        // Use user choice if available for this slot
        const userChoiceForSlot = userChoices[slotNumber - 1];
        if (userChoiceForSlot) {
          const chosenIdx = Array.from(micRemaining).find(i => irs[i].filename === userChoiceForSlot);
          if (chosenIdx !== undefined) {
            micSelected.push(chosenIdx);
            micRemaining.delete(chosenIdx);
          } else if (candidateScores.length > 0) {
            micSelected.push(candidateScores[0].idx);
            micRemaining.delete(candidateScores[0].idx);
          }
        } else if (candidateScores.length > 0) {
          micSelected.push(candidateScores[0].idx);
          micRemaining.delete(candidateScores[0].idx);
        } else {
          break;
        }
        
        slotNumber++;
      }
      
      selected.push(...micSelected);
    }
  }

  // Create set of remaining (not selected) indices
  const selectedSet = new Set(selected);
  const remaining = new Set(irs.map((_, i) => i).filter(i => !selectedSet.has(i)));

  // Build result with explanations
  const keep: CullResult['keep'] = [];
  const cut: CullResult['cut'] = [];

  // Parse additional info from filenames for better descriptions
  const getDistance = (filename: string): string | null => {
    const match = filename.match(/(\d+(?:\.\d+)?)\s*(?:in|inch|")/i);
    return match ? match[1] : null;
  };
  
  const getBlendLabel = (filename: string): string | null => {
    const lower = filename.toLowerCase();
    if (lower.includes('tight')) return 'tight';
    if (lower.includes('balanced') || lower.includes('balance')) return 'balance';
    if (lower.includes('thick')) return 'thick';
    if (lower.includes('smooth')) return 'smooth';
    if (lower.includes('ribbon_dom') || lower.includes('ribbondom') || lower.includes('combo')) return 'ribbon_dom';
    return null;
  };

  const isComboIR = (filename: string): boolean => {
    const lower = filename.toLowerCase();
    return (lower.includes('sm57') || lower.includes('57')) && (lower.includes('r121') || lower.includes('121'));
  };

  // Calculate brightness ranking for all IRs
  const centroidRanking = irs.map((ir, idx) => ({ idx, centroid: ir.metrics.spectralCentroid }))
    .sort((a, b) => b.centroid - a.centroid);
  const getBrightnessLabel = (idx: number): string => {
    const rank = centroidRanking.findIndex(r => r.idx === idx);
    const total = centroidRanking.length;
    const percentile = rank / total;
    if (percentile <= 0.2) return 'brightest';
    if (percentile <= 0.4) return 'bright';
    if (percentile <= 0.6) return 'mid-bright';
    if (percentile <= 0.8) return 'dark';
    return 'darkest';
  };

  for (const idx of selected) {
    const ir = irs[idx];
    const mic = getMicType(ir.filename);
    const pos = getPosition(ir.filename);
    const dist = getDistance(ir.filename);
    const blend = getBlendLabel(ir.filename);
    const isCombo = isComboIR(ir.filename);
    const brightness = getBrightnessLabel(idx);
    
    // Calculate this IR's diversity contribution
    let minSimToOthers = 1;
    for (const otherIdx of selected) {
      if (otherIdx !== idx) {
        minSimToOthers = Math.min(minSimToOthers, similarityMatrix[idx][otherIdx]);
      }
    }
    const diversityContribution = 1 - minSimToOthers;
    
    let reason = "";
    if (idx === selected[0]) {
      reason = `Best capture (score ${ir.score || 85})`;
      if (isCombo && blend) {
        reason += ` — SM57+R121 ${blend} blend`;
      } else if (mic !== 'unknown') {
        reason += ` — ${mic.toUpperCase()}`;
      }
      if (pos !== 'unknown') reason += ` at ${pos}`;
    } else {
      const parts: string[] = [];
      
      // Describe what makes this IR unique
      if (isCombo && blend) {
        parts.push(`SM57+R121 ${blend}`);
      } else if (mic !== 'unknown') {
        parts.push(mic.toUpperCase());
      }
      
      if (pos !== 'unknown') {
        parts.push(pos.replace(/_/g, ' '));
      }
      
      if (dist) {
        parts.push(`${dist}" distance`);
      }
      
      // Add brightness context
      parts.push(`${brightness} variant`);
      
      reason = parts.length > 0 ? parts.join(', ') : "Adds spectral variety";
    }
    
    keep.push({
      filename: ir.filename,
      reason,
      score: ir.score || 85,
      diversityContribution
    });
  }

  for (const idx of Array.from(remaining)) {
    const ir = irs[idx];
    const mic = getMicType(ir.filename);
    const pos = getPosition(ir.filename);
    const blend = getBlendLabel(ir.filename);
    const isCombo = isComboIR(ir.filename);
    const brightness = getBrightnessLabel(idx);
    
    // Find most similar to kept IRs
    let maxSim = 0;
    let mostSimilarIdx = selected[0];
    for (const selectedIdx of selected) {
      if (similarityMatrix[idx][selectedIdx] > maxSim) {
        maxSim = similarityMatrix[idx][selectedIdx];
        mostSimilarIdx = selectedIdx;
      }
    }
    
    // Build descriptive reason
    let irDesc = '';
    if (isCombo && blend) {
      irDesc = `SM57+R121 ${blend}`;
    } else if (mic !== 'unknown') {
      irDesc = mic.toUpperCase();
    }
    if (pos !== 'unknown') {
      irDesc += irDesc ? ` at ${pos.replace(/_/g, ' ')}` : pos.replace(/_/g, ' ');
    }
    irDesc += ` (${brightness})`;
    
    let reason = '';
    if (maxSim >= 0.95) {
      reason = `Nearly identical (${Math.round(maxSim * 100)}%) to kept ${irDesc ? 'variant' : 'IR'}`;
    } else if (maxSim >= 0.9) {
      reason = `Very similar (${Math.round(maxSim * 100)}%) — ${irDesc || 'similar character'}`;
    } else if (maxSim >= 0.8) {
      reason = `Similar (${Math.round(maxSim * 100)}%) — ${irDesc || 'overlapping character'}`;
    } else {
      reason = `Lower priority — ${irDesc || 'less unique contribution'}`;
    }
    
    cut.push({
      filename: ir.filename,
      reason,
      score: ir.score || 85,
      mostSimilarTo: irs[mostSimilarIdx].filename,
      similarity: maxSim
    });
  }

  // Sort keep by diversity contribution (descending), cut by similarity (descending)
  keep.sort((a, b) => b.diversityContribution - a.diversityContribution);
  cut.sort((a, b) => b.similarity - a.similarity);

  return { 
    result: { keep, cut, closeCallsResolved: closeCalls.length === 0 },
    closeCalls 
  };
}

export default function Analyzer() {
  // Use context for mode and results persistence
  const { 
    batchAnalysisResult: batchResult, 
    setBatchAnalysisResult: setBatchResult,
    singleAnalysisResult: result,
    setSingleAnalysisResult: setResult,
    singleAnalysisMetrics: metrics,
    setSingleAnalysisMetrics: setMetrics,
    analyzerMode: mode,
    setAnalyzerMode: setMode
  } = useResults();
  
  // Section refs for navigation
  const analyzeRef = useRef<HTMLDivElement>(null);
  const redundancyRef = useRef<HTMLDivElement>(null);
  const cullerRef = useRef<HTMLDivElement>(null);
  
  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  
  // Single mode state
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Batch mode state
  const [batchIRs, setBatchIRs] = useState<BatchIR[]>([]);
  const [copied, setCopied] = useState(false);
  
  // Redundancy detection state - using groups instead of pairs for cleaner display
  // Threshold of 0.95 means highly similar (with normalized Pearson, this is ~90% raw correlation)
  const [redundancyGroups, setRedundancyGroups] = useState<RedundancyGroup[]>([]);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.95);
  const [showRedundancies, setShowRedundancies] = useState(false);
  
  // Culling state
  const [cullResult, setCullResult] = useState<CullResult | null>(null);
  const [targetCullCount, setTargetCullCount] = useState(10);
  const [cullCountInput, setCullCountInput] = useState("10"); // Text input for easier editing
  const [showCuller, setShowCuller] = useState(false);
  
  // Close call decisions state for interactive culling
  const [cullCloseCalls, setCullCloseCalls] = useState<CullCloseCall[]>([]);
  const [showCloseCallQuery, setShowCloseCallQuery] = useState(false);
  const [cullUserOverrides, setCullUserOverrides] = useState<Map<string, string[]>>(new Map());
  
  // Preference query state for subjective culling decisions
  interface CullPreference {
    type: 'brightness' | 'midrange';
    question: string;
    options: { label: string; value: string }[];
  }
  const [pendingPreferences, setPendingPreferences] = useState<CullPreference[]>([]);
  const [selectedPreferences, setSelectedPreferences] = useState<Record<string, string>>({});
  const [showPreferenceQuery, setShowPreferenceQuery] = useState(false);
  
  // Shared mic list for sorting (alphabetical order)
  const KNOWN_MICS = ['c414', 'e906', 'm160', 'm201', 'm88', 'md421', 'md421kompakt', 'md441', 'pr30', 'r10', 'r121', 'r92', 'roswell', 'sm57', 'sm7b'];
  
  // Sort batch IRs by mic type (alphabetically) then by distance
  const sortedBatchIRs = useMemo(() => {
    const getMicFromFilename = (filename: string): string => {
      const lower = filename.toLowerCase();
      for (const mic of KNOWN_MICS) {
        if (lower.includes(mic)) return mic;
      }
      return 'zzz'; // Sort unknown mics last
    };
    
    const getDistanceFromFilename = (filename: string): number => {
      const match = filename.match(/(\d+(?:\.\d+)?)\s*(?:in|inch|")/i);
      return match ? parseFloat(match[1]) : 999;
    };
    
    return [...batchIRs].sort((a, b) => {
      const micA = getMicFromFilename(a.file.name);
      const micB = getMicFromFilename(b.file.name);
      if (micA !== micB) return micA.localeCompare(micB);
      
      const distA = getDistanceFromFilename(a.file.name);
      const distB = getDistanceFromFilename(b.file.name);
      return distA - distB;
    });
  }, [batchIRs]);
  
  // Sync cull count input with numeric state
  const handleCullCountChange = (value: string) => {
    setCullCountInput(value);
    const num = parseInt(value);
    if (!isNaN(num) && num >= 1) {
      setTargetCullCount(num);
    }
  };
  
  const handleCullCountBlur = () => {
    const num = parseInt(cullCountInput);
    if (isNaN(num) || num < 1) {
      setCullCountInput("1");
      setTargetCullCount(1);
    }
  };

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      distance: "1",
      speakerModel: "v30-china"
    }
  });

  const { mutateAsync: createAnalysis, isPending: isSubmitting } = useCreateAnalysis();
  const { toast } = useToast();

  // Batch analysis mutation
  const { mutate: analyzeBatch, isPending: isBatchAnalyzing } = useMutation({
    mutationFn: async (irs: BatchIRInput[]) => {
      const validated = api.batchAnalysis.analyze.input.parse({ irs });
      const res = await fetch(api.batchAnalysis.analyze.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to analyze batch");
      return api.batchAnalysis.analyze.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      setBatchResult(data);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to analyze IR batch", variant: "destructive" });
    },
  });

  // Batch file drop handler
  const onBatchDrop = useCallback(async (acceptedFiles: File[]) => {
    const wavFiles = acceptedFiles.filter(f => f.name.toLowerCase().endsWith('.wav'));
    
    if (wavFiles.length === 0) {
      toast({ title: "Invalid files", description: "Please upload .wav files only", variant: "destructive" });
      return;
    }

    const newIRs: BatchIR[] = wavFiles.map(file => ({
      file,
      metrics: null,
      analyzing: true,
      error: null,
    }));

    setBatchIRs(newIRs);
    setBatchResult(null);
    // Clear redundancy results when new files are uploaded
    setRedundancyGroups([]);
    setShowRedundancies(false);

    for (let i = 0; i < wavFiles.length; i++) {
      const file = wavFiles[i];
      try {
        const audioMetrics = await analyzeAudioFile(file);
        setBatchIRs(prev => prev.map(ir => 
          ir.file.name === file.name && ir.file.size === file.size
            ? { ...ir, metrics: audioMetrics, analyzing: false }
            : ir
        ));
      } catch (err) {
        setBatchIRs(prev => prev.map(ir => 
          ir.file.name === file.name && ir.file.size === file.size
            ? { ...ir, analyzing: false, error: "Failed to analyze" }
            : ir
        ));
      }
    }
  }, [toast]);

  const handleBatchAnalyze = () => {
    const validIRs = batchIRs.filter(ir => ir.metrics && !ir.error);
    if (validIRs.length === 0) {
      toast({ title: "No valid IRs", description: "Upload at least 1 valid IR file", variant: "destructive" });
      return;
    }

    const irInputs: BatchIRInput[] = validIRs.map(ir => ({
      filename: ir.file.name,
      duration: ir.metrics!.durationMs,
      peakLevel: ir.metrics!.peakAmplitudeDb,
      spectralCentroid: ir.metrics!.spectralCentroid,
      lowEnergy: ir.metrics!.lowEnergy,
      midEnergy: ir.metrics!.midEnergy,
      highEnergy: ir.metrics!.highEnergy,
      hasClipping: ir.metrics!.hasClipping,
      clippedSamples: ir.metrics!.clippedSamples,
      crestFactorDb: ir.metrics!.crestFactorDb,
      frequencySmoothness: ir.metrics!.frequencySmoothness,
      noiseFloorDb: ir.metrics!.noiseFloorDb,
    }));

    analyzeBatch(irInputs);
  };

  const clearBatch = () => {
    setBatchIRs([]);
    setBatchResult(null);
    setRedundancyGroups([]);
    setShowRedundancies(false);
    setCullResult(null);
    setShowCuller(false);
    setPendingPreferences([]);
    setSelectedPreferences({});
    setShowPreferenceQuery(false);
  };
  
  // Find redundancy groups (clustered)
  const handleFindRedundancies = () => {
    const validIRs = batchIRs.filter(ir => ir.metrics && !ir.error);
    if (validIRs.length < 2) {
      toast({ title: "Need more IRs", description: "Upload at least 2 IRs to check for redundancies", variant: "destructive" });
      return;
    }
    
    const irsWithMetrics = validIRs.map(ir => ({
      filename: ir.file.name,
      metrics: ir.metrics!
    }));
    
    const groups = findRedundancyGroups(irsWithMetrics, similarityThreshold);
    setRedundancyGroups(groups);
    setShowRedundancies(true);
    
    if (groups.length === 0) {
      toast({ title: "No redundancies found", description: `No IR groups exceeded ${Math.round(similarityThreshold * 100)}% similarity threshold` });
    } else {
      const totalRedundant = groups.reduce((sum, g) => sum + g.members.length, 0);
      toast({ title: `Found ${groups.length} redundant group${groups.length > 1 ? 's' : ''}`, description: `${totalRedundant} IRs can be reduced - select which to keep` });
    }
  };
  
  // Select which IR to keep from a redundancy group
  const handleSelectToKeep = (groupId: number, filename: string) => {
    setRedundancyGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { ...group, selectedToKeep: group.selectedToKeep === filename ? null : filename }
        : group
    ));
    // Auto-restart culling if cull results exist (will update after state change via useEffect)
  };
  
  // Auto-restart culling when redundancy selections change
  const redundancySelectionsCount = redundancyGroups.filter(g => g.selectedToKeep).length;
  useEffect(() => {
    if (cullResult && redundancyGroups.length > 0) {
      // Silently re-run culling to reflect new exclusions (skip preference check, use existing preferences)
      handleCullIRs(false, true);
    }
  }, [redundancySelectionsCount]);

  // Get list of IRs to remove based on selections
  const getIRsToRemove = (): string[] => {
    const toRemove: string[] = [];
    for (const group of redundancyGroups) {
      if (group.selectedToKeep) {
        for (const member of group.members) {
          if (member.filename !== group.selectedToKeep) {
            toRemove.push(member.filename);
          }
        }
      }
    }
    return toRemove;
  };

  // Get IRs already selected to keep from redundancy groups
  const getIRsKeptFromRedundancy = (): Set<string> => {
    const keptSet = new Set<string>();
    for (const group of redundancyGroups) {
      if (group.selectedToKeep) {
        keptSet.add(group.selectedToKeep);
      }
    }
    return keptSet;
  };

  // Detect if subjective preferences are needed for culling
  const detectPreferencesNeeded = (irs: { filename: string; metrics: AudioMetrics; score?: number }[]): CullPreference[] => {
    const preferences: CullPreference[] = [];
    
    if (irs.length < 4) return preferences; // Not enough variety to warrant preferences
    
    // Calculate brightness range (spectral centroid)
    const centroids = irs.map(ir => ir.metrics.spectralCentroid);
    const minCentroid = Math.min(...centroids);
    const maxCentroid = Math.max(...centroids);
    const centroidRange = maxCentroid - minCentroid;
    
    // If there's significant brightness variation (>400Hz spread), ask about brightness preference
    // But only offer options that actually have IRs in those ranges
    if (centroidRange > 400) {
      // Categorize IRs by brightness: bright = top third, neutral = middle third, dark = bottom third
      const brightThreshold = minCentroid + (centroidRange * 0.67);
      const darkThreshold = minCentroid + (centroidRange * 0.33);
      
      const hasBrightIRs = centroids.some(c => c >= brightThreshold);
      const hasDarkIRs = centroids.some(c => c <= darkThreshold);
      const hasNeutralIRs = centroids.some(c => c > darkThreshold && c < brightThreshold);
      
      const brightOptions: { label: string; value: string }[] = [];
      // Add variety option if there are at least 2 distinct tonal categories
      const tonalCategories = [hasBrightIRs, hasNeutralIRs, hasDarkIRs].filter(Boolean).length;
      if (tonalCategories >= 2) {
        brightOptions.push({ label: 'Variety (keep mix of bright/neutral/dark)', value: 'variety' });
      }
      if (hasBrightIRs) brightOptions.push({ label: 'Brighter / More cutting', value: 'bright' });
      if (hasNeutralIRs) brightOptions.push({ label: 'Balanced / Neutral', value: 'neutral' });
      if (hasDarkIRs) brightOptions.push({ label: 'Darker / Warmer', value: 'dark' });
      brightOptions.push({ label: 'No preference (technical only)', value: 'none' });
      
      // Only add preference if there are at least 2 tonal options (excluding "none")
      if (brightOptions.length > 2) {
        preferences.push({
          type: 'brightness',
          question: 'What tonal character do you prefer?',
          options: brightOptions
        });
      }
    }
    
    // Calculate midrange character variation
    const midRatios = irs.map(ir => {
      const total = ir.metrics.lowEnergy + ir.metrics.midEnergy + ir.metrics.highEnergy;
      return ir.metrics.midEnergy / total;
    });
    const minMid = Math.min(...midRatios);
    const maxMid = Math.max(...midRatios);
    const midRange = maxMid - minMid;
    
    // If there's significant mid variation (>0.1 spread), ask about midrange preference
    // But only offer options that actually have IRs in those ranges
    if (midRange > 0.1) {
      // Categorize IRs by mid character: forward = top third, neutral = middle, scooped = bottom third
      const forwardThreshold = minMid + (midRange * 0.67);
      const scoopedThreshold = minMid + (midRange * 0.33);
      
      const hasForwardIRs = midRatios.some(m => m >= forwardThreshold);
      const hasScoopedIRs = midRatios.some(m => m <= scoopedThreshold);
      const hasNeutralMidIRs = midRatios.some(m => m > scoopedThreshold && m < forwardThreshold);
      
      const midOptions: { label: string; value: string }[] = [];
      // Add variety option if there are at least 2 distinct mid categories
      const midCategories = [hasForwardIRs, hasNeutralMidIRs, hasScoopedIRs].filter(Boolean).length;
      if (midCategories >= 2) {
        midOptions.push({ label: 'Variety (keep mix of mid characters)', value: 'variety' });
      }
      if (hasForwardIRs) midOptions.push({ label: 'Mid-forward / Punchy', value: 'forward' });
      if (hasNeutralMidIRs) midOptions.push({ label: 'Balanced mids', value: 'neutral' });
      if (hasScoopedIRs) midOptions.push({ label: 'Scooped / More low & high', value: 'scooped' });
      midOptions.push({ label: 'No preference (technical only)', value: 'none' });
      
      // Only add preference if there are at least 2 tonal options (excluding "none")
      if (midOptions.length > 2) {
        preferences.push({
          type: 'midrange',
          question: 'What midrange character do you prefer?',
          options: midOptions
        });
      }
    }
    
    return preferences;
  };
  
  // Apply user preferences to culling scores
  const applyPreferencesToCull = (
    irs: { filename: string; metrics: AudioMetrics; score?: number }[],
    prefs: Record<string, string>
  ): { filename: string; metrics: AudioMetrics; score?: number; prefBonus: number }[] => {
    // Sort by centroid for brightness ranking
    const sortedByCentroid = [...irs].sort((a, b) => b.metrics.spectralCentroid - a.metrics.spectralCentroid);
    const centroidRanks = new Map(sortedByCentroid.map((ir, idx) => [ir.filename, idx / (irs.length - 1)]));
    
    // Sort by mid ratio for midrange ranking
    const getMidRatio = (m: AudioMetrics) => m.midEnergy / (m.lowEnergy + m.midEnergy + m.highEnergy);
    const sortedByMid = [...irs].sort((a, b) => getMidRatio(b.metrics) - getMidRatio(a.metrics));
    const midRanks = new Map(sortedByMid.map((ir, idx) => [ir.filename, idx / (irs.length - 1)]));
    
    // For variety mode: categorize IRs into thirds
    const getBrightnessCategory = (rank: number): 'bright' | 'neutral' | 'dark' => {
      if (rank < 0.33) return 'bright';
      if (rank > 0.67) return 'dark';
      return 'neutral';
    };
    const getMidCategory = (rank: number): 'forward' | 'neutral' | 'scooped' => {
      if (rank < 0.33) return 'forward';
      if (rank > 0.67) return 'scooped';
      return 'neutral';
    };
    
    // Count how many IRs are in each category (for variety balancing)
    const brightCounts = { bright: 0, neutral: 0, dark: 0 };
    const midCounts = { forward: 0, neutral: 0, scooped: 0 };
    for (const ir of irs) {
      const bRank = centroidRanks.get(ir.filename) || 0.5;
      const mRank = midRanks.get(ir.filename) || 0.5;
      brightCounts[getBrightnessCategory(bRank)]++;
      midCounts[getMidCategory(mRank)]++;
    }
    
    // Calculate inverse representation bonus (underrepresented categories get more bonus)
    const totalIRs = irs.length;
    const getBrightVarietyBonus = (cat: 'bright' | 'neutral' | 'dark') => {
      const idealShare = 1 / 3;
      const actualShare = brightCounts[cat] / totalIRs;
      // If underrepresented, give bonus; if overrepresented, less bonus
      return Math.max(0, (idealShare - actualShare + 0.1) * 0.3);
    };
    const getMidVarietyBonus = (cat: 'forward' | 'neutral' | 'scooped') => {
      const idealShare = 1 / 3;
      const actualShare = midCounts[cat] / totalIRs;
      return Math.max(0, (idealShare - actualShare + 0.1) * 0.25);
    };
    
    return irs.map(ir => {
      let prefBonus = 0;
      const bRank = centroidRanks.get(ir.filename) || 0.5;
      const mRank = midRanks.get(ir.filename) || 0.5;
      
      // Apply brightness preference
      const brightPref = prefs['brightness'];
      if (brightPref && brightPref !== 'none') {
        if (brightPref === 'variety') {
          // Variety mode: boost underrepresented categories
          const cat = getBrightnessCategory(bRank);
          prefBonus += getBrightVarietyBonus(cat);
        } else if (brightPref === 'bright') {
          prefBonus += (1 - bRank) * 0.2; // Boost brighter IRs
        } else if (brightPref === 'dark') {
          prefBonus += bRank * 0.2; // Boost darker IRs
        } else if (brightPref === 'neutral' && bRank > 0.3 && bRank < 0.7) {
          prefBonus += 0.1;
        }
      }
      
      // Apply midrange preference
      const midPref = prefs['midrange'];
      if (midPref && midPref !== 'none') {
        if (midPref === 'variety') {
          // Variety mode: boost underrepresented categories
          const cat = getMidCategory(mRank);
          prefBonus += getMidVarietyBonus(cat);
        } else if (midPref === 'forward') {
          prefBonus += (1 - mRank) * 0.15; // Boost mid-forward IRs
        } else if (midPref === 'scooped') {
          prefBonus += mRank * 0.15; // Boost scooped IRs
        } else if (midPref === 'neutral' && mRank > 0.3 && mRank < 0.7) {
          prefBonus += 0.08;
        }
      }
      
      return { ...ir, prefBonus };
    });
  };
  
  // Cull IRs to target count
  const handleCullIRs = (showToast = true, skipPreferenceCheck = false, overridesOverride?: Map<string, string[]>) => {
    const validIRs = batchIRs.filter(ir => ir.metrics && !ir.error);
    
    // Exclude IRs that are marked for removal from redundancy groups
    const irsToRemove = new Set(getIRsToRemove());
    const eligibleIRs = validIRs.filter(ir => !irsToRemove.has(ir.file.name));
    
    if (eligibleIRs.length < 2) {
      if (showToast) {
        toast({ title: "Need more IRs", description: "Upload at least 2 eligible IRs to cull", variant: "destructive" });
      }
      return;
    }
    
    // Adjust target if redundancy selections reduced available pool
    const effectiveTarget = Math.min(targetCullCount, eligibleIRs.length - 1);
    
    if (effectiveTarget >= eligibleIRs.length) {
      if (showToast) {
        toast({ title: "Target too high", description: `You have ${eligibleIRs.length} eligible IRs. Set a target lower than that to cull.`, variant: "destructive" });
      }
      return;
    }
    
    // Get scores from batch result if available
    const scoreMap = new Map<string, number>();
    if (batchResult) {
      for (const r of batchResult.results) {
        scoreMap.set(r.filename, r.score);
      }
    }
    
    const irsWithMetrics = eligibleIRs.map(ir => ({
      filename: ir.file.name,
      metrics: ir.metrics!,
      score: scoreMap.get(ir.file.name)
    }));
    
    // Check if preferences are needed (only for initial cull, not re-runs)
    if (!skipPreferenceCheck && Object.keys(selectedPreferences).length === 0) {
      const neededPrefs = detectPreferencesNeeded(irsWithMetrics);
      if (neededPrefs.length > 0) {
        setPendingPreferences(neededPrefs);
        setShowPreferenceQuery(true);
        return;
      }
    }
    
    // Apply preferences if any were selected
    let irsToProcess = irsWithMetrics;
    if (Object.keys(selectedPreferences).length > 0) {
      const irsWithBonus = applyPreferencesToCull(irsWithMetrics, selectedPreferences);
      // Add preference bonus to score
      irsToProcess = irsWithBonus.map(ir => ({
        ...ir,
        score: (ir.score || 85) + Math.round(ir.prefBonus * 10)
      }));
    }
    
    const { result, closeCalls } = cullIRs(irsToProcess, effectiveTarget, overridesOverride || cullUserOverrides);
    setCullResult(result);
    setCullCloseCalls(closeCalls);
    setShowCuller(true);
    setShowPreferenceQuery(false);
    
    // If there are close calls, show them for user input
    if (closeCalls.length > 0) {
      setShowCloseCallQuery(true);
    }
    
    if (showToast) {
      const excludedCount = validIRs.length - eligibleIRs.length;
      const excludeNote = excludedCount > 0 ? ` (${excludedCount} excluded from redundancy)` : '';
      const prefNote = Object.keys(selectedPreferences).length > 0 ? ' with your preferences' : '';
      const closeCallNote = closeCalls.length > 0 ? ` (${closeCalls.length} close call${closeCalls.length > 1 ? 's' : ''} need your input)` : '';
      toast({ 
        title: `Culling complete`, 
        description: `Keep ${result.keep.length} IRs, cut ${result.cut.length} IRs${excludeNote}${prefNote}${closeCallNote}` 
      });
    }
  };
  
  // Handle preference selection and continue culling
  const handlePreferenceSelected = (type: string, value: string) => {
    setSelectedPreferences(prev => ({ ...prev, [type]: value }));
  };
  
  const handleApplyPreferencesAndCull = () => {
    handleCullIRs(true, true);
  };
  
  const handleSkipPreferencesAndCull = () => {
    setSelectedPreferences({});
    handleCullIRs(true, true);
  };

  const copyBatchResults = () => {
    if (!batchResult) return;
    
    // Get speaker from first IR if available
    const speaker = batchResult.results[0]?.parsedInfo?.speaker || "Unknown Speaker";
    const date = new Date().toLocaleDateString();
    
    let text = `IR.Scope Batch Analysis: ${speaker}\n`;
    text += `Date: ${date}\n`;
    text += "=".repeat(50) + "\n\n";
    text += `Average Score: ${batchResult.averageScore}/100\n`;
    text += `Summary: ${batchResult.summary}\n\n`;
    
    text += "INDIVIDUAL RESULTS\n";
    text += "-".repeat(30) + "\n\n";
    
    batchResult.results.forEach((r, i) => {
      text += `${i + 1}. ${r.filename}\n`;
      text += `   Score: ${r.score}/100 ${r.isPerfect ? "(Perfect)" : ""}\n`;
      if (r.parsedInfo) {
        const info = [];
        if (r.parsedInfo.mic) info.push(`Mic: ${r.parsedInfo.mic}`);
        if (r.parsedInfo.position) info.push(`Pos: ${r.parsedInfo.position}`);
        if (r.parsedInfo.speaker) info.push(`Spk: ${r.parsedInfo.speaker}`);
        if (r.parsedInfo.distance) info.push(`Dist: ${r.parsedInfo.distance}`);
        if (info.length) text += `   Detected: ${info.join(", ")}\n`;
      }
      text += `   Advice: ${r.advice}\n`;
      if (r.highlights?.length) text += `   Highlights: ${r.highlights.join(", ")}\n`;
      if (r.issues?.length) text += `   Issues: ${r.issues.join(", ")}\n`;
      if (r.spectralDeviation) {
        const sd = r.spectralDeviation;
        text += `   Spectral: Expected ${sd.expectedMin}-${sd.expectedMax}Hz, Actual ${Math.round(sd.actual)}Hz`;
        if (sd.isWithinRange) {
          text += ` (On Target)\n`;
        } else {
          text += ` (${sd.direction === 'bright' ? '+' : '-'}${Math.round(sd.deviationHz)}Hz, ${Math.round(sd.deviationPercent)}% ${sd.direction})\n`;
        }
      }
      if (r.renameSuggestion) {
        text += `   Tonal Character: ${r.renameSuggestion.suggestedModifier}\n`;
        text += `   Suggested Name: ${r.renameSuggestion.suggestedFilename}\n`;
        text += `   Reason: ${r.renameSuggestion.reason}\n`;
      }
      text += "\n";
    });
    
    // Add gaps suggestions if present
    if (batchResult.gapsSuggestions && batchResult.gapsSuggestions.length > 0) {
      text += "\nMISSING TONES - CAPTURE SUGGESTIONS\n";
      text += "-".repeat(30) + "\n\n";
      batchResult.gapsSuggestions.forEach((gap, i) => {
        text += `${i + 1}. ${gap.missingTone}\n`;
        text += `   Mic: ${gap.recommendation.mic}\n`;
        text += `   Position: ${gap.recommendation.position}\n`;
        text += `   Distance: ${gap.recommendation.distance}\n`;
        text += `   Speaker: ${gap.recommendation.speaker}\n`;
        text += `   Why: ${gap.reason}\n\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied to clipboard", description: "Batch analysis results copied." });
    setTimeout(() => setCopied(false), 2000);
  };

  const copySimpleList = () => {
    if (!batchResult) return;
    
    // Extract shot names and sort alphabetically
    const shotNames = batchResult.results
      .map(r => r.filename.replace(/\.wav$/i, ''))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    
    const text = shotNames.map((name, i) => `${i + 1}. ${name}`).join('\n');
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied to clipboard", description: "Shot list copied." });
    setTimeout(() => setCopied(false), 2000);
  };

  const batchDropzone = useDropzone({
    onDrop: onBatchDrop,
    accept: { "audio/wav": [".wav"] },
    multiple: true,
  });

  const validBatchCount = batchIRs.filter(ir => ir.metrics && !ir.error).length;
  const analyzingBatchCount = batchIRs.filter(ir => ir.analyzing).length;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selected = acceptedFiles[0];
    if (!selected) return;
    
    // Only accept wav
    if (!selected.name.endsWith('.wav')) {
      toast({ title: "Invalid file", description: "Please upload a .wav file", variant: "destructive" });
      return;
    }

    setFile(selected);
    setAnalyzing(true);
    setResult(null); // Clear previous result
    
    // Parse filename and auto-populate fields
    const parsed = parseFilename(selected.name);
    let fieldsPopulated = 0;
    if (parsed.micType) {
      setValue("micType", parsed.micType);
      fieldsPopulated++;
    }
    if (parsed.micPosition) {
      setValue("micPosition", parsed.micPosition);
      fieldsPopulated++;
    }
    if (parsed.speakerModel) {
      setValue("speakerModel", parsed.speakerModel);
      fieldsPopulated++;
    }
    if (parsed.distance) {
      setValue("distance", parsed.distance);
      fieldsPopulated++;
    }
    
    if (fieldsPopulated > 0) {
      toast({ 
        title: "Fields auto-populated", 
        description: `Detected ${fieldsPopulated} field(s) from filename` 
      });
    }
    
    try {
      const audioMetrics = await analyzeAudioFile(selected);
      setMetrics(audioMetrics);
    } catch (err) {
      toast({ title: "Error", description: "Failed to process audio file", variant: "destructive" });
      setFile(null);
    } finally {
      setAnalyzing(false);
    }
  }, [toast, setValue]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/wav': ['.wav'] },
    maxFiles: 1,
  });

  const onSubmit = async (data: FormData) => {
    if (!file || !metrics) {
      toast({ title: "No file", description: "Please upload an IR file first", variant: "destructive" });
      return;
    }

    try {
      const response = await createAnalysis({
        filename: file.name,
        micType: data.micType,
        micPosition: data.micPosition,
        speakerModel: data.speakerModel,
        distance: data.distance,
        durationSamples: metrics.durationSamples,
        peakAmplitudeDb: metrics.peakAmplitudeDb,
        spectralCentroid: metrics.spectralCentroid,
        lowEnergy: metrics.lowEnergy,
        midEnergy: metrics.midEnergy,
        highEnergy: metrics.highEnergy,
        originalFilename: file.name, // Pass original filename for mic variant detection
      });
      setResult({ ...response, filename: file.name });
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-white to-secondary pb-2">
            Analyze Your Tone
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload your guitar cabinet impulse response to get instant feedback on mic placement, 
            phase issues, and frequency balance.
          </p>
          
          {/* Mode Toggle */}
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setMode('single')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                mode === 'single' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              )}
              data-testid="button-mode-single"
            >
              <Music4 className="w-4 h-4 inline-block mr-2" />
              Single IR
            </button>
            <button
              onClick={() => setMode('batch')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                mode === 'batch' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              )}
              data-testid="button-mode-batch"
            >
              <Layers className="w-4 h-4 inline-block mr-2" />
              Batch Analysis
            </button>
          </div>
        </div>

        {/* Batch Analysis Mode */}
        {mode === 'batch' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Batch Dropzone */}
            <div
              {...batchDropzone.getRootProps()}
              className={cn(
                "glass-panel p-8 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer",
                batchDropzone.isDragActive
                  ? "border-primary bg-primary/5 shadow-[0_0_30px_-10px_rgba(34,197,94,0.4)]"
                  : "border-white/10 hover:border-primary/50"
              )}
              data-testid="dropzone-batch"
            >
              <input {...batchDropzone.getInputProps()} data-testid="input-files-batch" />
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Layers className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium">
                    {batchDropzone.isDragActive ? "Drop your IR files here" : "Drop multiple IR files for batch analysis"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The system will automatically read and analyze each IR
                  </p>
                </div>
              </div>
            </div>

            {/* Batch IR List */}
            {batchIRs.length > 0 && (
              <div className="space-y-4" ref={analyzeRef}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Music4 className="w-5 h-5 text-primary" />
                    IRs to Analyze ({validBatchCount} ready)
                  </h2>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/clear-cache', { method: 'POST' });
                          const data = await res.json();
                          toast({
                            title: "Cache Cleared",
                            description: `Cleared ${data.cleared?.batch || 0} batch + ${data.cleared?.single || 0} single cached results`,
                          });
                        } catch {
                          toast({
                            title: "Error",
                            description: "Failed to clear cache",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                      data-testid="button-clear-cache"
                    >
                      <RefreshCcw className="w-4 h-4" />
                      Clear Cache
                    </button>
                    <button
                      onClick={clearBatch}
                      className="text-sm text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                      data-testid="button-clear-batch"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear all
                    </button>
                    {/* Navigation buttons */}
                    {showRedundancies && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => scrollToSection(redundancyRef)}
                        className="text-amber-400 border-amber-400/30 hover:bg-amber-400/10"
                        data-testid="button-goto-redundancy"
                      >
                        <Target className="w-4 h-4 mr-1" />
                        Redundancy
                      </Button>
                    )}
                    {(showCuller || showPreferenceQuery) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => scrollToSection(cullerRef)}
                        className="text-purple-400 border-purple-400/30 hover:bg-purple-400/10"
                        data-testid="button-goto-culler"
                      >
                        <Scissors className="w-4 h-4 mr-1" />
                        Culler
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-2 max-h-64 overflow-y-auto">
                  <AnimatePresence>
                    {sortedBatchIRs.map((ir, index) => (
                      <motion.div
                        key={`${ir.file.name}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={cn(
                          "glass-panel p-3 rounded-lg flex items-center justify-between",
                          ir.error && "border-destructive/50"
                        )}
                        data-testid={`batch-ir-item-${index}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={cn(
                            "w-8 h-8 rounded flex items-center justify-center flex-shrink-0",
                            ir.analyzing ? "bg-yellow-500/20" :
                            ir.error ? "bg-destructive/20" :
                            "bg-primary/20"
                          )}>
                            {ir.analyzing ? (
                              <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                            ) : ir.error ? (
                              <XCircle className="w-4 h-4 text-destructive" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium truncate">{ir.file.name}</p>
                              {(() => {
                                const parsed = parseFilename(ir.file.name);
                                const comboLabel = formatComboLabel(parsed);
                                if (comboLabel) {
                                  return (
                                    <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded flex-shrink-0">
                                      {comboLabel}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                              {ir.metrics?.hasClipping && (
                                <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded flex-shrink-0">
                                  CLIPPING
                                </span>
                              )}
                            </div>
                            {ir.metrics && (
                              <p className="text-xs text-muted-foreground">
                                {ir.metrics.durationMs.toFixed(1)}ms | Centroid: {ir.metrics.spectralCentroid.toFixed(0)}Hz | Smooth: {ir.metrics.frequencySmoothness.toFixed(0)}
                                {ir.metrics.hasClipping && ` | Crest: ${ir.metrics.crestFactorDb.toFixed(1)}dB`}
                                {ir.metrics.noiseFloorDb > -45 && ` | Tail: ${ir.metrics.noiseFloorDb.toFixed(0)}dB`}
                              </p>
                            )}
                            {ir.error && (
                              <p className="text-xs text-destructive">{ir.error}</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleBatchAnalyze}
                    disabled={validBatchCount === 0 || analyzingBatchCount > 0 || isBatchAnalyzing}
                    className={cn(
                      "w-full py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2",
                      validBatchCount > 0 && analyzingBatchCount === 0 && !isBatchAnalyzing
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_-5px_rgba(34,197,94,0.5)]"
                        : "bg-white/5 text-muted-foreground cursor-not-allowed"
                    )}
                    data-testid="button-analyze-batch"
                  >
                    {isBatchAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyzing {validBatchCount} IRs...
                      </>
                    ) : analyzingBatchCount > 0 ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing {analyzingBatchCount} file(s)...
                      </>
                    ) : (
                      <>
                        <Activity className="w-5 h-5" />
                        Analyze All ({validBatchCount} IRs)
                      </>
                    )}
                  </button>
                  
                  {/* Find Redundancies Button */}
                  <button
                    onClick={handleFindRedundancies}
                    disabled={validBatchCount < 2 || analyzingBatchCount > 0}
                    className={cn(
                      "w-full py-2 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm",
                      validBatchCount >= 2 && analyzingBatchCount === 0
                        ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30"
                        : "bg-white/5 text-muted-foreground cursor-not-allowed border border-white/5"
                    )}
                    data-testid="button-find-redundancies"
                  >
                    <Target className="w-4 h-4" />
                    Find Redundancies ({validBatchCount} IRs)
                  </button>
                  
                  {/* Culler Section with inline target input */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Cull to:</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cullCountInput}
                        onChange={(e) => handleCullCountChange(e.target.value)}
                        onBlur={handleCullCountBlur}
                        className="w-16 px-2 py-1 rounded bg-black/30 border border-white/10 text-center text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        data-testid="input-cull-target-inline"
                      />
                      <span className="text-sm text-muted-foreground">of {validBatchCount} IRs</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCullIRs()}
                        disabled={validBatchCount < 2 || analyzingBatchCount > 0 || targetCullCount >= validBatchCount}
                        className={cn(
                          "flex-1 py-2 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm",
                          validBatchCount >= 2 && analyzingBatchCount === 0 && targetCullCount < validBatchCount
                            ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30"
                            : "bg-white/5 text-muted-foreground cursor-not-allowed border border-white/5"
                        )}
                        data-testid="button-cull-now"
                      >
                        <Scissors className="w-4 h-4" />
                        Cull Now
                      </button>
                      {/* Quick nav to culler results when visible */}
                      {(showCuller || showPreferenceQuery) && (
                        <button
                          onClick={() => scrollToSection(cullerRef)}
                          className="px-3 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 transition-all text-sm"
                          data-testid="button-jump-to-culler"
                          title="Jump to culler results"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Batch Results */}
            <AnimatePresence>
              {batchResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="glass-panel p-6 rounded-2xl space-y-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Activity className="w-6 h-6 text-primary" />
                        Batch Analysis Results
                      </h2>
                      <p className="text-muted-foreground mt-1">
                        Average Score: <span className="text-primary font-bold">{batchResult.averageScore}/100</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={copySimpleList}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
                        data-testid="button-copy-simple-list"
                      >
                        {copied ? <Check className="w-3 h-3 text-green-400" /> : <List className="w-3 h-3" />}
                        {copied ? "Copied!" : "Copy List"}
                      </button>
                      <button
                        onClick={copyBatchResults}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
                        data-testid="button-copy-batch-results"
                      >
                        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        {copied ? "Copied!" : "Copy All"}
                      </button>
                      <button
                        onClick={() => setBatchResult(null)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-destructive/20 border border-white/10 text-xs font-medium transition-all text-muted-foreground hover:text-destructive"
                        data-testid="button-clear-batch-results"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear
                      </button>
                    </div>
                  </div>

                  <p className="text-muted-foreground">{batchResult.summary}</p>

                  <div className="space-y-3">
                    {batchResult.results.map((r, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2"
                        data-testid={`batch-result-${index}`}
                      >
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm font-medium truncate">{r.filename}</p>
                            {r.parsedInfo && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {r.parsedInfo.mic && (
                                  <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                                    {r.parsedInfo.mic}
                                  </span>
                                )}
                                {r.parsedInfo.position && (
                                  <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                                    {r.parsedInfo.position}
                                  </span>
                                )}
                                {r.parsedInfo.speaker && (
                                  <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">
                                    {r.parsedInfo.speaker}
                                  </span>
                                )}
                                {r.parsedInfo.distance && (
                                  <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                    {r.parsedInfo.distance}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className={cn(
                            "w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg flex-shrink-0",
                            r.score >= 85 ? "bg-primary/20 text-primary" :
                            r.score >= 70 ? "bg-yellow-500/20 text-yellow-500" :
                            "bg-orange-500/20 text-orange-500"
                          )}>
                            {r.score}
                          </div>
                        </div>

                        <p className="text-sm text-foreground/80">{r.advice}</p>

                        {(r.highlights?.length || r.issues?.length) && (
                          <div className="flex flex-wrap gap-4 text-xs pt-1">
                            {r.highlights?.length ? (
                              <div className="flex items-start gap-1">
                                <CheckCircle className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">{r.highlights.join(", ")}</span>
                              </div>
                            ) : null}
                            {r.issues?.length ? (
                              <div className="flex items-start gap-1">
                                <AlertCircle className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">{r.issues.join(", ")}</span>
                              </div>
                            ) : null}
                          </div>
                        )}

                        {/* Spectral Deviation */}
                        {r.spectralDeviation && (
                          <div className={cn(
                            "mt-2 p-2 rounded-lg border flex items-center gap-3 text-xs",
                            r.spectralDeviation.isWithinRange 
                              ? "bg-emerald-500/10 border-emerald-500/20" 
                              : r.spectralDeviation.deviationPercent > 50 
                                ? "bg-red-500/10 border-red-500/20"
                                : "bg-amber-500/10 border-amber-500/20"
                          )}>
                            <Target className={cn(
                              "w-4 h-4 flex-shrink-0",
                              r.spectralDeviation.isWithinRange 
                                ? "text-emerald-400" 
                                : r.spectralDeviation.deviationPercent > 50 
                                  ? "text-red-400"
                                  : "text-amber-400"
                            )} />
                            <div className="flex-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                              <span className="text-muted-foreground">
                                Expected: <span className="font-mono text-foreground">{r.spectralDeviation.expectedMin}-{r.spectralDeviation.expectedMax} Hz</span>
                              </span>
                              <span className="text-muted-foreground">
                                Actual: <span className="font-mono text-foreground">{Math.round(r.spectralDeviation.actual)} Hz</span>
                              </span>
                              <span className={cn(
                                "font-medium",
                                r.spectralDeviation.isWithinRange 
                                  ? "text-emerald-400" 
                                  : r.spectralDeviation.deviationPercent > 50 
                                    ? "text-red-400"
                                    : "text-amber-400"
                              )}>
                                {r.spectralDeviation.isWithinRange 
                                  ? "On Target" 
                                  : `${r.spectralDeviation.direction === 'bright' ? '+' : '-'}${Math.round(r.spectralDeviation.deviationHz)} Hz (${Math.round(r.spectralDeviation.deviationPercent)}% ${r.spectralDeviation.direction})`}
                              </span>
                              {!r.spectralDeviation.isWithinRange && r.spectralDeviation.deviationPercent > 100 && (
                                <span className="text-red-400 font-medium">Consider reshoot</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Quality Metrics: Smoothness & Noise Floor */}
                        {(r.frequencySmoothness != null || r.noiseFloorDb != null) && (
                          <div className="mt-2 p-2 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center gap-3 text-xs">
                            <Activity className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <div className="flex-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                              {r.frequencySmoothness != null && (
                                <span className="text-muted-foreground">
                                  Smoothness: <span className={cn(
                                    "font-mono font-medium",
                                    r.frequencySmoothness >= 80 ? "text-emerald-400" :
                                    r.frequencySmoothness >= 60 ? "text-foreground" :
                                    r.frequencySmoothness >= 45 ? "text-amber-400" : "text-red-400"
                                  )}>{Math.round(r.frequencySmoothness)}/100</span>
                                </span>
                              )}
                              {r.noiseFloorDb != null && (
                                <span className="text-muted-foreground">
                                  Noise Floor: <span className={cn(
                                    "font-mono font-medium",
                                    r.noiseFloorDb <= -60 ? "text-emerald-400" :
                                    r.noiseFloorDb <= -45 ? "text-foreground" :
                                    r.noiseFloorDb <= -35 ? "text-amber-400" : "text-red-400"
                                  )}>{r.noiseFloorDb.toFixed(1)} dB</span>
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Tonal Modifier Suggestion */}
                        {r.renameSuggestion && (
                          <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <div className="flex items-start gap-2">
                              <Pencil className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-amber-400">Tonal character: {r.renameSuggestion.suggestedModifier}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{r.renameSuggestion.reason}</p>
                                <p className="text-xs font-mono text-amber-300/80 mt-1 truncate">
                                  Suggested name: {r.renameSuggestion.suggestedFilename}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {/* Gaps Suggestions - Missing Tones */}
                  {batchResult.gapsSuggestions && batchResult.gapsSuggestions.length > 0 && (
                    <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                      <div className="flex items-center gap-2 mb-4">
                        <Lightbulb className="w-5 h-5 text-cyan-400" />
                        <h4 className="font-semibold text-cyan-400">Missing Tones for Complete Set</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        For optimal IR mixing, consider capturing these additional tones:
                      </p>
                      <div className="space-y-3">
                        {batchResult.gapsSuggestions.map((gap, i) => (
                          <div key={i} className="p-3 rounded-lg bg-black/20 border border-white/5">
                            <p className="font-medium text-sm text-cyan-300 mb-2">{gap.missingTone}</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-2">
                              <div>
                                <span className="text-muted-foreground">Mic:</span>
                                <span className="ml-1 text-foreground">{gap.recommendation.mic}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Position:</span>
                                <span className="ml-1 text-foreground">{gap.recommendation.position}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Distance:</span>
                                <span className="ml-1 text-foreground">{gap.recommendation.distance}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Speaker:</span>
                                <span className="ml-1 text-foreground">{gap.recommendation.speaker}</span>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">{gap.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Redundancy Detection Results */}
            <AnimatePresence>
              {showRedundancies && (
                <motion.div
                  ref={redundancyRef}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="glass-panel p-6 rounded-2xl space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Target className="w-6 h-6 text-amber-400" />
                        Redundancy Analysis
                      </h2>
                      <p className="text-muted-foreground mt-1">
                        {redundancyGroups.length === 0 
                          ? `No redundant groups found at ${Math.round(similarityThreshold * 100)}% threshold`
                          : `Found ${redundancyGroups.length} group${redundancyGroups.length > 1 ? 's' : ''} of similar IRs (${redundancyGroups.reduce((sum, g) => sum + g.members.length, 0)} total)`
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Navigation buttons */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => scrollToSection(analyzeRef)}
                        className="text-primary border-primary/30 hover:bg-primary/10"
                        data-testid="button-goto-analyze-from-redundancy"
                      >
                        <ChevronUp className="w-4 h-4 mr-1" />
                        Analyze
                      </Button>
                      {showCuller && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => scrollToSection(cullerRef)}
                          className="text-purple-400 border-purple-400/30 hover:bg-purple-400/10"
                          data-testid="button-goto-culler-from-redundancy"
                        >
                          <Scissors className="w-4 h-4 mr-1" />
                          Culler
                        </Button>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Threshold:</span>
                        <button
                          onClick={() => setSimilarityThreshold(Math.max(0.80, similarityThreshold - 0.01))}
                          className="w-6 h-6 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-bold border border-amber-500/30"
                          data-testid="button-threshold-decrease"
                        >
                          −
                        </button>
                        <input
                          type="range"
                          min="80"
                          max="99"
                          value={similarityThreshold * 100}
                          onChange={(e) => setSimilarityThreshold(parseInt(e.target.value) / 100)}
                          className="w-16 h-1 accent-amber-400"
                          data-testid="slider-similarity-threshold"
                        />
                        <button
                          onClick={() => setSimilarityThreshold(Math.min(0.99, similarityThreshold + 0.01))}
                          className="w-6 h-6 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-bold border border-amber-500/30"
                          data-testid="button-threshold-increase"
                        >
                          +
                        </button>
                        <span className="text-xs font-mono text-amber-400">{Math.round(similarityThreshold * 100)}%</span>
                      </div>
                      <button
                        onClick={handleFindRedundancies}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-medium transition-all border border-amber-500/30"
                        data-testid="button-recheck-redundancies"
                      >
                        Re-check
                      </button>
                      <button
                        onClick={() => setShowRedundancies(false)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-destructive/20 border border-white/10 text-xs font-medium transition-all text-muted-foreground hover:text-destructive"
                        data-testid="button-close-redundancies"
                      >
                        <Trash2 className="w-3 h-3" />
                        Close
                      </button>
                    </div>
                  </div>

                  {/* Summary of selections */}
                  {redundancyGroups.length > 0 && getIRsToRemove().length > 0 && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm">
                      <span className="text-green-400 font-medium">
                        {getIRsToRemove().length} IR{getIRsToRemove().length > 1 ? 's' : ''} marked for removal
                      </span>
                      <span className="text-muted-foreground ml-2">
                        (keeping {redundancyGroups.filter(g => g.selectedToKeep).length} from {redundancyGroups.length} groups)
                      </span>
                    </div>
                  )}


                  {redundancyGroups.length > 0 ? (
                    <div className="space-y-4">
                      {redundancyGroups.map((group, index) => {
                        // Multi-criteria ranking: Score > Brightness > Balance > Smoothness > Noise
                        const getBalanceScore = (m: RedundancyGroupMember) => {
                          // More balanced = lower variance between low/mid/high
                          const avg = (m.lowEnergy + m.midEnergy + m.highEnergy) / 3;
                          const variance = Math.abs(m.lowEnergy - avg) + Math.abs(m.midEnergy - avg) + Math.abs(m.highEnergy - avg);
                          return 1 - variance; // Higher = more balanced
                        };
                        
                        const sortedMembers = [...group.members].sort((a, b) => {
                          // 1. Score (higher is better) - primary
                          const scoreDiff = b.score - a.score;
                          if (Math.abs(scoreDiff) > 2) return scoreDiff;
                          
                          // 2. Brightness/centroid (higher first)
                          const centroidDiff = b.centroid - a.centroid;
                          if (Math.abs(centroidDiff) > 100) return centroidDiff;
                          
                          // 3. Energy balance (more balanced first)
                          const balanceDiff = getBalanceScore(b) - getBalanceScore(a);
                          if (Math.abs(balanceDiff) > 0.05) return balanceDiff;
                          
                          // 4. Smoothness (higher is better)
                          const smoothDiff = b.smoothness - a.smoothness;
                          if (Math.abs(smoothDiff) > 3) return smoothDiff;
                          
                          // 5. Noise floor (lower/more negative is better)
                          return a.noiseFloorDb - b.noiseFloorDb;
                        });
                        return (
                        <motion.div
                          key={group.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 space-y-3"
                          data-testid={`redundancy-group-${index}`}
                        >
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "px-2 py-0.5 rounded text-xs font-bold",
                                group.avgSimilarity >= 0.98 ? "bg-red-500/30 text-red-300" :
                                group.avgSimilarity >= 0.95 ? "bg-amber-500/30 text-amber-300" :
                                "bg-yellow-500/30 text-yellow-300"
                              )}>
                                {Math.round(group.avgSimilarity * 100)}% Similar
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {group.members.length} IRs in group
                              </span>
                              {group.avgSimilarity >= 0.98 && (
                                <span className="text-xs text-red-400">Nearly Identical</span>
                              )}
                            </div>
                            {group.selectedToKeep && (
                              <span className="text-xs text-green-400">
                                Keeping: {group.selectedToKeep.replace(/\.wav$/i, '')}
                              </span>
                            )}
                          </div>
                          
                          {/* Selectable members - sorted by selected criteria */}
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground mb-2">
                              Click to select which IR to keep (ranked by score → brightness → balance → smoothness → noise):
                            </p>
                            <div className="grid gap-1.5">
                              {sortedMembers.map((member, memberIdx) => {
                                // Calculate tonal character label
                                const getTonalBalance = () => {
                                  if (member.lowEnergy > 0.4) return member.highEnergy > 0.3 ? "scooped" : "bass-heavy";
                                  if (member.highEnergy > 0.4) return "bright";
                                  if (member.midEnergy > 0.5) return "mid-forward";
                                  return "balanced";
                                };
                                const tonalBalance = getTonalBalance();
                                
                                return (
                                  <button
                                    key={member.filename}
                                    onClick={() => handleSelectToKeep(group.id, member.filename)}
                                    className={cn(
                                      "p-2 rounded-lg text-left transition-all",
                                      group.selectedToKeep === member.filename
                                        ? "bg-green-500/20 border border-green-500/50 text-green-300"
                                        : group.selectedToKeep
                                          ? "bg-red-500/10 border border-red-500/20 text-red-300/70 line-through"
                                          : "bg-black/20 border border-white/10 hover:border-amber-500/30 text-foreground"
                                    )}
                                    data-testid={`select-ir-${group.id}-${memberIdx}`}
                                  >
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <span className="font-mono text-xs truncate flex-1">
                                        {member.filename}
                                      </span>
                                      {group.selectedToKeep === member.filename && (
                                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
                                      <span className={cn(
                                        "px-1.5 py-0.5 rounded",
                                        member.score >= 90 ? "bg-green-500/20 text-green-300" :
                                        member.score >= 80 ? "bg-blue-500/20 text-blue-300" :
                                        "bg-amber-500/20 text-amber-300"
                                      )}>
                                        Score: {Math.round(member.score)}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {Math.round(member.centroid)} Hz
                                      </span>
                                      <span className="text-muted-foreground">
                                        Smooth: {Math.round(member.smoothness)}
                                      </span>
                                      <span className="text-muted-foreground">
                                        Noise: {Math.round(member.noiseFloorDb)} dB
                                      </span>
                                      <span className={cn(
                                        "italic",
                                        tonalBalance === "balanced" ? "text-green-400/70" : "text-muted-foreground"
                                      )}>
                                        {tonalBalance}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                      <p>No redundant IRs detected at the current threshold.</p>
                      <p className="text-xs mt-2">Try lowering the threshold to find more similar groups.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Culler Section (Preferences + Results) */}
            <div ref={cullerRef}>
            {/* Preference Query Panel */}
            <AnimatePresence>
              {showPreferenceQuery && pendingPreferences.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="glass-panel p-6 rounded-2xl space-y-4"
                  data-testid="panel-preferences"
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-semibold">Quick Preferences</h3>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Your IR collection has variety in tonal character. Help me choose the best ones for your needs:
                  </p>
                  
                  <div className="space-y-4">
                    {pendingPreferences.map((pref) => (
                      <div key={pref.type} className="space-y-2">
                        <p className="text-sm font-medium">{pref.question}</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {pref.options.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => handlePreferenceSelected(pref.type, opt.value)}
                              className={cn(
                                "px-3 py-2 rounded-lg text-sm transition-all border",
                                selectedPreferences[pref.type] === opt.value
                                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                                  : "bg-black/20 border-white/10 hover:border-amber-500/30 text-muted-foreground hover:text-foreground"
                              )}
                              data-testid={`pref-${pref.type}-${opt.value}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-3 pt-2 flex-wrap">
                    <button
                      onClick={handleApplyPreferencesAndCull}
                      disabled={Object.keys(selectedPreferences).length === 0}
                      className={cn(
                        "px-4 py-2 rounded-lg font-medium transition-all",
                        Object.keys(selectedPreferences).length > 0
                          ? "bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30"
                          : "bg-white/5 text-muted-foreground cursor-not-allowed"
                      )}
                      data-testid="button-apply-preferences"
                    >
                      Apply Preferences & Cull
                    </button>
                    <button
                      onClick={handleSkipPreferencesAndCull}
                      className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="button-skip-preferences"
                    >
                      Skip (technical only)
                    </button>
                    <button
                      onClick={() => {
                        setShowPreferenceQuery(false);
                        setPendingPreferences([]);
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors ml-auto"
                      data-testid="button-close-preferences"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Culler Panel */}
            <AnimatePresence>
              {showCuller && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="glass-panel p-6 rounded-2xl space-y-4 mt-4"
                  data-testid="panel-culler"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <Scissors className="w-5 h-5 text-purple-400" />
                      <h3 className="text-lg font-semibold">IR Culler</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Navigation buttons */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => scrollToSection(analyzeRef)}
                        className="text-primary border-primary/30 hover:bg-primary/10"
                        data-testid="button-goto-analyze-from-culler"
                      >
                        <ChevronUp className="w-4 h-4 mr-1" />
                        Analyze
                      </Button>
                      {showRedundancies && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => scrollToSection(redundancyRef)}
                          className="text-amber-400 border-amber-400/30 hover:bg-amber-400/10"
                          data-testid="button-goto-redundancy-from-culler"
                        >
                          <Target className="w-4 h-4 mr-1" />
                          Redundancy
                        </Button>
                      )}
                      <button
                        onClick={() => setShowCuller(false)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        data-testid="button-close-culler"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Reduce your collection to a target size while maximizing variety and quality.
                  </p>
                  
                  {/* Target Count Input */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="text-sm font-medium">Target count:</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cullCountInput}
                      onChange={(e) => handleCullCountChange(e.target.value)}
                      onBlur={handleCullCountBlur}
                      className="w-20 px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-center text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      data-testid="input-target-cull-count"
                    />
                    <span className="text-sm text-muted-foreground">
                      of {batchIRs.filter(ir => ir.metrics && !ir.error).length} IRs
                    </span>
                    <button
                      onClick={() => handleCullIRs()}
                      className="px-4 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-sm font-medium transition-all border border-purple-500/30"
                      data-testid="button-run-cull"
                    >
                      Cull Now
                    </button>
                  </div>
                  
                  {/* Cull Results */}
                  {cullResult && (() => {
                    // Sort helper: extract mic type and distance for sorting
                    const getMicFromFilename = (filename: string): string => {
                      const lower = filename.toLowerCase();
                      for (const mic of KNOWN_MICS) {
                        if (lower.includes(mic)) return mic;
                      }
                      return 'zzz'; // Sort unknowns last
                    };
                    const getDistFromFilename = (filename: string): number => {
                      const match = filename.match(/(\d+(?:\.\d+)?)\s*(?:in|inch|")/i);
                      return match ? parseFloat(match[1]) : 999;
                    };
                    const sortFn = (a: { filename: string }, b: { filename: string }) => {
                      const micA = getMicFromFilename(a.filename);
                      const micB = getMicFromFilename(b.filename);
                      if (micA !== micB) return micA.localeCompare(micB);
                      return getDistFromFilename(a.filename) - getDistFromFilename(b.filename);
                    };
                    const sortedKeep = [...cullResult.keep].sort(sortFn);
                    const sortedCut = [...cullResult.cut].sort(sortFn);
                    
                    return (
                    <div className="space-y-4 mt-4">
                      {/* Keep Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <h4 className="font-medium text-green-400">Keep ({sortedKeep.length})</h4>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Run redundancy check on just the kept IRs
                                const keptFilenames = new Set(sortedKeep.map(ir => ir.filename));
                                const keptBatchIRs = batchIRs.filter(ir => keptFilenames.has(ir.file.name) && ir.metrics);
                                
                                if (keptBatchIRs.length < 2) {
                                  toast({ title: "Not enough IRs", description: "Need at least 2 kept IRs to check redundancy" });
                                  return;
                                }
                                
                                // Build groups for kept IRs only
                                const keptGroups = findRedundancyGroups(
                                  keptBatchIRs.map(ir => ({
                                    filename: ir.file.name,
                                    metrics: ir.metrics!
                                  })),
                                  similarityThreshold
                                );
                                
                                if (keptGroups.length === 0) {
                                  toast({ title: "No redundancies", description: "Your kept IRs are all distinct - nice selection!" });
                                } else {
                                  // Update redundancy panel with kept-only results
                                  setRedundancyGroups(keptGroups);
                                  setShowRedundancies(true);
                                  toast({ 
                                    title: `Found ${keptGroups.length} similar group${keptGroups.length > 1 ? 's' : ''}`, 
                                    description: "Scroll up to see redundancy analysis of your kept IRs" 
                                  });
                                  // Scroll to redundancy section
                                  scrollToSection(redundancyRef);
                                }
                              }}
                              className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300"
                              data-testid="button-check-keep-redundancy"
                            >
                              <Target className="w-3 h-3 mr-1" />
                              Check Redundancy
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const text = sortedKeep.map(ir => ir.filename).join('\n');
                                navigator.clipboard.writeText(text);
                                toast({ title: "Copied", description: `${sortedKeep.length} filenames copied to clipboard` });
                              }}
                              className="h-7 px-2 text-xs text-green-400 hover:text-green-300"
                              data-testid="button-copy-keep-list"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy list
                            </Button>
                          </div>
                        </div>
                        <div className="grid gap-2">
                          {sortedKeep.map((ir, idx) => (
                            <div 
                              key={ir.filename} 
                              className="p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                            >
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div className="flex-1 min-w-0">
                                  <p className="font-mono text-sm truncate text-green-300" title={ir.filename}>
                                    {ir.filename}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">{ir.reason}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-xs text-muted-foreground">Score</div>
                                  <div className="text-sm font-bold text-green-400">{ir.score}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Cut Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-400" />
                            <h4 className="font-medium text-red-400">Cut ({sortedCut.length})</h4>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const text = sortedCut.map(ir => ir.filename).join('\n');
                              navigator.clipboard.writeText(text);
                              toast({ title: "Copied", description: `${sortedCut.length} filenames copied to clipboard` });
                            }}
                            className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
                            data-testid="button-copy-cut-list"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy list
                          </Button>
                        </div>
                        <div className="grid gap-2">
                          {sortedCut.map((ir, idx) => (
                            <div 
                              key={ir.filename} 
                              className="p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                            >
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div className="flex-1 min-w-0">
                                  <p className="font-mono text-sm truncate text-red-300" title={ir.filename}>
                                    {ir.filename}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {ir.reason}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Similar to: <span className="text-foreground/70">{ir.mostSimilarTo}</span> ({Math.round(ir.similarity * 100)}%)
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-xs text-muted-foreground">Score</div>
                                  <div className="text-sm font-bold text-red-400">{ir.score}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    );
                  })()}
                  
                  {/* Close Call Decisions */}
                  {cullCloseCalls.length > 0 && (
                    <div className="mt-6 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
                      <div className="flex items-center gap-2 mb-4">
                        <HelpCircle className="w-5 h-5 text-amber-400" />
                        <h4 className="font-medium text-amber-400">Close Calls ({cullCloseCalls.length})</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        These IRs had very similar scores. Your input can help make better choices:
                      </p>
                      <div className="space-y-4">
                        {cullCloseCalls.map((closeCall, ccIdx) => (
                          <div key={`${closeCall.micType}-${closeCall.slot}`} className="p-3 rounded-lg bg-background/50 border border-border/30">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-xs font-medium text-amber-300">{closeCall.micType.toUpperCase()}</span>
                              {closeCall.slot > 1 && (
                                <span className="text-xs text-muted-foreground">(slot {closeCall.slot})</span>
                              )}
                            </div>
                            <div className="grid gap-2">
                              {closeCall.candidates.map((candidate, candIdx) => (
                                <button
                                  key={candidate.filename}
                                  onClick={() => {
                                    // Update close call with selection
                                    const updated = [...cullCloseCalls];
                                    updated[ccIdx] = { ...updated[ccIdx], selectedFilename: candidate.filename };
                                    setCullCloseCalls(updated);
                                    toast({ title: "Selection saved", description: `Will keep ${candidate.filename}` });
                                  }}
                                  className={cn(
                                    "p-2 rounded text-left transition-all",
                                    closeCall.selectedFilename === candidate.filename
                                      ? "bg-green-500/20 border border-green-500/40"
                                      : "bg-background/30 border border-transparent hover:border-amber-500/30"
                                  )}
                                  data-testid={`button-close-call-select-${ccIdx}-${candIdx}`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-mono text-xs truncate">{candidate.filename}</p>
                                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                                        <span className="font-medium">Score: {candidate.score}</span>
                                        {candidate.position && <span>{candidate.position}</span>}
                                        {candidate.distance && <span>{candidate.distance}in</span>}
                                        <span className={cn(
                                          candidate.brightness === 'brightest' || candidate.brightness === 'bright' ? 'text-yellow-400' :
                                          candidate.brightness === 'darkest' || candidate.brightness === 'dark' ? 'text-blue-400' :
                                          'text-muted-foreground'
                                        )}>{candidate.brightness}</span>
                                      </div>
                                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs">
                                        <span className="text-cyan-400/80">Centroid: {candidate.centroid}Hz</span>
                                        <span className="text-green-400/80">Smooth: {Math.round(candidate.smoothness)}</span>
                                        <span className="text-purple-400/80 italic">{candidate.midrangeHint}</span>
                                      </div>
                                    </div>
                                    {closeCall.selectedFilename === candidate.filename && (
                                      <Check className="w-4 h-4 text-green-400 shrink-0" />
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        className="mt-4 w-full"
                        onClick={() => {
                          // Build overrides map from user selections
                          const newOverrides = new Map<string, string[]>(cullUserOverrides);
                          for (const cc of cullCloseCalls) {
                            if (cc.selectedFilename) {
                              const existing = newOverrides.get(cc.micType) || [];
                              existing[cc.slot - 1] = cc.selectedFilename;
                              newOverrides.set(cc.micType, existing);
                            }
                          }
                          // Store overrides and trigger re-cull with new overrides passed directly
                          setCullUserOverrides(newOverrides);
                          setCullCloseCalls([]);
                          
                          // Re-run culling with updated overrides passed directly (avoid async state timing)
                          handleCullIRs(true, true, newOverrides);
                        }}
                        data-testid="button-apply-close-call-choices"
                      >
                        Apply Choices & Re-cull
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Single IR Mode */}
        {mode === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input & Controls */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Clear Cache Button */}
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/clear-cache', { method: 'POST' });
                    const data = await res.json();
                    toast({
                      title: "Cache Cleared",
                      description: `Cleared ${data.cleared?.batch || 0} batch + ${data.cleared?.single || 0} single cached results`,
                    });
                  } catch {
                    toast({
                      title: "Error",
                      description: "Failed to clear cache",
                      variant: "destructive",
                    });
                  }
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                data-testid="button-clear-cache-single"
              >
                <RefreshCcw className="w-4 h-4" />
                Clear Cache
              </button>
            </div>

            {/* Upload Zone */}
            <div
              {...getRootProps()}
              className={cn(
                "relative group cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 min-h-[200px] flex flex-col items-center justify-center p-8 text-center bg-card/30",
                isDragActive 
                  ? "border-primary bg-primary/5 scale-[1.02]" 
                  : file 
                    ? "border-primary/50 bg-card/60" 
                    : "border-white/10 hover:border-white/20 hover:bg-white/5"
              )}
            >
              <input {...getInputProps()} />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {file ? (
                <div className="z-10 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 border border-primary/20">
                    <Music4 className="w-8 h-8 text-primary" />
                  </div>
                  <p className="font-mono text-sm font-medium truncate max-w-[200px] mx-auto text-primary">
                    {file.name}
                  </p>
                  <span className="text-xs text-muted-foreground block">
                    {(file.size / 1024).toFixed(1)} KB • Click to change
                  </span>
                </div>
              ) : (
                <div className="z-10 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/5 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="font-medium text-lg">Drop your IR here</p>
                    <p className="text-sm text-muted-foreground mt-1">Accepts .wav files only</p>
                  </div>
                </div>
              )}
            </div>

            {/* Metadata Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="glass-panel p-6 rounded-2xl space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Microphone</label>
                    <select
                      {...register("micType")}
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    >
                      <option value="57">SM57</option>
                      <option value="121">R121</option>
                      <option value="r92">R92</option>
                      <option value="160">M160</option>
                      <option value="421">MD421</option>
                      <option value="421-kompakt">MD421 Kompakt</option>
                      <option value="md441">MD441</option>
                      <option value="r10">R10</option>
                      <option value="m88">M88</option>
                      <option value="pr30">PR30</option>
                      <option value="e906">e906</option>
                      <option value="m201">M201</option>
                      <option value="sm7b">SM7B</option>
                      <option value="c414">C414</option>
                      <option value="roswell-cab">Roswell Cab Mic</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Position</label>
                    <select
                      {...register("micPosition")}
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    >
                      <option value="cap">Cap</option>
                      <option value="cap_offcenter">Cap_OffCenter</option>
                      <option value="capedge">CapEdge</option>
                      <option value="capedge_br">CapEdge_BR (Brighter)</option>
                      <option value="capedge_dk">CapEdge_DK (Darker)</option>
                      <option value="capedge_cone_tr">CapEdge_Cone_Tr (Transition)</option>
                      <option value="cone">Cone</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Speaker</label>
                  <select
                    {...register("speakerModel")}
                    data-testid="select-speaker"
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  >
                    <option value="g12m25">G12M (Greenback)</option>
                    <option value="v30-china">V30</option>
                    <option value="v30-blackcat">V30BC (Black Cat)</option>
                    <option value="k100">K100</option>
                    <option value="g12t75">G12T75</option>
                    <option value="g12-65">G12-65 Heritage</option>
                    <option value="g12h30-anniversary">G12H Anniversary</option>
                    <option value="celestion-cream">Cream</option>
                    <option value="ga12-sc64">GA12-SC64</option>
                    <option value="g10-sc64">GA10-SC64</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Distance</label>
                  <div className="relative">
                    <select
                      {...register("distance")}
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    >
                      <option value="0">0"</option>
                      <option value="0.5">0.5"</option>
                      <option value="1">1"</option>
                      <option value="1.5">1.5"</option>
                      <option value="2">2"</option>
                      <option value="2.5">2.5"</option>
                      <option value="3">3"</option>
                      <option value="3.5">3.5"</option>
                      <option value="4">4"</option>
                      <option value="4.5">4.5"</option>
                      <option value="5">5"</option>
                      <option value="5.5">5.5"</option>
                      <option value="6">6"</option>
                    </select>
                    <Mic2 className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                  </div>
                  {errors.distance && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.distance.message}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={!file || isSubmitting || analyzing}
                className={cn(
                  "w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 shadow-lg",
                  !file || isSubmitting
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/25 hover:-translate-y-0.5"
                )}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                  </span>
                ) : (
                  "Analyze IR"
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Visualization & Results */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Graph Card */}
            <div className="glass-panel rounded-2xl p-6 min-h-[300px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-mono font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
                  <Activity className="w-4 h-4 text-primary" /> Frequency Response
                </h3>
                {metrics && (
                  <span className="text-xs font-mono text-muted-foreground">
                    {metrics.durationSamples} samples / {metrics.peakAmplitudeDb}dB
                  </span>
                )}
              </div>
              
              <div className="flex-1 relative bg-black/20 rounded-xl overflow-hidden border border-white/5">
                {analyzing ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                ) : metrics ? (
                  <FrequencyGraph 
                    data={metrics.frequencyData} 
                    height={300} 
                    className="w-full h-full"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 font-mono text-sm">
                    AWAITING SIGNAL
                  </div>
                )}
              </div>
            </div>

            {/* Results Area */}
            <AnimatePresence>
              {result && metrics && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-2"
                >
                  <div className="flex justify-end">
                    <button
                      onClick={() => { setResult(null); setMetrics(null); }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-destructive/20 border border-white/10 text-xs font-medium transition-all text-muted-foreground hover:text-destructive"
                      data-testid="button-clear-single-result"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear Result
                    </button>
                  </div>
                  <ResultCard
                    score={result.qualityScore}
                    isPerfect={result.isPerfect ?? false}
                    advice={result.advice}
                    metrics={{
                      peak: metrics.peakAmplitudeDb,
                      duration: metrics.durationMs,
                      centroid: metrics.spectralCentroid,
                      smoothness: metrics.frequencySmoothness,
                      noiseFloor: metrics.noiseFloorDb
                    }}
                    micLabel={result.micLabel}
                    renameSuggestion={result.renameSuggestion}
                    filename={result.filename}
                    spectralDeviation={result.spectralDeviation}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
