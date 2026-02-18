type PreferenceWeights = {
  centroid: number
  tilt: number
  smooth: number
  hiMid: number
  lowMid: number
  presence: number
  fizzPenalty: number
}

let weights: PreferenceWeights = {
  centroid: 0,
  tilt: 0,
  smooth: 0,
  hiMid: 0,
  lowMid: 0,
  presence: 0,
  fizzPenalty: 0,
}

const LEARNING_RATE = 0.00001

export function getPreferenceWeights(): PreferenceWeights {
  return weights
}

function val(obj: any, ...keys: string[]): number {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && Number.isFinite(Number(v))) return Number(v);
  }
  return 0;
}

export function updateWeightsFromVote(preferred: any, rejected: any) {
  const pCentroid = val(preferred, "centroid_computed_hz", "spectralCentroidHz", "spectralCentroid");
  const rCentroid = val(rejected, "centroid_computed_hz", "spectralCentroidHz", "spectralCentroid");
  const pTilt = val(preferred, "spectral_tilt_db_per_oct", "tiltDbPerOct", "spectralTilt");
  const rTilt = val(rejected, "spectral_tilt_db_per_oct", "tiltDbPerOct", "spectralTilt");
  const pSmooth = val(preferred, "smooth_score", "smoothScore", "frequencySmoothness");
  const rSmooth = val(rejected, "smooth_score", "smoothScore", "frequencySmoothness");
  const pHiMid = val(preferred, "hiMidMid_ratio", "hiMidMidRatio");
  const rHiMid = val(rejected, "hiMidMid_ratio", "hiMidMidRatio");
  const pLowMid = val(preferred, "lowMid_pct", "lowMidPercent");
  const rLowMid = val(rejected, "lowMid_pct", "lowMidPercent");
  const pPresence = val(preferred, "presence_pct", "presencePercent");
  const rPresence = val(rejected, "presence_pct", "presencePercent");
  const pAir = val(preferred, "air_pct", "airPercent");
  const rAir = val(rejected, "air_pct", "airPercent");

  weights.centroid += LEARNING_RATE * (pCentroid - rCentroid);
  weights.tilt += LEARNING_RATE * (pTilt - rTilt);
  weights.smooth += LEARNING_RATE * (pSmooth - rSmooth);
  weights.hiMid += LEARNING_RATE * (pHiMid - rHiMid);
  weights.lowMid += LEARNING_RATE * (pLowMid - rLowMid);
  weights.presence += LEARNING_RATE * (pPresence - rPresence);
  weights.fizzPenalty += LEARNING_RATE * (rAir - pAir);
}

export function scoreIR(ir: any): number {
  const w = weights;

  const centroid = val(ir, "centroid_computed_hz", "spectralCentroidHz", "spectralCentroid");
  const tilt = val(ir, "spectral_tilt_db_per_oct", "tiltDbPerOct", "spectralTilt");
  const smooth = val(ir, "smooth_score", "smoothScore", "frequencySmoothness");
  const hiMid = val(ir, "hiMidMid_ratio", "hiMidMidRatio");
  const lowMid = val(ir, "lowMid_pct", "lowMidPercent");
  const presence = val(ir, "presence_pct", "presencePercent");
  const air = val(ir, "air_pct", "airPercent");

  const learnedComponent =
    w.centroid * centroid +
    w.tilt * tilt +
    w.smooth * smooth +
    w.hiMid * hiMid +
    w.lowMid * lowMid +
    w.presence * presence -
    w.fizzPenalty * air;

  const baseScore = Number(ir?.score ?? 0) || 0;

  return baseScore + learnedComponent;
}
