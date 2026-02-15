import { CheckCircle2, XCircle, Activity, Info, Target, Pencil, Layers, Zap, AlertTriangle, ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { scoreAgainstAllProfiles, scoreWithAvoidPenalty, scoreIndividualIR, getGearContext, parseGearFromFilename, inferShotIntentFromFilename, type TonalBands, type MatchResult, type PreferenceProfile } from "@/lib/preference-profiles";
import { TonalDashboard } from "./TonalDashboard";

interface BestPosition {
  position: string;
  reason: string;
}

interface RenameSuggestion {
  suggestedModifier: string;
  reason: string;
}

interface SpectralDeviation {
  expectedMin: number;
  expectedMax: number;
  actual: number;
  deviationHz: number;
  deviationPercent: number;
  direction: 'bright' | 'dark' | 'normal';
  isWithinRange: boolean;
}

interface TonalBalance {
  subBassPercent?: number;
  bassPercent?: number;
  lowMidPercent?: number;
  midPercent?: number;
  highMidPercent?: number;
  presencePercent?: number;
  ultraHighPercent?: number;
  highMidMidRatio?: number;
}

interface TonalMetrics {
  spectralTilt?: number | null;
  rolloffFreq?: number | null;
  smoothScore?: number | null;
  maxNotchDepth?: number | null;
  notchCount?: number | null;
  spectralCentroid?: number | null;
  tailLevelDb?: number | null;
  tailStatus?: string | null;
  logBandEnergies?: number[] | null;
}

interface ResultCardProps {
  score: number;
  isPerfect: boolean;
  advice: string;
  metrics: {
    peak: number;
    duration: number;
    centroid: number;
    smoothness?: number;
    noiseFloor?: number;
  };
  tonalMetrics?: TonalMetrics | null;
  micLabel?: string;
  bestPositions?: BestPosition[];
  renameSuggestion?: RenameSuggestion | null;
  filename?: string;
  spectralDeviation?: SpectralDeviation | null;
  tonalBalance?: TonalBalance | null;
  activeProfiles?: PreferenceProfile[];
  learnedProfile?: LearnedProfileData | null;
}

interface LearnedProfileData {
  signalCount: number;
  likedCount: number;
  nopedCount: number;
  learnedAdjustments: {
    mid: { shift: number; confidence: number };
    highMid: { shift: number; confidence: number };
    presence: { shift: number; confidence: number };
    ratio: { shift: number; confidence: number };
  } | null;
  perProfileAdjustments?: Record<string, {
    mid: { shift: number; confidence: number };
    highMid: { shift: number; confidence: number };
    presence: { shift: number; confidence: number };
    ratio: { shift: number; confidence: number };
  }> | null;
  avoidZones: { band: string; direction: string; threshold: number }[];
  status: "no_data" | "learning" | "confident" | "mastered";
  courseCorrections: string[];
  gearInsights?: import("@/lib/preference-profiles").GearInsights | null;
}

function ProfileMatchBadge({ match }: { match: MatchResult }) {
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
    <span className={cn("inline-flex items-center gap-1 text-xs font-mono px-2 py-1 rounded border", colorMap[match.label])} data-testid={`badge-profile-${match.profile.toLowerCase()}`}>
      <Icon className="w-3 h-3" />
      {match.profile} {match.score}
    </span>
  );
}

