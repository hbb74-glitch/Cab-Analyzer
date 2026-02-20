import type { MusicalRole, Intent } from "../../client/src/lib/musical-roles";

export interface MicRoleRule {
  mic: string;
  position: string;
  distance?: string;
  predictedRole: MusicalRole;
  confidence: "high" | "medium" | "low";
  tonalProfile: {
    character: string;
    expectedMid: [number, number];
    expectedHighMid: [number, number];
    expectedPresence: [number, number];
    expectedRatio: [number, number];
    expectedCentroid: [number, number];
  };
  bestForIntents: Intent[];
  blendNotes: string;
}

export const MIC_ROLE_KB: MicRoleRule[] = [
  // ── SM57 ──
  {
    mic: "SM57", position: "Cap", distance: "1",
    predictedRole: "Cut Layer", confidence: "high",
    tonalProfile: {
      character: "Aggressive, biting attack with forward upper-mids and presence peak",
      expectedMid: [18, 24], expectedHighMid: [24, 32], expectedPresence: [16, 24],
      expectedRatio: [1.3, 1.8], expectedCentroid: [2200, 3200],
    },
    bestForIntents: ["rhythm", "lead"],
    blendNotes: "Classic pairing with R121 for balanced attack+warmth",
  },
  {
    mic: "SM57", position: "CapEdge", distance: "1",
    predictedRole: "Foundation", confidence: "high",
    tonalProfile: {
      character: "Balanced mid-forward tone, punchy with controlled brightness",
      expectedMid: [22, 28], expectedHighMid: [20, 26], expectedPresence: [12, 18],
      expectedRatio: [0.85, 1.3], expectedCentroid: [1800, 2600],
    },
    bestForIntents: ["rhythm", "clean", "lead"],
    blendNotes: "Most versatile SM57 position - solid foundation for any blend",
  },
  {
    mic: "SM57", position: "CapEdge", distance: "2",
    predictedRole: "Foundation", confidence: "high",
    tonalProfile: {
      character: "Balanced, slightly less proximity effect, open midrange",
      expectedMid: [22, 27], expectedHighMid: [19, 25], expectedPresence: [11, 17],
      expectedRatio: [0.8, 1.25], expectedCentroid: [1700, 2500],
    },
    bestForIntents: ["rhythm", "clean"],
    blendNotes: "Great base layer - slightly more room than 1in version",
  },
  {
    mic: "SM57", position: "Cone", distance: "1",
    predictedRole: "Mid Thickener", confidence: "high",
    tonalProfile: {
      character: "Warm, thick mids with rolled-off highs and strong low-mid energy",
      expectedMid: [26, 34], expectedHighMid: [14, 20], expectedPresence: [6, 12],
      expectedRatio: [0.5, 0.85], expectedCentroid: [1200, 1800],
    },
    bestForIntents: ["rhythm"],
    blendNotes: "Adds body and warmth - pairs with brighter shots for full tone",
  },
  {
    mic: "SM57", position: "Cap_Cone_Tr", distance: "1",
    predictedRole: "Foundation", confidence: "medium",
    tonalProfile: {
      character: "Transition zone - balanced between brightness and warmth",
      expectedMid: [23, 29], expectedHighMid: [18, 24], expectedPresence: [10, 16],
      expectedRatio: [0.75, 1.2], expectedCentroid: [1600, 2400],
    },
    bestForIntents: ["rhythm", "clean"],
    blendNotes: "Good neutral option between CapEdge and Cone characteristics",
  },

  // ── MD421 / MD421 Kompakt ──
  {
    mic: "MD421", position: "Cap", distance: "1",
    predictedRole: "Cut Layer", confidence: "high",
    tonalProfile: {
      character: "Punchy, detailed, extended frequency range with controlled highs",
      expectedMid: [20, 26], expectedHighMid: [22, 28], expectedPresence: [14, 22],
      expectedRatio: [1.1, 1.5], expectedCentroid: [2000, 2800],
    },
    bestForIntents: ["lead", "rhythm"],
    blendNotes: "Different attack character than SM57 - more hi-fi, less compressed",
  },
  {
    mic: "MD421", position: "CapEdge", distance: "1",
    predictedRole: "Foundation", confidence: "high",
    tonalProfile: {
      character: "Full-bodied, tight low-end, clear midrange definition",
      expectedMid: [24, 30], expectedHighMid: [18, 24], expectedPresence: [10, 16],
      expectedRatio: [0.7, 1.15], expectedCentroid: [1700, 2400],
    },
    bestForIntents: ["rhythm", "lead", "clean"],
    blendNotes: "Essential complement to SM57 - different punch character",
  },
  {
    mic: "MD421", position: "Cone", distance: "1",
    predictedRole: "Mid Thickener", confidence: "high",
    tonalProfile: {
      character: "Thick, focused mids with controlled bass, less proximity effect than SM57",
      expectedMid: [28, 34], expectedHighMid: [14, 20], expectedPresence: [6, 12],
      expectedRatio: [0.45, 0.75], expectedCentroid: [1200, 1700],
    },
    bestForIntents: ["rhythm"],
    blendNotes: "Tighter low-end than SM57@Cone, more controlled body layer",
  },
  {
    mic: "MD421K", position: "Cap", distance: "1",
    predictedRole: "Cut Layer", confidence: "high",
    tonalProfile: {
      character: "Punchy, focused cut with MD421 character in compact form",
      expectedMid: [20, 26], expectedHighMid: [22, 28], expectedPresence: [14, 22],
      expectedRatio: [1.1, 1.5], expectedCentroid: [2000, 2800],
    },
    bestForIntents: ["lead", "rhythm"],
    blendNotes: "Kompakt version - similar tone, easier placement between speakers",
  },
  {
    mic: "MD421K", position: "CapEdge", distance: "1",
    predictedRole: "Foundation", confidence: "high",
    tonalProfile: {
      character: "Full-bodied, defined midrange, tight bass response",
      expectedMid: [24, 30], expectedHighMid: [18, 24], expectedPresence: [10, 16],
      expectedRatio: [0.7, 1.15], expectedCentroid: [1700, 2400],
    },
    bestForIntents: ["rhythm", "lead", "clean"],
    blendNotes: "Same tonal character as MD421, fits tighter placements",
  },

  // ── MD441 ──
  {
    mic: "MD441", position: "Cap", distance: "1",
    predictedRole: "Lead Polish", confidence: "high",
    tonalProfile: {
      character: "Exceptional clarity, refined presence boost, detailed highs",
      expectedMid: [19, 25], expectedHighMid: [24, 30], expectedPresence: [16, 24],
      expectedRatio: [1.2, 1.7], expectedCentroid: [2400, 3400],
    },
    bestForIntents: ["lead", "clean"],
    blendNotes: "More refined than MD421 - polished top end suits leads and cleans",
  },
  {
    mic: "MD441", position: "CapEdge", distance: "1",
    predictedRole: "Foundation", confidence: "medium",
    tonalProfile: {
      character: "Balanced, articulate, detailed reproduction with smooth mids",
      expectedMid: [23, 29], expectedHighMid: [19, 25], expectedPresence: [11, 17],
      expectedRatio: [0.8, 1.25], expectedCentroid: [1900, 2700],
    },
    bestForIntents: ["lead", "clean"],
    blendNotes: "Hi-fi foundation - captures speaker character faithfully",
  },
  {
    mic: "MD441", position: "CapEdge", distance: "2",
    predictedRole: "Lead Polish", confidence: "medium",
    tonalProfile: {
      character: "Open, airy, refined tone with natural distance bloom",
      expectedMid: [22, 28], expectedHighMid: [18, 24], expectedPresence: [10, 16],
      expectedRatio: [0.8, 1.2], expectedCentroid: [1800, 2600],
    },
    bestForIntents: ["lead", "clean"],
    blendNotes: "Slightly pulled back - more 'produced' sound, less aggressive",
  },

  // ── e906 ──
  {
    mic: "e906", position: "Cap", distance: "1",
    predictedRole: "Cut Layer", confidence: "high",
    tonalProfile: {
      character: "Scooped mids, fizzy presence peak, modern aggressive tone",
      expectedMid: [16, 22], expectedHighMid: [24, 32], expectedPresence: [18, 26],
      expectedRatio: [1.4, 2.0], expectedCentroid: [2600, 3600],
    },
    bestForIntents: ["rhythm", "lead"],
    blendNotes: "Different EQ curve than SM57 - scooped character great with ribbons",
  },
  {
    mic: "e906", position: "CapEdge", distance: "1",
    predictedRole: "Foundation", confidence: "medium",
    tonalProfile: {
      character: "More balanced e906 tone, less extreme scoop, usable mids",
      expectedMid: [20, 26], expectedHighMid: [20, 26], expectedPresence: [14, 20],
      expectedRatio: [0.9, 1.35], expectedCentroid: [2000, 2800],
    },
    bestForIntents: ["rhythm"],
    blendNotes: "Tames the e906 scoop while keeping its character",
  },

  // ── PR30 ──
  {
    mic: "PR30", position: "Cap", distance: "1",
    predictedRole: "Cut Layer", confidence: "high",
    tonalProfile: {
      character: "Extremely bright, almost harsh - cuts through dense mixes",
      expectedMid: [16, 22], expectedHighMid: [26, 34], expectedPresence: [20, 28],
      expectedRatio: [1.5, 2.2], expectedCentroid: [2800, 3800],
    },
    bestForIntents: ["rhythm", "lead"],
    blendNotes: "Maximum brightness - use sparingly in blends, great for adding cut",
  },
  {
    mic: "PR30", position: "CapEdge", distance: "1",
    predictedRole: "Cut Layer", confidence: "medium",
    tonalProfile: {
      character: "Bright but more controlled than Cap position, still forward",
      expectedMid: [20, 26], expectedHighMid: [22, 28], expectedPresence: [16, 22],
      expectedRatio: [1.1, 1.6], expectedCentroid: [2200, 3000],
    },
    bestForIntents: ["lead", "rhythm"],
    blendNotes: "More usable brightness - good solo cut layer option",
  },

  // ── SM7B ──
  {
    mic: "SM7B", position: "Cap", distance: "2",
    predictedRole: "Foundation", confidence: "medium",
    tonalProfile: {
      character: "Warm, thick, smooth dynamic - creamy tone with controlled highs",
      expectedMid: [24, 30], expectedHighMid: [16, 22], expectedPresence: [8, 14],
      expectedRatio: [0.6, 1.0], expectedCentroid: [1400, 2100],
    },
    bestForIntents: ["lead", "clean"],
    blendNotes: "Warm, broadcast-quality smoothness - great for leads and creamy tones",
  },
  {
    mic: "SM7B", position: "CapEdge", distance: "2",
    predictedRole: "Mid Thickener", confidence: "medium",
    tonalProfile: {
      character: "Very warm, thick mids, smooth top end - vocal-like quality",
      expectedMid: [26, 32], expectedHighMid: [14, 20], expectedPresence: [6, 12],
      expectedRatio: [0.5, 0.85], expectedCentroid: [1200, 1800],
    },
    bestForIntents: ["lead", "clean"],
    blendNotes: "Adds vocal-like warmth - unique character different from ribbons",
  },

  // ── M88 ──
  {
    mic: "M88", position: "Cap", distance: "1",
    predictedRole: "Foundation", confidence: "medium",
    tonalProfile: {
      character: "TG console vibe, tight controlled low-end, focused midrange",
      expectedMid: [22, 28], expectedHighMid: [20, 26], expectedPresence: [12, 18],
      expectedRatio: [0.85, 1.3], expectedCentroid: [1800, 2500],
    },
    bestForIntents: ["rhythm", "lead"],
    blendNotes: "Underrated alternative to MD421 - different attack character",
  },
  {
    mic: "M88", position: "CapEdge", distance: "1",
    predictedRole: "Foundation", confidence: "medium",
    tonalProfile: {
      character: "Balanced, controlled, vintage character with tight bass",
      expectedMid: [24, 30], expectedHighMid: [18, 24], expectedPresence: [10, 16],
      expectedRatio: [0.7, 1.15], expectedCentroid: [1600, 2300],
    },
    bestForIntents: ["rhythm"],
    blendNotes: "Vintage vibe foundation - pairs well with modern dynamics",
  },

  // ── M201 ──
  {
    mic: "M201", position: "Cap", distance: "1",
    predictedRole: "Cut Layer", confidence: "medium",
    tonalProfile: {
      character: "Hypercardioid, very focused pickup, surgical precision, forward mids",
      expectedMid: [20, 26], expectedHighMid: [22, 28], expectedPresence: [14, 20],
      expectedRatio: [1.0, 1.45], expectedCentroid: [2000, 2800],
    },
    bestForIntents: ["lead", "rhythm"],
    blendNotes: "Focused pickup pattern rejects bleed - clean cut layer",
  },
  {
    mic: "M201", position: "CapEdge", distance: "1",
    predictedRole: "Foundation", confidence: "medium",
    tonalProfile: {
      character: "Focused, precise, less room interaction - neutral foundation",
      expectedMid: [24, 30], expectedHighMid: [18, 24], expectedPresence: [10, 16],
      expectedRatio: [0.7, 1.15], expectedCentroid: [1700, 2400],
    },
    bestForIntents: ["rhythm", "lead"],
    blendNotes: "Surgical precision - captures exactly what the speaker does",
  },

  // ── R-121 / R10 (Ribbons) ──
  {
    mic: "R121", position: "Cap", distance: "4",
    predictedRole: "Fizz Tamer", confidence: "high",
    tonalProfile: {
      character: "Smooth, dark, rolled-off highs with warm low-mid body",
      expectedMid: [26, 32], expectedHighMid: [14, 20], expectedPresence: [4, 10],
      expectedRatio: [0.45, 0.75], expectedCentroid: [1000, 1600],
    },
    bestForIntents: ["rhythm", "clean"],
    blendNotes: "Classic SM57 pairing partner - adds the warmth SM57 lacks",
  },
  {
    mic: "R121", position: "Cap", distance: "6",
    predictedRole: "Dark Specialty", confidence: "high",
    tonalProfile: {
      character: "Very warm, dark ribbon tone with distant smoothness",
      expectedMid: [28, 34], expectedHighMid: [12, 18], expectedPresence: [3, 8],
      expectedRatio: [0.35, 0.65], expectedCentroid: [900, 1400],
    },
    bestForIntents: ["rhythm", "clean"],
    blendNotes: "Maximum warmth/darkness - use in small amounts for body",
  },
  {
    mic: "R121", position: "CapEdge", distance: "4",
    predictedRole: "Foundation", confidence: "high",
    tonalProfile: {
      character: "Balanced ribbon warmth, smooth mids, controlled highs",
      expectedMid: [24, 30], expectedHighMid: [16, 22], expectedPresence: [6, 12],
      expectedRatio: [0.6, 1.0], expectedCentroid: [1300, 2000],
    },
    bestForIntents: ["clean", "rhythm"],
    blendNotes: "Most versatile ribbon position - smooth foundation",
  },
  {
    mic: "R121", position: "CapEdge", distance: "6",
    predictedRole: "Fizz Tamer", confidence: "high",
    tonalProfile: {
      character: "Warm, smooth, rolled-off top with nice body",
      expectedMid: [26, 32], expectedHighMid: [14, 20], expectedPresence: [4, 10],
      expectedRatio: [0.5, 0.8], expectedCentroid: [1100, 1700],
    },
    bestForIntents: ["clean", "rhythm"],
    blendNotes: "Smooth fizz control with body - great for taming harsh amps",
  },
  {
    mic: "R10", position: "Cap", distance: "4",
    predictedRole: "Fizz Tamer", confidence: "high",
    tonalProfile: {
      character: "Similar to R121 - smooth, dark ribbon character",
      expectedMid: [26, 32], expectedHighMid: [14, 20], expectedPresence: [4, 10],
      expectedRatio: [0.45, 0.75], expectedCentroid: [1000, 1600],
    },
    bestForIntents: ["rhythm", "clean"],
    blendNotes: "R121 alternative - similar role, slight character differences",
  },
  {
    mic: "R10", position: "CapEdge", distance: "4",
    predictedRole: "Foundation", confidence: "medium",
    tonalProfile: {
      character: "Balanced ribbon warmth, similar to R121 CapEdge",
      expectedMid: [24, 30], expectedHighMid: [16, 22], expectedPresence: [6, 12],
      expectedRatio: [0.6, 1.0], expectedCentroid: [1300, 2000],
    },
    bestForIntents: ["clean", "rhythm"],
    blendNotes: "Warm foundation option - interchangeable with R121 at this position",
  },

  // ── R92 ──
  {
    mic: "R92", position: "Cap", distance: "4",
    predictedRole: "Fizz Tamer", confidence: "medium",
    tonalProfile: {
      character: "Similar to R121 but different proximity effect - slightly different lows",
      expectedMid: [25, 31], expectedHighMid: [14, 20], expectedPresence: [4, 10],
      expectedRatio: [0.5, 0.8], expectedCentroid: [1050, 1650],
    },
    bestForIntents: ["rhythm", "clean"],
    blendNotes: "R121 alternative with different proximity effect character",
  },
  {
    mic: "R92", position: "CapEdge", distance: "4",
    predictedRole: "Foundation", confidence: "medium",
    tonalProfile: {
      character: "Warm, balanced ribbon tone, smooth mids",
      expectedMid: [24, 30], expectedHighMid: [16, 22], expectedPresence: [6, 12],
      expectedRatio: [0.6, 1.0], expectedCentroid: [1300, 2000],
    },
    bestForIntents: ["clean", "rhythm"],
    blendNotes: "Alternative ribbon foundation - similar niche to R121/R10",
  },

  // ── M160 ──
  {
    mic: "M160", position: "Cap", distance: "2",
    predictedRole: "Fizz Tamer", confidence: "high",
    tonalProfile: {
      character: "Tighter, more focused ribbon - hypercardioid pattern, less room",
      expectedMid: [24, 30], expectedHighMid: [16, 22], expectedPresence: [6, 12],
      expectedRatio: [0.6, 1.0], expectedCentroid: [1300, 2000],
    },
    bestForIntents: ["rhythm", "lead"],
    blendNotes: "Tighter than R121 - can be placed closer, more focused ribbon tone",
  },
  {
    mic: "M160", position: "CapEdge", distance: "2",
    predictedRole: "Foundation", confidence: "medium",
    tonalProfile: {
      character: "Focused ribbon warmth with controlled pickup pattern",
      expectedMid: [25, 31], expectedHighMid: [16, 22], expectedPresence: [7, 13],
      expectedRatio: [0.6, 0.95], expectedCentroid: [1400, 2100],
    },
    bestForIntents: ["rhythm", "clean"],
    blendNotes: "More focused ribbon alternative - tighter than R121 family",
  },

  // ── Roswell Cab Mic (Condenser) ──
  {
    mic: "Roswell", position: "Global", distance: "6",
    predictedRole: "Lead Polish", confidence: "high",
    tonalProfile: {
      character: "Full-range cab picture, extended highs and lows, detailed",
      expectedMid: [20, 26], expectedHighMid: [20, 26], expectedPresence: [14, 20],
      expectedRatio: [0.9, 1.4], expectedCentroid: [2000, 3000],
    },
    bestForIntents: ["lead", "clean"],
    blendNotes: "True cab picture - reveals what dynamics/ribbons color over",
  },

  // ── C414 (Condenser) ──
  {
    mic: "C414", position: "Cap", distance: "4",
    predictedRole: "Lead Polish", confidence: "high",
    tonalProfile: {
      character: "Detailed clarity, true picture with extended high frequency response",
      expectedMid: [20, 26], expectedHighMid: [22, 28], expectedPresence: [16, 22],
      expectedRatio: [1.0, 1.5], expectedCentroid: [2200, 3200],
    },
    bestForIntents: ["lead", "clean"],
    blendNotes: "Hi-fi reference mic - reveals true speaker character",
  },
  {
    mic: "C414", position: "CapEdge", distance: "4",
    predictedRole: "Foundation", confidence: "medium",
    tonalProfile: {
      character: "Balanced condenser detail, smooth extended response",
      expectedMid: [22, 28], expectedHighMid: [19, 25], expectedPresence: [12, 18],
      expectedRatio: [0.85, 1.3], expectedCentroid: [1900, 2700],
    },
    bestForIntents: ["lead", "clean"],
    blendNotes: "Detailed foundation - hi-fi character for pristine tones",
  },
];

