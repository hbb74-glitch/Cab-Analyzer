import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { Loader2, Lightbulb, Mic2, Speaker, Ruler, Music, Target, ListFilter, Zap, Copy, Check, FileText, ArrowRight, CheckCircle, PlusCircle, RefreshCw, AlertCircle, Trash2, List, Upload, X, BarChart3, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useResults } from "@/context/ResultsContext";
import { apiRequest } from "@/lib/queryClient";
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

const SINGLE_MICS = [
  { value: "57", label: "SM57" },
  { value: "121", label: "R121" },
  { value: "r92", label: "R92" },
  { value: "160", label: "M160" },
  { value: "421", label: "MD421" },
  { value: "421k", label: "MD421K (Kompakt)" },
  { value: "md441", label: "MD441" },
  { value: "r10", label: "R10" },
  { value: "m88", label: "M88" },
  { value: "pr30", label: "PR30" },
  { value: "e906", label: "e906" },
  { value: "m201", label: "M201" },
  { value: "sm7b", label: "SM7B" },
  { value: "c414", label: "C414" },
  { value: "roswell-cab", label: "Roswell Cab Mic" },
];

const BLEND_MICS = [
  { value: "sm57_r121_blend", label: "SM57+R121 Blend" },
  { value: "fredman", label: "Fredman (Dual SM57)" },
];

const MICS = [...SINGLE_MICS, ...BLEND_MICS];
const BLEND_MIC_VALUES = BLEND_MICS.map(m => m.value);

// Mic recipe type for structured input
type MicRecipeEntry = { mic: string; label: string; count: number; singleDistance: boolean; singlePosition: boolean };

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
  { value: "classic-rock", label: "Classic Rock" },
  { value: "hard-rock", label: "Hard Rock" },
  { value: "alt-rock", label: "Alt Rock" },
  { value: "punk", label: "Punk" },
  { value: "grunge", label: "Grunge" },
  { value: "metal", label: "Metal" },
  { value: "thrash", label: "Thrash" },
  { value: "doom-stoner", label: "Doom/Stoner" },
  { value: "indie", label: "Indie" },
  { value: "blues", label: "Blues" },
  { value: "jazz", label: "Jazz" },
  { value: "country", label: "Country" },
  { value: "funk", label: "Funk" },
  { value: "shoegaze", label: "Shoegaze" },
  { value: "post-punk", label: "Post-Punk" },
];

const TONALITIES = [
  { value: "bright", label: "Bright" },
  { value: "dark", label: "Dark" },
  { value: "warm", label: "Warm" },
  { value: "natural", label: "Natural" },
  { value: "clear", label: "Clear" },
  { value: "aggressive", label: "Aggressive" },
  { value: "smooth", label: "Smooth" },
  { value: "punchy", label: "Punchy" },
  { value: "thick", label: "Thick" },
  { value: "scooped", label: "Scooped" },
  { value: "mid-forward", label: "Mid-Forward" },
  { value: "clean-headroom", label: "Clean Headroom" },
  { value: "crunchy", label: "Crunchy" },
  { value: "saturated", label: "Saturated" },
];

type Mode = 'by-speaker' | 'by-amp' | 'import-positions' | 'shot-designer' | 'gap-finder';

// Filename parsing patterns (same as Analyzer.tsx)
const PREF_MIC_PATTERNS: Record<string, string> = {
  "sm57": "SM57", "57": "SM57",
  "r121": "R121", "r-121": "R121", "121": "R121",
  "r92": "R92", "aear92": "R92", "aea-r92": "R92",
  "m160": "M160", "160": "M160",
  "md421": "MD421", "421": "MD421",
  "421kompakt": "MD421", "421-kompakt": "MD421", "kompakt": "MD421", "md421kmp": "MD421", "421kmp": "MD421",
  "md441presence": "MD441", "md441_presence": "MD441", "md441-presence": "MD441", 
  "441presence": "MD441", "441_presence": "MD441", "441-presence": "MD441",
  "md441boost": "MD441", "md441-boost": "MD441", "441boost": "MD441", "441-boost": "MD441",
  "md441flat": "MD441", "md441-flat": "MD441", "md441_flat": "MD441",
  "441flat": "MD441", "441-flat": "MD441", "441_flat": "MD441",
  "md441": "MD441", "441": "MD441",
  "r10": "R10",
  "m88": "M88", "88": "M88",
  "pr30": "PR30", "30": "PR30",
  "e906boost": "e906", "e906-boost": "e906", "906boost": "e906",
  "e906presence": "e906", "e906-presence": "e906", "906presence": "e906",
  "e906flat": "e906", "e906-flat": "e906", "906flat": "e906", "e906": "e906",
  "m201": "M201", "201": "M201",
  "sm7b": "SM7B", "sm7": "SM7B", "7b": "SM7B",
  "c414": "C414", "akgc414": "C414", "akg-c414": "C414", "414": "C414",
  "roswellcab": "Roswell", "roswell-cab": "Roswell", "roswell": "Roswell",
};

