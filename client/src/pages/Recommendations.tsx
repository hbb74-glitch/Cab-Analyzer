import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { Loader2, Lightbulb, Mic2, Speaker, Ruler, Music, Target, ListFilter, Zap, Copy, Check, FileText, ArrowRight, CheckCircle, PlusCircle, RefreshCw, AlertCircle, Trash2, List, Upload, X, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useResults } from "@/context/ResultsContext";
import { api, type RecommendationsResponse, type SpeakerRecommendationsResponse, type AmpRecommendationsResponse, type PositionImportResponse } from "@shared/routes";

// Ambiguous speaker patterns that need clarification
const AMBIGUOUS_SPEAKERS: Record<string, { options: { value: string; label: string }[]; question: string }> = {
  "sc64": {
    question: "Which SC64 speaker are you using?",
    options: [
      { value: "ga12-sc64", label: "GA12-SC64 (12 inch)" },
      { value: "g10-sc64", label: "GA10-SC64 (10 inch)" },
    ]
  },
};

const MICS = [
  { value: "57", label: "SM57" },
  { value: "121", label: "R121" },
  { value: "r92", label: "R92" },
  { value: "160", label: "M160" },
  { value: "421", label: "MD421" },
  { value: "441-boost", label: "MD441 (Presence Boost)" },
  { value: "441-flat", label: "MD441 (Flat)" },
  { value: "r10", label: "R10" },
  { value: "m88", label: "M88" },
  { value: "pr30", label: "PR30" },
  { value: "e906-boost", label: "e906 (Presence Boost)" },
  { value: "e906-flat", label: "e906 (Flat)" },
  { value: "m201", label: "M201" },
  { value: "sm7b", label: "SM7B" },
  { value: "c414", label: "C414" },
  { value: "roswell-cab", label: "Roswell Cab Mic" },
];

const SPEAKERS = [
  { value: "g12m25", label: "G12M (Greenback)" },
  { value: "v30-china", label: "V30" },
  { value: "v30-blackcat", label: "V30BC (Black Cat)" },
  { value: "k100", label: "K100" },
  { value: "g12t75", label: "G12T75" },
  { value: "g12-65", label: "G12-65 Heritage" },
  { value: "g12h30-anniversary", label: "G12H Anniversary" },
  { value: "celestion-cream", label: "Cream" },
  { value: "ga12-sc64", label: "GA12-SC64" },
  { value: "g10-sc64", label: "GA10-SC64" },
];

const GENRES = [
  { value: "", label: "Any / General" },
  { value: "classic-rock", label: "Classic Rock" },
  { value: "hard-rock", label: "Hard Rock" },
  { value: "alternative-rock", label: "Alternative Rock" },
  { value: "punk", label: "Punk" },
  { value: "grunge", label: "Grunge" },
  { value: "classic-metal", label: "Classic Heavy Metal" },
  { value: "thrash-metal", label: "Thrash Metal" },
  { value: "funk-rock", label: "Funk Rock" },
  { value: "indie-rock", label: "Indie Rock" },
  { value: "blues", label: "Blues" },
  { value: "jazz", label: "Jazz" },
  { value: "country", label: "Country" },
  { value: "doom-stoner", label: "Doom / Stoner" },
  { value: "shoegaze", label: "Shoegaze" },
  { value: "post-punk", label: "Post-Punk" },
  { value: "custom", label: "Custom (type your own)" },
];

type Mode = 'by-speaker' | 'by-amp' | 'import-positions';

// Filename parsing patterns (same as Analyzer.tsx)
const PREF_MIC_PATTERNS: Record<string, string> = {
  "sm57": "SM57", "57": "SM57",
  "r121": "R121", "r-121": "R121", "121": "R121",
  "r92": "R92", "aear92": "R92", "aea-r92": "R92",
  "m160": "M160", "160": "M160",
  "md421": "MD421", "421": "MD421",
  "421kompakt": "MD421", "421-kompakt": "MD421", "kompakt": "MD421", "md421kmp": "MD421", "421kmp": "MD421",
  "md441boost": "MD441 (Presence)", "441-boost": "MD441 (Presence)", "441boost": "MD441 (Presence)", "md441-boost": "MD441 (Presence)", "441presence": "MD441 (Presence)",
  "md441flat": "MD441 (Flat)", "441-flat": "MD441 (Flat)", "441flat": "MD441 (Flat)", "md441-flat": "MD441 (Flat)", "md441": "MD441 (Flat)", "441": "MD441 (Flat)",
  "r10": "R10",
  "m88": "M88", "88": "M88",
  "pr30": "PR30", "30": "PR30",
  "e906boost": "e906 (Presence)", "e906-boost": "e906 (Presence)", "906boost": "e906 (Presence)",
  "e906presence": "e906 (Presence)", "e906-presence": "e906 (Presence)", "906presence": "e906 (Presence)",
  "e906flat": "e906 (Flat)", "e906-flat": "e906 (Flat)", "906flat": "e906 (Flat)", "e906": "e906 (Flat)",
  "m201": "M201", "201": "M201",
  "sm7b": "SM7B", "sm7": "SM7B", "7b": "SM7B",
  "c414": "C414", "akgc414": "C414", "akg-c414": "C414", "414": "C414",
  "roswellcab": "Roswell", "roswell-cab": "Roswell", "roswell": "Roswell",
};

const PREF_POSITION_PATTERNS: Record<string, string> = {
  "capedge_br": "CapEdge_BR", "capedgebr": "CapEdge_BR",
  "capedge_dk": "CapEdge_DK", "capedgedk": "CapEdge_DK",
  "capedge_cone_tr": "Cap_Cone_Tr", "capedgeconetr": "Cap_Cone_Tr", "cone_tr": "Cap_Cone_Tr", "cap_cone_tr": "Cap_Cone_Tr", "capconetr": "Cap_Cone_Tr",
  "cap_offcenter": "Cap_OffCenter", "capoffcenter": "Cap_OffCenter", "offcenter": "Cap_OffCenter",
  "capedge": "CapEdge", "cap_edge": "CapEdge", "edge": "CapEdge",
  "cap": "Cap", "center": "Cap",
  "cone": "Cone",
  "cap-edge-favor-cap": "CapEdge_BR", "favorcap": "CapEdge_BR",
  "cap-edge-favor-cone": "CapEdge_DK", "favorcone": "CapEdge_DK",
  "cap-edge": "CapEdge",
  "cap-off-center": "Cap_OffCenter",
};

