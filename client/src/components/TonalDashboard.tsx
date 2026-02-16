import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface TonalDashboardProps {
  tiltCanonical?: number | null;
  rolloffFreq?: number | null;
  smoothScore?: number | null;
  maxNotchDepth?: number | null;
  notchCount?: number | null;
  spectralCentroid?: number | null;
  tailLevelDb?: number | null;
  tailStatus?: string | null;
  logBandEnergies?: number[] | null;
  subBassPercent?: number | null;
  bassPercent?: number | null;
  lowMidPercent?: number | null;
  midPercent?: number | null;
  highMidPercent?: number | null;
  presencePercent?: number | null;
  ultraHighPercent?: number | null;
}

function getTiltLabel(tilt: number): { label: string; color: string } {
  if (tilt < -2.5) return { label: "Dark", color: "text-blue-400" };
  if (tilt < -1.5) return { label: "Dark-ish", color: "text-sky-400" };
  if (tilt <= 0.3) return { label: "Neutral", color: "text-foreground" };
  if (tilt <= 1.0) return { label: "Bright-ish", color: "text-amber-300" };
  return { label: "Bright", color: "text-amber-400" };
}

function getTiltWhy(tilt: number, rolloff: number | null): string {
  if (tilt < -2.5) return "Energy drops off steeply above the mids — warm and dark character";
  if (tilt < -1.5) return "Slightly more low-end weight than highs — tends warm";
  if (tilt <= 0.3) {
    if (rolloff != null && rolloff > 5000) return "Balanced energy distribution with good high-end extension";
    return "Even energy distribution across the spectrum";
  }
  if (tilt <= 1.0) return "Slightly rising energy toward the highs — adds openness";
  return "Strong high-frequency emphasis — very forward and present";
}

function getTiltBarPosition(tilt: number): number {
  const clamped = Math.max(-4, Math.min(2, tilt));
  return ((clamped + 4) / 6) * 100;
}

function getBodyLabel(lowMid: number, bass: number): { label: string; color: string } {
  const body = lowMid + bass * 0.5;
  if (body < 18) return { label: "Lean", color: "text-sky-400" };
  if (body < 35) return { label: "Balanced", color: "text-foreground" };
  return { label: "Thick", color: "text-amber-400" };
}

function getBodyWhy(lowMid: number, bass: number): string {
  const body = lowMid + bass * 0.5;
  if (body < 18) {
    if (bass < 2) return "Very little low-end weight — tight and focused sound";
    return "Low-mid region is restrained — keeps things clear in a mix";
  }
  if (body < 35) {
    if (lowMid > bass * 2) return "Low-mid is strong without excess sub — solid foundation";
    return "Good balance between low-mid warmth and low-end control";
  }
  if (lowMid > 20) return "Heavy low-mid energy — could thicken or muddy a mix";
  return "Strong low-end presence — adds weight and warmth";
}

function getBiteLabel(highMid: number, presence: number): { label: string; color: string } {
  const bite = highMid + presence * 0.6;
  if (bite < 15) return { label: "Soft", color: "text-blue-300" };
  if (bite < 30) return { label: "Defined", color: "text-foreground" };
  return { label: "Aggressive", color: "text-amber-400" };
}

function getBiteWhy(highMid: number, presence: number): string {
  const bite = highMid + presence * 0.6;
  if (bite < 15) {
    return "Low 2-4kHz energy — gentle attack, may lack cut in a dense mix";
  }
  if (bite < 30) {
    if (highMid > presence) return "Slightly elevated 2-4kHz with controlled rolloff — articulate";
    return "Balanced upper-mid energy — defined without being harsh";
  }
  if (presence > highMid) return "Strong presence peak — very forward and cutting";
  return "Elevated 2-4kHz — aggressive pick attack and note definition";
}

