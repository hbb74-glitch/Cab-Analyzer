import { useState, useCallback, useMemo, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Layers, FileAudio, Trash2, Zap, Music4, Copy, Check, Plus, Target, List, Heart, X, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ShotIntentBadge } from "@/components/ShotIntentBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useResults } from "@/context/ResultsContext";
import { analyzeAudioFile, type AudioMetrics } from "@/hooks/use-analyses";
import { computeTonalFeatures } from "@/lib/tonal-engine";
import { PairingBlendPreview, type BlendPreviewIR } from "@/components/BlendPreview";
import { DEFAULT_PROFILES, applyLearnedAdjustments, computeSpeakerRelativeProfiles, parseGearFromFilename, type TonalFeatures, type LearnedProfileData } from "@/lib/preference-profiles";
import { getSoloCategoriesForPairing, getIRWinRecordsPlain, getEloRatingsPlain, getSettledCombos, featurizeBlend, recordOutcome, recordIROutcome, recordEloOutcome, type TasteContext } from "@/lib/tasteStore";
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
    recordBlendFeedback(pairing, false);

    if (result && replacementQueue.length > 0) {
      const replacement = replacementQueue[0];
      setReplacementQueue(prev => prev.slice(1));
      const newPairings = [...result.pairings];
      newPairings[index] = replacement;
      setResult({ ...result, pairings: newPairings });
      setPairRefine(prev => { const n = { ...prev }; delete n[index]; return n; });
      toast({ title: "Blend replaced", description: `Swapped in: ${replacement.ir1} + ${replacement.ir2}` });
    } else {
      setPassed(prev => {
        const next = new Set(prev);
        next.add(index);
        return next;
      });
      setPairRefine(prev => ({ ...prev, [index]: { ir1: pairing.ir1, ir2: pairing.ir2, ratio: pairing.mixRatio || "50/50", submitted: false } }));
      toast({ title: "Blend passed", description: "No more replacements available." });
    }
    setFavorites(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, [recordBlendFeedback, toast, result, replacementQueue, setResult]);

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
    const ctx = buildTasteContext();
    const refFeat1 = lookupFeatures(ref.ir1);
    const refFeat2 = lookupFeatures(ref.ir2);
    if (refFeat1 && refFeat2) {
      const blended = featurizeBlend(refFeat1, refFeat2, ratioVal);
      recordOutcome(ctx, blended, "love", undefined, ["pairing_refined", "pairing_improved"]);
    }
    const origFeat1 = lookupFeatures(originalPairing.ir1);
    const origFeat2 = lookupFeatures(originalPairing.ir2);
    if (origFeat1 && origFeat2) {
      const origRatio = originalPairing.mixRatio?.split("/").map(Number);
      const origRatioVal = origRatio ? origRatio[0] / 100 : 0.5;
      const origBlend = featurizeBlend(origFeat1, origFeat2, origRatioVal);
      recordOutcome(ctx, origBlend, "meh", undefined, ["pairing_refined"]);
    }
    const signals: any[] = [];
    const refIr2Bands = lookupBands(ref.ir2);
    if (refIr2Bands) {
      signals.push({
        baseFilename: ref.ir1, featureFilename: ref.ir2, action: 'love',
        subBass: refIr2Bands.subBass, bass: refIr2Bands.bass, lowMid: refIr2Bands.lowMid,
        mid: refIr2Bands.mid, highMid: refIr2Bands.highMid, presence: refIr2Bands.presence,
        ratio: ratioVal, score: 0, profileMatch: '', tags: ['pairing_refined'],
      });
    }
    const origIr2Bands = lookupBands(originalPairing.ir2);
    if (origIr2Bands) {
      const origRatio2 = originalPairing.mixRatio?.split("/").map(Number);
      signals.push({
        baseFilename: originalPairing.ir1, featureFilename: originalPairing.ir2, action: 'meh',
        subBass: origIr2Bands.subBass, bass: origIr2Bands.bass, lowMid: origIr2Bands.lowMid,
        mid: origIr2Bands.mid, highMid: origIr2Bands.highMid, presence: origIr2Bands.presence,
        ratio: origRatio2 ? origRatio2[0] / 100 : 0.5, score: 0, profileMatch: '', tags: ['pairing_improved'],
      });
    }
    if (signals.length > 0) {
      apiRequest("POST", "/api/preferences/signals", { signals }).then(() => {
        queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/preferences/") });
      }).catch(() => {});
    }
    setPairRefine(prev => ({ ...prev, [index]: { ...ref, submitted: true } }));
    toast({ title: "Refined blend saved", description: `${ref.ir1} + ${ref.ir2} (${ref.ratio}) saved as favorite.` });
  }, [pairRefine, buildTasteContext, lookupFeatures, lookupBands, toast]);

  const handleRefineCouldntImprove = useCallback((index: number, originalPairing: PairingResult) => {
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
        ratio: ratioParts ? ratioParts[0] / 100 : 0.5, score: 0, profileMatch: '', tags: ['pairing_unfixable'],
      }]}).then(() => {
        queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/preferences/") });
      }).catch(() => {});
    }
    setPairRefine(prev => ({ ...prev, [index]: { ...(prev[index] || { ir1: originalPairing.ir1, ir2: originalPairing.ir2, ratio: originalPairing.mixRatio || "50/50" }), submitted: true } }));
    toast({ title: "Noted", description: "This pairing was marked as unfixable." });
  }, [buildTasteContext, lookupFeatures, lookupBands, toast]);

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
      </div>
    </div>
  );
}