function ProfileMatchSection({ tonalBalance, activeProfiles, learnedProfile, filename }: { tonalBalance: TonalBalance; activeProfiles?: PreferenceProfile[]; learnedProfile?: LearnedProfileData | null; filename?: string }) {
  if (tonalBalance.midPercent == null || tonalBalance.highMidPercent == null || tonalBalance.presencePercent == null) return null;
  const bands: TonalBands = {
    subBass: tonalBalance.subBassPercent || 0,
    bass: tonalBalance.bassPercent || 0,
    lowMid: tonalBalance.lowMidPercent || 0,
    mid: tonalBalance.midPercent,
    highMid: tonalBalance.highMidPercent,
    presence: tonalBalance.presencePercent,
  };
  const total = bands.subBass + bands.bass + bands.lowMid + bands.mid + bands.highMid + bands.presence;
  if (total === 0) return null;
  const { results, best } = learnedProfile && activeProfiles
    ? scoreWithAvoidPenalty(bands, activeProfiles, learnedProfile)
    : activeProfiles
    ? scoreAgainstAllProfiles(bands, activeProfiles)
    : scoreAgainstAllProfiles(bands);

  let role: string | null = null;
  let unlikelyToUse = false;
  let unlikelyReason: string | null = null;
  const avoidHits: string[] = [];
  let pairingGuidance: string | null = null;

  if (learnedProfile && learnedProfile.status !== "no_data" && activeProfiles) {
    const { results: indResults } = scoreIndividualIR(bands, activeProfiles, learnedProfile);
    const featured = indResults.find((m) => m.profile === "Featured");
    const body = indResults.find((m) => m.profile === "Body");
    const fScore = featured?.score ?? 0;
    const bScore = body?.score ?? 0;

    const shotIntent = filename ? inferShotIntentFromFilename(filename) : null;
    const intentBonus = shotIntent && shotIntent.confidence > 0 ? Math.round(8 * shotIntent.confidence) : 0;
    const adjustedF = shotIntent?.role === "featured" ? fScore + intentBonus : fScore;
    const adjustedB = shotIntent?.role === "body" ? bScore + intentBonus : bScore;
    const bestScore = Math.max(adjustedF, adjustedB);

    if (bestScore >= 35) {
      role = adjustedF >= adjustedB ? "Feature element" : "Body element";
    }

    const ratio = bands.mid > 0 ? bands.highMid / bands.mid : 0;
    const lowMidPlusMid = bands.lowMid + bands.mid;
    const avoidTypes: string[] = [];
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

    if (bestScore < 15) {
      unlikelyToUse = true;
      unlikelyReason = "Very far from both your preferred tonal profiles — hard to blend toward your target";
    }

    if (avoidTypes.length > 0) {
      const needsLowMid = avoidTypes.includes("muddy") || avoidTypes.includes("mid_heavy");
      const needsHighPresence = avoidTypes.includes("low_presence") || avoidTypes.includes("low_ratio");
      if (needsLowMid && needsHighPresence) {
        pairingGuidance = "Look for bright, articulate IRs — low mids, high presence, strong HiMid/Mid ratio";
      } else if (needsLowMid) {
        pairingGuidance = "Look for lean IRs with less low-mid and mid weight to balance this out";
      } else if (needsHighPresence) {
        pairingGuidance = "Look for IRs with strong presence and high-mid content to add clarity";
      }
    }
  }

  return (
    <div className="mt-3 p-3 rounded-lg bg-white/[0.03] border border-white/5">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-semibold text-indigo-400">Preference Match</span>
      </div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {results.map((r) => (
          <ProfileMatchBadge key={r.profile} match={r} />
        ))}
        {role && (
          <span className={cn(
            "inline-flex items-center gap-1 text-xs font-mono px-2 py-1 rounded border",
            role === "Feature element"
              ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/25"
              : "bg-amber-500/15 text-amber-400 border-amber-500/25"
          )} data-testid={`badge-role-${role === "Feature element" ? "feature" : "body"}`}>
            <Layers className="w-3 h-3" />
            {role}
          </span>
        )}
      </div>
      {unlikelyToUse && unlikelyReason && (
        <div className="flex items-start gap-2 p-2 mb-2 rounded bg-red-500/10 border border-red-500/20" data-testid="warning-unlikely-to-use">
          <ShieldAlert className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-red-400">Unlikely to use</p>
            <p className="text-[11px] text-red-400/70">{unlikelyReason}</p>
          </div>
        </div>
      )}
      {avoidHits.length > 0 && !unlikelyToUse && (
        <div className="p-2.5 mb-2 rounded bg-amber-500/10 border border-amber-500/20 space-y-1.5" data-testid="warning-avoid-zone">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-amber-400/50 mb-0.5">Blend context — pair with a complement</p>
              <p className="text-[11px] text-amber-400/70">{avoidHits.join(" | ")}</p>
            </div>
          </div>
          {pairingGuidance && (
            <p className="text-[11px] text-amber-300/60 pl-5">{pairingGuidance}</p>
          )}
        </div>
      )}
      {best.deviations.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{best.summary}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {best.deviations.map((d, i) => (
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
      {filename && (() => {
        const parsed = parseGearFromFilename(filename);
        const hasParsedGear = !!(parsed.mic || parsed.speaker || parsed.position);
        if (!hasParsedGear) return null;

        if (learnedProfile?.gearInsights) {
          const ctx = getGearContext(filename, learnedProfile.gearInsights, bands);
          if (ctx.items.length > 0) {
            return (
              <div className="mt-2 pt-2 border-t border-white/5" data-testid="gear-context-single">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <Zap className="w-3 h-3 text-violet-400" />
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
          }
        }

        if (!learnedProfile || learnedProfile.status === "no_data") return null;

        const unknownPieces: string[] = [];
        if (parsed.speaker) {
          const known = learnedProfile.gearInsights?.speakers.find((s) => s.name === parsed.speaker);
          if (!known) unknownPieces.push(parsed.speaker);
        }
        if (parsed.mic) {
          const known = learnedProfile.gearInsights?.mics.find((m) => m.name === parsed.mic);
          if (!known) unknownPieces.push(parsed.mic);
        }
        if (parsed.position) {
          const known = learnedProfile.gearInsights?.positions.find((p) => p.name === parsed.position);
          if (!known) unknownPieces.push(parsed.position);
        }
        if (unknownPieces.length === 0) return null;

        return (
          <div className="mt-2 pt-2 border-t border-white/5" data-testid="gear-gap-single">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Sparkles className="w-3 h-3 text-violet-400/70" />
              <span className="text-[9px] text-violet-400/70">
                {unknownPieces.join(", ")} not yet learned — <a href="/mixer" className="underline">rate blends</a> to teach the app
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const POSITION_LABELS: Record<string, string> = {
  "cap": "Cap",
  "cap_offcenter": "Cap_OffCenter",
  "capedge": "CapEdge",
  "capedge_br": "CapEdge_BR",
  "capedge_dk": "CapEdge_DK",
  "capedge_cone_tr": "Cap_Cone_Tr",
  "cone": "Cone",
  // Legacy mappings for backwards compatibility
  "cap-edge": "CapEdge",
  "cap-edge-favor-cap": "CapEdge_BR",
  "cap-edge-favor-cone": "CapEdge_DK",
  "cap-off-center": "Cap_OffCenter",
};

export function ResultCard({ score, isPerfect, advice, metrics, tonalMetrics, micLabel, bestPositions, renameSuggestion, filename, spectralDeviation, tonalBalance, activeProfiles, learnedProfile }: ResultCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-6 md:p-8 space-y-8"
    >
      {filename && (
        <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground border-b border-white/10 pb-4 flex-wrap">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-foreground font-medium">{filename}</span>
          {(() => {
            const intent = inferShotIntentFromFilename(filename);
            if (intent.role === "neutral" || intent.confidence < 0.3) return null;
            const isFeature = intent.role === "featured";
            return (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded border",
                  isFeature
                    ? "bg-orange-500/10 text-orange-400/80 border-orange-500/20"
                    : "bg-sky-500/10 text-sky-400/80 border-sky-500/20"
                )}
                title={intent.reason}
                data-testid="badge-shot-intent"
              >
                {isFeature ? <Target className="w-2.5 h-2.5" /> : <Layers className="w-2.5 h-2.5" />}
                {isFeature ? "Feature intent" : "Body intent"}
              </span>
            );
          })()}
        </div>
      )}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Score Circle */}
        <div className="relative shrink-0 flex items-center justify-center w-32 h-32 md:w-40 md:h-40 mx-auto md:mx-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              className="stroke-muted fill-none stroke-[6px]"
            />
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              className={cn(
                "fill-none stroke-[6px] transition-all duration-1000 ease-out",
                isPerfect ? "stroke-primary" : "stroke-secondary"
              )}
              strokeDasharray="283"
              strokeDashoffset={283 - (283 * score) / 100}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl md:text-4xl font-bold font-mono tracking-tighter">
              {score}
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
              Quality
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 w-full space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Analysis Result</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {isPerfect ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium border border-primary/20">
                    <CheckCircle2 className="w-4 h-4" /> Perfect Capture
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-sm font-medium border border-orange-500/20">
                    <Info className="w-4 h-4" /> Optimization Needed
                  </span>
                )}
                {micLabel && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium border border-blue-500/20">
                    <Activity className="w-4 h-4" /> {micLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <p className="text-muted-foreground leading-relaxed">
              {advice}
            </p>
          </div>
          
          {tonalMetrics && (
            <TonalDashboard
              spectralTilt={tonalMetrics.spectralTilt}
              rolloffFreq={tonalMetrics.rolloffFreq}
              smoothScore={tonalMetrics.smoothScore}
              maxNotchDepth={tonalMetrics.maxNotchDepth}
              notchCount={tonalMetrics.notchCount}
              spectralCentroid={tonalMetrics.spectralCentroid}
              tailLevelDb={tonalMetrics.tailLevelDb}
              tailStatus={tonalMetrics.tailStatus}
              logBandEnergies={tonalMetrics.logBandEnergies}
              subBassPercent={tonalBalance?.subBassPercent}
              bassPercent={tonalBalance?.bassPercent}
              lowMidPercent={tonalBalance?.lowMidPercent}
              midPercent={tonalBalance?.midPercent}
              highMidPercent={tonalBalance?.highMidPercent}
              presencePercent={tonalBalance?.presencePercent}
              ultraHighPercent={tonalBalance?.ultraHighPercent}
            />
          )}
          {!tonalMetrics && (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4 pt-2">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Peak</span>
                <p className={cn("text-lg font-mono font-medium", metrics.peak > -0.5 ? "text-destructive" : "text-foreground")}>
                  {metrics.peak} dB
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Samples</span>
                <p className="text-lg font-mono font-medium text-foreground">
                  {metrics.duration}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Centroid</span>
                <p className="text-lg font-mono font-medium text-foreground">
                  {metrics.centroid} Hz
                </p>
              </div>
              {metrics.smoothness != null && (
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Smoothness</span>
                  <p className={cn(
                    "text-lg font-mono font-medium",
                    metrics.smoothness >= 80 ? "text-emerald-400" :
                    metrics.smoothness >= 60 ? "text-foreground" :
                    metrics.smoothness >= 45 ? "text-amber-400" : "text-red-400"
                  )}>
                    {Math.round(metrics.smoothness)}/100
                  </p>
                </div>
              )}
            </div>
          )}

          {spectralDeviation && (
            <div className={cn(
              "p-4 rounded-xl border",
              spectralDeviation.isWithinRange 
                ? "bg-emerald-500/10 border-emerald-500/20" 
                : spectralDeviation.deviationPercent > 100 
                  ? "bg-red-500/10 border-red-500/20"
                  : "bg-amber-500/10 border-amber-500/20"
            )}>
              <div className="flex items-start gap-3">
                <Target className={cn(
                  "w-5 h-5 mt-0.5 flex-shrink-0",
                  spectralDeviation.isWithinRange 
                    ? "text-emerald-400" 
                    : spectralDeviation.deviationPercent > 100 
                      ? "text-red-400"
                      : "text-amber-400"
                )} />
                <div className="flex-1">
                  <h4 className={cn(
                    "text-sm font-semibold mb-2",
                    spectralDeviation.isWithinRange 
                      ? "text-emerald-400" 
                      : spectralDeviation.deviationPercent > 100 
                        ? "text-red-400"
                        : "text-amber-400"
                  )}>
                    Spectral Centroid Analysis
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block">Expected</span>
                      <span className="font-mono text-foreground">{spectralDeviation.expectedMin}-{spectralDeviation.expectedMax} Hz</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Actual</span>
                      <span className="font-mono text-foreground">{Math.round(spectralDeviation.actual)} Hz</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Deviation</span>
                      <span className={cn(
                        "font-mono font-medium",
                        spectralDeviation.isWithinRange 
                          ? "text-emerald-400" 
                          : spectralDeviation.deviationPercent > 100 
                            ? "text-red-400"
                            : "text-amber-400"
                      )}>
                        {spectralDeviation.isWithinRange 
                          ? "Within range" 
                          : `${spectralDeviation.direction === 'bright' ? '+' : '-'}${Math.round(spectralDeviation.deviationHz)} Hz`}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Status</span>
                      <span className={cn(
                        "font-medium",
                        spectralDeviation.isWithinRange 
                          ? "text-emerald-400" 
                          : spectralDeviation.deviationPercent > 100 
                            ? "text-red-400"
                            : "text-amber-400"
                      )}>
                        {spectralDeviation.isWithinRange 
                          ? "On Target" 
                          : spectralDeviation.deviationPercent > 200
                            ? "Consider reshoot"
                            : spectralDeviation.deviationPercent > 100
                              ? "Review needed"
                              : "Acceptable"}
                      </span>
                    </div>
                  </div>
                  {!spectralDeviation.isWithinRange && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {spectralDeviation.direction === 'bright' 
                        ? `IR is ${Math.round(spectralDeviation.deviationPercent)}% brighter than expected. Try moving mic toward cone or increasing distance.`
                        : `IR is ${Math.round(spectralDeviation.deviationPercent)}% darker than expected. Try moving mic toward cap or decreasing distance.`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6-Band Tonal Balance */}
      {tonalBalance && tonalBalance.midPercent != null && tonalBalance.highMidPercent != null && tonalBalance.presencePercent != null && (
        <div className="space-y-4 pt-4 border-t border-white/10">
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h4 className="text-sm font-semibold text-indigo-400">Tonal Balance</h4>
              {tonalBalance.highMidMidRatio != null && (
                <span className={cn(
                  "ml-auto text-xs font-mono px-2 py-1 rounded",
                  tonalBalance.highMidMidRatio < 1.0 ? "bg-blue-500/20 text-blue-400" :
                  tonalBalance.highMidMidRatio <= 2.0 ? "bg-green-500/20 text-green-400" :
                  "bg-amber-500/20 text-amber-400"
                )}>
                  HiMid/Mid: {tonalBalance.highMidMidRatio.toFixed(2)}
                  {tonalBalance.highMidMidRatio < 1.0 ? " (dark)" : tonalBalance.highMidMidRatio > 2.0 ? " (bright)" : ""}
                </span>
              )}
            </div>
            <div className="grid grid-cols-6 gap-2 text-xs">
              {[
                { label: "SubBass", value: tonalBalance.subBassPercent, color: "bg-purple-500" },
                { label: "Bass", value: tonalBalance.bassPercent, color: "bg-blue-500" },
                { label: "LowMid", value: tonalBalance.lowMidPercent, color: "bg-cyan-500" },
                { label: "Mid", value: tonalBalance.midPercent, color: "bg-green-500" },
                { label: "HiMid", value: tonalBalance.highMidPercent, color: "bg-yellow-500" },
                { label: "Presence", value: tonalBalance.presencePercent, color: "bg-orange-500" },
              ].map((band) => (
                <div key={band.label} className="flex flex-col items-center">
                  <div className="w-full h-20 bg-white/5 rounded overflow-hidden flex flex-col-reverse">
                    <div 
                      className={cn(band.color, "w-full transition-all")}
                      style={{ height: `${Math.min(band.value || 0, 100)}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground mt-1.5 text-[10px]">{band.label}</span>
                  <span className="text-foreground font-mono text-xs">{band.value?.toFixed(1)}%</span>
                </div>
              ))}
            </div>
            <ProfileMatchSection tonalBalance={tonalBalance} activeProfiles={activeProfiles} learnedProfile={learnedProfile} filename={filename} />
          </div>
        </div>
      )}

      {bestPositions && bestPositions.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-white/10">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Best Positions for This Mic + Speaker
          </h4>
          <div className="grid gap-3">
            {bestPositions.map((pos, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                <span className="shrink-0 px-2 py-1 rounded bg-primary/20 text-primary text-xs font-medium border border-primary/20">
                  {POSITION_LABELS[pos.position] || pos.position}
                </span>
                <p className="text-sm text-muted-foreground">{pos.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {renameSuggestion && (
        <div className="space-y-3 pt-4 border-t border-white/10">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <Pencil className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-400 mb-1">
                  Tonal Character Note
                </h4>
                <p className="text-sm text-foreground/80 mb-2">
                  This IR has a <span className="font-medium text-amber-300">{renameSuggestion.suggestedModifier}</span> character compared to typical captures at this position.
                </p>
                <p className="text-xs text-muted-foreground">
                  {renameSuggestion.reason}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