export function lookupMicRole(mic: string, position: string, distance?: string): MicRoleRule | undefined {
  const normMic = mic.toUpperCase().replace(/[-\s]/g, '');
  const normPos = position.toLowerCase().replace(/[-\s]/g, '');

  let best: MicRoleRule | undefined;
  let bestScore = -1;

  for (const rule of MIC_ROLE_KB) {
    const ruleMic = rule.mic.toUpperCase().replace(/[-\s]/g, '');
    const rulePos = rule.position.toLowerCase().replace(/[-\s]/g, '');

    if (!normMic.includes(ruleMic) && !ruleMic.includes(normMic)) continue;
    if (!normPos.includes(rulePos) && !rulePos.includes(normPos)) continue;

    let score = 1;
    if (distance && rule.distance && rule.distance === distance) score += 2;
    if (normMic === ruleMic) score += 1;
    if (normPos === rulePos) score += 1;

    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }
  return best;
}

export function predictRoleFromGear(mic: string, position: string, distance?: string): {
  role: MusicalRole;
  confidence: "high" | "medium" | "low";
  source: "knowledge-base" | "heuristic";
} {
  const rule = lookupMicRole(mic, position, distance);
  if (rule) {
    return { role: rule.predictedRole, confidence: rule.confidence, source: "knowledge-base" };
  }

  const normPos = position.toLowerCase();
  if (normPos.includes("cap") && !normPos.includes("edge") && !normPos.includes("cone")) {
    return { role: "Cut Layer", confidence: "low", source: "heuristic" };
  }
  if (normPos.includes("cone") && !normPos.includes("cap")) {
    return { role: "Mid Thickener", confidence: "low", source: "heuristic" };
  }
  return { role: "Foundation", confidence: "low", source: "heuristic" };
}

