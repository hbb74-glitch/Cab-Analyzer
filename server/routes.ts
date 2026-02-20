
import type { Express } from "express";
import type { Server } from "http";
import { createHash } from "crypto";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { getRecipesForSpeaker, getRecipesForMicAndSpeaker, type IRRecipe } from "@shared/knowledge/ir-recipes";
import { getExpectedCentroidRange, calculateCentroidDeviation, getDeviationScoreAdjustment, getMicRelativeSmoothnessAdjustment, getMicSmoothnessBaseline, getDistancePositionPenalty } from "@shared/knowledge/spectral-centroid";
import { FRACTAL_AMP_MODELS, FRACTAL_DRIVE_MODELS, KNOWN_MODS, formatParameterGlossary, formatKnownModContext, formatModelContext, getModsForModel } from "@shared/knowledge/amp-designer";
import { getControlLayout } from "@shared/knowledge/amp-dial-in";
import { buildKnowledgeBasePromptSection, buildIntentBudgetPromptSection, computeRoleBudgets, lookupMicRole, type IntentAllocation } from "@shared/knowledge/mic-role-map";
import { buildExtrapolatedProfiles, formatExtrapolatedProfilesForPrompt } from "@shared/knowledge/tonal-extrapolation";

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
    avoidPositions: ['CapEdge_DK', 'Cone', 'Cap_Cone_Tr'], // Darker positions
    prefer: ['SM57', 'PR30', 'e906', 'C414', 'Roswell'], // Brighter mics
    preferPositions: ['Cap', 'Cap_OffCenter', 'CapEdge_BR'] // Brighter positions
  },
  dark: {
    synonyms: ['warm', 'smooth', 'thick', 'fat', 'round', 'mellow', 'creamy', 'wooly', 'vintage', 'brown'],
    avoid: ['PR30', 'e906', 'C414'], // Bright mics
    avoidPositions: ['Cap', 'Cap_OffCenter', 'CapEdge_BR'], // Brighter positions
    prefer: ['M160', 'R121', 'R92', 'R10', 'SM7B'], // Warmer mics
    preferPositions: ['CapEdge_DK', 'Cone', 'Cap_Cone_Tr'] // Darker positions
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
    preferPositions: ['CapEdge', 'CapEdge_DK', 'Cap_Cone_Tr'] // Smoother positions
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
    preferPositions: ['CapEdge', 'CapEdge_DK', 'Cap_Cone_Tr'] // Mid-rich positions
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
    preferPositions: ['CapEdge_DK', 'Cone', 'Cap_Cone_Tr'] // Warm, smooth positions
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
    preferPositions: ['CapEdge', 'Cap_Cone_Tr', 'Cone'] // More open positions
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
    preferPositions: ['CapEdge', 'CapEdge_DK', 'Cap_Cone_Tr'] // Fuller positions
  },
  shoegaze: {
    synonyms: ['washy', 'layered', 'reverb', 'my bloody valentine', 'dreamy', 'swirling'],
    avoid: ['MD421', 'PR30'], // Too aggressive/direct
    avoidPositions: ['Cap'], // Too focused
    prefer: ['R121', 'M160', 'C414', 'R92'], // Smooth, detailed mics
    preferPositions: ['CapEdge', 'CapEdge_DK', 'Cap_Cone_Tr'] // Smooth positions
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
const BASIC_POSITIONS = ['cap', 'capedge', 'cap_cone_tr', 'cone'];

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
    // SM57+R121 Blend
    'sm57r121blend': 'sm57r121blend',
    'sm57r121tight': 'sm57r121blend', 'sm57r121balance': 'sm57r121blend',
    'sm57r121thick': 'sm57r121blend', 'sm57r121smooth': 'sm57r121blend',
    'sm57r121ribbondom': 'sm57r121blend', 'sm57r121ribbon_dom': 'sm57r121blend',
    // Fredman
    'fredman': 'fredman',
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
    '421k': 1, 'md421k': 1,            // MD421K: 1-4", sweet 2"
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
    // SM57+R121 Blend - R121 distance, min 4"
    'sm57r121blend': 4,
    // Fredman - dual SM57, min 0.5"
    'fredman': 0.5,
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
        .replace(/capedgeconetr/g, 'cap_cone_tr')
        .replace(/capedge_cone_tr/g, 'cap_cone_tr');
      if (posLower === 'blend') return true;
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
    '421': '2', 'md421': '2',
    '421k': '2', 'md421k': '2',
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
    // SM57+R121 Blend - sweet spot is R121 at 5"
    'sm57r121blend': '5',
    // Fredman - dual SM57 sweet spot 1"
    'fredman': '1',
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
const textFeedbackCache = new Map<string, CacheEntry>();

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
  cleanExpiredEntries(textFeedbackCache);
}, 60 * 60 * 1000);

interface AITextNudges {
  subBass: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  presence: number;
  ratio: number;
  strength: number;
  summary: string;
}

