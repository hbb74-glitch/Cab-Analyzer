import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Blend, ChevronDown, ChevronUp, Target, Zap, Sparkles, Trophy, Brain, ArrowLeftRight, Trash2, MessageSquare, Search, Send, Loader2, Copy, Check, CheckCircle, BarChart3, RefreshCw, Clock, EyeOff, Eye } from "lucide-react";
import { BandChart, MatchBadge, BlendQualityBadge, BLEND_RATIOS, BAND_COLORS } from "@/components/BlendPreview";
import { ShotIntentBadge } from "@/components/ShotIntentBadge";
import { StandaloneBadge } from "@/components/StandaloneBadge";
import { MusicalRoleBadgeFromFeatures, computeSpeakerStats, type SpeakerStats } from "@/components/MusicalRoleBadge";
import { classifyIR, inferSpeakerIdFromFilename, setClassifyDebugFilename } from "@/lib/musical-roles";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { featurizeBlend, featurizeSingleIR, getTasteBias, resetTaste, getTasteStatus, meanVector, centerVector, getComplementBoost, recordOutcome, recordIROutcome, getIRWinRecords, recordEloOutcome, recordEloQuadOutcome, getEloRatings, setSandboxMode, isSandboxMode, clearSandbox, getSandboxStatus, resetAllTaste, persistTrainingMode, loadPersistedTrainingMode, hasSandboxData, recordShownPairs, getShownPairs, recordTasteVote, getTasteVoteCount, getTonalPreferences, type TasteContext, type EloEntry } from "@/lib/tasteStore";
import { analyzeAudioFile, type AudioMetrics } from "@/hooks/use-analyses";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { computeTonalFeatures, blendFeatures, BAND_KEYS } from "@/lib/tonal-engine";
import { api, type NormalizedIR } from "@shared/routes";
import {
  type TonalBands,
  type TonalFeatures,
  type MatchResult,
  type SuggestedPairing,
  type LearnedProfileData,
  type TasteCheckRoundResult,
  type TasteConfidence,
  scoreAgainstAllProfiles,
  scoreBlendQuality,
  suggestPairings,
  pickTasteCheckCandidates,
  getTasteConfidence,
  getTasteCheckRounds,
  shouldContinueTasteCheck,
  applyLearnedAdjustments,
  computeSpeakerRelativeProfiles,
  DEFAULT_PROFILES,
  getSpeakerFilenamePrefix,
} from "@/lib/preference-profiles";

interface AnalyzedIR {
  filename: string;
  metrics: AudioMetrics;
  rawEnergy: TonalBands;
  bands: TonalBands;
  features: TonalFeatures;
}

function TonalReadouts({ features, centroid }: { features?: TonalFeatures; centroid?: number }) {
  if (!features) return null;
  const tilt = features.tiltDbPerOct ?? 0;
  const smooth = features.smoothScore ?? 0;
  const tiltLabel = tilt >= 2.5 ? "Bright" : tilt > 0.5 ? "Bright lean" : tilt >= -0.5 ? "Neutral" : tilt > -2.5 ? "Dark lean" : "Dark";
  const smoothLabel = smooth >= 80 ? "Smooth" : smooth >= 60 ? "Moderate" : smooth >= 40 ? "Textured" : "Ragged";
  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="tonal-readouts">
      <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border",
        tilt >= 2.5 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
        tilt <= -2.5 ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
        "bg-white/5 text-muted-foreground border-white/10"
      )}>
        Tilt: {tilt > 0 ? "+" : ""}{tilt.toFixed(1)} dB ({tiltLabel})
      </span>
      <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border",
        smooth >= 70 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
        smooth >= 50 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
        "bg-red-500/10 text-red-400 border-red-500/20"
      )}>
        Smooth: {Math.round(smooth)}
      </span>
      {centroid != null && centroid > 0 && (
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-white/5 text-muted-foreground border-white/10">
          Centroid: {Math.round(centroid)} Hz
        </span>
      )}
    </div>
  );
}

interface IRData {
  filename: string;
  bands: TonalBands;
}

interface ToneSuggestion {
  baseIR: string;
  featureIR: string;
  ratio: string;
  expectedTone: string;
  reasoning: string;
  confidence: number;
}

interface TestAIResult {
  filename: string;
  score: number;
  category: string;
  reasoning: string;
}

