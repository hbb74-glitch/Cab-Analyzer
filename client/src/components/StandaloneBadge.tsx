import { cn } from "@/lib/utils";
import type { StandaloneWorthyIR } from "@/lib/preference-profiles";

const STANDALONE_STYLES = {
  love: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  like: "bg-teal-500/15 text-teal-300 border-teal-500/25",
};

export function StandaloneBadge({
  filename,
  standaloneWorthy,
  compact,
}: {
  filename: string;
  standaloneWorthy?: StandaloneWorthyIR[];
  compact?: boolean;
}) {
  if (!standaloneWorthy || standaloneWorthy.length === 0) return null;

  const match = standaloneWorthy.find(sw => sw.filename === filename);
  if (!match) return null;

  const style = STANDALONE_STYLES[match.rating];
  const label = match.rating === "love" ? "Solo ★" : "Solo";
  const title = match.rating === "love"
    ? "Rated as excellent standalone IR — works great by itself"
    : "Rated as viable standalone IR — works on its own with minor gaps";

  if (compact) {
    return (
      <span
        className={cn("text-[9px] px-1 py-0 rounded border font-medium", style)}
        title={title}
        data-testid={`badge-standalone-${filename}`}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium inline-flex items-center gap-1", style)}
      title={title}
      data-testid={`badge-standalone-${filename}`}
    >
      {label}
      {match.tags.length > 0 && (
        <span className="opacity-60 text-[9px]">
          ({match.tags.slice(0, 2).map(t => t.replace(/_/g, " ")).join(", ")})
        </span>
      )}
    </span>
  );
}