async function parseTextFeedbackWithAI(
  texts: { text: string; action: string; blendBands: { subBass: number; bass: number; lowMid: number; mid: number; highMid: number; presence: number; ratio: number } }[]
): Promise<AITextNudges | null> {
  if (texts.length === 0) return null;

  const cacheKey = texts.map(t => `${t.action}:${t.text}`).sort().join("|");
  const cached = textFeedbackCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as AITextNudges;
  }

  try {
    const feedbackEntries = texts.map(t => {
      const sentiment = t.action === "love" ? "loved" : t.action === "like" ? "liked" : t.action === "meh" ? "was lukewarm about" : "disliked";
      return `- User ${sentiment} a blend (subBass:${t.blendBands.subBass}%, bass:${t.blendBands.bass}%, lowMid:${t.blendBands.lowMid}%, mid:${t.blendBands.mid}%, highMid:${t.blendBands.highMid}%, presence:${t.blendBands.presence}%, ratio:${t.blendBands.ratio}) and wrote: "${t.text}"`;
    }).join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a guitar tone expert analyzing free-text feedback about impulse response blends.

The user rates IR blends (love/like/meh/nope) and sometimes writes text comments. Each blend has a 6-band tonal breakdown:
- subBass, bass, lowMid (lower frequencies)
- mid (body/fundamental)
- highMid (bite/cut)
- presence (top-end sizzle/air)
- ratio = highMid/mid (>1.5 = scooped/bright, <1.2 = mid-heavy/warm)

Your job: interpret ALL the text comments together to derive what tonal adjustments the user wants. Consider:
1. DIRECTION matters: "too bright" means REDUCE presence/highMid. "needs more bite" means INCREASE highMid.
2. CONTEXT of the rating: text on a "nope" likely describes what they DON'T want. Text on a "love" describes what they DO want.
3. RELATIVE to the blend data: if someone says "perfect highs" on a blend with 35% presence, they like ~35% presence.
4. Implicit preferences: "this would sit great in a mix" suggests they value balanced, usable tones.
5. Combined sentiment: look at ALL comments together for a coherent picture.

Return JSON with band nudges (positive = user wants MORE, negative = user wants LESS):
{
  "subBass": number (-3 to 3),
  "bass": number (-3 to 3),
  "lowMid": number (-3 to 3),
  "mid": number (-5 to 5),
  "highMid": number (-5 to 5),
  "presence": number (-5 to 5),
  "ratio": number (-0.3 to 0.3),
  "strength": number (0.5 to 2.0, how confident you are in these nudges),
  "summary": string (1-2 sentence summary of what the user's text tells us about their preference)
}

Use 0 for bands the text doesn't address. Only use large values when the text is very explicit.`
        },
        { role: "user", content: `Here are all the user's text feedback comments:\n\n${feedbackEntries}\n\nInterpret these comments and return the tonal adjustment nudges as JSON.` }
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    const result: AITextNudges = {
      subBass: Math.max(-3, Math.min(3, parsed.subBass ?? 0)),
      bass: Math.max(-3, Math.min(3, parsed.bass ?? 0)),
      lowMid: Math.max(-3, Math.min(3, parsed.lowMid ?? 0)),
      mid: Math.max(-5, Math.min(5, parsed.mid ?? 0)),
      highMid: Math.max(-5, Math.min(5, parsed.highMid ?? 0)),
      presence: Math.max(-5, Math.min(5, parsed.presence ?? 0)),
      ratio: Math.max(-0.3, Math.min(0.3, parsed.ratio ?? 0)),
      strength: Math.max(0.5, Math.min(2.0, parsed.strength ?? 1)),
      summary: parsed.summary ?? "",
    };

    textFeedbackCache.set(cacheKey, { data: result, timestamp: Date.now() });
    console.log(`[AI Text Feedback] Parsed ${texts.length} comments: ${result.summary}`);
    return result;
  } catch (err) {
    console.error("[AI Text Feedback] Failed to parse:", err);
    return null;
  }
}


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
// Returns parsing confidence to determine how heavily to weight deviation penalties
function parseFilenameForExpectations(filename: string): { 
  mic: string; 
  position: string; 
  speaker: string; 
  variant?: string; 
  isCombo?: boolean;
  offAxis?: boolean;
  confidence: 'high' | 'medium' | 'low';  // high = all detected, medium = some defaults, low = all defaults
  micDetected: boolean;
  positionDetected: boolean;
  speakerDetected: boolean;
} {
  const lower = filename.toLowerCase();
  
  // Parse mic - order matters! More specific patterns first
  // IMPORTANT: Avoid patterns that could match distances (e.g., _30_ could be 30mm distance)
  let mic = 'sm57'; // default
  let micDetected = false;
  let variant: string | undefined;
  let isCombo = false;
  
  // Check for combo IRs first (SM57+R121 blends with or without "combo" label)
  // Formats: Speaker_SM57_R121_BlendLabel_ShotVariant_R121Height
  // e.g., V30_SM57_R121_Balanced_A_6in.wav, Cab_SM57_R121_Thick_B.wav
  const hasSM57 = lower.includes('sm57') || lower.includes('_57_') || lower.includes('-57-');
  const hasR121 = lower.includes('r121') || lower.includes('_121_') || lower.includes('-121-');
  
  if (hasSM57 && hasR121) {
    isCombo = true;
    micDetected = true;  // Combo mics are always detected
    mic = 'sm57_r121_blend';
    // All combo IRs must be labeled - no default fallback
    // Extract shot variant (A, B, C, etc.) - single letter after blend label
    const variantMatch = filename.match(/(?:tight|balance|balanced|thick|smooth|ribbon_dom|ribbondom|combo)[_-]?([a-zA-Z])(?:[_.]|$)/i);
    if (variantMatch) {
      variant = variantMatch[1].toUpperCase();
    }
  }
  else if (lower.includes('e906') && (lower.includes('presence') || lower.includes('boost'))) { mic = 'e906_presence'; micDetected = true; }
  else if (lower.includes('e906')) { mic = 'e906'; micDetected = true; }
  else if (lower.includes('md441') && (lower.includes('presence') || lower.includes('boost'))) { mic = 'md441_presence'; micDetected = true; }
  else if (lower.includes('md441') || lower.includes('_441_') || lower.includes('-441-') || lower.includes('_441-')) { mic = 'md441'; micDetected = true; }
  else if (lower.includes('md421k') || lower.includes('421k') || (lower.includes('md421') && lower.includes('kompakt'))) { mic = 'md421k'; micDetected = true; }
  else if (lower.includes('md421') || lower.includes('_421_') || lower.includes('-421-') || lower.includes('_421-')) { mic = 'md421'; micDetected = true; }
  else if (lower.includes('sm57') || lower.includes('_57_') || lower.includes('-57-') || lower.includes('_57-')) { mic = 'sm57'; micDetected = true; }
  else if (lower.includes('sm7b') || lower.includes('sm7_') || lower.includes('sm7-')) { mic = 'sm7b'; micDetected = true; }
  else if (lower.includes('r121') || lower.includes('_121_') || lower.includes('-121-') || lower.includes('_121-')) { mic = 'r121'; micDetected = true; }
  else if (lower.includes('r92') || lower.includes('_92_') || lower.includes('-92-')) { mic = 'r92'; micDetected = true; }
  else if (lower.includes('r10') || lower.includes('_r10_') || lower.includes('-r10-')) { mic = 'r10'; micDetected = true; }
  else if (lower.includes('m160') || lower.includes('_160_') || lower.includes('-160-') || lower.includes('_160-')) { mic = 'm160'; micDetected = true; }
  else if (lower.includes('m88') || lower.includes('_88_') || lower.includes('-88-') || lower.includes('_88-')) { mic = 'm88'; micDetected = true; }
  else if (lower.includes('m201') || lower.includes('_201_') || lower.includes('-201-') || lower.includes('_201-')) { mic = 'm201'; micDetected = true; }
  else if (lower.includes('pr30') || lower.includes('_pr30_') || lower.includes('-pr30-')) { mic = 'pr30'; micDetected = true; } // Removed _30_ - conflicts with distance
  else if (lower.includes('c414') || lower.includes('_414_') || lower.includes('-414-') || lower.includes('_414-')) { mic = 'c414'; micDetected = true; }
  else if (lower.includes('roswell')) { mic = 'roswell'; micDetected = true; }
  
  // Parse position - new naming convention
  // For combo IRs, position is 'blend' since it's a mix of SM57 and R121 positions
  let position = isCombo ? 'blend' : 'capedge'; // default
  let positionDetected = isCombo; // Combo IRs have implicit 'blend' position
  if (!isCombo) {
    // New names first
    if (lower.includes('capedge_br') || lower.includes('capedgebr')) { position = 'capedge_br'; positionDetected = true; }
    else if (lower.includes('capedge_dk') || lower.includes('capedgedk')) { position = 'capedge_dk'; positionDetected = true; }
    else if (lower.includes('cap_cone_tr') || lower.includes('capedgeconetr') || lower.includes('capedge_cone_tr') || lower.includes('cone_tr')) { position = 'cap_cone_tr'; positionDetected = true; }
    // Legacy mappings
    else if (lower.includes('capedge_favorcap') || lower.includes('cap_edge_favor_cap') || lower.includes('capedgefavorcap') || lower.includes('favorcap')) { position = 'capedge_br'; positionDetected = true; }
    else if (lower.includes('capedge_favorcone') || lower.includes('cap_edge_favor_cone') || lower.includes('capedgefavorcone') || lower.includes('favorcone')) { position = 'capedge_dk'; positionDetected = true; }
    // Standard positions
    else if (lower.includes('capedge') || lower.includes('cap_edge') || lower.includes('cap-edge')) { position = 'capedge'; positionDetected = true; }
    else if (lower.includes('offcenter') || lower.includes('off_center') || lower.includes('off-center')) { position = 'cap_offcenter'; positionDetected = true; }
    else if (lower.includes('_cap_') || lower.match(/cap[_\-]?\d/) || lower.startsWith('cap_')) { position = 'cap'; positionDetected = true; }
    else if (lower.includes('_cone_') || lower.includes('cone_') || lower.includes('_cone')) { position = 'cone'; positionDetected = true; }
  }
  
  // Parse off-axis flag (OffAx in filename means mic is angled, not perpendicular to speaker)
  // Format: Speaker_Mic_Position_OffAx_Distance
  const offAxis = lower.includes('offax') || lower.includes('off_ax') || lower.includes('off-ax');
  
  // Parse speaker
  let speaker = 'v30'; // default
  let speakerDetected = false;
  if (lower.includes('v30bc') || lower.includes('v30_bc') || lower.includes('blackcat')) { speaker = 'v30bc'; speakerDetected = true; }
  else if (lower.includes('v30')) { speaker = 'v30'; speakerDetected = true; }
  else if (lower.includes('greenback') || lower.includes('g12m25') || lower.includes('g12m_')) { speaker = 'greenback'; speakerDetected = true; }
  else if (lower.includes('g12t75') || lower.includes('g12t-75')) { speaker = 'g12t75'; speakerDetected = true; }
  else if (lower.includes('g12-65') || lower.includes('g1265') || lower.includes('heritage')) { speaker = 'g12-65'; speakerDetected = true; }
  else if (lower.includes('g12h') && lower.includes('g12h')) { speaker = 'g12h'; speakerDetected = true; }
  else if (lower.includes('g12h') && lower.includes('anni')) { speaker = 'g12hanni'; speakerDetected = true; }
  else if (lower.includes('cream')) { speaker = 'cream'; speakerDetected = true; }
  else if (lower.includes('ga10') || lower.includes('g10-sc64') || lower.includes('g10sc64') || (lower.includes('g10') && !lower.includes('g12'))) { speaker = 'ga10-sc64'; speakerDetected = true; }
  else if (lower.includes('ga12') || (lower.includes('sc64') && !lower.includes('g10'))) { speaker = 'ga12-sc64'; speakerDetected = true; }
  else if (lower.includes('k100')) { speaker = 'k100'; speakerDetected = true; }
  else if (lower.includes('karnivore') || lower.includes('karni')) { speaker = 'karnivore'; speakerDetected = true; }
  
  // Calculate parsing confidence
  const detectedCount = [micDetected, positionDetected, speakerDetected].filter(Boolean).length;
  let confidence: 'high' | 'medium' | 'low';
  if (detectedCount === 3) {
    confidence = 'high';
  } else if (detectedCount >= 1) {
    confidence = 'medium';
  } else {
    confidence = 'low';  // All defaults - filename couldn't be parsed
  }
  
  return { mic, position, speaker, variant, isCombo, offAxis: offAxis || undefined, confidence, micDetected, positionDetected, speakerDetected };
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
  // 6-band detailed breakdown for tonal analysis
  subBassEnergy?: number;    // 20-120Hz (sub-bass, rumble)
  bassEnergy?: number;       // 120-250Hz (bass, proximity effect zone)
  lowMidEnergy?: number;     // 250-500Hz (warmth, body, mud zone)
  midEnergy6?: number;       // 500-2000Hz (presence, punch, clarity)
  highMidEnergy?: number;    // 2000-4000Hz (bite, articulation, harsh zone)
  presenceEnergy?: number;   // 4000-8000Hz (fizz, sizzle, air)
  ultraHighEnergy?: number;  // 8000-20000Hz (sparkle, ultra-high fizz)
  hasClipping?: boolean;
  clippedSamples?: number;
  crestFactorDb?: number;
  frequencySmoothness?: number;
  noiseFloorDb?: number;
  spectralTilt?: number;
  rolloffFreq?: number;
  smoothScore?: number;
  maxNotchDepth?: number;
  notchCount?: number;
  logBandEnergies?: number[];
  tailLevelDb?: number | null;
  tailStatus?: string;
}, userVocabularyContext?: string): Promise<{
  score: number;
  isPerfect: boolean;
  advice: string;
  highlights: string[];
  issues: string[];
  parsedInfo: { mic: string | null; position: string | null; speaker: string | null; distance: string | null; confidence: 'high' | 'medium' | 'low'; micDetected: boolean; positionDetected: boolean; speakerDetected: boolean; offAxis?: boolean };
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
  frequencySmoothness: number;
  noiseFloorDb: number;
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
  // Off-axis placement shifts centroid lower (darker/warmer tone, reduced presence peak)
  if (parsed.offAxis) {
    const offAxisShift = 200; // ~200Hz darker typical for angled mic placement
    expectedRange.min = Math.max(500, expectedRange.min - offAxisShift);
    expectedRange.max = Math.max(800, expectedRange.max - offAxisShift);
  }
  const deviation = calculateCentroidDeviation(ir.spectralCentroid, expectedRange);
  const rawScoreAdjustment = getDeviationScoreAdjustment(deviation.deviationPercent);
  
  // CRITICAL: Reduce deviation penalty based on parsing confidence
  // When we can't identify mic/position/speaker, we're scoring against arbitrary defaults
  // Professional IRs with non-standard naming shouldn't be penalized
  let scoreAdjustment = rawScoreAdjustment;
  let confidenceNote = '';
  if (parsed.confidence === 'low') {
    // All defaults - don't penalize for deviation at all
    scoreAdjustment = 0;
    confidenceNote = ' (CONFIDENCE: LOW - ignoring deviation, filename not parseable)';
  } else if (parsed.confidence === 'medium') {
    // Partial detection - reduce penalty by 50%
    scoreAdjustment = Math.round(rawScoreAdjustment * 0.5);
    confidenceNote = ` (CONFIDENCE: MEDIUM - penalty halved, partial detection: mic=${parsed.micDetected}, pos=${parsed.positionDetected}, spk=${parsed.speakerDetected})`;
  }
  
  // Calculate tonal shape metrics for analysis
  const totalEnergy = ir.lowEnergy + ir.midEnergy + ir.highEnergy || 1;
  const lowPct = (ir.lowEnergy / totalEnergy * 100).toFixed(1);
  const midPct = (ir.midEnergy / totalEnergy * 100).toFixed(1);
  const highPct = (ir.highEnergy / totalEnergy * 100).toFixed(1);
  const lowMidRatio = ir.midEnergy > 0 ? (ir.lowEnergy / ir.midEnergy).toFixed(2) : 'N/A';
  const highMidRatio = ir.midEnergy > 0 ? (ir.highEnergy / ir.midEnergy).toFixed(2) : 'N/A';
  
  // 6-band detailed breakdown (if available)
  const has6Band = ir.subBassEnergy !== undefined;
  const sixBandTotal = has6Band ? 
    (ir.subBassEnergy! + ir.bassEnergy! + ir.lowMidEnergy! + ir.midEnergy6! + ir.highMidEnergy! + ir.presenceEnergy! + ir.ultraHighEnergy!) || 1 : 1;
  
  console.log(`[Spectral Analysis] ${ir.filename}:`);
  console.log(`  Parsed: mic=${parsed.mic}, pos=${parsed.position}, spk=${parsed.speaker}, confidence=${parsed.confidence}`);
  console.log(`  Centroid: ${ir.spectralCentroid.toFixed(0)}Hz (expected ${expectedRange.min}-${expectedRange.max}Hz) | Smooth: ${ir.frequencySmoothness?.toFixed(1) || 'N/A'} | Noise: ${ir.noiseFloorDb?.toFixed(1) || 'N/A'}dB`);
  console.log(`  Energy 3-band: Low=${lowPct}% Mid=${midPct}% High=${highPct}% | Low/Mid=${lowMidRatio} High/Mid=${highMidRatio}`);
  
  if (has6Band) {
    const subBass = ((ir.subBassEnergy! / sixBandTotal) * 100).toFixed(1);
    const bass = ((ir.bassEnergy! / sixBandTotal) * 100).toFixed(1);
    const lowMid = ((ir.lowMidEnergy! / sixBandTotal) * 100).toFixed(1);
    const mid6 = ((ir.midEnergy6! / sixBandTotal) * 100).toFixed(1);
    const highMid = ((ir.highMidEnergy! / sixBandTotal) * 100).toFixed(1);
    const presence = ((ir.presenceEnergy! / sixBandTotal) * 100).toFixed(1);
    const ultraHigh = ((ir.ultraHighEnergy! / sixBandTotal) * 100).toFixed(1);
    console.log(`  Energy 6-band: SubBass=${subBass}% Bass=${bass}% LowMid=${lowMid}% Mid=${mid6}% HiMid=${highMid}% Pres=${presence}% Ultra=${ultraHigh}%`);
  }
  
  console.log(`  Deviation: ${deviation.deviation.toFixed(0)}Hz (${deviation.deviationPercent.toFixed(1)}%), Direction: ${deviation.direction}`);
  console.log(`  Raw score adj: ${rawScoreAdjustment}, Final score adj: ${scoreAdjustment}${confidenceNote}`);
  
  // Build confidence-aware prompt
  const confidenceInfo = parsed.confidence === 'low' 
    ? `FILENAME PARSING CONFIDENCE: LOW
The filename could not be parsed to detect mic, position, or speaker.
Using defaults (SM57/CapEdge/V30) which may not match the actual IR.
DO NOT penalize for spectral deviation - score based on other technical metrics only.`
    : parsed.confidence === 'medium'
    ? `FILENAME PARSING CONFIDENCE: MEDIUM
Partial detection: mic=${parsed.micDetected ? parsed.mic : 'default'}, position=${parsed.positionDetected ? parsed.position : 'default'}, speaker=${parsed.speakerDetected ? parsed.speaker : 'default'}
Deviation penalty is reduced by 50% due to incomplete parsing.`
    : `FILENAME PARSING CONFIDENCE: HIGH
All parameters detected: mic=${parsed.mic}, position=${parsed.position}, speaker=${parsed.speaker}${parsed.offAxis ? '\nMIC ORIENTATION: OFF-AXIS (angled toward cap edge, not perpendicular to speaker). Expect darker/warmer tone, reduced presence peak, lower spectral centroid compared to on-axis placement.' : ''}
Apply full spectral deviation scoring.`;

  const systemPrompt = `You are an expert audio engineer specializing in guitar cabinet impulse responses (IRs).
Analyze the provided technical metrics to determine the TECHNICAL QUALITY of this single IR.
Your analysis should be purely objective, focusing on audio quality metrics - NOT genre or stylistic preferences.

${confidenceInfo}

SPECTRAL CENTROID EXPECTATIONS (use these deterministic ranges for scoring):
For this IR, based on the detected mic/position/speaker combination:
- Expected centroid range: ${expectedRange.min}Hz - ${expectedRange.max}Hz
- Actual centroid: ${ir.spectralCentroid.toFixed(0)}Hz
- Deviation: ${deviation.isWithinRange ? 'WITHIN expected range' : `${deviation.deviation.toFixed(0)}Hz ${deviation.direction === 'bright' ? 'ABOVE' : 'BELOW'} expected range`}

SCORING RULES (adjusted for parsing confidence):
${parsed.confidence === 'low' ? '- IGNORE spectral deviation entirely - cannot reliably judge without knowing mic/position/speaker' : 
  parsed.confidence === 'medium' ? '- Apply HALF the normal deviation penalty due to incomplete parsing' :
  `- If centroid is within expected range: No penalty for spectral balance
- If centroid deviates by <25% of range width: Minor (-1 point)
- If centroid deviates by 25-50%: Small (-2 points)
- If centroid deviates by 50-100%: Moderate (-3-4 points)
- If centroid deviates by >100%: Significant (-5-6 points)`}

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
${userVocabularyContext ? `\n${userVocabularyContext}\n\nIMPORTANT: When writing your advice and highlights, use the user's own vocabulary and descriptive style from their comments above. Match their way of talking about tone rather than using generic audio engineering terms.` : ''}

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

  // Calculate quality adjustments for smoothness and noise floor
  const smoothness = ir.smoothScore ?? ir.frequencySmoothness ?? 70;
  const noiseFloor = ir.noiseFloorDb ?? -50;
  
  // Smoothness adjustment: Use mic-relative baselines
  // Different mics have different natural response characteristics
  const micForSmoothness = parsed.mic || 'unknown';
  const smoothnessResult = getMicRelativeSmoothnessAdjustment(micForSmoothness, smoothness);
  const smoothnessAdjustment = smoothnessResult.adjustment;
  const micBaseline = getMicSmoothnessBaseline(micForSmoothness);
  const smoothnessNote = `${smoothnessResult.note} (expected range: ${micBaseline.min}-${micBaseline.max})`;
  
  // Noise floor adjustment: length-aware thresholds
  // For close-miked guitar cab IRs, the speaker's useful energy lives in roughly
  // the first ~40ms. After that it's room reflections and ambient noise.
  // Short IRs (< 200ms) are trimmed for amp modelers — noise is irrelevant because
  // the convolution window is so tiny that any low-level noise can't meaningfully
  // bleed through. Only flag noise on short IRs if it's extreme (audible artifacts).
  // Long IRs (200ms+) can sustain noise through longer convolution tails, so
  // noise floor matters more there.
  const isTruncated = (ir.duration ?? 0) < 200;
  let noiseAdjustment = 0;
  let noiseNote = '';
  if (isTruncated) {
    // Short IR: speaker energy is in first ~40ms, rest is room/ambient.
    // Still report the measurement but use much softer thresholds —
    // noise only matters at this length if it's extreme.
    if (noiseFloor <= -40) {
      noiseAdjustment = 1;
      noiseNote = 'Very clean recording (short IR)';
    } else if (noiseFloor <= -25) {
      noiseAdjustment = 0;
      noiseNote = 'Normal tail decay for short IR — not a noise concern';
    } else if (noiseFloor <= -10) {
      noiseAdjustment = 0;
      noiseNote = 'Elevated tail level — expected for short IR, not audible in use';
    } else {
      noiseAdjustment = -1;
      noiseNote = 'Unusually high noise — possible recording issue';
    }
  } else {
    if (noiseFloor <= -60) {
      noiseAdjustment = 1;
      noiseNote = 'Exceptionally clean/quiet IR';
    } else if (noiseFloor <= -45) {
      noiseAdjustment = 0;
      noiseNote = 'Good noise floor';
    } else if (noiseFloor <= -35) {
      noiseAdjustment = -1;
      noiseNote = 'Slightly elevated noise floor';
    } else {
      noiseAdjustment = -2;
      noiseNote = 'High noise floor detected';
    }
  }

  const tiltStr = ir.spectralTilt !== undefined ? ir.spectralTilt.toFixed(2) : 'N/A';
  const rolloffStr = ir.rolloffFreq !== undefined ? `${ir.rolloffFreq.toFixed(0)}Hz` : 'N/A';
  const perceptualSmooth = ir.smoothScore !== undefined ? `${ir.smoothScore.toFixed(0)}/100` : 'N/A';
  const notchInfo = ir.maxNotchDepth !== undefined ? `max notch ${ir.maxNotchDepth.toFixed(1)}dB, ${ir.notchCount ?? 0} notches >6dB` : 'N/A';
  const tailInfo = ir.tailLevelDb !== null && ir.tailLevelDb !== undefined
    ? `${ir.tailLevelDb.toFixed(1)} dBFS rel peak`
    : (ir.tailStatus || 'N/A (short IR)');

  const userMessage = `Analyze this IR for technical quality:

Filename: "${ir.filename}"
- Duration: ${ir.duration.toFixed(1)}ms
- Peak Level: ${ir.peakLevel.toFixed(1)}dB
- Spectral Centroid: ${ir.spectralCentroid.toFixed(0)}Hz
- Spectral Tilt (log-log slope 200-8kHz): ${tiltStr} (negative = darker, positive = brighter)
- Rolloff Frequency (85% energy): ${rolloffStr}
- Low Energy: ${(ir.lowEnergy * 100).toFixed(1)}%
- Mid Energy: ${(ir.midEnergy * 100).toFixed(1)}%
- High Energy: ${(ir.highEnergy * 100).toFixed(1)}%
- Clipping Detected: ${ir.hasClipping ? `YES (${ir.clippedSamples} clipped samples, crest factor: ${ir.crestFactorDb?.toFixed(1)}dB)` : 'No'}
- Frequency Smoothness (legacy): ${smoothness.toFixed(0)}/100 (${smoothnessNote})
- Perceptual Smoothness (24 log-band): ${perceptualSmooth}
- Notch Analysis: ${notchInfo}
- Tail Level: ${tailInfo}${isTruncated ? `\n- IR Format: Short/truncated (${ir.duration.toFixed(0)}ms) — speaker energy is in the first ~40ms, rest is room/ambient. Do NOT penalize short IRs for missing tail data.` : ''}

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
  
  // Apply deterministic adjustments to AI score
  const baseScore = result.score || 0;
  const totalAdjustment = scoreAdjustment + smoothnessAdjustment + noiseAdjustment;
  const adjustedScore = Math.max(0, Math.min(100, baseScore + totalAdjustment));
  
  // Update highlights/issues based on adjustments
  const highlights = [...(result.highlights || [])];
  const issues = [...(result.issues || [])];
  
  if (smoothnessAdjustment > 0) highlights.push(smoothnessNote);
  else if (smoothnessAdjustment < 0) issues.push(smoothnessNote);
  
  if (noiseAdjustment > 0) highlights.push(noiseNote);
  else if (noiseAdjustment < 0) issues.push(noiseNote);
  
  const formatted = {
    score: adjustedScore,
    isPerfect: adjustedScore >= 90 && issues.length === 0,
    advice: result.advice || "Could not generate advice.",
    highlights,
    issues,
    parsedInfo: {
      mic: parsed.mic,       // Use deterministic parsing
      position: parsed.position, // Use deterministic parsing
      speaker: parsed.speaker,   // Use deterministic parsing
      distance: parsedDistance,  // Parse from filename or use AI's
      offAxis: parsed.offAxis,  // Off-axis mic placement detected
      confidence: parsed.confidence,
      micDetected: parsed.micDetected,
      positionDetected: parsed.positionDetected,
      speakerDetected: parsed.speakerDetected,
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
    frequencySmoothness: smoothness,
    noiseFloorDb: noiseFloor,
  };
  
  // Cache the result
  singleAnalysisCache.set(cacheKey, { data: formatted, timestamp: Date.now() });
  console.log(`[Batch/Single IR] Cached result for ${ir.filename}`);
  
  return formatted;
}

import type { PreferenceSignal } from "@shared/schema";

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
  "capedgeconetr": "Cap-Cone Transition", "cap_cone_tr": "Cap-Cone Transition", "cone_tr": "Cap-Cone Transition", "capconetr": "Cap-Cone Transition",
  "capoffcenter": "Cap Off-Center", "cap_offcenter": "Cap Off-Center", "offcenter": "Cap Off-Center",
  "capedge": "CapEdge", "cap_edge": "CapEdge", "edge": "CapEdge",
  "cap": "Cap", "center": "Cap",
  "cone": "Cone",
};

function parseGearFromFilename(filename: string): { mic?: string; mic2?: string; speaker?: string; position?: string } {
  const name = filename.toLowerCase().replace('.wav', '');
  const parts = name.split(/[_\-\s]+/);
  const result: { mic?: string; mic2?: string; speaker?: string; position?: string } = {};

  const speakerKeys = Object.keys(GEAR_SPEAKER_PATTERNS).sort((a, b) => b.length - a.length);
  const micKeys = Object.keys(GEAR_MIC_PATTERNS).sort((a, b) => b.length - a.length);
  const posKeys = Object.keys(GEAR_POSITION_PATTERNS).sort((a, b) => b.length - a.length);

  for (const part of parts) {
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

interface GearScore { loved: number; liked: number; noped: number; net: number }
interface TonalProfile {
  subBass: number; bass: number; lowMid: number; mid: number; highMid: number; presence: number; ratio: number;
  sampleSize: number;
}
interface TonalDescriptor {
  label: string;
  direction: "high" | "low";
  band: string;
  delta: number;
}
interface GearTonalEntry {
  name: string;
  score: GearScore;
  tonal: TonalProfile | null;
  descriptors: TonalDescriptor[];
}
interface GearComboEntry {
  combo: string;
  tonal: TonalProfile;
  descriptors: TonalDescriptor[];
  sampleSize: number;
  sentiment: number;
}
interface GearInsights {
  mics: GearTonalEntry[];
  speakers: GearTonalEntry[];
  positions: GearTonalEntry[];
  combos: GearComboEntry[];
}

type ProfileAdjustment = {
  mid: { shift: number; confidence: number };
  highMid: { shift: number; confidence: number };
  presence: { shift: number; confidence: number };
  ratio: { shift: number; confidence: number };
};

interface RatioPreference {
  preferredRatio: number;
  confidence: number;
  distribution: { ratio: number; count: number; sentiment: number }[];
  perProfile?: Record<string, { preferredRatio: number; confidence: number }>;
}

interface LearnedProfileData {
  signalCount: number;
  likedCount: number;
  nopedCount: number;
  learnedAdjustments: ProfileAdjustment | null;
  perProfileAdjustments?: Record<string, ProfileAdjustment> | null;
  avoidZones: { band: string; direction: string; threshold: number }[];
  status: "no_data" | "learning" | "confident" | "mastered";
  courseCorrections: string[];
  gearInsights: GearInsights | null;
  ratioPreference: RatioPreference | null;
  tonalSummary: string | null;
}

async function computeLearnedProfile(signals: PreferenceSignal[]): Promise<LearnedProfileData> {
  if (signals.length === 0) {
    return { signalCount: 0, likedCount: 0, nopedCount: 0, learnedAdjustments: null, avoidZones: [], status: "no_data", courseCorrections: [], gearInsights: null, ratioPreference: null, tonalSummary: null };
  }

  const liked = signals.filter((s) => s.action === "love" || s.action === "like" || s.action === "meh" || s.action === "correction" || s.action === "taste_pick");
  const noped = signals.filter((s) => s.action === "nope");

  if (liked.length === 0) {
    return { signalCount: signals.length, likedCount: 0, nopedCount: noped.length, learnedAdjustments: null, avoidZones: [], status: "learning", courseCorrections: [], gearInsights: null, ratioPreference: null, tonalSummary: "Still learning -- rate some blends as Love or Like so I can start understanding your tonal preferences." };
  }

  const signalWeight = (action: string): number => {
    switch (action) {
      case "love": return 3;
      case "like": return 1.5;
      case "taste_pick": return 2;
      case "correction": return 5;
      case "meh": return 0.5;
      default: return 1;
    }
  };

  const weightedAvg = (arr: PreferenceSignal[], field: keyof PreferenceSignal) => {
    let sum = 0, wSum = 0;
    for (const s of arr) {
      const w = signalWeight(s.action);
      sum += (s[field] as number) * w;
      wSum += w;
    }
    return wSum > 0 ? sum / wSum : 0;
  };

  const likedMid = weightedAvg(liked, "mid");
  const likedHiMid = weightedAvg(liked, "highMid");
  const likedPresence = weightedAvg(liked, "presence");
  const likedRatio = weightedAvg(liked, "ratio");

  const baseMid = 28, baseHiMid = 39, basePresence = 23, baseRatio = 1.4;

  const confidence = Math.min(liked.length / 8, 1);

  const strongSignals = liked.filter((s) => s.action === "love" || s.action === "like" || s.action === "ranked_1" || s.action === "ranked_2" || s.action === "taste_pick");
  const stdDev = (arr: number[]) => {
    if (arr.length < 2) return Infinity;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
  };
  const midStd = stdDev(strongSignals.map((s) => s.mid));
  const presStd = stdDev(strongSignals.map((s) => s.presence));
  const ratioStd = stdDev(strongSignals.map((s) => s.ratio));
  const isConsistent = midStd < 8 && presStd < 10 && ratioStd < 0.6;

  const sortedByRecent = [...signals].sort((a, b) =>
    new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
  );
  const recentSignals = sortedByRecent.slice(0, 12);
  const predictionMisses = recentSignals.filter((s) =>
    (s.action === "nope") && typeof s.score === "number" && s.score >= 80
  );
  const hasPredictionMisses = predictionMisses.length >= 3;

  const recentLiked = recentSignals.filter((s) => s.action === "love" || s.action === "like" || s.action === "ranked_1" || s.action === "ranked_2");
  let isDrifting = false;
  const driftReasons: string[] = [];
  if (recentLiked.length >= 3) {
    const recentMidAvg = recentLiked.reduce((s, v) => s + v.mid, 0) / recentLiked.length;
    const recentPresAvg = recentLiked.reduce((s, v) => s + v.presence, 0) / recentLiked.length;
    const recentRatioAvg = recentLiked.reduce((s, v) => s + v.ratio, 0) / recentLiked.length;
    const midDelta = Math.abs(recentMidAvg - likedMid);
    const presDelta = Math.abs(recentPresAvg - likedPresence);
    const ratioDelta = Math.abs(recentRatioAvg - likedRatio);
    if (midDelta > 7) driftReasons.push("mid preference shifting");
    if (presDelta > 9) driftReasons.push("presence preference shifting");
    if (ratioDelta > 0.5) driftReasons.push("ratio preference shifting");
    isDrifting = driftReasons.length >= 2;
  }

  const recentNopeCount = recentSignals.filter((s) => s.action === "nope").length;
  const recentNopeSurge = recentNopeCount >= 5;

  const isMastered = strongSignals.length >= 10 && confidence >= 1 && isConsistent && !hasPredictionMisses && !isDrifting && !recentNopeSurge;

  const courseCorrections: string[] = [];
  if (!isMastered && strongSignals.length >= 10) {
    if (hasPredictionMisses) courseCorrections.push(`${predictionMisses.length} high-scored blends noped -- recalibrating scoring`);
    if (isDrifting) courseCorrections.push(driftReasons.join(", "));
    if (recentNopeSurge) courseCorrections.push(`${recentNopeCount} nopes in recent ratings -- narrowing targets`);
    if (!isConsistent) courseCorrections.push("wide variance in liked blends -- still converging");
  }
  const status: LearnedProfileData["status"] = isMastered ? "mastered" : liked.length >= 5 ? "confident" : "learning";

  const feedbackNudges = { subBass: 0, mid: 0, highMid: 0, presence: 0, ratio: 0, bass: 0, lowMid: 0 };
  const feedbackMap: Record<string, Partial<typeof feedbackNudges>> = {
    thin:        { bass: -2, lowMid: -1.5 },
    muddy:       { lowMid: 2, mid: 1.5 },
    harsh:       { highMid: 2, presence: 1 },
    dull:        { presence: -2, highMid: -1.5, ratio: -0.15 },
    boomy:       { bass: 2, lowMid: 1 },
    fizzy:       { presence: 2, highMid: 1.5 },
    more_bottom: { bass: 1.5, lowMid: 1 },
    less_harsh:  { highMid: -1.5, presence: -1 },
    more_bite:   { highMid: 1.5, ratio: 0.1 },
    tighter:     { bass: -1, lowMid: -1.5 },
    more_air:    { presence: 1.5, highMid: 0.5 },
    punchy:      { highMid: 0.5, ratio: 0.05 },
    warm:        { bass: 0.5, lowMid: 0.5, highMid: -0.5 },
    aggressive:  { highMid: 1, presence: 0.5, ratio: 0.1 },
    perfect:     {},
    balanced:    {},
  };
  const textKeywordMap: Record<string, Partial<typeof feedbackNudges>> = {
    bright: { highMid: 1, presence: 0.5 },
    dark: { highMid: -1, presence: -0.5 },
    scooped: { mid: -1.5, highMid: 0.5, bass: 0.5 },
    honky: { mid: 2, highMid: -0.5 },
    nasal: { mid: 1.5, highMid: 1 },
    boxy: { lowMid: 1.5, mid: 1 },
    crisp: { presence: 1, highMid: 0.5 },
    smooth: { highMid: -0.5, presence: -0.5 },
    tight: { bass: -1, lowMid: -1 },
    loose: { bass: 1, lowMid: 1 },
    wooly: { lowMid: 1.5, bass: 1 },
    sizzle: { presence: 1.5 },
    shrill: { highMid: 2, presence: 1.5 },
    flat: { mid: -0.5, highMid: -0.5, presence: -0.5 },
    full: { bass: 0.5, lowMid: 0.5, mid: 0.3 },
    sterile: { mid: -1, highMid: -0.5 },
    fat: { bass: 1, lowMid: 0.8 },
    chunky: { lowMid: 1, mid: 0.5, bass: 0.5 },
    glassy: { highMid: 1.5, presence: 1 },
    brittle: { highMid: 2, presence: 1, bass: -1 },
    thick: { lowMid: 1, mid: 0.8, bass: 0.5 },
    airy: { presence: 1.5, highMid: 0.5 },
    ice: { presence: 2, highMid: 1 },
    spank: { highMid: 1, ratio: 0.1 },
    compressed: { mid: 0.5, ratio: -0.05 },
    open: { presence: 0.5, highMid: 0.3, ratio: 0.05 },
    closed: { presence: -1, highMid: -0.5 },
  };
  let feedbackCount = 0;
  const allResolvedTags: string[] = [];
  for (const s of signals) {
    const isNegative = s.action === "nope" || s.action === "meh";
    const dir = isNegative ? -1 : 1;
    if (s.feedback) {
      const tags = s.feedback.split(",").map((t) => t.trim()).filter(Boolean);
      for (const tag of tags) {
        allResolvedTags.push(tag);
        const nudge = feedbackMap[tag];
        if (!nudge || Object.keys(nudge).length === 0) continue;
        feedbackCount++;
        for (const [band, val] of Object.entries(nudge)) {
          (feedbackNudges as any)[band] += val * dir;
        }
      }
    }
  }

  const feedbackScale = feedbackCount > 0 ? Math.min(feedbackCount / 5, 1) * confidence : 0;
  if (allResolvedTags.length > 0) {
    const uniqueTags = Array.from(new Set(allResolvedTags));
    courseCorrections.push(`tonal feedback applied: ${uniqueTags.join(", ")}`);
  }

  const effectiveMidNudge = feedbackNudges.mid + feedbackNudges.lowMid * 0.6;
  const effectiveRatioNudge = feedbackNudges.ratio - feedbackNudges.bass * 0.03;

  const adjustments = {
    mid: { shift: Math.round(((likedMid - baseMid) * confidence + effectiveMidNudge * feedbackScale) * 10) / 10, confidence },
    highMid: { shift: Math.round(((likedHiMid - baseHiMid) * confidence + feedbackNudges.highMid * feedbackScale) * 10) / 10, confidence },
    presence: { shift: Math.round(((likedPresence - basePresence) * confidence + feedbackNudges.presence * feedbackScale) * 10) / 10, confidence },
    ratio: { shift: Math.round(((likedRatio - baseRatio) * confidence + effectiveRatioNudge * feedbackScale) * 100) / 100, confidence },
  };

  const profileBaseTargets: Record<string, { mid: number; hiMid: number; presence: number; ratio: number }> = {
    Featured: { mid: 22, hiMid: 39, presence: 34, ratio: 1.65 },
    Body: { mid: 34, hiMid: 40, presence: 12, ratio: 1.2 },
  };
  const perProfileAdjustments: Record<string, ProfileAdjustment> = {};
  for (const [profileName, baseTargets] of Object.entries(profileBaseTargets)) {
    const profileLiked = liked.filter((s) => s.profileMatch === profileName);
    const profileSignals = signals.filter((s) => s.profileMatch === profileName);
    if (profileLiked.length < 2) continue;
    const pConf = Math.min(profileLiked.length / 8, 1);
    const pMid = weightedAvg(profileLiked, "mid");
    const pHiMid = weightedAvg(profileLiked, "highMid");
    const pPres = weightedAvg(profileLiked, "presence");
    const pRatio = weightedAvg(profileLiked, "ratio");

    const pFeedback = { mid: 0, highMid: 0, presence: 0, ratio: 0, bass: 0, lowMid: 0 };
    let pFeedbackCount = 0;
    for (const s of profileSignals) {
      const isNeg = s.action === "nope" || s.action === "meh";
      const dir = isNeg ? -1 : 1;
      if (s.feedback) {
        const tags = s.feedback.split(",").map((t) => t.trim()).filter(Boolean);
        for (const tag of tags) {
          const nudge = feedbackMap[tag];
          if (!nudge || Object.keys(nudge).length === 0) continue;
          pFeedbackCount++;
          for (const [band, val] of Object.entries(nudge)) {
            (pFeedback as any)[band] += val * dir;
          }
        }
      }
    }
    const pFeedbackScale = pFeedbackCount > 0 ? Math.min(pFeedbackCount / 5, 1) * pConf : 0;
    const pEffMid = pFeedback.mid + pFeedback.lowMid * 0.6;
    const pEffRatio = pFeedback.ratio - pFeedback.bass * 0.03;

    perProfileAdjustments[profileName] = {
      mid: { shift: Math.round(((pMid - baseTargets.mid) * pConf + pEffMid * pFeedbackScale) * 10) / 10, confidence: pConf },
      highMid: { shift: Math.round(((pHiMid - baseTargets.hiMid) * pConf + pFeedback.highMid * pFeedbackScale) * 10) / 10, confidence: pConf },
      presence: { shift: Math.round(((pPres - baseTargets.presence) * pConf + pFeedback.presence * pFeedbackScale) * 10) / 10, confidence: pConf },
      ratio: { shift: Math.round(((pRatio - baseTargets.ratio) * pConf + pEffRatio * pFeedbackScale) * 100) / 100, confidence: pConf },
    };
  }

  const avoidZones: LearnedProfileData["avoidZones"] = [];
  if (noped.length >= 3) {
    const nopedMidAvg = noped.reduce((s, n) => s + n.mid, 0) / noped.length;
    const nopedPresAvg = noped.reduce((s, n) => s + n.presence, 0) / noped.length;
    const nopedRatioAvg = noped.reduce((s, n) => s + n.ratio, 0) / noped.length;
    if (nopedMidAvg > 32) avoidZones.push({ band: "mid", direction: "high", threshold: Math.round(nopedMidAvg) });
    if (nopedMidAvg < 20) avoidZones.push({ band: "mid", direction: "low", threshold: Math.round(nopedMidAvg) });
    if (nopedPresAvg > 30) avoidZones.push({ band: "presence", direction: "high", threshold: Math.round(nopedPresAvg) });
    if (nopedPresAvg < 10) avoidZones.push({ band: "presence", direction: "low", threshold: Math.round(nopedPresAvg) });
    if (nopedRatioAvg > 2.0) avoidZones.push({ band: "ratio", direction: "high", threshold: Math.round(nopedRatioAvg * 100) / 100 });
  }

  const taggedNopes = noped.filter((s) => s.feedback);
  if (taggedNopes.length >= 2) {
    const tagCounts: Record<string, { count: number; avgBands: Record<string, number> }> = {};
    for (const s of taggedNopes) {
      if (!s.feedback) continue;
      const tags = s.feedback.split(",").map((t) => t.trim()).filter(Boolean);
      for (const tag of tags) {
        if (!tagCounts[tag]) tagCounts[tag] = { count: 0, avgBands: { bass: 0, lowMid: 0, mid: 0, highMid: 0, presence: 0 } };
        const tc = tagCounts[tag];
        tc.count++;
        tc.avgBands.bass += s.bass; tc.avgBands.lowMid += s.lowMid; tc.avgBands.mid += s.mid;
        tc.avgBands.highMid += s.highMid; tc.avgBands.presence += s.presence;
      }
    }
    for (const [tag, data] of Object.entries(tagCounts)) {
      if (data.count < 2) continue;
      for (const b of Object.keys(data.avgBands)) data.avgBands[b] /= data.count;
      if (tag === "muddy" && !avoidZones.some((z) => z.band === "lowMid" && z.direction === "high")) {
        avoidZones.push({ band: "lowMid", direction: "high", threshold: Math.round(data.avgBands.lowMid) });
      }
      if (tag === "harsh" && !avoidZones.some((z) => z.band === "highMid" && z.direction === "high")) {
        avoidZones.push({ band: "highMid", direction: "high", threshold: Math.round(data.avgBands.highMid) });
      }
      if (tag === "thin" && !avoidZones.some((z) => z.band === "bass" && z.direction === "low")) {
        avoidZones.push({ band: "bass", direction: "low", threshold: Math.round(data.avgBands.bass) });
      }
      if (tag === "boomy" && !avoidZones.some((z) => z.band === "bass" && z.direction === "high")) {
        avoidZones.push({ band: "bass", direction: "high", threshold: Math.round(data.avgBands.bass) });
      }
      if (tag === "dull" && !avoidZones.some((z) => z.band === "presence" && z.direction === "low")) {
        avoidZones.push({ band: "presence", direction: "low", threshold: Math.round(data.avgBands.presence) });
      }
      if (tag === "fizzy" && !avoidZones.some((z) => z.band === "presence" && z.direction === "high")) {
        avoidZones.push({ band: "presence", direction: "high", threshold: Math.round(data.avgBands.presence) });
      }
    }
  }

  const loves = signals.filter((s) => s.action === "love");
  const likes = signals.filter((s) => s.action === "like");
  const mehs = signals.filter((s) => s.action === "meh");

  if (loves.length >= 3 && mehs.length >= 2) {
    const loveMidAvg = loves.reduce((s, l) => s + l.mid, 0) / loves.length;
    const lovePresAvg = loves.reduce((s, l) => s + l.presence, 0) / loves.length;
    const loveRatioAvg = loves.reduce((s, l) => s + l.ratio, 0) / loves.length;
    const mehMidAvg = mehs.reduce((s, m) => s + m.mid, 0) / mehs.length;
    const mehPresAvg = mehs.reduce((s, m) => s + m.presence, 0) / mehs.length;
    const mehRatioAvg = mehs.reduce((s, m) => s + m.ratio, 0) / mehs.length;

    if (loveMidAvg < mehMidAvg - 3) {
      const mudFloor = Math.round(mehMidAvg + (mehMidAvg - loveMidAvg) * 0.3);
      if (!avoidZones.some((z) => z.band === "mid" && z.direction === "high")) {
        avoidZones.push({ band: "mid", direction: "high", threshold: mudFloor });
      }
    }
    if (lovePresAvg > mehPresAvg + 3) {
      const dullCeiling = Math.round(mehPresAvg - (lovePresAvg - mehPresAvg) * 0.3);
      if (!avoidZones.some((z) => z.band === "presence" && z.direction === "low")) {
        avoidZones.push({ band: "presence", direction: "low", threshold: Math.max(dullCeiling, 5) });
      }
    }
    if (loveRatioAvg > mehRatioAvg + 0.2) {
      const dullRatioCeiling = Math.round((mehRatioAvg - (loveRatioAvg - mehRatioAvg) * 0.2) * 100) / 100;
      if (!avoidZones.some((z) => z.band === "ratio" && z.direction === "low")) {
        avoidZones.push({ band: "ratio", direction: "low", threshold: Math.max(dullRatioCeiling, 0.5) });
      }
    }
  }

  if (loves.length >= 5 && mehs.length === 0 && noped.length === 0) {
    const loveMidAvg = loves.reduce((s, l) => s + l.mid, 0) / loves.length;
    const lovePresAvg = loves.reduce((s, l) => s + l.presence, 0) / loves.length;
    const loveMidMax = Math.max(...loves.map((l) => l.mid));
    const lovePresMin = Math.min(...loves.map((l) => l.presence));
    const mudFloor = Math.round(loveMidMax + (loveMidMax - loveMidAvg) * 0.5);
    const dullCeiling = Math.round(lovePresMin - (lovePresAvg - lovePresMin) * 0.5);
    if (!avoidZones.some((z) => z.band === "mid" && z.direction === "high")) {
      avoidZones.push({ band: "mid", direction: "high", threshold: mudFloor });
    }
    if (dullCeiling > 3 && !avoidZones.some((z) => z.band === "presence" && z.direction === "low")) {
      avoidZones.push({ band: "presence", direction: "low", threshold: dullCeiling });
    }
  }

  if (loves.length >= 3 || (likes.length >= 3 && mehs.length >= 2)) {
    const positives = [...loves, ...likes];
    const posLowMidAvg = positives.reduce((s, p) => s + p.lowMid, 0) / positives.length;
    const posPresAvg = positives.reduce((s, p) => s + p.presence, 0) / positives.length;
    const posMidAvg = positives.reduce((s, p) => s + p.mid, 0) / positives.length;

    if (posPresAvg > 25 && posMidAvg < 28) {
      const lowMidMax = Math.max(...positives.map((p) => p.lowMid));
      const midMax = Math.max(...positives.map((p) => p.mid));
      const muddyThreshold = Math.round(lowMidMax + midMax);
      if (!avoidZones.some((z) => z.band === "muddy_composite" && z.direction === "high")) {
        avoidZones.push({ band: "muddy_composite", direction: "high", threshold: muddyThreshold });
      }
    }
  }

  let gearInsights: GearInsights | null = null;
  if (signals.length >= 5) {
    const gearScoreAccum: Record<string, Record<string, GearScore>> = { mics: {}, speakers: {}, positions: {} };
    const gearTonalAccum: Record<string, Record<string, { sums: { subBass: number; bass: number; lowMid: number; mid: number; highMid: number; presence: number; ratio: number }; count: number }>> = { mics: {}, speakers: {}, positions: {} };

    const addGearScore = (category: string, name: string | undefined, action: string) => {
      if (!name) return;
      if (!gearScoreAccum[category][name]) gearScoreAccum[category][name] = { loved: 0, liked: 0, noped: 0, net: 0 };
      const entry = gearScoreAccum[category][name];
      if (action === "love") { entry.loved++; entry.net += 3; }
      else if (action === "like") { entry.liked++; entry.net += 1.5; }
      else if (action === "meh") { entry.net += 0.2; }
      else if (action === "nope") { entry.noped++; entry.net -= 2; }
    };

    const addGearTonal = (category: string, name: string | undefined, sig: PreferenceSignal) => {
      if (!name) return;
      if (!gearTonalAccum[category][name]) gearTonalAccum[category][name] = { sums: { subBass: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, presence: 0, ratio: 0 }, count: 0 };
      const entry = gearTonalAccum[category][name];
      entry.sums.subBass += sig.subBass; entry.sums.bass += sig.bass; entry.sums.lowMid += sig.lowMid;
      entry.sums.mid += sig.mid; entry.sums.highMid += sig.highMid; entry.sums.presence += sig.presence;
      entry.sums.ratio += sig.ratio; entry.count++;
    };

    const comboAccum: Record<string, { sums: { subBass: number; bass: number; lowMid: number; mid: number; highMid: number; presence: number; ratio: number }; count: number; sentimentSum: number }> = {};
    const sentimentVal = (a: string) => a === "love" ? 3 : a === "like" ? 1.5 : a === "meh" ? 0.2 : -2;

    const addTonal = (key: string, map: Record<string, { sums: { subBass: number; bass: number; lowMid: number; mid: number; highMid: number; presence: number; ratio: number }; count: number; sentimentSum?: number }>, sig: PreferenceSignal, withSentiment?: boolean) => {
      if (!map[key]) map[key] = { sums: { subBass: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, presence: 0, ratio: 0 }, count: 0, sentimentSum: 0 };
      const e = map[key];
      e.sums.subBass += sig.subBass; e.sums.bass += sig.bass; e.sums.lowMid += sig.lowMid;
      e.sums.mid += sig.mid; e.sums.highMid += sig.highMid; e.sums.presence += sig.presence;
      e.sums.ratio += sig.ratio; e.count++;
      if (withSentiment) e.sentimentSum = (e.sentimentSum || 0) + sentimentVal(sig.action);
    };

    for (const sig of signals) {
      const baseGear = parseGearFromFilename(sig.baseFilename);
      const featGear = parseGearFromFilename(sig.featureFilename);

      const seenMics = new Set<string>();
      const seenSpeakers = new Set<string>();
      const seenPositions = new Set<string>();
      for (const gear of [baseGear, featGear]) {
        if (gear.mic) { addGearScore("mics", gear.mic, sig.action); seenMics.add(gear.mic); }
        if (gear.mic2) { addGearScore("mics", gear.mic2, sig.action); seenMics.add(gear.mic2); }
        if (gear.speaker) { addGearScore("speakers", gear.speaker, sig.action); seenSpeakers.add(gear.speaker); }
        if (gear.position) { addGearScore("positions", gear.position, sig.action); seenPositions.add(gear.position); }
      }

      Array.from(seenMics).forEach(mic => addTonal(mic, gearTonalAccum.mics, sig));
      Array.from(seenSpeakers).forEach(spk => addTonal(spk, gearTonalAccum.speakers, sig));
      Array.from(seenPositions).forEach(pos => addTonal(pos, gearTonalAccum.positions, sig));

      const seenCombos = new Set<string>();
      for (const gear of [baseGear, featGear]) {
        const allMics = [gear.mic, gear.mic2].filter(Boolean) as string[];
        for (const mic of allMics) {
          if (gear.speaker) seenCombos.add(`${mic}+${gear.speaker}`);
          if (gear.position) seenCombos.add(`${mic}@${gear.position}`);
        }
        if (gear.speaker && gear.position) seenCombos.add(`${gear.speaker}@${gear.position}`);
        if (gear.mic && gear.mic2) seenCombos.add(`${gear.mic}+${gear.mic2}`);
      }
      Array.from(seenCombos).forEach(key => addTonal(key, comboAccum, sig, true));
    }

    const globalAvg = {
      subBass: signals.reduce((s, v) => s + v.subBass, 0) / signals.length,
      bass: signals.reduce((s, v) => s + v.bass, 0) / signals.length,
      lowMid: signals.reduce((s, v) => s + v.lowMid, 0) / signals.length,
      mid: signals.reduce((s, v) => s + v.mid, 0) / signals.length,
      highMid: signals.reduce((s, v) => s + v.highMid, 0) / signals.length,
      presence: signals.reduce((s, v) => s + v.presence, 0) / signals.length,
      ratio: signals.reduce((s, v) => s + v.ratio, 0) / signals.length,
    };

    const TONAL_LABELS: { band: string; field: keyof typeof globalAvg; highLabel: string; lowLabel: string; threshold: number }[] = [
      { band: "lowMid", field: "lowMid", highLabel: "Thick/Muddy", lowLabel: "Lean/Tight", threshold: 2.5 },
      { band: "mid", field: "mid", highLabel: "Dense Mids", lowLabel: "Scooped", threshold: 2.5 },
      { band: "highMid", field: "highMid", highLabel: "Bite/Cut", lowLabel: "Smooth", threshold: 2.5 },
      { band: "presence", field: "presence", highLabel: "Bright/Forward", lowLabel: "Dark/Warm", threshold: 3.0 },
      { band: "bass", field: "bass", highLabel: "Full Low-End", lowLabel: "Thin Low-End", threshold: 2.0 },
      { band: "ratio", field: "ratio", highLabel: "Crisp/Articulate", lowLabel: "Warm/Round", threshold: 0.15 },
    ];

    const deriveTonalDescriptors = (profile: TonalProfile): TonalDescriptor[] => {
      const descs: TonalDescriptor[] = [];
      for (const tl of TONAL_LABELS) {
        const val = profile[tl.field as keyof TonalProfile] as number;
        const ref = globalAvg[tl.field];
        const delta = val - ref;
        if (Math.abs(delta) >= tl.threshold) {
          descs.push({
            label: delta > 0 ? tl.highLabel : tl.lowLabel,
            direction: delta > 0 ? "high" : "low",
            band: tl.band,
            delta: Math.round(delta * 10) / 10,
          });
        }
      }
      descs.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      return descs.slice(0, 3);
    }

    const computeTonalProfile = (accum: { sums: typeof globalAvg; count: number }): TonalProfile => {
      const n = accum.count;
      return {
        subBass: Math.round((accum.sums.subBass / n) * 10) / 10,
        bass: Math.round((accum.sums.bass / n) * 10) / 10,
        lowMid: Math.round((accum.sums.lowMid / n) * 10) / 10,
        mid: Math.round((accum.sums.mid / n) * 10) / 10,
        highMid: Math.round((accum.sums.highMid / n) * 10) / 10,
        presence: Math.round((accum.sums.presence / n) * 10) / 10,
        ratio: Math.round((accum.sums.ratio / n) * 100) / 100,
        sampleSize: n,
      };
    }

    const buildTonalEntries = (scoreMap: Record<string, GearScore>, tonalMap: Record<string, { sums: typeof globalAvg; count: number }>): GearTonalEntry[] =>
      Object.entries(scoreMap)
        .filter(([, s]) => s.loved + s.liked + s.noped >= 2)
        .map(([name, score]) => {
          const tonalData = tonalMap[name];
          const tonal = tonalData && tonalData.count >= 3 ? computeTonalProfile(tonalData) : null;
          const descriptors = tonal ? deriveTonalDescriptors(tonal) : [];
          return { name, score: { ...score, net: Math.round(score.net * 10) / 10 }, tonal, descriptors };
        })
        .sort((a, b) => b.score.net - a.score.net);

    const mics = buildTonalEntries(gearScoreAccum.mics, gearTonalAccum.mics);
    const speakers = buildTonalEntries(gearScoreAccum.speakers, gearTonalAccum.speakers);
    const positions = buildTonalEntries(gearScoreAccum.positions, gearTonalAccum.positions);

    const combos: GearComboEntry[] = Object.entries(comboAccum)
      .filter(([, v]) => v.count >= 3)
      .map(([combo, v]) => {
        const tonal = computeTonalProfile(v);
        const descriptors = deriveTonalDescriptors(tonal);
        return { combo, tonal, descriptors, sampleSize: v.count, sentiment: Math.round((v.sentimentSum / v.count) * 10) / 10 };
      })
      .sort((a, b) => Math.abs(b.sentiment) - Math.abs(a.sentiment))
      .slice(0, 8);

    if (mics.length > 0 || speakers.length > 0 || positions.length > 0) {
      gearInsights = { mics, speakers, positions, combos };
    }
  }

  let ratioPreference: RatioPreference | null = null;
  const ratioSignals = signals.filter((s) => s.blendRatio != null && (s.action === "ratio_pick" || s.action === "love" || s.action === "like"));
  if (ratioSignals.length >= 2) {
    const buckets: Record<number, { count: number; sentimentSum: number }> = {};
    for (const s of ratioSignals) {
      const br = Math.round((s.blendRatio ?? 0.5) * 100) / 100;
      if (!buckets[br]) buckets[br] = { count: 0, sentimentSum: 0 };
      buckets[br].count++;
      const sent = s.action === "ratio_pick" ? 2 : s.action === "love" ? 3 : s.action === "like" ? 1.5 : 1;
      buckets[br].sentimentSum += sent;
    }
    const distribution = Object.entries(buckets)
      .map(([r, d]) => ({ ratio: parseFloat(r), count: d.count, sentiment: Math.round((d.sentimentSum / d.count) * 10) / 10 }))
      .sort((a, b) => b.sentiment * b.count - a.sentiment * a.count);

    let weightedSum = 0, weightTotal = 0;
    for (const d of distribution) {
      const w = d.sentiment * d.count;
      weightedSum += d.ratio * w;
      weightTotal += w;
    }
    const RATIO_GRID = [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7];
    const snapRatio = (v: number) => RATIO_GRID.reduce((best, g) => Math.abs(g - v) < Math.abs(best - v) ? g : best, 0.5);
    const rawPref = weightTotal > 0 ? weightedSum / weightTotal : 0.5;
    const preferredRatio = snapRatio(rawPref);
    const ratioConfidence = Math.min(ratioSignals.length / 6, 1);

    const perProfileRatio: Record<string, { preferredRatio: number; confidence: number }> = {};
    for (const profileName of ["Featured", "Body"]) {
      const profileRatioSignals = ratioSignals.filter((s) => s.profileMatch === profileName);
      if (profileRatioSignals.length >= 2) {
        let pws = 0, pwt = 0;
        for (const s of profileRatioSignals) {
          const sent = s.action === "ratio_pick" ? 2 : s.action === "love" ? 3 : 1.5;
          const w = sent;
          pws += (s.blendRatio ?? 0.5) * w;
          pwt += w;
        }
        perProfileRatio[profileName] = {
          preferredRatio: snapRatio(pwt > 0 ? pws / pwt : 0.5),
          confidence: Math.min(profileRatioSignals.length / 6, 1),
        };
      }
    }

    ratioPreference = {
      preferredRatio,
      confidence: ratioConfidence,
      distribution,
      perProfile: Object.keys(perProfileRatio).length > 0 ? perProfileRatio : undefined,
    };
  }

  const tonalSummary = buildTonalSummary(adjustments, perProfileAdjustments, avoidZones, gearInsights, ratioPreference, courseCorrections, status, liked, noped, signals);

  return { signalCount: signals.length, likedCount: liked.length, nopedCount: noped.length, learnedAdjustments: adjustments, perProfileAdjustments: Object.keys(perProfileAdjustments).length > 0 ? perProfileAdjustments : null, avoidZones, status, courseCorrections, gearInsights, ratioPreference, tonalSummary };
}

function buildTonalSummary(
  adjustments: ProfileAdjustment | null,
  perProfileAdj: Record<string, ProfileAdjustment>,
  avoidZones: LearnedProfileData["avoidZones"],
  gearInsights: GearInsights | null,
  ratioPreference: RatioPreference | null,
  courseCorrections: string[],
  status: LearnedProfileData["status"],
  liked: PreferenceSignal[],
  noped: PreferenceSignal[],
  allSignals: PreferenceSignal[]
): string {
  if (status === "no_data") return "No data yet -- start rating some blends so I can learn what you like.";

  const lines: string[] = [];
  const loves = liked.filter(s => s.action === "love");
  const likes = liked.filter(s => s.action === "like");
  const mehs = liked.filter(s => s.action === "meh");
  const tastePicks = liked.filter(s => s.action === "taste_pick");
  const tastePickNote = tastePicks.length > 0 ? ` + ${tastePicks.length} taste check picks` : "";

  if (status === "learning") {
    lines.push(`I'm still getting to know your taste (${loves.length + likes.length + mehs.length} rated${tastePickNote} so far). Here's what I'm picking up:`);
  } else if (status === "confident") {
    lines.push(`Based on ${loves.length} loved, ${likes.length} liked, ${noped.length} noped${tastePickNote}, here's what I believe about your tonal preferences:`);
  } else if (status === "mastered") {
    lines.push(`I'm confident in your tonal profile (${allSignals.length} ratings analyzed${tastePickNote}). Here's what I know:`);
  }

  if (adjustments) {
    const bandDescriptions: string[] = [];
    const midShift = adjustments.mid.shift;
    const presShift = adjustments.presence.shift;
    const hiMidShift = adjustments.highMid.shift;
    const ratioShift = adjustments.ratio.shift;

    if (Math.abs(midShift) >= 1) {
      bandDescriptions.push(midShift > 0
        ? `You tend to prefer **more mids** than average -- fuller, thicker tones with body.`
        : `You lean toward **less mids** -- more scooped, modern-sounding tones.`);
    }
    if (Math.abs(hiMidShift) >= 1) {
      bandDescriptions.push(hiMidShift > 0
        ? `You like **more bite and cut** in the upper-mids -- tones that punch through a mix.`
        : `You prefer **smoother upper-mids** -- less aggressive, more rounded.`);
    }
    if (Math.abs(presShift) >= 1) {
      bandDescriptions.push(presShift > 0
        ? `You gravitate toward **brighter, more present** tones with top-end clarity.`
        : `You prefer **darker, warmer** tones with less top-end sizzle.`);
    }
    if (Math.abs(ratioShift) >= 0.1) {
      bandDescriptions.push(ratioShift > 0
        ? `Overall you like a **higher bite-to-body ratio** -- more articulate and defined.`
        : `Overall you like a **lower bite-to-body ratio** -- warmer and rounder.`);
    }

    if (bandDescriptions.length > 0) {
      lines.push("");
      lines.push("**What you like:**");
      for (const desc of bandDescriptions) lines.push(desc);
    } else if (Math.abs(midShift) < 1 && Math.abs(presShift) < 1 && Math.abs(hiMidShift) < 1) {
      lines.push("");
      lines.push("Your preferences are close to balanced -- no strong pull toward bright or dark, scooped or mid-heavy.");
    }
  }

  if (avoidZones.length > 0) {
    lines.push("");
    lines.push("**What you avoid:**");
    for (const zone of avoidZones) {
      const bandNames: Record<string, string> = {
        mid: "mids", highMid: "upper-mids/bite", presence: "presence/top-end",
        bass: "bass/low-end", lowMid: "low-mids", ratio: "bite-to-body ratio",
        muddy_composite: "muddy tones"
      };
      const name = bandNames[zone.band] || zone.band;
      if (zone.band === "muddy_composite") {
        lines.push(`You consistently nope muddy-sounding blends.`);
      } else if (zone.direction === "high") {
        lines.push(`Too much ${name} turns you off (you've noped blends above ~${zone.threshold}%).`);
      } else {
        lines.push(`Too little ${name} turns you off (you've noped blends below ~${zone.threshold}%).`);
      }
    }
  }

  if (Object.keys(perProfileAdj).length > 0) {
    const featAdj = perProfileAdj["Featured"];
    const bodyAdj = perProfileAdj["Body"];
    if (featAdj && bodyAdj) {
      const featPres = featAdj.presence.shift;
      const bodyPres = bodyAdj.presence.shift;
      const featMid = featAdj.mid.shift;
      const bodyMid = bodyAdj.mid.shift;
      if (Math.abs(featPres - bodyPres) >= 1.5 || Math.abs(featMid - bodyMid) >= 1.5) {
        lines.push("");
        lines.push("**Profile-specific tastes:**");
        if (Math.abs(featPres - bodyPres) >= 1.5) {
          lines.push(featPres > bodyPres
            ? `For Featured (cut/bite) IRs you want more brightness than for Body (foundation) IRs.`
            : `For Body IRs you actually prefer more top-end than for Featured IRs -- unusual but noted.`);
        }
        if (Math.abs(featMid - bodyMid) >= 1.5) {
          lines.push(featMid > bodyMid
            ? `You like more mid density in your Featured IRs than in Body IRs.`
            : `You prefer leaner mids in Featured IRs and fuller mids in Body IRs.`);
        }
      }
    }
  }

  if (gearInsights) {
    const favMics = gearInsights.mics.filter(m => m.score.net >= 2);
    const avoidMics = gearInsights.mics.filter(m => m.score.net <= -2);
    const favPositions = gearInsights.positions.filter(p => p.score.net >= 2);
    const avoidPositions = gearInsights.positions.filter(p => p.score.net <= -2);

    if (favMics.length > 0 || avoidMics.length > 0 || favPositions.length > 0) {
      lines.push("");
      lines.push("**Gear tendencies:**");
      if (favMics.length > 0) {
        const micNames = favMics.map(m => {
          const desc = m.descriptors.length > 0 ? ` (${m.descriptors.map(d => d.label).join(", ")})` : "";
          return `${m.name}${desc}`;
        });
        lines.push(`You consistently enjoy blends involving: ${micNames.join(", ")}.`);
      }
      if (avoidMics.length > 0) {
        lines.push(`You tend to dislike blends with: ${avoidMics.map(m => m.name).join(", ")}.`);
      }
      if (favPositions.length > 0) {
        lines.push(`Preferred mic positions: ${favPositions.map(p => p.name).join(", ")}.`);
      }
      if (avoidPositions.length > 0) {
        lines.push(`Positions you tend to avoid: ${avoidPositions.map(p => p.name).join(", ")}.`);
      }
    }
  }

  if (ratioPreference) {
    lines.push("");
    const pct = Math.round(ratioPreference.preferredRatio * 100);
    if (Math.abs(ratioPreference.preferredRatio - 0.5) >= 0.05) {
      lines.push(`**Blend ratio:** You tend to prefer ${pct}/${100 - pct} base-to-feature mixes${ratioPreference.confidence >= 0.7 ? " (fairly consistent)" : " (still settling)"}.`);
    } else {
      lines.push(`**Blend ratio:** You're happy around an even 50/50 mix.`);
    }
    if (ratioPreference.perProfile) {
      const parts: string[] = [];
      for (const [name, pr] of Object.entries(ratioPreference.perProfile)) {
        if (Math.abs(pr.preferredRatio - 0.5) >= 0.05) {
          parts.push(`${name}: ${Math.round(pr.preferredRatio * 100)}/${100 - Math.round(pr.preferredRatio * 100)}`);
        }
      }
      if (parts.length > 0) lines.push(`Per-profile: ${parts.join(", ")}.`);
    }
  }

  const corrections = courseCorrections.filter(c => !c.startsWith("AI text interpretation:"));
  const aiInterpretations = courseCorrections.filter(c => c.startsWith("AI text interpretation:"));
  if (corrections.length > 0) {
    lines.push("");
    lines.push("**Refinements in progress:**");
    for (const c of corrections) lines.push(c);
  }
  if (aiInterpretations.length > 0) {
    lines.push("");
    lines.push("**From your text feedback:**");
    for (const ai of aiInterpretations) lines.push(ai.replace("AI text interpretation: ", ""));
  }

  const correctionSignals = allSignals.filter(s => s.action === "correction" && s.feedbackText);
  if (correctionSignals.length > 0) {
    lines.push("");
    lines.push("**Your corrections applied:**");
    for (const cs of correctionSignals.slice(-3)) {
      lines.push(`"${cs.feedbackText}"`);
    }
  }

  return lines.join("\n");
}

