import {
  type TonalBands,
  type BandKey,
  type TonalFeatures,
  type ScoreWeights,
  BAND_KEYS,
  computeTonalFeatures,
  bandsToPercent,
  bandsToShapeDb,
  blendFeatures,
  scoreBlend,
  distanceToScore,
  scoreToLabel,
  zeroBands,
} from "./tonal-engine";

export type { TonalBands, TonalFeatures, BandKey };

export function featuresFromBands(bands: TonalBands): TonalFeatures {
  return {
    bandsRaw: bands,
    bandsPercent: bandsToPercent(bands),
    bandsShapeDb: bandsToShapeDb(bands),
    tiltDbPerOct: 0,
  };
}

export interface PreferenceProfile {
  name: string;
  description: string;
  targetShapeDb: TonalBands;
  targetTiltDbPerOct: number;
  weights?: ScoreWeights;
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
  bodyScore: number;
  featuredScore: number;
  reasons: string[];
  bands: TonalBands;
  ratio: number;
  rank: number;
}

export const FEATURED_PROFILE: PreferenceProfile = {
  name: "Featured",
  description: "Cut, air, articulation. For lead/featured parts.",
  targetShapeDb: {
    subBass: -18,
    bass: -10,
    lowMid: -4,
    mid: 0,
    highMid: 2,
    presence: 4,
    air: -2,
  },
  targetTiltDbPerOct: -1.5,
};

export const BODY_PROFILE: PreferenceProfile = {
  name: "Body",
  description: "Weight, warmth, sit-in-the-mix. For rhythm/foundation parts.",
  targetShapeDb: {
    subBass: -14,
    bass: -6,
    lowMid: -1,
    mid: 2,
    highMid: 1,
    presence: -4,
    air: -10,
  },
  targetTiltDbPerOct: 0.5,
};

export const DEFAULT_PROFILES: PreferenceProfile[] = [FEATURED_PROFILE, BODY_PROFILE];

export type ShotIntentRole = "featured" | "body" | "neutral";

const BODY_MICS = new Set(["R121", "R10", "Roswell", "R92"]);

const FEATURED_POSITIONS = new Set([
  "Cap", "Cap Off-Center", "CapEdge", "CapEdge-Bright", "CapEdge-Dark"
]);
const BODY_POSITIONS = new Set([
  "Cap-Cone Transition", "Cone"
]);

const FEATURED_ELIGIBLE_MICS = new Set([
  "SM57", "M201", "C414", "e906", "M88", "MD441", "MD421", "MD421K", "M160", "SM7B", "PR30"
]);

export function inferShotIntent(mic?: string, position?: string): { role: ShotIntentRole; confidence: number; reason: string } {
  if (!mic && !position) return { role: "neutral", confidence: 0, reason: "" };

  if (mic && BODY_MICS.has(mic)) {
    return { role: "body", confidence: 0.85, reason: `${mic} is a ribbon mic typically used for body shots` };
  }

  if (mic && position) {
    if (FEATURED_ELIGIBLE_MICS.has(mic) && FEATURED_POSITIONS.has(position)) {
      return { role: "featured", confidence: 0.8, reason: `${mic} at ${position} is a classic feature shot` };
    }
    if (FEATURED_ELIGIBLE_MICS.has(mic) && BODY_POSITIONS.has(position)) {
      return { role: "body", confidence: 0.75, reason: `${mic} at ${position} targets body territory` };
    }
  }

  if (position && (!mic || (!FEATURED_ELIGIBLE_MICS.has(mic) && !BODY_MICS.has(mic)))) {
    if (BODY_POSITIONS.has(position)) {
      return { role: "body", confidence: 0.6, reason: `${position} is typically a body position` };
    }
    if (FEATURED_POSITIONS.has(position)) {
      return { role: "featured", confidence: 0.5, reason: `${position} is typically a feature position` };
    }
  }

  if (mic && FEATURED_ELIGIBLE_MICS.has(mic)) {
    return { role: "featured", confidence: 0.4, reason: `${mic} is commonly used for feature shots` };
  }

  return { role: "neutral", confidence: 0, reason: "" };
}

export function inferShotIntentFromFilename(filename: string): { role: ShotIntentRole; confidence: number; reason: string } {
  const gear = parseGearFromFilename(filename);
  return inferShotIntent(gear.mic, gear.position);
}

export function computeSpeakerRelativeProfiles(
  irs: { features: TonalFeatures }[]
): PreferenceProfile[] {
  if (irs.length < 4) return DEFAULT_PROFILES;

  const pctl = (arr: number[], p: number) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.min(Math.round(p * (sorted.length - 1)), sorted.length - 1);
    return sorted[idx];
  };

  const presShapes = irs.map((ir) => ir.features.bandsShapeDb.presence);
  const presSpread = pctl(presShapes, 0.90) - pctl(presShapes, 0.10);
  const absSpread = FEATURED_PROFILE.targetShapeDb.presence - BODY_PROFILE.targetShapeDb.presence;
  const needsAdaptation = pctl(presShapes, 0.75) < FEATURED_PROFILE.targetShapeDb.presence - 2 || presSpread < Math.abs(absSpread) * 0.5;

  if (!needsAdaptation) return DEFAULT_PROFILES;

  const bandPercentiles = (band: BandKey) => {
    const vals = irs.map((ir) => ir.features.bandsShapeDb[band]);
    return { p25: pctl(vals, 0.25), p50: pctl(vals, 0.50), p75: pctl(vals, 0.75) };
  };

  const tilts = irs.map((ir) => ir.features.tiltDbPerOct);
  const tiltP25 = pctl(tilts, 0.25);
  const tiltP75 = pctl(tilts, 0.75);

  const makeBandTarget = (band: BandKey, high: boolean): number => {
    const p = bandPercentiles(band);
    return high ? Math.round(p.p75 * 10) / 10 : Math.round(p.p25 * 10) / 10;
  };

  return [
    {
      name: "Featured",
      description: FEATURED_PROFILE.description,
      targetShapeDb: {
        subBass: makeBandTarget("subBass", false),
        bass: makeBandTarget("bass", false),
        lowMid: makeBandTarget("lowMid", false),
        mid: makeBandTarget("mid", false),
        highMid: makeBandTarget("highMid", true),
        presence: makeBandTarget("presence", true),
        air: makeBandTarget("air", true),
      },
      targetTiltDbPerOct: Math.round(tiltP25 * 10) / 10,
    },
    {
      name: "Body",
      description: BODY_PROFILE.description,
      targetShapeDb: {
        subBass: makeBandTarget("subBass", true),
        bass: makeBandTarget("bass", true),
        lowMid: makeBandTarget("lowMid", true),
        mid: makeBandTarget("mid", true),
        highMid: makeBandTarget("highMid", false),
        presence: makeBandTarget("presence", false),
        air: makeBandTarget("air", false),
      },
      targetTiltDbPerOct: Math.round(tiltP75 * 10) / 10,
    },
  ];
}

function shapeDeviations(features: TonalFeatures, profile: PreferenceProfile): MatchResult["deviations"] {
  const devs: MatchResult["deviations"] = [];
  for (const k of BAND_KEYS) {
    const actual = features.bandsShapeDb[k];
    const target = profile.targetShapeDb[k];
    const diff = actual - target;
    if (Math.abs(diff) > 1.5) {
      devs.push({ band: k, direction: diff > 0 ? "high" : "low", amount: Math.round(Math.abs(diff) * 10) / 10 });
    }
  }
  const tiltDiff = features.tiltDbPerOct - profile.targetTiltDbPerOct;
  if (Math.abs(tiltDiff) > 1) {
    devs.push({ band: "tilt", direction: tiltDiff > 0 ? "high" : "low", amount: Math.round(Math.abs(tiltDiff) * 10) / 10 });
  }
  return devs;
}

