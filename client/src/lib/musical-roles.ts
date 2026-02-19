import type { TonalFeatures } from "./tonal-engine";

export type SpeakerStats = {
  mean: Record<string, number>;
  std: Record<string, number>;
};

export type MusicalRole = "Foundation" | "Cut Layer" | "Mid Thickener" | "Fizz Tamer" | "Lead Polish" | "Dark Specialty";

export const ALL_ROLES: MusicalRole[] = ["Foundation", "Cut Layer", "Mid Thickener", "Fizz Tamer", "Lead Polish", "Dark Specialty"];

export function inferSpeakerIdFromFilename(filename: string): string {
  const base = (filename || "").split("/").pop() || filename || "";
  const first = base.split("_")[0] || "UNKNOWN";
  return first.toUpperCase();
}

export function zScore(v: number, mean: number, std: number): number {
  if (!Number.isFinite(v) || !Number.isFinite(mean) || !Number.isFinite(std) || std <= 1e-9) return 0;
  return (v - mean) / std;
}

export function computeSpeakerStats(rows: Array<{ filename: string; tf: TonalFeatures }>): Map<string, SpeakerStats> {
  const bySpk = new Map<string, Array<{ filename: string; tf: TonalFeatures }>>();
  for (const r of rows) {
    const spk = inferSpeakerIdFromFilename(r.filename);
    if (!bySpk.has(spk)) bySpk.set(spk, []);
    bySpk.get(spk)!.push(r);
  }

  const stats = new Map<string, SpeakerStats>();
  const keys = ["centroid", "tilt", "ext", "presence", "hiMidMid", "smooth", "air", "fizz"];

  for (const [spk, list] of Array.from(bySpk.entries())) {
    const vals: Record<string, number[]> = Object.fromEntries(keys.map(k => [k, []]));

    for (const r of list) {
      const bp: any = (r.tf.bandsPercent ?? {});
      const centroid = Number(r.tf.spectralCentroidHz ?? 0);
      const tilt = Number(r.tf.tiltDbPerOct ?? 0);
      const ext = Number(r.tf.rolloffFreq ?? 0);
      const smooth = Number(r.tf.smoothScore ?? 0);
      const midPct = Number((bp.mid ?? 0) * 100);
      const highMidPct = Number((bp.highMid ?? 0) * 100);
      const presencePct = Number((bp.presence ?? 0) * 100);
      const airPct = Number((bp.air ?? 0) * 100);
      const rawFizz = Number(r.tf.fizzEnergy ?? 0);
      const fizzPct = (Number.isFinite(rawFizz) ? (rawFizz > 1.2 ? rawFizz : rawFizz * 100) : 0);
      const hiMidMid = midPct > 0 ? (highMidPct / midPct) : 10;

      vals.centroid.push(centroid);
      vals.tilt.push(tilt);
      vals.ext.push(ext);
      vals.smooth.push(smooth);
      vals.presence.push(presencePct);
      vals.air.push(airPct);
      vals.fizz.push(fizzPct);
      vals.hiMidMid.push(hiMidMid);
    }

    const mean: Record<string, number> = {};
    const std: Record<string, number> = {};

    for (const k of keys) {
      const arr = vals[k].filter(Number.isFinite);
      const m = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const v = arr.length ? arr.reduce((a, b) => a + Math.pow(b - m, 2), 0) / arr.length : 0;
      mean[k] = m;
      std[k] = Math.sqrt(v) || 1;
    }

    stats.set(spk, { mean, std });
  }

  return stats;
}

let _classifyDebugFilename: string | null = null;
export function setClassifyDebugFilename(f: string | null) { _classifyDebugFilename = f; }