const PREF_SPEAKER_PATTERNS: Record<string, string> = {
  "g12m25": "Greenback", "greenback": "Greenback", "gb": "Greenback", "g12m": "Greenback",
  "v30china": "V30", "v30-china": "V30", "v30c": "V30",
  "v30blackcat": "V30BC", "v30-blackcat": "V30BC", "blackcat": "V30BC", "v30bc": "V30BC",
  "v30": "V30",
  "k100": "K100", "g12k100": "K100", "g12k-100": "K100",
  "g12t75": "G12T75", "t75": "G12T75", "g12t-75": "G12T75",
  "g12-65": "G12-65", "g1265": "G12-65", "65": "G12-65", "g1265her": "G12-65", "g12-65her": "G12-65",
  "g12h30": "G12H", "g12h30-anniversary": "G12H", "anniversary": "G12H", "h30": "G12H", "g12h": "G12H", "g12hann": "G12H", "g12h30ann": "G12H",
  "cream": "Cream", "celestion-cream": "Cream", "celestioncream": "Cream",
  "ga12sc64": "GA12-SC64", "ga12-sc64": "GA12-SC64", "sc64": "GA12-SC64",
  "g10sc64": "GA10-SC64", "g10-sc64": "GA10-SC64", "g10": "GA10-SC64",
};

interface ParsedIR {
  filename: string;
  mic?: string;
  position?: string;
  speaker?: string;
  distance?: string;
}

interface LearnedPreferences {
  mics: { name: string; count: number }[];
  positions: { name: string; count: number }[];
  distances: { value: string; count: number }[];
  speakers: { name: string; count: number }[];
  totalIRs: number;
}

function parseIRFilename(filename: string): ParsedIR {
  const result: ParsedIR = { filename };
  const name = filename.toLowerCase().replace('.wav', '');
  const parts = name.split(/[_\-\s]+/);
  const fullName = parts.join('');
  
  // Special handling for mics with variants (e906, md441)
  const hasE906 = parts.includes('e906') || fullName.includes('e906');
  const hasPresence = parts.includes('presence') || parts.includes('boost') || fullName.includes('presence') || fullName.includes('boost');
  const hasFlat = parts.includes('flat') || fullName.includes('flat');
  const hasMd441 = parts.includes('md441') || parts.includes('441') || fullName.includes('md441');
  
  if (hasE906) {
    result.mic = hasPresence ? 'e906 (Presence)' : (hasFlat ? 'e906 (Flat)' : 'e906 (Flat)');
  } else if (hasMd441) {
    result.mic = hasPresence ? 'MD441 (Presence)' : (hasFlat ? 'MD441 (Flat)' : 'MD441 (Flat)');
  } else {
    for (const [pattern, value] of Object.entries(PREF_MIC_PATTERNS)) {
      if (parts.includes(pattern) || fullName.includes(pattern)) {
        result.mic = value;
        break;
      }
    }
  }
  
  // Position
  const sortedPositions = Object.entries(PREF_POSITION_PATTERNS).sort((a, b) => b[0].length - a[0].length);
  for (const [pattern, value] of sortedPositions) {
    if (parts.includes(pattern) || fullName.includes(pattern)) {
      result.position = value;
      break;
    }
  }
  
  // Speaker
  const sortedSpeakers = Object.entries(PREF_SPEAKER_PATTERNS).sort((a, b) => b[0].length - a[0].length);
  for (const [pattern, value] of sortedSpeakers) {
    if (parts.includes(pattern) || fullName.includes(pattern)) {
      result.speaker = value;
      break;
    }
  }
  
  // Distance
  for (const part of parts) {
    const distMatch = part.match(/^(\d+(?:\.\d+)?)\s*(?:in|inch)?$/);
    if (distMatch) {
      const dist = parseFloat(distMatch[1]);
      if (dist >= 0.25 && dist <= 12) {
        result.distance = `${dist}"`;
        break;
      }
    }
  }
  
  return result;
}

function buildPreferenceProfile(parsedIRs: ParsedIR[]): LearnedPreferences {
  const mics: Record<string, number> = {};
  const positions: Record<string, number> = {};
  const distances: Record<string, number> = {};
  const speakers: Record<string, number> = {};
  
  for (const ir of parsedIRs) {
    if (ir.mic) mics[ir.mic] = (mics[ir.mic] || 0) + 1;
    if (ir.position) positions[ir.position] = (positions[ir.position] || 0) + 1;
    if (ir.distance) distances[ir.distance] = (distances[ir.distance] || 0) + 1;
    if (ir.speaker) speakers[ir.speaker] = (speakers[ir.speaker] || 0) + 1;
  }
  
  const sortByCount = (obj: Record<string, number>) => 
    Object.entries(obj)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  
  return {
    mics: sortByCount(mics),
    positions: sortByCount(positions),
    distances: sortByCount(distances).map(d => ({ value: d.name, count: d.count })),
    speakers: sortByCount(speakers),
    totalIRs: parsedIRs.length,
  };
}

function formatLearnedPreferencesForAI(prefs: LearnedPreferences): string {
  const parts: string[] = [];
  
  if (prefs.mics.length > 0) {
    parts.push(`Preferred mics: ${prefs.mics.slice(0, 5).map(m => `${m.name} (${m.count}x)`).join(', ')}`);
  }
  if (prefs.positions.length > 0) {
    parts.push(`Preferred positions: ${prefs.positions.slice(0, 5).map(p => `${p.name} (${p.count}x)`).join(', ')}`);
  }
  if (prefs.distances.length > 0) {
    parts.push(`Preferred distances: ${prefs.distances.slice(0, 5).map(d => `${d.value} (${d.count}x)`).join(', ')}`);
  }
  if (prefs.speakers.length > 0) {
    parts.push(`Speakers used: ${prefs.speakers.slice(0, 5).map(s => `${s.name} (${s.count}x)`).join(', ')}`);
  }
  
  if (parts.length === 0) return '';
  
  return `\n\nLEARNED USER PREFERENCES (from ${prefs.totalIRs} uploaded favorite IRs):
${parts.join('\n')}

IMPORTANT: Blend these preferences with professional best practices:
1. If user has multiple positions for the same mic (e.g., SM57 at Cap, CapEdge, Cone), they likely want full speaker coverage - recommend similar variety.
2. If user's preferred distances are suboptimal for the selected speaker/mic combo, suggest better alternatives while noting their preference (e.g., "Your favorite is 0.5in, but 1in often captures more body on this speaker - consider trying both").
3. Prioritize their preferred mics and positions, but adapt distances to what works best for this specific speaker.
4. Note any patterns you observe (preference for bright vs warm, close vs distant, coverage vs single sweet spot).`;
}

