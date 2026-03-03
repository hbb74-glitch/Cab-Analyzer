import { getTasteBias, type TasteContext } from "./tasteStore";
import { BAND_KEYS, type BandKey } from "./tonal-engine";
import { snapToAchievable } from "./polygon-mixer";

const PERCEPTUAL_WEIGHTS = [
  0.6,  0.7,  0.7,  0.75, 0.8,  0.85, 0.9,  0.95,
  1.0,  1.0,  1.05, 1.1,  1.1,  1.05, 1.0,  0.95,
  0.9,  0.85, 0.8,  0.7,  0.6,  0.5,  0.4,  0.3,
];

export type ToneNudges = Partial<Record<BandKey | "tilt" | "smoothness", number>>;

export const NUDGE_LABELS: { key: keyof ToneNudges; label: string; description: string }[] = [
  { key: "subBass", label: "Sub Bass", description: "Below 80 Hz" },
  { key: "bass", label: "Bass", description: "80–200 Hz" },
  { key: "lowMid", label: "Low Mid", description: "200–500 Hz" },
  { key: "mid", label: "Mid", description: "500–1.5k Hz" },
  { key: "highMid", label: "High Mid", description: "1.5–4k Hz" },
  { key: "presence", label: "Presence", description: "4–8k Hz" },
  { key: "air", label: "Air", description: "8–12k Hz" },
  { key: "fizz", label: "Fizz", description: "12k+ Hz" },
  { key: "tilt", label: "Tilt", description: "Dark ← → Bright" },
  { key: "smoothness", label: "Smoothness", description: "Ragged ← → Smooth" },
];

function blendMagnitudes(irBands: number[][], ratios: number[]): number[] {
  const nBins = irBands[0].length;
  const blended = new Array(nBins).fill(0);
  for (let i = 0; i < irBands.length; i++) {
    const r = ratios[i];
    const bins = irBands[i];
    for (let b = 0; b < nBins; b++) {
      blended[b] += r * bins[b];
    }
  }
  return blended;
}

function computeTiltFrom24Bands(bands: number[]): number {
  const n = bands.length;
  if (n < 4) return 0;
  const low = bands.slice(0, Math.floor(n / 3));
  const high = bands.slice(Math.floor(2 * n / 3));
  const avgLow = low.reduce((a, b) => a + b, 0) / low.length;
  const avgHigh = high.reduce((a, b) => a + b, 0) / high.length;
  const dbLow = avgLow > 0 ? 10 * Math.log10(avgLow + 1e-12) : -60;
  const dbHigh = avgHigh > 0 ? 10 * Math.log10(avgHigh + 1e-12) : -60;
  const octaveSpan = Math.log2(10000 / 80);
  return (dbHigh - dbLow) / octaveSpan;
}

function computeSmoothnessFrom24Bands(bands: number[]): number {
  const db = bands.map(e => e > 0 ? 10 * Math.log10(e + 1e-12) : -60);
  let roughness = 0;
  for (let i = 1; i < db.length; i++) {
    roughness += Math.abs(db[i] - db[i - 1]);
  }
  const avgRoughness = roughness / (db.length - 1);
  return Math.max(0, Math.min(100, 100 - avgRoughness * 8));
}

function bandsTo8Band(logBands: number[]): Record<string, number> {
  const edges = [0, 2, 4, 7, 10, 14, 18, 21, 24];
  const result: Record<string, number> = {};
  for (let i = 0; i < BAND_KEYS.length; i++) {
    let sum = 0;
    for (let b = edges[i]; b < edges[i + 1]; b++) {
      sum += logBands[b] || 0;
    }
    result[BAND_KEYS[i]] = sum / (edges[i + 1] - edges[i]);
  }
  return result;
}

