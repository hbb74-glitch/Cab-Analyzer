import { cn } from "@/lib/utils";
import { lookupMicRole } from "@shared/knowledge/mic-role-map";

const ROLE_COLORS: Record<string, string> = {
  "Foundation": "bg-emerald-500/15 text-emerald-400",
  "Cut Layer": "bg-cyan-500/15 text-cyan-400",
  "Mid Thickener": "bg-amber-500/15 text-amber-400",
  "Fizz Tamer": "bg-sky-500/15 text-sky-400",
  "Lead Polish": "bg-violet-500/15 text-violet-400",
  "Dark Specialty": "bg-zinc-500/15 text-zinc-300",
};

const INTENT_COLORS: Record<string, string> = {
  "rhythm": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "lead": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "clean": "bg-teal-500/10 text-teal-400 border-teal-500/20",
};

export function extractGearFromFilename(filename: string): { mic?: string; position?: string } {
  const lower = filename.toLowerCase();
  const mics: Record<string, string> = {
    'sm57': 'SM57', 'sm7b': 'SM7B', 'md421k': 'MD421K', 'md421': 'MD421',
    'md441': 'MD441', 'e906': 'e906', 'pr30': 'PR30', 'm88': 'M88',
    'm201': 'M201', 'r121': 'R121', 'r10': 'R10', 'r92': 'R92',
    'm160': 'M160', 'roswell': 'Roswell', 'c414': 'C414',
  };
  const positions: Record<string, string> = {
    'capedge': 'CapEdge', 'cap_edge': 'CapEdge', 'cap edge': 'CapEdge',
    'cone': 'Cone', 'cap': 'Cap',
  };

  let mic: string | undefined;
  let position: string | undefined;

  for (const [key, val] of Object.entries(mics)) {
    if (lower.includes(key)) { mic = val; break; }
  }
  for (const [key, val] of Object.entries(positions)) {
    if (lower.includes(key)) { position = val; break; }
  }

  return { mic, position };
}

export function ShotIntentBadge({ filename, hideIntents, hideRole }: { filename: string; hideIntents?: boolean; hideRole?: boolean }) {
  const { mic, position } = extractGearFromFilename(filename);
  if (!mic) return null;

  const lookup = lookupMicRole(mic, position || 'Cap');
  if (!lookup) return null;

  const hasIntents = !hideIntents && lookup.bestForIntents && lookup.bestForIntents.length > 0;
  if (hideRole && !hasIntents) return null;

  return (
    <span className="inline-flex items-center gap-1">
      {!hideRole && (
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium border border-dashed border-white/20", ROLE_COLORS[lookup.predictedRole] || "bg-white/10 text-muted-foreground")} title="Predicted role from knowledge base (mic+position rules)">
          {lookup.predictedRole}
        </span>
      )}
      {hasIntents && (
        <>
          {lookup.bestForIntents!.slice(0, 2).map(intent => (
            <span key={intent} className={cn("text-[9px] px-1 py-0 rounded border", INTENT_COLORS[intent] || "bg-white/5 text-muted-foreground")}>
              {intent}
            </span>
          ))}
        </>
      )}
    </span>
  );
}

export function ShotIntentBadgeFromGear({ mic, position }: { mic?: string; position?: string }) {
  if (!mic) return null;

  const lookup = lookupMicRole(mic, position || 'Cap');
  if (!lookup) return null;

  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", ROLE_COLORS[lookup.predictedRole] || "bg-white/10 text-muted-foreground")}>
        {lookup.predictedRole}
      </span>
      {lookup.bestForIntents && lookup.bestForIntents.length > 0 && (
        <>
          {lookup.bestForIntents.slice(0, 2).map(intent => (
            <span key={intent} className={cn("text-[9px] px-1 py-0 rounded border", INTENT_COLORS[intent] || "bg-white/5 text-muted-foreground")}>
              {intent}
            </span>
          ))}
        </>
      )}
    </span>
  );
}
