import { useMemo, useState } from "react";
import { analyzeIRCount, type IntentKey, type BestPair, type ScoreStep } from "@/lib/ir-count-advisor";
import { AlertTriangle, CheckCircle, ChevronRight, Combine, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type BandsPercent = {
  subBass: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  presence: number;
};

interface IRCountAdvisorProps {
  irs: { filename: string; bandsPercent: BandsPercent }[];
  intent?: IntentKey;
  compact?: boolean;
  superblendBands?: BandsPercent;
}

const verdictConfig = {
  "too-few": { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  "sweet-spot": { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  "more-than-enough": { icon: ChevronRight, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

function barColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

function improvementColor(imp: number): string {
  if (imp >= 3) return "text-emerald-400";
  if (imp >= 1) return "text-amber-400";
  return "text-zinc-500";
}

function stripExt(name: string): string {
  return name.replace(/\.wav$/i, "");
}

function BestPairLine({ pair }: { pair: BestPair }) {
  return (
    <div className="text-xs text-muted-foreground space-y-0.5" data-testid="best-pair-line">
      <div className="flex items-center gap-1.5">
        <Combine className="w-3 h-3 text-violet-400 shrink-0" />
        <span>Closest 2-IR match</span>
        <span className={cn("font-semibold ml-auto shrink-0", scoreColor(pair.score))}>{pair.score}%</span>
      </div>
      <div className="pl-[18px] text-[11px] leading-tight">
        <span className="font-medium text-foreground break-all">{stripExt(pair.ir1)}</span>
        <span className="text-muted-foreground mx-1">+</span>
        <span className="font-medium text-foreground break-all">{stripExt(pair.ir2)}</span>
      </div>
    </div>
  );
}

function DiminishingReturnsCurve({ curve, minForTarget, maxUseful }: { curve: ScoreStep[]; minForTarget: number; maxUseful: number }) {
  if (curve.length < 2) return null;

  const stepsFrom3 = curve.filter(s => s.count >= 3);
  if (stepsFrom3.length === 0) return null;

  const maxScore = Math.max(...curve.map(s => s.score));
  const minScore = Math.min(...stepsFrom3.map(s => s.score));
  const range = Math.max(maxScore - minScore, 1);

  return (
    <div className="space-y-1" data-testid="diminishing-returns-curve">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Diminishing Returns</div>
      <div className="space-y-0.5">
        {stepsFrom3.map((step) => {
          const barWidth = Math.max(8, ((step.score - minScore) / range) * 100);
          const inSweet = step.count >= minForTarget && step.count <= maxUseful;

          return (
            <div key={step.count} className="flex items-center gap-1.5 group" data-testid={`curve-step-${step.count}`}>
              <span className={cn(
                "text-[10px] font-mono w-[14px] text-right shrink-0",
                inSweet ? "text-foreground font-semibold" : "text-muted-foreground"
              )}>
                {step.count}
              </span>

              <div className="flex-1 h-[14px] rounded-sm overflow-hidden bg-zinc-800/50 relative">
                <div
                  className={cn(
                    "h-full rounded-sm transition-all",
                    inSweet ? barColor(step.score) : "bg-zinc-600",
                    inSweet ? "opacity-80" : "opacity-40"
                  )}
                  style={{ width: `${barWidth}%` }}
                />
                <span className={cn(
                  "absolute right-1 top-0 h-full flex items-center text-[9px] font-mono font-semibold",
                  scoreColor(step.score)
                )}>
                  {step.score}%
                </span>
              </div>

              <span className={cn(
                "text-[9px] font-mono w-[32px] text-right shrink-0",
                step.count === stepsFrom3[0].count ? "text-zinc-600" : improvementColor(step.improvement)
              )}>
                {step.count === stepsFrom3[0].count ? "" : `+${step.improvement.toFixed(1)}`}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-zinc-500 px-0.5">
        <span>IR count</span>
        <span>gain</span>
      </div>
    </div>
  );
}

export function IRCountAdvisor({ irs, intent = "versatile", compact = false, superblendBands }: IRCountAdvisorProps) {
  const advice = useMemo(() => analyzeIRCount(irs, intent, superblendBands), [irs, intent, superblendBands]);
  const config = verdictConfig[advice.verdict];
  const Icon = config.icon;
  const [expanded, setExpanded] = useState(false);

  if (advice.loaded === 0) return null;

  const hasCurve = advice.curve.length >= 3;

  if (compact) {
    return (
      <div className={cn("px-2.5 py-1.5 rounded-lg border text-xs space-y-1.5", config.bg, config.border)} data-testid="ir-count-advisor-compact">
        <div
          className={cn("flex items-center gap-2", hasCurve && "cursor-pointer")}
          onClick={() => hasCurve && setExpanded(!expanded)}
          data-testid="button-toggle-curve"
        >
          <Icon className={cn("w-3.5 h-3.5 shrink-0", config.color)} />
          <span className="text-muted-foreground">
            <span className={cn("font-semibold", config.color)}>{advice.loaded}</span> loaded
            {" · "}
            use <span className="font-medium text-foreground">{advice.minForTarget}–{advice.maxUseful}</span> for best tone
            {" · "}
            <span className={cn("font-semibold", scoreColor(advice.bestScore))}>{advice.bestScore}%</span> match
          </span>
          {hasCurve && (
            expanded
              ? <ChevronUp className="w-3 h-3 text-muted-foreground shrink-0 ml-auto" />
              : <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 ml-auto" />
          )}
        </div>
        {advice.bestPair && <BestPairLine pair={advice.bestPair} />}
        {expanded && hasCurve && (
          <DiminishingReturnsCurve curve={advice.curve} minForTarget={advice.minForTarget} maxUseful={advice.maxUseful} />
        )}
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border p-3 space-y-2", config.bg, config.border)} data-testid="ir-count-advisor">
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4", config.color)} />
        <span className={cn("text-xs font-semibold", config.color)}>
          {advice.minForTarget}–{advice.maxUseful} IRs for best tone
        </span>
        <span className={cn("text-xs font-mono ml-auto font-semibold", scoreColor(advice.bestScore))}>{advice.bestScore}% match</span>
      </div>
      {hasCurve && (
        <DiminishingReturnsCurve curve={advice.curve} minForTarget={advice.minForTarget} maxUseful={advice.maxUseful} />
      )}
      {advice.bestPair && <BestPairLine pair={advice.bestPair} />}
      <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-ir-count-reasoning">{advice.reasoning}</p>
    </div>
  );
}