export function classifyMusicalRole(tf: TonalFeatures, speakerStats?: SpeakerStats): MusicalRole {
  const bp = (tf.bandsPercent ?? {}) as any;

  const smooth = Number.isFinite(tf.smoothScore) ? (tf.smoothScore as number) : 0;
  const tilt = Number.isFinite(tf.tiltDbPerOct) ? (tf.tiltDbPerOct as number) : 0;
  const ext = Number.isFinite(tf.rolloffFreq) ? (tf.rolloffFreq as number) : 0;
  const centroid = Number.isFinite(tf.spectralCentroidHz) ? (tf.spectralCentroidHz as number) : 0;

  const air = (bp.air ?? 0) * 100;

  const rawFizz = Number.isFinite((tf as any).fizzEnergy) ? Number((tf as any).fizzEnergy) : 0;
  const fizzRatio = rawFizz > 1.2 ? rawFizz / 100 : rawFizz;
  const fizz = fizzRatio * 100;

  const mid = (bp.mid ?? 0) * 100;
  const highMid = (bp.highMid ?? 0) * 100;
  const presence = (bp.presence ?? 0) * 100;
  const lowMid = (bp.lowMid ?? 0) * 100;
  const bass = (bp.bass ?? 0) * 100;
  const subBass = (bp.subBass ?? 0) * 100;

  const bassLowMid = subBass + bass + lowMid;
  const core = Math.max(1e-6, (mid + lowMid));
  const cutCoreRatio = (highMid + presence) / core;

  const zCentroid = speakerStats ? zScore(centroid, speakerStats.mean.centroid, speakerStats.std.centroid) : 0;
  const zExt = speakerStats ? zScore(ext, speakerStats.mean.ext, speakerStats.std.ext) : 0;
  const zPresence = speakerStats ? zScore(presence, speakerStats.mean.presence, speakerStats.std.presence) : 0;
  const zTilt = speakerStats ? zScore(tilt, speakerStats.mean.tilt, speakerStats.std.tilt) : 0;
  const zAir = speakerStats ? zScore(air, speakerStats.mean.air, speakerStats.std.air) : 0;
  const zFizz = speakerStats ? zScore(fizz, speakerStats.mean.fizz, speakerStats.std.fizz) : 0;

  if (_classifyDebugFilename) {
    console.log(`[classifyMusicalRole DEBUG] ${_classifyDebugFilename}:`, JSON.stringify({
      mid, highMid, presence, lowMid, bass, subBass, air, fizz, smooth, tilt, ext, centroid,
      bassLowMid, core, cutCoreRatio,
      zCentroid, zExt, zPresence, zTilt, zAir, zFizz,
      hasSpeakerStats: !!speakerStats,
      speakerMean: speakerStats?.mean,
      speakerStd: speakerStats?.std,
    }));
  }

  const balancedBands =
    mid >= 22 && mid <= 35 &&
    presence >= 18 && presence <= 42 &&
    highMid >= 18 && highMid <= 45 &&
    cutCoreRatio >= 1.10 && cutCoreRatio <= 2.40 &&
    air <= 6.0 &&
    fizz <= 1.5;

  const notExtremeTilt = speakerStats
    ? (Math.abs(zTilt) <= 1.2)
    : (tilt >= -5.5 && tilt <= -1.0);
  const notTooDark = ext === 0 ? true : (speakerStats ? (zExt >= -0.2) : (ext >= 4200));
  const notBodyLean = bassLowMid >= 18;

  if (balancedBands && notExtremeTilt && notTooDark && notBodyLean) {
    return "Foundation";
  }

  if (speakerStats) {
    const nearCenter =
      Math.abs(zCentroid) <= 0.8 &&
      (
        Math.abs(zTilt) <= 1.2 ||
        Math.abs(zExt) <= 0.8
      );
    const notFizzy = (fizz <= 2.0 || zFizz <= 0.4);
    const smoothEnough = smooth >= 84;
    if (nearCenter && smoothEnough && notFizzy) {
      return "Foundation";
    }
  }

  const extremeAbsDark = (ext > 0 && ext < 2900) || (tilt <= -8.0);
  const speakerRelDark = (zExt <= -1.1) || (zTilt <= -1.2 && zCentroid <= -0.6);
  const midHeavyCandidate = (mid >= 34 || bassLowMid >= 28) && presence <= 36;
  if (midHeavyCandidate) {
    const veryDark = speakerStats
      ? ((zExt <= -1.5) || (zTilt <= -1.5 && zCentroid <= -0.9))
      : extremeAbsDark;
    if (veryDark) return "Dark Specialty";
  } else {
    if (speakerStats ? speakerRelDark : (extremeAbsDark || speakerRelDark)) {
      return "Dark Specialty";
    }
  }

  const extended = ext > 0 && (speakerStats ? (zExt >= 0.6) : (ext >= 4200));
  const verySmooth = smooth >= 87;
  const hasPresenceClarity = presence >= 14 && presence <= 55;
  const notFizzy = fizz <= 1.2 || zFizz <= 0.35;
  const notScoopedToDeath = (mid + lowMid) >= 16;
  const notExtremeCut = presence <= 58 && zPresence <= 1.9 && cutCoreRatio <= 3.4;
  const aboveAvgTopEnd = speakerStats
    ? (zCentroid >= 0.4 || zPresence >= 0.3)
    : (centroid >= 2500 || presence >= 20);

  if (extended && verySmooth && notFizzy && hasPresenceClarity && notScoopedToDeath && notExtremeCut && aboveAvgTopEnd) {
    return "Lead Polish";
  }

  const cutForward =
    presence >= 50 ||
    cutCoreRatio >= 3.0 ||
    zPresence >= 1.15 ||
    zCentroid >= 1.15;

  const midLean = (mid + lowMid) <= 24;
  if (cutForward && midLean) return "Cut Layer";

  const midHeavy = mid >= 34 || lowMid >= 10 || bassLowMid >= 24;
  const notPresenceSpiky = presence <= 36 && zPresence <= 0.35;
  if (midHeavy && notPresenceSpiky) return "Mid Thickener";

  if (speakerStats) {
    const nearVoice =
      Math.abs(zCentroid) <= 0.9 &&
      Math.abs(zExt) <= 1.0 &&
      Math.abs(zTilt) <= 1.3 &&
      smooth >= 84;
    if (nearVoice) return "Foundation";
  }

  const rolledOff = ext > 0 && (speakerStats ? (zExt <= -0.6) : (ext <= 4500));
  const veryDarkTilt = (speakerStats ? (zTilt <= -0.6) : (tilt <= -5.2)) || (tilt <= -7.0);
  const lowFizz = fizz <= 0.6 || zFizz <= -0.4;
  const lowAir = air <= 1.8 || zAir <= -0.3;

  const clearlyDarkRelative =
    speakerStats
      ? (zTilt <= -1.0 || zExt <= -1.0)
      : (rolledOff || veryDarkTilt);

  if (clearlyDarkRelative && smooth >= 82 && lowFizz && lowAir && zPresence <= -0.5) {
    return "Fizz Tamer";
  }

  if (cutForward && (mid + lowMid) <= 28) return "Cut Layer";
  if (midHeavy) return "Mid Thickener";
  if ((tilt <= -4.8 || (ext > 0 && ext <= 4700) || zTilt <= -0.7) && (fizz <= 1.0 || zFizz <= -0.2)) return "Fizz Tamer";
  return "Foundation";
}

