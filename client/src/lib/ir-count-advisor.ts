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

export type IntentKey = "versatile" | "rhythm" | "lead" | "clean";

export interface BestPair {
  ir1: string;
  ir2: string;
  score: number;
}

export interface ScoreStep {
  count: number;
  score: number;
  improvement: number;
  irName: string;
}

export interface IRCountAdvice {
  loaded: number;
  minForTarget: number;
  maxUseful: number;
  bestScore: number;
  verdict: "too-few" | "sweet-spot" | "more-than-enough";
  reasoning: string;
  intent: IntentKey;
  bestPair: BestPair | null;
  curve: ScoreStep[];
}

const BAND_KEYS: (keyof BandsPercent)[] = ["subBass", "bass", "lowMid", "mid", "highMid", "presence"];

function toPercentScale(b: BandsPercent): BandsPercent {
  const sum = BAND_KEYS.reduce((s, k) => s + (b[k] || 0), 0);
  if (sum > 0 && sum < 1.5) {
    return {
      subBass: b.subBass * 100,
      bass: b.bass * 100,
      lowMid: b.lowMid * 100,
      mid: b.mid * 100,
      highMid: b.highMid * 100,
      presence: b.presence * 100,
    };
  }
  return b;
}

interface IntentProfile {
  label: string;
  target: BandsPercent;
  weights: Record<keyof BandsPercent, number>;
  tolerance: number;
  description: string;
}

const INTENT_PROFILES: Record<IntentKey, IntentProfile> = {
  versatile: {
    label: "Versatile Reference",
    target: { subBass: 0.5, bass: 2.0, lowMid: 6.0, mid: 28.0, highMid: 40.0, presence: 22.0 },
    weights: { subBass: 0.5, bass: 1.0, lowMid: 1.2, mid: 1.5, highMid: 1.3, presence: 1.0 },
    tolerance: 6.0,
    description: "balanced, full-spectrum",
  },
  rhythm: {
    label: "Rhythm",
    target: { subBass: 0.3, bass: 1.5, lowMid: 5.0, mid: 30.0, highMid: 42.0, presence: 18.0 },
    weights: { subBass: 0.8, bass: 1.2, lowMid: 1.5, mid: 1.8, highMid: 1.0, presence: 0.8 },
    tolerance: 5.0,
    description: "tight, punchy, mid-focused",
  },
  lead: {
    label: "Lead",
    target: { subBass: 0.4, bass: 1.8, lowMid: 5.5, mid: 32.0, highMid: 38.0, presence: 20.0 },
    weights: { subBass: 0.5, bass: 0.8, lowMid: 1.0, mid: 1.8, highMid: 1.5, presence: 1.2 },
    tolerance: 5.5,
    description: "smooth, present, mid-rich",
  },
  clean: {
    label: "Clean / Ambient",
    target: { subBass: 0.8, bass: 3.0, lowMid: 8.0, mid: 26.0, highMid: 38.0, presence: 22.0 },
    weights: { subBass: 0.8, bass: 1.2, lowMid: 1.3, mid: 1.0, highMid: 1.2, presence: 1.5 },
    tolerance: 7.0,
    description: "warm, open, extended range",
  },
};

function blendBands(irBands: BandsPercent[], weights: number[]): BandsPercent {
  const result: any = {};
  const totalW = weights.reduce((a, b) => a + b, 0);
  for (const k of BAND_KEYS) {
    result[k] = irBands.reduce((sum, ir, i) => sum + ir[k] * weights[i], 0) / totalW;
  }
  return result as BandsPercent;
}

function targetDistance(blend: BandsPercent, profile: IntentProfile): number {
  let sum = 0;
  for (const k of BAND_KEYS) {
    const diff = blend[k] - profile.target[k];
    sum += diff * diff * profile.weights[k];
  }
  return Math.sqrt(sum);
}

function scoreVsTarget(blend: BandsPercent, profile: IntentProfile): number {
  const dist = targetDistance(blend, profile);
  const maxDist = 50;
  return Math.max(0, Math.round((1 - dist / maxDist) * 100));
}

const PSYCHOACOUSTIC_WEIGHTS: Record<keyof BandsPercent, number> = {
  subBass: 0.3,
  bass: 1.3,
  lowMid: 1.2,
  mid: 2.0,
  highMid: 1.8,
  presence: 1.4,
};

