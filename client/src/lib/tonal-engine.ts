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
  spectralCentroidHz?: number;
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

export function computeTonalFeatures(r: any): TonalFeatures {
  const toNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  const normalizeBands = (bands: any): TonalBands => {
    const bp = {
      subBass: toNum(bands?.subBass ?? bands?.subbass ?? bands?.sub_bass),
      bass: toNum(bands?.bass),
      lowMid: toNum(bands?.lowMid ?? bands?.lowmid ?? bands?.low_mid),
      mid: toNum(bands?.mid),
      highMid: toNum(bands?.highMid ?? bands?.highmid ?? bands?.high_mid),
      presence: toNum(bands?.presence),
      air: toNum(bands?.air),
    };

    const sum = bp.subBass + bp.bass + bp.lowMid + bp.mid + bp.highMid + bp.presence + bp.air;

    if (sum <= 0) return bp;

    if (sum > 0.85 && sum < 1.25) {
      return bp;
    }

    if (sum > 85 && sum < 125) {
      return {
        subBass: bp.subBass / 100,
        bass: bp.bass / 100,
        lowMid: bp.lowMid / 100,
        mid: bp.mid / 100,
        highMid: bp.highMid / 100,
        presence: bp.presence / 100,
        air: bp.air / 100,
      };
    }

    return {
      subBass: bp.subBass / sum,
      bass: bp.bass / sum,
      lowMid: bp.lowMid / sum,
      mid: bp.mid / sum,
      highMid: bp.highMid / sum,
      presence: bp.presence / sum,
      air: bp.air / sum,
    };
  };

  const computeCentroidFromShape = (shape: any): number => {
    if (!shape) return 0;

    let hzArr: number[] = [];
    let dbArr: number[] = [];

    if (Array.isArray(shape)) {
      if (shape.length && typeof shape[0] === "object" && "hz" in shape[0]) {
        hzArr = shape.map((p: any) => toNum(p.hz));
        dbArr = shape.map((p: any) => toNum(p.db ?? p.value ?? p.y));
      } else if (shape.length && Array.isArray(shape[0]) && shape[0].length >= 2) {
        hzArr = shape.map((p: any) => toNum(p[0]));
        dbArr = shape.map((p: any) => toNum(p[1]));
      }
    } else if (typeof shape === "object") {
      if (Array.isArray(shape.hz) && (Array.isArray(shape.db) || Array.isArray(shape.values))) {
        hzArr = shape.hz.map((x: any) => toNum(x));
        const d = Array.isArray(shape.db) ? shape.db : shape.values;
        dbArr = d.map((x: any) => toNum(x));
      }
    }

    if (!hzArr.length || hzArr.length !== dbArr.length) return 0;

    let wSum = 0;
    let hwSum = 0;

    for (let i = 0; i < hzArr.length; i++) {
      const hz = hzArr[i];
      const db = dbArr[i];
      if (hz <= 0) continue;
      const clampedDb = Math.max(-120, Math.min(20, db));
      const w = Math.pow(10, clampedDb / 20);
      wSum += w;
      hwSum += hz * w;
    }

    if (wSum <= 0) return 0;
    return hwSum / wSum;
  };

  const tiltDbPerOct =
    toNum(r?.spectralTiltDbPerOct ?? r?.tiltDbPerOct ?? r?.spectralTilt ?? r?.tilt);

  const rolloffFreq =
    toNum(r?.rolloffFreq ?? r?.rolloffFrequency ?? r?.highExtensionHz ?? r?.rolloff_or_high_extension_hz);

  const smoothRaw =
    toNum(r?.smoothScore ?? r?.frequencySmoothness ?? r?.smooth);

  const bandsRawSource =
    r?.bandsPercent ?? r?.bandPercents ?? r?.bandEnergies ?? r?.bands ?? r?.tf?.bandsPercent;

  const bandsPercent = normalizeBands(bandsRawSource);

  const bandsRaw = extractBandsRaw(r);
  const bandsShapeDb = bandsToShapeDb(bandsRaw);

  const smoothFromMetrics = normalizeSmoothScore(smoothRaw || r?.smoothScore);
  const smoothScore =
    Number.isFinite(smoothFromMetrics)
      ? smoothFromMetrics!
      : smoothRaw > 0
        ? smoothRaw
        : computeProxySmoothScoreFromShapeDb(bandsShapeDb);

  const centroidStored =
    toNum(
      r?.spectralCentroidHz ??
      r?.centroidHz ??
      r?.spectralCentroid ??
      r?.metrics?.spectralCentroidHz ??
      r?.analysis?.spectralCentroidHz ??
      r?.tf?.spectralCentroidHz
    );

  const shape = r?.shapeDb ?? r?.shape ?? r?.spectrumDb ?? r?.spectrum ?? r?.analysis?.shapeDb;
  const spectralCentroidHz = centroidStored > 0 ? centroidStored : computeCentroidFromShape(shape);

  return {
    bandsRaw,
    bandsPercent,
    bandsShapeDb,
    tiltDbPerOct,
    smoothScore,
    spectralCentroidHz,
    notchCount: r?.notchCount,
    maxNotchDepth: r?.maxNotchDepth,
    rolloffFreq,
    tailLevelDb: r?.tailLevelDb,
    tailStatus: r?.tailStatus,
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

  const isLikelyDb = (arr: number[]): boolean => {
    if (!arr.length) return false;
    const finite = arr.filter(Number.isFinite);
    if (!finite.length) return false;
    const negCount = finite.filter(v => v < 0).length;
    const min = Math.min(...finite);
    const max = Math.max(...finite);
    return (negCount / finite.length) > 0.6 && min >= -250 && max <= 80;
  };

  const dbToEnergy = (db: number): number => {
    const d = clamp(db, -250, 80);
    return Math.pow(10, d / 10);
  };

  const be = metrics?.bandEnergies ?? {};
  const src = metrics?.bandsRaw ?? metrics ?? {};

  const out: any = {
    subBass:  safeNumber(getKey(be, ["sub"]) ?? getKey(src, ["subBass", "sub_bass", "subbass", "subBassEnergy", "subBassPercent"])),
    bass:     safeNumber(getKey(be, ["bass"]) ?? getKey(src, ["bass", "bassEnergy", "bassPercent"])),
    lowMid:   safeNumber(getKey(be, ["lowmid"]) ?? getKey(src, ["lowMid", "low_mid", "lowmid", "lowMidEnergy", "lowMidPercent"])),
    mid:      safeNumber(getKey(be, ["mid"]) ?? getKey(src, ["mid", "midEnergy6", "midEnergy", "midPercent"])),
    highMid:  safeNumber(getKey(be, ["highmid"]) ?? getKey(src, ["highMid", "high_mid", "highmid", "highMidEnergy", "highMidPercent"])),
    presence: safeNumber(getKey(be, ["pres"]) ?? getKey(src, ["presence", "pres", "presenceEnergy", "presencePercent"])),
    air:      safeNumber(getKey(be, ["air"]) ?? getKey(src, ["air", "ultraHighEnergy", "airEnergy", "ultraHighPercent"])),
  } as TonalBands;

  const directVals = BAND_KEYS.map(k => out[k]);
  if (isLikelyDb(directVals)) {
    for (const k of BAND_KEYS) out[k] = dbToEnergy(out[k]);
  }

  const sum = BAND_KEYS.reduce((s, k) => s + Math.abs(out[k]), 0);
  const bins: number[] | undefined = Array.isArray(metrics?.logBandEnergies)
    ? metrics.logBandEnergies
    : Array.isArray(metrics?.bandEnergiesLog)
      ? metrics.bandEnergiesLog
      : undefined;

  if (sum < 1e-9 && bins && bins.length >= 12) {
    const finiteBins = bins.map((x) => (Number.isFinite(x) ? x : 0));
    const b = isLikelyDb(finiteBins)
      ? finiteBins.map(dbToEnergy)
      : finiteBins.map(x => Math.max(0, x));
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

function bandsToRawDb(raw: TonalBands): TonalBands {
  const EPS = 1e-12;
  const out: any = {};
  for (const k of BAND_KEYS) {
    const energy = Math.max(EPS, raw[k]);
    out[k] = 10 * Math.log10(energy);
  }
  return out as TonalBands;
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
    a.tiltDbPerOct * aGain +
    b.tiltDbPerOct * bGain;

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
