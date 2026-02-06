export interface TonalBands {
  subBass: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  presence: number;
}

export interface PreferenceProfile {
  name: string;
  description: string;
  targets: {
    mid: { min: number; max: number; ideal: number };
    highMid: { min: number; max: number; ideal: number };
    presence: { min: number; max: number; ideal: number };
    ratio: { min: number; max: number; ideal: number };
    lowEnd: { max: number };
    lowMid: { max: number };
  };
}

export interface MatchResult {
  profile: string;
  score: number;
  label: "strong" | "close" | "partial" | "miss";
  deviations: {
    band: string;
    direction: "low" | "high" | "ok";
    amount: number;
  }[];
  summary: string;
}

export interface FoundationScore {
  filename: string;
  score: number;
  reasons: string[];
  bands: TonalBands;
  ratio: number;
  flexibility: number;
  balance: number;
}

export const FEATURED_PROFILE: PreferenceProfile = {
  name: "Featured",
  description: "Cut, air, articulation. For lead/featured parts.",
  targets: {
    mid: { min: 19, max: 26, ideal: 22 },
    highMid: { min: 35, max: 43, ideal: 39 },
    presence: { min: 28, max: 39, ideal: 34 },
    ratio: { min: 1.4, max: 1.9, ideal: 1.65 },
    lowEnd: { max: 5 },
    lowMid: { max: 7 },
  },
};

export const BODY_PROFILE: PreferenceProfile = {
  name: "Body",
  description: "Weight, warmth, sit-in-the-mix. For rhythm/foundation parts.",
  targets: {
    mid: { min: 30, max: 39, ideal: 34 },
    highMid: { min: 35, max: 43, ideal: 40 },
    presence: { min: 5, max: 18, ideal: 12 },
    ratio: { min: 1.0, max: 1.4, ideal: 1.2 },
    lowEnd: { max: 5 },
    lowMid: { max: 7 },
  },
};

export const DEFAULT_PROFILES: PreferenceProfile[] = [FEATURED_PROFILE, BODY_PROFILE];

function bandDeviation(
  value: number,
  target: { min: number; max: number; ideal: number }
): { direction: "low" | "high" | "ok"; amount: number; penalty: number } {
  if (value >= target.min && value <= target.max) {
    const distFromIdeal = Math.abs(value - target.ideal);
    const range = (target.max - target.min) / 2;
    const penalty = range > 0 ? (distFromIdeal / range) * 10 : 0;
    return { direction: "ok", amount: 0, penalty };
  }
  if (value < target.min) {
    const amount = target.min - value;
    const penalty = Math.min(amount * 3, 40);
    return { direction: "low", amount, penalty };
  }
  const amount = value - target.max;
  const penalty = Math.min(amount * 3, 40);
  return { direction: "high", amount, penalty };
}

function capDeviation(
  value: number,
  cap: { max: number }
): { direction: "low" | "high" | "ok"; amount: number; penalty: number } {
  if (value <= cap.max) return { direction: "ok", amount: 0, penalty: 0 };
  const amount = value - cap.max;
  return { direction: "high", amount, penalty: Math.min(amount * 2, 20) };
}

export function scoreAgainstProfile(bands: TonalBands, profile: PreferenceProfile): MatchResult {
  const ratio = bands.mid > 0 ? bands.highMid / bands.mid : 0;
  const lowEnd = bands.subBass + bands.bass;

  const midDev = bandDeviation(bands.mid, profile.targets.mid);
  const hiMidDev = bandDeviation(bands.highMid, profile.targets.highMid);
  const presDev = bandDeviation(bands.presence, profile.targets.presence);
  const ratioDev = bandDeviation(ratio, profile.targets.ratio);
  const lowEndDev = capDeviation(lowEnd, profile.targets.lowEnd);
  const lowMidDev = capDeviation(bands.lowMid, profile.targets.lowMid);

  const totalPenalty = midDev.penalty + hiMidDev.penalty + presDev.penalty +
    ratioDev.penalty + lowEndDev.penalty + lowMidDev.penalty;

  const score = Math.max(0, Math.round(100 - totalPenalty));

  let label: MatchResult["label"];
  if (score >= 85) label = "strong";
  else if (score >= 70) label = "close";
  else if (score >= 50) label = "partial";
  else label = "miss";

  const deviations: MatchResult["deviations"] = [];
  if (midDev.direction !== "ok") deviations.push({ band: "Mid", direction: midDev.direction, amount: midDev.amount });
  if (hiMidDev.direction !== "ok") deviations.push({ band: "HiMid", direction: hiMidDev.direction, amount: hiMidDev.amount });
  if (presDev.direction !== "ok") deviations.push({ band: "Presence", direction: presDev.direction, amount: presDev.amount });
  if (ratioDev.direction !== "ok") deviations.push({ band: "Ratio", direction: ratioDev.direction, amount: ratioDev.amount });
  if (lowEndDev.direction !== "ok") deviations.push({ band: "LowEnd", direction: lowEndDev.direction, amount: lowEndDev.amount });
  if (lowMidDev.direction !== "ok") deviations.push({ band: "LowMid", direction: lowMidDev.direction, amount: lowMidDev.amount });

  let summary: string;
  if (label === "strong") {
    summary = `Strong ${profile.name} match`;
  } else if (label === "close") {
    const topDev = deviations.sort((a, b) => b.amount - a.amount)[0];
    summary = topDev
      ? `Near ${profile.name} — ${topDev.band} ${topDev.direction === "high" ? "above" : "below"} target`
      : `Near ${profile.name}`;
  } else if (label === "partial") {
    summary = `Partial ${profile.name} — ${deviations.length} bands out of range`;
  } else {
    summary = `Outside ${profile.name} range`;
  }

  return { profile: profile.name, score, label, deviations, summary };
}

