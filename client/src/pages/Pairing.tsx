import { useState, useCallback, useMemo, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Layers, FileAudio, Trash2, Zap, Music4, Copy, Check, Plus, Target, List, Heart, X, Star, Send, SlidersHorizontal, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ShotIntentBadge } from "@/components/ShotIntentBadge";
import { IRCountAdvisor } from "@/components/IRCountAdvisor";
import { PolygonMixerDiagram } from "@/components/PolygonMixerDiagram";
import { findBestPairForBands } from "@/lib/ir-count-advisor";
import { snapToAchievable } from "@/lib/polygon-mixer";
import { optimizeBlendRatios, type ToneNudges, NUDGE_LABELS, hasActiveNudges } from "@/lib/blend-optimizer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useResults } from "@/context/ResultsContext";
import { analyzeAudioFile, type AudioMetrics } from "@/hooks/use-analyses";
import { computeTonalFeatures } from "@/lib/tonal-engine";
import { PairingBlendPreview, type BlendPreviewIR } from "@/components/BlendPreview";
import { DEFAULT_PROFILES, applyLearnedAdjustments, computeSpeakerRelativeProfiles, parseGearFromFilename, type TonalFeatures, type LearnedProfileData } from "@/lib/preference-profiles";
import { getSoloCategoriesForPairing, getIRWinRecordsPlain, getEloRatingsPlain, getSettledCombos, featurizeBlend, recordOutcome, recordIROutcome, recordEloOutcome, recordSuperblendInsight, getTasteBias, type TasteContext, loadSuperblendFavorites, saveSuperblendFavorite, removeSuperblendFavorite, SUPERBLEND_INTENTS, type SavedSuperblend, type SuperblendLayer } from "@/lib/tasteStore";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { api, type PairingResponse, type PairingResult, type IRMetrics } from "@shared/routes";

const GENRES = [
  { value: "", label: "Any / General" },
  { value: "classic-rock", label: "Classic Rock" },
  { value: "hard-rock", label: "Hard Rock" },
  { value: "alternative-rock", label: "Alternative Rock" },
  { value: "punk", label: "Punk" },
  { value: "grunge", label: "Grunge" },
  { value: "classic-metal", label: "Classic Heavy Metal" },
  { value: "thrash-metal", label: "Thrash Metal" },
  { value: "funk-rock", label: "Funk Rock" },
  { value: "indie-rock", label: "Indie Rock" },
  { value: "blues", label: "Blues" },
  { value: "jazz", label: "Jazz" },
  { value: "country", label: "Country" },
  { value: "doom-stoner", label: "Doom / Stoner" },
  { value: "shoegaze", label: "Shoegaze" },
  { value: "post-punk", label: "Post-Punk" },
  { value: "custom", label: "Custom (type your own)" },
];

interface UploadedIR {
  file: File;
  metrics: AudioMetrics | null;
  analyzing: boolean;
  error: string | null;
  features: import("@/lib/preference-profiles").TonalFeatures | null;
  bands: import("@/lib/preference-profiles").TonalBands | null;
}

const INTENTS = [
  { value: "versatile", label: "Versatile (all contexts)" },
  { value: "rhythm", label: "Rhythm" },
  { value: "lead", label: "Lead" },
  { value: "clean", label: "Clean" },
];

const RATIO_OPTIONS = ["50/50", "60/40", "40/60", "70/30", "30/70", "80/20", "20/80"];

function getMicIdentity(filename: string): string {
  const gear = parseGearFromFilename(filename);
  const mic = gear.mic || '__unknown__';
  const mic2 = gear.mic2;
  const lowerName = filename.toLowerCase();
  const hasFredman = lowerName.includes('fredman');
  if (mic2) return `${mic}+${mic2}`;
  if (hasFredman) return `${mic}_fredman`;
  return mic;
}

