
import type { Express } from "express";
import type { Server } from "http";
import { createHash } from "crypto";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { getRecipesForSpeaker, getRecipesForMicAndSpeaker, type IRRecipe } from "@shared/knowledge/ir-recipes";
import { getExpectedCentroidRange, calculateCentroidDeviation, getDeviationScoreAdjustment } from "@shared/knowledge/spectral-centroid";

// Genre-to-tonal characteristics mapping for dropdown selections
// Expands genre codes into specific tonal guidance for the AI
const GENRE_TONAL_PROFILES: Record<string, { tonalGoal: string; characteristics: string; avoid: string }> = {
  'classic-rock': {
    tonalGoal: 'warm, fat, punchy rock tone with smooth highs and powerful mids',
    characteristics: 'Think Led Zeppelin, AC/DC, Cream - big creamy overdriven tones, not harsh or fizzy. Prioritize warmth and body over definition. Ribbons and darker positions work well.',
    avoid: 'Avoid overly bright or aggressive combinations. Skip harsh high-end or scooped mids.'
  },
  'hard-rock': {
    tonalGoal: 'tight, punchy, aggressive rock tone with controlled lows and cutting mids',
    characteristics: 'Think Van Halen, Def Leppard, GN\'R - more gain, tighter low-end than classic rock, but still musical and not harsh. Good note definition is important.',
    avoid: 'Avoid muddy or boomy combinations. Skip anything too dark that loses definition.'
  },
  'alternative-rock': {
    tonalGoal: 'textured, dynamic tone with character, edge, and room for effects',
    characteristics: 'Think Pixies, Dinosaur Jr, Radiohead, R.E.M. - can be jangly, noisy, or heavy, but always musical and expressive. Room for dynamics, feedback, and texture is key. Often uses unconventional mic choices.',
    avoid: 'Avoid overly compressed or one-dimensional tones. Skip anything too polished or sterile.'
  },
  'punk': {
    tonalGoal: 'raw, aggressive, in-your-face tone with bite and energy',
    characteristics: 'Think Ramones, Green Day, The Clash - not refined, but powerful and immediate. Close mic positions, aggressive dynamics work well.',
    avoid: 'Avoid anything too smooth, polished, or warm. Skip distant/roomy placements.'
  },
  'grunge': {
    tonalGoal: 'thick, heavy, sludgy tone with massive low-mids and controlled fizz',
    characteristics: 'Think Nirvana, Soundgarden, Alice in Chains, Pearl Jam - walls of sound, detuned heaviness, but still articulate enough to cut through. Big muff-style saturation.',
    avoid: 'Avoid thin, bright, or sterile tones. Skip anything too polished or hi-fi.'
  },
  'classic-metal': {
    tonalGoal: 'tight, powerful, articulate metal tone with punch and clarity',
    characteristics: 'Think Iron Maiden, Judas Priest, Black Sabbath - powerful but musical, good palm mute definition, not overly scooped.',
    avoid: 'Avoid muddy or boomy combinations. Skip overly scooped or fizzy tones.'
  },
  'thrash-metal': {
    tonalGoal: 'ultra-tight, aggressive, scooped metal tone with razor-sharp attack and machine-gun palm mutes',
    characteristics: 'Think Metallica, Slayer, Anthrax, Megadeth - fast, precise, aggressive. Tight low-end is critical for speed riffs. Presence peak for cutting through. Often uses V30s or G12T-75s.',
    avoid: 'Avoid muddy, loose, or boomy combinations. Skip anything warm or smooth that loses definition at speed.'
  },
  'funk-rock': {
    tonalGoal: 'snappy, percussive, clean-to-slightly-dirty tone with tight lows and sparkling highs',
    characteristics: 'Think Red Hot Chili Peppers, Funkadelic, Living Colour - articulate single-note lines, clean slap-back, funky rhythm work. Needs clarity for percussive playing.',
    avoid: 'Avoid overly dark, muddy, or high-gain tones. Skip anything that loses pick attack or note separation.'
  },
  'indie-rock': {
    tonalGoal: 'vintage, characterful tone with warmth and personality',
    characteristics: 'Think The Strokes, Arctic Monkeys, Vampire Weekend - often smaller amps pushed hard, lo-fi character is a feature not a bug.',
    avoid: 'Avoid modern, sterile, or overly produced tones. Skip anything too aggressive or heavy.'
  },
  'blues': {
    tonalGoal: 'warm, vocal, expressive tone with singing sustain and touch sensitivity',
    characteristics: 'Think BB King, SRV, Clapton - responsive to dynamics, creamy overdrive when pushed, clean headroom when backed off. Ribbons and darker positions capture the expressiveness.',
    avoid: 'Avoid harsh, aggressive, or scooped tones. Skip overly bright or clinical combinations.'
  },
  'jazz': {
    tonalGoal: 'round, warm, clean tone with smooth highs and full lows',
    characteristics: 'Think Pat Metheny, Wes Montgomery, Jim Hall - pristine cleans, no fizz, full bodied. Darker positions and ribbon mics excel here.',
    avoid: 'Avoid bright, aggressive, or gritty tones. Skip anything with presence peaks or harsh highs.'
  },
  'country': {
    tonalGoal: 'bright, twangy, snappy tone with sparkling highs and tight attack',
    characteristics: 'Think Brad Paisley, Brent Mason, Vince Gill - chicken pickin\' clarity, Telecaster spank, pristine cleans with shimmer.',
    avoid: 'Avoid dark, muddy, or overly smooth tones. Skip anything that loses pick attack or twang.'
  },
  'doom-stoner': {
    tonalGoal: 'massive, crushing, fuzzy tone with huge low-end and thick mids',
    characteristics: 'Think Electric Wizard, Sleep, Kyuss - slow, heavy, saturated. Big Muff style fuzz, downtuned guitars, massive sustain.',
    avoid: 'Avoid bright, thin, or clinical tones. Skip anything tight or controlled - embrace the sludge.'
  },
  'shoegaze': {
    tonalGoal: 'washy, ethereal, layered tone with smooth textures and ambient quality',
    characteristics: 'Think My Bloody Valentine, Slowdive, Ride - reverb-drenched, layered, swirling. Tone serves the texture, not the attack.',
    avoid: 'Avoid aggressive, punchy, or forward tones. Skip anything too focused or direct.'
  },
  'post-punk': {
    tonalGoal: 'angular, dark, jangly tone with character and edge',
    characteristics: 'Think Joy Division, The Cure, Interpol - can be cold and sparse or lush and atmospheric. Often uses chorus and delay.',
    avoid: 'Avoid overly warm, smooth, or vintage tones. Skip anything too polished or refined.'
  }
};

