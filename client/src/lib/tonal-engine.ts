export type BandKey =
  | "subBass"
  | "bass"
  | "lowMid"
  | "mid"
  | "highMid"
  | "presence"
  | "air";

export type TonalBands = Record<BandKey, number>;

export interface TonalFeatures {
  bandsRaw: TonalBands;
  bandsPercent: TonalBands;
  bandsShapeDb: TonalBands;

  tiltDbPerOct: number;

  smoothScore?: number;
  notchCount?: number;
  maxNotchDepth?: number;
  rolloffFreq?: number;
  tailLevelDb?: number;
  tailStatus?: string;
}

export const BAND_KEYS: BandKey[] = [
  "subBass",
  "bass",
  "lowMid",
  "mid",
  "highMid",
  "presence",
  "air",
];

const DB_FLOOR = -120;

export function distanceToScore(distance: number): number {
  return Math.max(0, Math.round(100 - distance * 3));
}

export function scoreToLabel(score: number): "strong" | "close" | "partial" | "miss" {
  if (score >= 85) return "strong";
  if (score >= 70) return "close";
  if (score >= 50) return "partial";
  return "miss";
}

export function computeTonalFeatures(metrics: any): TonalFeatures {
  const bandsRaw = extractBandsRaw(metrics);

  const bandsPercent = bandsToPercent(bandsRaw);
  const bandsShapeDb = bandsToShapeDb(bandsRaw);

  const smoothFromMetrics = normalizeSmoothScore(metrics?.smoothScore);
  const smoothScore =
    Number.isFinite(smoothFromMetrics)
      ? smoothFromMetrics!
      : computeProxySmoothScoreFromShapeDb(bandsShapeDb);

  const tiltDbPerOct =
    ((safeNumber(bandsShapeDb.presence) + safeNumber(bandsShapeDb.air)) / 2) -
    ((safeNumber(bandsShapeDb.bass) + safeNumber(bandsShapeDb.subBass)) / 2);

  return {
    bandsRaw,
    bandsPercent,
    bandsShapeDb,

    tiltDbPerOct,

    smoothScore,
    notchCount: metrics?.notchCount,
    maxNotchDepth: metrics?.maxNotchDepth,
    rolloffFreq: metrics?.rolloffFreq,
    tailLevelDb: metrics?.tailLevelDb,
    tailStatus: metrics?.tailStatus,
  };
}

function normalizeSmoothScore(v: any): number | undefined {
  const n = safeNumber(v);
  if (!Number.isFinite(n)) return undefined;
  if (n === 0) return undefined;

  if (n >= 0 && n <= 1.2) return clamp01(n) * 100;
  if (n >= 0 && n <= 100) return n;

  return undefined;
}

function computeProxySmoothScoreFromShapeDb(shape: TonalBands): number {
  const v = BAND_KEYS.map((k) => safeNumber(shape[k]));

  const diffs: number[] = [];
  for (let i = 0; i < v.length - 1; i++) {
    diffs.push(v[i + 1] - v[i]);
  }

  let signChanges = 0;
  for (let i = 0; i < diffs.length - 1; i++) {
    if (diffs[i] * diffs[i + 1] < 0) signChanges++;
  }

  const curvs: number[] = [];
  for (let i = 0; i < v.length - 2; i++) {
    curvs.push(Math.abs(v[i + 2] - 2 * v[i + 1] + v[i]));
  }
  const maxCurv = curvs.length > 0 ? Math.max(...curvs) : 0;

  const air = safeNumber(shape.air);
  const presence = safeNumber(shape.presence);
  const highMid = safeNumber(shape.highMid);

  const fizzExcess = Math.max(0, air - Math.max(presence, highMid) - 1.0);
  const presenceSpike = Math.max(0, presence - highMid - 2.0);
  const zigZagPenalty = Math.max(0, signChanges - 2) * 1.5;
  const curvPenalty = Math.max(0, maxCurv - 6) * 0.4;

  const roughness =
    fizzExcess * 1.5 +
    presenceSpike * 1.2 +
    zigZagPenalty +
    curvPenalty;

  const normalized = 100 * Math.exp(-roughness / 8);

  return Math.round(clamp(normalized, 5, 100));
}

function clamp01(x: number): number {
  return clamp(x, 0, 1);
}

