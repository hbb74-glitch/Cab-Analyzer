import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { UploadCloud, Music4, Mic2, AlertCircle, PlayCircle, Loader2, Activity, Layers, Trash2, Copy, Check, CheckCircle, XCircle, Pencil, Lightbulb, List, Target, Scissors, RefreshCcw, HelpCircle, ChevronUp, ChevronDown, Zap, ShieldAlert, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useCreateAnalysis, analyzeAudioFile, computeDeltaMetrics, type AudioMetrics } from "@/hooks/use-analyses";
import { FrequencyGraph } from "@/components/FrequencyGraph";
import { ResultCard } from "@/components/ResultCard";
import { TonalDashboard, TonalDashboardCompact } from "@/components/TonalDashboard";
import { computeTonalFeatures } from "@/lib/tonal-engine";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useResults } from "@/context/ResultsContext";
import { api, type BatchAnalysisResponse, type BatchIRInput } from "@shared/routes";
import type { TonalProfile as TonalProfileRow } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { scoreAgainstAllProfiles, scoreWithAvoidPenalty, scoreIndividualIR, applyLearnedAdjustments, computeSpeakerRelativeProfiles, DEFAULT_PROFILES, getGearContext, parseGearFromFilename, featuresFromBands, type TonalBands, type TonalFeatures, type LearnedProfileData } from "@/lib/preference-profiles";
import { Brain, Sparkles } from "lucide-react";
import { ShotIntentBadge } from "@/components/ShotIntentBadge";
import { SummaryCopyButton } from "@/components/SummaryCopyButton";

function classifyMusicalRole(tf: TonalFeatures, speakerStats?: SpeakerStats): string {
  const bp = (tf.bandsPercent ?? {}) as any;

  const smooth = Number.isFinite(tf.smoothScore) ? (tf.smoothScore as number) : 0;
  const tilt = Number.isFinite(tf.tiltDbPerOct) ? (tf.tiltDbPerOct as number) : 0;
  const ext = Number.isFinite(tf.rolloffFreq) ? (tf.rolloffFreq as number) : 0;
  const centroid = Number.isFinite(tf.spectralCentroidHz) ? (tf.spectralCentroidHz as number) : 0;

  const air = (bp.air ?? 0) * 100;

  const rawFizz = Number.isFinite((tf as any).fizzEnergy) ? Number((tf as any).fizzEnergy) : 0;
  const fizzRatio = rawFizz > 1.2 ? rawFizz / 100 : rawFizz;
  const fizz = fizzRatio * 100;

  const mid = (bp.mid ?? 0) * 100;
  const highMid = (bp.highMid ?? 0) * 100;
  const presence = (bp.presence ?? 0) * 100;
  const lowMid = (bp.lowMid ?? 0) * 100;
  const bass = (bp.bass ?? 0) * 100;
  const subBass = (bp.subBass ?? 0) * 100;

  const bassLowMid = subBass + bass + lowMid;
  const core = Math.max(1e-6, (mid + lowMid));
  const cutCoreRatio = (highMid + presence) / core;

  const zCentroid = speakerStats ? zScore(centroid, speakerStats.mean.centroid, speakerStats.std.centroid) : 0;
  const zExt = speakerStats ? zScore(ext, speakerStats.mean.ext, speakerStats.std.ext) : 0;
  const zPresence = speakerStats ? zScore(presence, speakerStats.mean.presence, speakerStats.std.presence) : 0;
  const zTilt = speakerStats ? zScore(tilt, speakerStats.mean.tilt, speakerStats.std.tilt) : 0;
  const zAir = speakerStats ? zScore(air, speakerStats.mean.air, speakerStats.std.air) : 0;
  const zFizz = speakerStats ? zScore(fizz, speakerStats.mean.fizz, speakerStats.std.fizz) : 0;

  const balancedBands =
    mid >= 22 && mid <= 35 &&
    presence >= 18 && presence <= 42 &&
    highMid >= 18 && highMid <= 45 &&
    cutCoreRatio >= 1.10 && cutCoreRatio <= 2.40 &&
    air <= 6.0 &&
    fizz <= 1.5;

  const notExtremeTilt = tilt >= -5.5 && tilt <= -1.0;
  const notTooDark = ext === 0 ? true : ext >= 4200;
  const notBodyLean = bassLowMid >= 18;

  if (balancedBands && notExtremeTilt && notTooDark && notBodyLean) {
    return "Foundation";
  }

  if ((ext > 0 && ext < 3600) || tilt <= -6.2 || zExt <= -1.2 || zTilt <= -1.3) {
    return "Dark Specialty";
  }

  const extended = ext > 0 && ext >= 4600;
  const verySmooth = smooth >= 88;
  const hasAir = air >= 4.0 || zAir >= 0.70;
  const notFizzy = fizz <= 1.2 || zFizz <= 0.35;
  const presenceModerate = presence >= 22 && presence <= 55;
  const notScoopedToDeath = (mid + lowMid) >= 22;
  const notExtremeCut = presence <= 58 && zPresence <= 1.9 && cutCoreRatio <= 3.4;

  if (extended && verySmooth && hasAir && notFizzy && presenceModerate && notScoopedToDeath && notExtremeCut) {
    return "Lead Polish";
  }

  const cutForward =
    presence >= 50 ||
    cutCoreRatio >= 3.0 ||
    zPresence >= 1.15 ||
    zCentroid >= 1.15;

  const midLean = (mid + lowMid) <= 24;
  if (cutForward && midLean) return "Cut Layer";

  const midHeavy = mid >= 34 || lowMid >= 10 || bassLowMid >= 24;
  const notPresenceSpiky = presence <= 36 && zPresence <= 0.35;
  if (midHeavy && notPresenceSpiky) return "Mid Thickener";

  const rolledOff = ext > 0 && ext <= 4500;
  const veryDarkTilt = tilt <= -5.2 || zTilt <= -0.8;
  const lowFizz = fizz <= 0.6 || zFizz <= -0.4;
  const lowAir = air <= 1.8 || zAir <= -0.3;
  const notCutForward = (presence <= 26) || (cutCoreRatio <= 2.4);

  if ((rolledOff || veryDarkTilt) && smooth >= 82 && lowFizz && lowAir && notCutForward) {
    return "Fizz Tamer";
  }

  if (cutForward && (mid + lowMid) <= 28) return "Cut Layer";
  if (midHeavy) return "Mid Thickener";
  if ((tilt <= -4.8 || (ext > 0 && ext <= 4700) || zTilt <= -0.7) && (fizz <= 1.0 || zFizz <= -0.2)) return "Fizz Tamer";
  return "Foundation";
}

type SpeakerStats = {
  mean: Record<string, number>;
  std: Record<string, number>;
};

function inferSpeakerIdFromFilename(filename: string): string {
  const base = (filename || "").split("/").pop() || filename || "";
  const first = base.split("_")[0] || "UNKNOWN";
  return first.toUpperCase();
}

function zScore(v: number, mean: number, std: number): number {
  if (!Number.isFinite(v) || !Number.isFinite(mean) || !Number.isFinite(std) || std <= 1e-9) return 0;
  return (v - mean) / std;
}

function computeSpeakerStats(rows: Array<{ filename: string; tf: TonalFeatures }>): Map<string, SpeakerStats> {
  const bySpk = new Map<string, Array<{ filename: string; tf: TonalFeatures }>>();
  for (const r of rows) {
    const spk = inferSpeakerIdFromFilename(r.filename);
    if (!bySpk.has(spk)) bySpk.set(spk, []);
    bySpk.get(spk)!.push(r);
  }

  const stats = new Map<string, SpeakerStats>();
  const keys = ["centroid", "tilt", "ext", "presence", "hiMidMid", "smooth", "air", "fizz"];

  for (const [spk, list] of Array.from(bySpk.entries())) {
    const vals: Record<string, number[]> = Object.fromEntries(keys.map(k => [k, []]));

    for (const r of list) {
      const bp: any = (r.tf.bandsPercent ?? {});
      const centroid = Number(r.tf.spectralCentroidHz ?? 0);
      const tilt = Number(r.tf.tiltDbPerOct ?? 0);
      const ext = Number(r.tf.rolloffFreq ?? 0);
      const smooth = Number(r.tf.smoothScore ?? 0);
      const midPct = Number((bp.mid ?? 0) * 100);
      const highMidPct = Number((bp.highMid ?? 0) * 100);
      const presencePct = Number((bp.presence ?? 0) * 100);
      const airPct = Number((bp.air ?? 0) * 100);
      const rawFizz = Number(r.tf.fizzEnergy ?? 0);
      const fizzPct = (Number.isFinite(rawFizz) ? (rawFizz > 1.2 ? rawFizz : rawFizz * 100) : 0);
      const hiMidMid = midPct > 0 ? (highMidPct / midPct) : 10;

      vals.centroid.push(centroid);
      vals.tilt.push(tilt);
      vals.ext.push(ext);
      vals.smooth.push(smooth);
      vals.presence.push(presencePct);
      vals.air.push(airPct);
      vals.fizz.push(fizzPct);
      vals.hiMidMid.push(hiMidMid);
    }

    const mean: Record<string, number> = {};
    const std: Record<string, number> = {};

    for (const k of keys) {
      const arr = vals[k].filter(Number.isFinite);
      const m = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const v = arr.length ? arr.reduce((a, b) => a + Math.pow(b - m, 2), 0) / arr.length : 0;
      mean[k] = m;
      std[k] = Math.sqrt(v) || 1;
    }

    stats.set(spk, { mean, std });
  }

  return stats;
}

function applyContextBias(
  baseRole: string,
  tf: TonalFeatures,
  filename: string,
  speakerStats?: SpeakerStats
): string {
  const name = (filename || "").toLowerCase();
  const bp: any = (tf.bandsPercent ?? {});

  const centroid = Number(tf.spectralCentroidHz ?? 0);
  const ext = Number(tf.rolloffFreq ?? 0);
  const smooth = Number(tf.smoothScore ?? 0);
  const tilt = Number(tf.tiltDbPerOct ?? 0);
  const midPct = Number((bp.mid ?? 0) * 100);
  const highMidPct = Number((bp.highMid ?? 0) * 100);
  const presencePct = Number((bp.presence ?? 0) * 100);
  const hiMidMid = midPct > 0 ? (highMidPct / midPct) : 10;

  const airPct = Number((bp.air ?? 0) * 100);
  const rawFizz = Number((tf as any).fizzEnergy ?? 0);
  const fizzPct = (Number.isFinite(rawFizz) ? (rawFizz > 1.2 ? rawFizz : rawFizz * 100) : 0);

  const zCentroid = speakerStats ? zScore(centroid, speakerStats.mean.centroid, speakerStats.std.centroid) : 0;
  const zExt = speakerStats ? zScore(ext, speakerStats.mean.ext, speakerStats.std.ext) : 0;
  const zPresence = speakerStats ? zScore(presencePct, speakerStats.mean.presence, speakerStats.std.presence) : 0;
  const zHiMidMid = speakerStats ? zScore(hiMidMid, speakerStats.mean.hiMidMid, speakerStats.std.hiMidMid) : 0;
  const zAir = speakerStats ? zScore(airPct, speakerStats.mean.air, speakerStats.std.air) : 0;
  const zFizz = speakerStats ? zScore(fizzPct, speakerStats.mean.fizz, speakerStats.std.fizz) : 0;
  const zTilt = speakerStats ? zScore(tilt, speakerStats.mean.tilt, speakerStats.std.tilt) : 0;

  const isPresenceTagged = name.includes("presence");
  const isClearlyDark = (ext > 0 && ext <= 3900) || (tilt <= -5.8);
  if (baseRole === "Fizz Tamer" && (isPresenceTagged || presencePct >= 28) && !isClearlyDark) {
    baseRole = "Cut Layer";
  }

  const objectivelyCutty =
    (zCentroid >= 1.0 && zExt >= 0.8) ||
    (zPresence >= 1.1) ||
    (zHiMidMid >= 1.2);

  if (objectivelyCutty && baseRole === "Foundation") {
    return "Cut Layer";
  }

  const score: Record<string, number> = {
    "Foundation": 0,
    "Cut Layer": 0,
    "Mid Thickener": 0,
    "Fizz Tamer": 0,
    "Lead Polish": 0,
    "Dark Specialty": 0,
  };

  score[baseRole] += 3.0;

  if (name.includes("presence")) score["Cut Layer"] += 0.8;
  if (name.includes("capedge_br")) score["Cut Layer"] += 0.4;
  if (name.includes("capedge")) score["Foundation"] += 0.2;
  if (name.includes("cone_tr") || name.includes("cap_cone_tr")) score["Fizz Tamer"] += 0.4;
  if (name.includes("cone_")) score["Mid Thickener"] += 0.3;
  if (name.includes("fredman")) score["Foundation"] += 0.4;
  if (name.includes("_thick_")) score["Mid Thickener"] += 0.5;
  if (name.includes("_balanced_")) score["Foundation"] += 0.4;
  if (name.includes("_tight_")) score["Lead Polish"] += 0.4;

  if (name.includes("_r121_") || name.includes("r121")) score["Mid Thickener"] += 0.4;
  if (name.includes("_roswell_") || name.includes("roswell")) score["Dark Specialty"] += 0.7;
  if (name.includes("_md441_") || name.includes("md441")) score["Cut Layer"] += 0.4;
  if (name.includes("_pr30_") || name.includes("pr30")) score["Foundation"] += 0.35;
  if (name.includes("_md421_") || name.includes("md421")) score["Foundation"] += 0.25;
  if (name.includes("_m201_") || name.includes("m201")) score["Foundation"] += 0.25;
  if (name.includes("_e906_") || name.includes("e906")) score["Cut Layer"] += 0.25;
  if (name.includes("_sm57_") || name.includes("sm57")) score["Foundation"] += 0.15;

  const sheenCandidate = smooth >= 88 && ext >= 4800 && presencePct <= 48 && hiMidMid <= 1.75 && tilt >= -5.2 && (airPct >= 2.0 || zAir >= 0.7) && (fizzPct <= 0.9 || zFizz <= 0.2);
  if (sheenCandidate) score["Lead Polish"] += 0.9;

  if ((ext > 0 && ext < 3600) || tilt <= -6.2 || zTilt <= -1.3) score["Dark Specialty"] += 1.0;

  let best = baseRole;
  let bestV = score[baseRole];
  for (const [k, v] of Object.entries(score)) {
    if (v > bestV) { bestV = v; best = k; }
  }
  return best;
}

function roleBadgeClass(role: string): string {
  switch (role) {
    case "Cut Layer": return "bg-cyan-500/15 text-cyan-400";
    case "Mid Thickener": return "bg-amber-500/15 text-amber-400";
    case "Fizz Tamer": return "bg-sky-500/15 text-sky-400";
    case "Lead Polish": return "bg-violet-500/15 text-violet-400";
    case "Dark Specialty": return "bg-zinc-500/15 text-zinc-300";
    case "Foundation": return "bg-emerald-500/15 text-emerald-400";
    default: return "bg-white/10 text-muted-foreground";
  }
}

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
  "ga10sc64": "g10-sc64", "ga10": "g10-sc64", "g10sc64": "g10-sc64", "g10-sc64": "g10-sc64", "g10": "g10-sc64",
  "karnivore": "karnivore", "karni": "karnivore",
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

const BLEND_MICS_LIST = ['sm57', 'r121', 'm160', 'md421', 'md421kompakt', 'md441', 'pr30', 'e906', 'm201', 'sm7b', 'c414', 'r92', 'r10', 'm88', 'roswell'];
const BLEND_TECHNIQUE_NAMES = ['fredman'];

const POS_TOKENS = [
  "cap_offcenter",
  "capedge_cone_tr",
  "capedge_br",
  "capedge_dk",
  "capedge",
  "cap",
  "cone",
];

function detectMicToken(filename: string): string | null {
  const lower = filename.toLowerCase();
  for (const mic of BLEND_MICS_LIST) {
    if (lower.includes(mic)) return mic;
  }
  return null;
}

function detectPosToken(filename: string): string | null {
  const lower = filename.toLowerCase();
  for (const p of POS_TOKENS) {
    if (lower.includes(p)) return p;
  }
  return null;
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const a = sorted[base];
  const b = sorted[Math.min(base + 1, sorted.length - 1)];
  return a + (b - a) * rest;
}

function detectSpeakerPrefix(filename: string): string {
  const lower = filename.toLowerCase();
  const mic = detectMicToken(lower);
  if (!mic) return (lower.split("_")[0] ?? lower).trim();
  const idx = lower.indexOf(mic);
  if (idx > 0) return lower.slice(0, idx).trim();
  return (lower.split("_")[0] ?? lower).trim();
}

function redundancyComparable(f1: string, f2: string): boolean {
  return (
    detectSpeakerPrefix(f1) === detectSpeakerPrefix(f2) &&
    detectMicToken(f1) === detectMicToken(f2) &&
    detectPosToken(f1) === detectPosToken(f2)
  );
}

function maxAbsDiff(a: number[], b: number[]): number {
  let m = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = Math.abs(a[i] - b[i]);
    if (d > m) m = d;
  }
  return m;
}

function detectBlendFromFilename(filename: string): { isBlend: boolean; isTechnique: boolean } {
  const lower = filename.toLowerCase();
  for (const tech of BLEND_TECHNIQUE_NAMES) {
    if (lower.includes(tech)) return { isBlend: true, isTechnique: true };
  }
  let micCount = 0;
  for (const mic of BLEND_MICS_LIST) {
    if (lower.includes(mic)) micCount++;
  }
  return { isBlend: micCount >= 2, isTechnique: false };
}

function canonicalTiltFromShapeDb(shape: any): number {
  const presence = Number.isFinite(shape?.presence) ? shape.presence : 0;
  const air      = Number.isFinite(shape?.air) ? shape.air : 0;
  const bass     = Number.isFinite(shape?.bass) ? shape.bass : 0;
  const subBass  = Number.isFinite(shape?.subBass) ? shape.subBass : 0;
  return ((presence + air) / 2) - ((bass + subBass) / 2);
}