export function scoreAgainstProfile(features: TonalFeatures, profile: PreferenceProfile): MatchResult {
  const dist = scoreBlend(features, profile.targetShapeDb, profile.targetTiltDbPerOct, profile.weights);
  const score = distanceToScore(dist);
  const label = scoreToLabel(score);
  const deviations = shapeDeviations(features, profile);

  let summary: string;
  if (label === "strong") {
    summary = `Strong ${profile.name} match`;
  } else if (label === "close") {
    const topDev = [...deviations].sort((a, b) => b.amount - a.amount)[0];
    summary = topDev
      ? `Near ${profile.name} — ${topDev.band} ${topDev.direction === "high" ? "above" : "below"} target`
      : `Near ${profile.name}`;
  } else if (label === "partial") {
    summary = `Partial ${profile.name} — ${deviations.length} bands off target`;
  } else {
    summary = `Outside ${profile.name} range`;
  }

  return { profile: profile.name, score, label, deviations, summary };
}

export function scoreAgainstAllProfiles(features: TonalFeatures, profiles: PreferenceProfile[] = DEFAULT_PROFILES) {
  const results = profiles.map((p) => scoreAgainstProfile(features, p));
  const best = results.reduce((a, b) => (a.score > b.score ? a : b));
  return { results, best };
}

export function scoreWithIntent(
  features: TonalFeatures,
  profiles: PreferenceProfile[] = DEFAULT_PROFILES,
  intent?: { role: ShotIntentRole; confidence: number }
): { results: MatchResult[]; best: MatchResult; intentApplied: boolean } {
  const results = profiles.map((p) => scoreAgainstProfile(features, p));

  if (!intent || intent.role === "neutral" || intent.confidence <= 0) {
    const best = results.reduce((a, b) => (a.score > b.score ? a : b));
    return { results, best, intentApplied: false };
  }

  const intentBonus = Math.round(8 * intent.confidence);
  const adjusted = results.map((r) => {
    const profileRole = r.profile === "Featured" ? "featured" : r.profile === "Body" ? "body" : "neutral";
    if (profileRole === intent.role) {
      const boosted = Math.min(100, r.score + intentBonus);
      return { ...r, score: boosted, summary: r.summary + " (intended)" };
    }
    return r;
  });

  const best = adjusted.reduce((a, b) => (a.score > b.score ? a : b));
  return { results: adjusted, best, intentApplied: true };
}

export function scoreBlendQuality(features: TonalFeatures, profiles: PreferenceProfile[] = DEFAULT_PROFILES): {
  results: MatchResult[];
  blendScore: number;
  blendLabel: MatchResult["label"];
  blendSummary: string;
} {
  const results = profiles.map((p) => scoreAgainstProfile(features, p));
  const avg = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const blendScore = Math.round(avg);
  const blendLabel = scoreToLabel(blendScore);
  const blendSummary = blendLabel === "strong" ? "Strong usable blend"
    : blendLabel === "close" ? "Good usable blend"
    : blendLabel === "partial" ? "Partial blend — some bands off target"
    : "Weak blend";
  return { results, blendScore, blendLabel, blendSummary };
}