export function scoreAgainstAllProfiles(bands: TonalBands, profiles: PreferenceProfile[] = DEFAULT_PROFILES) {
  const results = profiles.map((p) => scoreAgainstProfile(bands, p));
  const best = results.reduce((a, b) => (a.score > b.score ? a : b));
  return { results, best };
}

export function findFoundationIR(
  irs: { filename: string; bands: TonalBands; rawEnergy: TonalBands }[],
  profiles: PreferenceProfile[] = DEFAULT_PROFILES
): FoundationScore[] {
  if (irs.length === 0) return [];

  const midpoints = {
    mid: (profiles[0].targets.mid.ideal + profiles[1].targets.mid.ideal) / 2,
    highMid: (profiles[0].targets.highMid.ideal + profiles[1].targets.highMid.ideal) / 2,
    presence: (profiles[0].targets.presence.ideal + profiles[1].targets.presence.ideal) / 2,
    ratio: (profiles[0].targets.ratio.ideal + profiles[1].targets.ratio.ideal) / 2,
  };

  const scored = irs.map((ir) => {
    const ratio = ir.bands.mid > 0 ? ir.bands.highMid / ir.bands.mid : 0;
    const lowEnd = ir.bands.subBass + ir.bands.bass;

    const midDist = Math.abs(ir.bands.mid - midpoints.mid);
    const hiMidDist = Math.abs(ir.bands.highMid - midpoints.highMid);
    const presDist = Math.abs(ir.bands.presence - midpoints.presence);
    const ratioDist = Math.abs(ratio - midpoints.ratio);

    const balance = 100 - Math.min(midDist * 2 + hiMidDist * 1.5 + presDist * 1.5 + ratioDist * 10, 100);

    const featuredMatch = scoreAgainstProfile(ir.bands, profiles[0]);
    const bodyMatch = scoreAgainstProfile(ir.bands, profiles[1]);
    const flexibility = Math.min(featuredMatch.score, bodyMatch.score) +
      (Math.max(featuredMatch.score, bodyMatch.score) - Math.min(featuredMatch.score, bodyMatch.score)) * 0.2;

    const lowEndPenalty = lowEnd > 5 ? (lowEnd - 5) * 5 : 0;
    const lowMidPenalty = ir.bands.lowMid > 7 ? (ir.bands.lowMid - 7) * 3 : 0;

    const extremeRatioPenalty = ratio > 2.5 ? (ratio - 2.5) * 15 : ratio < 0.8 ? (0.8 - ratio) * 15 : 0;

    const rawScore = (balance * 0.5) + (flexibility * 0.5) - lowEndPenalty - lowMidPenalty - extremeRatioPenalty;
    const score = Math.max(0, Math.round(Math.min(rawScore, 100)));

    const reasons: string[] = [];
    if (balance >= 70) reasons.push("Tonally centered between profiles");
    if (flexibility >= 60) reasons.push("Blends well toward either profile");
    if (lowEnd <= 3) reasons.push("Tight low end");
    if (ir.bands.lowMid <= 5) reasons.push("Clean low-mids");
    if (ratio >= 1.2 && ratio <= 1.8) reasons.push("Moderate HiMid/Mid ratio");
    if (ir.bands.highMid >= 35 && ir.bands.highMid <= 43) reasons.push("HiMid in sweet spot");

    if (ratio > 2.5) reasons.push("Ratio too aggressive for foundation");
    if (ratio < 0.8) reasons.push("Ratio too dark for foundation");
    if (lowEnd > 8) reasons.push("Low end too loose");
    if (ir.bands.lowMid > 10) reasons.push("Muddy low-mids");

    return {
      filename: ir.filename,
      score,
      reasons,
      bands: ir.bands,
      ratio: Math.round(ratio * 100) / 100,
      flexibility: Math.round(flexibility),
      balance: Math.round(balance),
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}