function getFizzLabel(presence: number, air: number): { label: string; color: string } {
  const fizz = presence * 0.4 + air;
  if (fizz < 5) return { label: "Controlled", color: "text-emerald-400" };
  if (fizz < 15) return { label: "Moderate", color: "text-foreground" };
  return { label: "Elevated", color: "text-amber-400" };
}

function getFizzWhy(presence: number, air: number): string {
  const fizz = presence * 0.4 + air;
  if (fizz < 5) return "Very little energy above 6kHz — smooth top end, no sizzle";
  if (fizz < 15) {
    if (air > 5) return "Some air-band energy adds sparkle without excessive fizz";
    return "Moderate high-frequency content — natural sounding";
  }
  if (air > 10) return "Significant air-band energy — may add hiss or sizzle to high-gain tones";
  return "Elevated presence and upper harmonics — can sound fizzy on distorted tones";
}

function getSmoothnessLabel(score: number): { label: string; color: string } {
  if (score >= 75) return { label: "Smooth", color: "text-emerald-400" };
  if (score >= 50) return { label: "Moderate Ripple", color: "text-amber-300" };
  return { label: "Comb Risk", color: "text-red-400" };
}

function getSmoothnessWhy(score: number, notchCount?: number | null, maxNotchDepth?: number | null): string {
  if (score >= 75) {
    return "Clean frequency response with minimal peaks and dips";
  }
  if (score >= 50) {
    if (notchCount != null && notchCount > 2) return `${notchCount} noticeable dips in the response — some comb filtering likely`;
    return "Some unevenness in the frequency response — typical of close-miked captures";
  }
  if (maxNotchDepth != null && maxNotchDepth > 10) return `Deep notch (-${Math.round(maxNotchDepth)}dB) suggests phase cancellation — consider adjusting mic distance`;
  return "Significant frequency response irregularity — likely comb filtering from reflections";
}

function MetricCard({ label, value, valueColor, why, children }: {
  label: string;
  value: string;
  valueColor: string;
  why?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-white/[0.03] border border-white/5" data-testid={`metric-card-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      <span className={cn("text-base font-semibold", valueColor)}>{value}</span>
      {why && (
        <span className="text-[10px] text-muted-foreground/80 leading-tight">{why}</span>
      )}
      {children}
    </div>
  );
}

function TiltBar({ tilt }: { tilt: number }) {
  const pos = getTiltBarPosition(tilt);
  return (
    <div className="w-full h-1.5 rounded-full mt-1 relative overflow-hidden" style={{ background: 'linear-gradient(to right, #3b82f6, #6b7280, #f59e0b)' }} data-testid="tilt-color-bar">
      <div
        className="absolute top-[-1px] w-2.5 h-2.5 rounded-full bg-white border-2 border-background shadow-sm"
        style={{ left: `calc(${pos}% - 5px)`, top: '-1.5px' }}
      />
    </div>
  );
}

