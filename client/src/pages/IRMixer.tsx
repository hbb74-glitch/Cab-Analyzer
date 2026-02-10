import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Layers, X, Blend, ChevronDown, ChevronUp, Crown, Target, Zap, Sparkles, Trophy, Brain, ArrowLeftRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { analyzeAudioFile, type AudioMetrics } from "@/hooks/use-analyses";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  type TonalBands,
  type MatchResult,
  type SuggestedPairing,
  type LearnedProfileData,
  type TasteCheckRoundResult,
  type TasteConfidence,
  scoreAgainstAllProfiles,
  findFoundationIR,
  rankBlendPartners,
  suggestPairings,
  pickTasteCheckCandidates,
  getTasteConfidence,
  getTasteCheckRounds,
  shouldContinueTasteCheck,
  applyLearnedAdjustments,
  DEFAULT_PROFILES,
  getSpeakerFilenamePrefix,
} from "@/lib/preference-profiles";

interface AnalyzedIR {
  filename: string;
  metrics: AudioMetrics;
  rawEnergy: TonalBands;
  bands: TonalBands;
}

const BAND_COLORS = [
  { label: "SubBass", key: "subBass" as const, color: "bg-purple-500" },
  { label: "Bass", key: "bass" as const, color: "bg-blue-500" },
  { label: "LowMid", key: "lowMid" as const, color: "bg-cyan-500" },
  { label: "Mid", key: "mid" as const, color: "bg-green-500" },
  { label: "HiMid", key: "highMid" as const, color: "bg-yellow-500" },
  { label: "Presence", key: "presence" as const, color: "bg-orange-500" },
];

const BLEND_RATIOS = [
  { label: "70/30", base: 0.7, feature: 0.3 },
  { label: "60/40", base: 0.6, feature: 0.4 },
  { label: "50/50", base: 0.5, feature: 0.5 },
  { label: "40/60", base: 0.4, feature: 0.6 },
  { label: "30/70", base: 0.3, feature: 0.7 },
];

function extractRawEnergy(m: AudioMetrics): TonalBands {
  return {
    subBass: m.subBassEnergy,
    bass: m.bassEnergy,
    lowMid: m.lowMidEnergy,
    mid: m.midEnergy6,
    highMid: m.highMidEnergy,
    presence: m.presenceEnergy,
  };
}

function energyToPercent(raw: TonalBands): TonalBands {
  const total = raw.subBass + raw.bass + raw.lowMid + raw.mid + raw.highMid + raw.presence;
  if (total === 0) return { subBass: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, presence: 0 };
  return {
    subBass: Math.round((raw.subBass / total) * 1000) / 10,
    bass: Math.round((raw.bass / total) * 1000) / 10,
    lowMid: Math.round((raw.lowMid / total) * 1000) / 10,
    mid: Math.round((raw.mid / total) * 1000) / 10,
    highMid: Math.round((raw.highMid / total) * 1000) / 10,
    presence: Math.round((raw.presence / total) * 1000) / 10,
  };
}

function blendFromRaw(
  baseRaw: TonalBands,
  featureRaw: TonalBands,
  baseRatio: number,
  featureRatio: number
): TonalBands {
  const blendedRaw: TonalBands = {
    subBass: baseRaw.subBass * baseRatio + featureRaw.subBass * featureRatio,
    bass: baseRaw.bass * baseRatio + featureRaw.bass * featureRatio,
    lowMid: baseRaw.lowMid * baseRatio + featureRaw.lowMid * featureRatio,
    mid: baseRaw.mid * baseRatio + featureRaw.mid * featureRatio,
    highMid: baseRaw.highMid * baseRatio + featureRaw.highMid * featureRatio,
    presence: baseRaw.presence * baseRatio + featureRaw.presence * featureRatio,
  };
  return energyToPercent(blendedRaw);
}

function MatchBadge({ match }: { match: MatchResult }) {
  const colorMap = {
    strong: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    close: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    partial: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    miss: "bg-white/5 text-muted-foreground border-white/10",
  };
  const iconMap = {
    strong: Target,
    close: Target,
    partial: Zap,
    miss: Zap,
  };
  const Icon = iconMap[match.label];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border", colorMap[match.label])} data-testid={`badge-match-${match.profile.toLowerCase()}`}>
      <Icon className="w-2.5 h-2.5" />
      {match.profile} {match.score}
    </span>
  );
}

function ProfileScores({ bands, profiles }: { bands: TonalBands; profiles?: import("@/lib/preference-profiles").PreferenceProfile[] }) {
  const { results } = scoreAgainstAllProfiles(bands, profiles);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {results.map((r) => (
        <MatchBadge key={r.profile} match={r} />
      ))}
    </div>
  );
}