export function applyContextBias(
  baseRole: string,
  tf: TonalFeatures,
  filename: string,
  speakerStats?: SpeakerStats
): MusicalRole {
  const name = (filename || "").toLowerCase();
  const bp: any = (tf.bandsPercent ?? {});

  const centroid = Number(tf.spectralCentroidHz ?? 0);
  const ext = Number(tf.rolloffFreq ?? 0);
  const smooth = Number(tf.smoothScore ?? 0);
  const tilt = Number(tf.tiltDbPerOct ?? 0);
  const midPct = Number((bp.mid ?? 0) * 100);
  const highMidPct = Number((bp.highMid ?? 0) * 100);
  const presencePct = Number((bp.presence ?? 0) * 100);
  const hiMidMid = midPct > 0 ? (highMidPct / midPct) : 10;

  const airPct = Number((bp.air ?? 0) * 100);
  const rawFizz = Number((tf as any).fizzEnergy ?? 0);
  const fizzPct = (Number.isFinite(rawFizz) ? (rawFizz > 1.2 ? rawFizz : rawFizz * 100) : 0);

  const zCentroid = speakerStats ? zScore(centroid, speakerStats.mean.centroid, speakerStats.std.centroid) : 0;
  const zExt = speakerStats ? zScore(ext, speakerStats.mean.ext, speakerStats.std.ext) : 0;
  const zPresence = speakerStats ? zScore(presencePct, speakerStats.mean.presence, speakerStats.std.presence) : 0;
  const zHiMidMid = speakerStats ? zScore(hiMidMid, speakerStats.mean.hiMidMid, speakerStats.std.hiMidMid) : 0;
  const zAir = speakerStats ? zScore(airPct, speakerStats.mean.air, speakerStats.std.air) : 0;
  const zFizz = speakerStats ? zScore(fizzPct, speakerStats.mean.fizz, speakerStats.std.fizz) : 0;
  const zTilt = speakerStats ? zScore(tilt, speakerStats.mean.tilt, speakerStats.std.tilt) : 0;

  const isPresenceTagged = name.includes("presence");
  const isClearlyDark = (ext > 0 && ext <= 3900) || (tilt <= -5.8);
  if (baseRole === "Fizz Tamer" && (isPresenceTagged || presencePct >= 28) && !isClearlyDark) {
    baseRole = "Cut Layer";
  }

  const objectivelyCutty =
    (zCentroid >= 1.0 && zExt >= 0.8) ||
    (zPresence >= 1.1) ||
    (zHiMidMid >= 1.2);

  if (objectivelyCutty && baseRole === "Foundation") {
    return "Cut Layer";
  }

  const score: Record<string, number> = {
    "Foundation": 0,
    "Cut Layer": 0,
    "Mid Thickener": 0,
    "Fizz Tamer": 0,
    "Lead Polish": 0,
    "Dark Specialty": 0,
  };

  score[baseRole] += 3.0;

  if (name.includes("presence")) score["Cut Layer"] += 0.8;
  if (name.includes("capedge_br")) score["Cut Layer"] += 0.4;
  if (name.includes("capedge")) score["Foundation"] += 0.2;
  if (name.includes("cone_tr") || name.includes("cap_cone_tr")) score["Fizz Tamer"] += 0.4;
  if (name.includes("cone_")) score["Mid Thickener"] += 0.3;
  if (name.includes("fredman")) score["Foundation"] += 0.4;
  if (name.includes("_thick_")) score["Mid Thickener"] += 0.5;
  if (name.includes("_balanced_")) score["Foundation"] += 0.4;
  if (name.includes("_tight_")) score["Lead Polish"] += 0.4;

  if (name.includes("_r121_") || name.includes("r121")) score["Mid Thickener"] += 0.4;
  if (name.includes("_roswell_") || name.includes("roswell")) score["Dark Specialty"] += 0.7;
  if (name.includes("_md441_") || name.includes("md441")) score["Cut Layer"] += 0.4;
  if (name.includes("_pr30_") || name.includes("pr30")) score["Foundation"] += 0.35;
  if (name.includes("_md421_") || name.includes("md421")) score["Foundation"] += 0.25;
  if (name.includes("_m201_") || name.includes("m201")) score["Foundation"] += 0.25;
  if (name.includes("_e906_") || name.includes("e906")) score["Cut Layer"] += 0.25;
  if (name.includes("_sm57_") || name.includes("sm57")) score["Foundation"] += 0.15;

  const sheenCandidate = smooth >= 88 && ext >= 4800 && presencePct <= 48 && hiMidMid <= 1.75 && tilt >= -5.2 && (airPct >= 2.0 || zAir >= 0.7) && (fizzPct <= 0.9 || zFizz <= 0.2);
  if (sheenCandidate) score["Lead Polish"] += 0.9;

  if ((ext > 0 && ext < 3600) || tilt <= -6.2 || zTilt <= -1.3) score["Dark Specialty"] += 1.0;

  let best = baseRole;
  let bestV = score[baseRole];
  for (const [k, v] of Object.entries(score)) {
    if (v > bestV) { bestV = v; best = k; }
  }
  return best as MusicalRole;
}