function TonalBalanceBars({ bands }: { bands: { label: string; value: number; color: string }[] }) {
  const total = bands.reduce((s, b) => s + b.value, 0) || 1;
  return (
    <div className="space-y-1.5" data-testid="tonal-balance-bars">
      <div className="w-full h-5 rounded-md overflow-hidden flex bg-white/5">
        {bands.map((band) => {
          const pct = (band.value / total) * 100;
          if (pct < 0.5) return null;
          return (
            <div
              key={band.label}
              className={cn(band.color, "h-full transition-all relative group")}
              style={{ width: `${pct}%` }}
              title={`${band.label}: ${band.value.toFixed(1)}%`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[8px] text-muted-foreground px-0.5">
        {bands.map((band) => (
          <span key={band.label} className="text-center" style={{ flex: Math.max(band.value / total, 0.05) }}>
            {band.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TonalDashboard(props: TonalDashboardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const hasTilt = props.tiltCanonical != null;
  const hasRolloff = props.rolloffFreq != null;
  const hasSmooth = props.smoothScore != null;
  const hasBands = props.lowMidPercent != null && props.highMidPercent != null;

  if (!hasTilt && !hasRolloff && !hasSmooth && !hasBands) return null;

  const tilt = Number.isFinite(props.tiltCanonical) ? props.tiltCanonical! : 0;
  const rolloff = props.rolloffFreq ?? 3000;
  const smooth = props.smoothScore ?? 0;
  const lowMid = props.lowMidPercent ?? 0;
  const bass = props.bassPercent ?? 0;
  const highMid = props.highMidPercent ?? 0;
  const presence = props.presencePercent ?? 0;
  const air = props.ultraHighPercent ?? 0;

  const tiltInfo = getTiltLabel(tilt);
  const bodyInfo = getBodyLabel(lowMid, bass);
  const biteInfo = getBiteLabel(highMid, presence);
  const fizzInfo = getFizzLabel(presence, air);
  const smoothInfo = getSmoothnessLabel(smooth);

  const tonalBands = [
    { label: "Sub", value: props.subBassPercent ?? 0, color: "bg-violet-500" },
    { label: "Bass", value: props.bassPercent ?? 0, color: "bg-blue-500" },
    { label: "LoMid", value: props.lowMidPercent ?? 0, color: "bg-cyan-500" },
    { label: "Mid", value: props.midPercent ?? 0, color: "bg-green-500" },
    { label: "HiMid", value: props.highMidPercent ?? 0, color: "bg-yellow-500" },
    { label: "Pres", value: props.presencePercent ?? 0, color: "bg-orange-500" },
    { label: "Air", value: props.ultraHighPercent ?? 0, color: "bg-rose-400" },
  ];

  const rolloffDisplay = rolloff >= 1000 ? `${(rolloff / 1000).toFixed(1)}kHz` : `${Math.round(rolloff)}Hz`;

  return (
    <div className="space-y-3" data-testid="tonal-dashboard">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {hasTilt && (
          <MetricCard label="Tilt" value={tiltInfo.label} valueColor={tiltInfo.color} why={getTiltWhy(tilt, props.rolloffFreq ?? null)}>
            <TiltBar tilt={tilt} />
          </MetricCard>
        )}

        {hasBands && (
          <MetricCard label="Body" value={bodyInfo.label} valueColor={bodyInfo.color} why={getBodyWhy(lowMid, bass)} />
        )}

        {hasBands && (
          <MetricCard label="Bite" value={biteInfo.label} valueColor={biteInfo.color} why={getBiteWhy(highMid, presence)} />
        )}

        {hasBands && (
          <MetricCard label="Fizz" value={fizzInfo.label} valueColor={fizzInfo.color} why={getFizzWhy(presence, air)} />
        )}

        {hasSmooth && (
          <MetricCard
            label="Smoothness"
            value={smoothInfo.label}
            valueColor={smoothInfo.color}
            why={getSmoothnessWhy(smooth, props.notchCount, props.maxNotchDepth)}
          />
        )}

        {hasRolloff && (
          <MetricCard label="High Extension" value={rolloffDisplay} valueColor="text-foreground" why={rolloff < 2500 ? "Rolls off early — darker, warmer feel" : rolloff > 5000 ? "Extended top end — open and airy" : "Moderate rolloff — natural sounding"} />
        )}
      </div>

      {hasBands && (
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2 block">Tonal Fingerprint</span>
          <TonalBalanceBars bands={tonalBands} />
        </div>
      )}

      <button
        onClick={() => setDetailsOpen(!detailsOpen)}
        className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground transition-colors"
        data-testid="button-details-toggle"
      >
        {detailsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Details
      </button>

      {detailsOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/5" data-testid="details-panel">
          {hasTilt && (
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground">Spectral Tilt</span>
              <p className="text-sm font-mono text-foreground">{tilt.toFixed(2)} dB/oct</p>
            </div>
          )}
          {hasRolloff && (
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground">Rolloff Frequency</span>
              <p className="text-sm font-mono text-foreground">{Math.round(rolloff)} Hz</p>
            </div>
          )}
          {hasSmooth && (
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground">Smooth Score</span>
              <p className="text-sm font-mono text-foreground">{Math.round(smooth)}/100</p>
            </div>
          )}
          {props.maxNotchDepth != null && props.maxNotchDepth > 3 && (
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground">Max Notch Depth</span>
              <p className={cn("text-sm font-mono", props.maxNotchDepth > 10 ? "text-red-400" : "text-foreground")}>-{props.maxNotchDepth.toFixed(1)} dB</p>
            </div>
          )}
          {props.notchCount != null && props.notchCount > 0 && (
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground">Notch Count</span>
              <p className={cn("text-sm font-mono", props.notchCount > 3 ? "text-red-400" : "text-foreground")}>{props.notchCount}</p>
            </div>
          )}
          {props.spectralCentroid != null && (
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground">Spectral Centroid</span>
              <p className="text-sm font-mono text-foreground">{Math.round(props.spectralCentroid)} Hz</p>
            </div>
          )}
          {props.tailLevelDb != null && (
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground">Tail Level</span>
              <p className={cn(
                "text-sm font-mono",
                props.tailLevelDb <= -60 ? "text-emerald-400" :
                props.tailLevelDb <= -45 ? "text-foreground" :
                props.tailLevelDb <= -35 ? "text-amber-400" : "text-red-400"
              )}>{props.tailLevelDb.toFixed(1)} dB{props.tailStatus && props.tailStatus !== 'measured' ? ` (${props.tailStatus})` : ''}</p>
            </div>
          )}
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground">Analysis Window</span>
            <p className="text-sm font-mono text-foreground">85 ms</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function TonalDashboardCompact(props: TonalDashboardProps) {
  const hasTilt = props.tiltCanonical != null;
  const hasSmooth = props.smoothScore != null;
  const hasBands = props.lowMidPercent != null && props.highMidPercent != null;

  if (!hasTilt && !hasSmooth && !hasBands) return null;

  const tilt = Number.isFinite(props.tiltCanonical) ? props.tiltCanonical! : 0;
  const smooth = props.smoothScore ?? 0;
  const lowMid = props.lowMidPercent ?? 0;
  const bass = props.bassPercent ?? 0;
  const highMid = props.highMidPercent ?? 0;
  const presence = props.presencePercent ?? 0;
  const air = props.ultraHighPercent ?? 0;

  const tiltInfo = getTiltLabel(tilt);
  const bodyInfo = getBodyLabel(lowMid, bass);
  const biteInfo = getBiteLabel(highMid, presence);
  const fizzInfo = getFizzLabel(presence, air);
  const smoothInfo = getSmoothnessLabel(smooth);

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs" data-testid="tonal-dashboard-compact">
      {hasTilt && (
        <span className="text-muted-foreground">Tilt: <span className={cn("font-medium", tiltInfo.color)}>{tiltInfo.label}</span></span>
      )}
      {hasBands && (
        <span className="text-muted-foreground">Body: <span className={cn("font-medium", bodyInfo.color)}>{bodyInfo.label}</span></span>
      )}
      {hasBands && (
        <span className="text-muted-foreground">Bite: <span className={cn("font-medium", biteInfo.color)}>{biteInfo.label}</span></span>
      )}
      {hasBands && (
        <span className="text-muted-foreground">Fizz: <span className={cn("font-medium", fizzInfo.color)}>{fizzInfo.label}</span></span>
      )}
      {hasSmooth && (
        <span className="text-muted-foreground">Smooth: <span className={cn("font-medium", smoothInfo.color)}>{smoothInfo.label}</span></span>
      )}
    </div>
  );
}

export { getTiltLabel, getBodyLabel, getBiteLabel, getFizzLabel, getSmoothnessLabel };
export type { TonalDashboardProps };
