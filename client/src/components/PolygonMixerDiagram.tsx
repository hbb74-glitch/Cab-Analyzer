import { computeMixerPosition, getShapeName } from "@/lib/polygon-mixer";
import { cn } from "@/lib/utils";

interface PolygonMixerDiagramProps {
  ratios: number[];
  labels: string[];
  size?: number;
  isEqualParts?: boolean;
  className?: string;
}

export function PolygonMixerDiagram({ ratios, labels, size = 140, isEqualParts = false, className }: PolygonMixerDiagramProps) {
  if (ratios.length < 3 || ratios.length > 8) return null;

  const mixer = computeMixerPosition(ratios, labels);
  const padding = 28;
  const center = size / 2;
  const radius = (size - padding * 2) / 2;

  const toSvg = (pt: { x: number; y: number }) => ({
    x: center + pt.x * radius,
    y: center + pt.y * radius,
  });

  const svgVertices = mixer.vertices.map(toSvg);
  const svgDot = toSvg(mixer.dot);
  const polygonPoints = svgVertices.map(v => `${v.x},${v.y}`).join(" ");

  const accentColor = isEqualParts ? "#67e8f9" : "#fbbf24";
  const accentDim = isEqualParts ? "rgba(103,232,249,0.15)" : "rgba(251,191,36,0.15)";

  const truncateLabel = (label: string, maxLen: number = 8) => {
    if (label.length <= maxLen) return label;
    return label.slice(0, maxLen - 1) + "…";
  };

  return (
    <div className={cn("flex flex-col items-center gap-1", className)} data-testid="polygon-mixer-diagram">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <polygon
          points={polygonPoints}
          fill={accentDim}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />

        {svgVertices.map((v, i) => {
          const next = svgVertices[(i + 1) % svgVertices.length];
          return (
            <line
              key={`edge-${i}`}
              x1={v.x} y1={v.y}
              x2={next.x} y2={next.y}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="0.5"
            />
          );
        })}

        {svgVertices.map((v, i) => {
          const dx = v.x - center;
          const dy = v.y - center;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const offsetX = (dx / dist) * 16;
          const offsetY = (dy / dist) * 16;
          const textX = v.x + offsetX;
          const textY = v.y + offsetY;

          return (
            <g key={`vertex-${i}`}>
              <circle cx={v.x} cy={v.y} r="3" fill="rgba(255,255,255,0.4)" />
              <text
                x={textX}
                y={textY}
                textAnchor="middle"
                dominantBaseline="central"
                fill="rgba(255,255,255,0.6)"
                fontSize="7"
                fontFamily="monospace"
              >
                {truncateLabel(labels[i])}
              </text>
            </g>
          );
        })}

        <circle cx={center} cy={center} r="1.5" fill="rgba(255,255,255,0.15)" />

        <circle
          cx={svgDot.x}
          cy={svgDot.y}
          r="5"
          fill={accentColor}
          stroke="white"
          strokeWidth="1.5"
          opacity="0.9"
        />
      </svg>

      <div className="text-[9px] text-muted-foreground/60 text-center" data-testid="text-mixer-shape">
        {getShapeName(ratios.length)} placement
      </div>
    </div>
  );
}
