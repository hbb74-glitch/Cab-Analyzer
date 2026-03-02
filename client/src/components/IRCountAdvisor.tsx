import { useMemo } from "react";
import { analyzeIRCount } from "@/lib/ir-count-advisor";
import { AlertTriangle, CheckCircle, TrendingDown, Layers } from "lucide-react";
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
  compact?: boolean;
}

const verdictConfig = {
  "too-few": { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Need more" },
  "sweet-spot": { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Sweet spot" },
  "diminishing": { icon: TrendingDown, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "Diminishing returns" },
  "redundant": { icon: Layers, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", label: "Redundancies detected" },
};

export function IRCountAdvisor({ irs, compact = false }: IRCountAdvisorProps) {
  const advice = useMemo(() => analyzeIRCount(irs), [irs]);
  const config = verdictConfig[advice.verdict];
  const Icon = config.icon;

  if (advice.loaded === 0) return null;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs", config.bg, config.border)} data-testid="ir-count-advisor-compact">
        <Icon className={cn("w-3.5 h-3.5 shrink-0", config.color)} />
        <span className="text-muted-foreground">
          <span className={cn("font-semibold", config.color)}>{advice.loaded}</span> loaded
          {" · "}
          <span className="font-medium text-foreground">{advice.minUseful}–{advice.maxUseful}</span> useful
          {advice.redundantCount > 0 && (
            <span className="text-orange-400/80"> · {advice.redundantCount} redundant</span>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border p-3 space-y-2", config.bg, config.border)} data-testid="ir-count-advisor">
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4", config.color)} />
        <span className={cn("text-xs font-semibold", config.color)}>{config.label}</span>
        <span className="text-xs text-muted-foreground ml-auto font-mono">{advice.loaded} loaded · {advice.minUseful}–{advice.maxUseful} useful</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-ir-count-reasoning">{advice.reasoning}</p>
      {advice.redundantCount > 0 && advice.verdict !== "redundant" && (
        <p className="text-[10px] text-orange-400/70">{advice.redundantCount} IR{advice.redundantCount > 1 ? "s are" : " is"} spectrally near-identical to others</p>
      )}
    </div>
  );
}
