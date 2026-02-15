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

  return {
    bandsRaw,
    bandsPercent: bandsToPercent(bandsRaw),
    bandsShapeDb: bandsToShapeDb(bandsRaw),

    tiltDbPerOct: safeNumber(metrics?.spectralTilt),

    smoothScore: metrics?.smoothScore,
    notchCount: metrics?.notchCount,
    maxNotchDepth: metrics?.maxNotchDepth,
    rolloffFreq: metrics?.rolloffFreq,
    tailLevelDb: metrics?.tailLevelDb,
    tailStatus: metrics?.tailStatus,
  };
}

function extractBandsRaw(metrics: any): TonalBands {
  const be = metrics?.bandEnergies ?? {};

  const raw: TonalBands = {
    subBass: be.sub ?? metrics?.subBassEnergy ?? 0,
    bass: be.bass ?? metrics?.bassEnergy ?? 0,
    lowMid: be.lowmid ?? metrics?.lowMidEnergy ?? 0,
    mid: be.mid ?? metrics?.midEnergy6 ?? metrics?.midEnergy ?? 0,
    highMid: be.highmid ?? metrics?.highMidEnergy ?? 0,
    presence: be.pres ?? metrics?.presenceEnergy ?? 0,
    air: be.air ?? metrics?.ultraHighEnergy ?? metrics?.airEnergy ?? 0,
  };

  for (const k of BAND_KEYS) {
    const v = raw[k];
    raw[k] = Number.isFinite(v) && v > 0 ? v : 0;
  }

  return raw;
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
  const db: any = {};

  for (const k of BAND_KEYS) {
    const e = bandsRaw[k];
    db[k] = e > 0 ? 10 * Math.log10(e) : DB_FLOOR;
  }

  const ref =
    (db.mid + db.highMid + db.presence) / 3;

  const shape: any = {};
  for (const k of BAND_KEYS) {
    shape[k] = clampDb(db[k] - ref);
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
    blendedRaw[k] =
      a.bandsRaw[k] * aGain +
      b.bandsRaw[k] * bGain;
  }

  return {
    bandsRaw: blendedRaw,
    bandsPercent: bandsToPercent(blendedRaw),
    bandsShapeDb: bandsToShapeDb(blendedRaw),

    tiltDbPerOct:
      a.tiltDbPerOct * aGain +
      b.tiltDbPerOct * bGain,

    smoothScore: blendScalar(a.smoothScore, b.smoothScore, aGain, bGain),
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
    if (features.smoothScore < 0.55) {
      score +=
        (0.55 - features.smoothScore) *
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