function buildGearPreferencePrompt(learned: LearnedProfileData, micType?: string, speakerModel?: string): string {
  if (!learned.gearInsights) return '';

  const lines: string[] = [];
  const { mics, speakers, positions, combos } = learned.gearInsights;

  const lovedMics = mics.filter(m => m.score.net >= 3);
  const avoidedMics = mics.filter(m => m.score.net <= -2);
  const lovedPositions = positions.filter(p => p.score.net >= 3);
  const avoidedPositions = positions.filter(p => p.score.net <= -2);
  const lovedSpeakers = speakers.filter(s => s.score.net >= 3);

  if (lovedMics.length > 0) {
    const micLines = lovedMics.map(m => {
      const desc = m.descriptors.length > 0 ? ` (${m.descriptors.map(d => d.label).join(', ')})` : '';
      return `${m.name}${desc} -- loved ${m.score.loved}x, liked ${m.score.liked}x`;
    });
    lines.push(`Preferred mics: ${micLines.join('; ')}`);
  }

  if (avoidedMics.length > 0) {
    lines.push(`Avoided mics: ${avoidedMics.map(m => `${m.name} (noped ${m.score.noped}x)`).join('; ')}`);
  }

  if (lovedPositions.length > 0) {
    const posLines = lovedPositions.map(p => {
      const desc = p.descriptors.length > 0 ? ` (${p.descriptors.map(d => d.label).join(', ')})` : '';
      return `${p.name}${desc}`;
    });
    lines.push(`Preferred positions: ${posLines.join('; ')}`);
  }

  if (avoidedPositions.length > 0) {
    lines.push(`Avoided positions: ${avoidedPositions.map(p => p.name).join(', ')}`);
  }

  if (lovedSpeakers.length > 0) {
    lines.push(`Preferred speakers: ${lovedSpeakers.map(s => s.name).join(', ')}`);
  }

  const relevantCombos = combos.filter(c => {
    if (c.sentiment < 1.5 && c.sentiment > -1.5) return false;
    if (micType) {
      const micLower = micType.toLowerCase();
      if (c.combo.toLowerCase().includes(micLower)) return true;
    }
    if (speakerModel) {
      const spkLower = speakerModel.toLowerCase();
      if (c.combo.toLowerCase().includes(spkLower)) return true;
    }
    return c.sampleSize >= 5 && Math.abs(c.sentiment) >= 2;
  });

  if (relevantCombos.length > 0) {
    const comboLines = relevantCombos.slice(0, 5).map(c => {
      const desc = c.descriptors.length > 0 ? ` -- ${c.descriptors.map(d => d.label).join(', ')}` : '';
      const label = c.sentiment > 0 ? 'loved' : 'avoided';
      return `${c.combo}: ${label} (score ${c.sentiment})${desc}`;
    });
    lines.push(`Gear combos: ${comboLines.join('; ')}`);
  }

  if (learned.avoidZones.length > 0) {
    const zoneDescs = learned.avoidZones.map(z => `avoid ${z.direction} ${z.band}`);
    lines.push(`Tonal avoid zones: ${zoneDescs.join(', ')}`);
  }

  if (lines.length === 0) return '';

  return `\n\n=== USER'S LEARNED GEAR PREFERENCES (from ${learned.signalCount} rated blends) ===
These preferences were learned from the user's actual ratings of IR blends.
Use them to bias your recommendations toward gear/positions/combos the user has historically preferred.
If a mic or position is listed as "avoided", deprioritize it unless there's a strong technical reason.
If a mic or position is listed as "preferred", favor it when multiple options are equally valid.
${lines.join('\n')}`;
}

