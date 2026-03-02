import { useMemo } from "react";
import { analyzeIRCount, type IntentKey, type BestPair } from "@/lib/ir-count-advisor";
import { AlertTriangle, CheckCircle, ChevronRight, Combine } from "lucide-react";
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

function stripExt(name: string): string {
  return name.replace(/\.wav$/i, "");
}

function BestPairLine({ pair }: { pair: BestPair }) {
  return (
    <div className="text-xs text-muted-foreground space-y-0.5" data-testid="best-pair-line">
      <div className="flex items-center gap-1.5">
        <Combine className="w-3 h-3 text-violet-400 shrink-0" />
        <span>Closest 2‑IR match</span>
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

export function IRCountAdvisor({ irs, intent = "versatile", compact = false, superblendBands }: IRCountAdvisorProps) {
  const advice = useMemo(() => analyzeIRCount(irs, intent, superblendBands), [irs, intent, superblendBands]);
  const config = verdictConfig[advice.verdict];
  const Icon = config.icon;

  if (advice.loaded === 0) return null;

  if (compact) {
    return (
      <div className={cn("px-2.5 py-1.5 rounded-lg border text-xs space-y-1", config.bg, config.border)} data-testid="ir-count-advisor-compact">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-3.5 h-3.5 shrink-0", config.color)} />
          <span className="text-muted-foreground">
            <span className={cn("font-semibold", config.color)}>{advice.loaded}</span> loaded
            {" · "}
            use <span className="font-medium text-foreground">{advice.minForTarget}–{advice.maxUseful}</span> for best tone
            {" · "}
            <span className={cn("font-semibold", scoreColor(advice.bestScore))}>{advice.bestScore}%</span> match
          </span>
        </div>
        {advice.bestPair && <BestPairLine pair={advice.bestPair} />}
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
      {advice.bestPair && <BestPairLine pair={advice.bestPair} />}
      <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-ir-count-reasoning">{advice.reasoning}</p>
    </div>
  );
}