// Tonal keyword mappings for custom text analysis
const TONAL_KEYWORDS = {
  bright: {
    synonyms: ['spanky', 'sparkly', 'crisp', 'cutting', 'present', 'articulate', 'snappy', 'chimey', 'glassy', 'brilliant', 'airy', 'open', 'sizzle', 'twang', 'jangle'],
    avoid: ['M160', 'R121', 'R92', 'R10', 'SM7B'], // Warm/dark mics
    avoidPositions: ['CapEdge_DK', 'Cone', 'Cap_Cone_Trn'], // Darker positions
    prefer: ['SM57', 'PR30', 'e906', 'C414', 'Roswell'], // Brighter mics
    preferPositions: ['Cap', 'Cap_OffCenter', 'CapEdge_BR'] // Brighter positions
  },
  dark: {
    synonyms: ['warm', 'smooth', 'thick', 'fat', 'round', 'mellow', 'creamy', 'wooly', 'vintage', 'brown'],
    avoid: ['PR30', 'e906', 'C414'], // Bright mics
    avoidPositions: ['Cap', 'Cap_OffCenter', 'CapEdge_BR'], // Brighter positions
    prefer: ['M160', 'R121', 'R92', 'R10', 'SM7B'], // Warmer mics
    preferPositions: ['CapEdge_DK', 'Cone', 'Cap_Cone_Trn'] // Darker positions
  },
  aggressive: {
    synonyms: ['edgy', 'biting', 'raw', 'gritty', 'punchy', 'attack', 'snarl', 'growl', 'mean'],
    avoid: ['R121', 'R92', 'R10', 'SM7B'], // Smooth mics
    avoidPositions: ['Cone'], // Too dark for aggression
    prefer: ['SM57', 'MD421', 'e906', 'PR30'], // Punchy/aggressive mics
    preferPositions: ['Cap', 'CapEdge', 'CapEdge_BR'] // More present positions
  },
  clean: {
    synonyms: ['pristine', 'clear', 'transparent', 'detailed', 'hi-fi', 'studio', 'neutral'],
    avoid: [], // No mic restrictions for clean
    avoidPositions: [], // No position restrictions
    prefer: ['C414', 'SM57', 'Roswell'], // Detailed/accurate mics
    preferPositions: ['CapEdge', 'CapEdge_BR'] // Balanced positions
  },
  leads: {
    synonyms: ['solo', 'singing', 'sustain', 'soaring', 'melodic', 'expressive', 'lyrical', 'vocal-like'],
    avoid: [], // No strict avoidances - leads can be bright or smooth
    avoidPositions: ['Cone'], // Too dark for cutting leads
    prefer: ['SM57', 'MD421', 'e906', 'R121'], // Mics with presence for cutting through
    preferPositions: ['Cap', 'CapEdge', 'CapEdge_BR'] // More presence for leads
  },
  rhythm: {
    synonyms: ['chunky', 'tight', 'chug', 'palm mute', 'riff', 'chugging', 'percussive', 'djent'],
    avoid: ['R92', 'SM7B'], // Too smooth for tight rhythm
    avoidPositions: ['Cone'], // Too loose for tight rhythm
    prefer: ['SM57', 'MD421', 'e906'], // Tight, punchy mics
    preferPositions: ['CapEdge', 'CapEdge_BR', 'Cap_OffCenter'] // Balanced with definition
  },
  ambient: {
    synonyms: ['spacious', 'atmospheric', 'ethereal', 'dreamy', 'reverb', 'shimmer', 'washy', 'pad', 'swells'],
    avoid: ['MD421', 'PR30'], // Too aggressive/forward
    avoidPositions: ['Cap'], // Too direct
    prefer: ['R121', 'M160', 'C414', 'R92'], // Smooth, detailed mics
    preferPositions: ['CapEdge', 'CapEdge_DK', 'Cap_Cone_Trn'] // Smoother positions
  },
  lofi: {
    synonyms: ['lo-fi', 'gritty', 'vintage', 'character', 'vibe', 'dusty', 'tape', 'old-school', 'retro'],
    avoid: ['C414', 'PR30'], // Too modern/hi-fi
    avoidPositions: [], // Any position can work for lo-fi
    prefer: ['SM57', 'MD421', 'R121', 'M160'], // Classic mics with character
    preferPositions: ['CapEdge', 'CapEdge_DK', 'Cone'] // Less clinical positions
  },
  crunch: {
    synonyms: ['crunchy', 'grit', 'bite', 'edge', 'saturated', 'driven', 'cooking'],
    avoid: ['R92', 'SM7B'], // Too smooth
    avoidPositions: ['Cone'], // Too dark for crunch clarity
    prefer: ['SM57', 'MD421', 'e906'], // Handle gain well
    preferPositions: ['CapEdge', 'CapEdge_BR', 'Cap_OffCenter'] // Balanced with presence
  },
  breakup: {
    synonyms: ['edge of breakup', 'just breaking up', 'touch-sensitive', 'dynamic', 'responsive', 'clean-ish'],
    avoid: [], // No restrictions - need full dynamic range
    avoidPositions: [], // No restrictions
    prefer: ['SM57', 'R121', 'MD421', 'C414'], // Dynamic response mics
    preferPositions: ['CapEdge', 'CapEdge_BR'] // Balanced, revealing positions
  },
  scooped: {
    synonyms: ['mid-cut', 'v-shaped', 'thrash', 'nu-metal', 'djenty'],
    avoid: ['R121', 'M160', 'R92'], // Mid-heavy ribbons
    avoidPositions: ['CapEdge_DK', 'Cone'], // Add more mids
    prefer: ['SM57', 'MD421', 'e906'], // Scoopable mics
    preferPositions: ['Cap', 'CapEdge_BR'] // Brighter, tighter positions
  },
  midforward: {
    synonyms: ['mid-forward', 'mid-heavy', 'mid-range', 'honk', 'nasal', 'vocal', 'bluesy'],
    avoid: ['PR30'], // Can be too scooped
    avoidPositions: ['Cap'], // Can be too bright/scooped
    prefer: ['SM57', 'MD421', 'R121', 'M160'], // Mid-present mics
    preferPositions: ['CapEdge', 'CapEdge_DK', 'Cap_Cone_Trn'] // Mid-rich positions
  },
  heavy: {
    synonyms: ['massive', 'crushing', 'doom', 'sludge', 'wall of sound', 'huge', 'thunderous'],
    avoid: ['C414', 'PR30'], // Too clinical/bright
    avoidPositions: [], // Any position can work
    prefer: ['SM57', 'MD421', 'R121', 'M160'], // Handle weight well
    preferPositions: ['CapEdge', 'CapEdge_DK'] // Full, balanced positions
  },
  bluesy: {
    synonyms: ['blues', 'singing', 'expressive', 'vocal', 'cry', 'bb king', 'srv'],
    avoid: ['PR30', 'e906'], // Too aggressive
    avoidPositions: ['Cap'], // Too harsh for blues
    prefer: ['R121', 'SM57', 'MD421', 'M160'], // Classic blues mics
    preferPositions: ['CapEdge', 'CapEdge_DK', 'CapEdge_BR'] // Balanced, warm-ish
  },
  jazzy: {
    synonyms: ['jazz', 'round', 'mellow', 'clean jazz', 'pat metheny', 'wes montgomery'],
    avoid: ['SM57', 'MD421', 'PR30', 'e906'], // Too aggressive
    avoidPositions: ['Cap', 'Cap_OffCenter', 'CapEdge_BR'], // Too bright
    prefer: ['R121', 'M160', 'R92', 'C414'], // Smooth, detailed mics
    preferPositions: ['CapEdge_DK', 'Cone', 'Cap_Cone_Trn'] // Warm, smooth positions
  },
  country: {
    synonyms: ['twang', 'chicken pickin', 'telecaster', 'nashville', 'brad paisley', 'brent mason'],
    avoid: ['M160', 'R92', 'SM7B'], // Too dark
    avoidPositions: ['Cone', 'CapEdge_DK'], // Too dark
    prefer: ['SM57', 'e906', 'PR30', 'C414'], // Bright, snappy mics
    preferPositions: ['Cap', 'Cap_OffCenter', 'CapEdge_BR'] // Bright, twangy positions
  },
  modern: {
    synonyms: ['tight', 'precise', 'defined', 'clinical', 'studio', 'polished', 'hi-fi'],
    avoid: ['R92'], // Too vintage
    avoidPositions: ['Cone'], // Too loose
    prefer: ['SM57', 'MD421', 'e906', 'C414'], // Precise mics
    preferPositions: ['CapEdge', 'CapEdge_BR', 'Cap_OffCenter'] // Defined positions
  },
  woody: {
    synonyms: ['organic', 'natural', 'acoustic', 'resonant', 'open', 'airy'],
    avoid: ['PR30', 'e906'], // Too aggressive
    avoidPositions: ['Cap'], // Too direct
    prefer: ['R121', 'M160', 'C414', 'R92'], // Natural-sounding mics
    preferPositions: ['CapEdge', 'Cap_Cone_Trn', 'Cone'] // More open positions
  },
  balanced: {
    synonyms: ['neutral', 'flat', 'mix-ready', 'versatile', 'all-purpose'],
    avoid: [], // No restrictions
    avoidPositions: [], // No restrictions
    prefer: ['SM57', 'MD421', 'e906'], // Versatile mics
    preferPositions: ['CapEdge', 'CapEdge_BR'] // Balanced positions
  },
  doomy: {
    synonyms: ['doom', 'stoner', 'sludge', 'slow', 'massive lows', 'crushing', 'fuzz'],
    avoid: ['PR30', 'C414'], // Too bright/clinical
    avoidPositions: ['Cap', 'Cap_OffCenter'], // Too bright
    prefer: ['R121', 'M160', 'SM57', 'MD421'], // Handle low-end well
    preferPositions: ['CapEdge', 'CapEdge_DK', 'Cap_Cone_Trn'] // Fuller positions
  },
  shoegaze: {
    synonyms: ['washy', 'layered', 'reverb', 'my bloody valentine', 'dreamy', 'swirling'],
    avoid: ['MD421', 'PR30'], // Too aggressive/direct
    avoidPositions: ['Cap'], // Too focused
    prefer: ['R121', 'M160', 'C414', 'R92'], // Smooth, detailed mics
    preferPositions: ['CapEdge', 'CapEdge_DK', 'Cap_Cone_Trn'] // Smooth positions
  },
  postpunk: {
    synonyms: ['post-punk', 'angular', 'jangly', 'dark', 'new wave', 'joy division', 'the cure'],
    avoid: ['R92', 'SM7B'], // Too smooth
    avoidPositions: [], // Flexible
    prefer: ['SM57', 'MD421', 'R121'], // Character mics
    preferPositions: ['CapEdge', 'CapEdge_BR', 'CapEdge_DK'] // Varied for effect
  }
};

// Analyze custom text for tonal implications and generate filtering rules
function analyzeCustomTonalGoal(customText: string): string {
  const textLower = customText.toLowerCase();
  const detectedTones: string[] = [];
  const avoidMics = new Set<string>();
  const avoidPositions = new Set<string>();
  const preferMics = new Set<string>();
  const preferPositions = new Set<string>();
  
  // Check each tonal category
  for (const [category, config] of Object.entries(TONAL_KEYWORDS)) {
    // Check if category name or any synonym appears in the text
    const allTerms = [category, ...config.synonyms];
    const found = allTerms.some(term => textLower.includes(term));
    
    if (found) {
      detectedTones.push(category);
      config.avoid.forEach(m => avoidMics.add(m));
      config.avoidPositions.forEach(p => avoidPositions.add(p));
      config.prefer.forEach(m => preferMics.add(m));
      config.preferPositions.forEach(p => preferPositions.add(p));
    }
  }
  
  // Build enhanced guidance
  let guidance = `User's tonal goal: "${customText}"`;
  
  if (detectedTones.length > 0) {
    guidance += `\n\nDetected tonal characteristics: ${detectedTones.join(', ')}`;
    
    if (avoidMics.size > 0) {
      guidance += `\n\nCRITICAL - MUST AVOID these mics (contradict the tonal goal): ${Array.from(avoidMics).join(', ')}`;
    }
    
    if (avoidPositions.size > 0) {
      guidance += `\nCRITICAL - MUST AVOID these positions (contradict the tonal goal): ${Array.from(avoidPositions).join(', ')}`;
    }
    
    if (preferMics.size > 0) {
      guidance += `\n\nPREFER these mics (align with tonal goal): ${Array.from(preferMics).join(', ')}`;
    }
    
    if (preferPositions.size > 0) {
      guidance += `\nPREFER these positions (align with tonal goal): ${Array.from(preferPositions).join(', ')}`;
    }
    
    guidance += `\n\nVALIDATION: Before including any recommendation, verify it does NOT use avoided mics or positions. Each recommendation MUST genuinely achieve "${customText}" - do not just echo the words in descriptions.`;
  }
  
  return guidance;
}

