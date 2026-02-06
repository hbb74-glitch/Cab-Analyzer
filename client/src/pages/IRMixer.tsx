import { useState, useCallback, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Layers, X, Blend, ChevronDown, ChevronUp, Crown, Target, Zap, Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { analyzeAudioFile, type AudioMetrics } from "@/hooks/use-analyses";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type TonalBands,
  type MatchResult,
  type SuggestedPairing,
  scoreAgainstAllProfiles,
  findFoundationIR,
  rankBlendPartners,
  suggestPairings,
  DEFAULT_PROFILES,
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

function ProfileScores({ bands }: { bands: TonalBands }) {
  const { results } = scoreAgainstAllProfiles(bands);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {results.map((r) => (
        <MatchBadge key={r.profile} match={r} />
      ))}
    </div>
  );
}

function BandChart({ bands, height = 20, compact = false, showScores = false }: { bands: TonalBands; height?: number; compact?: boolean; showScores?: boolean }) {
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
        {showScores && <ProfileScores bands={bands} />}
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
  const [rankingSubmitted, setRankingSubmitted] = useState(false);

  const handleBaseFile = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setIsLoadingBase(true);
    try {
      const file = files[0];
      const metrics = await analyzeAudioFile(file);
      const rawEnergy = extractRawEnergy(metrics);
      const bands = energyToPercent(rawEnergy);
      setBaseIR({ filename: file.name, metrics, rawEnergy, bands });
    } catch (e) {
      console.error("Failed to analyze base IR:", e);
    }
    setIsLoadingBase(false);
  }, []);

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
    } catch (e) {
      console.error("Failed to analyze feature IRs:", e);
    }
    setIsLoadingFeatures(false);
  }, []);

  const handleAllFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setIsLoadingAll(true);
    setShowFoundation(true);
    setPairingRankings({});
    setRankingSubmitted(false);
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
  }, []);

  const removeFeature = useCallback((idx: number) => {
    setFeatureIRs((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const currentRatio = BLEND_RATIOS[selectedRatio];

  const foundationResults = useMemo(() => {
    if (allIRs.length === 0) return [];
    return findFoundationIR(allIRs, DEFAULT_PROFILES);
  }, [allIRs]);

  const blendPartnerResults = useMemo(() => {
    if (!baseIR || featureIRs.length === 0) return [];
    return rankBlendPartners(baseIR, featureIRs, BLEND_RATIOS, DEFAULT_PROFILES);
  }, [baseIR, featureIRs]);

  const suggestedPairs = useMemo(() => {
    if (allIRs.length < 2) return [];
    return suggestPairings(allIRs, DEFAULT_PROFILES, 3);
  }, [allIRs]);

  const pairKey = useCallback((p: SuggestedPairing) =>
    `${p.baseFilename}||${p.featureFilename}`, []);

  const assignRank = useCallback((key: string, rank: number) => {
    setPairingRankings((prev) => {
      const next = { ...prev };
      if (next[key] === rank) {
        delete next[key];
        return next;
      }
      Object.keys(next).forEach((k) => {
        if (next[k] === rank) delete next[k];
      });
      next[key] = rank;
      return next;
    });
  }, []);

  const ranksNeeded = Math.min(suggestedPairs.length, 3);
  const assignedRanks = new Set(Object.values(pairingRankings));
  const allRanksAssigned = assignedRanks.size === ranksNeeded &&
    [1, 2, 3].slice(0, ranksNeeded).every((r) => assignedRanks.has(r));

  const handleSubmitRankings = useCallback(() => {
    setRankingSubmitted(true);
  }, []);

  const useAsBase = useCallback((ir: AnalyzedIR) => {
    setBaseIR(ir);
    setFeatureIRs(allIRs.filter((a) => a.filename !== ir.filename));
    setShowFoundation(false);
  }, [allIRs]);

  const blendResults = useMemo(() => {
    if (!baseIR || featureIRs.length === 0) return [];
    return featureIRs.map((feature) => {
      const allRatioBlends = BLEND_RATIOS.map((r) => {
        const bands = blendFromRaw(baseIR.rawEnergy, feature.rawEnergy, r.base, r.feature);
        const match = scoreAgainstAllProfiles(bands);
        return { ratio: r, bands, bestMatch: match.best };
      });
      const currentBlend = blendFromRaw(baseIR.rawEnergy, feature.rawEnergy, currentRatio.base, currentRatio.feature);
      const currentMatch = scoreAgainstAllProfiles(currentBlend);
      return {
        feature,
        currentBlend,
        currentMatch,
        allRatioBlends,
      };
    });
  }, [baseIR, featureIRs, currentRatio]);

  const sortedBlendResults = useMemo(() => {
    return [...blendResults].sort((a, b) => b.currentMatch.best.score - a.currentMatch.best.score);
  }, [blendResults]);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <Blend className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">IR Mixer</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Drop IRs to preview blend permutations scored against your tonal profiles.
          </p>
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

        {showFoundation && suggestedPairs.length > 0 && !rankingSubmitted && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-4 rounded-xl bg-violet-500/5 border border-violet-500/20">
            <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              Suggested Pairings
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              These are the 3 best 50/50 blends from your set. Rank them 1-2-3 and your #1 pick gets loaded into the mixer.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suggestedPairs.map((pair, idx) => {
                const pk = pairKey(pair);
                const assignedRank = pairingRankings[pk];
                const hiMidMidRatio = pair.blendBands.mid > 0
                  ? Math.round((pair.blendBands.highMid / pair.blendBands.mid) * 100) / 100
                  : 0;
                return (
                  <div
                    key={`${pair.baseFilename}-${pair.featureFilename}`}
                    className={cn(
                      "p-3 rounded-lg border space-y-3",
                      assignedRank === 1 ? "bg-amber-500/10 border-amber-500/20" :
                      assignedRank !== undefined ? "bg-violet-500/[0.03] border-violet-500/10" :
                      "bg-white/[0.02] border-white/5"
                    )}
                    data-testid={`suggested-pairing-${idx}`}
                  >
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pairing {idx + 1}</p>
                      <p className="text-xs font-mono text-foreground truncate" data-testid={`text-pair-base-${idx}`}>
                        {pair.baseFilename.replace(/(_\d{13})?\.wav$/, "")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">+ (50/50)</p>
                      <p className="text-xs font-mono text-foreground truncate" data-testid={`text-pair-feature-${idx}`}>
                        {pair.featureFilename.replace(/(_\d{13})?\.wav$/, "")}
                      </p>
                    </div>

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
                      <span className="text-[10px] text-muted-foreground shrink-0">Rank:</span>
                      {[1, 2, 3].map((r) => (
                        <Button
                          key={r}
                          size="sm"
                          variant={assignedRank === r ? "default" : "ghost"}
                          onClick={() => assignRank(pk, r)}
                          className={cn(
                            "font-mono text-xs flex-1",
                            assignedRank === r && (
                              r === 1 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                              r === 2 ? "bg-slate-400/20 text-slate-300 border border-slate-400/30" :
                              "bg-orange-800/20 text-orange-400 border border-orange-800/30"
                            )
                          )}
                          data-testid={`button-rank-${idx}-${r}`}
                        >
                          {r === 1 ? "1st" : r === 2 ? "2nd" : "3rd"}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {allRanksAssigned && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  Rankings set -- your #1 pick will be loaded as base + feature
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const topKey = Object.entries(pairingRankings).find(([, rank]) => rank === 1)?.[0];
                    if (topKey) {
                      const pair = suggestedPairs.find((p) => pairKey(p) === topKey);
                      if (pair) {
                        const baseIrData = allIRs.find((ir) => ir.filename === pair.baseFilename);
                        const featIrData = allIRs.find((ir) => ir.filename === pair.featureFilename);
                        if (baseIrData && featIrData) {
                          setBaseIR(baseIrData);
                          setFeatureIRs([featIrData]);
                          setShowFoundation(false);
                          handleSubmitRankings();
                        }
                      }
                    }
                  }}
                  className="bg-violet-500/20 text-violet-400 border border-violet-500/30"
                  data-testid="button-confirm-rankings"
                >
                  Confirm & Load #1
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}

        {rankingSubmitted && (
          <div className="mb-8 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Rankings saved for this session. Your #1 pairing is loaded below.
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
                    onClick={() => setBaseIR(null)}
                    data-testid="button-remove-base"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <BandChart bands={baseIR.bands} showScores />
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
                                  <BandChart bands={baseIR.bands} height={14} compact showScores />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] text-indigo-400 uppercase tracking-wider text-center font-semibold" data-testid="text-label-blend">
                                    Blend ({currentRatio.label})
                                  </p>
                                  <BandChart bands={result.currentBlend} height={14} compact showScores />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center" data-testid="text-label-feature">Feature</p>
                                  <BandChart bands={result.feature.bands} height={14} compact showScores />
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
