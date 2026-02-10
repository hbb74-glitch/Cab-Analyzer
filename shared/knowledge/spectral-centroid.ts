export const MIC_BASE_CENTROID_RANGES: Record<string, { min: number; max: number; description: string }> = {
  'sm57': { min: 2200, max: 3000, description: 'Classic dynamic, mid-forward, aggressive' },
  'r121': { min: 1500, max: 2200, description: 'Ribbon, smooth highs, big low-mid' },
  'r10': { min: 1500, max: 2200, description: 'Ribbon, smooth and warm' },
  'r92': { min: 1400, max: 2100, description: 'Ribbon, similar to R121, slightly darker' },
  'm160': { min: 1800, max: 2600, description: 'Hypercardioid ribbon, tighter and focused' },
  'md421': { min: 2000, max: 2800, description: 'Large diaphragm dynamic, punchy' },
  'md441': { min: 2300, max: 3200, description: 'Dynamic, very accurate (flat mode)' },
  'md441_presence': { min: 2600, max: 3500, description: 'MD441 with presence boost' },
  'm88': { min: 1900, max: 2700, description: 'Warm, great low-end punch' },
  'pr30': { min: 2800, max: 3800, description: 'Large diaphragm dynamic, very bright and clear' },
  'e906': { min: 2300, max: 3200, description: 'Supercardioid (flat mode)' },
  'e906_presence': { min: 2600, max: 3600, description: 'e906 with presence boost engaged' },
  'm201': { min: 2100, max: 2800, description: 'Very accurate dynamic' },
  'sm7b': { min: 1700, max: 2400, description: 'Smooth, thick dynamic' },
  'c414': { min: 2600, max: 3600, description: 'Condenser, detailed highs' },
  'roswell': { min: 1400, max: 2400, description: 'Roswell Cab Mic - warm condenser, wider range to accommodate consistent output across speakers' },
  // SM57+R121 blend variants based on refined ratios
  'sm57_r121_tight': { min: 2100, max: 2850, description: 'SM57+R121 67:33 - modern/tight, keeps bite and attack' },
  'sm57_r121_balance': { min: 2000, max: 2750, description: 'SM57+R121 60:40 - default, best overall translation' },
  'sm57_r121_thick': { min: 1850, max: 2600, description: 'SM57+R121 51:49 - near-equal, bigger fuller tones' },
  'sm57_r121_smooth': { min: 1750, max: 2500, description: 'SM57+R121 45:55 - ribbon-leaning, polished transient' },
  'sm57_r121_ribbon_dom': { min: 1650, max: 2400, description: 'SM57+R121 24:76 - ribbon-dominant, maximum warmth' },
};

// SM57+R121 blend ratio labels (refined empirical calibration)
export const COMBO_BLEND_RATIOS: Record<string, { sm57: number; r121: number; description: string }> = {
  'tight': { sm57: 67, r121: 33, description: 'Modern/tight; keeps bite and attack' },
  'balance': { sm57: 60, r121: 40, description: 'Default; best overall translation' },
  'thick': { sm57: 51, r121: 49, description: 'Near-equal body; bigger, fuller tones' },
  'smooth': { sm57: 45, r121: 55, description: 'Ribbon-leaning; polished/softer transient' },
  'ribbon_dom': { sm57: 24, r121: 76, description: 'Ribbon-dominant; unattenuated R121, maximum warmth' },
};

export const POSITION_OFFSETS: Record<string, { offset: number; description: string }> = {
  'cap': { offset: 400, description: 'Dead center of the dust cap, brightest position' },
  'cap_offcenter': { offset: 250, description: 'Small lateral offset from Cap, still fully on the dust cap' },
  'capedge': { offset: 0, description: 'Seam line where the dust cap meets the cone (baseline)' },
  'capedge_br': { offset: 150, description: 'CapEdge favoring the cap side of the seam, brighter' },
  'capedge_dk': { offset: -150, description: 'CapEdge favoring the cone side of the seam, darker' },
  'cap_cone_tr': { offset: -250, description: 'Smooth cone immediately past the cap edge, transition zone' },
  'cone': { offset: -500, description: 'True mid-cone position (halfway from center to surround on most speakers), ribs allowed' },
  'blend': { offset: 0, description: 'Combo IR blend - no position offset, uses mic base range directly' },
};

