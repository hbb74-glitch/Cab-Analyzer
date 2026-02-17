import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Layers, X, Blend, ChevronDown, ChevronUp, Crown, Target, Zap, Sparkles, Trophy, Brain, ArrowLeftRight, Trash2, MessageSquare, Search, Send, Loader2, Copy, Check } from "lucide-react";
import { ShotIntentBadge } from "@/components/ShotIntentBadge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { featurizeBlend, featurizeSingleIR, getTasteBias, resetTaste, getTasteStatus, simulateVotes, meanVector, centerVector, getComplementBoost, recordOutcome, type TasteContext } from "@/lib/tasteStore";
import { analyzeAudioFile, type AudioMetrics } from "@/hooks/use-analyses";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { computeTonalFeatures, blendFeatures, BAND_KEYS } from "@/lib/tonal-engine";
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
  findFoundationIR,
  rankBlendPartners,
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

function BlendQualityBadge({ score, label }: { score: number; label: MatchResult["label"] }) {
  const colorMap = {
    strong: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    close: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    partial: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    miss: "bg-white/5 text-muted-foreground border-white/10",
  };
  const qualityLabel = label === "strong" ? "Great" : label === "close" ? "Good" : label === "partial" ? "OK" : "Weak";
  const Icon = label === "strong" || label === "close" ? Blend : Zap;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border", colorMap[label])} data-testid="badge-blend-quality">
      <Icon className="w-2.5 h-2.5" />
      {qualityLabel} {score}
    </span>
  );
}


function ProfileScores({ features, profiles }: { features: TonalFeatures; profiles?: import("@/lib/preference-profiles").PreferenceProfile[] }) {
  const { results } = scoreAgainstAllProfiles(features, profiles);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {results.map((r) => (
        <MatchBadge key={r.profile} match={r} />
      ))}
    </div>
  );
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