export function findFoundationIR(
  irs: { filename: string; features: TonalFeatures }[],
  profiles: PreferenceProfile[] = DEFAULT_PROFILES
): FoundationScore[] {
  if (irs.length === 0) return [];

  const bodyProfile = profiles.find((p) => p.name === "Body") || profiles[1];
  const featuredProfile = profiles.find((p) => p.name === "Featured") || profiles[0];

  const scored = irs.map((ir) => {
    const bodyMatch = scoreAgainstProfile(ir.features, bodyProfile);
    const featuredMatch = scoreAgainstProfile(ir.features, featuredProfile);

    const intent = inferShotIntentFromFilename(ir.filename);
    const reasons: string[] = [];
    if (bodyMatch.label === "strong") reasons.push("Strong Body match");
    else if (bodyMatch.label === "close") reasons.push("Close Body match");

    const shape = ir.features.bandsShapeDb;
    if (shape.subBass < -15 && shape.bass < -8) reasons.push("Tight low end");
    if (shape.lowMid < -2) reasons.push("Clean low-mids");
    if (Math.abs(shape.mid - bodyProfile.targetShapeDb.mid) < 2) reasons.push("Mid near Body target");
    if (Math.abs(shape.highMid - bodyProfile.targetShapeDb.highMid) < 2) reasons.push("HiMid in sweet spot");

    if (shape.subBass > -5) reasons.push("Low end too loose");
    if (shape.lowMid > 3) reasons.push("Muddy low-mids");
    if (bodyMatch.label === "miss") reasons.push("Outside Body range");

    let intentBonus = 0;
    if (intent.role === "body" && intent.confidence > 0) {
      intentBonus = Math.round(6 * intent.confidence);
      reasons.push(`Intended as body (${intent.reason})`);
    } else if (intent.role === "featured" && intent.confidence > 0) {
      intentBonus = -Math.round(4 * intent.confidence);
      reasons.push(`Intended as feature — less ideal as foundation`);
    }

    const pct = ir.features.bandsPercent;
    return {
      filename: ir.filename,
      score: Math.max(0, Math.min(100, bodyMatch.score + intentBonus)),
      bodyScore: bodyMatch.score,
      featuredScore: featuredMatch.score,
      reasons,
      bands: pct,
      ratio: pct.mid > 0 ? Math.round((pct.highMid / pct.mid) * 100) / 100 : 0,
      rank: 0,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  scored.forEach((s, i) => { s.rank = i + 1; });
  return scored;
}

export interface BlendPartnerScore {
  filename: string;
  bands: TonalBands;
  bestBlendScore: number;
  bestBlendLabel: MatchResult["label"];
  bestBlendProfile: string;
  bestRatio: { label: string; base: number; feature: number };
  bestBlendBands: TonalBands;
  rank: number;
}

export function rankBlendPartners(
  baseIR: { features: TonalFeatures },
  candidates: { filename: string; features: TonalFeatures }[],
  ratios: { label: string; base: number; feature: number }[] = [
    { label: "70/30", base: 0.7, feature: 0.3 },
    { label: "60/40", base: 0.6, feature: 0.4 },
    { label: "50/50", base: 0.5, feature: 0.5 },
    { label: "40/60", base: 0.4, feature: 0.6 },
    { label: "30/70", base: 0.3, feature: 0.7 },
  ],
  profiles: PreferenceProfile[] = DEFAULT_PROFILES,
  learned?: LearnedProfileData
): BlendPartnerScore[] {
  if (candidates.length === 0) return [];

  const scored = candidates.map((cand) => {
    let bestScore = -1;
    let bestLabel: MatchResult["label"] = "miss";
    let bestRatio = ratios[0];
    let bestBands: TonalBands = cand.features.bandsPercent;

    for (const r of ratios) {
      const blended = blendFeatures(baseIR.features, cand.features, r.base, r.feature);
      const bq = learned && learned.avoidZones.length > 0
        ? scoreBlendWithAvoidPenalty(blended, profiles, learned)
        : scoreBlendQuality(blended, profiles);
      if (bq.blendScore > bestScore) {
        bestScore = bq.blendScore;
        bestLabel = bq.blendLabel;
        bestRatio = r;
        bestBands = blended.bandsPercent;
      }
    }

    return {
      filename: cand.filename,
      bands: cand.features.bandsPercent,
      bestBlendScore: bestScore,
      bestBlendLabel: bestLabel,
      bestBlendProfile: "Blend",
      bestRatio: bestRatio,
      bestBlendBands: bestBands,
      rank: 0,
    };
  });

  scored.sort((a, b) => b.bestBlendScore - a.bestBlendScore);
  scored.forEach((s, i) => { s.rank = i + 1; });
  return scored;
}

export interface SuggestedPairing {
  baseFilename: string;
  featureFilename: string;
  blendBands: TonalBands;
  bestMatch: MatchResult;
  blendScore: number;
  blendLabel: MatchResult["label"];
  score: number;
  rank: number;
  suggestedRatio?: { base: number; feature: number };
}

interface GearScore { loved: number; liked: number; noped: number; net: number }
export interface TonalProfile {
  subBass: number; bass: number; lowMid: number; mid: number; highMid: number; presence: number; ratio: number;
  sampleSize: number;
}
export interface TonalDescriptor {
  label: string;
  direction: "high" | "low";
  band: string;
  delta: number;
}
export interface GearTonalEntry {
  name: string;
  score: GearScore;
  tonal: TonalProfile | null;
  descriptors: TonalDescriptor[];
}
export interface GearComboEntry {
  combo: string;
  tonal: TonalProfile;
  descriptors: TonalDescriptor[];
  sampleSize: number;
  sentiment: number;
}
export interface GearInsights {
  mics: GearTonalEntry[];
  speakers: GearTonalEntry[];
  positions: GearTonalEntry[];
  combos: GearComboEntry[];
}

export type ProfileAdjustment = {
  mid: { shift: number; confidence: number };
  highMid: { shift: number; confidence: number };
  presence: { shift: number; confidence: number };
  ratio: { shift: number; confidence: number };
};

export interface RatioPreference {
  preferredRatio: number;
  confidence: number;
  distribution: { ratio: number; count: number; sentiment: number }[];
  perProfile?: Record<string, { preferredRatio: number; confidence: number }>;
}

export interface LearnedProfileData {
  signalCount: number;
  likedCount: number;
  nopedCount: number;
  learnedAdjustments: ProfileAdjustment | null;
  perProfileAdjustments?: Record<string, ProfileAdjustment> | null;
  avoidZones: { band: string; direction: string; threshold: number }[];
  status: "no_data" | "learning" | "confident" | "mastered";
  courseCorrections: string[];
  gearInsights?: GearInsights | null;
  ratioPreference?: RatioPreference | null;
  tonalSummary?: string | null;
}

export function applyLearnedAdjustments(
  profiles: PreferenceProfile[],
  learned: LearnedProfileData
): PreferenceProfile[] {
  if (!learned.learnedAdjustments || learned.status === "no_data") return profiles;

  const PCT_TO_DB = 0.3;

  return profiles.map((p) => {
    const adj = learned.perProfileAdjustments?.[p.name] ?? learned.learnedAdjustments!;

    const shifted = { ...p.targetShapeDb };
    shifted.mid = Math.round((shifted.mid + adj.mid.shift * adj.mid.confidence * PCT_TO_DB) * 10) / 10;
    shifted.highMid = Math.round((shifted.highMid + adj.highMid.shift * adj.highMid.confidence * PCT_TO_DB) * 10) / 10;
    shifted.presence = Math.round((shifted.presence + adj.presence.shift * adj.presence.confidence * PCT_TO_DB) * 10) / 10;
    const tiltShift = adj.ratio.shift * adj.ratio.confidence * 1.5;

    return {
      ...p,
      targetShapeDb: shifted,
      targetTiltDbPerOct: Math.round((p.targetTiltDbPerOct + tiltShift) * 10) / 10,
    };
  });
}

export function scoreWithAvoidPenalty(
  features: TonalFeatures,
  profiles: PreferenceProfile[],
  learned: LearnedProfileData
) {
  const base = scoreAgainstAllProfiles(features, profiles);
  const penalty = computeAvoidPenalty(features, learned);

  if (penalty > 0) {
    const adjusted = { ...base.best, score: Math.max(0, Math.round(base.best.score - penalty)) };
    adjusted.label = scoreToLabel(adjusted.score);
    return { results: base.results, best: adjusted };
  }
  return base;
}

function computeAvoidPenalty(features: TonalFeatures, learned: LearnedProfileData): number {
  const shape = features.bandsShapeDb;
  let penalty = 0;
  for (const zone of learned.avoidZones) {
    const val = zone.band === "mid" ? shape.mid
      : zone.band === "presence" ? shape.presence
      : zone.band === "muddy_composite" ? shape.lowMid + shape.mid
      : zone.band === "tilt" ? features.tiltDbPerOct
      : 0;

    if (zone.direction === "high" && val >= zone.threshold) {
      const overshoot = val - zone.threshold;
      penalty += Math.min(5 + overshoot * 1.5, 25);
    } else if (zone.direction === "low" && val <= zone.threshold) {
      const undershoot = zone.threshold - val;
      penalty += Math.min(5 + undershoot * 1.5, 25);
    }
  }
  return penalty;
}

export function scoreBlendWithAvoidPenalty(
  features: TonalFeatures,
  profiles: PreferenceProfile[],
  learned: LearnedProfileData
): { blendScore: number; blendLabel: MatchResult["label"] } {
  const base = scoreBlendQuality(features, profiles);
  const penalty = computeAvoidPenalty(features, learned);
  const adjusted = Math.max(0, base.blendScore - Math.round(penalty));
  const blendLabel = scoreToLabel(adjusted);
  return { blendScore: adjusted, blendLabel };
}

export function scoreIndividualIR(
  features: TonalFeatures,
  profiles: PreferenceProfile[],
  learned?: LearnedProfileData
) {
  const results = profiles.map((p) => scoreAgainstProfile(features, p));
  const best = results.reduce((a, b) => (a.score > b.score ? a : b));

  let penalty = 0;
  if (learned && learned.avoidZones) {
    penalty = computeAvoidPenalty(features, learned) * 0.5;
  }

  if (penalty > 0) {
    const adjusted = { ...best, score: Math.max(0, Math.round(best.score - penalty)) };
    adjusted.label = scoreToLabel(adjusted.score);
    return { results, best: adjusted };
  }
  return { results, best };
}

export function suggestPairings(
  irs: { filename: string; features: TonalFeatures }[],
  profiles: PreferenceProfile[] = DEFAULT_PROFILES,
  count: number = 3,
  learned?: LearnedProfileData,
  excludePairs?: Set<string>,
  exposureCounts?: Map<string, number>
): SuggestedPairing[] {
  if (irs.length < 2) return [];

  const RATIO_GRID = [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7];
  const snapRatio = (v: number) => RATIO_GRID.reduce((best, g) => Math.abs(g - v) < Math.abs(best - v) ? g : best, 0.5);
  const ratiosToTry: { base: number; feature: number }[] = [{ base: 0.5, feature: 0.5 }];
  if (learned?.ratioPreference && learned.ratioPreference.confidence >= 0.3) {
    const pr = snapRatio(learned.ratioPreference.preferredRatio);
    if (pr !== 0.5) {
      ratiosToTry.push({ base: pr, feature: Math.round((1 - pr) * 100) / 100 });
    }
  }

  const maxExposure = exposureCounts
    ? Math.max(...Array.from(exposureCounts.values()), 1)
    : 0;

  const allCombos: SuggestedPairing[] = [];

  for (let i = 0; i < irs.length; i++) {
    for (let j = 0; j < irs.length; j++) {
      if (i === j) continue;
      if (excludePairs) {
        const ck = [irs[i].filename, irs[j].filename].sort().join("||");
        if (excludePairs.has(ck)) continue;
      }

      let bestBlendFeatures: TonalFeatures | null = null;
      let bestBQ: { blendScore: number; blendLabel: MatchResult["label"] } | null = null;
      let bestResult: ReturnType<typeof scoreAgainstAllProfiles> | null = null;
      let bestRatioUsed = ratiosToTry[0];

      for (const r of ratiosToTry) {
        const blended = blendFeatures(irs[i].features, irs[j].features, r.base, r.feature);
        const bq = learned
          ? scoreBlendWithAvoidPenalty(blended, profiles, learned)
          : scoreBlendQuality(blended, profiles);
        if (!bestBQ || bq.blendScore > bestBQ.blendScore) {
          bestBQ = { blendScore: bq.blendScore, blendLabel: bq.blendLabel };
          bestBlendFeatures = blended;
          bestRatioUsed = r;
          bestResult = scoreAgainstAllProfiles(blended, profiles);
        }
      }

      if (!bestBlendFeatures || !bestBQ || !bestResult) continue;

      let noveltyBoost = 0;
      if (exposureCounts && maxExposure > 0) {
        const baseExp = exposureCounts.get(irs[i].filename) ?? 0;
        const featExp = exposureCounts.get(irs[j].filename) ?? 0;
        const minExp = Math.min(baseExp, featExp);
        const underExposure = 1 - (minExp / maxExposure);
        noveltyBoost = underExposure * 15;
      }

      const baseIntent = inferShotIntentFromFilename(irs[i].filename);
      const featIntent = inferShotIntentFromFilename(irs[j].filename);
      let intentAlignBoost = 0;
      if (baseIntent.role === "body" && featIntent.role === "featured") {
        intentAlignBoost = Math.round(5 * Math.min(baseIntent.confidence, featIntent.confidence));
      } else if (baseIntent.role === "featured" && featIntent.role === "body") {
        intentAlignBoost = -Math.round(3 * Math.min(baseIntent.confidence, featIntent.confidence));
      }

      allCombos.push({
        baseFilename: irs[i].filename,
        featureFilename: irs[j].filename,
        blendBands: bestBlendFeatures.bandsPercent,
        bestMatch: bestResult.best,
        blendScore: bestBQ.blendScore,
        blendLabel: bestBQ.blendLabel,
        score: bestBQ.blendScore + noveltyBoost + intentAlignBoost,
        rank: 0,
        suggestedRatio: bestRatioUsed.base !== 0.5 ? bestRatioUsed : undefined,
      });
    }
  }

  allCombos.sort((a, b) => b.score - a.score);

  const usedPairs = new Set<string>();
  const dedupedCombos: SuggestedPairing[] = [];
  for (const combo of allCombos) {
    const pk = [combo.baseFilename, combo.featureFilename].sort().join("||");
    if (usedPairs.has(pk)) continue;
    usedPairs.add(pk);
    dedupedCombos.push(combo);
  }

  if (dedupedCombos.length <= count) {
    dedupedCombos.forEach((s, i) => { s.rank = i + 1; });
    return dedupedCombos;
  }

  const selected: SuggestedPairing[] = [];
  const irUsage = new Map<string, number>();

  const trackUsage = (combo: SuggestedPairing) => {
    irUsage.set(combo.baseFilename, (irUsage.get(combo.baseFilename) ?? 0) + 1);
    irUsage.set(combo.featureFilename, (irUsage.get(combo.featureFilename) ?? 0) + 1);
  };

  const maxAppearances = Math.max(2, Math.ceil(count / Math.max(irs.length - 1, 1)));

  const isOverused = (combo: SuggestedPairing) => {
    const baseUse = irUsage.get(combo.baseFilename) ?? 0;
    const featUse = irUsage.get(combo.featureFilename) ?? 0;
    return baseUse >= maxAppearances || featUse >= maxAppearances;
  };

  const isDuplicate = (combo: SuggestedPairing) =>
    selected.some((s) => s.baseFilename === combo.baseFilename && s.featureFilename === combo.featureFilename);

  const profileGroups: Record<string, SuggestedPairing[]> = {};
  for (const combo of dedupedCombos) {
    const pName = combo.bestMatch.profile;
    if (!profileGroups[pName]) profileGroups[pName] = [];
    profileGroups[pName].push(combo);
  }
  const profileNames = Object.keys(profileGroups);

  selected.push(dedupedCombos[0]);
  trackUsage(dedupedCombos[0]);

  if (profileNames.length > 1) {
    const firstProfile = selected[0].bestMatch.profile;
    for (const pName of profileNames) {
      if (pName === firstProfile) continue;
      const best = profileGroups[pName][0];
      if (best && best.score >= 50 && !isDuplicate(best)) {
        selected.push(best);
        trackUsage(best);
        break;
      }
    }
  }

  if (exposureCounts && exposureCounts.size > 0 && selected.length < count) {
    const uniqueFilenames = Array.from(new Set(irs.map((ir) => ir.filename)));
    const unexposed = uniqueFilenames.filter((f) => (exposureCounts.get(f) ?? 0) === 0);
    if (unexposed.length > 0) {
      const novelSlots = Math.min(count - 1, Math.ceil(unexposed.length / 2));
      let novelAdded = 0;
      for (const combo of dedupedCombos) {
        if (novelAdded >= novelSlots || selected.length >= count) break;
        if (isDuplicate(combo) || isOverused(combo)) continue;
        if (unexposed.includes(combo.baseFilename) || unexposed.includes(combo.featureFilename)) {
          selected.push(combo);
          trackUsage(combo);
          novelAdded++;
        }
      }
    }
  }

  for (const combo of dedupedCombos) {
    if (selected.length >= count) break;
    if (isDuplicate(combo) || isOverused(combo)) continue;
    selected.push(combo);
    trackUsage(combo);
  }

  if (selected.length < count) {
    for (const combo of dedupedCombos) {
      if (selected.length >= count) break;
      if (isDuplicate(combo)) continue;
      selected.push(combo);
      trackUsage(combo);
    }
  }

  selected.sort((a, b) => b.score - a.score);
  selected.forEach((s, i) => { s.rank = i + 1; });
  return selected.slice(0, count);
}

export const TASTE_AXES = [
  { name: "Brightness", compute: (f: TonalFeatures) => (f.bandsShapeDb.presence + f.bandsShapeDb.highMid) - (f.bandsShapeDb.bass + f.bandsShapeDb.subBass), label: ["Dark", "Bright"] },
  { name: "Body", compute: (f: TonalFeatures) => (f.bandsShapeDb.bass + f.bandsShapeDb.lowMid) - (f.bandsShapeDb.highMid + f.bandsShapeDb.presence), label: ["Thin", "Full"] },
  { name: "Aggression", compute: (f: TonalFeatures) => f.bandsShapeDb.presence - f.bandsShapeDb.mid, label: ["Smooth", "Aggressive"] },
  { name: "Warmth", compute: (f: TonalFeatures) => (f.bandsShapeDb.lowMid + f.bandsShapeDb.bass) - (f.bandsShapeDb.mid + f.bandsShapeDb.highMid), label: ["Cool", "Warm"] },
  { name: "Mid Focus", compute: (f: TonalFeatures) => (f.bandsShapeDb.mid + f.bandsShapeDb.lowMid) - (f.bandsShapeDb.bass + f.bandsShapeDb.presence), label: ["Scooped", "Mid-Focused"] },
  { name: "Balance", compute: (f: TonalFeatures) => { const s = f.bandsShapeDb; const avg = (s.subBass + s.bass + s.lowMid + s.mid + s.highMid + s.presence + s.air) / 7; return -Math.abs(s.bass - avg) - Math.abs(s.mid - avg) - Math.abs(s.presence - avg); }, label: ["Hyped", "Balanced"] },
  { name: "Tightness", compute: (f: TonalFeatures) => (f.bandsShapeDb.lowMid + f.bandsShapeDb.mid) - (f.bandsShapeDb.subBass + f.bandsShapeDb.bass), label: ["Loose", "Tight"] },
  { name: "Presence", compute: (f: TonalFeatures) => f.bandsShapeDb.highMid + f.bandsShapeDb.presence - (f.bandsShapeDb.lowMid + f.bandsShapeDb.mid), label: ["Recessed", "Forward"] },
  { name: "Air", compute: (f: TonalFeatures) => f.bandsShapeDb.air - (f.bandsShapeDb.bass + f.bandsShapeDb.lowMid + f.bandsShapeDb.mid) / 3, label: ["Closed", "Airy"] },
] as const;

export interface TasteCheckPick {
  pickedBands: TonalBands;
  rejectedBands: TonalBands;
  axisName: string;
  axisValuePicked: number;
  axisValueRejected: number;
}

export interface TasteCheckRoundResult {
  options: SuggestedPairing[];
  pickedIndex: number;
  axisName: string;
  roundType: "quad" | "binary";
}

export type TasteConfidence = "high" | "moderate" | "low";

export function getTasteConfidence(learned?: LearnedProfileData): TasteConfidence {
  if (!learned || learned.status === "no_data") return "low";
  if (learned.status === "mastered" || learned.status === "confident") return "high";
  if (learned.signalCount >= 8) return "moderate";
  if (learned.signalCount >= 4 && learned.likedCount >= 2) return "moderate";
  return "low";
}

export function getTasteCheckRounds(confidence: TasteConfidence, poolSize: number): number {
  const maxByPool = Math.min(7, Math.max(2, Math.floor(poolSize / 2)));
  if (confidence === "high") return Math.min(maxByPool, 4);
  if (confidence === "moderate") return Math.min(maxByPool, 5);
  return Math.min(maxByPool, 7);
}

export function shouldContinueTasteCheck(
  confidence: TasteConfidence,
  history: TasteCheckRoundResult[],
  learned?: LearnedProfileData,
): boolean {
  if (history.length === 0) return true;
  const hardCap = confidence === "high" ? 4 : confidence === "moderate" ? 5 : 7;
  if (history.length >= hardCap) return false;

  const binaryRounds = history.filter((h) => h.roundType === "binary");

  if (confidence === "high") {
    if (binaryRounds.length < 2) return true;
    if (!learned || !learned.learnedAdjustments) {
      return binaryRounds.length < 3;
    }
    let agreements = 0;
    let measurable = 0;
    for (const h of binaryRounds) {
      if (h.pickedIndex < 0) continue;
      const axis = TASTE_AXES.find((a) => a.name === h.axisName);
      if (!axis) continue;
      const pickedVal = axis.compute(featuresFromBands(h.options[h.pickedIndex].blendBands));
      const otherVals = h.options
        .filter((_, i) => i !== h.pickedIndex)
        .map((o) => axis.compute(featuresFromBands(o.blendBands)));
      const avgOther = otherVals.reduce((a, b) => a + b, 0) / otherVals.length;
      const userDirection = pickedVal - avgOther;

      const profileTarget = getProfileAxisTarget(axis, learned);
      if (profileTarget === null || Math.abs(profileTarget) < 0.5) continue;
      measurable++;
      const profileAgrees = (profileTarget > 0 && userDirection > 0) || (profileTarget < 0 && userDirection < 0);
      if (profileAgrees) agreements++;
    }
    if (measurable === 0) return binaryRounds.length < 3;
    return agreements / measurable < 0.8;
  }

  const minRounds = confidence === "moderate" ? 2 : 3;
  if (history.length < minRounds) return true;

  const axisCounts: Record<string, number> = {};
  for (const h of history) {
    axisCounts[h.axisName] = (axisCounts[h.axisName] ?? 0) + 1;
  }
  const exploredAxes = Object.keys(axisCounts).length;
  const hasRepeat = Object.values(axisCounts).some((c) => c >= 2);

  if (exploredAxes >= 2 && hasRepeat) {
    let consistent = 0;
    let total = 0;
    for (const axisName of Object.keys(axisCounts)) {
      const axisHistory = history.filter((h) => h.axisName === axisName);
      if (axisHistory.length < 2) continue;
      const axis = TASTE_AXES.find((a) => a.name === axisName);
      if (!axis) continue;
      const validAxisHistory = axisHistory.filter((h) => h.pickedIndex >= 0);
      if (validAxisHistory.length < 2) continue;
      const directions = validAxisHistory.map((h) => {
        const pv = axis.compute(featuresFromBands(h.options[h.pickedIndex].blendBands));
        const others = h.options.filter((_, i) => i !== h.pickedIndex).map((o) => axis.compute(featuresFromBands(o.blendBands)));
        return pv - others.reduce((a, b) => a + b, 0) / others.length;
      });
      const allSameDir = directions.every((d) => d > 0) || directions.every((d) => d <= 0);
      if (allSameDir) consistent++;
      total++;
    }
    if (total > 0 && consistent === total) return false;
  }

  return true;
}

function getProfileAxisTarget(
  axis: typeof TASTE_AXES[number],
  learned: LearnedProfileData
): number | null {
  if (!learned.learnedAdjustments) return null;
  const adj = learned.learnedAdjustments;
  const getWeighted = (band: string) => {
    const entry = (adj as any)[band];
    if (!entry) return 0;
    return (entry.shift ?? 0) * (entry.confidence ?? 1);
  };
  if (axis.name === "Brightness") {
    return getWeighted("presence") + getWeighted("highMid");
  }
  if (axis.name === "Body") {
    return -getWeighted("mid");
  }
  if (axis.name === "Aggression") {
    return getWeighted("presence") - getWeighted("mid");
  }
  if (axis.name === "Warmth") {
    return -(getWeighted("mid") + getWeighted("highMid"));
  }
  return null;
}

function pairKeyFromPairing(p: SuggestedPairing): string {
  return [p.baseFilename, p.featureFilename].sort().join("||");
}

function extractSessionShownPairs(history?: TasteCheckRoundResult[]): Set<string> {
  const shown = new Set<string>();
  if (!history) return shown;
  for (const round of history) {
    for (const opt of round.options) {
      shown.add(pairKeyFromPairing(opt));
    }
  }
  return shown;
}

function extractSessionIRExposure(history?: TasteCheckRoundResult[]): Map<string, number> {
  const counts = new Map<string, number>();
  if (!history) return counts;
  for (const round of history) {
    for (const opt of round.options) {
      counts.set(opt.baseFilename, (counts.get(opt.baseFilename) ?? 0) + 1);
      counts.set(opt.featureFilename, (counts.get(opt.featureFilename) ?? 0) + 1);
    }
  }
  return counts;
}

export function pickTasteCheckCandidates(
  irs: { filename: string; features: TonalFeatures }[],
  profiles: PreferenceProfile[] = DEFAULT_PROFILES,
  learned?: LearnedProfileData,
  excludePairs?: Set<string>,
  history?: TasteCheckRoundResult[],
  modeOverride?: "acquisition" | "tester" | "learning",
  intent?: "rhythm" | "lead" | "clean"
): { candidates: SuggestedPairing[]; axisName: string; roundType: "quad" | "binary"; axisLabels: [string, string]; confidence: TasteConfidence } | null {
  if (irs.length < 2) return null;

  const confidence = getTasteConfidence(learned);
  const forceBinary = modeOverride === "tester" || (modeOverride !== "acquisition" && confidence === "high");

  const sessionShown = extractSessionShownPairs(history);
  const sessionExposure = extractSessionIRExposure(history);
  const maxSessionExposure = sessionExposure.size > 0
    ? Math.max(...Array.from(sessionExposure.values()), 1) : 0;

  const allCombos: (SuggestedPairing & { _features: TonalFeatures })[] = [];
  for (let i = 0; i < irs.length; i++) {
    for (let j = i + 1; j < irs.length; j++) {
      const ck = [irs[i].filename, irs[j].filename].sort().join("||");
      if (excludePairs && excludePairs.has(ck)) continue;
      if (sessionShown.has(ck)) continue;
      const blended = blendFeatures(irs[i].features, irs[j].features, 0.5, 0.5);
      const result = learned
        ? scoreWithAvoidPenalty(blended, profiles, learned)
        : scoreAgainstAllProfiles(blended, profiles);
      const bq = learned
        ? scoreBlendWithAvoidPenalty(blended, profiles, learned)
        : scoreBlendQuality(blended, profiles);

      let exposurePenalty = 0;
      if (maxSessionExposure > 0) {
        const baseExp = sessionExposure.get(irs[i].filename) ?? 0;
        const featExp = sessionExposure.get(irs[j].filename) ?? 0;
        exposurePenalty = ((baseExp + featExp) / (maxSessionExposure * 2)) * 10;
      }

      allCombos.push({
        baseFilename: irs[i].filename,
        featureFilename: irs[j].filename,
        blendBands: blended.bandsPercent,
        bestMatch: result.best,
        blendScore: bq.blendScore,
        blendLabel: bq.blendLabel,
        score: bq.blendScore - exposurePenalty,
        rank: 0,
        _features: blended,
      });
    }
  }

  if (allCombos.length < 2) return null;

  const round = history?.length ?? 0;
  const exploredAxes = new Set(history?.map((h) => h.axisName) ?? []);

  const axisWithSpread = TASTE_AXES.map((axis) => {
    const values = allCombos.map((c) => axis.compute(c._features));
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { axis, spread: max - min, min, max };
  }).sort((a, b) => {
    const bonus = (name: string) => {
      if (!intent) return 0;
      const pref: Record<string, string[]> = {
        rhythm: ["Tightness", "Body", "Mid Focus", "Aggression", "Balance"],
        lead: ["Presence", "Aggression", "Air", "Brightness", "Balance"],
        clean: ["Balance", "Air", "Warmth", "Body", "Brightness"],
      };
      const list = pref[intent] ?? [];
      const idx = list.indexOf(name);
      return idx === -1 ? 0 : (list.length - idx) * 0.0005;
    };
    const aScore = a.spread + bonus(a.axis.name);
    const bScore = b.spread + bonus(b.axis.name);
    return bScore - aScore;
  });

  let chosenAxis: typeof axisWithSpread[0];
  const lastAxisName = history && history.length > 0 ? history[history.length - 1].axisName : null;

  const quadRounds = forceBinary ? 0 : confidence === "moderate" ? 1 : 2;

  if (!forceBinary && round < quadRounds && allCombos.length >= 4) {
    const unexplored = axisWithSpread.filter((a) => !exploredAxes.has(a.axis.name));
    chosenAxis = unexplored.length > 0 ? unexplored[0] : axisWithSpread[0];
    const axisCompute = chosenAxis.axis.compute;
    const scored = allCombos.map((c) => ({ pairing: c as SuggestedPairing, axisVal: axisCompute(c._features) }));
    scored.sort((a, b) => a.axisVal - b.axisVal);
    const candidates = pickSpreadCandidates(scored, 4, round);
    return {
      candidates: candidates.map((c) => c.pairing),
      axisName: chosenAxis.axis.name,
      roundType: "quad" as const,
      axisLabels: [...chosenAxis.axis.label] as [string, string],
      confidence,
    };
  }

  const axisCounts: Record<string, number> = {};
  for (const h of (history ?? [])) {
    axisCounts[h.axisName] = (axisCounts[h.axisName] ?? 0) + 1;
  }

  const unexplored = axisWithSpread.filter((a) => !exploredAxes.has(a.axis.name));
  if (unexplored.length > 0 && (!lastAxisName || round % 2 === 0)) {
    chosenAxis = unexplored[0];
  } else if (lastAxisName) {
    const leastExplored = axisWithSpread
      .filter((a) => a.spread > 0)
      .sort((a, b) => (axisCounts[a.axis.name] ?? 0) - (axisCounts[b.axis.name] ?? 0));
    if (leastExplored.length > 0 && round % 3 !== 2) {
      chosenAxis = leastExplored[0];
    } else {
      chosenAxis = axisWithSpread.find((a) => a.axis.name === lastAxisName) ?? axisWithSpread[0];
    }
  } else {
    chosenAxis = axisWithSpread[0];
  }

  const axisCompute = chosenAxis.axis.compute;

  const scoredWithQuality = allCombos
    .map((c) => ({ pairing: c as SuggestedPairing, axisVal: axisCompute(c._features), quality: c.score }))
    .sort((a, b) => a.axisVal - b.axisVal);

  if (scoredWithQuality.length < 2) return null;

  const qualityThreshold = Math.max(
    scoredWithQuality[Math.floor(scoredWithQuality.length * 0.3)]?.quality ?? -Infinity,
    scoredWithQuality.reduce((best, s) => Math.max(best, s.quality), -Infinity) - 25
  );
  const qualityFiltered = scoredWithQuality.filter((s) => s.quality >= qualityThreshold);
  const scored = qualityFiltered.length >= 4 ? qualityFiltered : scoredWithQuality;

  const preferredDir = getPreferredDirection(history ?? [], chosenAxis.axis.name, axisCompute);
  const timesOnAxis = axisCounts[chosenAxis.axis.name] ?? 0;

  let pool = scored;
  if (timesOnAxis > 0) {
    const pickedVals = (history ?? [])
      .filter((h) => h.axisName === chosenAxis.axis.name && h.pickedIndex >= 0)
      .map((h) => axisCompute(featuresFromBands(h.options[h.pickedIndex].blendBands)));
    if (pickedVals.length > 0 && preferredDir !== null) {
      const avgPicked = pickedVals.reduce((a, b) => a + b, 0) / pickedVals.length;
      const narrowFactor = Math.pow(0.5, timesOnAxis);
      const axisRange = scored[scored.length - 1].axisVal - scored[0].axisVal;
      const halfSpan = (axisRange / 2) * narrowFactor;
      const narrowed = scored.filter((s) =>
        s.axisVal >= avgPicked - halfSpan && s.axisVal <= avgPicked + halfSpan
      );
      if (narrowed.length >= 2) pool = narrowed;
    } else {
      const narrowFactor = Math.pow(0.7, timesOnAxis);
      const axisRange = scored[scored.length - 1].axisVal - scored[0].axisVal;
      const center = (scored[0].axisVal + scored[scored.length - 1].axisVal) / 2;
      const halfSpan = (axisRange / 2) * narrowFactor;
      const narrowed = scored.filter((s) =>
        s.axisVal >= center - halfSpan && s.axisVal <= center + halfSpan
      );
      if (narrowed.length >= 2) pool = narrowed;
    }
  }

  const candidates = pickSpreadCandidates(pool, 2, round);
  const [lo, hi] = candidates[0].axisVal <= candidates[1].axisVal
    ? [candidates[0], candidates[1]]
    : [candidates[1], candidates[0]];
  return {
    candidates: [lo.pairing, hi.pairing],
    axisName: chosenAxis.axis.name,
    roundType: "binary" as const,
    axisLabels: [...chosenAxis.axis.label] as [string, string],
    confidence,
  };
}

function getPreferredDirection(
  history: TasteCheckRoundResult[],
  axisName: string,
  axisCompute: (f: TonalFeatures) => number
): number | null {
  const relevant = history.filter((h) => h.axisName === axisName && h.pickedIndex >= 0);
  if (relevant.length === 0) return null;
  let dirSum = 0;
  for (const h of relevant) {
    const picked = h.options[h.pickedIndex];
    const pickedVal = axisCompute(featuresFromBands(picked.blendBands));
    const otherVals = h.options.filter((_, i) => i !== h.pickedIndex).map((o) => axisCompute(featuresFromBands(o.blendBands)));
    const avgOther = otherVals.reduce((a, b) => a + b, 0) / otherVals.length;
    dirSum += pickedVal - avgOther;
  }
  return dirSum / relevant.length;
}

function pickSpreadCandidates(
  sorted: { pairing: SuggestedPairing; axisVal: number }[],
  count: number,
  roundIndex: number
): { pairing: SuggestedPairing; axisVal: number }[] {
  if (sorted.length <= count) return sorted;

  const fullRange = sorted[sorted.length - 1].axisVal - sorted[0].axisVal;
  if (fullRange === 0) return sorted.slice(0, count);

  if (count === 2) {
    if (sorted.length <= 3) return [sorted[0], sorted[sorted.length - 1]];
    const q1End = Math.max(1, Math.floor(sorted.length * 0.35));
    const q3Start = Math.min(sorted.length - 2, Math.floor(sorted.length * 0.65));
    const lowPool = sorted.slice(0, q1End);
    const highPool = sorted.slice(q3Start);
    const loIdx = roundIndex % lowPool.length;
    const hiIdx = roundIndex % highPool.length;
    const lo = lowPool[loIdx];
    const hi = highPool[hiIdx];
    if (pairKeyFromPairing(lo.pairing) === pairKeyFromPairing(hi.pairing)) {
      const altHi = highPool.find((h) => pairKeyFromPairing(h.pairing) !== pairKeyFromPairing(lo.pairing));
      if (altHi) return [lo, altHi];
      const altLo = lowPool.find((l) => pairKeyFromPairing(l.pairing) !== pairKeyFromPairing(hi.pairing));
      if (altLo) return [altLo, hi];
    }
    return [lo, hi];
  }

  if (count === 4 && sorted.length >= 4) {
    const segments = 4;
    const segSize = sorted.length / segments;
    const result: typeof sorted = [];
    for (let s = 0; s < segments; s++) {
      const segStart = Math.floor(s * segSize);
      const segEnd = Math.min(sorted.length, Math.floor((s + 1) * segSize));
      const segPool = sorted.slice(segStart, segEnd);
      if (segPool.length === 0) continue;
      const idx = roundIndex % segPool.length;
      const pick = segPool[idx];
      if (!result.some((r) => pairKeyFromPairing(r.pairing) === pairKeyFromPairing(pick.pairing))) {
        result.push(pick);
      } else {
        const alt = segPool.find((p) => !result.some((r) => pairKeyFromPairing(r.pairing) === pairKeyFromPairing(p.pairing)));
        if (alt) result.push(alt);
      }
    }
    while (result.length < count && result.length < sorted.length) {
      const next = sorted.find((p) => !result.some((r) => pairKeyFromPairing(r.pairing) === pairKeyFromPairing(p.pairing)));
      if (next) result.push(next);
      else break;
    }
    return result;
  }

  const step = Math.max(1, Math.floor((sorted.length - 1) / (count - 1)));
  const result: typeof sorted = [];
  for (let i = 0; i < count && i * step < sorted.length; i++) {
    result.push(sorted[i * step]);
  }
  while (result.length < count && result.length < sorted.length) {
    const next = sorted.find((p) => !result.includes(p));
    if (next) result.push(next);
    else break;
  }
  return result;
}

const GEAR_MIC_PATTERNS: Record<string, string> = {
  "sm57": "SM57", "57": "SM57",
  "r121": "R121", "121": "R121",
  "e609": "e609", "609": "e609",
  "i5": "i5",
  "r92": "R92", "aear92": "R92",
  "m160": "M160", "160": "M160",
  "md421": "MD421", "421": "MD421",
  "md421k": "MD421K", "421k": "MD421K", "421kompakt": "MD421K", "421kmp": "MD421K",
  "md441boost": "MD441", "md441flat": "MD441", "md441": "MD441", "441": "MD441",
  "r10": "R10",
  "m88": "M88", "88": "M88",
  "pr30": "PR30",
  "e906boost": "e906", "e906presence": "e906", "e906flat": "e906", "e906": "e906",
  "m201": "M201", "201": "M201",
  "sm7b": "SM7B", "sm7": "SM7B",
  "c414": "C414", "414": "C414",
  "roswell": "Roswell", "roswelldyna": "Roswell",
};

const GEAR_SPEAKER_PATTERNS: Record<string, string> = {
  "g12m25": "G12M25", "greenback": "G12M25", "gb": "G12M25", "g12m": "G12M25",
  "v30china": "V30-China", "v30c": "V30-China", "v30": "V30-China",
  "v30blackcat": "V30-Blackcat", "blackcat": "V30-Blackcat", "v30bc": "V30-Blackcat",
  "k100": "K100", "g12k100": "K100",
  "g12t75": "G12T75", "t75": "G12T75",
  "g1265": "G12-65", "65": "G12-65", "g1265her": "G12-65", "65heri": "G12-65",
  "g12h": "G12H",
  "g12h30": "G12H30-Anniversary", "anniversary": "G12H30-Anniversary", "h30": "G12H30-Anniversary", "g12hann": "G12H30-Anniversary",
  "cream": "Celestion-Cream", "celestioncream": "Celestion-Cream",
  "ga12sc64": "GA12-SC64", "sc64": "GA12-SC64",
  "ga10sc64": "G10-SC64", "ga10": "G10-SC64", "g10sc64": "G10-SC64", "g10": "G10-SC64",
  "karnivore": "Karnivore", "karni": "Karnivore",
};

const GEAR_POSITION_PATTERNS: Record<string, string> = {
  "capedgebr": "CapEdge-Bright", "capedge_br": "CapEdge-Bright",
  "capedgedk": "CapEdge-Dark", "capedge_dk": "CapEdge-Dark",
  "capedgeconetr": "Cap-Cone Transition", "capedgeconetrn": "Cap-Cone Transition", "cap_cone_tr": "Cap-Cone Transition", "cap_cone_trn": "Cap-Cone Transition", "cone_tr": "Cap-Cone Transition", "cone_trn": "Cap-Cone Transition", "capconetr": "Cap-Cone Transition", "capconetrn": "Cap-Cone Transition", "conetr": "Cap-Cone Transition", "conetrn": "Cap-Cone Transition",
  "capoffcenter": "Cap Off-Center", "cap_offcenter": "Cap Off-Center", "offcenter": "Cap Off-Center",
  "capedge": "CapEdge", "cap_edge": "CapEdge", "edge": "CapEdge",
  "cap": "Cap", "center": "Cap",
  "cone": "Cone",
};

export function parseGearFromFilename(filename: string): { mic?: string; mic2?: string; speaker?: string; position?: string } {
  const name = filename.toLowerCase().replace('.wav', '');
  const parts = name.split(/[_\-\s]+/);
  const result: { mic?: string; mic2?: string; speaker?: string; position?: string } = {};

  const speakerKeys = Object.keys(GEAR_SPEAKER_PATTERNS).sort((a, b) => b.length - a.length);
  const micKeys = Object.keys(GEAR_MIC_PATTERNS).sort((a, b) => b.length - a.length);
  const posKeys = Object.keys(GEAR_POSITION_PATTERNS).sort((a, b) => b.length - a.length);

  for (let i = 0; i < parts.length; i++) {
    if (!result.position) {
      for (let span = Math.min(3, parts.length - i); span >= 2; span--) {
        const combo = parts.slice(i, i + span).join('');
        const pk = posKeys.find((k) => combo === k);
        if (pk) { result.position = GEAR_POSITION_PATTERNS[pk]; i += span - 1; break; }
      }
      if (result.position) continue;
    }
    const part = parts[i];
    if (!result.speaker) {
      const sk = speakerKeys.find((k) => part === k || part.startsWith(k));
      if (sk) { result.speaker = GEAR_SPEAKER_PATTERNS[sk]; continue; }
    }
    const mk = micKeys.find((k) => part === k);
    if (mk) {
      const micName = GEAR_MIC_PATTERNS[mk];
      if (!result.mic) { result.mic = micName; }
      else if (!result.mic2 && micName !== result.mic) { result.mic2 = micName; }
      continue;
    }
    if (!result.position) {
      const pk = posKeys.find((k) => part === k);
      if (pk) { result.position = GEAR_POSITION_PATTERNS[pk]; continue; }
    }
  }

  const joined = parts.join('');
  if (!result.mic) {
    for (const mk of micKeys) {
      if (joined.includes(mk)) { result.mic = GEAR_MIC_PATTERNS[mk]; break; }
    }
  }
  if (!result.mic2 && result.mic) {
    for (const mk of micKeys) {
      const micName = GEAR_MIC_PATTERNS[mk];
      if (micName !== result.mic && joined.includes(mk)) { result.mic2 = micName; break; }
    }
  }
  if (!result.speaker) {
    for (const sk of speakerKeys) {
      if (joined.includes(sk)) { result.speaker = GEAR_SPEAKER_PATTERNS[sk]; break; }
    }
  }
  if (!result.position) {
    for (const pk of posKeys) {
      if (joined.includes(pk)) { result.position = GEAR_POSITION_PATTERNS[pk]; break; }
    }
  }

  return result;
}

const SPEAKER_DISPLAY_TO_FILE_PREFIX: Record<string, string> = {
  "V30-China": "V30",
  "V30-Blackcat": "V30Blackcat",
  "G12M25": "G12M",
  "K100": "K100",
  "G12T75": "G12T75",
  "G12-65": "G1265",
  "G12H": "G12H",
  "G12H30-Anniversary": "G12H30",
  "Celestion-Cream": "Cream",
  "GA12-SC64": "GA12SC64",
  "G10-SC64": "G10",
  "Karnivore": "Karnivore",
};

export function getSpeakerFilenamePrefix(displayName: string): string {
  return SPEAKER_DISPLAY_TO_FILE_PREFIX[displayName] ?? displayName.split("-")[0].split(" ")[0];
}

export interface GearContextItem {
  gearName: string;
  category: "mic" | "speaker" | "position" | "combo";
  descriptors: TonalDescriptor[];
  sentiment: number;
  sampleSize: number;
}

export interface GearContextResult {
  parsed: boolean;
  gear: { mic?: string; speaker?: string; position?: string };
  items: GearContextItem[];
  commentary: string[];
}

export function getGearContext(filename: string, gearInsights: GearInsights | null | undefined, bands?: TonalBands): GearContextResult {
  const gear = parseGearFromFilename(filename);
  const parsed = !!(gear.mic || gear.speaker || gear.position);
  const items: GearContextItem[] = [];
  const commentary: string[] = [];

  if (!gearInsights || !parsed) {
    return { parsed, gear, items, commentary };
  }

  const lookupGear = (name: string | undefined, list: GearTonalEntry[], category: "mic" | "speaker" | "position") => {
    if (!name) return;
    const entry = list.find((e) => e.name === name);
    if (!entry) return;
    items.push({
      gearName: name,
      category,
      descriptors: entry.descriptors,
      sentiment: entry.score.net,
      sampleSize: entry.tonal?.sampleSize ?? 0,
    });
    if (entry.descriptors.length > 0) {
      const labels = entry.descriptors.map((d) => d.label).join(", ");
      commentary.push(`${name} typically: ${labels}`);
    }
  };

  lookupGear(gear.mic, gearInsights.mics, "mic");
  lookupGear(gear.mic2, gearInsights.mics, "mic");
  lookupGear(gear.speaker, gearInsights.speakers, "speaker");
  lookupGear(gear.position, gearInsights.positions, "position");

  const comboKeys: string[] = [];
  const allMics = [gear.mic, gear.mic2].filter(Boolean) as string[];
  for (const mic of allMics) {
    if (gear.speaker) comboKeys.push(`${mic}+${gear.speaker}`);
    if (gear.position) comboKeys.push(`${mic}@${gear.position}`);
  }
  if (gear.speaker && gear.position) comboKeys.push(`${gear.speaker}@${gear.position}`);
  if (gear.mic && gear.mic2) comboKeys.push(`${gear.mic}+${gear.mic2}`);

  for (const key of comboKeys) {
    const combo = gearInsights.combos.find((c) => c.combo === key);
    if (combo && combo.descriptors.length > 0) {
      items.push({
        gearName: key,
        category: "combo",
        descriptors: combo.descriptors,
        sentiment: combo.sentiment,
        sampleSize: combo.sampleSize,
      });
      const labels = combo.descriptors.map((d) => d.label).join(", ");
      commentary.push(`${key.replace('+', ' + ').replace('@', ' @ ')} tends: ${labels}`);
    }
  }

  if (bands && items.length > 0) {
    const ratio = bands.mid > 0 ? bands.highMid / bands.mid : 0;
    const dominantItem = items.find((i) => i.category === "combo" && i.descriptors.length > 0) || items.find((i) => i.descriptors.length > 0);
    if (dominantItem) {
      const bright = dominantItem.descriptors.find((d) => d.label === "Bright/Forward" || d.label === "Crisp/Articulate");
      const dark = dominantItem.descriptors.find((d) => d.label === "Dark/Warm" || d.label === "Smooth");
      const thick = dominantItem.descriptors.find((d) => d.label === "Thick/Muddy");
      const lean = dominantItem.descriptors.find((d) => d.label === "Lean/Tight");

      if (bright && bands.presence < 25) {
        commentary.push(`This IR is darker than typical for ${dominantItem.gearName.replace('+', ' + ').replace('@', ' @ ')}`);
      } else if (dark && bands.presence > 30) {
        commentary.push(`This IR is brighter than typical for ${dominantItem.gearName.replace('+', ' + ').replace('@', ' @ ')}`);
      }
      if (thick && (bands.lowMid + bands.mid) < 35) {
        commentary.push(`Leaner than expected from ${dominantItem.gearName.replace('+', ' + ').replace('@', ' @ ')}`);
      } else if (lean && (bands.lowMid + bands.mid) > 45) {
        commentary.push(`Thicker than typical for ${dominantItem.gearName.replace('+', ' + ').replace('@', ' @ ')}`);
      }
    }
  }

  return { parsed, gear, items, commentary };
}
