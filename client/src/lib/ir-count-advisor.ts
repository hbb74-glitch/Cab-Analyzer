type BandsPercent = {
  subBass: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  presence: number;
};

interface IREntry {
  filename: string;
  bandsPercent: BandsPercent;
}

interface IRCountAdvice {
  loaded: number;
  effectiveCount: number;
  maxUseful: number;
  verdict: "too-few" | "sweet-spot" | "more-than-enough";
  reasoning: string;
}

const BAND_KEYS: (keyof BandsPercent)[] = ["subBass", "bass", "lowMid", "mid", "highMid", "presence"];

function averageBands(entries: BandsPercent[]): BandsPercent {
  const result: any = {};
  for (const k of BAND_KEYS) {
    result[k] = entries.reduce((sum, e) => sum + e[k], 0) / entries.length;
  }
  return result as BandsPercent;
}

function maxBandShift(a: BandsPercent, b: BandsPercent): number {
  let maxDiff = 0;
  for (const k of BAND_KEYS) {
    maxDiff = Math.max(maxDiff, Math.abs(a[k] - b[k]));
  }
  return maxDiff;
}

function blendFingerprint(irBands: BandsPercent[], weights: number[]): BandsPercent {
  const result: any = {};
  const totalW = weights.reduce((a, b) => a + b, 0);
  for (const k of BAND_KEYS) {
    result[k] = irBands.reduce((sum, ir, i) => sum + ir[k] * weights[i], 0) / totalW;
  }
  return result as BandsPercent;
}

const AUDIBLE_BAND_SHIFT = 1.5;

export function analyzeIRCount(irs: IREntry[]): IRCountAdvice {
  const n = irs.length;

  if (n === 0) {
    return { loaded: 0, effectiveCount: 0, maxUseful: 8, verdict: "too-few", reasoning: "No IRs loaded yet." };
  }
  if (n === 1) {
    return { loaded: 1, effectiveCount: 1, maxUseful: 8, verdict: "too-few", reasoning: "A single IR can't cover different tonal roles. Load at least 3 for blending." };
  }
  if (n === 2) {
    return { loaded: 2, effectiveCount: 2, maxUseful: 8, verdict: "too-few", reasoning: "Two IRs isn't enough to fill distinct tonal roles. Load at least 1 more." };
  }

  const allBands = irs.map(ir => ir.bandsPercent);

  const blendWithAll = averageBands(allBands);

  let effectiveCount = 0;
  for (let i = 0; i < n; i++) {
    const without = allBands.filter((_, j) => j !== i);
    const blendWithout = averageBands(without);
    const shift = maxBandShift(blendWithAll, blendWithout);
    if (shift >= AUDIBLE_BAND_SHIFT) {
      effectiveCount++;
    }
  }

  effectiveCount = Math.max(effectiveCount, 3);

  let greedyCount = 0;
  const remaining = new Set(allBands.map((_, i) => i));
  const selected: number[] = [];

  let bestFirst = 0;
  let bestDist = -1;
  const center = averageBands(allBands);
  for (let i = 0; i < n; i++) {
    const d = maxBandShift(allBands[i], center);
    if (d > bestDist) { bestDist = d; bestFirst = i; }
  }
  selected.push(bestFirst);
  remaining.delete(bestFirst);
  greedyCount = 1;

  while (remaining.size > 0 && greedyCount < 8) {
    const currentBlend = blendFingerprint(
      selected.map(i => allBands[i]),
      selected.map(() => 1)
    );

    let bestIdx = -1;
    let bestShift = 0;

    for (const idx of remaining) {
      const newBlend = blendFingerprint(
        [...selected.map(i => allBands[i]), allBands[idx]],
        [...selected.map(() => 1), 1]
      );
      const shift = maxBandShift(currentBlend, newBlend);
      if (shift > bestShift) {
        bestShift = shift;
        bestIdx = idx;
      }
    }

    if (bestShift < AUDIBLE_BAND_SHIFT || bestIdx === -1) break;

    selected.push(bestIdx);
    remaining.delete(bestIdx);
    greedyCount++;
  }

  const maxUseful = Math.max(greedyCount, 3);

  let verdict: IRCountAdvice["verdict"];
  let reasoning: string;

  if (n < 3) {
    verdict = "too-few";
    reasoning = `${n} IRs loaded — load at least 3 to cover bright, warm, and mid-focused tonal roles.`;
  } else if (n <= maxUseful) {
    verdict = "sweet-spot";
    reasoning = `${n} IRs — each one shifts the blend's tonal fingerprint by at least ${AUDIBLE_BAND_SHIFT}% in at least one band when removed. Every IR here pulls its weight.`;
  } else {
    const inaudible = n - maxUseful;
    verdict = "more-than-enough";
    reasoning = `${maxUseful} of your ${n} IRs can audibly shift the blend. Beyond that, adding more changes no single band by more than ${AUDIBLE_BAND_SHIFT}% — your ears won't catch the difference in a mix.`;
  }

  return { loaded: n, effectiveCount: maxUseful, maxUseful, verdict, reasoning };
}