export function classifyIR(tf: TonalFeatures, filename: string, speakerStats?: SpeakerStats): MusicalRole {
  const base = classifyMusicalRole(tf, speakerStats);
  return applyContextBias(base, tf, filename, speakerStats);
}

export type Intent = "rhythm" | "lead" | "clean";

export const INTENT_ROLE_PREFERENCES: Record<Intent, { preferred: [MusicalRole, MusicalRole][]; good: MusicalRole[]; avoid: MusicalRole[] }> = {
  rhythm: {
    preferred: [
      ["Foundation", "Mid Thickener"],
      ["Foundation", "Cut Layer"],
      ["Foundation", "Fizz Tamer"],
      ["Foundation", "Foundation"],
      ["Mid Thickener", "Cut Layer"],
      ["Mid Thickener", "Fizz Tamer"],
      ["Cut Layer", "Dark Specialty"],
    ],
    good: ["Foundation", "Mid Thickener", "Fizz Tamer", "Cut Layer"],
    avoid: ["Lead Polish"],
  },
  lead: {
    preferred: [
      ["Foundation", "Cut Layer"],
      ["Foundation", "Lead Polish"],
      ["Cut Layer", "Lead Polish"],
      ["Cut Layer", "Mid Thickener"],
      ["Foundation", "Foundation"],
      ["Cut Layer", "Fizz Tamer"],
    ],
    good: ["Cut Layer", "Lead Polish", "Foundation"],
    avoid: ["Dark Specialty"],
  },
  clean: {
    preferred: [
      ["Foundation", "Lead Polish"],
      ["Foundation", "Foundation"],
      ["Lead Polish", "Lead Polish"],
      ["Foundation", "Cut Layer"],
      ["Lead Polish", "Mid Thickener"],
      ["Foundation", "Dark Specialty"],
      ["Foundation", "Fizz Tamer"],
    ],
    good: ["Foundation", "Lead Polish", "Fizz Tamer"],
    avoid: [],
  },
};