export default function Pairing() {
  const [speaker1IRs, setSpeaker1IRs] = useState<UploadedIR[]>([]);
  const [speaker2IRs, setSpeaker2IRs] = useState<UploadedIR[]>([]);
  const [copied, setCopied] = useState(false);
  const [genre, setGenre] = useState("");
  const [customGenre, setCustomGenre] = useState("");
  const [tonePreferences, setTonePreferences] = useState("");
  const [intent, setIntent] = useState<"rhythm" | "lead" | "clean" | "versatile">("versatile");
  const [pairingCount, setPairingCount] = useState<number>(5);
  const { toast } = useToast();
  const { pairingResult: result, setPairingResult: setResult } = useResults();
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [passed, setPassed] = useState<Set<number>>(new Set());
  const [replacementQueue, setReplacementQueue] = useState<PairingResult[]>([]);
  const [savedFavorites, setSavedFavorites] = useState<PairingResult[]>(() => {
    try {
      const stored = localStorage.getItem("irscope_blend_favorites");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [showSavedFavorites, setShowSavedFavorites] = useState(false);
  const [pairRefine, setPairRefine] = useState<Record<number, { ir1: string; ir2: string; ratio: string; submitted: boolean }>>({});

  useEffect(() => {
    try {
      localStorage.setItem("irscope_blend_favorites", JSON.stringify(savedFavorites));
    } catch {}
  }, [savedFavorites]);

  const { data: learnedProfile } = useQuery<LearnedProfileData>({
    queryKey: ["/api/preferences/learned"],
  });

  const activeProfiles = useMemo(() => {
    const allIRs = [...speaker1IRs, ...speaker2IRs];
    const withFeatures = allIRs
      .filter((ir): ir is UploadedIR & { features: TonalFeatures } => ir.features != null)
      .map((ir) => ({ features: ir.features }));
    const baseProfiles = withFeatures.length >= 4
      ? computeSpeakerRelativeProfiles(withFeatures)
      : DEFAULT_PROFILES;
    if (!learnedProfile || learnedProfile.status === "no_data") return baseProfiles;
    return applyLearnedAdjustments(baseProfiles, learnedProfile);
  }, [speaker1IRs, speaker2IRs, learnedProfile]);

  const isMixedMode = speaker1IRs.length > 0 && speaker2IRs.length > 0;

  const irFeaturesMap = useMemo(() => {
    const map = new Map<string, BlendPreviewIR>();
    for (const ir of [...speaker1IRs, ...speaker2IRs]) {
      if (ir.features && ir.bands) {
        map.set(ir.file.name, { filename: ir.file.name, features: ir.features, bands: ir.bands });
        const nameNoExt = ir.file.name.replace(/\.wav$/i, "");
        map.set(nameNoExt, { filename: ir.file.name, features: ir.features, bands: ir.bands });
      }
    }
    return map;
  }, [speaker1IRs, speaker2IRs]);

  const allIRNames = useMemo(() => [...speaker1IRs, ...speaker2IRs].map(ir => ir.file.name), [speaker1IRs, speaker2IRs]);

  const buildTasteContext = useCallback((): TasteContext => {
    const allIRs = [...speaker1IRs, ...speaker2IRs];
    const speakerPrefix = (allIRs[0]?.file.name ?? "unknown").split("_")[0] ?? "unknown";
    return { speakerPrefix, mode: "blend" as const, intent: intent === "versatile" ? "rhythm" : intent };
  }, [speaker1IRs, speaker2IRs, intent]);

  const lookupFeatures = useCallback((irName: string): TonalFeatures | null => {
    const data = irFeaturesMap.get(irName) || irFeaturesMap.get(irName.replace(/\.wav$/i, ""));
    return data?.features ?? null;
  }, [irFeaturesMap]);

  const lookupBands = useCallback((irName: string) => {
    const allIRs = [...speaker1IRs, ...speaker2IRs];
    const ir = allIRs.find(i => i.file.name === irName) || allIRs.find(i => i.file.name.replace(/\.wav$/i, "") === irName.replace(/\.wav$/i, ""));
    return ir?.bands ?? null;
  }, [speaker1IRs, speaker2IRs]);

  const recordBlendFeedback = useCallback((pairing: PairingResult, positive: boolean) => {
    const ir1Feat = lookupFeatures(pairing.ir1);
    const ir2Feat = lookupFeatures(pairing.ir2);
    if (!ir1Feat || !ir2Feat) return;

    const ctx = buildTasteContext();
    const ratioMatch = pairing.mixRatio.match(/(\d+)\s*[/:]\s*(\d+)/);
    let baseRatio = 0.5;
    if (ratioMatch) {
      const a = parseInt(ratioMatch[1], 10);
      const b = parseInt(ratioMatch[2], 10);
      if (a + b > 0) baseRatio = a / (a + b);
    }

    const xBlend = featurizeBlend(ir1Feat, ir2Feat, baseRatio);
    const zeroVec = new Array(xBlend.length).fill(0);

    if (positive) {
      recordOutcome(ctx, xBlend, zeroVec, "a", { lr: 0.12, source: "favorite" });
      recordIROutcome(ctx, [pairing.ir1, pairing.ir2], []);
      recordEloOutcome(ctx, [pairing.ir1, pairing.ir2], ["__anchor__", "__anchor__"], true);
    } else {
      recordOutcome(ctx, zeroVec, xBlend, "a", { lr: 0.08, source: "pass" });
      recordIROutcome(ctx, [], [pairing.ir1, pairing.ir2]);
    }

    const b1 = ir1Feat.bandsPercent ?? ir1Feat.bandsRaw;
    const b2 = ir2Feat.bandsPercent ?? ir2Feat.bandsRaw;
    if (!b1 || !b2) return;
    const blendBands = {
      subBass: (b1.subBass ?? 0) * baseRatio + (b2.subBass ?? 0) * (1 - baseRatio),
      bass: (b1.bass ?? 0) * baseRatio + (b2.bass ?? 0) * (1 - baseRatio),
      lowMid: (b1.lowMid ?? 0) * baseRatio + (b2.lowMid ?? 0) * (1 - baseRatio),
      mid: (b1.mid ?? 0) * baseRatio + (b2.mid ?? 0) * (1 - baseRatio),
      highMid: (b1.highMid ?? 0) * baseRatio + (b2.highMid ?? 0) * (1 - baseRatio),
      presence: (b1.presence ?? 0) * baseRatio + (b2.presence ?? 0) * (1 - baseRatio),
    };
    const blendRatio = blendBands.mid > 0 ? blendBands.highMid / blendBands.mid : 1.4;

    const signal = {
      action: positive ? "love" : "nope",
      baseFilename: pairing.ir1,
      featureFilename: pairing.ir2,
      subBass: blendBands.subBass,
      bass: blendBands.bass,
      lowMid: blendBands.lowMid,
      mid: blendBands.mid,
      highMid: blendBands.highMid,
      presence: blendBands.presence,
      ratio: blendRatio,
      score: pairing.score,
      blendRatio: baseRatio,
      feedback: positive ? "Favorited from pairing module" : "Passed from pairing module",
    };

    apiRequest("POST", "/api/preferences/signals", { signals: [signal] })
      .then(() => {
        queryClient.invalidateQueries({ predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === "string" && key.startsWith("/api/preferences/learned");
        }});
      })
      .catch(() => {});
  }, [buildTasteContext, lookupFeatures]);

  const handleFavorite = useCallback((index: number, pairing: PairingResult) => {
    const wasAlreadyFav = favorites.has(index);
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
    setPassed(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    if (!wasAlreadyFav) {
      recordBlendFeedback(pairing, true);
      setSavedFavorites(prev => {
        const key = `${pairing.ir1}||${pairing.ir2}||${pairing.mixRatio}`;
        if (prev.some(f => `${f.ir1}||${f.ir2}||${f.mixRatio}` === key)) return prev;
        return [...prev, pairing];
      });
      setPairRefine(prev => ({ ...prev, [index]: { ir1: pairing.ir1, ir2: pairing.ir2, ratio: pairing.mixRatio || "50/50", submitted: false } }));
      toast({ title: "Blend favorited", description: `${pairing.ir1} + ${pairing.ir2} saved permanently.` });
    } else {
      setSavedFavorites(prev => prev.filter(f => !(f.ir1 === pairing.ir1 && f.ir2 === pairing.ir2 && f.mixRatio === pairing.mixRatio)));
      setPairRefine(prev => { const n = { ...prev }; delete n[index]; return n; });
    }
  }, [favorites, recordBlendFeedback, toast]);

  const handlePass = useCallback((index: number, pairing: PairingResult) => {
    setPairRefine(prev => ({ ...prev, [index]: { ir1: pairing.ir1, ir2: pairing.ir2, ratio: pairing.mixRatio || "50/50", submitted: false } }));
    setFavorites(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, []);

  const copyPairings = () => {
    if (!result) return;
    
    const intentLabel = INTENTS.find(i => i.value === intent)?.label || 'Versatile';
    let text = isMixedMode ? "Mixed Speaker IR Pairing Recommendations\n" : "IR Pairing Recommendations\n";
    text += `Context: ${intentLabel}\n`;
    text += "=".repeat(40) + "\n\n";
    
    result.pairings.forEach((pairing, i) => {
      text += `${i + 1}. ${pairing.title}\n`;
      const roleStr = (pairing.ir1Role && pairing.ir2Role)
        ? `   Roles: ${pairing.ir1Role} + ${pairing.ir2Role}\n`
        : '';
      text += `   ${pairing.ir1} + ${pairing.ir2}\n`;
      text += roleStr;
      text += `   Mix Ratio: ${pairing.mixRatio}\n`;
      text += `   Score: ${pairing.score}/100\n`;
      if (pairing.psychoacousticSummary) text += `   Sound: ${pairing.psychoacousticSummary}\n`;
      text += `   Expected Tone: ${pairing.expectedTone}\n`;
      text += `   Best For: ${pairing.bestFor}\n`;
      if (pairing.intentFit) text += `   Intent Fit: ${pairing.intentFit}\n`;
      text += `   Why: ${pairing.rationale}\n\n`;
    });
    
    if (result.speakerRoleAnalysis) {
      text += `SPEAKER ROLE ANALYSIS:\n${result.speakerRoleAnalysis}\n`;
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "Pairing recommendations copied with descriptions.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const copySimpleList = () => {
    if (!result || result.pairings.length === 0) {
      toast({ title: "No pairings", description: "Run analysis first", variant: "destructive" });
      return;
    }
    
    const text = result.pairings.map((p, i) => 
      `${i + 1}. ${p.title} — ${p.ir1} + ${p.ir2} (${p.mixRatio})`
    ).join('\n');
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied to clipboard", description: "Pairing shortlist copied." });
    setTimeout(() => setCopied(false), 2000);
  };

  const getSiblings = useCallback((filename: string): string[] => {
    const identity = getMicIdentity(filename);
    return allIRNames.filter(n => n !== filename && getMicIdentity(n) === identity);
  }, [allIRNames]);

  const handleRefineSubmit = useCallback((index: number, originalPairing: PairingResult) => {
    const ref = pairRefine[index];
    if (!ref || ref.submitted) return;
    const changed = ref.ir1 !== originalPairing.ir1 || ref.ir2 !== originalPairing.ir2 || ref.ratio !== (originalPairing.mixRatio || "50/50");
    if (!changed) {
      setPairRefine(prev => { const n = { ...prev }; delete n[index]; return n; });
      return;
    }
    const ratioParts = ref.ratio.split("/").map(Number);
    const ratioVal = ratioParts[0] / 100;
    const refinedPairing: PairingResult = { ...originalPairing, ir1: ref.ir1, ir2: ref.ir2, mixRatio: ref.ratio };
    setSavedFavorites(prev => {
      const key = `${ref.ir1}||${ref.ir2}||${ref.ratio}`;
      if (prev.some(f => `${f.ir1}||${f.ir2}||${f.mixRatio}` === key)) return prev;
      return [...prev, refinedPairing];
    });
    const wasFavorited = favorites.has(index);
    const origAction = wasFavorited ? "like" : "nope";
    const refinedAction = wasFavorited ? "love" : "like";
    const ctx = buildTasteContext();
    const refFeat1 = lookupFeatures(ref.ir1);
    const refFeat2 = lookupFeatures(ref.ir2);
    if (refFeat1 && refFeat2) {
      const blended = featurizeBlend(refFeat1, refFeat2, ratioVal);
      recordOutcome(ctx, blended, refinedAction, undefined, ["pairing_refined", "pairing_improved"]);
    }
    const origFeat1 = lookupFeatures(originalPairing.ir1);
    const origFeat2 = lookupFeatures(originalPairing.ir2);
    if (origFeat1 && origFeat2) {
      const origRatio = originalPairing.mixRatio?.split("/").map(Number);
      const origRatioVal = origRatio ? origRatio[0] / 100 : 0.5;
      const origBlend = featurizeBlend(origFeat1, origFeat2, origRatioVal);
      recordOutcome(ctx, origBlend, origAction, undefined, ["pairing_refined"]);
    }
    const signals: any[] = [];
    const refIr2Bands = lookupBands(ref.ir2);
    if (refIr2Bands) {
      signals.push({
        baseFilename: ref.ir1, featureFilename: ref.ir2, action: refinedAction,
        subBass: refIr2Bands.subBass, bass: refIr2Bands.bass, lowMid: refIr2Bands.lowMid,
        mid: refIr2Bands.mid, highMid: refIr2Bands.highMid, presence: refIr2Bands.presence,
        ratio: ratioVal, score: 0, profileMatch: '', feedback: 'pairing_refined',
      });
    }
    const origIr2Bands = lookupBands(originalPairing.ir2);
    if (origIr2Bands) {
      const origRatio2 = originalPairing.mixRatio?.split("/").map(Number);
      signals.push({
        baseFilename: originalPairing.ir1, featureFilename: originalPairing.ir2, action: origAction,
        subBass: origIr2Bands.subBass, bass: origIr2Bands.bass, lowMid: origIr2Bands.lowMid,
        mid: origIr2Bands.mid, highMid: origIr2Bands.highMid, presence: origIr2Bands.presence,
        ratio: origRatio2 ? origRatio2[0] / 100 : 0.5, score: 0, profileMatch: '', feedback: 'pairing_improved',
      });
    }
    if (signals.length > 0) {
      apiRequest("POST", "/api/preferences/signals", { signals }).then(() => {
        queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/preferences/") });
      }).catch(() => {});
    }
    setPairRefine(prev => ({ ...prev, [index]: { ...ref, submitted: true } }));
    toast({ title: "Refined blend saved", description: `${ref.ir1} + ${ref.ir2} (${ref.ratio}) saved as favorite.` });
  }, [pairRefine, favorites, buildTasteContext, lookupFeatures, lookupBands, toast]);

  const handleRefineSaveAsFavorite = useCallback((index: number, originalPairing: PairingResult) => {
    const ref = pairRefine[index];
    if (!ref || ref.submitted) return;
    const ratioParts = ref.ratio.split("/").map(Number);
    const ratioVal = ratioParts[0] / 100;
    const refinedPairing: PairingResult = { ...originalPairing, ir1: ref.ir1, ir2: ref.ir2, mixRatio: ref.ratio };
    setSavedFavorites(prev => {
      const key = `${ref.ir1}||${ref.ir2}||${ref.ratio}`;
      if (prev.some(f => `${f.ir1}||${f.ir2}||${f.mixRatio}` === key)) return prev;
      return [...prev, refinedPairing];
    });
    const ctx = buildTasteContext();
    const refFeat1 = lookupFeatures(ref.ir1);
    const refFeat2 = lookupFeatures(ref.ir2);
    if (refFeat1 && refFeat2) {
      const blended = featurizeBlend(refFeat1, refFeat2, ratioVal);
      recordOutcome(ctx, blended, "love", undefined, ["pairing_favorited"]);
    }
    const refIr2Bands = lookupBands(ref.ir2);
    if (refIr2Bands) {
      apiRequest("POST", "/api/preferences/signals", { signals: [{
        baseFilename: ref.ir1, featureFilename: ref.ir2, action: 'love',
        subBass: refIr2Bands.subBass, bass: refIr2Bands.bass, lowMid: refIr2Bands.lowMid,
        mid: refIr2Bands.mid, highMid: refIr2Bands.highMid, presence: refIr2Bands.presence,
        ratio: ratioVal, score: 0, profileMatch: '', feedback: 'pairing_favorited',
      }]}).then(() => {
        queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/preferences/") });
      }).catch(() => {});
    }
    setPairRefine(prev => ({ ...prev, [index]: { ...ref, submitted: true } }));
    toast({ title: "Saved to favorites", description: `${ref.ir1} + ${ref.ir2} (${ref.ratio}) saved.` });
  }, [pairRefine, buildTasteContext, lookupFeatures, lookupBands, toast]);

  const handleRefineCouldntImprove = useCallback((index: number, originalPairing: PairingResult) => {
    recordBlendFeedback(originalPairing, false);
    const ctx = buildTasteContext();
    const feat1 = lookupFeatures(originalPairing.ir1);
    const feat2 = lookupFeatures(originalPairing.ir2);
    if (feat1 && feat2) {
      const ratioParts = originalPairing.mixRatio?.split("/").map(Number);
      const ratioVal = ratioParts ? ratioParts[0] / 100 : 0.5;
      const blended = featurizeBlend(feat1, feat2, ratioVal);
      recordOutcome(ctx, blended, "nope", undefined, ["pairing_unfixable"]);
    }
    const origIr2Bands = lookupBands(originalPairing.ir2);
    if (origIr2Bands) {
      const ratioParts = originalPairing.mixRatio?.split("/").map(Number);
      apiRequest("POST", "/api/preferences/signals", { signals: [{
        baseFilename: originalPairing.ir1, featureFilename: originalPairing.ir2, action: 'nope',
        subBass: origIr2Bands.subBass, bass: origIr2Bands.bass, lowMid: origIr2Bands.lowMid,
        mid: origIr2Bands.mid, highMid: origIr2Bands.highMid, presence: origIr2Bands.presence,
        ratio: ratioParts ? ratioParts[0] / 100 : 0.5, score: 0, profileMatch: '', feedback: 'pairing_unfixable',
      }]}).then(() => {
        queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/preferences/") });
      }).catch(() => {});
    }
    if (result && replacementQueue.length > 0) {
      const replacement = replacementQueue[0];
      setReplacementQueue(prev => prev.slice(1));
      const newPairings = [...result.pairings];
      newPairings[index] = replacement;
      setResult({ ...result, pairings: newPairings });
      setPairRefine(prev => { const n = { ...prev }; delete n[index]; return n; });
      toast({ title: "Replaced", description: `Swapped in: ${replacement.ir1} + ${replacement.ir2}` });
    } else {
      setPassed(prev => { const next = new Set(prev); next.add(index); return next; });
      setPairRefine(prev => ({ ...prev, [index]: { ...(prev[index] || { ir1: originalPairing.ir1, ir2: originalPairing.ir2, ratio: originalPairing.mixRatio || "50/50" }), submitted: true } }));
      toast({ title: "Noted", description: "This pairing was marked as unfixable." });
    }
  }, [buildTasteContext, lookupFeatures, lookupBands, recordBlendFeedback, toast, result, replacementQueue, setResult]);

  const handleRefineSkip = useCallback((index: number) => {
    setPairRefine(prev => { const n = { ...prev }; delete n[index]; return n; });
  }, []);

  const { mutate: analyzePairings, isPending } = useMutation({
    mutationFn: async ({ irs, irs2, tonePrefs, mixedMode, intent: intentVal, count }: { 
      irs: IRMetrics[], 
      irs2?: IRMetrics[], 
      tonePrefs?: string,
      mixedMode?: boolean,
      intent?: "rhythm" | "lead" | "clean" | "versatile",
      count?: number
    }) => {
      const tasteIntent = intentVal && intentVal !== "versatile" ? intentVal as "rhythm" | "lead" | "clean" : "rhythm" as const;
      const soloRatings = getSoloCategoriesForPairing();

      const intents: Array<"rhythm" | "lead" | "clean"> = intentVal === "versatile" ? ["rhythm", "lead", "clean"] : [tasteIntent];
      let mergedWinRecords: Record<string, { wins: number; losses: number; bothCount: number }> = {};
      let mergedEloRatings: Record<string, { rating: number; matchCount: number; uncertainty: number }> = {};
      let allSettledWinners: string[] = [];
      let allSettledLosers: string[] = [];

      for (const ti of intents) {
        const ctx: TasteContext = { intent: ti, speakerPrefix: "", mode: "blend" };
        const winRecs = getIRWinRecordsPlain(ctx);
        for (const [k, v] of Object.entries(winRecs)) {
          if (!mergedWinRecords[k]) mergedWinRecords[k] = { wins: 0, losses: 0, bothCount: 0 };
          mergedWinRecords[k].wins += v.wins;
          mergedWinRecords[k].losses += v.losses;
          mergedWinRecords[k].bothCount += v.bothCount;
        }
        const elo = getEloRatingsPlain(ctx);
        for (const [k, v] of Object.entries(elo)) {
          if (!mergedEloRatings[k] || v.matchCount > mergedEloRatings[k].matchCount) {
            mergedEloRatings[k] = v;
          }
        }
        const { winners, losers } = getSettledCombos(ctx);
        allSettledWinners.push(...winners);
        allSettledLosers.push(...losers);
      }
      allSettledWinners = Array.from(new Set(allSettledWinners));
      allSettledLosers = Array.from(new Set(allSettledLosers));

      const hasLearnerData = Object.keys(soloRatings).length > 0 || 
        Object.keys(mergedWinRecords).length > 0 || 
        Object.keys(mergedEloRatings).length > 0;

      const validated = api.pairing.analyze.input.parse({ 
        irs, 
        irs2, 
        tonePreferences: tonePrefs,
        mixedMode,
        intent: intentVal,
        pairingCount: Math.min((count ?? 5) + 5, 20),
        learnerInsights: hasLearnerData ? {
          soloRatings: Object.keys(soloRatings).length > 0 ? soloRatings : undefined,
          irWinRecords: Object.keys(mergedWinRecords).length > 0 ? mergedWinRecords : undefined,
          eloRatings: Object.keys(mergedEloRatings).length > 0 ? mergedEloRatings : undefined,
          settledWinners: allSettledWinners.length > 0 ? allSettledWinners : undefined,
          settledLosers: allSettledLosers.length > 0 ? allSettledLosers : undefined,
        } : undefined,
      });
      const res = await fetch(api.pairing.analyze.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to analyze pairings");
      return api.pairing.analyze.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      const requestedCount = pairingCount;
      if (data.pairings.length > requestedCount) {
        const visible = data.pairings.slice(0, requestedCount);
        const extras = data.pairings.slice(requestedCount);
        setResult({ ...data, pairings: visible });
        setReplacementQueue(extras);
      } else {
        setResult(data);
        setReplacementQueue([]);
      }
      setFavorites(new Set());
      setPassed(new Set());
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to analyze IR pairings", variant: "destructive" });
    },
  });

  const processFiles = async (
    files: File[], 
    setIRs: React.Dispatch<React.SetStateAction<UploadedIR[]>>
  ) => {
    const wavFiles = files.filter(f => f.name.toLowerCase().endsWith('.wav'));
    
    if (wavFiles.length === 0) {
      toast({ title: "Invalid files", description: "Please upload .wav files only", variant: "destructive" });
      return;
    }

    const newIRs: UploadedIR[] = wavFiles.map(file => ({
      file,
      metrics: null,
      analyzing: true,
      error: null,
      features: null,
      bands: null,
    }));

    setIRs(newIRs);
    setResult(null);

    for (let i = 0; i < wavFiles.length; i++) {
      const file = wavFiles[i];
      try {
        const metrics = await analyzeAudioFile(file);
        const features = computeTonalFeatures(metrics);
        setIRs(prev => prev.map(ir => 
          ir.file.name === file.name && ir.file.size === file.size
            ? { ...ir, metrics, analyzing: false, features, bands: features.bandsPercent }
            : ir
        ));
      } catch (err) {
        setIRs(prev => prev.map(ir => 
          ir.file.name === file.name && ir.file.size === file.size
            ? { ...ir, analyzing: false, error: "Failed to analyze" }
            : ir
        ));
      }
    }
  };

  const onDropSpeaker1 = useCallback(async (acceptedFiles: File[]) => {
    await processFiles(acceptedFiles, setSpeaker1IRs);
  }, [toast]);

  const onDropSpeaker2 = useCallback(async (acceptedFiles: File[]) => {
    await processFiles(acceptedFiles, setSpeaker2IRs);
  }, [toast]);

  const removeIR = (index: number, speaker: 1 | 2) => {
    if (speaker === 1) {
      setSpeaker1IRs(prev => prev.filter((_, i) => i !== index));
    } else {
      setSpeaker2IRs(prev => prev.filter((_, i) => i !== index));
    }
    setResult(null);
  };

  const clearSpeaker = (speaker: 1 | 2) => {
    if (speaker === 1) {
      setSpeaker1IRs([]);
    } else {
      setSpeaker2IRs([]);
    }
    setResult(null);
  };

  const handleAnalyze = () => {
    const valid1 = speaker1IRs.filter(ir => ir.metrics && !ir.error);
    const valid2 = speaker2IRs.filter(ir => ir.metrics && !ir.error);

    // Mixed mode requires at least 1 IR in each set
    if (isMixedMode) {
      if (valid1.length === 0 || valid2.length === 0) {
        toast({ 
          title: "Need IRs in both sets", 
          description: "For mixed speaker pairing, add at least 1 IR to each speaker set", 
          variant: "destructive" 
        });
        return;
      }
    } else {
      // Single speaker mode requires at least 2 IRs
      if (valid1.length < 2) {
        toast({ 
          title: "Need more IRs", 
          description: "Upload at least 2 valid IRs to analyze pairings", 
          variant: "destructive" 
        });
        return;
      }
    }

    const toMetrics = (irs: UploadedIR[]): IRMetrics[] => 
      irs.filter(ir => ir.metrics && !ir.error).map(ir => ({
        filename: ir.file.name,
        duration: ir.metrics!.durationMs,
        peakLevel: ir.metrics!.peakAmplitudeDb,
        spectralCentroid: ir.metrics!.spectralCentroid,
        lowEnergy: ir.metrics!.lowEnergy,
        midEnergy: ir.metrics!.midEnergy,
        highEnergy: ir.metrics!.highEnergy,
        subBassEnergy: ir.metrics!.subBassEnergy,
        bassEnergy: ir.metrics!.bassEnergy,
        lowMidEnergy: ir.metrics!.lowMidEnergy,
        midEnergy6: ir.metrics!.midEnergy6,
        highMidEnergy: ir.metrics!.highMidEnergy,
        presenceEnergy: ir.metrics!.presenceEnergy,
        frequencySmoothness: ir.metrics!.frequencySmoothness,
      }));

    const effectiveGenre = genre === 'custom' ? customGenre.trim() : genre;
    const combinedTonePrefs = [effectiveGenre, tonePreferences.trim()].filter(Boolean).join('; ') || undefined;

    if (isMixedMode) {
      analyzePairings({ 
        irs: toMetrics(valid1), 
        irs2: toMetrics(valid2), 
        tonePrefs: combinedTonePrefs,
        mixedMode: true,
        intent,
        count: pairingCount,
      });
    } else {
      analyzePairings({ 
        irs: toMetrics(valid1), 
        tonePrefs: combinedTonePrefs,
        intent,
        count: pairingCount,
      });
    }
  };

  const dropzone1 = useDropzone({
    onDrop: onDropSpeaker1,
    accept: { "audio/wav": [".wav"] },
    multiple: true,
  });

  const dropzone2 = useDropzone({
    onDrop: onDropSpeaker2,
    accept: { "audio/wav": [".wav"] },
    multiple: true,
  });

  const valid1Count = speaker1IRs.filter(ir => ir.metrics && !ir.error).length;
  const valid2Count = speaker2IRs.filter(ir => ir.metrics && !ir.error).length;
  const analyzing1Count = speaker1IRs.filter(ir => ir.analyzing).length;
  const analyzing2Count = speaker2IRs.filter(ir => ir.analyzing).length;
  const totalAnalyzing = analyzing1Count + analyzing2Count;

  const canAnalyze = isMixedMode 
    ? (valid1Count >= 1 && valid2Count >= 1 && totalAnalyzing === 0)
    : (valid1Count >= 2 && totalAnalyzing === 0);

  const IRList = ({ 
    irs, 
    speaker, 
    onRemove, 
    onClear 
  }: { 
    irs: UploadedIR[], 
    speaker: 1 | 2, 
    onRemove: (index: number) => void,
    onClear: () => void 
  }) => {
    const validCount = irs.filter(ir => ir.metrics && !ir.error).length;
    
    if (irs.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {validCount} IR{validCount !== 1 ? 's' : ''} ready
          </span>
          <button
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
            data-testid={`button-clear-speaker-${speaker}`}
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          <AnimatePresence>
            {irs.map((ir, index) => (
              <motion.div
                key={`${ir.file.name}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={cn(
                  "p-2 rounded-lg bg-white/5 flex items-center justify-between gap-2",
                  ir.error && "border border-destructive/50"
                )}
                data-testid={`ir-item-speaker${speaker}-${index}`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={cn(
                    "w-6 h-6 rounded flex items-center justify-center flex-shrink-0",
                    ir.analyzing ? "bg-yellow-500/20" :
                    ir.error ? "bg-destructive/20" :
                    speaker === 1 ? "bg-primary/20" : "bg-secondary/20"
                  )}>
                    {ir.analyzing ? (
                      <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />
                    ) : ir.error ? (
                      <Music4 className="w-3 h-3 text-destructive" />
                    ) : (
                      <Music4 className={cn("w-3 h-3", speaker === 1 ? "text-primary" : "text-secondary")} />
                    )}
                  </div>
                  <p className="text-xs truncate flex-1">{ir.file.name}</p>
                  <ShotIntentBadge filename={ir.file.name} />
                </div>
                <button
                  onClick={() => onRemove(index)}
                  className="p-1 hover:bg-white/5 rounded transition-colors flex-shrink-0"
                  data-testid={`button-remove-ir-speaker${speaker}-${index}`}
                >
                  <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-white to-secondary pb-2">
            IR Pairing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload IRs to find optimal pairings. Use one speaker or mix two different speakers for hybrid tones.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Speaker 1 Dropzone */}
          <div className="space-y-4">
            <div
              {...dropzone1.getRootProps()}
              className={cn(
                "glass-panel p-6 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer",
                dropzone1.isDragActive
                  ? "border-primary bg-primary/5 shadow-[0_0_30px_-10px_rgba(34,197,94,0.4)]"
                  : "border-white/10 hover:border-primary/50"
              )}
              data-testid="dropzone-speaker1"
            >
              <input {...dropzone1.getInputProps()} data-testid="input-files-speaker1" />
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Layers className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-primary">
                    Speaker 1 IRs
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dropzone1.isDragActive ? "Drop files here" : "Drop .wav files or click to browse"}
                  </p>
                </div>
              </div>
            </div>
            <IRList 
              irs={speaker1IRs} 
              speaker={1} 
              onRemove={(i) => removeIR(i, 1)}
              onClear={() => clearSpeaker(1)}
            />
          </div>

          {/* Speaker 2 Dropzone */}
          <div className="space-y-4">
            <div
              {...dropzone2.getRootProps()}
              className={cn(
                "glass-panel p-6 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer",
                dropzone2.isDragActive
                  ? "border-secondary bg-secondary/5 shadow-[0_0_30px_-10px_rgba(168,85,247,0.4)]"
                  : "border-white/10 hover:border-secondary/50"
              )}
              data-testid="dropzone-speaker2"
            >
              <input {...dropzone2.getInputProps()} data-testid="input-files-speaker2" />
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-secondary" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-secondary">
                    Speaker 2 IRs (optional)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dropzone2.isDragActive ? "Drop files here" : "Add for cross-speaker mixing"}
                  </p>
                </div>
              </div>
            </div>
            <IRList 
              irs={speaker2IRs} 
              speaker={2} 
              onRemove={(i) => removeIR(i, 2)}
              onClear={() => clearSpeaker(2)}
            />
          </div>
        </div>

        {/* Mode indicator */}
        {(speaker1IRs.length > 0 || speaker2IRs.length > 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <span className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
              isMixedMode 
                ? "bg-gradient-to-r from-primary/20 to-secondary/20 text-white" 
                : "bg-primary/20 text-primary"
            )}>
              {isMixedMode ? (
                <>
                  <Layers className="w-4 h-4" />
                  Mixed Speaker Mode - Cross-speaker pairings
                </>
              ) : (
                <>
                  <FileAudio className="w-4 h-4" />
                  Single Speaker Mode - {valid1Count >= 2 ? "Ready to analyze" : "Add at least 2 IRs"}
                </>
              )}
            </span>
          </motion.div>
        )}

        {/* Genre and Tone preferences */}
        {(valid1Count >= 2 || isMixedMode) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 max-w-2xl mx-auto"
          >
            {/* Genre Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Genre / Style (optional)
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                data-testid="select-pairing-genre"
              >
                {GENRES.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
              {genre === 'custom' && (
                <input
                  type="text"
                  value={customGenre}
                  onChange={(e) => setCustomGenre(e.target.value)}
                  placeholder="Enter your genre (e.g., 'doom metal', 'shoegaze', 'post-punk')"
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all mt-2"
                  data-testid="input-pairing-custom-genre"
                />
              )}
            </div>

            {/* Intent Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Playing Context
              </label>
              <Select
                value={intent}
                onValueChange={(v) => setIntent(v as typeof intent)}
              >
                <SelectTrigger className="w-full" data-testid="select-intent">
                  <SelectValue placeholder="Select playing context" />
                </SelectTrigger>
                <SelectContent>
                  {INTENTS.map((i) => (
                    <SelectItem key={i.value} value={i.value} data-testid={`option-intent-${i.value}`}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                AI optimizes pairings for your playing context — role combos differ for rhythm vs lead vs clean
              </p>
            </div>

            {/* Number of Pairings */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Number of Pairings
              </label>
              <Select
                value={String(pairingCount)}
                onValueChange={(v) => setPairingCount(Number(v))}
              >
                <SelectTrigger className="w-full" data-testid="select-pairing-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 7, 10, 15, 20].map((n) => (
                    <SelectItem key={n} value={String(n)} data-testid={`option-count-${n}`}>
                      {n} pairings
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tone Preferences */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Tonal Goals (optional)
              </label>
              <textarea
                value={tonePreferences}
                onChange={(e) => setTonePreferences(e.target.value)}
                placeholder="Describe your desired sound: spanky cleans, thick rhythm, cutting leads, smooth highs, tight bass, ambient shimmer..."
                className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-sm placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                rows={2}
                data-testid="input-tone-preferences"
              />
              <p className="text-xs text-muted-foreground">
                AI prioritizes pairings matching your genre and tonal goals
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSpeaker1IRs([]);
                  setSpeaker2IRs([]);
                  setResult(null);
                  setGenre("");
                  setCustomGenre("");
                  setTonePreferences("");
                  setIntent("versatile");
                }}
                className="px-4 py-3 rounded-lg font-medium text-sm border border-white/10 hover:bg-white/5 transition-all flex items-center gap-2"
                data-testid="button-clear-pairings"
              >
                <Trash2 className="w-4 h-4" /> Clear All
              </button>
              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze || isPending}
                className={cn(
                  "flex-1 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2",
                  canAnalyze && !isPending
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_-5px_rgba(34,197,94,0.5)]"
                    : "bg-white/5 text-muted-foreground cursor-not-allowed"
                )}
                data-testid="button-analyze-pairings"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing {isMixedMode ? "Cross-Speaker " : ""}Pairings...
                  </>
                ) : totalAnalyzing > 0 ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing {totalAnalyzing} file(s)...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    {isMixedMode 
                      ? `Find Best Cross-Speaker Pairings (${valid1Count} + ${valid2Count} IRs)`
                      : `Find Best Pairings (${valid1Count} IRs)`
                    }
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="glass-panel p-6 rounded-2xl">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Zap className="w-6 h-6 text-primary" />
                    {isMixedMode ? "Best Cross-Speaker Pairings" : "Best Pairings"}
                  </h2>
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
                      onClick={copyPairings}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
                      data-testid="button-copy-pairings"
                    >
                      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy All"}
                    </button>
                    <button
                      onClick={() => setResult(null)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-destructive/20 border border-white/10 text-xs font-medium transition-all text-muted-foreground hover:text-destructive"
                      data-testid="button-clear-pairings"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                  </div>
                </div>
                <p className="text-muted-foreground mb-6">{result.summary}</p>

                <div className="space-y-4">
                  {result.pairings.map((pairing, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        "p-4 rounded-xl border space-y-3 transition-colors",
                        favorites.has(index)
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : passed.has(index)
                          ? "bg-white/[0.02] border-white/5 opacity-50"
                          : "bg-white/5 border-white/10"
                      )}
                      data-testid={`pairing-result-${index}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-lg font-bold text-foreground flex-1">{pairing.title}</h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleFavorite(index, pairing)}
                            className={cn(
                              "p-1.5 rounded-lg transition-all",
                              favorites.has(index)
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-white/5 text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10"
                            )}
                            title={favorites.has(index) ? "Unfavorite" : "Favorite this blend"}
                            data-testid={`button-favorite-pairing-${index}`}
                          >
                            <Heart className={cn("w-4 h-4", favorites.has(index) && "fill-current")} />
                          </button>
                          <button
                            onClick={() => handlePass(index, pairing)}
                            className={cn(
                              "p-1.5 rounded-lg transition-all",
                              passed.has(index)
                                ? "bg-red-500/20 text-red-400"
                                : "bg-white/5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                            )}
                            title="Pass on this blend"
                            data-testid={`button-pass-pairing-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-mono rounded">
                              {pairing.ir1}
                            </span>
                            <span className="text-muted-foreground">+</span>
                            <span className="px-2 py-1 bg-secondary/20 text-secondary text-xs font-mono rounded">
                              {pairing.ir2}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">{pairing.mixRatio}</p>
                            <p className="text-xs text-muted-foreground">mix ratio</p>
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            <div className={cn(
                              "w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg",
                              pairing.score >= 90 ? "bg-emerald-500/20 text-emerald-400" :
                              pairing.score >= 80 ? "bg-primary/20 text-primary" :
                              pairing.score >= 70 ? "bg-yellow-500/20 text-yellow-400" :
                              pairing.score >= 60 ? "bg-orange-500/20 text-orange-400" :
                              "bg-red-500/20 text-red-400"
                            )}>
                              {pairing.score}
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-none">
                              {pairing.score >= 90 ? "excellent" :
                               pairing.score >= 80 ? "great" :
                               pairing.score >= 70 ? "good" :
                               pairing.score >= 60 ? "decent" :
                               "weak"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {(pairing.ir1Role || pairing.ir2Role) && (
                        <div className="flex flex-wrap gap-2">
                          {pairing.ir1Role && (
                            <span className="px-2 py-0.5 bg-primary/10 border border-primary/30 text-primary text-xs font-medium rounded">
                              {pairing.ir1Role}
                            </span>
                          )}
                          <span className="text-muted-foreground text-xs self-center">+</span>
                          {pairing.ir2Role && (
                            <span className="px-2 py-0.5 bg-secondary/10 border border-secondary/30 text-secondary text-xs font-medium rounded">
                              {pairing.ir2Role}
                            </span>
                          )}
                          {pairing.intentFit && (
                            <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs rounded ml-auto">
                              {pairing.intentFit}
                            </span>
                          )}
                        </div>
                      )}

                      <p className="text-sm text-foreground/80">{pairing.rationale}</p>

                      {pairing.psychoacousticSummary && (
                        <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                          {pairing.psychoacousticSummary}
                        </p>
                      )}

                      <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <div className="p-2 rounded bg-white/5">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Expected Tone</p>
                          <p className="text-foreground/90">{pairing.expectedTone}</p>
                        </div>
                        <div className="p-2 rounded bg-white/5">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Best For</p>
                          <p className="text-foreground/90">{pairing.bestFor}</p>
                        </div>
                      </div>

                      {(() => {
                        const ir1Data = irFeaturesMap.get(pairing.ir1) || irFeaturesMap.get(pairing.ir1.replace(/\.wav$/i, ""));
                        const ir2Data = irFeaturesMap.get(pairing.ir2) || irFeaturesMap.get(pairing.ir2.replace(/\.wav$/i, ""));
                        if (ir1Data && ir2Data) {
                          return (
                            <PairingBlendPreview
                              ir1={ir1Data}
                              ir2={ir2Data}
                              profiles={activeProfiles}
                              defaultRatioLabel={pairing.mixRatio}
                            />
                          );
                        }
                        return null;
                      })()}

                      {pairRefine[index] && !pairRefine[index].submitted && (
                        <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10 space-y-3" data-testid={`refine-panel-${index}`}>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">
                            {favorites.has(index) ? "Optional: save refined version" : "Try swapping IRs or adjusting ratio"}
                          </p>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {[
                              { label: "IR 1", key: "ir1" as const, original: pairing.ir1 },
                              { label: "IR 2", key: "ir2" as const, original: pairing.ir2 },
                            ].map(({ label, key, original }) => {
                              const siblings = getSiblings(original);
                              const current = pairRefine[index][key];
                              return (
                                <div key={key}>
                                  <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                                  {siblings.length > 0 ? (
                                    <Select value={current} onValueChange={(v) => setPairRefine(prev => ({ ...prev, [index]: { ...prev[index], [key]: v } }))}>
                                      <SelectTrigger className="h-8 text-xs" data-testid={`refine-${key}-${index}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value={original}>{original}</SelectItem>
                                        {siblings.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <p className="text-xs text-muted-foreground/60 truncate">{current}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Ratio</label>
                            <Select value={pairRefine[index].ratio} onValueChange={(v) => setPairRefine(prev => ({ ...prev, [index]: { ...prev[index], ratio: v } }))}>
                              <SelectTrigger className="h-8 text-xs w-32" data-testid={`refine-ratio-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {RATIO_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                              onClick={() => handleRefineSubmit(index, pairing)}
                              data-testid={`refine-submit-${index}`}
                            >
                              Submit Improved
                            </button>
                            <button
                              className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors flex items-center gap-1"
                              onClick={() => handleRefineSaveAsFavorite(index, pairing)}
                              data-testid={`refine-save-fav-${index}`}
                            >
                              <Heart className="w-3 h-3" /> Save to Favorites
                            </button>
                            <button
                              className="px-3 py-1.5 rounded-md bg-red-600/80 hover:bg-red-500 text-white text-xs font-medium transition-colors"
                              onClick={() => handleRefineCouldntImprove(index, pairing)}
                              data-testid={`refine-cant-improve-${index}`}
                            >
                              Couldn't Improve
                            </button>
                            <button
                              className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-foreground/70 text-xs transition-colors"
                              onClick={() => handleRefineSkip(index)}
                              data-testid={`refine-skip-${index}`}
                            >
                              Skip
                            </button>
                          </div>
                        </div>
                      )}
                      {pairRefine[index]?.submitted && (
                        <p className="text-xs text-emerald-400 mt-2" data-testid={`refine-done-${index}`}>
                          <Check className="w-3 h-3 inline mr-1" />
                          Refinement recorded
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>

                {favorites.size > 0 && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mt-4">
                    <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Heart className="w-3 h-3 fill-current" /> Favorites ({favorites.size})
                    </p>
                    <div className="space-y-1">
                      {Array.from(favorites).sort().map(idx => {
                        const p = result.pairings[idx];
                        if (!p) return null;
                        return (
                          <p key={idx} className="text-sm text-foreground/80">
                            <span className="font-mono text-xs">{p.ir1}</span>
                            {" + "}
                            <span className="font-mono text-xs">{p.ir2}</span>
                            <span className="text-muted-foreground"> — {p.mixRatio}</span>
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}

                {result.speakerRoleAnalysis && (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 mt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Speaker Role Analysis</p>
                    <p className="text-sm text-foreground/80">{result.speakerRoleAnalysis}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {savedFavorites.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowSavedFavorites(!showSavedFavorites)}
              className="flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors mb-3"
              data-testid="button-toggle-saved-favorites"
            >
              <Star className="w-4 h-4 fill-current" />
              Saved Favorites ({savedFavorites.length})
              <span className="text-xs text-muted-foreground">{showSavedFavorites ? "▲" : "▼"}</span>
            </button>
            {showSavedFavorites && (
              <div className="space-y-2">
                {savedFavorites.map((fav, idx) => (
                  <div
                    key={`${fav.ir1}-${fav.ir2}-${idx}`}
                    className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-between gap-3"
                    data-testid={`saved-favorite-${idx}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-xs font-mono rounded">{fav.ir1}</span>
                        <span className="text-muted-foreground text-xs">+</span>
                        <span className="px-1.5 py-0.5 bg-secondary/20 text-secondary text-xs font-mono rounded">{fav.ir2}</span>
                        <span className="text-xs text-muted-foreground">{fav.mixRatio}</span>
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded",
                          fav.score >= 85 ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-muted-foreground"
                        )}>{fav.score}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{fav.expectedTone}</p>
                    </div>
                    <button
                      onClick={() => setSavedFavorites(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1 rounded text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                      title="Remove from favorites"
                      data-testid={`button-remove-saved-fav-${idx}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const text = savedFavorites.map((f, i) =>
                      `${i + 1}. ${f.ir1} + ${f.ir2} (${f.mixRatio}) — Score: ${f.score}\n   ${f.expectedTone}\n   Best for: ${f.bestFor}`
                    ).join("\n\n");
                    navigator.clipboard.writeText(text);
                    toast({ title: "Copied", description: "Favorites list copied to clipboard." });
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  data-testid="button-copy-saved-favorites"
                >
                  <Copy className="w-3 h-3" /> Copy all favorites
                </button>
              </div>
            )}
          </div>
        )}

        {replacementQueue.length > 0 && result && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {replacementQueue.length} replacement{replacementQueue.length !== 1 ? "s" : ""} available
          </p>
        )}

        <SuperblendSection speaker1IRs={speaker1IRs} speaker2IRs={speaker2IRs} />
      </div>
    </div>
  );
}

type PairingBandBreakdown = { subBass: number; bass: number; lowMid: number; mid: number; highMid: number; presence: number };

function bandBreakdownToFeatureVec(bb: PairingBandBreakdown): number[] {
  const pcts = [bb.subBass, bb.bass, bb.lowMid, bb.mid, bb.highMid, bb.presence];
  const mean = pcts.reduce((a, b) => a + b, 0) / pcts.length;
  const dbVals = pcts.map(p => p > 0 ? 10 * Math.log10(p / Math.max(mean, 1)) : -3);
  return [...dbVals.map(d => d / 10), 0, 0, 0, 0.5];
}

function scoreAllBlends(
  result: SuperblendResult | undefined,
  speaker: string,
  intent: string,
): Map<string, number> {
  const scores = new Map<string, number>();
  if (!result) return scores;
  const tasteIntent = (intent === "versatile" ? "rhythm" : intent) as "rhythm" | "lead" | "clean";
  const ctx: TasteContext = { speakerPrefix: speaker, mode: "blend", intent: tasteIntent };
  const scoreBands = (bb: PairingBandBreakdown | undefined, key: string) => {
    if (!bb) return;
    const vec = bandBreakdownToFeatureVec(bb);
    const { bias } = getTasteBias(ctx, vec);
    scores.set(key, bias);
  };
  scoreBands(result.blend.bandBreakdown, "primary");
  if (result.equalPartsBlend) scoreBands(result.equalPartsBlend.bandBreakdown, "equal");
  result.alternatives?.forEach((alt, i) => scoreBands(alt.bandBreakdown, String(i)));
  return scores;
}

function getBestBlendKeys(
  allResults: Record<string, SuperblendResult>,
  speaker: string,
): { perIntent: Record<string, string>; overallIntent: string; overallKey: string } {
  const perIntent: Record<string, string> = {};
  let bestGlobalScore = -Infinity;
  let overallIntent = "";
  let overallKey = "";
  for (const [intent, result] of Object.entries(allResults)) {
    const scores = scoreAllBlends(result, speaker, intent);
    let bestKey = "primary";
    let bestScore = -Infinity;
    for (const [key, score] of scores) {
      if (score > bestScore) { bestScore = score; bestKey = key; }
      if (score > bestGlobalScore) { bestGlobalScore = score; overallIntent = intent; overallKey = key; }
    }
    perIntent[intent] = bestKey;
  }
  return { perIntent, overallIntent, overallKey };
}

function snapBlendLayers(layers: SuperblendLayer[]): SuperblendLayer[] {
  if (layers.length < 3 || layers.length > 8) return layers;
  const snapped = snapToAchievable(layers.map(l => l.percentage));
  return layers.map((l, i) => ({ ...l, percentage: snapped[i] }));
}

function snapSuperblendResult(data: SuperblendResult): SuperblendResult {
  return {
    ...data,
    blend: { ...data.blend, layers: snapBlendLayers(data.blend.layers) },
    equalPartsBlend: data.equalPartsBlend ? { ...data.equalPartsBlend, layers: snapBlendLayers(data.equalPartsBlend.layers) } : undefined,
    alternatives: data.alternatives?.map(a => ({ ...a, layers: snapBlendLayers(a.layers) })),
  };
}

function tryOptimizeLayers(
  layers: SuperblendLayer[],
  irLookup: Map<string, number[]>,
  ctx: TasteContext,
  nudges?: ToneNudges,
): SuperblendLayer[] | null {
  if (layers.length < 2) return null;
  const logBands = layers.map(l => irLookup.get(l.filename));
  if (logBands.some(b => !b)) return null;
  const forceAccept = hasActiveNudges(nudges);
  const result = optimizeBlendRatios(logBands as number[][], layers.map(l => l.percentage), ctx, 200, nudges);
  if (!forceAccept && result.improvement <= 0) return null;
  return layers.map((l, i) => ({ ...l, percentage: result.ratios[i] }));
}

function optimizeSuperblendResult(
  data: SuperblendResult,
  irLookup: Map<string, number[]>,
  speaker: string,
  intent: string,
  nudges?: ToneNudges,
): SuperblendResult {
  const tasteIntent = (intent === "versatile" ? "rhythm" : intent) as "rhythm" | "lead" | "clean";
  const ctx: TasteContext = { speakerPrefix: speaker, mode: "blend", intent: tasteIntent };
  const snapped = snapSuperblendResult(data);
  const optimizedPrimary = tryOptimizeLayers(snapped.blend.layers, irLookup, ctx, nudges);
  return {
    ...snapped,
    blend: { ...snapped.blend, layers: optimizedPrimary || snapped.blend.layers },
    alternatives: snapped.alternatives?.map(a => {
      const opt = tryOptimizeLayers(a.layers, irLookup, ctx, nudges);
      return opt ? { ...a, layers: opt } : a;
    }),
  };
}

interface PairingSuperblendBlendData {
  name: string;
  speaker: string;
  layers: SuperblendLayer[];
  expectedTone: string;
  bandBreakdown: PairingBandBreakdown;
  rationale: string;
  versatilityScore: number;
  bestFor: string;
}

interface SuperblendResult {
  blend: PairingSuperblendBlendData;
  equalPartsBlend?: PairingSuperblendBlendData;
  alternatives?: {
    name: string;
    focus: string;
    layers: SuperblendLayer[];
    expectedTone: string;
    bandBreakdown: PairingBandBreakdown;
    versatilityScore: number;
  }[];
  changesSummary?: string;
}

function SuperblendSection({ speaker1IRs, speaker2IRs }: { speaker1IRs: UploadedIR[]; speaker2IRs: UploadedIR[] }) {
  const allIRs = useMemo(() => {
    return [...speaker1IRs, ...speaker2IRs]
      .filter(ir => ir.features && !ir.analyzing && !ir.error);
  }, [speaker1IRs, speaker2IRs]);

  const [open, setOpen] = useState(false);
  const [irCount, setIrCount] = useState(4);
  const [toneGoal, setToneGoal] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState("");
  const [selectedIntent, setSelectedIntent] = useState<string>("versatile");
  const [allResults, setAllResults] = useState<Record<string, SuperblendResult>>({});
  const [activeBlend, setActiveBlend] = useState<"primary" | "equal" | number>("primary");
  const [refineText, setRefineText] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedBlends, setSavedBlends] = useState<SavedSuperblend[]>(() => loadSuperblendFavorites());
  const [showSaved, setShowSaved] = useState(false);
  const [showExperiment, setShowExperiment] = useState(false);
  const [toneNudges, setToneNudges] = useState<ToneNudges>({});
  const [isReoptimizing, setIsReoptimizing] = useState(false);
  const { toast } = useToast();

  const speakers = useMemo(() => {
    const map = new Map<string, UploadedIR[]>();
    allIRs.forEach(ir => {
      const parts = ir.file.name.replace(/\.wav$/i, "").split("_");
      const speaker = parts[0] || "unknown";
      if (!map.has(speaker)) map.set(speaker, []);
      map.get(speaker)!.push(ir);
    });
    return Array.from(map.entries())
      .filter(([, irs]) => irs.length >= 3)
      .sort((a, b) => b[1].length - a[1].length);
  }, [allIRs]);

  useEffect(() => {
    if (speakers.length > 0 && !selectedSpeaker) {
      setSelectedSpeaker(speakers[0][0]);
    }
  }, [speakers, selectedSpeaker]);

  const speakerIRs = useMemo(() => {
    if (selectedSpeaker === "__mixed__") return allIRs;
    return speakers.find(([s]) => s === selectedSpeaker)?.[1] || [];
  }, [speakers, selectedSpeaker, allIRs]);

  const result = allResults[selectedIntent] || null;
  const setResult = (data: SuperblendResult) => {
    setAllResults(prev => ({ ...prev, [selectedIntent]: data }));
  };

  const [generatingCount, setGeneratingCount] = useState(0);
  const isGenerating = generatingCount > 0;

  const generateMutation = useMutation({
    mutationFn: async () => {
      const irData = speakerIRs.filter(ir => ir.features).map(ir => ({
        filename: ir.file.name,
        subBass: ir.features!.bandsPercent.subBass,
        bass: ir.features!.bandsPercent.bass,
        lowMid: ir.features!.bandsPercent.lowMid,
        mid: ir.features!.bandsPercent.mid,
        highMid: ir.features!.bandsPercent.highMid,
        presence: ir.features!.bandsPercent.presence,
        ratio: ir.features!.bandsPercent.highMid / Math.max(ir.features!.bandsPercent.mid, 0.1),
        centroid: ir.features!.spectralCentroidHz || 0,
        smoothness: ir.features!.smoothScore || 0,
      }));
      const speakerLabel = selectedSpeaker === "__mixed__"
        ? speakers.map(([s]) => s).join(" + ")
        : selectedSpeaker;

      const irLookup = new Map<string, number[]>();
      for (const ir of speakerIRs) {
        const lbe = ir.metrics?.logBandEnergies;
        if (Array.isArray(lbe) && lbe.length >= 20) {
          irLookup.set(ir.file.name, lbe);
        }
      }

      setGeneratingCount(SUPERBLEND_INTENTS.length);
      setAllResults({});
      setActiveBlend("primary");
      setRefineText("");
      setAiAnswer(null);

      const promises = SUPERBLEND_INTENTS.map(async (intent) => {
        const intentGoal = `${intent.label}: ${intent.description}`;
        const combinedGoal = [intentGoal, toneGoal.trim()].filter(Boolean).join(". Also: ");
        try {
          const res = await apiRequest("POST", "/api/preferences/superblend", {
            speaker: speakerLabel,
            irCount,
            toneGoal: combinedGoal,
            irs: irData,
          });
          const raw = await res.json() as SuperblendResult;
          const data = irLookup.size >= 2
            ? optimizeSuperblendResult(raw, irLookup, speakerLabel, intent.value, hasActiveNudges(toneNudges) ? toneNudges : undefined)
            : snapSuperblendResult(raw);
          setAllResults(prev => ({ ...prev, [intent.value]: data }));
          if (data.blend.bandBreakdown) {
            const irEntries = speakerIRs.map(ir => ({ filename: ir.file.name, bandsPercent: ir.features!.bandsPercent }));
            const pair = findBestPairForBands(irEntries, data.blend.bandBreakdown);
            if (pair) {
              const bb = data.blend.bandBreakdown;
              const vec = [bb.subBass / 10, bb.bass / 10, bb.lowMid / 10, bb.mid / 10, bb.highMid / 10, bb.presence / 10, 0, 0];
              const ctx: TasteContext = { speakerPrefix: selectedSpeaker, mode: "blend", intent: intent.value as any };
              recordSuperblendInsight(ctx, [pair.ir1, pair.ir2], vec);
            }
          }
        } catch (e) {
          console.error(`[Superblend] ${intent.value} failed:`, e);
        } finally {
          setGeneratingCount(prev => prev - 1);
        }
      });

      await Promise.all(promises);
      return null;
    },
    onError: () => {
      setGeneratingCount(0);
      toast({ title: "Superblend failed", description: "Could not generate blends. Try again.", variant: "destructive", duration: 3000 });
    },
  });

  const saveCurrentBlend = () => {
    if (!displayBlend || !result) return;
    const blend: SavedSuperblend = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      speaker: result.blend.speaker,
      intent: selectedIntent,
      name: displayBlend.name,
      layers: displayBlend.layers,
      expectedTone: displayBlend.expectedTone,
      bandBreakdown: displayBlend.bandBreakdown,
      versatilityScore: displayBlend.versatilityScore,
      bestFor: (displayBlend as any).bestFor || "",
      savedAt: new Date().toISOString(),
    };
    saveSuperblendFavorite(blend);
    setSavedBlends(loadSuperblendFavorites());
    toast({ title: "Superblend saved", description: `"${blend.name}" saved to your collection.` });
  };

  const removeSaved = (id: string) => {
    removeSuperblendFavorite(id);
    setSavedBlends(loadSuperblendFavorites());
    toast({ title: "Removed", description: "Superblend removed from collection." });
  };

  const refineMutation = useMutation({
    mutationFn: async () => {
      if (!result) throw new Error("No blend to refine");
      const activeLayers = activeBlend === "primary" ? result.blend.layers
        : activeBlend === "equal" ? result.equalPartsBlend?.layers
        : result.alternatives?.[activeBlend as number]?.layers;
      const activeTone = activeBlend === "primary" ? result.blend.expectedTone
        : activeBlend === "equal" ? result.equalPartsBlend?.expectedTone
        : result.alternatives?.[activeBlend as number]?.expectedTone;
      if (!activeLayers || !activeTone) throw new Error("Invalid blend selection");
      const irData = speakerIRs.filter(ir => ir.features).map(ir => ({
        filename: ir.file.name,
        subBass: ir.features!.bandsPercent.subBass,
        bass: ir.features!.bandsPercent.bass,
        lowMid: ir.features!.bandsPercent.lowMid,
        mid: ir.features!.bandsPercent.mid,
        highMid: ir.features!.bandsPercent.highMid,
        presence: ir.features!.bandsPercent.presence,
        ratio: ir.features!.bandsPercent.highMid / Math.max(ir.features!.bandsPercent.mid, 0.1),
        centroid: ir.features!.spectralCentroidHz || 0,
        smoothness: ir.features!.smoothScore || 0,
      }));
      const res = await apiRequest("POST", "/api/preferences/superblend/refine", {
        currentBlend: {
          speaker: result.blend.speaker,
          layers: activeLayers,
          expectedTone: activeTone,
        },
        feedback: refineText.trim(),
        irs: irData,
      });
      return res.json();
    },
    onSuccess: (raw: SuperblendResult & { questionAnswer?: string }) => {
      if (raw.questionAnswer && !raw.blend) {
        setAiAnswer(raw.questionAnswer);
        setRefineText("");
        return;
      }
      const irLookup = new Map<string, number[]>();
      for (const ir of speakerIRs) {
        const lbe = ir.metrics?.logBandEnergies;
        if (Array.isArray(lbe) && lbe.length >= 20) irLookup.set(ir.file.name, lbe);
      }
      const speakerLabel = selectedSpeaker === "__mixed__"
        ? speakers.map(([s]) => s).join(" + ")
        : selectedSpeaker;
      const data = irLookup.size >= 2
        ? optimizeSuperblendResult(raw, irLookup, speakerLabel, selectedIntent, hasActiveNudges(toneNudges) ? toneNudges : undefined)
        : snapSuperblendResult(raw);
      setAiAnswer(null);
      setResult(data);
      setActiveBlend("primary");
      setRefineText("");
      toast({ title: "Blend refined", description: data.changesSummary || "Blend updated based on your feedback." });
    },
    onError: () => {
      toast({ title: "Refinement failed", description: "Could not refine blend. Try again.", variant: "destructive", duration: 3000 });
    },
  });

  const displayBlend = activeBlend === "primary" ? result?.blend
    : activeBlend === "equal" ? result?.equalPartsBlend
    : result?.alternatives?.[activeBlend as number] ? { ...result.alternatives[activeBlend as number], rationale: "", bestFor: "" }
    : null;
  const isEqualParts = activeBlend === "equal";
  const hasEqualPartsOption = !!result?.equalPartsBlend;

  const bestPicks = useMemo(() => {
    if (Object.keys(allResults).length === 0) return null;
    return getBestBlendKeys(allResults, selectedSpeaker);
  }, [allResults, selectedSpeaker]);

  const isIntentBest = (blendKey: string) => bestPicks?.perIntent[selectedIntent] === blendKey;
  const isOverallBest = (blendKey: string) => bestPicks?.overallIntent === selectedIntent && bestPicks?.overallKey === blendKey;

  const copyBlend = () => {
    if (!displayBlend) return;
    const lines = [
      `Superblend: ${displayBlend.name}`,
      `Speaker: ${result?.blend.speaker}`,
      `Versatility: ${displayBlend.versatilityScore}/100`,
      "",
      "Layers:",
      ...displayBlend.layers.map((l, i) => `  ${i + 1}. ${l.filename} — ${l.percentage}% (${l.role}): ${l.contribution}`),
    ];
    lines.push(
      "",
      `Expected Tone: ${displayBlend.expectedTone}`,
      ...(displayBlend.bandBreakdown ? [`Band Breakdown: Sub ${displayBlend.bandBreakdown.subBass}% | Bass ${displayBlend.bandBreakdown.bass}% | LowMid ${displayBlend.bandBreakdown.lowMid}% | Mid ${displayBlend.bandBreakdown.mid}% | HiMid ${displayBlend.bandBreakdown.highMid}% | Presence ${displayBlend.bandBreakdown.presence}%`] : []),
    );
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [copiedAll, setCopiedAll] = useState(false);
  const copyAllBlends = () => {
    const resultsToExport = Object.keys(allResults).length > 0 ? allResults : result ? { [selectedIntent]: result } : null;
    if (!resultsToExport) return;
    const formatBlend = (label: string, b: { name: string; layers: SuperblendLayer[]; bandBreakdown: any; expectedTone: string }) => {
      const lines = [
        `── ${label}: ${b.name} ──`,
        ...b.layers.map((l, i) => `${i + 1}. ${l.filename} — ${l.percentage}% (${l.role})`),
        b.bandBreakdown ? `  Bands: Sub ${b.bandBreakdown.subBass}% | Bass ${b.bandBreakdown.bass}% | LoMid ${b.bandBreakdown.lowMid}% | Mid ${b.bandBreakdown.mid}% | HiMid ${b.bandBreakdown.highMid}% | Pres ${b.bandBreakdown.presence}%` : "",
        `  Tone: ${b.expectedTone}`,
      ];
      return lines.filter(Boolean).join("\n");
    };
    const speakerName = Object.values(resultsToExport)[0]?.blend?.speaker || selectedSpeaker;
    const sections = [`Superblend — ${speakerName}`];
    for (const intent of SUPERBLEND_INTENTS) {
      const r = resultsToExport[intent.value];
      if (!r) continue;
      sections.push("", `═══ ${intent.label.toUpperCase()} ═══`);
      sections.push(formatBlend("Primary", r.blend));
      if (r.equalPartsBlend) {
        sections.push("", formatBlend("Equal Parts", r.equalPartsBlend));
      }
      r.alternatives?.forEach((alt, i) => {
        sections.push("", formatBlend(`Alt ${i + 1}`, alt as any));
      });
    }
    navigator.clipboard.writeText(sections.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  if (allIRs.length < 3) return null;

  if (!open) {
    return (
      <div className="mt-6">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
          data-testid="button-open-superblend-pairing"
        >
          <Layers className="w-4 h-4" />
          Superblend — Create a definitive multi-IR blend (3-8 IRs)
        </button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 glass-panel p-6 rounded-2xl border border-amber-500/20" data-testid="superblend-section-pairing">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Layers className="w-6 h-6 text-amber-400" />
          Superblend
          <span className="text-xs font-normal text-muted-foreground ml-1">Multi-IR</span>
        </h2>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-close-superblend-pairing">
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Create a definitive multi-IR blend for a speaker — 3 to 8 IRs mixed at precise ratios for plugins like Cabinetron, NadIR, or any multi-IR loader.
        Each IR fills a specific tonal role to capture the full character of the speaker.
      </p>

      <div className="flex gap-2 flex-wrap mb-4">
        {SUPERBLEND_INTENTS.map(intent => {
          const hasResult = !!allResults[intent.value];
          const isActive = selectedIntent === intent.value;
          return (
            <button
              key={intent.value}
              onClick={() => { setSelectedIntent(intent.value); setActiveBlend("primary"); setAiAnswer(null); }}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                isActive ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : hasResult ? "bg-white/5 text-foreground border-white/20 hover:border-amber-500/30"
                : "bg-white/5 text-muted-foreground border-white/10 hover:border-amber-500/30"
              )}
              title={intent.description}
              data-testid={`button-intent-pairing-${intent.value}`}
            >
              {intent.label}
              {hasResult && bestPicks?.overallIntent === intent.value && <span className="ml-1 text-amber-400" title="Contains your best overall match">★★</span>}
              {hasResult && bestPicks?.overallIntent !== intent.value && !isActive && <span className="ml-1 text-green-400/70">●</span>}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Speaker</label>
          <select
            value={selectedSpeaker}
            onChange={(e) => { setSelectedSpeaker(e.target.value); setAllResults({}); }}
            className="w-full h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm"
            data-testid="select-superblend-speaker-pairing"
          >
            {speakers.length >= 2 && (
              <option value="__mixed__">Mixed — All Speakers ({allIRs.length} IRs)</option>
            )}
            {speakers.map(([s, irs]) => (
              <option key={s} value={s}>{s} ({irs.length} IRs)</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">IRs in blend</label>
          <select
            value={irCount}
            onChange={(e) => setIrCount(parseInt(e.target.value))}
            className="w-full h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm"
            data-testid="select-superblend-count-pairing"
          >
            {[3, 4, 5, 6, 7, 8].filter(n => n <= speakerIRs.length).map(n => (
              <option key={n} value={n}>{n} IRs</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Extra tone goal (optional)</label>
          <input
            type="text"
            value={toneGoal}
            onChange={(e) => setToneGoal(e.target.value)}
            placeholder="e.g., more low-end, less fizz..."
            className="w-full h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm placeholder:text-muted-foreground"
            data-testid="input-superblend-goal-pairing"
          />
        </div>
      </div>

      <div className="mb-3">
        <button
          onClick={() => setShowExperiment(!showExperiment)}
          className={cn(
            "flex items-center gap-1.5 text-[10px] font-medium transition-colors",
            hasActiveNudges(toneNudges)
              ? "text-violet-400 hover:text-violet-300"
              : "text-muted-foreground hover:text-foreground"
          )}
          data-testid="button-toggle-tone-experiment-pairing"
        >
          <SlidersHorizontal className="w-3 h-3" />
          Tone Experiment
          {hasActiveNudges(toneNudges) && <span className="ml-1 px-1 py-0.5 rounded bg-violet-500/20 text-violet-300 text-[9px]">active</span>}
          {showExperiment ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {showExperiment && (
          <div className="mt-2 p-3 rounded-lg border border-violet-500/20 bg-violet-500/5" data-testid="panel-tone-experiment-pairing">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-violet-300">Adjust tonal bias without affecting your learned preferences</span>
              <button
                onClick={() => setToneNudges({})}
                className="text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                data-testid="button-reset-nudges-pairing"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Reset
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {NUDGE_LABELS.map(({ key, label, description }) => (
                <div key={key} className="flex items-center gap-2" data-testid={`nudge-pairing-${key}`}>
                  <span className="text-[9px] text-muted-foreground w-16 shrink-0" title={description}>{label}</span>
                  <input
                    type="range"
                    min={-3}
                    max={3}
                    step={0.5}
                    value={toneNudges[key] || 0}
                    onChange={(e) => setToneNudges(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                    className="w-full h-1.5 accent-violet-500"
                    data-testid={`slider-nudge-pairing-${key}`}
                  />
                  <span className={cn(
                    "text-[9px] font-mono w-6 text-right shrink-0",
                    (toneNudges[key] || 0) > 0 ? "text-green-400" : (toneNudges[key] || 0) < 0 ? "text-red-400" : "text-muted-foreground"
                  )}>
                    {(toneNudges[key] || 0) > 0 ? "+" : ""}{toneNudges[key] || 0}
                  </span>
                </div>
              ))}
            </div>
            {hasActiveNudges(toneNudges) && Object.keys(allResults).length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3 w-full border-violet-500/30 text-violet-300"
                disabled={isReoptimizing}
                onClick={async () => {
                  setIsReoptimizing(true);
                  try {
                    const metricsMap = new Map<string, AudioMetrics>();
                    for (const ir of speakerIRs) {
                      if (ir.metrics) metricsMap.set(ir.file.name, ir.metrics);
                    }

                    const poolData = speakerIRs.filter(ir => ir.metrics).map(ir => ({
                      filename: ir.file.name,
                      subBassEnergy: ir.metrics!.subBassEnergy,
                      bassEnergy: ir.metrics!.bassEnergy,
                      lowMidEnergy: ir.metrics!.lowMidEnergy,
                      midEnergy6: ir.metrics!.midEnergy6,
                      highMidEnergy: ir.metrics!.highMidEnergy,
                      presenceEnergy: ir.metrics!.presenceEnergy,
                      ultraHighEnergy: ir.metrics!.ultraHighEnergy,
                    }));

                    const speakerLabel = selectedSpeaker === "__mixed__" ? speakers.map(([s]) => s).join(" + ") : selectedSpeaker;
                    const reoptimized: Record<string, SuperblendResult> = {};
                    let totalSwaps = 0;

                    for (const [intent, res] of Object.entries(allResults)) {
                      const layersWithEnergy = res.blend.layers.map(l => {
                        const m = metricsMap.get(l.filename);
                        return {
                          filename: l.filename,
                          percentage: l.percentage,
                          role: l.role,
                          contribution: l.contribution,
                          subBassEnergy: m?.subBassEnergy || 0,
                          bassEnergy: m?.bassEnergy || 0,
                          lowMidEnergy: m?.lowMidEnergy || 0,
                          midEnergy6: m?.midEnergy6 || 0,
                          highMidEnergy: m?.highMidEnergy || 0,
                          presenceEnergy: m?.presenceEnergy || 0,
                          ultraHighEnergy: m?.ultraHighEnergy || 0,
                        };
                      });

                      const response = await fetch(api.superblendReoptimize.reoptimize.path, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          layers: layersWithEnergy,
                          pool: poolData,
                          nudges: toneNudges,
                          speaker: speakerLabel,
                          intent,
                          irCount,
                        }),
                      });

                      if (!response.ok) throw new Error("Re-optimize failed");
                      const data = await response.json();
                      if (data.swaps) totalSwaps += data.swaps.length;

                      const updatedLayers: SuperblendLayer[] = data.layers.map((l: any) => ({
                        filename: l.filename,
                        percentage: l.percentage,
                        role: l.role,
                        contribution: l.contribution || res.blend.layers.find((ol: any) => ol.filename === l.filename)?.contribution || "",
                      }));

                      reoptimized[intent] = {
                        ...res,
                        blend: { ...res.blend, layers: updatedLayers, bandBreakdown: data.bandBreakdown },
                      };
                    }

                    setAllResults(reoptimized);
                    const swapMsg = totalSwaps > 0 ? ` (${totalSwaps} IR swap${totalSwaps > 1 ? "s" : ""} made)` : "";
                    toast({ title: "Re-optimized", description: `Server-side recalculation complete${swapMsg}. Band breakdowns updated.` });
                  } catch (e) {
                    console.error("Server reoptimize failed:", e);
                    toast({ title: "Re-optimize failed", description: "Could not reach the server. Try again.", variant: "destructive" });
                  } finally {
                    setIsReoptimizing(false);
                  }
                }}
                data-testid="button-reoptimize-nudges-pairing"
              >
                {isReoptimizing ? (
                  <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Re-optimizing...</>
                ) : (
                  <><SlidersHorizontal className="w-3 h-3 mr-1.5" /> Re-optimize with these adjustments</>
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      <IRCountAdvisor irs={speakerIRs.map(ir => ({ filename: ir.file.name, bandsPercent: ir.features!.bandsPercent }))} intent={selectedIntent as any} compact superblendBands={displayBlend?.bandBreakdown} />

      <div className="flex items-center gap-3 mb-4 mt-3">
        <button
          onClick={() => generateMutation.mutate()}
          disabled={isGenerating || generateMutation.isPending || speakerIRs.length < 3}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-sm font-medium text-amber-300 transition-all disabled:opacity-50"
          data-testid="button-generate-superblend-pairing"
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Crafting {Object.keys(allResults).length}/{SUPERBLEND_INTENTS.length}...</>
          ) : (
            <><Layers className="w-4 h-4" /> Generate All Intents</>
          )}
        </button>
        {savedBlends.length > 0 && (
          <button
            onClick={() => setShowSaved(!showSaved)}
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300"
            data-testid="button-toggle-saved-superblends-pairing"
          >
            <Star className="w-3.5 h-3.5" />
            {savedBlends.length} saved
          </button>
        )}
      </div>

      <AnimatePresence>
        {showSaved && savedBlends.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4 space-y-3" data-testid="saved-superblends-pairing">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              Saved Superblends ({savedBlends.length})
            </label>
            {savedBlends.map(sb => (
              <div key={sb.id} className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-3 space-y-1.5" data-testid={`saved-superblend-pairing-${sb.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold text-foreground">{sb.name}</span>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">{sb.speaker}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">{SUPERBLEND_INTENTS.find(i => i.value === sb.intent)?.label || sb.intent}</span>
                      <span className="text-[10px] text-muted-foreground">{sb.versatilityScore}/100</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        const lines = [`Superblend: ${sb.name}`, `Speaker: ${sb.speaker}`, `Intent: ${sb.intent}`, "", "Layers:", ...sb.layers.map(l => `  ${l.filename} — ${l.percentage}% (${l.role})`), "", `Tone: ${sb.expectedTone}`];
                        navigator.clipboard.writeText(lines.join("\n"));
                        toast({ title: "Copied", description: "Superblend recipe copied." });
                      }}
                      className="text-muted-foreground hover:text-foreground"
                      data-testid={`button-copy-saved-pairing-${sb.id}`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeSaved(sb.id)} className="text-muted-foreground hover:text-destructive" data-testid={`button-remove-saved-pairing-${sb.id}`}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sb.layers.map((l, i) => (
                    <span key={i} className="text-[10px] text-muted-foreground font-mono">{l.percentage}% {l.filename.replace(/\.wav$/i, "").split("_").slice(1).join("_") || l.filename}</span>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setActiveBlend("primary")}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all", activeBlend === "primary" ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-white/5 text-muted-foreground border-white/10 hover:border-amber-500/30")}
                data-testid="button-superblend-primary-pairing"
              >
                <Layers className="w-3 h-3 inline mr-1" />
                {result.blend.name}
                {isOverallBest("primary") ? <span className="ml-1 text-amber-400" title="Best match for your preferences overall">★★</span> : isIntentBest("primary") ? <span className="ml-1 text-amber-400/70" title="Best match for your preferences in this intent">★</span> : null}
              </button>
              {hasEqualPartsOption && (
                <button
                  onClick={() => setActiveBlend("equal")}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all", activeBlend === "equal" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-white/5 text-muted-foreground border-white/10 hover:border-cyan-500/30")}
                  data-testid="button-superblend-equal-pairing"
                >
                  <Target className="w-3 h-3 inline mr-1" />
                  Equal Parts
                  {isOverallBest("equal") ? <span className="ml-1 text-amber-400" title="Best match for your preferences overall">★★</span> : isIntentBest("equal") ? <span className="ml-1 text-amber-400/70" title="Best match for your preferences in this intent">★</span> : null}
                </button>
              )}
              {result.alternatives?.map((alt, i) => (
                <button
                  key={i}
                  onClick={() => setActiveBlend(i)}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all", activeBlend === i ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-white/5 text-muted-foreground border-white/10 hover:border-amber-500/30")}
                  data-testid={`button-superblend-alt-pairing-${i}`}
                >
                  {alt.name} <span className="opacity-60 ml-1">({alt.focus})</span>
                  {isOverallBest(String(i)) ? <span className="ml-1 text-amber-400" title="Best match for your preferences overall">★★</span> : isIntentBest(String(i)) ? <span className="ml-1 text-amber-400/70" title="Best match for your preferences in this intent">★</span> : null}
                </button>
              ))}
            </div>

            {displayBlend && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-4" data-testid="superblend-result-pairing">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground" data-testid="text-superblend-name-pairing">{displayBlend.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400" data-testid="badge-versatility-pairing">{displayBlend.versatilityScore}/100 versatility</span>
                      {(displayBlend as any).bestFor && <span className="text-xs text-muted-foreground">Best for: {(displayBlend as any).bestFor}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={saveCurrentBlend} className="text-amber-400 hover:text-amber-300 transition-colors" title="Save to collection" data-testid="button-save-superblend-pairing">
                      <Star className="w-4 h-4" />
                    </button>
                    <button onClick={copyBlend} className="text-muted-foreground hover:text-foreground transition-colors" title="Copy this blend" data-testid="button-copy-superblend-pairing">
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button onClick={copyAllBlends} className="text-muted-foreground hover:text-foreground transition-colors" title="Copy all versions" data-testid="button-copy-all-superblend-pairing">
                      {copiedAll ? <Check className="w-4 h-4 text-green-400" /> : <List className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="flex-1 space-y-1.5" data-testid="superblend-layers-pairing">
                    {displayBlend.layers.map((layer, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm" data-testid={`superblend-layer-pairing-${i}`}>
                        <span className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs font-mono font-semibold text-white/80 shrink-0">{i + 1}</span>
                        <div className={cn("w-12 text-right font-mono font-semibold", isEqualParts ? "text-cyan-300" : "text-amber-300")}>{layer.percentage}%</div>
                        <div className="flex-1 h-6 bg-amber-500/10 rounded-full overflow-hidden relative">
                          <div className={cn("h-full rounded-full", isEqualParts ? "bg-cyan-500/30" : "bg-amber-500/30")} style={{ width: `${layer.percentage}%` }} />
                          <span className="absolute inset-0 flex items-center px-3 text-xs text-foreground truncate">{layer.filename}</span>
                        </div>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-white/10 text-muted-foreground shrink-0">{layer.role}</span>
                      </div>
                    ))}
                  </div>
                  {displayBlend.layers.length >= 3 && (
                    <PolygonMixerDiagram
                      ratios={displayBlend.layers.map(l => l.percentage)}
                      labels={displayBlend.layers.map(l => l.filename.replace(/\.wav$/i, ""))}
                      isEqualParts={isEqualParts}
                      size={140}
                    />
                  )}
                </div>

                {displayBlend.bandBreakdown && (
                  <div className="grid grid-cols-6 gap-2 text-center" data-testid="superblend-bands-pairing">
                    {(["subBass", "bass", "lowMid", "mid", "highMid", "presence"] as const).map(band => (
                      <div key={band}>
                        <div className="text-[10px] text-muted-foreground">{band === "subBass" ? "Sub" : band === "lowMid" ? "LoMid" : band === "highMid" ? "HiMid" : band.charAt(0).toUpperCase() + band.slice(1)}</div>
                        <div className={cn("font-mono font-semibold text-sm", isEqualParts ? "text-cyan-300" : "text-foreground")}>{displayBlend.bandBreakdown[band]}%</div>
                      </div>
                    ))}
                  </div>
                )}
                {isEqualParts && <p className="text-[10px] text-cyan-400/60 mt-1">AI-optimized IR selection for equal parts — center dot on the geometric mixer</p>}

                <p className="text-sm text-muted-foreground" data-testid="text-superblend-tone-pairing">{displayBlend.expectedTone}</p>
                {(displayBlend as any).rationale && <p className="text-xs text-muted-foreground/70" data-testid="text-superblend-rationale-pairing">{(displayBlend as any).rationale}</p>}
              </div>
            )}

            <div className="pt-3 border-t border-amber-500/10">
              <label className="text-xs text-muted-foreground block mb-2">Ask a question, leave a comment, or request changes</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={refineText}
                  onChange={(e) => { setRefineText(e.target.value); if (aiAnswer) setAiAnswer(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && refineText.trim()) refineMutation.mutate(); }}
                  placeholder="e.g., why this IR? / nice blend / needs more low-mid body..."
                  className="flex-1 h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  disabled={refineMutation.isPending}
                  data-testid="input-superblend-refine-pairing"
                />
                <button
                  onClick={() => refineMutation.mutate()}
                  disabled={!refineText.trim() || refineMutation.isPending}
                  className="h-9 px-3 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 disabled:opacity-50 transition-all"
                  data-testid="button-superblend-refine-pairing"
                >
                  {refineMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              {aiAnswer && (
                <div className="mt-2 p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20" data-testid="text-superblend-ai-answer">
                  <p className="text-xs text-violet-200 leading-relaxed">{aiAnswer}</p>
                </div>
              )}
              {result.changesSummary && !aiAnswer && (
                <p className="text-xs text-green-400 mt-2" data-testid="text-superblend-changes-pairing">{result.changesSummary}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