function scoreVsBands(blend: BandsPercent, target: BandsPercent): number {
  let sum = 0;
  for (const k of BAND_KEYS) {
    const diff = blend[k] - target[k];
    sum += diff * diff * PSYCHOACOUSTIC_WEIGHTS[k];
  }
  const dist = Math.sqrt(sum);
  const maxDist = 50;
  return Math.max(0, Math.round((1 - dist / maxDist) * 100));
}

function findBestPair(irs: IREntry[], profile: IntentProfile, superblendBands?: BandsPercent): BestPair | null {
  const n = irs.length;
  if (n < 2) return null;

  const scorer = superblendBands
    ? (blend: BandsPercent) => scoreVsBands(blend, superblendBands)
    : (blend: BandsPercent) => scoreVsTarget(blend, profile);

  let bestI = 0, bestJ = 1, bestScore = -1;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const blend = blendBands([irs[i].bandsPercent, irs[j].bandsPercent], [1, 1]);
      const score = scorer(blend);
      if (score > bestScore) {
        bestScore = score;
        bestI = i;
        bestJ = j;
      }
    }
  }
  return { ir1: irs[bestI].filename, ir2: irs[bestJ].filename, score: bestScore };
}

export function findBestPairForBands(
  irs: { filename: string; bandsPercent: BandsPercent }[],
  targetBands: BandsPercent
): BestPair | null {
  if (irs.length < 2) return null;
  const normIRs = irs.map(ir => ({ ...ir, bandsPercent: toPercentScale(ir.bandsPercent) }));
  const normTarget = toPercentScale(targetBands);
  let bestI = 0, bestJ = 1, bestScore = -1;
  for (let i = 0; i < normIRs.length; i++) {
    for (let j = i + 1; j < normIRs.length; j++) {
      const blend = blendBands([normIRs[i].bandsPercent, normIRs[j].bandsPercent], [1, 1]);
      const score = scoreVsBands(blend, normTarget);
      if (score > bestScore) { bestScore = score; bestI = i; bestJ = j; }
    }
  }
  return { ir1: irs[bestI].filename, ir2: irs[bestJ].filename, score: bestScore };
}

const IMPROVEMENT_THRESHOLD = 1.0;

