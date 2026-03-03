export interface PolygonPoint {
  x: number;
  y: number;
}

export interface MixerPosition {
  dot: PolygonPoint;
  vertices: PolygonPoint[];
  achievableRatios: number[];
  labels: string[];
  distanceFromCenter: number;
  isInsidePolygon: boolean;
}

export function getPolygonVertices(n: number): PolygonPoint[] {
  const vertices: PolygonPoint[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    vertices.push({
      x: Math.cos(angle),
      y: Math.sin(angle),
    });
  }
  return vertices;
}

function ratiosToDotPosition(ratios: number[], vertices: PolygonPoint[]): PolygonPoint {
  let x = 0, y = 0;
  for (let i = 0; i < ratios.length; i++) {
    x += ratios[i] * vertices[i].x;
    y += ratios[i] * vertices[i].y;
  }
  return { x, y };
}

function isPointInPolygon(pt: PolygonPoint, vertices: PolygonPoint[]): boolean {
  let inside = false;
  const n = vertices.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    if ((yi > pt.y) !== (yj > pt.y) && pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function meanValueCoordinates(pt: PolygonPoint, vertices: PolygonPoint[]): number[] {
  const n = vertices.length;
  const weights: number[] = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    const dist = Math.sqrt((pt.x - vertices[i].x) ** 2 + (pt.y - vertices[i].y) ** 2);
    if (dist < 0.0001) {
      const result = new Array(n).fill(0);
      result[i] = 1;
      return result;
    }
  }

  for (let i = 0; i < n; i++) {
    const prev = (i - 1 + n) % n;
    const next = (i + 1) % n;

    const dxi = vertices[i].x - pt.x;
    const dyi = vertices[i].y - pt.y;
    const dxPrev = vertices[prev].x - pt.x;
    const dyPrev = vertices[prev].y - pt.y;
    const dxNext = vertices[next].x - pt.x;
    const dyNext = vertices[next].y - pt.y;

    const ri = Math.sqrt(dxi * dxi + dyi * dyi);

    const crossPrev = dxPrev * dyi - dyPrev * dxi;
    const dotPrev = dxPrev * dxi + dyPrev * dyi;
    const rPrev = Math.sqrt(dxPrev * dxPrev + dyPrev * dyPrev);
    const tanHalfPrev = crossPrev / (rPrev * ri + dotPrev);

    const crossNext = dxi * dyNext - dyi * dxNext;
    const dotNext = dxi * dxNext + dyi * dyNext;
    const rNext = Math.sqrt(dxNext * dxNext + dyNext * dyNext);
    const tanHalfNext = crossNext / (ri * rNext + dotNext);

    weights[i] = (tanHalfPrev + tanHalfNext) / ri;
  }

  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum < 0.0001) return new Array(n).fill(1 / n);
  return weights.map(w => Math.max(0, w / sum));
}

export function computeMixerPosition(
  ratios: number[],
  labels: string[]
): MixerPosition {
  const n = ratios.length;
  const vertices = getPolygonVertices(n);
  const normalizedRatios = ratios.map(r => r / 100);
  const dot = ratiosToDotPosition(normalizedRatios, vertices);

  const inside = isPointInPolygon(dot, vertices) ||
    vertices.some(v => Math.sqrt((dot.x - v.x) ** 2 + (dot.y - v.y) ** 2) < 0.001);

  const recoveredRatios = meanValueCoordinates(dot, vertices);
  const achievableRatios = recoveredRatios.map(r => Math.round(r * 100));

  const sum = achievableRatios.reduce((a, b) => a + b, 0);
  if (sum !== 100 && sum > 0) {
    const diff = 100 - sum;
    const maxIdx = achievableRatios.indexOf(Math.max(...achievableRatios));
    achievableRatios[maxIdx] += diff;
  }

  const distanceFromCenter = Math.sqrt(dot.x ** 2 + dot.y ** 2);

  return {
    dot,
    vertices,
    achievableRatios,
    labels,
    distanceFromCenter: Math.min(distanceFromCenter, 1),
    isInsidePolygon: inside,
  };
}

export function snapToAchievable(ratios: number[]): number[] {
  const pos = computeMixerPosition(ratios, ratios.map((_, i) => `IR${i + 1}`));
  return pos.achievableRatios;
}
