import { getTasteBias, type TasteContext } from "./tasteStore";
import { BAND_KEYS, type BandKey } from "./tonal-engine";
import { snapToAchievable } from "./polygon-mixer";

const PERCEPTUAL_WEIGHTS = [
  0.6,  0.7,  0.7,  0.75, 0.8,  0.85, 0.9,  0.95,
  1.0,  1.0,  1.05, 1.1,  1.1,  1.05, 1.0,  0.95,
  0.9,  0.85, 0.8,  0.7,  0.6,  0.5,  0.4,  0.3,
];

export type ToneNudges = Partial<Record<BandKey | "lowEnd" | "tilt" | "smoothness", number>>;

export const NUDGE_LABELS: { key: keyof ToneNudges; label: string; description: string }[] = [
  { key: "lowEnd", label: "Low End", description: "Below 200 Hz (sub bass + bass)" },
  { key: "lowMid", label: "Low Mid", description: "200–500 Hz" },
  { key: "mid", label: "Mid", description: "500–1.5k Hz" },
  { key: "highMid", label: "High Mid", description: "1.5–4k Hz" },
  { key: "presence", label: "Presence", description: "4–8k Hz" },
  { key: "air", label: "Air", description: "8–12k Hz" },
  { key: "fizz", label: "Fizz", description: "12k+ Hz" },
  { key: "tilt", label: "Tilt", description: "Dark ← → Bright" },
  { key: "smoothness", label: "Smoothness", description: "Ragged ← → Smooth" },
];

export function expandLowEndNudge(nudges: ToneNudges): ToneNudges {
  const expanded = { ...nudges };
  if (expanded.lowEnd !== undefined && expanded.lowEnd !== 0) {
    expanded.subBass = (expanded.subBass || 0) + expanded.lowEnd;
    expanded.bass = (expanded.bass || 0) + expanded.lowEnd;
    delete expanded.lowEnd;
  }
  return expanded;
}

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

const LOG_MIN = Math.log(80);
const LOG_MAX = Math.log(10000);

function regressionTiltFrom24Bands(bands: number[]): number {
  const nBands = bands.length;
  const logStep = (LOG_MAX - LOG_MIN) / nBands;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let b = 0; b < nBands; b++) {
    const centerHz = Math.exp(LOG_MIN + (b + 0.5) * logStep);
    if (centerHz < 200 || centerHz > 8000) continue;
    if (bands[b] <= 0) continue;
    xs.push(Math.log2(centerHz));
    ys.push(10 * Math.log10(bands[b]));
  }
  const n = xs.length;
  if (n < 3) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i]; sumY += ys[i];
    sumXY += xs[i] * ys[i]; sumXX += xs[i] * xs[i];
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
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

const NUDGE_STEP_DB = 0.25;
const NUDGE_PENALTY_WEIGHT = 3.0;

function computeVec(blended: number[]): number[] {
  const bands8 = bandsTo8Band(blended);
  const total = Object.values(bands8).reduce((a, b) => a + b, 0);
  const mean = total / BAND_KEYS.length;
  const vec: number[] = [];
  for (const k of BAND_KEYS) {
    const val = bands8[k];
    const db = val > 0 ? 10 * Math.log10(val / Math.max(mean, 1e-12)) : -3;
    vec.push(db / 10);
  }
  vec.push(regressionTiltFrom24Bands(blended) / 10);
  vec.push(computeSmoothnessFrom24Bands(blended) / 100);
  return vec;
}

function scoreBlendedCurve(
  blended: number[],
  ctx: TasteContext,
  nudges?: ToneNudges,
  baselineVec?: number[],
): number {
  const vec = computeVec(blended);

  const { bias } = getTasteBias(ctx, vec);

  const smoothBonus = computeSmoothnessFrom24Bands(blended) * 0.003;

  let perceptualScore = 0;
  const dbCurve = blended.map(e => e > 0 ? 10 * Math.log10(e + 1e-12) : -60);
  for (let i = 1; i < dbCurve.length; i++) {
    const diff = Math.abs(dbCurve[i] - dbCurve[i - 1]);
    const weight = PERCEPTUAL_WEIGHTS[i] || 0.5;
    perceptualScore -= diff * weight * 0.01;
  }

  const effectiveNudges = nudges ? expandLowEndNudge(nudges) : undefined;
  let nudgeBonus = 0;
  if (effectiveNudges && baselineVec) {
    for (let i = 0; i < BAND_KEYS.length; i++) {
      const n = effectiveNudges[BAND_KEYS[i]];
      if (n && isFinite(n)) {
        const target = baselineVec[i] + n * NUDGE_STEP_DB;
        nudgeBonus -= Math.abs(vec[i] - target) * NUDGE_PENALTY_WEIGHT;
      }
    }
    const tiltN = effectiveNudges.tilt;
    if (tiltN && isFinite(tiltN)) {
      const tiltIdx = BAND_KEYS.length;
      const target = baselineVec[tiltIdx] + tiltN * 0.15;
      nudgeBonus -= Math.abs(vec[tiltIdx] - target) * NUDGE_PENALTY_WEIGHT * 2.0;
    }
    const smN = effectiveNudges.smoothness;
    if (smN && isFinite(smN)) {
      const smIdx = BAND_KEYS.length + 1;
      const target = baselineVec[smIdx] + smN * (0.05);
      nudgeBonus -= Math.abs(vec[smIdx] - target) * NUDGE_PENALTY_WEIGHT;
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
  const baselineVec = computeVec(aiBlended);
  const aiScore = scoreBlendedCurve(aiBlended, ctx, nudges, baselineVec);

  let bestRatios = [...aiNorm];
  let bestScore = aiScore;

  const minActive = 0.03;

  for (let iter = 0; iter < iterations; iter++) {
    const candidate = [...bestRatios];

    const activeIndices: number[] = [];
    for (let k = 0; k < n; k++) { if (activeMask[k]) activeIndices.push(k); }
    const ai = activeIndices[Math.floor(Math.random() * activeIndices.length)];
    const aj = activeIndices[Math.floor(Math.random() * activeIndices.length)];
    if (ai === aj) continue;

    const progress = iter / iterations;
    const baseStep = progress < 0.4 ? 0.12 : progress < 0.7 ? 0.06 : 0.03;
    const hasStrongNudge = nudges && Object.values(nudges).some(v => typeof v === 'number' && Math.abs(v) >= 1);
    const step = hasStrongNudge ? baseStep * 1.8 : baseStep;
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
    const score = scoreBlendedCurve(blended, ctx, nudges, baselineVec);

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