// Helper to expand genre code into detailed tonal guidance
function expandGenreToTonalGuidance(genre: string): string {
  const profile = GENRE_TONAL_PROFILES[genre];
  if (profile) {
    return `${profile.tonalGoal}

Studio Context: ${profile.characteristics}

${profile.avoid}`;
  }
  // For custom text, analyze and generate filtering rules
  return analyzeCustomTonalGoal(genre);
}

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});

// Caches for consistent AI results with 7-day expiration
// Key: hash of normalized input, Value: { data, timestamp }
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

interface CacheEntry {
  data: object;
  timestamp: number;
}

const batchAnalysisCache = new Map<string, CacheEntry>();
const singleAnalysisCache = new Map<string, CacheEntry>();

// Clear caches on startup to ensure prompt changes take effect
console.log('[Cache] Cleared all caches on startup for prompt consistency');

// Clean expired entries from a cache
function cleanExpiredEntries(cache: Map<string, CacheEntry>): void {
  const now = Date.now();
  const entries = Array.from(cache.entries());
  for (const [key, entry] of entries) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
}

// Periodically clean caches (every hour)
setInterval(() => {
  cleanExpiredEntries(batchAnalysisCache);
  cleanExpiredEntries(singleAnalysisCache);
}, 60 * 60 * 1000);

// Generate a stable hash for batch analysis input
function generateBatchCacheKey(irs: Array<{
  filename: string;
  duration: number;
  peakLevel: number;
  spectralCentroid: number;
  lowEnergy: number;
  midEnergy: number;
  highEnergy: number;
}>): string {
  // Sort by filename for consistent ordering
  const sorted = [...irs].sort((a, b) => a.filename.localeCompare(b.filename));
  // Normalize numbers to fixed precision to avoid floating point issues
  const normalized = sorted.map(ir => ({
    filename: ir.filename,
    duration: Math.round(ir.duration * 10) / 10,
    peakLevel: Math.round(ir.peakLevel * 10) / 10,
    spectralCentroid: Math.round(ir.spectralCentroid),
    lowEnergy: Math.round(ir.lowEnergy * 1000) / 1000,
    midEnergy: Math.round(ir.midEnergy * 1000) / 1000,
    highEnergy: Math.round(ir.highEnergy * 1000) / 1000,
  }));
  const hash = createHash('sha256');
  hash.update(JSON.stringify(normalized));
  return hash.digest('hex');
}

// Generate a stable hash for single analysis input
function generateSingleCacheKey(input: {
  micType: string;
  micPosition: string;
  speakerModel: string;
  distance: string;
  durationSamples: number;
  peakAmplitudeDb: number;
  spectralCentroid: number;
  lowEnergy: number;
  midEnergy: number;
  highEnergy: number;
  originalFilename?: string;
}): string {
  const normalized = {
    micType: input.micType.toLowerCase(),
    micPosition: input.micPosition.toLowerCase(),
    speakerModel: input.speakerModel.toLowerCase(),
    distance: input.distance,
    durationSamples: input.durationSamples,
    peakAmplitudeDb: Math.round(input.peakAmplitudeDb * 10) / 10,
    spectralCentroid: Math.round(input.spectralCentroid),
    lowEnergy: Math.round(input.lowEnergy * 1000) / 1000,
    midEnergy: Math.round(input.midEnergy * 1000) / 1000,
    highEnergy: Math.round(input.highEnergy * 1000) / 1000,
    originalFilename: (input.originalFilename || '').toLowerCase(),
  };
  const hash = createHash('sha256');
  hash.update(JSON.stringify(normalized));
  return hash.digest('hex');
}

// Generate cache key for IR scoring (excludes duration since it doesn't affect scoring)
function generateIRCacheKey(ir: {
  filename: string;
  peakLevel: number;
  spectralCentroid: number;
  lowEnergy: number;
  midEnergy: number;
  highEnergy: number;
}): string {
  // Duration explicitly excluded - it's NOT a scoring factor
  // This ensures identical files get the same cache key regardless of mode
  const normalized = {
    filename: ir.filename.toLowerCase(),
    peakLevel: Math.round(ir.peakLevel * 10) / 10,
    spectralCentroid: Math.round(ir.spectralCentroid),
    lowEnergy: Math.round(ir.lowEnergy * 1000) / 1000,
    midEnergy: Math.round(ir.midEnergy * 1000) / 1000,
    highEnergy: Math.round(ir.highEnergy * 1000) / 1000,
  };
  const hash = createHash('sha256');
  hash.update(JSON.stringify(normalized));
  return hash.digest('hex');
}

// Parse mic/position/speaker from filename for spectral centroid expectations
function parseFilenameForExpectations(filename: string): { mic: string; position: string; speaker: string } {
  const lower = filename.toLowerCase();
  
  // Parse mic
  let mic = 'sm57'; // default
  if (lower.includes('e906') && (lower.includes('presence') || lower.includes('boost'))) mic = 'e906_presence';
  else if (lower.includes('e906')) mic = 'e906';
  else if (lower.includes('md441') && (lower.includes('presence') || lower.includes('boost'))) mic = 'md441_presence';
  else if (lower.includes('md441')) mic = 'md441';
  else if (lower.includes('md421') && lower.includes('kompakt')) mic = 'md421kompakt';
  else if (lower.includes('md421') || lower.includes('421')) mic = 'md421';
  else if (lower.includes('sm57') || lower.includes('_57_')) mic = 'sm57';
  else if (lower.includes('sm7b') || lower.includes('sm7_')) mic = 'sm7b';
  else if (lower.includes('r121') || lower.includes('_121_')) mic = 'r121';
  else if (lower.includes('r92') || lower.includes('_92_')) mic = 'r92';
  else if (lower.includes('r10') || lower.includes('_r10_')) mic = 'r10';
  else if (lower.includes('m160') || lower.includes('_160_')) mic = 'm160';
  else if (lower.includes('m88') || lower.includes('_88_')) mic = 'm88';
  else if (lower.includes('m201') || lower.includes('_201_')) mic = 'm201';
  else if (lower.includes('pr30') || lower.includes('_30_')) mic = 'pr30';
  else if (lower.includes('c414') || lower.includes('_414_')) mic = 'c414';
  else if (lower.includes('roswell')) mic = 'roswell';
  
  // Parse position - new naming convention
  let position = 'capedge'; // default
  // New names first
  if (lower.includes('capedge_br') || lower.includes('capedgebr')) position = 'capedge_br';
  else if (lower.includes('capedge_dk') || lower.includes('capedgedk')) position = 'capedge_dk';
  else if (lower.includes('cap_cone_trn') || lower.includes('capedgeconetr') || lower.includes('cone_tr')) position = 'cap_cone_trn';
  // Legacy mappings
  else if (lower.includes('capedge_favorcap') || lower.includes('cap_edge_favor_cap') || lower.includes('capedgefavorcap') || lower.includes('favorcap')) position = 'capedge_br';
  else if (lower.includes('capedge_favorcone') || lower.includes('cap_edge_favor_cone') || lower.includes('capedgefavorcone') || lower.includes('favorcone')) position = 'capedge_dk';
  // Standard positions
  else if (lower.includes('capedge') || lower.includes('cap_edge') || lower.includes('cap-edge')) position = 'capedge';
  else if (lower.includes('offcenter') || lower.includes('off_center') || lower.includes('off-center')) position = 'cap_offcenter';
  else if (lower.includes('_cap_') || lower.match(/cap[_\-]?\d/) || lower.startsWith('cap_')) position = 'cap';
  else if (lower.includes('_cone_') || lower.includes('cone_') || lower.includes('_cone')) position = 'cone';
  
  // Parse speaker
  let speaker = 'v30'; // default
  if (lower.includes('v30bc') || lower.includes('v30_bc') || lower.includes('blackcat')) speaker = 'v30bc';
  else if (lower.includes('v30')) speaker = 'v30';
  else if (lower.includes('greenback') || lower.includes('g12m25') || lower.includes('g12m_')) speaker = 'greenback';
  else if (lower.includes('g12t75') || lower.includes('g12t-75')) speaker = 'g12t75';
  else if (lower.includes('g12-65') || lower.includes('g1265') || lower.includes('heritage')) speaker = 'g12-65';
  else if (lower.includes('g12h') && lower.includes('anni')) speaker = 'g12hanni';
  else if (lower.includes('cream')) speaker = 'cream';
  else if (lower.includes('ga12') || lower.includes('sc64') && lower.includes('12')) speaker = 'ga12-sc64';
  else if (lower.includes('ga10') || lower.includes('g10')) speaker = 'ga10-sc64';
  else if (lower.includes('k100')) speaker = 'k100';
  
  return { mic, position, speaker };
}

