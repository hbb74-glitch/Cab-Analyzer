import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface TonalDashboardProps {
  spectralTilt?: number | null;
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

function getTiltBarPosition(tilt: number): number {
  const clamped = Math.max(-4, Math.min(2, tilt));
  return ((clamped + 4) / 6) * 100;
}

function getRolloffLabel(freq: number): { label: string; color: string } {
  if (freq < 2500) return { label: "Early Rolloff", color: "text-blue-400" };
  if (freq < 4000) return { label: "Moderate", color: "text-foreground" };
  return { label: "Extended High End", color: "text-amber-300" };
}

function getBodyLabel(lowMid: number, bass: number): { label: string; color: string } {
  const body = lowMid + bass * 0.5;
  if (body < 18) return { label: "Lean", color: "text-sky-400" };
  if (body < 35) return { label: "Balanced", color: "text-foreground" };
  return { label: "Thick", color: "text-amber-400" };
}

function getBiteLabel(highMid: number, presence: number): { label: string; color: string } {
  const bite = highMid + presence * 0.6;
  if (bite < 15) return { label: "Soft", color: "text-blue-300" };
  if (bite < 30) return { label: "Defined", color: "text-foreground" };
  return { label: "Aggressive", color: "text-amber-400" };
}

function getSmoothnessLabel(score: number): { label: string; color: string } {
  if (score >= 75) return { label: "Smooth", color: "text-emerald-400" };
  if (score >= 50) return { label: "Moderate Ripple", color: "text-amber-300" };
  return { label: "Comb Risk", color: "text-red-400" };
}

function MetricCard({ label, value, valueColor, subtext, children }: {
  label: string;
  value: string;
  valueColor: string;
  subtext?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-white/[0.03] border border-white/5" data-testid={`metric-card-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      <span className={cn("text-base font-semibold", valueColor)}>{value}</span>
      {subtext && (
        <span className="text-[10px] text-muted-foreground font-mono">{subtext}</span>
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
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const hasTilt = props.spectralTilt != null;
  const hasRolloff = props.rolloffFreq != null;
  const hasSmooth = props.smoothScore != null;
  const hasBands = props.lowMidPercent != null && props.highMidPercent != null;

  if (!hasTilt && !hasRolloff && !hasSmooth && !hasBands) return null;

  const tilt = props.spectralTilt ?? 0;
  const rolloff = props.rolloffFreq ?? 3000;
  const smooth = props.smoothScore ?? 0;
  const lowMid = props.lowMidPercent ?? 0;
  const bass = props.bassPercent ?? 0;
  const highMid = props.highMidPercent ?? 0;
  const presence = props.presencePercent ?? 0;

  const tiltInfo = getTiltLabel(tilt);
  const rolloffInfo = getRolloffLabel(rolloff);
  const bodyInfo = getBodyLabel(lowMid, bass);
  const biteInfo = getBiteLabel(highMid, presence);
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {hasTilt && (
          <MetricCard label="Tilt" value={tiltInfo.label} valueColor={tiltInfo.color} subtext={`Slope: ${tilt.toFixed(2)} dB/oct`}>
            <TiltBar tilt={tilt} />
          </MetricCard>
        )}

        {hasRolloff && (
          <MetricCard label="High Extension" value={rolloffInfo.label} valueColor={rolloffInfo.color} subtext={`Rolloff: ${rolloffDisplay}`} />
        )}

        {hasBands && (
          <MetricCard label="Body" value={bodyInfo.label} valueColor={bodyInfo.color} subtext={`Low-Mid: ${lowMid.toFixed(1)}%`} />
        )}

        {hasBands && (
          <MetricCard label="Bite" value={biteInfo.label} valueColor={biteInfo.color} subtext={`2-4kHz: ${highMid.toFixed(1)}%`} />
        )}

        {hasSmooth && (
          <MetricCard
            label="Smoothness"
            value={smoothInfo.label}
            valueColor={smoothInfo.color}
            subtext={`Score: ${Math.round(smooth)}/100${props.maxNotchDepth != null && props.maxNotchDepth > 6 ? ` · Notch: -${props.maxNotchDepth.toFixed(0)}dB` : ''}`}
          />
        )}
      </div>

      {hasBands && (
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2 block">Tonal Balance</span>
          <TonalBalanceBars bands={tonalBands} />
        </div>
      )}

      <button
        onClick={() => setAdvancedOpen(!advancedOpen)}
        className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground transition-colors"
        data-testid="button-advanced-metrics"
      >
        {advancedOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Advanced Metrics
      </button>

      {advancedOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/5" data-testid="advanced-metrics-panel">
          {props.spectralCentroid != null && (
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground">Spectral Centroid</span>
              <p className="text-sm font-mono text-foreground">{Math.round(props.spectralCentroid)} Hz</p>
            </div>
          )}
          {hasTilt && (
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground">Spectral Tilt</span>
              <p className="text-sm font-mono text-foreground">{tilt.toFixed(3)} dB/oct</p>
            </div>
          )}
          {hasRolloff && (
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground">Rolloff Frequency</span>
              <p className="text-sm font-mono text-foreground">{Math.round(rolloff)} Hz</p>
            </div>
          )}
          {props.notchCount != null && props.notchCount > 0 && (
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground">Notches ({">"}6 dB)</span>
              <p className={cn("text-sm font-mono", props.notchCount > 3 ? "text-red-400" : "text-foreground")}>{props.notchCount}</p>
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
        </div>
      )}
    </div>
  );
}

export function TonalDashboardCompact(props: TonalDashboardProps) {
  const hasTilt = props.spectralTilt != null;
  const hasSmooth = props.smoothScore != null;
  const hasBands = props.lowMidPercent != null && props.highMidPercent != null;

  if (!hasTilt && !hasSmooth && !hasBands) return null;

  const tilt = props.spectralTilt ?? 0;
  const smooth = props.smoothScore ?? 0;
  const lowMid = props.lowMidPercent ?? 0;
  const bass = props.bassPercent ?? 0;
  const highMid = props.highMidPercent ?? 0;
  const presence = props.presencePercent ?? 0;

  const tiltInfo = getTiltLabel(tilt);
  const bodyInfo = getBodyLabel(lowMid, bass);
  const biteInfo = getBiteLabel(highMid, presence);
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
      {hasSmooth && (
        <span className="text-muted-foreground">Smooth: <span className={cn("font-medium", smoothInfo.color)}>{smoothInfo.label}</span></span>
      )}
    </div>
  );
}