// Distance offsets - closer distances pick up more proximity effect and harsh fizz from dust cap
// Calibrated from user feedback: 1" cap sounds "fuzzy and harsh" vs 2"+ sounds cleaner
export const DISTANCE_OFFSETS: Record<string, { offset: number; description: string }> = {
  '0.5': { offset: 150, description: 'Very close - extreme proximity effect, harshest' },
  '0.5in': { offset: 150, description: 'Very close - extreme proximity effect, harshest' },
  '1': { offset: 100, description: 'Close - significant proximity effect, can be harsh on cap' },
  '1in': { offset: 100, description: 'Close - significant proximity effect, can be harsh on cap' },
  '1inch': { offset: 100, description: 'Close - significant proximity effect, can be harsh on cap' },
  '2': { offset: 0, description: 'Standard distance - balanced tone (baseline)' },
  '2in': { offset: 0, description: 'Standard distance - balanced tone (baseline)' },
  '3': { offset: -50, description: 'Moderate distance - slightly darker, less proximity' },
  '3in': { offset: -50, description: 'Moderate distance - slightly darker, less proximity' },
  '4': { offset: -100, description: 'Far - darker, minimal proximity effect' },
  '4in': { offset: -100, description: 'Far - darker, minimal proximity effect' },
  '6': { offset: -150, description: 'Very far - darkest, room influence' },
  '6in': { offset: -150, description: 'Very far - darkest, room influence' },
};

// Quality penalty for risky position+distance combinations
// Some combos sound bad regardless of centroid being "in range"
export interface DistancePositionPenalty {
  scorePenalty: number;
  note: string;
}

export function getDistancePositionPenalty(position: string, distance: string, speaker: string): DistancePositionPenalty {
  const pos = normalizePosition(position);
  const dist = distance.toLowerCase().replace(/[^0-9.]/g, '');
  const spk = normalizeSpeaker(speaker);
  
  // 1" or closer at dead-center cap = high risk of harsh/fizzy tone
  // Especially problematic on darker speakers like G12T-75 where the cap fizz stands out
  if ((dist === '1' || dist === '0.5') && pos === 'cap') {
    // G12T-75 specifically flagged as problematic at 1" cap based on user feedback
    if (spk === 'g12t75') {
      return { scorePenalty: -4, note: 'G12T-75 at 1" cap often sounds fuzzy/harsh - try 2"+ or cap_offcenter' };
    }
    // Other speakers: moderate penalty
    return { scorePenalty: -2, note: '1" cap can sound harsh/fizzy - try 2"+ or cap_offcenter' };
  }
  
  // Cap off-center at 1" is generally fine
  if ((dist === '1' || dist === '0.5') && pos === 'cap_offcenter') {
    return { scorePenalty: 0, note: 'Cap off-center works well even at close distances' };
  }
  
  return { scorePenalty: 0, note: '' };
}

export const SPEAKER_OFFSETS: Record<string, { offset: number; description: string }> = {
  // Calibrated from actual IR measurements (SM57 CapEdge baseline = 2600 Hz)
  'v30': { offset: 650, description: 'Aggressive upper-mids, very bright' },
  'v30bc': { offset: 275, description: 'Smoother than standard V30' },
  'greenback': { offset: 450, description: 'Brighter than expected, mid-forward' },
  'g12m': { offset: 450, description: 'Greenback variant' },
  'g12t75': { offset: -500, description: 'Actually quite dark, scooped mids' },
  'g12-65': { offset: -100, description: 'Warm, punchy, large sound' },
  'g12h': { offset: 225, description: 'Tight bass, bright highs' },
  'cream': { offset: 550, description: 'Alnico - brighter than expected' },
  'ga12-sc64': { offset: 50, description: 'Vintage American, tight and punchy' },
  'ga10-sc64': { offset: 100, description: '10 inch version, more focused highs' },
  'k100': { offset: 325, description: 'Big low end, brighter than neutral' },
  'karnivore': { offset: 400, description: 'Aggressive upper-mids, tight bass, extended highs for modern metal' },
};

