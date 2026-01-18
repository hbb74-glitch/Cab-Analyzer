import { CheckCircle2, XCircle, Activity, Info, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BestPosition {
  position: string;
  reason: string;
}

interface ResultCardProps {
  score: number;
  isPerfect: boolean;
  advice: string;
  metrics: {
    peak: number;
    duration: number;
    centroid: number;
  };
  bestPositions?: BestPosition[];
}

const POSITION_LABELS: Record<string, string> = {
  "cap": "Cap",
  "cap-edge": "Cap Edge",
  "cap-edge-favor-cap": "Cap Edge (Favor Cap)",
  "cap-edge-favor-cone": "Cap Edge (Favor Cone)",
  "cone": "Cone",
  "cap-off-center": "Cap Off Center",
};

export function ResultCard({ score, isPerfect, advice, metrics, bestPositions }: ResultCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-6 md:p-8 space-y-8"
    >
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
              <div className="flex items-center gap-2">
                {isPerfect ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium border border-primary/20">
                    <CheckCircle2 className="w-4 h-4" /> Perfect Capture
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-sm font-medium border border-orange-500/20">
                    <Info className="w-4 h-4" /> Optimization Needed
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
          
          <div className="grid grid-cols-3 gap-4 pt-2">
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
          </div>
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
    </motion.div>
  );
}