// Shared single-IR scoring function used by both single and batch modes
// This ensures identical scores for identical IRs
async function scoreSingleIR(ir: {
  filename: string;
  duration: number;
  peakLevel: number;
  spectralCentroid: number;
  lowEnergy: number;
  midEnergy: number;
  highEnergy: number;
  hasClipping?: boolean;
  clippedSamples?: number;
  crestFactorDb?: number;
}): Promise<{
  score: number;
  isPerfect: boolean;
  advice: string;
  highlights: string[];
  issues: string[];
  parsedInfo: { mic: string | null; position: string | null; speaker: string | null; distance: string | null };
  renameSuggestion: { suggestedModifier: string; suggestedFilename: string; reason: string } | null;
}> {
  // Check cache first
  const cacheKey = generateIRCacheKey(ir);
  const cachedEntry = singleAnalysisCache.get(cacheKey);
  if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS)) {
    console.log(`[Batch/Single IR] Cache HIT for ${ir.filename}`);
    return cachedEntry.data as ReturnType<typeof scoreSingleIR> extends Promise<infer T> ? T : never;
  }
  
  console.log(`[Batch/Single IR] Cache MISS for ${ir.filename}, calling AI...`);
  
  // Calculate expected spectral centroid range based on mic/position/speaker
  const parsed = parseFilenameForExpectations(ir.filename);
  const expectedRange = getExpectedCentroidRange(parsed.mic, parsed.position, parsed.speaker);
  const deviation = calculateCentroidDeviation(ir.spectralCentroid, expectedRange);
  const scoreAdjustment = getDeviationScoreAdjustment(deviation.deviationPercent);
  
  console.log(`[Spectral Analysis] ${ir.filename}:`);
  console.log(`  Parsed: mic=${parsed.mic}, pos=${parsed.position}, spk=${parsed.speaker}`);
  console.log(`  Expected range: ${expectedRange.min}-${expectedRange.max}Hz, Actual: ${ir.spectralCentroid.toFixed(0)}Hz`);
  console.log(`  Deviation: ${deviation.deviation.toFixed(0)}Hz (${deviation.deviationPercent.toFixed(1)}%), Direction: ${deviation.direction}, Score adj: ${scoreAdjustment}`);
  
  const systemPrompt = `You are an expert audio engineer specializing in guitar cabinet impulse responses (IRs).
Analyze the provided technical metrics to determine the TECHNICAL QUALITY of this single IR.
Your analysis should be purely objective, focusing on audio quality metrics - NOT genre or stylistic preferences.

SPECTRAL CENTROID EXPECTATIONS (use these deterministic ranges for scoring):
For this IR, based on the detected mic/position/speaker combination:
- Expected centroid range: ${expectedRange.min}Hz - ${expectedRange.max}Hz
- Actual centroid: ${ir.spectralCentroid.toFixed(0)}Hz
- Deviation: ${deviation.isWithinRange ? 'WITHIN expected range' : `${deviation.deviation.toFixed(0)}Hz ${deviation.direction === 'bright' ? 'ABOVE' : 'BELOW'} expected range`}

SCORING RULES:
- If centroid is within expected range: No penalty for spectral balance
- If centroid deviates by <25% of range width: Minor (-1 point)
- If centroid deviates by 25-50%: Small (-2 points)
- If centroid deviates by 50-100%: Moderate (-3-4 points)
- If centroid deviates by >100%: Significant (-5-6 points)

The pre-calculated score adjustment for this IR is: ${scoreAdjustment} points
Start with a base score of 92 (excellent technical quality) and apply this adjustment.
Final score should be around ${92 + scoreAdjustment}, unless there are other technical issues.

Technical Scoring Criteria:
- 90-100: Exceptional. Professional studio quality, no technical issues.
- 85-89: Very Good. High quality capture, minor improvements possible.
- 80-84: Good. Usable quality, some technical aspects could be improved.
- 70-79: Acceptable. Noticeable issues but still usable.
- Below 70: Needs work. Significant technical problems.

ADDITIONAL PENALTIES (beyond spectral centroid):
- Clipping detected: ${ir.hasClipping ? `-10 points (clipping CONFIRMED with ${ir.clippedSamples || 0} clipped samples, crest factor ${ir.crestFactorDb?.toFixed(1) || 'unknown'}dB)` : 'No clipping detected'}
- Peak level > 0dB: -5 to -10 points (current: ${ir.peakLevel.toFixed(1)}dB)
- Very unbalanced energy distribution: -2 to -5 points
- Duration is NOT a scoring factor.

TONAL MODIFIER SUGGESTION:
${deviation.isWithinRange 
  ? 'Spectral centroid is within expected range - no modifier needed unless there are other tonal characteristics to note.' 
  : `Spectral centroid is ${deviation.direction === 'bright' ? 'brighter' : 'darker'} than expected. Suggest "_${deviation.direction === 'bright' ? 'Bright' : 'Warm'}" modifier.`}

Output JSON format:
{
  "parsedInfo": {
    "mic": "detected mic or null",
    "position": "detected position or null",
    "speaker": "detected speaker or null",
    "distance": "detected distance or null"
  },
  "score": number (0-100),
  "isPerfect": boolean (true if score >= 85),
  "advice": "Brief technical advice (1-2 sentences)",
  "highlights": ["good thing 1", "good thing 2"],
  "issues": ["issue 1"] or [],
  "renameSuggestion": {
    "suggestedModifier": "tonal modifier",
    "suggestedFilename": "filename with modifier added before extension",
    "reason": "Brief explanation"
  } or null
}`;

  const userMessage = `Analyze this IR for technical quality:

Filename: "${ir.filename}"
- Duration: ${ir.duration.toFixed(1)}ms
- Peak Level: ${ir.peakLevel.toFixed(1)}dB
- Spectral Centroid: ${ir.spectralCentroid.toFixed(0)}Hz
- Low Energy: ${(ir.lowEnergy * 100).toFixed(1)}%
- Mid Energy: ${(ir.midEnergy * 100).toFixed(1)}%
- High Energy: ${(ir.highEnergy * 100).toFixed(1)}%
- Clipping Detected: ${ir.hasClipping ? `YES (${ir.clippedSamples} clipped samples, crest factor: ${ir.crestFactorDb?.toFixed(1)}dB)` : 'No'}

Expected centroid for ${parsed.mic} at ${parsed.position} on ${parsed.speaker}: ${expectedRange.min}-${expectedRange.max}Hz`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ],
    response_format: { type: "json_object" },
    temperature: 0,
    seed: 42,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  
  const formatted = {
    score: result.score || 0,
    isPerfect: result.isPerfect || false,
    advice: result.advice || "Could not generate advice.",
    highlights: result.highlights || [],
    issues: result.issues || [],
    parsedInfo: result.parsedInfo || { mic: null, position: null, speaker: null, distance: null },
    renameSuggestion: result.renameSuggestion || null,
  };
  
  // Cache the result
  singleAnalysisCache.set(cacheKey, { data: formatted, timestamp: Date.now() });
  console.log(`[Batch/Single IR] Cached result for ${ir.filename}`);
  
  return formatted;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post(api.analyses.create.path, async (req, res) => {
    try {
      const input = api.analyses.create.input.parse(req.body);
      
      // Use the SAME scoring function as batch mode for consistency
      const filename = input.originalFilename || input.filename;
      const filenameLC = filename.toLowerCase();
      
      // Detect e906 presence boost from filename
      const hasPresenceBoost = filenameLC.includes('presence') || filenameLC.includes('boost') || filenameLC.includes('e906boost');
      const hasFlat = filenameLC.includes('flat') || filenameLC.includes('e906flat');
      
      // Determine mic variant for e906
      let micVariant = input.micType;
      if (input.micType.toLowerCase().includes('e906') || filenameLC.includes('e906')) {
        if (hasPresenceBoost) {
          micVariant = 'e906 (Presence Boost)';
        } else if (hasFlat) {
          micVariant = 'e906 (Flat)';
        } else {
          micVariant = input.micType;
        }
      }
      
      // Call the shared scoring function (same as batch mode)
      // This guarantees identical scores for identical files
      console.log(`[Single Analysis] Using shared scorer for ${filename}`);
      const scored = await scoreSingleIR({
        filename: filename,
        duration: input.durationSamples / 44100 * 1000, // Convert samples to ms (assuming 44.1kHz)
        peakLevel: input.peakAmplitudeDb,
        spectralCentroid: input.spectralCentroid,
        lowEnergy: input.lowEnergy,
        midEnergy: input.midEnergy,
        highEnergy: input.highEnergy,
      });
      
      const saved = await storage.createAnalysis({
        ...input,
        advice: scored.advice,
        qualityScore: scored.score,
        isPerfect: scored.isPerfect
      });

      // Include tonal modifier suggestion and detected mic variant in response
      const responseWithExtras = {
        ...saved,
        micLabel: micVariant,
        renameSuggestion: scored.renameSuggestion ? {
          suggestedModifier: scored.renameSuggestion.suggestedModifier,
          reason: scored.renameSuggestion.reason
        } : null
      };

      res.status(201).json(responseWithExtras);
    } catch (err) {
      console.error('Analysis error:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to analyze IR" });
    }
  });

  app.get(api.analyses.list.path, async (req, res) => {
    const history = await storage.getAnalyses();
    res.json(history);
  });

  // Recommendations endpoint - ideal distances for mic+speaker combo
  app.post(api.recommendations.get.path, async (req, res) => {
    try {
      const input = api.recommendations.get.input.parse(req.body);
      const { micType, speakerModel, genre } = input;

      const systemPrompt = `You are an expert audio engineer specializing in guitar cabinet impulse responses (IRs).
      Your task is to recommend IDEAL DISTANCES for a specific microphone and speaker combination.
      Distance is the primary variable - position on the speaker is less important for this analysis.
      Focus on how distance affects the tonal characteristics of this specific mic+speaker pairing.
      
      Microphone Knowledge:
      - 57 (SM57): Classic dynamic, mid-forward, aggressive. Proximity effect adds bass up close.
      - 121 (R-121): Ribbon, smooth highs, big low-mid, figure-8. Strong proximity effect.
      - 160 (M160): Hypercardioid ribbon, tighter, more focused. Less proximity effect than R-121.
      - 421 (MD421): Large diaphragm dynamic, punchy. Moderate proximity effect.
      - 421-kompakt (MD421 Kompakt): Compact version, similar character.
      - r10 (R10): Ribbon, smooth and warm.
      - m88 (M88): Warm, great low-end punch.
      - pr30 (PR30): Large diaphragm dynamic, very clear highs, less proximity effect.
      - e906-boost: e906 with presence switch engaged, supercardioid, adds bite. Label as "e906 (Presence Boost)".
      - e906-flat: e906 with flat EQ, supercardioid, balanced. Label as "e906 (Flat)".
      - m201 (M201): Very accurate dynamic.
      - sm7b (SM7B): Smooth, thick.
      - roswell-cab (Roswell Cab Mic): Specialized condenser for loud cabs. MANUFACTURER RECOMMENDED: Start at 6" distance, centered directly on dust cap. Unlike typical dynamics, this mic is DESIGNED to be aimed at dead center of cap - no harshness due to its voiced capsule. Closer = more bass (predictable linear proximity effect), farther = tighter low end. Moving around cone gives tonal variation. Handles extreme SPL, mix-ready tones with minimal EQ needed.
      
      Available Distances (in inches): 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6
      
      Speakers Knowledge:
      - g12m25 (G12M-25 Greenback): Classic woody, mid-forward, compression at high volume.
      - v30-china (V30): Aggressive upper-mids, modern rock.
      - v30-blackcat (V30 Black Cat): Smoother, refined V30.
      - k100 (G12K-100): Big low end, clear highs, neutral.
      - g12t75 (G12T-75): Scooped mids, sizzly highs, metal.
      - g12-65 (G12-65): Warm, punchy, large sound.
      - g12h30-anniversary (G12H30 Anniversary): Tight bass, bright highs.
      - celestion-cream (Celestion Cream): Alnico smooth, high power.
      - ga12-sc64 (GA12-SC64): Vintage American, tight and punchy.
      - g10-sc64 (G10-SC64): 10" version, more focused.
      
      Distance Effects (general principles):
      - 0-0.5": Maximum proximity effect (bass boost), very direct/aggressive, potential for bass buildup
      - 1-2": Sweet spot for most dynamics, balanced proximity, punchy attack
      - 2.5-4": Reduced proximity, more natural tonal balance, some room interaction
      - 4.5-6": Minimal proximity, roomier sound, more natural but less direct
      
      Available Positions:
      - Cap: Dead center of the dust cap, brightest, most high-end detail
      - Cap_OffCenter: Small lateral offset from Cap, still fully on the dust cap, less harsh attack
      - CapEdge: Seam line where the dust cap meets the cone, balanced tone, often the "sweet spot"
      - CapEdge_BR: CapEdge favoring the cap side of the seam, brighter than standard CapEdge
      - CapEdge_DK: CapEdge favoring the cone side of the seam, darker/warmer than standard CapEdge
      - Cap_Cone_Trn: Smooth cone immediately past the cap edge, transition zone
      - Cone: True mid-cone position, further out from the cap edge, ribs allowed, darkest/warmest${genre ? `
      
      === USER'S TONAL GOAL (HIGHEST PRIORITY) ===
      The user wants: ${expandGenreToTonalGuidance(genre)}
      
      CRITICAL: This tonal goal is your PRIMARY filter for all recommendations.
      - ONLY recommend distances/positions that genuinely achieve this specific sound
      - Each rationale MUST explicitly explain HOW this distance achieves the tonal goal
      - The expectedTone MUST describe how this delivers the requested sound
      - The bestFor MUST reference the tonal goal or closely related sounds
      - EXCLUDE generic recommendations that don't serve this tonal goal` : ''}
      
      Provide 4-6 distance recommendations${genre ? ` optimized for "${genre}"` : ' covering the usable range for this mic+speaker combo'}.
      Also provide 2-3 best position recommendations${genre ? ` that achieve "${genre}"` : ' for this specific mic+speaker combination'}.
      ${genre ? `FILTER all recommendations through the user's tonal goal. Only include distances/positions that genuinely serve "${genre}".` : 'Explain how each distance/position affects the tone and what it\'s best suited for.'}
      
      Output JSON format:
      {
        "mic": "${micType}",
        "micDescription": "Brief description of the microphone's character",
        "speaker": "${speakerModel}",
        "speakerDescription": "Brief description of the speaker's tonal characteristics",
        ${genre ? `"genre": "${genre}",` : ''}
        "recommendations": [
          {
            "distance": "distance in inches as string (e.g. '1' or '2.5')",
            "rationale": "Why this distance achieves the user's tonal goal${genre ? ` ('${genre}')` : ''} - be specific",
            "expectedTone": "How this sounds${genre ? ` and how it delivers '${genre}'` : ''}",
            "bestFor": "${genre ? `'${genre}' and related sounds` : 'What styles/sounds this distance is ideal for'}"
          }
        ],
        "bestPositions": [
          {
            "position": "Cap|Cap_OffCenter|CapEdge|CapEdge_BR|CapEdge_DK|Cap_Cone_Trn|Cone",
            "reason": "Why this position${genre ? ` achieves '${genre}'` : ' works well for this mic+speaker combo'}"
          }
        ]
      }`;

      let userMessage = `Please recommend ideal distances for the ${micType} microphone paired with the ${speakerModel} speaker.`;
      if (genre) {
        const expandedGoal = expandGenreToTonalGuidance(genre);
        userMessage += ` The user's PRIMARY goal is: ${expandedGoal}. Every recommendation must be specifically optimized for this sound. Do not include generic recommendations that don't serve this tonal goal.`;
      } else {
        userMessage += ` Cover a range of distances from close to far, explaining the tonal differences.`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        seed: 42,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      res.json(result);
    } catch (err) {
      console.error('Recommendations error:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  // Speaker-only recommendations - recommend mics, positions, and distances for a speaker
  app.post(api.recommendations.bySpeaker.path, async (req, res) => {
    try {
      const input = api.recommendations.bySpeaker.input.parse(req.body);
      const { speakerModel, genre } = input;

      // Get curated recipes for this speaker from IR producer knowledge base
      const curatedRecipes = getRecipesForSpeaker(speakerModel);
      
      // Format curated data for the prompt
      const curatedSection = curatedRecipes.length > 0 
        ? `\n\n=== CURATED IR PRODUCER RECIPES ===
These are PROVEN combinations from real IR production. PRIORITIZE these over generic suggestions:

${curatedRecipes.map((r, i) => `${i + 1}. ${r.micLabel} at ${r.position}, ${r.distance}"
   Notes: ${r.notes}
   Best for: ${r.bestFor}
   Source: ${r.source}`).join('\n\n')}

Use these curated recipes as the foundation of your recommendations. You may add 1-2 additional suggestions if the curated list doesn't cover all use cases.`
        : '';

      const systemPrompt = `You are an expert audio engineer specializing in guitar cabinet impulse responses (IRs).
      Your task is to recommend the BEST MICROPHONES, POSITIONS, and DISTANCES for a specific speaker.
      
      IMPORTANT: Your recommendations should be based on REAL IR production techniques and proven recipes.
      When curated recipes are provided, PRIORITIZE them over generic suggestions.
      ${curatedSection}
      
      Available Microphones:
      - 57 (SM57): Classic dynamic, mid-forward, aggressive. Great all-rounder.
      - 121 (R-121): Ribbon, smooth highs, big low-mid, figure-8. Pairs well with dynamics.
      - 160 (M160): Hypercardioid ribbon, tighter, more focused. Less proximity effect.
      - 421 (MD421): Large diaphragm dynamic, punchy, versatile.
      - 421-kompakt (MD421 Kompakt): Compact version, similar character.
      - r10 (R10): Ribbon, smooth and warm.
      - m88 (M88): Warm, great low-end punch.
      - pr30 (PR30): Large diaphragm dynamic, very clear highs, less proximity.
      - e906-boost: e906 with presence switch engaged, supercardioid, adds bite. Label as "e906 (Presence Boost)".
      - e906-flat: e906 with flat EQ, supercardioid, balanced. Label as "e906 (Flat)".
      - m201 (M201): Very accurate dynamic.
      - sm7b (SM7B): Smooth, thick, broadcast-quality.
      - roswell-cab (Roswell Cab Mic): Specialized condenser for loud cabs. MANUFACTURER RECOMMENDED: Start at 6", centered on cap. Unlike typical dynamics, designed for dead center with no harshness.
      
      Available Positions:
      - Cap: Dead center of the dust cap, brightest, most high-end detail
      - Cap_OffCenter: Small lateral offset from Cap, still fully on the dust cap, less harsh attack
      - CapEdge: Seam line where the dust cap meets the cone, balanced tone, often the "sweet spot"
      - CapEdge_BR: CapEdge favoring the cap side of the seam, brighter
      - CapEdge_DK: CapEdge favoring the cone side of the seam, darker/warmer
      - Cap_Cone_Trn: Smooth cone immediately past the cap edge, transition zone
      - Cone: True mid-cone position, further out from the cap edge, ribs allowed, darkest/warmest
      
      Available Distances (inches): 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6${genre ? `
      
      === USER'S TONAL GOAL (HIGHEST PRIORITY) ===
      The user wants: ${expandGenreToTonalGuidance(genre)}
      
      CRITICAL: This tonal goal is your PRIMARY filter. Every single recommendation MUST be optimized for this specific sound.
      - ONLY recommend combinations that genuinely serve this tonal goal
      - EXCLUDE combinations that don't align with this sound (even if they're popular for other purposes)
      - Each rationale MUST explicitly explain HOW this combination achieves the tonal goal
      - The expectedTone MUST describe how this achieves the requested sound
      - The bestFor MUST reference the tonal goal or closely related sounds` : ''}
      
      Provide 6-10 specific mic/position/distance recommendations.
      ${genre ? `FILTER all recommendations through the user's tonal goal: "${genre}". Only include combinations that achieve this sound.` : 'Include curated recipes first, then fill in gaps with additional proven techniques.'}
      
      Output JSON format:
      {
        "speaker": "${speakerModel}",
        "speakerDescription": "Brief description of the speaker's tonal characteristics",
        ${genre ? `"genre": "${genre}",` : ''}
        "micRecommendations": [
          {
            "mic": "mic code (e.g. '57', '121', 'roswell-cab')",
            "micLabel": "Display name exactly as listed above (e.g. 'SM57', 'R121', 'e906 (Presence Boost)', 'MD441 (Flat)', 'Roswell Cab Mic')",
            "position": "Cap|Cap_OffCenter|CapEdge|CapEdge_BR|CapEdge_DK|Cap_Cone_Trn|Cone",
            "distance": "distance in inches as string (e.g. '1' or '2.5')",
            "rationale": "Why this combination achieves the user's tonal goal${genre ? ` ('${genre}')` : ''} - be specific",
            "expectedTone": "How this sounds${genre ? ` and how it delivers '${genre}'` : ''}",
            "bestFor": "${genre ? `'${genre}' and related sounds` : 'What styles/sounds this is ideal for'}"
          }
        ],
        "summary": "${genre ? `How these recommendations collectively achieve '${genre}' for this speaker` : 'Brief overall summary of the best approach for this speaker based on IR production experience'}"
      }`;

      let userMessage = `Please recommend the best microphones, positions, and distances for the ${speakerModel} speaker.`;
      if (genre) {
        const expandedGoal = expandGenreToTonalGuidance(genre);
        userMessage += ` The user's PRIMARY goal is: ${expandedGoal}. Every recommendation must be specifically optimized for this sound. Do not include generic recommendations that don't serve this tonal goal.`;
      }
      userMessage += ` Base your recommendations on proven IR production techniques.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        seed: 42,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      res.json(result);
    } catch (err) {
      console.error('Speaker recommendations error:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to generate speaker recommendations" });
    }
  });

  // Amp-based speaker recommendations - suggest speakers based on amp description
  app.post(api.recommendations.byAmp.path, async (req, res) => {
    try {
      const input = api.recommendations.byAmp.input.parse(req.body);
      const { ampDescription, genre } = input;

      const systemPrompt = `You are an expert audio engineer specializing in guitar cabinet impulse responses (IRs) and amp/speaker matching.
      Your task is to recommend the BEST SPEAKERS for a given amplifier based on its characteristics.
      
      You have deep knowledge of classic amp/speaker pairings from legendary recordings and studio practice.
      
      Available Speakers (use these exact codes in your response):
      - v30-china (Celestion V30): Aggressive upper-mids, modern rock/metal. The standard Vintage 30 - punchy, tight bass, prominent presence peak around 2kHz.
      - v30-blackcat (V30 Black Cat): Smoother, refined V30 variant. Less harsh, more controlled highs.
      - g12m25 (Celestion G12M-25 Greenback): Classic woody, mid-forward, compression at high volume. THE vintage British sound - Led Zeppelin, AC/DC.
      - g12t75 (Celestion G12T-75): Scooped mids, sizzly highs, tight bass. Mesa Boogie staple - Metallica, Pantera.
      - g12-65 (Celestion G12-65): Warm, punchy, large sound with excellent bass. Heritage/reissue of the classic 60s speaker.
      - g12h30-anniversary (Celestion G12H30 Anniversary): Tight bass, bright detailed highs, complex upper harmonics. Classic 70s rock tone.
      - celestion-cream (Celestion Cream): Alnico smoothness with high power handling. Creamy breakup, touch-sensitive, boutique.
      - ga12-sc64 (Weber GA12-SC64): Vintage American, tight and punchy. Fender Deluxe/Princeton vibe.
      - g10-sc64 (Weber G10-SC64): 10" version, more focused and punchy. Great for smaller combos.
      - k100 (Celestion G12K-100): Big low end, clear highs, neutral. High headroom, modern voicing.
      
      Classic Amp/Speaker Pairings Knowledge:
      - Marshall Plexi/JCM800 → Greenbacks (G12M-25) for classic rock, V30 for heavier tones
      - Fender Twin/Deluxe → American speakers (GA12-SC64), Celestion Cream for boutique
      - Mesa Boogie Rectifier → G12T-75 for scooped metal, V30 for tighter response
      - Vox AC30 → Greenbacks, G12H30 Anniversary for jangly cleans
      - Orange → V30 for aggressive tones, Greenbacks for classic rock
      - Friedman/BE-100 → V30 (modern rock), mix V30+Greenback for complexity
      - Soldano/high-gain → V30 or G12K-100 for clarity under gain
      - Dumble/boutique → Celestion Cream, G12-65 for touch-sensitive response
      ${genre ? `
      
      === USER'S TONAL GOAL (HIGHEST PRIORITY) ===
      The user wants: ${expandGenreToTonalGuidance(genre)}
      
      CRITICAL: Filter all speaker recommendations through this tonal goal.
      - ONLY recommend speakers that genuinely achieve this sound
      - Each rationale MUST explain HOW this speaker achieves the tonal goal
      - The expectedTone MUST describe how this delivers the requested sound
      - The bestFor MUST reference the tonal goal or closely related sounds` : ''}
      
      Based on the user's amp description, recommend 3-5 speakers that would pair well.
      Consider the amp's characteristics (clean, crunch, high-gain), era (vintage, modern), and typical use cases.
      
      Output JSON format:
      {
        "ampSummary": "Brief analysis of the described amp's characteristics and tonal profile",
        "speakerSuggestions": [
          {
            "speaker": "speaker code (e.g. 'v30-china', 'g12m25')",
            "speakerLabel": "Display name (e.g. 'Celestion V30', 'Greenback G12M-25')",
            "rationale": "Why this speaker pairs well with this amp - reference classic recordings or studio knowledge",
            "expectedTone": "Description of the expected combined amp+speaker tone",
            "bestFor": "What styles/sounds this pairing is ideal for"
          }
        ],
        "summary": "Brief overall recommendation and approach for this amp"
      }`;

      let userMessage = `Please recommend speakers for this amp: "${ampDescription}"`;
      if (genre) {
        const expandedGoal = expandGenreToTonalGuidance(genre);
        userMessage += ` My tonal goal is: ${expandedGoal}. Every recommendation must be specifically optimized for this sound.`;
      }
      userMessage += ` Consider classic amp/speaker pairings and what would work best.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        seed: 42,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      res.json(result);
    } catch (err) {
      console.error('Amp recommendations error:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to generate amp-based recommendations" });
    }
  });

  // IR Pairing endpoint - analyze multiple IRs for best pairings with mix ratios
  app.post(api.pairing.analyze.path, async (req, res) => {
    try {
      const input = api.pairing.analyze.input.parse(req.body);
      const { irs, irs2, tonePreferences, mixedMode } = input;

      // Determine if this is mixed speaker pairing (two separate speaker sets)
      const isMixedPairing = mixedMode && irs2 && irs2.length > 0;

      const basePrompt = `You are an expert audio engineer specializing in guitar cabinet impulse responses (IRs).
      
      Understanding IR Mixing:
      - Mixing two IRs blends their frequency characteristics
      - Complementary IRs cover different frequency ranges (e.g., bright + warm)
      - All IRs being analyzed are minimum phase transformed (MPT) - phase cancellation is NOT a concern
      - Similar IRs reinforce each other and can add subtle thickness
      - The mix ratio determines how much of each IR contributes to the final sound
      
      Mix Ratio Guidelines:
      - 50:50: Equal blend, best when both IRs are equally important
      - 60:40: Slight emphasis on the first IR while retaining character of second
      - 65:35: First IR dominates but second adds color/depth
      - 70:30: First IR is primary, second adds subtle enhancement
      - 75:25: First IR is main character, second adds just a hint of color
      
      Pairing Criteria (what makes a good pair):
      - Complementary frequency balance (one brighter, one warmer)
      - Different spectral centroids (indicates different tonal focus)
      - Combined coverage across low/mid/high energy ranges
      - Similar IRs can work well together for subtle reinforcement (no phase issues with MPT)
      
      Analysis approach:
      - Look at spectral centroid: higher = brighter, lower = warmer
      - Look at energy distribution: lowEnergy, midEnergy, highEnergy
      - Consider how each IR's characteristics complement or conflict`;

      let systemPrompt: string;
      let userMessage: string;

      if (isMixedPairing) {
        // Mixed speaker mode - pair IRs across two different speaker sets
        systemPrompt = basePrompt + `
      
      MIXED SPEAKER PAIRING MODE:
      You are analyzing IRs from TWO DIFFERENT speaker cabinets/speakers.
      Your task is to find the best cross-speaker pairings - always pair one IR from Speaker Set 1 with one IR from Speaker Set 2.
      This creates unique blended tones that combine the characteristics of both speakers.
      
      Benefits of mixed speaker pairing:
      - Combines the attack/clarity of one speaker with the warmth/body of another
      - Creates unique hybrid tones not achievable with a single speaker
      - Allows fine-tuning the blend ratio to taste
      
      Output the TOP 3-5 best cross-speaker pairings.
      Each pairing MUST include one IR from Set 1 and one IR from Set 2.
      Score each pairing from 0-100 based on how well they complement each other.
      
      Output JSON format:
      {
        "pairings": [
          {
            "title": "Short catchy name for this pairing (e.g. 'The Clarity Punch', 'Warm Modern Crunch', 'Vintage Thickness')",
            "ir1": "filename from Speaker Set 1",
            "ir2": "filename from Speaker Set 2",
            "mixRatio": "e.g. '60:40' (set1:set2)",
            "score": number (0-100, how well they pair),
            "rationale": "Why these two speakers/positions work well together",
            "expectedTone": "Description of the blended cross-speaker sound",
            "bestFor": "What styles/sounds this blend is ideal for"
          }
        ],
        "summary": "Brief overall summary of the cross-speaker pairing recommendations"
      }`;

        const set1Descriptions = irs.map((ir, i) => 
          `  IR 1.${i + 1}: "${ir.filename}"
           - Duration: ${ir.duration.toFixed(1)}ms
           - Peak Level: ${ir.peakLevel.toFixed(1)}dB
           - Spectral Centroid: ${ir.spectralCentroid.toFixed(0)}Hz
           - Low Energy: ${(ir.lowEnergy * 100).toFixed(1)}%
           - Mid Energy: ${(ir.midEnergy * 100).toFixed(1)}%
           - High Energy: ${(ir.highEnergy * 100).toFixed(1)}%`
        ).join('\n\n');

        const set2Descriptions = irs2!.map((ir, i) => 
          `  IR 2.${i + 1}: "${ir.filename}"
           - Duration: ${ir.duration.toFixed(1)}ms
           - Peak Level: ${ir.peakLevel.toFixed(1)}dB
           - Spectral Centroid: ${ir.spectralCentroid.toFixed(0)}Hz
           - Low Energy: ${(ir.lowEnergy * 100).toFixed(1)}%
           - Mid Energy: ${(ir.midEnergy * 100).toFixed(1)}%
           - High Energy: ${(ir.highEnergy * 100).toFixed(1)}%`
        ).join('\n\n');

        userMessage = `Analyze these IRs from TWO DIFFERENT SPEAKERS and recommend the best cross-speaker pairings:

SPEAKER SET 1 (${irs.length} IRs):
${set1Descriptions}

SPEAKER SET 2 (${irs2!.length} IRs):
${set2Descriptions}

Find the best pairings that combine one IR from Set 1 with one IR from Set 2.`;

      } else {
        // Single speaker mode - original behavior
        systemPrompt = basePrompt + `
      
      Your task is to analyze a set of IRs and determine which ones pair well together when mixed.
      
      Output the TOP 3-5 best pairings from the provided IRs.
      Score each pairing from 0-100 based on how well they complement each other.
      
      Output JSON format:
      {
        "pairings": [
          {
            "title": "Short catchy name for this pairing (e.g. 'The Clarity Punch', 'Warm Modern Crunch', 'Vintage Thickness')",
            "ir1": "filename of first IR",
            "ir2": "filename of second IR",
            "mixRatio": "e.g. '60:40' (first:second)",
            "score": number (0-100, how well they pair),
            "rationale": "Why these two work well together",
            "expectedTone": "Description of the blended sound",
            "bestFor": "What styles/sounds this blend is ideal for"
          }
        ],
        "summary": "Brief overall summary of the IR set and pairing recommendations"
      }`;

        const irDescriptions = irs.map((ir, i) => 
          `IR ${i + 1}: "${ir.filename}"
           - Duration: ${ir.duration.toFixed(1)}ms
           - Peak Level: ${ir.peakLevel.toFixed(1)}dB
           - Spectral Centroid: ${ir.spectralCentroid.toFixed(0)}Hz
           - Low Energy: ${(ir.lowEnergy * 100).toFixed(1)}%
           - Mid Energy: ${(ir.midEnergy * 100).toFixed(1)}%
           - High Energy: ${(ir.highEnergy * 100).toFixed(1)}%`
        ).join('\n\n');

        userMessage = `Analyze these ${irs.length} IRs and recommend the best pairings with optimal mix ratios:\n\n${irDescriptions}`;
      }
      
      if (tonePreferences && tonePreferences.trim()) {
        userMessage += `\n\nIMPORTANT - User's desired tone characteristics: "${tonePreferences.trim()}"
Prioritize pairings that achieve these tonal goals. Adjust mix ratios and recommendations to best deliver this sound.`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" },
        temperature: 0, // Deterministic results for consistent recommendations
        seed: 42, // Fixed seed for reproducibility
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      res.json(result);
    } catch (err) {
      console.error('Pairing analysis error:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to analyze IR pairings" });
    }
  });

  // Position Import/Refinement endpoint - parse user's tested positions and suggest refinements
  app.post(api.positionImport.refine.path, async (req, res) => {
    try {
      const input = api.positionImport.refine.input.parse(req.body);
      const { positionList, speaker, genre } = input;

      const systemPrompt = `You are an expert audio engineer specializing in guitar cabinet impulse responses (IRs).
      You help IR producers refine and expand their shot lists based on positions they've already tested.
      
      IMPORTANT PRINCIPLES:
      - The user's tested positions are EXTREMELY VALUABLE - they found these useful through real-world listening tests
      - These are positions the user ALREADY LIKES and has validated by ear
      - Your primary job is to KEEP their positions and suggest SUPPLEMENTARY additions to fill gaps
      - Only suggest modifications if there's a clear, significant improvement opportunity
      - Add positions that COMPLEMENT what they already have (fill gaps, add variety)
      - REMOVING positions should be EXTREMELY RARE - only for technically broken combos or dangerous setups (e.g., 0" with ribbon mic risking damage). The user liked these positions!
      
      IR Shorthand Naming Convention:
      Format: Speaker_Mic_Position_distance_variant
      
      Speaker Shorthand:
      - Cream (Celestion Cream), V30 (Vintage 30), V30BC (V30 Black Cat)
      - G12M (Greenback), G12HAnn (G12H30 Anniversary), G12-65Her (G12-65 Heritage)
      - GA12-SC64, GA10-SC64, K100 (G12K-100), G12T75 (G12T-75)
      
      Mic Shorthand:
      - SM57, R121, R10, MD421, MD421Kmp, M201, M88, Roswell, M160, e906, C414, R92, PR30
      - Variants: MD441 and e906 have _Presence or _Flat suffixes
      
      Position Format:
      - Simple: Cap, Cone, CapEdge
      - Complex: Cap_OffCenter, CapEdge_BR, CapEdge_DK, Cap_Cone_Trn
      
      Position Definitions:
      - Cap: Dead center of the dust cap
      - Cap_OffCenter: Small lateral offset from Cap, still fully on the dust cap
      - CapEdge: Seam line where the dust cap meets the cone
      - CapEdge_BR: CapEdge favoring the cap side of the seam (brighter)
      - CapEdge_DK: CapEdge favoring the cone side of the seam (darker)
      - Cap_Cone_Trn: Smooth cone immediately past the cap edge (transition zone)
      - Cone: True mid-cone position, further out from the cap edge, ribs allowed
      
      Legacy Position Translation (users may use old names):
      - "CapEdge_FavorCap" or "cap edge favor cap" → CapEdge_BR
      - "CapEdge_FavorCone" or "cap edge favor cone" → CapEdge_DK
      
      Examples:
      - V30_SM57_CapEdge_2in
      - Cream_e906_Cap_1in_Presence
      - G12M_R121_Cone_1.5in
      - V30_MD421_CapEdge_BR_1.5in
      
      Available Microphones:
      - SM57: Classic dynamic, mid-forward
      - R121: Ribbon, smooth highs, big low-mid
      - R92: Ribbon, warm, figure-8
      - M160: Hypercardioid ribbon, focused
      - MD421: Large diaphragm dynamic, punchy
      - MD421 Kompakt: Compact version
      - MD441 (Presence/Flat): Dynamic with EQ switch
      - R10: Ribbon, smooth
      - M88: Warm, great low-end
      - PR30: Clear highs, less proximity
      - e906 (Presence/Flat): Supercardioid with EQ switch
      - M201: Accurate dynamic
      - SM7B: Smooth, thick
      - C414: Condenser, detailed
      - Roswell Cab Mic: Specialized condenser for loud cabs
      
      Available Positions:
      - Cap: Dead center of the dust cap, brightest
      - Cap_OffCenter: Small lateral offset from Cap, still on dust cap
      - CapEdge: Seam line where dust cap meets cone, balanced
      - CapEdge_BR: CapEdge favoring cap side, brighter
      - CapEdge_DK: CapEdge favoring cone side, darker/warmer
      - Cap_Cone_Trn: Smooth cone past cap edge, transition zone
      - Cone: True mid-cone, darkest, most body
      
      Distances: 0" to 6" in 0.5" increments
      
      When analyzing the user's list:
      1. Parse each position (shorthand or written out)
      2. Identify what they already cover well
      3. Find gaps (missing positions, distances, or mics that would complement)
      4. Mark MOST positions as "keep" - the user tested and LIKED these!
      5. Suggest "add" positions that fill gaps or add complementary options
      6. Only use "modify" if there's a significant improvement (rare)
      7. Use "remove" ONLY in extreme cases - the user liked these positions! Only remove if:
         - Technically dangerous (e.g., ribbon mic at 0" could damage mic)
         - Completely redundant with a nearly identical position already in the list
         - Known broken/problematic combination that never works
         If in doubt, KEEP IT - the user's ears approved it${speaker ? `
      
      Speaker Context: ${speaker} - tailor suggestions for this speaker's characteristics.` : ''}${genre ? `
      
      Genre Context: ${genre} - optimize for this genre's signature sound.` : ''}
      
      Output JSON format:
      {
        "parsedPositions": [
          {
            "original": "exactly what user typed",
            "speaker": "parsed speaker code or null",
            "mic": "parsed mic code or null",
            "position": "parsed position or null",
            "distance": "parsed distance or null",
            "variant": "Presence/Flat or null",
            "parsed": true/false (whether successfully parsed)
          }
        ],
        "refinements": [
          {
            "type": "keep|modify|add|remove",
            "original": "original position if keep/modify/remove, null if add",
            "suggestion": "Human-readable description of this position (for remove: explain what's being removed)",
            "shorthand": "Full shorthand notation (Speaker_Mic_Position_Distance_Variant) - empty string for remove",
            "rationale": "Why this position should be kept/modified/added/removed"
          }
        ],
        "summary": "Brief summary of the analysis - what's covered well and what gaps were filled"
      }`;

      const userMessage = `Please analyze my tested IR positions and suggest refinements. Keep most of my positions (they work well!) and add complementary shots to fill gaps.

My tested positions:
${positionList}${speaker ? `\n\nI'm working with the ${speaker} speaker.` : ''}${genre ? `\nOptimizing for ${genre} genre.` : ''}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        seed: 42,
      });

      const rawResult = JSON.parse(response.choices[0].message.content || "{}");
      
      // Normalize the response - AI sometimes returns arrays where we expect strings
      const normalizeToString = (value: unknown): string => {
        if (Array.isArray(value)) return value.join(', ');
        if (value === null || value === undefined) return '';
        return String(value);
      };
      
      const result = {
        parsedPositions: (rawResult.parsedPositions || []).map((p: Record<string, unknown>) => ({
          original: normalizeToString(p.original),
          speaker: p.speaker ? normalizeToString(p.speaker) : undefined,
          mic: p.mic ? normalizeToString(p.mic) : undefined,
          position: p.position ? normalizeToString(p.position) : undefined,
          distance: p.distance ? normalizeToString(p.distance) : undefined,
          variant: p.variant ? normalizeToString(p.variant) : undefined,
          parsed: Boolean(p.parsed),
        })),
        refinements: (rawResult.refinements || []).map((r: Record<string, unknown>) => ({
          type: normalizeToString(r.type),
          original: r.original ? normalizeToString(r.original) : undefined,
          suggestion: normalizeToString(r.suggestion),
          shorthand: normalizeToString(r.shorthand),
          rationale: normalizeToString(r.rationale),
        })),
        summary: normalizeToString(rawResult.summary),
      };
      
      res.json(result);
    } catch (err) {
      console.error('Position import error:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to analyze positions" });
    }
  });

  // Batch IR Analysis endpoint - uses shared single-IR scoring for consistency
  app.post(api.batchAnalysis.analyze.path, async (req, res) => {
    try {
      const input = api.batchAnalysis.analyze.input.parse(req.body);
      const { irs } = input;

      // Check batch cache first
      const cacheKey = generateBatchCacheKey(irs);
      const cachedEntry = batchAnalysisCache.get(cacheKey);
      if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS)) {
        console.log(`[Batch Analysis] Cache HIT for ${irs.length} IRs`);
        return res.json(cachedEntry.data);
      }
      console.log(`[Batch Analysis] Cache MISS for ${irs.length} IRs, scoring each IR individually...`);

      // Score each IR using the SAME function as single-file mode
      // This guarantees identical scores for identical files
      const scoredResults = await Promise.all(
        irs.map(async (ir) => {
          const scored = await scoreSingleIR(ir);
          return {
            filename: ir.filename,
            parsedInfo: scored.parsedInfo,
            score: scored.score,
            isPerfect: scored.isPerfect,
            advice: scored.advice,
            highlights: scored.highlights,
            issues: scored.issues,
            renameSuggestion: scored.renameSuggestion,
          };
        })
      );

      // Calculate average score
      const totalScore = scoredResults.reduce((sum, r) => sum + r.score, 0);
      const averageScore = Math.round(totalScore / scoredResults.length);

      // Extract mics used in this batch for context
      const micsInBatch = Array.from(new Set(scoredResults.map(r => r.parsedInfo.mic).filter((m): m is string => Boolean(m))));
      const positionsInBatch = Array.from(new Set(scoredResults.map(r => r.parsedInfo.position).filter((p): p is string => Boolean(p))));
      
      // Now do gaps analysis as a separate LLM call using the scored results
      const gapsPrompt = `You are an expert audio engineer analyzing an IR set for completeness.
Given the following scored IRs, determine if the collection is COMPLETE or has genuine gaps.

AVAILABLE MICS (user's collection - ONLY suggest from this list):
SM57, R-121, R10, AEA R92, M160, MD421, MD421 Kompakt, MD441 (Presence/Flat), M88, PR30, e906 (Presence/Flat), M201, SM7B, AKG C414, Roswell Cab Mic

COVERAGE CHECKLIST - Evaluate each category:
1. BRIGHT/AGGRESSIVE: Cap positions, SM57, PR30, e906, C414 at close distance
2. WARM/DARK: Cone positions, ribbons (R-121, R10, R92, M160), SM7B
3. BALANCED/NEUTRAL: CapEdge positions, MD421, M201, moderate distances
4. MIC FAMILY DIVERSITY: At least one from each family present?
   - Dynamic (SM57, MD421, e906, PR30, M88, M201, SM7B)
   - Ribbon (R-121, R10, R92, M160)
   - Condenser (C414, Roswell) - optional but nice for detail

ESSENTIAL MIC CHARACTERS (distinct tools, not duplicates):
DYNAMICS:
- SM57: Aggressive mid-forward attack, the standard - pairs classically with ribbons
- MD421/MD421 Kompakt: Punchy, full-bodied, tighter low-end - ESSENTIAL complement to SM57, different attack character
- MD441: Exceptional clarity with presence boost/flat options, more refined than MD421
- e906: Scooped mids, fizzy presence - different EQ curve, great with ribbons for modern tones
- PR30: Extremely bright, almost harsh - for cutting through dense mixes
- SM7B: Warm, thick, smooth dynamic - great for leads and creamy tones
- M88: TG console vibe, tight controlled low-end, underrated alternative to MD421
- M201: Hypercardioid, very focused pickup, less room interaction - surgical precision

RIBBONS:
- R-121/R10: Smooth ribbon darkness, the classic blend partner for SM57
- M160: Tighter, more focused ribbon character
- R92: Similar to R-121 but different proximity effect

CONDENSERS (for true cab picture):
- Roswell Cab Mic: Global/overall cab representation, captures the full speaker character
- C414: Detailed clarity, true picture of the cab with extended high frequency response
- Condensers reveal nuances that dynamics/ribbons color over - valuable for reference and blending

COMPLETENESS EVALUATION:
A truly comprehensive set for ANY close-miked tone needs:
1. At least TWO distinct dynamic characters (e.g., SM57 AND MD421 - they serve different purposes)
2. At least ONE ribbon for smooth/dark blending
3. At least ONE condenser (Roswell or C414) for true cab picture and reference - reveals what dynamics/ribbons color
4. Coverage of Cap, CapEdge, and Cone positions (or equivalents)
5. Reasonable distance variety (0-2" for aggressive, 2-4" for balanced)

CLASSIC BLEND PAIRS (for mixing two IRs):
- SM57 + R-121: The industry standard (aggressive + smooth)
- MD421 + R-121: Punchier attack + smooth (different from SM57 blend)
- e906 + ribbon: Scooped modern + warmth
- C414 + SM57: Detail + aggression
- SM7B + bright dynamic: Smooth leads + definition

WHEN TO SUGGEST:
- Suggest when a DISTINCT mic character is missing (MD421 adds something SM57 cannot)
- Suggest when a classic blend pair cannot be achieved with current mics
- Suggest when a tonal category has zero coverage
- Suggest when position variety is lacking for mixing options
- Consider if the user can create both aggressive AND smooth blend pairs

WHEN TO STOP (anti-creep):
- Do NOT suggest a second ribbon if one ribbon already covers dark/smooth
- Do NOT suggest a second condenser if one already provides the reference/clarity role
- Do NOT suggest slight position variants (Cap vs Cap-OffCenter) if the category is covered
- Do NOT suggest distance variants if the range is reasonably covered
- Once you have: 2+ distinct dynamics, 1+ ribbon, 1+ condenser, 3 position types → the set is comprehensive

Mics in this batch: ${micsInBatch.join(', ') || 'none detected'}
Positions in this batch: ${positionsInBatch.join(', ') || 'none detected'}
Number of IRs: ${scoredResults.length}

Scored IRs:
${scoredResults.map((r, i) => 
  `${i + 1}. ${r.filename} (Score: ${r.score})
   - Mic=${r.parsedInfo.mic || 'unknown'}, Position=${r.parsedInfo.position || 'unknown'}, Speaker=${r.parsedInfo.speaker || 'unknown'}, Distance=${r.parsedInfo.distance || 'unknown'}`
).join('\n')}

Output JSON format:
{
  "coverageAnalysis": {
    "hasBright": true/false,
    "hasWarm": true/false,
    "hasBalanced": true/false,
    "hasDynamic": true/false,
    "hasRibbon": true/false,
    "hasCondenser": true/false
  },
  "isComplete": true/false,
  "summary": "Assessment. If complete, clearly state the collection is comprehensive.",
  "gapsSuggestions": [
    {
      "missingTone": "What category is genuinely missing",
      "recommendation": {
        "mic": "Mic from user's collection ONLY",
        "position": "Position",
        "distance": "Distance",
        "speaker": "Same as batch"
      },
      "reason": "Why this is ESSENTIAL for mixing pairs (must pass essentiality test)"
    }
  ]
}

IMPORTANT: If isComplete is true, gapsSuggestions MUST be an empty array [].`;

      const gapsResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: gapsPrompt },
          { role: "user", content: "Analyze the IR set for gaps and suggest what's missing." }
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        seed: 42,
      });

      const gapsResult = JSON.parse(gapsResponse.choices[0].message.content || "{}");

      const result = {
        results: scoredResults,
        summary: gapsResult.summary || `Analyzed ${irs.length} IRs with average score of ${averageScore}.`,
        averageScore,
        gapsSuggestions: gapsResult.gapsSuggestions || [],
      };
      
      // Store in cache
      batchAnalysisCache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`[Batch Analysis] Cached result for ${irs.length} IRs (cache size: ${batchAnalysisCache.size})`);
      
      res.json(result);
    } catch (err) {
      console.error('Batch analysis error:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to analyze IRs" });
    }
  });

  return httpServer;
}