export default function Recommendations() {
  const [micType, setMicType] = useState<string>("");
  const [speaker, setSpeaker] = useState<string>("");
  const [genre, setGenre] = useState<string>("");
  const [customGenre, setCustomGenre] = useState<string>("");
  const [tonalText, setTonalText] = useState<string>("");
  const [preferredShots, setPreferredShots] = useState<string>("");
  const [showPreferences, setShowPreferences] = useState(false);
  const [ampDescription, setAmpDescription] = useState<string>("");
  const [positionList, setPositionList] = useState<string>("");
  const [importSpeaker, setImportSpeaker] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [showClarification, setShowClarification] = useState(false);
  const [pendingClarifications, setPendingClarifications] = useState<{ key: string; options: { value: string; label: string }[]; question: string }[]>([]);
  const [speakerClarifications, setSpeakerClarifications] = useState<Record<string, string>>({});
  
  // Learn From My IRs state
  const [showLearnSection, setShowLearnSection] = useState(false);
  const [learnedIRs, setLearnedIRs] = useState<ParsedIR[]>([]);
  const [learnedPrefs, setLearnedPrefs] = useState<LearnedPreferences | null>(null);
  
  const { toast } = useToast();
  
  // Dropzone for learning from IRs
  const onDropLearnIRs = useCallback((acceptedFiles: File[]) => {
    const parsed = acceptedFiles.map(f => parseIRFilename(f.name));
    const validParsed = parsed.filter(p => p.mic || p.position || p.distance || p.speaker);
    
    if (validParsed.length === 0) {
      toast({ 
        title: "Couldn't parse filenames", 
        description: "Make sure your IR files follow a naming convention with mic/position/distance info", 
        variant: "destructive" 
      });
      return;
    }
    
    const allParsed = [...learnedIRs, ...validParsed];
    setLearnedIRs(allParsed);
    setLearnedPrefs(buildPreferenceProfile(allParsed));
    
    toast({ 
      title: `Learned from ${validParsed.length} IRs`, 
      description: `Total: ${allParsed.length} favorite IRs analyzed` 
    });
  }, [learnedIRs, toast]);
  
  const { getRootProps: getLearnRootProps, getInputProps: getLearnInputProps, isDragActive: isLearnDragActive } = useDropzone({
    onDrop: onDropLearnIRs,
    accept: { 'audio/wav': ['.wav'] },
    multiple: true,
  });
  
  const clearLearnedPrefs = () => {
    setLearnedIRs([]);
    setLearnedPrefs(null);
  };
  
  const {
    recommendationsResult: result,
    setRecommendationsResult: setResult,
    speakerResult,
    setSpeakerResult,
    ampResult,
    setAmpResult,
    importResult,
    setImportResult,
    recommendationsMode: mode,
    setRecommendationsMode: setMode,
  } = useResults();

  // Detect ambiguous speakers in position list
  const detectAmbiguousSpeakers = (text: string): string[] => {
    const found: string[] = [];
    const lowerText = text.toLowerCase();
    
    for (const key of Object.keys(AMBIGUOUS_SPEAKERS)) {
      // Check if the ambiguous term appears (at start of line/string, or after underscore/space/hyphen)
      // but NOT as part of a full speaker name like GA12-SC64 or GA10-SC64
      const ambiguousRegex = new RegExp(`(^|[\\s_-])${key}([\\s_-]|$)`, 'im');
      const fullNameRegex = /(ga12[-_]?sc64|ga10[-_]?sc64|g10[-_]?sc64)/i;
      
      if (ambiguousRegex.test(lowerText) && !fullNameRegex.test(lowerText)) {
        found.push(key);
      }
    }
    
    return found;
  };

  // Apply clarifications to position list
  const applyClairifications = (text: string, clarifications: Record<string, string>): string => {
    let result = text;
    for (const [ambiguous, resolved] of Object.entries(clarifications)) {
      // Get the shorthand for the resolved speaker
      const resolvedShorthand = SPEAKER_SHORTHAND[resolved] || resolved.toUpperCase();
      // Replace ambiguous term with resolved shorthand
      const regex = new RegExp(`\\b${ambiguous}\\b`, 'gi');
      result = result.replace(regex, resolvedShorthand);
    }
    return result;
  };

  // Shorthand mappings for speakers
  const SPEAKER_SHORTHAND: Record<string, string> = {
    "celestion-cream": "Cream",
    "v30-china": "V30",
    "v30-blackcat": "V30BC",
    "g12m25": "G12M",
    "g12h30-anniversary": "G12H",
    "g12-65": "G12-65",
    "ga12-sc64": "GA12-SC64",
    "g10-sc64": "GA10-SC64",  // G10-SC64 speaker -> GA10-SC64 shorthand
    "k100": "K100",
    "g12t75": "G12T75",
  };

  // Shorthand mappings for mics
  const MIC_SHORTHAND: Record<string, { base: string; suffix?: string }> = {
    "57": { base: "SM57" },
    "121": { base: "R121" },
    "r92": { base: "R92" },
    "160": { base: "M160" },
    "421": { base: "MD421" },
    "441-boost": { base: "MD441", suffix: "_Presence" },
    "441-flat": { base: "MD441", suffix: "_Flat" },
    "r10": { base: "R10" },
    "m88": { base: "M88" },
    "pr30": { base: "PR30" },
    "e906-boost": { base: "e906", suffix: "_Presence" },
    "e906-flat": { base: "e906", suffix: "_Flat" },
    "m201": { base: "M201" },
    "sm7b": { base: "SM7B" },
    "c414": { base: "C414" },
    "roswell-cab": { base: "Roswell" },
  };

  const copyToClipboard = () => {
    let text = "";
    
    // Helper to get speaker shorthand from value
    const getSpeakerShorthand = (value: string) => {
      return SPEAKER_SHORTHAND[value] || value;
    };
    
    // Helper to get mic shorthand from value
    const getMicShorthand = (value: string) => {
      return MIC_SHORTHAND[value] || { base: value };
    };
    
    // Helper to format mic name and extract variant suffix from label
    const formatMicForShorthand = (micLabel: string) => {
      // Find matching mic by label
      const mic = MICS.find(m => m.label === micLabel);
      if (mic) {
        const shorthand = MIC_SHORTHAND[mic.value];
        if (shorthand) {
          return { baseMic: shorthand.base, suffix: shorthand.suffix || '' };
        }
      }
      
      // Fallback parsing
      let baseMic = micLabel;
      let suffix = '';
      
      if (micLabel.includes('Presence Boost')) {
        baseMic = micLabel.replace(/\s*\(Presence Boost\)/, '');
        suffix = '_Presence';
      } else if (micLabel.includes('Flat')) {
        baseMic = micLabel.replace(/\s*\(Flat\)/, '');
        suffix = '_Flat';
      }
      
      return { baseMic: baseMic.replace(/\s+/g, ''), suffix };
    };
    
    // Helper to format position - maps to new naming convention
    const formatPosition = (pos: string) => {
      const posLower = pos.toLowerCase().replace(/-/g, '_');
      
      // New position mappings
      const positionMap: Record<string, string> = {
        'cap': 'Cap',
        'cap_offcenter': 'Cap_OffCenter',
        'capoffcenter': 'Cap_OffCenter',
        'capedge': 'CapEdge',
        'cap_edge': 'CapEdge',
        'capedge_br': 'CapEdge_BR',
        'capedgebr': 'CapEdge_BR',
        'capedge_dk': 'CapEdge_DK',
        'capedgedk': 'CapEdge_DK',
        'cap_cone_tr': 'Cap_Cone_Tr',
        'capconetr': 'Cap_Cone_Tr',
        'cone': 'Cone',
        // Legacy mappings
        'cap_edge_favor_cap': 'CapEdge_BR',
        'capedge_favorcap': 'CapEdge_BR',
        'cap_edge_favor_cone': 'CapEdge_DK',
        'capedge_favorcone': 'CapEdge_DK',
        'cap_off_center': 'Cap_OffCenter',
      };
      
      return positionMap[posLower] || pos;
    };

    if (mode === 'by-speaker' && result) {
      text = `IR Suggestions for ${getSpeakerLabel(result.speaker)}\n`;
      text += `Microphone: ${getMicLabel(result.mic)}\n\n`;
      result.recommendations.forEach((rec, i) => {
        // Schema: Speaker_Mic_Position_distance_variant
        const speakerPart = getSpeakerShorthand(result.speaker);
        const micInfo = getMicShorthand(result.mic);
        const posPart = formatPosition(rec.bestFor);
        const distPart = `${rec.distance}in`;
        
        const shorthand = `${speakerPart}_${micInfo.base}_${posPart}_${distPart}${micInfo.suffix || ''}`;
        text += `${i + 1}. ${shorthand}\n`;
        text += `   Rationale: ${rec.rationale}\n\n`;
      });
    } else if (mode === 'by-speaker' && speakerResult) {
      text = `Mic Combinations for ${getSpeakerLabel(speakerResult.speaker)}\n\n`;
      speakerResult.micRecommendations.forEach((rec, i) => {
        // Schema: Speaker_Mic_Position_distance_variant
        const speakerPart = getSpeakerShorthand(speakerResult.speaker);
        const { baseMic, suffix } = formatMicForShorthand(rec.micLabel);
        const posPart = formatPosition(rec.position);
        const distPart = `${rec.distance}in`;
        
        const shorthand = `${speakerPart}_${baseMic}_${posPart}_${distPart}${suffix}`;
        text += `${i + 1}. ${shorthand}\n`;
        text += `   Tone: ${rec.expectedTone}\n\n`;
      });
    } else if (mode === 'by-amp' && ampResult) {
      text = `Speaker Recommendations for: ${ampResult.ampSummary}\n\n`;
      ampResult.speakerSuggestions.forEach((s, i) => {
        text += `${i + 1}. ${s.speakerLabel}\n`;
        text += `   Best for: ${s.bestFor}\n`;
        text += `   Tone: ${s.expectedTone}\n\n`;
      });
    }

    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Suggestions copied as shorthand list.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copySimpleList = () => {
    let items: string[] = [];
    
    // Helper for shorthand formatting
    const getSpeakerShorthand = (value: string) => SPEAKER_SHORTHAND[value] || value;
    const getMicShorthand = (value: string) => MIC_SHORTHAND[value] || { base: value };
    const formatPosition = (pos: string) => {
      const posLower = pos.toLowerCase().replace(/-/g, '_');
      const positionMap: Record<string, string> = {
        'cap': 'Cap', 'cap_offcenter': 'Cap_OffCenter', 'capedge': 'CapEdge',
        'capedge_br': 'CapEdge_BR', 'capedge_dk': 'CapEdge_DK',
        'cap_cone_tr': 'Cap_Cone_Tr', 'cone': 'Cone',
      };
      return positionMap[posLower] || pos;
    };
    const formatMicLabel = (micLabel: string) => {
      const mic = MICS.find(m => m.label === micLabel);
      if (mic) {
        const shorthand = MIC_SHORTHAND[mic.value];
        if (shorthand) return { baseMic: shorthand.base, suffix: shorthand.suffix || '' };
      }
      let baseMic = micLabel;
      let suffix = '';
      if (micLabel.includes('Presence Boost')) { baseMic = micLabel.replace(/\s*\(Presence Boost\)/, ''); suffix = '_Presence'; }
      else if (micLabel.includes('Flat')) { baseMic = micLabel.replace(/\s*\(Flat\)/, ''); suffix = '_Flat'; }
      return { baseMic: baseMic.replace(/\s+/g, ''), suffix };
    };

    if (mode === 'by-speaker' && result) {
      items = result.recommendations.map((rec) => {
        const speakerPart = getSpeakerShorthand(result.speaker);
        const micInfo = getMicShorthand(result.mic);
        const posPart = formatPosition(rec.bestFor);
        const distPart = `${rec.distance}in`;
        return `${speakerPart}_${micInfo.base}_${posPart}_${distPart}${micInfo.suffix || ''}`;
      });
    } else if (mode === 'by-speaker' && speakerResult) {
      items = speakerResult.micRecommendations.map((rec) => {
        const speakerPart = getSpeakerShorthand(speakerResult.speaker);
        const { baseMic, suffix } = formatMicLabel(rec.micLabel);
        const posPart = formatPosition(rec.position);
        const distPart = `${rec.distance}in`;
        return `${speakerPart}_${baseMic}_${posPart}_${distPart}${suffix}`;
      });
    } else if (mode === 'by-amp' && ampResult) {
      items = ampResult.speakerSuggestions.map((s) => s.speakerLabel);
    } else if (mode === 'import-positions' && importResult) {
      items = importResult.refinements.map(r => r.shorthand);
    }

    if (items.length === 0) return;

    // Sort alphabetically
    items.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const text = items.map((item, i) => `${i + 1}. ${item}`).join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied to clipboard", description: "Simple list copied." });
    setTimeout(() => setCopied(false), 2000);
  };

  // Mode: if mic is selected, use mic+speaker endpoint; otherwise use speaker-only endpoint
  const isSpeakerOnlyMode = !micType && speaker;

  const { mutate: getRecommendations, isPending } = useMutation({
    mutationFn: async ({ micType, speakerModel, genre, preferredShots }: { micType?: string; speakerModel: string; genre?: string; preferredShots?: string }) => {
      if (micType) {
        // Mic + Speaker mode
        const payload: { micType: string; speakerModel: string; genre?: string; preferredShots?: string } = { micType, speakerModel };
        if (genre) payload.genre = genre;
        if (preferredShots) payload.preferredShots = preferredShots;
        const validated = api.recommendations.get.input.parse(payload);
        const res = await fetch(api.recommendations.get.path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validated),
        });
        if (!res.ok) throw new Error("Failed to get recommendations");
        return { type: 'micSpeaker' as const, data: api.recommendations.get.responses[200].parse(await res.json()) };
      } else {
        // Speaker-only mode
        const payload: { speakerModel: string; genre?: string; preferredShots?: string } = { speakerModel };
        if (genre) payload.genre = genre;
        if (preferredShots) payload.preferredShots = preferredShots;
        const validated = api.recommendations.bySpeaker.input.parse(payload);
        const res = await fetch(api.recommendations.bySpeaker.path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validated),
        });
        if (!res.ok) throw new Error("Failed to get speaker recommendations");
        return { type: 'speakerOnly' as const, data: api.recommendations.bySpeaker.responses[200].parse(await res.json()) };
      }
    },
    onSuccess: (response) => {
      if (response.type === 'micSpeaker') {
        setResult(response.data);
        setSpeakerResult(null);
      } else {
        setSpeakerResult(response.data);
        setResult(null);
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate recommendations", variant: "destructive" });
    },
  });

  const { mutate: getAmpRecommendations, isPending: isAmpPending } = useMutation({
    mutationFn: async ({ ampDescription, genre }: { ampDescription: string; genre?: string }) => {
      const payload: { ampDescription: string; genre?: string } = { ampDescription };
      if (genre) payload.genre = genre;
      const validated = api.recommendations.byAmp.input.parse(payload);
      const res = await fetch(api.recommendations.byAmp.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to get amp recommendations");
      return api.recommendations.byAmp.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      setAmpResult(data);
      setResult(null);
      setSpeakerResult(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate amp-based recommendations", variant: "destructive" });
    },
  });

  const { mutate: refinePositions, isPending: isImportPending } = useMutation({
    mutationFn: async ({ positionList, speaker, genre }: { positionList: string; speaker?: string; genre?: string }) => {
      const payload: { positionList: string; speaker?: string; genre?: string } = { positionList };
      if (speaker) payload.speaker = speaker;
      if (genre) payload.genre = genre;
      const validated = api.positionImport.refine.input.parse(payload);
      const res = await fetch(api.positionImport.refine.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to analyze positions");
      return api.positionImport.refine.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      setImportResult(data);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to analyze positions", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!speaker) {
      toast({ title: "Select a speaker", description: "Please choose a speaker model", variant: "destructive" });
      return;
    }
    const effectiveGenre = buildEffectiveGenre();
    
    // Combine manual preferences with learned preferences
    let combinedPrefs = preferredShots.trim();
    if (learnedPrefs) {
      const learnedText = formatLearnedPreferencesForAI(learnedPrefs);
      combinedPrefs = combinedPrefs ? `${combinedPrefs}\n\n${learnedText}` : learnedText;
    }
    
    getRecommendations({ 
      micType: micType || undefined, 
      speakerModel: speaker, 
      genre: effectiveGenre,
      preferredShots: combinedPrefs || undefined
    });
  };

  const handleAmpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ampDescription.trim()) {
      toast({ title: "Describe your amp", description: "Please enter an amp description", variant: "destructive" });
      return;
    }
    const effectiveGenre = buildEffectiveGenre();
    getAmpRecommendations({ ampDescription: ampDescription.trim(), genre: effectiveGenre });
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!positionList.trim()) {
      toast({ title: "Paste your positions", description: "Please paste your tested IR positions", variant: "destructive" });
      return;
    }
    
    // Check for ambiguous speakers that need clarification
    const ambiguous = detectAmbiguousSpeakers(positionList);
    if (ambiguous.length > 0) {
      // Build list of pending clarifications
      const pending = ambiguous.map(key => ({
        key,
        ...AMBIGUOUS_SPEAKERS[key]
      }));
      setPendingClarifications(pending);
      setSpeakerClarifications({});
      setShowClarification(true);
      return;
    }
    
    // No ambiguous speakers, proceed directly
    processImport(positionList.trim());
  };

  const processImport = (positions: string) => {
    const effectiveGenre = buildEffectiveGenre();
    refinePositions({ 
      positionList: positions, 
      speaker: importSpeaker || undefined, 
      genre: effectiveGenre 
    });
  };

  const handleClarificationSubmit = () => {
    // Check all clarifications are filled
    const allFilled = pendingClarifications.every(p => speakerClarifications[p.key]);
    if (!allFilled) {
      toast({ title: "Please select all options", description: "Clarify all ambiguous speakers before proceeding", variant: "destructive" });
      return;
    }
    
    // Apply clarifications to position list and process
    const clarifiedList = applyClairifications(positionList, speakerClarifications);
    setShowClarification(false);
    setPendingClarifications([]);
    processImport(clarifiedList.trim());
  };

  const getMicLabel = (value: string) => MICS.find(m => m.value === value)?.label || value;
  const getSpeakerLabel = (value: string) => SPEAKERS.find(s => s.value === value)?.label || value;
  const getGenreLabel = (value: string) => {
    const found = GENRES.find(g => g.value === value);
    if (found) return found.label;
    return value; // Return custom genre as-is
  };
  
  const POSITION_LABELS: Record<string, string> = {
    "cap": "Cap",
    "cap_offcenter": "Cap_OffCenter",
    "capedge": "CapEdge",
    "capedge_br": "CapEdge_BR",
    "capedge_dk": "CapEdge_DK",
    "cap_cone_tr": "Cap_Cone_Tr",
    "cone": "Cone",
    // Legacy mappings
    "cap-edge": "CapEdge",
    "cap-edge-favor-cap": "CapEdge_BR",
    "cap-edge-favor-cone": "CapEdge_DK",
    "cap-off-center": "Cap_OffCenter",
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
  };

  const handleClearResults = () => {
    setResult(null);
    setSpeakerResult(null);
    setAmpResult(null);
    setImportResult(null);
    setMicType("");
    setSpeaker("");
    setGenre("");
    setCustomGenre("");
    setTonalText("");
    setAmpDescription("");
    setPositionList("");
    setImportSpeaker("");
  };

  const buildEffectiveGenre = () => {
    const parts: string[] = [];
    if (genre === 'custom') {
      if (customGenre.trim()) parts.push(customGenre.trim());
    } else if (genre) {
      parts.push(genre);
    }
    if (tonalText.trim()) parts.push(tonalText.trim());
    return parts.join('; ') || undefined;
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-white to-secondary pb-2">
            {mode === 'by-speaker' ? 'Mic Recommendations' : mode === 'by-amp' ? 'Speaker Recommendations' : 'Refine Shot List'}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {mode === 'by-speaker' 
              ? 'Get expert recommendations based on curated IR production knowledge. Select just a speaker to get mic/position/distance combos, or pick both mic and speaker for distance-focused advice.'
              : mode === 'by-amp'
              ? 'Describe your amp and get speaker recommendations based on classic amp/speaker pairings from legendary recordings.'
              : 'Paste your tested IR positions and get AI-powered suggestions to refine and expand your shot list.'}
          </p>
        </div>

        <div className="flex justify-center">
          <div className="inline-flex bg-black/30 border border-white/10 rounded-full p-1">
            <button
              type="button"
              onClick={() => handleModeChange('by-speaker')}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                mode === 'by-speaker'
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="button-mode-by-speaker"
            >
              <Speaker className="w-4 h-4" /> By Speaker
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('by-amp')}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                mode === 'by-amp'
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="button-mode-by-amp"
            >
              <Zap className="w-4 h-4" /> By Amp
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('import-positions')}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                mode === 'import-positions'
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="button-mode-import"
            >
              <FileText className="w-4 h-4" /> Import List
            </button>
          </div>
        </div>

        {mode === 'by-speaker' && (
        <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-2xl space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Mic2 className="w-3 h-3" /> Microphone (Optional)
              </label>
              <select
                value={micType}
                onChange={(e) => setMicType(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                data-testid="select-mic"
              >
                <option value="">Any - Suggest mics for me</option>
                {MICS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Leave blank to get mic recommendations for the speaker</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Speaker className="w-3 h-3" /> Speaker
              </label>
              <select
                value={speaker}
                onChange={(e) => setSpeaker(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                data-testid="select-speaker"
              >
                <option value="">Select a speaker...</option>
                {SPEAKERS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Music className="w-3 h-3" /> Genre (Optional)
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                data-testid="select-genre"
              >
                {GENRES.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
              {genre === 'custom' && (
                <input
                  type="text"
                  value={customGenre}
                  onChange={(e) => setCustomGenre(e.target.value)}
                  placeholder="Enter your genre (e.g., 'doom metal', 'shoegaze')"
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all mt-2"
                  data-testid="input-custom-genre"
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Target className="w-3 h-3" /> Tonal Goals (Optional)
              </label>
              <input
                type="text"
                value={tonalText}
                onChange={(e) => setTonalText(e.target.value)}
                placeholder="e.g., Green Day power pop, spanky cleans, thick rhythm..."
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                data-testid="input-tonal-text"
              />
              <p className="text-xs text-muted-foreground">Add specific tonal qualities or artist references</p>
            </div>
          </div>

          {/* Learn From My IRs Section */}
          <div className="border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setShowLearnSection(!showLearnSection)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-toggle-learn-section"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Learn From My Favorite IRs</span>
              <span className={cn(
                "transition-transform",
                showLearnSection ? "rotate-180" : ""
              )}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </span>
              {learnedPrefs && (
                <span className="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">
                  {learnedPrefs.totalIRs} IRs Learned
                </span>
              )}
            </button>
            
            <AnimatePresence>
              {showLearnSection && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-4">
                    <div
                      {...getLearnRootProps()}
                      className={cn(
                        "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                        isLearnDragActive 
                          ? "border-secondary bg-secondary/10" 
                          : "border-white/20 hover:border-white/40"
                      )}
                      data-testid="dropzone-learn-irs"
                    >
                      <input {...getLearnInputProps()} />
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {isLearnDragActive 
                          ? "Drop your favorite IRs here..." 
                          : "Drop IRs you love, or click to select"}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        The app will learn your mic/position/distance preferences from filenames
                      </p>
                    </div>
                    
                    {learnedPrefs && (
                      <div className="bg-black/20 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-foreground">Your Preference Profile</h4>
                          <button
                            type="button"
                            onClick={clearLearnedPrefs}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                            data-testid="button-clear-learned"
                          >
                            <X className="w-3 h-3" /> Clear
                          </button>
                        </div>
                        
                        {learnedPrefs.mics.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Preferred Mics:</p>
                            <div className="flex flex-wrap gap-1">
                              {learnedPrefs.mics.slice(0, 5).map((m, i) => (
                                <span key={i} className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                  {m.name} ({m.count}x)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {learnedPrefs.positions.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Preferred Positions:</p>
                            <div className="flex flex-wrap gap-1">
                              {learnedPrefs.positions.slice(0, 5).map((p, i) => (
                                <span key={i} className="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">
                                  {p.name} ({p.count}x)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {learnedPrefs.distances.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Preferred Distances:</p>
                            <div className="flex flex-wrap gap-1">
                              {learnedPrefs.distances.slice(0, 5).map((d, i) => (
                                <span key={i} className="text-xs bg-white/10 text-foreground px-2 py-0.5 rounded-full">
                                  {d.value} ({d.count}x)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {learnedPrefs.speakers.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Speakers Used:</p>
                            <div className="flex flex-wrap gap-1">
                              {learnedPrefs.speakers.slice(0, 5).map((s, i) => (
                                <span key={i} className="text-xs bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full">
                                  {s.name} ({s.count}x)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <p className="text-xs text-muted-foreground italic pt-2 border-t border-white/10">
                          AI recommendations will prioritize these learned preferences
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Preferred Shots Section */}
          <div className="border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setShowPreferences(!showPreferences)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-toggle-preferences"
            >
              <List className="w-4 h-4" />
              <span>My Preferred Shots/Distances</span>
              <span className={cn(
                "transition-transform",
                showPreferences ? "rotate-180" : ""
              )}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </span>
              {preferredShots.trim() && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Added</span>
              )}
            </button>
            
            <AnimatePresence>
              {showPreferences && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-2">
                    <textarea
                      value={preferredShots}
                      onChange={(e) => setPreferredShots(e.target.value)}
                      placeholder="List your preferred distances, positions, or existing shots...&#10;Examples:&#10;1in, 1.5in, 2in&#10;CapEdge at 1in&#10;SM57_CapEdge_1in&#10;Already have: V30_SM57_Cap_1in, want similar"
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none min-h-[100px]"
                      data-testid="input-preferred-shots"
                    />
                    <p className="text-xs text-muted-foreground">
                      The AI will prioritize these preferences when suggesting mic positions and distances. 
                      You can list distances you like, positions that work for you, or existing shots to build upon.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClearResults}
              className="px-4 py-3 rounded-xl font-medium text-sm border border-white/10 hover:bg-white/5 transition-all flex items-center gap-2"
              data-testid="button-clear-recommendations"
            >
              <Trash2 className="w-4 h-4" /> Clear
            </button>
            <button
              type="submit"
              disabled={!speaker || isPending || (genre === 'custom' && !customGenre.trim())}
              className={cn(
                "flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 shadow-lg flex items-center justify-center gap-2",
                !speaker || isPending
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/25 hover:-translate-y-0.5"
              )}
              data-testid="button-get-recommendations"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                </>
              ) : micType ? (
                <>
                  <Lightbulb className="w-4 h-4" /> Get Distance Recommendations
                </>
              ) : (
                <>
                  <ListFilter className="w-4 h-4" /> Get Mic Recommendations
                </>
              )}
            </button>
          </div>
        </form>
        )}

        {mode === 'by-amp' && (
        <form onSubmit={handleAmpSubmit} className="glass-panel p-6 rounded-2xl space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Zap className="w-3 h-3" /> Amp Description
            </label>
            <textarea
              value={ampDescription}
              onChange={(e) => setAmpDescription(e.target.value)}
              placeholder="Describe your amp... (e.g., 'Marshall JCM800 for classic rock', 'Mesa Dual Rectifier for modern metal', 'Fender Deluxe Reverb for cleans and edge of breakup')"
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none min-h-[100px]"
              data-testid="input-amp-description"
            />
            <p className="text-xs text-muted-foreground">
              Enter your amp model, type, or describe its characteristics. Include genre or style for refined suggestions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Music className="w-3 h-3" /> Genre (Optional)
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                data-testid="select-genre-amp"
              >
                {GENRES.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
              {genre === 'custom' && (
                <input
                  type="text"
                  value={customGenre}
                  onChange={(e) => setCustomGenre(e.target.value)}
                  placeholder="Enter your genre"
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all mt-2"
                  data-testid="input-custom-genre-amp"
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Target className="w-3 h-3" /> Tonal Goals (Optional)
              </label>
              <input
                type="text"
                value={tonalText}
                onChange={(e) => setTonalText(e.target.value)}
                placeholder="e.g., bright leads, thick rhythm, vintage warmth..."
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                data-testid="input-tonal-text-amp"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClearResults}
              className="px-4 py-3 rounded-xl font-medium text-sm border border-white/10 hover:bg-white/5 transition-all flex items-center gap-2"
              data-testid="button-clear-amp"
            >
              <Trash2 className="w-4 h-4" /> Clear
            </button>
            <button
              type="submit"
              disabled={!ampDescription.trim() || isAmpPending || (genre === 'custom' && !customGenre.trim())}
              className={cn(
                "flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 shadow-lg flex items-center justify-center gap-2",
                !ampDescription.trim() || isAmpPending
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/25 hover:-translate-y-0.5"
              )}
              data-testid="button-get-amp-recommendations"
            >
              {isAmpPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                </>
              ) : (
                <>
                  <Speaker className="w-4 h-4" /> Get Speaker Recommendations
                </>
              )}
            </button>
          </div>
        </form>
        )}

        {mode === 'import-positions' && (
        <form onSubmit={handleImportSubmit} className="glass-panel p-6 rounded-2xl space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileText className="w-3 h-3" /> Your Tested Positions
            </label>
            <textarea
              value={positionList}
              onChange={(e) => setPositionList(e.target.value)}
              placeholder={`Paste your IR positions here (one per line).
Accepts shorthand format:
  V30_SM57_CapEdge_2in
  Cream_e906_Cap_1in_Presence
  G12M_R121_Cone_1.5in

Or written out:
  SM57 on V30, cap edge, 2 inches
  Ribbon at 1" on cone`}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all min-h-[200px] font-mono"
              data-testid="textarea-position-list"
            />
            <p className="text-xs text-muted-foreground">
              Your tested positions are valuable starting points. We'll keep most of them and suggest complementary additions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Speaker className="w-3 h-3" /> Speaker (Optional)
              </label>
              <select
                value={importSpeaker}
                onChange={(e) => setImportSpeaker(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                data-testid="select-import-speaker"
              >
                <option value="">Auto-detect from list</option>
                {SPEAKERS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Optionally specify if all positions are for the same speaker</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Music className="w-3 h-3" /> Genre (Optional)
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                data-testid="select-genre-import"
              >
                {GENRES.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
              {genre === 'custom' && (
                <input
                  type="text"
                  value={customGenre}
                  onChange={(e) => setCustomGenre(e.target.value)}
                  placeholder="Enter your genre"
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all mt-2"
                  data-testid="input-custom-genre-import"
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Target className="w-3 h-3" /> Tonal Goals (Optional)
            </label>
            <input
              type="text"
              value={tonalText}
              onChange={(e) => setTonalText(e.target.value)}
              placeholder="e.g., Green Day power pop, spanky cleans, thick rhythm..."
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              data-testid="input-tonal-text-import"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClearResults}
              className="px-4 py-3 rounded-xl font-medium text-sm border border-white/10 hover:bg-white/5 transition-all flex items-center gap-2"
              data-testid="button-clear-import"
            >
              <Trash2 className="w-4 h-4" /> Clear
            </button>
            <button
              type="submit"
              disabled={!positionList.trim() || isImportPending}
              className={cn(
                "flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 shadow-lg flex items-center justify-center gap-2",
                !positionList.trim() || isImportPending
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/25 hover:-translate-y-0.5"
              )}
              data-testid="button-refine-positions"
            >
              {isImportPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" /> Refine Shot List
                </>
              )}
            </button>
          </div>
        </form>
        )}

        {/* Speaker Clarification Dialog */}
        <AnimatePresence>
          {showClarification && pendingClarifications.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-panel p-6 rounded-2xl space-y-6 border-2 border-amber-500/30 bg-amber-500/5"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">Clarification Needed</h3>
                  <p className="text-sm text-muted-foreground">
                    Some speaker names in your list are ambiguous. Please specify which speaker you're using:
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {pendingClarifications.map((clarification) => (
                  <div key={clarification.key} className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      {clarification.question}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {clarification.options.map((option) => (
                        <Button
                          key={option.value}
                          type="button"
                          variant={speakerClarifications[clarification.key] === option.value ? "default" : "outline"}
                          onClick={() => setSpeakerClarifications(prev => ({
                            ...prev,
                            [clarification.key]: option.value
                          }))}
                          data-testid={`button-clarify-${clarification.key}-${option.value}`}
                        >
                          <Speaker className="w-4 h-4 mr-2" />
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowClarification(false);
                    setPendingClarifications([]);
                  }}
                  data-testid="button-cancel-clarification"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleClarificationSubmit}
                  disabled={!pendingClarifications.every(p => speakerClarifications[p.key])}
                  data-testid="button-confirm-clarification"
                >
                  Continue Analysis
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mode === 'by-speaker' && result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-full border border-primary/20">
                    <Mic2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">{getMicLabel(result.mic)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copySimpleList}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
                      data-testid="button-copy-simple-list"
                    >
                      {copied ? <Check className="w-3 h-3 text-green-400" /> : <List className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy List"}
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
                      data-testid="button-copy-suggestions"
                    >
                      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy All"}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-muted-foreground">+</span>
                  <div className="flex items-center gap-2 bg-secondary/20 px-4 py-2 rounded-full border border-secondary/20">
                    <Speaker className="w-4 h-4 text-secondary" />
                    <span className="text-sm font-medium text-secondary">{getSpeakerLabel(result.speaker)}</span>
                  </div>
                  {result.genre && (
                    <>
                      <span className="text-muted-foreground">for</span>
                      <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/10">
                        <Music className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{getGenreLabel(result.genre)}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <p><span className="text-foreground font-medium">Mic:</span> {result.micDescription}</p>
                  <p><span className="text-foreground font-medium">Speaker:</span> {result.speakerDescription}</p>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white">Recommended Distances</h3>

              <div className="grid gap-4">
                {result.recommendations.map((rec, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-panel p-5 rounded-xl space-y-3"
                    data-testid={`card-recommendation-${i}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-primary/30 px-4 py-2 rounded-full border border-primary/30">
                          <Ruler className="w-4 h-4 text-primary" />
                          <span className="text-lg font-bold text-primary">{rec.distance}"</span>
                        </div>
                        <span className="text-sm text-muted-foreground font-medium">{rec.bestFor}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 pl-1">
                      <p className="text-sm text-muted-foreground">
                        <span className="text-foreground font-medium">Why:</span> {rec.rationale}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <span className="text-foreground font-medium">Expected Tone:</span> {rec.expectedTone}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {result.bestPositions && result.bestPositions.length > 0 && (
                <>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2 pt-4">
                    <Target className="w-5 h-5 text-secondary" />
                    Best Positions for This Mic + Speaker
                  </h3>
                  <div className="grid gap-3">
                    {result.bestPositions.map((pos, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-3 glass-panel p-4 rounded-xl"
                        data-testid={`card-position-${i}`}
                      >
                        <span className="shrink-0 px-3 py-1.5 rounded-full bg-secondary/20 text-secondary text-sm font-medium border border-secondary/20">
                          {POSITION_LABELS[pos.position] || pos.position}
                        </span>
                        <p className="text-sm text-muted-foreground">{pos.reason}</p>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {mode === 'by-speaker' && speakerResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 bg-secondary/20 px-4 py-2 rounded-full border border-secondary/20">
                    <Speaker className="w-4 h-4 text-secondary" />
                    <span className="text-sm font-medium text-secondary">{getSpeakerLabel(speakerResult.speaker)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copySimpleList}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
                      data-testid="button-copy-simple-list-speaker"
                    >
                      {copied ? <Check className="w-3 h-3 text-green-400" /> : <List className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy List"}
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
                      data-testid="button-copy-speaker-suggestions"
                    >
                      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy All"}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {speakerResult.genre && (
                    <>
                      <span className="text-muted-foreground">for</span>
                      <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/10">
                        <Music className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{getGenreLabel(speakerResult.genre)}</span>
                      </div>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground font-medium">Speaker:</span> {speakerResult.speakerDescription}
                </p>
                <p className="text-sm text-muted-foreground italic">{speakerResult.summary}</p>
              </div>

              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ListFilter className="w-5 h-5 text-primary" />
                Recommended Mic/Position/Distance Combos
              </h3>

              <div className="grid gap-4">
                {speakerResult.micRecommendations.map((rec, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-panel p-5 rounded-xl space-y-3"
                    data-testid={`card-mic-recommendation-${i}`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 bg-primary/30 px-3 py-1.5 rounded-full border border-primary/30">
                        <Mic2 className="w-4 h-4 text-primary" />
                        <span className="text-sm font-bold text-primary">{rec.micLabel}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-secondary/30 px-3 py-1.5 rounded-full border border-secondary/30">
                        <Target className="w-4 h-4 text-secondary" />
                        <span className="text-sm font-medium text-secondary">{POSITION_LABELS[rec.position] || rec.position}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                        <Ruler className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{rec.distance}"</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium ml-auto">{rec.bestFor}</span>
                    </div>
                    
                    <div className="space-y-2 pl-1">
                      <p className="text-sm text-muted-foreground">
                        <span className="text-foreground font-medium">Why:</span> {rec.rationale}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <span className="text-foreground font-medium">Expected Tone:</span> {rec.expectedTone}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {mode === 'by-amp' && ampResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-full border border-primary/20">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Amp Analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copySimpleList}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
                      data-testid="button-copy-simple-list-amp"
                    >
                      {copied ? <Check className="w-3 h-3 text-green-400" /> : <List className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy List"}
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
                      data-testid="button-copy-amp-suggestions"
                    >
                      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy All"}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground font-medium">Your Amp:</span> {ampResult.ampSummary}
                </p>
                <p className="text-sm text-muted-foreground italic">{ampResult.summary}</p>
              </div>

              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Speaker className="w-5 h-5 text-secondary" />
                Recommended Speakers
              </h3>

              <div className="grid gap-4">
                {ampResult.speakerSuggestions.map((suggestion, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-panel p-5 rounded-xl space-y-3"
                    data-testid={`card-speaker-suggestion-${i}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-secondary/30 px-4 py-2 rounded-full border border-secondary/30">
                          <Speaker className="w-4 h-4 text-secondary" />
                          <span className="text-lg font-bold text-secondary">{suggestion.speakerLabel}</span>
                        </div>
                        <span className="text-sm text-muted-foreground font-medium">{suggestion.bestFor}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 pl-1">
                      <p className="text-sm text-muted-foreground">
                        <span className="text-foreground font-medium">Why:</span> {suggestion.rationale}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <span className="text-foreground font-medium">Expected Tone:</span> {suggestion.expectedTone}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {mode === 'import-positions' && importResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-full border border-primary/20">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Shot List Analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copySimpleList}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
                      data-testid="button-copy-simple-list-import"
                    >
                      {copied ? <Check className="w-3 h-3 text-green-400" /> : <List className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy List"}
                    </button>
                    <button
                      onClick={() => {
                        const shorthandList = importResult.refinements
                          .filter(r => r.type !== 'remove' && r.shorthand)
                          .map(r => r.shorthand)
                          .join('\n');
                        navigator.clipboard.writeText(shorthandList);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
                      data-testid="button-copy-refined-list"
                    >
                      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy All"}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded">
                      {importResult.refinements.filter(r => r.type === 'keep').length} Keep
                    </span>
                    <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                      {importResult.refinements.filter(r => r.type === 'add').length} Add
                    </span>
                    {importResult.refinements.filter(r => r.type === 'modify').length > 0 && (
                      <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                        {importResult.refinements.filter(r => r.type === 'modify').length} Modify
                      </span>
                    )}
                    {importResult.refinements.filter(r => r.type === 'remove').length > 0 && (
                      <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded">
                        {importResult.refinements.filter(r => r.type === 'remove').length} Remove
                      </span>
                    )}
                </div>
                <p className="text-sm text-muted-foreground italic">{importResult.summary}</p>
              </div>

              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ListFilter className="w-5 h-5 text-primary" />
                Refined Shot List
              </h3>

              <div className="grid gap-3">
                {importResult.refinements.map((ref, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "glass-panel p-4 rounded-xl space-y-2",
                      ref.type === 'keep' && "bg-green-500/5 border-green-500/30",
                      ref.type === 'add' && "bg-blue-500/5 border-blue-500/30",
                      ref.type === 'modify' && "bg-yellow-500/5 border-yellow-500/30",
                      ref.type === 'remove' && "bg-red-500/5 border-red-500/30"
                    )}
                    data-testid={`card-refinement-${i}`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase",
                        ref.type === 'keep' && "bg-green-500/20 text-green-400",
                        ref.type === 'add' && "bg-blue-500/20 text-blue-400",
                        ref.type === 'modify' && "bg-yellow-500/20 text-yellow-400",
                        ref.type === 'remove' && "bg-red-500/20 text-red-400"
                      )}>
                        {ref.type === 'keep' && <CheckCircle className="w-3 h-3" />}
                        {ref.type === 'add' && <PlusCircle className="w-3 h-3" />}
                        {ref.type === 'modify' && <RefreshCw className="w-3 h-3" />}
                        {ref.type === 'remove' && <ArrowRight className="w-3 h-3 rotate-45" />}
                        {ref.type}
                      </div>
                      {ref.shorthand && (
                        <code className="text-sm font-mono bg-black/30 px-2 py-1 rounded text-primary">
                          {ref.shorthand}
                        </code>
                      )}
                      {ref.original && ref.type !== 'keep' && (
                        <span className="text-xs text-muted-foreground">
                          from: <span className="font-mono">{ref.original}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{ref.suggestion}</p>
                    <p className="text-xs text-muted-foreground/70 italic">{ref.rationale}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
