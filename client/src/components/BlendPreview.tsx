import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Blend, Zap, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { blendFeatures } from "@/lib/tonal-engine";
import {
  type TonalBands,
  type TonalFeatures,
  type MatchResult,
  scoreAgainstAllProfiles,
  scoreBlendQuality,
  type PreferenceProfile,
} from "@/lib/preference-profiles";

export const BLEND_RATIOS = [
  { label: "80/20", base: 0.8, feature: 0.2 },
  { label: "70/30", base: 0.7, feature: 0.3 },
  { label: "60/40", base: 0.6, feature: 0.4 },
  { label: "50/50", base: 0.5, feature: 0.5 },
  { label: "40/60", base: 0.4, feature: 0.6 },
  { label: "30/70", base: 0.3, feature: 0.7 },
  { label: "20/80", base: 0.2, feature: 0.8 },
];

export const BAND_COLORS = [
  { label: "SubBass", key: "subBass" as const, color: "bg-purple-500" },
  { label: "Bass", key: "bass" as const, color: "bg-blue-500" },
  { label: "LowMid", key: "lowMid" as const, color: "bg-cyan-500" },
  { label: "Mid", key: "mid" as const, color: "bg-green-500" },
  { label: "HiMid", key: "highMid" as const, color: "bg-yellow-500" },
  { label: "Presence", key: "presence" as const, color: "bg-orange-500" },
  { label: "Air", key: "air" as const, color: "bg-rose-400" },
];

export function MatchBadge({ match }: { match: MatchResult }) {
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

export function BlendQualityBadge({ score, label }: { score: number; label: MatchResult["label"] }) {
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

function TonalReadouts({ features, centroid }: { features?: TonalFeatures; centroid?: number }) {
  if (!features) return null;
  const tilt = features.tiltDbPerOct ?? 0;
  const smooth = features.smoothScore ?? 0;
  const tiltLabel = tilt >= 2.5 ? "Bright" : tilt > 0.5 ? "Bright lean" : tilt >= -0.5 ? "Neutral" : tilt > -2.5 ? "Dark lean" : "Dark";
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

function ProfileScores({ features: _features, profiles: _profiles }: { features: TonalFeatures; profiles?: PreferenceProfile[] }) {
  return null;
}

export function BandChart({ bands, features, height = 20, compact = false, showScores = false, profiles, centroid }: { bands: TonalBands; features?: TonalFeatures; height?: number; compact?: boolean; showScores?: boolean; profiles?: PreferenceProfile[]; centroid?: number }) {
  const hiMidMidRatio = bands.mid > 0 ? Math.round((bands.highMid / bands.mid) * 100) / 100 : 0;
  return (
    <div className="space-y-1">
      <div className={cn("grid grid-cols-8 gap-1", compact ? "text-[9px]" : "text-xs")}>
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

export interface BlendPreviewIR {
  filename: string;
  features: TonalFeatures;
  bands: TonalBands;
}

export function PairingBlendPreview({
  ir1,
  ir2,
  profiles,
  defaultRatioLabel,
}: {
  ir1: BlendPreviewIR;
  ir2: BlendPreviewIR;
  profiles?: PreferenceProfile[];
  defaultRatioLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState(() => {
    if (defaultRatioLabel) {
      const idx = BLEND_RATIOS.findIndex(r => r.label === defaultRatioLabel);
      if (idx >= 0) return idx;
    }
    return 2;
  });

  const currentRatio = BLEND_RATIOS[selectedRatio];
  const blended = blendFeatures(ir1.features, ir2.features, currentRatio.base, currentRatio.feature);
  const blendedBands = blended.bandsPercent;

  const bq = scoreBlendQuality(blended, profiles);
  const hiMidMidRatio = blendedBands.mid > 0 ? Math.round((blendedBands.highMid / blendedBands.mid) * 100) / 100 : 0;

  const allRatioBlends = BLEND_RATIOS.map((r) => {
    const bf = blendFeatures(ir1.features, ir2.features, r.base, r.feature);
    const match = scoreAgainstAllProfiles(bf, profiles);
    return { ratio: r, bands: bf.bandsPercent, features: bf, bestMatch: match.best };
  });

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full justify-between px-2 py-1.5 rounded-lg hover:bg-white/5"
        data-testid="button-toggle-blend-preview"
      >
        <span className="flex items-center gap-1.5">
          <Blend className="w-3 h-3" />
          Blend Preview
          <BlendQualityBadge score={bq.blendScore} label={bq.blendLabel} />
        </span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-3 pt-2 space-y-4">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-[10px] text-muted-foreground">Ratio:</span>
                {BLEND_RATIOS.map((r, idx) => (
                  <button
                    key={r.label}
                    onClick={() => setSelectedRatio(idx)}
                    className={cn(
                      "font-mono text-[10px] px-2 py-0.5 rounded transition-colors",
                      selectedRatio === idx
                        ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                    data-testid={`button-blend-ratio-${r.label}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">
                    {ir1.filename.replace(/(_\d{13})?\.wav$/i, "")}
                  </p>
                  <BandChart bands={ir1.bands} features={ir1.features} height={14} compact showScores profiles={profiles} />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] text-indigo-400 uppercase tracking-wider text-center font-semibold">
                    Blend ({currentRatio.label})
                  </p>
                  <BandChart bands={blendedBands} features={blended} height={14} compact showScores profiles={profiles} />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">
                    {ir2.filename.replace(/(_\d{13})?\.wav$/i, "")}
                  </p>
                  <BandChart bands={ir2.bands} features={ir2.features} height={14} compact showScores profiles={profiles} />
                </div>
              </div>

              <div className="border-t border-white/5 pt-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">All Ratios</p>
                <div className="grid grid-cols-5 gap-2">
                  {allRatioBlends.map((rb) => {
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

              <div className="flex items-center gap-3 flex-wrap text-[10px]">
                <span className={cn("font-mono px-1.5 py-0.5 rounded",
                  blended.tiltDbPerOct > 0.5 ? "bg-amber-500/10 text-amber-400" : blended.tiltDbPerOct < -0.5 ? "bg-blue-500/10 text-blue-400" : "bg-white/5 text-muted-foreground"
                )}>
                  {blended.tiltDbPerOct > 0 ? "+" : ""}{blended.tiltDbPerOct.toFixed(1)}dB
                </span>
                <span className={cn("font-mono px-1.5 py-0.5 rounded",
                  (blended.smoothScore ?? 0) >= 70 ? "bg-emerald-500/10 text-emerald-400" : (blended.smoothScore ?? 0) >= 50 ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"
                )}>
                  S:{Math.round(blended.smoothScore ?? 0)}
                </span>
                <span className={cn(
                  "font-mono px-1.5 py-0.5 rounded",
                  hiMidMidRatio < 1.0 ? "bg-blue-500/20 text-blue-400" :
                  hiMidMidRatio <= 2.0 ? "bg-green-500/20 text-green-400" :
                  "bg-amber-500/20 text-amber-400"
                )}>
                  HM/M: {hiMidMidRatio.toFixed(2)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
