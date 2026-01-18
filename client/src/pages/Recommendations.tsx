import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Lightbulb, Mic2, Speaker, Ruler, Music, Target, ListFilter, Zap, Copy, Check, FileText, ArrowRight, CheckCircle, PlusCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { api, type RecommendationsResponse, type SpeakerRecommendationsResponse, type AmpRecommendationsResponse, type PositionImportResponse } from "@shared/routes";

const MICS = [
  { value: "57", label: "SM57" },
  { value: "121", label: "R121" },
  { value: "r92", label: "R92" },
  { value: "160", label: "M160" },
  { value: "421", label: "MD421" },
  { value: "421-kompakt", label: "MD421 Kompakt" },
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
  { value: "indie-rock", label: "Indie Rock" },
  { value: "custom", label: "Custom (type your own)" },
];

type Mode = 'by-speaker' | 'by-amp' | 'import-positions';

export default function Recommendations() {
  const [mode, setMode] = useState<Mode>('by-speaker');
  const [micType, setMicType] = useState<string>("");
  const [speaker, setSpeaker] = useState<string>("");
  const [genre, setGenre] = useState<string>("");
  const [customGenre, setCustomGenre] = useState<string>("");
  const [ampDescription, setAmpDescription] = useState<string>("");
  const [positionList, setPositionList] = useState<string>("");
  const [importSpeaker, setImportSpeaker] = useState<string>("");
  const [result, setResult] = useState<RecommendationsResponse | null>(null);
  const [speakerResult, setSpeakerResult] = useState<SpeakerRecommendationsResponse | null>(null);
  const [ampResult, setAmpResult] = useState<AmpRecommendationsResponse | null>(null);
  const [importResult, setImportResult] = useState<PositionImportResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Shorthand mappings for speakers
  const SPEAKER_SHORTHAND: Record<string, string> = {
    "celestion-cream": "Cream",
    "v30-china": "V30",
    "v30-blackcat": "V30BC",
    "g12m25": "G12M",
    "g12h30-anniversary": "G12HAnni",
    "g12-65": "G12-65Heri",
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
    "421-kompakt": { base: "MD421Kompakt" },
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
    
    // Helper to format position as CamelCase with underscore for sub-positions
    const formatPosition = (pos: string) => {
      // Handle positions like "cap-edge-favor-cap" -> "CapEdge_FavorCap"
      const parts = pos.toLowerCase().split('-');
      
      if (parts.length <= 2) {
        // Simple positions: "cap", "cone", "cap-edge" -> "Cap", "Cone", "CapEdge"
        return parts.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
      } else {
        // Complex positions with "favor" or "off": "cap-edge-favor-cap" -> "CapEdge_FavorCap"
        // Find where to split (at "favor" or "off")
        const splitIndex = parts.findIndex(p => p === 'favor' || p === 'off');
        if (splitIndex > 0) {
          const firstPart = parts.slice(0, splitIndex).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
          const secondPart = parts.slice(splitIndex).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
          return `${firstPart}_${secondPart}`;
        }
        // Fallback: just CamelCase everything
        return parts.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
      }
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

  // Mode: if mic is selected, use mic+speaker endpoint; otherwise use speaker-only endpoint
  const isSpeakerOnlyMode = !micType && speaker;

  const { mutate: getRecommendations, isPending } = useMutation({
    mutationFn: async ({ micType, speakerModel, genre }: { micType?: string; speakerModel: string; genre?: string }) => {
      if (micType) {
        // Mic + Speaker mode
        const payload: { micType: string; speakerModel: string; genre?: string } = { micType, speakerModel };
        if (genre) payload.genre = genre;
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
        const payload: { speakerModel: string; genre?: string } = { speakerModel };
        if (genre) payload.genre = genre;
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
      setResult(null);
      setSpeakerResult(null);
      setAmpResult(null);
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
    const effectiveGenre = genre === 'custom' ? customGenre : genre;
    setAmpResult(null);
    getRecommendations({ micType: micType || undefined, speakerModel: speaker, genre: effectiveGenre || undefined });
  };

  const handleAmpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ampDescription.trim()) {
      toast({ title: "Describe your amp", description: "Please enter an amp description", variant: "destructive" });
      return;
    }
    const effectiveGenre = genre === 'custom' ? customGenre : genre;
    setResult(null);
    setSpeakerResult(null);
    getAmpRecommendations({ ampDescription: ampDescription.trim(), genre: effectiveGenre || undefined });
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!positionList.trim()) {
      toast({ title: "Paste your positions", description: "Please paste your tested IR positions", variant: "destructive" });
      return;
    }
    const effectiveGenre = genre === 'custom' ? customGenre : genre;
    setResult(null);
    setSpeakerResult(null);
    setAmpResult(null);
    refinePositions({ 
      positionList: positionList.trim(), 
      speaker: importSpeaker || undefined, 
      genre: effectiveGenre || undefined 
    });
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
    "cap-edge": "Cap Edge",
    "cap-edge-favor-cap": "Cap Edge (Favor Cap)",
    "cap-edge-favor-cone": "Cap Edge (Favor Cone)",
    "cone": "Cone",
    "cap-off-center": "Cap Off Center",
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setResult(null);
    setSpeakerResult(null);
    setAmpResult(null);
    setImportResult(null);
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
                placeholder="Enter your genre (e.g., 'doom metal', 'shoegaze', 'post-punk')"
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all mt-2"
                data-testid="input-custom-genre"
              />
            )}
            <p className="text-xs text-muted-foreground">Leave as "Any / General" for position-agnostic distance recommendations</p>
          </div>

          <button
            type="submit"
            disabled={!speaker || isPending || (genre === 'custom' && !customGenre.trim())}
            className={cn(
              "w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 shadow-lg flex items-center justify-center gap-2",
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
                placeholder="Enter your genre (e.g., 'doom metal', 'shoegaze', 'post-punk')"
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all mt-2"
                data-testid="input-custom-genre-amp"
              />
            )}
          </div>

          <button
            type="submit"
            disabled={!ampDescription.trim() || isAmpPending || (genre === 'custom' && !customGenre.trim())}
            className={cn(
              "w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 shadow-lg flex items-center justify-center gap-2",
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

          <button
            type="submit"
            disabled={!positionList.trim() || isImportPending}
            className={cn(
              "w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 shadow-lg flex items-center justify-center gap-2",
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
        </form>
        )}

        <AnimatePresence>
          {result && (
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
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
                    data-testid="button-copy-suggestions"
                  >
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied!" : "Copy Shorthand"}
                  </button>
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

          {speakerResult && (
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
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
                    data-testid="button-copy-speaker-suggestions"
                  >
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied!" : "Copy Shorthand"}
                  </button>
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

          {ampResult && (
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
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
                    data-testid="button-copy-amp-suggestions"
                  >
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied!" : "Copy Shorthand"}
                  </button>
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

          {importResult && (
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
                    {copied ? "Copied!" : "Copy Shorthand"}
                  </button>
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