function clamp(x: number, lo: number, hi: number): number {
  if (!Number.isFinite(x)) return lo;
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

function extractBandsRaw(metrics: any): TonalBands {
  const getKey = (obj: any, keys: string[]): number | undefined => {
    for (const key of keys) {
      const v = obj?.[key];
      if (Number.isFinite(v)) return v;
    }
    return undefined;
  };

  const be = metrics?.bandEnergies ?? {};
  const src = metrics?.bandsRaw ?? metrics ?? {};

  const out: any = {
    subBass:  safeNumber(getKey(be, ["sub"]) ?? getKey(src, ["subBass", "sub_bass", "subbass", "subBassEnergy"])),
    bass:     safeNumber(getKey(be, ["bass"]) ?? getKey(src, ["bass", "bassEnergy"])),
    lowMid:   safeNumber(getKey(be, ["lowmid"]) ?? getKey(src, ["lowMid", "low_mid", "lowmid", "lowMidEnergy"])),
    mid:      safeNumber(getKey(be, ["mid"]) ?? getKey(src, ["mid", "midEnergy6", "midEnergy"])),
    highMid:  safeNumber(getKey(be, ["highmid"]) ?? getKey(src, ["highMid", "high_mid", "highmid", "highMidEnergy"])),
    presence: safeNumber(getKey(be, ["pres"]) ?? getKey(src, ["presence", "pres", "presenceEnergy"])),
    air:      safeNumber(getKey(be, ["air"]) ?? getKey(src, ["air", "ultraHighEnergy", "airEnergy"])),
  } as TonalBands;

  const sum = BAND_KEYS.reduce((s, k) => s + Math.abs(out[k]), 0);
  const bins: number[] | undefined = Array.isArray(metrics?.logBandEnergies)
    ? metrics.logBandEnergies
    : Array.isArray(metrics?.bandEnergiesLog)
      ? metrics.bandEnergiesLog
      : undefined;

  if (sum < 1e-9 && bins && bins.length >= 12) {
    const b = bins.map((x) => (Number.isFinite(x) ? x : 0));
    const bucket = (i0: number, i1: number) => b.slice(i0, i1 + 1).reduce((a, v) => a + v, 0);

    out.subBass  = bucket(0, 2);
    out.bass     = bucket(3, 5);
    out.lowMid   = bucket(6, 8);
    out.mid      = bucket(9, 11);
    out.highMid  = bucket(12, 14);
    out.presence = bucket(15, 18);
    out.air      = bucket(19, Math.min(23, b.length - 1));
  }

  return out as TonalBands;
}

export function bandsToPercent(bandsRaw: TonalBands): TonalBands {
  let total = 0;
  for (const k of BAND_KEYS) total += bandsRaw[k];

  if (total <= 0) return zeroBands();

  const out: any = {};
  for (const k of BAND_KEYS) {
    out[k] = (bandsRaw[k] / total) * 100;
  }
  return out;
}

export function bandsToShapeDb(bandsRaw: TonalBands): TonalBands {
  const EPS = 1e-12;
  const db: any = {};

  for (const k of BAND_KEYS) {
    const e = Math.max(EPS, bandsRaw[k]);
    db[k] = 10 * Math.log10(e);
  }

  const refCandidates = [db.mid, db.highMid, db.presence].filter(Number.isFinite);
  const ref = refCandidates.length > 0
    ? refCandidates.reduce((a: number, b: number) => a + b, 0) / refCandidates.length
    : (() => {
        const all = BAND_KEYS.map((k) => db[k]).filter(Number.isFinite);
        return all.length > 0 ? all.reduce((a: number, b: number) => a + b, 0) / all.length : 0;
      })();

  const shape: any = {};
  for (const k of BAND_KEYS) {
    shape[k] = clampDb(Number.isFinite(db[k]) ? db[k] - ref : DB_FLOOR);
  }

  return shape;
}

function clampDb(v: number) {
  if (!Number.isFinite(v)) return DB_FLOOR;
  if (v < DB_FLOOR) return DB_FLOOR;
  if (v > 60) return 60;
  return v;
}

export function zeroBands(): TonalBands {
  const z: any = {};
  for (const k of BAND_KEYS) z[k] = 0;
  return z;
}

function safeNumber(v: any) {
  return Number.isFinite(v) ? v : 0;
}

export function blendFeatures(
  a: TonalFeatures,
  b: TonalFeatures,
  aGain: number,
  bGain: number
): TonalFeatures {
  const blendedRaw: any = {};

  for (const k of BAND_KEYS) {
    blendedRaw[k] = a.bandsRaw[k] * aGain + b.bandsRaw[k] * bGain;
  }

  const blendedPercent = bandsToPercent(blendedRaw);
  const blendedShapeDb = bandsToShapeDb(blendedRaw);

  const tiltDbPerOct =
    ((safeNumber(blendedShapeDb.presence) + safeNumber(blendedShapeDb.air)) / 2) -
    ((safeNumber(blendedShapeDb.bass) + safeNumber(blendedShapeDb.subBass)) / 2);

  const aSmooth = normalizeSmoothScore(a.smoothScore);
  const bSmooth = normalizeSmoothScore(b.smoothScore);
  const blendedSmooth =
    Number.isFinite(aSmooth) && Number.isFinite(bSmooth)
      ? Math.round(aSmooth! * aGain + bSmooth! * bGain)
      : computeProxySmoothScoreFromShapeDb(blendedShapeDb);

  return {
    bandsRaw: blendedRaw,
    bandsPercent: blendedPercent,
    bandsShapeDb: blendedShapeDb,

    tiltDbPerOct,

    smoothScore: blendedSmooth,

    notchCount: blendScalar(a.notchCount, b.notchCount, aGain, bGain),
    maxNotchDepth: blendScalar(a.maxNotchDepth, b.maxNotchDepth, aGain, bGain),
    rolloffFreq: blendScalar(a.rolloffFreq, b.rolloffFreq, aGain, bGain),
    tailLevelDb: blendScalar(a.tailLevelDb, b.tailLevelDb, aGain, bGain),
    tailStatus: undefined,
  };
}

function blendScalar(a?: number, b?: number, aGain?: number, bGain?: number) {
  const av = safeNumber(a);
  const bv = safeNumber(b);
  return av * (aGain ?? 0) + bv * (bGain ?? 0);
}

export interface ScoreWeights {
  shapeWeight?: number;
  tiltWeight?: number;
  smoothPenaltyWeight?: number;
  notchPenaltyWeight?: number;
  rolloffPenaltyWeight?: number;
}

export function scoreBlend(
  features: TonalFeatures,
  targetShape: TonalBands,
  targetTilt: number,
  weights: ScoreWeights = {}
) {
  const {
    shapeWeight = 1,
    tiltWeight = 2,
    smoothPenaltyWeight = 10,
    notchPenaltyWeight = 1,
    rolloffPenaltyWeight = 0.002,
  } = weights;

  let score = 0;

  for (const k of BAND_KEYS) {
    score +=
      Math.abs(features.bandsShapeDb[k] - targetShape[k]) *
      shapeWeight;
  }

  score +=
    Math.abs(features.tiltDbPerOct - targetTilt) *
    tiltWeight;

  if (features.smoothScore !== undefined) {
    if (features.smoothScore < 55) {
      score +=
        ((55 - features.smoothScore) / 100) *
        smoothPenaltyWeight;
    }
  }

  if (features.maxNotchDepth !== undefined) {
    if (features.maxNotchDepth > 10) {
      score +=
        (features.maxNotchDepth - 10) *
        notchPenaltyWeight;
    }
  }

  if (features.rolloffFreq !== undefined) {
    if (features.rolloffFreq < 4500) {
      score +=
        (4500 - features.rolloffFreq) *
        rolloffPenaltyWeight;
    }
  }

  return score;
}

export function redundancySimilarity(aShape: TonalBands, bShape: TonalBands): number {
  const keys: BandKey[] = ["lowMid", "mid", "highMid", "presence", "air"];

  const va = keys.map(k => safeNumber(aShape[k]));
  const vb = keys.map(k => safeNumber(bShape[k]));

  const ma = va.reduce((s, x) => s + x, 0) / va.length;
  const mb = vb.reduce((s, x) => s + x, 0) / vb.length;

  const xa = va.map(x => x - ma);
  const xb = vb.map(x => x - mb);

  const dot = xa.reduce((s, x, i) => s + x * xb[i], 0);
  const na = Math.sqrt(xa.reduce((s, x) => s + x * x, 0));
  const nb = Math.sqrt(xb.reduce((s, x) => s + x * x, 0));

  if (na < 1e-9 || nb < 1e-9) return 0;
  return dot / (na * nb);
}

export function isRedundant(a: TonalBands, b: TonalBands): boolean {
  const sim = redundancySimilarity(a, b);
  return sim >= 0.94;
}
