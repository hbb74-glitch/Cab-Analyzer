
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
  },
  'versatile': {
    tonalGoal: 'balanced, mix-ready tone that works across multiple genres and sits well in any production',
    characteristics: 'Prioritize mics and positions known for versatility: CapEdge positions (the sweet spot), MD421 (works on everything), SM57 (industry standard), M160 (smooth but clear). Focus on "safe" combinations that sound good in isolation AND in a mix. Avoid extreme positions (dead center Cap or far Cone) and niche mics.',
    avoid: 'Avoid extreme or one-dimensional combinations. Skip very bright (Cap+PR30) or very dark (Cone+ribbon) combos. Avoid specialized mics like Roswell unless specifically needed.'
  }
};

// Tonal keyword mappings for custom text analysis
const TONAL_KEYWORDS = {
  bright: {
    synonyms: ['spanky', 'sparkly', 'crisp', 'cutting', 'present', 'articulate', 'snappy', 'chimey', 'glassy', 'brilliant', 'airy', 'open', 'sizzle', 'twang', 'jangle'],
    avoid: ['M160', 'R121', 'R92', 'R10', 'SM7B'], // Warm/dark mics
    avoidPositions: ['CapEdge_DK', 'Cone', 'CapEdge_Cone_Tr'], // Darker positions
    prefer: ['SM57', 'PR30', 'e906', 'C414', 'Roswell'], // Brighter mics
    preferPositions: ['Cap', 'Cap_OffCenter', 'CapEdge_BR'] // Brighter positions
  },
  dark: {
    synonyms: ['warm', 'smooth', 'thick', 'fat', 'round', 'mellow', 'creamy', 'wooly', 'vintage', 'brown'],
    avoid: ['PR30', 'e906', 'C414'], // Bright mics
    avoidPositions: ['Cap', 'Cap_OffCenter', 'CapEdge_BR'], // Brighter positions
    prefer: ['M160', 'R121', 'R92', 'R10', 'SM7B'], // Warmer mics
    preferPositions: ['CapEdge_DK', 'Cone', 'CapEdge_Cone_Tr'] // Darker positions
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
    preferPositions: ['CapEdge', 'CapEdge_DK', 'CapEdge_Cone_Tr'] // Smoother positions
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
    preferPositions: ['CapEdge', 'CapEdge_DK', 'CapEdge_Cone_Tr'] // Mid-rich positions
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
    preferPositions: ['CapEdge_DK', 'Cone', 'CapEdge_Cone_Tr'] // Warm, smooth positions
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
    preferPositions: ['CapEdge', 'CapEdge_Cone_Tr', 'Cone'] // More open positions
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
    preferPositions: ['CapEdge', 'CapEdge_DK', 'CapEdge_Cone_Tr'] // Fuller positions
  },
  shoegaze: {
    synonyms: ['washy', 'layered', 'reverb', 'my bloody valentine', 'dreamy', 'swirling'],
    avoid: ['MD421', 'PR30'], // Too aggressive/direct
    avoidPositions: ['Cap'], // Too focused
    prefer: ['R121', 'M160', 'C414', 'R92'], // Smooth, detailed mics
    preferPositions: ['CapEdge', 'CapEdge_DK', 'CapEdge_Cone_Tr'] // Smooth positions
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

// Mic type detection for rule enforcement
const RIBBON_MICS = ['r121', 'r10', 'r92', '121', '10', '92'];
const CONDENSER_MICS = ['roswell', 'c414', '414'];
const BASIC_POSITIONS = ['cap', 'capedge', 'capedge_cone_tr', 'cone'];

// Post-processing validation to enforce rules the AI might violate
function validateAndFixRecommendations(
  shots: any[],
  options: {
    basicPositionsOnly?: boolean;
    singleDistancePerMic?: boolean;
    singlePositionForRibbons?: boolean;
  } = {}
): { shots: any[]; fixes: string[] } {
  const fixes: string[] = [];
  let validShots = [...shots];
  
  // Normalize mic codes to catch variations like SM57 vs 57
  // Comprehensive mic normalization - all aliases map to canonical codes
  const MIC_NORM_MAP: Record<string, string> = {
    // SM57
    '57': '57', 'sm57': '57', 'shuresm57': '57', 'shure57': '57',
    // MD421 (full size) - keep separate from MD421K
    'md421': 'md421', '421': 'md421', 'sennheisermd421': 'md421', 'sennheiser421': 'md421',
    // MD421K (Kompakt) - distinct from full size
    'md421k': 'md421k', '421k': 'md421k', 'sennheisermd421k': 'md421k', 'kompakt': 'md421k',
    // MD441
    'md441': 'md441', '441': 'md441', 'sennheisermd441': 'md441', 'sennheiser441': 'md441',
    'md441presence': 'md441', 'md441flat': 'md441', 'md441u': 'md441',
    // M160
    'm160': 'm160', '160': 'm160', 'beyerm160': 'm160', 'beyerdynamicm160': 'm160', 'beyer160': 'm160',
    // M201
    'm201': 'm201', '201': 'm201', 'beyerm201': 'm201', 'beyerdynamicm201': 'm201', 'beyer201': 'm201',
    // e906
    'e906': 'e906', '906': 'e906', 'sennheisere906': 'e906', 'sennheiser906': 'e906',
    'e906presence': 'e906', 'e906flat': 'e906', 'e906bright': 'e906',
    // PR30
    'pr30': 'pr30', 'heilpr30': 'pr30', 'heil30': 'pr30',
    // M88
    'm88': 'm88', '88': 'm88', 'beyerm88': 'm88', 'beyerdynamicm88': 'm88', 'beyer88': 'm88',
    // R121
    'r121': 'r121', '121': 'r121', 'royerr121': 'r121', 'royer121': 'r121',
    // R10
    'r10': 'r10', 'royerr10': 'r10', 'royer10': 'r10',
    // R92
    'r92': 'r92', '92': 'r92', 'aear92': 'r92', 'aea92': 'r92',
    // C414
    'c414': 'c414', '414': 'c414', 'akgc414': 'c414', 'akg414': 'c414',
    // Roswell
    'roswell': 'roswellcab', 'roswellcab': 'roswellcab', 'roswellcabmic': 'roswellcab',
  };
  
  const normalizeMicKey = (mic: string): string => {
    let m = (mic || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return MIC_NORM_MAP[m] || m;
  };
  
  // Per-mic minimum distances from MikingGuide.tsx (closeMikingRange.min)
  const MIC_MIN_DISTANCES: Record<string, number> = {
    // Dynamics - from guide data
    '57': 0.5, 'sm57': 0.5,           // SM57: 0.5-4", sweet 1"
    '421': 1, 'md421': 1,              // MD421: 1-4", sweet 2"
    'e906': 0,                         // e906: 0-2", sweet 1"
    'm88': 0.5,                        // M88: 0.5-4", sweet 1.5"
    'pr30': 0.5,                       // PR30: 0.5-4", sweet 1"
    'm201': 1,                         // M201: 1-4", sweet 2"
    'sm7b': 1, 'sm7': 1,               // SM7B: 1-6", sweet 2"
    'md441': 1,                        // MD441: 1-6", sweet 4"
    // Ribbons - figure-8 have intense proximity
    '121': 4, 'r121': 4,               // R-121: 4-6", sweet 6" - intense proximity
    'r10': 4,                          // R10: 4-6", sweet 6" - same as R-121
    'r92': 2,                          // R92: 2-6", sweet 6" - AEA "minimized proximity" design
    // M160 hypercardioid ribbon - can go very close
    '160': 0, 'm160': 0,               // M160: 0-6", sweet 1" - hypercardioid
    // Condensers
    'c414': 4,                         // C414: 4-6", sweet 6"
    // Roswell - purpose-built for cabs
    'roswell': 2, 'roswellcab': 2, 'roswellcabmic': 2,  // Roswell: 2-12", sweet 6"
  };
  
  // 1. Enforce per-mic minimum distances based on guide data
  validShots = validShots.map(shot => {
    const micLower = (shot.mic || shot.micLabel || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Find matching mic minimum
    let minDist = 0.5; // Default for dynamics
    for (const [micKey, min] of Object.entries(MIC_MIN_DISTANCES)) {
      if (micLower.includes(micKey)) {
        minDist = min;
        break;
      }
    }
    
    const dist = parseFloat((shot.distance || '0').toString().replace(/[^0-9.]/g, ''));
    if (dist < minDist) {
      fixes.push(`Fixed ${shot.micLabel || shot.mic}: ${dist}" → ${minDist}" (mic minimum)`);
      return { ...shot, distance: String(minDist) };
    }
    return shot;
  });
  
  // 3. Enforce basic positions only (filter out non-basic positions)
  if (options.basicPositionsOnly) {
    const beforeCount = validShots.length;
    validShots = validShots.filter(shot => {
      const posLower = (shot.position || '').toLowerCase()
        .replace(/[^a-z_]/g, '')
        .replace(/capedgeconetr/g, 'capedge_cone_tr');
      const isBasic = BASIC_POSITIONS.some(bp => posLower === bp || posLower.startsWith(bp + '_'));
      if (!isBasic) {
        fixes.push(`Removed ${shot.micLabel || shot.mic} at ${shot.position} (non-basic position)`);
      }
      return isBasic;
    });
    if (beforeCount !== validShots.length) {
      fixes.push(`Filtered ${beforeCount - validShots.length} non-basic positions`);
    }
  }
  
  // Helper to normalize distance to consistent numeric string format
  const normDist = (dist: any) => {
    const num = parseFloat(String(dist).replace(/[^0-9.]/g, ''));
    return isNaN(num) ? String(dist) : String(num);
  };
  
  // Sweet spot distances from MikingGuide.tsx (closeMikingRange.sweet)
  const MIC_SWEET_SPOTS: Record<string, string> = {
    '57': '1', 'sm57': '1',
    '421': '2', 'md421': '2', 'md421k': '2',
    'e906': '1',
    'm88': '1.5',
    'pr30': '1',
    'm201': '2',
    'sm7b': '2', 'sm7': '2',
    'md441': '4',
    '121': '6', 'r121': '6',
    'r10': '6',
    'r92': '6',
    '160': '1', 'm160': '1',
    'c414': '6',
    'roswell': '6', 'roswellcab': '6',
  };
  
  // 4. Enforce single distance per mic - PREFER SWEET SPOT, fall back to AI's choice
  if (options.singleDistancePerMic) {
    const micDistances = new Map<string, string>();
    
    // First pass: for each mic, use SWEET SPOT if available, otherwise first found
    for (const shot of validShots) {
      const micKey = normalizeMicKey(shot.mic || '');
      if (!micKey || micDistances.has(micKey)) continue;
      
      // Check if this mic has a sweet spot defined
      const sweetSpot = MIC_SWEET_SPOTS[micKey];
      if (sweetSpot) {
        // Use sweet spot distance
        micDistances.set(micKey, sweetSpot);
      } else {
        // No sweet spot defined, use AI's choice
        micDistances.set(micKey, normDist(shot.distance));
      }
    }
    
    // Second pass: force all shots for each mic to use the first distance found
    validShots = validShots.map(shot => {
      const micKey = normalizeMicKey(shot.mic || '');
      const expectedDist = micDistances.get(micKey);
      const currentNormDist = normDist(shot.distance);
      
      if (expectedDist && currentNormDist !== expectedDist) {
        fixes.push(`Fixed ${shot.micLabel || shot.mic}: ${shot.distance}" → ${expectedDist}" (single distance per mic)`);
        // Also fix rationale text to match new distance
        let updatedRationale = shot.rationale || '';
        const oldDist = currentNormDist;
        // Replace distance references in rationale (e.g., "3 inches" -> "4 inches", "at 3"" -> "at 4"")
        updatedRationale = updatedRationale
          .replace(new RegExp(`\\b${oldDist}\\s*(inch|inches|in|")`, 'gi'), `${expectedDist} inches`)
          .replace(new RegExp(`at ${oldDist}"`, 'gi'), `at ${expectedDist}"`)
          .replace(new RegExp(`${oldDist}"\\s*(from|away|distance)`, 'gi'), `${expectedDist}" $1`);
        return { ...shot, distance: expectedDist, rationale: updatedRationale };
      }
      return shot;
    });
  }
  
  // 5. Enforce single position for ribbons/condensers (1P mode)
  if (options.singlePositionForRibbons) {
    const ribbonCondenserPositions = new Map<string, string>();
    
    // First pass: find first position for each ribbon/condenser
    for (const shot of validShots) {
      const micLower = (shot.mic || shot.micLabel || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const isRibbonOrCondenser = RIBBON_MICS.some(r => micLower.includes(r)) || 
                                   CONDENSER_MICS.some(c => micLower.includes(c));
      
      if (isRibbonOrCondenser && !ribbonCondenserPositions.has(micLower)) {
        // Force to CapEdge if not already Cap/CapEdge
        const pos = (shot.position || '').toLowerCase();
        if (pos.includes('cap') || pos.includes('capedge')) {
          ribbonCondenserPositions.set(micLower, shot.position);
        } else {
          ribbonCondenserPositions.set(micLower, 'CapEdge');
        }
      }
    }
    
    // Second pass: force all ribbon/condenser shots to same position
    validShots = validShots.map(shot => {
      const micLower = (shot.mic || shot.micLabel || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const expectedPos = ribbonCondenserPositions.get(micLower);
      
      if (expectedPos && shot.position !== expectedPos) {
        fixes.push(`Fixed ${shot.micLabel || shot.mic}: ${shot.position} → ${expectedPos} (1P mode)`);
        return { ...shot, position: expectedPos };
      }
      return shot;
    });
  }
  
  // 6. Roswell Cab Mic special handling: single shot = 6" Cap, multiple = Cap at various distances
  // Helper to check if shot is Roswell (check both mic and micLabel with normalization)
  const isRoswell = (shot: any) => {
    const mic = (shot.mic || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const label = (shot.micLabel || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return mic.includes('roswell') || label.includes('roswell');
  };
  
  // Helper to normalize distance to consistent format (strip quotes, trailing zeros)
  const normalizeDistance = (dist: any) => {
    const num = parseFloat(String(dist).replace(/[^0-9.]/g, ''));
    return isNaN(num) ? String(dist) : String(num);
  };
  
  const roswellShots = validShots.filter(isRoswell);
  if (roswellShots.length === 1) {
    // Single Roswell shot: force to 6" Cap
    validShots = validShots.map(shot => {
      if (isRoswell(shot)) {
        const changes: string[] = [];
        let newShot = { ...shot };
        if (shot.position !== 'Cap') {
          changes.push(`${shot.position} → Cap`);
          newShot.position = 'Cap';
        }
        const normDist = normalizeDistance(shot.distance);
        if (normDist !== '6') {
          changes.push(`${shot.distance}" → 6"`);
          newShot.distance = '6';
        }
        if (changes.length > 0) {
          fixes.push(`Fixed Roswell Cab Mic: ${changes.join(', ')} (single shot default)`);
        }
        return newShot;
      }
      return shot;
    });
  } else if (roswellShots.length > 1) {
    // Multiple Roswell shots: force all to Cap position (keep varied distances)
    validShots = validShots.map(shot => {
      if (isRoswell(shot) && shot.position !== 'Cap') {
        fixes.push(`Fixed Roswell Cab Mic: ${shot.position} → Cap (multi-shot Cap focus)`);
        return { ...shot, position: 'Cap' };
      }
      return shot;
    });
  }
  
  // 7. Remove duplicate shots (same mic+position+distance with normalized distance)
  const seen = new Set<string>();
  const deduped: any[] = [];
  for (const shot of validShots) {
    const mic = (shot.mic || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const pos = (shot.position || '').toLowerCase().replace(/[^a-z_]/g, '');
    const dist = normDist(shot.distance); // Use normalized distance for consistent dedup
    const key = `${mic}|${pos}|${dist}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(shot);
    } else {
      fixes.push(`Removed duplicate: ${shot.micLabel || shot.mic} ${shot.position} ${dist}"`);
    }
  }
  
  if (fixes.length > 0) {
    console.log('[Validation] Applied fixes:', fixes);
  }
  
  return { shots: deduped, fixes };
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
function parseFilenameForExpectations(filename: string): { mic: string; position: string; speaker: string; variant?: string; isCombo?: boolean } {
  const lower = filename.toLowerCase();
  
  // Parse mic - order matters! More specific patterns first
  // IMPORTANT: Avoid patterns that could match distances (e.g., _30_ could be 30mm distance)
  let mic = 'sm57'; // default
  let variant: string | undefined;
  let isCombo = false;
  
  // Check for combo IRs first (e.g., SM57_R121_Combo_A.wav)
  if ((lower.includes('sm57') && lower.includes('r121') && lower.includes('combo')) ||
      lower.includes('sm57_r121_combo') || lower.includes('57_121_combo')) {
    mic = 'sm57_r121_combo';
    isCombo = true;
    // Extract height variant (A, B, C, etc.) - the letter after "combo_"
    const variantMatch = filename.match(/combo[_-]?([a-zA-Z])(?:[_.]|$)/i);
    if (variantMatch) {
      variant = variantMatch[1].toUpperCase();
    }
  }
  else if (lower.includes('e906') && (lower.includes('presence') || lower.includes('boost'))) mic = 'e906_presence';
  else if (lower.includes('e906')) mic = 'e906';
  else if (lower.includes('md441') && (lower.includes('presence') || lower.includes('boost'))) mic = 'md441_presence';
  else if (lower.includes('md441') || lower.includes('_441_') || lower.includes('-441-') || lower.includes('_441-')) mic = 'md441';
  else if (lower.includes('md421') && lower.includes('kompakt')) mic = 'md421kompakt';
  else if (lower.includes('md421') || lower.includes('_421_') || lower.includes('-421-') || lower.includes('_421-')) mic = 'md421';
  else if (lower.includes('sm57') || lower.includes('_57_') || lower.includes('-57-') || lower.includes('_57-')) mic = 'sm57';
  else if (lower.includes('sm7b') || lower.includes('sm7_') || lower.includes('sm7-')) mic = 'sm7b';
  else if (lower.includes('r121') || lower.includes('_121_') || lower.includes('-121-') || lower.includes('_121-')) mic = 'r121';
  else if (lower.includes('r92') || lower.includes('_92_') || lower.includes('-92-')) mic = 'r92';
  else if (lower.includes('r10') || lower.includes('_r10_') || lower.includes('-r10-')) mic = 'r10';
  else if (lower.includes('m160') || lower.includes('_160_') || lower.includes('-160-') || lower.includes('_160-')) mic = 'm160';
  else if (lower.includes('m88') || lower.includes('_88_') || lower.includes('-88-') || lower.includes('_88-')) mic = 'm88';
  else if (lower.includes('m201') || lower.includes('_201_') || lower.includes('-201-') || lower.includes('_201-')) mic = 'm201';
  else if (lower.includes('pr30') || lower.includes('_pr30_') || lower.includes('-pr30-')) mic = 'pr30'; // Removed _30_ - conflicts with distance
  else if (lower.includes('c414') || lower.includes('_414_') || lower.includes('-414-') || lower.includes('_414-')) mic = 'c414';
  else if (lower.includes('roswell')) mic = 'roswell';
  
  // Parse position - new naming convention
  // For combo IRs, position is 'blend' since it's a mix of SM57 and R121 positions
  let position = isCombo ? 'blend' : 'capedge'; // default
  if (!isCombo) {
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
  }
  
  // Parse speaker
  let speaker = 'v30'; // default
  if (lower.includes('v30bc') || lower.includes('v30_bc') || lower.includes('blackcat')) speaker = 'v30bc';
  else if (lower.includes('v30')) speaker = 'v30';
  else if (lower.includes('greenback') || lower.includes('g12m25') || lower.includes('g12m_')) speaker = 'greenback';
  else if (lower.includes('g12t75') || lower.includes('g12t-75')) speaker = 'g12t75';
  else if (lower.includes('g12-65') || lower.includes('g1265') || lower.includes('heritage')) speaker = 'g12-65';
  else if (lower.includes('g12h') && lower.includes('g12h')) speaker = 'g12h';
  else if (lower.includes('g12h') && lower.includes('anni')) speaker = 'g12hanni';
  else if (lower.includes('cream')) speaker = 'cream';
  else if (lower.includes('ga12') || lower.includes('sc64') && lower.includes('12')) speaker = 'ga12-sc64';
  else if (lower.includes('ga10') || lower.includes('g10')) speaker = 'ga10-sc64';
  else if (lower.includes('k100')) speaker = 'k100';
  
  return { mic, position, speaker, variant, isCombo };
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
  spectralDeviation: {
    expectedMin: number;
    expectedMax: number;
    actual: number;
    deviationHz: number;
    deviationPercent: number;
    direction: 'bright' | 'dark' | 'normal';
    isWithinRange: boolean;
  };
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
  
  // Use our deterministic parsing for mic/position/speaker - don't trust AI's parsedInfo
  // The AI was incorrectly identifying mics (e.g., SM57 as PR30)
  // Parse distance from filename if present (AI can help with this one)
  const distanceMatch = ir.filename.match(/(\d+(?:\.\d+)?)\s*(?:in|inch|")/i) || 
                        ir.filename.match(/_(\d+(?:\.\d+)?)(?:_|$)/);
  const parsedDistance = distanceMatch ? distanceMatch[1] : (result.parsedInfo?.distance || null);
  
  const formatted = {
    score: result.score || 0,
    isPerfect: result.isPerfect || false,
    advice: result.advice || "Could not generate advice.",
    highlights: result.highlights || [],
    issues: result.issues || [],
    parsedInfo: {
      mic: parsed.mic,       // Use deterministic parsing
      position: parsed.position, // Use deterministic parsing
      speaker: parsed.speaker,   // Use deterministic parsing
      distance: parsedDistance,  // Parse from filename or use AI's
    },
    renameSuggestion: result.renameSuggestion || null,
    spectralDeviation: {
      expectedMin: expectedRange.min,
      expectedMax: expectedRange.max,
      actual: ir.spectralCentroid,
      deviationHz: deviation.deviation,
      deviationPercent: deviation.deviationPercent,
      direction: deviation.direction,
      isWithinRange: deviation.isWithinRange,
    },
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

      // Include tonal modifier suggestion, detected mic variant, and spectral deviation in response
      const responseWithExtras = {
        ...saved,
        micLabel: micVariant,
        renameSuggestion: scored.renameSuggestion ? {
          suggestedModifier: scored.renameSuggestion.suggestedModifier,
          reason: scored.renameSuggestion.reason
        } : null,
        spectralDeviation: scored.spectralDeviation
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
      const { micType, speakerModel, genre, preferredShots, targetShotCount, basicPositionsOnly, singleDistancePerMic, micShotCounts } = input;
      
      // Build position restriction instruction
      let positionInstruction = '';
      if (basicPositionsOnly) {
        positionInstruction = `\n\nPOSITION RESTRICTION: ONLY use these 4 basic positions: Cap, CapEdge, CapEdge_Cone_Tr, Cone.
DO NOT suggest: Cap_OffCenter, CapEdge_BR (bright variation), CapEdge_DK (dark variation), or any other position variations.`;
      }
      
      // Build shot count instruction
      // Overshoot by ~35% to account for validation filtering, then trim to exact target
      const aiRequestCount = targetShotCount ? Math.ceil(targetShotCount * 1.35) : null;
      
      let shotCountInstruction = 'Provide 6-8 COMPLETE SHOT recommendations';
      let includeSelectionRationale = false;
      if (aiRequestCount && targetShotCount) {
        shotCountInstruction = `Provide EXACTLY ${aiRequestCount} COMPLETE SHOT recommendations - no more, no less`;
        if (targetShotCount === 1) {
          includeSelectionRationale = true;
          shotCountInstruction += `. CRITICAL: Return EXACTLY 1 shot in the shots array - not 2, not 3, just ONE. For switchable mics (MD441, e906), pick THE SINGLE BEST voicing mode (Presence OR Flat, not both). Include a "selectionRationale" field using SINGULAR language (never "these shots", "variety", or "curated set"). Write 2-3 sentences explaining: 1) Why THIS position+distance captures the essential character, 2) If applicable, why this voicing mode (Presence or Flat) is the better choice for this speaker, 3) What makes THIS the definitive single shot. Start with "This shot..."`;
        } else if (targetShotCount >= 2 && targetShotCount <= 4) {
          includeSelectionRationale = true;
          shotCountInstruction += `. IMPORTANT: Since you're only providing ${targetShotCount} shots, include a "selectionRationale" field explaining WHY you chose these specific ${targetShotCount} shots over other possibilities - what makes them the essential picks for this mic/speaker/genre combination`;
        }
        if (targetShotCount > 25) {
          shotCountInstruction += `. NOTE: With ${targetShotCount} shots requested, some recommendations may overlap in character. Prioritize variety in position, distance, and tonal goals to minimize redundancy`;
        }
      }
      
      // Build single distance per mic instruction
      let distanceInstruction = '';
      if (singleDistancePerMic) {
        distanceInstruction = `\n\nSINGLE DISTANCE PER MIC (CRITICAL):
- ALL shots for this mic MUST use the SAME distance
- Pick ONE optimal distance based on the mic's sweet spot for this speaker
- Vary POSITION (Cap, CapEdge, CapEdge_Cone_Tr, Cone) for tonal variety, NOT distance
- This is MANDATORY for workflow efficiency`;
      }
      
      // Build mic shot counts instruction
      let micShotInstruction = '';
      if (micShotCounts && micShotCounts.trim()) {
        // Parse individual mic requirements for clearer checklist
        const micLines = micShotCounts.split(', ').filter(l => l.trim());
        const micChecklist: string[] = [];
        let recipeTotal = 0;
        
        for (const line of micLines) {
          const match = line.match(/^(.+?)\s*x\s*(\d+)/);
          if (match) {
            const micName = match[1].trim();
            const count = parseInt(match[2]);
            recipeTotal += count;
            micChecklist.push(`[ ] ${micName}: ${count} shots`);
          }
        }
        
        const remainingSlots = targetShotCount ? targetShotCount - recipeTotal : 0;
        
        console.log('[By-Mic] Recipe math:', { recipeTotal, targetShotCount, remainingSlots, micChecklist });
        
        micShotInstruction = `\n\n╔══════════════════════════════════════════════════════════════╗
║  MANDATORY: YOUR OUTPUT MUST CONTAIN EXACTLY ${aiRequestCount} SHOTS  ║
╚══════════════════════════════════════════════════════════════╝

REQUIRED MIC CHECKLIST (you must include ALL of these):
${micChecklist.join('\n')}

TOTAL FROM CHECKLIST: ${recipeTotal} shots minimum

CRITICAL RULES:
1. MD421 and MD421K are DIFFERENT mics. If checklist says "MD421K" output "MD421K", NOT "MD421"
2. Every mic in the checklist MUST appear in your output with AT LEAST that many shots
3. No duplicates - each shot must have a UNIQUE position+distance combination
4. Generate ${aiRequestCount} total shots (we'll validate and trim to ${targetShotCount})${remainingSlots > 0 ? ` - include ${remainingSlots} more beyond the checklist` : ''}

CONSTRAINT DETAILS:
${micShotCounts}

VALIDATION: Before outputting, verify EVERY checklist mic appears with correct count.`;
      }

      const systemPrompt = `You are an expert audio engineer specializing in guitar cabinet impulse responses (IRs).
      Your task is to recommend IDEAL DISTANCES for a specific microphone and speaker combination.
      
      === INSTRUCTION HIERARCHY (ALL apply together, none negate others) ===
      You are like a professional recording engineer taking notes from an artist/producer. Consider ALL inputs:
      1. TARGET SHOT COUNT: If specified, generate exactly this many shots total
      2. SINGLE DISTANCE PER MIC: If enabled, all shots for each mic use ONE optimal distance
      3. MIC RECIPE: If specified, these are MINIMUM requirements that MUST be included
      4. GENRE/TONALITY: Influences position, distance, and mic voicing choices for ALL shots
      5. FREE TEXT NOTES: Additional preferences to consider and incorporate
      
      These work TOGETHER - a mic recipe doesn't ignore genre, single-distance doesn't ignore tonality.
      Every shot should serve the user's complete vision.
      Distance is the primary variable - position on the speaker is less important for this analysis.
      Focus on how distance affects the tonal characteristics of this specific mic+speaker pairing.
      
      === DISTANCE GUIDELINES (from MikingGuide - closeMikingRange data) ===
      
      MANDATORY: USE THE SWEET SPOT DISTANCE for the FIRST shot of each mic.
      
      You MAY deviate from sweet spot ONLY IF you provide PROFESSIONAL JUSTIFICATION:
      - Explain the acoustic/engineering reason (e.g., "Pulled back to 4" to reduce proximity effect bass buildup for a tighter, more defined low end suitable for fast palm-muted passages")
      - Reference the tonal goal and how distance achieves it
      - Cite professional technique if applicable (e.g., "Per Andy Wallace technique for less boomy rhythm tones")
      
      If you deviate, your rationale MUST explain WHY that distance serves the tonal goal better than the sweet spot.
      Generic explanations like "for variety" are NOT acceptable.
      
      DYNAMICS (SWEET SPOTS):
      - 57 (SM57): range 0.5-4", SWEET SPOT 1". Classic mid-forward presence.
      - 421 (MD421): range 1-4", SWEET SPOT 2". Large diaphragm, scooped mids.
      - 421k (MD421K): range 1-4", SWEET SPOT 2". Compact MD421. DIFFERENT MIC.
      - e906 (e906): range 0-2", SWEET SPOT 1". Supercardioid, three-position switch.
      - m88 (M88): range 0.5-4", SWEET SPOT 1.5". Warm, great low-end punch.
      - pr30 (PR30): range 0.5-4", SWEET SPOT 1". Large diaphragm, clear highs.
      - m201 (M201): range 1-4", SWEET SPOT 2". Very accurate dynamic.
      - sm7b (SM7B): range 1-6", SWEET SPOT 2". Smooth, broadcast-quality.
      - md441 (MD441): range 1-6", SWEET SPOT 4". Condenser-like transparency.
      
      FIGURE-8 RIBBONS (SWEET SPOT 6" - controls proximity effect):
      - 121 (R-121): range 4-6", SWEET SPOT 6". Pulling closer adds bass weight.
      - r10 (R10): range 4-6", SWEET SPOT 6". Same as R-121.
      - r92 (R92): range 2-6", SWEET SPOT 6". AEA minimized proximity design.
      
      HYPERCARDIOID RIBBON:
      - 160 (M160): range 0-6", SWEET SPOT 1". Jacquire King close-mic technique.
      
      CONDENSERS (SWEET SPOT 6"):
      - c414 (C414): range 4-6", SWEET SPOT 6". Always use pad.
      - roswell-cab (Roswell Cab Mic): range 2-12", SWEET SPOT 6". Cap position ONLY.
      
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
      
      Distance Effects (general principles) - CRITICAL ACOUSTIC TRUTH:
      DISTANCE AFFECTS BASS (proximity effect), NOT brightness/darkness:
      - CLOSER = MORE BASS (proximity effect boost) = warmer/fuller/thicker
      - FURTHER = LESS BASS (reduced proximity) = leaner/tighter/relatively brighter
      
      Do NOT confuse with position (Cap=bright, Cone=dark). Distance changes LOW END, not high end.
      
      - 0-0.5": Maximum proximity effect = most bass boost, very thick/warm
      - 1-2": Sweet spot for most dynamics, good bass balance, punchy
      - 2.5-4": Reduced proximity = less bass, more natural/tighter
      - 4.5-6": Minimal proximity = leanest bass, tightest low end, relatively brighter due to less bass
      
      Available Positions:
      - Cap: Dead center of the dust cap, brightest, most high-end detail
      - Cap_OffCenter: Small lateral offset from Cap, still fully on the dust cap, less harsh attack
      - CapEdge: Seam line where the dust cap meets the cone, balanced tone, often the "sweet spot"
      - CapEdge_BR: CapEdge favoring the cap side of the seam, brighter than standard CapEdge
      - CapEdge_DK: CapEdge favoring the cone side of the seam, darker/warmer than standard CapEdge
      - CapEdge_Cone_Tr: Smooth cone immediately past the cap edge, transition zone
      - Cone: True mid-cone position, further out from the cap edge, ribs allowed, darkest/warmest${genre ? `
      
      === USER'S TONAL GOAL (HIGHEST PRIORITY) ===
      The user wants: ${expandGenreToTonalGuidance(genre)}
      
      CRITICAL: This tonal goal is your PRIMARY filter for all recommendations.
      - ONLY recommend distances/positions that genuinely achieve this specific sound
      - Each rationale MUST explicitly explain HOW this distance achieves the tonal goal
      - The expectedTone MUST describe how this delivers the requested sound
      - The bestFor MUST reference the tonal goal or closely related sounds
      - EXCLUDE generic recommendations that don't serve this tonal goal` : ''}
      
      ${shotCountInstruction} - each shot is a specific POSITION + DISTANCE combination.${distanceInstruction}${micShotInstruction}
      IMPORTANT: These are NOT interchangeable. Certain distances work better at certain positions.
      For example: Cap at 1" is very different from Cap at 4". CapEdge at 2" is different from Cone at 2".
      
      MULTIPLE SHOTS AT SAME DISTANCE: If user preferences show multiple positions at the same distance (e.g., Cap 2", CapEdge 2", Cone 2"), 
      they want POSITION VARIETY at their preferred distance. Recommend multiple shots at that distance with different positions.
      ${genre ? `FILTER all recommendations through the user's tonal goal "${genre}". Only include shots that genuinely serve this sound.` : 'Cover a variety of useful shots for this mic+speaker combo.'}
      
      For MD441 and e906 (switchable mics):
      - These mics have Presence/Flat switches - treat each setting as a SEPARATE MIC option
      - Include BOTH variants as separate shots when both are useful
      - CRITICAL: EVERY shot with MD441 or e906 MUST include the setting in micLabel: "MD441 (Presence)", "MD441 (Flat)", "e906 (Presence)", "e906 (Flat)"
      - Never omit the setting - if you recommend MD441, specify which setting for EACH shot
      - Only use ONE setting (all Presence or all Flat) if the genre strongly demands it
      
      Output JSON format:
      {
        "mic": "${micType}",
        "micDescription": "Brief description of the microphone's character",
        "speaker": "${speakerModel}",
        "speakerDescription": "Brief description of the speaker's tonal characteristics",
        ${genre ? `"genre": "${genre}",` : ''}
        "shots": [
          {
            "micLabel": "REQUIRED: Display name WITH switch setting for MD441/e906 (e.g. 'MD441 (Presence)', 'MD441 (Flat)', 'e906 (Presence)', 'e906 (Flat)'). For other mics, use standard label.",
            "position": "Cap|Cap_OffCenter|CapEdge|CapEdge_BR|CapEdge_DK|CapEdge_Cone_Tr|Cone",
            "distance": "distance in inches as string (e.g. '1' or '2.5')",
            "rationale": "Why THIS specific position+distance combo works${genre ? ` for '${genre}'` : ''} - be specific about both factors",
            "expectedTone": "How this exact shot sounds",
            "bestFor": "${genre ? `'${genre}' and related sounds` : 'What styles/sounds this shot is ideal for'}"
          }
        ]${includeSelectionRationale ? `,
        "selectionRationale": "1-2 sentence explanation of why you chose these specific shots over other options - what makes this curated set optimal for this mic/speaker combination${genre ? ` and the ${genre} tonal goal` : ''}"` : ''}
      }`;


      let userMessage = `Please recommend specific position+distance SHOTS for the ${micType} microphone paired with the ${speakerModel} speaker.`;
      if (genre) {
        const expandedGoal = expandGenreToTonalGuidance(genre);
        userMessage += ` The user's PRIMARY goal is: ${expandedGoal}. Every shot must be specifically optimized for this sound. Do not include generic shots that don't serve this tonal goal.`;
      } else {
        userMessage += ` Cover a variety of useful position+distance combinations, explaining what each specific shot delivers tonally.`;
      }
      
      if (preferredShots) {
        userMessage += `\n\n=== USER'S PREFERRED SHOTS ===\nThe user has these preferences they'd like you to consider and prioritize:\n${preferredShots}\n\nPlease incorporate these preferences into your recommendations. If they've listed specific position+distance combos they like, include those in your suggestions. If they have existing shots they want to complement, suggest shots that would pair well.`;
      }
      
      if (positionInstruction) {
        userMessage += positionInstruction;
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
      // Debug: log shots to see if micLabel is present
      console.log('[By-Mic API] Shots returned:', JSON.stringify(result.shots?.slice(0, 2), null, 2));
      
      // Validate and fix recommendations (enforce rules AI might violate)
      if (result.shots && Array.isArray(result.shots)) {
        const validation = validateAndFixRecommendations(result.shots, {
          basicPositionsOnly: basicPositionsOnly,
          singleDistancePerMic: singleDistancePerMic,
        });
        result.shots = validation.shots;
        if (validation.fixes.length > 0) {
          console.log('[By-Mic API] Validation fixes applied:', validation.fixes.length);
        }
      }
      
      // Enforce exact shot count if specified
      if (targetShotCount && result.shots && Array.isArray(result.shots)) {
        if (result.shots.length > targetShotCount) {
          result.shots = result.shots.slice(0, targetShotCount);
        }
        // Note: If AI returned fewer shots than requested, we accept what we got
        // rather than hallucinating additional shots
        
        // If we trimmed to 1 shot but rationale contains plural language, clear it
        if (targetShotCount === 1 && result.selectionRationale) {
          const pluralPatterns = /these shots|curated set|variety of|each shot|versatility|different styles|different genres/i;
          if (pluralPatterns.test(result.selectionRationale)) {
            console.log('[By-Mic API] Clearing invalid plural rationale for 1-shot request');
            delete result.selectionRationale;
          }
        }
      }
      
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
      const { speakerModel, genre, preferredShots, targetShotCount, basicPositionsOnly, singleDistancePerMic, singlePositionForRibbons, micShotCounts } = input;
      
      // Build position restriction instruction
      let positionInstruction = '';
      if (basicPositionsOnly) {
        positionInstruction = `\n\nPOSITION RESTRICTION: ONLY use these 4 basic positions: Cap, CapEdge, CapEdge_Cone_Tr, Cone.
DO NOT suggest: Cap_OffCenter, CapEdge_BR (bright variation), CapEdge_DK (dark variation), or any other position variations.`;
      }
      
      // Build shot count instruction
      // Overshoot by ~35% to account for validation filtering, then trim to exact target
      const aiRequestCount = targetShotCount ? Math.ceil(targetShotCount * 1.35) : null;
      
      let shotCountInstruction = 'Provide 6-10 specific mic/position/distance recommendations';
      let includeSelectionRationale = false;
      if (aiRequestCount && targetShotCount) {
        shotCountInstruction = `Provide EXACTLY ${aiRequestCount} specific mic/position/distance recommendations - no more, no less`;
        if (targetShotCount === 1) {
          includeSelectionRationale = true;
          shotCountInstruction += `. CRITICAL: You are choosing THE SINGLE BEST mic/position/distance combination to represent this speaker${genre ? ` for ${genre}` : ''}. Include a "selectionRationale" field using SINGULAR language only (never say "these shots" or "variety" - there is only ONE recommendation). Write 2-3 sentences explaining: 1) Why THIS specific mic best captures this speaker's character, 2) Why THIS position and distance is optimal, 3) What makes THIS the definitive single shot. Start with "This combination..." not "These shots..."`;
        } else if (targetShotCount >= 2 && targetShotCount <= 4) {
          includeSelectionRationale = true;
          shotCountInstruction += `. IMPORTANT: Since you're only providing ${targetShotCount} recommendations, include a "selectionRationale" field explaining WHY you chose these specific ${targetShotCount} mic/position/distance combinations over other possibilities - what makes them the essential picks for this speaker${genre ? ` and the ${genre} tonal goal` : ''}`;
        }
        if (targetShotCount > 25) {
          shotCountInstruction += `. NOTE: With ${targetShotCount} shots requested, some recommendations may have similar tonal characteristics. Prioritize variety across mic types, positions, and distances to minimize redundancy`;
        }
      }
      
      // Build single distance per mic instruction
      let distanceInstruction = '';
      if (singleDistancePerMic) {
        distanceInstruction = `\n\nSINGLE DISTANCE PER MIC (CRITICAL):
- For each mic type, ALL shots with that mic MUST use the SAME distance
- Pick ONE optimal distance per mic based on its sweet spot for this speaker
- Vary POSITION (Cap, CapEdge, CapEdge_Cone_Tr, Cone) for tonal variety, NOT distance
- This is MANDATORY for workflow efficiency`;
      }
      
      // Build mic shot counts instruction
      let micShotInstruction = '';
      if (micShotCounts && micShotCounts.trim()) {
        // Parse individual mic requirements for clearer checklist
        const micLines = micShotCounts.split(', ').filter(l => l.trim());
        const micChecklist: string[] = [];
        let recipeTotal = 0;
        
        for (const line of micLines) {
          const match = line.match(/^(.+?)\s*x\s*(\d+)/);
          if (match) {
            const micName = match[1].trim();
            const count = parseInt(match[2]);
            recipeTotal += count;
            micChecklist.push(`[ ] ${micName}: ${count} shots`);
          }
        }
        
        const remainingSlots = targetShotCount ? targetShotCount - recipeTotal : 0;
        
        console.log('[By-Speaker] Recipe math:', { recipeTotal, targetShotCount, remainingSlots, micChecklist });
        
        micShotInstruction = `\n\n╔══════════════════════════════════════════════════════════════╗
║  MANDATORY: YOUR OUTPUT MUST CONTAIN EXACTLY ${aiRequestCount} SHOTS  ║
╚══════════════════════════════════════════════════════════════╝

REQUIRED MIC CHECKLIST (you must include ALL of these):
${micChecklist.join('\n')}

TOTAL FROM CHECKLIST: ${recipeTotal} shots minimum

CRITICAL RULES:
1. MD421 and MD421K are DIFFERENT mics. If checklist says "MD421K" you MUST output "MD421K", NOT "MD421"
2. Every mic in the checklist MUST appear in your output with AT LEAST that many shots
3. No duplicates - each shot must have a UNIQUE position+distance combination
4. Generate ${aiRequestCount} total shots (we'll validate and trim to ${targetShotCount})${remainingSlots > 0 ? ` - include ${remainingSlots} more beyond the checklist` : ''}

CONSTRAINT DETAILS:
${micShotCounts}

VALIDATION BEFORE OUTPUT:
- Count SM57 shots: must be >= required
- Count R121 shots: must be >= required  
- Count M160 shots: must be >= required (DO NOT SKIP M160!)
- Count MD421K shots: must be >= required (NOT MD421!)
- Count MD441 shots: must be >= required
- Count e906 shots: must be >= required (DO NOT SKIP e906!)
- Count M201 shots: must be >= required
- Count C414 shots: must be >= required
- Count Roswell shots: must be >= required
- TOTAL shots: must equal ${targetShotCount}`;
      }
      
      // Build hierarchy instruction - all options work together
      const hierarchyInstruction = `
      === INSTRUCTION HIERARCHY (ALL apply together, none negate others) ===
      You are like a professional recording engineer taking notes from an artist/producer. Consider ALL inputs:
      1. TARGET SHOT COUNT: If specified, generate exactly this many shots total
      2. SINGLE DISTANCE PER MIC: If enabled, all shots for each mic use ONE optimal distance
      3. MIC RECIPE: If specified, these are MINIMUM requirements that MUST be included
      4. GENRE/TONALITY: Influences position, distance, and mic voicing choices for ALL shots
      5. FREE TEXT NOTES/PREFERENCES: Additional guidance to consider and incorporate
      
      These work TOGETHER - a mic recipe doesn't ignore genre, single-distance doesn't ignore tonality.
      Every shot should serve the user's complete vision.`;

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
      ${hierarchyInstruction}
      
      IMPORTANT: Your recommendations should be based on REAL IR production techniques and proven recipes.
      When curated recipes are provided, PRIORITIZE them over generic suggestions.
      ${curatedSection}
      
      === DISTANCE GUIDELINES (from MikingGuide - closeMikingRange data) ===
      
      MANDATORY: USE THE SWEET SPOT DISTANCE for the FIRST shot of each mic.
      
      You MAY deviate from sweet spot ONLY IF you provide PROFESSIONAL JUSTIFICATION in rationale:
      - Explain the acoustic/engineering reason (e.g., "Pulled back to 4" to reduce proximity effect bass buildup for a tighter, more defined low end suitable for fast palm-muted passages")
      - Reference the tonal goal and how distance achieves it
      - Cite professional technique if applicable (e.g., "Per Andy Wallace technique for less boomy rhythm tones")
      
      If you deviate, your rationale MUST explain WHY that distance serves the tonal goal better than the sweet spot.
      Generic explanations like "for variety" are NOT acceptable.
      
      DYNAMICS (SWEET SPOTS):
      - 57 (SM57): range 0.5-4", SWEET SPOT 1". Classic mid-forward presence.
      - 421 (MD421): range 1-4", SWEET SPOT 2". Large diaphragm, scooped mids.
      - 421k (MD421K): range 1-4", SWEET SPOT 2". Compact MD421. DIFFERENT MIC.
      - e906 (e906): range 0-2", SWEET SPOT 1". Supercardioid, three-position switch.
      - m88 (M88): range 0.5-4", SWEET SPOT 1.5". Warm, great low-end punch.
      - pr30 (PR30): range 0.5-4", SWEET SPOT 1". Large diaphragm, clear highs.
      - m201 (M201): range 1-4", SWEET SPOT 2". Very accurate dynamic.
      - sm7b (SM7B): range 1-6", SWEET SPOT 2". Smooth, broadcast-quality.
      - md441 (MD441): range 1-6", SWEET SPOT 4". Condenser-like transparency.
      
      FIGURE-8 RIBBONS (SWEET SPOT 6" - controls proximity effect):
      - 121 (R-121): range 4-6", SWEET SPOT 6". Pulling closer adds bass weight.
      - r10 (R10): range 4-6", SWEET SPOT 6". Same as R-121.
      - r92 (R92): range 2-6", SWEET SPOT 6". AEA minimized proximity design.
      
      HYPERCARDIOID RIBBON:
      - 160 (M160): range 0-6", SWEET SPOT 1". Jacquire King close-mic technique.
      
      CONDENSERS (SWEET SPOT 6"):
      - c414 (C414): range 4-6", SWEET SPOT 6". Always use pad.
      - roswell-cab (Roswell Cab Mic): range 2-12", SWEET SPOT 6". Cap position ONLY.
      
      Available Positions:
      - Cap: Dead center of the dust cap, brightest, most high-end detail
      - Cap_OffCenter: Small lateral offset from Cap, still fully on the dust cap, less harsh attack
      - CapEdge: Seam line where the dust cap meets the cone, balanced tone, often the "sweet spot"
      - CapEdge_BR: CapEdge favoring the cap side of the seam, brighter
      - CapEdge_DK: CapEdge favoring the cone side of the seam, darker/warmer
      - CapEdge_Cone_Tr: Smooth cone immediately past the cap edge, transition zone
      - Cone: True mid-cone position, further out from the cap edge, ribs allowed, darkest/warmest
      
      Available Distances (inches): 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6
      
      Distance Effects - CRITICAL ACOUSTIC TRUTH:
      DISTANCE AFFECTS BASS (proximity effect), NOT brightness/darkness:
      - CLOSER = MORE BASS (proximity effect boost) = warmer/fuller/thicker
      - FURTHER = LESS BASS (reduced proximity) = leaner/tighter/relatively brighter due to less low end
      
      Do NOT confuse with position (Cap=bright, Cone=dark). Distance changes LOW END only.
      - 0-0.5": Maximum proximity = most bass boost
      - 1-2": Good bass balance, punchy
      - 2.5-4": Less bass, more natural/tighter
      - 4.5-6": Leanest bass, tightest low end
      
      === ${genre ? "USER'S TONAL GOAL" : "VERSATILITY FOCUS"} (HIGHEST PRIORITY) ===
      ${genre ? `The user wants: ${expandGenreToTonalGuidance(genre)}` : `No specific genre requested - prioritize VERSATILE, MIX-READY combinations.
      ${expandGenreToTonalGuidance('versatile')}`}
      
      CRITICAL: This ${genre ? 'tonal goal' : 'versatility focus'} is your PRIMARY filter. Every single recommendation MUST be optimized for ${genre ? 'this specific sound' : 'broad usability across genres'}.
      - ONLY recommend combinations that genuinely serve ${genre ? 'this tonal goal' : 'versatility and mix-readiness'}
      - EXCLUDE combinations that ${genre ? "don't align with this sound" : 'are too extreme or specialized'} (even if they're popular for other purposes)
      - Each rationale MUST explicitly explain HOW this combination ${genre ? 'achieves the tonal goal' : 'provides versatility'}
      - The expectedTone MUST describe how this ${genre ? 'achieves the requested sound' : 'works across different contexts'}
      - The bestFor MUST reference ${genre ? 'the tonal goal or closely related sounds' : 'multiple genres/styles this works for'}
      
      === RATIONALE WRITING RULES (ANTI-SLOP) ===
      BANNED VAGUE PHRASES - NEVER use these in rationale/expectedTone:
      - "balanced" (meaningless without specifics)
      - "warm tone" or "smooth" without explaining what frequencies/why
      - "room interaction" or "room ambiance" (this is CLOSE-MIKING, no room)
      - "avoiding proximity effect from being too close" (contradictory - proximity IS from being close)
      - "detailed" or "articulate" without specifics
      - "ideal for capturing" (empty filler)
      
      GOOD rationale examples:
      - "The R121's figure-8 pattern rolls off above 10kHz, taming the G12T75's ice-pick highs while the 4" distance reduces the proximity bass boost that would otherwise muddy palm mutes."
      - "Cap position emphasizes 3-5kHz presence peak; at 1" the proximity effect adds low-mid weight that fills out thin single-coil tones."
      - "The MD441's presence switch adds a 4dB bump at 5kHz; CapEdge position backs off the speaker's native 3kHz peak to prevent harshness."
      
      EVERY rationale must reference:
      1. A SPECIFIC frequency range or tonal characteristic
      2. HOW the position/distance/mic interact acoustically
      3. The end result for the player (cuts through mix, sits well with bass, etc.)
      
      ${shotCountInstruction}.${distanceInstruction}${micShotInstruction}
      CRITICAL: Each recommendation is a COMPLETE COMBO - one specific mic at one specific position at one specific distance.
      Example: "MD441 (Presence) at CapEdge, 2 inches" - not separate lists of mics, positions, distances.
      ${genre ? `FILTER all recommendations through the user's tonal goal: "${genre}". Only include combinations that achieve this sound.` : 'FILTER all recommendations through VERSATILITY - prioritize proven, balanced combinations that work across rock, blues, country, and other genres. Avoid extreme or niche choices.'}
      
      Output JSON format:
      {
        "speaker": "${speakerModel}",
        "speakerDescription": "Brief description of the speaker's tonal characteristics",
        ${genre ? `"genre": "${genre}",` : ''}
        "micRecommendations": [
          {
            "mic": "mic code (e.g. '57', '121', 'md441', 'e906', 'roswell-cab')",
            "micLabel": "Display name - MUST include switch setting for MD441/e906: 'MD441 (Presence)', 'MD441 (Flat)', 'e906 (Presence)', 'e906 (Flat)'",
            "position": "Cap|Cap_OffCenter|CapEdge|CapEdge_BR|CapEdge_DK|CapEdge_Cone_Tr|Cone",
            "distance": "distance in inches as string (e.g. '1' or '2.5')",
            "rationale": "Why this combination achieves the user's tonal goal${genre ? ` ('${genre}')` : ''} - be specific",
            "expectedTone": "How this sounds${genre ? ` and how it delivers '${genre}'` : ''}",
            "bestFor": "${genre ? `'${genre}' and related sounds` : 'What styles/sounds this is ideal for'}"
          }
        ],
        "summary": "${genre ? `How these recommendations collectively achieve '${genre}' for this speaker` : 'Brief overall summary of the best approach for this speaker based on IR production experience'}"${includeSelectionRationale ? `,
        "selectionRationale": "1-2 sentence explanation of why you chose these specific mic/position/distance combinations over other options - what makes this curated set optimal for this speaker${genre ? ` and the ${genre} tonal goal` : ''}"` : ''}
      }`;

      // Use "versatile" as default when no genre specified for intelligent curation
      const effectiveGenre = genre || 'versatile';
      const expandedGoal = expandGenreToTonalGuidance(effectiveGenre);
      
      let userMessage = `Please recommend the best microphones, positions, and distances for the ${speakerModel} speaker.`;
      userMessage += ` The user's PRIMARY goal is: ${expandedGoal}. Every recommendation must be specifically optimized for this sound.`;
      if (!genre) {
        userMessage += ` Since no specific genre was requested, focus on VERSATILE combinations that work across multiple styles - prioritize proven, mix-ready choices over extreme or niche options.`;
      }
      userMessage += ` Base your recommendations on proven IR production techniques.`;
      
      if (preferredShots) {
        userMessage += `\n\n=== USER'S PREFERRED SHOTS/DISTANCES ===\nThe user has these preferences they'd like you to consider and prioritize:\n${preferredShots}\n\nPlease incorporate these preferences into your recommendations. If they've listed specific mics, distances, or positions they like, include those in your suggestions. If they have existing shots they want to complement, suggest combinations that would pair well with what they already have.`;
      }
      
      if (positionInstruction) {
        userMessage += positionInstruction;
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
      
      // Check for missing mics and fix if needed
      if (micShotCounts && result.micRecommendations && Array.isArray(result.micRecommendations)) {
        const micLines = micShotCounts.split(', ').filter(l => l.trim());
        const requiredMics: { name: string; count: number; micCode: string; has1D: boolean; has1P: boolean }[] = [];
        
        for (const line of micLines) {
          const match = line.match(/^(.+?)\s*x\s*(\d+)/);
          if (match) {
            const micName = match[1].trim();
            const count = parseInt(match[2]);
            // Parse constraint markers from STRICT format
            // 1D = same distance for all, vary position -> "Use ONE distance"
            // 1P = same position for all, vary distance -> "Pick ONE position" 
            const has1D = line.includes('Use ONE distance') || line.includes('different positions, same distance') || line.includes('[1D]');
            const has1P = line.includes('Pick ONE position') || line.includes('same position, different distances') || line.includes('[1P]') || line.includes('ALL Roswell shots MUST be at Cap');
            // Map display names to mic codes
            let micCode = micName.toLowerCase()
              .replace('sm57', '57')
              .replace('r121', '121')
              .replace('md421k (kompakt)', 'md421k')
              .replace('roswell cab mic', 'roswell-cab')
              .replace(' ', '');
            if (micName.includes('160')) micCode = '160';
            if (micName.includes('906')) micCode = 'e906';
            requiredMics.push({ name: micName, count, micCode, has1D, has1P });
          }
        }
        
        // Count what we got
        const gotMics: Record<string, number> = {};
        for (const shot of result.micRecommendations) {
          const mic = shot.mic?.toLowerCase() || '';
          gotMics[mic] = (gotMics[mic] || 0) + 1;
        }
        
        // Find missing mics
        const missingMics = requiredMics.filter(req => {
          const got = gotMics[req.micCode] || 0;
          return got < req.count;
        });
        
        if (missingMics.length > 0) {
          console.log('[By-Speaker] Missing mics detected:', missingMics.map(m => `${m.name} (need ${m.count}, got ${gotMics[m.micCode] || 0})`));
          
          // Make follow-up call to get missing mics with full knowledge
          const missingMicInstructions = missingMics.map(m => {
            let constraint = '';
            if (m.has1D) constraint = ' [1D = SAME DISTANCE for all shots, vary POSITION]';
            else if (m.has1P) constraint = ' [1P = SAME POSITION for all shots, vary DISTANCE]';
            return `- ${m.name}: ${m.count} shots${constraint}`;
          }).join('\n');
          
          const missingPrompt = `Generate shots for these SPECIFIC mics:
${missingMicInstructions}

Speaker: ${speakerModel}
Genre: ${genre || 'versatile'}

CONSTRAINT RULES (MUST FOLLOW):
- [1D] = Use the SAME distance for all shots of that mic, but VARY the position (e.g., CapEdge at 4", CapEdge_Cone_Tr at 4")
- [1P] = Use the SAME position for all shots of that mic, but VARY the distance (e.g., Cap at 4", Cap at 6")
- If no constraint is listed, you can vary both position and distance

MIC KNOWLEDGE (use this for positioning decisions):
- R121: Ribbon mic, smooth/warm, works 3-8" back, sounds great at CapEdge or CapEdge_Cone_Tr
- M160: Hypercardioid ribbon, tight pattern, works 1-4" close, CapEdge is sweet spot
- MD421K: Dynamic, punchy mids, works 1-4" close, CapEdge or Cap positions
- MD441: Dynamic with switches - Presence (brighter) or Flat (natural), works 2-6", CapEdge ideal
- e906: Dynamic with switches - Bright/Presence/Flat, works 0.5-2" very close, Cap or CapEdge
- SM57: Classic dynamic, works 0.5-2" close, any position works
- M201: Smooth dynamic, works 1-3" close, CapEdge or CapEdge_Cone_Tr
- C414: Condenser, detailed, works 4-8" back, CapEdge or Cap positions
- PR30: Ribbon, bright for a ribbon, works 0.5-2" close, Cap or CapEdge

CRITICAL FORMAT RULES:
- position MUST be one of: Cap, CapEdge, CapEdge_Cone_Tr, Cone
- distance MUST be a number as string: "1", "2.5", "4"
- mic codes: 121 (R121), 160 (M160), md421k (MD421K), md441 (MD441), e906, 57, etc.
- For MD441/e906: include switch setting in micLabel like "MD441 (Presence)" or "e906 (Flat)"

Output JSON:
{
  "additions": [
    { "mic": "121", "micLabel": "R121", "position": "CapEdge", "distance": "4", "rationale": "...", "expectedTone": "...", "bestFor": "..." }
  ]
}`;

          try {
            const fixResponse = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                { role: "system", content: "You are an expert audio engineer. Generate mic shots using the provided knowledge. Use ONLY valid position codes and numeric distances." },
                { role: "user", content: missingPrompt }
              ],
              response_format: { type: "json_object" },
              temperature: 0,
            });
            
            const fixResult = JSON.parse(fixResponse.choices[0].message.content || "{}");
            if (fixResult.additions && Array.isArray(fixResult.additions)) {
              console.log('[By-Speaker] Adding', fixResult.additions.length, 'missing shots');
              result.micRecommendations.push(...fixResult.additions);
            }
          } catch (fixErr) {
            console.error('[By-Speaker] Failed to fix missing mics:', fixErr);
          }
        }
      }
      
      // Helper to deduplicate shots
      // Normalize mic codes to catch duplicates like SM57 vs 57
      const normalizeMicCode = (mic: string): string => {
        let m = (mic || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        // Map common variations to canonical form
        const micMap: Record<string, string> = {
          'sm57': '57', 'shuresm57': '57',
          'sennheisermd421': 'md421', 'sennheisermd421k': 'md421k',  // MD421 and MD421K are DIFFERENT mics
          '441': 'md441', 'sennheisermd441': 'md441', 'md441presence': 'md441', 'md441flat': 'md441',
          'beyerm160': 'm160', 'beyerdynamicm160': 'm160', '160': 'm160',
          'beyerm201': 'm201', 'beyerdynamicm201': 'm201', '201': 'm201',
          'sennheisere906': 'e906', '906': 'e906',
          'heilpr30': 'pr30',
          'royerr121': 'r121', '121': 'r121',
          'royerr10': 'r10',
          'aear92': 'r92',
          'akgc414': 'c414', '414': 'c414',
          'roswellcabmic': 'roswellcab', 'roswell': 'roswellcab',
        };
        return micMap[m] || m;
      };
      
      const deduplicateShots = (shots: any[]) => {
        const seen = new Set<string>();
        return shots.filter((shot: any) => {
          let mic = normalizeMicCode(shot.mic || '');
          let pos = (shot.position || '').toLowerCase()
            .replace(/off-axis.*|on-axis.*/i, '')
            .replace(/center of cone/i, 'cone')
            .replace(/edge of cone/i, 'capedge')
            .replace(/cap edge/i, 'capedge')
            .replace(/[^a-z_]/g, '');
          let dist = (shot.distance || '').toString().replace(/[^0-9.]/g, '');
          
          const key = `${mic}|${pos}|${dist}`;
          if (seen.has(key)) {
            console.log('[By-Speaker] Removing duplicate:', shot.micLabel, shot.position, shot.distance);
            return false;
          }
          seen.add(key);
          return true;
        });
      };
      
      // Deduplicate after main + missing mics
      if (result.micRecommendations) {
        result.micRecommendations = deduplicateShots(result.micRecommendations);
      }
      
      // Enforce per-mic 1D (same distance for all shots of that mic)
      // Build set of mic codes that have 1D enabled from requiredMics
      if (micShotCounts && result.micRecommendations && Array.isArray(result.micRecommendations)) {
        const micsWith1D = new Set<string>();
        const micLines = micShotCounts.split(', ').filter((l: string) => l.trim());
        
        for (const line of micLines) {
          const match = line.match(/^(.+?)\s*x\s*(\d+)/);
          if (match) {
            const micName = match[1].trim();
            const has1D = line.includes('Use ONE distance') || line.includes('different positions, same distance') || line.includes('[1D]');
            if (has1D) {
              // Map display names to mic codes
              let micCode = micName.toLowerCase()
                .replace('sm57', '57')
                .replace('r121', '121')
                .replace('md421k (kompakt)', 'md421k')
                .replace('roswell cab mic', 'roswell-cab')
                .replace(' ', '');
              if (micName.includes('160')) micCode = '160';
              if (micName.includes('906')) micCode = 'e906';
              if (micName.includes('441')) micCode = 'md441';
              if (micName.includes('421') && !micName.includes('441')) micCode = 'md421k';
              if (micName.includes('201')) micCode = 'm201';
              micsWith1D.add(micCode);
            }
          }
        }
        
        if (micsWith1D.size > 0) {
          console.log('[1D Enforcement] Mics with 1D flag:', Array.from(micsWith1D));
          
          // For each 1D mic, lock to the FIRST distance AI chose (AI should default to sweet spot with justification for deviation)
          const micLockedDistance = new Map<string, string>();
          
          for (const shot of result.micRecommendations) {
            const micLower = (shot.mic || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!micsWith1D.has(micLower) || micLockedDistance.has(micLower)) continue;
            micLockedDistance.set(micLower, String(shot.distance).replace(/[^0-9.]/g, ''));
          }
          
          // Second pass: force all shots for each 1D mic to use the first distance AI chose
          result.micRecommendations = result.micRecommendations.map((shot: any) => {
            const micLower = (shot.mic || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (micsWith1D.has(micLower)) {
              const lockedDist = micLockedDistance.get(micLower);
              const currentDist = String(shot.distance).replace(/[^0-9.]/g, '');
              if (lockedDist && currentDist !== lockedDist) {
                console.log(`[1D Enforcement] Fixing ${shot.micLabel || shot.mic}: ${shot.distance}" → ${lockedDist}"`);
                return { ...shot, distance: lockedDist };
              }
            }
            return shot;
          });
          
          // Dedup again after distance fixes
          result.micRecommendations = deduplicateShots(result.micRecommendations);
        }
      }
      
      // Loop to fill extras until we hit target (max 3 attempts to avoid infinite loop)
      let attempts = 0;
      while (targetShotCount && result.micRecommendations && result.micRecommendations.length < targetShotCount && attempts < 3) {
        attempts++;
        const shortfall = targetShotCount - result.micRecommendations.length;
        console.log('[By-Speaker] Attempt', attempts, '- short by', shortfall, 'shots, adding extras');
        
        const extraPrompt = `Generate exactly ${shortfall} UNIQUE mic shots for ${speakerModel} speaker.
Genre: ${genre || 'versatile'}

MIC KNOWLEDGE (use appropriate distances for each mic type):
- R121: Ribbon, smooth/warm, works 3-8" back, CapEdge or CapEdge_Cone_Tr
- M160: Hypercardioid ribbon, works 1-4" close, CapEdge is sweet spot
- MD421K: Dynamic, punchy mids, works 1-4" close, CapEdge or Cap
- MD441: Dynamic with Presence/Flat switch, works 2-6", CapEdge ideal
- e906: Dynamic with Bright/Presence/Flat switch, works 0.5-2" very close
- SM57: Classic dynamic, works 0.5-2" close, any position
- M201: Smooth dynamic, works 1-3" close, CapEdge or CapEdge_Cone_Tr
- C414: Condenser, detailed, works 4-8" back, CapEdge or Cap
- PR30: Ribbon, bright, works 0.5-2" close, Cap or CapEdge
- Roswell: Large diaphragm condenser, works 4-6", Cap position, vary distance

Each shot must have a DIFFERENT mic+position+distance combination.

CRITICAL FORMAT RULES:
- position MUST be one of: Cap, CapEdge, CapEdge_Cone_Tr, Cone
- distance MUST be a number as string: "1", "2.5", "4"
- For MD441/e906: include switch setting in micLabel like "MD441 (Presence)"

Output JSON:
{
  "extras": [
    { "mic": "57", "micLabel": "SM57", "position": "Cap", "distance": "2", "rationale": "...", "expectedTone": "...", "bestFor": "..." }
  ]
}`;

        try {
          const extraResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: "You are an expert audio engineer. Generate unique mic shots using appropriate distances from the knowledge provided." },
              { role: "user", content: extraPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.5 + (attempts * 0.2), // Increase randomness on retries
          });
          
          const extraResult = JSON.parse(extraResponse.choices[0].message.content || "{}");
          if (extraResult.extras && Array.isArray(extraResult.extras)) {
            console.log('[By-Speaker] Adding', extraResult.extras.length, 'extra shots');
            result.micRecommendations.push(...extraResult.extras);
            // Deduplicate after adding
            result.micRecommendations = deduplicateShots(result.micRecommendations);
          }
        } catch (extraErr) {
          console.error('[By-Speaker] Failed to add extra shots:', extraErr);
          break;
        }
      }
      
      console.log('[By-Speaker] Final count:', result.micRecommendations?.length, 'target:', targetShotCount);
      
      // Enforce exact shot count if specified
      if (targetShotCount && result.micRecommendations && Array.isArray(result.micRecommendations)) {
        if (result.micRecommendations.length > targetShotCount) {
          result.micRecommendations = result.micRecommendations.slice(0, targetShotCount);
        }
        
        // If we trimmed to 1 shot but rationale contains plural language, clear it
        if (targetShotCount === 1 && result.selectionRationale) {
          const pluralPatterns = /these shots|curated set|variety of|each shot|versatility|different styles|different genres/i;
          if (pluralPatterns.test(result.selectionRationale)) {
            console.log('[By-Speaker API] Clearing invalid plural rationale for 1-shot request');
            delete result.selectionRationale;
          }
        }
      }
      
      // Normalize mic labels - strip switch settings unless explicitly requested in recipe
      // Parse which mics have explicit switch settings in the recipe
      const requestedSwitchSettings = new Set<string>();
      if (micShotCounts) {
        // Look for patterns like "MD441 (Presence)" or "e906 (Bright)" in recipe
        const switchMatches = Array.from(micShotCounts.matchAll(/(MD441|e906)\s*\(([^)]+)\)/gi));
        for (const match of switchMatches) {
          requestedSwitchSettings.add(`${match[1].toLowerCase()}-${match[2].toLowerCase()}`);
        }
      }
      
      if (result.micRecommendations && Array.isArray(result.micRecommendations)) {
        result.micRecommendations = result.micRecommendations.map((shot: any) => {
          // Normalize mic labels to underscore format: "e906 (Bright)" -> "e906_Bright"
          // Valid switch settings: e906 = Presence/Flat/Dark, MD441 = Presence/Flat
          if (shot.micLabel) {
            // Convert parentheses format to underscore format
            const switchMatch = shot.micLabel.match(/^(MD441|e906)\s*\(([^)]+)\)$/i);
            if (switchMatch) {
              const micName = switchMatch[1];
              let setting = switchMatch[2].trim();
              
              // Normalize setting names
              // e906: Bright -> Presence (they're the same switch position)
              if (micName.toLowerCase() === 'e906' && setting.toLowerCase() === 'bright') {
                setting = 'Presence';
              }
              
              // Capitalize first letter
              setting = setting.charAt(0).toUpperCase() + setting.slice(1).toLowerCase();
              
              shot.micLabel = `${micName}_${setting}`;
            }
            
            // MD421 -> MD421K (user's default is always Kompakt version)
            if (shot.micLabel === 'MD421' || shot.micLabel === 'md421') {
              shot.micLabel = 'MD421K';
              shot.mic = 'md421k';
            }
          }
          
          // Fix mic code for MD421 -> md421k
          if (shot.mic === '421' || shot.mic === 'md421') {
            shot.mic = 'md421k';
            if (!shot.micLabel?.includes('421K')) {
              shot.micLabel = 'MD421K';
            }
          }
          
          // Force Roswell to Cap position only
          if (shot.mic === 'roswell-cab' || shot.mic === 'roswell' || shot.micLabel?.toLowerCase().includes('roswell')) {
            shot.position = 'Cap';
            shot.mic = 'roswell-cab';
            shot.micLabel = 'Roswell Cab Mic';
          }
          
          return shot;
        });
        
        // Apply 1P behavior (same position, vary distance) for ribbons/condensers - ONLY if singlePositionForRibbons is enabled
        if (singlePositionForRibbons) {
          console.log('[1P Enforcement] singlePositionForRibbons is ENABLED');
          
          // Log all mic codes before processing
          console.log('[1P Enforcement] All mic codes before:', result.micRecommendations.map((s: any) => `${s.mic}:${s.position}:${s.distance}`));
          
          // Force 1P for each ribbon/condenser mic - ONLY enforce position, PRESERVE distance
          // Figure-8 ribbons (R121/R10/R92) -> Cap position (smooth, avoids edge harshness)
          // C414 -> CapEdge position (bright but controlled)
          // Roswell -> Cap position only
          // M160 is hypercardioid ribbon - NOT restricted to Cap, can use multiple positions
          const ribbonCondenser1P: Record<string, string> = {
            'roswell-cab': 'Cap',
            'roswell': 'Cap',
            'c414': 'CapEdge',
            '121': 'Cap',
            'r121': 'Cap',
            'r10': 'Cap',
            'r92': 'Cap'
          };
          
          // 1P = same position, vary distance - so ONLY force position, keep AI's distance
          result.micRecommendations = result.micRecommendations.map((shot: any) => {
            const micLower = shot.mic.toLowerCase();
            if (ribbonCondenser1P[micLower]) {
              const forcedPosition = ribbonCondenser1P[micLower];
              if (shot.position !== forcedPosition) {
                console.log(`[1P] Forcing ${shot.mic} position from ${shot.position} to ${forcedPosition} (keeping distance ${shot.distance}")`);
                shot.position = forcedPosition;
              }
              // PRESERVE the AI's distance - don't override it!
              // This respects the sweet spot distances the AI was instructed to use
            }
            return shot;
          });
          
          console.log('[1P Enforcement] All mic codes after:', result.micRecommendations.map((s: any) => `${s.mic}:${s.position}:${s.distance}`));
        } else {
          console.log('[1P Enforcement] singlePositionForRibbons is DISABLED - skipping 1P enforcement');
        }
        
        // Normalize mic codes for consistency (lowercase except special cases)
        const micCodeNormalization: Record<string, string> = {
          'r121': '121',
          'R121': '121',
          'r10': 'r10',
          'R10': 'r10',
          'r92': 'r92',
          'R92': 'r92',
          'C414': 'c414',
          'M160': 'm160'
        };
        result.micRecommendations = result.micRecommendations.map((shot: any) => {
          if (micCodeNormalization[shot.mic]) {
            shot.mic = micCodeNormalization[shot.mic];
          }
          return shot;
        });
        
        // Deduplicate again after position/distance changes
        const beforeDedup = result.micRecommendations.length;
        result.micRecommendations = deduplicateShots(result.micRecommendations);
        const afterDedup = result.micRecommendations.length;
        const lost = beforeDedup - afterDedup;
        
        // If we lost shots to dedup, we need to fill them back
        if (lost > 0 && targetShotCount) {
          console.log(`[1P Post-Fix] Lost ${lost} shots to dedup, need to add back`);
          
          // Get available non-1P mics that can have more shots
          const non1PMics = ['57', 'md421k', 'md441', 'm160', 'm201', 'e906'];
          const positions = basicPositionsOnly 
            ? ['Cap', 'CapEdge', 'CapEdge_Cone_Tr', 'Cone']
            : ['Cap', 'CapEdge', 'CapEdge_Cone_Tr', 'Cone', 'Cone_Edge'];
          
          let added = 0;
          for (const mic of non1PMics) {
            if (added >= lost) break;
            
            // Find existing shots for this mic
            const existingShots = result.micRecommendations.filter((s: any) => s.mic === mic);
            if (existingShots.length === 0) continue;
            
            // Get existing positions for this mic
            const existingPositions = new Set(existingShots.map((s: any) => s.position));
            const existingDistance = existingShots[0]?.distance || '2';
            
            // Find unused positions
            for (const pos of positions) {
              if (added >= lost) break;
              if (!existingPositions.has(pos)) {
                // Use existing shot's label as reference
                const existingLabel = existingShots[0]?.micLabel || mic.toUpperCase();
                
                // Generate proper rationale based on mic/position characteristics
                const micTraits: Record<string, string> = {
                  '57': 'punchy midrange character',
                  'sm57': 'punchy midrange character',
                  'md421k': 'full-bodied articulate mids',
                  'md441': 'detailed presence with EQ flexibility',
                  'm160': 'focused hypercardioid ribbon tone',
                  'm201': 'smooth natural midrange',
                  'e906': 'aggressive attack with switchable voicing',
                  'pr30': 'bright dynamic with extended highs',
                };
                const posTraits: Record<string, string> = {
                  'Cap': 'bright focused attack',
                  'CapEdge': 'balanced tone with clarity',
                  'CapEdge_Cone_Tr': 'warmer with added body',
                  'Cone': 'smooth warmth with reduced harshness',
                };
                const micTrait = micTraits[mic.toLowerCase()] || 'versatile tonal character';
                const posTrait = posTraits[pos] || 'balanced response';
                
                const posEffect = pos === 'Cap' ? '3-5kHz presence emphasis' :
                                 pos === 'CapEdge' ? 'balanced 2-4kHz midrange' :
                                 pos === 'CapEdge_Cone_Tr' ? 'reduced 3kHz, fuller 200-400Hz' :
                                 pos === 'Cone' ? 'rolled-off highs above 6kHz' : 'maximum low-mid content';
                const distNum = parseFloat(existingDistance);
                const bassEffect = distNum <= 2 ? 'full low end from proximity' : 'tight low end';
                result.micRecommendations.push({
                  mic,
                  micLabel: existingLabel,
                  position: pos,
                  distance: existingDistance,
                  rationale: `${pos} position provides ${posEffect}; at ${existingDistance}" delivers ${bassEffect}. The ${existingLabel}'s ${micTrait} complements this placement.`,
                  expectedTone: `${posTrait.charAt(0).toUpperCase() + posTrait.slice(1)}, ${bassEffect}, ${micTrait}`,
                  bestFor: genre || 'General use'
                });
                console.log(`[1P Post-Fix] Added ${mic} at ${pos} ${existingDistance}"`);
                added++;
              }
            }
          }
          
          // Final dedup just in case
          result.micRecommendations = deduplicateShots(result.micRecommendations);
        }
        
        console.log(`[Final] Shot count: ${result.micRecommendations.length} target: ${targetShotCount}`);
      }
      
      // Final validation pass to enforce all rules deterministically
      if (result.micRecommendations && Array.isArray(result.micRecommendations)) {
        const validation = validateAndFixRecommendations(result.micRecommendations, {
          basicPositionsOnly: basicPositionsOnly,
          singleDistancePerMic: singleDistancePerMic,
          singlePositionForRibbons: singlePositionForRibbons,
        });
        result.micRecommendations = validation.shots;
        if (validation.fixes.length > 0) {
          console.log('[By-Speaker API] Validation fixes applied:', validation.fixes.length);
        }
        
        // After validation, backfill if we're short of target
        if (targetShotCount && result.micRecommendations.length < targetShotCount) {
          const shortfall = targetShotCount - result.micRecommendations.length;
          console.log(`[By-Speaker API] Post-validation shortfall: ${shortfall} shots needed`);
          
          // Generate meaningful rationales for backfill shots based on mic and position knowledge
          const generateBackfillRationale = (mic: string, micLabel: string, position: string, distance: string, genre: string) => {
            const micLower = mic.toLowerCase();
            
            // Mic characteristics
            const micTraits: Record<string, { type: string, character: string, strength: string }> = {
              '57': { type: 'dynamic', character: 'punchy midrange', strength: 'cuts through mixes' },
              'sm57': { type: 'dynamic', character: 'punchy midrange', strength: 'cuts through mixes' },
              'md421k': { type: 'dynamic', character: 'full-bodied mids', strength: 'articulate and punchy' },
              'md441': { type: 'dynamic', character: 'detailed and present', strength: 'flexible EQ switches' },
              'm160': { type: 'ribbon', character: 'focused hypercardioid', strength: 'tight pattern rejects room' },
              'm201': { type: 'dynamic', character: 'smooth and balanced', strength: 'natural midrange' },
              'e906': { type: 'dynamic', character: 'aggressive attack', strength: 'switchable voicings' },
              'pr30': { type: 'dynamic', character: 'bright with extended highs', strength: 'wide frequency response for a dynamic' },
              'r121': { type: 'ribbon', character: 'smooth and warm', strength: 'tames harsh highs naturally' },
              'r10': { type: 'ribbon', character: 'vintage ribbon warmth', strength: 'classic smooth tone' },
              'r92': { type: 'ribbon', character: 'full-range ribbon', strength: 'extended lows and highs' },
              'c414': { type: 'condenser', character: 'detailed and airy', strength: 'captures room and shimmer' },
              'roswell': { type: 'condenser', character: 'speaker-optimized', strength: 'designed for cab capture' },
              'roswell-cab': { type: 'condenser', character: 'speaker-optimized', strength: 'designed for cab capture' },
            };
            
            // Position characteristics
            const posTraits: Record<string, { tone: string, use: string }> = {
              'Cap': { tone: 'bright and focused', use: 'maximum presence and clarity' },
              'CapEdge': { tone: 'balanced bright/warm', use: 'most versatile starting point' },
              'CapEdge_Cone_Tr': { tone: 'warmer with body', use: 'fills out thin tones' },
              'Cone': { tone: 'warm and smooth', use: 'reduces harshness, adds depth' },
              'Cone_Edge': { tone: 'darkest and fullest', use: 'maximum warmth and body' },
            };
            
            const micInfo = micTraits[micLower] || { type: 'mic', character: 'balanced', strength: 'versatile' };
            const posInfo = posTraits[position] || { tone: 'balanced', use: 'general purpose' };
            
            // Distance effects on bass (proximity effect)
            const distNum = parseFloat(distance);
            const proximityEffect = distNum <= 1 ? 'maximum proximity bass boost' :
                                   distNum <= 2 ? 'moderate proximity warmth' :
                                   distNum <= 4 ? 'reduced proximity for tighter lows' :
                                   'minimal proximity for leanest low end';
            
            // Build specific rationale mentioning frequencies and interactions
            const posEffect = position === 'Cap' ? '3-5kHz presence emphasis' :
                             position === 'CapEdge' ? 'balanced 2-4kHz midrange' :
                             position === 'CapEdge_Cone_Tr' ? 'reduced 3kHz, fuller 200-400Hz' :
                             position === 'Cone' ? 'rolled-off highs above 6kHz, boosted low-mids' :
                             'darkest response with maximum low-mid content';
            
            const rationale = `${position} position provides ${posEffect}; at ${distance}" the ${micInfo.type}'s ${proximityEffect} shapes the low end. The ${micLabel} ${micInfo.strength}.`;
            
            const expectedTone = `${posInfo.tone.charAt(0).toUpperCase() + posInfo.tone.slice(1)}, ${distNum <= 2 ? 'full low end' : 'tight low end'}, ${micInfo.character}`;
            
            return { rationale, expectedTone };
          };
          
          // Full mic list with default distances (SWEET SPOT FIRST) and available distance options
          // 1P mics (ribbons/condensers) have fixed position but can vary distance
          const micDefaults: Record<string, { label: string, distances: string[], is1P: boolean }> = {
            '57': { label: 'SM57', distances: ['1', '1.5', '2', '0.5'], is1P: false },           // sweet 1"
            'md421k': { label: 'MD421K', distances: ['2', '1.5', '1', '3'], is1P: false },      // sweet 2"
            'md441': { label: 'MD441_Presence', distances: ['4', '3', '5', '2'], is1P: false }, // sweet 4"
            'm160': { label: 'M160', distances: ['1', '2', '0.5', '3'], is1P: false },          // sweet 1"
            'm201': { label: 'M201', distances: ['2', '1.5', '1', '3'], is1P: false },          // sweet 2"
            'e906': { label: 'e906_Presence', distances: ['1', '0.5', '1.5', '2'], is1P: false }, // sweet 1"
            'pr30': { label: 'PR30', distances: ['1', '0.5', '1.5', '2'], is1P: false },        // sweet 1"
            'r121': { label: 'R121', distances: ['6', '5', '4'], is1P: true },                  // sweet 6"
            'r10': { label: 'R10', distances: ['6', '5', '4'], is1P: true },                    // sweet 6"
            'r92': { label: 'R92', distances: ['6', '5', '4', '3'], is1P: true },               // sweet 6"
            'c414': { label: 'C414', distances: ['6', '5', '4'], is1P: true },                  // sweet 6"
            'roswell-cab': { label: 'Roswell Cab Mic', distances: ['6', '5', '4', '8'], is1P: true }, // sweet 6"
          };
          
          const positions = basicPositionsOnly 
            ? ['Cap', 'CapEdge', 'CapEdge_Cone_Tr', 'Cone']
            : ['Cap', 'CapEdge', 'CapEdge_Cone_Tr', 'Cone', 'Cone_Edge'];
          
          // Build set of existing shot keys (MUST match validation's key format)
          // Comprehensive mic normalization - all aliases map to canonical codes
          const micNormMap: Record<string, string> = {
            // SM57
            '57': '57', 'sm57': '57', 'shuresm57': '57', 'shure57': '57',
            // MD421 (full size) - keep separate from MD421K
            'md421': 'md421', '421': 'md421', 'sennheisermd421': 'md421', 'sennheiser421': 'md421',
            // MD421K (Kompakt) - distinct from full size
            'md421k': 'md421k', '421k': 'md421k', 'sennheisermd421k': 'md421k', 'kompakt': 'md421k',
            // MD441
            'md441': 'md441', '441': 'md441', 'sennheisermd441': 'md441', 'sennheiser441': 'md441',
            'md441presence': 'md441', 'md441flat': 'md441', 'md441u': 'md441',
            // M160
            'm160': 'm160', '160': 'm160', 'beyerm160': 'm160', 'beyerdynamicm160': 'm160', 'beyer160': 'm160',
            // M201
            'm201': 'm201', '201': 'm201', 'beyerm201': 'm201', 'beyerdynamicm201': 'm201', 'beyer201': 'm201',
            // e906
            'e906': 'e906', '906': 'e906', 'sennheisere906': 'e906', 'sennheiser906': 'e906',
            'e906presence': 'e906', 'e906flat': 'e906', 'e906bright': 'e906',
            // PR30
            'pr30': 'pr30', 'heilpr30': 'pr30', 'heil30': 'pr30',
            // M88
            'm88': 'm88', '88': 'm88', 'beyerm88': 'm88', 'beyerdynamicm88': 'm88', 'beyer88': 'm88',
            // R121
            'r121': 'r121', '121': 'r121', 'royerr121': 'r121', 'royer121': 'r121',
            // R10
            'r10': 'r10', 'royerr10': 'r10', 'royer10': 'r10',
            // R92
            'r92': 'r92', '92': 'r92', 'aear92': 'r92', 'aea92': 'r92',
            // C414
            'c414': 'c414', '414': 'c414', 'akgc414': 'c414', 'akg414': 'c414',
            // Roswell
            'roswell': 'roswellcab', 'roswellcab': 'roswellcab', 'roswellcabmic': 'roswellcab',
          };
          const makeKey = (mic: string, pos: string, dist: string) => {
            let m = (mic || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            m = micNormMap[m] || m;
            const p = (pos || '').toLowerCase().replace(/[^a-z_]/g, '');
            const d = (dist || '').toString().replace(/[^0-9.]/g, '');
            return `${m}|${p}|${d}`;
          };
          
          const existingKeys = new Set(
            result.micRecommendations.map((s: any) => 
              makeKey(s.mic || '', s.position || '', s.distance || '')
            )
          );
          
          // Normalize mic key with mapping (same as validation)
          const normalizeMic = (mic: string): string => {
            let m = (mic || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const micMap: Record<string, string> = {
              'sm57': '57', 'shuresm57': '57',
              'sennheisermd421': 'md421', 'sennheisermd421k': 'md421k',
              '441': 'md441', 'sennheisermd441': 'md441', 'md441presence': 'md441', 'md441flat': 'md441',
              'beyerm160': 'm160', 'beyerdynamicm160': 'm160', '160': 'm160',
              'beyerm201': 'm201', 'beyerdynamicm201': 'm201', '201': 'm201',
              'sennheisere906': 'e906', '906': 'e906', 'e906presence': 'e906', 'e906flat': 'e906', 'e906bright': 'e906',
              'heilpr30': 'pr30',
              'royerr121': 'r121', '121': 'r121',
              'royerr10': 'r10',
              'aear92': 'r92',
              'akgc414': 'c414', '414': 'c414',
              'roswellcabmic': 'roswellcab', 'roswell': 'roswellcab',
            };
            return micMap[m] || m;
          };
          
          // Get mics already in recommendations (prioritize these)
          const existingMics = new Set(
            result.micRecommendations.map((s: any) => normalizeMic(s.mic || ''))
          );
          
          // Sort mics: existing first, then new
          const allMics = Object.keys(micDefaults);
          const sortedMics = [
            ...allMics.filter(m => existingMics.has(m)),
            ...allMics.filter(m => !existingMics.has(m))
          ];
          
          let added = 0;
          
          // Build map of locked distances per mic (from existing shots)
          const micLockedDistance = new Map<string, string>();
          for (const shot of result.micRecommendations) {
            const micKey = normalizeMic(shot.mic || '');
            if (!micLockedDistance.has(micKey) && shot.distance) {
              micLockedDistance.set(micKey, shot.distance);
            }
          }
          
          // First pass: add unused positions for non-1P mics (at their locked distance only)
          for (const mic of sortedMics) {
            if (added >= shortfall) break;
            const micInfo = micDefaults[mic];
            if (!micInfo || micInfo.is1P) continue; // Skip 1P mics in this pass
            
            const normalizedMic = normalizeMic(mic);
            const existingMicShots = result.micRecommendations.filter((s: any) => 
              normalizeMic(s.mic || '') === normalizedMic
            );
            
            // When singleDistancePerMic is enabled:
            // - Use existing locked distance if this mic already has shots
            // - If no existing shots, assign first default distance and lock it
            let distance: string;
            if (singleDistancePerMic) {
              if (micLockedDistance.has(normalizedMic)) {
                distance = micLockedDistance.get(normalizedMic)!;
              } else {
                distance = micInfo.distances[0];
                micLockedDistance.set(normalizedMic, distance);
              }
            } else {
              distance = existingMicShots[0]?.distance || micInfo.distances[0];
            }
            
            const micLabel = existingMicShots[0]?.micLabel || micInfo.label;
            
            // Figure-8 ribbons and Roswell: only use Cap position
            const isFigure8Ribbon = ['r121', 'r10', 'r92', '121'].includes(normalizedMic);
            const isRoswellMic = normalizedMic.includes('roswell');
            const allowedPositions = (isFigure8Ribbon || isRoswellMic) ? ['Cap'] : positions;
            
            for (const pos of allowedPositions) {
              if (added >= shortfall) break;
              const key = makeKey(mic, pos, distance);
              if (!existingKeys.has(key)) {
                const { rationale, expectedTone } = generateBackfillRationale(mic, micLabel, pos, distance, genre || 'General');
                result.micRecommendations.push({
                  mic, micLabel, position: pos, distance,
                  rationale,
                  expectedTone,
                  bestFor: genre || 'General use'
                });
                existingKeys.add(key);
                console.log(`[Backfill] Added ${mic} at ${pos} ${distance}" (locked distance: ${singleDistancePerMic})`);
                added++;
              }
            }
          }
          
          // Second pass: add different distances for 1P mics (fixed position, vary distance)
          // Only runs if singleDistancePerMic is NOT enabled (otherwise 1P mics are fully constrained)
          if (!singleDistancePerMic) {
            for (const mic of sortedMics) {
              if (added >= shortfall) break;
              const micInfo = micDefaults[mic];
              if (!micInfo || !micInfo.is1P) continue; // Only 1P mics in this pass
              
              const normalizedMic = normalizeMic(mic);
              const existingMicShots = result.micRecommendations.filter((s: any) => 
                normalizeMic(s.mic || '') === normalizedMic
              );
              
              // Get the fixed position for this 1P mic (or default to CapEdge)
              const position = existingMicShots[0]?.position || 'CapEdge';
              const micLabel = existingMicShots[0]?.micLabel || micInfo.label;
              
              // Try each available distance
              for (const dist of micInfo.distances) {
                if (added >= shortfall) break;
                const key = makeKey(mic, position, dist);
                if (!existingKeys.has(key)) {
                  const { rationale, expectedTone } = generateBackfillRationale(mic, micLabel, position, dist, genre || 'General');
                  result.micRecommendations.push({
                    mic, micLabel, position, distance: dist,
                    rationale,
                    expectedTone,
                    bestFor: genre || 'General use'
                  });
                  existingKeys.add(key);
                  console.log(`[Backfill] Added ${mic} at ${position} ${dist}" (1P distance variation)`);
                  added++;
                }
              }
            }
          }
          
          console.log(`[Post-Validation Backfill] Added ${added}/${shortfall} shots`);
          
          // SECOND validation pass after backfill to enforce single distance
          if (singleDistancePerMic) {
            const postBackfillValidation = validateAndFixRecommendations(result.micRecommendations, {
              basicPositionsOnly: false, // Already done
              singleDistancePerMic: true,
              singlePositionForRibbons: false, // Already done
            });
            result.micRecommendations = postBackfillValidation.shots;
            if (postBackfillValidation.fixes.length > 0) {
              console.log('[Post-Backfill Validation] Fixes:', postBackfillValidation.fixes.length);
            }
          }
          
          // Final dedup pass after backfill to catch any edge cases
          const finalSeen = new Set<string>();
          const finalDeduped: any[] = [];
          for (const shot of result.micRecommendations) {
            const key = makeKey(shot.mic || '', shot.position || '', shot.distance || '');
            if (!finalSeen.has(key)) {
              finalSeen.add(key);
              finalDeduped.push(shot);
            } else {
              console.log(`[Final Dedup] Removed duplicate: ${shot.micLabel} ${shot.position} ${shot.distance}"`);
            }
          }
          result.micRecommendations = finalDeduped;
        }
        
        // STRICT per-mic count enforcement - must match user's requested counts exactly
        if (micShotCounts && micShotCounts.trim()) {
          console.log('[Per-Mic Enforcement] Enforcing exact mic counts from user request');
          
          // Parse requested counts
          const requestedCounts = new Map<string, number>();
          console.log('[Per-Mic] Raw micShotCounts:', micShotCounts?.substring(0, 500));
          // Use || as delimiter to avoid splitting on commas inside [STRICT: ...] instructions
          const micLines = micShotCounts.split(' || ').filter((l: string) => l.trim());
          console.log('[Per-Mic] Parsed lines:', micLines.slice(0, 15).map(l => l.substring(0, 50)));
          
          for (const line of micLines) {
            const match = line.match(/^(.+?)\s*x\s*(\d+)/);
            if (match) {
              const micName = match[1].trim();
              const count = parseInt(match[2], 10);
              
              // Normalize mic name to code
              let micCode = micName.toLowerCase()
                .replace(/\s+/g, '')
                .replace('sm57', '57')
                .replace('r121', '121')
                .replace('md421k (kompakt)', 'md421k')
                .replace('md421k(kompakt)', 'md421k')
                .replace('roswell cab mic', 'roswell-cab')
                .replace('roswellcabmic', 'roswell-cab');
              if (micName.toLowerCase().includes('160')) micCode = 'm160';
              if (micName.toLowerCase().includes('906')) micCode = 'e906';
              if (micName.toLowerCase().includes('441')) micCode = 'md441';
              // MD421K (Kompakt) must be checked before MD421 (full size)
              if (micName.toLowerCase().includes('421k') || micName.toLowerCase().includes('kompakt')) micCode = 'md421k';
              else if (micName.toLowerCase().includes('421') && !micName.toLowerCase().includes('441')) micCode = 'md421';
              if (micName.toLowerCase().includes('201')) micCode = 'm201';
              if (micName.toLowerCase().includes('88') && micName.toLowerCase().includes('m')) micCode = 'm88';
              if (micName.toLowerCase().includes('r92') || (micName.toLowerCase().includes('92') && !micName.toLowerCase().includes('r121'))) micCode = 'r92';
              if (micName.toLowerCase().includes('r10') && !micName.toLowerCase().includes('r121')) micCode = 'r10';
              if (micName.toLowerCase().includes('414')) micCode = 'c414';
              if (micName.toLowerCase().includes('pr30')) micCode = 'pr30';
              if (micName.toLowerCase().includes('roswell')) micCode = 'roswellcab';
              
              console.log(`[Per-Mic] Parsed: "${micName}" → micCode="${micCode}" count=${count}`);
              requestedCounts.set(micCode, count);
            }
          }
          
          console.log('[Per-Mic] Final requestedCounts:', Array.from(requestedCounts.entries()));
          
          if (requestedCounts.size > 0) {
            // Get current counts per mic - comprehensive aliases
            const normalizeMicCode = (mic: string): string => {
              let m = (mic || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              const normMap: Record<string, string> = {
                // SM57
                '57': '57', 'sm57': '57', 'shuresm57': '57', 'shure57': '57',
                // MD421 (full size) - keep separate from MD421K
                'md421': 'md421', '421': 'md421', 'sennheisermd421': 'md421', 'sennheiser421': 'md421',
                // MD421K (Kompakt) - distinct from full size
                'md421k': 'md421k', '421k': 'md421k', 'sennheisermd421k': 'md421k', 'kompakt': 'md421k',
                // MD441
                'md441': 'md441', '441': 'md441', 'sennheisermd441': 'md441', 'sennheiser441': 'md441',
                'md441presence': 'md441', 'md441flat': 'md441', 'md441u': 'md441',
                // M160
                'm160': 'm160', '160': 'm160', 'beyerm160': 'm160', 'beyerdynamicm160': 'm160', 'beyer160': 'm160',
                // M201
                'm201': 'm201', '201': 'm201', 'beyerm201': 'm201', 'beyerdynamicm201': 'm201', 'beyer201': 'm201',
                // e906
                'e906': 'e906', '906': 'e906', 'sennheisere906': 'e906', 'sennheiser906': 'e906',
                'e906presence': 'e906', 'e906flat': 'e906', 'e906bright': 'e906',
                // PR30
                'pr30': 'pr30', 'heilpr30': 'pr30', 'heil30': 'pr30',
                // M88
                'm88': 'm88', '88': 'm88', 'beyerm88': 'm88', 'beyerdynamicm88': 'm88', 'beyer88': 'm88',
                // R121
                'r121': 'r121', '121': 'r121', 'royerr121': 'r121', 'royer121': 'r121',
                // R10
                'r10': 'r10', 'royerr10': 'r10', 'royer10': 'r10',
                // R92
                'r92': 'r92', '92': 'r92', 'aear92': 'r92', 'aea92': 'r92',
                // C414
                'c414': 'c414', '414': 'c414', 'akgc414': 'c414', 'akg414': 'c414',
                // Roswell
                'roswell': 'roswellcab', 'roswellcab': 'roswellcab', 'roswellcabmic': 'roswellcab',
              };
              return normMap[m] || m;
            };
            
            const currentCounts = new Map<string, number>();
            for (const shot of result.micRecommendations) {
              const micCode = normalizeMicCode(shot.mic || '');
              currentCounts.set(micCode, (currentCounts.get(micCode) || 0) + 1);
            }
            
            // Check for mismatches
            Array.from(requestedCounts.entries()).forEach(([mic, requested]) => {
              const current = currentCounts.get(mic) || 0;
              if (current !== requested) {
                console.log(`[Per-Mic Enforcement] ${mic}: have ${current}, want ${requested}`);
              }
            });
            
            // Enforce counts: trim excess shots per mic
            const micShotsSeen = new Map<string, number>();
            const trimmedShots: any[] = [];
            
            for (const shot of result.micRecommendations) {
              const micCode = normalizeMicCode(shot.mic || '');
              const currentCount = micShotsSeen.get(micCode) || 0;
              const maxCount = requestedCounts.get(micCode);
              
              // If this mic has a requested count, enforce it
              if (maxCount !== undefined) {
                if (currentCount < maxCount) {
                  trimmedShots.push(shot);
                  micShotsSeen.set(micCode, currentCount + 1);
                } else {
                  console.log(`[Per-Mic Enforcement] Trimmed excess ${shot.micLabel || shot.mic} shot (have ${currentCount + 1}, want ${maxCount})`);
                }
              } else {
                // Mic not in user's list - keep it (it's extra)
                trimmedShots.push(shot);
              }
            }
            
            result.micRecommendations = trimmedShots;
            
            // Now check if we're short on any mic and need to add more
            Array.from(requestedCounts.entries()).forEach(([mic, requested]) => {
              const current = micShotsSeen.get(mic) || 0;
              if (current < requested) {
                const needed = requested - current;
                console.log(`[Per-Mic Enforcement] Need ${needed} more ${mic} shots`);
                
                // Get existing positions for this mic to avoid duplicates
                const existingPositions = new Set(
                  result.micRecommendations
                    .filter((s: any) => normalizeMicCode(s.mic || '') === mic)
                    .map((s: any) => (s.position || '').toLowerCase())
                );
                
                const availablePositions = basicPositionsOnly 
                  ? ['Cap', 'CapEdge', 'CapEdge_Cone_Tr', 'Cone']
                  : ['Cap', 'CapEdge', 'CapEdge_Cone_Tr', 'Cone', 'Cone_Edge'];
                
                // Get mic defaults (include aliases for normalization variations)
                const micDefaults: Record<string, { label: string, distance: string }> = {
                  '57': { label: 'SM57', distance: '1' },
                  'sm57': { label: 'SM57', distance: '1' },
                  'md421': { label: 'MD421', distance: '2' },
                  '421': { label: 'MD421', distance: '2' },
                  'md421k': { label: 'MD421K', distance: '2' },
                  '421k': { label: 'MD421K', distance: '2' },
                  'md441': { label: 'MD441_Presence', distance: '4' },
                  '441': { label: 'MD441_Presence', distance: '4' },
                  'm160': { label: 'M160', distance: '1' },
                  '160': { label: 'M160', distance: '1' },
                  'm201': { label: 'M201', distance: '2' },
                  '201': { label: 'M201', distance: '2' },
                  'e906': { label: 'e906_Presence', distance: '1' },
                  '906': { label: 'e906_Presence', distance: '1' },
                  'pr30': { label: 'PR30', distance: '1' },
                  'r121': { label: 'R121', distance: '6' },
                  '121': { label: 'R121', distance: '6' },
                  'r10': { label: 'R10', distance: '6' },
                  'r92': { label: 'R92', distance: '6' },
                  '92': { label: 'R92', distance: '6' },
                  'c414': { label: 'C414', distance: '6' },
                  '414': { label: 'C414', distance: '6' },
                  'm88': { label: 'M88', distance: '1.5' },
                  'roswell-cab': { label: 'Roswell Cab Mic', distance: '6' },
                  'roswell': { label: 'Roswell Cab Mic', distance: '6' },
                  'roswellcab': { label: 'Roswell Cab Mic', distance: '6' },
                };
                
                const defaults = micDefaults[mic] || { label: mic.toUpperCase(), distance: '2' };
                
                for (let i = 0; i < needed; i++) {
                  // Find an unused position
                  let position = 'Cap';
                  for (const pos of availablePositions) {
                    if (!existingPositions.has(pos.toLowerCase())) {
                      position = pos;
                      break;
                    }
                  }
                  existingPositions.add(position.toLowerCase());
                  
                  const newShot = {
                    mic: mic,
                    micLabel: defaults.label,
                    position: position,
                    distance: defaults.distance,
                    rationale: `Added to meet requested ${defaults.label} count.`,
                    expectedTone: `Characteristic ${defaults.label} tone at ${position}`,
                    bestFor: genre || 'versatile',
                  };
                  
                  result.micRecommendations.push(newShot);
                  console.log(`[Per-Mic Enforcement] Added ${defaults.label} at ${position} ${defaults.distance}"`);
                }
              }
            });
          }
        }
        
        // Trim to exact target after all enforcement
        if (targetShotCount && result.micRecommendations.length > targetShotCount) {
          console.log(`[By-Speaker API] Trimming from ${result.micRecommendations.length} to ${targetShotCount}`);
          result.micRecommendations = result.micRecommendations.slice(0, targetShotCount);
        }
        
        // Fill remaining slots with other mics if we're under target
        if (targetShotCount && result.micRecommendations.length < targetShotCount) {
          const remaining = targetShotCount - result.micRecommendations.length;
          console.log(`[Fill Remaining] Need ${remaining} more shots from other mics`);
          
          // All available mics with their defaults
          // Order prioritizes underused mics (M88, R92, R10) first to increase variety
          const allMics: { code: string, label: string, distance: string, is1P: boolean }[] = [
            // Underused mics first - prioritize for fill slots
            { code: 'm88', label: 'M88', distance: '1.5', is1P: false },
            { code: 'r92', label: 'R92', distance: '6', is1P: true },
            { code: 'r10', label: 'R10', distance: '6', is1P: true },
            { code: 'pr30', label: 'PR30', distance: '1', is1P: false },
            // Common mics
            { code: '57', label: 'SM57', distance: '1', is1P: false },
            { code: 'md421', label: 'MD421', distance: '2', is1P: false },
            { code: 'md421k', label: 'MD421K', distance: '2', is1P: false },
            { code: 'md441', label: 'MD441_Presence', distance: '4', is1P: false },
            { code: 'm160', label: 'M160', distance: '1', is1P: false },
            { code: 'm201', label: 'M201', distance: '2', is1P: false },
            { code: 'e906', label: 'e906_Presence', distance: '1', is1P: false },
            { code: 'r121', label: 'R121', distance: '6', is1P: true },
            { code: 'c414', label: 'C414', distance: '6', is1P: true },
            { code: 'roswellcab', label: 'Roswell Cab Mic', distance: '6', is1P: true },
          ];
          
          // Find mics not already specified by user
          const specifiedMicsList: string[] = [];
          if (micShotCounts) {
            // Use || delimiter to match the new format
            micShotCounts.split(' || ').forEach((l: string) => {
              const match = l.match(/^(.+?)\s*x\s*\d+/);
              if (!match) return;
              const name = match[1].toLowerCase();
              if (name.includes('57')) specifiedMicsList.push('57');
              else if (name.includes('421k') || name.includes('kompakt')) specifiedMicsList.push('md421k');
              else if (name.includes('421')) specifiedMicsList.push('md421');
              else if (name.includes('441')) specifiedMicsList.push('md441');
              else if (name.includes('160')) specifiedMicsList.push('m160');
              else if (name.includes('201')) specifiedMicsList.push('m201');
              else if (name.includes('906')) specifiedMicsList.push('e906');
              else if (name.includes('pr30')) specifiedMicsList.push('pr30');
              else if (name.includes('m88') || name.includes('88')) specifiedMicsList.push('m88');
              else if (name.includes('r121') || name === '121') specifiedMicsList.push('r121');
              else if (name.includes('r10') || name === '10') specifiedMicsList.push('r10');
              else if (name.includes('r92') || name === '92') specifiedMicsList.push('r92');
              else if (name.includes('414')) specifiedMicsList.push('c414');
              else if (name.includes('roswell')) specifiedMicsList.push('roswellcab');
            });
          }
          const specifiedMics = new Set(specifiedMicsList);
          console.log(`[Fill Remaining] User specified mics: ${Array.from(specifiedMics).join(', ') || 'none'}`);
          
          const unspecifiedMics = allMics.filter(m => !specifiedMics.has(m.code));
          console.log(`[Fill Remaining] Unspecified mics available: ${unspecifiedMics.map(m => m.code).join(', ') || 'none'}`);
          
          if (unspecifiedMics.length === 0) {
            // All mics specified but still short - try to add extra positions from non-1P/1D mics
            console.log(`[Fill Remaining] All mics specified - trying extra positions from existing mics`);
            
            const existingKeys = new Set(
              result.micRecommendations.map((s: any) => 
                `${(s.mic || '').toLowerCase()}|${(s.position || '').toLowerCase()}|${s.distance}`
              )
            );
            
            // Try adding Cone_Edge position for non-1P/1D mics already in the list
            const extraPositions = ['Cone_Edge', 'Cone'];
            const nonRibbonMics = allMics.filter(m => !m.is1P);
            let added = 0;
            
            for (const extraPos of extraPositions) {
              if (added >= remaining) break;
              for (const mic of nonRibbonMics) {
                if (added >= remaining) break;
                const key = `${mic.code}|${extraPos.toLowerCase()}|${mic.distance}`;
                if (!existingKeys.has(key)) {
                  result.micRecommendations.push({
                    mic: mic.code,
                    micLabel: mic.label,
                    position: extraPos,
                    distance: mic.distance,
                    rationale: `Added ${extraPos} position to reach target shot count.`,
                    expectedTone: `${mic.label} tone with ${extraPos} coloration`,
                    bestFor: genre || 'versatile',
                  });
                  existingKeys.add(key);
                  added++;
                  console.log(`[Fill Remaining] Added extra position: ${mic.label} at ${extraPos} ${mic.distance}"`);
                }
              }
            }
            
            if (added < remaining) {
              result.noAdditionalMicsWarning = `Requested ${targetShotCount} shots but only ${result.micRecommendations.length} unique positions available. All mics specified and positions exhausted.`;
            }
          } else if (unspecifiedMics.length > 0) {
            const positions = basicPositionsOnly 
              ? ['Cap', 'CapEdge', 'CapEdge_Cone_Tr', 'Cone']
              : ['Cap', 'CapEdge', 'CapEdge_Cone_Tr', 'Cone'];
            
            // Build existing shot keys to avoid duplicates
            const existingKeys = new Set(
              result.micRecommendations.map((s: any) => 
                `${(s.mic || '').toLowerCase()}|${(s.position || '').toLowerCase()}|${s.distance}`
              )
            );
            
            // Smart prioritization: choose mics that complement what user selected
            // Mic categories for complementary selection
            const micCategories: Record<string, string> = {
              '57': 'dynamic-bright', 'md421': 'dynamic-full', 'md421k': 'dynamic-full',
              'md441': 'dynamic-detailed', 'm201': 'dynamic-balanced', 'e906': 'dynamic-bright',
              'pr30': 'dynamic-bright', 'm88': 'dynamic-warm', 'm160': 'ribbon-warm',
              'r121': 'ribbon-warm', 'r10': 'ribbon-warm', 'r92': 'ribbon-warm',
              'c414': 'condenser-detailed', 'roswellcab': 'condenser-warm'
            };
            
            // Count categories user already has
            const userCategories = new Map<string, number>();
            for (const mic of specifiedMicsList) {
              const cat = micCategories[mic] || 'unknown';
              userCategories.set(cat, (userCategories.get(cat) || 0) + 1);
            }
            
            // Prioritize unspecified mics from categories user has LESS of
            const sortedUnspecified = [...unspecifiedMics].sort((a, b) => {
              const catA = micCategories[a.code] || 'unknown';
              const catB = micCategories[b.code] || 'unknown';
              const countA = userCategories.get(catA) || 0;
              const countB = userCategories.get(catB) || 0;
              return countA - countB; // Lower count = higher priority
            });
            
            console.log(`[Fill Remaining] Prioritized unspecified mics: ${sortedUnspecified.map(m => m.code).join(', ')}`);
            
            let added = 0;
            let micIndex = 0;
            let posIndex = 0;
            
            while (added < remaining && micIndex < sortedUnspecified.length) {
              const mic = sortedUnspecified[micIndex];
              const pos = mic.is1P ? 'Cap' : positions[posIndex % positions.length];
              const key = `${mic.code}|${pos.toLowerCase()}|${mic.distance}`;
              
              if (!existingKeys.has(key)) {
                const category = micCategories[mic.code] || 'versatile';
                const complement = userCategories.size > 0 
                  ? `Complements your ${Array.from(userCategories.keys()).join('/')} selection with ${category} character.`
                  : `Adds ${category} character to your collection.`;
                
                result.micRecommendations.push({
                  mic: mic.code,
                  micLabel: mic.label,
                  position: pos,
                  distance: mic.distance,
                  rationale: complement,
                  expectedTone: `Characteristic ${mic.label} tone at ${pos}`,
                  bestFor: genre || 'versatile',
                });
                existingKeys.add(key);
                added++;
                console.log(`[Fill Remaining] Added complementary ${mic.label} at ${pos} ${mic.distance}"`);
              }
              
              posIndex++;
              if (posIndex >= positions.length || mic.is1P) {
                micIndex++;
                posIndex = 0;
              }
            }
            
            console.log(`[Fill Remaining] Added ${added}/${remaining} complementary shots`);
          }
        }
      }
      
      // Final dedup pass to catch any duplicates after all operations
      if (result.micRecommendations && Array.isArray(result.micRecommendations)) {
        const finalNormMap: Record<string, string> = {
          '57': '57', 'sm57': '57', 'md421k': 'md421k', 'md421': 'md421k', '421': 'md421k',
          'md441': 'md441', '441': 'md441', 'm160': 'm160', '160': 'm160',
          'm201': 'm201', '201': 'm201', 'e906': 'e906', '906': 'e906',
          'pr30': 'pr30', 'm88': 'm88', 'r121': 'r121', '121': 'r121',
          'r10': 'r10', 'r92': 'r92', '92': 'r92', 'c414': 'c414', '414': 'c414',
          'roswell': 'roswellcab', 'roswellcab': 'roswellcab', 'roswellcabmic': 'roswellcab',
        };
        const finalMakeKey = (mic: string, pos: string, dist: string) => {
          let m = (mic || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          m = finalNormMap[m] || m;
          const p = (pos || '').toLowerCase().replace(/[^a-z_]/g, '');
          const d = (dist || '').toString().replace(/[^0-9.]/g, '');
          return `${m}|${p}|${d}`;
        };
        
        const finalSeenKeys = new Set<string>();
        const finalDeduped: any[] = [];
        for (const shot of result.micRecommendations) {
          const key = finalMakeKey(shot.mic || '', shot.position || '', shot.distance || '');
          if (!finalSeenKeys.has(key)) {
            finalSeenKeys.add(key);
            finalDeduped.push(shot);
          } else {
            console.log(`[Final Dedup Pass] Removed duplicate: ${shot.micLabel} ${shot.position} ${shot.distance}"`);
          }
        }
        
        if (finalDeduped.length < result.micRecommendations.length) {
          console.log(`[Final Dedup Pass] Removed ${result.micRecommendations.length - finalDeduped.length} duplicates`);
          result.micRecommendations = finalDeduped;
        }
      }
      
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
      const { ampDescription, genre, targetShotCount, basicPositionsOnly } = input;
      
      // Build position restriction instruction (for when By Amp later leads to mic recommendations)
      let positionInstruction = '';
      if (basicPositionsOnly) {
        positionInstruction = `\n\nPOSITION RESTRICTION NOTE: When this speaker is used for IR production, the user wants to limit positions to: Cap, CapEdge, CapEdge_Cone_Tr, Cone only.`;
      }
      
      // Build shot count instruction
      let shotCountInstruction = 'recommend 3-5 speakers that would pair well';
      if (targetShotCount) {
        shotCountInstruction = `recommend EXACTLY ${targetShotCount} speakers - no more, no less`;
        if (targetShotCount > 8) {
          shotCountInstruction += `. NOTE: With ${targetShotCount} speakers requested, you may need to include less common or more specialized options. Prioritize variety in tonal character`;
        }
      }

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
      - ga12-sc64 (Eminence GA-SC64 12"): Vintage American, tight and punchy. Fender Deluxe/Princeton vibe.
      - g10-sc64 (Eminence GA-SC64 10"): 10" version, more focused and punchy. Great for smaller combos.
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
      
      Based on the user's amp description, ${shotCountInstruction}.
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
      
      // Enforce exact shot count if specified
      if (targetShotCount && result.speakerSuggestions && Array.isArray(result.speakerSuggestions)) {
        if (result.speakerSuggestions.length > targetShotCount) {
          result.speakerSuggestions = result.speakerSuggestions.slice(0, targetShotCount);
        }
      }
      
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
      const { positionList, speaker, genre, targetShotCount, basicPositionsOnly, singleDistancePerMic, micShotCounts } = input;
      
      // Build position restriction instruction
      let positionInstruction = '';
      if (basicPositionsOnly) {
        positionInstruction = `\n\nPOSITION RESTRICTION: ONLY use these 4 basic positions: Cap, CapEdge, CapEdge_Cone_Tr, Cone.
DO NOT suggest: Cap_OffCenter, CapEdge_BR (bright variation), CapEdge_DK (dark variation), or any other position variations.
If the user's imported list contains non-basic positions, mark those as "remove" with rationale explaining the basic positions restriction.`;
      }
      
      // Build single distance per mic instruction
      let distanceInstruction = '';
      if (singleDistancePerMic) {
        distanceInstruction = `\n\nSINGLE DISTANCE PER MIC (CRITICAL WORKFLOW REQUIREMENT):
- For each microphone type, ALL shots with that mic MUST use the SAME distance
- This is for workflow efficiency - the user doesn't want to move the mic stand between shots of the same mic
- Choose the SINGLE BEST distance for each mic based on its optimal placement range
- Example: If you have 3 SM57 shots, all 3 must be at the same distance (e.g., all at 1.5in)
- Example: If you have 2 R121 shots, both must be at the same distance (e.g., both at 4in)
- For each mic, pick the distance that captures its best characteristics for this speaker/genre
- Vary POSITION (Cap, CapEdge, CapEdge_Cone_Tr, Cone) to create tonal variety, NOT distance
- This is MANDATORY - do not output different distances for the same mic type`;
      }
      
      // Build mic shot counts instruction
      let micShotInstruction = '';
      if (micShotCounts && micShotCounts.trim()) {
        micShotInstruction = `\n\nMIC SHOT COUNTS (CRITICAL - FOLLOW EXACTLY):
The user has specified EXACTLY how many shots they want per mic:
${micShotCounts}

MANDATORY RULES:
- Generate EXACTLY the number of shots specified for each mic - no more, no less
- If user says "SM57 x 3", output exactly 3 SM57 shots
- If user says "MD421K x 2" or "MD421Kompakt x 2", output exactly 2 MD421K shots (NOT regular MD421)
- MD421 and MD421K (Kompakt) are DIFFERENT mics - respect which one the user specified
- The total shot count is the sum of all mic shot counts
- Do NOT substitute mics - if user didn't list a mic, don't add it
- Do NOT exceed the specified count for any mic
- Mark extra positions from user's list as "remove" if they exceed the mic's shot count
- Add positions as needed to reach the exact count for each mic`;
      }
      
      // Build shot count instruction for refinements
      let shotCountInstruction = '';
      if (targetShotCount) {
        shotCountInstruction = `\n\nTARGET SHOT COUNT: The user wants EXACTLY ${targetShotCount} total shots in the final refined list.
- The FINAL OUTPUT must have exactly ${targetShotCount} refinement entries with type "keep" or "add" (excluding any "remove" entries from this count)
- If user's list has more positions than ${targetShotCount}, mark the least essential as "remove" and keep only the best ${targetShotCount}
- If user's list has fewer positions than ${targetShotCount}, keep all valuable ones and "add" complementary shots to reach exactly ${targetShotCount}
- COUNT CHECK: Number of "keep" entries + Number of "add" entries = ${targetShotCount}`;
        if (targetShotCount > 30) {
          shotCountInstruction += `\n- NOTE: With ${targetShotCount} shots requested, include a wide variety of positions, distances, and mics. Some may overlap in tonal character.`;
        }
      }

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
      - G12M (Greenback), G12H (G12H30 Anniversary), G12-65 (G12-65 Heritage)
      - GA12-SC64, GA10-SC64, K100 (G12K-100), G12T75 (G12T-75)
      
      Mic Shorthand:
      - SM57, R121, R10, MD421, MD421K (or MD421Kompakt), M201, M88, Roswell, M160, e906, C414, R92, PR30
      - IMPORTANT: MD421 and MD421K (Kompakt) are DIFFERENT mics - do NOT substitute one for the other
      - Variants: MD441 and e906 have _Presence or _Flat suffixes
      
      Position Format:
      - Simple: Cap, Cone, CapEdge
      - Complex: Cap_OffCenter, CapEdge_BR, CapEdge_DK, CapEdge_Cone_Tr
      
      Position Definitions:
      - Cap: Dead center of the dust cap
      - Cap_OffCenter: Small lateral offset from Cap, still fully on the dust cap
      - CapEdge: Seam line where the dust cap meets the cone
      - CapEdge_BR: CapEdge favoring the cap side of the seam (brighter)
      - CapEdge_DK: CapEdge favoring the cone side of the seam (darker)
      - CapEdge_Cone_Tr: Smooth cone immediately past the cap edge (transition zone)
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
      - R92: Ribbon, warm, figure-8 (UNDERUSED - consider for warmth variety)
      - M160: Hypercardioid ribbon, focused
      - MD421: Large diaphragm dynamic, punchy
      - MD421 Kompakt: Compact version
      - MD441: Dynamic with presence/flat switch (AI chooses which)
      - R10: Ribbon, smooth
      - M88: Warm, great low-end (UNDERUSED - excellent alternative to MD421 for warmth)
      - PR30: Clear highs, less proximity
      - e906: Supercardioid with presence/flat switch (AI chooses which)
      - M201: Accurate dynamic
      - SM7B: Smooth, thick
      - C414: Condenser, detailed
      - Roswell Cab Mic: Specialized condenser for loud cabs
      
      DIVERSITY TIP: Include M88 and R92 when recipes allow - they offer unique tonal character often overlooked.
      
      Available Positions:
      - Cap: Dead center of the dust cap, brightest
      - Cap_OffCenter: Small lateral offset from Cap, still on dust cap
      - CapEdge: Seam line where dust cap meets cone, balanced
      - CapEdge_BR: CapEdge favoring cap side, brighter
      - CapEdge_DK: CapEdge favoring cone side, darker/warmer
      - CapEdge_Cone_Tr: Smooth cone past cap edge, transition zone
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
         If in doubt, KEEP IT - the user's ears approved it${shotCountInstruction}${distanceInstruction}${micShotInstruction}${speaker ? `
      
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

      let userMessage = `Please analyze my tested IR positions and suggest refinements. Keep most of my positions (they work well!) and add complementary shots to fill gaps.

My tested positions:
${positionList}${speaker ? `\n\nI'm working with the ${speaker} speaker.` : ''}${genre ? `\nOptimizing for ${genre} genre.` : ''}`;
      
      if (positionInstruction) {
        userMessage += positionInstruction;
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

      const rawResult = JSON.parse(response.choices[0].message.content || "{}");
      
      // Normalize the response - AI sometimes returns arrays where we expect strings
      const normalizeToString = (value: unknown): string => {
        if (Array.isArray(value)) return value.join(', ');
        if (value === null || value === undefined) return '';
        return String(value);
      };
      
      let refinements = (rawResult.refinements || []).map((r: Record<string, unknown>) => ({
          type: normalizeToString(r.type),
          original: r.original ? normalizeToString(r.original) : undefined,
          suggestion: normalizeToString(r.suggestion),
          shorthand: normalizeToString(r.shorthand),
          rationale: normalizeToString(r.rationale),
        }));
      
      // Enforce exact shot count if specified (count of keep + add entries)
      if (targetShotCount) {
        const keepAndAdd = refinements.filter((r: { type: string }) => r.type === 'keep' || r.type === 'add');
        if (keepAndAdd.length > targetShotCount) {
          // Trim excess: keep the first N entries that are keep/add
          let kept = 0;
          refinements = refinements.filter((r: { type: string }) => {
            if (r.type === 'keep' || r.type === 'add') {
              if (kept < targetShotCount) {
                kept++;
                return true;
              }
              return false;
            }
            return true; // Keep remove entries as-is
          });
        }
      }
      
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
        refinements,
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
            spectralDeviation: scored.spectralDeviation,
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
SM57, R-121, R10, AEA R92, M160, MD421, MD421 Kompakt, MD441, M88, PR30, e906, M201, SM7B, AKG C414, Roswell Cab Mic
Note: MD441 and e906 have presence/flat switches - specify which setting in your suggestion.

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