export function scoreRolePairForIntent(
  roleA: MusicalRole,
  roleB: MusicalRole,
  intent: Intent
): number {
  const prefs = INTENT_ROLE_PREFERENCES[intent];
  if (!prefs) return 0;

  const pair: [MusicalRole, MusicalRole] = [roleA, roleB].sort() as [MusicalRole, MusicalRole];

  for (let i = 0; i < prefs.preferred.length; i++) {
    const pref = [...prefs.preferred[i]].sort() as [MusicalRole, MusicalRole];
    if (pair[0] === pref[0] && pair[1] === pref[1]) {
      return 3.0 - i * 0.4;
    }
  }

  const aGood = prefs.good.includes(roleA) ? 1 : 0;
  const bGood = prefs.good.includes(roleB) ? 1 : 0;
  const aAvoid = prefs.avoid.includes(roleA) ? -2 : 0;
  const bAvoid = prefs.avoid.includes(roleB) ? -2 : 0;

  return aGood + bGood + aAvoid + bAvoid;
}

export type IRWinRecord = {
  wins: number;
  losses: number;
  bothCount: number;
};

export function softenRolesFromLearning(
  roleMap: Map<string, MusicalRole>,
  irWinRecords: Record<string, IRWinRecord>,
  intent: Intent
): void {
  for (const [filename, rec] of Object.entries(irWinRecords)) {
    const currentRole = roleMap.get(filename);
    if (!currentRole || currentRole === "Foundation") continue;

    const net = rec.wins + rec.bothCount * 0.5 - rec.losses;
    const total = rec.wins + rec.losses + rec.bothCount;
    if (total < 2 || net <= 0) continue;

    const winRate = (rec.wins + rec.bothCount * 0.5) / Math.max(1, total);

    if (net >= 4 && winRate >= 0.6) {
      roleMap.set(filename, "Foundation");
    } else if (net >= 2 && winRate >= 0.5) {
      const prefs = INTENT_ROLE_PREFERENCES[intent];
      if (prefs && !prefs.good.includes(currentRole)) {
        const softTarget = prefs.good[0];
        if (softTarget && softTarget !== currentRole) {
          roleMap.set(filename, softTarget);
        }
      }
    }
  }
}