export function analyzeIRCount(irs: IREntry[], intent: IntentKey = "versatile", superblendBands?: BandsPercent): IRCountAdvice {
  const normalized = irs.map(ir => ({ ...ir, bandsPercent: toPercentScale(ir.bandsPercent) }));
  const normalizedSB = superblendBands ? toPercentScale(superblendBands) : undefined;
  const n = normalized.length;
  const profile = INTENT_PROFILES[intent];

  if (n === 0) {
    return { loaded: 0, minForTarget: 3, maxUseful: 8, bestScore: 0, verdict: "too-few", reasoning: "No IRs loaded yet.", intent, bestPair: null, curve: [] };
  }
  if (n === 1) {
    const score = scoreVsTarget(normalized[0].bandsPercent, profile);
    return { loaded: 1, minForTarget: 3, maxUseful: 8, bestScore: score, verdict: "too-few", reasoning: "A single IR can't cover tonal roles. Load at least 3 for blending.", intent, bestPair: null, curve: [{ count: 1, score, improvement: 0, irName: normalized[0].filename }] };
  }

  const bestPair = normalizedSB ? findBestPair(normalized, profile, normalizedSB) : null;

  if (n === 2) {
    const blend = blendBands(normalized.map(ir => ir.bandsPercent), [1, 1]);
    const score = scoreVsTarget(blend, profile);
    return { loaded: 2, minForTarget: 3, maxUseful: 8, bestScore: score, verdict: "too-few", reasoning: "Two IRs isn't enough to shape the tone precisely. Load at least 1 more.", intent, bestPair, curve: [] };
  }

  const allBands = normalized.map(ir => ir.bandsPercent);

  let bestFirstIdx = 0;
  let bestFirstScore = -1;
  for (let i = 0; i < n; i++) {
    const s = scoreVsTarget(allBands[i], profile);
    if (s > bestFirstScore) { bestFirstScore = s; bestFirstIdx = i; }
  }

  const selected: number[] = [bestFirstIdx];
  const remaining = new Set(allBands.map((_, i) => i));
  remaining.delete(bestFirstIdx);

  const scoreHistory: ScoreStep[] = [
    { count: 1, score: bestFirstScore, improvement: 0, irName: normalized[bestFirstIdx].filename }
  ];

  while (remaining.size > 0 && selected.length < 8) {
    const currentBlend = blendBands(selected.map(i => allBands[i]), selected.map(() => 1));
    const currentScore = scoreVsTarget(currentBlend, profile);

    let bestIdx = -1;
    let bestNewScore = -Infinity;

    for (const idx of Array.from(remaining)) {
      const newBlend = blendBands(
        [...selected.map(i => allBands[i]), allBands[idx]],
        [...selected.map(() => 1), 1]
      );
      const newScore = scoreVsTarget(newBlend, profile);
      if (newScore > bestNewScore) {
        bestNewScore = newScore;
        bestIdx = idx;
      }
    }

    if (bestIdx === -1) break;

    const improvement = bestNewScore - currentScore;
    selected.push(bestIdx);
    remaining.delete(bestIdx);
    scoreHistory.push({ count: selected.length, score: bestNewScore, improvement, irName: normalized[bestIdx].filename });
  }

  const bestScore = Math.max(...scoreHistory.map(h => h.score));
  const peakCount = scoreHistory.find(h => h.score === bestScore)?.count || 3;

  let minForTarget = Math.max(3, peakCount);

  let maxUseful = minForTarget;
  for (let i = 0; i < scoreHistory.length; i++) {
    const h = scoreHistory[i];
    if (h.count >= 3 && h.count > peakCount && h.score >= bestScore - 2) {
      maxUseful = h.count;
    }
  }
  maxUseful = Math.max(minForTarget, maxUseful);

  let verdict: IRCountAdvice["verdict"];
  let reasoning: string;

  if (n < 3) {
    verdict = "too-few";
    reasoning = `${n} IRs loaded — load at least ${3 - n} more for blending.`;
  } else if (n <= maxUseful) {
    verdict = "sweet-spot";
    reasoning = `Peak score ${bestScore}% at ${peakCount} IRs.${maxUseful > peakCount ? ` ${peakCount}–${maxUseful} all score within 2%.` : ""} Each IR count is shown below with its contribution.`;
  } else {
    verdict = "more-than-enough";
    reasoning = `Peak score ${bestScore}% at ${peakCount} IRs. Beyond ${maxUseful}, adding more doesn't help — the blend plateaus.`;
  }

  return { loaded: n, minForTarget, maxUseful, bestScore, verdict, reasoning, intent, bestPair, curve: scoreHistory };
}

export interface PairWithRatio {
  ir1: string;
  ir2: string;
  ratio: number;
  score: number;
  blendedBands: BandsPercent;
}

export function findBestPairWithOptimalRatio(
  irs: { filename: string; bandsPercent: BandsPercent }[],
  targetBands: BandsPercent,
): PairWithRatio | null {
  if (irs.length < 2) return null;
  const normIRs = irs.map(ir => ({ ...ir, bandsPercent: toPercentScale(ir.bandsPercent) }));
  const normTarget = toPercentScale(targetBands);

  const ratios = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];

  let best: PairWithRatio | null = null;

  for (let i = 0; i < normIRs.length; i++) {
    for (let j = i + 1; j < normIRs.length; j++) {
      for (const r of ratios) {
        const w1 = r / 100;
        const w2 = 1 - w1;
        const blend = blendBands([normIRs[i].bandsPercent, normIRs[j].bandsPercent], [w1, w2]);
        const score = scoreVsBands(blend, normTarget);
        if (!best || score > best.score) {
          best = { ir1: irs[i].filename, ir2: irs[j].filename, ratio: r, score, blendedBands: blend };
        }
        const blendFlip = blendBands([normIRs[j].bandsPercent, normIRs[i].bandsPercent], [w1, w2]);
        const scoreFlip = scoreVsBands(blendFlip, normTarget);
        if (scoreFlip > (best?.score ?? -1)) {
          best = { ir1: irs[j].filename, ir2: irs[i].filename, ratio: r, score: scoreFlip, blendedBands: blendFlip };
        }
      }
    }
  }
  return best;
}