function BandChart({ bands, features, height = 20, compact = false, showScores = false, profiles, centroid }: { bands: TonalBands; features?: TonalFeatures; height?: number; compact?: boolean; showScores?: boolean; profiles?: import("@/lib/preference-profiles").PreferenceProfile[]; centroid?: number }) {
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
        <TonalReadouts features={features} centroid={centroid} />
        {showScores && features && <ProfileScores features={features} profiles={profiles} />}
      </div>
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

function TestAIPanel({ allIRs }: { allIRs: AnalyzedIR[] }) {
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
                            <span className="text-xs font-medium text-foreground">{r.filename.replace(/\.wav$/i, '')}</span>
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
                      <span className="text-xs font-medium text-foreground">{r.filename.replace(/\.wav$/i, '')}</span>
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

function FindTonePanel({ allIRs }: { allIRs: AnalyzedIR[] }) {
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
                <div className="text-xs text-foreground mb-1">
                  <span className="font-medium">{sug.baseIR.replace(/\.wav$/i, '')}</span>
                  <span className="text-muted-foreground mx-1">+</span>
                  <span className="font-medium">{sug.featureIR.replace(/\.wav$/i, '')}</span>
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

function TonalInsightsPanel({ learnedProfile }: { learnedProfile: LearnedProfileData }) {
  const [expanded, setExpanded] = useState(false);
  const [correctionText, setCorrectionText] = useState("");
  const { toast } = useToast();

  const correctionMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/preferences/correct", { correctionText: text });
      return res.json();
    },
    onSuccess: (data: { applied: boolean; summary: string }) => {
      toast({ title: "Correction applied", description: data.summary });
      setCorrectionText("");
      queryClient.invalidateQueries({ queryKey: ["/api/preferences/learned"] });
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
              <div className="rounded-lg bg-card/50 p-3 border border-border/50" data-testid="tonal-summary-text">
                {renderFormattedSummary(learnedProfile.tonalSummary || "")}
              </div>

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

export default function IRMixer() {
  const { toast } = useToast();
  const [baseIR, setBaseIR] = useState<AnalyzedIR | null>(null);
  const [featureIRs, setFeatureIRs] = useState<AnalyzedIR[]>([]);
  const [allIRs, setAllIRs] = useState<AnalyzedIR[]>([]);
  const [viewMode, setViewMode] = useState<"blend" | "individual">("blend");
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
    pendingRefineCandidates: { pair: SuggestedPairing; rank: number; baseFeatures: TonalFeatures; featFeatures: TonalFeatures }[];
    pendingLoadTopPick: boolean;
  } | null>(null);
  const [tasteCheckPassed, setTasteCheckPassed] = useState(false);
  const [tasteCheckMode, setTasteCheckMode] = useState<"learning" | "acquisition" | "tester" | "ratio">("learning");
  const [tasteEnabled, setTasteEnabled] = useState(true);
  const [tasteIntent, setTasteIntent] = useState<"rhythm" | "lead" | "clean">("rhythm");
  const [tasteVersion, setTasteVersion] = useState(0);
  const [debugVisible, setDebugVisible] = useState(false);
  const [singleIrLearnOpen, setSingleIrLearnOpen] = useState(false);
  const [singleIrRatings, setSingleIrRatings] = useState<Record<string, "love" | "like" | "meh" | "nope">>({});
  const [singleIrPage, setSingleIrPage] = useState(0);
  const [singleIrTags, setSingleIrTags] = useState<Record<string, string[]>>({});
  const [singleIrNotes, setSingleIrNotes] = useState<Record<string, string>>({});
  const importTasteInputRef = useRef<HTMLInputElement | null>(null);
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
  const foundationRef = useRef<HTMLDivElement>(null);
  const pairingSectionRef = useRef<HTMLDivElement>(null);

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

  const speakerRelativeProfiles = useMemo(() => {
    const allLoaded = [...allIRs];
    if (baseIR && !allLoaded.some((ir) => ir.filename === baseIR.filename)) allLoaded.push(baseIR);
    for (const f of featureIRs) {
      if (!allLoaded.some((ir) => ir.filename === f.filename)) allLoaded.push(f);
    }
    if (allLoaded.length < 3) return DEFAULT_PROFILES;
    return computeSpeakerRelativeProfiles(allLoaded);
  }, [allIRs, baseIR, featureIRs]);

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
      const features = computeTonalFeatures(metrics);
      const rawEnergy = features.bandsRaw;
      const bands = features.bandsPercent;
      setBaseIR({ filename: file.name, metrics, rawEnergy, bands, features });
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
        const features = computeTonalFeatures(metrics);
        const rawEnergy = features.bandsRaw;
        const bands = features.bandsPercent;
        results.push({ filename: file.name, metrics, rawEnergy, bands, features });
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
        const features = computeTonalFeatures(metrics);
        const rawEnergy = features.bandsRaw;
        const bands = features.bandsPercent;
        results.push({ filename: file.name, metrics, rawEnergy, bands, features });
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
        const features = computeTonalFeatures(metrics);
        const rawEnergy = features.bandsRaw;
        const bands = features.bandsPercent;
        results.push({ filename: file.name, metrics, rawEnergy, bands, features });
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
        const features = computeTonalFeatures(metrics);
        const rawEnergy = features.bandsRaw;
        const bands = features.bandsPercent;
        results.push({ filename: file.name, metrics, rawEnergy, bands, features });
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

  const tasteContext: TasteContext = useMemo(() => {
    const speakerPrefix = (baseIR?.filename ?? pairingPool[0]?.filename ?? "unknown").split("_")[0] ?? "unknown";
    return { speakerPrefix, mode: "blend", intent: tasteIntent };
  }, [baseIR?.filename, pairingPool, tasteIntent]);

  const tasteStatus = useMemo(() => getTasteStatus(tasteContext), [tasteContext, tasteEnabled, tasteVersion]);

  const singleIrTasteContext: TasteContext = useMemo(() => {
    const speakerPrefix =
      (baseIR?.filename ?? pairingPool[0]?.filename ?? "unknown").split("_")[0] ?? "unknown";
    return { speakerPrefix, mode: "singleIR", intent: tasteIntent };
  }, [baseIR?.filename, pairingPool, tasteIntent]);

  const singleIrTasteStatus = useMemo(() => getTasteStatus(singleIrTasteContext), [singleIrTasteContext, tasteEnabled, tasteVersion]);

  const SINGLE_IR_PAGE_SIZE = 4;
  const singleIrTotalPages = useMemo(() => {
    const n = pairingPool.length;
    return Math.max(1, Math.ceil(n / SINGLE_IR_PAGE_SIZE));
  }, [pairingPool.length]);

  const singleIrPageItems = useMemo(() => {
    const start = singleIrPage * SINGLE_IR_PAGE_SIZE;
    const end = start + SINGLE_IR_PAGE_SIZE;
    return pairingPool.slice(start, end);
  }, [pairingPool, singleIrPage]);

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

  const suggestedPairsRaw = useMemo(() => {
    if (pairingPool.length < 2) return { all: [] as any[], top: [] as any[] };
    const baseList = suggestPairings(
      pairingPool,
      activeProfiles,
      20,
      learnedProfile || undefined,
      evaluatedPairs.size > 0 ? evaluatedPairs : undefined,
      exposureCounts.size > 0 ? exposureCounts : undefined
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

      if (!tasteEnabled || !bF || !fF) return { ...p, _tasteBoost: 0, _complementBoost: 0, _baseScore: p.score, _totalScore: p.score };

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
  }, [pairingPool, activeProfiles, learnedProfile, evaluatedPairs, exposureCounts, featuresByFilename, tasteContext, tasteEnabled, tasteVersion]);

  const suggestedPairs = suggestedPairsRaw.top;
  const suggestedPairsDebug = suggestedPairsRaw.all.map((p: any) => ({
    baseFilename: p.baseFilename,
    featureFilename: p.featureFilename,
    baseScore: p._baseScore ?? p.score,
    tasteBoost: p._tasteBoost ?? 0,
    totalScore: p._totalScore ?? p.score,
  }));

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
        undefined, tasteCheckMode as "acquisition" | "tester" | "learning"
      );
      if (tastePick) {
        const maxRounds = getTasteCheckRounds(tastePick.confidence, pairingPool.length);
        modeTriggeredTasteCheck.current = true;
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
          pendingRefineCandidates: [],
          pendingLoadTopPick: false,
        });
      }
    }

    if ((tasteCheckMode === "learning" || tasteCheckMode === "ratio") && tasteCheckPhase) {
      modeTriggeredTasteCheck.current = false;
      if (tasteCheckTimeoutRef.current) {
        clearTimeout(tasteCheckTimeoutRef.current);
        tasteCheckTimeoutRef.current = null;
      }
      const pending = tasteCheckPhase.pendingRefineCandidates;
      const pendingLoad = tasteCheckPhase.pendingLoadTopPick;
      setTasteCheckPhase(null);
      if (tasteCheckMode === "learning") setTasteCheckPassed(true);
      if (tasteCheckMode === "ratio" && pending.length > 0) {
        proceedToRatioRefine(pending, pendingLoad);
      }
    }
  }, [tasteCheckMode, pairingPool, activeProfiles, learnedProfile, evaluatedPairs, tasteCheckPhase, ratioRefinePhase, proceedToRatioRefine]);

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

    try {
      const source = (tasteCheckPhase.roundType === "binary") ? "ab" as const : "pick4" as const;
      const winner = tasteCheckPhase.candidates[pickedIndex];
      const wBase = featuresByFilename.get(winner.baseFilename);
      const wFeat = featuresByFilename.get(winner.featureFilename);
      const wRatio = winner.suggestedRatio?.base ?? 0.5;
      if (wBase && wFeat) {
        const xW = featurizeBlend(wBase, wFeat, wRatio);
        for (let i = 0; i < tasteCheckPhase.candidates.length; i++) {
          if (i === pickedIndex) continue;
          const loser = tasteCheckPhase.candidates[i];
          const lBase = featuresByFilename.get(loser.baseFilename);
          const lFeat = featuresByFilename.get(loser.featureFilename);
          const lRatio = loser.suggestedRatio?.base ?? 0.5;
          if (!lBase || !lFeat) continue;
          const xL = featurizeBlend(lBase, lFeat, lRatio);
          recordOutcome(tasteContext, xW, xL, "a", { source });
        }
        setTasteVersion(v => v + 1);
      }
    } catch {}

    const nextRound = tasteCheckPhase.round + 1;

    tasteCheckTimeoutRef.current = setTimeout(() => {
      tasteCheckTimeoutRef.current = null;
      if (tasteCheckModeRef.current === "ratio") {
        modeTriggeredTasteCheck.current = false;
        setTasteCheckPhase(null);
        if (tasteCheckPhase.pendingRefineCandidates.length > 0) {
          proceedToRatioRefine(tasteCheckPhase.pendingRefineCandidates, tasteCheckPhase.pendingLoadTopPick);
        }
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
        if (tasteCheckPhase.pendingRefineCandidates.length > 0) {
          proceedToRatioRefine(tasteCheckPhase.pendingRefineCandidates, tasteCheckPhase.pendingLoadTopPick);
        }
        return;
      }

      const nextPick = pickTasteCheckCandidates(
        pairingPool,
        activeProfiles,
        learnedProfile || undefined,
        undefined,
        newHistory,
        tasteCheckMode === "ratio" ? "learning" : tasteCheckMode
      );

      if (!nextPick) {
        modeTriggeredTasteCheck.current = false;
        setTasteCheckPhase(null);
        setTasteCheckPassed(true);
        if (tasteCheckPhase.pendingRefineCandidates.length > 0) {
          proceedToRatioRefine(tasteCheckPhase.pendingRefineCandidates, tasteCheckPhase.pendingLoadTopPick);
        }
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
    if (tasteCheckPhase.pendingRefineCandidates.length > 0) {
      proceedToRatioRefine(tasteCheckPhase.pendingRefineCandidates, tasteCheckPhase.pendingLoadTopPick);
    }
  }, [tasteCheckPhase, proceedToRatioRefine]);

  const liveConfidence = getTasteConfidence(learnedProfile || undefined);
  const tasteCheckBinary = tasteCheckPhase
    ? (tasteCheckMode === "tester" || (tasteCheckMode === "learning" && (liveConfidence === "high" || tasteCheckPhase.confidence === "high")) || tasteCheckPhase.candidates.length <= 2)
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
        score: Math.round(pair.score),
        profileMatch: pair.bestMatch.profile,
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
          return { action, strength: strengthOf(action), x };
        })
        .filter(Boolean) as { action: string; strength: number; x: number[] }[];

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

            if (diff === 0) {
              recordOutcome(tasteContext, a.xc, b.xc, "tie", { source: "learning" });
              continue;
            }
            if (diff > 0) recordOutcome(tasteContext, a.xc, b.xc, "a", { lr, source: "learning", tagsA, tagsB });
            else recordOutcome(tasteContext, b.xc, a.xc, "a", { lr, source: "learning", tagsA: tagsB, tagsB: tagsA });
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
    setTotalRoundsCompleted((prev) => prev + 1);

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
          const tastePick = pickTasteCheckCandidates(pairingPool, activeProfiles, learnedProfile || undefined, newEvaluated.size > 0 ? newEvaluated : undefined, undefined, tasteCheckMode as "acquisition" | "tester" | "learning");
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
      }
    } else {
      finishRound(loadTopPick, null);
    }
  }, [suggestedPairs, pairingRankings, pairingFeedback, pairingFeedbackText, dismissedPairings, submitSignalsMutation, evaluatedPairs, exposureCounts, allIRs, baseIR, featureIRs, pairKey, buildInitialRatioState, totalRoundsCompleted, tasteCheckPassed, pairingPool, activeProfiles, learnedProfile, proceedToRatioRefine, finishRound, tasteCheckMode, tasteContext, featuresByFilename]);

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
    if (tasteCheckMode === "ratio") setTasteCheckMode("learning");
    finishRound(ratioRefinePhase.pendingLoadTopPick, null);
  }, [ratioRefinePhase, finishRound, tasteCheckMode]);

  const manualRatioRefine = useCallback(() => {
    if (ratioRefinePhase || tasteCheckPhase) return;
    const pool = allIRs.length >= 2 ? allIRs : [baseIR, ...featureIRs].filter(Boolean) as AnalyzedIR[];
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
  }, [ratioRefinePhase, tasteCheckPhase, allIRs, baseIR, featureIRs, pairingRankings, dismissedPairings, suggestedPairs, pairKey, proceedToRatioRefine]);

  const startDirectRatioRefine = useCallback((baseData: AnalyzedIR, featData: AnalyzedIR) => {
    if (ratioRefinePhase || tasteCheckPhase) return;
    const blended = blendFeatures(baseData.features, featData.features, 0.5, 0.5);
    const match = scoreAgainstAllProfiles(blended, activeProfiles);
    const bq = scoreBlendQuality(blended, activeProfiles);
    const pair: SuggestedPairing = {
      baseFilename: baseData.filename,
      featureFilename: featData.filename,
      blendBands: blended.bandsPercent,
      score: bq.blendScore,
      blendScore: bq.blendScore,
      blendLabel: bq.blendLabel,
      bestMatch: match.best,
      rank: 0,
    };
    const candidates = [{ pair, rank: 2, baseFeatures: baseData.features, featFeatures: featData.features }];
    const init = buildInitialRatioState();
    setRatioRefinePhase({
      stage: "refine",
      candidates,
      selectedIdx: 0,
      step: 0,
      matchups: init.matchups,
      lowIdx: init.lowIdx,
      highIdx: init.highIdx,
      winner: null,
      downgraded: false,
      pendingLoadTopPick: false,
    });
  }, [ratioRefinePhase, tasteCheckPhase, activeProfiles, buildInitialRatioState]);

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
        score: Math.round(scored.best.score),
        profileMatch: scored.best.profile,
        blendRatio: ratio,
      }]);
    }

    setRatioRefinePhase({ ...ratioRefinePhase, stage: "done", winner: ratio, downgraded });
    setTimeout(() => {
      setRatioRefinePhase(null);
      if (tasteCheckMode === "ratio") setTasteCheckMode("learning");
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
        if (pickedSide === "a") recordOutcome(tasteContext, xA, xB, "a", { source: "ratio" });
        else if (pickedSide === "b") recordOutcome(tasteContext, xA, xB, "b", { source: "ratio" });
        else if (pickedSide === "tie") recordOutcome(tasteContext, xA, xB, "tie", { source: "ratio" });
        else if (pickedSide === "both") {
          const pairKey = `${cand.pair?.baseFilename ?? "base"}__${cand.pair?.featureFilename ?? "feat"}__ratio`;
          recordOutcome(tasteContext, xA, xB, "both", { pairKey, source: "ratio" });
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
        const blended = blendFeatures(baseIR.features, feature.features, r.base, r.feature);
        const match = scoreAgainstAllProfiles(blended, activeProfiles);
        return { ratio: r, bands: blended.bandsPercent, bestMatch: match.best };
      });
      const currentBlended = blendFeatures(baseIR.features, feature.features, currentRatio.base, currentRatio.feature);
      const currentMatch = scoreAgainstAllProfiles(currentBlended, activeProfiles);
      return {
        feature,
        currentBlend: currentBlended.bandsPercent,
        currentBlendFeatures: currentBlended,
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
      blendFeats: TonalFeatures;
      match: ReturnType<typeof scoreAgainstAllProfiles>;
    }[] = [];
    for (const a of cabAIRs) {
      for (const b of cabBIRs) {
        const blended = blendFeatures(a.features, b.features, crossCabCurrentRatio.base, crossCabCurrentRatio.feature);
        const match = scoreAgainstAllProfiles(blended, activeProfiles);
        results.push({ irA: a, irB: b, blend: blended.bandsPercent, blendFeats: blended, match });
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

  const explainPairVsAnchor = (pair: any, anchor: any, meanVec: number[] | null): string[] => {
    if (!tasteEnabled) return [];
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

  const TasteControlBar = (
    <div className="flex items-center gap-2 text-xs opacity-90 mb-2" data-testid="taste-control-bar">
      <button
        className={cn(
          "px-2 py-1 rounded border",
          tasteEnabled ? "border-green-500" : "border-zinc-600"
        )}
        onClick={() => setTasteEnabled(v => !v)}
        data-testid="button-taste-toggle"
      >
        Learning: {tasteEnabled ? "ON" : "OFF"}
      </button>

      <select
        className="px-2 py-1 rounded border border-zinc-600 bg-transparent text-zinc-200"
        value={tasteIntent}
        onChange={(e) => setTasteIntent(e.target.value as any)}
        data-testid="select-taste-intent"
      >
        <option value="rhythm">Rhythm</option>
        <option value="lead">Lead</option>
        <option value="clean">Clean</option>
      </select>

      <button
        className="px-2 py-1 rounded border border-zinc-600"
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
        Reset
      </button>

      <button
        className="px-3 py-1 rounded border border-zinc-600"
        onClick={() => {
          resetTaste(singleIrTasteContext);
          setTasteVersion(v => v + 1);
          setSingleIrRatings({});
          setSingleIrTags({});
          setSingleIrNotes({});
          setSingleIrPage(0);
        }}
        title="Reset Single-IR learning (separate from blend learning)"
        data-testid="button-taste-reset-single"
      >
        Reset Single
      </button>

      <button
        className="px-3 py-1 rounded border border-zinc-600"
        onClick={() => setSingleIrLearnOpen(true)}
        title="Rate 4 individual IRs (single-IR learning)"
        data-testid="button-single-ir-learning"
      >
        Single IR Learning
      </button>

      <button
        className="px-3 py-1 rounded border border-zinc-600"
        onClick={() => {
          try {
            const raw = localStorage.getItem("irscope.taste.v1") ?? "";
            const safe = raw && raw.trim().length ? raw : JSON.stringify({ version: 2, models: {}, complements: {} });
            const dt = new Date();
            const stamp = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}_${String(dt.getHours()).padStart(2,"0")}${String(dt.getMinutes()).padStart(2,"0")}`;
            const filename = `irscope_taste_${stamp}.json`;

            const blob = new Blob([safe], { type: "application/json" });

            const navAny: any = navigator as any;
            if (navAny?.canShare && navAny.canShare({ files: [new File([blob], filename, { type: "application/json" })] }) && navAny?.share) {
              navAny.share({ files: [new File([blob], filename, { type: "application/json" })], title: filename });
              return;
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.rel = "noopener";
            document.body.appendChild(a);
            a.click();
            a.remove();

            setTimeout(() => {
              try { window.open(url, "_blank", "noopener,noreferrer"); } catch {}
              setTimeout(() => URL.revokeObjectURL(url), 15_000);
            }, 250);
          } catch {}
        }}
        title="Download a JSON backup of your taste models"
        data-testid="button-taste-export"
      >
        Export
      </button>

      <button
        className="px-3 py-1 rounded border border-zinc-600"
        onClick={() => importTasteInputRef.current?.click()}
        title="Restore taste models from a JSON backup"
        data-testid="button-taste-import"
      >
        Import
      </button>

      <input
        ref={importTasteInputRef}
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={async (e) => {
          try {
            const file = e.target.files?.[0];
            if (!file) return;
            const text = await file.text();
            const parsed = JSON.parse(text);

            const version = parsed?.version;
            let migrated: any = null;
            if (version === 2) {
              migrated = parsed;
              if (!migrated.models) migrated.models = {};
              if (!migrated.complements) migrated.complements = {};
            } else if (version === 1) {
              migrated = { version: 2, models: parsed.models ?? {}, complements: {} };
            } else {
              if (parsed?.models) migrated = { version: 2, models: parsed.models ?? {}, complements: parsed.complements ?? {} };
            }
            if (!migrated || typeof migrated !== "object") return;

            localStorage.setItem("irscope.taste.v1", JSON.stringify(migrated));
            setTasteVersion(v => v + 1);
          } catch {
          } finally {
            if (importTasteInputRef.current) importTasteInputRef.current.value = "";
          }
        }}
      />

      <button
        className="px-2 py-1 rounded border border-zinc-600"
        onClick={() => {
          const vecs: number[][] = [];
          for (const p of suggestedPairs.slice(0, 8)) {
            const bF = featuresByFilename.get(p.baseFilename);
            const fF = featuresByFilename.get(p.featureFilename);
            const ratio = p.suggestedRatio?.base ?? 0.5;
            if (bF && fF) vecs.push(featurizeBlend(bF, fF, ratio));
          }
          simulateVotes(tasteContext, vecs, 20);
          setTasteVersion(v => v + 1);
        }}
        data-testid="button-taste-simulate"
      >
        Simulate 20 votes
      </button>

      <button
        className="px-2 py-1 rounded border border-zinc-600"
        onClick={() => {
          const top = suggestedPairs?.[0];
          if (!top) return;
          const bF = featuresByFilename.get(top.baseFilename);
          const fF = featuresByFilename.get(top.featureFilename);
          const ratio = top.suggestedRatio?.base ?? 0.5;
          if (!bF || !fF) return;
          const xA = featurizeBlend(bF, fF, ratio);
          const xB = xA;
          const pairKey = `${top.baseFilename}__${top.featureFilename}`;
          recordOutcome(tasteContext, xA, xB, "both", { pairKey, source: "pick4" });
          setTasteVersion(v => v + 1);
        }}
        title="Mark the top suggestion as 'both useful' (complement) to boost it modestly"
        data-testid="button-taste-both-useful"
      >
        Both useful
      </button>

      <button
        className={cn(
          "px-2 py-1 rounded border",
          debugVisible ? "border-yellow-500" : "border-zinc-600"
        )}
        onClick={() => setDebugVisible(v => !v)}
        data-testid="button-taste-debug-toggle"
      >
        Debug
      </button>

      <div className="ml-2" data-testid="text-taste-context">
        Context:
        <span className="opacity-80 ml-1">
          {tasteContext.speakerPrefix}/{tasteContext.mode}/{tasteContext.intent}
        </span>
        <span className="ml-2 opacity-80">
          Votes: {tasteStatus.nVotes}
        </span>
        <span className="ml-2 opacity-80">
          Conf: {Math.round(tasteStatus.confidence * 100)}%
        </span>
        <span className="ml-3 opacity-70">
          Single Votes: {singleIrTasteStatus.nVotes} (Conf {Math.round(singleIrTasteStatus.confidence * 100)}%)
        </span>
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
              <div className="font-semibold">Single IR Learning (Rate 4)</div>
              <button className="px-2 py-1 rounded border border-zinc-600" onClick={() => setSingleIrLearnOpen(false)} data-testid="button-close-single-ir">
                Close
              </button>
            </div>
            <div className="text-xs opacity-80">
              Context: {singleIrTasteContext.speakerPrefix}/singleIR/{singleIrTasteContext.intent}
            </div>

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
                Page {singleIrPage + 1} / {singleIrTotalPages} (showing {SINGLE_IR_PAGE_SIZE} at a time)
              </span>
            </div>

            {singleIrPageItems.map((ir: any, idx: number) => (
              <div key={ir.filename} className="border rounded p-2" data-testid={`single-ir-card-${idx}`}>
                <div className="text-sm font-medium break-words">{idx + 1}. {ir.filename}</div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {(["love","like","meh","nope"] as const).map((r) => (
                    <button
                      key={r}
                      className={cn(
                        "px-2 py-1 rounded border text-xs",
                        singleIrRatings[ir.filename] === r ? "border-green-500" : "border-zinc-600"
                      )}
                      onClick={() => setSingleIrRatings(prev => ({ ...prev, [ir.filename]: r }))}
                      data-testid={`button-single-ir-${r}-${idx}`}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="mt-2 text-xs opacity-80">Tags:</div>
                <div className="flex gap-2 flex-wrap mt-1">
                  {ISSUE_TAGS.map(tag => (
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
            ))}

            <div className="flex gap-2">
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
                      return { action, strength: strengthOf(action), x: featurizeSingleIR(ir.features) };
                    }).filter(Boolean) as { action: string; strength: number; x: number[] }[];

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
                          } else {
                            const lr = 0.06 * Math.min(2, Math.abs(diff));
                            if (diff > 0) recordOutcome(singleIrTasteContext, a.xc, b.xc, "a", { lr, source: "learning" });
                            else recordOutcome(singleIrTasteContext, b.xc, a.xc, "a", { lr, source: "learning" });
                          }
                        }
                      }
                      setTasteVersion(v => v + 1);
                    }
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
            </div>
            <div className="text-xs opacity-70">
              Notes: Single-IR ratings train only the singleIR model. Tags/notes are stored; notes do NOT train.
            </div>
          </div>
        )}

        {debugVisible && suggestedPairsDebug.length > 0 && (
          <div className="mt-3 text-xs border rounded p-2 opacity-90 max-h-80 overflow-auto" data-testid="taste-debug-panel">
            <div className="font-semibold mb-2">Taste Debug (Top 20)</div>
            <div className="space-y-2">
              {suggestedPairsDebug.slice(0, 20).map((p: any, i: number) => (
                <div key={i} className="border-b border-zinc-700 pb-1">
                  <div className="opacity-70">
                    {i + 1}.
                  </div>
                  <div className="break-words opacity-90">
                    {p.baseFilename} + {p.featureFilename}
                  </div>
                  <div className="flex gap-4 opacity-80">
                    <div>base: {p.baseScore.toFixed(1)}</div>
                    <div>taste: {p.tasteBoost.toFixed(1)}</div>
                    <div>total: {p.totalScore.toFixed(1)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                <Blend className="w-5 h-5 text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">IR Mixer</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
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
                      toast({ title: "Load IRs first", description: "Drop your IR files in the Foundation Finder below to get started." });
                      setTimeout(() => foundationRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
                    } else if (suggestedPairs.length > 0 && !ratioRefinePhase) {
                      const pool = allIRs.length >= 2 ? allIRs : [baseIR, ...featureIRs].filter(Boolean) as AnalyzedIR[];
                      const candidates = suggestedPairs.map((pair) => {
                        const baseData = pool.find((ir) => ir.filename === pair.baseFilename);
                        const featData = pool.find((ir) => ir.filename === pair.featureFilename);
                        return baseData && featData
                          ? { pair, rank: 2, baseFeatures: baseData.features, featFeatures: featData.features }
                          : null;
                      }).filter(Boolean) as { pair: SuggestedPairing; rank: number; baseFeatures: TonalFeatures; featFeatures: TonalFeatures }[];
                      if (candidates.length > 0) {
                        proceedToRatioRefine(candidates, false);
                      }
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
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            {tasteCheckMode === "ratio"
              ? hasPairingPool
                ? "Ratio mode active — pick a pairing to start refining blend ratios directly. No taste checks."
                : "Ratio mode — drop your IRs in the Foundation Finder below to get started."
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
          />
        )}

        <div ref={foundationRef} className="mb-8 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
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
                            <ShotIntentBadge filename={fr.filename} />
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

        {allIRs.length >= 1 && (
          <TestAIPanel allIRs={allIRs} />
        )}

        {allIRs.length >= 2 && (
          <FindTonePanel allIRs={allIRs} />
        )}

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
                          <ShotIntentBadge filename={cr.irA.filename} />
                          <span className="text-[10px] text-muted-foreground shrink-0">+</span>
                          <span className="text-xs font-mono text-teal-400 truncate">
                            {cr.irB.filename.replace(/(_\d{13})?\.wav$/, "")}
                          </span>
                          <ShotIntentBadge filename={cr.irB.filename} />
                          <BlendQualityBadge score={Math.round((cr.match.results.reduce((s: number, r: MatchResult) => s + r.score, 0)) / cr.match.results.length)} label={(() => { const avg = Math.round((cr.match.results.reduce((s: number, r: MatchResult) => s + r.score, 0)) / cr.match.results.length); return avg >= 80 ? "strong" as const : avg >= 60 ? "close" as const : avg >= 40 ? "partial" as const : "miss" as const; })()} />
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
                                  <BandChart bands={cr.irA.bands} features={cr.irA.features} height={12} compact showScores profiles={activeProfiles} />
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-[10px] text-teal-400 uppercase tracking-wider text-center font-semibold">
                                    Blend ({crossCabCurrentRatio.label})
                                  </p>
                                  <BandChart bands={cr.blend} features={cr.blendFeats} height={12} compact showScores profiles={activeProfiles} />
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">Cab B</p>
                                  <BandChart bands={cr.irB.bands} features={cr.irB.features} height={12} compact showScores profiles={activeProfiles} />
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
                                    const rbBlended = blendFeatures(cr.irA.features, cr.irB.features, ratio.base, ratio.feature);
                                    const rb = rbBlended.bandsPercent;
                                    const rbMatch = scoreAgainstAllProfiles(rbBlended, activeProfiles);
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
                                          {(() => {
                                            const avg = Math.round(rbMatch.results.reduce((s: number, r: MatchResult) => s + r.score, 0) / rbMatch.results.length);
                                            const lbl = avg >= 80 ? "strong" : avg >= 60 ? "close" : avg >= 40 ? "partial" : "miss";
                                            return (
                                              <span className={cn(
                                                "text-[9px] font-mono px-1 py-0.5 rounded",
                                                lbl === "strong" ? "bg-emerald-500/20 text-emerald-400" :
                                                lbl === "close" ? "bg-sky-500/20 text-sky-400" :
                                                lbl === "partial" ? "bg-amber-500/20 text-amber-400" :
                                                "bg-white/5 text-muted-foreground"
                                              )}>
                                                {avg >= 80 ? "Great" : avg >= 60 ? "Good" : avg >= 40 ? "OK" : "Weak"} {avg}
                                              </span>
                                            );
                                          })()}
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
                                    <textarea
                                      rows={2}
                                      placeholder={crossCabRankings[blendKey] === 1 ? "What makes it great..." : crossCabRankings[blendKey] === 2 ? "What would make it better..." : "Describe the issue..."}
                                      value={crossCabFeedbackText[blendKey] || ""}
                                      onChange={(e) => setCrossCabFeedbackText((prev) => ({ ...prev, [blendKey]: e.target.value }))}
                                      className="w-full text-[10px] bg-background border border-border/40 rounded-sm px-2 py-1 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring leading-snug resize-y whitespace-pre-wrap break-words"
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
              {totalRoundsCompleted > 0 && (
                <span className="text-[10px] text-muted-foreground font-mono" data-testid="text-cumulative-signals">
                  {cumulativeSignals.liked} rated / {cumulativeSignals.noped} noped so far
                </span>
              )}
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
                        <ShotIntentBadge filename={pair.baseFilename} />
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
                        <ShotIntentBadge filename={pair.featureFilename} />
                      </div>
                      {tasteEnabled && tasteStatus.nVotes > 0 && (() => {
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
                    {(() => {
                      const isGuidedRound = tasteCheckBinary && tasteCheckPhase.round % 2 === 1;
                      const isOpenRound = tasteCheckBinary && !isGuidedRound;
                      return (
                        <>
                    <p className="text-xs text-muted-foreground">
                      {!tasteCheckBinary
                        ? "Listen to each blend and pick the one that sounds best to you."
                        : isGuidedRound
                        ? `Focus on ${tasteCheckPhase.axisName.toLowerCase()}: does "${tasteCheckPhase.axisLabels[0].toLowerCase()}" or "${tasteCheckPhase.axisLabels[1].toLowerCase()}" sound better to you?`
                        : "Just go with your gut — pick whichever blend you prefer."}
                    </p>
                    <div className={cn(
                      "grid gap-3",
                      !tasteCheckBinary && tasteCheckDisplayCandidates.length > 2 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"
                    )}>
                      {tasteCheckDisplayCandidates.map((pair, idx) => {
                        const hiMidMidRatio = pair.blendBands.mid > 0
                          ? Math.round((pair.blendBands.highMid / pair.blendBands.mid) * 100) / 100
                          : 0;
                        const axisLabel = isGuidedRound
                          ? (idx === 0 ? `"${tasteCheckPhase.axisLabels[0]}"` : `"${tasteCheckPhase.axisLabels[1]}"`)
                          : null;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleTasteCheckPick(idx)}
                            className="p-3 rounded-lg border border-white/10 hover-elevate transition-all text-left space-y-2"
                            data-testid={`button-taste-option-${idx}`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <p className="text-xs font-semibold text-foreground uppercase tracking-widest">
                                {!tasteCheckBinary && tasteCheckDisplayCandidates.length > 2
                                  ? String.fromCharCode(65 + idx)
                                  : idx === 0 ? "A" : "B"}
                              </p>
                              {axisLabel && (
                                <span className={cn(
                                  "text-[10px] font-medium px-1.5 py-0.5 rounded",
                                  idx === 0 ? "bg-blue-500/15 text-blue-400" : "bg-amber-500/15 text-amber-400"
                                )}>
                                  {axisLabel}
                                </span>
                              )}
                            </div>
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
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { handleTasteCheckTie(); handleTasteCheckPick(-1); }}
                        className="flex-1 text-center py-1.5 text-[11px] text-muted-foreground hover-elevate rounded-md transition-colors"
                        data-testid="button-taste-tie"
                      >
                        No preference / Tie
                      </button>
                      <button
                        onClick={() => { handleTasteCheckBothUseful(); handleTasteCheckPick(-1); }}
                        className="flex-1 text-center py-1.5 text-[11px] text-teal-400/80 hover-elevate rounded-md transition-colors"
                        data-testid="button-taste-both-useful"
                      >
                        Both useful
                      </button>
                    </div>
                        </>
                      );
                    })()}
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
                          const bands = blendFeatures(cand.baseFeatures, cand.featFeatures, r, 1 - r).bandsPercent;
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

        {(allIRs.length > 0 || baseIR || featureIRs.length > 0) && (
          <div className="flex items-center gap-2 mb-4" data-testid="view-mode-toggle">
            <span className="text-xs text-muted-foreground">View:</span>
            <Button
              size="sm"
              variant={viewMode === "blend" ? "default" : "ghost"}
              onClick={() => setViewMode("blend")}
              className="text-xs toggle-elevate"
              data-testid="button-view-blend"
            >
              <Layers className="w-3 h-3 mr-1" />
              Blends
            </Button>
            <Button
              size="sm"
              variant={viewMode === "individual" ? "default" : "ghost"}
              onClick={() => setViewMode("individual")}
              className="text-xs toggle-elevate"
              data-testid="button-view-individual"
            >
              <Target className="w-3 h-3 mr-1" />
              Individual IRs
            </Button>
          </div>
        )}

        {viewMode === "individual" && (() => {
          const pool = allIRs.length > 0 ? allIRs : [baseIR, ...featureIRs].filter(Boolean) as AnalyzedIR[];
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
                  const tilt = ir.features.tiltDbPerOct ?? 0;
                  const smooth = ir.features.smoothScore ?? 0;
                  const centroid = ir.metrics.spectralCentroid ?? 0;
                  const bodyVal = (ir.bands.lowMid ?? 0) + (ir.bands.bass ?? 0) * 0.5;
                  const biteVal = (ir.bands.highMid ?? 0) + (ir.bands.presence ?? 0) * 0.6;
                  let roleSuggestion: string;
                  if (bodyVal > 25 && tilt < -0.5) roleSuggestion = "Foundation / Body";
                  else if (biteVal > 15 && tilt > 0.5) roleSuggestion = "Feature / Cut layer";
                  else if (smooth > 75 && Math.abs(tilt) < 1) roleSuggestion = "Texture / Ambient";
                  else if (biteVal > 20) roleSuggestion = "Lead / Bite";
                  else roleSuggestion = "Versatile";

                  return (
                    <div key={ir.filename} className={cn(
                      "p-3 rounded-xl border",
                      match.best.label === "strong" ? "bg-emerald-500/[0.03] border-emerald-500/20" :
                      match.best.label === "close" ? "bg-sky-500/[0.03] border-sky-500/20" :
                      "bg-white/[0.02] border-white/5"
                    )} data-testid={`individual-ir-${idx}`}>
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                          <span className="text-xs font-mono text-foreground truncate">
                            {ir.filename.replace(/(_\d{13})?\.wav$/, "")}
                          </span>
                          <ShotIntentBadge filename={ir.filename} />
                          {match.results.map((r) => (
                            <MatchBadge key={r.profile} match={r} />
                          ))}
                          <span className={cn(
                            "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                            roleSuggestion.includes("Foundation") ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                            roleSuggestion.includes("Feature") ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" :
                            roleSuggestion.includes("Lead") ? "bg-red-500/10 text-red-400 border-red-500/20" :
                            roleSuggestion.includes("Texture") ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                            "bg-white/5 text-muted-foreground border-white/10"
                          )} data-testid={`badge-role-suggestion-${idx}`}>
                            {roleSuggestion}
                          </span>
                        </div>
                      </div>
                      <TonalReadouts features={ir.features} centroid={centroid} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {viewMode === "blend" && (<>
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
                  <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                    <span className="text-sm font-mono text-indigo-400 truncate" data-testid="text-base-filename">
                      {baseIR.filename.replace(/(_\d{13})?\.wav$/, "")}
                    </span>
                    <ShotIntentBadge filename={baseIR.filename} />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { setBaseIR(null); resetPairingState(); }}
                    data-testid="button-remove-base"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <BandChart bands={baseIR.bands} features={baseIR.features} showScores profiles={activeProfiles} centroid={baseIR.metrics.spectralCentroid} />
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
                        <ShotIntentBadge filename={bp.filename} />
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
                  const { best } = scoreAgainstAllProfiles(ir.features, activeProfiles);
                  return (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/5 border border-white/5">
                      <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground truncate" data-testid={`text-feature-filename-${idx}`}>
                          {ir.filename.replace(/(_\d{13})?\.wav$/, "")}
                        </span>
                        <ShotIntentBadge filename={ir.filename} />
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
                          <ShotIntentBadge filename={result.feature.filename} />
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {currentRatio.label}
                          </span>
                          {(() => {
                            const bq = scoreBlendQuality(result.currentBlendFeatures, activeProfiles);
                            return <BlendQualityBadge score={bq.blendScore} label={bq.blendLabel} />;
                          })()}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="hidden sm:flex items-center gap-1.5">
                            {(() => {
                              const t = result.currentBlendFeatures?.tiltDbPerOct ?? 0;
                              const s = result.currentBlendFeatures?.smoothScore ?? 0;
                              return (
                                <>
                                  <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded",
                                    t > 0.5 ? "bg-amber-500/10 text-amber-400" : t < -0.5 ? "bg-blue-500/10 text-blue-400" : "bg-white/5 text-muted-foreground"
                                  )}>
                                    {t > 0 ? "+" : ""}{t.toFixed(1)}dB
                                  </span>
                                  <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded",
                                    s >= 70 ? "bg-emerald-500/10 text-emerald-400" : s >= 50 ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"
                                  )}>
                                    S:{Math.round(s)}
                                  </span>
                                </>
                              );
                            })()}
                            <span className={cn(
                              "text-[10px] font-mono px-1.5 py-0.5 rounded",
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
                                  <BandChart bands={baseIR.bands} features={baseIR.features} height={14} compact showScores profiles={activeProfiles} />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] text-indigo-400 uppercase tracking-wider text-center font-semibold" data-testid="text-label-blend">
                                    Blend ({currentRatio.label})
                                  </p>
                                  <BandChart bands={result.currentBlend} features={result.currentBlendFeatures} height={14} compact showScores profiles={activeProfiles} />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center" data-testid="text-label-feature">Feature</p>
                                  <BandChart bands={result.feature.bands} features={result.feature.features} height={14} compact showScores profiles={activeProfiles} />
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
                                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">All Ratios</p>
                                  {!ratioRefinePhase && baseIR && (
                                    <button
                                      onClick={() => startDirectRatioRefine(baseIR, result.feature)}
                                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md border border-sky-500/30 bg-sky-500/5 text-sky-400 hover-elevate transition-colors"
                                      data-testid={`button-refine-ratio-blend-${idx}`}
                                    >
                                      <ArrowLeftRight className="w-3 h-3" />
                                      A/B Refine
                                    </button>
                                  )}
                                </div>
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
                          <p className="text-sm font-mono text-foreground text-center">
                            {Math.round(r * 100)}/{Math.round((1 - r) * 100)}
                          </p>
                          <BandChart bands={bands} height={10} compact />
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

        </>)}

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