export interface IntentAllocation {
  rhythm: number;
  lead: number;
  clean: number;
}

export const DEFAULT_INTENT_ALLOCATION: IntentAllocation = {
  rhythm: 6,
  lead: 3,
  clean: 2,
};

export interface IntentRoleBudget {
  intent: Intent;
  count: number;
  recommendedRoles: { role: MusicalRole; count: number; reason: string }[];
}

export function computeRoleBudgets(allocation: IntentAllocation): IntentRoleBudget[] {
  return [
    {
      intent: "rhythm",
      count: allocation.rhythm,
      recommendedRoles: distributeRolesForIntent("rhythm", allocation.rhythm),
    },
    {
      intent: "lead",
      count: allocation.lead,
      recommendedRoles: distributeRolesForIntent("lead", allocation.lead),
    },
    {
      intent: "clean",
      count: allocation.clean,
      recommendedRoles: distributeRolesForIntent("clean", allocation.clean),
    },
  ];
}

function distributeRolesForIntent(intent: Intent, count: number): { role: MusicalRole; count: number; reason: string }[] {
  if (count <= 0) return [];

  const templates: Record<Intent, { role: MusicalRole; weight: number; reason: string }[]> = {
    rhythm: [
      { role: "Foundation", weight: 0.35, reason: "Solid base layer for rhythm tone - balanced, sits well in mix" },
      { role: "Cut Layer", weight: 0.25, reason: "Adds attack and presence to rhythm parts for mix clarity" },
      { role: "Mid Thickener", weight: 0.20, reason: "Body and warmth for thick rhythm wall" },
      { role: "Fizz Tamer", weight: 0.15, reason: "Smooths harsh frequencies in high-gain rhythm tones" },
      { role: "Dark Specialty", weight: 0.05, reason: "Occasional dark layer for depth and variety" },
    ],
    lead: [
      { role: "Foundation", weight: 0.30, reason: "Smooth, balanced base for lead tone" },
      { role: "Cut Layer", weight: 0.30, reason: "Presence and bite for lead articulation and note separation" },
      { role: "Lead Polish", weight: 0.25, reason: "Refined, hi-fi detail for singing lead tones" },
      { role: "Mid Thickener", weight: 0.10, reason: "Optional warmth for smoother lead character" },
      { role: "Fizz Tamer", weight: 0.05, reason: "Controls fizz in high-gain lead settings" },
    ],
    clean: [
      { role: "Foundation", weight: 0.40, reason: "Clean, neutral base that reproduces speaker character" },
      { role: "Lead Polish", weight: 0.30, reason: "Detail and sparkle for clean tones" },
      { role: "Fizz Tamer", weight: 0.15, reason: "Smoothness for bell-like clean tones" },
      { role: "Mid Thickener", weight: 0.10, reason: "Warmth for jazz/blues clean tones" },
      { role: "Dark Specialty", weight: 0.05, reason: "Deep, dark clean for ambient/jazz sounds" },
    ],
  };

  const template = templates[intent];
  const result: { role: MusicalRole; count: number; reason: string }[] = [];

  let remaining = count;
  for (const t of template) {
    const allocated = Math.max(0, Math.round(count * t.weight));
    if (allocated > 0 && remaining > 0) {
      const actual = Math.min(allocated, remaining);
      result.push({ role: t.role, count: actual, reason: t.reason });
      remaining -= actual;
    }
  }

  if (remaining > 0 && result.length > 0) {
    result[0].count += remaining;
  }

  return result.filter(r => r.count > 0);
}