function normalizeMicName(mic: string): string {
  const lower = mic.toLowerCase().replace(/[^a-z0-9_]/g, '');
  
  // Combo mics with blend labels (check first before generic combo)
  const isCombo = (lower.includes('sm57') && lower.includes('r121')) ||
                  (lower.includes('57') && lower.includes('121'));
  
  if (isCombo) {
    // Check for specific blend labels (including "balanced" alias)
    if (lower.includes('tight')) return 'sm57_r121_tight';
    if (lower.includes('balanced') || lower.includes('balance')) return 'sm57_r121_balance';
    if (lower.includes('thick')) return 'sm57_r121_thick';
    if (lower.includes('smooth')) return 'sm57_r121_smooth';
    // "combo" is legacy name for ribbon_dom (24:76 unattenuated R121)
    if (lower.includes('ribbon_dom') || lower.includes('ribbondom') || lower.includes('combo')) return 'sm57_r121_ribbon_dom';
    // All combo IRs must be labeled - treat unlabeled as regular SM57 (won't match combo ranges)
  }
  
  if (lower.includes('e906') && (lower.includes('presence') || lower.includes('boost'))) return 'e906_presence';
  if (lower.includes('e906')) return 'e906';
  if (lower.includes('md441') && (lower.includes('presence') || lower.includes('boost'))) return 'md441_presence';
  if (lower.includes('md441')) return 'md441';
  if (lower.includes('md421') && lower.includes('kompakt')) return 'md421'; // Kompakt treated as standard MD421
  if (lower.includes('md421') || lower === '421') return 'md421';
  if (lower.includes('sm57') || lower === '57') return 'sm57';
  if (lower.includes('sm7b') || lower === 'sm7') return 'sm7b';
  if (lower.includes('r121') || lower === '121') return 'r121';
  if (lower.includes('r92') || lower === '92') return 'r92';
  if (lower === 'r10') return 'r10';
  if (lower.includes('m160') || lower === '160') return 'm160';
  if (lower.includes('m88') || lower === '88') return 'm88';
  if (lower.includes('m201') || lower === '201') return 'm201';
  if (lower.includes('pr30') || lower === '30') return 'pr30';
  if (lower.includes('c414') || lower === '414') return 'c414';
  if (lower.includes('roswell')) return 'roswell';
  
  return lower;
}

function normalizePosition(position: string): string {
  const lower = position.toLowerCase().replace(/[^a-z0-9_]/g, '');
  
  // New naming convention
  if (lower.includes('capedge_br') || lower.includes('capedgebr')) return 'capedge_br';
  if (lower.includes('capedge_dk') || lower.includes('capedgedk')) return 'capedge_dk';
  if (lower.includes('capedge_cone_tr') || lower.includes('capedgeconetr') || lower.includes('cone_tr') || lower.includes('cap_cone_tr') || lower.includes('capconetr')) return 'cap_cone_tr';
  // Legacy mappings for backwards compatibility
  if (lower.includes('capedge') && lower.includes('favorcap')) return 'capedge_br';
  if (lower.includes('capedge') && lower.includes('favorcone')) return 'capedge_dk';
  
  // "Halfway from center to edge" = mid-cone position (cone)
  // This refers to the geometric center of the entire speaker radius, not the dust cap
  if (lower.includes('halfway') || lower.includes('midway') || lower.includes('halfedge') || lower.includes('midcone') || lower.includes('mid_cone')) return 'cone';
  if (lower.includes('half') && lower.includes('edge')) return 'cone';
  if (lower.includes('center') && lower.includes('edge')) return 'cone';
  
  // Standard positions
  if (lower.includes('capedge') || lower.includes('cap_edge')) return 'capedge';
  if (lower.includes('offcenter') || lower.includes('off_center')) return 'cap_offcenter';
  if (lower === 'cap') return 'cap';
  if (lower.includes('cone')) return 'cone';
  
  return 'capedge';
}

function normalizeSpeaker(speaker: string): string {
  const lower = speaker.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (lower.includes('v30') && (lower.includes('bc') || lower.includes('blackcat'))) return 'v30bc';
  if (lower.includes('v30') || lower.includes('vintage30')) return 'v30';
  if (lower.includes('greenback') || lower.includes('g12m25') || lower === 'g12m') return 'greenback';
  if (lower.includes('g12t75')) return 'g12t75';
  if (lower.includes('g1265') || lower.includes('heritage') || lower.includes('g12-65')) return 'g12-65';
  if (lower.includes('g12h') || lower.includes('anni')) return 'g12h';
  if (lower.includes('cream')) return 'cream';
  if (lower.includes('ga12') || lower.includes('sc64') && lower.includes('12')) return 'ga12-sc64';
  if (lower.includes('ga10') || lower.includes('g10')) return 'ga10-sc64';
  if (lower.includes('k100')) return 'k100';
  if (lower.includes('karnivore') || lower.includes('karni')) return 'karnivore';
  
  return 'v30';
}