function TestAIPanel({ allIRs, speakerStatsMap }: { allIRs: AnalyzedIR[]; speakerStatsMap: Map<string, import("@/lib/musical-roles").SpeakerStats> }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ interpretation: string; results: TestAIResult[] } | null>(null);
  const { toast } = useToast();

  const testMutation = useMutation({
    mutationFn: async (text: string) => {
      const irData = allIRs.map(ir => ({
        filename: ir.filename,
        subBass: ir.bands.subBass,
        bass: ir.bands.bass,
        lowMid: ir.bands.lowMid,
        mid: ir.bands.mid,
        highMid: ir.bands.highMid,
        presence: ir.bands.presence,
        ratio: ir.bands.mid > 0 ? Math.round((ir.bands.highMid / ir.bands.mid) * 100) / 100 : 1,
      }));
      const res = await apiRequest("POST", "/api/preferences/test-ai", { query: text, irs: irData });
      return res.json();
    },
    onSuccess: (data: { interpretation: string; results: TestAIResult[] }) => {
      setResults(data);
    },
    onError: () => {
      toast({ title: "Test failed", description: "AI couldn't process that query", variant: "destructive" });
    },
  });

  const categories = useMemo(() => {
    if (!results?.results) return [];
    const cats = new Set(results.results.map(r => r.category));
    return Array.from(cats);
  }, [results]);

  const isComparison = categories.length > 1;

  return (
    <div className="mb-8 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4" data-testid="test-ai-panel">
      <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
        <Zap className="w-4 h-4 text-orange-400" />
        Test AI
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Test the AI's tonal understanding. Type a tonal description or comparison and see how it classifies your loaded IRs.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim() && !testMutation.isPending) {
              testMutation.mutate(query.trim());
            }
          }}
          placeholder='e.g. "dark tight tones" or "scooped vs balanced" or "which have the most bite"'
          className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          disabled={testMutation.isPending}
          data-testid="input-test-ai"
        />
        <Button
          size="sm"
          onClick={() => query.trim() && testMutation.mutate(query.trim())}
          disabled={!query.trim() || testMutation.isPending}
          data-testid="button-submit-test-ai"
        >
          {testMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Test"}
        </Button>
      </div>

      <AnimatePresence>
        {results && results.results && results.results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 space-y-3"
            data-testid="test-ai-results"
          >
            <p className="text-[10px] text-muted-foreground italic">{results.interpretation}</p>

            {isComparison ? (
              <div className="space-y-3">
                {categories.map(cat => {
                  const catResults = results.results.filter(r => r.category === cat);
                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate">{cat}</Badge>
                        <span className="text-[10px] text-muted-foreground">{catResults.length} IRs</span>
                      </div>
                      {catResults.sort((a, b) => b.score - a.score).map((r, i) => (
                        <div key={i} className="flex items-start gap-2 pl-3">
                          <span className={cn(
                            "text-[10px] font-mono shrink-0 w-8 text-right",
                            r.score >= 70 ? "text-emerald-400" : r.score >= 40 ? "text-amber-400" : "text-red-400"
                          )}>
                            {r.score}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-medium text-foreground">{r.filename.replace(/\.wav$/i, '')}</span>
                              <MusicalRoleBadgeFromFeatures filename={r.filename} features={allIRs.find(ir => ir.filename === r.filename)?.features} speakerStatsMap={speakerStatsMap} />
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">{r.reasoning}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1.5">
                {results.results.sort((a, b) => b.score - a.score).map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={cn(
                      "text-[10px] font-mono shrink-0 w-8 text-right",
                      r.score >= 70 ? "text-emerald-400" : r.score >= 40 ? "text-amber-400" : "text-red-400"
                    )}>
                      {r.score}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium text-foreground">{r.filename.replace(/\.wav$/i, '')}</span>
                        <MusicalRoleBadgeFromFeatures filename={r.filename} features={allIRs.find(ir => ir.filename === r.filename)?.features} speakerStatsMap={speakerStatsMap} />
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{r.reasoning}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FindTonePanel({ allIRs, speakerStatsMap }: { allIRs: AnalyzedIR[]; speakerStatsMap: Map<string, import("@/lib/musical-roles").SpeakerStats> }) {
  const [toneRequestText, setToneRequestText] = useState("");
  const [toneResults, setToneResults] = useState<{ suggestions: ToneSuggestion[]; interpretation: string } | null>(null);
  const [toneCopied, setToneCopied] = useState(false);
  const { toast } = useToast();

  const toneRequestMutation = useMutation({
    mutationFn: async (text: string) => {
      const irData = allIRs.map(ir => ({
        filename: ir.filename,
        subBass: ir.bands.subBass,
        bass: ir.bands.bass,
        lowMid: ir.bands.lowMid,
        mid: ir.bands.mid,
        highMid: ir.bands.highMid,
        presence: ir.bands.presence,
        ratio: ir.bands.mid > 0 ? Math.round((ir.bands.highMid / ir.bands.mid) * 100) / 100 : 1,
        centroid: Math.round(ir.metrics.spectralCentroid ?? 0),
        smoothness: Math.round(ir.features.smoothScore ?? ir.metrics.frequencySmoothness ?? 0),
        tilt: parseFloat((ir.features.tiltDbPerOct ?? 0).toFixed(2)),
      }));
      const res = await apiRequest("POST", "/api/preferences/tone-request", { toneDescription: text, irs: irData });
      return res.json();
    },
    onSuccess: (data: { suggestions: ToneSuggestion[]; interpretation: string }) => {
      setToneResults(data);
    },
    onError: () => {
      toast({ title: "Failed to find tone matches", variant: "destructive" });
    },
  });

  return (
    <div className="mb-8 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4" data-testid="find-tone-panel">
      <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
        <Search className="w-4 h-4 text-violet-400" />
        Find Me This Tone
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Describe a tone and get blend combinations from your loaded IRs.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={toneRequestText}
          onChange={(e) => setToneRequestText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && toneRequestText.trim() && !toneRequestMutation.isPending) {
              toneRequestMutation.mutate(toneRequestText.trim());
            }
          }}
          placeholder='e.g. "thick aggressive metal tone with lots of bite" or "smooth warm jazz tone"'
          className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          disabled={toneRequestMutation.isPending}
          data-testid="input-tone-request"
        />
        <Button
          size="sm"
          onClick={() => toneRequestText.trim() && toneRequestMutation.mutate(toneRequestText.trim())}
          disabled={!toneRequestText.trim() || toneRequestMutation.isPending}
          data-testid="button-submit-tone-request"
        >
          {toneRequestMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Search"}
        </Button>
      </div>

      <AnimatePresence>
        {toneResults && toneResults.suggestions && toneResults.suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 space-y-2"
            data-testid="tone-results"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-muted-foreground italic">{toneResults.interpretation}</p>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  const lines: string[] = [];
                  lines.push(`Tone: "${toneRequestText}"`);
                  lines.push(toneResults.interpretation);
                  lines.push("");
                  for (const sug of toneResults.suggestions) {
                    lines.push(`[${Math.round(sug.confidence * 100)}%] ${sug.baseIR.replace(/\.wav$/i, '')} + ${sug.featureIR.replace(/\.wav$/i, '')} (${sug.ratio})`);
                    lines.push(`  Tone: ${sug.expectedTone}`);
                    lines.push(`  Why: ${sug.reasoning}`);
                    lines.push("");
                  }
                  navigator.clipboard.writeText(lines.join("\n")).then(() => {
                    setToneCopied(true);
                    setTimeout(() => setToneCopied(false), 2000);
                  });
                }}
                data-testid="button-copy-tone-results"
              >
                {toneCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
            {toneResults.suggestions.map((sug, i) => (
              <div
                key={i}
                className={cn(
                  "p-3 rounded-lg border",
                  sug.confidence >= 0.8 ? "border-emerald-500/30 bg-emerald-500/5" :
                  sug.confidence >= 0.6 ? "border-sky-500/30 bg-sky-500/5" :
                  "border-border/50 bg-card/30"
                )}
                data-testid={`tone-suggestion-${i}`}
              >
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
                    {sug.ratio}
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {Math.round(sug.confidence * 100)}% match
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-foreground mb-1 flex-wrap">
                  <span className="font-medium">{sug.baseIR.replace(/\.wav$/i, '')}</span>
                  <MusicalRoleBadgeFromFeatures filename={sug.baseIR} features={allIRs.find(ir => ir.filename === sug.baseIR)?.features} speakerStatsMap={speakerStatsMap} />
                  <span className="text-muted-foreground">+</span>
                  <span className="font-medium">{sug.featureIR.replace(/\.wav$/i, '')}</span>
                  <MusicalRoleBadgeFromFeatures filename={sug.featureIR} features={allIRs.find(ir => ir.filename === sug.featureIR)?.features} speakerStatsMap={speakerStatsMap} />
                </div>
                <p className="text-[10px] text-muted-foreground">{sug.expectedTone}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">{sug.reasoning}</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TonalInsightsPanel({ learnedProfile: baseProfile, eloRatings }: { learnedProfile: LearnedProfileData; eloRatings?: Record<string, EloEntry> }) {
  const [expanded, setExpanded] = useState(false);
  const [correctionText, setCorrectionText] = useState("");
  const [recentOnly, setRecentOnly] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const recentOptions = [
    { label: "All time", value: null },
    { label: "Last 50", value: 50 },
    { label: "Last 100", value: 100 },
    { label: "Last 200", value: 200 },
  ];

  const filteredQueryKey: string[] = recentOnly !== null
    ? [`/api/preferences/learned?recentOnly=${recentOnly}`]
    : ["/api/preferences/learned"];

  const { data: filteredProfile, isFetching: isFilteredFetching, refetch: refetchFiltered } = useQuery<LearnedProfileData>({
    queryKey: filteredQueryKey,
  });

  const learnedProfile = filteredProfile ?? baseProfile;
  const isFilterLoading = isFilteredFetching && !filteredProfile;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === "string" && key.startsWith("/api/preferences/learned");
    }});
    await refetchFiltered();
    setIsRefreshing(false);
    toast({ title: "Summary refreshed", duration: 1500 });
  };

  const correctionMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/preferences/correct", { correctionText: text });
      return res.json();
    },
    onSuccess: (data: { applied: boolean; summary: string }) => {
      toast({ title: "Correction applied", description: data.summary });
      setCorrectionText("");
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === "string" && key.startsWith("/api/preferences/learned");
      }});
    },
    onError: () => {
      toast({ title: "Failed to apply correction", variant: "destructive" });
    },
  });

  const renderFormattedSummary = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="text-xs font-semibold text-foreground mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>;
      }
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} className="text-xs text-muted-foreground leading-relaxed">
            {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-foreground">{part}</strong> : part)}
          </p>
        );
      }
      if (line.trim() === '') return <div key={i} className="h-1" />;
      if (line.startsWith('"') && line.endsWith('"')) {
        return <p key={i} className="text-xs text-muted-foreground/80 italic ml-2">{line}</p>;
      }
      return <p key={i} className="text-xs text-muted-foreground leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="mb-8 rounded-xl border border-purple-500/20 bg-purple-500/5 overflow-visible" data-testid="tonal-insights-panel">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between gap-2 text-left"
        data-testid="button-toggle-insights"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-foreground">What I Think You Like</span>
          <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
            {learnedProfile.status === "mastered" ? "Mastered" : learnedProfile.status === "confident" ? "Confident" : "Learning"}
          </Badge>
          {recentOnly && (
            <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 no-default-hover-elevate no-default-active-elevate">
              Last {recentOnly}
            </Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              <div className="flex items-center gap-2 flex-wrap" data-testid="insights-toolbar">
                <div className="flex items-center gap-1 rounded-md border border-border/50 bg-card/30 p-0.5">
                  {recentOptions.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecentOnly(opt.value);
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded text-[10px] font-medium transition-colors",
                        (recentOnly === opt.value) ? "bg-purple-500/20 text-purple-300" : "text-muted-foreground hover:text-foreground"
                      )}
                      data-testid={`filter-recent-${opt.value ?? "all"}`}
                    >
                      {opt.value ? <><Clock className="w-3 h-3 inline mr-1" />{opt.label}</> : opt.label}
                    </button>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 text-purple-300 hover:text-purple-200"
                  onClick={(e) => { e.stopPropagation(); handleRefresh(); }}
                  disabled={isRefreshing}
                  data-testid="button-refresh-insights"
                >
                  <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
                  Refresh
                </Button>
                {recentOnly && (learnedProfile as any).totalSignalCount && (
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    Showing {recentOnly} of {(learnedProfile as any).totalSignalCount} total ratings
                  </span>
                )}
              </div>

              <div className="rounded-lg bg-card/50 p-3 border border-border/50" data-testid="tonal-summary-text">
                {(isFilterLoading || isRefreshing) ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center" data-testid="summary-loading">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isRefreshing ? "Refreshing..." : "Loading filtered summary..."}
                  </div>
                ) : renderFormattedSummary(learnedProfile.tonalSummary || "")}
              </div>

              {eloRatings && Object.keys(eloRatings).length > 0 && (() => {
                const sorted = Object.entries(eloRatings)
                  .filter(([, e]) => e.matchCount > 0)
                  .sort((a, b) => b[1].rating - a[1].rating);
                const top = sorted.slice(0, 5);
                const totalMatches = sorted.reduce((s, [, e]) => s + e.matchCount, 0);
                if (top.length === 0) return null;
                return (
                  <div className="space-y-2" data-testid="elo-top-picks">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-medium text-foreground">Top Picks from Taste Voting</span>
                      <span className="text-[10px] text-muted-foreground">({totalMatches} comparisons)</span>
                    </div>
                    <div className="rounded-lg bg-card/50 border border-border/50 divide-y divide-border/30">
                      {top.map(([key, entry], i) => {
                        const files = key.split("||");
                        const cleanName = (f: string) => f.replace(/(_\d+)?\.wav$/i, "");
                        const winPct = entry.matchCount > 0 ? Math.round(((entry.winCount ?? 0) / entry.matchCount) * 100) : 0;
                        return (
                          <div key={key} className="flex items-center gap-3 px-3 py-2" data-testid={`elo-top-${i}`}>
                            <span className={cn(
                              "text-xs font-bold tabular-nums w-5 text-center",
                              i === 0 ? "text-amber-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-600" : "text-muted-foreground"
                            )}>
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-mono text-foreground truncate">{cleanName(files[0])}</p>
                              <p className="text-[10px] font-mono text-muted-foreground truncate">+ {cleanName(files[1] ?? "")}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={cn(
                                "text-[11px] font-mono font-medium tabular-nums",
                                entry.rating >= 1100 ? "text-emerald-400" : entry.rating >= 1000 ? "text-teal-400" : "text-amber-400"
                              )}>
                                {Math.round(entry.rating)}
                              </span>
                              <span className="text-[10px] text-muted-foreground tabular-nums">
                                {winPct}% W
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {learnedProfile.standaloneRecipes && learnedProfile.standaloneRecipes.length > 0 && (
                <div className="space-y-2" data-testid="standalone-recipes-section">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-medium text-foreground">Standalone Shot Recipes</span>
                    <span className="text-[10px] text-muted-foreground">(mic + position combos that work solo)</span>
                  </div>
                  <div className="rounded-lg bg-card/50 border border-border/50 divide-y divide-border/30">
                    {learnedProfile.standaloneRecipes.slice(0, 6).map((recipe, i) => {
                      const stars = recipe.avgRating >= 1.8 ? "★★" : recipe.avgRating >= 1.3 ? "★" : "·";
                      return (
                        <div key={i} className="flex items-center gap-3 px-3 py-2" data-testid={`standalone-recipe-${i}`}>
                          <span className={cn(
                            "text-xs font-bold w-5 text-center",
                            recipe.avgRating >= 1.8 ? "text-emerald-400" : recipe.avgRating >= 1.3 ? "text-teal-400" : "text-muted-foreground"
                          )}>
                            {stars}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-mono text-foreground truncate">
                              {recipe.mic} @ {recipe.position}{recipe.distance ? ` (${recipe.distance}")` : ""}
                            </p>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {recipe.count} IR{recipe.count > 1 ? "s" : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    These mic+position combos produced IRs that work well on their own without blending.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Send className="w-3 h-3 text-purple-400" />
                  Correct me
                </label>
                <p className="text-[10px] text-muted-foreground">
                  If the assessment above is wrong, tell me what should be different. This will adjust your profile with high priority.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={correctionText}
                    onChange={(e) => setCorrectionText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && correctionText.trim() && !correctionMutation.isPending) {
                        correctionMutation.mutate(correctionText.trim());
                      }
                    }}
                    placeholder='e.g. "I actually prefer darker tones with more low-end weight"'
                    className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    disabled={correctionMutation.isPending}
                    data-testid="input-correction"
                  />
                  <Button
                    size="sm"
                    onClick={() => correctionText.trim() && correctionMutation.mutate(correctionText.trim())}
                    disabled={!correctionText.trim() || correctionMutation.isPending}
                    data-testid="button-submit-correction"
                  >
                    {correctionMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2" data-testid="correction-quick-chips">
                  {[
                    { label: "More low-mids / weight", text: "I prefer more low-mid weight and thickness." },
                    { label: "Less low-mids / tighter", text: "I prefer tighter low end and less low-mid buildup." },
                    { label: "More cut / bite", text: "I prefer more upper-mid bite and cut in the mix." },
                    { label: "Less bite / smoother", text: "I prefer smoother presence with less bite." },
                    { label: "Less fizz", text: "I strongly dislike fizz and harsh top end; reduce 7\u201310k." },
                    { label: "More air (not fizz)", text: "I like a bit more air/shine without fizz or harshness." },
                  ].map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      className="px-2 py-1 rounded border border-zinc-700 text-[10px] text-muted-foreground hover:text-foreground hover:border-zinc-500"
                      onClick={() => setCorrectionText((prev) => (prev ? `${prev} ${c.text}` : c.text))}
                      data-testid={`correction-chip-${c.label.replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
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

export default function Learner() {
  const { toast } = useToast();
  const [allIRs, setAllIRs] = useState<AnalyzedIR[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [showVoteHistory, setShowVoteHistory] = useState(false);
  const [pairingRankings, setPairingRankings] = useState<Record<string, number>>({});
  const [pairingFeedback, setPairingFeedback] = useState<Record<string, string[]>>({});
  const [pairingFeedbackText, setPairingFeedbackText] = useState<Record<string, string>>({});
  const [dismissedPairings, setDismissedPairings] = useState<Set<string>>(new Set());
  const [evaluatedPairs, setEvaluatedPairs] = useState<Set<string>>(new Set());
  const [exposureCounts, setExposureCounts] = useState<Map<string, number>>(new Map());
  const [pairingRound, setPairingRound] = useState(0);
  const [totalRoundsCompleted, setTotalRoundsCompleted] = useState(0);
  const [cumulativeSignals, setCumulativeSignals] = useState({ liked: 0, noped: 0 });
  const [votingLog, setVotingLog] = useState<{ round: number; base: string; feature: string; rating: string; tags: string; text: string; score: number; profile: string }[]>([]);
  const [doneRefining, setDoneRefining] = useState(false);
  const [noMorePairs, setNoMorePairs] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

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
    pendingRefineCandidates: { pair: SuggestedPairing; rank: number; baseFeatures: TonalFeatures; featFeatures: TonalFeatures }[];
    pendingLoadTopPick: boolean;
  } | null>(null);
  const [tasteCheckPassed, setTasteCheckPassed] = useState(false);
  const [tasteCheckMode, setTasteCheckMode] = useState<"learning" | "acquisition" | "tester" | "ratio">("learning");
  const [refinementEnabled, setRefinementEnabled] = useState(true);
  const [tasteIntent, setTasteIntent] = useState<"rhythm" | "lead" | "clean">("rhythm");
  const [tasteVersion, setTasteVersion] = useState(0);
  const [trainingMode, setTrainingMode] = useState(() => {
    const persisted = loadPersistedTrainingMode();
    if (persisted) setSandboxMode(true);
    return persisted;
  });
  const [tasteTieMode, setTasteTieMode] = useState(false);
  const [tasteTieSelected, setTasteTieSelected] = useState<Set<number>>(new Set());
  const [blindMode, setBlindMode] = useState(false);
  const [resetAllConfirm, setResetAllConfirm] = useState(false);
  const [singleIrLearnOpen, setSingleIrLearnOpen] = useState(false);
  const [singleIrRatings, setSingleIrRatings] = useState<Record<string, "love" | "like" | "meh" | "nope">>({});
  const [singleIrPage, setSingleIrPage] = useState(0);
  const [singleIrTags, setSingleIrTags] = useState<Record<string, string[]>>({});
  const [singleIrNotes, setSingleIrNotes] = useState<Record<string, string>>({});
  const [singleIrDecided, setSingleIrDecided] = useState<Set<string>>(new Set());
  const [singleIrPrevRatings, setSingleIrPrevRatings] = useState<Record<string, { action: string; count: number }>>({});
  const [singleIrReassessing, setSingleIrReassessing] = useState(false);
  const [clearSpeakerConfirm, setClearSpeakerConfirm] = useState<string | null>(null);

  const tasteCheckRef = useRef<HTMLDivElement>(null);
  const tasteCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tasteCheckModeRef = useRef(tasteCheckMode);
  tasteCheckModeRef.current = tasteCheckMode;

  useEffect(() => {
    if (tasteCheckPhase && tasteCheckPhase.userPick === null && tasteCheckRef.current) {
      tasteCheckRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [tasteCheckPhase]);

  const [ratioRefinePhase, setRatioRefinePhase] = useState<{
    stage: "select" | "refine" | "done";
    candidates: { pair: SuggestedPairing; rank: number; baseFeatures: TonalFeatures; featFeatures: TonalFeatures }[];
    selectedIdx: number | null;
    step: number;
    matchups: { a: number; b: number }[];
    lowIdx: number;
    highIdx: number;
    winner: number | null;
    downgraded: boolean;
    pendingLoadTopPick: boolean;
  } | null>(null);

  const ratioRefineRef = useRef<HTMLDivElement>(null);
  const pairingSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ratioRefinePhase?.stage === "select" && ratioRefineRef.current) {
      ratioRefineRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [ratioRefinePhase?.stage]);

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
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === "string" && key.startsWith("/api/preferences/learned");
      }});
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
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === "string" && key.startsWith("/api/preferences/learned");
      }});
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

  const speakerRelativeProfiles = useMemo(() => {
    if (allIRs.length < 3) return DEFAULT_PROFILES;
    return computeSpeakerRelativeProfiles(allIRs);
  }, [allIRs]);

  const speakerStatsMap = useMemo(() => {
    if (allIRs.length < 2) return new Map<string, import("@/lib/musical-roles").SpeakerStats>();
    return computeSpeakerStats(allIRs.map(ir => {
      const bp = ir.features.bandsPercent;
      const tf: any = {
        bandsPercent: bp,
        spectralCentroidHz: ir.features.spectralCentroidHz ?? 0,
        tiltDbPerOct: ir.features.tiltDbPerOct ?? 0,
        rolloffFreq: ir.features.rolloffFreq ?? 0,
        smoothScore: ir.features.smoothScore ?? 0,
      };
      return { filename: ir.filename, tf };
    }));
  }, [allIRs]);

  const getRoleForFilename = useCallback((filename: string): string => {
    const ir = allIRs.find(i => i.filename === filename);
    if (!ir?.features) return "Foundation";
    const spk = inferSpeakerIdFromFilename(filename);
    const st = speakerStatsMap.get(spk);
    return classifyIR(ir.features, filename, st);
  }, [allIRs, speakerStatsMap]);

  const copyIRSummaryTSV = useCallback(() => {
    if (!allIRs.length) return;
    const fmt = (v: any, digits = 1) => {
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n.toFixed(digits) : "";
    };
    const header = [
      "filename", "score",
      "musical_role", "raw_role", "role_source",
      "centroid_exported_hz", "centroid_computed_hz",
      "spectral_tilt_db_per_oct", "rolloff_or_high_extension_hz",
      "smooth_score", "hiMidMid_ratio",
      "subBass_pct", "bass_pct", "lowMid_pct", "mid_pct", "highMid_pct", "presence_pct", "air_pct",
      "notes",
    ].join("\t");
    if (allIRs.length > 0) {
      const spk0 = inferSpeakerIdFromFilename(allIRs[0].filename);
      const stats0 = speakerStatsMap.get(spk0);
      console.log("[Learner TSV] speakerStats for", spk0, ":", stats0 ? JSON.stringify({ mean: stats0.mean, std: stats0.std }) : "NONE");
    }
    const rows = allIRs.map(ir => {
      const tf = ir.features;
      const bp = tf.bandsPercent;
      const spk = inferSpeakerIdFromFilename(ir.filename);
      const stats = speakerStatsMap.get(spk);
      if (ir.filename.includes("R121_Cap_6in")) {
        setClassifyDebugFilename("[Learner] " + ir.filename);
      }
      const role = classifyIR(tf, ir.filename, stats);
      if (ir.filename.includes("R121_Cap_6in")) {
        setClassifyDebugFilename(null);
        console.log("[Learner TSV DEBUG] R121_Cap_6in role:", role);
      }
      const centroid = fmt(tf.spectralCentroidHz ?? 0, 0);
      const tilt = fmt(tf.tiltDbPerOct ?? 0);
      const rolloff = fmt(tf.rolloffFreq ?? 0, 1);
      const smooth = fmt(tf.smoothScore ?? 0, 0);
      const hiMidVal = bp.highMid ?? 0;
      const midVal = bp.mid ?? 0;
      const hiMidMid = midVal > 0 ? fmt(hiMidVal / midVal, 2) : "";
      const scale = (bp.subBass + bp.bass + bp.lowMid + bp.mid + bp.highMid + bp.presence + (bp.air ?? 0)) < 2 ? 100 : 1;
      return [
        ir.filename,
        "",
        role,
        "",
        "computed",
        centroid,
        centroid,
        tilt,
        rolloff,
        smooth,
        hiMidMid,
        fmt((bp.subBass ?? 0) * scale, 1),
        fmt((bp.bass ?? 0) * scale, 1),
        fmt((bp.lowMid ?? 0) * scale, 1),
        fmt((bp.mid ?? 0) * scale, 1),
        fmt((bp.highMid ?? 0) * scale, 1),
        fmt((bp.presence ?? 0) * scale, 1),
        fmt((bp.air ?? 0) * scale, 2),
        "",
      ].join("\t");
    });
    const tsv = [header, ...rows].join("\n");
    navigator.clipboard.writeText(tsv).then(() => {
      toast({ title: "Copied", description: `${allIRs.length} IR summary rows copied to clipboard` });
    });
  }, [allIRs, speakerStatsMap, toast]);

  const activeProfiles = useMemo(() => {
    if (!learnedProfile || learnedProfile.status === "no_data") return speakerRelativeProfiles;
    return applyLearnedAdjustments(speakerRelativeProfiles, learnedProfile);
  }, [learnedProfile, speakerRelativeProfiles]);

  const resetPairingState = useCallback(() => {
    setPairingRankings({});
    setPairingFeedback({});
    setPairingFeedbackText({});
    setDismissedPairings(new Set());
    setPairingRound(0);
    setTotalRoundsCompleted(0);
    setVotingLog([]);
    setDoneRefining(false);
    setNoMorePairs(false);
    setHistoryLoaded(false);
    setTasteCheckPhase(null);
    setTasteCheckPassed(false);
    setExposureCounts(new Map());
  }, []);

  const normalizeViaServer = useCallback(async (
    items: Array<{ filename: string; metrics: AudioMetrics }>
  ): Promise<Map<string, NormalizedIR>> => {
    try {
      const irs = items.map(it => ({
        filename: it.filename,
        subBassEnergy: it.metrics.subBassEnergy,
        bassEnergy: it.metrics.bassEnergy,
        lowMidEnergy: it.metrics.lowMidEnergy,
        midEnergy6: it.metrics.midEnergy6,
        highMidEnergy: it.metrics.highMidEnergy,
        presenceEnergy: it.metrics.presenceEnergy,
        ultraHighEnergy: it.metrics.ultraHighEnergy,
        spectralCentroid: it.metrics.spectralCentroid,
        spectralTilt: (it.metrics as any).spectralTilt,
        rolloffFreq: (it.metrics as any).rolloffFreq,
        smoothScore: (it.metrics as any).smoothScore,
      }));
      const res = await fetch(api.normalizeBands.normalize.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ irs }),
      });
      if (!res.ok) throw new Error("normalize failed");
      const data = api.normalizeBands.normalize.responses[200].parse(await res.json());
      const map = new Map<string, NormalizedIR>();
      for (const r of data.results) map.set(r.filename, r);
      return map;
    } catch (e) {
      console.error("Server normalization failed, falling back to client:", e);
      return new Map();
    }
  }, []);

  const buildFeaturesFromServer = useCallback((metrics: AudioMetrics, norm: NormalizedIR): TonalFeatures => {
    const bandsPercent = {
      subBass: norm.subBassPercent / 100,
      bass: norm.bassPercent / 100,
      lowMid: norm.lowMidPercent / 100,
      mid: norm.midPercent / 100,
      highMid: norm.highMidPercent / 100,
      presence: norm.presencePercent / 100,
      air: norm.airPercent / 100,
    };
    const featureSource: any = {
      ...metrics,
      bandsPercent,
      spectralCentroidHz: norm.spectralCentroidHz,
      spectralTilt: norm.spectralTiltDbPerOct,
      rolloffFreq: norm.rolloffFreq,
      smoothScore: norm.smoothScore,
    };
    return computeTonalFeatures(featureSource);
  }, []);

  const handleAllFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setIsLoadingAll(true);
    resetPairingState();
    try {
      const analyzed: Array<{ filename: string; metrics: AudioMetrics }> = [];
      for (const file of files) {
        const metrics = await analyzeAudioFile(file);
        analyzed.push({ filename: file.name, metrics });
      }
      const normMap = await normalizeViaServer(analyzed);
      console.log("[Learner] normalizeViaServer returned", normMap.size, "entries for", analyzed.length, "files");
      const results: AnalyzedIR[] = analyzed.map(({ filename, metrics }) => {
        const norm = normMap.get(filename);
        const features = norm ? buildFeaturesFromServer(metrics, norm) : computeTonalFeatures(metrics);
        return { filename, metrics, rawEnergy: features.bandsRaw, bands: features.bandsPercent, features };
      });
      setAllIRs(results);
    } catch (e) {
      console.error("Failed to analyze IRs:", e);
    }
    setIsLoadingAll(false);
  }, [resetPairingState, normalizeViaServer, buildFeaturesFromServer]);


  const pairingPool = useMemo(() => {
    if (allIRs.length >= 2) return allIRs;
    return [];
  }, [allIRs]);

  const tasteContext: TasteContext = useMemo(() => {
    const speakerPrefix = (pairingPool[0]?.filename ?? "unknown").split("_")[0] ?? "unknown";
    return { speakerPrefix, mode: "blend", intent: tasteIntent };
  }, [pairingPool, tasteIntent]);

  const tasteStatus = useMemo(() => getTasteStatus(tasteContext), [tasteContext, tasteVersion]);

  const singleIrTasteContext: TasteContext = useMemo(() => {
    const speakerPrefix =
      (pairingPool[0]?.filename ?? "unknown").split("_")[0] ?? "unknown";
    return { speakerPrefix, mode: "singleIR", intent: tasteIntent };
  }, [pairingPool, tasteIntent]);

  const singleIrTasteStatus = useMemo(() => getTasteStatus(singleIrTasteContext), [singleIrTasteContext, tasteVersion]);

  useEffect(() => {
    try {
      setTasteCheckPhase(null as any);
    } catch {}
    try {
      modeTriggeredTasteCheck.current = false;
    } catch {}
    try {
      // @ts-ignore
      setTasteCheckRound?.(0);
      // @ts-ignore
      setTasteCheckHistory?.([]);
    } catch {}
  }, [tasteIntent]);

  const SINGLE_IR_PAGE_SIZE = 4;
  const singleIrTotalPages = useMemo(() => {
    const n = singleIrReassessing ? pairingPool.length : pairingPool.filter(ir => !singleIrDecided.has(ir.filename)).length;
    return Math.max(1, Math.ceil(n / SINGLE_IR_PAGE_SIZE));
  }, [pairingPool, singleIrDecided, singleIrReassessing]);

  const singleIrUndecided = useMemo(() => {
    if (singleIrReassessing) return pairingPool;
    return pairingPool.filter(ir => !singleIrDecided.has(ir.filename));
  }, [pairingPool, singleIrDecided, singleIrReassessing]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(singleIrUndecided.length / SINGLE_IR_PAGE_SIZE) - 1);
    if (singleIrPage > maxPage) setSingleIrPage(maxPage);
  }, [singleIrUndecided.length, singleIrPage]);

  const singleIrPageItems = useMemo(() => {
    const start = singleIrPage * SINGLE_IR_PAGE_SIZE;
    const end = start + SINGLE_IR_PAGE_SIZE;
    return singleIrUndecided.slice(start, end);
  }, [singleIrUndecided, singleIrPage]);

  const WHY_TAGS = useMemo(() => ([
    "perfect",
    "balanced",
    "punchy",
    "warm",
    "aggressive",
    "tight",
    "articulate",
    "cut",
    "thick",
    "fast_attack",
  ]), []);

  const IMPROVE_TAGS = useMemo(() => ([
    "more_bottom",
    "more_mids",
    "less_harsh",
    "more_bite",
    "tighter",
    "more_air",
    "less_fizz",
    "less_mud",
    "too_scooped",
  ]), []);

  const SOLO_WHY_TAGS = useMemo(() => ([
    "balanced_standalone",
    "full_range",
    "usable_solo",
    "no_partner_needed",
    "punchy",
    "articulate",
    "warm",
    "tight",
  ]), []);

  const SOLO_IMPROVE_TAGS = useMemo(() => ([
    "needs_more_body",
    "needs_more_cut",
    "almost_solo",
    "close_but_thin",
    "close_but_dark",
    "close_but_bright",
    "good_with_help",
  ]), []);

  const SOLO_ISSUE_TAGS = useMemo(() => ([
    "needs_partner",
    "too_narrow",
    "too_scooped",
    "one_dimensional",
    "harsh_solo",
    "muddy_solo",
    "fizzy_solo",
    "thin_solo",
    "honky_solo",
    "lacks_presence",
    "no_low_end",
    "no_top_end",
  ]), []);

  const ISSUE_TAGS = useMemo(() => ([
    "thin",
    "muddy",
    "harsh",
    "dull",
    "boomy",
    "fizzy",
    "too_bright",
    "too_dark",
    "too_fizzy",
    "too_thick",
    "too_thin",
    "too_scooped",
    "too_honky",
    "harsh_attack",
    "lacks_cut",
    "lacks_punch",
    "smooth_but_dull",
  ]), []);

  const toggleSingleTag = useCallback((filename: string, tag: string) => {
    setSingleIrTags(prev => {
      const cur = prev[filename] ?? [];
      const next = cur.includes(tag) ? cur.filter(t => t !== tag) : [...cur, tag];
      return { ...prev, [filename]: next };
    });
  }, []);

  const toggleBlendTag = useCallback((pairKey: string, tag: string) => {
    setPairingFeedback(prev => {
      const cur = prev[pairKey] ?? [];
      const next = cur.includes(tag) ? cur.filter(t => t !== tag) : [...cur, tag];
      return { ...prev, [pairKey]: next };
    });
  }, []);

  const featuresByFilename = useMemo(() => {
    const m = new Map<string, TonalFeatures>();
    for (const ir of pairingPool) {
      if (ir?.filename && ir?.features) m.set(ir.filename, ir.features);
    }
    return m;
  }, [pairingPool]);

  const rerankTasteCandidatesForContext = useCallback((cands: SuggestedPairing[]) => {
    if (!cands || cands.length < 2) return cands;

    const hash = (s: string) => {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };

    const scored = cands.map((p) => {
      const bF = featuresByFilename.get(p.baseFilename);
      const fF = featuresByFilename.get(p.featureFilename);
      let bias = 0;
      let conf = 0;
      try {
        if (bF && fF) {
          const vec = featurizeBlend(bF, fF, 0.5);
          const r = getTasteBias(tasteContext, vec);
          bias = r.bias;
          conf = r.confidence;
        }
      } catch {
      }
      const tie = hash(`${tasteIntent}::${p.baseFilename}::${p.featureFilename}`);
      return { p, bias, conf, tie };
    });

    scored.sort((a, b) => {
      if (b.bias !== a.bias) return b.bias - a.bias;
      if (b.conf !== a.conf) return b.conf - a.conf;
      return a.tie - b.tie;
    });

    return scored.map((s) => s.p);
  }, [featuresByFilename, tasteContext, tasteIntent]);

  const suggestedPairsRaw = useMemo(() => {
    if (pairingPool.length < 2) return { all: [] as any[], top: [] as any[] };
    const baseList = suggestPairings(
      pairingPool,
      activeProfiles,
      20,
      learnedProfile || undefined,
      evaluatedPairs.size > 0 ? evaluatedPairs : undefined,
      exposureCounts.size > 0 ? exposureCounts : undefined,
      tasteIntent as "rhythm" | "lead" | "clean",
      getIRWinRecords(tasteContext)
    );

    const vecByKey = new Map<string, number[]>();
    for (const p of baseList) {
      const bF = featuresByFilename.get(p.baseFilename);
      const fF = featuresByFilename.get(p.featureFilename);
      const ratio = p.suggestedRatio?.base ?? 0.5;
      if (bF && fF) {
        const k = `${p.baseFilename}__${p.featureFilename}__${ratio}`;
        vecByKey.set(k, featurizeBlend(bF, fF, ratio));
      }
    }
    const allVecs = Array.from(vecByKey.values());
    const mean = meanVector(allVecs);

    const rescored = baseList.map((p) => {
      const bF = featuresByFilename.get(p.baseFilename);
      const fF = featuresByFilename.get(p.featureFilename);
      const ratio = p.suggestedRatio?.base ?? 0.5;

      if (!bF || !fF) return { ...p, _tasteBoost: 0, _complementBoost: 0, _baseScore: p.score, _totalScore: p.score };

      const k = `${p.baseFilename}__${p.featureFilename}__${ratio}`;
      const xRaw = vecByKey.get(k) ?? featurizeBlend(bF, fF, ratio);
      const x = centerVector(xRaw, mean);
      const { bias, confidence } = getTasteBias(tasteContext, x);
      const tasteBoost = bias * 12 * (0.5 + confidence);
      const pairKey = `${p.baseFilename}__${p.featureFilename}`;
      const complementBoost = getComplementBoost(tasteContext, pairKey);
      const total = p.score + tasteBoost + complementBoost;
      return { ...p, score: total, _tasteBoost: tasteBoost, _complementBoost: complementBoost, _baseScore: p.score, _totalScore: total };
    });

    rescored.sort((a, b) => b.score - a.score);

    const cosineSim = (a: number[], b: number[]): number => {
      const n = Math.min(a.length, b.length);
      let dot = 0, na = 0, nb = 0;
      for (let i = 0; i < n; i++) {
        const xi = Number.isFinite(a[i]) ? a[i] : 0;
        const yi = Number.isFinite(b[i]) ? b[i] : 0;
        dot += xi * yi;
        na += xi * xi;
        nb += yi * yi;
      }
      const den = Math.sqrt(na) * Math.sqrt(nb);
      if (den < 1e-9) return 0;
      return dot / den;
    };

    const keyOf = (p: any): string => {
      const ratio = p.suggestedRatio?.base ?? 0.5;
      return `${p.baseFilename}__${p.featureFilename}__${ratio}`;
    };

    const vecOf = (p: any): number[] | null => {
      const k = keyOf(p);
      const xRaw = vecByKey.get(k);
      if (!xRaw) return null;
      return centerVector(xRaw, mean);
    };

    const POOL_N = 250;
    const pool = rescored.slice(0, Math.min(POOL_N, rescored.length));

    const selected: any[] = [];
    const used = new Set<string>();
    const add = (p: any) => {
      const k = keyOf(p);
      if (used.has(k)) return false;
      used.add(k);
      selected.push(p);
      return true;
    };

    if (pool[0]) add(pool[0]);

    const maxSimToSelected = (cand: any): number => {
      const v = vecOf(cand);
      if (!v) return 1;
      let maxSim = -1;
      for (const s of selected) {
        const sv = vecOf(s);
        if (!sv) continue;
        maxSim = Math.max(maxSim, cosineSim(v, sv));
      }
      return maxSim;
    };

    const topScore = Number.isFinite(selected[0]?.score) ? selected[0].score : (pool[0]?.score ?? 0);
    const minOkScore = topScore - 22;

    let boundary: any | null = null;
    let bestGap = Number.POSITIVE_INFINITY;
    for (let i = 1; i < pool.length; i++) {
      const cand = pool[i];
      if (used.has(keyOf(cand))) continue;
      const score = Number.isFinite(cand.score) ? cand.score : 0;
      if (score < minOkScore) continue;
      const gap = Math.abs(score - topScore);
      if (gap < bestGap) {
        bestGap = gap;
        boundary = cand;
      }
    }
    if (boundary) add(boundary);

    let contrarian: any | null = null;
    let lowestScore = Number.POSITIVE_INFINITY;
    for (let i = 1; i < pool.length; i++) {
      const cand = pool[i];
      if (used.has(keyOf(cand))) continue;
      const score = Number.isFinite(cand.score) ? cand.score : 0;
      if (score < minOkScore) continue;
      if (score < lowestScore) {
        lowestScore = score;
        contrarian = cand;
      }
    }
    if (contrarian) add(contrarian);

    let diverse: any | null = null;
    let lowestMaxSim = Number.POSITIVE_INFINITY;
    for (let i = 1; i < pool.length; i++) {
      const cand = pool[i];
      if (used.has(keyOf(cand))) continue;
      const score = Number.isFinite(cand.score) ? cand.score : 0;
      if (score < minOkScore) continue;
      const sim = selected.length ? maxSimToSelected(cand) : 0;
      if (sim < lowestMaxSim) {
        lowestMaxSim = sim;
        diverse = cand;
      }
    }
    if (diverse) add(diverse);

    for (const cand of pool) {
      if (selected.length >= 4) break;
      add(cand);
    }

    const top = selected.slice(0, 4).map((p, idx) => ({ ...p, rank: idx + 1 }));
    return { all: rescored, top };
  }, [pairingPool, activeProfiles, learnedProfile, evaluatedPairs, exposureCounts, featuresByFilename, tasteContext, tasteVersion, tasteIntent]);

  const suggestedPairs = suggestedPairsRaw.top;
  const copyVotingResults = useCallback(() => {
    const lines: string[] = [];
    const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
    lines.push(`=== Voting Results Export — ${ts} ===`);
    lines.push(`Mode: ${tasteCheckMode} | Intent: ${tasteIntent} | ${trainingMode ? "Sandbox" : "Live"}`);
    lines.push(`Pairing rounds completed: ${totalRoundsCompleted}`);
    const allTimeVotes = getTasteVoteCount(tasteContext);
    const currentSessionVotes = tasteCheckPhase?.history?.length ?? 0;
    lines.push(`Taste check votes (all time): ${allTimeVotes}${currentSessionVotes > 0 ? ` (${currentSessionVotes} this session)` : ""}`);
    if (learnedProfile && learnedProfile.status !== "no_data") {
      lines.push(`Profile status: ${learnedProfile.status} | Signals: ${learnedProfile.signalCount} | Liked: ${learnedProfile.likedCount} | Noped: ${learnedProfile.nopedCount}`);
    }
    lines.push("");

    const history = tasteCheckPhase?.history ?? [];
    if (history.length > 0) {
      lines.push("--- Taste Check Rounds ---");
      lines.push("round\ttype\taxis\toptions_offered\tpicked");
      history.forEach((h, idx) => {
        const optionNames = h.options.map(o => `${o.baseFilename} + ${o.featureFilename}`).join(" | ");
        const picked = h.pickedIndex >= 0 && h.pickedIndex < h.options.length
          ? `${h.options[h.pickedIndex].baseFilename} + ${h.options[h.pickedIndex].featureFilename}`
          : "(skipped)";
        lines.push(`${idx + 1}\t${h.roundType}\t${h.axisName}\t${optionNames}\t${picked}`);
      });
      lines.push("");
    }

    const currentRoundEntries = suggestedPairs
      .filter(pair => {
        const pk = `${pair.baseFilename}||${pair.featureFilename}`;
        return pairingRankings[pk] || dismissedPairings.has(pk);
      })
      .map(pair => {
        const pk = `${pair.baseFilename}||${pair.featureFilename}`;
        const isDismissed = dismissedPairings.has(pk);
        const rank = pairingRankings[pk];
        const rating = isDismissed ? "Nope" : rank === 1 ? "Love" : rank === 2 ? "Like" : rank === 3 ? "Meh" : "(unrated)";
        const tags = (pairingFeedback[pk] ?? []).join(", ");
        const text = pairingFeedbackText[pk]?.trim() ?? "";
        return { round: totalRoundsCompleted + 1, base: pair.baseFilename, feature: pair.featureFilename, rating, tags, text, score: Math.round(pair.blendScore), profile: pair.bestMatch.profile };
      });

    const allVotes = [...votingLog, ...currentRoundEntries];
    if (allVotes.length > 0) {
      lines.push("--- Pairing Ratings (all rounds) ---");
      lines.push("round\tbase_ir\tfeature_ir\trating\ttags\ttext_feedback\tblend_score\tprofile_match");
      for (const v of allVotes) {
        lines.push(`${v.round}\t${v.base}\t${v.feature}\t${v.rating}\t${v.tags}\t${v.text}\t${v.score}\t${v.profile}`);
      }
      lines.push("");
    }

    const irRatingEntries = Object.entries(singleIrRatings);
    if (irRatingEntries.length > 0) {
      lines.push("--- Individual IR Ratings ---");
      lines.push("filename\trating");
      for (const [filename, rating] of irRatingEntries) {
        lines.push(`${filename}\t${rating}`);
      }
      lines.push("");
    }

    const corrections = learnedProfile?.courseCorrections ?? [];
    if (corrections.length > 0) {
      lines.push("--- Preference Corrections Applied ---");
      corrections.forEach((c, i) => lines.push(`${i + 1}. ${c}`));
      lines.push("");
    }

    const eloData = getEloRatings(tasteContext);
    const eloEntries = Object.entries(eloData);
    if (eloEntries.length > 0) {
      const sorted = eloEntries.sort((a, b) => b[1].rating - a[1].rating);
      const ELO_BASE = 1500;

      const winners = sorted.filter(([, e]) => e.rating > ELO_BASE);
      const losers = sorted.filter(([, e]) => e.rating < ELO_BASE);
      const settledW = winners.filter(([, e]) => e.matchCount >= 2 && e.rating >= ELO_BASE + 15 && e.uncertainty < 0.75);
      const settledL = losers.filter(([, e]) => e.matchCount >= 1 && e.rating < ELO_BASE - 10 && e.uncertainty < 0.75);

      lines.push("--- Learning Evidence ---");
      lines.push(`Combos rated: ${eloEntries.length} | Winners: ${winners.length} | Losers: ${losers.length}`);
      lines.push(`Settled winners (held for refinement): ${settledW.length} | Settled losers (suppressed): ${settledL.length}`);
      lines.push("");

      const irScores: Record<string, { wins: number; losses: number; totalRating: number; appearances: number }> = {};
      for (const [key, entry] of eloEntries) {
        const parts = key.split("||");
        for (const ir of parts) {
          if (!irScores[ir]) irScores[ir] = { wins: 0, losses: 0, totalRating: 0, appearances: 0 };
          irScores[ir].appearances += 1;
          irScores[ir].totalRating += entry.rating;
          if (entry.rating > ELO_BASE) irScores[ir].wins += 1;
          else if (entry.rating < ELO_BASE) irScores[ir].losses += 1;
        }
      }
      const irLeaderboard = Object.entries(irScores)
        .map(([ir, s]) => ({ ir, ...s, avgRating: s.totalRating / s.appearances, winRate: s.appearances > 0 ? s.wins / s.appearances : 0 }))
        .sort((a, b) => b.avgRating - a.avgRating);

      if (irLeaderboard.length > 0) {
        lines.push("--- IR Leaderboard (individual IR win tendency) ---");
        lines.push("ir\twin_combos\tlose_combos\ttotal_appearances\tavg_combo_rating\twin_rate");
        for (const ir of irLeaderboard) {
          lines.push(`${ir.ir}\t${ir.wins}\t${ir.losses}\t${ir.appearances}\t${Math.round(ir.avgRating)}\t${(ir.winRate * 100).toFixed(0)}%`);
        }
        lines.push("");
      }

      if (settledW.length > 0) {
        lines.push("--- Emerging Favorites (settled winners) ---");
        for (const [key, entry] of settledW) {
          lines.push(`  ${key.replace("||", " + ")} — Elo ${Math.round(entry.rating)} (${entry.matchCount} matches)`);
        }
        lines.push("");
      }

      if (settledL.length > 0) {
        lines.push("--- Suppressed Combos (settled losers) ---");
        for (const [key, entry] of settledL) {
          lines.push(`  ${key.replace("||", " + ")} — Elo ${Math.round(entry.rating)} (${entry.matchCount} matches)`);
        }
        lines.push("");
      }

      lines.push("--- Elo Ratings ---");
      lines.push("combo_key\trating\tmatches\tuncertainty\tstatus");
      for (const [key, entry] of sorted) {
        let status = "";
        if (settledW.some(([k]) => k === key)) status = "WINNER (held)";
        else if (settledL.some(([k]) => k === key)) status = "LOSER (suppressed)";
        else if (entry.rating > ELO_BASE) status = "rising";
        else if (entry.rating < ELO_BASE) status = "falling";
        else status = "neutral";
        lines.push(`${key.replace("||", " + ")}\t${Math.round(entry.rating)}\t${entry.matchCount}\t${entry.uncertainty.toFixed(2)}\t${status}`);
      }
      lines.push("");
    }

    const irWinRecords = getIRWinRecords(tasteContext);
    const irWinEntries = Object.entries(irWinRecords);
    if (irWinEntries.length > 0) {
      lines.push("--- IR Win/Loss Records ---");
      lines.push("ir\twins\tlosses\tboth_count\tnet");
      const sortedIR = irWinEntries.sort((a, b) => (b[1].wins - b[1].losses) - (a[1].wins - a[1].losses));
      for (const [ir, rec] of sortedIR) {
        lines.push(`${ir}\t${rec.wins}\t${rec.losses}\t${rec.bothCount}\t${rec.wins - rec.losses > 0 ? "+" : ""}${rec.wins - rec.losses}`);
      }
      lines.push("");
    }

    const tonalPrefs = getTonalPreferences(tasteContext);
    if (tonalPrefs.preferences.length > 0 && tonalPrefs.nVotes > 0) {
      lines.push("--- Tonal Preferences (learned from votes) ---");
      lines.push(`Model votes: ${tonalPrefs.nVotes} | Model confidence: ${(tonalPrefs.confidence * 100).toFixed(0)}%`);
      lines.push("band\tweight\tdirection\tstrength");
      const activeBands = tonalPrefs.preferences.filter(p => p.direction !== "neutral");
      const neutralBands = tonalPrefs.preferences.filter(p => p.direction === "neutral");
      for (const p of [...activeBands, ...neutralBands]) {
        lines.push(`${p.band}\t${p.weight.toFixed(3)}\t${p.direction}\t${p.strength}`);
      }
      lines.push("");

      const likes = activeBands.filter(p => p.direction === "favors").sort((a, b) => b.weight - a.weight);
      const avoids = activeBands.filter(p => p.direction === "avoids").sort((a, b) => a.weight - b.weight);
      if (likes.length > 0 || avoids.length > 0) {
        lines.push("--- Tonal Profile Summary ---");
        if (likes.length > 0) {
          lines.push(`Favors: ${likes.map(p => `${p.band} (${p.strength})`).join(", ")}`);
        }
        if (avoids.length > 0) {
          lines.push(`Avoids: ${avoids.map(p => `${p.band} (${p.strength})`).join(", ")}`);
        }
        lines.push("");
      }
    }

    const tasteStatus = getTasteStatus(tasteContext);
    if (tasteStatus.nVotes > 0) {
      lines.push("--- Taste Learning Summary ---");
      lines.push(`Total votes: ${tasteStatus.nVotes} | Confidence: ${(tasteStatus.confidence * 100).toFixed(0)}%`);
      lines.push("");
    }

    lines.push(`=== End of Voting Results ===`);
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      toast({ title: "Copied", description: `Voting results copied to clipboard (${lines.length} lines)` });
    });
  }, [tasteCheckMode, tasteIntent, trainingMode, totalRoundsCompleted, learnedProfile, tasteCheckPhase, suggestedPairs, pairingRankings, dismissedPairings, pairingFeedback, pairingFeedbackText, singleIrRatings, tasteContext, votingLog, toast]);

  const hasPairingPool = pairingPool.length >= 2;

  useEffect(() => {
    if (hasPairingPool && evaluatedPairs.size > 0 && suggestedPairs.length === 0) {
      setNoMorePairs(true);
    }
  }, [suggestedPairs, evaluatedPairs, hasPairingPool]);

  const modeTriggeredTasteCheck = useRef(false);

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

  const hasAnyRank = Object.keys(pairingRankings).length > 0;
  const hasLoveOrLike = Object.values(pairingRankings).some((r) => r === 1 || r === 2);
  const activePairings = suggestedPairs.filter((p) => !dismissedPairings.has(pairKey(p)));
  const canConfirm = hasAnyRank || dismissedPairings.size === suggestedPairs.length;

  const RATIO_GRID = [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7];
  const snapToGrid = (v: number) => RATIO_GRID.reduce((best, g) => Math.abs(g - v) < Math.abs(best - v) ? g : best, 0.5);

  const buildInitialRatioState = useCallback(() => {
    const lowIdx = 0;
    const highIdx = RATIO_GRID.length - 1;
    const midLow = Math.floor((lowIdx + highIdx) / 3);
    const midHigh = Math.ceil((2 * (lowIdx + highIdx)) / 3);
    return {
      lowIdx,
      highIdx,
      matchups: [{ a: RATIO_GRID[midLow], b: RATIO_GRID[midHigh] }],
    };
  }, []);

  const finishRound = useCallback((loadTopPick: boolean, downgradedPk: string | null) => {
    if (downgradedPk) {
      setPairingRankings((prev) => ({ ...prev, [downgradedPk]: 3 }));
    }
    if (loadTopPick) {
      setDoneRefining(true);
    } else {
      setPairingRankings({});
      setPairingFeedback({});
      setPairingFeedbackText({});
      setDismissedPairings(new Set());
      setPairingRound((prev) => prev + 1);
    }
  }, [pairingRankings, suggestedPairs, allIRs, pairKey]);

  const proceedToRatioRefine = useCallback((candidates: { pair: SuggestedPairing; rank: number; baseFeatures: TonalFeatures; featFeatures: TonalFeatures }[], loadTopPick: boolean) => {
    const init = buildInitialRatioState();
    setRatioRefinePhase({
      stage: "select",
      candidates,
      selectedIdx: null,
      step: 0,
      matchups: init.matchups,
      lowIdx: init.lowIdx,
      highIdx: init.highIdx,
      winner: null,
      downgraded: false,
      pendingLoadTopPick: loadTopPick,
    });
  }, [buildInitialRatioState]);

  useEffect(() => {
    if (
      tasteCheckMode !== "learning" &&
      tasteCheckMode !== "ratio" &&
      pairingPool.length >= 2 &&
      !tasteCheckPhase &&
      !ratioRefinePhase
    ) {
      const tastePick = pickTasteCheckCandidates(
        pairingPool, activeProfiles, learnedProfile || undefined,
        evaluatedPairs.size > 0 ? evaluatedPairs : undefined,
        undefined, tasteCheckMode as "acquisition" | "tester" | "learning",
        tasteIntent as "rhythm" | "lead" | "clean",
        getIRWinRecords(tasteContext),
        getEloRatings(tasteContext),
        getShownPairs(tasteContext),
        !refinementEnabled
      );
      if (tastePick) {
        const maxRounds = getTasteCheckRounds(tastePick.confidence, pairingPool.length);
        modeTriggeredTasteCheck.current = true;
        setTasteCheckPhase({
          candidates: rerankTasteCandidatesForContext(tastePick.candidates),
          roundType: tastePick.roundType,
          axisName: tastePick.axisName,
          axisLabels: tastePick.axisLabels,
          round: 0,
          maxRounds,
          confidence: tastePick.confidence,
          userPick: null,
          showingResult: false,
          history: [],
          pendingRefineCandidates: [],
          pendingLoadTopPick: false,
        });
      }
    }

    if (tasteCheckMode === "ratio" && tasteCheckPhase) {
      modeTriggeredTasteCheck.current = false;
      if (tasteCheckTimeoutRef.current) {
        clearTimeout(tasteCheckTimeoutRef.current);
        tasteCheckTimeoutRef.current = null;
      }
      setTasteCheckPhase(null);
    }
  }, [tasteCheckMode, pairingPool, activeProfiles, learnedProfile, evaluatedPairs, tasteCheckPhase, ratioRefinePhase, proceedToRatioRefine, tasteIntent]);

  const handleTasteCheckPick = useCallback((pickedIndex: number) => {
    if (!tasteCheckPhase) return;

    setTasteTieMode(false);
    setTasteTieSelected(new Set());
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

    if (pickedIndex >= 0 && pickedIndex < tasteCheckPhase.candidates.length) {
      const source = (tasteCheckPhase.roundType === "binary") ? "ab" as const : "pick4" as const;
      const winner = tasteCheckPhase.candidates[pickedIndex];
      const wBase = featuresByFilename.get(winner.baseFilename);
      const wFeat = featuresByFilename.get(winner.featureFilename);
      const wRatio = winner.suggestedRatio?.base ?? 0.5;
      if (wBase && wFeat) {
        const xW = featurizeBlend(wBase, wFeat, wRatio);
        const loserPairs: [string, string][] = [];
        for (let i = 0; i < tasteCheckPhase.candidates.length; i++) {
          if (i === pickedIndex) continue;
          const loser = tasteCheckPhase.candidates[i];
          const lBase = featuresByFilename.get(loser.baseFilename);
          const lFeat = featuresByFilename.get(loser.featureFilename);
          const lRatio = loser.suggestedRatio?.base ?? 0.5;
          if (!lBase || !lFeat) continue;
          const xL = featurizeBlend(lBase, lFeat, lRatio);
          recordOutcome(tasteContext, xW, xL, "a", { source });
          recordIROutcome(
            tasteContext,
            [winner.baseFilename, winner.featureFilename],
            [loser.baseFilename, loser.featureFilename]
          );
          loserPairs.push([loser.baseFilename, loser.featureFilename]);
        }
        if (tasteCheckPhase.roundType === "quad" && loserPairs.length > 0) {
          recordEloQuadOutcome(
            tasteContext,
            [winner.baseFilename, winner.featureFilename],
            loserPairs
          );
        } else if (tasteCheckPhase.roundType === "binary" && loserPairs.length === 1) {
          recordEloOutcome(
            tasteContext,
            [winner.baseFilename, winner.featureFilename],
            loserPairs[0]
          );
        }

        const shownKeys = tasteCheckPhase.candidates.map(c =>
          [c.baseFilename, c.featureFilename].sort().join("||")
        );
        recordShownPairs(tasteContext, shownKeys, tasteCheckPhase.round);
        recordTasteVote(tasteContext);

        const bands = winner.blendBands;
        const hiMidMidRatio = bands.mid > 0 ? bands.highMid / bands.mid : 1.4;
        const baseRole = getRoleForFilename(winner.baseFilename);
        submitSignalsMutation.mutate([{
          action: "taste_pick",
          baseFilename: winner.baseFilename,
          featureFilename: winner.featureFilename,
          subBass: Math.round(bands.subBass),
          bass: Math.round(bands.bass),
          lowMid: Math.round(bands.lowMid),
          mid: Math.round(bands.mid),
          highMid: Math.round(bands.highMid),
          presence: Math.round(bands.presence),
          ratio: Math.round(hiMidMidRatio * 100) / 100,
          score: 0,
          profileMatch: baseRole,
          blendRatio: wRatio,
        }]);

        setTasteVersion(v => v + 1);
      }
    }

    const nextRound = tasteCheckPhase.round + 1;

    tasteCheckTimeoutRef.current = setTimeout(() => {
      tasteCheckTimeoutRef.current = null;
      if (tasteCheckModeRef.current === "ratio") {
        modeTriggeredTasteCheck.current = false;
        setTasteCheckPhase(null);
        return;
      }
      const keepGoing = shouldContinueTasteCheck(
        tasteCheckPhase.confidence,
        newHistory,
        learnedProfile || undefined,
      );

      if (!keepGoing || nextRound >= tasteCheckPhase.maxRounds) {
        modeTriggeredTasteCheck.current = false;
        setTasteCheckPhase(null);
        setTasteCheckPassed(true);
        return;
      }

      const nextPick = pickTasteCheckCandidates(
        pairingPool,
        activeProfiles,
        learnedProfile || undefined,
        undefined,
        newHistory,
        tasteCheckMode === "ratio" ? "learning" : tasteCheckMode,
        tasteIntent as "rhythm" | "lead" | "clean",
        getIRWinRecords(tasteContext),
        getEloRatings(tasteContext),
        getShownPairs(tasteContext),
        !refinementEnabled
      );

      if (!nextPick) {
        modeTriggeredTasteCheck.current = false;
        setTasteCheckPhase(null);
        setTasteCheckPassed(true);
        return;
      }

      setTasteCheckPhase({
        candidates: rerankTasteCandidatesForContext(nextPick.candidates),
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
  }, [tasteCheckPhase, proceedToRatioRefine, pairingPool, activeProfiles, learnedProfile, tasteCheckMode, featuresByFilename, tasteContext]);

  const handleTasteCheckTie = useCallback(() => {
    if (!tasteCheckPhase) return;
    try {
      const a = tasteCheckPhase.candidates?.[0];
      const b = tasteCheckPhase.candidates?.[1];
      if (!a || !b) return;
      const aB = featuresByFilename.get(a.baseFilename);
      const aF = featuresByFilename.get(a.featureFilename);
      const bB = featuresByFilename.get(b.baseFilename);
      const bF = featuresByFilename.get(b.featureFilename);
      const aR = a.suggestedRatio?.base ?? 0.5;
      const bR = b.suggestedRatio?.base ?? 0.5;
      if (!aB || !aF || !bB || !bF) return;
      const xA = featurizeBlend(aB, aF, aR);
      const xB = featurizeBlend(bB, bF, bR);
      recordOutcome(tasteContext, xA, xB, "tie", { source: "ab" });
      recordIROutcome(
        tasteContext,
        [a.baseFilename, a.featureFilename, b.baseFilename, b.featureFilename],
        []
      );
      setTasteVersion(v => v + 1);
    } catch {}
  }, [tasteCheckPhase, featuresByFilename, tasteContext]);

  const handleTasteCheckBothUseful = useCallback(() => {
    if (!tasteCheckPhase) return;
    try {
      const a = tasteCheckPhase.candidates?.[0];
      const b = tasteCheckPhase.candidates?.[1];
      if (!a || !b) return;
      const aB = featuresByFilename.get(a.baseFilename);
      const aF = featuresByFilename.get(a.featureFilename);
      const bB = featuresByFilename.get(b.baseFilename);
      const bF = featuresByFilename.get(b.featureFilename);
      const aR = a.suggestedRatio?.base ?? 0.5;
      const bR = b.suggestedRatio?.base ?? 0.5;
      if (!aB || !aF || !bB || !bF) return;
      const xA = featurizeBlend(aB, aF, aR);
      const xB = featurizeBlend(bB, bF, bR);
      const pairKey = `${a.baseFilename}__${a.featureFilename}__${b.baseFilename}__${b.featureFilename}`;
      recordOutcome(tasteContext, xA, xB, "both", { pairKey, source: "ab" });
      recordIROutcome(
        tasteContext,
        [a.baseFilename, a.featureFilename, b.baseFilename, b.featureFilename],
        [],
        true
      );
      setTasteVersion(v => v + 1);
    } catch {}
  }, [tasteCheckPhase, featuresByFilename, tasteContext]);

  const handleTasteCheckMultiTie = useCallback((selectedIndices: Set<number>) => {
    if (!tasteCheckPhase || selectedIndices.size < 2) return;
    try {
      const selected = Array.from(selectedIndices).sort();
      const unselected = tasteCheckPhase.candidates
        .map((_, i) => i)
        .filter(i => !selectedIndices.has(i));

      const selectedCandidates = selected.map(i => tasteCheckPhase.candidates[i]);
      const allFeatures: [string, string][] = [];

      for (let si = 0; si < selectedCandidates.length; si++) {
        for (let sj = si + 1; sj < selectedCandidates.length; sj++) {
          const a = selectedCandidates[si];
          const b = selectedCandidates[sj];
          const aB = featuresByFilename.get(a.baseFilename);
          const aF = featuresByFilename.get(a.featureFilename);
          const bB = featuresByFilename.get(b.baseFilename);
          const bF = featuresByFilename.get(b.featureFilename);
          const aR = a.suggestedRatio?.base ?? 0.5;
          const bR = b.suggestedRatio?.base ?? 0.5;
          if (!aB || !aF || !bB || !bF) continue;
          const xA = featurizeBlend(aB, aF, aR);
          const xB = featurizeBlend(bB, bF, bR);
          recordOutcome(tasteContext, xA, xB, "tie", { source: "pick4" });
        }
      }

      for (const si of selected) {
        const winner = tasteCheckPhase.candidates[si];
        const wBase = featuresByFilename.get(winner.baseFilename);
        const wFeat = featuresByFilename.get(winner.featureFilename);
        const wRatio = winner.suggestedRatio?.base ?? 0.5;
        if (!wBase || !wFeat) continue;
        const xW = featurizeBlend(wBase, wFeat, wRatio);
        for (const ui of unselected) {
          const loser = tasteCheckPhase.candidates[ui];
          const lBase = featuresByFilename.get(loser.baseFilename);
          const lFeat = featuresByFilename.get(loser.featureFilename);
          const lRatio = loser.suggestedRatio?.base ?? 0.5;
          if (!lBase || !lFeat) continue;
          const xL = featurizeBlend(lBase, lFeat, lRatio);
          recordOutcome(tasteContext, xW, xL, "a", { source: "pick4" });
          allFeatures.push([loser.baseFilename, loser.featureFilename]);
        }
      }

      const allWinnerFilenames = selectedCandidates.flatMap(c => [c.baseFilename, c.featureFilename]);
      recordIROutcome(
        tasteContext,
        allWinnerFilenames,
        [],
        true
      );

      const shownKeys = tasteCheckPhase.candidates.map(c =>
        [c.baseFilename, c.featureFilename].sort().join("||")
      );
      recordShownPairs(tasteContext, shownKeys, tasteCheckPhase.round);
      recordTasteVote(tasteContext);

      setTasteVersion(v => v + 1);
    } catch {}
  }, [tasteCheckPhase, featuresByFilename, tasteContext]);

  const skipTasteCheck = useCallback(() => {
    if (!tasteCheckPhase) return;
    modeTriggeredTasteCheck.current = false;
    if (tasteCheckTimeoutRef.current) {
      clearTimeout(tasteCheckTimeoutRef.current);
      tasteCheckTimeoutRef.current = null;
    }
    setTasteCheckPhase(null);
    setTasteCheckPassed(true);
  }, [tasteCheckPhase]);

  const liveConfidence = getTasteConfidence(learnedProfile || undefined);
  const tasteCheckBinary = tasteCheckPhase
    ? (tasteCheckMode === "tester" || tasteCheckPhase.candidates.length <= 2)
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
    const pool = allIRs;

    const refineCandidates: { pair: SuggestedPairing; rank: number; baseFeatures: TonalFeatures; featFeatures: TonalFeatures }[] = [];

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
        score: Math.round(pair.score) || 0,
        profileMatch: getRoleForFilename(pair.baseFilename),
      });

      if (isDismissed) roundNoped++;
      else roundLiked++;

      if ((rank === 1 || rank === 2) && !isDismissed) {
        const baseData = pool.find((ir) => ir.filename === pair.baseFilename);
        const featData = pool.find((ir) => ir.filename === pair.featureFilename);
        if (baseData && featData) {
          refineCandidates.push({ pair, rank, baseFeatures: baseData.features, featFeatures: featData.features });
        }
      }
    }

    // ------------------------------------------------------------
    // Learning Mode -> Pairwise Preference Updates (NO text training)
    // IMPORTANT: Only train on the CURRENT 4 suggestions + their CURRENT round ratings.
    // This prevents stale dismissals/ratings from previous rounds inflating vote counts.
    // ------------------------------------------------------------
    try {
      const strengthOf = (action: string): number => {
        if (action === "love") return 2;
        if (action === "like") return 1;
        if (action === "meh") return -1;
        if (action === "nope") return -2;
        return 0;
      };

      const rated = suggestedPairs
        .slice(0, 4)
        .map((pair) => {
          const pk = `${pair.baseFilename}||${pair.featureFilename}`;
          const isDismissed = dismissedPairings.has(pk);
          const rank = pairingRankings[pk];

          if (!isDismissed && !rank) return null;

          const action = isDismissed ? "nope" : rank === 1 ? "love" : rank === 2 ? "like" : "meh";
          const baseData = pool.find((ir) => ir.filename === pair.baseFilename);
          const featData = pool.find((ir) => ir.filename === pair.featureFilename);
          if (!baseData?.features || !featData?.features) return null;
          const ratio = pair.suggestedRatio?.base ?? 0.5;
          const x = featurizeBlend(baseData.features, featData.features, ratio);
          return { action, strength: strengthOf(action), x, pairKey: pk };
        })
        .filter(Boolean) as { action: string; strength: number; x: number[]; pairKey: string }[];

      if (rated.length >= 2) {
        const mean = meanVector(rated.map((r) => r.x));
        const centered = rated.map((r) => ({ ...r, xc: centerVector(r.x, mean) }));

        for (let i = 0; i < centered.length; i++) {
          for (let j = i + 1; j < centered.length; j++) {
            const a = centered[i];
            const b = centered[j];
            const diff = a.strength - b.strength;
            const lr = 0.06 * Math.min(2, Math.abs(diff));

            const tagsA = (pairingFeedback[a.pairKey] ?? []) as string[];
            const tagsB = (pairingFeedback[b.pairKey] ?? []) as string[];

            const aFiles = a.pairKey.split("||");
            const bFiles = b.pairKey.split("||");

            if (diff === 0) {
              recordOutcome(tasteContext, a.xc, b.xc, "tie", { source: "learning" });
              recordIROutcome(tasteContext, [...aFiles, ...bFiles], []);
              continue;
            }
            if (diff > 0) {
              recordOutcome(tasteContext, a.xc, b.xc, "a", { lr, source: "learning", tagsA, tagsB });
              recordIROutcome(tasteContext, aFiles, bFiles);
            } else {
              recordOutcome(tasteContext, b.xc, a.xc, "a", { lr, source: "learning", tagsA: tagsB, tagsB: tagsA });
              recordIROutcome(tasteContext, bFiles, aFiles);
            }
          }
        }
        setTasteVersion((v) => v + 1);
      }
    } catch {
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
    const currentRound = totalRoundsCompleted + 1;
    setTotalRoundsCompleted((prev) => prev + 1);

    const newLogEntries = suggestedPairs
      .filter(pair => {
        const pk = `${pair.baseFilename}||${pair.featureFilename}`;
        return pairingRankings[pk] || dismissedPairings.has(pk);
      })
      .map(pair => {
        const pk = `${pair.baseFilename}||${pair.featureFilename}`;
        const isDismissed = dismissedPairings.has(pk);
        const rank = pairingRankings[pk];
        const rating = isDismissed ? "Nope" : rank === 1 ? "Love" : rank === 2 ? "Like" : "Meh";
        const tags = (pairingFeedback[pk] ?? []).join(", ");
        const text = pairingFeedbackText[pk]?.trim() ?? "";
        return { round: currentRound, base: pair.baseFilename, feature: pair.featureFilename, rating, tags, text, score: Math.round(pair.blendScore), profile: pair.bestMatch.profile };
      });
    setVotingLog(prev => [...prev, ...newLogEntries]);

    setPairingRankings({});
    setDismissedPairings(new Set());
    setPairingFeedback({});
    setPairingFeedbackText({});

    const disableAutoRatioRefine = true;
    if (disableAutoRatioRefine) {
      return;
    }

    if (refineCandidates.length > 0) {
      refineCandidates.sort((a, b) => a.rank - b.rank);

      if (tasteCheckMode === "ratio") {
        proceedToRatioRefine(refineCandidates, loadTopPick);
      } else {
        const hasUnseenIRs = pairingPool.length > 0 && pairingPool.some(
          (ir) => (newExposure.get(ir.filename) ?? 0) === 0
        );
        const shouldTasteCheck = (tasteCheckMode !== "learning") || !tasteCheckPassed || hasUnseenIRs;

        if (shouldTasteCheck) {
          const tastePick = pickTasteCheckCandidates(
            pairingPool,
            activeProfiles,
            learnedProfile || undefined,
            newEvaluated.size > 0 ? newEvaluated : undefined,
            undefined,
            tasteCheckMode as "acquisition" | "tester" | "learning",
            tasteIntent as "rhythm" | "lead" | "clean",
            getIRWinRecords(tasteContext),
            getEloRatings(tasteContext),
            getShownPairs(tasteContext),
            !refinementEnabled
          );
          if (tastePick) {
            const maxRounds = getTasteCheckRounds(tastePick.confidence, pairingPool.length);
            setTasteCheckPhase({
              candidates: rerankTasteCandidatesForContext(tastePick.candidates),
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
      }
    } else {
      finishRound(loadTopPick, null);
    }
  }, [suggestedPairs, pairingRankings, pairingFeedback, pairingFeedbackText, dismissedPairings, submitSignalsMutation, evaluatedPairs, exposureCounts, allIRs, pairKey, buildInitialRatioState, totalRoundsCompleted, tasteCheckPassed, pairingPool, activeProfiles, learnedProfile, proceedToRatioRefine, finishRound, tasteCheckMode, tasteContext, featuresByFilename]);

  const selectRefineCandidate = useCallback((idx: number) => {
    if (!ratioRefinePhase) return;
    const init = buildInitialRatioState();
    setRatioRefinePhase({
      ...ratioRefinePhase,
      stage: "refine",
      selectedIdx: idx,
      step: 0,
      matchups: init.matchups,
      lowIdx: init.lowIdx,
      highIdx: init.highIdx,
    });
  }, [ratioRefinePhase, buildInitialRatioState]);

  const skipRatioRefine = useCallback(() => {
    if (!ratioRefinePhase) return;
    setRatioRefinePhase(null);
    finishRound(ratioRefinePhase.pendingLoadTopPick, null);
  }, [ratioRefinePhase, finishRound, tasteCheckMode]);

  const manualRatioRefine = useCallback(() => {
    if (ratioRefinePhase || tasteCheckPhase) return;
    const pool = allIRs;
    const candidates: { pair: SuggestedPairing; rank: number; baseFeatures: TonalFeatures; featFeatures: TonalFeatures }[] = [];
    for (const [pk, rank] of Object.entries(pairingRankings)) {
      if (rank !== 1 && rank !== 2) continue;
      if (dismissedPairings.has(pk)) continue;
      const pair = suggestedPairs.find((p) => pairKey(p) === pk);
      if (!pair) continue;
      const baseData = pool.find((ir) => ir.filename === pair.baseFilename);
      const featData = pool.find((ir) => ir.filename === pair.featureFilename);
      if (baseData && featData) {
        candidates.push({ pair, rank, baseFeatures: baseData.features, featFeatures: featData.features });
      }
    }
    if (candidates.length === 0) return;
    candidates.sort((a, b) => a.rank - b.rank);
    proceedToRatioRefine(candidates, false);
  }, [ratioRefinePhase, tasteCheckPhase, allIRs, pairingRankings, dismissedPairings, suggestedPairs, pairKey, proceedToRatioRefine]);

  const completeRatioRefine = useCallback((ratio: number | null, downgraded: boolean) => {
    if (!ratioRefinePhase || ratioRefinePhase.selectedIdx === null) return;
    const cand = ratioRefinePhase.candidates[ratioRefinePhase.selectedIdx];
    const pk = `${cand.pair.baseFilename}||${cand.pair.featureFilename}`;

    if (ratio !== null) {
      const blended = blendFeatures(cand.baseFeatures, cand.featFeatures, ratio, 1 - ratio);
      const blendBands = blended.bandsPercent;
      const r = blendBands.mid > 0 ? blendBands.highMid / blendBands.mid : 0;
      const scored = scoreAgainstAllProfiles(blended, activeProfiles);
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
        score: 0,
        profileMatch: getRoleForFilename(cand.pair.baseFilename),
        blendRatio: ratio,
      }]);
    }

    setRatioRefinePhase({ ...ratioRefinePhase, stage: "done", winner: ratio, downgraded });
    setTimeout(() => {
      setRatioRefinePhase(null);
      finishRound(ratioRefinePhase.pendingLoadTopPick, downgraded ? pk : null);
    }, 1500);
  }, [ratioRefinePhase, activeProfiles, submitSignalsMutation, finishRound, tasteCheckMode]);

  const handleRatioPick = useCallback((pickedSide: "a" | "b" | "tie" | "both") => {
    if (!ratioRefinePhase || ratioRefinePhase.stage !== "refine") return;
    const { step, matchups, lowIdx, highIdx } = ratioRefinePhase;
    const current = matchups[step];

    try {
      const cand = ratioRefinePhase.candidates[ratioRefinePhase.selectedIdx ?? 0];
      const pair = cand?.pair;
      const bF = cand?.baseFeatures;
      const fF = cand?.featFeatures;
      if (pair && bF && fF) {
        const xA = featurizeBlend(bF, fF, current.a);
        const xB = featurizeBlend(bF, fF, current.b);
        if (pickedSide === "a" || pickedSide === "b") {
          recordOutcome(tasteContext, xA, xB, pickedSide, { source: "ratio" });
        } else if (pickedSide === "tie") {
          recordOutcome(tasteContext, xA, xB, "tie", { source: "ratio" });
        } else if (pickedSide === "both") {
          const pairKey = `${cand.pair?.baseFilename ?? "base"}__${cand.pair?.featureFilename ?? "feat"}__ratio`;
          recordOutcome(tasteContext, xA, xB, "both", { pairKey, source: "ratio" });
          recordIROutcome(tasteContext, [pair.baseFilename, pair.featureFilename], [], true);
        }
        setTasteVersion(v => v + 1);
      }
    } catch {}

    if (pickedSide === "tie") {
      const MAX_RATIO_ROUNDS = 3;
      const aIdx = RATIO_GRID.indexOf(snapToGrid(current.a));
      const bIdx = RATIO_GRID.indexOf(snapToGrid(current.b));
      const gap = Math.abs(bIdx - aIdx);
      const widerGap = gap + 2;
      const center = (aIdx + bIdx) / 2;
      const nextAIdx = Math.max(0, Math.round(center - widerGap / 2));
      const nextBIdx = Math.min(RATIO_GRID.length - 1, Math.round(center + widerGap / 2));

      if (nextAIdx === nextBIdx || step + 1 >= MAX_RATIO_ROUNDS ||
          (nextAIdx === 0 && nextBIdx === RATIO_GRID.length - 1 && gap >= RATIO_GRID.length - 2)) {
        const tieRatio = snapToGrid((current.a + current.b) / 2);
        completeRatioRefine(tieRatio, false);
        return;
      }

      const updated = [...matchups.slice(0, step + 1), { a: RATIO_GRID[nextAIdx], b: RATIO_GRID[nextBIdx] }];
      setRatioRefinePhase({ ...ratioRefinePhase, step: step + 1, matchups: updated, lowIdx: nextAIdx, highIdx: nextBIdx });
      return;
    }

    const winnerVal = pickedSide === "a" ? current.a : current.b;
    const loserVal = pickedSide === "a" ? current.b : current.a;
    const winnerIdx = RATIO_GRID.indexOf(snapToGrid(winnerVal));
    const loserIdx = RATIO_GRID.indexOf(snapToGrid(loserVal));

    let newLow: number, newHigh: number;
    if (winnerIdx < loserIdx) {
      newLow = lowIdx;
      newHigh = loserIdx;
    } else {
      newLow = loserIdx;
      newHigh = highIdx;
    }

    const MAX_RATIO_ROUNDS = 3;

    if (newHigh - newLow <= 1 || step + 1 >= MAX_RATIO_ROUNDS) {
      completeRatioRefine(winnerVal, false);
      return;
    }

    const nextAIdx = Math.floor(newLow + (newHigh - newLow) / 3);
    const nextBIdx = Math.ceil(newLow + 2 * (newHigh - newLow) / 3);

    if (nextAIdx === nextBIdx || RATIO_GRID[nextAIdx] === RATIO_GRID[nextBIdx]) {
      completeRatioRefine(winnerVal, false);
      return;
    }

    const updated = [...matchups.slice(0, step + 1), { a: RATIO_GRID[nextAIdx], b: RATIO_GRID[nextBIdx] }];
    setRatioRefinePhase({ ...ratioRefinePhase, step: step + 1, matchups: updated, lowIdx: newLow, highIdx: newHigh });
  }, [ratioRefinePhase, completeRatioRefine, featuresByFilename, tasteContext]);

  const handleNoRatioHelps = useCallback(() => {
    completeRatioRefine(null, true);
  }, [completeRatioRefine]);

  const explainPairVsAnchor = (pair: any, anchor: any, meanVec: number[] | null): string[] => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("irscope.taste.v1") : null;
      if (!raw) return [];
      const state = JSON.parse(raw);
      if (!state?.models) return [];

      const key = `${tasteContext.speakerPrefix}__${tasteContext.mode}__${tasteContext.intent}`;
      const model = state.models[key];
      const wArr: number[] | undefined = Array.isArray(model?.w) ? model.w : undefined;
      if (!wArr || wArr.length === 0) return [];

      const getX = (p: any): number[] | null => {
        const bF = featuresByFilename.get(p.baseFilename);
        const fF = featuresByFilename.get(p.featureFilename);
        const ratio = p.suggestedRatio?.base ?? 0.5;
        if (!bF || !fF) return null;
        const xRaw = featurizeBlend(bF, fF, ratio);
        if (!Array.isArray(xRaw) || xRaw.length === 0) return null;
        if (!meanVec || meanVec.length !== xRaw.length) return xRaw;
        return centerVector(xRaw, meanVec);
      };

      const xC = getX(pair);
      const xA = getX(anchor);
      if (!xC || !xA) return [];

      const dim = Math.min(wArr.length, xC.length, xA.length);
      const labels = [...BAND_KEYS, "Tilt", "Smooth"];

      const deltas: { idx: number; val: number }[] = [];
      for (let i = 0; i < dim; i++) {
        const wi = Number.isFinite(wArr[i]) ? wArr[i] : 0;
        const dc = (Number.isFinite(xC[i]) ? (xC[i] as number) : 0) - (Number.isFinite(xA[i]) ? (xA[i] as number) : 0);
        deltas.push({ idx: i, val: wi * dc });
      }

      const top = deltas
        .sort((a, b) => Math.abs(b.val) - Math.abs(a.val))
        .slice(0, 2);

      return top.map((d) => {
        const label = labels[d.idx] ?? `F${d.idx}`;
        const dir = d.val > 0 ? "\u2191" : "\u2193";
        return `${label} ${dir} vs #1`;
      });
    } catch {
      return [];
    }
  };

  const sandboxVotes = useMemo(() => getSandboxStatus().nVotes, [tasteVersion, trainingMode]);

  const TasteControlBar = (
    <div className="flex flex-col gap-2 mb-4" data-testid="taste-control-bar">
      {!trainingMode && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-sm" data-testid="live-learning-banner">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-emerald-300 tracking-wide">LIVE LEARNING</span>
          <span className="text-emerald-300/70 text-xs">AI is actively learning from your votes</span>
        </div>
      )}

      {trainingMode && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-orange-500/40 bg-orange-500/10 text-sm" data-testid="sandbox-mode-banner">
          <span className="font-semibold text-orange-300 tracking-wide">SANDBOX MODE</span>
          <span className="text-orange-300/70 text-xs">Votes are sandboxed ({sandboxVotes} votes) — AI is not being trained</span>
          <div className="ml-auto flex items-center gap-1.5">
            {sandboxVotes > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-orange-300 h-7"
                onClick={() => {
                  clearSandbox();
                  setTasteVersion(v => v + 1);
                }}
                data-testid="button-discard-sandbox"
              >
                Discard
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-orange-300 h-7"
              onClick={() => {
                setTrainingMode(false);
                setSandboxMode(false);
                persistTrainingMode(false);
                setTasteVersion(v => v + 1);
              }}
              data-testid="button-exit-sandbox"
            >
              Exit Sandbox
            </Button>
          </div>
        </div>
      )}

      {resetAllConfirm && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-sm text-red-300" data-testid="reset-all-confirm-banner">
          <span className="text-xs">Reset ALL taste learning across all intents and modes? This cannot be undone.</span>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-red-400 h-7"
            onClick={() => {
              resetAllTaste();
              setTrainingMode(false);
              setSandboxMode(false);
              persistTrainingMode(false);
              setTasteVersion(v => v + 1);
              setPairingRankings({});
              setDismissedPairings(new Set());
              setPairingFeedback({});
              setPairingFeedbackText({});
              setSingleIrRatings({});
              setSingleIrTags({});
              setSingleIrNotes({});
              setSingleIrPage(0);
              setResetAllConfirm(false);
              toast({ title: "All taste data reset", description: "Live and sandbox data cleared. Starting fresh.", duration: 3000 });
            }}
            data-testid="button-reset-all-confirm"
          >
            Yes, reset everything
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7"
            onClick={() => setResetAllConfirm(false)}
            data-testid="button-reset-all-cancel"
          >
            Cancel
          </Button>
        </div>
      )}

      {!trainingMode && sandboxVotes > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/5 text-xs text-amber-300" data-testid="sandbox-orphan-banner">
          <span>You have {sandboxVotes} sandbox votes from a previous session.</span>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-amber-300 h-7"
            onClick={() => {
              setTrainingMode(true);
              setSandboxMode(true);
              persistTrainingMode(true);
              setTasteVersion(v => v + 1);
            }}
            data-testid="button-resume-sandbox"
          >
            Resume Sandbox
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7"
            onClick={() => {
              clearSandbox();
              setTasteVersion(v => v + 1);
            }}
            data-testid="button-discard-orphan"
          >
            Discard
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap" data-testid="taste-control-buttons">
        <div className="flex items-center gap-0.5 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-0.5" data-testid="intent-selector">
          {(["rhythm", "lead", "clean"] as const).map((intent) => (
            <Button
              key={intent}
              size="sm"
              variant={tasteIntent === intent ? "secondary" : "ghost"}
              className={cn(
                "text-xs h-7 capitalize",
                tasteIntent === intent && "bg-indigo-500/25 text-indigo-300"
              )}
              onClick={() => setTasteIntent(intent)}
              data-testid={`button-intent-${intent}`}
            >
              {intent}
            </Button>
          ))}
        </div>

        <Button
          size="sm"
          variant={trainingMode ? "secondary" : "ghost"}
          className={cn(
            "text-xs h-8",
            trainingMode && "bg-orange-500/20 text-orange-300 border border-orange-500/30"
          )}
          onClick={() => {
            const next = !trainingMode;
            setTrainingMode(next);
            setSandboxMode(next);
            persistTrainingMode(next);
            setTasteVersion(v => v + 1);
          }}
          title={trainingMode ? "Currently in Sandbox Mode — votes won't affect live learning" : "Enter Sandbox Mode — experiment without affecting live learning"}
          data-testid="button-sandbox-mode"
        >
          {trainingMode ? "Sandbox" : "Sandbox Mode"}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-8"
          onClick={() => setSingleIrLearnOpen(true)}
          title="Rate individual IRs"
          data-testid="button-single-ir-learning"
        >
          Single IR Eval
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-8"
              data-testid="button-reset-menu"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Reset...
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px]">
            <DropdownMenuItem
              className="text-xs"
              onClick={() => {
                resetTaste(tasteContext);
                setTasteVersion(v => v + 1);
                setPairingRankings({});
                setDismissedPairings(new Set());
                setPairingFeedback({});
                setPairingFeedbackText({});
              }}
              data-testid="button-taste-reset"
            >
              Reset Current Intent
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs"
              onClick={() => {
                resetTaste(singleIrTasteContext);
                setTasteVersion(v => v + 1);
                setSingleIrRatings({});
                setSingleIrTags({});
                setSingleIrNotes({});
                setSingleIrPage(0);
              }}
              data-testid="button-taste-reset-single"
            >
              Reset Single IR Learning
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs text-orange-400"
              onClick={() => {
                clearSandbox();
                setTasteVersion(v => v + 1);
                toast({ title: "Sandbox reset", description: "All sandbox/training data has been cleared.", duration: 3000 });
              }}
              data-testid="button-taste-reset-sandbox"
            >
              Reset Sandbox
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs text-red-400"
              onClick={() => setResetAllConfirm(true)}
              data-testid="button-taste-reset-all"
            >
              Reset All Learning...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">

        {TasteControlBar}

        {singleIrLearnOpen && (
          <div className="border rounded p-3 space-y-2" data-testid="single-ir-learning-panel">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Solo IR Eval — Standalone Viability</div>
              <button className="px-2 py-1 rounded border border-zinc-600" onClick={() => setSingleIrLearnOpen(false)} data-testid="button-close-single-ir">
                Close
              </button>
            </div>
            <div className="text-xs opacity-70 space-y-0.5">
              <div>Could this IR carry a tone on its own, or does it need a partner?</div>
              <div>Love = great standalone · Like = close, minor gaps · Meh = needs help · Nope = not viable solo</div>
              <div className="opacity-60">Context: {singleIrTasteContext.speakerPrefix}/singleIR/{singleIrTasteContext.intent}</div>
            </div>

            {singleIrUndecided.length > 0 && (
            <div className="flex items-center gap-2 text-xs opacity-80">
              <button
                className="px-2 py-1 rounded border border-zinc-600"
                onClick={() => setSingleIrPage(p => (p - 1 + singleIrTotalPages) % singleIrTotalPages)}
                data-testid="button-single-ir-prev"
              >
                Prev
              </button>
              <button
                className="px-2 py-1 rounded border border-zinc-600"
                onClick={() => setSingleIrPage(p => (p + 1) % singleIrTotalPages)}
                data-testid="button-single-ir-next"
              >
                Next
              </button>
              <span className="ml-2">
                Page {singleIrPage + 1} / {singleIrTotalPages} ({singleIrDecided.size} decided, {singleIrUndecided.length} remaining)
              </span>
            </div>
            )}

            {singleIrUndecided.length === 0 ? (
              <div className="border rounded p-4 text-center" data-testid="single-ir-all-evaluated">
                <div className="text-sm mb-2">You've assessed all {pairingPool.length} IRs for standalone viability.</div>
                <button
                  className="px-3 py-1 rounded border border-amber-500 text-amber-400 text-xs"
                  data-testid="button-single-ir-reassess"
                  onClick={() => {
                    setSingleIrReassessing(true);
                    setSingleIrRatings({});
                    setSingleIrTags({});
                    setSingleIrNotes({});
                    setSingleIrPage(0);
                  }}
                >
                  Reassess — votes will be averaged with previous
                </button>
              </div>
            ) : singleIrPageItems.map((ir: any, idx: number) => {
              const rating = singleIrRatings[ir.filename];
              const prevDecision = singleIrPrevRatings[ir.filename];
              const activeTagBank =
                rating === "love" ? SOLO_WHY_TAGS :
                rating === "like" ? SOLO_IMPROVE_TAGS :
                (rating === "meh" || rating === "nope") ? SOLO_ISSUE_TAGS :
                null;
              const tagLabel =
                rating === "love" ? "Standalone strengths:" :
                rating === "like" ? "What's missing for solo use:" :
                (rating === "meh" || rating === "nope") ? "Why it needs a partner:" :
                null;
              return (
              <div key={ir.filename} className="border rounded p-2" data-testid={`single-ir-card-${idx}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium break-words">{idx + 1}. {ir.filename}</span>
                  {!blindMode && <MusicalRoleBadgeFromFeatures filename={ir.filename} features={ir.features} speakerStatsMap={speakerStatsMap} />}
                  <StandaloneBadge filename={ir.filename} standaloneWorthy={learnedProfile?.standaloneWorthy} compact />
                  {prevDecision && (
                    <span className="text-xs opacity-60">(prev: {prevDecision.action} x{prevDecision.count})</span>
                  )}
                </div>

                <div className="flex gap-2 mt-2 flex-wrap">
                  {(["love","like","meh","nope"] as const).map((r) => (
                    <button
                      key={r}
                      className={cn(
                        "px-2 py-1 rounded border text-xs",
                        singleIrRatings[ir.filename] === r ? "border-green-500" : "border-zinc-600"
                      )}
                      onClick={() => {
                        setSingleIrRatings(prev => ({ ...prev, [ir.filename]: r }));
                        if (singleIrTags[ir.filename]?.length) {
                          setSingleIrTags(prev => ({ ...prev, [ir.filename]: [] }));
                        }
                      }}
                      data-testid={`button-single-ir-${r}-${idx}`}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
                </div>

                {activeTagBank && tagLabel && (
                  <>
                    <div className="mt-2 text-xs opacity-80">{tagLabel}</div>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {activeTagBank.map(tag => (
                        <button
                          key={tag}
                          className={cn(
                            "px-2 py-1 rounded border text-xs",
                            (singleIrTags[ir.filename] ?? []).includes(tag) ? "border-amber-400" : "border-zinc-600"
                          )}
                          onClick={() => toggleSingleTag(ir.filename, tag)}
                          data-testid={`button-single-ir-tag-${tag}-${idx}`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div className="mt-2 text-xs opacity-80">Notes (stored only, not training):</div>
                <textarea
                  className="w-full mt-1 p-2 rounded border border-zinc-700 bg-transparent text-xs"
                  rows={2}
                  value={singleIrNotes[ir.filename] ?? ""}
                  onChange={(e) => setSingleIrNotes(prev => ({ ...prev, [ir.filename]: e.target.value }))}
                  placeholder="Optional notes..."
                  data-testid={`textarea-single-ir-notes-${idx}`}
                />
              </div>
              );
            })}

            {singleIrUndecided.length > 0 && <div className="flex gap-2">
              <button
                className="px-3 py-1 rounded border border-zinc-600"
                data-testid="button-submit-single-ir"
                onClick={() => {
                  try {
                    const strengthOf = (a: string) => a === "love" ? 2 : a === "like" ? 1 : a === "meh" ? -1 : a === "nope" ? -2 : 0;
                    const rated = singleIrPageItems.map((ir: any) => {
                      const action = singleIrRatings[ir.filename];
                      if (!action) return null;
                      if (!ir?.features) return null;
                      return { action, strength: strengthOf(action), x: featurizeSingleIR(ir.features), filename: ir.filename as string, bands: ir.bands as TonalBands };
                    }).filter(Boolean) as { action: string; strength: number; x: number[]; filename: string; bands: TonalBands }[];

                    if (rated.length >= 2) {
                      const mean = meanVector(rated.map(r => r.x));
                      const centered = rated.map(r => ({ ...r, xc: centerVector(r.x, mean) }));
                      for (let i = 0; i < centered.length; i++) {
                        for (let j = i + 1; j < centered.length; j++) {
                          const a = centered[i];
                          const b = centered[j];
                          const diff = a.strength - b.strength;
                          if (diff === 0) {
                            recordOutcome(singleIrTasteContext, a.xc, b.xc, "tie", { source: "learning" });
                            recordIROutcome(singleIrTasteContext, [a.filename, b.filename], []);
                          } else {
                            const lr = 0.06 * Math.min(2, Math.abs(diff));
                            if (diff > 0) {
                              recordOutcome(singleIrTasteContext, a.xc, b.xc, "a", { lr, source: "learning" });
                              recordIROutcome(singleIrTasteContext, [a.filename], [b.filename]);
                            } else {
                              recordOutcome(singleIrTasteContext, b.xc, a.xc, "a", { lr, source: "learning" });
                              recordIROutcome(singleIrTasteContext, [b.filename], [a.filename]);
                            }
                          }
                        }
                      }
                      setTasteVersion(v => v + 1);
                    }

                    const serverSignals = rated.map(r => {
                      const tags = singleIrTags[r.filename];
                      const fb = tags && tags.length > 0 ? tags.join(",") : null;
                      const ratio = r.bands.mid > 0 ? r.bands.highMid / r.bands.mid : 1.4;
                      return {
                        action: r.action,
                        feedback: fb,
                        feedbackText: null,
                        baseFilename: r.filename,
                        featureFilename: r.filename,
                        subBass: r.bands.subBass,
                        bass: r.bands.bass,
                        lowMid: r.bands.lowMid,
                        mid: r.bands.mid,
                        highMid: r.bands.highMid,
                        presence: r.bands.presence,
                        ratio: Math.round(ratio * 100) / 100,
                        score: 0,
                        profileMatch: getRoleForFilename(r.filename),
                      };
                    });
                    if (serverSignals.length > 0) {
                      submitSignalsMutation.mutate(serverSignals);
                    }

                    const newDecided = new Set(singleIrDecided);
                    const newPrevRatings = { ...singleIrPrevRatings };
                    for (const r of rated) {
                      newDecided.add(r.filename);
                      const prev = newPrevRatings[r.filename];
                      if (prev) {
                        newPrevRatings[r.filename] = { action: r.action, count: prev.count + 1 };
                      } else {
                        newPrevRatings[r.filename] = { action: r.action, count: 1 };
                      }
                    }
                    setSingleIrDecided(newDecided);
                    setSingleIrPrevRatings(newPrevRatings);
                    setSingleIrReassessing(false);

                    const ratedFilenames = new Set(rated.map(r => r.filename));
                    setSingleIrRatings(prev => {
                      const next: Record<string, "love" | "like" | "meh" | "nope"> = {};
                      for (const [k, v] of Object.entries(prev)) {
                        if (!ratedFilenames.has(k)) next[k] = v;
                      }
                      return next;
                    });
                    setSingleIrTags(prev => {
                      const next: Record<string, string[]> = {};
                      for (const [k, v] of Object.entries(prev)) {
                        if (!ratedFilenames.has(k)) next[k] = v;
                      }
                      return next;
                    });
                    setSingleIrNotes(prev => {
                      const next: Record<string, string> = {};
                      for (const [k, v] of Object.entries(prev)) {
                        if (!ratedFilenames.has(k)) next[k] = v;
                      }
                      return next;
                    });
                  } catch {}
                }}
              >
                Submit Ratings
              </button>

              <button
                className="px-3 py-1 rounded border border-zinc-600"
                onClick={() => {
                  setSingleIrRatings({});
                  setSingleIrTags({});
                  setSingleIrNotes({});
                }}
                data-testid="button-clear-single-ir"
              >
                Clear
              </button>
            </div>}
            {singleIrUndecided.length > 0 && <div className="text-xs opacity-70">
              Ratings learn: (1) which IRs work standalone vs need a partner, (2) your tonal preferences. Tags are stored and inform pairing suggestions.
            </div>}
          </div>
        )}


        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                <Blend className="w-5 h-5 text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Learner</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="ghost"
                onClick={copyVotingResults}
                data-testid="button-copy-voting-log-top"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy Voting Log
              </Button>
              <div className="flex items-center gap-1 rounded-lg border border-teal-500/30 bg-teal-500/5 p-1" data-testid="taste-mode-selector">
                <button
                  onClick={() => {
                    setTasteCheckMode(tasteCheckMode === "acquisition" ? "learning" : "acquisition");
                    if (ratioRefinePhase) setRatioRefinePhase(null);
                  }}
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
                  onClick={() => {
                    setTasteCheckMode("learning");
                    if (ratioRefinePhase) setRatioRefinePhase(null);
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition-colors rounded-md",
                    tasteCheckMode === "learning"
                      ? "bg-teal-500/25 text-teal-300"
                      : "text-muted-foreground hover-elevate"
                  )}
                  data-testid="button-taste-learning"
                >
                  Learning
                </button>
                <button
                  onClick={() => {
                    setTasteCheckMode(tasteCheckMode === "tester" ? "learning" : "tester");
                    if (ratioRefinePhase) setRatioRefinePhase(null);
                  }}
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
                <button
                  onClick={() => {
                    const alreadyRatio = tasteCheckMode === "ratio";
                    if (!alreadyRatio) {
                      setTasteCheckMode("ratio");
                    }

                    if (tasteCheckPhase) {
                      if (tasteCheckTimeoutRef.current) {
                        clearTimeout(tasteCheckTimeoutRef.current);
                        tasteCheckTimeoutRef.current = null;
                      }
                      modeTriggeredTasteCheck.current = false;
                      const pending = tasteCheckPhase.pendingRefineCandidates;
                      const pendingLoad = tasteCheckPhase.pendingLoadTopPick;
                      setTasteCheckPhase(null);
                      if (pending.length > 0) {
                        proceedToRatioRefine(pending, pendingLoad);
                        return;
                      }
                    }

                    if (!hasPairingPool) {
                      toast({ title: "Load IRs first", description: "Drop your IR files in the Load IRs section below to get started." });
                    } else if (ratioRefinePhase) {
                      setTimeout(() => ratioRefineRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
                    }
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition-colors rounded-md",
                    tasteCheckMode === "ratio"
                      ? "bg-sky-500/25 text-sky-300"
                      : "text-muted-foreground hover-elevate"
                  )}
                  data-testid="button-taste-ratio"
                >
                  Ratio
                </button>
              </div>
              <button
                onClick={() => setBlindMode(prev => !prev)}
                className={cn(
                  "px-2.5 py-1.5 text-xs font-medium transition-colors rounded-md border",
                  blindMode
                    ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
                    : "border-zinc-600/40 bg-zinc-700/20 text-muted-foreground hover-elevate"
                )}
                data-testid="button-blind-mode"
                title={blindMode ? "Blind mode ON — tonal data hidden to avoid bias" : "Blind mode OFF — tonal data visible"}
              >
                {blindMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setRefinementEnabled(prev => !prev)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors rounded-md border",
                  refinementEnabled
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                    : "border-zinc-600/40 bg-zinc-700/20 text-muted-foreground hover-elevate"
                )}
                data-testid="button-refinement-toggle"
                title={refinementEnabled ? "Refinement ON — winners will be tested against each other" : "Refinement OFF — winners accumulate without head-to-head testing"}
              >
                {refinementEnabled ? "Refine ✓" : "Refine ✗"}
              </button>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            {tasteCheckMode === "ratio"
              ? hasPairingPool
                ? "Ratio mode active — pick a pairing to start refining blend ratios directly. No taste checks."
                : "Ratio mode — drop your IRs in the Load IRs section below to get started."
              : "Drop IRs to preview blend permutations scored against your tonal profiles."}
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

        {learnedProfile && learnedProfile.tonalSummary && learnedProfile.status !== "no_data" && (
          <TonalInsightsPanel
            learnedProfile={learnedProfile}
            eloRatings={getEloRatings(tasteContext)}
          />
        )}

        <div className="mb-8 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Upload className="w-4 h-4 text-amber-400" />
            Load IRs
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Drop all your IRs from a speaker set to start taste learning and evaluation.
          </p>
          <DropZone
            label="Drop All IRs"
            description="Analyze a full set to begin taste learning"
            onFilesAdded={handleAllFiles}
            isLoading={isLoadingAll}
          />

          {allIRs.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
              <details open>
                <summary className="text-xs text-muted-foreground uppercase tracking-wider mb-2 cursor-pointer select-none">
                  Loaded IRs — Role Summary ({allIRs.length})
                </summary>
                <div className="flex justify-end mb-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyIRSummaryTSV}
                    data-testid="button-copy-ir-summary"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy Summary
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-2 max-h-[300px] overflow-y-auto pr-1">
                  {allIRs.map((ir) => (
                    <div key={ir.filename} className={cn("flex items-center gap-1.5 py-0.5 px-2 rounded", "bg-white/[0.02]")} data-testid={`ir-role-summary-${ir.filename}`}>
                      <span className="text-[10px] font-mono text-foreground truncate flex-1 min-w-0">
                        {ir.filename.replace(/(_\d{13})?\.wav$/, "")}
                      </span>
                      <MusicalRoleBadgeFromFeatures filename={ir.filename} features={ir.features} speakerStatsMap={speakerStatsMap} />
                    </div>
                  ))}
                </div>
              </details>
            </motion.div>
          )}
        </div>

        {allIRs.length >= 1 && (
          <TestAIPanel allIRs={allIRs} speakerStatsMap={speakerStatsMap} />
        )}

        {allIRs.length >= 2 && (
          <FindTonePanel allIRs={allIRs} speakerStatsMap={speakerStatsMap} />
        )}

        {hasPairingPool && (suggestedPairs.length > 0 || ratioRefinePhase || tasteCheckPhase || tasteCheckMode === "ratio") && !doneRefining && (
          <motion.div ref={pairingSectionRef} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-4 rounded-xl bg-violet-500/5 border border-violet-500/20">
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
              <div className="flex items-center gap-2 flex-wrap">
                {totalRoundsCompleted > 0 && (
                  <span className="text-[10px] text-muted-foreground font-mono" data-testid="text-cumulative-signals">
                    {cumulativeSignals.liked} rated / {cumulativeSignals.noped} noped so far
                  </span>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyVotingResults}
                  data-testid="button-copy-voting-results"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Voting Log
                </Button>
              </div>
            </div>
            {!ratioRefinePhase && tasteCheckMode !== "ratio" && !tasteCheckPhase && (
            <p className="text-xs text-muted-foreground mb-4">
              {totalRoundsCompleted === 0
                ? learnedProfile && learnedProfile.status !== "no_data"
                  ? `Predicted best pairings based on your taste profile (${learnedProfile.signalCount} signals). Rate to confirm or refine.`
                  : "Top 3 blends from your set. Love, Like, or Meh the ones worth keeping. Nope the rest."
                : "Fresh suggestions informed by your taste. Keep refining or load your top pick into the mixer."
              }
            </p>
            )}
            {!ratioRefinePhase && tasteCheckMode === "ratio" && !tasteCheckPhase && suggestedPairs.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-xs text-muted-foreground">Pick a pairing to refine its blend ratio:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {suggestedPairs.map((pair, idx) => {
                    const pool = allIRs;
                    return (
                      <Button
                        key={`${pair.baseFilename}-${pair.featureFilename}`}
                        variant="ghost"
                        className="h-auto p-3 rounded-lg border border-sky-500/20 bg-sky-500/5 text-left flex flex-col items-start gap-1"
                        onClick={() => {
                          const baseData = pool.find((ir) => ir.filename === pair.baseFilename);
                          const featData = pool.find((ir) => ir.filename === pair.featureFilename);
                          if (baseData && featData) {
                            proceedToRatioRefine(
                              [{ pair, rank: idx + 1, baseFeatures: baseData.features, featFeatures: featData.features }],
                              false
                            );
                          }
                        }}
                        data-testid={`button-ratio-pick-${idx}`}
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono text-foreground">{pair.baseFilename.replace(/(_\d{13})?\.wav$/, "")}</span>
                          <MusicalRoleBadgeFromFeatures filename={pair.baseFilename} features={featuresByFilename.get(pair.baseFilename)} speakerStatsMap={speakerStatsMap} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          + {pair.suggestedRatio ? `${Math.round(pair.suggestedRatio.base * 100)}/${Math.round(pair.suggestedRatio.feature * 100)}` : "50/50"}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono text-foreground">{pair.featureFilename.replace(/(_\d{13})?\.wav$/, "")}</span>
                          <MusicalRoleBadgeFromFeatures filename={pair.featureFilename} features={featuresByFilename.get(pair.featureFilename)} speakerStatsMap={speakerStatsMap} />
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
            {!ratioRefinePhase && tasteCheckMode !== "ratio" && !tasteCheckPhase && suggestedPairs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suggestedPairs.map((pair, idx) => {
                const pk = pairKey(pair);
                const isDismissed = dismissedPairings.has(pk);
                const assignedRank = pairingRankings[pk];
                const hiMidMidRatio = pair.blendBands.mid > 0
                  ? Math.round((pair.blendBands.highMid / pair.blendBands.mid) * 100) / 100
                  : 0;
                const selectedTags = pairingFeedback[pk] ?? [];
                const rating = pairingRankings[pk];
                const isNope = dismissedPairings.has(pk);
                const ratingLabel = isNope ? "nope" : rating === 1 ? "love" : rating === 2 ? "like" : rating === 3 ? "meh" : null;
                const activeTagBank =
                  ratingLabel === "love" ? WHY_TAGS :
                  ratingLabel === "like" ? IMPROVE_TAGS :
                  (ratingLabel === "meh" || ratingLabel === "nope") ? ISSUE_TAGS :
                  null;
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-mono text-foreground truncate" data-testid={`text-pair-base-${idx}`}>
                          {pair.baseFilename.replace(/(_\d{13})?\.wav$/, "")}
                        </p>
                        {!blindMode && (
                          <>
                            <MusicalRoleBadgeFromFeatures filename={pair.baseFilename} features={featuresByFilename.get(pair.baseFilename)} speakerStatsMap={speakerStatsMap} />
                            <ShotIntentBadge filename={pair.baseFilename} />
                          </>
                        )}
                        <StandaloneBadge filename={pair.baseFilename} standaloneWorthy={learnedProfile?.standaloneWorthy} compact />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        + ({pair.suggestedRatio
                          ? `${Math.round(pair.suggestedRatio.base * 100)}/${Math.round(pair.suggestedRatio.feature * 100)}`
                          : "50/50"})
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-mono text-foreground truncate" data-testid={`text-pair-feature-${idx}`}>
                          {pair.featureFilename.replace(/(_\d{13})?\.wav$/, "")}
                        </p>
                        {!blindMode && (
                          <>
                            <MusicalRoleBadgeFromFeatures filename={pair.featureFilename} features={featuresByFilename.get(pair.featureFilename)} speakerStatsMap={speakerStatsMap} />
                            <ShotIntentBadge filename={pair.featureFilename} />
                          </>
                        )}
                        <StandaloneBadge filename={pair.featureFilename} standaloneWorthy={learnedProfile?.standaloneWorthy} compact />
                      </div>
                      {!blindMode && tasteStatus.nVotes > 0 && (() => {
                        const anchor = suggestedPairs?.[0];
                        const meanVec = (() => {
                          try {
                            const vecs: number[][] = [];
                            for (const p of suggestedPairs) {
                              const bF = featuresByFilename.get(p.baseFilename);
                              const fF = featuresByFilename.get(p.featureFilename);
                              const ratio = p.suggestedRatio?.base ?? 0.5;
                              if (bF && fF) vecs.push(featurizeBlend(bF, fF, ratio));
                            }
                            return vecs.length ? meanVector(vecs) : null;
                          } catch {
                            return null;
                          }
                        })();
                        const tags = anchor ? explainPairVsAnchor(pair, anchor, meanVec) : [];
                        return tags.length > 0 ? (
                          <p className="text-[9px] text-yellow-400/80 italic truncate" data-testid={`text-pair-explain-${idx}`}>
                            Why: {tags.join(", ")}
                          </p>
                        ) : null;
                      })()}
                    </div>

                    {activeTagBank && (
                      <>
                        <div className="mt-2 text-xs opacity-80">
                          {ratingLabel === "love" ? "Why?" : ratingLabel === "like" ? "Improve?" : "Issue?"}
                        </div>
                        <div className="flex gap-2 flex-wrap mt-1">
                          {activeTagBank.map((tag) => (
                            <button
                              key={tag}
                              className={cn(
                                "px-2 py-1 rounded border text-xs",
                                selectedTags.includes(tag) ? "border-amber-400" : "border-zinc-600"
                              )}
                              onClick={() => toggleBlendTag(pk, tag)}
                              data-testid={`button-blend-tag-${tag}-${idx}`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    <div className="mt-2 text-xs opacity-80">Notes (stored only, not training):</div>
                    <textarea
                      className="w-full mt-1 p-2 rounded border border-zinc-700 bg-transparent text-xs"
                      rows={2}
                      value={pairingFeedbackText[pk] ?? ""}
                      onChange={(e) => setPairingFeedbackText(prev => ({ ...prev, [pk]: e.target.value }))}
                      placeholder="Optional notes..."
                      data-testid={`textarea-blend-notes-${idx}`}
                    />

                    {!isDismissed && (
                      <>
                        {!blindMode && (
                          <>
                            <BandChart bands={pair.blendBands} height={12} compact />
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <BlendQualityBadge score={pair.blendScore} label={pair.blendLabel} />
                              <span className={cn(
                                "text-[10px] font-mono px-1.5 py-0.5 rounded",
                                hiMidMidRatio < 1.0 ? "bg-blue-500/20 text-blue-400" :
                                hiMidMidRatio <= 2.0 ? "bg-green-500/20 text-green-400" :
                                "bg-amber-500/20 text-amber-400"
                              )}>
                                {hiMidMidRatio.toFixed(2)}
                              </span>
                            </div>
                          </>
                        )}

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
                            <textarea
                              rows={2}
                              placeholder={assignedRank === 1 ? "What makes it great..." : assignedRank === 2 ? "What would make it better..." : "Describe the issue..."}
                              value={pairingFeedbackText[pk] || ""}
                              onChange={(e) => setPairingFeedbackText((prev) => ({ ...prev, [pk]: e.target.value }))}
                              className="w-full text-[10px] bg-background border border-border/40 rounded-sm px-2 py-1 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring leading-snug resize-y whitespace-pre-wrap break-words"
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

            {canConfirm && !ratioRefinePhase && tasteCheckMode !== "ratio" && !tasteCheckPhase && (
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

            {tasteCheckPhase && tasteCheckMode !== "ratio" && (
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
                    {!tasteCheckPhase.showingResult && (
                      <>
                        <div className="flex items-center rounded-md border border-teal-500/20 overflow-visible" data-testid="taste-mode-selector">
                          <button
                            onClick={() => setTasteCheckMode(tasteCheckMode === "acquisition" ? "learning" : "acquisition")}
                            className={cn(
                              "px-2 py-1 text-[10px] font-medium transition-colors rounded-l-md",
                              tasteCheckMode === "acquisition" || (tasteCheckMode === "learning" && !tasteCheckBinary)
                                ? "bg-teal-500/20 text-teal-300"
                                : "text-muted-foreground"
                            )}
                            data-testid="button-taste-acquisition"
                          >
                            4-Pick
                          </button>
                          <button
                            onClick={() => setTasteCheckMode(tasteCheckMode === "tester" ? "learning" : "tester")}
                            className={cn(
                              "px-2 py-1 text-[10px] font-medium transition-colors rounded-r-md",
                              tasteCheckMode === "tester" || (tasteCheckMode === "learning" && tasteCheckBinary)
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
                      {tasteTieMode
                        ? "Tap the options you like equally, then confirm."
                        : "Pick whichever blend sounds best to you."}
                    </p>
                    <div className={cn(
                      "grid gap-3",
                      tasteCheckDisplayCandidates.length > 2 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"
                    )}>
                      {tasteCheckDisplayCandidates.map((pair, idx) => {
                        const hiMidMidRatio = pair.blendBands.mid > 0
                          ? Math.round((pair.blendBands.highMid / pair.blendBands.mid) * 100) / 100
                          : 0;
                        const isTieSelected = tasteTieMode && tasteTieSelected.has(idx);
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (tasteTieMode) {
                                setTasteTieSelected(prev => {
                                  const next = new Set(prev);
                                  if (next.has(idx)) next.delete(idx);
                                  else next.add(idx);
                                  return next;
                                });
                              } else {
                                handleTasteCheckPick(idx);
                              }
                            }}
                            className={cn(
                              "p-3 rounded-lg border transition-all text-left space-y-2",
                              isTieSelected
                                ? "border-teal-400 bg-teal-500/10 ring-1 ring-teal-400/30"
                                : "border-white/10 hover-elevate"
                            )}
                            data-testid={`button-taste-option-${idx}`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <p className={cn(
                                "text-xs font-semibold uppercase tracking-widest",
                                isTieSelected ? "text-teal-400" : "text-foreground"
                              )}>
                                {String.fromCharCode(65 + idx)}
                              </p>
                              {isTieSelected && (
                                <CheckCircle className="w-3.5 h-3.5 text-teal-400" />
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                              <p className="text-[10px] font-mono text-foreground truncate">
                                {pair.baseFilename.replace(/(_\d{13})?\.wav$/, "")}
                              </p>
                              {!blindMode && <MusicalRoleBadgeFromFeatures filename={pair.baseFilename} features={featuresByFilename.get(pair.baseFilename)} speakerStatsMap={speakerStatsMap} />}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              + {pair.suggestedRatio
                                ? `${Math.round(pair.suggestedRatio.base * 100)}/${Math.round(pair.suggestedRatio.feature * 100)}`
                                : "50/50"}
                            </p>
                            <div className="flex items-center gap-1 flex-wrap">
                              <p className="text-[10px] font-mono text-foreground truncate">
                                {pair.featureFilename.replace(/(_\d{13})?\.wav$/, "")}
                              </p>
                              {!blindMode && <MusicalRoleBadgeFromFeatures filename={pair.featureFilename} features={featuresByFilename.get(pair.featureFilename)} speakerStatsMap={speakerStatsMap} />}
                            </div>
                            {!blindMode && (
                              <>
                                <BandChart bands={pair.blendBands} height={10} compact />
                                <div className="flex items-center justify-end gap-1 flex-wrap">
                                  <span className={cn(
                                    "text-[10px] font-mono px-1.5 py-0.5 rounded",
                                    hiMidMidRatio < 1.0 ? "bg-blue-500/20 text-blue-400" :
                                    hiMidMidRatio <= 2.0 ? "bg-green-500/20 text-green-400" :
                                    "bg-amber-500/20 text-amber-400"
                                  )}>
                                    HiMid/Mid: {hiMidMidRatio.toFixed(2)}
                                  </span>
                                </div>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {tasteTieMode ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setTasteTieMode(false); setTasteTieSelected(new Set()); }}
                          className="flex-1 text-center py-1.5 text-[11px] text-muted-foreground hover-elevate rounded-md transition-colors"
                          data-testid="button-taste-tie-cancel"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (tasteTieSelected.size >= 2) {
                              handleTasteCheckMultiTie(tasteTieSelected);
                              handleTasteCheckPick(-1);
                              setTasteTieMode(false);
                              setTasteTieSelected(new Set());
                            }
                          }}
                          disabled={tasteTieSelected.size < 2}
                          className={cn(
                            "flex-1 text-center py-1.5 text-[11px] rounded-md transition-colors",
                            tasteTieSelected.size >= 2
                              ? "text-teal-400 bg-teal-500/10 hover-elevate"
                              : "text-muted-foreground/50 cursor-not-allowed"
                          )}
                          data-testid="button-taste-tie-confirm"
                        >
                          Confirm {tasteTieSelected.size >= 2
                            ? `${tasteTieSelected.size} equally liked`
                            : "(select 2+)"}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setTasteTieMode(true); setTasteTieSelected(new Set()); }}
                          className="flex-1 text-center py-1.5 text-[11px] text-muted-foreground hover-elevate rounded-md transition-colors"
                          data-testid="button-taste-tie"
                        >
                          Equally liked
                        </button>
                        <button
                          onClick={() => { handleTasteCheckTie(); handleTasteCheckPick(-1); }}
                          className="flex-1 text-center py-1.5 text-[11px] text-muted-foreground/70 hover-elevate rounded-md transition-colors"
                          data-testid="button-taste-no-pref"
                        >
                          No preference
                        </button>
                      </div>
                    )}
                  </>
                )}

                {tasteCheckPhase.showingResult && tasteCheckPhase.userPick !== null && (
                  <div className="text-center py-2 space-y-1">
                    <p className="text-xs text-teal-400 font-medium">
                      {tasteCheckPhase.userPick === -1
                        ? "No preference — noted, moving on."
                        : "Got it — preference recorded."}
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
                            {tasteCheckMode !== "ratio" && (
                              <Badge variant="outline" className={cn("text-[10px]", cand.rank === 1 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-violet-500/20 text-violet-400 border-violet-500/30")}>
                                {cand.rank === 1 ? "Love" : "Like"}
                              </Badge>
                            )}
                            {ci === 0 && <span className="text-[9px] text-sky-400 font-medium">(suggested)</span>}
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            <p className="text-xs font-mono text-foreground truncate">{cand.pair.baseFilename.replace(/(_\d{13})?\.wav$/, "")}</p>
                            {!blindMode && <MusicalRoleBadgeFromFeatures filename={cand.pair.baseFilename} features={featuresByFilename.get(cand.pair.baseFilename)} speakerStatsMap={speakerStatsMap} />}
                          </div>
                          <p className="text-[10px] text-muted-foreground">+ (50/50)</p>
                          <div className="flex items-center gap-1 flex-wrap">
                            <p className="text-xs font-mono text-foreground truncate">{cand.pair.featureFilename.replace(/(_\d{13})?\.wav$/, "")}</p>
                            {!blindMode && <MusicalRoleBadgeFromFeatures filename={cand.pair.featureFilename} features={featuresByFilename.get(cand.pair.featureFilename)} speakerStatsMap={speakerStatsMap} />}
                          </div>
                          {!blindMode && <BandChart bands={cand.pair.blendBands} height={8} compact />}
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
                        {!blindMode && <MusicalRoleBadgeFromFeatures filename={cand.pair.baseFilename} features={featuresByFilename.get(cand.pair.baseFilename)} speakerStatsMap={speakerStatsMap} />}
                        <span>+</span>
                        <span className="font-mono text-foreground">{cand.pair.featureFilename.replace(/(_\d{13})?\.wav$/, "")}</span>
                        {!blindMode && <MusicalRoleBadgeFromFeatures filename={cand.pair.featureFilename} features={featuresByFilename.get(cand.pair.featureFilename)} speakerStatsMap={speakerStatsMap} />}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {(["a", "b"] as const).map((side) => {
                          const r = current[side];
                          const bands = blendFeatures(cand.baseFeatures, cand.featFeatures, r, 1 - r).bandsPercent;
                          return (
                            <button
                              key={side}
                              onClick={() => handleRatioPick(side)}
                              className="p-3 rounded-lg border border-white/10 hover-elevate transition-all text-left space-y-2"
                              data-testid={`button-pick-${side}`}
                            >
                              {blindMode ? (
                                <p className="text-lg font-mono text-foreground text-center py-2">
                                  {side === "a" ? "A" : "B"}
                                </p>
                              ) : (
                                <>
                                  <p className="text-sm font-mono text-foreground text-center">
                                    {Math.round(r * 100)}/{Math.round((1 - r) * 100)}
                                  </p>
                                  <BandChart bands={bands} height={10} compact />
                                </>
                              )}
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRatioPick("both")}
                          className="text-xs text-teal-400/80"
                          data-testid="button-ratio-both"
                        >
                          Both useful
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
                All pairings evaluated ({cumulativeSignals.liked} rated, {cumulativeSignals.noped} noped across {totalRoundsCompleted} rounds). Your preferences have been recorded.
              </p>
            </div>
          </motion.div>
        )}

        {doneRefining && (
          <div className="mb-8 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-xs text-muted-foreground">
                {totalRoundsCompleted} round{totalRoundsCompleted !== 1 ? "s" : ""} complete -- {cumulativeSignals.liked} liked, {cumulativeSignals.noped} noped. Profiles refined. #1 pairing loaded below.
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={copyVotingResults}
              data-testid="button-copy-voting-results-done"
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy Voting Log
            </Button>
          </div>
        )}

        {(() => {
          const eloData = getEloRatings(tasteContext);
          const eloEntries = Object.entries(eloData).sort((a, b) => b[1].rating - a[1].rating);
          if (eloEntries.length === 0) return null;
          return (
            <div className="mb-4" data-testid="vote-history-panel">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVoteHistory(!showVoteHistory)}
                className="flex items-center gap-2 text-xs text-muted-foreground w-full justify-start"
                data-testid="button-toggle-vote-history"
              >
                <BarChart3 className="w-3.5 h-3.5 text-teal-400" />
                <span className="font-medium">Vote History</span>
                <Badge variant="outline" className="text-[10px] border-teal-500/30 text-teal-400 ml-1">
                  {eloEntries.length} combos / {eloEntries.reduce((s, [, e]) => s + e.matchCount, 0)} matches
                </Badge>
                {showVoteHistory ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
              </Button>
              <AnimatePresence>
                {showVoteHistory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 rounded-lg border border-white/10 overflow-hidden">
                      <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-3 px-3 py-1.5 bg-white/[0.02] border-b border-white/5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        <span>Blend</span>
                        <span className="text-right">Rating</span>
                        <span className="text-right">Matches</span>
                        <span className="text-right">Wins</span>
                        <span className="text-right">Win%</span>
                        <span className="text-right">Conf</span>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {eloEntries.map(([key, entry], i) => {
                          const files = key.split("||");
                          const cleanName = (f: string) => f.replace(/(_\d+)?\.wav$/i, "");
                          const winPct = entry.matchCount > 0 ? Math.round(((entry.winCount ?? 0) / entry.matchCount) * 100) : 0;
                          const ratingColor = entry.rating >= 1100 ? "text-emerald-400" : entry.rating >= 1000 ? "text-teal-400" : entry.rating >= 900 ? "text-amber-400" : "text-red-400";
                          const conf = Math.round((1 - entry.uncertainty) * 100);
                          const confColor = conf >= 70 ? "text-emerald-400" : conf >= 40 ? "text-amber-400" : "text-muted-foreground";
                          return (
                            <div
                              key={key}
                              className={cn(
                                "grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-3 px-3 py-1.5 text-[10px]",
                                i % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"
                              )}
                              data-testid={`vote-history-row-${i}`}
                            >
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="font-mono text-foreground truncate">{cleanName(files[0])}</span>
                                <span className="font-mono text-muted-foreground truncate">+ {cleanName(files[1] ?? "")}</span>
                              </div>
                              <span className={cn("text-right font-mono font-medium tabular-nums self-center", ratingColor)}>
                                {Math.round(entry.rating)}
                              </span>
                              <span className="text-right font-mono text-muted-foreground tabular-nums self-center">
                                {entry.matchCount}
                              </span>
                              <span className="text-right font-mono text-foreground tabular-nums self-center">
                                {entry.winCount ?? 0}
                              </span>
                              <span className={cn(
                                "text-right font-mono tabular-nums self-center",
                                winPct >= 60 ? "text-emerald-400" : winPct >= 40 ? "text-muted-foreground" : "text-red-400"
                              )}>
                                {winPct}%
                              </span>
                              <span className={cn("text-right font-mono tabular-nums self-center", confColor)}>
                                {conf}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })()}

        {(() => {
          const pool = allIRs;
          if (pool.length === 0) return null;
          const sorted = [...pool].sort((a, b) => {
            const aMatch = scoreAgainstAllProfiles(a.features, activeProfiles);
            const bMatch = scoreAgainstAllProfiles(b.features, activeProfiles);
            return bMatch.best.score - aMatch.best.score;
          });
          return (
            <div className="mb-8 space-y-3" data-testid="individual-ir-panel">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  Individual IR Evaluation
                  <span className="text-muted-foreground font-normal">({pool.length} IRs)</span>
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Each IR scored independently — not influenced by blend context. Role suggestions are based on tonal characteristics.
              </p>
              <div className="space-y-2">
                {sorted.map((ir, idx) => {
                  const match = scoreAgainstAllProfiles(ir.features, activeProfiles);
                  const centroid = ir.metrics.spectralCentroid ?? 0;
                  return (
                    <div key={ir.filename} className={cn(
                      "p-3 rounded-xl border",
                      blindMode ? "bg-white/[0.02] border-white/5" :
                      match.best.label === "strong" ? "bg-emerald-500/[0.03] border-emerald-500/20" :
                      match.best.label === "close" ? "bg-sky-500/[0.03] border-sky-500/20" :
                      "bg-white/[0.02] border-white/5"
                    )} data-testid={`individual-ir-${idx}`}>
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                          <span className="text-xs font-mono text-foreground truncate">
                            {ir.filename.replace(/(_\d{13})?\.wav$/, "")}
                          </span>
                          {!blindMode && (
                            <>
                              <MusicalRoleBadgeFromFeatures filename={ir.filename} features={ir.features} speakerStatsMap={speakerStatsMap} />
                              <ShotIntentBadge filename={ir.filename} />
                            </>
                          )}
                          <StandaloneBadge filename={ir.filename} standaloneWorthy={learnedProfile?.standaloneWorthy} compact />
                        </div>
                      </div>
                      {!blindMode && <TonalReadouts features={ir.features} centroid={centroid} />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {ratioRefinePhase && !hasPairingPool && (
          <motion.div
            ref={ratioRefineRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-xl bg-sky-500/5 border border-sky-500/20 space-y-4"
            data-testid="ratio-refine-standalone"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-sky-400" />
                <span className="text-sm font-medium text-sky-400">
                  {ratioRefinePhase.stage === "done"
                    ? "Ratio Refinement — Complete"
                    : `Ratio Refinement — Round ${ratioRefinePhase.step + 1}`}
                </span>
              </div>
              <Button size="sm" variant="ghost" onClick={skipRatioRefine} className="text-xs text-muted-foreground" data-testid="button-skip-refine-standalone">
                Cancel
              </Button>
            </div>

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
                  <p className="text-xs text-muted-foreground">Which blend do you prefer?</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(["a", "b"] as const).map((side) => {
                      const r = current[side];
                      const bands = blendFeatures(cand.baseFeatures, cand.featFeatures, r, 1 - r).bandsPercent;
                      return (
                        <button
                          key={side}
                          onClick={() => handleRatioPick(side)}
                          className="p-3 rounded-lg border border-white/10 hover-elevate transition-all text-left space-y-2"
                          data-testid={`button-standalone-pick-${side}`}
                        >
                          {blindMode ? (
                            <p className="text-lg font-mono text-foreground text-center py-2">
                              {side === "a" ? "A" : "B"}
                            </p>
                          ) : (
                            <>
                              <p className="text-sm font-mono text-foreground text-center">
                                {Math.round(r * 100)}/{Math.round((1 - r) * 100)}
                              </p>
                              <BandChart bands={bands} height={10} compact />
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 justify-center flex-wrap">
                    <Button size="sm" variant="ghost" onClick={() => handleRatioPick("tie")} className="text-xs text-muted-foreground" data-testid="button-standalone-ratio-tie">
                      No difference
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleRatioPick("both")} className="text-xs text-teal-400/80" data-testid="button-standalone-ratio-both">
                      Both useful
                    </Button>
                  </div>
                </div>
              );
            })()}

            {ratioRefinePhase.stage === "done" && (
              <div className="text-center py-2">
                <p className="text-xs text-emerald-400">
                  Preferred ratio: {Math.round((ratioRefinePhase.winner ?? 0.5) * 100)}/{Math.round((1 - (ratioRefinePhase.winner ?? 0.5)) * 100)} saved
                </p>
              </div>
            )}
          </motion.div>
        )}

        {allIRs.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Blend className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">Drop your IR files above to start taste learning.</p>
          </div>
        )}
      </div>
    </div>
  );
}
