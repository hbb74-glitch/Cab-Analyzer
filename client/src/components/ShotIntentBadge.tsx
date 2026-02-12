import { cn } from "@/lib/utils";
import { Target, Layers } from "lucide-react";
import { inferShotIntentFromFilename, inferShotIntent } from "@/lib/preference-profiles";

export function ShotIntentBadge({ filename }: { filename: string }) {
  const intent = inferShotIntentFromFilename(filename);
  if (intent.role === "neutral" || intent.confidence < 0.3) return null;
  const isFeature = intent.role === "featured";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[9px] font-mono px-1 py-0.5 rounded border",
        isFeature
          ? "bg-orange-500/10 text-orange-400/80 border-orange-500/20"
          : "bg-sky-500/10 text-sky-400/80 border-sky-500/20"
      )}
      title={intent.reason}
      data-testid="badge-shot-intent"
    >
      {isFeature ? <Target className="w-2 h-2" /> : <Layers className="w-2 h-2" />}
      {isFeature ? "Feat" : "Body"}
    </span>
  );
}

export function ShotIntentBadgeFromGear({ mic, position }: { mic?: string; position?: string }) {
  if (!mic && !position) return null;
  const intent = inferShotIntent(mic, position);
  if (intent.role === "neutral" || intent.confidence < 0.3) return null;
  const isFeature = intent.role === "featured";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[9px] font-mono px-1 py-0.5 rounded border",
        isFeature
          ? "bg-orange-500/10 text-orange-400/80 border-orange-500/20"
          : "bg-sky-500/10 text-sky-400/80 border-sky-500/20"
      )}
      title={intent.reason}
      data-testid="badge-shot-intent"
    >
      {isFeature ? <Target className="w-2 h-2" /> : <Layers className="w-2 h-2" />}
      {isFeature ? "Feat" : "Body"}
    </span>
  );
}