export function findFoundationCandidates(
  irs: { filename: string; features: TonalFeatures }[],
  speakerStatsMap: Map<string, SpeakerStats>,
  roleMap: Map<string, MusicalRole>
): Map<string, string> {
  const result = new Map<string, string>();
  if (!irs.length) return result;

  const bySpk = new Map<string, typeof irs>();
  for (const ir of irs) {
    const spk = inferSpeakerIdFromFilename(ir.filename);
    if (!bySpk.has(spk)) bySpk.set(spk, []);
    bySpk.get(spk)!.push(ir);
  }

  const roleBias = (role: MusicalRole): number => {
    switch (role) {
      case "Foundation": return -0.40;
      case "Lead Polish": return -0.10;
      case "Mid Thickener": return +0.10;
      case "Cut Layer": return +0.15;
      case "Fizz Tamer": return +0.25;
      case "Dark Specialty": return +0.45;
      default: return 0;
    }
  };

  for (const [spk, list] of Array.from(bySpk.entries())) {
    const stats = speakerStatsMap.get(spk);
    const hasFoundation = list.some(ir => roleMap.get(ir.filename) === "Foundation");

    let bestFn = list[0].filename;
    let bestScore = Infinity;

    for (const ir of list) {
      const tf = ir.features;
      const centroid = Number(tf.spectralCentroidHz ?? 0);
      const tilt = Number(tf.tiltDbPerOct ?? 0);
      const ext = Number(tf.rolloffFreq ?? 0);
      const smooth = Number(tf.smoothScore ?? 0);
      const bp = (tf.bandsPercent ?? {}) as any;
      const presencePct = Number((bp.presence ?? 0) * 100);
      const lowMidPct = Number((bp.lowMid ?? 0) * 100);
      const airPct = Number((bp.air ?? 0) * 100);

      const zC = stats ? zScore(centroid, stats.mean.centroid, stats.std.centroid) : 0;
      const zT = stats ? zScore(tilt, stats.mean.tilt, stats.std.tilt) : 0;
      const zE = stats ? zScore(ext, stats.mean.ext, stats.std.ext) : 0;

      let s = Math.abs(zC) + Math.abs(zT) + Math.abs(zE);
      s += smooth ? (90 - smooth) / 10 : 0;
      s += Math.max(0, (presencePct - 22) / 30);
      s += Math.max(0, (lowMidPct - 12) / 25);
      s += Math.max(0, (airPct - 6) / 10);

      const role = roleMap.get(ir.filename) ?? "Foundation";
      s += roleBias(role);

      if (s < bestScore) {
        bestScore = s;
        bestFn = ir.filename;
      }
    }

    result.set(spk, bestFn);

    if (!hasFoundation) {
      roleMap.set(bestFn, "Foundation");
    }
  }

  return result;
}

export interface FoundationCandidateInput {
  filename: string;
  role: string;
  centroid: number;
  tilt: number;
  ext: number;
  lowMidPct: number;
  presencePct: number;
  airPct: number;
  smooth: number;
}