function scoreBlendedCurve(
  blended: number[],
  ctx: TasteContext,
  nudges?: ToneNudges,
): number {
  const bands8 = bandsTo8Band(blended);
  const total = Object.values(bands8).reduce((a, b) => a + b, 0);
  const mean = total / BAND_KEYS.length;

  const vec: number[] = [];
  for (const k of BAND_KEYS) {
    const val = bands8[k];
    const db = val > 0 ? 10 * Math.log10(val / Math.max(mean, 1e-12)) : -3;
    vec.push(db / 10);
  }
  vec.push(computeTiltFrom24Bands(blended) / 10);
  vec.push(computeSmoothnessFrom24Bands(blended) / 100);

  const { bias } = getTasteBias(ctx, vec);

  const smoothBonus = computeSmoothnessFrom24Bands(blended) * 0.003;

  let perceptualScore = 0;
  const dbCurve = blended.map(e => e > 0 ? 10 * Math.log10(e + 1e-12) : -60);
  for (let i = 1; i < dbCurve.length; i++) {
    const diff = Math.abs(dbCurve[i] - dbCurve[i - 1]);
    const weight = PERCEPTUAL_WEIGHTS[i] || 0.5;
    perceptualScore -= diff * weight * 0.01;
  }

  let nudgeBonus = 0;
  if (nudges) {
    for (let i = 0; i < BAND_KEYS.length; i++) {
      const n = nudges[BAND_KEYS[i]];
      if (n && isFinite(n)) nudgeBonus += vec[i] * n * 0.5;
    }
    const tiltN = nudges.tilt;
    if (tiltN && isFinite(tiltN)) {
      nudgeBonus += vec[BAND_KEYS.length] * tiltN * 0.5;
    }
    const smN = nudges.smoothness;
    if (smN && isFinite(smN)) {
      nudgeBonus += vec[BAND_KEYS.length + 1] * smN * 0.5;
    }
  }

  return bias + smoothBonus + perceptualScore + nudgeBonus;
}

function normalizeRatios(ratios: number[]): number[] {
  const sum = ratios.reduce((a, b) => a + b, 0);
  if (sum <= 0) return ratios.map(() => 1 / ratios.length);
  return ratios.map(r => r / sum);
}

export interface OptimizationResult {
  ratios: number[];
  score: number;
  improvement: number;
}

export function optimizeBlendRatios(
  irLogBands: number[][],
  aiRatios: number[],
  ctx: TasteContext,
  iterations: number = 200,
  nudges?: ToneNudges,
): OptimizationResult {
  const n = irLogBands.length;
  if (n < 2 || n > 8) {
    return { ratios: aiRatios, score: 0, improvement: 0 };
  }

  const aiNorm = normalizeRatios(aiRatios.map(r => r / 100));

  const activeMask = aiNorm.map(r => r >= 0.02);
  const activeCount = activeMask.filter(Boolean).length;
  if (activeCount < 2) {
    return { ratios: aiRatios, score: 0, improvement: 0 };
  }

  const aiBlended = blendMagnitudes(irLogBands, aiNorm);
  const aiScore = scoreBlendedCurve(aiBlended, ctx, nudges);

  let bestRatios = [...aiNorm];
  let bestScore = aiScore;

  const step = 0.03;
  const minActive = 0.03;

  for (let iter = 0; iter < iterations; iter++) {
    const candidate = [...bestRatios];

    const activeIndices: number[] = [];
    for (let k = 0; k < n; k++) { if (activeMask[k]) activeIndices.push(k); }
    const ai = activeIndices[Math.floor(Math.random() * activeIndices.length)];
    const aj = activeIndices[Math.floor(Math.random() * activeIndices.length)];
    if (ai === aj) continue;

    const delta = step * (0.5 + Math.random());
    candidate[ai] = Math.max(minActive, candidate[ai] + delta);
    candidate[aj] = Math.max(minActive, candidate[aj] - delta);

    const norm = normalizeRatios(candidate);
    let valid = true;
    for (let k = 0; k < n; k++) {
      if (activeMask[k] && norm[k] < minActive) { valid = false; break; }
    }
    if (!valid) continue;

    const blended = blendMagnitudes(irLogBands, norm);
    const score = scoreBlendedCurve(blended, ctx, nudges);

    if (score > bestScore) {
      bestScore = score;
      bestRatios = norm;
    }
  }

  const pctRatios = bestRatios.map(r => Math.round(r * 100));
  const pctSum = pctRatios.reduce((a, b) => a + b, 0);
  if (pctSum !== 100) {
    const maxIdx = pctRatios.indexOf(Math.max(...pctRatios));
    pctRatios[maxIdx] += 100 - pctSum;
  }

  const snapped = n >= 3 ? snapToAchievable(pctRatios) : pctRatios;

  return {
    ratios: snapped,
    score: bestScore,
    improvement: bestScore - aiScore,
  };
}

export function hasActiveNudges(nudges?: ToneNudges): boolean {
  if (!nudges) return false;
  return Object.values(nudges).some(v => v !== 0);
}
