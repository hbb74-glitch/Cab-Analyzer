import { cn } from "@/lib/utils";
import { roleBadgeClass, classifyMusicalRole, computeSpeakerStats, inferSpeakerIdFromFilename, type SpeakerStats, type MusicalRole } from "@/lib/musical-roles";
import type { TonalFeatures } from "@/lib/tonal-engine";

export function MusicalRoleBadge({ role, className }: { role: string; className?: string }) {
  if (!role) return null;
  return (
    <span
      className={cn("px-1.5 py-0.5 text-[10px] font-mono rounded shrink-0", roleBadgeClass(role), className)}
      data-testid="badge-musical-role"
    >
      {role}
    </span>
  );
}

export function MusicalRoleBadgeFromFeatures({
  filename,
  features,
  speakerStatsMap,
  className,
}: {
  filename: string;
  features?: TonalFeatures;
  speakerStatsMap?: Map<string, SpeakerStats>;
  className?: string;
}) {
  if (!features) return null;
  const spk = inferSpeakerIdFromFilename(filename);
  const st = speakerStatsMap?.get(spk);
  const role = classifyMusicalRole(features, st);
  return <MusicalRoleBadge role={role} className={className} />;
}

export { computeSpeakerStats, inferSpeakerIdFromFilename };
export type { SpeakerStats, MusicalRole };