export function pickFoundationCandidates(
  items: FoundationCandidateInput[]
): Map<string, string> {
  const map = new Map<string, string>();
  if (!items.length) return map;

  const bySpk = new Map<string, FoundationCandidateInput[]>();
  for (const item of items) {
    const spk = inferSpeakerIdFromFilename(item.filename);
    if (!bySpk.has(spk)) bySpk.set(spk, []);
    bySpk.get(spk)!.push(item);
  }

  const hasFoundationBySpk = new Map<string, boolean>();
  bySpk.forEach((list, spk) => {
    hasFoundationBySpk.set(spk, list.some(r => r.role === "Foundation"));
  });

  const roleBias = (role: string): number => {
    switch (role) {
      case "Foundation": return -0.40;
      case "Lead Polish": return -0.10;
      case "Mid Thickener": return +0.10;
      case "Cut Layer": return +0.15;
      case "Fizz Tamer": return +0.25;
      case "Dark Specialty": return +0.45;
      default: return 0;
    }
  };

  const meanStd = (arr: number[]): [number, number] => {
    if (!arr.length) return [0, 1];
    const m = arr.reduce((a, b) => a + b, 0) / arr.length;
    const v = arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
    return [m, Math.sqrt(v) || 1];
  };

  type SpkStats = { mC: number; sC: number; mT: number; sT: number; mE: number; sE: number };
  const spkStats = new Map<string, SpkStats>();
  bySpk.forEach((list, spk) => {
    const [mC, sC] = meanStd(list.map(r => r.centroid));
    const [mT, sT] = meanStd(list.map(r => r.tilt));
    const [mE, sE] = meanStd(list.map(r => r.ext));
    spkStats.set(spk, { mC, sC, mT, sT, mE, sE });
  });

  type Cand = { fn: string; score: number };
  const bestOverallBySpeaker = new Map<string, Cand>();
  const bestFoundationBySpeaker = new Map<string, Cand>();

  for (const item of items) {
    const spk = inferSpeakerIdFromFilename(item.filename);
    const st = spkStats.get(spk);
    if (!st) continue;

    const zC = (item.centroid - st.mC) / st.sC;
    const zT = (item.tilt - st.mT) / st.sT;
    const zE = (item.ext - st.mE) / st.sE;

    let s = 0;
    s += Math.abs(zC) + Math.abs(zT) + Math.abs(zE);
    s += (item.smooth ? (90 - item.smooth) / 10 : 0);
    s += Math.max(0, (item.presencePct - 22) / 30);
    s += Math.max(0, (item.lowMidPct - 12) / 25);
    s += Math.max(0, (item.airPct - 6) / 10);
    s += roleBias(item.role);

    const prevAll = bestOverallBySpeaker.get(spk);
    if (!prevAll || s < prevAll.score) bestOverallBySpeaker.set(spk, { fn: item.filename, score: s });

    if (item.role === "Foundation") {
      const prevF = bestFoundationBySpeaker.get(spk);
      if (!prevF || s < prevF.score) bestFoundationBySpeaker.set(spk, { fn: item.filename, score: s });
    }
  }

  const MARGIN = 0.20;
  bestOverallBySpeaker.forEach((bestAll, spk) => {
    const hasF = hasFoundationBySpk.get(spk);
    const bestF = bestFoundationBySpeaker.get(spk);
    if (hasF && bestF) {
      if (bestAll.score + MARGIN < bestF.score) map.set(spk, bestAll.fn);
      else map.set(spk, bestF.fn);
    } else {
      map.set(spk, bestAll.fn);
    }
  });
  return map;
}

export function roleBadgeClass(role: string): string {
  switch (role) {
    case "Cut Layer": return "bg-cyan-500/15 text-cyan-400";
    case "Mid Thickener": return "bg-amber-500/15 text-amber-400";
    case "Fizz Tamer": return "bg-sky-500/15 text-sky-400";
    case "Lead Polish": return "bg-violet-500/15 text-violet-400";
    case "Dark Specialty": return "bg-zinc-500/15 text-zinc-300";
    case "Foundation": return "bg-emerald-500/15 text-emerald-400";
    default: return "bg-white/10 text-muted-foreground";
  }
}
