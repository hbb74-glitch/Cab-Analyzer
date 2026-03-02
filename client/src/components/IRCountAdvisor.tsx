import { useMemo } from "react";
import { analyzeIRCount } from "@/lib/ir-count-advisor";
import { AlertTriangle, CheckCircle, ChevronRight } from "lucide-react";
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
  "too-few": { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Need more IRs" },
  "sweet-spot": { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Every IR counts" },
  "more-than-enough": { icon: ChevronRight, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "Some won't be heard" },
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
          <span className="font-medium text-foreground">{advice.effectiveCount}</span> can audibly shift a blend
          {advice.loaded > advice.effectiveCount && (
            <span className="text-blue-400/80"> · {advice.loaded - advice.effectiveCount} won't change the tone</span>
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
        <span className="text-xs text-muted-foreground ml-auto font-mono">{advice.effectiveCount} of {advice.loaded} shift the blend</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-ir-count-reasoning">{advice.reasoning}</p>
    </div>
  );
}