const PREF_POSITION_PATTERNS: Record<string, string> = {
  "capedge_br": "CapEdge_BR", "capedgebr": "CapEdge_BR",
  "capedge_dk": "CapEdge_DK", "capedgedk": "CapEdge_DK",
  "capedge_cone_tr": "CapEdge_Cone_Tr", "capedgeconetr": "CapEdge_Cone_Tr", "cone_tr": "CapEdge_Cone_Tr", "cap_cone_tr": "CapEdge_Cone_Tr", "capconetr": "CapEdge_Cone_Tr",
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

interface MicDistancePreference {
  mic: string;
  distances: { value: string; count: number }[];
}

interface MicPositionPreference {
  mic: string;
  positions: { value: string; count: number }[];
}

interface LearnedPreferences {
  mics: { name: string; count: number }[];
  positions: { name: string; count: number }[];
  distances: { value: string; count: number }[];
  speakers: { name: string; count: number }[];
  micDistances: MicDistancePreference[];
  micPositions: MicPositionPreference[];
  totalIRs: number;
}

// Sort recommendations by: mic → distance (shorter first) → position (Cap first, Cone last)
function sortRecommendations<T extends { micLabel?: string; distance?: string; position?: string }>(items: T[], fallbackMic?: string): T[] {
  const getPositionOrder = (pos: string): number => {
    const posLower = (pos || '').toLowerCase().replace(/-/g, '_').replace(/ /g, '_');
    const order: Record<string, number> = {
      'cap': 1, 'cap_offcenter': 2, 'capedge_br': 3, 'capedge': 4, 
      'cap_cone_tr': 5, 'capedge_cone_tr': 5, 'capedge_dk': 6, 'cone': 7
    };
    return order[posLower] || 99;
  };
  
  // Normalize mic name for sorting (strip voicing/settings)
  const normalizeMic = (mic: string): string => {
    return (mic || '').toLowerCase()
      .replace(/\s*\(presence(?:\s+boost)?\)/i, '')
      .replace(/\s*\(flat\)/i, '')
      .replace(/\s*presence\s*/i, '')
      .replace(/\s*flat\s*/i, '')
      .trim();
  };
  
  return [...items].sort((a, b) => {
    // 1. Sort by mic name (alphabetically), use fallbackMic if micLabel is missing
    const micA = normalizeMic(a.micLabel || fallbackMic || '');
    const micB = normalizeMic(b.micLabel || fallbackMic || '');
    if (micA !== micB) return micA.localeCompare(micB);
    
    // 2. Sort by distance (shorter first)
    const distA = parseFloat(a.distance || '0') || 0;
    const distB = parseFloat(b.distance || '0') || 0;
    if (distA !== distB) return distA - distB;
    
    // 3. Sort by position (Cap first, Cone last)
    return getPositionOrder(a.position || '') - getPositionOrder(b.position || '');
  });
}

function parseIRFilename(filename: string): ParsedIR {
  const result: ParsedIR = { filename };
  const name = filename.toLowerCase().replace('.wav', '');
  const parts = name.split(/[_\-\s]+/);
  const fullName = parts.join('');
  
  // Match mics - sort by pattern length to match longer patterns first
  {
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
  const micDistanceMap: Record<string, Record<string, number>> = {};
  const micPositionMap: Record<string, Record<string, number>> = {};
  
  for (const ir of parsedIRs) {
    if (ir.mic) mics[ir.mic] = (mics[ir.mic] || 0) + 1;
    if (ir.position) positions[ir.position] = (positions[ir.position] || 0) + 1;
    if (ir.distance) distances[ir.distance] = (distances[ir.distance] || 0) + 1;
    if (ir.speaker) speakers[ir.speaker] = (speakers[ir.speaker] || 0) + 1;
    
    // Track mic-specific distance preferences
    if (ir.mic && ir.distance) {
      if (!micDistanceMap[ir.mic]) micDistanceMap[ir.mic] = {};
      micDistanceMap[ir.mic][ir.distance] = (micDistanceMap[ir.mic][ir.distance] || 0) + 1;
    }
    
    // Track mic-specific position preferences
    if (ir.mic && ir.position) {
      if (!micPositionMap[ir.mic]) micPositionMap[ir.mic] = {};
      micPositionMap[ir.mic][ir.position] = (micPositionMap[ir.mic][ir.position] || 0) + 1;
    }
  }
  
  const sortByCount = (obj: Record<string, number>) => 
    Object.entries(obj)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  
  // Build mic-specific distance preferences
  const micDistances: MicDistancePreference[] = Object.entries(micDistanceMap)
    .map(([mic, distCounts]) => ({
      mic,
      distances: Object.entries(distCounts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
    }))
    .sort((a, b) => {
      const totalA = a.distances.reduce((sum, d) => sum + d.count, 0);
      const totalB = b.distances.reduce((sum, d) => sum + d.count, 0);
      return totalB - totalA;
    });
  
  // Build mic-specific position preferences
  const micPositions: MicPositionPreference[] = Object.entries(micPositionMap)
    .map(([mic, posCounts]) => ({
      mic,
      positions: Object.entries(posCounts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
    }))
    .sort((a, b) => {
      const totalA = a.positions.reduce((sum, p) => sum + p.count, 0);
      const totalB = b.positions.reduce((sum, p) => sum + p.count, 0);
      return totalB - totalA;
    });
  
  return {
    mics: sortByCount(mics),
    positions: sortByCount(positions),
    distances: sortByCount(distances).map(d => ({ value: d.name, count: d.count })),
    speakers: sortByCount(speakers),
    micDistances,
    micPositions,
    totalIRs: parsedIRs.length,
  };
}

function formatLearnedPreferencesForAI(prefs: LearnedPreferences): string {
  const parts: string[] = [];
  
  if (prefs.mics.length > 0) {
    parts.push(`Preferred mics: ${prefs.mics.slice(0, 5).map(m => `${m.name} (${m.count}x)`).join(', ')}`);
  }
  if (prefs.speakers.length > 0) {
    parts.push(`Speakers used: ${prefs.speakers.slice(0, 5).map(s => `${s.name} (${s.count}x)`).join(', ')}`);
  }
  
  // Add mic-specific position preferences (this shows coverage style per mic)
  if (prefs.micPositions.length > 0) {
    parts.push(`\nMIC-SPECIFIC POSITION PREFERENCES (shows their coverage approach per mic):`);
    for (const mp of prefs.micPositions.slice(0, 8)) {
      const posStr = mp.positions.slice(0, 6).map(p => `${p.value} (${p.count}x)`).join(', ');
      parts.push(`  ${mp.mic}: ${posStr}`);
    }
  }
  
  // Add mic-specific distance preferences (this is key!)
  if (prefs.micDistances.length > 0) {
    parts.push(`\nMIC-SPECIFIC DISTANCE PREFERENCES (treat as deliberate choices):`);
    for (const md of prefs.micDistances.slice(0, 8)) {
      const distStr = md.distances.slice(0, 4).map(d => `${d.value} (${d.count}x)`).join(', ');
      parts.push(`  ${md.mic}: ${distStr}`);
    }
  }
  
  if (parts.length === 0) return '';
  
  return `\n\nLEARNED USER PREFERENCES (from ${prefs.totalIRs} uploaded favorite IRs):
${parts.join('\n')}

CRITICAL - MIC-SPECIFIC POSITION AND DISTANCE HANDLING:
The user's position and distance choices for each mic are DELIBERATE and mic-specific.

POSITIONS PER MIC:
- If SM57 shows Cap, CapEdge, Cone, Edge - they want FULL SPEAKER COVERAGE with SM57. Recommend ALL those positions for SM57 on the new speaker.
- If R121 only shows Cap, CapEdge - they prefer a narrower coverage for ribbon mics. Respect that.
- The number of positions per mic shows their coverage philosophy for that mic type.

DISTANCES PER MIC:
- If SM57 is consistently at 2", that's the user's preferred SM57 distance
- If R121 is consistently at 4", that's the user's preferred R121 distance
- If a mic like Roswell shows multiple distances (4", 5", 6"), the user likes that range for that specific mic

MULTIPLE SHOTS AT SAME DISTANCE (important pattern):
- If user has 3 shots at 2" (Cap 2", CapEdge 2", Cone 2"), they want POSITION VARIETY at their preferred distance
- This means: recommend multiple positions at their preferred distance, not just one shot per distance
- Example: If SM57 shows 4 shots all at 2" with different positions, recommend 4 shots at 2" with different positions for the new speaker

When recommending:
1. For each mic, recommend the SAME positions they used for that mic in their favorites
2. Use the mic-specific distance preference for that mic
3. If recommending a mic the user hasn't used, explain why you're suggesting particular positions/distances
4. If you think a different distance/position would work better for the selected speaker, explain the trade-off

COMPLETE SET GUIDANCE - FILL THE GAPS:
Your goal is to help the user create a COMPLETE, production-ready IR set for mixing. Beyond their preferences:
1. If they only use dynamic mics, suggest adding a ribbon (like R121) or condenser (like U87) for tonal variety and blending options
2. If they're missing key positions (Cap, CapEdge, Cone, Edge), suggest adding them for fuller speaker coverage
3. If all their distances are close (1-2"), suggest a mid-distance option (3-4") for more room/body
4. If all their distances are far, suggest a close option for more attack/definition
5. Suggest complementary mics that blend well with their favorites (e.g., SM57 + R121 is a classic pairing)
6. Label additional suggestions clearly as "Suggested additions for a complete set" so user knows these are beyond their learned preferences
7. Explain WHY each addition is useful for mixing/production (e.g., "Adding an R121 at CapEdge gives you a darker option to blend with your SM57 for fuller mids")

Also blend with professional best practices:
- If user has multiple positions for the same mic, they likely want full speaker coverage
- Note patterns (preference for bright vs warm, close vs distant, coverage vs single sweet spot)`;
}

function ShotDesignerPanel({ speakers, genres }: { speakers: { value: string; label: string }[]; genres: { value: string; label: string }[] }) {
  const [designSpeaker, setDesignSpeaker] = useState("");
  const [designGenre, setDesignGenre] = useState("");
  const [targetCount, setTargetCount] = useState(10);
  const [designResult, setDesignResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: profileData, isLoading: profilesLoading } = useQuery({
    queryKey: ['/api/tonal-profiles'],
  });

  const designMutation = useMutation({
    mutationFn: async (input: { speaker: string; genre?: string; targetCount?: number }) => {
      const res = await apiRequest('POST', '/api/tonal-profiles/design-shots', input);
      return res.json();
    },
    onSuccess: (data) => {
      setDesignResult(data);
    },
    onError: () => {
      toast({ title: "Failed to design shots", variant: "destructive" });
    },
  });

  const handleDesign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!designSpeaker) return;
    designMutation.mutate({
      speaker: designSpeaker,
      genre: designGenre || undefined,
      targetCount,
    });
  };

  const profileCount = Array.isArray(profileData) ? profileData.length : 0;
  const speakerProfileCount = Array.isArray(profileData)
    ? profileData.filter((p: any) => p.speaker?.toLowerCase().replace(/[^a-z0-9]/g, '') === designSpeaker.toLowerCase().replace(/[^a-z0-9]/g, '')).length
    : 0;

  const confidenceColor = (c: string) => {
    if (c === 'high') return 'text-green-400 bg-green-500/20';
    if (c === 'medium') return 'text-yellow-400 bg-yellow-500/20';
    return 'text-orange-400 bg-orange-500/20';
  };

  const copyShotList = () => {
    if (!designResult?.shots) return;
    const list = designResult.shots.map((s: any) =>
      `${s.mic}@${s.position}_${s.distance}"`
    ).join('\n');
    navigator.clipboard.writeText(list);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleDesign} className="glass-panel p-6 rounded-2xl space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/20">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Tonal Intelligence</h3>
            <p className="text-xs text-muted-foreground">
              {profilesLoading
                ? 'Loading tonal data...'
                : profileCount > 0
                ? `${profileCount} mic/position profiles learned from your batch analyses`
                : 'No tonal data yet -- run batch analysis to start learning'}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Speaker className="w-3 h-3" /> Speaker
            </label>
            <select
              value={designSpeaker}
              onChange={(e) => setDesignSpeaker(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              data-testid="select-design-speaker"
            >
              <option value="">Select speaker...</option>
              {speakers.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {designSpeaker && (
              <p className="text-xs text-muted-foreground">
                {speakerProfileCount > 0
                  ? `${speakerProfileCount} profiles for this speaker`
                  : 'No data for this speaker yet -- will use cross-speaker data'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Music className="w-3 h-3" /> Genre / Tone (Optional)
            </label>
            <select
              value={designGenre}
              onChange={(e) => setDesignGenre(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              data-testid="select-design-genre"
            >
              <option value="">Versatile (all genres)</option>
              {genres.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Target className="w-3 h-3" /> Target Shot Count: {targetCount}
          </label>
          <input
            type="range"
            min={3}
            max={25}
            value={targetCount}
            onChange={(e) => setTargetCount(Number(e.target.value))}
            className="w-full accent-primary"
            data-testid="slider-target-count"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>3 (focused)</span>
            <span>25 (comprehensive)</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!designSpeaker || designMutation.isPending || profilesLoading || profileCount === 0}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 shadow-lg flex items-center justify-center gap-2",
              !designSpeaker || designMutation.isPending || profilesLoading || profileCount === 0
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/25 hover:-translate-y-0.5"
            )}
            data-testid="button-design-shots"
          >
            {designMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Designing...</>
            ) : (
              <><Lightbulb className="w-4 h-4" /> Design Shot List</>
            )}
          </button>
        </div>
      </form>

      {designResult && designResult.shots && designResult.shots.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-full border border-primary/20">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  {designResult.shots.length} Shots Designed
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs px-2 py-1 rounded",
                  designResult.dataSource === 'speaker-specific'
                    ? "bg-green-500/20 text-green-400"
                    : "bg-yellow-500/20 text-yellow-400"
                )}>
                  {designResult.dataSource === 'speaker-specific'
                    ? `${designResult.speakerProfileCount} speaker profiles`
                    : `${designResult.profileCount} cross-speaker profiles`}
                </span>
                <button
                  onClick={copyShotList}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
                  data-testid="button-copy-shot-list"
                >
                  {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied!" : "Copy List"}
                </button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground italic">{designResult.summary}</p>
          </div>

          <div className="grid gap-3">
            {designResult.shots.map((shot: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-panel p-4 rounded-xl space-y-3"
                data-testid={`card-shot-${i}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <code className="text-sm font-mono bg-black/30 px-2 py-1 rounded text-primary">
                    {shot.mic}@{shot.position}_{shot.distance}"
                  </code>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded font-medium",
                    confidenceColor(shot.confidence)
                  )}>
                    {shot.confidence}
                  </span>
                  <span className="text-xs text-muted-foreground">{shot.mixingRole}</span>
                </div>

                {shot.predictedTone && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-white/5 px-2 py-1 rounded">Mid {shot.predictedTone.mid}%</span>
                    <span className="bg-white/5 px-2 py-1 rounded">HiMid {shot.predictedTone.highMid}%</span>
                    <span className="bg-white/5 px-2 py-1 rounded">Pres {shot.predictedTone.presence}%</span>
                    <span className="bg-white/5 px-2 py-1 rounded">Ratio {shot.predictedTone.ratio}</span>
                    {shot.predictedTone.centroid && (
                      <span className="bg-white/5 px-2 py-1 rounded">{Math.round(shot.predictedTone.centroid)} Hz</span>
                    )}
                  </div>
                )}

                <p className="text-sm text-muted-foreground">{shot.predictedTone?.character || shot.whyIncluded}</p>
                <p className="text-xs text-muted-foreground/70 italic">{shot.confidenceReason}</p>

                {shot.blendsWith && shot.blendsWith.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <span className="text-foreground/70">Blends with:</span>{' '}
                    {shot.blendsWith.join(', ')}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {designResult.mixingPairs && designResult.mixingPairs.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                Mixing Pairs
              </h3>
              <div className="grid gap-3">
                {designResult.mixingPairs.map((pair: any, i: number) => (
                  <div
                    key={i}
                    className="glass-panel p-4 rounded-xl space-y-2"
                    data-testid={`card-mixing-pair-${i}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="text-xs font-mono bg-primary/20 px-2 py-1 rounded text-primary">{pair.shot1}</code>
                      <span className="text-xs text-muted-foreground">+</span>
                      <code className="text-xs font-mono bg-primary/20 px-2 py-1 rounded text-primary">{pair.shot2}</code>
                      {pair.suggestedRatio && (
                        <span className="text-xs bg-white/5 px-2 py-1 rounded">{pair.suggestedRatio}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{pair.blendResult}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {designResult.tonalCoverage && (
            <div className="glass-panel p-4 rounded-xl">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Tonal Coverage</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(designResult.tonalCoverage).map(([key, val]) => (
                  <span
                    key={key}
                    className={cn(
                      "text-xs px-2 py-1 rounded capitalize",
                      val ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    )}
                  >
                    {val ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <AlertCircle className="w-3 h-3 inline mr-1" />}
                    {key}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {designResult && (!designResult.shots || designResult.shots.length === 0) && (
        <div className="glass-panel p-6 rounded-2xl text-center space-y-3">
          <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">{designResult.summary || 'No shot data available yet.'}</p>
          <p className="text-xs text-muted-foreground/70">
            Run batch analysis on your IRs first. Each analysis teaches the system what mic/position/distance combinations actually sound like.
          </p>
        </div>
      )}
    </div>
  );
}

interface AnalyzedIr {
  filename: string;
  subBass: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  presence: number;
  ratio: number;
  centroid: number;
  smoothness: number;
}

function GapFinderPanel({ speakers, genres }: { speakers: { value: string; label: string }[]; genres: { value: string; label: string }[] }) {
  const [gfSpeaker, setGfSpeaker] = useState("");
  const [gfGenre, setGfGenre] = useState("");
  const [gfTargetCount, setGfTargetCount] = useState(5);
  const [analyzedIrs, setAnalyzedIrs] = useState<AnalyzedIr[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState({ done: 0, total: 0 });
  const [gapResult, setGapResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const wavFiles = acceptedFiles.filter(f => f.name.toLowerCase().endsWith('.wav'));
    if (wavFiles.length === 0) {
      toast({ title: "No WAV files found", description: "Please drop WAV impulse response files.", variant: "destructive" });
      return;
    }

    setAnalyzing(true);
    setAnalyzeProgress({ done: 0, total: wavFiles.length });
    const results: AnalyzedIr[] = [...analyzedIrs];

    for (let i = 0; i < wavFiles.length; i++) {
      const file = wavFiles[i];
      try {
        const { analyzeAudioFile } = await import("@/hooks/use-analyses");
        const metrics = await analyzeAudioFile(file);
        const totalBandEnergy = metrics.subBassEnergy + metrics.bassEnergy + metrics.lowMidEnergy + metrics.midEnergy6 + metrics.highMidEnergy + metrics.presenceEnergy;
        const toPercent = (v: number) => totalBandEnergy > 0 ? (v / totalBandEnergy) * 100 : 0;
        const mid = toPercent(metrics.midEnergy6);
        const highMid = toPercent(metrics.highMidEnergy);
        const ratio = mid > 0 ? highMid / mid : 0;

        if (!results.some(r => r.filename === file.name)) {
          results.push({
            filename: file.name,
            subBass: toPercent(metrics.subBassEnergy),
            bass: toPercent(metrics.bassEnergy),
            lowMid: toPercent(metrics.lowMidEnergy),
            mid,
            highMid,
            presence: toPercent(metrics.presenceEnergy),
            ratio,
            centroid: metrics.spectralCentroid,
            smoothness: metrics.frequencySmoothness,
          });
        }
      } catch (err) {
        console.error(`Failed to analyze ${file.name}:`, err);
      }
      setAnalyzeProgress({ done: i + 1, total: wavFiles.length });
    }

    setAnalyzedIrs(results);
    setAnalyzing(false);
    toast({ title: `${wavFiles.length} IR${wavFiles.length !== 1 ? 's' : ''} analyzed`, duration: 2000 });
  }, [analyzedIrs, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/wav': ['.wav'] },
    disabled: analyzing,
  });

  const removeIr = (filename: string) => {
    setAnalyzedIrs(prev => prev.filter(ir => ir.filename !== filename));
  };

  const clearAll = () => {
    setAnalyzedIrs([]);
    setGapResult(null);
  };

  const gapMutation = useMutation({
    mutationFn: async (input: { speaker: string; genre?: string; targetCount?: number; existingIrs: AnalyzedIr[] }) => {
      const res = await apiRequest('POST', '/api/tonal-profiles/gap-finder', input);
      return res.json();
    },
    onSuccess: (data) => {
      setGapResult(data);
    },
    onError: () => {
      toast({ title: "Gap analysis failed", variant: "destructive" });
    },
  });

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gfSpeaker || analyzedIrs.length === 0) return;
    gapMutation.mutate({
      speaker: gfSpeaker,
      genre: gfGenre || undefined,
      targetCount: gfTargetCount,
      existingIrs: analyzedIrs,
    });
  };

  const copySuggestions = () => {
    if (!gapResult?.suggestedShots) return;
    const list = gapResult.suggestedShots.map((s: any) =>
      `${s.mic}@${s.position}_${s.distance}" — ${s.gapFilled}`
    ).join('\n');
    navigator.clipboard.writeText(list);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const coverageColor = (covered: boolean) =>
    covered ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400";

  const avgMid = analyzedIrs.length > 0 ? analyzedIrs.reduce((s, ir) => s + ir.mid, 0) / analyzedIrs.length : 0;
  const avgHiMid = analyzedIrs.length > 0 ? analyzedIrs.reduce((s, ir) => s + ir.highMid, 0) / analyzedIrs.length : 0;
  const avgPres = analyzedIrs.length > 0 ? analyzedIrs.reduce((s, ir) => s + ir.presence, 0) / analyzedIrs.length : 0;
  const avgRatio = analyzedIrs.length > 0 ? analyzedIrs.reduce((s, ir) => s + ir.ratio, 0) / analyzedIrs.length : 0;

  return (
    <div className="space-y-6">
      <form onSubmit={handleAnalyze} className="glass-panel p-6 rounded-2xl space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/20">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Audio-Aware Gap Analysis</h3>
            <p className="text-xs text-muted-foreground">
              Load your actual IR files to find tonal gaps and redundancies using real audio data
            </p>
          </div>
        </div>

        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
            isDragActive ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/20",
            analyzing && "opacity-50 cursor-not-allowed"
          )}
          data-testid="dropzone-gap-finder"
        >
          <input {...getInputProps()} data-testid="input-gap-finder-files" />
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          {analyzing ? (
            <div className="space-y-2">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing {analyzeProgress.done}/{analyzeProgress.total}...</p>
            </div>
          ) : isDragActive ? (
            <p className="text-sm text-primary font-medium">Drop your IR files here</p>
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-foreground font-medium">Drop IR files here or click to browse</p>
              <p className="text-xs text-muted-foreground">WAV files only. Each file will be analyzed for its tonal profile.</p>
            </div>
          )}
        </div>

        {analyzedIrs.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">{analyzedIrs.length} IR{analyzedIrs.length !== 1 ? 's' : ''} loaded</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                data-testid="button-clear-irs"
              >
                <Trash2 className="w-3 h-3" /> Clear all
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="bg-white/5 rounded-lg px-3 py-2 text-center">
                <div className="text-muted-foreground">Avg Mid</div>
                <div className="font-mono font-medium">{avgMid.toFixed(1)}%</div>
              </div>
              <div className="bg-white/5 rounded-lg px-3 py-2 text-center">
                <div className="text-muted-foreground">Avg HiMid</div>
                <div className="font-mono font-medium">{avgHiMid.toFixed(1)}%</div>
              </div>
              <div className="bg-white/5 rounded-lg px-3 py-2 text-center">
                <div className="text-muted-foreground">Avg Presence</div>
                <div className="font-mono font-medium">{avgPres.toFixed(1)}%</div>
              </div>
              <div className="bg-white/5 rounded-lg px-3 py-2 text-center">
                <div className="text-muted-foreground">Avg Ratio</div>
                <div className="font-mono font-medium">{avgRatio.toFixed(2)}</div>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
              {analyzedIrs.map((ir) => (
                <div key={ir.filename} className="flex items-center gap-2 text-xs bg-white/5 rounded-lg px-3 py-2 group" data-testid={`ir-item-${ir.filename}`}>
                  <span className="flex-1 font-mono truncate text-foreground/80">{ir.filename}</span>
                  <span className="text-muted-foreground shrink-0">R:{ir.ratio.toFixed(2)}</span>
                  <span className="text-muted-foreground shrink-0">{Math.round(ir.centroid)}Hz</span>
                  <button
                    type="button"
                    onClick={() => removeIr(ir.filename)}
                    className="invisible group-hover:visible text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    data-testid={`button-remove-${ir.filename}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Speaker className="w-3 h-3" /> Speaker
            </label>
            <select
              value={gfSpeaker}
              onChange={(e) => setGfSpeaker(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              data-testid="select-gap-speaker"
            >
              <option value="">Select speaker...</option>
              {speakers.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Music className="w-3 h-3" /> Genre / Tone (Optional)
            </label>
            <select
              value={gfGenre}
              onChange={(e) => setGfGenre(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              data-testid="select-gap-genre"
            >
              <option value="">Versatile (all genres)</option>
              {genres.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Lightbulb className="w-3 h-3" /> Max Suggestions: {gfTargetCount}
          </label>
          <input
            type="range"
            min={1}
            max={15}
            value={gfTargetCount}
            onChange={(e) => setGfTargetCount(Number(e.target.value))}
            className="w-full accent-primary"
            data-testid="slider-gap-target"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 (quick fill)</span>
            <span>15 (comprehensive)</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!gfSpeaker || analyzedIrs.length === 0 || gapMutation.isPending}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 shadow-lg flex items-center justify-center gap-2",
              !gfSpeaker || analyzedIrs.length === 0 || gapMutation.isPending
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/25 hover:-translate-y-0.5"
            )}
            data-testid="button-find-gaps"
          >
            {gapMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing Gaps...</>
            ) : (
              <><Target className="w-4 h-4" /> Find Gaps</>
            )}
          </button>
        </div>
      </form>

      {gapResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {gapResult.summary && (
            <div className="glass-panel p-6 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-full border border-primary/20">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Gap Analysis</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{gapResult.irCount} IRs analyzed</span>
                  {gapResult.preferenceSignalCount > 0 && (
                    <span className="bg-white/5 px-2 py-1 rounded">{gapResult.preferenceSignalCount} preference signals used</span>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground italic">{gapResult.summary}</p>
            </div>
          )}

          {gapResult.coverage && (
            <div className="glass-panel p-4 rounded-xl space-y-3">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tonal Coverage</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(gapResult.coverage).map(([key, val]: [string, any]) => (
                  <span
                    key={key}
                    className={cn(
                      "text-xs px-2 py-1 rounded capitalize",
                      coverageColor(val?.covered ?? val)
                    )}
                    data-testid={`coverage-${key}`}
                  >
                    {val?.covered ?? val ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <AlertCircle className="w-3 h-3 inline mr-1" />}
                    {key} {val?.irCount != null ? `(${val.irCount})` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          {gapResult.redundancies && gapResult.redundancies.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                Redundancies Found
              </h3>
              <div className="grid gap-3">
                {gapResult.redundancies.map((r: any, i: number) => (
                  <div
                    key={i}
                    className="glass-panel p-4 rounded-xl space-y-2 border border-amber-500/20"
                    data-testid={`redundancy-${i}`}
                  >
                    <div className="flex flex-wrap gap-2">
                      {(r.irs || []).map((name: string, j: number) => (
                        <code key={j} className="text-xs font-mono bg-amber-500/10 px-2 py-1 rounded text-amber-300">{name}</code>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">{r.reason}</p>
                    {r.keepSuggestion && (
                      <p className="text-xs text-foreground/70">
                        <ArrowRight className="w-3 h-3 inline mr-1" />
                        Keep: <span className="font-medium">{r.keepSuggestion}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {gapResult.blendRedundancies && gapResult.blendRedundancies.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ListFilter className="w-5 h-5 text-amber-400" />
                Blend Overlap
              </h3>
              <div className="grid gap-3">
                {gapResult.blendRedundancies.map((br: any, i: number) => (
                  <div key={i} className="glass-panel p-4 rounded-xl space-y-2 border border-amber-500/10" data-testid={`blend-redundancy-${i}`}>
                    <code className="text-xs font-mono bg-white/5 px-2 py-1 rounded text-foreground">{br.blend}</code>
                    {br.overlapsWithSingles && br.overlapsWithSingles.length > 0 && (
                      <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                        {br.overlapsWithSingles.map((o: string, j: number) => (
                          <span key={j} className="bg-white/5 px-2 py-0.5 rounded">{o}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">{br.verdict}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gapResult.suggestedShots && gapResult.suggestedShots.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-green-400" />
                  Suggested New Shots
                </h3>
                <button
                  onClick={copySuggestions}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
                  data-testid="button-copy-suggestions"
                >
                  {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied!" : "Copy List"}
                </button>
              </div>
              <div className="grid gap-3">
                {gapResult.suggestedShots.map((shot: any, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-panel p-4 rounded-xl space-y-3"
                    data-testid={`suggested-shot-${i}`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-medium">#{shot.priority || i + 1}</span>
                      <code className="text-sm font-mono bg-black/30 px-2 py-1 rounded text-primary">
                        {shot.mic}@{shot.position}_{shot.distance}"
                      </code>
                      {shot.confidence && (
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded font-medium",
                          shot.confidence === 'high' ? "text-green-400 bg-green-500/20" :
                          shot.confidence === 'medium' ? "text-yellow-400 bg-yellow-500/20" :
                          "text-orange-400 bg-orange-500/20"
                        )}>
                          {shot.confidence}
                        </span>
                      )}
                    </div>

                    {shot.gapFilled && (
                      <div className="text-xs text-primary/80 font-medium flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" /> Fills: {shot.gapFilled}
                      </div>
                    )}

                    {shot.predictedTone && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="bg-white/5 px-2 py-1 rounded">Mid {shot.predictedTone.mid}%</span>
                        <span className="bg-white/5 px-2 py-1 rounded">HiMid {shot.predictedTone.highMid}%</span>
                        <span className="bg-white/5 px-2 py-1 rounded">Pres {shot.predictedTone.presence}%</span>
                        <span className="bg-white/5 px-2 py-1 rounded">Ratio {shot.predictedTone.ratio}</span>
                        {shot.predictedTone.centroid && (
                          <span className="bg-white/5 px-2 py-1 rounded">{Math.round(shot.predictedTone.centroid)} Hz</span>
                        )}
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground">{shot.predictedTone?.character || shot.blendPotential}</p>
                    {shot.confidenceReason && (
                      <p className="text-xs text-muted-foreground/70 italic">{shot.confidenceReason}</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default function Recommendations() {
  const [micType, setMicType] = useState<string>("");
  const [speaker, setSpeaker] = useState<string>("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedTonalities, setSelectedTonalities] = useState<string[]>([]);
  const [otherToneNotes, setOtherToneNotes] = useState<string>("");
  const [preferredShots, setPreferredShots] = useState<string>("");
  const [showPreferences, setShowPreferences] = useState(false);
  const [ampDescription, setAmpDescription] = useState<string>("");
  const [targetShotCount, setTargetShotCount] = useState<number | null>(null);
  const [basicPositionsOnly, setBasicPositionsOnly] = useState(false);
  const [singleDistancePerMic, setSingleDistancePerMic] = useState(false);
  const [singlePositionForRibbons, setSinglePositionForRibbons] = useState(false);
  
  // Mic categories for global constraint checkboxes
  const dynamicCloseMics = ['57', 'm201', 'md421', 'md421k', '160', 'e906'];
  const ribbonCondensorMics = ['roswell-cab', '121', 'r10', 'r92', 'c414'];
  const [micRecipe, setMicRecipe] = useState<MicRecipeEntry[]>([]);
  const [selectedMicForRecipe, setSelectedMicForRecipe] = useState<string>("");
  const [selectedMicCount, setSelectedMicCount] = useState<number>(2);
  const [specificShots, setSpecificShots] = useState<string>("");
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
    "md441": { base: "MD441" },
    "r10": { base: "R10" },
    "m88": { base: "M88" },
    "pr30": { base: "PR30" },
    "e906": { base: "e906" },
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
      // Find matching mic by label (without switch setting)
      let baseMic = micLabel || '';
      let switchSetting = '';
      
      // Simple detection: look for Presence or Flat keywords
      if (micLabel) {
        if (micLabel.toLowerCase().includes('presence')) {
          switchSetting = 'Presence';
          baseMic = micLabel.replace(/\s*\(Presence(?:\s+Boost)?\)/i, '').replace(/\s*Presence\s*/i, '').trim();
        } else if (micLabel.toLowerCase().includes('flat')) {
          switchSetting = 'Flat';
          baseMic = micLabel.replace(/\s*\(Flat\)/i, '').replace(/\s*Flat\s*/i, '').trim();
        }
      }
      
      // Find the mic shorthand
      const mic = MICS.find(m => m.label === baseMic || m.label === micLabel);
      if (mic) {
        const shorthand = MIC_SHORTHAND[mic.value];
        if (shorthand) {
          return { baseMic: shorthand.base, switchSetting };
        }
      }
      
      return { baseMic: baseMic.replace(/\s+/g, ''), switchSetting };
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
        'cap_cone_tr': 'CapEdge_Cone_Tr',
        'capconetr': 'CapEdge_Cone_Tr',
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
      const shots = sortRecommendations(result.shots || result.recommendations || [], result.mic);
      text = `IR Shots for ${getSpeakerLabel(result.speaker)}\n`;
      text += `Microphone: ${getMicLabel(result.mic)}\n\n`;
      shots.forEach((shot: any, i: number) => {
        // Schema: Speaker_Mic_Setting_Position_distance
        const speakerPart = getSpeakerShorthand(result.speaker);
        // Use shot.micLabel if available, else fall back to top-level
        const micLabelToUse = shot.micLabel || getMicLabel(result.mic);
        let { baseMic, switchSetting } = formatMicForShorthand(micLabelToUse);
        
        // For MD441/e906, detect voicing from rationale if not in micLabel
        const topMicLower = (result.mic || '').toLowerCase();
        const isSwitchableMic = topMicLower.includes('441') || topMicLower.includes('e906') || topMicLower.includes('906');
        if (isSwitchableMic && !switchSetting) {
          const searchText = `${shot.rationale || ''} ${shot.expectedTone || ''}`.toLowerCase();
          if (searchText.includes('presence') || searchText.includes('boost')) {
            switchSetting = 'Presence';
          } else if (searchText.includes('flat') || searchText.includes('neutral')) {
            switchSetting = 'Flat';
          }
        }
        
        console.log(`Shot ${i}: micLabel="${shot.micLabel}", baseMic="${baseMic}", switchSetting="${switchSetting}"`);
        const posPart = formatPosition(shot.position || shot.bestFor);
        const distPart = `${shot.distance}in`;
        
        // Put switch setting after mic name: K100_MD441_Presence_CapEdge_2in
        const micPart = switchSetting ? `${baseMic}_${switchSetting}` : baseMic;
        const shorthand = `${speakerPart}_${micPart}_${posPart}_${distPart}`;
        console.log(`  -> shorthand="${shorthand}"`);
        text += `${i + 1}. ${shorthand}`;
        if (shot.blendRatio) text += ` [${shot.blendRatio}]`;
        text += `\n`;
        text += `   Rationale: ${shot.rationale}\n\n`;
      });
    } else if (mode === 'by-speaker' && speakerResult) {
      text = `Mic Combinations for ${getSpeakerLabel(speakerResult.speaker)}\n\n`;
      sortRecommendations(speakerResult.micRecommendations).forEach((rec, i) => {
        // Schema: Speaker_Mic_Setting_Position_distance (setting after mic if present)
        const speakerPart = getSpeakerShorthand(speakerResult.speaker);
        const { baseMic, switchSetting } = formatMicForShorthand(rec.micLabel);
        const posPart = formatPosition(rec.position);
        const distPart = `${rec.distance}in`;
        
        // Put switch setting after mic name: K100_MD441_Presence_CapEdge_2in
        const micPart = switchSetting ? `${baseMic}_${switchSetting}` : baseMic;
        const shorthand = `${speakerPart}_${micPart}_${posPart}_${distPart}`;
        text += `${i + 1}. ${shorthand}`;
        if (rec.blendRatio) text += ` [${rec.blendRatio}]`;
        text += `\n`;
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
    let items: { shorthand: string; mic: string; distance: number; posOrder: number; settingOrder: number }[] = [];
    
    // Helper for shorthand formatting
    const getSpeakerShorthand = (value: string) => SPEAKER_SHORTHAND[value] || value;
    const getMicLabelLocal = (value: string) => MICS.find(m => m.value === value)?.label || value;
    const formatPosition = (pos: string) => {
      const posLower = pos.toLowerCase().replace(/-/g, '_');
      const positionMap: Record<string, string> = {
        'cap': 'Cap', 'cap_offcenter': 'Cap_OffCenter', 'capedge': 'CapEdge',
        'capedge_br': 'CapEdge_BR', 'capedge_dk': 'CapEdge_DK',
        'cap_cone_tr': 'CapEdge_Cone_Tr', 'cone': 'Cone',
      };
      return positionMap[posLower] || pos;
    };
    // Position order: Cap (brightest) → Cone (darkest)
    const getPositionOrder = (pos: string): number => {
      const posLower = pos.toLowerCase().replace(/-/g, '_').replace(/ /g, '_');
      const order: Record<string, number> = {
        'cap': 1, 'cap_offcenter': 2, 'capedge_br': 3, 'capedge': 4, 
        'cap_cone_tr': 5, 'capedge_dk': 6, 'cone': 7
      };
      return order[posLower] || 99;
    };
    // Setting order: Presence before Flat
    const getSettingOrder = (setting: string): number => {
      if (setting === 'Presence') return 1;
      if (setting === 'Flat') return 2;
      return 0; // No setting
    };
    const formatMicLabel = (micLabel: string) => {
      // Extract switch setting from micLabel - check for Presence or Flat anywhere in the label
      let baseMic = micLabel || '';
      let switchSetting = '';
      
      // Simple detection: look for Presence or Flat keywords
      if (micLabel) {
        if (micLabel.toLowerCase().includes('presence')) {
          switchSetting = 'Presence';
          baseMic = micLabel.replace(/\s*\(Presence(?:\s+Boost)?\)/i, '').replace(/\s*Presence\s*/i, '').trim();
        } else if (micLabel.toLowerCase().includes('flat')) {
          switchSetting = 'Flat';
          baseMic = micLabel.replace(/\s*\(Flat\)/i, '').replace(/\s*Flat\s*/i, '').trim();
        }
      }
      
      // Find mic shorthand
      const mic = MICS.find(m => m.label === baseMic || m.label === micLabel);
      if (mic) {
        const shorthand = MIC_SHORTHAND[mic.value];
        if (shorthand) return { baseMic: shorthand.base, switchSetting };
      }
      return { baseMic: baseMic.replace(/\s+/g, ''), switchSetting };
    };

    // Normalize mic for sorting (strip voicing suffixes)
    const normalizeMic = (mic: string): string => {
      return (mic || '').toLowerCase()
        .replace(/\s*\(presence(?:\s+boost)?\)/i, '')
        .replace(/\s*\(flat\)/i, '')
        .replace(/\s*presence\s*/i, '')
        .replace(/\s*flat\s*/i, '')
        .trim();
    };
    
    if (mode === 'by-speaker' && result) {
      const shots = result.shots || result.recommendations || [];
      items = shots.map((shot: any) => {
        const speakerPart = getSpeakerShorthand(result.speaker);
        // Use shot.micLabel for switch settings, else fall back to top-level mic
        let { baseMic, switchSetting } = formatMicLabel(shot.micLabel || getMicLabelLocal(result.mic));
        
        // For MD441/e906, detect voicing from rationale if not in micLabel
        const topMicLower = (result.mic || '').toLowerCase();
        const isSwitchableMic = topMicLower.includes('441') || topMicLower.includes('e906') || topMicLower.includes('906');
        if (isSwitchableMic && !switchSetting) {
          const searchText = `${shot.rationale || ''} ${shot.expectedTone || ''}`.toLowerCase();
          if (searchText.includes('presence') || searchText.includes('boost')) {
            switchSetting = 'Presence';
          } else if (searchText.includes('flat') || searchText.includes('neutral')) {
            switchSetting = 'Flat';
          }
        }
        
        const posPart = formatPosition(shot.position || shot.bestFor);
        const distPart = `${shot.distance}in`;
        const dist = parseFloat(shot.distance) || 0;
        // Put switch setting after mic name: K100_MD441_Presence_CapEdge_2in
        const micPart = switchSetting ? `${baseMic}_${switchSetting}` : baseMic;
        // Normalize mic for sorting - use baseMic or fallback to top-level mic
        const micForSort = normalizeMic(shot.micLabel || getMicLabelLocal(result.mic));
        return {
          shorthand: `${speakerPart}_${micPart}_${posPart}_${distPart}`,
          mic: micForSort,
          distance: dist,
          posOrder: getPositionOrder(shot.position || ''),
          settingOrder: getSettingOrder(switchSetting)
        };
      });
    } else if (mode === 'by-speaker' && speakerResult) {
      items = speakerResult.micRecommendations.map((rec) => {
        const speakerPart = getSpeakerShorthand(speakerResult.speaker);
        const { baseMic, switchSetting } = formatMicLabel(rec.micLabel);
        const posPart = formatPosition(rec.position);
        const distPart = `${rec.distance}in`;
        const dist = parseFloat(String(rec.distance)) || 0;
        // Put switch setting after mic name: K100_MD441_Presence_CapEdge_2in
        const micPart = switchSetting ? `${baseMic}_${switchSetting}` : baseMic;
        // Normalize mic for sorting
        const micForSort = normalizeMic(rec.micLabel);
        return {
          shorthand: `${speakerPart}_${micPart}_${posPart}_${distPart}`,
          mic: micForSort,
          distance: dist,
          posOrder: getPositionOrder(rec.position),
          settingOrder: getSettingOrder(switchSetting)
        };
      });
    } else if (mode === 'by-amp' && ampResult) {
      items = ampResult.speakerSuggestions.map((s) => ({
        shorthand: s.speakerLabel,
        mic: '',
        distance: 0,
        posOrder: 0,
        settingOrder: 0
      }));
    } else if (mode === 'import-positions' && importResult) {
      items = importResult.refinements.map(r => ({
        shorthand: r.shorthand,
        mic: '',
        distance: 0,
        posOrder: 0,
        settingOrder: 0
      }));
    }

    if (items.length === 0) return;

    // Sort by: mic → distance (ascending) → position (Cap first, Cone last)
    items.sort((a, b) => {
      // 1. Sort by mic name (alphabetically)
      if (a.mic !== b.mic) return a.mic.localeCompare(b.mic);
      // 2. Sort by distance (shorter first)
      if (a.distance !== b.distance) return a.distance - b.distance;
      // 3. Sort by position (Cap first, Cone last)
      return a.posOrder - b.posOrder;
    });
    const text = items.map((item, i) => `${i + 1}. ${item.shorthand}`).join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied to clipboard", description: "Simple list copied." });
    setTimeout(() => setCopied(false), 2000);
  };

  // Mode: if mic is selected, use mic+speaker endpoint; otherwise use speaker-only endpoint
  const isSpeakerOnlyMode = !micType && speaker;

  const { mutate: getRecommendations, isPending } = useMutation({
    mutationFn: async ({ micType, speakerModel, genre, preferredShots, targetShotCount, basicPositionsOnly, singleDistancePerMic, singlePositionForRibbons, micShotCounts }: { micType?: string; speakerModel: string; genre?: string; preferredShots?: string; targetShotCount?: number; basicPositionsOnly?: boolean; singleDistancePerMic?: boolean; singlePositionForRibbons?: boolean; micShotCounts?: string }) => {
      if (micType) {
        // Mic + Speaker mode
        const payload: { micType: string; speakerModel: string; genre?: string; preferredShots?: string; targetShotCount?: number; basicPositionsOnly?: boolean; singleDistancePerMic?: boolean; singlePositionForRibbons?: boolean; micShotCounts?: string } = { micType, speakerModel };
        if (genre) payload.genre = genre;
        if (preferredShots) payload.preferredShots = preferredShots;
        if (targetShotCount) payload.targetShotCount = targetShotCount;
        if (basicPositionsOnly) payload.basicPositionsOnly = basicPositionsOnly;
        if (singleDistancePerMic) payload.singleDistancePerMic = singleDistancePerMic;
        if (singlePositionForRibbons) payload.singlePositionForRibbons = singlePositionForRibbons;
        if (micShotCounts) payload.micShotCounts = micShotCounts;
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
        const payload: { speakerModel: string; genre?: string; preferredShots?: string; targetShotCount?: number; basicPositionsOnly?: boolean; singleDistancePerMic?: boolean; singlePositionForRibbons?: boolean; micShotCounts?: string } = { speakerModel };
        if (genre) payload.genre = genre;
        if (preferredShots) payload.preferredShots = preferredShots;
        if (targetShotCount) payload.targetShotCount = targetShotCount;
        if (basicPositionsOnly) payload.basicPositionsOnly = basicPositionsOnly;
        if (singleDistancePerMic) payload.singleDistancePerMic = singleDistancePerMic;
        if (singlePositionForRibbons) payload.singlePositionForRibbons = singlePositionForRibbons;
        if (micShotCounts) payload.micShotCounts = micShotCounts;
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
    mutationFn: async ({ ampDescription, genre, targetShotCount, basicPositionsOnly }: { ampDescription: string; genre?: string; targetShotCount?: number; basicPositionsOnly?: boolean }) => {
      const payload: { ampDescription: string; genre?: string; targetShotCount?: number; basicPositionsOnly?: boolean } = { ampDescription };
      if (genre) payload.genre = genre;
      if (targetShotCount) payload.targetShotCount = targetShotCount;
      if (basicPositionsOnly) payload.basicPositionsOnly = basicPositionsOnly;
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
    mutationFn: async ({ positionList, speaker, genre, targetShotCount, basicPositionsOnly, singleDistancePerMic, micShotCounts }: { positionList: string; speaker?: string; genre?: string; targetShotCount?: number; basicPositionsOnly?: boolean; singleDistancePerMic?: boolean; micShotCounts?: string }) => {
      const payload: { positionList: string; speaker?: string; genre?: string; targetShotCount?: number; basicPositionsOnly?: boolean; singleDistancePerMic?: boolean; micShotCounts?: string } = { positionList };
      if (speaker) payload.speaker = speaker;
      if (genre) payload.genre = genre;
      if (targetShotCount) payload.targetShotCount = targetShotCount;
      if (basicPositionsOnly) payload.basicPositionsOnly = basicPositionsOnly;
      if (singleDistancePerMic) payload.singleDistancePerMic = singleDistancePerMic;
      if (micShotCounts) payload.micShotCounts = micShotCounts;
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
    
    // Use target shot count - mic recipe specifies minimums, AI fills remainder
    getRecommendations({ 
      micType: micType || undefined, 
      speakerModel: speaker, 
      genre: effectiveGenre,
      preferredShots: combinedPrefs || undefined,
      targetShotCount: targetShotCount || undefined,
      basicPositionsOnly: basicPositionsOnly || undefined,
      singleDistancePerMic: singleDistancePerMic || undefined,
      singlePositionForRibbons: singlePositionForRibbons || undefined,
      micShotCounts: getMicShotCountsString()
    });
  };

  const handleAmpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ampDescription.trim()) {
      toast({ title: "Describe your amp", description: "Please enter an amp description", variant: "destructive" });
      return;
    }
    const effectiveGenre = buildEffectiveGenre();
    getAmpRecommendations({ ampDescription: ampDescription.trim(), genre: effectiveGenre, targetShotCount: targetShotCount || undefined, basicPositionsOnly: basicPositionsOnly || undefined });
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

  // Convert mic recipe array to string format for API
  const getMicShotCountsString = () => {
    const parts: string[] = [];
    if (micRecipe.length > 0) {
      // Include 1P (single position) and 1D (single distance) flags per mic
      // Make instructions VERY explicit for AI to follow
      const micParts = micRecipe.map(r => {
        const countPart = `${r.label} x ${r.count}`;
        
        // Apply global constraints based on mic category
        // singleDistancePerMic → 1D for dynamics (SM57, M201, MD421, MD421K, M160, e906)
        // singlePositionForRibbons → 1P for ribbons/condensers (Roswell, R121, R10, R92, C414)
        const isDynamic = dynamicCloseMics.includes(r.mic);
        const isRibbonCondenser = ribbonCondensorMics.includes(r.mic);
        
        // Determine effective constraints (per-mic override OR global)
        const effectiveSingleDistance = r.singleDistance || (singleDistancePerMic && isDynamic);
        const effectiveSinglePosition = r.singlePosition || (singlePositionForRibbons && isRibbonCondenser);
        
        // Special handling for Roswell - always Cap position
        const isRoswell = r.mic === 'roswell-cab';
        
        if (effectiveSinglePosition && effectiveSingleDistance) {
          // Both locked = effectively 1 shot regardless of count
          if (isRoswell) {
            return `${countPart} [STRICT: Output exactly 1 Roswell shot at Cap position with one distance, e.g., Roswell_Cap_6in]`;
          }
          return `${countPart} [STRICT: Output exactly 1 shot - pick ONE best position and ONE best distance for ${r.label}]`;
        } else if (effectiveSinglePosition && !effectiveSingleDistance) {
          // One position, vary distances (1P)
          if (isRoswell) {
            return `${countPart} [STRICT: ALL Roswell shots MUST be at Cap position. Vary ONLY the distance. Output ${r.count} shots like: Roswell_Cap_4in, Roswell_Cap_6in, Roswell_Cap_8in. NEVER use any position other than Cap for Roswell.]`;
          }
          const isBlend = BLEND_MIC_VALUES.includes(r.mic);
          if (isBlend) {
            const isSmR121 = r.mic === 'sm57_r121_blend';
            return `${countPart} [STRICT: ALL ${r.label} shots MUST use position "Blend". Vary ONLY the distance (R121 distance for SM57+R121 blends, both-mic distance for Fredman). Output ${r.count} shots with DIFFERENT distances.${isSmR121 ? ' For EACH shot, recommend the best SM57:R121 blend ratio and voicing (Tight 67:33, Balance 60:40, Thick 51:49, Smooth 45:55, or Ribbon Dom 24:76) based on the distance and tonal goal. Include blendRatio field in each shot.' : ''}]`;
          }
          return `${countPart} [STRICT: Pick ONE position for all ${r.label} shots, but use ${r.count} DIFFERENT distances. Example: ${r.label}_Cap_1in, ${r.label}_Cap_2in, ${r.label}_Cap_3in - same position, different distances]`;
        } else if (!effectiveSinglePosition && effectiveSingleDistance) {
          // Vary positions, one distance (1D)
          return `${countPart} [STRICT: Use ONE distance for all ${r.label} shots, but ${r.count} DIFFERENT positions. Example: ${r.label}_Cap_2in, ${r.label}_CapEdge_2in, ${r.label}_Cone_2in - different positions, same distance]`;
        } else {
          // Vary both
          return `${countPart} [Vary both positions and distances freely]`;
        }
      });
      parts.push(micParts.join(" || "));
    }
    if (specificShots.trim()) {
      parts.push(`Specific shots: ${specificShots.trim()}`);
    }
    
    // Add global constraint instructions even without a mic recipe
    const globalConstraints: string[] = [];
    if (singleDistancePerMic) {
      globalConstraints.push(`[GLOBAL 1D RULE] For dynamics (SM57, M201, MD421K, M160, e906): Use ONE distance per mic, vary POSITIONS. Example: SM57_Cap_1.5in, SM57_CapEdge_1.5in, SM57_Cone_1.5in`);
    }
    if (singlePositionForRibbons) {
      globalConstraints.push(`[GLOBAL 1P RULE] For ribbons/condensers (Roswell, R121, R10, R92, C414): Use ONE position per mic, vary DISTANCES. Roswell MUST always be at Cap position. Example: R121_CapEdge_4in, R121_CapEdge_6in, R121_CapEdge_8in`);
    }
    if (globalConstraints.length > 0) {
      parts.push(globalConstraints.join(". "));
    }
    
    return parts.length > 0 ? parts.join(". ") : undefined;
  };
  
  // Calculate total shots from recipe
  const getTotalRecipeShots = () => micRecipe.reduce((sum, r) => sum + r.count, 0);

  // Add mic to recipe
  const addMicToRecipe = () => {
    if (!selectedMicForRecipe) return;
    const mic = MICS.find(m => m.value === selectedMicForRecipe);
    if (!mic) return;
    
    // Check if already in recipe
    const existing = micRecipe.find(r => r.mic === selectedMicForRecipe);
    if (existing) {
      // Update count
      setMicRecipe(prev => prev.map(r => 
        r.mic === selectedMicForRecipe ? { ...r, count: r.count + selectedMicCount } : r
      ));
    } else {
      // Add new - defaults based on mic type
      // Blend mics: position is "Blend" (fixed), vary distances → single position ON, single distance OFF
      // Ribbon/condenser mics (Roswell, R121, R10, R92, C414): single position ON, single distance OFF (vary distances)
      // Other mics (dynamics): single position OFF (vary positions), single distance ON (one distance)
      const singlePositionMics = ['roswell-cab', '121', 'r10', 'r92', 'c414', ...BLEND_MIC_VALUES];
      const defaultSinglePosition = singlePositionMics.includes(selectedMicForRecipe);
      const defaultSingleDistance = !defaultSinglePosition;
      setMicRecipe(prev => [...prev, { 
        mic: selectedMicForRecipe, 
        label: mic.label, 
        count: selectedMicCount, 
        singleDistance: defaultSingleDistance,
        singlePosition: defaultSinglePosition
      }]);
    }
    setSelectedMicForRecipe("");
    setSelectedMicCount(2);
  };

  // Remove mic from recipe
  const removeMicFromRecipe = (mic: string) => {
    setMicRecipe(prev => prev.filter(r => r.mic !== mic));
  };

  // Update mic count in recipe
  const updateMicCount = (mic: string, delta: number) => {
    setMicRecipe(prev => prev.map(r => {
      if (r.mic === mic) {
        const newCount = Math.max(1, r.count + delta);
        return { ...r, count: newCount };
      }
      return r;
    }));
  };
  
  // Toggle single distance for a specific mic in recipe
  const toggleMicSingleDistance = (mic: string) => {
    setMicRecipe(prev => prev.map(r => 
      r.mic === mic ? { ...r, singleDistance: !r.singleDistance } : r
    ));
  };
  
  // Toggle single position for a specific mic in recipe
  const toggleMicSinglePosition = (mic: string) => {
    setMicRecipe(prev => prev.map(r => 
      r.mic === mic ? { ...r, singlePosition: !r.singlePosition } : r
    ));
  };

  const processImport = (positions: string) => {
    const effectiveGenre = buildEffectiveGenre();
    refinePositions({ 
      positionList: positions, 
      speaker: importSpeaker || undefined, 
      genre: effectiveGenre,
      targetShotCount: targetShotCount || undefined,
      basicPositionsOnly: basicPositionsOnly || undefined,
      singleDistancePerMic: singleDistancePerMic || undefined,
      micShotCounts: getMicShotCountsString()
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
    "cap_cone_tr": "CapEdge_Cone_Tr",
    "cone": "Cone",
    "blend": "Blend",
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
    setSelectedGenres([]);
    setSelectedTonalities([]);
    setOtherToneNotes("");
    setAmpDescription("");
    setPositionList("");
    setImportSpeaker("");
  };

  const toggleGenre = (value: string) => {
    setSelectedGenres(prev => 
      prev.includes(value) ? prev.filter(g => g !== value) : [...prev, value]
    );
  };

  const toggleTonality = (value: string) => {
    setSelectedTonalities(prev => 
      prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]
    );
  };

  const buildEffectiveGenre = () => {
    const parts: string[] = [];
    if (selectedGenres.length > 0) {
      parts.push(selectedGenres.map(g => GENRES.find(x => x.value === g)?.label || g).join(', '));
    }
    if (selectedTonalities.length > 0) {
      parts.push(selectedTonalities.map(t => TONALITIES.find(x => x.value === t)?.label || t).join(', '));
    }
    if (otherToneNotes.trim()) parts.push(otherToneNotes.trim());
    return parts.join('; ') || undefined;
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-white to-secondary pb-2">
            {mode === 'by-speaker' ? 'Mic Recommendations' : mode === 'by-amp' ? 'Speaker Recommendations' : mode === 'shot-designer' ? 'Shot Designer' : mode === 'gap-finder' ? 'Gap Finder' : 'Refine Shot List'}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {mode === 'by-speaker' 
              ? 'Get expert recommendations based on curated IR production knowledge. Select just a speaker to get mic/position/distance combos, or pick both mic and speaker for distance-focused advice.'
              : mode === 'by-amp'
              ? 'Describe your amp and get speaker recommendations based on classic amp/speaker pairings from legendary recordings.'
              : mode === 'shot-designer'
              ? 'Design a complete shot list using real tonal data learned from your previous batch analyses. Each shot is predicted from actual IR measurements.'
              : mode === 'gap-finder'
              ? 'Load your actual IR files to analyze what tonal territory you already cover. Get targeted suggestions for new shots that fill gaps and flag redundant IRs.'
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
            <button
              type="button"
              onClick={() => handleModeChange('shot-designer')}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                mode === 'shot-designer'
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="button-mode-shot-designer"
            >
              <BarChart3 className="w-4 h-4" /> Shot Designer
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('gap-finder')}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                mode === 'gap-finder'
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="button-mode-gap-finder"
            >
              <Target className="w-4 h-4" /> Gap Finder
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
                <optgroup label="Single Mics">
                  {SINGLE_MICS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Blends">
                  {BLEND_MICS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </optgroup>
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

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Music className="w-3 h-3" /> Genres (Optional)
              </label>
              <div className="flex flex-wrap gap-2" data-testid="genre-checkboxes">
                {GENRES.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => toggleGenre(g.value)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-full border transition-all",
                      selectedGenres.includes(g.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-black/20 border-white/10 hover:border-white/30"
                    )}
                    data-testid={`genre-${g.value}`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Target className="w-3 h-3" /> Tonality (Optional)
              </label>
              <div className="flex flex-wrap gap-2" data-testid="tonality-checkboxes">
                {TONALITIES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => toggleTonality(t.value)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-full border transition-all",
                      selectedTonalities.includes(t.value)
                        ? "bg-amber-500/80 text-white border-amber-500"
                        : "bg-black/20 border-white/10 hover:border-white/30"
                    )}
                    data-testid={`tonality-${t.value}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Target className="w-3 h-3" /> Other Tone Notes (Optional)
              </label>
              <input
                type="text"
                value={otherToneNotes}
                onChange={(e) => setOtherToneNotes(e.target.value)}
                placeholder="e.g., Green Day power pop, artist references, specific qualities..."
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                data-testid="input-other-tone-notes"
              />
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
                        
                        {learnedPrefs.micPositions.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Mic-Specific Positions:</p>
                            <div className="space-y-1">
                              {learnedPrefs.micPositions.slice(0, 6).map((mp, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-secondary min-w-[60px]">{mp.mic}:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {mp.positions.slice(0, 6).map((p, j) => (
                                      <span key={j} className="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">
                                        {p.value} ({p.count}x)
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {learnedPrefs.micDistances.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Mic-Specific Distances:</p>
                            <div className="space-y-1">
                              {learnedPrefs.micDistances.slice(0, 6).map((md, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-primary min-w-[60px]">{md.mic}:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {md.distances.slice(0, 4).map((d, j) => (
                                      <span key={j} className="text-xs bg-white/10 text-foreground px-2 py-0.5 rounded-full">
                                        {d.value} ({d.count}x)
                                      </span>
                                    ))}
                                  </div>
                                </div>
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

          {/* Target Shot Count */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Target className="w-3 h-3" /> Number of Shots (Optional)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="50"
                value={targetShotCount || ''}
                onChange={(e) => setTargetShotCount(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Auto"
                className="w-24 bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                data-testid="input-target-shot-count"
              />
              <span className="text-xs text-muted-foreground">
                {targetShotCount ? `Exactly ${targetShotCount} shots` : 'AI decides based on speaker/genre'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Set a specific number of shots. The AI will prioritize learned preferences, then genre best practices.
            </p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={basicPositionsOnly}
                onChange={(e) => setBasicPositionsOnly(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/20 text-primary focus:ring-primary focus:ring-offset-0"
                data-testid="checkbox-basic-positions-only"
              />
              <span className="text-sm font-medium text-foreground">Basic Positions Only</span>
            </label>
            <p className="text-xs text-muted-foreground pl-7">
              Limit suggestions to Cap, CapEdge, CapEdge_Cone_Tr, and Cone. Skips off-center and bright/dark variations.
            </p>
          </div>

          {/* Single Distance for Dynamics (1D) */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={singleDistancePerMic}
                onChange={(e) => setSingleDistancePerMic(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/20 text-primary focus:ring-primary focus:ring-offset-0"
                data-testid="checkbox-single-distance-per-mic-speaker"
              />
              <span className="text-sm font-medium text-foreground">Same Distance for Dynamics</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">1D</span>
            </label>
            <p className="text-xs text-muted-foreground pl-7">
              SM57, M201, MD421, MD421K, M160, e906: same distance, vary position. Quick workflow for close mics.
            </p>
          </div>
          
          {/* Single Position for Ribbons/Condensers (1P) */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={singlePositionForRibbons}
                onChange={(e) => setSinglePositionForRibbons(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/20 text-primary focus:ring-primary focus:ring-offset-0"
                data-testid="checkbox-single-position-for-ribbons"
              />
              <span className="text-sm font-medium text-foreground">Same Position for Ribbons/Condensers</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-medium">1P</span>
            </label>
            <p className="text-xs text-muted-foreground pl-7">
              Roswell, R121, R10, R92, C414: same position, vary distance. Ribbons sound best at their sweet spot.
            </p>
          </div>

          {/* Mic Recipe Builder */}
          <div className="space-y-3 border-t border-white/10 pt-4">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Mic2 className="w-3 h-3" /> Mic Recipe (Optional)
            </label>
            <p className="text-xs text-muted-foreground">
              Specify exactly how many shots per mic. Leave empty for AI to decide.
            </p>
            
            {/* Add mic row */}
            <div className="flex items-center gap-2">
              <select
                value={selectedMicForRecipe}
                onChange={(e) => setSelectedMicForRecipe(e.target.value)}
                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                data-testid="select-mic-recipe-speaker"
              >
                <option value="">Select mic...</option>
                <optgroup label="Single Mics">
                  {SINGLE_MICS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Blends">
                  {BLEND_MICS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </optgroup>
              </select>
              <div className="flex items-center gap-1 bg-black/20 border border-white/10 rounded-lg px-2">
                <button
                  type="button"
                  onClick={() => setSelectedMicCount(Math.max(1, selectedMicCount - 1))}
                  className="w-7 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  -
                </button>
                <span className="w-6 text-center text-sm font-medium">{selectedMicCount}</span>
                <button
                  type="button"
                  onClick={() => setSelectedMicCount(selectedMicCount + 1)}
                  className="w-7 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={addMicToRecipe}
                disabled={!selectedMicForRecipe}
                className={cn(
                  "px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  selectedMicForRecipe
                    ? "bg-primary/20 text-primary hover:bg-primary/30"
                    : "bg-white/5 text-muted-foreground cursor-not-allowed"
                )}
                data-testid="button-add-mic-speaker"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>
            
            {/* Recipe list */}
            {micRecipe.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {micRecipe.map((r) => (
                    <div 
                      key={r.mic}
                      className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-lg px-2 py-1.5"
                    >
                      <span className="text-sm font-medium text-primary">{r.label}</span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => updateMicCount(r.mic, -1)}
                          className="w-5 h-5 flex items-center justify-center text-primary/60 hover:text-primary text-xs"
                        >
                          -
                        </button>
                        <span className="w-4 text-center text-sm text-primary">{r.count}</span>
                        <button
                          type="button"
                          onClick={() => updateMicCount(r.mic, 1)}
                          className="w-5 h-5 flex items-center justify-center text-primary/60 hover:text-primary text-xs"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleMicSinglePosition(r.mic)}
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium transition-all",
                          r.singlePosition 
                            ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/40" 
                            : "bg-white/5 text-muted-foreground border border-white/10 hover:border-white/20"
                        )}
                        title={r.singlePosition ? "Single position: ON - one position" : "Single position: OFF - vary positions"}
                      >
                        1P
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleMicSingleDistance(r.mic)}
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium transition-all",
                          r.singleDistance 
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                            : "bg-white/5 text-muted-foreground border border-white/10 hover:border-white/20"
                        )}
                        title={r.singleDistance ? "Single distance: ON - one distance" : "Single distance: OFF - vary distances"}
                      >
                        1D
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMicFromRecipe(r.mic)}
                        className="w-5 h-5 flex items-center justify-center text-primary/40 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total: {getTotalRecipeShots()} shots
                </p>
              </div>
            )}

            {/* Specific Shots (free text) */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Target className="w-3 h-3" /> Specific Shots (Optional)
              </label>
              <input
                type="text"
                value={specificShots}
                onChange={(e) => setSpecificShots(e.target.value)}
                placeholder="e.g., SM57 CapEdge @ 3in, R121 Cap @ 4in..."
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                data-testid="input-specific-shots-speaker"
              />
              <p className="text-xs text-muted-foreground">
                Request specific mic/position/distance combinations to include.
              </p>
            </div>
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
              disabled={!speaker || isPending}
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
                  <Lightbulb className="w-4 h-4" /> Get Mic Setup Recommendations
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

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Music className="w-3 h-3" /> Genres (Optional)
              </label>
              <div className="flex flex-wrap gap-2" data-testid="genre-checkboxes-amp">
                {GENRES.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => toggleGenre(g.value)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-full border transition-all",
                      selectedGenres.includes(g.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-black/20 border-white/10 hover:border-white/30"
                    )}
                    data-testid={`genre-amp-${g.value}`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Target className="w-3 h-3" /> Tonality (Optional)
              </label>
              <div className="flex flex-wrap gap-2" data-testid="tonality-checkboxes-amp">
                {TONALITIES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => toggleTonality(t.value)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-full border transition-all",
                      selectedTonalities.includes(t.value)
                        ? "bg-amber-500/80 text-white border-amber-500"
                        : "bg-black/20 border-white/10 hover:border-white/30"
                    )}
                    data-testid={`tonality-amp-${t.value}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Target className="w-3 h-3" /> Other Tone Notes (Optional)
              </label>
              <input
                type="text"
                value={otherToneNotes}
                onChange={(e) => setOtherToneNotes(e.target.value)}
                placeholder="e.g., bright leads, thick rhythm, vintage warmth..."
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                data-testid="input-other-tone-notes-amp"
              />
            </div>
          </div>

          {/* Target Shot Count */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Target className="w-3 h-3" /> Number of Shots (Optional)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="50"
                value={targetShotCount || ''}
                onChange={(e) => setTargetShotCount(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Auto"
                className="w-24 bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                data-testid="input-target-shot-count-amp"
              />
              <span className="text-xs text-muted-foreground">
                {targetShotCount ? `Exactly ${targetShotCount} shots` : 'AI decides based on amp/genre'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={basicPositionsOnly}
                onChange={(e) => setBasicPositionsOnly(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/20 text-primary focus:ring-primary focus:ring-offset-0"
                data-testid="checkbox-basic-positions-only-amp"
              />
              <span className="text-sm font-medium text-foreground">Basic Positions Only</span>
            </label>
            <p className="text-xs text-muted-foreground pl-7">
              Limit suggestions to Cap, CapEdge, CapEdge_Cone_Tr, and Cone. Skips off-center and bright/dark variations.
            </p>
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
              disabled={!ampDescription.trim() || isAmpPending}
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

          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Music className="w-3 h-3" /> Genres (Optional)
              </label>
              <div className="flex flex-wrap gap-2" data-testid="genre-checkboxes-import">
                {GENRES.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => toggleGenre(g.value)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-full border transition-all",
                      selectedGenres.includes(g.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-black/20 border-white/10 hover:border-white/30"
                    )}
                    data-testid={`genre-import-${g.value}`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Target className="w-3 h-3" /> Tonality (Optional)
              </label>
              <div className="flex flex-wrap gap-2" data-testid="tonality-checkboxes-import">
                {TONALITIES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => toggleTonality(t.value)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-full border transition-all",
                      selectedTonalities.includes(t.value)
                        ? "bg-amber-500/80 text-white border-amber-500"
                        : "bg-black/20 border-white/10 hover:border-white/30"
                    )}
                    data-testid={`tonality-import-${t.value}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Target className="w-3 h-3" /> Other Tone Notes (Optional)
              </label>
              <input
                type="text"
                value={otherToneNotes}
                onChange={(e) => setOtherToneNotes(e.target.value)}
                placeholder="e.g., Green Day power pop, spanky cleans, thick rhythm..."
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                data-testid="input-other-tone-notes-import"
              />
            </div>
          </div>

          {/* Target Shot Count */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Target className="w-3 h-3" /> Target Number of Shots (Optional)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="50"
                value={targetShotCount || ''}
                onChange={(e) => setTargetShotCount(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Auto"
                className="w-24 bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                data-testid="input-target-shot-count-import"
              />
              <span className="text-xs text-muted-foreground">
                {targetShotCount ? `Refine to exactly ${targetShotCount} shots` : 'Refine and expand your list'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={basicPositionsOnly}
                onChange={(e) => setBasicPositionsOnly(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/20 text-primary focus:ring-primary focus:ring-offset-0"
                data-testid="checkbox-basic-positions-only-import"
              />
              <span className="text-sm font-medium text-foreground">Basic Positions Only</span>
            </label>
            <p className="text-xs text-muted-foreground pl-7">
              Limit suggestions to Cap, CapEdge, CapEdge_Cone_Tr, and Cone. Skips off-center and bright/dark variations.
            </p>
          </div>

          {/* Single Distance for Dynamics (1D) */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={singleDistancePerMic}
                onChange={(e) => setSingleDistancePerMic(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/20 text-primary focus:ring-primary focus:ring-offset-0"
                data-testid="checkbox-single-distance-per-mic"
              />
              <span className="text-sm font-medium text-foreground">Same Distance for Dynamics</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">1D</span>
            </label>
            <p className="text-xs text-muted-foreground pl-7">
              SM57, M201, MD421, MD421K, M160, e906: same distance, vary position.
            </p>
          </div>
          
          {/* Single Position for Ribbons/Condensers (1P) */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={singlePositionForRibbons}
                onChange={(e) => setSinglePositionForRibbons(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/20 text-primary focus:ring-primary focus:ring-offset-0"
                data-testid="checkbox-single-position-for-ribbons-import"
              />
              <span className="text-sm font-medium text-foreground">Same Position for Ribbons/Condensers</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-medium">1P</span>
            </label>
            <p className="text-xs text-muted-foreground pl-7">
              Roswell, R121, R10, R92, C414: same position, vary distance.
            </p>
          </div>

          {/* Mic Recipe Builder */}
          <div className="space-y-3">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Mic2 className="w-3 h-3" /> Mic Recipe (Optional)
            </label>
            
            {/* Add mic row */}
            <div className="flex items-center gap-2">
              <select
                value={selectedMicForRecipe}
                onChange={(e) => setSelectedMicForRecipe(e.target.value)}
                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                data-testid="select-mic-recipe"
              >
                <option value="">Select mic...</option>
                <optgroup label="Single Mics">
                  {SINGLE_MICS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Blends">
                  {BLEND_MICS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </optgroup>
              </select>
              <div className="flex items-center gap-1 bg-black/20 border border-white/10 rounded-lg px-2">
                <button
                  type="button"
                  onClick={() => setSelectedMicCount(Math.max(1, selectedMicCount - 1))}
                  className="w-7 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-mic-count-minus"
                >
                  -
                </button>
                <span className="w-6 text-center text-sm font-medium">{selectedMicCount}</span>
                <button
                  type="button"
                  onClick={() => setSelectedMicCount(selectedMicCount + 1)}
                  className="w-7 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-mic-count-plus"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={addMicToRecipe}
                disabled={!selectedMicForRecipe}
                className={cn(
                  "px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  selectedMicForRecipe
                    ? "bg-primary/20 text-primary hover:bg-primary/30"
                    : "bg-white/5 text-muted-foreground cursor-not-allowed"
                )}
                data-testid="button-add-mic"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>
            
            {/* Recipe list */}
            {micRecipe.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {micRecipe.map((r) => (
                    <div 
                      key={r.mic}
                      className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-lg px-2 py-1.5"
                    >
                      <span className="text-sm font-medium text-primary">{r.label}</span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => updateMicCount(r.mic, -1)}
                          className="w-5 h-5 flex items-center justify-center text-primary/60 hover:text-primary text-xs"
                          data-testid={`button-decrease-${r.mic}`}
                        >
                          -
                        </button>
                        <span className="w-4 text-center text-sm text-primary">{r.count}</span>
                        <button
                          type="button"
                          onClick={() => updateMicCount(r.mic, 1)}
                          className="w-5 h-5 flex items-center justify-center text-primary/60 hover:text-primary text-xs"
                          data-testid={`button-increase-${r.mic}`}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleMicSinglePosition(r.mic)}
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium transition-all",
                          r.singlePosition 
                            ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/40" 
                            : "bg-white/5 text-muted-foreground border border-white/10 hover:border-white/20"
                        )}
                        title={r.singlePosition ? "Single position: ON - one position" : "Single position: OFF - vary positions"}
                        data-testid={`button-toggle-single-position-${r.mic}`}
                      >
                        1P
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleMicSingleDistance(r.mic)}
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium transition-all",
                          r.singleDistance 
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                            : "bg-white/5 text-muted-foreground border border-white/10 hover:border-white/20"
                        )}
                        title={r.singleDistance ? "Single distance: ON - one distance" : "Single distance: OFF - vary distances"}
                        data-testid={`button-toggle-single-distance-${r.mic}`}
                      >
                        1D
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMicFromRecipe(r.mic)}
                        className="w-5 h-5 flex items-center justify-center text-primary/40 hover:text-red-400"
                        data-testid={`button-remove-${r.mic}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total: {getTotalRecipeShots()} shots
                </p>
              </div>
            )}
          </div>

          {/* Specific Shots (free text) */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Target className="w-3 h-3" /> Specific Shots (Optional)
            </label>
            <input
              type="text"
              value={specificShots}
              onChange={(e) => setSpecificShots(e.target.value)}
              placeholder="e.g., SM57 CapEdge @ 3in, R121 Cap @ 4in..."
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              data-testid="input-specific-shots"
            />
            <p className="text-xs text-muted-foreground">
              Request specific mic/position/distance combinations to include in the output.
            </p>
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

        {mode === 'shot-designer' && (
        <ShotDesignerPanel speakers={SPEAKERS} genres={GENRES} />
        )}

        {mode === 'gap-finder' && (
        <GapFinderPanel speakers={SPEAKERS} genres={GENRES} />
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

              {/* Show selection rationale for small shot counts (1-4) */}
              {result.selectionRationale && (result.shots || result.recommendations || []).length <= 4 && (() => {
                const count = (result.shots || result.recommendations || []).length;
                return (
                  <div className="glass-panel p-4 rounded-xl border-l-4 border-l-primary/50" data-testid="text-selection-rationale">
                    <p className="text-sm text-muted-foreground">
                      <span className="text-foreground font-medium">{count === 1 ? 'Why this shot: ' : 'Why these shots: '}</span>
                      {result.selectionRationale}
                    </p>
                  </div>
                );
              })()}

              <h3 className="text-lg font-semibold text-white">Recommended Shots</h3>

              <div className="grid gap-4">
                {sortRecommendations(result.shots || result.recommendations || [], result.mic).map((shot: any, i: number) => {
                  // Extract voicing from multiple sources for MD441/e906
                  const topMicLower = (result.mic || '').toLowerCase();
                  const isSwitchableMic = topMicLower.includes('441') || topMicLower.includes('e906') || topMicLower.includes('906');
                  
                  // Check shot.micLabel first, then rationale/expectedTone
                  let detectedVoicing: 'Presence' | 'Flat' | null = null;
                  const micLabel = shot.micLabel || '';
                  const rationale = shot.rationale || '';
                  const expectedTone = shot.expectedTone || '';
                  const searchText = `${micLabel} ${rationale} ${expectedTone}`.toLowerCase();
                  
                  if (isSwitchableMic || micLabel.toLowerCase().includes('441') || micLabel.toLowerCase().includes('906')) {
                    if (searchText.includes('presence') || searchText.includes('boost')) {
                      detectedVoicing = 'Presence';
                    } else if (searchText.includes('flat') || searchText.includes('neutral')) {
                      detectedVoicing = 'Flat';
                    }
                  }
                  
                  return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-panel p-5 rounded-xl space-y-3"
                    data-testid={`card-shot-${i}`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      {shot.micLabel && (
                        <div className="flex items-center gap-2 bg-primary/30 px-3 py-1.5 rounded-full border border-primary/30">
                          <Mic2 className="w-4 h-4 text-primary" />
                          <span className="text-sm font-bold text-primary">
                            {shot.micLabel.replace(/\s*\((Presence|Flat)(?:\s+Boost)?\)/i, '')}
                          </span>
                        </div>
                      )}
                      {/* Show voicing (Presence/Flat) as separate badge - from micLabel or detected from rationale */}
                      {detectedVoicing && (
                        <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-500/30">
                          <Settings2 className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-medium text-amber-400">
                            {detectedVoicing}
                          </span>
                        </div>
                      )}
                      {shot.blendRatio && (
                        <div className="flex items-center gap-2 bg-violet-500/20 px-3 py-1.5 rounded-full border border-violet-500/30">
                          <Settings2 className="w-4 h-4 text-violet-400" />
                          <span className="text-sm font-medium text-violet-400">
                            {shot.blendRatio}
                          </span>
                        </div>
                      )}
                      {shot.position && (
                        <div className="flex items-center gap-2 bg-secondary/30 px-3 py-1.5 rounded-full border border-secondary/30">
                          <Target className="w-4 h-4 text-secondary" />
                          <span className="text-sm font-medium text-secondary">{POSITION_LABELS[shot.position] || shot.position}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                        <Ruler className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{shot.distance}"</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium ml-auto">{shot.bestFor}</span>
                    </div>
                    
                    <div className="space-y-2 pl-1">
                      <p className="text-sm text-muted-foreground">
                        <span className="text-foreground font-medium">Why:</span> {shot.rationale}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <span className="text-foreground font-medium">Expected Tone:</span> {shot.expectedTone}
                      </p>
                    </div>
                  </motion.div>
                );
                })}
              </div>
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

              {/* Show warning if no additional mics available */}
              {(speakerResult as any).noAdditionalMicsWarning && (
                <div className="glass-panel p-4 rounded-xl border-l-4 border-l-yellow-500/70 bg-yellow-500/10" data-testid="text-no-additional-mics-warning">
                  <p className="text-sm text-yellow-200">
                    <span className="font-medium">Note:</span> {(speakerResult as any).noAdditionalMicsWarning}
                  </p>
                </div>
              )}

              {/* Show selection rationale for small shot counts (1-4) */}
              {speakerResult.selectionRationale && speakerResult.micRecommendations.length <= 4 && (() => {
                const count = speakerResult.micRecommendations.length;
                return (
                  <div className="glass-panel p-4 rounded-xl border-l-4 border-l-primary/50" data-testid="text-selection-rationale-speaker">
                    <p className="text-sm text-muted-foreground">
                      <span className="text-foreground font-medium">{count === 1 ? 'Why this shot: ' : 'Why these shots: '}</span>
                      {speakerResult.selectionRationale}
                    </p>
                  </div>
                );
              })()}

              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ListFilter className="w-5 h-5 text-primary" />
                Recommended Mic/Position/Distance Combos
              </h3>

              <div className="grid gap-4">
                {sortRecommendations(speakerResult.micRecommendations).map((rec, i) => (
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
                        <span className="text-sm font-bold text-primary">
                          {/* Strip voicing from display since we show it separately */}
                          {rec.micLabel?.replace(/\s*\((Presence|Flat)(?:\s+Boost)?\)/i, '') || rec.micLabel}
                        </span>
                      </div>
                      {/* Show voicing (Presence/Flat) as separate badge if present */}
                      {rec.micLabel && (rec.micLabel.toLowerCase().includes('presence') || rec.micLabel.toLowerCase().includes('flat')) && (
                        <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-500/30">
                          <Settings2 className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-medium text-amber-400">
                            {rec.micLabel.toLowerCase().includes('presence') ? 'Presence' : 'Flat'}
                          </span>
                        </div>
                      )}
                      {rec.blendRatio && (
                        <div className="flex items-center gap-2 bg-violet-500/20 px-3 py-1.5 rounded-full border border-violet-500/30">
                          <Settings2 className="w-4 h-4 text-violet-400" />
                          <span className="text-sm font-medium text-violet-400">
                            {rec.blendRatio}
                          </span>
                        </div>
                      )}
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