function buildUserVocabularyPrompt(signals: PreferenceSignal[], compact?: boolean): string {
  const withText = signals.filter(s => s.feedbackText && s.feedbackText.trim().length > 0
    && s.action !== 'ratio_pick');
  if (withText.length === 0) return '';

  const lovedComments: string[] = [];
  const likedComments: string[] = [];
  const mehComments: string[] = [];
  const nopedComments: string[] = [];

  for (const s of withText) {
    const text = s.feedbackText!.trim();
    const entry = compact
      ? `"${text}" (${s.action})`
      : `"${text}" (on ${s.baseFilename}+${s.featureFilename})`;
    if (s.action === 'love') lovedComments.push(entry);
    else if (s.action === 'like') likedComments.push(entry);
    else if (s.action === 'meh') mehComments.push(entry);
    else if (s.action === 'nope') nopedComments.push(entry);
  }

  const maxLoved = compact ? 4 : 8;
  const maxLiked = compact ? 3 : 6;
  const maxNoped = compact ? 3 : 6;
  const maxMeh = compact ? 2 : 4;

  const sections: string[] = [];
  if (lovedComments.length > 0) sections.push(`LOVED blends:\n${lovedComments.slice(-maxLoved).join('\n')}`);
  if (likedComments.length > 0) sections.push(`LIKED blends:\n${likedComments.slice(-maxLiked).join('\n')}`);
  if (nopedComments.length > 0) sections.push(`REJECTED blends:\n${nopedComments.slice(-maxNoped).join('\n')}`);
  if (mehComments.length > 0) sections.push(`MEH blends:\n${mehComments.slice(-maxMeh).join('\n')}`);

  if (sections.length === 0) return '';

  return `\n\n=== USER'S OWN TONAL DESCRIPTIONS (${withText.length} comments from rated blends) ===
These are the user's own words describing what they hear and feel about different IR blends.
Use this vocabulary to understand their perception of tone. Their descriptions reveal:
- What tonal qualities they value most (words they use for loved blends)
- What they dislike or avoid (words they use for rejected blends)
- Their unique way of describing audio — adopt their language in your responses
- Production context clues (genre references, mix goals, amp descriptions)

When giving advice, mirror their vocabulary rather than using generic audio terms.
If they say "bark" instead of "upper midrange presence", use "bark".
If they describe tones in terms of feel ("punchy", "pillowy", "in your face"), match that style.

${sections.join('\n\n')}`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Register cache clear endpoint
  app.post('/api/clear-cache', (_req, res) => {
    const batchSize = batchAnalysisCache.size;
    const singleSize = singleAnalysisCache.size;
    batchAnalysisCache.clear();
    singleAnalysisCache.clear();
    console.log(`[Cache] Manually cleared all caches (batch: ${batchSize}, single: ${singleSize})`);
    res.json({ 
      success: true, 
      cleared: { batch: batchSize, single: singleSize } 
    });
  });
  
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
      const signals = await storage.getPreferenceSignals();
      const vocabPrompt = buildUserVocabularyPrompt(signals);
      const scored = await scoreSingleIR({
        filename: filename,
        duration: input.durationSamples / 44100 * 1000,
        peakLevel: input.peakAmplitudeDb,
        spectralCentroid: input.spectralCentroid,
        lowEnergy: input.lowEnergy,
        midEnergy: input.midEnergy,
        highEnergy: input.highEnergy,
        subBassEnergy: input.subBassEnergy,
        bassEnergy: input.bassEnergy,
        lowMidEnergy: input.lowMidEnergy,
        midEnergy6: input.midEnergy6,
        highMidEnergy: input.highMidEnergy,
        presenceEnergy: input.presenceEnergy,
        ultraHighEnergy: input.ultraHighEnergy,
        frequencySmoothness: input.frequencySmoothness,
        noiseFloorDb: input.noiseFloorDb,
        spectralTilt: input.spectralTilt,
        rolloffFreq: input.rolloffFreq,
        smoothScore: input.smoothScore,
        maxNotchDepth: input.maxNotchDepth,
        notchCount: input.notchCount,
        logBandEnergies: input.logBandEnergies,
        tailLevelDb: input.tailLevelDb,
        tailStatus: input.tailStatus,
      }, vocabPrompt);
      
      // Calculate 6-band percentages if available
      const has6Band = input.subBassEnergy !== undefined;
      let sixBandPercents: {
        subBassPercent?: number;
        bassPercent?: number;
        lowMidPercent?: number;
        midPercent?: number;
        highMidPercent?: number;
        presencePercent?: number;
        ultraHighPercent?: number;
        highMidMidRatio?: number;
      } = {};
      
      if (has6Band) {
        const total = (input.subBassEnergy! + input.bassEnergy! + input.lowMidEnergy! + input.midEnergy6! + input.highMidEnergy! + input.presenceEnergy! + (input.ultraHighEnergy || 0)) || 1;
        sixBandPercents = {
          subBassPercent: Math.round((input.subBassEnergy! / total) * 1000) / 10,
          bassPercent: Math.round((input.bassEnergy! / total) * 1000) / 10,
          lowMidPercent: Math.round((input.lowMidEnergy! / total) * 1000) / 10,
          midPercent: Math.round((input.midEnergy6! / total) * 1000) / 10,
          highMidPercent: Math.round((input.highMidEnergy! / total) * 1000) / 10,
          presencePercent: Math.round((input.presenceEnergy! / total) * 1000) / 10,
          ultraHighPercent: input.ultraHighEnergy ? Math.round((input.ultraHighEnergy / total) * 1000) / 10 : 0,
          highMidMidRatio: input.midEnergy6! > 0 ? Math.round((input.highMidEnergy! / input.midEnergy6!) * 100) / 100 : 0,
        };
        console.log(`[Single Analysis] 6-band: Mid=${sixBandPercents.midPercent}% HiMid=${sixBandPercents.highMidPercent}% Pres=${sixBandPercents.presencePercent}% Ratio=${sixBandPercents.highMidMidRatio}`);
      }
      
      const saved = await storage.createAnalysis({
        ...input,
        advice: scored.advice,
        qualityScore: scored.score,
        isPerfect: scored.isPerfect
      });

      // Include tonal modifier suggestion, detected mic variant, spectral deviation, and 6-band data in response
      const responseWithExtras = {
        ...saved,
        micLabel: micVariant,
        renameSuggestion: scored.renameSuggestion ? {
          suggestedModifier: scored.renameSuggestion.suggestedModifier,
          reason: scored.renameSuggestion.reason
        } : null,
        spectralDeviation: scored.spectralDeviation,
        frequencySmoothness: scored.frequencySmoothness,
        noiseFloorDb: scored.noiseFloorDb,
        spectralTilt: input.spectralTilt ?? null,
        rolloffFreq: input.rolloffFreq ?? null,
        smoothScore: input.smoothScore ?? null,
        maxNotchDepth: input.maxNotchDepth ?? null,
        notchCount: input.notchCount ?? null,
        tailLevelDb: input.tailLevelDb ?? null,
        tailStatus: input.tailStatus ?? null,
        ...sixBandPercents,
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
      const { micType, speakerModel, genre, preferredShots, targetShotCount, basicPositionsOnly, singleDistancePerMic, micShotCounts, existingShots } = input;
      
      console.log(`[Recommendations] Mic+Speaker request: mic=${micType}, speaker=${speakerModel}, genre=${genre || 'none'}, targetShots=${targetShotCount || 'default'}, existingShots=${existingShots ? existingShots.length + ' files: ' + existingShots.map(s => `${s.filename}(c${Math.round(s.centroid)})`).join(', ') : 'none'}`);
      
      // Build position restriction instruction
      let positionInstruction = '';
      if (basicPositionsOnly) {
        positionInstruction = `\n\nPOSITION RESTRICTION: ONLY use these 4 basic positions: Cap, CapEdge, Cap_Cone_Tr, Cone.
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
- Vary POSITION (Cap, CapEdge, Cap_Cone_Tr, Cone) for tonal variety, NOT distance
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
      - 421 (MD421): range 1-4", SWEET SPOT 2". Large diaphragm, scooped mids, punchy low-end, wider frequency range. DIFFERENT from MD421K.
      - 421k (MD421K): range 1-4", SWEET SPOT 2". Compact (Kompakt) variant, tighter midrange focus, slightly less low-end. DIFFERENT from MD421.
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
      
      BLEND SETUPS (SM57 + R121, position is always "Blend"):
      These are dual-mic setups where SM57 and R121 are blended together.
      The SM57 is typically close-miked (1-2") at CapEdge, the R121 is further back (4-6") at Cap.
      The "distance" in a blend shot refers to the R121's distance from the speaker — the SM57 stays at its sweet spot.
      - sm57_r121_blend (SM57+R121 Blend): The app recommends the best ratio and voicing for each shot. Range 4-6".
        Available voicings (YOU choose the best one per shot based on genre, speaker, and distance):
        - Tight (67:33 SM57:R121): SM57-dominant — punchy, aggressive, more bite and high-mid cut
        - Balance (60:40 SM57:R121): Even mix — SM57 attack with R121 warmth smoothing the top end
        - Thick (51:49 SM57:R121): Near-equal — full-bodied, thickened mids, slightly less bite
        - Smooth (45:55 SM57:R121): R121-leaning — rounded highs, warm midrange, less harsh transients
        - Ribbon Dom (24:76 SM57:R121): Ribbon-dominant — dark, warm, smooth top end, big low-mids
        For each blend shot, include a "blendRatio" field with your recommended voicing label and ratio (e.g. "Tight (67:33)").
      
      FREDMAN TECHNIQUE (Dual SM57, position is always "Blend"):
      - fredman (Fredman): Two SM57s aimed at the speaker, one on-axis and one off-axis (angled ~45°), blended 50:50. Classic Meshuggah/Fredrik Thordendal technique. Produces tight, focused, mid-heavy tone with reduced fizz. Both mics at same distance. Range 0.5-2", SWEET SPOT 1".
      
      IMPORTANT FOR BLEND SHOTS:
      - Position MUST always be "Blend" — never Cap, CapEdge, etc.
      - For SM57+R121 blends, the distance refers to the R121 placement. The SM57 is fixed at its sweet spot.
      - For SM57+R121 blends, YOU must recommend the best blend ratio/voicing for each shot and include it in "blendRatio" field.
      - For Fredman, the distance is where both SM57s are placed.
      - Vary DISTANCE for tonal variety across blend shots, not position.
      
      Available Distances (in inches): 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6
      
      Speakers Knowledge:
      - g12m25 (G12M-25 Greenback): Classic woody, mid-forward, compression at high volume.
      - v30-china (V30): Aggressive upper-mids, modern rock.
      - v30-blackcat (V30 Black Cat): Much darker than standard V30, smoother mids.
      - k100 (G12K-100): Big low end, moderately bright, neutral.
      - g12t75 (G12T-75): Near-neutral centroid, mid-focused, not as scooped as expected.
      - g12-65 (G12-65): Warm, punchy, neutral centroid.
      - g12h30-anniversary (G12H30 Anniversary): Tight bass, moderately bright.
      - celestion-cream (Celestion Cream): Alnico warmth, moderately bright.
      - ga12-sc64 (GA12-SC64): Dark vintage American, very mid-heavy.
      - g10-sc64 (G10-SC64): 10" Eminence, avg centroid ~2488Hz. Brighter than GA12 — much more presence energy (21% vs GA12's 8%), similar mid (35%), less HiMid (32% vs GA12's 48%), more bass (4.3% vs 2.1%). HiMid/Mid ratio near 1.0 (balanced) vs GA12's 1.55 (HiMid-dominant). Smaller cone = positions closer together, differences more subtle. Quicker transient, earlier breakup.
      - karnivore (Eminence Karnivore): Very mid-focused, tight bass, low presence, dark voicing. Modern high-gain metal.
      
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
      - Cap_Cone_Tr: Smooth cone immediately past the cap edge, transition zone
      - Cone: True mid-cone position, further out from the cap edge, ribs allowed, darkest/warmest
      - Blend: ONLY for blend/multi-mic setups (SM57+R121 blends, Fredman). NEVER use for single mics.${genre ? `
      
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
            "position": "Cap|Cap_OffCenter|CapEdge|CapEdge_BR|CapEdge_DK|Cap_Cone_Tr|Cone|Blend",
            "distance": "distance in inches as string (e.g. '1' or '2.5')",
            "blendRatio": "ONLY for SM57+R121 Blend shots: recommended voicing and ratio, e.g. 'Tight (67:33)' or 'Smooth (45:55)'. Omit for non-blend mics.",
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

      if (existingShots && existingShots.length > 0) {
        const avgCentroid = existingShots.reduce((sum, s) => sum + s.centroid, 0) / existingShots.length;
        const avgRatio = existingShots.reduce((sum, s) => sum + s.ratio, 0) / existingShots.length;
        const avgBands = {
          subBass: existingShots.reduce((sum, s) => sum + s.subBass, 0) / existingShots.length,
          bass: existingShots.reduce((sum, s) => sum + s.bass, 0) / existingShots.length,
          lowMid: existingShots.reduce((sum, s) => sum + s.lowMid, 0) / existingShots.length,
          mid: existingShots.reduce((sum, s) => sum + s.mid, 0) / existingShots.length,
          highMid: existingShots.reduce((sum, s) => sum + s.highMid, 0) / existingShots.length,
          presence: existingShots.reduce((sum, s) => sum + s.presence, 0) / existingShots.length,
        };
        userMessage += `\n\n=== EXISTING SHOTS THE USER ALREADY HAS (WITH TONAL ANALYSIS) ===
The user already has ${existingShots.length} shots recorded. Each has been analyzed for its tonal content.

COLLECTION TONAL SUMMARY:
- Average centroid: ${Math.round(avgCentroid)}Hz (${avgCentroid < 2700 ? 'dark/warm' : avgCentroid < 3100 ? 'balanced' : 'bright/present'})
- Average HiMid/Mid ratio: ${avgRatio.toFixed(2)} (${avgRatio < 1.0 ? 'mid-heavy/warm' : avgRatio < 1.5 ? 'balanced' : 'bright/cutting'})
- Average band distribution: SubBass ${avgBands.subBass.toFixed(1)}% | Bass ${avgBands.bass.toFixed(1)}% | LowMid ${avgBands.lowMid.toFixed(1)}% | Mid ${avgBands.mid.toFixed(1)}% | HiMid ${avgBands.highMid.toFixed(1)}% | Presence ${avgBands.presence.toFixed(1)}%

INDIVIDUAL SHOTS (6-band % | HiMid/Mid ratio | centroid):
${existingShots.map(s => `- ${s.filename}: [${s.subBass}|${s.bass}|${s.lowMid}|${s.mid}|${s.highMid}|${s.presence}] ratio=${s.ratio} centroid=${s.centroid}Hz smooth=${s.smoothness}`).join('\n')}

CRITICAL INSTRUCTIONS FOR GAP-FILLING:
1. DO NOT suggest shots that duplicate mic+position+distance combos the user already has
2. Study the TONAL DATA above to understand exactly what frequency territory is covered
3. Identify tonal gaps: If the collection is heavy on bright/present shots (high centroid, high presence%), suggest warmer positions. If it's warm-heavy, suggest brighter placements
4. Look at the HiMid/Mid ratio spread: if all shots cluster in a narrow ratio range, suggest combos that extend the range
5. Consider centroid diversity: suggest positions/distances that would produce centroids in ranges NOT already represented
6. For blend suggestions: recommend blends whose expected tonal character fills gaps the single-mic shots don't cover
7. In your rationale, specifically reference the tonal data to explain WHY each suggestion fills a gap`;
      }
      
      if (positionInstruction) {
        userMessage += positionInstruction;
      }

      try {
        const signals = await storage.getPreferenceSignals();
        if (signals.length >= 5) {
          const learned = await computeLearnedProfile(signals);
          const gearPrompt = buildGearPreferencePrompt(learned, micType, speakerModel);
          if (gearPrompt) {
            userMessage += gearPrompt;
          }
        }
        const vocabPrompt = buildUserVocabularyPrompt(signals);
        if (vocabPrompt) {
          userMessage += vocabPrompt;
        }
      } catch (e) {
        console.log('[Recommendations] Could not load gear preferences:', e);
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
      const { speakerModel, genre, preferredShots, targetShotCount, basicPositionsOnly, singleDistancePerMic, singlePositionForRibbons, micShotCounts, existingShots } = input;
      
      console.log(`[Recommendations] Speaker-only request: speaker=${speakerModel}, genre=${genre || 'none'}, targetShots=${targetShotCount || 'default'}, existingShots=${existingShots ? existingShots.length + ' files: ' + existingShots.map(s => `${s.filename}(c${Math.round(s.centroid)})`).join(', ') : 'none'}`);
      
      // Build position restriction instruction
      let positionInstruction = '';
      if (basicPositionsOnly) {
        positionInstruction = `\n\nPOSITION RESTRICTION: ONLY use these 4 basic positions: Cap, CapEdge, Cap_Cone_Tr, Cone.
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
- Vary POSITION (Cap, CapEdge, Cap_Cone_Tr, Cone) for tonal variety, NOT distance
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
      - 421 (MD421): range 1-4", SWEET SPOT 2". Large diaphragm, scooped mids, punchy low-end, wider frequency range. DIFFERENT from MD421K.
      - 421k (MD421K): range 1-4", SWEET SPOT 2". Compact (Kompakt) variant, tighter midrange focus, slightly less low-end. DIFFERENT from MD421.
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
      
      BLEND SETUPS (SM57 + R121, position is always "Blend"):
      These are dual-mic setups where SM57 and R121 are blended together.
      The SM57 is typically close-miked (1-2") at CapEdge, the R121 is further back (4-6") at Cap.
      The "distance" in a blend shot refers to the R121's distance from the speaker — the SM57 stays at its sweet spot.
      - sm57_r121_blend (SM57+R121 Blend): The app recommends the best ratio and voicing for each shot. Range 4-6".
        Available voicings (YOU choose the best one per shot based on genre, speaker, and distance):
        - Tight (67:33 SM57:R121): SM57-dominant — punchy, aggressive, more bite and high-mid cut
        - Balance (60:40 SM57:R121): Even mix — SM57 attack with R121 warmth smoothing the top end
        - Thick (51:49 SM57:R121): Near-equal — full-bodied, thickened mids, slightly less bite
        - Smooth (45:55 SM57:R121): R121-leaning — rounded highs, warm midrange, less harsh transients
        - Ribbon Dom (24:76 SM57:R121): Ribbon-dominant — dark, warm, smooth top end, big low-mids
        For each blend shot, include a "blendRatio" field with your recommended voicing label and ratio (e.g. "Tight (67:33)").
      
      FREDMAN TECHNIQUE (Dual SM57, position is always "Blend"):
      - fredman (Fredman): Two SM57s aimed at the speaker, one on-axis and one off-axis (angled ~45°), blended 50:50. Classic Meshuggah/Fredrik Thordendal technique. Produces tight, focused, mid-heavy tone with reduced fizz. Both mics at same distance. Range 0.5-2", SWEET SPOT 1".
      
      IMPORTANT FOR BLEND SHOTS:
      - Position MUST always be "Blend" — never Cap, CapEdge, etc.
      - For SM57+R121 blends, the distance refers to the R121 placement. The SM57 is fixed at its sweet spot.
      - For SM57+R121 blends, YOU must recommend the best blend ratio/voicing for each shot and include it in "blendRatio" field.
      - For Fredman, the distance is where both SM57s are placed.
      - Vary DISTANCE for tonal variety across blend shots, not position.
      
      Available Positions:
      - Cap: Dead center of the dust cap, brightest, most high-end detail
      - Cap_OffCenter: Small lateral offset from Cap, still fully on the dust cap, less harsh attack
      - CapEdge: Seam line where the dust cap meets the cone, balanced tone, often the "sweet spot"
      - CapEdge_BR: CapEdge favoring the cap side of the seam, brighter
      - CapEdge_DK: CapEdge favoring the cone side of the seam, darker/warmer
      - Cap_Cone_Tr: Smooth cone immediately past the cap edge, transition zone
      - Cone: True mid-cone position, further out from the cap edge, ribs allowed, darkest/warmest
      - Blend: ONLY for blend/multi-mic setups (SM57+R121 blends, Fredman). NEVER use for single mics.
      
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
            "mic": "mic code (e.g. '57', '121', 'md441', 'e906', 'roswell-cab', 'sm57_r121_blend')",
            "micLabel": "Display name - MUST include switch setting for MD441/e906: 'MD441 (Presence)', 'MD441 (Flat)', 'e906 (Presence)', 'e906 (Flat)'",
            "position": "Cap|Cap_OffCenter|CapEdge|CapEdge_BR|CapEdge_DK|Cap_Cone_Tr|Cone|Blend",
            "distance": "distance in inches as string (e.g. '1' or '2.5')",
            "blendRatio": "ONLY for SM57+R121 Blend shots: recommended voicing and ratio, e.g. 'Tight (67:33)' or 'Smooth (45:55)'. Omit for non-blend mics.",
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

      if (existingShots && existingShots.length > 0) {
        const avgCentroid = existingShots.reduce((sum, s) => sum + s.centroid, 0) / existingShots.length;
        const avgRatio = existingShots.reduce((sum, s) => sum + s.ratio, 0) / existingShots.length;
        const avgBands = {
          subBass: existingShots.reduce((sum, s) => sum + s.subBass, 0) / existingShots.length,
          bass: existingShots.reduce((sum, s) => sum + s.bass, 0) / existingShots.length,
          lowMid: existingShots.reduce((sum, s) => sum + s.lowMid, 0) / existingShots.length,
          mid: existingShots.reduce((sum, s) => sum + s.mid, 0) / existingShots.length,
          highMid: existingShots.reduce((sum, s) => sum + s.highMid, 0) / existingShots.length,
          presence: existingShots.reduce((sum, s) => sum + s.presence, 0) / existingShots.length,
        };
        userMessage += `\n\n=== EXISTING SHOTS THE USER ALREADY HAS (WITH TONAL ANALYSIS) ===
The user already has ${existingShots.length} shots recorded. Each has been analyzed for its tonal content.

COLLECTION TONAL SUMMARY:
- Average centroid: ${Math.round(avgCentroid)}Hz (${avgCentroid < 2700 ? 'dark/warm' : avgCentroid < 3100 ? 'balanced' : 'bright/present'})
- Average HiMid/Mid ratio: ${avgRatio.toFixed(2)} (${avgRatio < 1.0 ? 'mid-heavy/warm' : avgRatio < 1.5 ? 'balanced' : 'bright/cutting'})
- Average band distribution: SubBass ${avgBands.subBass.toFixed(1)}% | Bass ${avgBands.bass.toFixed(1)}% | LowMid ${avgBands.lowMid.toFixed(1)}% | Mid ${avgBands.mid.toFixed(1)}% | HiMid ${avgBands.highMid.toFixed(1)}% | Presence ${avgBands.presence.toFixed(1)}%

INDIVIDUAL SHOTS (6-band % | HiMid/Mid ratio | centroid):
${existingShots.map(s => `- ${s.filename}: [${s.subBass}|${s.bass}|${s.lowMid}|${s.mid}|${s.highMid}|${s.presence}] ratio=${s.ratio} centroid=${s.centroid}Hz smooth=${s.smoothness}`).join('\n')}

CRITICAL INSTRUCTIONS FOR GAP-FILLING:
1. DO NOT suggest shots that duplicate mic+position+distance combos the user already has
2. Study the TONAL DATA above to understand exactly what frequency territory is covered
3. Identify tonal gaps: If the collection is heavy on bright/present shots (high centroid, high presence%), suggest warmer positions/mics. If it's warm-heavy, suggest brighter placements
4. Look at the HiMid/Mid ratio spread: if all shots cluster in a narrow ratio range, suggest combos that extend the range
5. Consider centroid diversity: suggest positions/distances that would produce centroids in ranges NOT already represented
6. For blend suggestions: recommend blends whose expected tonal character fills gaps the single-mic shots don't cover
7. In your rationale, specifically reference the tonal data to explain WHY each suggestion fills a gap
8. If the user has set a target shot count, that means they want that many ADDITIONAL shots beyond what they already have`;
      }
      
      if (positionInstruction) {
        userMessage += positionInstruction;
      }

      try {
        const signals = await storage.getPreferenceSignals();
        if (signals.length >= 5) {
          const learned = await computeLearnedProfile(signals);
          const gearPrompt = buildGearPreferencePrompt(learned, undefined, speakerModel);
          if (gearPrompt) {
            userMessage += gearPrompt;
          }
        }
        const vocabPrompt = buildUserVocabularyPrompt(signals);
        if (vocabPrompt) {
          userMessage += vocabPrompt;
        }
      } catch (e) {
        console.log('[BySpeaker Recommendations] Could not load gear preferences:', e);
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
- [1D] = Use the SAME distance for all shots of that mic, but VARY the position (e.g., CapEdge at 4", Cap_Cone_Tr at 4")
- [1P] = Use the SAME position for all shots of that mic, but VARY the distance (e.g., Cap at 4", Cap at 6")
- If no constraint is listed, you can vary both position and distance

MIC KNOWLEDGE (use this for positioning decisions):
- R121: Ribbon mic, smooth/warm, works 3-8" back, sounds great at CapEdge or Cap_Cone_Tr
- M160: Hypercardioid ribbon, tight pattern, works 1-4" close, CapEdge is sweet spot
- MD421: Dynamic, large diaphragm, scooped mids, punchy low-end, wider frequency range than SM57. Works 1-4" close, CapEdge or Cap. DIFFERENT from MD421K.
- MD421K: Dynamic, compact (Kompakt) variant. Tighter midrange focus, slightly less low-end than MD421. Works 1-4" close, CapEdge or Cap. DIFFERENT from MD421.
- MD441: Dynamic with switches - Presence (brighter) or Flat (natural), works 2-6", CapEdge ideal
- e906: Dynamic with switches - Bright/Presence/Flat, works 0.5-2" very close, Cap or CapEdge
- SM57: Classic dynamic, works 0.5-2" close, any position works
- M201: Smooth dynamic, works 1-3" close, CapEdge or Cap_Cone_Tr
- C414: Condenser, detailed, works 4-8" back, CapEdge or Cap positions
- PR30: Ribbon, bright for a ribbon, works 0.5-2" close, Cap or CapEdge

CRITICAL FORMAT RULES:
- position MUST be one of: Cap, CapEdge, Cap_Cone_Tr, Cone
- distance MUST be a number as string: "1", "2.5", "4"
- mic codes: 121 (R121), 160 (M160), md421 (MD421), md421k (MD421K), md441 (MD441), e906, 57, etc.
- MD421 and MD421K are DIFFERENT mics. Never substitute one for the other. Respect which one the user requested.
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
              if (micName.includes('421K') || micName.includes('421k') || micName.includes('Kompakt')) micCode = 'md421k';
              else if (micName.includes('421') && !micName.includes('441')) micCode = 'md421';
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
- R121: Ribbon, smooth/warm, works 3-8" back, CapEdge or Cap_Cone_Tr
- M160: Hypercardioid ribbon, works 1-4" close, CapEdge is sweet spot
- MD421: Dynamic, large diaphragm, scooped mids, punchy low-end. Works 1-4" close, CapEdge or Cap. DIFFERENT from MD421K.
- MD421K: Dynamic, compact (Kompakt). Tighter midrange, slightly brighter. Works 1-4" close, CapEdge or Cap. DIFFERENT from MD421.
- MD441: Dynamic with Presence/Flat switch, works 2-6", CapEdge ideal
- e906: Dynamic with Bright/Presence/Flat switch, works 0.5-2" very close
- SM57: Classic dynamic, works 0.5-2" close, any position
- M201: Smooth dynamic, works 1-3" close, CapEdge or Cap_Cone_Tr
- C414: Condenser, detailed, works 4-8" back, CapEdge or Cap
- PR30: Ribbon, bright, works 0.5-2" close, Cap or CapEdge
- Roswell: Large diaphragm condenser, works 4-6", Cap position, vary distance

Each shot must have a DIFFERENT mic+position+distance combination.

CRITICAL FORMAT RULES:
- position MUST be one of: Cap, CapEdge, Cap_Cone_Tr, Cone
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
            
            // Normalize MD421K variants
            if (shot.micLabel === 'MD421K' || shot.micLabel === 'md421k' || shot.micLabel === 'MD421 Kompakt') {
              shot.micLabel = 'MD421K';
              shot.mic = 'md421k';
            }
          }
          
          // Normalize mic codes for MD421 and MD421K - keep them SEPARATE
          if (shot.mic === '421' && !shot.micLabel?.includes('421K')) {
            shot.mic = 'md421';
            if (!shot.micLabel) shot.micLabel = 'MD421';
          }
          if (shot.mic === '421k' || (shot.mic === '421' && shot.micLabel?.includes('421K'))) {
            shot.mic = 'md421k';
            shot.micLabel = 'MD421K';
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
          const non1PMics = ['57', 'md421', 'md421k', 'md441', 'm160', 'm201', 'e906'];
          const positions = basicPositionsOnly 
            ? ['Cap', 'CapEdge', 'Cap_Cone_Tr', 'Cone']
            : ['Cap', 'CapEdge', 'Cap_Cone_Tr', 'Cone', 'Cone_Edge'];
          
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
                  'md421': 'scooped mids, punchy low-end',
                  'md421k': 'tighter mids, articulate and punchy',
                  'md441': 'detailed presence with EQ flexibility',
                  'm160': 'focused hypercardioid ribbon tone',
                  'm201': 'smooth natural midrange',
                  'e906': 'aggressive attack with switchable voicing',
                  'pr30': 'bright dynamic with extended highs',
                };
                const posTraits: Record<string, string> = {
                  'Cap': 'bright focused attack',
                  'CapEdge': 'balanced tone with clarity',
                  'Cap_Cone_Tr': 'warmer with added body',
                  'Cone': 'smooth warmth with reduced harshness',
                };
                const micTrait = micTraits[mic.toLowerCase()] || 'versatile tonal character';
                const posTrait = posTraits[pos] || 'balanced response';
                
                const posEffect = pos === 'Cap' ? '3-5kHz presence emphasis' :
                                 pos === 'CapEdge' ? 'balanced 2-4kHz midrange' :
                                 pos === 'Cap_Cone_Tr' ? 'reduced 3kHz, fuller 200-400Hz' :
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
              'md421': { type: 'dynamic', character: 'scooped mids with punchy low-end', strength: 'wide frequency range, fills out low-end' },
              'md421k': { type: 'dynamic', character: 'tighter midrange focus', strength: 'articulate and punchy, compact form factor' },
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
              'Cap_Cone_Tr': { tone: 'warmer with body', use: 'fills out thin tones' },
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
                             position === 'Cap_Cone_Tr' ? 'reduced 3kHz, fuller 200-400Hz' :
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
            'md421': { label: 'MD421', distances: ['2', '1.5', '1', '3'], is1P: false },          // sweet 2"
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
            ? ['Cap', 'CapEdge', 'Cap_Cone_Tr', 'Cone']
            : ['Cap', 'CapEdge', 'Cap_Cone_Tr', 'Cone', 'Cone_Edge'];
          
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
                  ? ['Cap', 'CapEdge', 'Cap_Cone_Tr', 'Cone']
                  : ['Cap', 'CapEdge', 'Cap_Cone_Tr', 'Cone', 'Cone_Edge'];
                
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
              ? ['Cap', 'CapEdge', 'Cap_Cone_Tr', 'Cone']
              : ['Cap', 'CapEdge', 'Cap_Cone_Tr', 'Cone'];
            
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
          '57': '57', 'sm57': '57', 'md421k': 'md421k', 'md421': 'md421', '421': 'md421', '421k': 'md421k',
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
        positionInstruction = `\n\nPOSITION RESTRICTION NOTE: When this speaker is used for IR production, the user wants to limit positions to: Cap, CapEdge, Cap_Cone_Tr, Cone only.`;
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
      - v30-blackcat (V30 Black Cat): Much darker than standard V30, smoother mids. Measured centroid ~2550 Hz.
      - g12m25 (Celestion G12M-25 Greenback): Classic woody, mid-forward, compression at high volume. THE vintage British sound - Led Zeppelin, AC/DC. Measured bright at centroid ~3017 Hz.
      - g12t75 (Celestion G12T-75): Near-neutral centroid (~2582 Hz), mid-focused. Not as scooped as traditionally described. Mesa Boogie staple.
      - g12-65 (Celestion G12-65): Warm, punchy, neutral centroid (~2596 Hz). Heritage/reissue of the classic 60s speaker.
      - g12h30-anniversary (Celestion G12H30 Anniversary): Tight bass, moderately bright (~2873 Hz). Classic 70s rock tone.
      - celestion-cream (Celestion Cream): Alnico warmth, moderately bright (~2887 Hz). Creamy breakup, touch-sensitive, boutique.
      - ga12-sc64 (Eminence GA-SC64 12"): Dark vintage American, very mid-heavy (~2350 Hz). Fender Deluxe/Princeton vibe.
      - g10-sc64 (Eminence GA-SC64 10"): 10" Eminence, avg centroid ~2488Hz. Much more presence (21%) than GA12 (8%), similar mid (35%), less HiMid (32% vs 48%), more bass (4.3%). Ratio ~1.0 (balanced HiMid/Mid). Smaller cone, quicker transient, earlier breakup. Princeton/small combo vibe.
      - k100 (Celestion G12K-100): Big low end, moderately bright (~2770 Hz). High headroom, modern voicing.
      - karnivore (Eminence Karnivore): Very mid-focused (35%+ mid energy), tight bass, low presence (~14%), darkest speaker measured at avg centroid 2465 Hz. Modern high-gain metal. Co-designed with Kristian Kohle.
      
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

      try {
        const signals = await storage.getPreferenceSignals();
        if (signals.length >= 5) {
          const learned = await computeLearnedProfile(signals);
          const gearPrompt = buildGearPreferencePrompt(learned);
          if (gearPrompt) {
            userMessage += gearPrompt;
          }
        }
      } catch (e) {
        console.log('[ByAmp Recommendations] Could not load gear preferences:', e);
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
        positionInstruction = `\n\nPOSITION RESTRICTION: ONLY use these 4 basic positions: Cap, CapEdge, Cap_Cone_Tr, Cone.
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
- Vary POSITION (Cap, CapEdge, Cap_Cone_Tr, Cone) to create tonal variety, NOT distance
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
      - GA12-SC64, GA10-SC64, K100 (G12K-100), G12T75 (G12T-75), Karnivore
      
      Mic Shorthand:
      - SM57, R121, R10, MD421, MD421K (or MD421Kompakt), M201, M88, Roswell, M160, e906, C414, R92, PR30
      - IMPORTANT: MD421 and MD421K (Kompakt) are DIFFERENT mics - do NOT substitute one for the other
      - Variants: MD441 and e906 have _Presence or _Flat suffixes
      
      Position Format:
      - Simple: Cap, Cone, CapEdge
      - Complex: Cap_OffCenter, CapEdge_BR, CapEdge_DK, Cap_Cone_Tr
      
      Position Definitions:
      - Cap: Dead center of the dust cap
      - Cap_OffCenter: Small lateral offset from Cap, still fully on the dust cap
      - CapEdge: Seam line where the dust cap meets the cone
      - CapEdge_BR: CapEdge favoring the cap side of the seam (brighter)
      - CapEdge_DK: CapEdge favoring the cone side of the seam (darker)
      - Cap_Cone_Tr: Smooth cone immediately past the cap edge (transition zone)
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
      - Cap_Cone_Tr: Smooth cone past cap edge, transition zone
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

  // Lightweight band normalization endpoint (no AI calls)
  // Used by the Learner module to get server-consistent band percentages
  app.post(api.normalizeBands.normalize.path, async (req, res) => {
    try {
      const input = api.normalizeBands.normalize.input.parse(req.body);
      const results = input.irs.map(ir => {
        const total = (ir.subBassEnergy + ir.bassEnergy + ir.lowMidEnergy + ir.midEnergy6 + ir.highMidEnergy + ir.presenceEnergy + (ir.ultraHighEnergy || 0)) || 1;
        return {
          filename: ir.filename,
          subBassPercent: Math.round((ir.subBassEnergy / total) * 1000) / 10,
          bassPercent: Math.round((ir.bassEnergy / total) * 1000) / 10,
          lowMidPercent: Math.round((ir.lowMidEnergy / total) * 1000) / 10,
          midPercent: Math.round((ir.midEnergy6 / total) * 1000) / 10,
          highMidPercent: Math.round((ir.highMidEnergy / total) * 1000) / 10,
          presencePercent: Math.round((ir.presenceEnergy / total) * 1000) / 10,
          airPercent: ir.ultraHighEnergy ? Math.round((ir.ultraHighEnergy / total) * 1000) / 10 : 0,
          highMidMidRatio: ir.midEnergy6 > 0 ? Math.round((ir.highMidEnergy / ir.midEnergy6) * 100) / 100 : 0,
          spectralCentroidHz: ir.spectralCentroid ?? 0,
          spectralTiltDbPerOct: ir.spectralTilt ?? 0,
          rolloffFreq: ir.rolloffFreq ?? 0,
          smoothScore: ir.smoothScore ?? 0,
        };
      });
      res.json({ results });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to normalize bands" });
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
      const batchSignals = await storage.getPreferenceSignals();
      const batchVocabPrompt = buildUserVocabularyPrompt(batchSignals, true);
      const scoredResults = await Promise.all(
        irs.map(async (ir) => {
          const scored = await scoreSingleIR(ir, batchVocabPrompt);
          
          // Calculate 6-band percentages if available
          const has6Band = ir.subBassEnergy !== undefined;
          let sixBandPercents: {
            subBassPercent?: number;
            bassPercent?: number;
            lowMidPercent?: number;
            midPercent?: number;
            highMidPercent?: number;
            presencePercent?: number;
            ultraHighPercent?: number;
            highMidMidRatio?: number;
          } = {};
          
          if (has6Band) {
            const total = (ir.subBassEnergy! + ir.bassEnergy! + ir.lowMidEnergy! + ir.midEnergy6! + ir.highMidEnergy! + ir.presenceEnergy! + (ir.ultraHighEnergy || 0)) || 1;
            sixBandPercents = {
              subBassPercent: Math.round((ir.subBassEnergy! / total) * 1000) / 10,
              bassPercent: Math.round((ir.bassEnergy! / total) * 1000) / 10,
              lowMidPercent: Math.round((ir.lowMidEnergy! / total) * 1000) / 10,
              midPercent: Math.round((ir.midEnergy6! / total) * 1000) / 10,
              highMidPercent: Math.round((ir.highMidEnergy! / total) * 1000) / 10,
              presencePercent: Math.round((ir.presenceEnergy! / total) * 1000) / 10,
              ultraHighPercent: ir.ultraHighEnergy ? Math.round((ir.ultraHighEnergy / total) * 1000) / 10 : 0,
              highMidMidRatio: ir.midEnergy6! > 0 ? Math.round((ir.highMidEnergy! / ir.midEnergy6!) * 100) / 100 : 0,
            };
          }
          
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
            frequencySmoothness: scored.frequencySmoothness,
            noiseFloorDb: scored.noiseFloorDb,
            spectralCentroid: ir.spectralCentroid ?? 0,
            spectralTilt: ir.spectralTilt ?? null,
            rolloffFreq: ir.rolloffFreq ?? null,
            smoothScore: ir.smoothScore ?? null,
            maxNotchDepth: ir.maxNotchDepth ?? null,
            notchCount: ir.notchCount ?? null,
            tailLevelDb: ir.tailLevelDb ?? null,
            tailStatus: ir.tailStatus ?? null,
            ...sixBandPercents,
          };
        })
      );

      // Calculate average score
      const totalScore = scoredResults.reduce((sum, r) => sum + r.score, 0);
      const averageScore = Math.round(totalScore / scoredResults.length);

      // Save tonal profiles for IRs with parseable filenames and 6-band data
      const profilesToSave: { mic: string; position: string; distance: string; speaker: string; subBass: number; bass: number; lowMid: number; mid: number; highMid: number; presence: number; ratio: number; centroid: number; smoothness: number }[] = [];
      for (let i = 0; i < scoredResults.length; i++) {
        const r = scoredResults[i];
        const ir = irs[i];
        const pi = r.parsedInfo;
        if (pi?.mic && pi?.position && pi?.distance && pi?.speaker && r.midPercent != null && r.highMidPercent != null) {
          profilesToSave.push({
            mic: pi.mic,
            position: pi.position,
            distance: pi.distance,
            speaker: pi.speaker,
            subBass: r.subBassPercent ?? 0,
            bass: r.bassPercent ?? 0,
            lowMid: r.lowMidPercent ?? 0,
            mid: r.midPercent ?? 0,
            highMid: r.highMidPercent ?? 0,
            presence: r.presencePercent ?? 0,
            ratio: r.highMidMidRatio ?? 0,
            centroid: ir.spectralCentroid,
            smoothness: ir.smoothScore ?? ir.frequencySmoothness ?? 0,
          });
        }
      }
      if (profilesToSave.length > 0) {
        try {
          const saved = await storage.upsertTonalProfiles(profilesToSave);
          console.log(`[Tonal Intelligence] Saved ${saved} tonal profiles from batch of ${irs.length} IRs`);
        } catch (profileErr) {
          console.error('[Tonal Intelligence] Failed to save profiles (non-fatal):', profileErr);
        }
      }

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

  // ── Preference Signals ──────────────────────────────────
  app.post(api.preferences.submit.path, async (req, res) => {
    try {
      const { signals } = api.preferences.submit.input.parse(req.body);
      const created = await storage.createPreferenceSignals(signals);
      res.status(201).json({ count: created.length });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      console.error('Preference signal error:', err);
      res.status(500).json({ message: "Failed to store preference signals" });
    }
  });

  app.get(api.preferences.list.path, async (_req, res) => {
    try {
      const signals = await storage.getPreferenceSignals();
      res.json(signals);
    } catch (err) {
      console.error('Preference list error:', err);
      res.status(500).json({ message: "Failed to retrieve preference signals" });
    }
  });

  app.delete(api.preferences.clearSpeaker.path, async (req, res) => {
    try {
      const { speakerPrefix } = api.preferences.clearSpeaker.input.parse(req.body);
      const deleted = await storage.deletePreferenceSignalsBySpeaker(speakerPrefix);
      res.json({ deleted });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      console.error('Clear speaker signals error:', err);
      res.status(500).json({ message: "Failed to clear speaker signals" });
    }
  });

  app.get(api.preferences.learned.path, async (_req, res) => {
    try {
      const signals = await storage.getPreferenceSignals();
      const learned = await computeLearnedProfile(signals);
      res.json(learned);
    } catch (err) {
      console.error('Learned profile error:', err);
      res.status(500).json({ message: "Failed to compute learned profile" });
    }
  });

  // ── Preference Correction ────────────────────────
  app.post(api.preferences.correct.path, async (req, res) => {
    try {
      const { correctionText } = api.preferences.correct.input.parse(req.body);

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a guitar tone expert. The user is correcting the system's understanding of their tonal preferences.
Interpret their correction and produce structured tonal nudges.

Band definitions (percentages of total energy):
- subBass: 20-120Hz (rumble, sub)
- bass: 120-250Hz (low-end weight, proximity)
- lowMid: 250-500Hz (warmth, body, mud zone)
- mid: 500-2000Hz (body, fundamental, punch)
- highMid: 2000-4000Hz (bite, articulation, cut)
- presence: 4000-8000Hz (sizzle, air, brightness)
- ratio: highMid/mid (>1.5 = bright/scooped, <1.2 = warm/mid-heavy)

The user's correction tells you what the system got WRONG. Produce nudges that push the learned profile in the CORRECT direction.
For example: "I actually prefer darker tones" => reduce presence and highMid, increase mid.
"I don't like scooped mids" => increase mid, reduce ratio.

Return JSON:
{
  "subBass": number (-5 to 5),
  "bass": number (-5 to 5),
  "lowMid": number (-5 to 5),
  "mid": number (-8 to 8),
  "highMid": number (-8 to 8),
  "presence": number (-8 to 8),
  "ratio": number (-0.5 to 0.5),
  "strength": number (1.0 to 3.0, how strong the correction should be),
  "summary": string (1-2 sentence explanation of the correction applied)
}

Use larger values than normal -- corrections should have strong impact since the user is explicitly telling us we're wrong.`
          },
          { role: "user", content: `The user says: "${correctionText}"\n\nInterpret this correction and return tonal adjustment nudges as JSON.` }
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      });

      const content = aiResponse.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ message: "AI returned no response" });
      }

      const parsed = JSON.parse(content);
      const nudges = {
        subBass: Math.max(-5, Math.min(5, parsed.subBass ?? 0)),
        bass: Math.max(-5, Math.min(5, parsed.bass ?? 0)),
        lowMid: Math.max(-5, Math.min(5, parsed.lowMid ?? 0)),
        mid: Math.max(-8, Math.min(8, parsed.mid ?? 0)),
        highMid: Math.max(-8, Math.min(8, parsed.highMid ?? 0)),
        presence: Math.max(-8, Math.min(8, parsed.presence ?? 0)),
        ratio: Math.max(-0.5, Math.min(0.5, parsed.ratio ?? 0)),
        strength: Math.max(1.0, Math.min(3.0, parsed.strength ?? 2.0)),
      };
      const summary = parsed.summary ?? "Correction applied.";

      const correctionSignal = {
        action: "correction",
        feedback: null,
        feedbackText: correctionText,
        baseFilename: "__correction__",
        featureFilename: "__correction__",
        subBass: 25 + nudges.subBass * nudges.strength,
        bass: 25 + nudges.bass * nudges.strength,
        lowMid: 25 + nudges.lowMid * nudges.strength,
        mid: 28 + nudges.mid * nudges.strength,
        highMid: 39 + nudges.highMid * nudges.strength,
        presence: 23 + nudges.presence * nudges.strength,
        ratio: 1.4 + nudges.ratio * nudges.strength,
        score: 100,
        profileMatch: "Featured",
        blendRatio: null,
      };

      await storage.createPreferenceSignal(correctionSignal);

      textFeedbackCache.clear();

      console.log(`[Correction] Applied: "${correctionText}" => ${summary}`);
      res.json({ applied: true, summary });
    } catch (err) {
      console.error('Correction error:', err);
      res.status(500).json({ message: "Failed to apply correction" });
    }
  });

  // ── Tone Request (find blends matching a described tone) ────────────────────────
  app.post(api.preferences.toneRequest.path, async (req, res) => {
    try {
      const { toneDescription, irs } = api.preferences.toneRequest.input.parse(req.body);

      if (irs.length < 2) {
        return res.status(400).json({ message: "Need at least 2 IRs to suggest blends" });
      }

      const irSummary = irs.map(ir =>
        `${ir.filename}: subBass=${ir.subBass.toFixed(1)}% bass=${ir.bass.toFixed(1)}% lowMid=${ir.lowMid.toFixed(1)}% mid=${ir.mid.toFixed(1)}% highMid=${ir.highMid.toFixed(1)}% presence=${ir.presence.toFixed(1)}% ratio=${ir.ratio.toFixed(2)} centroid=${Math.round(ir.centroid)}Hz smooth=${ir.smoothness.toFixed(0)}`
      ).join('\n');

      let learnedContext = "";
      try {
        const signals = await storage.getPreferenceSignals();
        if (signals.length > 0) {
          const learned = await computeLearnedProfile(signals);
          if (learned.tonalSummary) {
            learnedContext = `\n\n=== USER'S LEARNED TONAL PREFERENCES ===\n${learned.tonalSummary}\n===\nUse this context to better understand what the user means by their tone description. Their vocabulary and references should be interpreted through the lens of their learned preferences.`;
          }
          const gearPrompt = buildGearPreferencePrompt(learned);
          if (gearPrompt) learnedContext += `\n${gearPrompt}`;
        }
      } catch (e) {
        console.log('[ToneRequest] Could not load preferences:', e);
      }

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a guitar tone expert helping a user find IR blend combinations that match a described tone.

You have a list of IRs with their 6-band tonal data. The user describes the tone they want in plain language.
Your job: suggest 3-5 specific blend combinations (base IR + feature IR at a specific ratio) that would best achieve the described tone.

Band definitions:
- subBass (20-120Hz): rumble, sub-lows
- bass (120-250Hz): low-end weight, proximity effect
- lowMid (250-500Hz): warmth, body, can get muddy
- mid (500-2000Hz): body, fundamental guitar tone, punch
- highMid (2000-4000Hz): bite, articulation, cut, aggression
- presence (4000-8000Hz): sizzle, air, brightness, sparkle
- ratio (highMid/mid): >1.5 = bright/scooped, <1.2 = warm/mid-heavy

When blending IRs, a ratio like 55/45 means 55% base, 45% feature. The resulting tone is approximately a weighted average of the two IRs' band values.

Consider:
1. Which IR would make the best BASE (foundation) for this tone
2. Which IR would add the desired CHARACTER as the feature
3. What ratio would achieve the right balance
4. Why this combination works for the requested tone

Return JSON:
{
  "suggestions": [
    {
      "baseIR": "filename of base IR",
      "featureIR": "filename of feature IR",
      "ratio": "55/45" (base/feature format),
      "expectedTone": "brief description of what this blend would sound like",
      "reasoning": "why this combination achieves the requested tone",
      "confidence": number (0.0 to 1.0, how well this matches the request)
    }
  ],
  "interpretation": "1-2 sentence summary of how you interpreted the user's tone request and what tonal characteristics you targeted"
}

Suggest 3-5 combinations, ranked by confidence. Use different base/feature combinations for variety.
Do NOT suggest blending an IR with itself.`
          },
          {
            role: "user",
            content: `The user wants this tone: "${toneDescription}"

Available IRs and their tonal data:
${irSummary}
${learnedContext}

Suggest the best blend combinations to achieve this tone. Return as JSON.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = aiResponse.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ message: "AI returned no response" });
      }

      const result = JSON.parse(content);
      console.log(`[ToneRequest] "${toneDescription}" => ${result.suggestions?.length ?? 0} suggestions`);
      res.json(result);
    } catch (err) {
      console.error('Tone request error:', err);
      res.status(500).json({ message: "Failed to process tone request" });
    }
  });

  // ── Test AI (Tonal Classification) ────────────────────────
  app.post(api.preferences.testAI.path, async (req, res) => {
    try {
      const { query, irs } = api.preferences.testAI.input.parse(req.body);

      if (irs.length < 1) {
        return res.status(400).json({ message: "Need at least 1 IR to test" });
      }

      const irSummary = irs.map(ir =>
        `${ir.filename}: subBass=${ir.subBass.toFixed(1)}% bass=${ir.bass.toFixed(1)}% lowMid=${ir.lowMid.toFixed(1)}% mid=${ir.mid.toFixed(1)}% highMid=${ir.highMid.toFixed(1)}% presence=${ir.presence.toFixed(1)}% ratio=${ir.ratio.toFixed(2)}`
      ).join('\n');

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a guitar tone expert analyzing impulse responses. You receive a set of IRs with their 6-band spectral data and a user query describing a tonal quality or comparison.

Your job: classify and rank the IRs according to the query. The user might ask for:
- A single tonal quality (e.g., "dark tight tones") — rank all IRs by how well they match
- A comparison (e.g., "scooped vs balanced") — sort IRs into the compared categories
- A specific characteristic (e.g., "which ones have the most bite") — identify the best matches

Band definitions:
- subBass (20-120Hz): rumble, sub-lows
- bass (120-250Hz): low-end weight, proximity effect  
- lowMid (250-500Hz): warmth, body, can get muddy if excessive
- mid (500-2000Hz): body, fundamental guitar tone, punch
- highMid (2000-4000Hz): bite, articulation, cut, aggression
- presence (4000-8000Hz): sizzle, air, brightness, sparkle
- ratio (highMid/mid): >1.5 = bright/scooped, <1.2 = warm/mid-heavy

Tonal vocabulary reference:
- "Dark" = low presence, low highMid, strong bass/lowMid
- "Bright" = high presence, high highMid
- "Tight" = controlled bass, minimal lowMid bloat, good mid definition
- "Scooped" = reduced mid, high highMid+presence, V-shaped curve
- "Balanced" = relatively even distribution, mid is not scooped
- "Aggressive" = strong highMid, forward bite
- "Warm" = elevated lowMid/bass, reduced presence
- "Muddy" = excessive lowMid (>25%+), weak highMid/presence
- "Fizzy" = excessive presence (>25%+)
- "Boxy" = mid-heavy with weak highs and lows

For each IR, provide:
- A match score (0-100) for the queried quality
- A brief explanation of WHY it matches or doesn't, referencing specific band values
- If it's a comparison query, which category it falls into

Return JSON:
{
  "interpretation": "How you interpreted the query — what tonal characteristics you're looking for",
  "results": [
    {
      "filename": "IR filename",
      "score": number (0-100, how well it matches the query),
      "category": "category name if comparison query, otherwise the primary tonal quality",
      "reasoning": "1-2 sentences explaining the classification based on actual band data"
    }
  ]
}

Sort results by score descending. Be honest — if an IR doesn't match, give it a low score and explain why.`
          },
          {
            role: "user",
            content: `Query: "${query}"

IRs to classify:
${irSummary}

Classify and rank these IRs according to the query. Return as JSON.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const content = aiResponse.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ message: "AI returned no response" });
      }

      const result = JSON.parse(content);
      console.log(`[TestAI] "${query}" => ${result.results?.length ?? 0} classified IRs`);
      res.json(result);
    } catch (err) {
      console.error('Test AI error:', err);
      res.status(500).json({ message: "Failed to process test query" });
    }
  });

  // ── Tonal Profiles (Intelligence) ────────────────────────
  app.get(api.tonalProfiles.list.path, async (_req, res) => {
    try {
      const profiles = await storage.getTonalProfiles();
      res.json(profiles);
    } catch (err) {
      console.error('Tonal profiles error:', err);
      res.status(500).json({ message: "Failed to retrieve tonal profiles" });
    }
  });

  app.post(api.tonalProfiles.design.path, async (req, res) => {
    try {
      const input = api.tonalProfiles.design.input.parse(req.body);
      const profiles = await storage.getTonalProfiles();

      if (profiles.length === 0) {
        return res.json({
          shots: [],
          summary: "No tonal data yet. Run batch analysis on some IRs first to build your tonal intelligence database.",
          profileCount: 0,
        });
      }

      const speakerProfiles = profiles.filter(p =>
        p.speaker.toLowerCase().replace(/[^a-z0-9]/g, '') === input.speaker.toLowerCase().replace(/[^a-z0-9]/g, '')
      );

      const genreGuidance = input.genre ? expandGenreToTonalGuidance(input.genre) : '';

      const profileSummary = (speakerProfiles.length > 0 ? speakerProfiles : profiles).map(p =>
        `${p.mic}@${p.position}_${p.distance} on ${p.speaker}: Mid=${p.mid.toFixed(1)}% HiMid=${p.highMid.toFixed(1)}% Pres=${p.presence.toFixed(1)}% Ratio=${p.ratio.toFixed(2)} Centroid=${Math.round(p.centroid)}Hz Smooth=${p.smoothness.toFixed(0)} (${p.sampleCount} samples)`
      ).join('\n');

      const existingDesc = input.existingShots?.length
        ? `\nShots the user ALREADY has (do NOT duplicate these):\n${input.existingShots.map(s => `- ${s.filename}: [${s.subBass}|${s.bass}|${s.lowMid}|${s.mid}|${s.highMid}|${s.presence}] ratio=${s.ratio} centroid=${s.centroid}Hz`).join('\n')}`
        : '';

      const knowledgeBaseSection = buildKnowledgeBasePromptSection();

      const extrapolatedProfiles = buildExtrapolatedProfiles(
        profiles.map((p: any) => ({
          mic: p.mic, position: p.position, distance: p.distance,
          speaker: p.speaker, sampleCount: p.sampleCount,
          subBass: p.subBass, bass: p.bass, lowMid: p.lowMid,
          mid: p.mid, highMid: p.highMid, presence: p.presence,
          ratio: p.ratio, centroid: p.centroid, smoothness: p.smoothness,
        })),
        input.speaker
      );
      const extrapolationSection = formatExtrapolatedProfilesForPrompt(extrapolatedProfiles);

      const hasIntentCounts = input.intentCounts &&
        ((input.intentCounts.rhythm ?? 0) > 0 || (input.intentCounts.lead ?? 0) > 0 || (input.intentCounts.clean ?? 0) > 0);

      const intentAllocation: IntentAllocation = hasIntentCounts
        ? {
            rhythm: input.intentCounts!.rhythm ?? 0,
            lead: input.intentCounts!.lead ?? 0,
            clean: input.intentCounts!.clean ?? 0,
          }
        : { rhythm: 0, lead: 0, clean: 0 };

      const totalFromIntents = intentAllocation.rhythm + intentAllocation.lead + intentAllocation.clean;
      const effectiveTargetCount = hasIntentCounts ? totalFromIntents : (input.targetCount || 10);

      const roleBudgets = hasIntentCounts ? computeRoleBudgets(intentAllocation) : [];
      const intentBudgetSection = hasIntentCounts ? buildIntentBudgetPromptSection(roleBudgets) : '';

      const roleDefinitions = `=== MUSICAL ROLES ===
Each shot MUST be assigned exactly one musical role from this list:
- Foundation: Balanced, neutral base layer that sits well in any mix. The workhorse.
- Cut Layer: Forward, bright, aggressive — adds attack, presence, and bite for clarity.
- Mid Thickener: Warm, thick mids with rolled-off highs — body and warmth.
- Fizz Tamer: Smooth, dark, rolled-off top — controls fizz and harshness.
- Lead Polish: Refined, hi-fi detail with extended highs — polished, singing quality.
- Dark Specialty: Very dark, deep — for ambient, doom, or specialty tones.`;

      const intentRoleMapping = hasIntentCounts ? `
=== INTENT-ROLE MAPPING ===
When assigning shots to intents, these role combinations work best:
RHYTHM: Foundation + Cut Layer + Mid Thickener + Fizz Tamer (avoid Lead Polish)
LEAD: Foundation + Cut Layer + Lead Polish (avoid Dark Specialty)
CLEAN: Foundation + Lead Polish + Fizz Tamer (balanced, smooth, detailed)

A shot can serve MULTIPLE intents if its role fits. Mark primary and secondary intents.` : '';

      const designPrompt = `You are an expert audio engineer designing an IR capture session.
You have REAL tonal data from previously analyzed IRs AND a knowledge base of mic/position role predictions.
Use BOTH data sources to design an accurate, role-aware collection plan.

=== LEARNED TONAL DATA (from real IR analysis) ===
${profileSummary}
${extrapolationSection}
${knowledgeBaseSection}

${roleDefinitions}

${intentRoleMapping}

${intentBudgetSection}

=== TARGET ===
Speaker: ${input.speaker}
${input.genre ? `Genre/Tone: ${genreGuidance}` : 'Goal: Versatile mixing palette'}
Target shot count: EXACTLY ${effectiveTargetCount} (no more, no less)
${hasIntentCounts ? `Intent breakdown: ${intentAllocation.rhythm} rhythm, ${intentAllocation.lead} lead, ${intentAllocation.clean} clean` : ''}
${existingDesc}

=== TONAL BANDS ===
SubBass (20-120Hz): rumble, weight
Bass (120-250Hz): body, proximity effect
LowMid (250-500Hz): warmth, mud zone
Mid (500-2k): punch, clarity, presence
HighMid (2k-4k): bite, articulation, harshness
Presence (4k-8k): fizz, sizzle, air
Ratio (HiMid/Mid): >1.5 = bright/aggressive, <1.2 = warm/dark

=== DESIGN PRINCIPLES ===
1. ROLE-FIRST DESIGN: Assign each shot a musical role from the knowledge base. Use learned data to validate predictions.
2. INTENT COVERAGE: ${hasIntentCounts ? 'Ensure each intent (rhythm/lead/clean) gets the right role distribution.' : 'Design a versatile palette covering all common use cases.'}
3. PREDICT from data: Cross-reference the knowledge base predictions with learned tonal profiles for accuracy.
4. COMPLEMENTARY: Shots should combine well — one bright + one warm = blendable pair.
5. NO REDUNDANCY: Don't suggest two shots with the same role unless they serve different intents.
6. CONFIDENCE: Rate confidence based on knowledge base match AND learned data support.

=== OUTPUT FORMAT (JSON) ===
{
  "shots": [
    {
      "mic": "SM57",
      "position": "CapEdge",
      "distance": "1",
      "musicalRole": "Foundation",
      "primaryIntent": "rhythm",
      "secondaryIntents": ["clean"],
      "mixingRole": "Balanced base layer for rhythm and clean tones",
      "predictedTone": {
        "mid": 24, "highMid": 22, "presence": 14, "ratio": 1.0, "centroid": 2200,
        "character": "Balanced, punchy, sits well in any mix"
      },
      "confidence": "high",
      "confidenceReason": "Knowledge base: Foundation@CapEdge (high), 12 learned samples confirm",
      "blendsWith": ["R121@CapEdge_4 (classic smooth+punch pair)"],
      "whyIncluded": "Essential foundation layer — versatile base for rhythm and clean blends"
    }
  ],
  "mixingPairs": [
    {
      "shot1": "SM57@CapEdge_1",
      "shot2": "R121@CapEdge_4",
      "blendResult": "Balanced attack + warmth, the most common studio combo",
      "suggestedRatio": "50/50 to 60/40 SM57-heavy",
      "bestForIntent": "rhythm"
    }
  ],
  "intentCoverage": {
    "rhythm": {
      "shotCount": 6,
      "roles": { "Foundation": 2, "Cut Layer": 2, "Mid Thickener": 1, "Fizz Tamer": 1 },
      "complete": true
    },
    "lead": {
      "shotCount": 3,
      "roles": { "Foundation": 1, "Cut Layer": 1, "Lead Polish": 1 },
      "complete": true
    },
    "clean": {
      "shotCount": 2,
      "roles": { "Foundation": 1, "Lead Polish": 1 },
      "complete": true
    }
  },
  "tonalCoverage": {
    "bright": true, "warm": true, "aggressive": true,
    "smooth": true, "body": true, "detail": true
  },
  "summary": "This ${effectiveTargetCount}-shot set covers all ${hasIntentCounts ? 'requested intents' : 'mixing needs'}..."
}`;

      const designResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: designPrompt },
          { role: "user", content: `Design an optimal ${effectiveTargetCount}-shot IR capture plan for ${input.speaker}.${hasIntentCounts ? ` Needs: ${intentAllocation.rhythm} rhythm, ${intentAllocation.lead} lead, ${intentAllocation.clean} clean shots.` : ''} Use both the knowledge base and learned tonal data.` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const designResult = JSON.parse(designResponse.choices[0].message.content || "{}");

      if (designResult.shots && Array.isArray(designResult.shots)) {
        for (const shot of designResult.shots) {
          const kbLookup = lookupMicRole(shot.mic || '', shot.position || '', shot.distance);
          if (kbLookup) {
            shot.knowledgeBaseRole = kbLookup.predictedRole;
            shot.knowledgeBaseConfidence = kbLookup.confidence;
          }
        }

        if (designResult.shots.length > effectiveTargetCount) {
          console.log(`[Shot Designer] Trimming ${designResult.shots.length} shots to requested ${effectiveTargetCount}`);
          designResult.shots = designResult.shots.slice(0, effectiveTargetCount);
          if (designResult.intentCoverage && hasIntentCounts) {
            const coverage: Record<string, { shotCount: number; roles: Record<string, number>; complete: boolean }> = {};
            for (const shot of designResult.shots) {
              const allIntents = [shot.primaryIntent, ...(shot.secondaryIntents || [])].filter(Boolean);
              for (const intent of allIntents) {
                if (!coverage[intent]) coverage[intent] = { shotCount: 0, roles: {}, complete: false };
                coverage[intent].shotCount++;
                const role = shot.musicalRole || 'Unknown';
                coverage[intent].roles[role] = (coverage[intent].roles[role] || 0) + 1;
              }
            }
            if (intentAllocation.rhythm > 0 && coverage.rhythm) coverage.rhythm.complete = coverage.rhythm.shotCount >= intentAllocation.rhythm;
            if (intentAllocation.lead > 0 && coverage.lead) coverage.lead.complete = coverage.lead.shotCount >= intentAllocation.lead;
            if (intentAllocation.clean > 0 && coverage.clean) coverage.clean.complete = coverage.clean.shotCount >= intentAllocation.clean;
            designResult.intentCoverage = coverage;
          }
        } else if (designResult.shots.length < effectiveTargetCount) {
          console.log(`[Shot Designer] AI returned ${designResult.shots.length} shots, requested ${effectiveTargetCount}`);
        }
      }

      res.json({
        ...designResult,
        profileCount: profiles.length,
        speakerProfileCount: speakerProfiles.length,
        dataSource: speakerProfiles.length > 0 ? 'speaker-specific' : 'cross-speaker',
        intentMode: !!hasIntentCounts,
        requestedIntents: hasIntentCounts ? intentAllocation : null,
        requestedCount: effectiveTargetCount,
        roleBudgets: hasIntentCounts ? roleBudgets : null,
        extrapolatedCount: extrapolatedProfiles.length,
      });
    } catch (err) {
      console.error('Shot design error:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to design shots" });
    }
  });

  // ── Gap Finder Helpers ────────────────────────
  function analyzeIrClusters(irs: { filename: string; subBass: number; bass: number; lowMid: number; mid: number; highMid: number; presence: number; ratio: number; centroid: number; smoothness: number }[]): string {
    if (irs.length < 2) return 'Only one IR -- no clustering possible.';

    const normalize = (val: number, min: number, max: number) => max > min ? (val - min) / (max - min) : 0;

    const metrics = irs.map(ir => ({
      filename: ir.filename,
      mid: ir.mid,
      highMid: ir.highMid,
      presence: ir.presence,
      ratio: ir.ratio,
      centroid: ir.centroid,
    }));

    const minC = Math.min(...metrics.map(m => m.centroid));
    const maxC = Math.max(...metrics.map(m => m.centroid));
    const minR = Math.min(...metrics.map(m => m.ratio));
    const maxR = Math.max(...metrics.map(m => m.ratio));

    const pairs: { a: string; b: string; dist: number }[] = [];
    for (let i = 0; i < metrics.length; i++) {
      for (let j = i + 1; j < metrics.length; j++) {
        const a = metrics[i], b = metrics[j];
        const dist = Math.sqrt(
          Math.pow((a.mid - b.mid) / 100, 2) +
          Math.pow((a.highMid - b.highMid) / 100, 2) +
          Math.pow((a.presence - b.presence) / 100, 2) +
          Math.pow(normalize(a.centroid, minC, maxC) - normalize(b.centroid, minC, maxC), 2) +
          Math.pow(normalize(a.ratio, minR, maxR) - normalize(b.ratio, minR, maxR), 2)
        );
        pairs.push({ a: a.filename, b: b.filename, dist });
      }
    }

    pairs.sort((a, b) => a.dist - b.dist);
    const similar = pairs.filter(p => p.dist < 0.15);
    const varied = pairs.filter(p => p.dist > 0.5);

    const lines: string[] = [];
    lines.push(`Total IRs: ${irs.length}`);
    lines.push(`Centroid range: ${Math.round(minC)}Hz - ${Math.round(maxC)}Hz`);
    lines.push(`Ratio range: ${minR.toFixed(2)} - ${maxR.toFixed(2)}`);

    if (similar.length > 0) {
      lines.push(`\nHighly similar pairs (potential redundancy):`);
      similar.slice(0, 10).forEach(p => lines.push(`  ${p.a} <-> ${p.b} (distance: ${p.dist.toFixed(3)})`));
    } else {
      lines.push(`\nNo highly similar pairs detected -- good variety.`);
    }

    if (varied.length > 0) {
      lines.push(`\nMost tonally distinct pairs:`);
      varied.slice(-5).reverse().forEach(p => lines.push(`  ${p.a} <-> ${p.b} (distance: ${p.dist.toFixed(3)})`));
    }

    const avgMid = irs.reduce((s, ir) => s + ir.mid, 0) / irs.length;
    const avgHiMid = irs.reduce((s, ir) => s + ir.highMid, 0) / irs.length;
    const avgPres = irs.reduce((s, ir) => s + ir.presence, 0) / irs.length;
    const avgRatio = irs.reduce((s, ir) => s + ir.ratio, 0) / irs.length;
    lines.push(`\nCollection averages: Mid=${avgMid.toFixed(1)}% HiMid=${avgHiMid.toFixed(1)}% Pres=${avgPres.toFixed(1)}% Ratio=${avgRatio.toFixed(2)}`);

    const hasBright = irs.some(ir => ir.ratio > 1.5);
    const hasWarm = irs.some(ir => ir.ratio < 1.0);
    const hasSmooth = irs.some(ir => ir.smoothness > 70);
    const hasAggressive = irs.some(ir => ir.highMid > 35);
    const hasBody = irs.some(ir => ir.lowMid > 20 && ir.bass > 15);

    lines.push(`\nTonal coverage flags:`);
    lines.push(`  Bright (ratio>1.5): ${hasBright ? 'YES' : 'MISSING'}`);
    lines.push(`  Warm (ratio<1.0): ${hasWarm ? 'YES' : 'MISSING'}`);
    lines.push(`  Smooth (smoothness>70): ${hasSmooth ? 'YES' : 'MISSING'}`);
    lines.push(`  Aggressive (hiMid>35%): ${hasAggressive ? 'YES' : 'MISSING'}`);
    lines.push(`  Body (lowMid>20% + bass>15%): ${hasBody ? 'YES' : 'MISSING'}`);

    return lines.join('\n');
  }

  // ── Gap Finder (Audio-Aware Shot Suggestions) ────────────────────────
  app.post(api.tonalProfiles.gapFinder.path, async (req, res) => {
    try {
      const input = api.tonalProfiles.gapFinder.input.parse(req.body);
      const profiles = await storage.getTonalProfiles();
      const signals = await storage.getPreferenceSignals();
      const learned = await computeLearnedProfile(signals);
      const gearPrompt = buildGearPreferencePrompt(learned);
      const genreGuidance = input.genre ? expandGenreToTonalGuidance(input.genre) : '';

      const speakerProfiles = profiles.filter(p =>
        p.speaker.toLowerCase().replace(/[^a-z0-9]/g, '') === input.speaker.toLowerCase().replace(/[^a-z0-9]/g, '')
      );

      const profileSummary = (speakerProfiles.length > 0 ? speakerProfiles : profiles).map(p =>
        `${p.mic}@${p.position}_${p.distance} on ${p.speaker}: Mid=${p.mid.toFixed(1)}% HiMid=${p.highMid.toFixed(1)}% Pres=${p.presence.toFixed(1)}% Ratio=${p.ratio.toFixed(2)} Centroid=${Math.round(p.centroid)}Hz Smooth=${p.smoothness.toFixed(0)} (${p.sampleCount} samples)`
      ).join('\n');

      const existingIrSummary = input.existingIrs.map(ir => {
        const ratio = ir.mid > 0 ? (ir.highMid / ir.mid).toFixed(2) : '0.00';
        return `${ir.filename}: SubBass=${ir.subBass.toFixed(1)}% Bass=${ir.bass.toFixed(1)}% LowMid=${ir.lowMid.toFixed(1)}% Mid=${ir.mid.toFixed(1)}% HiMid=${ir.highMid.toFixed(1)}% Pres=${ir.presence.toFixed(1)}% Ratio=${ratio} Centroid=${Math.round(ir.centroid)}Hz Smooth=${ir.smoothness.toFixed(0)}`;
      }).join('\n');

      const clusterAnalysis = analyzeIrClusters(input.existingIrs);

      let preferenceContext = '';
      if (learned.status !== 'no_data' && learned.learnedAdjustments) {
        const adj = learned.learnedAdjustments as any;
        const midVal = typeof adj.mid === 'object' ? adj.mid.shift : adj.mid;
        const hiMidVal = typeof adj.highMid === 'object' ? adj.highMid.shift : adj.highMid;
        const presVal = typeof adj.presence === 'object' ? adj.presence.shift : adj.presence;
        const ratioVal = typeof adj.ratio === 'object' ? adj.ratio.shift : adj.ratio;
        preferenceContext = `\n=== USER PREFERENCES (from ${learned.signalCount} rated blends) ===
Preferred tonal center: Mid=${midVal?.toFixed?.(1) ?? 'n/a'}% HiMid=${hiMidVal?.toFixed?.(1) ?? 'n/a'}% Pres=${presVal?.toFixed?.(1) ?? 'n/a'}% Ratio=${ratioVal?.toFixed?.(2) ?? 'n/a'}
${learned.avoidZones && learned.avoidZones.length > 0 ? `Avoid zones: ${learned.avoidZones.map((z: any) => z.label || z).join(', ')}` : ''}
${gearPrompt}`;
      }
      const vocabPrompt = buildUserVocabularyPrompt(signals);
      if (vocabPrompt) {
        preferenceContext += vocabPrompt;
      }

      const gapPrompt = `You are an expert audio engineer analyzing an existing IR collection to find GAPS and REDUNDANCIES.
You have the ACTUAL tonal analysis of every IR the user currently has. Use this to identify what's missing and suggest specific new shots that would maximize variety and fill tonal holes.

=== EXISTING IR COLLECTION (REAL ANALYZED DATA) ===
${existingIrSummary}

=== CLUSTER ANALYSIS ===
${clusterAnalysis}

=== LEARNED TONAL DATA (from previously analyzed IRs) ===
${profileSummary || 'No prior tonal profiles available'}
${preferenceContext}

=== TARGET ===
Speaker: ${input.speaker}
${input.genre ? `Genre/Tone: ${genreGuidance}` : 'Goal: Versatile mixing palette'}
Suggest up to ${input.targetCount || 5} additional shots

=== TONAL BANDS ===
SubBass (20-120Hz): rumble, weight
Bass (120-250Hz): body, proximity effect
LowMid (250-500Hz): warmth, mud zone
Mid (500-2k): punch, clarity, presence
HighMid (2k-4k): bite, articulation, harshness
Presence (4k-8k): fizz, sizzle, air
Ratio (HiMid/Mid): >1.5 = bright/aggressive, <1.2 = warm/dark

=== ANALYSIS INSTRUCTIONS ===
1. IDENTIFY CLUSTERS: Group existing IRs by tonal similarity. Flag IRs that are nearly identical (redundant)
2. FIND GAPS: What tonal territory is NOT covered? Missing brightness? Missing warmth? No smooth option? No body layer?
3. SUGGEST SHOTS: For each gap, suggest a specific mic@position_distance that would fill it, based on learned tonal profiles
4. BLEND AWARENESS: For blends (filenames with two mics), check if blend results overlap with single-mic shots. Flag redundant blends
5. PRIORITY: Rank suggestions by how much variety they add. Most impactful gap-fill first
6. Use the user's preference data to bias suggestions toward their taste

=== OUTPUT FORMAT (JSON) ===
{
  "coverage": {
    "bright": { "covered": true, "irCount": 3, "examples": ["SM57_CapEdge_2in.wav"] },
    "warm": { "covered": false, "irCount": 0, "examples": [] },
    "aggressive": { "covered": true, "irCount": 2, "examples": ["MD441_Presence_4in.wav"] },
    "smooth": { "covered": false, "irCount": 0, "examples": [] },
    "body": { "covered": true, "irCount": 1, "examples": ["R121_Cap_6in.wav"] },
    "detail": { "covered": false, "irCount": 0, "examples": [] }
  },
  "redundancies": [
    {
      "irs": ["IR1.wav", "IR2.wav"],
      "reason": "Nearly identical ratio and mid balance -- both are bright/forward. Keep one, drop the other",
      "keepSuggestion": "IR1.wav (slightly smoother response)"
    }
  ],
  "suggestedShots": [
    {
      "mic": "R121",
      "position": "Cap",
      "distance": "6",
      "priority": 1,
      "gapFilled": "warm/smooth layer",
      "predictedTone": {
        "mid": 30, "highMid": 25, "presence": 12, "ratio": 0.83,
        "character": "Warm, smooth, dark body layer for blending"
      },
      "confidence": "high",
      "confidenceReason": "8 samples of R121@Cap in database",
      "blendPotential": "Pairs well with SM57@CapEdge for classic bright+warm blend"
    }
  ],
  "blendRedundancies": [
    {
      "blend": "SM57+R121_blend.wav",
      "overlapsWithSingles": ["SM57_CapEdge.wav has similar ratio"],
      "verdict": "Blend adds modest warmth but doesn't fill a unique gap"
    }
  ],
  "summary": "Your collection is heavy on bright/aggressive sounds. You're missing a warm body layer and a smooth detail option. Adding an R121@Cap_6 and M201@CapEdge_3 would complete your mixing palette."
}`;

      const gapResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: gapPrompt },
          { role: "user", content: `Analyze my ${input.existingIrs.length} existing IRs for ${input.speaker} and suggest up to ${input.targetCount || 5} additional shots to fill tonal gaps.` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const gapResult = JSON.parse(gapResponse.choices[0].message.content || "{}");

      res.json({
        ...gapResult,
        irCount: input.existingIrs.length,
        profileCount: profiles.length,
        speakerProfileCount: speakerProfiles.length,
        preferenceSignalCount: signals.length,
      });
    } catch (err) {
      console.error('Gap finder error:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to analyze gaps" });
    }
  });

  app.post('/api/amp-designer', async (req, res) => {
    try {
      const input = z.object({
        category: z.enum(['amp', 'drive']),
        baseModelId: z.string().min(1),
        baseModelLabel: z.string().min(1),
        modId: z.string().optional(),
        modLabel: z.string().optional(),
        customDescription: z.string().optional(),
        additionalNotes: z.string().optional(),
      }).refine(data => data.modId || data.customDescription, {
        message: "Either select a known mod or provide a custom description"
      }).parse(req.body);

      const model = input.category === 'amp'
        ? FRACTAL_AMP_MODELS.find(m => m.id === input.baseModelId)
        : FRACTAL_DRIVE_MODELS.find(m => m.id === input.baseModelId);

      const knownMod = input.modId ? KNOWN_MODS.find(m => m.id === input.modId) : null;
      if (input.modId && input.modId !== 'custom' && !knownMod) {
        return res.status(400).json({ message: "Unknown modification ID" });
      }
      const paramGlossary = formatParameterGlossary(input.category);
      const modelLabel = model ? model.label : input.baseModelLabel;
      const modelContext = model ? formatModelContext(model) : `Base Model: ${modelLabel}`;
      const modContext = knownMod ? formatKnownModContext(knownMod) : '';
      const modLabel = knownMod ? knownMod.label : (input.modLabel || 'Custom Modification');

      const systemPrompt = `You are an expert amp tech and guitar electronics engineer with deep knowledge of both real amp/pedal circuits AND the Fractal Audio Axe-FX III / FM9 / FM3 / AM4 parameter system, including the Cygnus amp modeling engine. You have studied the Fractal Audio Wiki (wiki.fractalaudio.com), Yek's Guide to Fractal Audio Amp Models, and the Fractal Audio Forum extensively. You understand how real-world circuit modifications translate to Fractal's digital Expert parameters in the Amp Block and Drive Block.

You are deeply familiar with Fractal Audio's naming conventions (Brit = Marshall, Dizzy = Diezel, Recto = Mesa Rectifier, Euro = Bogner, Class-A = Vox, Citrus = Orange, USA = Mesa Mark, Angle = Engl, etc.) and the specific Expert parameters available in each block.

Your task: Given a base ${input.category === 'amp' ? 'amplifier' : 'drive/fuzz pedal'} model and a modification request, provide specific Fractal Audio Amp Block Expert parameter recommendations that recreate the effect of that real-world circuit modification. Use parameter names exactly as they appear in the Fractal Audio interface.

${modelContext}

${modContext}

PARAMETER GLOSSARY (${input.category === 'amp' ? 'Amp Block Expert' : 'Drive Block'} Parameters):
${paramGlossary}

${input.additionalNotes ? `Additional user notes: ${input.additionalNotes}` : ''}

IMPORTANT GUIDELINES:
- Use only REAL Fractal Audio Expert parameter names as they appear in the Axe-FX III / FM9 / FM3 / AM4 interface. Key Amp Block Expert parameters include: Input Trim, Preamp Tube Type, Preamp Bias, Preamp Sag, Cathode Follower Comp, Negative Feedback, Bright Cap, Master Volume Trim, Power Tube Type, Power Tube Bias, Power Tube Sag, Output Comp, Transformer Match, Transformer Drive, Speaker Compliance, and others.
- For Drive Block parameters, reference: Drive, Tone, Level, Clipping Type, Bias, Slew Rate, Input Impedance, and others as applicable.
- Map circuit modifications to their closest Fractal parameter equivalents with precise reasoning
- Explain WHY each parameter change recreates the mod's effect, referencing the actual circuit change
- Include the direction of change (increase/decrease) and suggested value or range
- Note any parameters that interact with each other
- Mention any limitations (things the mod does that can't be perfectly replicated digitally)
- If the mod involves changes that affect multiple parameter domains, cover all of them
- Be specific about values where possible, but note these are starting points for ear-tuning
- Reference relevant Fractal community knowledge where appropriate (e.g., Cliff Chase's forum posts about specific models)

Respond in JSON format:
{
  "modName": "Name of the modification",
  "summary": "Brief 1-2 sentence overview of what this mod does to the tone",
  "history": "Brief background on the mod's origin and who uses it (2-3 sentences)",
  "parameterChanges": [
    {
      "parameter": "Parameter name",
      "direction": "increase" | "decrease" | "set to",
      "suggestedValue": "Specific value or range",
      "rationale": "Why this change recreates the mod's effect (reference the circuit change)"
    }
  ],
  "startingPoint": "Brief description of recommended starting settings before applying the mod (e.g., which amp model to start with, gain level, etc.)",
  "toneDescription": "What the final result should sound like - describe the tonal character",
  "cautions": ["Any warnings or things to watch out for"],
  "interactionNotes": "How these parameters interact with each other - what to adjust if something sounds off",
  "alternatives": ["Any alternative approaches or related mods to try"]
}`;

      const userMessage = input.customDescription
        ? `Apply this modification to the ${modelLabel}: ${input.customDescription}`
        : `Apply the "${modLabel}" modification to the ${modelLabel}.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      res.json(result);
    } catch (err) {
      console.error('Amp designer error:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to generate mod parameters" });
    }
  });

  app.get('/api/custom-mods', async (_req, res) => {
    try {
      const mods = await storage.getCustomMods();
      res.json(mods);
    } catch (err) {
      console.error('Get custom mods error:', err);
      res.status(500).json({ message: "Failed to fetch saved mods" });
    }
  });

  app.post('/api/custom-mods', async (req, res) => {
    try {
      const input = z.object({
        name: z.string().min(1).max(200),
        category: z.enum(['amp', 'drive']),
        appliesTo: z.array(z.string().min(1)),
        description: z.string().min(1),
        resultJson: z.record(z.unknown()),
      }).parse(req.body);
      const mod = await storage.createCustomMod(input);
      res.json(mod);
    } catch (err) {
      console.error('Save custom mod error:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to save mod" });
    }
  });

  app.delete('/api/custom-mods/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await storage.deleteCustomMod(id);
      res.json({ success: true });
    } catch (err) {
      console.error('Delete custom mod error:', err);
      res.status(500).json({ message: "Failed to delete mod" });
    }
  });

  app.post('/api/amp-dial-in', async (req, res) => {
    try {
      const input = z.object({
        modelId: z.string().min(1),
        style: z.string().optional(),
        additionalNotes: z.string().optional(),
      }).parse(req.body);

      const model = FRACTAL_AMP_MODELS.find(m => m.id === input.modelId);
      if (!model) {
        return res.status(400).json({ message: "Unknown amp model" });
      }

      const controlLayout = getControlLayout(input.modelId, FRACTAL_AMP_MODELS);

      const knobsList = controlLayout.knobs.map(k => `"${k.id}": number (0-${k.max || 10}) // labeled "${k.label}"`).join(",\n    ");
      const switchesList = controlLayout.switches.map(s => {
        if (s.type === "toggle") return `"${s.id}": boolean // ${s.label} switch`;
        return `"${s.id}": "${s.options?.join('" | "')}" // ${s.label} selector`;
      }).join(",\n    ");
      const eqFields = controlLayout.graphicEQ ? `"eq80": number (0-10),\n    "eq240": number (0-10),\n    "eq750": number (0-10),\n    "eq2200": number (0-10),\n    "eq6600": number (0-10)` : '';

      const settingsSchema = [knobsList, switchesList, eqFields].filter(Boolean).join(",\n    ");

      const controlDescription = [
        `KNOBS: ${controlLayout.knobs.map(k => k.label).join(', ')}`,
        controlLayout.switches.length > 0 ? `SWITCHES: ${controlLayout.switches.map(s => {
          if (s.type === "toggle") return `${s.label} (on/off)`;
          return `${s.label} (${s.options?.join('/')})`;
        }).join(', ')}` : '',
        controlLayout.graphicEQ ? 'GRAPHIC EQ: 5-band (80Hz, 240Hz, 750Hz, 2.2kHz, 6.6kHz)' : '',
      ].filter(Boolean).join('\n');

      const systemPrompt = `You are an expert guitar amp tech and tone consultant with deep knowledge of the Fractal Audio Axe-FX III / FM9 / FM3 / AM4 amp modeling platform, including the Cygnus amp modeling engine. You have studied the Fractal Audio Wiki (wiki.fractalaudio.com), Yek's Guide to Fractal Audio Amp Models, Yek's Guide to Fractal Audio Drive Models, and the Fractal Audio Forum extensively.

You are deeply familiar with:
- Fractal Audio's naming conventions (Brit = Marshall, Dizzy = Diezel, Recto = Mesa Rectifier, Euro = Bogner, Class-A = Vox, Citrus = Orange, USA = Mesa Mark, Angle = Engl, etc.)
- How each real-world amp's controls translate to the Fractal interface
- The tonal characteristics of each amp model across different gain settings
- Common EQ, gain staging, and dialing-in techniques from the Fractal community
- Famous players associated with each amp and their typical settings
- How the Cygnus engine interacts with different amp model types

Your task: Provide detailed dial-in guidance for a specific Fractal Audio amp model. Give practical starting settings, tips, and advice that helps a guitarist get a great tone quickly.

CRITICAL: This amp has these EXACT controls (matching the real hardware):
${controlDescription}

ONLY provide settings for the controls listed above. Do NOT add controls that don't exist on this amp.
For example: Non-master-volume amps have "Volume" instead of separate Gain/Master. Jumped-channel amps have "Volume I" and "Volume II" instead of a single Gain. Vox AC30 Top Boost has no Mid control but has a Cut control. Mesa Mark amps have a 5-band Graphic EQ. Some amps have unique switches like Aggression, SAT, Voicing, Contour, etc.

The amp model is: ${model.label}
Based on: ${model.basedOn}
Characteristics: ${model.characteristics}

${input.style ? `The user wants to achieve this style/tone: ${input.style}` : 'Provide a versatile starting point.'}
${input.additionalNotes ? `Additional user notes: ${input.additionalNotes}` : ''}

IMPORTANT:
- Be specific about knob positions (use 0-10 scale)
- ONLY include the exact controls listed above in your settings object
- Reference the real amp this model is based on
- Include practical tips from Fractal community knowledge
- Mention relevant Expert/Advanced parameters if they significantly improve the tone
- Reference famous players/tones where relevant

Respond in JSON format:
{
  "modelName": "Name of the model",
  "basedOn": "What real amp it's based on",
  "settings": {
    ${settingsSchema}
  },
  "expertTips": [
    {
      "parameter": "Expert or Advanced parameter name",
      "suggestion": "What to try",
      "why": "Brief explanation"
    }
  ],
  "tips": ["Practical tip 1", "Practical tip 2", ...],
  "whatToListenFor": ["What to listen for 1", "What to listen for 2"],
  "famousUsers": "Brief mention of famous players/tones associated with this amp",
  "styleNotes": "How this setting works for the requested style",
  "quickTweak": "One key adjustment that makes the biggest difference on this model"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Give me detailed dial-in settings for the ${model.label} (${model.basedOn}).${input.style ? ` I want to achieve: ${input.style}` : ''} ${input.additionalNotes || ''}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      result.controlLayout = controlLayout;
      res.json(result);
    } catch (err) {
      console.error('Amp dial-in error:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to generate dial-in advice" });
    }
  });

  return httpServer;
}