function normalizeDistance(distance: string): string {
  if (!distance) return '2'; // Default to 2" (baseline)
  const lower = distance.toLowerCase().replace(/[^0-9.]/g, '');
  
  // Match common distance formats
  if (lower === '0.5' || lower === '05') return '0.5';
  if (lower === '1' || lower === '1.0') return '1';
  if (lower === '2' || lower === '2.0') return '2';
  if (lower === '3' || lower === '3.0') return '3';
  if (lower === '4' || lower === '4.0') return '4';
  if (lower === '6' || lower === '6.0') return '6';
  
  // Try to parse any number
  const num = parseFloat(lower);
  if (!isNaN(num)) {
    if (num <= 0.75) return '0.5';
    if (num <= 1.5) return '1';
    if (num <= 2.5) return '2';
    if (num <= 3.5) return '3';
    if (num <= 5) return '4';
    return '6';
  }
  
  return '2'; // Default baseline
}

export interface ExpectedCentroidResult {
  min: number;
  max: number;
  baseline: number;
  micRange: { min: number; max: number };
  positionOffset: number;
  speakerOffset: number;
  distanceOffset: number;
  micName: string;
  positionName: string;
  speakerName: string;
  distanceName: string;
}

export function getExpectedCentroidRange(
  mic: string,
  position: string,
  speaker: string,
  distance?: string
): ExpectedCentroidResult {
  const normalizedMic = normalizeMicName(mic);
  const normalizedPosition = normalizePosition(position);
  const normalizedSpeaker = normalizeSpeaker(speaker);
  const normalizedDistance = normalizeDistance(distance || '2');
  
  const micRange = MIC_BASE_CENTROID_RANGES[normalizedMic] || { min: 2000, max: 2800 };
  const positionOffset = POSITION_OFFSETS[normalizedPosition]?.offset || 0;
  const speakerOffset = SPEAKER_OFFSETS[normalizedSpeaker]?.offset || 0;
  const distanceOffset = DISTANCE_OFFSETS[normalizedDistance]?.offset || 0;
  
  const totalOffset = positionOffset + speakerOffset + distanceOffset;
  
  return {
    min: micRange.min + totalOffset,
    max: micRange.max + totalOffset,
    baseline: (micRange.min + micRange.max) / 2 + totalOffset,
    micRange: { min: micRange.min, max: micRange.max },
    positionOffset,
    speakerOffset,
    distanceOffset,
    micName: normalizedMic,
    positionName: normalizedPosition,
    speakerName: normalizedSpeaker,
    distanceName: normalizedDistance,
  };
}

export function calculateCentroidDeviation(
  actualCentroid: number,
  expected: ExpectedCentroidResult
): { deviation: number; deviationPercent: number; isWithinRange: boolean; direction: 'bright' | 'dark' | 'normal' } {
  if (actualCentroid >= expected.min && actualCentroid <= expected.max) {
    return { deviation: 0, deviationPercent: 0, isWithinRange: true, direction: 'normal' };
  }
  
  const rangeWidth = expected.max - expected.min;
  
  if (actualCentroid > expected.max) {
    const deviation = actualCentroid - expected.max;
    return {
      deviation,
      deviationPercent: (deviation / rangeWidth) * 100,
      isWithinRange: false,
      direction: 'bright',
    };
  } else {
    const deviation = expected.min - actualCentroid;
    return {
      deviation,
      deviationPercent: (deviation / rangeWidth) * 100,
      isWithinRange: false,
      direction: 'dark',
    };
  }
}

export function getDeviationScoreAdjustment(deviationPercent: number): number {
  if (deviationPercent <= 0) return 0;
  if (deviationPercent <= 25) return -1;
  if (deviationPercent <= 50) return -2;
  if (deviationPercent <= 75) return -3;
  if (deviationPercent <= 100) return -4;
  if (deviationPercent <= 150) return -5;
  return -6;
}

