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

  const bodyProfile = profiles.find((p) => p.name === "Body") || profiles[1];
  const featuredProfile = profiles.find((p) => p.name === "Featured") || profiles[0];

  const scored = irs.map((ir) => {
    const ratio = ir.bands.mid > 0 ? ir.bands.highMid / ir.bands.mid : 0;
    const bodyMatch = scoreAgainstProfile(ir.bands, bodyProfile);
    const featuredMatch = scoreAgainstProfile(ir.bands, featuredProfile);

    const reasons: string[] = [];
    if (bodyMatch.label === "strong") reasons.push("Strong Body match");
    else if (bodyMatch.label === "close") reasons.push("Close Body match");

    const lowEnd = ir.bands.subBass + ir.bands.bass;
    if (lowEnd <= 3) reasons.push("Tight low end");
    if (ir.bands.lowMid <= 5) reasons.push("Clean low-mids");
    if (ir.bands.mid >= 30 && ir.bands.mid <= 39) reasons.push("Mid in Body sweet spot");
    if (ratio >= 1.0 && ratio <= 1.4) reasons.push("Ratio in Body range");
    if (ir.bands.highMid >= 35 && ir.bands.highMid <= 43) reasons.push("HiMid in sweet spot");

    if (lowEnd > 8) reasons.push("Low end too loose");
    if (ir.bands.lowMid > 10) reasons.push("Muddy low-mids");
    if (bodyMatch.label === "miss") reasons.push("Outside Body range");

    return {
      filename: ir.filename,
      score: bodyMatch.score,
      bodyScore: bodyMatch.score,
      featuredScore: featuredMatch.score,
      reasons,
      bands: ir.bands,
      ratio: Math.round(ratio * 100) / 100,
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
  baseIR: { rawEnergy: TonalBands },
  candidates: { filename: string; bands: TonalBands; rawEnergy: TonalBands }[],
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

  function blendRaw(baseRaw: TonalBands, featRaw: TonalBands, bR: number, fR: number): TonalBands {
    const raw = {
      subBass: baseRaw.subBass * bR + featRaw.subBass * fR,
      bass: baseRaw.bass * bR + featRaw.bass * fR,
      lowMid: baseRaw.lowMid * bR + featRaw.lowMid * fR,
      mid: baseRaw.mid * bR + featRaw.mid * fR,
      highMid: baseRaw.highMid * bR + featRaw.highMid * fR,
      presence: baseRaw.presence * bR + featRaw.presence * fR,
    };
    const total = raw.subBass + raw.bass + raw.lowMid + raw.mid + raw.highMid + raw.presence;
    if (total === 0) return { subBass: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, presence: 0 };
    return {
      subBass: Math.round((raw.subBass / total) * 1000) / 10,
      bass: Math.round((raw.bass / total) * 1000) / 10,
      lowMid: Math.round((raw.lowMid / total) * 1000) / 10,
      mid: Math.round((raw.mid / total) * 1000) / 10,
      highMid: Math.round((raw.highMid / total) * 1000) / 10,
      presence: Math.round((raw.presence / total) * 1000) / 10,
    };
  }

  const scored = candidates.map((cand) => {
    let bestScore = -1;
    let bestLabel: MatchResult["label"] = "miss";
    let bestProfile = "";
    let bestRatio = ratios[0];
    let bestBands: TonalBands = cand.bands;

    for (const r of ratios) {
      const blendedBands = blendRaw(baseIR.rawEnergy, cand.rawEnergy, r.base, r.feature);
      const { best } = learned && learned.avoidZones.length > 0
        ? scoreWithAvoidPenalty(blendedBands, profiles, learned)
        : scoreAgainstAllProfiles(blendedBands, profiles);
      if (best.score > bestScore) {
        bestScore = best.score;
        bestLabel = best.label;
        bestProfile = best.profile;
        bestRatio = r;
        bestBands = blendedBands;
      }
    }

    return {
      filename: cand.filename,
      bands: cand.bands,
      bestBlendScore: bestScore,
      bestBlendLabel: bestLabel,
      bestBlendProfile: bestProfile,
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
  score: number;
  rank: number;
}

interface GearScore { loved: number; liked: number; noped: number; net: number }
export interface GearInsights {
  mics: { name: string; score: GearScore }[];
  speakers: { name: string; score: GearScore }[];
  positions: { name: string; score: GearScore }[];
}

export interface LearnedProfileData {
  signalCount: number;
  likedCount: number;
  nopedCount: number;
  learnedAdjustments: {
    mid: { shift: number; confidence: number };
    highMid: { shift: number; confidence: number };
    presence: { shift: number; confidence: number };
    ratio: { shift: number; confidence: number };
  } | null;
  avoidZones: { band: string; direction: string; threshold: number }[];
  status: "no_data" | "learning" | "confident" | "mastered";
  gearInsights?: GearInsights | null;
}

export function applyLearnedAdjustments(
  profiles: PreferenceProfile[],
  learned: LearnedProfileData
): PreferenceProfile[] {
  if (!learned.learnedAdjustments || learned.status === "no_data") return profiles;

  const adj = learned.learnedAdjustments;

  return profiles.map((p) => {
    const shiftTarget = (
      orig: { min: number; max: number; ideal: number },
      shift: number,
      conf: number
    ) => {
      const s = shift * conf * 0.5;
      return {
        min: Math.round((orig.min + s) * 10) / 10,
        max: Math.round((orig.max + s) * 10) / 10,
        ideal: Math.round((orig.ideal + s) * 10) / 10,
      };
    };

    return {
      ...p,
      name: p.name,
      description: p.description,
      targets: {
        ...p.targets,
        mid: shiftTarget(p.targets.mid, adj.mid.shift, adj.mid.confidence),
        highMid: shiftTarget(p.targets.highMid, adj.highMid.shift, adj.highMid.confidence),
        presence: shiftTarget(p.targets.presence, adj.presence.shift, adj.presence.confidence),
        ratio: shiftTarget(p.targets.ratio, adj.ratio.shift, adj.ratio.confidence),
      },
    };
  });
}

export function scoreWithAvoidPenalty(
  bands: TonalBands,
  profiles: PreferenceProfile[],
  learned: LearnedProfileData
) {
  const base = scoreAgainstAllProfiles(bands, profiles);

  const ratio = bands.mid > 0 ? bands.highMid / bands.mid : 0;
  const lowMidPlusMid = bands.lowMid + bands.mid;

  let penalty = 0;
  for (const zone of learned.avoidZones) {
    if (zone.band === "muddy_composite") {
      if (zone.direction === "high" && lowMidPlusMid >= zone.threshold) {
        const overshoot = lowMidPlusMid - zone.threshold;
        penalty += Math.min(5 + overshoot * 1.5, 25);
      }
      continue;
    }

    const val = zone.band === "mid" ? bands.mid
      : zone.band === "presence" ? bands.presence
      : zone.band === "ratio" ? ratio : 0;

    if (zone.direction === "high" && val >= zone.threshold) {
      const overshoot = val - zone.threshold;
      penalty += Math.min(5 + overshoot * 1.2, 20);
    } else if (zone.direction === "low" && val <= zone.threshold) {
      const undershoot = zone.threshold - val;
      penalty += Math.min(5 + undershoot * 1.2, 20);
    }
  }

  if (bands.mid > 30 && bands.presence < 18 && ratio < 1.1) {
    penalty += 8;
  }

  if (penalty > 0) {
    const adjusted = { ...base.best, score: Math.max(0, Math.round(base.best.score - penalty)) };
    if (adjusted.score >= 85) adjusted.label = "strong";
    else if (adjusted.score >= 70) adjusted.label = "close";
    else if (adjusted.score >= 50) adjusted.label = "partial";
    else adjusted.label = "miss";
    return { results: base.results, best: adjusted };
  }
  return base;
}

export function scoreIndividualIR(
  bands: TonalBands,
  profiles: PreferenceProfile[],
  learned?: LearnedProfileData
) {
  const relaxed = profiles.map((p) => ({
    ...p,
    targets: {
      mid: { min: p.targets.mid.min - 5, max: p.targets.mid.max + 5, ideal: p.targets.mid.ideal },
      highMid: { min: p.targets.highMid.min - 8, max: p.targets.highMid.max + 10, ideal: p.targets.highMid.ideal },
      presence: { min: Math.max(0, p.targets.presence.min - 8), max: p.targets.presence.max + 8, ideal: p.targets.presence.ideal },
      ratio: { min: Math.max(0, p.targets.ratio.min - 0.3), max: p.targets.ratio.max + 0.4, ideal: p.targets.ratio.ideal },
      lowEnd: { max: p.targets.lowEnd.max + 3 },
      lowMid: { max: p.targets.lowMid.max + 3 },
    },
  }));

  const results = relaxed.map((p) => scoreAgainstProfile(bands, p));
  const best = results.reduce((a, b) => (a.score > b.score ? a : b));

  let penalty = 0;
  if (learned && learned.avoidZones) {
    const ratio = bands.mid > 0 ? bands.highMid / bands.mid : 0;
    const lowMidPlusMid = bands.lowMid + bands.mid;
    for (const zone of learned.avoidZones) {
      if (zone.band === "muddy_composite") {
        if (zone.direction === "high" && lowMidPlusMid >= zone.threshold) {
          penalty += Math.min(3, (lowMidPlusMid - zone.threshold) * 0.8);
        }
        continue;
      }
      const val = zone.band === "mid" ? bands.mid
        : zone.band === "presence" ? bands.presence
        : zone.band === "ratio" ? ratio : 0;
      if (zone.direction === "high" && val >= zone.threshold) {
        penalty += Math.min(3, (val - zone.threshold) * 0.6);
      } else if (zone.direction === "low" && val <= zone.threshold) {
        penalty += Math.min(3, (zone.threshold - val) * 0.6);
      }
    }
  }

  if (penalty > 0) {
    const adjusted = { ...best, score: Math.max(0, Math.round(best.score - penalty)) };
    if (adjusted.score >= 85) adjusted.label = "strong" as const;
    else if (adjusted.score >= 70) adjusted.label = "close" as const;
    else if (adjusted.score >= 50) adjusted.label = "partial" as const;
    else adjusted.label = "miss" as const;
    return { results, best: adjusted };
  }
  return { results, best };
}

export function suggestPairings(
  irs: { filename: string; bands: TonalBands; rawEnergy: TonalBands }[],
  profiles: PreferenceProfile[] = DEFAULT_PROFILES,
  count: number = 3,
  learned?: LearnedProfileData,
  excludePairs?: Set<string>,
  exposureCounts?: Map<string, number>
): SuggestedPairing[] {
  if (irs.length < 2) return [];

  const fiftyFifty = { base: 0.5, feature: 0.5 };

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
      const baseRaw = irs[i].rawEnergy;
      const featRaw = irs[j].rawEnergy;
      const raw = {
        subBass: baseRaw.subBass * fiftyFifty.base + featRaw.subBass * fiftyFifty.feature,
        bass: baseRaw.bass * fiftyFifty.base + featRaw.bass * fiftyFifty.feature,
        lowMid: baseRaw.lowMid * fiftyFifty.base + featRaw.lowMid * fiftyFifty.feature,
        mid: baseRaw.mid * fiftyFifty.base + featRaw.mid * fiftyFifty.feature,
        highMid: baseRaw.highMid * fiftyFifty.base + featRaw.highMid * fiftyFifty.feature,
        presence: baseRaw.presence * fiftyFifty.base + featRaw.presence * fiftyFifty.feature,
      };
      const total = raw.subBass + raw.bass + raw.lowMid + raw.mid + raw.highMid + raw.presence;
      if (total === 0) continue;
      const blendBands: TonalBands = {
        subBass: Math.round((raw.subBass / total) * 1000) / 10,
        bass: Math.round((raw.bass / total) * 1000) / 10,
        lowMid: Math.round((raw.lowMid / total) * 1000) / 10,
        mid: Math.round((raw.mid / total) * 1000) / 10,
        highMid: Math.round((raw.highMid / total) * 1000) / 10,
        presence: Math.round((raw.presence / total) * 1000) / 10,
      };
      const result = learned
        ? scoreWithAvoidPenalty(blendBands, profiles, learned)
        : scoreAgainstAllProfiles(blendBands, profiles);
      let noveltyBoost = 0;
      if (exposureCounts && maxExposure > 0) {
        const baseExp = exposureCounts.get(irs[i].filename) ?? 0;
        const featExp = exposureCounts.get(irs[j].filename) ?? 0;
        const minExp = Math.min(baseExp, featExp);
        const underExposure = 1 - (minExp / maxExposure);
        noveltyBoost = underExposure * 15;
      }
      allCombos.push({
        baseFilename: irs[i].filename,
        featureFilename: irs[j].filename,
        blendBands,
        bestMatch: result.best,
        score: result.best.score + noveltyBoost,
        rank: 0,
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

  const profileGroups: Record<string, SuggestedPairing[]> = {};
  for (const combo of dedupedCombos) {
    const pName = combo.bestMatch.profile;
    if (!profileGroups[pName]) profileGroups[pName] = [];
    profileGroups[pName].push(combo);
  }

  const profileNames = Object.keys(profileGroups);

  selected.push(dedupedCombos[0]);

  if (profileNames.length > 1) {
    const firstProfile = selected[0].bestMatch.profile;
    for (const pName of profileNames) {
      if (pName === firstProfile) continue;
      const best = profileGroups[pName][0];
      if (best && best.score >= 50) {
        selected.push(best);
        break;
      }
    }
  }

  if (exposureCounts && exposureCounts.size > 0 && selected.length < count) {
    const allFilenames = irs.map((ir) => ir.filename);
    const uniqueFilenames = Array.from(new Set(allFilenames));
    const unexposed = uniqueFilenames.filter((f) => (exposureCounts.get(f) ?? 0) === 0);
    if (unexposed.length > 0) {
      const novelSlots = Math.min(count - 1, Math.ceil(unexposed.length / 2));
      let novelAdded = 0;
      for (const combo of dedupedCombos) {
        if (novelAdded >= novelSlots) break;
        if (selected.some((s) => s.baseFilename === combo.baseFilename && s.featureFilename === combo.featureFilename)) continue;
        if (unexposed.includes(combo.baseFilename) || unexposed.includes(combo.featureFilename)) {
          selected.push(combo);
          novelAdded++;
        }
      }
    }
  }

  for (const combo of dedupedCombos) {
    if (selected.length >= count) break;
    if (selected.some((s) => s.baseFilename === combo.baseFilename && s.featureFilename === combo.featureFilename)) continue;
    selected.push(combo);
  }

  selected.sort((a, b) => b.score - a.score);
  selected.forEach((s, i) => { s.rank = i + 1; });
  return selected.slice(0, count);
}
