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
  'roswell': { min: 2400, max: 3400, description: 'Specialized cab mic condenser' },
};

export const POSITION_OFFSETS: Record<string, { offset: number; description: string }> = {
  'cap': { offset: 400, description: 'Dead center of the dust cap, brightest position' },
  'cap_offcenter': { offset: 250, description: 'Small lateral offset from Cap, still fully on the dust cap' },
  'capedge': { offset: 0, description: 'Seam line where the dust cap meets the cone (baseline)' },
  'capedge_br': { offset: 150, description: 'CapEdge favoring the cap side of the seam, brighter' },
  'capedge_dk': { offset: -150, description: 'CapEdge favoring the cone side of the seam, darker' },
  'cap_cone_tr': { offset: -250, description: 'Smooth cone immediately past the cap edge, transition zone' },
  'cone': { offset: -500, description: 'True mid-cone position, ribs allowed, not near surround' },
};

export const SPEAKER_OFFSETS: Record<string, { offset: number; description: string }> = {
  'v30': { offset: 200, description: 'Aggressive upper-mids, modern rock' },
  'v30bc': { offset: 100, description: 'Smoother than standard V30' },
  'greenback': { offset: -150, description: 'Classic woody, mid-forward' },
  'g12m': { offset: -150, description: 'Greenback variant' },
  'g12t75': { offset: 100, description: 'Scooped mids, sizzly highs' },
  'g12-65': { offset: -50, description: 'Warm, punchy, large sound' },
  'g12h': { offset: 150, description: 'Tight bass, bright highs' },
  'cream': { offset: -100, description: 'Alnico smoothness' },
  'ga12-sc64': { offset: 50, description: 'Vintage American, tight and punchy' },
  'ga10-sc64': { offset: 100, description: '10 inch version, more focused highs' },
  'k100': { offset: 0, description: 'Big low end, neutral' },
};

function normalizeMicName(mic: string): string {
  const lower = mic.toLowerCase().replace(/[^a-z0-9]/g, '');
  
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
  const lower = position.toLowerCase().replace(/[^a-z_]/g, '');
  
  // New naming convention
  if (lower.includes('capedge_br') || lower.includes('capedgebr')) return 'capedge_br';
  if (lower.includes('capedge_dk') || lower.includes('capedgedk')) return 'capedge_dk';
  if (lower.includes('capedge_cone_tr') || lower.includes('capedgeconetr') || lower.includes('cone_tr') || lower.includes('cap_cone_tr') || lower.includes('capconetr')) return 'cap_cone_tr';
  // Legacy mappings for backwards compatibility
  if (lower.includes('capedge') && lower.includes('favorcap')) return 'capedge_br';
  if (lower.includes('capedge') && lower.includes('favorcone')) return 'capedge_dk';
  // Standard positions
  if (lower.includes('capedge') || lower.includes('cap_edge')) return 'capedge';
  if (lower.includes('offcenter') || lower.includes('off_center')) return 'cap_offcenter';
  if (lower === 'cap') return 'cap';
  if (lower === 'cone') return 'cone';
  
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
  
  return 'v30';
}

export interface ExpectedCentroidResult {
  min: number;
  max: number;
  baseline: number;
  micRange: { min: number; max: number };
  positionOffset: number;
  speakerOffset: number;
  micName: string;
  positionName: string;
  speakerName: string;
}

export function getExpectedCentroidRange(
  mic: string,
  position: string,
  speaker: string
): ExpectedCentroidResult {
  const normalizedMic = normalizeMicName(mic);
  const normalizedPosition = normalizePosition(position);
  const normalizedSpeaker = normalizeSpeaker(speaker);
  
  const micRange = MIC_BASE_CENTROID_RANGES[normalizedMic] || { min: 2000, max: 2800 };
  const positionOffset = POSITION_OFFSETS[normalizedPosition]?.offset || 0;
  const speakerOffset = SPEAKER_OFFSETS[normalizedSpeaker]?.offset || 0;
  
  const totalOffset = positionOffset + speakerOffset;
  
  return {
    min: micRange.min + totalOffset,
    max: micRange.max + totalOffset,
    baseline: (micRange.min + micRange.max) / 2 + totalOffset,
    micRange: { min: micRange.min, max: micRange.max },
    positionOffset,
    speakerOffset,
    micName: normalizedMic,
    positionName: normalizedPosition,
    speakerName: normalizedSpeaker,
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