function canonicalTiltLabel(tilt: number): string {
  if (!Number.isFinite(tilt)) return "Neutral";
  if (tilt >= 2.5) return "Bright";
  if (tilt <= -2.5) return "Dark";
  return "Neutral";
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

const FEATURE_EXPECTED_RANGES: { mean: number; std: number }[] = (() => {
  const ranges: { mean: number; std: number }[] = [];
  for (let i = 0; i < 24; i++) {
    ranges.push({ mean: 1 / 24, std: 0.03 });
  }
  ranges.push({ mean: -1.5, std: 1.5 });
  ranges.push({ mean: 3500, std: 2000 });
  ranges.push({ mean: 4, std: 3 });
  ranges.push({ mean: 5, std: 5 });
  ranges.push({ mean: 1, std: 1.5 });
  return ranges;
})();

function buildPerceptualFeatureVector(m: AudioMetrics): number[] {
  const logBands = m.logBandEnergies || new Array(24).fill(1 / 24);
  const raw = [
    ...logBands,
    m.spectralTilt || 0,
    m.rolloffFreq || 3000,
    m.residualRMS || 0,
    m.maxNotchDepth || 0,
    m.notchCount || 0,
  ];
  return raw.map((v, i) => {
    const r = FEATURE_EXPECTED_RANGES[i];
    return r && r.std > 0 ? (v - r.mean) / r.std : v;
  });
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

function calculateSimilarity(metrics1: AudioMetrics, metrics2: AudioMetrics): {
  similarity: number;
  details: RedundantPair['details'];
} {
  const vec1 = buildPerceptualFeatureVector(metrics1);
  const vec2 = buildPerceptualFeatureVector(metrics2);
  const similarity = cosineSimilarity(vec1, vec2);

  const centroidDiff = Math.abs(metrics1.spectralCentroid - metrics2.spectralCentroid);
  const centroidProximity = Math.max(0, 1 - centroidDiff / 3000);

  return {
    similarity,
    details: { frequencyCorrelation: similarity, centroidProximity, energyMatch: similarity }
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
  threshold: number = 0.985
): RedundancyGroup[] {
  const n = irs.length;
  if (n < 2) return [];
  
  const uf = new UnionFind(n);
  const similarities: Map<string, number> = new Map();
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!redundancyComparable(irs[i].filename, irs[j].filename)) continue;

      const { similarity } = calculateSimilarity(irs[i].metrics, irs[j].metrics);
      const vec1 = buildPerceptualFeatureVector(irs[i].metrics);
      const vec2 = buildPerceptualFeatureVector(irs[j].metrics);
      const mDiff = maxAbsDiff(vec1, vec2);

      if (similarity >= threshold && mDiff <= 1.25) {
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
      smoothness: irs[idx].metrics.smoothScore ?? irs[idx].metrics.frequencySmoothness,
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

interface CloseCallValueInfo {
  effectiveScore: number;
  baseScore: number;
  prefBoost: number;
  gearBoost: number;
  roleBoost: number;
  blendPenalty: number;
  diversityFromSelected: number;
  preferenceRole?: string;
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
    blendInfo?: BlendRedundancyInfo;
    valueInfo?: CloseCallValueInfo;
  }[];
  selectedFilename: string | null; // User's choice, null if not yet decided
}

interface BlendRedundancyInfo {
  isBlend: boolean;
  blendMics: string[];
  componentMatches: { mic: string; filename: string; similarity: number }[];
  maxComponentSimilarity: number;
  uniqueContribution: number;
  verdict: 'essential' | 'adds-value' | 'redundant';
  explanation: string;
  isTechnique?: boolean;
}

interface CullResult {
  keep: { filename: string; reason: string; score: number; diversityContribution: number; preferenceRole?: string; blendInfo?: BlendRedundancyInfo; valueInfo?: CloseCallValueInfo }[];
  cut: { filename: string; reason: string; score: number; mostSimilarTo: string; similarity: number; preferenceRole?: string; blendInfo?: BlendRedundancyInfo; valueInfo?: CloseCallValueInfo }[];
  closeCallsResolved?: boolean;
}

// Cull IRs to a target count, maximizing variety and quality
// Uses per-mic-type selection: keeps best examples of each mic proportionally
// userOverrides: Map of mic type -> array of filenames user has chosen to keep
interface IRPreferenceInfo {
  featuredScore: number;
  bodyScore: number;
  bestProfile: string;
  bestScore: number;
  avoidPenalty: number;
}

function cullIRs(
  irs: { filename: string; metrics: AudioMetrics; score?: number }[],
  targetCount: number,
  userOverrides: Map<string, string[]> = new Map(),
  preferenceMap?: Map<string, IRPreferenceInfo>,
  gearSentimentMap?: Map<string, number>,
  blendThresholdOverride: number = 0.93,
  roleBalanceMode: 'off' | 'protect' | 'favor' = 'off'
): { result: CullResult; closeCalls: CullCloseCall[]; roleStats?: { featureCount: number; bodyCount: number; totalClassified: number; featureKept: number; bodyKept: number } } {
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
  const getSpeakerPrefix = (filename: string): string => {
    const lower = filename.toLowerCase();
    const mics = ['sm57', 'r121', 'm160', 'md421', 'md421kompakt', 'md441', 'pr30', 'e906', 'm201', 'sm7b', 'c414', 'r92', 'r10', 'm88', 'roswell'];
    let firstIdx = Number.POSITIVE_INFINITY;
    for (const mic of mics) {
      const idx = lower.indexOf(mic);
      if (idx !== -1 && idx < firstIdx) firstIdx = idx;
    }
    if (!Number.isFinite(firstIdx) || firstIdx === Number.POSITIVE_INFINITY) {
      return (lower.split("_")[0] ?? lower).trim();
    }
    return lower.slice(0, firstIdx).trim();
  };

  const detectBlendMicsCull = (filename: string): { mics: string[]; isTechnique: boolean } => {
    const lower = filename.toLowerCase();
    const BLEND_TECHNIQUES: Record<string, string[]> = { 'fredman': ['sm57', 'sm57'] };
    for (const [technique, mics] of Object.entries(BLEND_TECHNIQUES)) {
      if (lower.includes(technique)) return { mics, isTechnique: true };
    }
    const detected: string[] = [];
    const mics = ['sm57', 'r121', 'm160', 'md421', 'md421kompakt', 'md441', 'pr30', 'e906', 'm201', 'sm7b', 'c414', 'r92', 'r10', 'm88', 'roswell'];
    for (const mic of mics) {
      if (lower.includes(mic)) detected.push(mic);
    }
    return { mics: detected, isTechnique: false };
  };

  const getMicType = (filename: string): string => {
    const det = detectBlendMicsCull(filename);
    if (det.mics.length >= 2 && !det.isTechnique) {
      const combo = [...det.mics].sort().join("_");
      return `combo_${combo}`;
    }
    if (det.mics.length === 1) return det.mics[0];
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

  // Build similarity matrix for diversity consideration
  // Do NOT let cross-speaker similarities drive culling.
  const n = irs.length;
  const similarityMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (getSpeakerPrefix(irs[i].filename) !== getSpeakerPrefix(irs[j].filename)) {
        similarityMatrix[i][j] = 0;
        similarityMatrix[j][i] = 0;
        continue;
      }
      const { similarity } = calculateSimilarity(irs[i].metrics, irs[j].metrics);
      similarityMatrix[i][j] = similarity;
      similarityMatrix[j][i] = similarity;
    }
  }

  const countSoloShots = (micName: string, speakerPrefix: string): number => {
    let count = 0;
    for (let j = 0; j < n; j++) {
      if (getSpeakerPrefix(irs[j].filename) !== speakerPrefix) continue;
      const det = detectBlendMicsCull(irs[j].filename);
      if (det.mics.length === 1 && det.mics[0] === micName) count++;
    }
    return count;
  };

  const blendInfoMap = new Map<number, BlendRedundancyInfo>();
  for (let i = 0; i < n; i++) {
    const { mics: blendMics, isTechnique } = detectBlendMicsCull(irs[i].filename);
    if (blendMics.length < 2 && !isTechnique) continue;

    if (isTechnique) {
      blendInfoMap.set(i, {
        isBlend: true, blendMics, componentMatches: [],
        maxComponentSimilarity: 0, uniqueContribution: 1,
        verdict: 'essential', isTechnique: true,
        explanation: `Named technique blend — unique mic arrangement not replicable from solo shots`
      });
      continue;
    }

    const uniqueMics = Array.from(new Set(blendMics));
    const componentMatches: BlendRedundancyInfo['componentMatches'] = [];
    for (const mic of uniqueMics) {
      let bestSim = 0;
      let bestFile = '';
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const jDet = detectBlendMicsCull(irs[j].filename);
        if (jDet.mics.length === 1 && jDet.mics[0] === mic) {
          const sim = similarityMatrix[i][j];
          if (sim > bestSim) {
            bestSim = sim;
            bestFile = irs[j].filename;
          }
        }
      }
      if (bestFile) {
        componentMatches.push({ mic, filename: bestFile, similarity: bestSim });
      }
    }

    if (componentMatches.length === 0) {
      blendInfoMap.set(i, {
        isBlend: true, blendMics, componentMatches: [],
        maxComponentSimilarity: 0, uniqueContribution: 1,
        verdict: 'essential',
        explanation: `${blendMics.map(m => m.toUpperCase()).join('+')} blend — no matching single-mic captures in batch to compare`
      });
      continue;
    }

    const maxSim = Math.max(...componentMatches.map(c => c.similarity));
    const uniqueContribution = 1 - maxSim;
    const closestComponent = componentMatches.reduce((a, b) => a.similarity > b.similarity ? a : b);
    const simPct = Math.round(closestComponent.similarity * 100);

    const spk = getSpeakerPrefix(irs[i].filename);
    const allComponentsWellCovered = uniqueMics.every(m => countSoloShots(m, spk) >= 3);
    const effectiveThreshold = allComponentsWellCovered
      ? Math.max(blendThresholdOverride - 0.08, 0.78)
      : blendThresholdOverride;
    const effectiveAddsValueFloor = effectiveThreshold - 0.15;

    let verdict: BlendRedundancyInfo['verdict'];
    let explanation: string;
    const coverageNote = allComponentsWellCovered ? ' (strict — solo coverage is strong)' : '';
    if (maxSim >= effectiveThreshold) {
      verdict = 'redundant';
      explanation = `${simPct}% match to ${closestComponent.mic.toUpperCase()} solo — solo covers this tone${coverageNote}`;
    } else if (maxSim >= effectiveAddsValueFloor) {
      verdict = 'adds-value';
      explanation = `${Math.round(uniqueContribution * 100)}% unique character vs closest solo (${closestComponent.mic.toUpperCase()}) — unique flavor for layering${coverageNote}`;
    } else {
      verdict = 'essential';
      explanation = `${Math.round(uniqueContribution * 100)}% unique character — standalone tone the solos can't replicate`;
    }

    blendInfoMap.set(i, {
      isBlend: true, blendMics, componentMatches,
      maxComponentSimilarity: maxSim, uniqueContribution, verdict, explanation
    });
  }

  // Group IRs by speaker + mic type (this is what makes culling actually behave differently)
  const micGroups = new Map<string, number[]>();
  irs.forEach((ir, idx) => {
    const key = `${getSpeakerPrefix(ir.filename)}__${getMicType(ir.filename)}`;
    if (!micGroups.has(key)) micGroups.set(key, []);
    micGroups.get(key)!.push(idx);
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
  
  // Pre-compute batch 6-band averages once for tonal hints
  const batchBandAvgs = (() => {
    let sumMid = 0, sumRatio = 0, sumLowMid = 0, sumPresence = 0;
    const n = irs.length;
    for (const ir of irs) {
      const t = (ir.metrics.subBassEnergy || 0) + (ir.metrics.bassEnergy || 0) + (ir.metrics.lowMidEnergy || 0) +
        (ir.metrics.midEnergy6 || 0) + (ir.metrics.highMidEnergy || 0) + (ir.metrics.presenceEnergy || 0);
      if (t === 0) continue;
      const mV = ((ir.metrics.midEnergy6 || 0) / t) * 100;
      const hV = ((ir.metrics.highMidEnergy || 0) / t) * 100;
      sumMid += mV;
      sumRatio += mV > 0 ? hV / mV : 0;
      sumLowMid += ((ir.metrics.lowMidEnergy || 0) / t) * 100;
      sumPresence += ((ir.metrics.presenceEnergy || 0) / t) * 100;
    }
    return { mid: sumMid / n, ratio: sumRatio / n, lowMid: sumLowMid / n, presence: sumPresence / n };
  })();

  // Helper to generate tonal hint from 6-band data (same approach as Smart Thin)
  const getMidrangeHint = (idx: number): string => {
    const m = irs[idx].metrics;
    const total6 = (m.subBassEnergy || 0) + (m.bassEnergy || 0) + (m.lowMidEnergy || 0) +
      (m.midEnergy6 || 0) + (m.highMidEnergy || 0) + (m.presenceEnergy || 0);
    if (total6 === 0) return 'neutral';

    const mid = ((m.midEnergy6 || 0) / total6) * 100;
    const highMid = ((m.highMidEnergy || 0) / total6) * 100;
    const presence = ((m.presenceEnergy || 0) / total6) * 100;
    const lowMid = ((m.lowMidEnergy || 0) / total6) * 100;
    const ratio = mid > 0 ? highMid / mid : 0;

    const hints: string[] = [];
    if (mid > batchBandAvgs.mid * 1.1) hints.push('mid+');
    else if (mid < batchBandAvgs.mid * 0.9) hints.push('mid-');
    if (ratio > batchBandAvgs.ratio * 1.15) hints.push('bite');
    else if (ratio < batchBandAvgs.ratio * 0.85) hints.push('smooth');
    if (lowMid > batchBandAvgs.lowMid * 1.1) hints.push('thick');
    if (presence > batchBandAvgs.presence * 1.15) hints.push('airy');
    return hints.length > 0 ? hints.join(', ') : 'neutral';
  };

  const getPreferenceRole = (idx: number): string | undefined => {
    if (!preferenceMap) return undefined;
    const pref = preferenceMap.get(irs[idx].filename);
    if (!pref || pref.bestScore < 35) return undefined;
    return pref.bestProfile === "Featured" ? "Feature element" : "Body element";
  };

  const roleDistribution = (() => {
    if (!preferenceMap || preferenceMap.size === 0) return null;
    let featureCount = 0;
    let bodyCount = 0;
    let unclassified = 0;
    for (let i = 0; i < irs.length; i++) {
      const pref = preferenceMap.get(irs[i].filename);
      if (!pref || pref.bestScore < 35) { unclassified++; continue; }
      if (pref.bestProfile === "Featured") featureCount++;
      else bodyCount++;
    }
    const totalClassified = featureCount + bodyCount;
    if (totalClassified < 5) return null;
    const featureRatio = featureCount / totalClassified;
    const bodyRatio = bodyCount / totalClassified;
    const featureScarce = featureRatio < 0.25;
    const bodyScarce = bodyRatio < 0.25;
    return { featureCount, bodyCount, totalClassified, unclassified, featureRatio, bodyRatio, featureScarce, bodyScarce };
  })();

  const getRoleScarcityBoost = (idx: number): number => {
    if (roleBalanceMode === 'off' || !preferenceMap || !roleDistribution) return 0;
    const pref = preferenceMap.get(irs[idx].filename);
    if (!pref || pref.bestScore < 50) return 0;

    const isScarceRole = (pref.bestProfile === "Featured" && roleDistribution.featureScarce) ||
                         (pref.bestProfile === "Body" && roleDistribution.bodyScarce);
    if (!isScarceRole) return 0;

    const ratio = pref.bestProfile === "Featured" ? roleDistribution.featureRatio : roleDistribution.bodyRatio;
    const scarcityFactor = Math.max(0, 1 - ratio * 4);
    const confidenceScale = Math.min(1, (pref.bestScore - 50) / 50);
    const qualityFloor = Math.max(0, ((irs[idx].score || 85) - 70) / 30);

    if (roleBalanceMode === 'favor') {
      return scarcityFactor * 10 * confidenceScale * qualityFloor + 3;
    }
    return scarcityFactor * 6 * confidenceScale * qualityFloor + 2;
  };

  const getGearSentimentBoost = (idx: number): number => {
    if (!gearSentimentMap || gearSentimentMap.size === 0) return 0;
    const filename = irs[idx].filename.toLowerCase();
    let totalSentiment = 0;
    let gearMatches = 0;
    for (const [gear, sentiment] of Array.from(gearSentimentMap.entries())) {
      if (filename.includes(gear.toLowerCase())) {
        totalSentiment += sentiment;
        gearMatches++;
      }
    }
    if (gearMatches === 0) return 0;
    const avgSentiment = totalSentiment / gearMatches;
    return Math.max(-5, Math.min(5, avgSentiment * 1.5));
  };

  const getBlendRedundancyPenalty = (idx: number): number => {
    const info = blendInfoMap.get(idx);
    if (!info) return 0;
    if (info.isTechnique) return 0;
    if (info.verdict === 'redundant') return 10;
    if (info.verdict === 'adds-value') return 4;
    return 0;
  };

  const getEffectiveScore = (idx: number): number => {
    const baseScore = irs[idx].score || 85;
    const gearBoost = getGearSentimentBoost(idx);
    const blendPenalty = getBlendRedundancyPenalty(idx);
    const roleBoost = getRoleScarcityBoost(idx);
    if (!preferenceMap) return baseScore + gearBoost - blendPenalty + roleBoost;
    const pref = preferenceMap.get(irs[idx].filename);
    if (!pref) return baseScore + gearBoost - blendPenalty + roleBoost;
    const prefBoost = Math.max(0, (pref.bestScore - 35) / 65) * 8;
    const penalty = pref.avoidPenalty;
    return baseScore + prefBoost - penalty + gearBoost - blendPenalty + roleBoost;
  };

  const getValueBreakdown = (idx: number, alreadySelected: number[]): CloseCallValueInfo => {
    const baseScore = irs[idx].score || 85;
    const gearBoost = getGearSentimentBoost(idx);
    const blendPenalty = getBlendRedundancyPenalty(idx);
    const roleBoost = getRoleScarcityBoost(idx);
    let prefBoost = 0;
    if (preferenceMap) {
      const pref = preferenceMap.get(irs[idx].filename);
      if (pref) {
        prefBoost = Math.max(0, (pref.bestScore - 35) / 65) * 8 - pref.avoidPenalty;
      }
    }
    let diversityFromSelected = 0;
    if (alreadySelected.length > 0) {
      let minSim = 1;
      for (const selIdx of alreadySelected) {
        minSim = Math.min(minSim, similarityMatrix[idx][selIdx]);
      }
      diversityFromSelected = Math.round((1 - minSim) * 100);
    }
    return {
      effectiveScore: getEffectiveScore(idx),
      baseScore,
      prefBoost: Math.round(prefBoost * 10) / 10,
      gearBoost: Math.round(gearBoost * 10) / 10,
      roleBoost: Math.round(roleBoost * 10) / 10,
      blendPenalty: Math.round(blendPenalty * 10) / 10,
      diversityFromSelected,
      preferenceRole: getPreferenceRole(idx),
    };
  };

  const selected: number[] = [];
  
  for (const [mic, indices] of Array.from(micGroups.entries())) {
    const slotsForMic = micSlots.get(mic) || 1;
    
    const userChoices = userOverrides.get(mic) || [];
    
    const sortedByScore = [...indices].sort((a, b) => {
      return getEffectiveScore(b) - getEffectiveScore(a);
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
              smoothness: (irs[idx].metrics.smoothScore ?? irs[idx].metrics.frequencySmoothness) || 0,
              centroid: Math.round(irs[idx].metrics.spectralCentroid),
              midrangeHint: getMidrangeHint(idx),
              blendInfo: blendInfoMap.get(idx),
              valueInfo: getValueBreakdown(idx, selected)
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
          const qualityScore = (getEffectiveScore(candidateIdx) - 70) / 30;
          
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
                smoothness: (irs[c.idx].metrics.smoothScore ?? irs[c.idx].metrics.frequencySmoothness) || 0,
                centroid: Math.round(irs[c.idx].metrics.spectralCentroid),
                midrangeHint: getMidrangeHint(c.idx),
                blendInfo: blendInfoMap.get(c.idx),
                valueInfo: getValueBreakdown(c.idx, [...selected, ...micSelected])
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
      
      reason = parts.length > 0 ? parts.join(', ') : "Adds tonal variety";
    }
    
    keep.push({
      filename: ir.filename,
      reason,
      score: ir.score || 85,
      diversityContribution,
      preferenceRole: getPreferenceRole(idx),
      blendInfo: blendInfoMap.get(idx),
      valueInfo: getValueBreakdown(idx, selected.filter(s => s !== idx))
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
      similarity: maxSim,
      preferenceRole: getPreferenceRole(idx),
      blendInfo: blendInfoMap.get(idx),
      valueInfo: getValueBreakdown(idx, selected)
    });
  }

  // Sort keep by diversity contribution (descending), cut by similarity (descending)
  keep.sort((a, b) => b.diversityContribution - a.diversityContribution);
  cut.sort((a, b) => b.similarity - a.similarity);

  const roleStats = roleDistribution ? {
    featureCount: roleDistribution.featureCount,
    bodyCount: roleDistribution.bodyCount,
    totalClassified: roleDistribution.totalClassified,
    featureKept: keep.filter(k => k.preferenceRole === "Feature element").length,
    bodyKept: keep.filter(k => k.preferenceRole === "Body element").length
  } : undefined;

  return { 
    result: { keep, cut, closeCallsResolved: closeCalls.length === 0 },
    closeCalls,
    roleStats
  };
}

const BAND_LABELS: Record<string, string> = {
  subBass: "Sub",
  bass: "Bass",
  lowMid: "Low Mid",
  mid: "Mid",
  highMid: "High Mid",
  presence: "Presence",
  air: "Air",
};

function CompareMode() {
  const [refFile, setRefFile] = useState<File | null>(null);
  const [candFile, setCandFile] = useState<File | null>(null);
  const [refMetrics, setRefMetrics] = useState<AudioMetrics | null>(null);
  const [candMetrics, setCandMetrics] = useState<AudioMetrics | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const delta = useMemo(() => computeDeltaMetrics(refMetrics, candMetrics), [refMetrics, candMetrics]);

  const handleFileChange = useCallback(async (file: File | null, slot: 'ref' | 'cand') => {
    if (slot === 'ref') setRefFile(file);
    else setCandFile(file);

    if (!file) {
      if (slot === 'ref') setRefMetrics(null);
      else setCandMetrics(null);
      return;
    }

    try {
      setAnalyzing(true);
      setError(null);
      const m = await analyzeAudioFile(file);
      if (slot === 'ref') setRefMetrics(m);
      else setCandMetrics(m);
    } catch (e: any) {
      setError(e.message || "Failed to analyze file");
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const formatDelta = (val: number, unit: string, decimals: number = 2) => {
    const sign = val > 0 ? "+" : "";
    return `${sign}${val.toFixed(decimals)} ${unit}`;
  };

  const deltaColor = (val: number) => {
    if (Math.abs(val) < 0.5) return "text-muted-foreground";
    return val > 0 ? "text-emerald-400" : "text-orange-400";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reference (A) */}
        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold">A</span>
            <span className="text-sm font-medium">Reference IR</span>
          </div>
          <label className="block">
            <input
              type="file"
              accept=".wav,audio/wav"
              className="hidden"
              data-testid="input-ref-file"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null, 'ref')}
            />
            <div className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
              refFile ? "border-blue-500/40 bg-blue-500/5" : "border-white/10 hover:border-white/20"
            )}>
              {refFile ? (
                <div className="space-y-1">
                  <Music4 className="w-5 h-5 mx-auto text-blue-400" />
                  <p className="text-sm font-medium truncate">{refFile.name}</p>
                  <p className="text-xs text-muted-foreground">Click to change</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <UploadCloud className="w-6 h-6 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Drop or click to select WAV</p>
                </div>
              )}
            </div>
          </label>
          {refMetrics && (
            <TonalDashboard
              tiltCanonical={computeTonalFeatures(refMetrics).tiltDbPerOct}
              rolloffFreq={refMetrics.rolloffFreq}
              smoothScore={refMetrics.smoothScore}
              maxNotchDepth={refMetrics.maxNotchDepth}
              notchCount={refMetrics.notchCount}
              spectralCentroid={refMetrics.spectralCentroid}
              tailLevelDb={refMetrics.tailLevelDb}
              tailStatus={refMetrics.tailStatus}
              logBandEnergies={refMetrics.logBandEnergies}
              subBassPercent={refMetrics.subBassEnergy}
              bassPercent={refMetrics.bassEnergy}
              lowMidPercent={refMetrics.lowMidEnergy}
              midPercent={refMetrics.midEnergy6}
              highMidPercent={refMetrics.highMidEnergy}
              presencePercent={refMetrics.presenceEnergy}
              ultraHighPercent={refMetrics.ultraHighEnergy}
            />
          )}
        </div>

        {/* Candidate (B) */}
        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-bold">B</span>
            <span className="text-sm font-medium">Candidate IR</span>
          </div>
          <label className="block">
            <input
              type="file"
              accept=".wav,audio/wav"
              className="hidden"
              data-testid="input-cand-file"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null, 'cand')}
            />
            <div className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
              candFile ? "border-amber-500/40 bg-amber-500/5" : "border-white/10 hover:border-white/20"
            )}>
              {candFile ? (
                <div className="space-y-1">
                  <Music4 className="w-5 h-5 mx-auto text-amber-400" />
                  <p className="text-sm font-medium truncate">{candFile.name}</p>
                  <p className="text-xs text-muted-foreground">Click to change</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <UploadCloud className="w-6 h-6 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Drop or click to select WAV</p>
                </div>
              )}
            </div>
          </label>
          {candMetrics && (
            <TonalDashboard
              tiltCanonical={computeTonalFeatures(candMetrics).tiltDbPerOct}
              rolloffFreq={candMetrics.rolloffFreq}
              smoothScore={candMetrics.smoothScore}
              maxNotchDepth={candMetrics.maxNotchDepth}
              notchCount={candMetrics.notchCount}
              spectralCentroid={candMetrics.spectralCentroid}
              tailLevelDb={candMetrics.tailLevelDb}
              tailStatus={candMetrics.tailStatus}
              logBandEnergies={candMetrics.logBandEnergies}
              subBassPercent={candMetrics.subBassEnergy}
              bassPercent={candMetrics.bassEnergy}
              lowMidPercent={candMetrics.lowMidEnergy}
              midPercent={candMetrics.midEnergy6}
              highMidPercent={candMetrics.highMidEnergy}
              presencePercent={candMetrics.presenceEnergy}
              ultraHighPercent={candMetrics.ultraHighEnergy}
            />
          )}
        </div>
      </div>

      {analyzing && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Analyzing...
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Delta Section */}
      {delta && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-5 rounded-2xl space-y-4"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold">Delta (B - A)</h3>
          </div>

          {/* Key delta metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1" data-testid="delta-tilt">
              <p className="text-xs text-muted-foreground">Tilt</p>
              <p className={cn("text-lg font-mono font-bold", deltaColor(delta.deltaTilt))}>
                {formatDelta(delta.deltaTilt, "dB/oct")}
              </p>
            </div>
            <div className="space-y-1" data-testid="delta-centroid">
              <p className="text-xs text-muted-foreground">Centroid</p>
              <p className={cn("text-lg font-mono font-bold", deltaColor(delta.deltaCentroid / 100))}>
                {formatDelta(delta.deltaCentroid, "Hz", 0)}
              </p>
            </div>
            <div className="space-y-1" data-testid="delta-rolloff">
              <p className="text-xs text-muted-foreground">Rolloff</p>
              <p className={cn("text-lg font-mono font-bold", deltaColor(delta.deltaRolloff / 100))}>
                {formatDelta(delta.deltaRolloff, "Hz", 0)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Direction</p>
              <p className="text-lg font-bold">
                {delta.deltaTilt > 0.5 ? "Brighter" : delta.deltaTilt < -0.5 ? "Darker" : "Similar"}
              </p>
            </div>
          </div>

          {/* Band deltas */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Band Energy Difference (dB)</p>
            <div className="space-y-1.5">
              {Object.entries(delta.deltaBands).map(([key, val]) => {
                const v = val as number;
                const maxRange = 12;
                const pct = Math.min(Math.abs(v) / maxRange, 1) * 50;
                return (
                  <div key={key} className="flex items-center gap-2" data-testid={`delta-band-${key}`}>
                    <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                      {BAND_LABELS[key] || key}
                    </span>
                    <div className="flex-1 h-4 relative bg-white/5 rounded-sm overflow-hidden">
                      <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
                      {v !== 0 && (
                        <div
                          className={cn(
                            "absolute inset-y-0 rounded-sm",
                            v > 0 ? "bg-emerald-500/60" : "bg-orange-500/60"
                          )}
                          style={{
                            left: v > 0 ? "50%" : `${50 - pct}%`,
                            width: `${pct}%`,
                          }}
                        />
                      )}
                    </div>
                    <span className={cn("text-xs font-mono w-20 text-right shrink-0", deltaColor(v))}>
                      {formatDelta(v, "dB", 1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
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
  const batchMetricsByFilenameRef = useRef<Map<string, AudioMetrics>>(new Map());

  const { data: learnedProfile } = useQuery<LearnedProfileData>({
    queryKey: ["/api/preferences/learned"],
  });

  const fmt = (v: any, digits = 1) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n.toFixed(digits) : "";
  };

  const safe = (v: any) => (v === null || v === undefined ? "" : String(v));

  const inferFizzLabel = (tfAny: any): string => {
    const smooth = Number(tfAny?.smoothScore ?? 0);
    const tilt = Number(tfAny?.tiltDbPerOct ?? 0);
    const ext = Number(tfAny?.rolloffFreq ?? 0);
    const centroid = Number(tfAny?.spectralCentroidHz ?? 0);

    if (smooth >= 88 && tilt <= -4.8 && ext > 0 && ext <= 4500) return "Low fizz (tamed)";
    if (smooth <= 80 && ext > 0 && ext >= 5200 && centroid >= 3100) return "Higher fizz risk";
    if (ext > 0 && ext >= 5200 && smooth >= 86) return "Polished top (not fizzy)";
    if (tilt <= -5.8 || (ext > 0 && ext <= 3900)) return "Dark / rolled-off";
    return "Neutral";
  };

  const buildSummaryTSVForRow = (r: any) => {
    const filename = safe(r.filename ?? r.name ?? "");
    const metricsForFile = batchMetricsByFilenameRef.current.get(filename);

    const bandsFromBatch = {
      subBass: ((Number(r.subBassPercent) || 0) / 100),
      bass: ((Number(r.bassPercent) || 0) / 100),
      lowMid: ((Number(r.lowMidPercent) || 0) / 100),
      mid: ((Number(r.midPercent) || 0) / 100),
      highMid: ((Number(r.highMidPercent) || 0) / 100),
      presence: ((Number(r.presencePercent) || 0) / 100),
      air: ((Number((r.airPercent ?? r.ultraHighPercent)) || 0) / 100),
    };

    const featureSource: any = {
      ...r,
      spectralCentroidHz:
        ((metricsForFile as any)?.spectralCentroidHz ??
        (metricsForFile as any)?.spectralCentroid ??
        r?.spectralCentroidHz ??
        r?.spectralCentroid ??
        0),
      bandsPercent: bandsFromBatch,
    };

    let tf: any = null;
    try { tf = computeTonalFeatures(featureSource); } catch {}

    const bp = tf?.bandsPercent ?? {};

    const subBass = fmt(((bp.subBass ?? 0) * 100), 1);
    const bass = fmt(((bp.bass ?? 0) * 100), 1);
    const lowMid = fmt(((bp.lowMid ?? 0) * 100), 1);
    const mid = fmt(((bp.mid ?? 0) * 100), 1);
    const highMid = fmt(((bp.highMid ?? 0) * 100), 1);
    const presence = fmt(((bp.presence ?? 0) * 100), 1);
    const air = fmt(((bp.air ?? 0) * 100), 2);

    const centroidComputed = fmt(tf?.spectralCentroidHz ?? tf?.centroidHz ?? "", 0);
    const centroidExported = fmt(r.spectralCentroidHz ?? r.spectralCentroid ?? r.centroidHz ?? (metricsForFile as any)?.spectralCentroidHz ?? (metricsForFile as any)?.spectralCentroid ?? "", 0);

    const rawRole = safe(r.musicalRole ?? r.role ?? r.musical_role ?? "");
    const roleSource = rawRole ? "stored" : "computed";

    const score = fmt(r.score ?? r.qualityScore ?? r.rating ?? "");

    let role = rawRole;
    if (!role) {
      try {
        const tfFinal = tf ?? computeTonalFeatures(featureSource);
        const spk = inferSpeakerIdFromFilename(filename);
        const st = speakerStatsRef.current.get(spk);
        const base = classifyMusicalRole(tfFinal, st);
        role = applyContextBias(base, tfFinal, filename, st);
      } catch {
        role = "";
      }
    }

    const centroid = centroidExported || centroidComputed;
    const tilt = fmt(r.spectralTilt ?? r.tiltDbPerOct ?? tf?.tiltDbPerOct ?? "");
    const rolloff = fmt(r.rolloffFreq ?? r.rolloffFrequency ?? r.highExtensionHz ?? "");
    const smooth = fmt(r.smoothScore ?? r.frequencySmoothness ?? tf?.smoothScore ?? "", 0);

    const hiMidVal = tf?.bandsPercent?.highMid ?? bandsFromBatch.highMid ?? "";
    const midVal = tf?.bandsPercent?.mid ?? bandsFromBatch.mid ?? "";
    const hiMidMid = (Number.isFinite(hiMidVal) && Number.isFinite(midVal) && midVal !== 0)
      ? (hiMidVal / midVal)
      : (r.hiMidMid ?? "");

    const fizz = safe(r.fizzLabel ?? r.fizz ?? inferFizzLabel(tf));
    const notes = safe(r.notes ?? r.feedbackText ?? "");

    return [
      filename,
      score,
      role,
      rawRole,
      roleSource,

      centroidExported,
      centroidComputed,

      tilt,
      rolloff,
      smooth,
      fmt(hiMidMid, 2),

      subBass, bass, lowMid, mid, highMid, presence, air,

      fizz,
      notes,
    ].join("\t");
  };

  const tsvHeader = [
    "filename", "score",
    "musical_role", "raw_role", "role_source",
    "centroid_exported_hz", "centroid_computed_hz",
    "spectral_tilt_db_per_oct", "rolloff_or_high_extension_hz",
    "smooth_score", "hiMidMid_ratio",
    "subBass_pct", "bass_pct", "lowMid_pct", "mid_pct", "highMid_pct", "presence_pct", "air_pct",
    "fizz_label", "notes",
  ].join("\t");


  const { data: tonalProfileRows } = useQuery<TonalProfileRow[]>({
    queryKey: ["/api/tonal-profiles"],
  });

  const speakerRelativeProfiles = useMemo(() => {
    if (!batchResult || batchResult.results.length < 3) return DEFAULT_PROFILES;
    const batchFeatures = batchResult.results.map((r) => ({
      features: featuresFromBands({
        subBass: r.subBassPercent || 0,
        bass: r.bassPercent || 0,
        lowMid: r.lowMidPercent || 0,
        mid: r.midPercent || 0,
        highMid: r.highMidPercent || 0,
        presence: r.presencePercent || 0,
        air: (r as any).airPercent ?? (r as any).ultraHighPercent ?? 0,
        fizz: (r as any).fizzPercent ?? 0,
      }),
    }));
    return computeSpeakerRelativeProfiles(batchFeatures);
  }, [batchResult]);

  const activeProfiles = useMemo(() => {
    if (!learnedProfile || learnedProfile.status === "no_data") return speakerRelativeProfiles;
    return applyLearnedAdjustments(speakerRelativeProfiles, learnedProfile);
  }, [learnedProfile, speakerRelativeProfiles]);

  interface PairingSuggestion {
    filename: string;
    index: number;
    reason: string;
  }

  interface BatchIRRole {
    role: "Feature element" | "Body element" | null;
    featuredScore: number;
    bodyScore: number;
    bestScore: number;
    unlikelyToUse: boolean;
    unlikelyReason: string | null;
    avoidHits: string[];
    avoidTypes: string[];
    pairingSuggestions: PairingSuggestion[];
    pairingGuidance: string | null;
  }

  const batchPreferenceRoles = useMemo(() => {
    if (!batchResult || !learnedProfile || learnedProfile.status === "no_data") return null;

    const allBands: TonalBands[] = batchResult.results.map((r) => ({
      subBass: r.subBassPercent || 0,
      bass: r.bassPercent || 0,
      lowMid: r.lowMidPercent || 0,
      mid: r.midPercent || 0,
      highMid: r.highMidPercent || 0,
      presence: r.presencePercent || 0,
      air: 0,
      fizz: 0,
    }));

    const firstPass = allBands.map((bands, idx) => {
      const { results: matchResults } = scoreIndividualIR(featuresFromBands(bands), activeProfiles, learnedProfile);
      const featured = matchResults.find((m) => m.profile === "Featured");
      const body = matchResults.find((m) => m.profile === "Body");
      const fScore = featured?.score ?? 0;
      const bScore = body?.score ?? 0;
      const bestScore = Math.max(fScore, bScore);
      const role = bestScore >= 35
        ? (fScore >= bScore ? "Feature element" as const : "Body element" as const)
        : null;

      const avoidHits: string[] = [];
      const avoidTypes: string[] = [];
      const ratio = bands.mid > 0 ? bands.highMid / bands.mid : 0;
      const lowMidPlusMid = bands.lowMid + bands.mid;
      for (const zone of learnedProfile.avoidZones) {
        if (zone.band === "muddy_composite" && zone.direction === "high" && lowMidPlusMid >= zone.threshold) {
          avoidHits.push(`LowMid+Mid ${Math.round(lowMidPlusMid)}% (blend limit ${zone.threshold}%)`);
          avoidTypes.push("muddy");
        } else if (zone.band === "mid" && zone.direction === "high" && bands.mid > zone.threshold) {
          avoidHits.push(`Mid ${Math.round(bands.mid)}% (blend limit ${zone.threshold}%)`);
          avoidTypes.push("mid_heavy");
        } else if (zone.band === "presence" && zone.direction === "low" && bands.presence < zone.threshold) {
          avoidHits.push(`Presence ${Math.round(bands.presence)}% (blend min ${zone.threshold}%)`);
          avoidTypes.push("low_presence");
        } else if (zone.band === "ratio" && zone.direction === "low" && ratio < zone.threshold) {
          avoidHits.push(`Ratio ${ratio.toFixed(2)} (blend min ${zone.threshold})`);
          avoidTypes.push("low_ratio");
        }
      }

      let unlikelyToUse = false;
      let unlikelyReason: string | null = null;
      if (bestScore < 15) {
        unlikelyToUse = true;
        const isLowConfidence = learnedProfile.status === "learning" || (learnedProfile.signalCount ?? 0) < 10;
        unlikelyReason = isLowConfidence
          ? "Low match to current preferences (low confidence — still learning your taste)"
          : "Low match to both preferred tonal profiles — may work better as a standalone IR";
      }

      return { role, featuredScore: fScore, bodyScore: bScore, bestScore, unlikelyToUse, unlikelyReason, avoidHits, avoidTypes, bands };
    });

    const roles: BatchIRRole[] = firstPass.map((item, idx) => {
      const pairingSuggestions: PairingSuggestion[] = [];
      let pairingGuidance: string | null = null;

      if (item.avoidTypes.length > 0) {
        const guidanceParts: string[] = [];
        const needsLowMid = item.avoidTypes.includes("muddy") || item.avoidTypes.includes("mid_heavy");
        const needsHighPresence = item.avoidTypes.includes("low_presence") || item.avoidTypes.includes("low_ratio");

        if (needsLowMid && needsHighPresence) {
          guidanceParts.push("Look for bright, articulate IRs — low mids, high presence, strong HiMid/Mid ratio");
        } else if (needsLowMid) {
          guidanceParts.push("Look for lean IRs with less low-mid and mid weight to balance this out");
        } else if (needsHighPresence) {
          guidanceParts.push("Look for IRs with strong presence and high-mid content to add clarity");
        }
        pairingGuidance = guidanceParts.join(". ");

        const scored = firstPass.map((other, otherIdx) => {
          if (otherIdx === idx || other.unlikelyToUse) return { otherIdx, score: -1 };
          const ob = other.bands;
          let complementScore = 0;

          if (needsLowMid) {
            const otherLowMidMid = ob.lowMid + ob.mid;
            const thisLowMidMid = item.bands.lowMid + item.bands.mid;
            if (otherLowMidMid < thisLowMidMid) {
              complementScore += (thisLowMidMid - otherLowMidMid) * 2;
            }
          }
          if (needsHighPresence) {
            if (ob.presence > item.bands.presence) {
              complementScore += (ob.presence - item.bands.presence) * 2;
            }
            const otherRatio = ob.mid > 0 ? ob.highMid / ob.mid : 0;
            const thisRatio = item.bands.mid > 0 ? item.bands.highMid / item.bands.mid : 0;
            if (otherRatio > thisRatio) {
              complementScore += (otherRatio - thisRatio) * 15;
            }
          }

          if (other.bestScore >= 35) complementScore += 10;
          if (other.avoidTypes.length === 0) complementScore += 5;

          return { otherIdx, score: complementScore };
        }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score);

        for (const s of scored.slice(0, 3)) {
          const ob = firstPass[s.otherIdx].bands;
          const reasons: string[] = [];
          if (needsLowMid && (ob.lowMid + ob.mid) < (item.bands.lowMid + item.bands.mid)) {
            reasons.push(`leaner mids (${Math.round(ob.lowMid + ob.mid)}%)`);
          }
          if (needsHighPresence && ob.presence > item.bands.presence) {
            reasons.push(`higher presence (${Math.round(ob.presence)}%)`);
          }
          pairingSuggestions.push({
            filename: batchResult.results[s.otherIdx].filename,
            index: s.otherIdx,
            reason: reasons.length > 0 ? reasons.join(", ") : "complementary balance",
          });
        }
      }

      return {
        role: item.role,
        featuredScore: item.featuredScore,
        bodyScore: item.bodyScore,
        bestScore: item.bestScore,
        unlikelyToUse: item.unlikelyToUse,
        unlikelyReason: item.unlikelyReason,
        avoidHits: item.avoidHits,
        avoidTypes: item.avoidTypes,
        pairingSuggestions,
        pairingGuidance,
      };
    });

    return roles;
  }, [batchResult, learnedProfile, activeProfiles]);

  const collectionCoverage = useMemo(() => {
    if (!batchResult?.results?.length) return null;

    const roles: string[] = batchResult.results.map((r: any) => {
      try {
        const tsvLine = buildSummaryTSVForRow(r);
        const parts = String(tsvLine || "").split("\t");
        return String(parts?.[2] ?? "").trim();
      } catch {
        return "";
      }
    }).filter(Boolean);

    const total = roles.length;
    const count = (x: string) => roles.filter((r) => r === x).length;

    const foundation = count("Foundation");
    const cutLayer = count("Cut Layer");
    const midThickener = count("Mid Thickener");
    const leadPolish = count("Lead Polish");
    const fizzTamer = count("Fizz Tamer");
    const darkSpecialty = count("Dark Specialty");

    const featureLayers = cutLayer + leadPolish;
    const bodyLayers = foundation + midThickener;

    const minForCategory = Math.max(2, Math.ceil(total * 0.15));
    const hasBody = bodyLayers >= minForCategory;
    const hasFeature = featureLayers >= minForCategory;
    const hasPolish = leadPolish >= 1;

    let verdict = "Limited coverage";
    let verdictColor = "text-red-400";
    const suggestions: string[] = [];

    if (hasBody && hasFeature && hasPolish) {
      verdict = "Good coverage";
      verdictColor = "text-emerald-400";
      suggestions.push(`Strong spread: ${bodyLayers} body layers (Foundation + Mid Thickener) and ${featureLayers} feature layers (Cut Layer + Lead Polish).`);
      if (fizzTamer < 1) suggestions.push("Add 1 dedicated Fizz Tamer (low air, low fizz) as a safety tool for harsher amp pairings.");
    } else if (!hasBody && !hasFeature) {
      verdict = "Limited coverage";
      verdictColor = "text-red-400";
      suggestions.push("Limited role variety in this batch. Add more contrasting shots to cover both body and feature layers.");
      suggestions.push("For more Cut Layers: cap / CapEdge_Br with dynamic mics (SM57, MD421, MD441, PR30) at closer distances.");
      suggestions.push("For more Body Layers: Cone or CapEdge_Dk / CapEdge_Cone_Tr with ribbon/darker dynamics (R121, M201) and/or slightly farther distances.");
      suggestions.push("For Lead Polish: smooth captures with higher air_pct (6–9k) but controlled fizz — often CapEdge_Br or Cap/OffCenter at moderate distance.");
    } else if (!hasFeature) {
      verdict = "Needs more feature layers";
      verdictColor = "text-amber-400";
      suggestions.push(`Only ${featureLayers} feature layers (Cut + Polish). Add more cap / CapEdge_Br cut shots and at least 1 extra polish layer.`);
    } else if (!hasBody) {
      verdict = "Needs more body layers";
      verdictColor = "text-amber-400";
      suggestions.push(`Only ${bodyLayers} body layers (Foundation + Thickener). Add more Cone / CapEdge_Dk / CapEdge_Cone_Tr and/or ribbon body shots.`);
    } else if (!hasPolish) {
      verdict = "Needs at least one polish layer";
      verdictColor = "text-amber-400";
      suggestions.push("Add at least 1 Lead Polish (higher air_pct with high smooth score) to finish mixes without harshness.");
    }

    return {
      verdict,
      verdictColor,
      suggestions,
      total,
      featureLayers,
      bodyLayers,
      foundation,
      cutLayer,
      midThickener,
      leadPolish,
      fizzTamer,
      darkSpecialty,
    };
  }, [batchResult]);

  const gearGaps = useMemo(() => {
    if (!batchResult) return null;

    const batchGear = batchResult.results.map((r) => parseGearFromFilename(r.filename));
    const batchSpeakers = new Set(batchGear.map((g) => g.speaker).filter(Boolean) as string[]);
    const batchMics = new Set(batchGear.flatMap((g) => [g.mic, g.mic2].filter(Boolean)) as string[]);
    const batchPositions = new Set(batchGear.map((g) => g.position).filter(Boolean) as string[]);

    if (batchSpeakers.size === 0 && batchMics.size === 0) return null;

    const insights = learnedProfile?.gearInsights;
    const hasAnyData = learnedProfile && learnedProfile.signalCount > 0;
    const hasAnalyzedData = tonalProfileRows && tonalProfileRows.length > 0;

    const tpMics = new Set(tonalProfileRows?.map((tp) => tp.mic.toLowerCase()) ?? []);
    const tpSpeakers = new Set(tonalProfileRows?.map((tp) => tp.speaker.toLowerCase()) ?? []);
    const tpPositions = new Set(tonalProfileRows?.map((tp) => tp.position.toLowerCase()) ?? []);

    const isKnownInTonalProfiles = (name: string, category: "speaker" | "mic" | "position"): boolean => {
      const lower = name.toLowerCase();
      const tpSet = category === "mic" ? tpMics : category === "speaker" ? tpSpeakers : tpPositions;
      if (tpSet.has(lower)) return true;
      const normalizations: Record<string, string[]> = {
        "SM57": ["sm57"], "R121": ["r121"], "e609": ["e609"], "i5": ["i5"],
        "R92": ["r92"], "M160": ["m160"], "MD421": ["md421", "md421kompakt"],
        "MD441": ["md441", "md441_presence"], "R10": ["r10"], "M88": ["m88"],
        "PR30": ["pr30"], "e906": ["e906", "e906_presence"], "M201": ["m201"],
        "SM7B": ["sm7b"], "C414": ["c414"], "Roswell": ["roswell"],
        "G12M25": ["greenback", "g12m25", "g12m"], "V30-China": ["v30", "v30china"],
        "V30-Blackcat": ["v30blackcat", "blackcat"], "K100": ["k100"],
        "G12T75": ["g12t75", "t75"], "G12-65": ["g1265"], "G12H": ["g12h"],
        "G12H30-Anniversary": ["g12h30", "anniversary"], "Celestion-Cream": ["cream"],
        "GA12-SC64": ["ga12sc64", "sc64"], "G10-SC64": ["ga10sc64", "ga10", "g10sc64", "g10"],
        "Karnivore": ["karnivore", "karni"],
        "Cap": ["cap", "center"], "CapEdge": ["capedge", "cap_edge"],
        "CapEdge-Bright": ["capedge_br", "capedgebr"], "CapEdge-Dark": ["capedge_dk", "capedgedk"],
        "Cap-Cone Transition": ["cap_cone_trn", "capconetr", "cone_tr"],
        "Cap Off-Center": ["cap_offcenter", "capoffcenter", "offcenter"], "Cone": ["cone"],
        "Blend": ["blend"],
      };
      const aliases = normalizations[name];
      if (aliases) return aliases.some((a) => tpSet.has(a));
      return tpSet.has(lower.replace(/[^a-z0-9]/g, ''));
    };

    const newGear: { name: string; category: "speaker" | "mic" | "position"; count: number }[] = [];
    const underRepresented: { name: string; category: "speaker" | "mic" | "position"; samples: number }[] = [];
    let noDataYet = false;

    if (!hasAnyData && !hasAnalyzedData) {
      noDataYet = true;
      for (const name of Array.from(batchSpeakers)) {
        newGear.push({ name, category: "speaker", count: batchGear.filter((g) => g.speaker === name).length });
      }
      for (const name of Array.from(batchMics)) {
        newGear.push({ name, category: "mic", count: batchGear.filter((g) => g.mic === name || g.mic2 === name).length });
      }
      for (const name of Array.from(batchPositions)) {
        newGear.push({ name, category: "position", count: batchGear.filter((g) => g.position === name).length });
      }
    } else {
      const checkGear = (
        names: string[],
        knownList: { name: string; tonal: { sampleSize: number } | null }[] | undefined,
        category: "speaker" | "mic" | "position"
      ) => {
        for (const name of names) {
          const batchCount = category === "mic"
            ? batchGear.filter((g) => g.mic === name || g.mic2 === name).length
            : batchGear.filter((g) => g[category] === name).length;
          const knownInInsights = knownList?.find((k) => k.name === name);
          const knownInProfiles = isKnownInTonalProfiles(name, category);
          if (knownInInsights) {
            if (!knownInInsights.tonal || knownInInsights.tonal.sampleSize < 3) {
              if (!knownInProfiles) {
                underRepresented.push({ name, category, samples: knownInInsights.tonal?.sampleSize ?? 0 });
              }
            }
          } else if (!knownInProfiles) {
            newGear.push({ name, category, count: batchCount });
          }
        }
      };

      checkGear(Array.from(batchSpeakers), insights?.speakers, "speaker");
      checkGear(Array.from(batchMics), insights?.mics, "mic");
      checkGear(Array.from(batchPositions), insights?.positions, "position");
    }

    if (newGear.length === 0 && underRepresented.length === 0) return null;

    return { newGear, underRepresented, noDataYet };
  }, [batchResult, learnedProfile, tonalProfileRows]);

  const batchMusicalSummary = useMemo(() => {
    if (!batchResult || batchResult.results.length < 2) return null;

    const results = batchResult.results;

    interface IRDescriptor {
      index: number;
      filename: string;
      tilt: number;
      body: number;
      bite: number;
      fizz: number;
      smooth: number;
      versatility: number;
    }

    const computeResultTilt = (r: any): number => {
      const EPS = 1e-12;
      const sE = Math.max(EPS, r.subBassEnergy ?? 0);
      const bE = Math.max(EPS, r.bassEnergy ?? 0);
      const lmE = Math.max(EPS, r.lowMidEnergy ?? 0);
      const mE = Math.max(EPS, r.midEnergy6 ?? r.midEnergy ?? 0);
      const hmE = Math.max(EPS, r.highMidEnergy ?? 0);
      const pE = Math.max(EPS, r.presenceEnergy ?? 0);
      const aE = Math.max(EPS, r.ultraHighEnergy ?? r.airEnergy ?? 0);
      const db = (e: number) => 10 * Math.log10(e);
      const ref = (db(mE) + db(hmE) + db(pE)) / 3;
      const shape = { subBass: db(sE) - ref, bass: db(bE) - ref, presence: db(pE) - ref, air: db(aE) - ref };
      return canonicalTiltFromShapeDb(shape);
    };

    const descriptors: IRDescriptor[] = results.map((r, i) => {
      const tilt = computeResultTilt(r);
      const lowMid = r.lowMidPercent ?? 0;
      const bass = r.bassPercent ?? 0;
      const highMid = r.highMidPercent ?? 0;
      const presence = r.presencePercent ?? 0;
      const air = (r as any).ultraHighPercent ?? 0;
      const smooth = (r as any).smoothScore ?? r.frequencySmoothness ?? 50;

      const bodyVal = lowMid + bass * 0.5;
      const biteVal = highMid + presence * 0.6;
      const fizzVal = presence * 0.4 + air;

      const avgTilt = results.reduce((s, x) => s + computeResultTilt(x), 0) / results.length;
      const avgBody = results.reduce((s, x) => s + ((x.lowMidPercent ?? 0) + (x.bassPercent ?? 0) * 0.5), 0) / results.length;
      const avgBite = results.reduce((s, x) => s + ((x.highMidPercent ?? 0) + (x.presencePercent ?? 0) * 0.6), 0) / results.length;

      const versatility = 100 - (Math.abs(tilt - avgTilt) * 10 + Math.abs(bodyVal - avgBody) * 2 + Math.abs(biteVal - avgBite) * 2);

      return { index: i, filename: r.filename, tilt, body: bodyVal, bite: biteVal, fizz: fizzVal, smooth, versatility: Math.max(0, Math.min(100, versatility)) };
    });

    const byTilt = [...descriptors].sort((a, b) => b.tilt - a.tilt);
    const byBody = [...descriptors].sort((a, b) => b.body - a.body);
    const byBite = [...descriptors].sort((a, b) => b.bite - a.bite);
    const bySmooth = [...descriptors].sort((a, b) => b.smooth - a.smooth);
    const byVersatility = [...descriptors].sort((a, b) => b.versatility - a.versatility);

    const bandVectors = results.map(r => [
      r.subBassPercent ?? 0, r.bassPercent ?? 0, r.lowMidPercent ?? 0,
      r.midPercent ?? 0, r.highMidPercent ?? 0, r.presencePercent ?? 0
    ]);

    let totalSim = 0;
    let pairCount = 0;
    for (let i = 0; i < bandVectors.length; i++) {
      for (let j = i + 1; j < bandVectors.length; j++) {
        const a = bandVectors[i];
        const b = bandVectors[j];
        const dot = a.reduce((s, v, k) => s + v * b[k], 0);
        const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
        const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
        if (magA > 0 && magB > 0) {
          totalSim += dot / (magA * magB);
          pairCount++;
        }
      }
    }
    const avgSimilarity = pairCount > 0 ? totalSim / pairCount : 0;
    const redundancyHeat = avgSimilarity > 0.98 ? "high" as const : avgSimilarity > 0.95 ? "medium" as const : "low" as const;

    return {
      mostVersatile: byVersatility[0],
      brightest: byTilt[0],
      darkest: byTilt[byTilt.length - 1],
      thickest: byBody[0],
      mostCutting: byBite[0],
      smoothest: bySmooth[0],
      mostCombRisk: bySmooth[bySmooth.length - 1],
      redundancyHeat,
      avgSimilarity,
    };
  }, [batchResult]);

  // Section refs for navigation
  const analyzeRef = useRef<HTMLDivElement>(null);
  const redundancyRef = useRef<HTMLDivElement>(null);
  const smartThinRef = useRef<HTMLDivElement>(null);
  const cullerRef = useRef<HTMLDivElement>(null);
  const blendAnalysisRef = useRef<HTMLDivElement>(null);
  
  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  
  // Single mode state
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Batch mode state
  const [batchIRs, setBatchIRs] = useState<BatchIR[]>([]);
  const speakerStatsRef = useRef<Map<string, SpeakerStats>>(new Map());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const m = new Map<string, AudioMetrics>();
    for (const ir of batchIRs) {
      if (ir?.file?.name && ir.metrics) m.set(ir.file.name, ir.metrics);
    }
    batchMetricsByFilenameRef.current = m;
  }, [batchIRs]);

  useEffect(() => {
    try {
      const rows: Array<{ filename: string; tf: TonalFeatures }> = [];
      for (const ir of batchIRs) {
        const filename = ir?.file?.name ?? "";
        const rAny: any = (ir as any)?.batchRow ?? null;
        const bandsFromBatch = rAny ? {
          subBass: ((Number(rAny.subBassPercent) || 0) / 100),
          bass: ((Number(rAny.bassPercent) || 0) / 100),
          lowMid: ((Number(rAny.lowMidPercent) || 0) / 100),
          mid: ((Number(rAny.midPercent) || 0) / 100),
          highMid: ((Number(rAny.highMidPercent) || 0) / 100),
          presence: ((Number(rAny.presencePercent) || 0) / 100),
          air: ((Number(((rAny as any).airPercent ?? (rAny as any).ultraHighPercent)) || 0) / 100),
        } : null;

        const centroid =
          (ir as any)?.metrics?.spectralCentroidHz ??
          (ir as any)?.metrics?.spectralCentroid ??
          0;

        if (bandsFromBatch) {
          rows.push({
            filename,
            tf: { bandsPercent: bandsFromBatch, spectralCentroidHz: centroid, tiltDbPerOct: (rAny?.spectralTiltDbPerOct ?? rAny?.spectralTilt ?? 0), rolloffFreq: (rAny?.rolloffFreq ?? rAny?.highExtensionHz ?? 0), smoothScore: (rAny?.smoothScore ?? 0) } as any
          });
        }
      }
      speakerStatsRef.current = computeSpeakerStats(rows);
    } catch {}
  }, [batchIRs]);

  // Redundancy detection state - using groups instead of pairs for cleaner display
  // Threshold of 0.95 means highly similar (with normalized Pearson, this is ~90% raw correlation)
  const [redundancyGroups, setRedundancyGroups] = useState<RedundancyGroup[]>(() => {
    try {
      const stored = sessionStorage.getItem('ir-redundancy-groups');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [similarityThreshold, setSimilarityThreshold] = useState(0.985);
  const [showRedundancies, setShowRedundancies] = useState(() => {
    try {
      return sessionStorage.getItem('ir-show-redundancies') === 'true';
    } catch { return false; }
  });
  
  // Persist redundancy state to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('ir-redundancy-groups', JSON.stringify(redundancyGroups));
      sessionStorage.setItem('ir-show-redundancies', showRedundancies.toString());
    } catch {}
  }, [redundancyGroups, showRedundancies]);
  
  // Culling state
  const [cullResult, setCullResult] = useState<CullResult | null>(null);
  const [cullRoleStats, setCullRoleStats] = useState<{ featureCount: number; bodyCount: number; totalClassified: number; featureKept: number; bodyKept: number } | null>(null);
  const [targetCullCount, setTargetCullCount] = useState(10);
  const [cullCountInput, setCullCountInput] = useState("10");
  const [showCuller, setShowCuller] = useState(false);
  const [roleBalanceMode, setRoleBalanceMode] = useState<'off' | 'protect' | 'favor'>('off');
  
  // Close call decisions state for interactive culling
  const [cullCloseCalls, setCullCloseCalls] = useState<CullCloseCall[]>([]);
  const [showCloseCallQuery, setShowCloseCallQuery] = useState(false);
  const [cullUserOverrides, setCullUserOverrides] = useState<Map<string, string[]>>(new Map());
  
  // Reference Set Comparison state
  interface ReferenceIR {
    filename: string;
    subBass: number;
    bass: number;
    lowMid: number;
    mid: number;
    highMid: number;
    presence: number;
    centroid: number;
    smoothness: number;
    ratio: number;
    label: string;
  }
  interface ReferenceSet {
    name: string;
    speaker: string;
    createdAt: string;
    irs: ReferenceIR[];
  }
  const [referenceSet, setReferenceSet] = useState<ReferenceSet | null>(() => {
    try {
      const stored = sessionStorage.getItem('ir-reference-set');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [referenceThreshold, setReferenceThreshold] = useState(0.78);
  const [showReferenceComparison, setShowReferenceComparison] = useState(false);
  const referenceComparisonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (referenceSet) {
        sessionStorage.setItem('ir-reference-set', JSON.stringify(referenceSet));
      } else {
        sessionStorage.removeItem('ir-reference-set');
      }
    } catch {}
  }, [referenceSet]);

  const buildReferenceIRs = useCallback((): ReferenceIR[] | null => {
    if (!batchResult || !batchIRs.length) return null;
    const metricsMap = new Map<string, { centroid: number; smoothness: number }>();
    batchIRs.forEach(ir => {
      if (ir.metrics) {
        metricsMap.set(ir.file.name, { centroid: ir.metrics.spectralCentroid, smoothness: ir.metrics.smoothScore ?? ir.metrics.frequencySmoothness });
      }
    });
    return batchResult.results.map((r) => {
      const mid = r.midPercent || 0;
      const highMid = r.highMidPercent || 0;
      const ratio = mid > 0 ? highMid / mid : 0;
      const matched = metricsMap.get(r.filename);
      const centroidVal = matched?.centroid || 0;
      const smoothnessVal = matched?.smoothness || 0;

      let label = 'neutral';
      if (ratio > 1.5 && (r.presencePercent || 0) > 15) label = 'bright/forward';
      else if (ratio > 1.2) label = 'forward';
      else if (ratio < 0.6 && (r.subBassPercent || 0) + (r.bassPercent || 0) > 35) label = 'dark/warm';
      else if (ratio < 0.8) label = 'warm';
      else if ((r.midPercent || 0) > 30) label = 'mid-heavy';
      else if ((r.midPercent || 0) < 15 && highMid > 20) label = 'scooped/aggressive';
      else label = 'balanced';

      return {
        filename: r.filename,
        subBass: r.subBassPercent || 0,
        bass: r.bassPercent || 0,
        lowMid: r.lowMidPercent || 0,
        mid: r.midPercent || 0,
        highMid: r.highMidPercent || 0,
        presence: r.presencePercent || 0,
        centroid: centroidVal,
        smoothness: smoothnessVal,
        ratio,
        label,
      };
    });
  }, [batchResult, batchIRs]);

  const referenceComparison = useMemo(() => {
    if (!referenceSet || !batchResult || !batchIRs.length) return null;

    const metricsMap = new Map<string, { centroid: number; smoothness: number }>();
    batchIRs.forEach(ir => {
      if (ir.metrics) {
        metricsMap.set(ir.file.name, { centroid: ir.metrics.spectralCentroid, smoothness: ir.metrics.smoothScore ?? ir.metrics.frequencySmoothness });
      }
    });

    const candidateBands = batchResult.results.map((r) => {
      const mid = r.midPercent || 0;
      const highMid = r.highMidPercent || 0;
      const matched = metricsMap.get(r.filename);
      return {
        filename: r.filename,
        subBass: r.subBassPercent || 0,
        bass: r.bassPercent || 0,
        lowMid: r.lowMidPercent || 0,
        mid,
        highMid,
        presence: r.presencePercent || 0,
        centroid: matched?.centroid || 0,
        smoothness: matched?.smoothness || 0,
        ratio: mid > 0 ? highMid / mid : 0,
      };
    });

    const computeFlavorSimilarity = (ref: ReferenceIR, cand: typeof candidateBands[0]): number => {
      const refBands = [ref.subBass, ref.bass, ref.lowMid, ref.mid, ref.highMid, ref.presence];
      const candBands = [cand.subBass, cand.bass, cand.lowMid, cand.mid, cand.highMid, cand.presence];
      let totalDiff = 0;
      for (let i = 0; i < 6; i++) totalDiff += Math.abs(refBands[i] - candBands[i]);
      const bandSim = Math.max(0, 1 - (totalDiff / 60));

      const ratioDiff = Math.abs(ref.ratio - cand.ratio);
      const ratioSim = Math.max(0, 1 - (ratioDiff / 1.5));

      const centroidDiff = Math.abs(ref.centroid - cand.centroid);
      const centroidSim = Math.max(0, 1 - (centroidDiff / 3000));

      return bandSim * 0.50 + ratioSim * 0.25 + centroidSim * 0.25;
    };

    const matches: {
      refFilename: string;
      refLabel: string;
      bestMatchFilename: string | null;
      bestMatchSimilarity: number;
      covered: boolean;
      refBands: number[];
      matchBands: number[] | null;
    }[] = referenceSet.irs.map(ref => {
      let bestSim = 0;
      let bestIdx = -1;
      candidateBands.forEach((cand, j) => {
        const sim = computeFlavorSimilarity(ref, cand);
        if (sim > bestSim) { bestSim = sim; bestIdx = j; }
      });
      const covered = bestSim >= referenceThreshold;
      return {
        refFilename: ref.filename,
        refLabel: ref.label,
        bestMatchFilename: bestIdx >= 0 ? candidateBands[bestIdx].filename : null,
        bestMatchSimilarity: bestSim,
        covered,
        refBands: [ref.subBass, ref.bass, ref.lowMid, ref.mid, ref.highMid, ref.presence],
        matchBands: bestIdx >= 0 ? [candidateBands[bestIdx].subBass, candidateBands[bestIdx].bass, candidateBands[bestIdx].lowMid, candidateBands[bestIdx].mid, candidateBands[bestIdx].highMid, candidateBands[bestIdx].presence] : null,
      };
    });

    const coveredCount = matches.filter(m => m.covered).length;
    const totalCount = matches.length;
    const coveragePercent = totalCount > 0 ? Math.round((coveredCount / totalCount) * 100) : 0;

    let verdict: string;
    let verdictColor: string;
    if (coveragePercent >= 90) { verdict = 'Comprehensive Coverage'; verdictColor = 'text-green-400'; }
    else if (coveragePercent >= 70) { verdict = 'Good Coverage'; verdictColor = 'text-blue-400'; }
    else if (coveragePercent >= 50) { verdict = 'Partial Coverage'; verdictColor = 'text-amber-400'; }
    else { verdict = 'Significant Gaps'; verdictColor = 'text-red-400'; }

    const missingFlavors = matches
      .filter(m => !m.covered)
      .sort((a, b) => a.bestMatchSimilarity - b.bestMatchSimilarity);

    const unusedCandidates = candidateBands.filter(c =>
      !matches.some(m => m.covered && m.bestMatchFilename === c.filename)
    );

    const bonusFlavors = unusedCandidates.filter(cand => {
      return !referenceSet.irs.some(ref => computeFlavorSimilarity(ref, cand) >= referenceThreshold);
    }).map(c => c.filename);

    return { matches, coveredCount, totalCount, coveragePercent, verdict, verdictColor, missingFlavors, bonusFlavors };
  }, [referenceSet, batchResult, batchIRs, referenceThreshold]);

  const LABEL_FALLBACK_SUGGESTIONS: Record<string, { mic: string; position: string; distance: string; why: string }[]> = useMemo(() => ({
    'bright/forward': [
      { mic: 'SM57', position: 'Cap', distance: '1in', why: 'Brightest position with a punchy dynamic mic' },
      { mic: 'PR30', position: 'Cap_OffCenter', distance: '2in', why: 'PR30 is naturally very bright and present' },
      { mic: 'e906', position: 'Cap', distance: '1in', why: 'e906 presence mode at cap delivers crisp attack' },
    ],
    'forward': [
      { mic: 'SM57', position: 'CapEdge_BR', distance: '1in', why: 'CapEdge bright side adds focused presence' },
      { mic: 'MD421', position: 'Cap', distance: '2in', why: 'MD421 at cap is punchy and forward' },
    ],
    'dark/warm': [
      { mic: 'R121', position: 'Cone', distance: '2in', why: 'Ribbon mic at cone gives maximum warmth' },
      { mic: 'R92', position: 'CapEdge_DK', distance: '2in', why: 'R92 favoring dark edge, very smooth and warm' },
      { mic: 'M160', position: 'Cone', distance: '3in', why: 'Hypercardioid ribbon at cone rolls off highs naturally' },
    ],
    'warm': [
      { mic: 'R121', position: 'CapEdge', distance: '2in', why: 'R121 at the capedge seam is warm and full' },
      { mic: 'SM7B', position: 'CapEdge_DK', distance: '2in', why: 'SM7B is thick and smooth, dark side adds warmth' },
    ],
    'mid-heavy': [
      { mic: 'MD421', position: 'CapEdge', distance: '1in', why: 'MD421 at capedge emphasizes mid-range punch' },
      { mic: 'SM57', position: 'CapEdge', distance: '1in', why: 'SM57 at capedge is naturally mid-focused' },
    ],
    'scooped/aggressive': [
      { mic: 'SM57', position: 'Cap', distance: '0.5in', why: 'Very close cap placement scoops mids, boosts extremes' },
      { mic: 'e906', position: 'Cap', distance: '1in', why: 'e906 presence mode at cap can produce aggressive scoop' },
    ],
    'balanced': [
      { mic: 'SM57', position: 'CapEdge', distance: '2in', why: 'Classic balanced position with moderate distance' },
      { mic: 'MD421', position: 'CapEdge_BR', distance: '2in', why: 'MD421 slightly bright of capedge, very even response' },
    ],
    'neutral': [
      { mic: 'SM57', position: 'CapEdge', distance: '2in', why: 'Baseline reference position for neutral tone' },
    ],
  }), []);

  interface BlendSuggestion {
    blendType: string;
    ratio: string;
    description: string;
  }

  interface MissingSuggestion {
    refFilename: string;
    refLabel: string;
    suggestions: { mic: string; position: string; distance: string; why: string; similarity?: number }[];
    fromLearnedData: boolean;
    blendSuggestion: BlendSuggestion | null;
  }

  const BLEND_TONAL_DESCRIPTIONS: Record<ComboBlendLabel, string> = {
    tight: 'SM57-dominant — punchy, aggressive, more bite and high-mid cut',
    balance: 'Even mix — SM57 attack with R121 warmth smoothing the top end',
    thick: 'Near-equal — full-bodied, thickened mids, slightly less bite than Balance',
    smooth: 'R121-leaning — rounded highs, warm midrange, less harsh transients',
    ribbon_dom: 'Ribbon-dominant — dark, warm, smooth top end, big low-mids',
  };

  const missingSuggestions = useMemo((): MissingSuggestion[] => {
    if (!referenceComparison || referenceComparison.missingFlavors.length === 0) return [];

    return referenceComparison.missingFlavors.map(m => {
      const refIR = referenceSet?.irs.find(ir => ir.filename === m.refFilename);

      const parsed = parseFilename(m.refFilename);
      let blendSuggestion: BlendSuggestion | null = null;
      if (parsed.isComboIR && parsed.blendLabel) {
        const info = COMBO_BLEND_INFO[parsed.blendLabel];
        blendSuggestion = {
          blendType: info.label,
          ratio: `${info.sm57}:${info.r121}`,
          description: BLEND_TONAL_DESCRIPTIONS[parsed.blendLabel],
        };
      }

      if (!refIR) {
        return {
          refFilename: m.refFilename,
          refLabel: m.refLabel,
          suggestions: LABEL_FALLBACK_SUGGESTIONS[m.refLabel] || LABEL_FALLBACK_SUGGESTIONS['balanced'] || [],
          fromLearnedData: false,
          blendSuggestion,
        };
      }

      if (tonalProfileRows && tonalProfileRows.length > 0) {
        const scored = tonalProfileRows.map(tp => {
          const tpBands = [tp.subBass, tp.bass, tp.lowMid, tp.mid, tp.highMid, tp.presence];
          const refBands = [refIR.subBass, refIR.bass, refIR.lowMid, refIR.mid, refIR.highMid, refIR.presence];
          let totalDiff = 0;
          for (let i = 0; i < 6; i++) totalDiff += Math.abs(refBands[i] - tpBands[i]);
          const bandSim = Math.max(0, 1 - (totalDiff / 60));

          const ratioDiff = Math.abs(refIR.ratio - tp.ratio);
          const ratioSim = Math.max(0, 1 - (ratioDiff / 1.5));

          const centroidDiff = Math.abs(refIR.centroid - tp.centroid);
          const centroidSim = Math.max(0, 1 - (centroidDiff / 3000));

          const similarity = bandSim * 0.50 + ratioSim * 0.25 + centroidSim * 0.25;
          return { tp, similarity };
        });

        scored.sort((a, b) => b.similarity - a.similarity);

        const topMatches = scored.slice(0, 3).filter(s => s.similarity > 0.3);

        if (topMatches.length > 0) {
          return {
            refFilename: m.refFilename,
            refLabel: m.refLabel,
            suggestions: topMatches.map(tm => ({
              mic: tm.tp.mic,
              position: tm.tp.position,
              distance: tm.tp.distance,
              why: `${Math.round(tm.similarity * 100)}% tonal match (${tm.tp.sampleCount} sample${tm.tp.sampleCount !== 1 ? 's' : ''})`,
              similarity: tm.similarity,
            })),
            fromLearnedData: true,
            blendSuggestion,
          };
        }
      }

      return {
        refFilename: m.refFilename,
        refLabel: m.refLabel,
        suggestions: LABEL_FALLBACK_SUGGESTIONS[m.refLabel] || LABEL_FALLBACK_SUGGESTIONS['balanced'] || [],
        fromLearnedData: false,
        blendSuggestion,
      };
    });
  }, [referenceComparison, referenceSet, tonalProfileRows, LABEL_FALLBACK_SUGGESTIONS]);

  // Blend analysis state
  interface BlendAnalysisResult {
    filename: string;
    blendMics: string[];
    componentMatches: { mic: string; filename: string; similarity: number }[];
    maxComponentSimilarity: number;
    verdict: 'essential' | 'adds-value' | 'redundant';
    explanation: string;
    dominanceNote?: string;
  }
  const [blendAnalysisResults, setBlendAnalysisResults] = useState<BlendAnalysisResult[]>([]);
  const [showBlendAnalysis, setShowBlendAnalysis] = useState(false);
  const [blendThreshold, setBlendThreshold] = useState(0.93);
  
  // Smart Thin state - auto-detect over-represented groups and suggest keeping tonally unique variants
  interface SmartThinGroup {
    groupKey: string; // e.g., "roswell_cap" or "sm57_r121_a_tight"
    displayName: string;
    members: { filename: string; centroid: number; label: 'bright' | 'mid' | 'dark' | 'mid-fwd' | 'scooped' | 'thick' | 'smooth' | 'extra'; midRatio?: number; ratio?: number; tonalHint?: string }[];
    suggested: string[]; // Filenames to keep (3-5 tonally unique variants)
    extras: string[]; // Filenames that could be cut
  }
  const [smartThinGroups, setSmartThinGroups] = useState<SmartThinGroup[]>([]);
  const [smartThinExclusions, setSmartThinExclusions] = useState<Set<string>>(new Set()); // User-confirmed exclusions
  const [showSmartThin, setShowSmartThin] = useState(false);
  
  // Preference query state for subjective culling decisions
  interface CullPreference {
    type: 'brightness' | 'midrange' | 'roleBalance';
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

  const tiltMedianBySpeaker = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const ir of batchIRs) {
      const t = (ir.metrics as any)?.spectralTilt;
      if (!Number.isFinite(t)) continue;
      const spk = detectSpeakerPrefix(ir.file.name);
      if (!map.has(spk)) map.set(spk, []);
      map.get(spk)!.push(t);
    }
    if (batchResult) {
      for (const r of batchResult.results) {
        const t = (r as any).spectralTilt;
        if (!Number.isFinite(t)) continue;
        const spk = detectSpeakerPrefix(r.filename);
        if (!map.has(spk)) map.set(spk, []);
        map.get(spk)!.push(t);
      }
    }
    const out = new Map<string, number>();
    for (const entries of Array.from(map.entries())) {
      const [spk, arr] = entries;
      arr.sort((a: number, b: number) => a - b);
      out.set(spk, arr[Math.floor(arr.length / 2)]);
    }
    return out;
  }, [batchIRs, batchResult]);

  const tiltQuantilesBySpeaker = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const ir of batchIRs) {
      const abs = (ir.metrics as any)?.spectralTilt;
      if (!Number.isFinite(abs)) continue;
      const spk = detectSpeakerPrefix(ir.file.name);
      const med = tiltMedianBySpeaker.get(spk) ?? 0;
      const rel = abs - med;
      if (!map.has(spk)) map.set(spk, []);
      map.get(spk)!.push(rel);
    }
    if (batchResult) {
      for (const r of batchResult.results) {
        const abs = (r as any).spectralTilt;
        if (!Number.isFinite(abs)) continue;
        const spk = detectSpeakerPrefix(r.filename);
        const med = tiltMedianBySpeaker.get(spk) ?? 0;
        const rel = abs - med;
        if (!map.has(spk)) map.set(spk, []);
        map.get(spk)!.push(rel);
      }
    }
    const out = new Map<string, { q10: number; q30: number; q70: number; q90: number }>();
    for (const entries of Array.from(map.entries())) {
      const [spk, arr] = entries;
      arr.sort((a: number, b: number) => a - b);
      out.set(spk, {
        q10: quantile(arr, 0.10),
        q30: quantile(arr, 0.30),
        q70: quantile(arr, 0.70),
        q90: quantile(arr, 0.90),
      });
    }
    return out;
  }, [batchIRs, batchResult, tiltMedianBySpeaker]);

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
    } else if (validBatchCount >= 2 && num >= validBatchCount) {
      const clamped = validBatchCount - 1;
      setCullCountInput(String(clamped));
      setTargetCullCount(clamped);
    }
  };
  
  // Section navigation - 3 main sections that cycle: Analysis → Redundancy → Culling
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const mainSections = [
    { ref: analyzeRef, name: 'Analysis' },
    { ref: redundancyRef, name: 'Redundancy' },
    { ref: cullerRef, name: 'Culling' },
  ];
  
  const navigateSection = (direction: 'up' | 'down') => {
    let nextIdx;
    if (direction === 'down') {
      nextIdx = (currentSectionIdx + 1) % mainSections.length;
    } else {
      nextIdx = (currentSectionIdx - 1 + mainSections.length) % mainSections.length;
    }
    
    setCurrentSectionIdx(nextIdx);
    mainSections[nextIdx].ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const saveAsReference = useCallback(() => {
    const refIRs = buildReferenceIRs();
    if (!refIRs || !batchResult) return;
    const speaker = batchResult.results[0]?.parsedInfo?.speaker || 'unknown';
    setReferenceSet({
      name: `${speaker} Reference (${refIRs.length} IRs)`,
      speaker,
      createdAt: new Date().toISOString(),
      irs: refIRs,
    });
    toast({ title: "Reference set saved", description: `${refIRs.length} IRs saved as your reference palette` });
  }, [buildReferenceIRs, batchResult, toast]);

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
    setRedundancyGroups([]);
    setShowRedundancies(false);
    setBlendAnalysisResults([]);
    setShowBlendAnalysis(false);

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
      // 6-band detailed breakdown
      subBassEnergy: ir.metrics!.subBassEnergy,
      bassEnergy: ir.metrics!.bassEnergy,
      lowMidEnergy: ir.metrics!.lowMidEnergy,
      midEnergy6: ir.metrics!.midEnergy6,
      highMidEnergy: ir.metrics!.highMidEnergy,
      presenceEnergy: ir.metrics!.presenceEnergy,
      ultraHighEnergy: ir.metrics!.ultraHighEnergy,
      hasClipping: ir.metrics!.hasClipping,
      clippedSamples: ir.metrics!.clippedSamples,
      crestFactorDb: ir.metrics!.crestFactorDb,
      frequencySmoothness: ir.metrics!.frequencySmoothness,
      noiseFloorDb: ir.metrics!.noiseFloorDb,
      spectralTilt: (ir.metrics as any)?.spectralTilt,
      rolloffFreq: (ir.metrics as any)?.rolloffFreq,
      smoothScore: (ir.metrics as any)?.smoothScore,
      maxNotchDepth: (ir.metrics as any)?.maxNotchDepth,
      notchCount: (ir.metrics as any)?.notchCount,
      logBandEnergies: (ir.metrics as any)?.logBandEnergies,
      tailLevelDb: (ir.metrics as any)?.tailLevelDb,
      tailStatus: (ir.metrics as any)?.tailStatus,
    }));

    analyzeBatch(irInputs);
  };

  const clearBatch = () => {
    setBatchIRs([]);
    setBatchResult(null);
    setRedundancyGroups([]);
    setShowRedundancies(false);
    setCullResult(null);
    setCullRoleStats(null);
    setShowCuller(false);
    setBlendAnalysisResults([]);
    setShowBlendAnalysis(false);
    setPendingPreferences([]);
    setSelectedPreferences({});
    setShowPreferenceQuery(false);
    // Clear session storage
    try {
      sessionStorage.removeItem('ir-redundancy-groups');
      sessionStorage.removeItem('ir-show-redundancies');
    } catch {}
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
    
    // Preserve existing selections - map from member filenames to selected keeper
    const existingSelections = new Map<string, string>();
    for (const group of redundancyGroups) {
      if (group.selectedToKeep) {
        for (const member of group.members) {
          existingSelections.set(member.filename, group.selectedToKeep);
        }
      }
    }
    
    const groups = findRedundancyGroups(irsWithMetrics, similarityThreshold);
    
    // Restore selections to new groups if the selected IR is still in the group
    const groupsWithSelections = groups.map(group => {
      const memberFilenames = group.members.map(m => m.filename);
      for (const member of group.members) {
        const previousSelection = existingSelections.get(member.filename);
        if (previousSelection && memberFilenames.includes(previousSelection)) {
          return { ...group, selectedToKeep: previousSelection };
        }
      }
      return group;
    });
    
    setRedundancyGroups(groupsWithSelections);
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

  // Standalone blend analysis - analyze just the blends without full culling
  const handleBlendAnalysis = () => {
    const validIRs = batchIRs.filter(ir => ir.metrics && !ir.error);
    if (validIRs.length < 2) {
      toast({ title: "Need more IRs", description: "Upload at least 2 IRs to analyze blends", variant: "destructive" });
      return;
    }

    const mics = ['sm57', 'r121', 'm160', 'md421', 'md421kompakt', 'md441', 'pr30', 'e906', 'm201', 'sm7b', 'c414', 'r92', 'r10', 'm88', 'roswell'];
    const blendTechniques: Record<string, string[]> = { 'fredman': ['sm57', 'sm57'] };
    const detectMics = (filename: string): { mics: string[]; isTechnique: boolean } => {
      const lower = filename.toLowerCase();
      for (const [technique, techMics] of Object.entries(blendTechniques)) {
        if (lower.includes(technique)) return { mics: techMics, isTechnique: true };
      }
      const found: string[] = [];
      for (const mic of mics) {
        if (lower.includes(mic)) found.push(mic);
      }
      return { mics: found, isTechnique: false };
    };

    const blendIndices: number[] = [];
    for (let i = 0; i < validIRs.length; i++) {
      const det = detectMics(validIRs[i].file.name);
      if (det.mics.length >= 2 || det.isTechnique) blendIndices.push(i);
    }

    if (blendIndices.length === 0) {
      toast({ title: "No blends found", description: "No multi-mic blend IRs detected in your batch (e.g., SM57+R121 or Fredman filenames)", variant: "destructive" });
      return;
    }

    const n = validIRs.length;
    const simMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const { similarity } = calculateSimilarity(validIRs[i].metrics!, validIRs[j].metrics!);
        simMatrix[i][j] = similarity;
        simMatrix[j][i] = similarity;
      }
    }

    const countSoloShotsStandalone = (micName: string): number => {
      let count = 0;
      for (let j = 0; j < n; j++) {
        const det = detectMics(validIRs[j].file.name);
        if (det.mics.length === 1 && det.mics[0] === micName) count++;
      }
      return count;
    };

    const results: BlendAnalysisResult[] = [];
    for (const bi of blendIndices) {
      const { mics: blendMics, isTechnique } = detectMics(validIRs[bi].file.name);
      const matchedTechnique = Object.keys(blendTechniques).find(t => validIRs[bi].file.name.toLowerCase().includes(t));
      const blendLabel = matchedTechnique
        ? matchedTechnique.charAt(0).toUpperCase() + matchedTechnique.slice(1)
        : blendMics.map(m => m.toUpperCase()).join('+');

      if (isTechnique) {
        results.push({
          filename: validIRs[bi].file.name,
          blendMics,
          componentMatches: [],
          maxComponentSimilarity: 0,
          verdict: 'essential',
          explanation: `${blendLabel} — named technique blend, unique mic arrangement not replicable from solo shots`
        });
        continue;
      }

      const uniqueBlendMics = Array.from(new Set(blendMics));
      const componentMatches: { mic: string; filename: string; similarity: number }[] = [];

      for (const mic of uniqueBlendMics) {
        let bestSim = 0;
        let bestFile = '';
        for (let j = 0; j < n; j++) {
          if (j === bi) continue;
          const jDet = detectMics(validIRs[j].file.name);
          if (jDet.mics.length === 1 && jDet.mics[0] === mic) {
            const sim = simMatrix[bi][j];
            if (sim > bestSim) {
              bestSim = sim;
              bestFile = validIRs[j].file.name;
            }
          }
        }
        if (bestFile) {
          componentMatches.push({ mic, filename: bestFile, similarity: bestSim });
        }
      }

      if (componentMatches.length === 0) {
        results.push({
          filename: validIRs[bi].file.name,
          blendMics,
          componentMatches: [],
          maxComponentSimilarity: 0,
          verdict: 'essential',
          explanation: `${blendLabel} blend — no matching single-mic captures in batch to compare`
        });
        continue;
      }
      const maxSim = Math.max(...componentMatches.map(c => c.similarity));
      const closestComponent = componentMatches.reduce((a, b) => a.similarity > b.similarity ? a : b);
      const simPct = Math.round(closestComponent.similarity * 100);
      const uniquePct = Math.round((1 - maxSim) * 100);

      const allComponentsWellCovered = uniqueBlendMics.every(m => countSoloShotsStandalone(m) >= 3);
      const effectiveThreshold = allComponentsWellCovered
        ? Math.max(blendThreshold - 0.08, 0.78)
        : blendThreshold;
      const coverageNote = allComponentsWellCovered ? ' (strict — solo coverage is strong)' : '';

      let dominanceNote: string | undefined;
      const hasBothSolos = componentMatches.length >= 2;
      if (hasBothSolos) {
        const sorted = [...componentMatches].sort((a, b) => b.similarity - a.similarity);
        const closest = sorted[0];
        const other = sorted[1];
        const closePct = Math.round(closest.similarity * 100);
        const otherPct = Math.round(other.similarity * 100);
        if (maxSim >= effectiveThreshold) {
          dominanceNote = `${closePct}% match to ${closest.mic.toUpperCase()} solo — this blend doesn't give you a new tone to work with. The ${closest.mic.toUpperCase()} solo already covers this territory.${coverageNote}`;
        } else if (maxSim >= effectiveThreshold - 0.15) {
          if (closePct - otherPct >= 10) {
            dominanceNote = `Leans toward ${closest.mic.toUpperCase()} (${closePct}%) but different enough to be its own flavor. Could work as an alternative to the ${closest.mic.toUpperCase()} solo when you want a slightly different texture to layer with other mics.`;
          } else {
            dominanceNote = `Sits between ${closest.mic.toUpperCase()} (${closePct}%) and ${other.mic.toUpperCase()} (${otherPct}%) — a distinct middle-ground tone that neither solo gives you on its own. Useful as a unique ingredient for layering.`;
          }
        } else {
          dominanceNote = `Only ${closePct}% similar to the nearest solo (${closest.mic.toUpperCase()}) — this is its own thing. A standalone tone you can layer with any other mic for combinations the solos can't produce.`;
        }
      } else if (componentMatches.length === 1) {
        const only = componentMatches[0];
        const onlyPct = Math.round(only.similarity * 100);
        const missingMics = uniqueBlendMics.filter(m => m !== only.mic);
        if (missingMics.length > 0) {
          dominanceNote = `${onlyPct}% match to ${only.mic.toUpperCase()} solo. No solo ${missingMics.map(m => m.toUpperCase()).join('/')} in batch to compare against.`;
        }
      }

      let verdict: 'essential' | 'adds-value' | 'redundant';
      let explanation: string;
      if (maxSim >= effectiveThreshold) {
        verdict = 'redundant';
        explanation = `${simPct}% match to ${closestComponent.mic.toUpperCase()} solo — doesn't add a new mixing ingredient, the solo already covers this tone${coverageNote}`;
      } else if (maxSim >= effectiveThreshold - 0.15) {
        verdict = 'adds-value';
        explanation = `${blendLabel} blend offers a different flavor from the solos — a useful alternative tone for layering with other mics`;
      } else {
        verdict = 'essential';
        explanation = `${blendLabel} blend is its own unique tone — a standalone mixing ingredient the solos can't replicate`;
      }

      results.push({
        filename: validIRs[bi].file.name,
        blendMics,
        componentMatches,
        maxComponentSimilarity: maxSim,
        verdict,
        explanation,
        dominanceNote
      });
    }

    results.sort((a, b) => {
      const order = { redundant: 0, 'adds-value': 1, essential: 2 };
      if (order[a.verdict] !== order[b.verdict]) return order[a.verdict] - order[b.verdict];
      if (a.verdict === 'adds-value' && b.verdict === 'adds-value') {
        return a.maxComponentSimilarity - b.maxComponentSimilarity;
      }
      return 0;
    });

    setBlendAnalysisResults(results);
    setShowBlendAnalysis(true);

    const redundantCount = results.filter(r => r.verdict === 'redundant').length;
    const addsValueCount = results.filter(r => r.verdict === 'adds-value').length;
    const essentialCount = results.filter(r => r.verdict === 'essential').length;

    toast({
      title: `Analyzed ${results.length} blend${results.length > 1 ? 's' : ''}`,
      description: `${redundantCount} redundant, ${addsValueCount} adds-value, ${essentialCount} essential`
    });

    setTimeout(() => scrollToSection(blendAnalysisRef), 100);
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
    // But only offer options that actually have enough IRs to make a real difference
    if (centroidRange > 400) {
      const brightThreshold = minCentroid + (centroidRange * 0.67);
      const darkThreshold = minCentroid + (centroidRange * 0.33);
      
      const brightCount = centroids.filter(c => c >= brightThreshold).length;
      const darkCount = centroids.filter(c => c <= darkThreshold).length;
      const neutralCount = centroids.filter(c => c > darkThreshold && c < brightThreshold).length;
      const minMeaningful = Math.max(2, Math.ceil(irs.length * 0.1));
      
      const brightOptions: { label: string; value: string }[] = [];
      const meaningfulCategories = [brightCount >= minMeaningful, neutralCount >= minMeaningful, darkCount >= minMeaningful].filter(Boolean).length;
      if (meaningfulCategories >= 2) {
        brightOptions.push({ label: 'Variety (keep mix of bright/neutral/dark)', value: 'variety' });
      }
      if (brightCount >= minMeaningful) brightOptions.push({ label: `Brighter / More cutting (${brightCount} IRs)`, value: 'bright' });
      if (neutralCount >= minMeaningful) brightOptions.push({ label: `Balanced / Neutral (${neutralCount} IRs)`, value: 'neutral' });
      if (darkCount >= minMeaningful) brightOptions.push({ label: `Darker / Warmer (${darkCount} IRs)`, value: 'dark' });
      brightOptions.push({ label: 'No preference (technical only)', value: 'none' });
      
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
    // But only offer options that actually have enough IRs to make a real difference
    if (midRange > 0.1) {
      const forwardThreshold = minMid + (midRange * 0.67);
      const scoopedThreshold = minMid + (midRange * 0.33);
      
      const forwardCount = midRatios.filter(m => m >= forwardThreshold).length;
      const scoopedCount = midRatios.filter(m => m <= scoopedThreshold).length;
      const neutralMidCount = midRatios.filter(m => m > scoopedThreshold && m < forwardThreshold).length;
      const minMeaningfulMid = Math.max(2, Math.ceil(irs.length * 0.1));
      
      const midOptions: { label: string; value: string }[] = [];
      const meaningfulMidCategories = [forwardCount >= minMeaningfulMid, neutralMidCount >= minMeaningfulMid, scoopedCount >= minMeaningfulMid].filter(Boolean).length;
      if (meaningfulMidCategories >= 2) {
        midOptions.push({ label: 'Variety (keep mix of mid characters)', value: 'variety' });
      }
      if (forwardCount >= minMeaningfulMid) midOptions.push({ label: `Mid-forward / Punchy (${forwardCount} IRs)`, value: 'forward' });
      if (neutralMidCount >= minMeaningfulMid) midOptions.push({ label: `Balanced mids (${neutralMidCount} IRs)`, value: 'neutral' });
      if (scoopedCount >= minMeaningfulMid) midOptions.push({ label: `Scooped / More low & high (${scoopedCount} IRs)`, value: 'scooped' });
      midOptions.push({ label: 'No preference (technical only)', value: 'none' });
      
      if (midOptions.length > 2) {
        preferences.push({
          type: 'midrange',
          question: 'What midrange character do you prefer?',
          options: midOptions
        });
      }
    }
    
    if (learnedProfile && learnedProfile.status !== "no_data") {
      let featureCount = 0;
      let bodyCount = 0;
      for (const ir of irs) {
        const totalEnergy = (ir.metrics.subBassEnergy || 0) + (ir.metrics.bassEnergy || 0) +
          (ir.metrics.lowMidEnergy || 0) + (ir.metrics.midEnergy6 || 0) +
          (ir.metrics.highMidEnergy || 0) + (ir.metrics.presenceEnergy || 0);
        if (totalEnergy === 0) continue;
        const toPercent = (e: number) => Math.round((e / totalEnergy) * 100);
        const bands: TonalBands = {
          subBass: toPercent(ir.metrics.subBassEnergy || 0),
          bass: toPercent(ir.metrics.bassEnergy || 0),
          lowMid: toPercent(ir.metrics.lowMidEnergy || 0),
          mid: toPercent(ir.metrics.midEnergy6 || 0),
          highMid: toPercent(ir.metrics.highMidEnergy || 0),
          presence: toPercent(ir.metrics.presenceEnergy || 0),
          air: 0,
          fizz: 0,
        };
        const { best } = scoreIndividualIR(featuresFromBands(bands), activeProfiles, learnedProfile);
        if (best.score < 35) continue;
        if (best.profile === "Featured") featureCount++;
        else bodyCount++;
      }
      const totalClassified = featureCount + bodyCount;
      if (totalClassified >= 4) {
        const featureRatio = featureCount / totalClassified;
        const bodyRatio = bodyCount / totalClassified;
        const scarceRole = featureRatio < 0.25 ? "Feature" : bodyRatio < 0.25 ? "Body" : null;
        const scarceCount = scarceRole === "Feature" ? featureCount : scarceRole === "Body" ? bodyCount : 0;
        if (scarceRole && scarceCount > 0) {
          preferences.push({
            type: 'roleBalance',
            question: `Only ${scarceCount} of ${totalClassified} classified IRs are ${scarceRole} shots. Protect them when culling?`,
            options: [
              { label: `Favor ${scarceRole} shots (strong protection)`, value: 'favor' },
              { label: `Protect ${scarceRole} shots (light protection)`, value: 'protect' },
              { label: 'No preference (let culler decide)', value: 'off' }
            ]
          });
        }
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
  
  // Smart Thin: detect over-represented groups and suggest keeping bright/mid/dark
  const detectSmartThinGroups = (irs: { filename: string; metrics: AudioMetrics }[]): SmartThinGroup[] => {
    const groups: SmartThinGroup[] = [];
    
    // Helper functions
    const getSpeakerPrefix = (filename: string): string => {
      const lower = filename.toLowerCase();
      const mics = ['sm57','r121','m160','md421','md421kompakt','md441','pr30','e906','m201','sm7b','c414','r92','r10','m88','roswell'];
      let firstIdx = Number.POSITIVE_INFINITY;
      for (const mic of mics) {
        const idx = lower.indexOf(mic);
        if (idx !== -1 && idx < firstIdx) firstIdx = idx;
      }
      if (!Number.isFinite(firstIdx) || firstIdx === Number.POSITIVE_INFINITY) return (lower.split("_")[0] ?? lower).trim();
      return lower.slice(0, firstIdx).trim();
    };

    const getAllMics = (filename: string): string[] => {
      const lower = filename.toLowerCase();
      const mics = ['sm57','r121','m160','md421','md421kompakt','md441','pr30','e906','m201','sm7b','c414','r92','r10','m88','roswell'];
      const found: string[] = [];
      for (const mic of mics) if (lower.includes(mic)) found.push(mic);
      return found;
    };

    const getMicKey = (filename: string): string => {
      const found = getAllMics(filename);
      if (found.length >= 2) return `combo_${[...found].sort().join("_")}`;
      if (found.length === 1) return found[0];
      return "unknown";
    };

    const getMic = (filename: string): string => {
      return getMicKey(filename);
    };
    
    const getPos = (filename: string): string => {
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
    
    // Detect if this is a combo IR (e.g., sm57_r121)
    const isCombo = (filename: string): boolean => {
      return getAllMics(filename).length >= 2;
    };
    
    // Get combo position variant (A, B, C, etc.)
    const getComboVariant = (filename: string): string => {
      const match = filename.match(/_([abc])_/i);
      return match ? match[1].toUpperCase() : 'default';
    };
    
    // Get voicing for combos (tight, thick, balanced, etc.)
    const getVoicing = (filename: string): string => {
      const lower = filename.toLowerCase();
      if (lower.includes('tight')) return 'tight';
      if (lower.includes('thick')) return 'thick';
      if (lower.includes('balanced') || lower.includes('bal')) return 'balanced';
      if (lower.includes('warm')) return 'warm';
      if (lower.includes('bright')) return 'bright';
      return 'default';
    };
    
    // Group IRs by key
    const groupMap = new Map<string, typeof irs>();
    
    for (const ir of irs) {
      let groupKey: string;
      let displayName: string;
      const spk = getSpeakerPrefix(ir.filename);
      
      if (isCombo(ir.filename)) {
        // Combo: group by speaker + mic combo + position variant + voicing
        const mic = getMicKey(ir.filename);
        const variant = getComboVariant(ir.filename);
        const voicing = getVoicing(ir.filename);
        groupKey = `${spk}__${mic}_${variant}_${voicing}`;
        displayName = `${spk.toUpperCase()} • ${mic.replace('combo_','').toUpperCase()} Combo (${variant}${voicing !== 'default' ? `, ${voicing}` : ''})`;
      } else {
        // Single mic: group by speaker + mic + position
        const mic = getMicKey(ir.filename);
        const pos = getPos(ir.filename);
        groupKey = `${spk}__${mic}_${pos}`;
        displayName = `${spk.toUpperCase()} • ${mic.toUpperCase()} @ ${pos.replace(/_/g, ' ')}`;
      }
      
      if (!groupMap.has(groupKey)) groupMap.set(groupKey, []);
      groupMap.get(groupKey)!.push(ir);
    }
    
    // Find groups with 4+ members (over-represented)
    for (const [key, members] of Array.from(groupMap.entries())) {
      if (members.length >= 4) {
        // Use the real 6-band data for tonal characterization
        const withTonalData = members.map(ir => {
          const m = ir.metrics;
          const centroid = m.spectralCentroid;
          const total6 = (m.subBassEnergy || 0) + (m.bassEnergy || 0) + (m.lowMidEnergy || 0) +
            (m.midEnergy6 || 0) + (m.highMidEnergy || 0) + (m.presenceEnergy || 0);
          const mid = total6 > 0 ? ((m.midEnergy6 || 0) / total6) * 100 : 0;
          const highMid = total6 > 0 ? ((m.highMidEnergy || 0) / total6) * 100 : 0;
          const presence = total6 > 0 ? ((m.presenceEnergy || 0) / total6) * 100 : 0;
          const lowMid = total6 > 0 ? ((m.lowMidEnergy || 0) / total6) * 100 : 0;
          const bass = total6 > 0 ? ((m.bassEnergy || 0) / total6) * 100 : 0;
          const ratio = mid > 0 ? highMid / mid : 0;
          return { ...ir, centroid, mid, highMid, presence, lowMid, bass, ratio };
        });

        // Sort by centroid for initial ordering
        const sorted = [...withTonalData].sort((a, b) => b.centroid - a.centroid);

        // Use the same calculateSimilarity function (35% 6-band, 15% ratio, 30% freq correlation, 20% centroid)
        // Two IRs are "tonally distinct" if their similarity is below this threshold
        const DISTINCT_THRESHOLD = 0.85;

        const selected: typeof sorted = [];

        // Always include brightest
        selected.push(sorted[0]);

        // Always include darkest if different enough
        if (sorted.length > 1) {
          const darkest = sorted[sorted.length - 1];
          const { similarity } = calculateSimilarity(sorted[0].metrics, darkest.metrics);
          if (similarity < 0.90) {
            selected.push(darkest);
          }
        }

        // Add mid-point candidate
        const midCandidate = sorted[Math.floor(sorted.length / 2)];
        const isMidUnique = selected.every(s => {
          const { similarity } = calculateSimilarity(s.metrics, midCandidate.metrics);
          return similarity < DISTINCT_THRESHOLD;
        });
        if (isMidUnique) {
          selected.push(midCandidate);
        }

        // Check remaining IRs for any that are tonally unique
        for (const ir of sorted) {
          if (selected.includes(ir)) continue;
          const isUnique = selected.every(s => {
            const { similarity } = calculateSimilarity(s.metrics, ir.metrics);
            return similarity < DISTINCT_THRESHOLD;
          });
          if (isUnique && selected.length < 5) {
            selected.push(ir);
          }
        }

        // Sort selected by centroid for consistent labeling
        selected.sort((a, b) => b.centroid - a.centroid);

        // Generate labels based on 6-band characteristics
        const groupAvgMid = withTonalData.reduce((s, ir) => s + ir.mid, 0) / withTonalData.length;
        const groupAvgRatio = withTonalData.reduce((s, ir) => s + ir.ratio, 0) / withTonalData.length;
        const groupAvgLowMid = withTonalData.reduce((s, ir) => s + ir.lowMid, 0) / withTonalData.length;
        const groupAvgPresence = withTonalData.reduce((s, ir) => s + ir.presence, 0) / withTonalData.length;

        const getLabel = (ir: typeof sorted[0], idx: number, total: number): 'bright' | 'mid' | 'dark' | 'mid-fwd' | 'scooped' | 'thick' | 'smooth' | 'extra' => {
          if (idx === 0) return 'bright';
          if (idx === total - 1) return 'dark';
          if (ir.mid > groupAvgMid * 1.15 && ir.ratio < groupAvgRatio * 0.85) return 'mid-fwd';
          if (ir.ratio > groupAvgRatio * 1.2 && ir.mid < groupAvgMid * 0.9) return 'scooped';
          if (ir.lowMid > groupAvgLowMid * 1.15 && ir.presence < groupAvgPresence * 0.85) return 'thick';
          if (((ir.metrics.smoothScore ?? ir.metrics.frequencySmoothness) || 0) > 70) return 'smooth';
          return 'mid';
        };

        const getTonalHint = (ir: typeof sorted[0]): string => {
          const hints: string[] = [];
          if (ir.mid > groupAvgMid * 1.1) hints.push('mid+');
          else if (ir.mid < groupAvgMid * 0.9) hints.push('mid-');
          if (ir.ratio > groupAvgRatio * 1.15) hints.push('bite');
          else if (ir.ratio < groupAvgRatio * 0.85) hints.push('smooth');
          if (ir.lowMid > groupAvgLowMid * 1.1) hints.push('thick');
          if (ir.presence > groupAvgPresence * 1.15) hints.push('airy');
          return hints.length > 0 ? hints.join(', ') : 'neutral';
        };

        const suggested = selected.map(s => s.filename);
        const suggestedSet = new Set(suggested);
        const extras = sorted.filter(ir => !suggestedSet.has(ir.filename)).map(ir => ir.filename);

        const labeledMembers = sorted.map((ir) => {
          const selIdx = selected.findIndex(s => s.filename === ir.filename);
          let label: 'bright' | 'mid' | 'dark' | 'mid-fwd' | 'scooped' | 'thick' | 'smooth' | 'extra' = 'extra';
          if (selIdx !== -1) {
            label = getLabel(ir, selIdx, selected.length);
          }
          return {
            filename: ir.filename,
            centroid: Math.round(ir.centroid),
            label,
            midRatio: Math.round(ir.mid),
            ratio: Math.round(ir.ratio * 100) / 100,
            tonalHint: getTonalHint(ir)
          };
        });

        groups.push({
          groupKey: key,
          displayName: members[0].filename.includes('_') ?
            key.replace(/_/g, ' ').replace('combo ', '') : key,
          members: labeledMembers,
          suggested,
          extras
        });
      }
    }
    
    return groups;
  };
  
  // Handle smart thin detection
  const handleDetectSmartThin = () => {
    const validIRs = batchIRs.filter(ir => ir.metrics && !ir.error);
    if (validIRs.length < 4) {
      toast({ title: "Not enough IRs", description: "Need at least 4 IRs to detect over-represented groups", variant: "destructive" });
      return;
    }
    
    const irsWithMetrics = validIRs.map(ir => ({
      filename: ir.file.name,
      metrics: ir.metrics!
    }));
    
    const groups = detectSmartThinGroups(irsWithMetrics);
    
    if (groups.length === 0) {
      toast({ title: "No over-represented groups", description: "Your collection is already well-balanced!" });
      return;
    }
    
    setSmartThinGroups(groups);
    setShowSmartThin(true);
    
    const totalExtras = groups.reduce((sum, g) => sum + g.extras.length, 0);
    toast({ 
      title: `Found ${groups.length} over-represented group${groups.length > 1 ? 's' : ''}`,
      description: `${totalExtras} IRs could be thinned to keep tonally unique variants`
    });
  };
  
  // Apply smart thin exclusions
  const applySmartThinExclusions = () => {
    const allExtras = smartThinGroups.flatMap(g => g.extras);
    setSmartThinExclusions(new Set(allExtras));
    setShowSmartThin(false);
    toast({ 
      title: "Exclusions applied", 
      description: `${allExtras.length} IRs marked for exclusion. Run cull to see results.` 
    });
  };
  
  // Cull IRs to target count
  const handleCullIRs = (showToast = true, skipPreferenceCheck = false, overridesOverride?: Map<string, string[]>) => {
    const validIRs = batchIRs.filter(ir => ir.metrics && !ir.error);
    
    // Exclude IRs that are marked for removal from redundancy groups
    const irsToRemove = new Set(getIRsToRemove());
    const eligibleIRs = validIRs.filter(ir => 
      !irsToRemove.has(ir.file.name) && !smartThinExclusions.has(ir.file.name)
    );
    
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
    
    const prefMap = new Map<string, IRPreferenceInfo>();
    if (learnedProfile && learnedProfile.status !== "no_data") {
      for (const ir of irsToProcess) {
        if (!ir.metrics) continue;
        const totalEnergy = (ir.metrics.subBassEnergy || 0) + (ir.metrics.bassEnergy || 0) +
          (ir.metrics.lowMidEnergy || 0) + (ir.metrics.midEnergy6 || 0) +
          (ir.metrics.highMidEnergy || 0) + (ir.metrics.presenceEnergy || 0);
        const toPercent = (e: number) => totalEnergy > 0 ? Math.round((e / totalEnergy) * 100) : 0;
        const bands: TonalBands = {
          subBass: toPercent(ir.metrics.subBassEnergy || 0),
          bass: toPercent(ir.metrics.bassEnergy || 0),
          lowMid: toPercent(ir.metrics.lowMidEnergy || 0),
          mid: toPercent(ir.metrics.midEnergy6 || 0),
          highMid: toPercent(ir.metrics.highMidEnergy || 0),
          presence: toPercent(ir.metrics.presenceEnergy || 0),
          air: 0,
          fizz: 0,
        };
        const { results: matchResults, best } = scoreIndividualIR(featuresFromBands(bands), activeProfiles, learnedProfile);
        const featured = matchResults.find((r) => r.profile === "Featured");
        const body = matchResults.find((r) => r.profile === "Body");
        const fScore = featured?.score ?? 0;
        const bScore = body?.score ?? 0;
        const bestProfile = fScore >= bScore ? "Featured" : "Body";
        const bestScore = Math.max(fScore, bScore);
        const avoidPenalty = bestScore - best.score;
        
        prefMap.set(ir.filename, { featuredScore: fScore, bodyScore: bScore, bestProfile, bestScore, avoidPenalty: Math.max(0, avoidPenalty) });
      }
    }
    let gearSentMap: Map<string, number> | undefined;
    if (learnedProfile?.gearInsights) {
      const gi = learnedProfile.gearInsights;
      gearSentMap = new Map<string, number>();
      for (const entry of [...gi.mics, ...gi.speakers, ...gi.positions]) {
        if (entry.score.net !== 0) {
          gearSentMap.set(entry.name, entry.score.net);
        }
      }
      if (gearSentMap.size === 0) gearSentMap = undefined;
    }
    const effectiveRoleMode = (selectedPreferences['roleBalance'] as 'off' | 'protect' | 'favor') || roleBalanceMode;
    const { result, closeCalls, roleStats: rs } = cullIRs(irsToProcess, effectiveTarget, overridesOverride || cullUserOverrides, prefMap.size > 0 ? prefMap : undefined, gearSentMap, blendThreshold, effectiveRoleMode);
    setCullResult(result);
    setCullRoleStats(rs || null);
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
    if (selectedPreferences['roleBalance']) {
      setRoleBalanceMode(selectedPreferences['roleBalance'] as 'off' | 'protect' | 'favor');
    }
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
        if (r.parsedInfo.position) info.push(`Pos: ${r.parsedInfo.position}${(r.parsedInfo as any).offAxis ? ' (OffAx)' : ''}`);
        if (r.parsedInfo.speaker) info.push(`Spk: ${r.parsedInfo.speaker}`);
        if (r.parsedInfo.distance) info.push(`Dist: ${r.parsedInfo.distance}`);
        if (info.length) text += `   Detected: ${info.join(", ")}\n`;
      }
      text += `   Advice: ${r.advice}\n`;
      if (r.highlights?.length) text += `   Highlights: ${r.highlights.join(", ")}\n`;
      if (r.issues?.length) text += `   Issues: ${r.issues.join(", ")}\n`;
      if (r.spectralDeviation) {
        const sd = r.spectralDeviation;
        text += `   Tonal Center: Expected ${sd.expectedMin}-${sd.expectedMax}Hz, Actual ${Math.round(sd.actual)}Hz`;
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

  useEffect(() => {
    if (validBatchCount >= 2 && targetCullCount >= validBatchCount) {
      const newTarget = validBatchCount - 1;
      if (newTarget !== targetCullCount) {
        setTargetCullCount(newTarget);
        setCullCountInput(String(newTarget));
      }
    }
  }, [validBatchCount, targetCullCount]);

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
        // 6-band detailed breakdown
        subBassEnergy: metrics.subBassEnergy,
        bassEnergy: metrics.bassEnergy,
        lowMidEnergy: metrics.lowMidEnergy,
        midEnergy6: metrics.midEnergy6,
        highMidEnergy: metrics.highMidEnergy,
        presenceEnergy: metrics.presenceEnergy,
        ultraHighEnergy: metrics.ultraHighEnergy,
        frequencySmoothness: metrics.frequencySmoothness,
        noiseFloorDb: metrics.noiseFloorDb,
        spectralTilt: metrics.spectralTilt,
        rolloffFreq: metrics.rolloffFreq,
        smoothScore: metrics.smoothScore,
        maxNotchDepth: metrics.maxNotchDepth,
        notchCount: metrics.notchCount,
        logBandEnergies: metrics.logBandEnergies,
        tailLevelDb: metrics.tailLevelDb,
        tailStatus: metrics.tailStatus,
        originalFilename: file.name,
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
            <button
              onClick={() => setMode('compare')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                mode === 'compare' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              )}
              data-testid="button-mode-compare"
            >
              <Activity className="w-4 h-4 inline-block mr-2" />
              A/B Compare
            </button>
          </div>

          {learnedProfile && learnedProfile.signalCount > 0 && (
            <div className="flex items-center justify-center gap-2 pt-2" data-testid="analyzer-learning-status">
              <Brain className={cn(
                "w-3.5 h-3.5",
                learnedProfile.status === "mastered" ? "text-cyan-400" :
                learnedProfile.status === "confident" ? "text-emerald-400" : "text-amber-400"
              )} />
              <span className="text-xs text-muted-foreground">
                {learnedProfile.status === "mastered"
                  ? "Preferences locked in -- scoring reflects your taste"
                  : learnedProfile.status === "confident"
                  ? "Profiles adjusted from your mixer feedback"
                  : `Learning your taste (${learnedProfile.likedCount} rated so far)`
                }
              </span>
              {learnedProfile.avoidZones.length > 0 && (
                <span className="text-[10px] font-mono text-red-400/70">
                  Penalizing: {learnedProfile.avoidZones.map((z) => 
                    z.band === "muddy_composite" ? "muddy tones"
                    : `${z.direction === "high" ? "excess" : "low"} ${z.band}`
                  ).join(", ")}
                </span>
              )}
            </div>
          )}
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
                    {showSmartThin && smartThinGroups.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          smartThinRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className="text-cyan-400 border-cyan-400/30 hover:bg-cyan-400/10 animate-pulse"
                        data-testid="button-goto-smart-thin"
                      >
                        <Zap className="w-4 h-4 mr-1" />
                        → Smart Thin ({smartThinGroups.length})
                      </Button>
                    )}
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
                    {showBlendAnalysis && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => scrollToSection(blendAnalysisRef)}
                        className="text-sky-400 border-sky-400/30 hover:bg-sky-400/10"
                        data-testid="button-goto-blend-analysis"
                      >
                        <Layers className="w-4 h-4 mr-1" />
                        Blends
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
                              <ShotIntentBadge filename={ir.file.name} />
                              {ir.metrics?.hasClipping && (
                                <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded flex-shrink-0">
                                  CLIPPING
                                </span>
                              )}
                            </div>
                            {ir.metrics && (() => {
                              const features = computeTonalFeatures(ir.metrics);
                              const absTilt = features.tiltDbPerOct;
                              const spk = detectSpeakerPrefix(ir.file.name);
                              const med = tiltMedianBySpeaker.get(spk) ?? 0;
                              const tq = tiltQuantilesBySpeaker.get(spk);
                              return (
                                <TonalDashboardCompact
                                  tiltCanonical={absTilt}
                                  tiltRelative={absTilt - med}
                                  tiltQuantiles={tq}
                                  rolloffFreq={ir.metrics.rolloffFreq}
                                  smoothScore={features.smoothScore}
                                />
                              );
                            })()}
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
                  
                  {/* Find Redundancies & Blend Analysis Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleFindRedundancies}
                      disabled={validBatchCount < 2 || analyzingBatchCount > 0}
                      className={cn(
                        "flex-1 py-2 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm",
                        validBatchCount >= 2 && analyzingBatchCount === 0
                          ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30"
                          : "bg-white/5 text-muted-foreground cursor-not-allowed border border-white/5"
                      )}
                      data-testid="button-find-redundancies"
                    >
                      <Target className="w-4 h-4" />
                      Find Redundancies
                    </button>
                    <button
                      onClick={handleBlendAnalysis}
                      disabled={validBatchCount < 2 || analyzingBatchCount > 0}
                      className={cn(
                        "flex-1 py-2 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm",
                        validBatchCount >= 2 && analyzingBatchCount === 0
                          ? "bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 border border-sky-500/30"
                          : "bg-white/5 text-muted-foreground cursor-not-allowed border border-white/5"
                      )}
                      data-testid="button-blend-analysis"
                    >
                      <Layers className="w-4 h-4" />
                      Analyze Blends
                    </button>
                  </div>
                  
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
                        onClick={handleDetectSmartThin}
                        disabled={validBatchCount < 4 || analyzingBatchCount > 0}
                        className={cn(
                          "py-2 px-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm",
                          validBatchCount >= 4 && analyzingBatchCount === 0
                            ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30"
                            : "bg-white/5 text-muted-foreground cursor-not-allowed border border-white/5"
                        )}
                        title="Auto-detect over-represented groups and suggest keeping bright/mid/dark variants"
                        data-testid="button-smart-thin"
                      >
                        <Zap className="w-4 h-4" />
                        Smart Thin
                      </button>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={saveAsReference}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-xs font-medium transition-all text-emerald-400"
                        data-testid="button-save-reference"
                        title="Save this batch as your reference palette for comparing other batches"
                      >
                        <Target className="w-3 h-3" />
                        {referenceSet ? "Update Reference" : "Save as Reference"}
                      </button>
                      {referenceSet && (
                        <button
                          onClick={() => {
                            setShowReferenceComparison(!showReferenceComparison);
                            if (!showReferenceComparison) {
                              setTimeout(() => referenceComparisonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                            }
                          }}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                            showReferenceComparison
                              ? "bg-teal-500/30 border-teal-500/50 text-teal-300"
                              : "bg-teal-500/20 hover:bg-teal-500/30 border-teal-500/30 text-teal-400"
                          )}
                          data-testid="button-compare-reference"
                        >
                          <Layers className="w-3 h-3" />
                          Compare to Reference
                        </button>
                      )}
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

                  <div className="flex justify-end">
                    <SummaryCopyButton
                      buildSummaryText={() => {
                        if (!batchResult?.results?.length) return "";
                        const rows = batchResult.results.map((r: any) => buildSummaryTSVForRow(r));
                        return [tsvHeader, ...rows].join("\n");
                      }}
                      buttonLabel="Copy Summary"
                    />
                  </div>

                  <p className="text-muted-foreground">{batchResult.summary}</p>

                  {batchMusicalSummary && (
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3" data-testid="batch-musical-summary">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Music4 className="w-4 h-4 text-primary" />
                          Batch Overview
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Variety:</span>
                          <span className={cn(
                            "text-xs font-semibold px-2 py-0.5 rounded",
                            batchMusicalSummary.redundancyHeat === "low" ? "bg-emerald-500/20 text-emerald-400" :
                            batchMusicalSummary.redundancyHeat === "medium" ? "bg-amber-500/20 text-amber-400" :
                            "bg-red-500/20 text-red-400"
                          )} data-testid="badge-redundancy-heat">
                            {batchMusicalSummary.redundancyHeat === "low" ? "High" : batchMusicalSummary.redundancyHeat === "medium" ? "Medium" : "Low"}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {[
                          { label: "Most versatile", item: batchMusicalSummary.mostVersatile, icon: "crown" },
                          { label: "Brightest", item: batchMusicalSummary.brightest, icon: "bright" },
                          { label: "Darkest", item: batchMusicalSummary.darkest, icon: "dark" },
                          { label: "Thickest", item: batchMusicalSummary.thickest, icon: "thick" },
                          { label: "Most cutting", item: batchMusicalSummary.mostCutting, icon: "cut" },
                          { label: "Smoothest", item: batchMusicalSummary.smoothest, icon: "smooth" },
                          { label: "Most comb-risk", item: batchMusicalSummary.mostCombRisk, icon: "comb" },
                        ].map((entry) => (
                          <button
                            key={entry.label}
                            className="flex flex-col gap-1 p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-left hover-elevate transition-colors"
                            onClick={() => {
                              const el = document.querySelector(`[data-testid="batch-result-${entry.item.index}"]`);
                              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                            data-testid={`summary-${entry.label.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{entry.label}</span>
                            <span className="text-xs font-mono text-foreground truncate w-full">{entry.item.filename.replace('.wav', '')}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {collectionCoverage && (
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3" data-testid="collection-coverage-panel">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-indigo-400" />
                          <span className="text-sm font-semibold text-indigo-400">Preference Coverage</span>
                        </div>
                        <span className={cn("text-sm font-medium", collectionCoverage.verdictColor)} data-testid="text-coverage-verdict">
                          {collectionCoverage.verdict}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs">
                        <span className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 font-mono" data-testid="text-feature-count">
                          {collectionCoverage.featureLayers} feature layers
                          <span className="text-muted-foreground"> (Cut {collectionCoverage.cutLayer}, Polish {collectionCoverage.leadPolish})</span>
                        </span>
                        <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 font-mono" data-testid="text-body-count">
                          {collectionCoverage.bodyLayers} body layers
                          <span className="text-muted-foreground"> (Foundation {collectionCoverage.foundation}, Thick {collectionCoverage.midThickener})</span>
                        </span>
                        <span className="px-2 py-1 rounded bg-white/5 text-muted-foreground font-mono">
                          Fizz Tamers {collectionCoverage.fizzTamer} • Dark {collectionCoverage.darkSpecialty}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {collectionCoverage.suggestions.map((s, i) => (
                          <p key={i} className="text-xs text-muted-foreground">{s}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {showReferenceComparison && referenceComparison && referenceSet && (
                    <div ref={referenceComparisonRef} className="p-4 rounded-xl bg-teal-500/[0.06] border border-teal-500/20 space-y-4" data-testid="reference-comparison-panel">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-teal-400" />
                          <span className="text-sm font-semibold text-teal-400">Reference Set Comparison</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-medium", referenceComparison.verdictColor)} data-testid="text-reference-verdict">
                            {referenceComparison.verdict} ({referenceComparison.coveragePercent}%)
                          </span>
                          <button
                            onClick={() => {
                              setReferenceSet(null);
                              setShowReferenceComparison(false);
                            }}
                            className="text-muted-foreground hover:text-destructive transition-colors ml-2"
                            title="Clear reference set"
                            data-testid="button-clear-reference"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Reference: <span className="text-foreground font-medium">{referenceSet.name}</span> ({referenceSet.irs.length} IRs)</p>
                        <p>Comparing tonal flavors -- not exact matches, but similar character across speakers.</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Looser</span>
                        <input
                          type="range"
                          min={0.55}
                          max={0.95}
                          step={0.01}
                          value={referenceThreshold}
                          onChange={(e) => setReferenceThreshold(parseFloat(e.target.value))}
                          className="flex-1 h-1.5 accent-teal-500"
                          data-testid="slider-reference-threshold"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Tighter</span>
                        <span className="text-xs font-mono text-teal-400 w-10 text-right" data-testid="text-reference-threshold">
                          {Math.round(referenceThreshold * 100)}%
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                          <span className="text-muted-foreground">Covered: <span className="text-foreground font-medium">{referenceComparison.coveredCount}</span></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          <span className="text-muted-foreground">Missing: <span className="text-foreground font-medium">{referenceComparison.totalCount - referenceComparison.coveredCount}</span></span>
                        </div>
                        {referenceComparison.bonusFlavors.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                            <span className="text-muted-foreground">Bonus: <span className="text-foreground font-medium">{referenceComparison.bonusFlavors.length}</span></span>
                          </div>
                        )}
                      </div>

                      <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden" data-testid="bar-coverage">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-teal-600 to-green-500 transition-all duration-500"
                          style={{ width: `${referenceComparison.coveragePercent}%` }}
                        />
                      </div>

                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {referenceComparison.matches.map((m, i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-xs",
                              m.covered
                                ? "bg-green-500/10 border border-green-500/20"
                                : "bg-red-500/10 border border-red-500/20"
                            )}
                            data-testid={`reference-match-${i}`}
                          >
                            {m.covered ? (
                              <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono truncate max-w-[40%]">{m.refFilename}</span>
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px]",
                                  m.refLabel.includes('bright') || m.refLabel.includes('forward') ? "bg-green-500/20 text-green-400" :
                                  m.refLabel.includes('dark') || m.refLabel.includes('warm') ? "bg-blue-500/20 text-blue-400" :
                                  m.refLabel.includes('mid') ? "bg-yellow-500/20 text-yellow-400" :
                                  m.refLabel.includes('scoop') ? "bg-pink-500/20 text-pink-400" :
                                  "bg-white/10 text-muted-foreground"
                                )}>
                                  {m.refLabel}
                                </span>
                              </div>
                              {m.bestMatchFilename && (
                                <div className="mt-0.5 text-muted-foreground">
                                  {m.covered ? "Matched by" : "Closest"}: <span className="font-mono text-foreground/80">{m.bestMatchFilename}</span>
                                  <span className={cn(
                                    "ml-2 font-mono",
                                    m.bestMatchSimilarity >= referenceThreshold ? "text-green-400" :
                                    m.bestMatchSimilarity >= referenceThreshold - 0.1 ? "text-amber-400" :
                                    "text-red-400"
                                  )}>
                                    {Math.round(m.bestMatchSimilarity * 100)}%
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-0.5 flex-shrink-0" title="6-band shape">
                              {m.refBands.map((v, bi) => (
                                <div key={bi} className="w-1.5 bg-white/10 rounded-full overflow-hidden" style={{ height: '24px' }}>
                                  <div
                                    className={cn(
                                      "w-full rounded-full transition-all",
                                      m.covered ? "bg-teal-400/60" : "bg-red-400/60"
                                    )}
                                    style={{ height: `${Math.min(100, v * 3)}%`, marginTop: 'auto' }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {referenceComparison.bonusFlavors.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-blue-400 font-medium">New flavors not in your reference:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {referenceComparison.bonusFlavors.map((f, i) => (
                              <span key={i} className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs font-mono" data-testid={`bonus-flavor-${i}`}>
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {missingSuggestions.length > 0 && (
                        <div className="space-y-3" data-testid="missing-suggestions-panel">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Lightbulb className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-semibold text-amber-400">
                              Suggested Shots for Missing Flavors
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({missingSuggestions.length} gap{missingSuggestions.length > 1 ? 's' : ''})
                            </span>
                          </div>
                          <div className="space-y-3">
                            {missingSuggestions.map((ms, msIdx) => (
                              <div key={msIdx} className="p-3 rounded-lg bg-amber-500/[0.06] border border-amber-500/15 space-y-2" data-testid={`missing-suggestion-${msIdx}`}>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-mono text-foreground/80 truncate max-w-[50%]">{ms.refFilename}</span>
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px]",
                                    ms.refLabel.includes('bright') || ms.refLabel.includes('forward') ? "bg-green-500/20 text-green-400" :
                                    ms.refLabel.includes('dark') || ms.refLabel.includes('warm') ? "bg-blue-500/20 text-blue-400" :
                                    ms.refLabel.includes('mid') ? "bg-yellow-500/20 text-yellow-400" :
                                    ms.refLabel.includes('scoop') ? "bg-pink-500/20 text-pink-400" :
                                    "bg-white/10 text-muted-foreground"
                                  )}>
                                    {ms.refLabel}
                                  </span>
                                  {ms.fromLearnedData && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/15 text-cyan-400">
                                      from learned data
                                    </span>
                                  )}
                                  {!ms.fromLearnedData && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-muted-foreground">
                                      knowledge base
                                    </span>
                                  )}
                                </div>
                                {ms.blendSuggestion && (
                                  <div className="p-2.5 rounded-md bg-violet-500/[0.08] border border-violet-500/20 space-y-1" data-testid={`blend-suggestion-${msIdx}`}>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Layers className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                                      <span className="text-xs font-semibold text-violet-300">
                                        Blend: SM57 + R121 {ms.blendSuggestion.blendType} ({ms.blendSuggestion.ratio})
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground pl-5.5">
                                      {ms.blendSuggestion.description}
                                    </p>
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground">{ms.blendSuggestion ? 'Or try single-mic:' : 'Try recording:'}</div>
                                <div className="space-y-1.5">
                                  {ms.suggestions.map((s, sIdx) => (
                                    <div key={sIdx} className="flex items-start gap-2 text-xs" data-testid={`suggestion-${msIdx}-${sIdx}`}>
                                      <Mic2 className="w-3 h-3 text-amber-400/70 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <span className="font-mono font-medium text-foreground/90">
                                          {s.mic} @ {s.position.replace(/_/g, ' ')}, {s.distance}
                                        </span>
                                        <span className="text-muted-foreground ml-1.5">
                                          — {s.why}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {showReferenceComparison && !referenceComparison && referenceSet && (
                    <div className="p-4 rounded-xl bg-teal-500/[0.06] border border-teal-500/20 text-center space-y-2" data-testid="reference-no-data">
                      <Target className="w-8 h-8 text-teal-400 mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        Reference set loaded ({referenceSet.irs.length} IRs). Run batch analysis on a new set to compare.
                      </p>
                    </div>
                  )}

                  {!referenceSet && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                      <Target className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Happy with this set? Click <span className="text-emerald-400 font-medium">Save as Reference</span> to use it as your benchmark when evaluating other batches.
                      </p>
                    </div>
                  )}

                  {gearGaps && (
                    <div className="p-4 rounded-xl bg-violet-500/[0.06] border border-violet-500/20 space-y-3" data-testid="gear-gaps-panel">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Sparkles className="w-4 h-4 text-violet-400" />
                        <span className="text-sm font-semibold text-violet-400">
                          {gearGaps.noDataYet ? "Teach the App Your Gear" : "New Gear Detected"}
                        </span>
                      </div>
                      {gearGaps.newGear.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted-foreground">
                            {gearGaps.noDataYet
                              ? "The app doesn't know your gear yet. Rate some blends in the IR Mixer to teach it what this gear sounds like:"
                              : gearGaps.newGear.length === 1
                                ? "This gear hasn't been rated yet — the app can't offer tonal insights until you teach it:"
                                : "This gear hasn't been rated yet — rate some blends to teach the app:"}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {gearGaps.newGear.map((g) => (
                              <span
                                key={`${g.category}-${g.name}`}
                                className={cn(
                                  "px-2 py-1 text-xs font-mono rounded",
                                  g.category === "speaker" ? "bg-orange-500/15 text-orange-400" :
                                  g.category === "mic" ? "bg-blue-500/15 text-blue-400" :
                                  "bg-purple-500/15 text-purple-400"
                                )}
                                data-testid={`badge-new-gear-${g.category}-${g.name}`}
                              >
                                {g.name}
                                <span className="text-[10px] ml-1 opacity-60">({g.count} IR{g.count !== 1 ? 's' : ''})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {gearGaps.underRepresented.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted-foreground">
                            Under-represented gear — needs more rated blends for reliable tonal profiles:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {gearGaps.underRepresented.map((g) => (
                              <span
                                key={`${g.category}-${g.name}`}
                                className={cn(
                                  "px-2 py-1 text-xs font-mono rounded",
                                  g.category === "speaker" ? "bg-orange-500/10 text-orange-400/70" :
                                  g.category === "mic" ? "bg-blue-500/10 text-blue-400/70" :
                                  "bg-purple-500/10 text-purple-400/70"
                                )}
                                data-testid={`badge-underrep-gear-${g.category}-${g.name}`}
                              >
                                {g.name}
                                <span className="text-[10px] ml-1 opacity-60">({g.samples}/3 samples)</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-violet-400/70">
                        Head to the <a href="/mixer" className="underline font-medium text-violet-400 hover:text-violet-300">IR Mixer</a> and rate some blends with this gear to build tonal profiles.
                      </p>
                    </div>
                  )}

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
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-mono text-sm font-medium truncate">{r.filename}</p>
                              <ShotIntentBadge filename={r.filename} />
                            </div>
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
                                {(r.parsedInfo as any).offAxis && (
                                  <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                                    OffAx
                                  </span>
                                )}

                                {(() => {
                                  try {
                                    const tf = computeTonalFeatures(r as any);
                                    const fn = String((r as any).filename ?? (r as any).name ?? "");
                                    const st = speakerStatsRef.current.get(inferSpeakerIdFromFilename(fn));
                                    const role = classifyMusicalRole(tf, st);
                                    return (
                                      <span
                                        className={cn("px-1.5 py-0.5 text-xs rounded font-mono", roleBadgeClass(role))}
                                        data-testid={`badge-batch-musical-role-${index}`}
                                      >
                                        {role}
                                      </span>
                                    );
                                  } catch {
                                    return null;
                                  }
                                })()}
                              </div>
                            )}

                            {!r.parsedInfo && (() => {
                              try {
                                const tf = computeTonalFeatures(r as any);
                                const fn = String((r as any).filename ?? (r as any).name ?? "");
                                const st = speakerStatsRef.current.get(inferSpeakerIdFromFilename(fn));
                                const role = classifyMusicalRole(tf, st);
                                return (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    <span
                                      className={cn("px-1.5 py-0.5 text-xs rounded font-mono", roleBadgeClass(role))}
                                      data-testid={`badge-batch-musical-role-${index}`}
                                    >
                                      {role}
                                    </span>
                                  </div>
                                );
                              } catch {
                                return null;
                              }
                            })()}
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

                        {batchPreferenceRoles?.[index]?.unlikelyToUse && (
                          <div className="flex items-start gap-2 p-2 rounded bg-red-500/10 border border-red-500/20" data-testid={`warning-unlikely-${index}`}>
                            <ShieldAlert className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-red-400">Unlikely to use</p>
                              <p className="text-[11px] text-red-400/70">{batchPreferenceRoles[index].unlikelyReason}</p>
                            </div>
                          </div>
                        )}
                        {batchPreferenceRoles && batchPreferenceRoles[index]?.avoidHits?.length > 0 && !batchPreferenceRoles[index]?.unlikelyToUse && (
                          <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 space-y-2" data-testid={`warning-avoid-${index}`}>
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-[10px] text-amber-400/50 mb-0.5">Blend context — pair with a complement</p>
                                <p className="text-[11px] text-amber-400/70">{batchPreferenceRoles[index].avoidHits.join(" | ")}</p>
                              </div>
                            </div>
                            {batchPreferenceRoles[index].pairingGuidance && (
                              <p className="text-[11px] text-amber-300/60 pl-5">{batchPreferenceRoles[index].pairingGuidance}</p>
                            )}
                            {batchPreferenceRoles[index].pairingSuggestions.length > 0 && (
                              <div className="pl-5 space-y-1">
                                <p className="text-[10px] text-amber-400/50 font-medium">Try pairing with:</p>
                                {batchPreferenceRoles[index].pairingSuggestions.map((s, si) => (
                                  <p key={si} className="text-[11px] text-amber-300/80 font-mono truncate" data-testid={`suggestion-pair-${index}-${si}`}>
                                    {s.filename} <span className="text-amber-400/50 font-sans">— {s.reason}</span>
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

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

                        {/* Tonal Dashboard */}
                        <div className="mt-2">
                          {(() => {
                            const absTilt = computeTonalFeatures(r as any).tiltDbPerOct || (r as any).spectralTilt || 0;
                            const spk = detectSpeakerPrefix(r.filename);
                            const med = tiltMedianBySpeaker.get(spk) ?? 0;
                            const tq = tiltQuantilesBySpeaker.get(spk);
                            return (
                              <TonalDashboard
                                tiltCanonical={absTilt}
                                tiltRelative={absTilt - med}
                                tiltQuantiles={tq}
                                rolloffFreq={(r as any).rolloffFreq}
                                smoothScore={computeTonalFeatures(r as any).smoothScore ?? (r as any).smoothScore ?? r.frequencySmoothness}
                                maxNotchDepth={(r as any).maxNotchDepth}
                                notchCount={(r as any).notchCount}
                                spectralCentroid={(r as any).spectralCentroid}
                                tailLevelDb={(r as any).tailLevelDb}
                                tailStatus={(r as any).tailStatus}
                                logBandEnergies={(r as any).logBandEnergies}
                                subBassPercent={r.subBassPercent}
                                bassPercent={r.bassPercent}
                                lowMidPercent={r.lowMidPercent}
                                midPercent={r.midPercent}
                                highMidPercent={r.highMidPercent}
                                presencePercent={r.presencePercent}
                                ultraHighPercent={(r as any).ultraHighPercent}
                              />
                            );
                          })()}
                        </div>

                        {/* Preference Match (from old tonal balance) */}
                        {r.midPercent != null && r.highMidPercent != null && r.presencePercent != null && (
                          <div className="mt-2 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            {(() => {
                              const bands: TonalBands = {
                                subBass: r.subBassPercent || 0,
                                bass: r.bassPercent || 0,
                                lowMid: r.lowMidPercent || 0,
                                mid: r.midPercent || 0,
                                highMid: r.highMidPercent || 0,
                                presence: r.presencePercent || 0,
                                air: 0,
                                fizz: 0,
                              };
                              const { results: matchResults, best } = learnedProfile
                                ? scoreWithAvoidPenalty(featuresFromBands(bands), activeProfiles, learnedProfile)
                                : scoreAgainstAllProfiles(featuresFromBands(bands), activeProfiles);
                              const matchColorMap: Record<string, string> = {
                                strong: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                                close: "bg-sky-500/20 text-sky-400 border-sky-500/30",
                                partial: "bg-amber-500/20 text-amber-400 border-amber-500/30",
                                miss: "bg-white/5 text-muted-foreground border-white/10",
                              };
                              return (
                                <div className="mt-2 pt-2 border-t border-white/5">
                                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <Target className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-[10px] font-semibold text-indigo-400">Preference Match</span>
                                    {matchResults.map((mr) => (
                                      <span key={mr.profile} className={cn("inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border", matchColorMap[mr.label])} data-testid={`badge-batch-match-${index}-${mr.profile.toLowerCase()}`}>
                                        {mr.profile} {mr.score}
                                      </span>
                                    ))}
                                  </div>
                                  {best.deviations.length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {best.deviations.map((d, di) => (
                                        <span key={di} className={cn(
                                          "text-[9px] font-mono px-1 py-0.5 rounded",
                                          d.direction === "high" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"
                                        )}>
                                          {d.band} {d.direction === "high" ? "+" : "-"}{d.amount.toFixed(1)}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Gear Tonal Context */}
                        {learnedProfile?.gearInsights && (() => {
                          const bands: TonalBands = {
                            subBass: r.subBassPercent || 0,
                            bass: r.bassPercent || 0,
                            lowMid: r.lowMidPercent || 0,
                            mid: r.midPercent || 0,
                            highMid: r.highMidPercent || 0,
                            presence: r.presencePercent || 0,
                            air: 0,
                            fizz: 0,
                          };
                          const ctx = getGearContext(r.filename, learnedProfile.gearInsights, bands);
                          if (ctx.items.length === 0 && !ctx.parsed) return null;
                          if (ctx.items.length === 0) return null;
                          return (
                            <div className="mt-2 pt-2 border-t border-white/5" data-testid={`gear-context-${index}`}>
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <Brain className="w-3 h-3 text-violet-400" />
                                <span className="text-[10px] font-semibold text-violet-400">Learned Gear Profile</span>
                                {ctx.items.map((item) => (
                                  <span key={item.gearName} className={cn(
                                    "text-[9px] font-mono px-1 py-0.5 rounded",
                                    item.sentiment > 0 ? "bg-emerald-500/10 text-emerald-400" : item.sentiment < 0 ? "bg-red-500/10 text-red-400" : "bg-white/5 text-muted-foreground"
                                  )}>
                                    {item.gearName.replace('+', ' + ').replace('@', ' @ ')}
                                    {item.descriptors.length > 0 && `: ${item.descriptors.map(d => d.label).join(', ')}`}
                                  </span>
                                ))}
                              </div>
                              {ctx.commentary.length > 0 && (
                                <div className="space-y-0.5">
                                  {ctx.commentary.map((c, ci) => (
                                    <p key={ci} className="text-[9px] font-mono text-muted-foreground/70 italic ml-4">
                                      {c}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}

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
                          onClick={() => setSimilarityThreshold(Math.max(0.90, similarityThreshold - 0.005))}
                          className="w-6 h-6 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-bold border border-amber-500/30"
                          data-testid="button-threshold-decrease"
                        >
                          −
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round((similarityThreshold - 0.90) / 0.10 * 100)}
                          onChange={(e) => setSimilarityThreshold(0.90 + (parseInt(e.target.value) / 100) * 0.10)}
                          className="w-16 h-1 accent-amber-400"
                          data-testid="slider-similarity-threshold"
                        />
                        <button
                          onClick={() => setSimilarityThreshold(Math.min(1.00, similarityThreshold + 0.005))}
                          className="w-6 h-6 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-bold border border-amber-500/30"
                          data-testid="button-threshold-increase"
                        >
                          +
                        </button>
                        <span className="text-xs font-mono text-amber-400">{(similarityThreshold * 100).toFixed(1)}%</span>
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
                                      {(() => {
                                        const bd = detectBlendFromFilename(member.filename);
                                        if (!bd.isBlend) return null;
                                        return (
                                          <span className={cn(
                                            "text-[10px] font-mono px-1.5 py-0.5 rounded border whitespace-nowrap",
                                            bd.isTechnique
                                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                              : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                                          )}>
                                            {bd.isTechnique ? 'Technique' : 'Blend'}
                                          </span>
                                        );
                                      })()}
                                      <ShotIntentBadge filename={member.filename} />
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
            
            {/* Smart Thin Panel */}
            <AnimatePresence>
              {showSmartThin && smartThinGroups.length > 0 && (
                <motion.div
                  ref={smartThinRef}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="glass-panel p-6 rounded-2xl space-y-4"
                  data-testid="panel-smart-thin"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-cyan-400" />
                      <h3 className="text-lg font-semibold">Smart Thin Suggestions</h3>
                    </div>
                    <button
                      onClick={() => setShowSmartThin(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="button-close-smart-thin"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Found {smartThinGroups.length} over-represented group{smartThinGroups.length > 1 ? 's' : ''}. 
                    Keeping tonally unique variants using 6-band analysis (35% EQ shape, 15% HiMid/Mid ratio, 30% frequency curve, 20% centroid):
                  </p>
                  
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {smartThinGroups.map((group) => (
                      <div key={group.groupKey} className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <h4 className="font-medium text-cyan-300 mb-2">
                          {group.displayName} 
                          <span className="text-xs text-muted-foreground ml-2">
                            (keeping {group.suggested.length} of {group.members.length})
                          </span>
                        </h4>
                        <div className="grid gap-1.5">
                          {group.members.map((m) => (
                            <div 
                              key={m.filename}
                              className={cn(
                                "flex items-center justify-between px-3 py-1.5 rounded text-sm",
                                m.label === 'bright' && "bg-green-500/10 border border-green-500/20",
                                m.label === 'mid' && "bg-yellow-500/10 border border-yellow-500/20",
                                m.label === 'dark' && "bg-blue-500/10 border border-blue-500/20",
                                m.label === 'mid-fwd' && "bg-orange-500/10 border border-orange-500/20",
                                m.label === 'scooped' && "bg-pink-500/10 border border-pink-500/20",
                                m.label === 'thick' && "bg-amber-500/10 border border-amber-500/20",
                                m.label === 'smooth' && "bg-purple-500/10 border border-purple-500/20",
                                m.label === 'extra' && "bg-red-500/5 border border-red-500/10 opacity-60"
                              )}
                            >
                              <span className={cn(
                                "font-mono text-xs truncate max-w-[50%]",
                                m.label === 'bright' && "text-green-300",
                                m.label === 'mid' && "text-yellow-300",
                                m.label === 'dark' && "text-blue-300",
                                m.label === 'mid-fwd' && "text-orange-300",
                                m.label === 'scooped' && "text-pink-300",
                                m.label === 'thick' && "text-amber-300",
                                m.label === 'smooth' && "text-purple-300",
                                m.label === 'extra' && "text-red-300 line-through"
                              )}>
                                {m.filename}
                              </span>
                              <ShotIntentBadge filename={m.filename} />
                              <div className="flex items-center gap-2 text-xs">
                                {m.tonalHint && m.tonalHint !== 'neutral' && (
                                  <span className="text-muted-foreground/70 italic">{m.tonalHint}</span>
                                )}
                                <span className="text-muted-foreground">{m.centroid} Hz</span>
                                {m.midRatio !== undefined && (
                                  <span className="text-muted-foreground">{m.midRatio}% mid</span>
                                )}
                                {m.ratio !== undefined && (
                                  <span className="text-muted-foreground">r{m.ratio}</span>
                                )}
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px] uppercase font-medium",
                                  m.label === 'bright' && "bg-green-500/20 text-green-400",
                                  m.label === 'mid' && "bg-yellow-500/20 text-yellow-400",
                                  m.label === 'dark' && "bg-blue-500/20 text-blue-400",
                                  m.label === 'mid-fwd' && "bg-orange-500/20 text-orange-400",
                                  m.label === 'scooped' && "bg-pink-500/20 text-pink-400",
                                  m.label === 'thick' && "bg-amber-500/20 text-amber-400",
                                  m.label === 'smooth' && "bg-purple-500/20 text-purple-400",
                                  m.label === 'extra' && "bg-red-500/20 text-red-400"
                                )}>
                                  {m.label === 'extra' ? 'cut' : m.label}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="default"
                      onClick={applySmartThinExclusions}
                      className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                      data-testid="button-apply-smart-thin"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Apply ({smartThinGroups.reduce((sum, g) => sum + g.extras.length, 0)} IRs to exclude)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSmartThinExclusions(new Set());
                        setShowSmartThin(false);
                      }}
                      data-testid="button-cancel-smart-thin"
                    >
                      Cancel
                    </Button>
                  </div>
                  
                  {smartThinExclusions.size > 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      {smartThinExclusions.size} IRs currently excluded. Run Cull to apply.
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Blend Analysis Section */}
            <div ref={blendAnalysisRef}>
            <AnimatePresence>
              {showBlendAnalysis && blendAnalysisResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="glass-panel p-6 rounded-2xl space-y-4"
                  data-testid="panel-blend-analysis"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3">
                      <Layers className="w-5 h-5 text-sky-400" />
                      <h3 className="text-lg font-semibold">Blend Analysis</h3>
                      <span className="text-sm text-muted-foreground">
                        {blendAnalysisResults.length} blend{blendAnalysisResults.length > 1 ? 's' : ''} found
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {showCuller && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => scrollToSection(cullerRef)}
                          className="text-purple-400 border-purple-400/30 hover:bg-purple-400/10"
                          data-testid="button-goto-culler-from-blends"
                        >
                          <Scissors className="w-4 h-4 mr-1" />
                          Culler
                        </Button>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Threshold:</span>
                        <button
                          onClick={() => setBlendThreshold(Math.max(0.80, blendThreshold - 0.01))}
                          className="w-6 h-6 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-xs font-bold border border-sky-500/30"
                          data-testid="button-blend-threshold-decrease"
                        >
                          −
                        </button>
                        <input
                          type="range"
                          min="80"
                          max="99"
                          value={blendThreshold * 100}
                          onChange={(e) => setBlendThreshold(parseInt(e.target.value) / 100)}
                          className="w-16 h-1 accent-sky-400"
                          data-testid="slider-blend-threshold"
                        />
                        <button
                          onClick={() => setBlendThreshold(Math.min(0.99, blendThreshold + 0.01))}
                          className="w-6 h-6 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-xs font-bold border border-sky-500/30"
                          data-testid="button-blend-threshold-increase"
                        >
                          +
                        </button>
                        <span className="text-xs font-mono text-sky-400" data-testid="text-blend-threshold-value">{Math.round(blendThreshold * 100)}%</span>
                      </div>
                      <button
                        onClick={handleBlendAnalysis}
                        className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-xs font-medium transition-all border border-sky-500/30"
                        data-testid="button-recheck-blends"
                      >
                        Re-check
                      </button>
                      <button
                        onClick={() => setShowBlendAnalysis(false)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-destructive/20 border border-white/10 text-xs font-medium transition-all text-muted-foreground hover:text-destructive"
                        data-testid="button-close-blend-analysis"
                      >
                        <Trash2 className="w-3 h-3" />
                        Close
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Does each blend give you a unique tone to layer with other mics? Blends above {Math.round(blendThreshold * 100)}% match to a solo are redundant — the solo already covers that tone.
                  </p>

                  {/* Summary badges */}
                  <div className="flex gap-3 flex-wrap">
                    {(() => {
                      const redundant = blendAnalysisResults.filter(r => r.verdict === 'redundant').length;
                      const addsValue = blendAnalysisResults.filter(r => r.verdict === 'adds-value').length;
                      const essential = blendAnalysisResults.filter(r => r.verdict === 'essential').length;
                      return (
                        <>
                          {redundant > 0 && (
                            <span className="text-xs font-mono px-2 py-1 rounded border bg-orange-500/20 text-orange-400 border-orange-500/30" data-testid="badge-blend-summary-redundant">
                              {redundant} redundant — solo covers this
                            </span>
                          )}
                          {addsValue > 0 && (
                            <span className="text-xs font-mono px-2 py-1 rounded border bg-cyan-500/20 text-cyan-400 border-cyan-500/30" data-testid="badge-blend-summary-adds-value">
                              {addsValue} unique flavor
                            </span>
                          )}
                          {essential > 0 && (
                            <span className="text-xs font-mono px-2 py-1 rounded border bg-emerald-500/20 text-emerald-400 border-emerald-500/30" data-testid="badge-blend-summary-essential">
                              {essential} standalone tone
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Blend results list */}
                  <div className="grid gap-2">
                    {blendAnalysisResults.map((blend, idx) => (
                      <div
                        key={blend.filename}
                        className={cn(
                          "p-3 rounded-lg border",
                          blend.verdict === 'redundant'
                            ? "bg-orange-500/10 border-orange-500/20"
                            : blend.verdict === 'adds-value'
                            ? "bg-cyan-500/10 border-cyan-500/20"
                            : "bg-emerald-500/10 border-emerald-500/20"
                        )}
                        data-testid={`blend-result-${idx}`}
                      >
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={cn(
                                "font-mono text-sm truncate",
                                blend.verdict === 'redundant' ? "text-orange-300" : blend.verdict === 'adds-value' ? "text-cyan-300" : "text-emerald-300"
                              )} title={blend.filename} data-testid={`text-blend-filename-${idx}`}>
                                {blend.filename}
                              </p>
                              <ShotIntentBadge filename={blend.filename} />
                              <span className={cn(
                                "text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0",
                                blend.verdict === 'essential'
                                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                  : blend.verdict === 'adds-value'
                                  ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                                  : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                              )} data-testid={`badge-blend-verdict-${idx}`}>
                                {blend.verdict === 'essential' ? 'ESSENTIAL' : blend.verdict === 'adds-value' ? `ADDS VALUE · ${Math.round((1 - blend.maxComponentSimilarity) * 100)}% unique` : 'REDUNDANT'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5" data-testid={`text-blend-explanation-${idx}`}>
                              {blend.explanation}
                            </p>
                            {blend.dominanceNote && (
                              <p className="text-xs mt-1.5 text-foreground/70 italic" data-testid={`text-blend-dominance-${idx}`}>
                                {blend.dominanceNote}
                              </p>
                            )}
                            {blend.componentMatches.length > 0 && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2" data-testid={`blend-component-matches-${idx}`}>
                                {blend.componentMatches.map(c => (
                                  <div key={c.mic} className="text-[11px]" data-testid={`blend-match-${idx}-${c.mic}`}>
                                    <span className="text-muted-foreground">vs </span>
                                    <span className="font-mono text-foreground/80">{c.mic.toUpperCase()}</span>
                                    <span className="text-muted-foreground"> ({c.filename.length > 30 ? c.filename.slice(0, 27) + '...' : c.filename}): </span>
                                    <span className={cn(
                                      "font-mono font-medium",
                                      c.similarity >= blendThreshold ? "text-red-400" : c.similarity >= 0.78 ? "text-yellow-400" : "text-green-400"
                                    )} data-testid={`text-blend-similarity-${idx}-${c.mic}`}>{Math.round(c.similarity * 100)}%</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {blend.verdict === 'redundant' && (
                            <div className="shrink-0">
                              <span className="text-[10px] text-orange-400/60 font-mono">SOLO COVERS THIS</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Copy redundant filenames */}
                  {blendAnalysisResults.some(r => r.verdict === 'redundant') && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const redundantFiles = blendAnalysisResults
                            .filter(r => r.verdict === 'redundant')
                            .map(r => r.filename)
                            .join('\n');
                          navigator.clipboard.writeText(redundantFiles);
                          toast({ title: "Copied", description: `${blendAnalysisResults.filter(r => r.verdict === 'redundant').length} redundant blend filenames copied` });
                        }}
                        className="h-7 px-2 text-xs text-orange-400 hover:text-orange-300"
                        data-testid="button-copy-redundant-blends"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy redundant filenames
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const keepFiles = blendAnalysisResults
                            .filter(r => r.verdict !== 'redundant')
                            .map(r => r.filename)
                            .join('\n');
                          navigator.clipboard.writeText(keepFiles);
                          toast({ title: "Copied", description: `${blendAnalysisResults.filter(r => r.verdict !== 'redundant').length} essential/adds-value blend filenames copied` });
                        }}
                        className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300"
                        data-testid="button-copy-keep-blends"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy keeper filenames
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            </div>

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
                      {showSmartThin && smartThinGroups.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            smartThinRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className="text-cyan-400 border-cyan-400/30 hover:bg-cyan-400/10 animate-pulse"
                          data-testid="button-goto-smart-thin-from-culler"
                        >
                          <Zap className="w-4 h-4 mr-1" />
                          → Smart Thin ({smartThinGroups.length})
                        </Button>
                      )}
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
                    {learnedProfile && learnedProfile.status !== "no_data" && (
                      <div className="flex items-center gap-1 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-0.5" data-testid="role-balance-toggle">
                        {(['off', 'protect', 'favor'] as const).map(mode => (
                          <button
                            key={mode}
                            onClick={() => { setRoleBalanceMode(mode); }}
                            className={cn(
                              "px-2 py-1 text-xs font-medium transition-colors rounded-md",
                              roleBalanceMode === mode
                                ? "bg-indigo-500/25 text-indigo-300"
                                : "text-muted-foreground hover-elevate"
                            )}
                            data-testid={`button-role-${mode}`}
                          >
                            {mode === 'off' ? 'No Role Guard' : mode === 'protect' ? 'Protect Scarce' : 'Favor Scarce'}
                          </button>
                        ))}
                      </div>
                    )}
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
                      {cullRoleStats && (
                        <div className="flex items-center gap-3 text-xs px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex-wrap" data-testid="panel-role-stats">
                          <span className="text-indigo-300 font-medium">Role balance:</span>
                          <span className={cn("text-muted-foreground", cullRoleStats.featureKept < cullRoleStats.featureCount && cullRoleStats.featureCount <= 5 && "text-amber-400")}>
                            Feature {cullRoleStats.featureKept}/{cullRoleStats.featureCount}
                          </span>
                          <span className={cn("text-muted-foreground", cullRoleStats.bodyKept < cullRoleStats.bodyCount && cullRoleStats.bodyCount <= 5 && "text-amber-400")}>
                            Body {cullRoleStats.bodyKept}/{cullRoleStats.bodyCount}
                          </span>
                          {(cullRoleStats.featureKept < cullRoleStats.featureCount && cullRoleStats.featureCount <= 5) ||
                           (cullRoleStats.bodyKept < cullRoleStats.bodyCount && cullRoleStats.bodyCount <= 5) ? (
                            <span className="text-amber-400/80 italic">
                              Scarce role lost shots — consider re-running with protection
                            </span>
                          ) : null}
                        </div>
                      )}
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
                                  <ShotIntentBadge filename={ir.filename} />
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <p className="text-xs text-muted-foreground">{ir.reason}</p>
                                    {ir.preferenceRole && (
                                      <span className={cn(
                                        "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                                        ir.preferenceRole === "Feature element"
                                          ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                      )} data-testid={`badge-cull-role-keep-${idx}`}>
                                        {ir.preferenceRole}
                                      </span>
                                    )}
                                    {ir.blendInfo && (
                                      <span className={cn(
                                        "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                                        ir.blendInfo.verdict === 'essential'
                                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                          : ir.blendInfo.verdict === 'adds-value'
                                          ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                                          : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                                      )} data-testid={`badge-blend-keep-${idx}`}>
                                        {ir.blendInfo.verdict === 'essential' ? 'Unique blend' : ir.blendInfo.verdict === 'adds-value' ? `Adds value · ${Math.round(ir.blendInfo.uniqueContribution * 100)}%` : 'Blend overlap'}
                                      </span>
                                    )}
                                  </div>
                                  {ir.blendInfo && (
                                    <div className="mt-1.5 text-[11px] text-muted-foreground/80 pl-0.5">
                                      <span>{ir.blendInfo.explanation}</span>
                                      {ir.blendInfo.componentMatches.length > 0 && (
                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                          {ir.blendInfo.componentMatches.map(c => (
                                            <span key={c.mic} className="text-[10px]">
                                              vs {c.mic.toUpperCase()}: <span className={cn(
                                                c.similarity >= blendThreshold ? "text-red-400" : c.similarity >= 0.78 ? "text-yellow-400" : "text-green-400"
                                              )}>{Math.round(c.similarity * 100)}%</span>
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {ir.valueInfo && (ir.valueInfo.prefBoost !== 0 || ir.valueInfo.gearBoost !== 0 || ir.valueInfo.roleBoost > 0 || ir.valueInfo.diversityFromSelected > 0) && (
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px]">
                                      <span className="text-muted-foreground">Eff: {Math.round(ir.valueInfo.effectiveScore)}</span>
                                      {ir.valueInfo.prefBoost !== 0 && (
                                        <span className={ir.valueInfo.prefBoost > 0 ? "text-amber-400" : "text-red-400"}>
                                          Pref {ir.valueInfo.prefBoost > 0 ? '+' : ''}{ir.valueInfo.prefBoost}
                                        </span>
                                      )}
                                      {ir.valueInfo.gearBoost !== 0 && (
                                        <span className={ir.valueInfo.gearBoost > 0 ? "text-amber-400" : "text-red-400"}>
                                          Gear {ir.valueInfo.gearBoost > 0 ? '+' : ''}{ir.valueInfo.gearBoost}
                                        </span>
                                      )}
                                      {ir.valueInfo.roleBoost > 0 && (
                                        <span className="text-emerald-400">Role +{ir.valueInfo.roleBoost}</span>
                                      )}
                                      {ir.valueInfo.diversityFromSelected > 0 && (
                                        <span className="text-sky-400">{ir.valueInfo.diversityFromSelected}% unique</span>
                                      )}
                                    </div>
                                  )}
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
                                  <ShotIntentBadge filename={ir.filename} />
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <p className="text-xs text-muted-foreground">
                                      {ir.reason}
                                    </p>
                                    {ir.preferenceRole && (
                                      <span className={cn(
                                        "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                                        ir.preferenceRole === "Feature element"
                                          ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                      )} data-testid={`badge-cull-role-cut-${idx}`}>
                                        {ir.preferenceRole}
                                      </span>
                                    )}
                                    {ir.blendInfo && (
                                      <span className={cn(
                                        "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                                        ir.blendInfo.verdict === 'essential'
                                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                          : ir.blendInfo.verdict === 'adds-value'
                                          ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                                          : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                                      )} data-testid={`badge-blend-cut-${idx}`}>
                                        {ir.blendInfo.verdict === 'essential' ? 'Unique blend' : ir.blendInfo.verdict === 'adds-value' ? `Adds value · ${Math.round(ir.blendInfo.uniqueContribution * 100)}%` : 'Blend redundant'}
                                      </span>
                                    )}
                                  </div>
                                  {ir.blendInfo && (
                                    <div className="mt-1.5 text-[11px] text-muted-foreground/80 pl-0.5">
                                      <span>{ir.blendInfo.explanation}</span>
                                      {ir.blendInfo.componentMatches.length > 0 && (
                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                          {ir.blendInfo.componentMatches.map(c => (
                                            <span key={c.mic} className="text-[10px]">
                                              vs {c.mic.toUpperCase()}: <span className={cn(
                                                c.similarity >= blendThreshold ? "text-red-400" : c.similarity >= 0.78 ? "text-yellow-400" : "text-green-400"
                                              )}>{Math.round(c.similarity * 100)}%</span>
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {ir.valueInfo && (ir.valueInfo.prefBoost !== 0 || ir.valueInfo.gearBoost !== 0 || ir.valueInfo.roleBoost > 0 || ir.valueInfo.blendPenalty > 0) && (
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px]">
                                      <span className="text-muted-foreground">Eff: {Math.round(ir.valueInfo.effectiveScore)}</span>
                                      {ir.valueInfo.prefBoost !== 0 && (
                                        <span className={ir.valueInfo.prefBoost > 0 ? "text-amber-400" : "text-red-400"}>
                                          Pref {ir.valueInfo.prefBoost > 0 ? '+' : ''}{ir.valueInfo.prefBoost}
                                        </span>
                                      )}
                                      {ir.valueInfo.gearBoost !== 0 && (
                                        <span className={ir.valueInfo.gearBoost > 0 ? "text-amber-400" : "text-red-400"}>
                                          Gear {ir.valueInfo.gearBoost > 0 ? '+' : ''}{ir.valueInfo.gearBoost}
                                        </span>
                                      )}
                                      {ir.valueInfo.roleBoost > 0 && (
                                        <span className="text-emerald-400">Role +{ir.valueInfo.roleBoost}</span>
                                      )}
                                      {ir.valueInfo.blendPenalty > 0 && (
                                        <span className="text-orange-400">Blend -{ir.valueInfo.blendPenalty}</span>
                                      )}
                                    </div>
                                  )}
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
                        {cullCloseCalls.map((closeCall, ccIdx) => {
                          // Get all filenames already selected in OTHER close call groups
                          const selectedInOtherGroups = new Set(
                            cullCloseCalls
                              .filter((_, idx) => idx !== ccIdx)
                              .map(cc => cc.selectedFilename)
                              .filter(Boolean) as string[]
                          );
                          
                          // Filter candidates to exclude those already selected elsewhere
                          const availableCandidates = closeCall.candidates.filter(
                            c => !selectedInOtherGroups.has(c.filename)
                          );
                          
                          // If no candidates left, skip this group
                          if (availableCandidates.length === 0) return null;
                          
                          return (
                          <div key={`${closeCall.micType}-${closeCall.slot}`} className="p-3 rounded-lg bg-background/50 border border-border/30">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-xs font-medium text-amber-300">{closeCall.micType.toUpperCase()}</span>
                              {closeCall.slot > 1 && (
                                <span className="text-xs text-muted-foreground">(slot {closeCall.slot})</span>
                              )}
                              {availableCandidates.length < closeCall.candidates.length && (
                                <span className="text-xs text-green-400/70">
                                  ({closeCall.candidates.length - availableCandidates.length} already selected)
                                </span>
                              )}
                            </div>
                            <div className="grid gap-2">
                              {availableCandidates.map((candidate, candIdx) => (
                                <button
                                  key={candidate.filename}
                                  onClick={() => {
                                    // Update close call with selection and clear conflicts in other groups
                                    const updated = cullCloseCalls.map((cc, idx) => {
                                      if (idx === ccIdx) {
                                        // This is the group being selected
                                        return { ...cc, selectedFilename: candidate.filename };
                                      }
                                      // For other groups: if they had selected this filename, clear it
                                      if (cc.selectedFilename === candidate.filename) {
                                        return { ...cc, selectedFilename: null };
                                      }
                                      return cc;
                                    });
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
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-mono text-xs truncate">{candidate.filename}</p>
                                        {candidate.blendInfo && (
                                          <span className={cn(
                                            "text-[10px] font-mono px-1.5 py-0.5 rounded border whitespace-nowrap",
                                            candidate.blendInfo.verdict === 'essential'
                                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                              : candidate.blendInfo.verdict === 'adds-value'
                                              ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                                              : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                                          )}>
                                            {candidate.blendInfo.verdict === 'essential' ? 'Unique blend' : candidate.blendInfo.verdict === 'adds-value' ? `Adds value · ${Math.round(candidate.blendInfo.uniqueContribution * 100)}%` : 'Blend redundant'}
                                          </span>
                                        )}
                                      </div>
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
                                      {candidate.valueInfo && (candidate.valueInfo.prefBoost !== 0 || candidate.valueInfo.gearBoost !== 0 || candidate.valueInfo.roleBoost > 0 || candidate.valueInfo.blendPenalty > 0 || candidate.valueInfo.diversityFromSelected > 0 || candidate.valueInfo.preferenceRole) && (
                                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px]">
                                          <span className="text-muted-foreground">Eff: {Math.round(candidate.valueInfo.effectiveScore)}</span>
                                          {candidate.valueInfo.prefBoost !== 0 && (
                                            <span className={candidate.valueInfo.prefBoost > 0 ? "text-amber-400" : "text-red-400"}>
                                              Pref {candidate.valueInfo.prefBoost > 0 ? '+' : ''}{candidate.valueInfo.prefBoost}
                                            </span>
                                          )}
                                          {candidate.valueInfo.gearBoost !== 0 && (
                                            <span className={candidate.valueInfo.gearBoost > 0 ? "text-amber-400" : "text-red-400"}>
                                              Gear {candidate.valueInfo.gearBoost > 0 ? '+' : ''}{candidate.valueInfo.gearBoost}
                                            </span>
                                          )}
                                          {candidate.valueInfo.roleBoost > 0 && (
                                            <span className="text-emerald-400">
                                              Role +{candidate.valueInfo.roleBoost}
                                            </span>
                                          )}
                                          {candidate.valueInfo.blendPenalty > 0 && (
                                            <span className="text-orange-400">
                                              Blend -{candidate.valueInfo.blendPenalty}
                                            </span>
                                          )}
                                          {candidate.valueInfo.diversityFromSelected > 0 && (
                                            <span className="text-sky-400">
                                              {candidate.valueInfo.diversityFromSelected}% unique
                                            </span>
                                          )}
                                          {candidate.valueInfo.preferenceRole && (
                                            <span className="text-violet-400 italic">
                                              {candidate.valueInfo.preferenceRole}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {closeCall.selectedFilename === candidate.filename && (
                                      <Check className="w-4 h-4 text-green-400 shrink-0" />
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                          );
                        })}
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

        {/* A/B Compare Mode */}
        {mode === 'compare' && (
          <CompareMode />
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
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <p className="font-mono text-sm font-medium truncate max-w-[200px] text-primary">
                      {file.name}
                    </p>
                    <ShotIntentBadge filename={file.name} />
                  </div>
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
                      <option value="cap_cone_tr">Cap_Cone_Tr (Transition)</option>
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
                    <option value="karnivore">Karnivore</option>
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
                  <div className="flex justify-end gap-2">
                    <SummaryCopyButton
                      buildSummaryText={() => {
                        if (!result || !metrics) return "";
                        const rowObj: any = {
                          filename: result.filename ?? (result as any).name ?? "single_result",
                          score: result.qualityScore ?? (result as any).score ?? "",
                          role: (result as any).musicalRole ?? (result as any).role ?? "",
                          spectralCentroidHz: (metrics as any)?.spectralCentroidHz ?? metrics?.spectralCentroid ?? "",
                          spectralTilt: (metrics as any)?.spectralTilt ?? "",
                          rolloffFreq: (metrics as any)?.rolloffFreq ?? "",
                          smoothScore: metrics?.smoothScore ?? (metrics as any)?.frequencySmoothness ?? "",
                          fizzLabel: (result as any)?.fizzLabel ?? "",
                          notes: "",
                        };
                        return [tsvHeader, buildSummaryTSVForRow(rowObj)].join("\n");
                      }}
                      buttonLabel="Copy Summary"
                    />
                    <button
                      onClick={() => { setResult(null); setMetrics(null); }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-destructive/20 border border-white/10 text-xs font-medium transition-all text-muted-foreground hover:text-destructive"
                      data-testid="button-clear-single-result"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear Result
                    </button>
                  </div>

                  <div className="flex justify-end">
                    {(() => {
                      const tf = computeTonalFeatures(metrics);
                      const fn = String((metrics as any)?.filename ?? (metrics as any)?.name ?? "");
                      const st = speakerStatsRef.current.get(inferSpeakerIdFromFilename(fn));
                      const role = classifyMusicalRole(tf, st);
                      return (
                        <span
                          className={cn("px-2 py-1 text-xs font-mono rounded", roleBadgeClass(role))}
                          data-testid="badge-single-musical-role"
                        >
                          {role}
                        </span>
                      );
                    })()}
                  </div>

                  <ResultCard
                    score={result.qualityScore}
                    isPerfect={result.isPerfect ?? false}
                    advice={result.advice}
                    metrics={{
                      peak: metrics.peakAmplitudeDb,
                      duration: metrics.durationMs,
                      centroid: metrics.spectralCentroid,
                      smoothness: metrics.smoothScore ?? metrics.frequencySmoothness,
                      noiseFloor: metrics.noiseFloorDb
                    }}
                    tonalMetrics={{
                      tiltCanonical: computeTonalFeatures(metrics).tiltDbPerOct,
                      rolloffFreq: metrics.rolloffFreq,
                      smoothScore: metrics.smoothScore,
                      maxNotchDepth: metrics.maxNotchDepth,
                      notchCount: metrics.notchCount,
                      spectralCentroid: metrics.spectralCentroid,
                      tailLevelDb: metrics.tailLevelDb,
                      tailStatus: metrics.tailStatus,
                      logBandEnergies: metrics.logBandEnergies,
                    }}
                    micLabel={result.micLabel}
                    renameSuggestion={result.renameSuggestion}
                    filename={result.filename}
                    spectralDeviation={result.spectralDeviation}
                    tonalBalance={{
                      subBassPercent: (result as any).subBassPercent,
                      bassPercent: (result as any).bassPercent,
                      lowMidPercent: (result as any).lowMidPercent,
                      midPercent: (result as any).midPercent,
                      highMidPercent: (result as any).highMidPercent,
                      presencePercent: (result as any).presencePercent,
                      ultraHighPercent: (result as any).ultraHighPercent,
                      highMidMidRatio: (result as any).highMidMidRatio,
                    }}
                    activeProfiles={activeProfiles}
                    learnedProfile={learnedProfile}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        )}
      </div>
      
      {/* Floating Section Navigation - always visible in batch mode */}
      {mode === 'batch' && (
        <div className="fixed bottom-6 right-6 flex flex-col items-center gap-2 z-50">
          <Button
            size="icon"
            variant="outline"
            onClick={() => navigateSection('up')}
            title="Previous section"
            data-testid="button-nav-up"
          >
            <ChevronUp className="w-5 h-5" />
          </Button>
          <span className="text-xs font-medium px-2 py-1 bg-background/90 border border-border rounded text-muted-foreground">
            {mainSections[currentSectionIdx]?.name}
          </span>
          <Button
            size="icon"
            variant="outline"
            onClick={() => navigateSection('down')}
            title="Next section"
            data-testid="button-nav-down"
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