function BandChart({ bands, height = 20, compact = false, showScores = false, profiles }: { bands: TonalBands; height?: number; compact?: boolean; showScores?: boolean; profiles?: import("@/lib/preference-profiles").PreferenceProfile[] }) {
  const hiMidMidRatio = bands.mid > 0 ? Math.round((bands.highMid / bands.mid) * 100) / 100 : 0;
  return (
    <div className="space-y-1">
      <div className={cn("grid grid-cols-6 gap-1", compact ? "text-[9px]" : "text-xs")}>
        {BAND_COLORS.map((band) => (
          <div key={band.key} className="flex flex-col items-center">
            <div className={cn("w-full bg-white/5 rounded overflow-hidden flex flex-col-reverse")} style={{ height: `${height * 4}px` }}>
              <div
                className={cn(band.color, "w-full transition-all")}
                style={{ height: `${Math.min(bands[band.key], 100)}%` }}
              />
            </div>
            <span className="text-muted-foreground mt-0.5">{compact ? band.label.slice(0, 3) : band.label}</span>
            <span className="text-foreground font-mono">{bands[band.key].toFixed(1)}%</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className={cn(
          "text-xs font-mono px-2 py-0.5 rounded",
          hiMidMidRatio < 1.0 ? "bg-blue-500/20 text-blue-400" :
          hiMidMidRatio <= 2.0 ? "bg-green-500/20 text-green-400" :
          "bg-amber-500/20 text-amber-400"
        )}>
          HiMid/Mid: {hiMidMidRatio.toFixed(2)}
          {hiMidMidRatio < 1.0 ? " (dark)" : hiMidMidRatio > 2.0 ? " (bright)" : ""}
        </span>
        {showScores && <ProfileScores bands={bands} profiles={profiles} />}
      </div>
    </div>
  );
}

function DropZone({
  label,
  description,
  onFilesAdded,
  isLoading,
  multiple = true,
}: {
  label: string;
  description: string;
  onFilesAdded: (files: File[]) => void;
  isLoading: boolean;
  multiple?: boolean;
}) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const wavFiles = acceptedFiles.filter((f) => f.name.toLowerCase().endsWith(".wav"));
    if (wavFiles.length > 0) onFilesAdded(wavFiles);
  }, [onFilesAdded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "audio/wav": [".wav"] },
    disabled: isLoading,
    multiple,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
        isDragActive ? "border-primary bg-primary/5" : "border-white/10",
        isLoading && "opacity-50 pointer-events-none"
      )}
      data-testid={`dropzone-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <input {...getInputProps()} />
      <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

export default function IRMixer() {
  const { toast } = useToast();
  const [baseIR, setBaseIR] = useState<AnalyzedIR | null>(null);
  const [featureIRs, setFeatureIRs] = useState<AnalyzedIR[]>([]);
  const [allIRs, setAllIRs] = useState<AnalyzedIR[]>([]);
  const [isLoadingBase, setIsLoadingBase] = useState(false);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState(2);
  const [expandedBlend, setExpandedBlend] = useState<string | null>(null);
  const [showFoundation, setShowFoundation] = useState(false);
  const [pairingRankings, setPairingRankings] = useState<Record<string, number>>({});
  const [pairingFeedback, setPairingFeedback] = useState<Record<string, string[]>>({});
  const [pairingFeedbackText, setPairingFeedbackText] = useState<Record<string, string>>({});
  const [dismissedPairings, setDismissedPairings] = useState<Set<string>>(new Set());
  const [evaluatedPairs, setEvaluatedPairs] = useState<Set<string>>(new Set());
  const [exposureCounts, setExposureCounts] = useState<Map<string, number>>(new Map());
  const [pairingRound, setPairingRound] = useState(0);
  const [totalRoundsCompleted, setTotalRoundsCompleted] = useState(0);
  const [cumulativeSignals, setCumulativeSignals] = useState({ liked: 0, noped: 0 });
  const [doneRefining, setDoneRefining] = useState(false);
  const [noMorePairs, setNoMorePairs] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [cabAIRs, setCabAIRs] = useState<AnalyzedIR[]>([]);
  const [cabBIRs, setCabBIRs] = useState<AnalyzedIR[]>([]);
  const [isLoadingCabA, setIsLoadingCabA] = useState(false);
  const [isLoadingCabB, setIsLoadingCabB] = useState(false);
  const [showCrossCab, setShowCrossCab] = useState(false);
  const [expandedCrossCab, setExpandedCrossCab] = useState<string | null>(null);
  const [crossCabRatio, setCrossCabRatio] = useState(2);
  const [crossCabRankings, setCrossCabRankings] = useState<Record<string, number>>({});
  const [crossCabFeedback, setCrossCabFeedback] = useState<Record<string, string[]>>({});
  const [crossCabFeedbackText, setCrossCabFeedbackText] = useState<Record<string, string>>({});
  const [crossCabDismissed, setCrossCabDismissed] = useState<Set<string>>(new Set());

  const [tasteCheckPhase, setTasteCheckPhase] = useState<{
    candidates: SuggestedPairing[];
    roundType: "quad" | "binary";
    axisName: string;
    axisLabels: [string, string];
    round: number;
    maxRounds: number;
    confidence: TasteConfidence;
    userPick: number | null;
    showingResult: boolean;
    history: TasteCheckRoundResult[];
    pendingRefineCandidates: { pair: SuggestedPairing; rank: number; baseRaw: TonalBands; featRaw: TonalBands }[];
    pendingLoadTopPick: boolean;
  } | null>(null);
  const [tasteCheckPassed, setTasteCheckPassed] = useState(false);
  const [tasteCheckMode, setTasteCheckMode] = useState<"auto" | "acquisition" | "tester">("auto");
  const [clearSpeakerConfirm, setClearSpeakerConfirm] = useState<string | null>(null);

  const tasteCheckRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tasteCheckPhase && tasteCheckPhase.userPick === null && tasteCheckRef.current) {
      tasteCheckRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [tasteCheckPhase]);

  const [ratioRefinePhase, setRatioRefinePhase] = useState<{
    stage: "select" | "refine" | "done";
    candidates: { pair: SuggestedPairing; rank: number; baseRaw: TonalBands; featRaw: TonalBands }[];
    selectedIdx: number | null;
    step: number;
    matchups: { a: number; b: number }[];
    winner: number | null;
    downgraded: boolean;
    pendingLoadTopPick: boolean;
  } | null>(null);

  const ratioRefineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ratioRefinePhase?.stage === "select" && ratioRefineRef.current) {
      ratioRefineRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [ratioRefinePhase?.stage]);

  const clearCrossCabRatings = useCallback(() => {
    setCrossCabRankings({});
    setCrossCabFeedback({});
    setCrossCabFeedbackText({});
    setCrossCabDismissed(new Set());
  }, []);

  const { data: learnedProfile } = useQuery<LearnedProfileData>({
    queryKey: ["/api/preferences/learned"],
  });

  const { data: existingSignals } = useQuery<any[]>({
    queryKey: ["/api/preferences/signals"],
  });

  useEffect(() => {
    if (!existingSignals || historyLoaded) return;
    const pairs = new Set<string>();
    const exposure = new Map<string, number>();
    let liked = 0;
    let noped = 0;
    for (const s of existingSignals) {
      const sortedKey = [s.baseFilename, s.featureFilename].sort().join("||");
      pairs.add(sortedKey);
      exposure.set(s.baseFilename, (exposure.get(s.baseFilename) ?? 0) + 1);
      exposure.set(s.featureFilename, (exposure.get(s.featureFilename) ?? 0) + 1);
      if (s.action === "nope") noped++;
      else liked++;
    }
    setEvaluatedPairs(pairs);
    setExposureCounts(exposure);
    setCumulativeSignals({ liked, noped });
    setHistoryLoaded(true);
  }, [existingSignals, historyLoaded]);

  const submitSignalsMutation = useMutation({
    mutationFn: async (signals: any[]) => {
      await apiRequest("POST", "/api/preferences/signals", { signals });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences/learned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/preferences/signals"] });
      toast({ title: `${variables.length} rating${variables.length !== 1 ? "s" : ""} saved`, duration: 2000 });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save ratings", description: error.message || "Your ratings were not saved. Please try again.", variant: "destructive", duration: 5000 });
    },
  });

  const clearSpeakerMutation = useMutation({
    mutationFn: async (speakerPrefix: string) => {
      const res = await apiRequest("DELETE", "/api/preferences/signals/speaker", { speakerPrefix });
      return res.json();
    },
    onSuccess: (_data, speakerPrefix) => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences/learned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/preferences/signals"] });
      setTasteCheckPassed(false);
      setTotalRoundsCompleted(0);
      setClearSpeakerConfirm(null);
      toast({ title: `Cleared learning for ${speakerPrefix} IRs`, description: "Preference data has been reset. Drop IRs again to start fresh.", duration: 3000 });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to clear learning", description: error.message, variant: "destructive", duration: 5000 });
      setClearSpeakerConfirm(null);
    },
  });

  const activeProfiles = useMemo(() => {
    if (!learnedProfile || learnedProfile.status === "no_data") return DEFAULT_PROFILES;
    return applyLearnedAdjustments(DEFAULT_PROFILES, learnedProfile);
  }, [learnedProfile]);

  const resetPairingState = useCallback(() => {
    setPairingRankings({});
    setPairingFeedback({});
    setPairingFeedbackText({});
    setDismissedPairings(new Set());
    setPairingRound(0);
    setTotalRoundsCompleted(0);
    setDoneRefining(false);
    setNoMorePairs(false);
    setHistoryLoaded(false);
    setTasteCheckPhase(null);
    setTasteCheckPassed(false);
    setExposureCounts(new Map());
  }, []);

  const handleBaseFile = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setIsLoadingBase(true);
    try {
      const file = files[0];
      const metrics = await analyzeAudioFile(file);
      const rawEnergy = extractRawEnergy(metrics);
      const bands = energyToPercent(rawEnergy);
      setBaseIR({ filename: file.name, metrics, rawEnergy, bands });
      resetPairingState();
    } catch (e) {
      console.error("Failed to analyze base IR:", e);
    }
    setIsLoadingBase(false);
  }, [resetPairingState]);

  const handleFeatureFiles = useCallback(async (files: File[]) => {
    setIsLoadingFeatures(true);
    try {
      const results: AnalyzedIR[] = [];
      for (const file of files) {
        const metrics = await analyzeAudioFile(file);
        const rawEnergy = extractRawEnergy(metrics);
        const bands = energyToPercent(rawEnergy);
        results.push({ filename: file.name, metrics, rawEnergy, bands });
      }
      setFeatureIRs((prev) => [...prev, ...results]);
      resetPairingState();
    } catch (e) {
      console.error("Failed to analyze feature IRs:", e);
    }
    setIsLoadingFeatures(false);
  }, [resetPairingState]);

  const handleAllFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setIsLoadingAll(true);
    setShowFoundation(true);
    resetPairingState();
    try {
      const results: AnalyzedIR[] = [];
      for (const file of files) {
        const metrics = await analyzeAudioFile(file);
        const rawEnergy = extractRawEnergy(metrics);
        const bands = energyToPercent(rawEnergy);
        results.push({ filename: file.name, metrics, rawEnergy, bands });
      }
      setAllIRs(results);
    } catch (e) {
      console.error("Failed to analyze IRs:", e);
    }
    setIsLoadingAll(false);
  }, [resetPairingState]);

  const removeFeature = useCallback((idx: number) => {
    setFeatureIRs((prev) => prev.filter((_, i) => i !== idx));
    resetPairingState();
  }, [resetPairingState]);

  const handleCabAFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setIsLoadingCabA(true);
    setShowCrossCab(true);
    clearCrossCabRatings();
    try {
      const results: AnalyzedIR[] = [];
      for (const file of files) {
        const metrics = await analyzeAudioFile(file);
        const rawEnergy = extractRawEnergy(metrics);
        const bands = energyToPercent(rawEnergy);
        results.push({ filename: file.name, metrics, rawEnergy, bands });
      }
      setCabAIRs(results);
    } catch (e) {
      console.error("Failed to analyze Cabinet A IRs:", e);
    }
    setIsLoadingCabA(false);
  }, [clearCrossCabRatings]);

  const handleCabBFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setIsLoadingCabB(true);
    setShowCrossCab(true);
    clearCrossCabRatings();
    try {
      const results: AnalyzedIR[] = [];
      for (const file of files) {
        const metrics = await analyzeAudioFile(file);
        const rawEnergy = extractRawEnergy(metrics);
        const bands = energyToPercent(rawEnergy);
        results.push({ filename: file.name, metrics, rawEnergy, bands });
      }
      setCabBIRs(results);
    } catch (e) {
      console.error("Failed to analyze Cabinet B IRs:", e);
    }
    setIsLoadingCabB(false);
  }, [clearCrossCabRatings]);

  const currentRatio = BLEND_RATIOS[selectedRatio];

  const foundationResults = useMemo(() => {
    if (allIRs.length === 0) return [];
    return findFoundationIR(allIRs, activeProfiles);
  }, [allIRs, activeProfiles]);

  const blendPartnerResults = useMemo(() => {
    if (!baseIR || featureIRs.length === 0) return [];
    return rankBlendPartners(baseIR, featureIRs, BLEND_RATIOS, activeProfiles, learnedProfile || undefined);
  }, [baseIR, featureIRs, activeProfiles, learnedProfile]);

  const pairingPool = useMemo(() => {
    if (allIRs.length >= 2) return allIRs;
    const pool: AnalyzedIR[] = [];
    if (baseIR) pool.push(baseIR);
    for (const f of featureIRs) {
      if (!pool.some((p) => p.filename === f.filename)) pool.push(f);
    }
    return pool.length >= 2 ? pool : [];
  }, [allIRs, baseIR, featureIRs]);

  const suggestedPairs = useMemo(() => {
    if (pairingPool.length < 2) return [];
    return suggestPairings(pairingPool, activeProfiles, 4, learnedProfile || undefined, evaluatedPairs.size > 0 ? evaluatedPairs : undefined, exposureCounts.size > 0 ? exposureCounts : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairingPool, activeProfiles, learnedProfile, pairingRound, exposureCounts]);

  const hasPairingPool = pairingPool.length >= 2;

  useEffect(() => {
    if (hasPairingPool && evaluatedPairs.size > 0 && suggestedPairs.length === 0) {
      setNoMorePairs(true);
    }
  }, [suggestedPairs, evaluatedPairs, hasPairingPool]);

  const pairKey = useCallback((p: SuggestedPairing) =>
    `${p.baseFilename}||${p.featureFilename}`, []);

  const assignRank = useCallback((key: string, rank: number) => {
    setPairingRankings((prev) => {
      const next = { ...prev };
      if (next[key] === rank) {
        delete next[key];
        setPairingFeedback((f) => { const n = { ...f }; delete n[key]; return n; });
        setPairingFeedbackText((f) => { const n = { ...f }; delete n[key]; return n; });
      } else {
        next[key] = rank;
        setPairingFeedback((f) => { const n = { ...f }; delete n[key]; return n; });
        setPairingFeedbackText((f) => { const n = { ...f }; delete n[key]; return n; });
      }
      return next;
    });
    setDismissedPairings((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const assignFeedback = useCallback((key: string, tag: string) => {
    setPairingFeedback((prev) => {
      const current = prev[key] || [];
      if (current.includes(tag)) {
        const updated = current.filter((t) => t !== tag);
        if (updated.length === 0) {
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return { ...prev, [key]: updated };
      }
      return { ...prev, [key]: [...current, tag] };
    });
  }, []);

  const dismissPairing = useCallback((key: string) => {
    setDismissedPairings((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        setPairingFeedback((f) => { const n = { ...f }; delete n[key]; return n; });
        setPairingFeedbackText((f) => { const n = { ...f }; delete n[key]; return n; });
      }
      return next;
    });
    setPairingRankings((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const assignCrossCabRank = useCallback((key: string, rank: number) => {
    setCrossCabRankings((prev) => {
      const next = { ...prev };
      if (next[key] === rank) {
        delete next[key];
        setCrossCabFeedback((f) => { const n = { ...f }; delete n[key]; return n; });
        setCrossCabFeedbackText((f) => { const n = { ...f }; delete n[key]; return n; });
      } else {
        next[key] = rank;
        setCrossCabFeedback((f) => { const n = { ...f }; delete n[key]; return n; });
        setCrossCabFeedbackText((f) => { const n = { ...f }; delete n[key]; return n; });
      }
      return next;
    });
    setCrossCabDismissed((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const assignCrossCabFeedback = useCallback((key: string, tag: string) => {
    setCrossCabFeedback((prev) => {
      const current = prev[key] || [];
      if (current.includes(tag)) {
        const updated = current.filter((t) => t !== tag);
        if (updated.length === 0) {
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return { ...prev, [key]: updated };
      }
      return { ...prev, [key]: [...current, tag] };
    });
  }, []);

  const dismissCrossCab = useCallback((key: string) => {
    setCrossCabDismissed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        setCrossCabFeedback((f) => { const n = { ...f }; delete n[key]; return n; });
        setCrossCabFeedbackText((f) => { const n = { ...f }; delete n[key]; return n; });
      }
      return next;
    });
    setCrossCabRankings((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const crossCabHasRatings = Object.keys(crossCabRankings).length > 0 || crossCabDismissed.size > 0;

  const hasAnyRank = Object.keys(pairingRankings).length > 0;
  const hasLoveOrLike = Object.values(pairingRankings).some((r) => r === 1 || r === 2);
  const activePairings = suggestedPairs.filter((p) => !dismissedPairings.has(pairKey(p)));
  const canConfirm = hasAnyRank || dismissedPairings.size === suggestedPairs.length;

  const RATIO_GRID = [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7];
  const snapToGrid = (v: number) => RATIO_GRID.reduce((best, g) => Math.abs(g - v) < Math.abs(best - v) ? g : best, 0.5);

  const buildMatchupsForPair = useCallback(() => {
    const learnedPref = learnedProfile?.ratioPreference?.preferredRatio ?? 0.5;
    const center = snapToGrid(learnedPref);
    const centerIdx = RATIO_GRID.indexOf(center);
    const aIdx = Math.max(0, centerIdx - 2);
    const bIdx = Math.min(RATIO_GRID.length - 1, centerIdx + 2);
    return [
      { a: RATIO_GRID[aIdx], b: RATIO_GRID[bIdx] },
    ];
  }, [learnedProfile]);

  const finishRound = useCallback((loadTopPick: boolean, downgradedPk: string | null) => {
    if (downgradedPk) {
      setPairingRankings((prev) => ({ ...prev, [downgradedPk]: 3 }));
    }
    if (loadTopPick) {
      const sorted = Object.entries(pairingRankings)
        .filter(([k]) => k !== downgradedPk)
        .sort((a, b) => a[1] - b[1]);
      const topKey = sorted[0]?.[0];
      if (topKey) {
        const pair = suggestedPairs.find((p) => pairKey(p) === topKey);
        if (pair) {
          const pool = allIRs.length >= 2 ? allIRs : [baseIR, ...featureIRs].filter(Boolean) as AnalyzedIR[];
          const baseIrData = pool.find((ir) => ir.filename === pair.baseFilename);
          const featIrData = pool.find((ir) => ir.filename === pair.featureFilename);
          if (baseIrData && featIrData) {
            setBaseIR(baseIrData);
            setFeatureIRs([featIrData]);
            setShowFoundation(false);
            setDoneRefining(true);
          }
        }
      }
    } else {
      setPairingRankings({});
      setPairingFeedback({});
      setPairingFeedbackText({});
      setDismissedPairings(new Set());
      setPairingRound((prev) => prev + 1);
    }
  }, [pairingRankings, suggestedPairs, allIRs, baseIR, featureIRs, pairKey]);

  const proceedToRatioRefine = useCallback((candidates: { pair: SuggestedPairing; rank: number; baseRaw: TonalBands; featRaw: TonalBands }[], loadTopPick: boolean) => {
    setRatioRefinePhase({
      stage: "select",
      candidates,
      selectedIdx: null,
      step: 0,
      matchups: buildMatchupsForPair(),
      winner: null,
      downgraded: false,
      pendingLoadTopPick: loadTopPick,
    });
  }, [buildMatchupsForPair]);

  const handleTasteCheckPick = useCallback((pickedIndex: number) => {
    if (!tasteCheckPhase) return;

    setTasteCheckPhase({ ...tasteCheckPhase, userPick: pickedIndex, showingResult: true });

    const newHistory: TasteCheckRoundResult[] = [
      ...tasteCheckPhase.history,
      {
        options: tasteCheckPhase.candidates,
        pickedIndex,
        axisName: tasteCheckPhase.axisName,
        roundType: tasteCheckPhase.roundType,
      },
    ];

    const nextRound = tasteCheckPhase.round + 1;

    setTimeout(() => {
      const keepGoing = shouldContinueTasteCheck(
        tasteCheckPhase.confidence,
        newHistory,
        learnedProfile || undefined,
      );

      if (!keepGoing || nextRound >= tasteCheckPhase.maxRounds) {
        setTasteCheckPhase(null);
        setTasteCheckPassed(true);
        proceedToRatioRefine(tasteCheckPhase.pendingRefineCandidates, tasteCheckPhase.pendingLoadTopPick);
        return;
      }

      const nextPick = pickTasteCheckCandidates(
        pairingPool,
        activeProfiles,
        learnedProfile || undefined,
        undefined,
        newHistory,
        tasteCheckMode
      );

      if (!nextPick) {
        setTasteCheckPhase(null);
        setTasteCheckPassed(true);
        proceedToRatioRefine(tasteCheckPhase.pendingRefineCandidates, tasteCheckPhase.pendingLoadTopPick);
        return;
      }

      setTasteCheckPhase({
        candidates: nextPick.candidates,
        roundType: nextPick.roundType,
        axisName: nextPick.axisName,
        axisLabels: nextPick.axisLabels,
        round: nextRound,
        maxRounds: tasteCheckPhase.maxRounds,
        confidence: tasteCheckPhase.confidence,
        userPick: null,
        showingResult: false,
        history: newHistory,
        pendingRefineCandidates: tasteCheckPhase.pendingRefineCandidates,
        pendingLoadTopPick: tasteCheckPhase.pendingLoadTopPick,
      });
    }, 1500);
  }, [tasteCheckPhase, proceedToRatioRefine, pairingPool, activeProfiles, learnedProfile, tasteCheckMode]);

  const skipTasteCheck = useCallback(() => {
    if (!tasteCheckPhase) return;
    setTasteCheckPhase(null);
    setTasteCheckPassed(true);
    proceedToRatioRefine(tasteCheckPhase.pendingRefineCandidates, tasteCheckPhase.pendingLoadTopPick);
  }, [tasteCheckPhase, proceedToRatioRefine]);

  const liveConfidence = getTasteConfidence(learnedProfile || undefined);
  const tasteCheckBinary = tasteCheckPhase
    ? (tasteCheckMode === "tester" || (tasteCheckMode === "auto" && (liveConfidence === "high" || tasteCheckPhase.confidence === "high")) || tasteCheckPhase.candidates.length <= 2)
    : false;
  const tasteCheckDisplayCandidates = tasteCheckPhase
    ? (tasteCheckBinary ? tasteCheckPhase.candidates.slice(0, 2) : tasteCheckPhase.candidates)
    : [];

  const handleSubmitRankings = useCallback((loadTopPick: boolean) => {
    const signals: any[] = [];
    let roundLiked = 0;
    let roundNoped = 0;
    const newEvaluated = new Set(evaluatedPairs);
    const newExposure = new Map(exposureCounts);
    const pool = allIRs.length >= 2 ? allIRs : [baseIR, ...featureIRs].filter(Boolean) as AnalyzedIR[];

    const refineCandidates: { pair: SuggestedPairing; rank: number; baseRaw: TonalBands; featRaw: TonalBands }[] = [];

    for (const pair of suggestedPairs) {
      const pk = `${pair.baseFilename}||${pair.featureFilename}`;
      const sortedKey = [pair.baseFilename, pair.featureFilename].sort().join("||");
      const isDismissed = dismissedPairings.has(pk);
      const rank = pairingRankings[pk];

      newEvaluated.add(sortedKey);
      newExposure.set(pair.baseFilename, (newExposure.get(pair.baseFilename) ?? 0) + 1);
      newExposure.set(pair.featureFilename, (newExposure.get(pair.featureFilename) ?? 0) + 1);

      if (!isDismissed && !rank) continue;

      const r = pair.blendBands.mid > 0 ? pair.blendBands.highMid / pair.blendBands.mid : 0;
      const actionLabel = isDismissed ? "nope" : rank === 1 ? "love" : rank === 2 ? "like" : "meh";
      const fbTags = pairingFeedback[pk];
      const fb = fbTags && fbTags.length > 0 ? fbTags.join(",") : null;
      const fbText = pairingFeedbackText[pk]?.trim() || null;
      signals.push({
        action: actionLabel,
        feedback: fb,
        feedbackText: fbText,
        baseFilename: pair.baseFilename,
        featureFilename: pair.featureFilename,
        subBass: pair.blendBands.subBass,
        bass: pair.blendBands.bass,
        lowMid: pair.blendBands.lowMid,
        mid: pair.blendBands.mid,
        highMid: pair.blendBands.highMid,
        presence: pair.blendBands.presence,
        ratio: Math.round(r * 100) / 100,
        score: Math.round(pair.score),
        profileMatch: pair.bestMatch.profile,
      });

      if (isDismissed) roundNoped++;
      else roundLiked++;

      if ((rank === 1 || rank === 2) && !isDismissed) {
        const baseData = pool.find((ir) => ir.filename === pair.baseFilename);
        const featData = pool.find((ir) => ir.filename === pair.featureFilename);
        if (baseData && featData) {
          refineCandidates.push({ pair, rank, baseRaw: baseData.rawEnergy, featRaw: featData.rawEnergy });
        }
      }
    }

    if (signals.length > 0) {
      submitSignalsMutation.mutate(signals);
    }

    setEvaluatedPairs(newEvaluated);
    setExposureCounts(newExposure);
    setCumulativeSignals((prev) => ({
      liked: prev.liked + roundLiked,
      noped: prev.noped + roundNoped,
    }));
    setTotalRoundsCompleted((prev) => prev + 1);

    const hasEnoughLearning = totalRoundsCompleted >= 1 || tasteCheckMode !== "auto";

    if (refineCandidates.length > 0 && hasEnoughLearning) {
      refineCandidates.sort((a, b) => a.rank - b.rank);

      const hasUnseenIRs = pairingPool.length > 0 && pairingPool.some(
        (ir) => (newExposure.get(ir.filename) ?? 0) === 0
      );
      const shouldTasteCheck = tasteCheckMode !== "auto" || !tasteCheckPassed || hasUnseenIRs;

      if (shouldTasteCheck) {
        const tastePick = pickTasteCheckCandidates(pairingPool, activeProfiles, learnedProfile || undefined, newEvaluated.size > 0 ? newEvaluated : undefined, undefined, tasteCheckMode);
        if (tastePick) {
          const maxRounds = getTasteCheckRounds(tastePick.confidence, pairingPool.length);
          setTasteCheckPhase({
            candidates: tastePick.candidates,
            roundType: tastePick.roundType,
            axisName: tastePick.axisName,
            axisLabels: tastePick.axisLabels,
            round: 0,
            maxRounds,
            confidence: tastePick.confidence,
            userPick: null,
            showingResult: false,
            history: [],
            pendingRefineCandidates: refineCandidates,
            pendingLoadTopPick: loadTopPick,
          });
        } else {
          if (!tasteCheckPassed) setTasteCheckPassed(true);
          proceedToRatioRefine(refineCandidates, loadTopPick);
        }
      } else {
        proceedToRatioRefine(refineCandidates, loadTopPick);
      }
    } else {
      finishRound(loadTopPick, null);
    }
  }, [suggestedPairs, pairingRankings, pairingFeedback, pairingFeedbackText, dismissedPairings, submitSignalsMutation, evaluatedPairs, exposureCounts, allIRs, baseIR, featureIRs, pairKey, buildMatchupsForPair, totalRoundsCompleted, tasteCheckPassed, pairingPool, activeProfiles, learnedProfile, proceedToRatioRefine, finishRound, tasteCheckMode]);

  const selectRefineCandidate = useCallback((idx: number) => {
    if (!ratioRefinePhase) return;
    setRatioRefinePhase({
      ...ratioRefinePhase,
      stage: "refine",
      selectedIdx: idx,
      step: 0,
      matchups: buildMatchupsForPair(),
    });
  }, [ratioRefinePhase, buildMatchupsForPair]);

  const skipRatioRefine = useCallback(() => {
    if (!ratioRefinePhase) return;
    setRatioRefinePhase(null);
    finishRound(ratioRefinePhase.pendingLoadTopPick, null);
  }, [ratioRefinePhase, finishRound]);

  const completeRatioRefine = useCallback((ratio: number | null, downgraded: boolean) => {
    if (!ratioRefinePhase || ratioRefinePhase.selectedIdx === null) return;
    const cand = ratioRefinePhase.candidates[ratioRefinePhase.selectedIdx];
    const pk = `${cand.pair.baseFilename}||${cand.pair.featureFilename}`;

    if (ratio !== null) {
      const blendBands = blendFromRaw(cand.baseRaw, cand.featRaw, ratio, 1 - ratio);
      const r = blendBands.mid > 0 ? blendBands.highMid / blendBands.mid : 0;
      const scored = scoreAgainstAllProfiles(blendBands, activeProfiles);
      submitSignalsMutation.mutate([{
        action: "ratio_pick",
        feedback: null,
        feedbackText: null,
        baseFilename: cand.pair.baseFilename,
        featureFilename: cand.pair.featureFilename,
        subBass: blendBands.subBass,
        bass: blendBands.bass,
        lowMid: blendBands.lowMid,
        mid: blendBands.mid,
        highMid: blendBands.highMid,
        presence: blendBands.presence,
        ratio: Math.round(r * 100) / 100,
        score: Math.round(scored.best.score),
        profileMatch: scored.best.profile,
        blendRatio: ratio,
      }]);
    }

    setRatioRefinePhase({ ...ratioRefinePhase, stage: "done", winner: ratio, downgraded });
    setTimeout(() => {
      setRatioRefinePhase(null);
      finishRound(ratioRefinePhase.pendingLoadTopPick, downgraded ? pk : null);
    }, 1500);
  }, [ratioRefinePhase, activeProfiles, submitSignalsMutation, finishRound]);

  const handleRatioPick = useCallback((pickedSide: "a" | "b" | "tie") => {
    if (!ratioRefinePhase || ratioRefinePhase.stage !== "refine") return;
    const { step, matchups } = ratioRefinePhase;
    const current = matchups[step];

    if (pickedSide === "tie") {
      const tieRatio = snapToGrid((current.a + current.b) / 2);
      completeRatioRefine(tieRatio, false);
      return;
    }

    const winner = pickedSide === "a" ? current.a : current.b;
    const loser = pickedSide === "a" ? current.b : current.a;
    const winnerIdx = RATIO_GRID.indexOf(snapToGrid(winner));
    const loserIdx = RATIO_GRID.indexOf(snapToGrid(loser));

    const gap = Math.abs(winnerIdx - loserIdx);

    if (gap <= 1) {
      completeRatioRefine(winner, false);
      return;
    }

    let narrowA: number, narrowB: number;
    if (step === 0) {
      narrowA = Math.max(0, Math.min(winnerIdx - 1, loserIdx));
      narrowB = Math.min(RATIO_GRID.length - 1, Math.max(winnerIdx + 1, loserIdx));
    } else {
      narrowA = Math.min(winnerIdx, loserIdx);
      narrowB = Math.max(winnerIdx, loserIdx);
      if (narrowB - narrowA > 2) {
        const mid = Math.round((narrowA + narrowB) / 2);
        narrowA = mid === winnerIdx ? Math.max(0, mid - 1) : mid;
        narrowB = mid === winnerIdx ? Math.min(RATIO_GRID.length - 1, mid + 1) : winnerIdx;
        if (narrowA > narrowB) [narrowA, narrowB] = [narrowB, narrowA];
      }
    }

    if (narrowA === narrowB) {
      narrowA = Math.max(0, narrowA - 1);
      narrowB = Math.min(RATIO_GRID.length - 1, narrowB + 1);
    }

    const updated = [...matchups.slice(0, step + 1), { a: RATIO_GRID[narrowA], b: RATIO_GRID[narrowB] }];
    setRatioRefinePhase({ ...ratioRefinePhase, step: step + 1, matchups: updated });
  }, [ratioRefinePhase, completeRatioRefine]);

  const handleNoRatioHelps = useCallback(() => {
    completeRatioRefine(null, true);
  }, [completeRatioRefine]);

  const useAsBase = useCallback((ir: AnalyzedIR) => {
    setBaseIR(ir);
    setFeatureIRs(allIRs.filter((a) => a.filename !== ir.filename));
    setShowFoundation(false);
    resetPairingState();
  }, [allIRs, resetPairingState]);

  const blendResults = useMemo(() => {
    if (!baseIR || featureIRs.length === 0) return [];
    return featureIRs.map((feature) => {
      const allRatioBlends = BLEND_RATIOS.map((r) => {
        const bands = blendFromRaw(baseIR.rawEnergy, feature.rawEnergy, r.base, r.feature);
        const match = scoreAgainstAllProfiles(bands, activeProfiles);
        return { ratio: r, bands, bestMatch: match.best };
      });
      const currentBlend = blendFromRaw(baseIR.rawEnergy, feature.rawEnergy, currentRatio.base, currentRatio.feature);
      const currentMatch = scoreAgainstAllProfiles(currentBlend, activeProfiles);
      return {
        feature,
        currentBlend,
        currentMatch,
        allRatioBlends,
      };
    });
  }, [baseIR, featureIRs, currentRatio, activeProfiles]);

  const sortedBlendResults = useMemo(() => {
    return [...blendResults].sort((a, b) => b.currentMatch.best.score - a.currentMatch.best.score);
  }, [blendResults]);

  const crossCabCurrentRatio = BLEND_RATIOS[crossCabRatio];

  const crossCabResults = useMemo(() => {
    if (cabAIRs.length === 0 || cabBIRs.length === 0) return [];
    const results: {
      irA: AnalyzedIR;
      irB: AnalyzedIR;
      blend: TonalBands;
      match: ReturnType<typeof scoreAgainstAllProfiles>;
    }[] = [];
    for (const a of cabAIRs) {
      for (const b of cabBIRs) {
        const blend = blendFromRaw(a.rawEnergy, b.rawEnergy, crossCabCurrentRatio.base, crossCabCurrentRatio.feature);
        const match = scoreAgainstAllProfiles(blend, activeProfiles);
        results.push({ irA: a, irB: b, blend, match });
      }
    }
    results.sort((a, b) => b.match.best.score - a.match.best.score);
    return results;
  }, [cabAIRs, cabBIRs, crossCabCurrentRatio, activeProfiles]);

  const handleSubmitCrossCabRatings = useCallback(() => {
    const signals: any[] = [];
    for (const cr of crossCabResults) {
      const bk = `${cr.irA.filename}||${cr.irB.filename}`;
      const isDismissed = crossCabDismissed.has(bk);
      const rank = crossCabRankings[bk];
      if (!isDismissed && !rank) continue;
      const r = cr.blend.mid > 0 ? cr.blend.highMid / cr.blend.mid : 0;
      const actionLabel = isDismissed ? "nope" : rank === 1 ? "love" : rank === 2 ? "like" : "meh";
      const fbTags = crossCabFeedback[bk];
      const fb = fbTags && fbTags.length > 0 ? fbTags.join(",") : null;
      const fbText = crossCabFeedbackText[bk]?.trim() || null;
      signals.push({
        action: actionLabel,
        feedback: fb,
        feedbackText: fbText,
        baseFilename: cr.irA.filename,
        featureFilename: cr.irB.filename,
        subBass: cr.blend.subBass,
        bass: cr.blend.bass,
        lowMid: cr.blend.lowMid,
        mid: cr.blend.mid,
        highMid: cr.blend.highMid,
        presence: cr.blend.presence,
        ratio: Math.round(r * 100) / 100,
        score: Math.round(cr.match.best.score),
        profileMatch: cr.match.best.profile,
      });
    }
    if (signals.length > 0) {
      submitSignalsMutation.mutate(signals);
    }
    setCrossCabRankings({});
    setCrossCabFeedback({});
    setCrossCabFeedbackText({});
    setCrossCabDismissed(new Set());
  }, [crossCabResults, crossCabRankings, crossCabFeedback, crossCabFeedbackText, crossCabDismissed, submitSignalsMutation]);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                <Blend className="w-5 h-5 text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">IR Mixer</h1>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-teal-500/30 bg-teal-500/5 p-1" data-testid="taste-mode-selector">
              <button
                onClick={() => setTasteCheckMode("acquisition")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors rounded-md",
                  tasteCheckMode === "acquisition"
                    ? "bg-teal-500/25 text-teal-300"
                    : "text-muted-foreground hover-elevate"
                )}
                data-testid="button-taste-acquisition"
              >
                4-Pick
              </button>
              <button
                onClick={() => setTasteCheckMode("auto")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors rounded-md",
                  tasteCheckMode === "auto"
                    ? "bg-teal-500/25 text-teal-300"
                    : "text-muted-foreground hover-elevate"
                )}
                data-testid="button-taste-auto"
              >
                Auto
              </button>
              <button
                onClick={() => setTasteCheckMode("tester")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors rounded-md",
                  tasteCheckMode === "tester"
                    ? "bg-teal-500/25 text-teal-300"
                    : "text-muted-foreground hover-elevate"
                )}
                data-testid="button-taste-tester"
              >
                A/B
              </button>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            Drop IRs to preview blend permutations scored against your tonal profiles.
          </p>
          {learnedProfile && learnedProfile.signalCount > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap" data-testid="learning-status">
              <Brain className={cn(
                "w-4 h-4",
                learnedProfile.status === "mastered" ? "text-cyan-400" :
                learnedProfile.status === "confident" ? "text-emerald-400" : "text-amber-400"
              )} />
              <span className="text-xs text-muted-foreground">
                {(() => {
                  const poolSize = pairingPool.length;
                  const exposedCount = poolSize > 0
                    ? pairingPool.filter((ir) => (exposureCounts.get(ir.filename) ?? 0) > 0).length
                    : 0;
                  const allCovered = poolSize > 0 && exposedCount === poolSize;
                  const effectiveMastered = learnedProfile.status === "mastered" && allCovered;

                  if (effectiveMastered) {
                    return `Preferences mastered -- ${learnedProfile.likedCount} rated, ${learnedProfile.nopedCount} noped. All ${poolSize} IRs evaluated. Keep rating to refine further.`;
                  }
                  if (learnedProfile.status === "mastered" && poolSize > 0 && !allCovered) {
                    return `Near mastery -- ${learnedProfile.likedCount} rated, ${learnedProfile.nopedCount} noped. ${poolSize - exposedCount} of ${poolSize} IRs still unseen -- presenting novel options first.`;
                  }
                  if (learnedProfile.status === "confident") {
                    const coverageNote = poolSize > 0 && exposedCount < poolSize
                      ? ` (${poolSize - exposedCount} unseen IRs will be prioritized)`
                      : "";
                    const corrections = learnedProfile.courseCorrections ?? [];
                    if (corrections.length > 0) {
                      return `Refining: ${learnedProfile.likedCount} rated + ${learnedProfile.nopedCount} noped -- ${corrections.join("; ")}${coverageNote}`;
                    }
                    return `Learned from ${learnedProfile.likedCount} rated + ${learnedProfile.nopedCount} noped blends -- profiles adjusted${coverageNote}`;
                  }
                  return `Learning: ${learnedProfile.likedCount} rated, ${learnedProfile.nopedCount} noped (need ${Math.max(0, 5 - learnedProfile.likedCount)} more for confidence)`;
                })()}
              </span>
              {learnedProfile.learnedAdjustments && (
                <span className="text-[10px] font-mono text-muted-foreground/70">
                  Mid {learnedProfile.learnedAdjustments.mid.shift > 0 ? "+" : ""}{learnedProfile.learnedAdjustments.mid.shift.toFixed(1)}
                  {" / "}Pres {learnedProfile.learnedAdjustments.presence.shift > 0 ? "+" : ""}{learnedProfile.learnedAdjustments.presence.shift.toFixed(1)}
                  {" / "}Ratio {learnedProfile.learnedAdjustments.ratio.shift > 0 ? "+" : ""}{learnedProfile.learnedAdjustments.ratio.shift.toFixed(2)}
                </span>
              )}
              {learnedProfile.avoidZones.length > 0 && (
                <span className="text-[10px] font-mono text-red-400/70">
                  Penalizing: {learnedProfile.avoidZones.map((z) => 
                    z.band === "muddy_composite" ? "muddy tones"
                    : `${z.direction === "high" ? "excess" : "low"} ${z.band}`
                  ).join(", ")}
                </span>
              )}
              {learnedProfile.gearInsights && (
                <div className="w-full mt-2 space-y-2" data-testid="gear-insights">
                  {[
                    { label: "Mics", items: learnedProfile.gearInsights.mics, clearable: false },
                    { label: "Speakers", items: learnedProfile.gearInsights.speakers, clearable: true },
                    { label: "Positions", items: learnedProfile.gearInsights.positions, clearable: false },
                  ].filter(g => g.items.length > 0).map(({ label, items, clearable }) => (
                    <div key={label} className="space-y-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground/70">{label}:</span>
                      {items.map((item) => {
                        const speakerPrefix = clearable ? getSpeakerFilenamePrefix(item.name) : null;
                        const isConfirming = clearable && clearSpeakerConfirm === item.name;
                        return (
                        <div key={item.name} className="flex items-center gap-1.5 flex-wrap ml-2">
                          <span className={cn(
                            "text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0",
                            item.score.net > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                          )}>
                            {item.name} {item.score.net > 0 ? "+" : ""}{item.score.net}
                          </span>
                          {item.descriptors.length > 0 && item.descriptors.map((d, i) => (
                            <span key={i} className="text-[9px] font-mono text-muted-foreground/60 italic">
                              {d.label}
                            </span>
                          ))}
                          {!item.tonal && (
                            <span className="text-[9px] font-mono text-muted-foreground/40">needs more data</span>
                          )}
                          {clearable && speakerPrefix && !isConfirming && (
                            <button
                              onClick={() => setClearSpeakerConfirm(item.name)}
                              className="text-muted-foreground/40 hover:text-red-400 transition-colors ml-1"
                              title={`Clear all learning for ${item.name}`}
                              data-testid={`button-clear-speaker-${item.name}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          {isConfirming && speakerPrefix && (
                            <span className="flex items-center gap-1 ml-1">
                              <span className="text-[9px] text-red-400">Clear all {item.name} ratings?</span>
                              <button
                                onClick={() => clearSpeakerMutation.mutate(speakerPrefix)}
                                className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                disabled={clearSpeakerMutation.isPending}
                                data-testid={`button-confirm-clear-${item.name}`}
                              >
                                {clearSpeakerMutation.isPending ? "..." : "Yes"}
                              </button>
                              <button
                                onClick={() => setClearSpeakerConfirm(null)}
                                className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground hover:bg-white/10 transition-colors"
                                data-testid={`button-cancel-clear-${item.name}`}
                              >
                                No
                              </button>
                            </span>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  ))}
                  {learnedProfile.gearInsights.combos.length > 0 && (
                    <div className="space-y-0.5 pt-1 border-t border-white/5">
                      <span className="text-[10px] font-mono text-muted-foreground/70">Gear combos:</span>
                      {learnedProfile.gearInsights.combos.map((c) => (
                        <div key={c.combo} className="flex items-center gap-1.5 flex-wrap ml-2">
                          <span className={cn(
                            "text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0",
                            c.sentiment > 0 ? "bg-emerald-500/10 text-emerald-400" : c.sentiment < 0 ? "bg-red-500/10 text-red-400" : "bg-white/5 text-muted-foreground"
                          )}>
                            {c.combo.replace('+', ' + ').replace('@', ' @ ')}
                          </span>
                          {c.descriptors.map((d, i) => (
                            <span key={i} className="text-[9px] font-mono text-muted-foreground/60 italic">
                              {d.label}
                            </span>
                          ))}
                          <span className="text-[9px] font-mono text-muted-foreground/40">
                            n={c.sampleSize}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>

        <div className="mb-8 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400" />
            Foundation Finder
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Drop all your IRs from a speaker set. The algorithm ranks them by Body score -- the highest-scoring Body IR makes the best base, giving you warmth and weight to blend from.
          </p>
          <DropZone
            label="Drop All IRs"
            description="Analyze a full set to find the best foundation IR"
            onFilesAdded={handleAllFiles}
            isLoading={isLoadingAll}
          />

          {showFoundation && foundationResults.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Ranked by Body score -- best base IRs ({foundationResults.length} IRs)</p>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {foundationResults.map((fr) => {
                  const ir = allIRs.find((a) => a.filename === fr.filename);
                  if (!ir) return null;
                  const rankLabel = fr.rank === 1 ? "Best Base" : fr.rank === 2 ? "#2 Base" : fr.rank === 3 ? "#3 Base" : `#${fr.rank}`;
                  const rankColor = fr.rank === 1 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                    fr.rank <= 3 ? "bg-sky-500/20 text-sky-400 border-sky-500/30" :
                    "bg-white/5 text-muted-foreground border-white/10";
                  return (
                    <div
                      key={fr.filename}
                      className={cn(
                        "p-3 rounded-lg border",
                        fr.rank === 1 ? "bg-amber-500/10 border-amber-500/20" :
                        fr.rank <= 3 ? "bg-sky-500/[0.03] border-sky-500/10" :
                        "bg-white/[0.02] border-white/5"
                      )}
                      data-testid={`foundation-result-${fr.rank - 1}`}
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline" className={cn("text-[10px]", rankColor)}>
                              {rankLabel}
                            </Badge>
                            <span className="text-xs font-mono text-foreground truncate" data-testid={`text-foundation-name-${fr.rank - 1}`}>
                              {fr.filename.replace(/(_\d{13})?\.wav$/, "")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] font-mono text-amber-400">
                              Body: {fr.bodyScore}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              Featured: {fr.featuredScore}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                            {fr.reasons.slice(0, 3).map((r, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-white/5">{r}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <div className="text-right text-[10px] font-mono">
                            <span className="text-green-400">M {fr.bands.mid.toFixed(1)}</span>
                            <span className="text-yellow-400 ml-1.5">HM {fr.bands.highMid.toFixed(1)}</span>
                            <span className="text-orange-400 ml-1.5">P {fr.bands.presence.toFixed(1)}</span>
                            <span className={cn(
                              "ml-1.5",
                              fr.ratio < 1.0 ? "text-blue-400" : fr.ratio <= 2.0 ? "text-green-400" : "text-amber-400"
                            )}>
                              {fr.ratio.toFixed(2)}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => useAsBase(ir)}
                            data-testid={`button-use-as-base-${fr.rank - 1}`}
                          >
                            Use as Base
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        <div className="mb-8 p-4 rounded-xl bg-teal-500/5 border border-teal-500/20">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-teal-400" />
            Cross-Cab Pairing
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Drop IRs from two different speaker cabinets. The algorithm blends every combination across cabinets and ranks them by tonal profile match.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <p className="text-[10px] text-teal-400 uppercase tracking-wider font-semibold">Cabinet A</p>
              <DropZone
                label="Drop Cabinet A IRs"
                description="IRs from your first speaker"
                onFilesAdded={handleCabAFiles}
                isLoading={isLoadingCabA}
              />
              {cabAIRs.length > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground">{cabAIRs.length} IR{cabAIRs.length !== 1 ? "s" : ""} loaded</span>
                  <Button size="sm" variant="ghost" onClick={() => { setCabAIRs([]); clearCrossCabRatings(); }} className="text-[10px] text-muted-foreground" data-testid="button-clear-cab-a">Clear</Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-teal-400 uppercase tracking-wider font-semibold">Cabinet B</p>
              <DropZone
                label="Drop Cabinet B IRs"
                description="IRs from your second speaker"
                onFilesAdded={handleCabBFiles}
                isLoading={isLoadingCabB}
              />
              {cabBIRs.length > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground">{cabBIRs.length} IR{cabBIRs.length !== 1 ? "s" : ""} loaded</span>
                  <Button size="sm" variant="ghost" onClick={() => { setCabBIRs([]); clearCrossCabRatings(); }} className="text-[10px] text-muted-foreground" data-testid="button-clear-cab-b">Clear</Button>
                </div>
              )}
            </div>
          </div>

          {crossCabResults.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {crossCabResults.length} cross-cab blend{crossCabResults.length !== 1 ? "s" : ""} ranked by match
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">A/B ratio:</span>
                  {BLEND_RATIOS.map((r, idx) => (
                    <Button
                      key={r.label}
                      size="sm"
                      variant={crossCabRatio === idx ? "default" : "ghost"}
                      onClick={() => { setCrossCabRatio(idx); clearCrossCabRatings(); }}
                      className={cn(
                        "font-mono text-xs",
                        crossCabRatio === idx && "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                      )}
                      data-testid={`button-crosscab-ratio-${r.label}`}
                    >
                      {r.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {crossCabResults.map((cr, idx) => {
                  const blendKey = `${cr.irA.filename}||${cr.irB.filename}`;
                  const isExpanded = expandedCrossCab === blendKey;
                  const hiMidMidRatio = cr.blend.mid > 0
                    ? Math.round((cr.blend.highMid / cr.blend.mid) * 100) / 100
                    : 0;
                  const rankLabel = idx === 0 ? "Best" : idx === 1 ? "#2" : idx === 2 ? "#3" : `#${idx + 1}`;
                  const rankColor = idx === 0 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                    idx <= 2 ? "bg-sky-500/20 text-sky-400 border-sky-500/30" :
                    "bg-white/5 text-muted-foreground border-white/10";
                  return (
                    <div
                      key={blendKey}
                      className={cn(
                        "rounded-lg border",
                        idx === 0 ? "bg-emerald-500/[0.03] border-emerald-500/20" :
                        idx <= 2 ? "bg-teal-500/[0.02] border-teal-500/10" :
                        "bg-white/[0.02] border-white/5"
                      )}
                      data-testid={`crosscab-result-${idx}`}
                    >
                      <Button
                        variant="ghost"
                        onClick={() => setExpandedCrossCab(isExpanded ? null : blendKey)}
                        className="w-full flex items-center justify-between gap-3 p-3 h-auto text-left rounded-lg"
                        data-testid={`button-expand-crosscab-${idx}`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                          <Badge variant="outline" className={cn("text-[9px] shrink-0", rankColor)}>
                            {rankLabel}
                          </Badge>
                          <span className="text-xs font-mono text-teal-400 truncate">
                            {cr.irA.filename.replace(/(_\d{13})?\.wav$/, "")}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">+</span>
                          <span className="text-xs font-mono text-teal-400 truncate">
                            {cr.irB.filename.replace(/(_\d{13})?\.wav$/, "")}
                          </span>
                          <MatchBadge match={cr.match.best} />
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="hidden sm:flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground">Mid</span>
                            <span className="text-xs font-mono text-green-400">{cr.blend.mid.toFixed(1)}%</span>
                            <span className="text-[10px] text-muted-foreground ml-1">Pres</span>
                            <span className="text-xs font-mono text-orange-400">{cr.blend.presence.toFixed(1)}%</span>
                            <span className={cn(
                              "text-[10px] font-mono px-1.5 py-0.5 rounded ml-1",
                              hiMidMidRatio < 1.0 ? "bg-blue-500/20 text-blue-400" :
                              hiMidMidRatio <= 2.0 ? "bg-green-500/20 text-green-400" :
                              "bg-amber-500/20 text-amber-400"
                            )}>
                              {hiMidMidRatio.toFixed(2)}
                            </span>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </Button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">Cab A</p>
                                  <BandChart bands={cr.irA.bands} height={12} compact showScores profiles={activeProfiles} />
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-[10px] text-teal-400 uppercase tracking-wider text-center font-semibold">
                                    Blend ({crossCabCurrentRatio.label})
                                  </p>
                                  <BandChart bands={cr.blend} height={12} compact showScores profiles={activeProfiles} />
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">Cab B</p>
                                  <BandChart bands={cr.irB.bands} height={12} compact showScores profiles={activeProfiles} />
                                </div>
                              </div>
                              {cr.match.best.deviations.length > 0 && (
                                <div className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5">
                                  <p className="text-[10px] text-muted-foreground mb-1">{cr.match.best.summary}</p>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {cr.match.best.deviations.map((d, i) => (
                                      <span key={i} className={cn(
                                        "text-[10px] font-mono px-1.5 py-0.5 rounded",
                                        d.direction === "high" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"
                                      )}>
                                        {d.band} {d.direction === "high" ? "+" : "-"}{d.amount.toFixed(1)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="border-t border-white/5 pt-2">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">All Ratios</p>
                                <div className="grid grid-cols-5 gap-2">
                                  {BLEND_RATIOS.map((ratio) => {
                                    const rb = blendFromRaw(cr.irA.rawEnergy, cr.irB.rawEnergy, ratio.base, ratio.feature);
                                    const rbMatch = scoreAgainstAllProfiles(rb, activeProfiles);
                                    const r = rb.mid > 0 ? Math.round((rb.highMid / rb.mid) * 100) / 100 : 0;
                                    return (
                                      <div key={ratio.label} className={cn(
                                        "p-2 rounded-lg text-center text-[10px] border",
                                        ratio.label === crossCabCurrentRatio.label
                                          ? "bg-teal-500/10 border-teal-500/20"
                                          : "bg-white/[0.02] border-white/5"
                                      )}>
                                        <p className="font-mono text-foreground mb-1">{ratio.label}</p>
                                        <p className="text-green-400">M {rb.mid.toFixed(1)}</p>
                                        <p className="text-yellow-400">HM {rb.highMid.toFixed(1)}</p>
                                        <p className="text-orange-400">P {rb.presence.toFixed(1)}</p>
                                        <p className={cn(
                                          "mt-0.5 font-mono",
                                          r < 1.0 ? "text-blue-400" : r <= 2.0 ? "text-green-400" : "text-amber-400"
                                        )}>
                                          {r.toFixed(2)}
                                        </p>
                                        <div className="mt-1">
                                          <span className={cn(
                                            "text-[9px] font-mono px-1 py-0.5 rounded",
                                            rbMatch.best.label === "strong" ? "bg-emerald-500/20 text-emerald-400" :
                                            rbMatch.best.label === "close" ? "bg-sky-500/20 text-sky-400" :
                                            rbMatch.best.label === "partial" ? "bg-amber-500/20 text-amber-400" :
                                            "bg-white/5 text-muted-foreground"
                                          )}>
                                            {rbMatch.best.profile[0]}{rbMatch.best.score}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="border-t border-white/5 pt-2 space-y-2">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5">
                                    {[
                                      { rank: 1, label: "Love", color: "bg-amber-500/20 text-amber-400 border border-amber-500/30" },
                                      { rank: 2, label: "Like", color: "bg-violet-500/20 text-violet-400 border border-violet-500/30" },
                                      { rank: 3, label: "Meh", color: "bg-slate-400/20 text-slate-300 border border-slate-400/30" },
                                    ].map(({ rank: r, label, color }) => (
                                      <Button
                                        key={r}
                                        size="sm"
                                        variant={crossCabRankings[blendKey] === r ? "default" : "ghost"}
                                        onClick={() => assignCrossCabRank(blendKey, r)}
                                        className={cn(
                                          "text-xs",
                                          crossCabRankings[blendKey] === r && color
                                        )}
                                        data-testid={`button-ccrank-${idx}-${r}`}
                                      >
                                        {label}
                                      </Button>
                                    ))}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => dismissCrossCab(blendKey)}
                                      className={cn(
                                        "text-xs",
                                        crossCabDismissed.has(blendKey) ? "text-muted-foreground" : "text-red-400"
                                      )}
                                      data-testid={`button-ccdismiss-${idx}`}
                                    >
                                      {crossCabDismissed.has(blendKey) ? "Undo" : "Nope"}
                                    </Button>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setBaseIR(cr.irA);
                                      setFeatureIRs([cr.irB]);
                                      setShowFoundation(false);
                                      setShowCrossCab(false);
                                      resetPairingState();
                                    }}
                                    className="text-[10px]"
                                    data-testid={`button-load-crosscab-${idx}`}
                                  >
                                    Load into Mixer
                                  </Button>
                                </div>

                                {crossCabRankings[blendKey] !== undefined && !crossCabDismissed.has(blendKey) && (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="text-[9px] text-muted-foreground mr-0.5">
                                        {crossCabRankings[blendKey] === 1 ? "why?" : crossCabRankings[blendKey] === 2 ? "improve?" : "issue?"}
                                      </span>
                                      {(crossCabRankings[blendKey] === 1
                                        ? [
                                            { tag: "perfect", label: "Perfect" },
                                            { tag: "balanced", label: "Balanced" },
                                            { tag: "punchy", label: "Punchy" },
                                            { tag: "warm", label: "Warm" },
                                            { tag: "aggressive", label: "Aggressive" },
                                          ]
                                        : crossCabRankings[blendKey] === 2
                                        ? [
                                            { tag: "more_bottom", label: "More bottom" },
                                            { tag: "less_harsh", label: "Less harsh" },
                                            { tag: "more_bite", label: "More bite" },
                                            { tag: "tighter", label: "Tighter" },
                                            { tag: "more_air", label: "More air" },
                                          ]
                                        : [
                                            { tag: "thin", label: "Thin" },
                                            { tag: "muddy", label: "Muddy" },
                                            { tag: "harsh", label: "Harsh" },
                                            { tag: "dull", label: "Dull" },
                                            { tag: "boomy", label: "Boomy" },
                                            { tag: "fizzy", label: "Fizzy" },
                                          ]
                                      ).map(({ tag, label }) => (
                                        <Button
                                          key={tag}
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => assignCrossCabFeedback(blendKey, tag)}
                                          className={cn(
                                            "text-[10px] h-5 px-1.5 rounded-sm",
                                            (crossCabFeedback[blendKey] || []).includes(tag)
                                              ? crossCabRankings[blendKey] === 1 ? "bg-amber-500/20 text-amber-400"
                                                : crossCabRankings[blendKey] === 2 ? "bg-violet-500/20 text-violet-400"
                                                : "bg-slate-400/20 text-slate-300"
                                              : "text-muted-foreground"
                                          )}
                                          data-testid={`button-ccfb-${idx}-${tag}`}
                                        >
                                          {label}
                                        </Button>
                                      ))}
                                    </div>
                                    <input
                                      type="text"
                                      placeholder={crossCabRankings[blendKey] === 1 ? "What makes it great..." : crossCabRankings[blendKey] === 2 ? "What would make it better..." : "Describe the issue..."}
                                      value={crossCabFeedbackText[blendKey] || ""}
                                      onChange={(e) => setCrossCabFeedbackText((prev) => ({ ...prev, [blendKey]: e.target.value }))}
                                      className="w-full text-[10px] bg-background border border-border/40 rounded-sm px-2 py-1 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                                      data-testid={`input-ccfb-text-${idx}`}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {crossCabHasRatings && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between gap-3 flex-wrap pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Brain className="w-3.5 h-3.5 text-teal-400" />
                    Submit ratings to refine your taste profile
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSubmitCrossCabRatings}
                    className="bg-teal-500/20 text-teal-400 border border-teal-500/30"
                    data-testid="button-submit-crosscab-ratings"
                  >
                    Submit Ratings
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>

        {hasPairingPool && (suggestedPairs.length > 0 || ratioRefinePhase || tasteCheckPhase) && !doneRefining && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-4 rounded-xl bg-violet-500/5 border border-violet-500/20">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                Suggested Pairings
                {totalRoundsCompleted > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-mono" data-testid="badge-round">
                    Round {totalRoundsCompleted + 1}
                  </Badge>
                )}
              </h4>
              {totalRoundsCompleted > 0 && (
                <span className="text-[10px] text-muted-foreground font-mono" data-testid="text-cumulative-signals">
                  {cumulativeSignals.liked} rated / {cumulativeSignals.noped} noped so far
                </span>
              )}
            </div>
            {!ratioRefinePhase && !tasteCheckPhase && (
            <p className="text-xs text-muted-foreground mb-4">
              {totalRoundsCompleted === 0
                ? learnedProfile && learnedProfile.status !== "no_data"
                  ? `Predicted best pairings based on your taste profile (${learnedProfile.signalCount} signals). Rate to confirm or refine.`
                  : "Top 3 blends from your set. Love, Like, or Meh the ones worth keeping. Nope the rest."
                : "Fresh suggestions informed by your taste. Keep refining or load your top pick into the mixer."
              }
            </p>
            )}
            {!ratioRefinePhase && !tasteCheckPhase && suggestedPairs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suggestedPairs.map((pair, idx) => {
                const pk = pairKey(pair);
                const isDismissed = dismissedPairings.has(pk);
                const assignedRank = pairingRankings[pk];
                const hiMidMidRatio = pair.blendBands.mid > 0
                  ? Math.round((pair.blendBands.highMid / pair.blendBands.mid) * 100) / 100
                  : 0;
                return (
                  <div
                    key={`${pair.baseFilename}-${pair.featureFilename}`}
                    className={cn(
                      "p-3 rounded-lg border space-y-3 transition-opacity",
                      isDismissed ? "opacity-40 bg-red-500/[0.03] border-red-500/10" :
                      assignedRank === 1 ? "bg-amber-500/10 border-amber-500/20" :
                      assignedRank !== undefined ? "bg-violet-500/[0.03] border-violet-500/10" :
                      "bg-white/[0.02] border-white/5"
                    )}
                    data-testid={`suggested-pairing-${idx}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {isDismissed ? "Nope" : `Pairing ${idx + 1}`}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dismissPairing(pk)}
                          className={cn(
                            "text-[10px] font-mono h-6 px-2",
                            isDismissed ? "text-muted-foreground" : "text-red-400"
                          )}
                          data-testid={`button-dismiss-${idx}`}
                        >
                          {isDismissed ? "Undo" : "Nope"}
                        </Button>
                      </div>
                      <p className="text-xs font-mono text-foreground truncate" data-testid={`text-pair-base-${idx}`}>
                        {pair.baseFilename.replace(/(_\d{13})?\.wav$/, "")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        + ({pair.suggestedRatio
                          ? `${Math.round(pair.suggestedRatio.base * 100)}/${Math.round(pair.suggestedRatio.feature * 100)}`
                          : "50/50"})
                      </p>
                      <p className="text-xs font-mono text-foreground truncate" data-testid={`text-pair-feature-${idx}`}>
                        {pair.featureFilename.replace(/(_\d{13})?\.wav$/, "")}
                      </p>
                    </div>

                    {!isDismissed && (
                      <>
                        <BandChart bands={pair.blendBands} height={12} compact />

                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <MatchBadge match={pair.bestMatch} />
                          <span className={cn(
                            "text-[10px] font-mono px-1.5 py-0.5 rounded",
                            hiMidMidRatio < 1.0 ? "bg-blue-500/20 text-blue-400" :
                            hiMidMidRatio <= 2.0 ? "bg-green-500/20 text-green-400" :
                            "bg-amber-500/20 text-amber-400"
                          )}>
                            {hiMidMidRatio.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          {[
                            { rank: 1, label: "Love", color: "bg-amber-500/20 text-amber-400 border border-amber-500/30" },
                            { rank: 2, label: "Like", color: "bg-violet-500/20 text-violet-400 border border-violet-500/30" },
                            { rank: 3, label: "Meh", color: "bg-slate-400/20 text-slate-300 border border-slate-400/30" },
                          ].map(({ rank: r, label, color }) => (
                            <Button
                              key={r}
                              size="sm"
                              variant={assignedRank === r ? "default" : "ghost"}
                              onClick={() => assignRank(pk, r)}
                              className={cn(
                                "text-xs flex-1",
                                assignedRank === r && color
                              )}
                              data-testid={`button-rank-${idx}-${r}`}
                            >
                              {label}
                            </Button>
                          ))}
                        </div>

                        {assignedRank !== undefined && (
                          <div className="space-y-1 pt-0.5">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[9px] text-muted-foreground mr-0.5">
                                {assignedRank === 1 ? "why?" : assignedRank === 2 ? "improve?" : "issue?"}
                              </span>
                              {(assignedRank === 1
                                ? [
                                    { tag: "perfect", label: "Perfect" },
                                    { tag: "balanced", label: "Balanced" },
                                    { tag: "punchy", label: "Punchy" },
                                    { tag: "warm", label: "Warm" },
                                    { tag: "aggressive", label: "Aggressive" },
                                  ]
                                : assignedRank === 2
                                ? [
                                    { tag: "more_bottom", label: "More bottom" },
                                    { tag: "less_harsh", label: "Less harsh" },
                                    { tag: "more_bite", label: "More bite" },
                                    { tag: "tighter", label: "Tighter" },
                                    { tag: "more_air", label: "More air" },
                                  ]
                                : [
                                    { tag: "thin", label: "Thin" },
                                    { tag: "muddy", label: "Muddy" },
                                    { tag: "harsh", label: "Harsh" },
                                    { tag: "dull", label: "Dull" },
                                    { tag: "boomy", label: "Boomy" },
                                    { tag: "fizzy", label: "Fizzy" },
                                  ]
                              ).map(({ tag, label }) => (
                                <Button
                                  key={tag}
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => assignFeedback(pk, tag)}
                                  className={cn(
                                    "text-[10px] h-5 px-1.5 rounded-sm",
                                    (pairingFeedback[pk] || []).includes(tag)
                                      ? assignedRank === 1 ? "bg-amber-500/20 text-amber-400"
                                        : assignedRank === 2 ? "bg-violet-500/20 text-violet-400"
                                        : "bg-slate-400/20 text-slate-300"
                                      : "text-muted-foreground"
                                  )}
                                  data-testid={`button-feedback-${idx}-${tag}`}
                                >
                                  {label}
                                </Button>
                              ))}
                            </div>
                            <input
                              type="text"
                              placeholder={assignedRank === 1 ? "What makes it great..." : assignedRank === 2 ? "What would make it better..." : "Describe the issue..."}
                              value={pairingFeedbackText[pk] || ""}
                              onChange={(e) => setPairingFeedbackText((prev) => ({ ...prev, [pk]: e.target.value }))}
                              className="w-full text-[10px] bg-background border border-border/40 rounded-sm px-2 py-1 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                              data-testid={`input-feedback-text-${idx}`}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            )}

            {canConfirm && !ratioRefinePhase && !tasteCheckPhase && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Target className="w-3.5 h-3.5 text-violet-400" />
                  {hasLoveOrLike ? "Submit & refine, or load your top pick into the mixer" : "Submit to keep refining"}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => handleSubmitRankings(false)}
                    className="bg-violet-500/20 text-violet-400 border border-violet-500/30"
                    data-testid="button-next-round"
                  >
                    {hasAnyRank ? "Submit & Show More" : "Submit & Next Round"}
                  </Button>
                  {hasLoveOrLike && (
                    <Button
                      size="sm"
                      onClick={() => handleSubmitRankings(true)}
                      className="bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      data-testid="button-confirm-load"
                    >
                      <Trophy className="w-3.5 h-3.5 mr-1" />
                      Load Top Pick
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {tasteCheckPhase && (
              <motion.div
                ref={tasteCheckRef}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 rounded-xl bg-teal-500/5 border border-teal-500/20 space-y-4"
                data-testid="taste-check-phase"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-teal-400" />
                    <span className="text-sm font-medium text-teal-400">
                      Taste {tasteCheckPhase.confidence === "high" ? "Verify" : "Check"} — Round {tasteCheckPhase.round + 1}
                    </span>
                    <Badge variant="outline" className={cn("text-[10px] border-teal-500/30", tasteCheckPhase.confidence === "high" ? "text-emerald-400/80" : tasteCheckPhase.confidence === "moderate" ? "text-amber-400/80" : "text-teal-400/80")}>
                      {tasteCheckPhase.confidence === "high" ? "Verifying" : tasteCheckPhase.confidence === "moderate" ? "Refining" : "Exploring"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] text-teal-400/80 border-teal-500/30">
                      {tasteCheckPhase.axisName}: {tasteCheckPhase.axisLabels[0]} vs {tasteCheckPhase.axisLabels[1]}
                    </Badge>
                    {!tasteCheckPhase.showingResult && (
                      <>
                        <div className="flex items-center rounded-md border border-teal-500/20 overflow-visible" data-testid="taste-mode-selector">
                          <button
                            onClick={() => setTasteCheckMode(tasteCheckMode === "acquisition" ? "auto" : "acquisition")}
                            className={cn(
                              "px-2 py-1 text-[10px] font-medium transition-colors rounded-l-md",
                              tasteCheckMode === "acquisition" || (tasteCheckMode === "auto" && !tasteCheckBinary)
                                ? "bg-teal-500/20 text-teal-300"
                                : "text-muted-foreground"
                            )}
                            data-testid="button-taste-acquisition"
                          >
                            4-Pick
                          </button>
                          <button
                            onClick={() => setTasteCheckMode(tasteCheckMode === "tester" ? "auto" : "tester")}
                            className={cn(
                              "px-2 py-1 text-[10px] font-medium transition-colors rounded-r-md",
                              tasteCheckMode === "tester" || (tasteCheckMode === "auto" && tasteCheckBinary)
                                ? "bg-teal-500/20 text-teal-300"
                                : "text-muted-foreground"
                            )}
                            data-testid="button-taste-tester"
                          >
                            A/B
                          </button>
                        </div>
                        <Button size="sm" variant="ghost" onClick={skipTasteCheck} className="text-xs text-muted-foreground" data-testid="button-skip-taste-check">
                          Skip
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-1.5 items-center">
                  {Array.from({ length: tasteCheckPhase.round + 1 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full transition-colors",
                        i < tasteCheckPhase.round ? "bg-teal-400" :
                        "bg-teal-400/50"
                      )}
                    />
                  ))}
                  <div className="h-1 w-4 rounded-full bg-white/5" />
                </div>

                {!tasteCheckPhase.showingResult && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {tasteCheckBinary
                        ? `Which blend do you prefer? Narrowing your ${tasteCheckPhase.axisName.toLowerCase()} preferences.`
                        : "Pick the blend that sounds best to you — comparing across the tonal spectrum."}
                    </p>
                    <div className={cn(
                      "grid gap-3",
                      !tasteCheckBinary && tasteCheckDisplayCandidates.length > 2 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"
                    )}>
                      {tasteCheckDisplayCandidates.map((pair, idx) => {
                        const hiMidMidRatio = pair.blendBands.mid > 0
                          ? Math.round((pair.blendBands.highMid / pair.blendBands.mid) * 100) / 100
                          : 0;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleTasteCheckPick(idx)}
                            className="p-3 rounded-lg border border-white/10 hover-elevate transition-all text-left space-y-2"
                            data-testid={`button-taste-option-${idx}`}
                          >
                            <p className="text-xs font-semibold text-center text-foreground uppercase tracking-widest">
                              {!tasteCheckBinary && tasteCheckDisplayCandidates.length > 2
                                ? String.fromCharCode(65 + idx)
                                : idx === 0 ? "A" : "B"}
                            </p>
                            <p className="text-[10px] font-mono text-foreground truncate">
                              {pair.baseFilename.replace(/(_\d{13})?\.wav$/, "")}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              + {pair.suggestedRatio
                                ? `${Math.round(pair.suggestedRatio.base * 100)}/${Math.round(pair.suggestedRatio.feature * 100)}`
                                : "50/50"}
                            </p>
                            <p className="text-[10px] font-mono text-foreground truncate">
                              {pair.featureFilename.replace(/(_\d{13})?\.wav$/, "")}
                            </p>
                            <BandChart bands={pair.blendBands} height={10} compact />
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <MatchBadge match={pair.bestMatch} />
                              <span className={cn(
                                "text-[10px] font-mono px-1.5 py-0.5 rounded",
                                hiMidMidRatio < 1.0 ? "bg-blue-500/20 text-blue-400" :
                                hiMidMidRatio <= 2.0 ? "bg-green-500/20 text-green-400" :
                                "bg-amber-500/20 text-amber-400"
                              )}>
                                {hiMidMidRatio.toFixed(2)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => handleTasteCheckPick(-1)}
                      className="w-full text-center py-1.5 text-[11px] text-muted-foreground hover-elevate rounded-md transition-colors"
                      data-testid="button-taste-tie"
                    >
                      No preference / Tie
                    </button>
                  </>
                )}

                {tasteCheckPhase.showingResult && tasteCheckPhase.userPick !== null && (
                  <div className="text-center py-2 space-y-1">
                    <p className="text-xs text-teal-400 font-medium">
                      {tasteCheckPhase.userPick === -1
                        ? `Tie noted for ${tasteCheckPhase.axisName.toLowerCase()} — moving on`
                        : `Noted — preference recorded for ${tasteCheckPhase.axisName.toLowerCase()}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {tasteCheckPhase.round + 1 < tasteCheckPhase.maxRounds
                        ? "Loading next comparison..."
                        : "Taste profile complete — moving to ratio refinement..."}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {ratioRefinePhase && (
              <motion.div
                ref={ratioRefineRef}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 rounded-xl bg-sky-500/5 border border-sky-500/20 space-y-4"
                data-testid="ratio-refine-phase"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-sky-400" />
                    <span className="text-sm font-medium text-sky-400">
                      {ratioRefinePhase.stage === "select"
                        ? "Ratio Refinement — Pick one to refine"
                        : ratioRefinePhase.stage === "done"
                        ? "Ratio Refinement — Complete"
                        : `Ratio Refinement — Round ${ratioRefinePhase.step + 1}`}
                    </span>
                  </div>
                  {ratioRefinePhase.stage === "select" && (
                    <Button size="sm" variant="ghost" onClick={skipRatioRefine} className="text-xs text-muted-foreground" data-testid="button-skip-refine">
                      Skip
                    </Button>
                  )}
                </div>

                {ratioRefinePhase.stage === "select" && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Which pairing do you want to explore different blend ratios for? Pick the one that matters most to you.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {ratioRefinePhase.candidates.map((cand, ci) => (
                        <button
                          key={ci}
                          onClick={() => selectRefineCandidate(ci)}
                          className="p-3 rounded-lg border border-white/10 hover-elevate transition-all text-left space-y-2"
                          data-testid={`button-select-refine-${ci}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className={cn("text-[10px]", cand.rank === 1 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-violet-500/20 text-violet-400 border-violet-500/30")}>
                              {cand.rank === 1 ? "Love" : "Like"}
                            </Badge>
                            {ci === 0 && <span className="text-[9px] text-sky-400 font-medium">(suggested)</span>}
                          </div>
                          <p className="text-xs font-mono text-foreground truncate">{cand.pair.baseFilename.replace(/(_\d{13})?\.wav$/, "")}</p>
                          <p className="text-[10px] text-muted-foreground">+ (50/50)</p>
                          <p className="text-xs font-mono text-foreground truncate">{cand.pair.featureFilename.replace(/(_\d{13})?\.wav$/, "")}</p>
                          <BandChart bands={cand.pair.blendBands} height={8} compact />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {ratioRefinePhase.stage === "refine" && ratioRefinePhase.selectedIdx !== null && (() => {
                  const cand = ratioRefinePhase.candidates[ratioRefinePhase.selectedIdx];
                  const current = ratioRefinePhase.matchups[ratioRefinePhase.step];
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className="font-mono text-foreground">{cand.pair.baseFilename.replace(/(_\d{13})?\.wav$/, "")}</span>
                        <span>+</span>
                        <span className="font-mono text-foreground">{cand.pair.featureFilename.replace(/(_\d{13})?\.wav$/, "")}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {(["a", "b"] as const).map((side) => {
                          const r = current[side];
                          const bands = blendFromRaw(cand.baseRaw, cand.featRaw, r, 1 - r);
                          return (
                            <button
                              key={side}
                              onClick={() => handleRatioPick(side)}
                              className="p-3 rounded-lg border border-white/10 hover-elevate transition-all text-left space-y-2"
                              data-testid={`button-pick-${side}`}
                            >
                              <p className="text-sm font-mono text-foreground text-center">
                                {Math.round(r * 100)}/{Math.round((1 - r) * 100)}
                              </p>
                              <BandChart bands={bands} height={10} compact />
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2 justify-center flex-wrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRatioPick("tie")}
                          className="text-xs text-muted-foreground"
                          data-testid="button-ratio-tie"
                        >
                          No difference
                        </Button>
                        {cand.rank === 2 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleNoRatioHelps}
                            className="text-xs text-red-400"
                            data-testid="button-no-ratio-helps"
                          >
                            No ratio helps
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {ratioRefinePhase.stage === "done" && (
                  <div className="text-center py-2">
                    {ratioRefinePhase.downgraded ? (
                      <p className="text-xs text-red-400">Downgraded to Meh — no ratio could improve it</p>
                    ) : (
                      <p className="text-xs text-emerald-400">
                        Preferred ratio: {Math.round((ratioRefinePhase.winner ?? 0.5) * 100)}/{Math.round((1 - (ratioRefinePhase.winner ?? 0.5)) * 100)} saved
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {hasPairingPool && noMorePairs && !doneRefining && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-xs text-muted-foreground">
                All pairings evaluated ({cumulativeSignals.liked} rated, {cumulativeSignals.noped} noped across {totalRoundsCompleted} rounds). {showFoundation ? "Pick a base from the ranked list above to continue in the mixer." : "Your preferences have been recorded."}
              </p>
            </div>
          </motion.div>
        )}

        {doneRefining && (
          <div className="mb-8 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2">
            <Brain className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-xs text-muted-foreground">
              {totalRoundsCompleted} round{totalRoundsCompleted !== 1 ? "s" : ""} complete -- {cumulativeSignals.liked} liked, {cumulativeSignals.noped} noped. Profiles refined. #1 pairing loaded below.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Base IR (foundation tone)</h3>
            {baseIR ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20"
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-sm font-mono text-indigo-400 truncate" data-testid="text-base-filename">
                    {baseIR.filename.replace(/(_\d{13})?\.wav$/, "")}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { setBaseIR(null); resetPairingState(); }}
                    data-testid="button-remove-base"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <BandChart bands={baseIR.bands} showScores profiles={activeProfiles} />
              </motion.div>
            ) : (
              <DropZone
                label="Drop Base IR"
                description="The foundation tone for your blend"
                onFilesAdded={handleBaseFile}
                isLoading={isLoadingBase}
                multiple={false}
              />
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Feature IRs (blend candidates)</h3>
            <DropZone
              label="Drop Feature IRs"
              description="One or more IRs to blend with the base"
              onFilesAdded={handleFeatureFiles}
              isLoading={isLoadingFeatures}
            />
            {featureIRs.length > 0 && baseIR && blendPartnerResults.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ranked by best blend with {baseIR.filename.replace(/(_\d{13})?\.wav$/, "")}</p>
                {blendPartnerResults.map((bp) => {
                  const origIdx = featureIRs.findIndex((f) => f.filename === bp.filename);
                  const rankLabel = bp.rank === 1 ? "Best Blend" : bp.rank === 2 ? "#2 Blend" : bp.rank === 3 ? "#3 Blend" : `#${bp.rank}`;
                  const rankColor = bp.rank === 1 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                    bp.rank <= 3 ? "bg-sky-500/20 text-sky-400 border-sky-500/30" :
                    "bg-white/5 text-muted-foreground border-white/10";
                  return (
                    <div key={bp.filename} className={cn(
                      "flex items-center justify-between gap-2 p-2 rounded-lg border",
                      bp.rank === 1 ? "bg-emerald-500/[0.03] border-emerald-500/10" : "bg-white/5 border-white/5"
                    )}>
                      <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                        <Badge variant="outline" className={cn("text-[9px] shrink-0", rankColor)}>
                          {rankLabel}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground truncate" data-testid={`text-feature-filename-${origIdx}`}>
                          {bp.filename.replace(/(_\d{13})?\.wav$/, "")}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                          best @ {bp.bestRatio.label} = {bp.bestBlendScore} ({bp.bestBlendProfile})
                        </span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFeature(origIdx)}
                        data-testid={`button-remove-feature-${origIdx}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : featureIRs.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {featureIRs.map((ir, idx) => {
                  const { best } = scoreAgainstAllProfiles(ir.bands);
                  return (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/5 border border-white/5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xs font-mono text-muted-foreground truncate" data-testid={`text-feature-filename-${idx}`}>
                          {ir.filename.replace(/(_\d{13})?\.wav$/, "")}
                        </span>
                        <MatchBadge match={best} />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFeature(idx)}
                        data-testid={`button-remove-feature-${idx}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        {baseIR && featureIRs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Blend Permutations
                <span className="text-muted-foreground font-normal">({featureIRs.length} combinations, sorted by match)</span>
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Base/Feature:</span>
                {BLEND_RATIOS.map((r, idx) => (
                  <Button
                    key={r.label}
                    size="sm"
                    variant={selectedRatio === idx ? "default" : "ghost"}
                    onClick={() => setSelectedRatio(idx)}
                    className={cn(
                      "font-mono text-xs",
                      selectedRatio === idx && "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                    )}
                    data-testid={`button-ratio-${r.label}`}
                  >
                    {r.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {sortedBlendResults.map((result, idx) => {
                  const blendKey = `${result.feature.filename}-${idx}`;
                  const isExpanded = expandedBlend === result.feature.filename;
                  const hiMidMidRatio = result.currentBlend.mid > 0
                    ? Math.round((result.currentBlend.highMid / result.currentBlend.mid) * 100) / 100
                    : 0;
                  return (
                    <motion.div
                      key={blendKey}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn(
                        "rounded-xl border",
                        result.currentMatch.best.label === "strong" ? "bg-emerald-500/[0.03] border-emerald-500/20" :
                        result.currentMatch.best.label === "close" ? "bg-sky-500/[0.03] border-sky-500/20" :
                        "bg-white/[0.02] border-white/5"
                      )}
                    >
                      <Button
                        variant="ghost"
                        onClick={() => setExpandedBlend(isExpanded ? null : result.feature.filename)}
                        className="w-full flex items-center justify-between gap-3 p-4 h-auto text-left rounded-xl"
                        data-testid={`button-expand-blend-${idx}`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                          <span className="text-xs font-mono text-indigo-400 truncate" data-testid={`text-blend-name-${idx}`}>
                            {baseIR.filename.replace(/(_\d{13})?\.wav$/, "")} + {result.feature.filename.replace(/(_\d{13})?\.wav$/, "")}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {currentRatio.label}
                          </span>
                          <MatchBadge match={result.currentMatch.best} />
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="hidden sm:flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground">Mid</span>
                            <span className="text-xs font-mono text-green-400">{result.currentBlend.mid.toFixed(1)}%</span>
                            <span className="text-[10px] text-muted-foreground ml-1">HiMid</span>
                            <span className="text-xs font-mono text-yellow-400">{result.currentBlend.highMid.toFixed(1)}%</span>
                            <span className="text-[10px] text-muted-foreground ml-1">Pres</span>
                            <span className="text-xs font-mono text-orange-400">{result.currentBlend.presence.toFixed(1)}%</span>
                            <span className={cn(
                              "text-[10px] font-mono px-1.5 py-0.5 rounded ml-1",
                              hiMidMidRatio < 1.0 ? "bg-blue-500/20 text-blue-400" :
                              hiMidMidRatio <= 2.0 ? "bg-green-500/20 text-green-400" :
                              "bg-amber-500/20 text-amber-400"
                            )}>
                              {hiMidMidRatio.toFixed(2)}
                            </span>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </Button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center" data-testid="text-label-base">Base</p>
                                  <BandChart bands={baseIR.bands} height={14} compact showScores profiles={activeProfiles} />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] text-indigo-400 uppercase tracking-wider text-center font-semibold" data-testid="text-label-blend">
                                    Blend ({currentRatio.label})
                                  </p>
                                  <BandChart bands={result.currentBlend} height={14} compact showScores profiles={activeProfiles} />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center" data-testid="text-label-feature">Feature</p>
                                  <BandChart bands={result.feature.bands} height={14} compact showScores profiles={activeProfiles} />
                                </div>
                              </div>

                              {result.currentMatch.best.deviations.length > 0 && (
                                <div className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5">
                                  <p className="text-[10px] text-muted-foreground mb-1">{result.currentMatch.best.summary}</p>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {result.currentMatch.best.deviations.map((d, i) => (
                                      <span key={i} className={cn(
                                        "text-[10px] font-mono px-1.5 py-0.5 rounded",
                                        d.direction === "high" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"
                                      )}>
                                        {d.band} {d.direction === "high" ? "+" : "-"}{d.amount.toFixed(1)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="border-t border-white/5 pt-3">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">All Ratios</p>
                                <div className="grid grid-cols-5 gap-2">
                                  {result.allRatioBlends.map((rb) => {
                                    const r = rb.bands.mid > 0 ? Math.round((rb.bands.highMid / rb.bands.mid) * 100) / 100 : 0;
                                    return (
                                      <div key={rb.ratio.label} className={cn(
                                        "p-2 rounded-lg text-center text-[10px] border",
                                        rb.ratio.label === currentRatio.label
                                          ? "bg-indigo-500/10 border-indigo-500/20"
                                          : "bg-white/[0.02] border-white/5"
                                      )} data-testid={`text-ratio-card-${rb.ratio.label}`}>
                                        <p className="font-mono text-foreground mb-1">{rb.ratio.label}</p>
                                        <p className="text-green-400">M {rb.bands.mid.toFixed(1)}</p>
                                        <p className="text-yellow-400">HM {rb.bands.highMid.toFixed(1)}</p>
                                        <p className="text-orange-400">P {rb.bands.presence.toFixed(1)}</p>
                                        <p className={cn(
                                          "mt-0.5 font-mono",
                                          r < 1.0 ? "text-blue-400" : r <= 2.0 ? "text-green-400" : "text-amber-400"
                                        )}>
                                          {r.toFixed(2)}
                                        </p>
                                        <div className="mt-1">
                                          <span className={cn(
                                            "text-[9px] font-mono px-1 py-0.5 rounded",
                                            rb.bestMatch.label === "strong" ? "bg-emerald-500/20 text-emerald-400" :
                                            rb.bestMatch.label === "close" ? "bg-sky-500/20 text-sky-400" :
                                            rb.bestMatch.label === "partial" ? "bg-amber-500/20 text-amber-400" :
                                            "bg-white/5 text-muted-foreground"
                                          )}>
                                            {rb.bestMatch.profile[0]}{rb.bestMatch.score}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {!baseIR && featureIRs.length === 0 && allIRs.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Blend className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">Use the Foundation Finder above to auto-pick a base IR, or manually drop IRs below.</p>
          </div>
        )}
      </div>
    </div>
  );
}
