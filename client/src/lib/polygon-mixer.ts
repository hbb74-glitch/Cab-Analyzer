export interface PolygonPoint {
  x: number;
  y: number;
}

export interface MixerPosition {
  dot: PolygonPoint;
  vertices: PolygonPoint[];
  achievableRatios: number[];
  idealRatios: number[];
  labels: string[];
  distanceFromCenter: number;
  maxDrift: number;
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

function idwWeights(dot: PolygonPoint, vertices: PolygonPoint[], power: number = 2): number[] {
  const dists = vertices.map(v => Math.sqrt((dot.x - v.x) ** 2 + (dot.y - v.y) ** 2));
  const minD = Math.min(...dists);
  if (minD < 0.0001) return dists.map(d => d < 0.0001 ? 1 : 0);
  const w = dists.map(d => 1 / Math.pow(d, power));
  const s = w.reduce((a, b) => a + b, 0);
  return w.map(x => x / s);
}

function findOptimalDot(targetNorm: number[], vertices: PolygonPoint[], power: number = 2): PolygonPoint {
  const n = targetNorm.length;
  let dotX = 0, dotY = 0;
  for (let i = 0; i < n; i++) {
    dotX += targetNorm[i] * vertices[i].x;
    dotY += targetNorm[i] * vertices[i].y;
  }

  const lr = 0.005;
  const eps = 0.0001;
  for (let iter = 0; iter < 800; iter++) {
    const w = idwWeights({ x: dotX, y: dotY }, vertices, power);
    let costBase = 0;
    for (let i = 0; i < n; i++) costBase += (w[i] - targetNorm[i]) ** 2;
    if (costBase < 0.000001) break;

    const wPx = idwWeights({ x: dotX + eps, y: dotY }, vertices, power);
    const wMx = idwWeights({ x: dotX - eps, y: dotY }, vertices, power);
    const wPy = idwWeights({ x: dotX, y: dotY + eps }, vertices, power);
    const wMy = idwWeights({ x: dotX, y: dotY - eps }, vertices, power);

    let costPx = 0, costMx = 0, costPy = 0, costMy = 0;
    for (let i = 0; i < n; i++) {
      costPx += (wPx[i] - targetNorm[i]) ** 2;
      costMx += (wMx[i] - targetNorm[i]) ** 2;
      costPy += (wPy[i] - targetNorm[i]) ** 2;
      costMy += (wMy[i] - targetNorm[i]) ** 2;
    }

    dotX -= lr * (costPx - costMx) / (2 * eps);
    dotY -= lr * (costPy - costMy) / (2 * eps);
  }

  return { x: dotX, y: dotY };
}

function roundRatios(raw: number[]): number[] {
  const rounded = raw.map(r => Math.round(r * 100));
  const sum = rounded.reduce((a, b) => a + b, 0);
  if (sum !== 100 && sum > 0) {
    const diff = 100 - sum;
    const maxIdx = rounded.indexOf(Math.max(...rounded));
    rounded[maxIdx] += diff;
  }
  return rounded;
}

export function computeMixerPosition(
  ratios: number[],
  labels: string[]
): MixerPosition {
  const n = ratios.length;
  const vertices = getPolygonVertices(n);
  const sum = ratios.reduce((a, b) => a + b, 0) || 1;
  const normalizedRatios = ratios.map(r => r / sum);

  let dotX = 0, dotY = 0;
  for (let i = 0; i < n; i++) {
    dotX += normalizedRatios[i] * vertices[i].x;
    dotY += normalizedRatios[i] * vertices[i].y;
  }
  const dot: PolygonPoint = { x: dotX, y: dotY };

  const recoveredWeights = idwWeights(dot, vertices);
  const achievableRatios = roundRatios(recoveredWeights);
  const maxDrift = Math.max(...ratios.map((r, i) => Math.abs(r - achievableRatios[i])));

  const distanceFromCenter = Math.sqrt(dot.x ** 2 + dot.y ** 2);

  return {
    dot,
    vertices,
    achievableRatios,
    idealRatios: ratios,
    labels,
    distanceFromCenter: Math.min(distanceFromCenter, 1),
    maxDrift,
  };
}

export function snapToAchievable(ratios: number[]): number[] {
  if (ratios.length < 3 || ratios.length > 8) return ratios;
  const pos = computeMixerPosition(ratios, ratios.map((_, i) => `IR${i}`));
  return pos.achievableRatios;
}

export function getShapeName(n: number): string {
  const names: Record<number, string> = {
    3: "triangle", 4: "square", 5: "pentagon",
    6: "hexagon", 7: "heptagon", 8: "octagon",
  };
  return names[n] || "polygon";
}
