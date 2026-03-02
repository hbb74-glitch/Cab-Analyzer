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
  minUseful: number;
  maxUseful: number;
  verdict: "too-few" | "sweet-spot" | "diminishing" | "redundant";
  reasoning: string;
  redundantCount: number;
}

const BAND_KEYS: (keyof BandsPercent)[] = ["subBass", "bass", "lowMid", "mid", "highMid", "presence"];

const PERCEPTUAL_WEIGHTS: Record<keyof BandsPercent, number> = {
  subBass: 0.08,
  bass: 0.18,
  lowMid: 0.22,
  mid: 0.24,
  highMid: 0.18,
  presence: 0.10,
};

function spectralDistance(a: BandsPercent, b: BandsPercent): number {
  let sum = 0;
  for (const k of BAND_KEYS) {
    const diff = a[k] - b[k];
    sum += diff * diff * PERCEPTUAL_WEIGHTS[k];
  }
  return Math.sqrt(sum);
}

function spectralCentroid(bands: BandsPercent): number {
  const freqs = [40, 150, 400, 1000, 3000, 8000];
  let num = 0, den = 0;
  BAND_KEYS.forEach((k, i) => {
    num += bands[k] * freqs[i];
    den += bands[k];
  });
  return den > 0 ? num / den : 1000;
}

const JND_THRESHOLD = 2.5;

export function analyzeIRCount(irs: IREntry[]): IRCountAdvice {
  const n = irs.length;

  if (n === 0) {
    return { loaded: 0, minUseful: 3, maxUseful: 6, verdict: "too-few", reasoning: "No IRs loaded yet.", redundantCount: 0 };
  }
  if (n === 1) {
    return { loaded: 1, minUseful: 3, maxUseful: 6, verdict: "too-few", reasoning: "A single IR can't cover different tonal roles. Load at least 3 for blending.", redundantCount: 0 };
  }

  const distances: number[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      distances.push(spectralDistance(irs[i].bandsPercent, irs[j].bandsPercent));
    }
  }
  distances.sort((a, b) => a - b);
  const medianDist = distances[Math.floor(distances.length / 2)];

  let redundantCount = 0;
  const used = new Set<number>();
  for (let i = 0; i < n; i++) {
    if (used.has(i)) continue;
    for (let j = i + 1; j < n; j++) {
      if (used.has(j)) continue;
      if (spectralDistance(irs[i].bandsPercent, irs[j].bandsPercent) < JND_THRESHOLD) {
        used.add(j);
        redundantCount++;
      }
    }
  }

  const centroids = irs.map(ir => spectralCentroid(ir.bandsPercent));
  const cMin = Math.min(...centroids);
  const cMax = Math.max(...centroids);
  const centroidSpread = cMax - cMin;

  const uniqueIRs = n - redundantCount;

  let minUseful: number;
  let maxUseful: number;

  if (centroidSpread < 500) {
    minUseful = 3;
    maxUseful = Math.min(5, uniqueIRs);
  } else if (centroidSpread < 1500) {
    minUseful = 3;
    maxUseful = Math.min(6, uniqueIRs + 1);
  } else {
    minUseful = 4;
    maxUseful = Math.min(8, uniqueIRs + 2);
  }

  minUseful = Math.max(3, minUseful);
  maxUseful = Math.max(minUseful, maxUseful);

  let verdict: IRCountAdvice["verdict"];
  let reasoning: string;

  if (n < minUseful) {
    verdict = "too-few";
    reasoning = `${n} IR${n > 1 ? "s" : ""} loaded — you need at least ${minUseful} spectrally distinct IRs to cover different tonal roles (bright, warm, mid-focused). Load ${minUseful - n} more.`;
  } else if (n <= maxUseful) {
    verdict = "sweet-spot";
    reasoning = `${n} IRs is in the sweet spot for this set. You have enough tonal variety for meaningful blends without redundancy.`;
  } else if (redundantCount > 0 && redundantCount >= n * 0.3) {
    verdict = "redundant";
    reasoning = `${redundantCount} of your ${n} IRs are spectrally near-identical to others (below the just-noticeable difference threshold). You could get the same results with ${uniqueIRs} IRs. Human hearing can't distinguish differences this small in a mix.`;
  } else {
    verdict = "diminishing";
    reasoning = `${n} IRs loaded — beyond ${maxUseful}, additional IRs provide diminishing returns for blend quality. The ear resolves about ${maxUseful} distinct tonal slots for guitar cabinet IRs.`;
  }

  return { loaded: n, minUseful, maxUseful, verdict, reasoning, redundantCount };
}