// Mic-specific smoothness baselines (75Hz-5kHz range)
// Based on empirical data from real IR captures
// Each mic has an expected range - scores within range are "normal for that mic"
// Calibrated from empirical batch data (111 IRs, 2048-4096 sample truncated IRs at 44.1kHz)
// Balanced ranges: not too strict (flagging good IRs) or too lenient (missing issues)
export const MIC_SMOOTHNESS_BASELINES: Record<string, { min: number; max: number; avg: number; description: string }> = {
  'sm57': { min: 62, max: 78, avg: 70, description: 'Classic dynamic, mid-forward character' },
  'r121': { min: 66, max: 80, avg: 73, description: 'Ribbon, naturally smooth high-end rolloff' },
  'r10': { min: 66, max: 80, avg: 73, description: 'Ribbon, similar to R121' },
  'r92': { min: 66, max: 80, avg: 73, description: 'Ribbon, smooth and warm' },
  'm160': { min: 64, max: 78, avg: 71, description: 'Hypercardioid ribbon, focused response' },
  'md421': { min: 62, max: 78, avg: 70, description: 'Large diaphragm dynamic, punchy' },
  'md421kompakt': { min: 62, max: 78, avg: 70, description: 'Compact variant, similar to MD421' },
  'md441': { min: 64, max: 78, avg: 71, description: 'Very accurate dynamic' },
  'm88': { min: 60, max: 76, avg: 68, description: 'Warm dynamic, moderate smoothness' },
  'pr30': { min: 64, max: 80, avg: 72, description: 'Large diaphragm, smooth response' },
  'e906': { min: 60, max: 76, avg: 68, description: 'Supercardioid, switch-dependent' },
  'e906_presence': { min: 60, max: 76, avg: 68, description: 'Presence mode, similar smoothness' },
  'm201': { min: 62, max: 76, avg: 69, description: 'Hypercardioid, accurate response' },
  'sm7b': { min: 64, max: 78, avg: 71, description: 'Smooth, thick dynamic' },
  'c414': { min: 62, max: 78, avg: 70, description: 'Condenser, detailed response' },
  'roswell': { min: 58, max: 78, avg: 68, description: 'Roswell Cab Mic, variable by position' },
  // Combo IR smoothness - empirically calibrated from V30 combo IRs (typically 60-66 range)
  // Blends don't inherently smooth the response; they combine two mic characteristics
  'sm57_r121_tight': { min: 54, max: 70, avg: 62, description: '67:33 blend, SM57-forward character' },
  'sm57_r121_balance': { min: 56, max: 70, avg: 63, description: '55:45 blend, balanced characteristics' },
  'sm57_r121_thick': { min: 54, max: 70, avg: 62, description: '51:49 blend, full and thick' },
  'sm57_r121_smooth': { min: 56, max: 72, avg: 64, description: '45:55 blend, R121-forward character' },
  'sm57_r121_ribbon_dom': { min: 58, max: 74, avg: 66, description: '24:76 blend, ribbon-dominant warmth' },
};

// Default baseline for unknown mics
const DEFAULT_SMOOTHNESS_BASELINE = { min: 55, max: 80, avg: 68, description: 'Default baseline' };

export function getMicSmoothnessBaseline(mic: string): { min: number; max: number; avg: number; description: string } {
  const normalized = mic.toLowerCase().replace(/[^a-z0-9_]/g, '');
  
  // Check for exact match first
  if (MIC_SMOOTHNESS_BASELINES[normalized]) {
    return MIC_SMOOTHNESS_BASELINES[normalized];
  }
  
  // Check for partial matches
  for (const [key, baseline] of Object.entries(MIC_SMOOTHNESS_BASELINES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return baseline;
    }
  }
  
  return DEFAULT_SMOOTHNESS_BASELINE;
}

// Calculate smoothness score adjustment relative to mic's expected range
export function getMicRelativeSmoothnessAdjustment(mic: string, smoothness: number): { adjustment: number; note: string } {
  const baseline = getMicSmoothnessBaseline(mic);
  
  // Score relative to mic's expected range
  // Be forgiving - guitar cab IRs naturally have character/peaks
  if (smoothness >= baseline.max) {
    return { adjustment: 1, note: `Exceptionally smooth for ${mic}` };
  } else if (smoothness >= baseline.min) {
    return { adjustment: 0, note: `Normal smoothness for ${mic}` };
  } else if (smoothness >= baseline.min - 10) {
    // Slightly below range - no penalty, just informational
    return { adjustment: 0, note: `Acceptable smoothness for ${mic}` };
  } else if (smoothness >= baseline.min - 20) {
    // Noticeably below - minor penalty
    return { adjustment: -1, note: `Below average smoothness for ${mic}` };
  } else {
    // Significantly below - this indicates a real issue
    return { adjustment: -2, note: `Rough frequency response for ${mic}` };
  }
}