export function buildKnowledgeBasePromptSection(): string {
  const grouped = new Map<string, MicRoleRule[]>();
  for (const rule of MIC_ROLE_KB) {
    const key = rule.mic;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(rule);
  }

  let section = "=== MIC/POSITION ROLE KNOWLEDGE BASE (data-driven predictions) ===\n";
  section += "Use this knowledge base to assign the correct musical role to each shot. These are based on real-world tonal analysis data.\n\n";

  for (const [mic, rules] of Array.from(grouped.entries())) {
    section += `${mic}:\n`;
    for (const r of rules) {
      const dist = r.distance ? ` @ ${r.distance}in` : '';
      section += `  ${r.position}${dist} → ${r.predictedRole} (${r.confidence} confidence)\n`;
      section += `    Character: ${r.tonalProfile.character}\n`;
      section += `    Expected: Mid ${r.tonalProfile.expectedMid[0]}-${r.tonalProfile.expectedMid[1]}%, HiMid ${r.tonalProfile.expectedHighMid[0]}-${r.tonalProfile.expectedHighMid[1]}%, Ratio ${r.tonalProfile.expectedRatio[0]}-${r.tonalProfile.expectedRatio[1]}\n`;
      section += `    Best for: ${r.bestForIntents.join(', ')}\n`;
    }
    section += '\n';
  }

  return section;
}

export function buildIntentBudgetPromptSection(budgets: IntentRoleBudget[]): string {
  let section = "=== INTENT-BASED COLLECTION PLAN ===\n";
  section += "The user needs shots for these specific playing contexts. Design the collection to cover ALL intents:\n\n";

  for (const b of budgets) {
    if (b.count <= 0) continue;
    section += `${b.intent.toUpperCase()} (${b.count} shots needed):\n`;
    for (const r of b.recommendedRoles) {
      section += `  ${r.count}x ${r.role}: ${r.reason}\n`;
    }
    section += '\n';
  }

  section += "IMPORTANT: A single shot CAN serve multiple intents if its role fits.\n";
  section += "For example, a Foundation shot (SM57@CapEdge) can serve rhythm AND clean.\n";
  section += "Assign each shot a PRIMARY intent and list any SECONDARY intents it serves.\n";
  section += "The total unique shots should be optimized - reuse shots across intents when appropriate.\n";

  return section;
}
