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

export interface IRCountAdvice {
  loaded: number;
  minForTarget: number;
  maxUseful: number;
  bestScore: number;
  verdict: "too-few" | "sweet-spot" | "more-than-enough";
  reasoning: string;
  intent: IntentKey;
  bestPair: BestPair | null;
}

const BAND_KEYS: (keyof BandsPercent)[] = ["subBass", "bass", "lowMid", "mid", "highMid", "presence"];

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

function scoreVsBands(blend: BandsPercent, target: BandsPercent): number {
  let sum = 0;
  for (const k of BAND_KEYS) {
    const diff = blend[k] - target[k];
    sum += diff * diff;
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

const IMPROVEMENT_THRESHOLD = 1.0;

export function analyzeIRCount(irs: IREntry[], intent: IntentKey = "versatile", superblendBands?: BandsPercent): IRCountAdvice {
  const n = irs.length;
  const profile = INTENT_PROFILES[intent];

  if (n === 0) {
    return { loaded: 0, minForTarget: 3, maxUseful: 8, bestScore: 0, verdict: "too-few", reasoning: "No IRs loaded yet.", intent, bestPair: null };
  }
  if (n === 1) {
    const score = scoreVsTarget(irs[0].bandsPercent, profile);
    return { loaded: 1, minForTarget: 3, maxUseful: 8, bestScore: score, verdict: "too-few", reasoning: "A single IR can't cover tonal roles. Load at least 3 for blending.", intent, bestPair: null };
  }

  const bestPair = superblendBands ? findBestPair(irs, profile, superblendBands) : null;

  if (n === 2) {
    const blend = blendBands(irs.map(ir => ir.bandsPercent), [1, 1]);
    const score = scoreVsTarget(blend, profile);
    return { loaded: 2, minForTarget: 3, maxUseful: 8, bestScore: score, verdict: "too-few", reasoning: "Two IRs isn't enough to shape the tone precisely. Load at least 1 more.", intent, bestPair };
  }

  const allBands = irs.map(ir => ir.bandsPercent);

  let bestFirstIdx = 0;
  let bestFirstScore = -1;
  for (let i = 0; i < n; i++) {
    const s = scoreVsTarget(allBands[i], profile);
    if (s > bestFirstScore) { bestFirstScore = s; bestFirstIdx = i; }
  }

  const selected: number[] = [bestFirstIdx];
  const remaining = new Set(allBands.map((_, i) => i));
  remaining.delete(bestFirstIdx);

  const scoreHistory: { count: number; score: number; improvement: number }[] = [
    { count: 1, score: bestFirstScore, improvement: 0 }
  ];

  while (remaining.size > 0 && selected.length < 8) {
    const currentBlend = blendBands(selected.map(i => allBands[i]), selected.map(() => 1));
    const currentScore = scoreVsTarget(currentBlend, profile);

    let bestIdx = -1;
    let bestNewScore = currentScore;

    for (const idx of remaining) {
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
    scoreHistory.push({ count: selected.length, score: bestNewScore, improvement });

    if (improvement < IMPROVEMENT_THRESHOLD && selected.length >= 3) break;
  }

  const bestScore = scoreHistory[scoreHistory.length - 1].score;

  let minForTarget = 3;
  for (const h of scoreHistory) {
    if (h.count >= 3 && h.score >= bestScore - 3) {
      minForTarget = h.count;
      break;
    }
  }
  minForTarget = Math.max(3, minForTarget);

  let maxUseful = selected.length;
  for (let i = scoreHistory.length - 1; i >= 1; i--) {
    if (scoreHistory[i].improvement >= IMPROVEMENT_THRESHOLD) {
      maxUseful = scoreHistory[i].count;
      break;
    }
  }
  maxUseful = Math.max(minForTarget, maxUseful);

  let verdict: IRCountAdvice["verdict"];
  let reasoning: string;

  if (n < minForTarget) {
    verdict = "too-few";
    reasoning = `${n} IRs loaded — need at least ${minForTarget} to reach a ${profile.description} tone (${bestScore}% match). Load ${minForTarget - n} more for a solid ${profile.label} blend.`;
  } else if (n <= maxUseful) {
    verdict = "sweet-spot";
    reasoning = `${n} IRs — each one improves the ${profile.label.toLowerCase()} tone. Best blend scores ${bestScore}% match using ${maxUseful} IRs. Every IR here pulls the tone closer to the target.`;
  } else {
    verdict = "more-than-enough";
    reasoning = `Best ${profile.label.toLowerCase()} blend uses ${maxUseful} of your ${n} IRs (${bestScore}% match). Beyond ${maxUseful}, adding more IRs doesn't improve the tone — the blend is already as close to the ${profile.description} target as these IRs can get.`;
  }

  return { loaded: n, minForTarget, maxUseful, bestScore, verdict, reasoning, intent, bestPair };
}
