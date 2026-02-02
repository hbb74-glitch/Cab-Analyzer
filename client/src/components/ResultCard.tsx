import { CheckCircle2, XCircle, Activity, Info, Target, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
  micLabel?: string;
  bestPositions?: BestPosition[];
  renameSuggestion?: RenameSuggestion | null;
  filename?: string;
  spectralDeviation?: SpectralDeviation | null;
}

const POSITION_LABELS: Record<string, string> = {
  "cap": "Cap",
  "cap_offcenter": "Cap_OffCenter",
  "capedge": "CapEdge",
  "capedge_br": "CapEdge_BR",
  "capedge_dk": "CapEdge_DK",
  "capedge_cone_tr": "CapEdge_Cone_Tr",
  "cone": "Cone",
  // Legacy mappings for backwards compatibility
  "cap-edge": "CapEdge",
  "cap-edge-favor-cap": "CapEdge_BR",
  "cap-edge-favor-cone": "CapEdge_DK",
  "cap-off-center": "Cap_OffCenter",
};

export function ResultCard({ score, isPerfect, advice, metrics, micLabel, bestPositions, renameSuggestion, filename, spectralDeviation }: ResultCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-6 md:p-8 space-y-8"
    >
      {filename && (
        <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground border-b border-white/10 pb-4">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-foreground font-medium">{filename}</span>
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
            {metrics.noiseFloor != null && (
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Noise Floor</span>
                <p className={cn(
                  "text-lg font-mono font-medium",
                  metrics.noiseFloor <= -60 ? "text-emerald-400" :
                  metrics.noiseFloor <= -45 ? "text-foreground" :
                  metrics.noiseFloor <= -35 ? "text-amber-400" : "text-red-400"
                )}>
                  {metrics.noiseFloor.toFixed(1)} dB
                </p>
              </div>
            )}
          </div>

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
