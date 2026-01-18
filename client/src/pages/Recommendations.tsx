import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Lightbulb, Mic2, Speaker, Ruler, Music, Target, ListFilter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { api, type RecommendationsResponse, type SpeakerRecommendationsResponse } from "@shared/routes";

const MICS = [
  { value: "57", label: "SM57" },
  { value: "121", label: "R-121" },
  { value: "160", label: "M160" },
  { value: "421", label: "MD421" },
  { value: "421-kompakt", label: "MD421 Kompakt" },
  { value: "r10", label: "R10" },
  { value: "m88", label: "M88" },
  { value: "pr30", label: "PR30" },
  { value: "e906-boost", label: "e906 (Presence Boost)" },
  { value: "e906-flat", label: "e906 (Flat)" },
  { value: "m201", label: "M201" },
  { value: "sm7b", label: "SM7B" },
  { value: "roswell-cab", label: "Roswell Cab Mic" },
];

const SPEAKERS = [
  { value: "g12m25", label: "G12M-25 (Greenback)" },
  { value: "v30-china", label: "V30" },
  { value: "v30-blackcat", label: "V30 (Black Cat)" },
  { value: "k100", label: "G12K-100" },
  { value: "g12t75", label: "G12T-75" },
  { value: "g12-65", label: "G12-65" },
  { value: "g12h30-anniversary", label: "G12H30 Anniversary" },
  { value: "celestion-cream", label: "Celestion Cream" },
  { value: "ga12-sc64", label: "GA12-SC64" },
  { value: "g10-sc64", label: "G10-SC64" },
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
];

export default function Recommendations() {
  const [micType, setMicType] = useState<string>("");
  const [speaker, setSpeaker] = useState<string>("");
  const [genre, setGenre] = useState<string>("");
  const [result, setResult] = useState<RecommendationsResponse | null>(null);
  const { toast } = useToast();

  const { mutate: getRecommendations, isPending } = useMutation({
    mutationFn: async ({ micType, speakerModel, genre }: { micType: string; speakerModel: string; genre?: string }) => {
      const payload: { micType: string; speakerModel: string; genre?: string } = { micType, speakerModel };
      if (genre) payload.genre = genre;
      const validated = api.recommendations.get.input.parse(payload);
      const res = await fetch(api.recommendations.get.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to get recommendations");
      return api.recommendations.get.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate recommendations", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!micType) {
      toast({ title: "Select a microphone", description: "Please choose a microphone type first", variant: "destructive" });
      return;
    }
    if (!speaker) {
      toast({ title: "Select a speaker", description: "Please choose a speaker model", variant: "destructive" });
      return;
    }
    getRecommendations({ micType, speakerModel: speaker, genre: genre || undefined });
  };

  const getMicLabel = (value: string) => MICS.find(m => m.value === value)?.label || value;
  const getSpeakerLabel = (value: string) => SPEAKERS.find(s => s.value === value)?.label || value;
  const getGenreLabel = (value: string) => GENRES.find(g => g.value === value)?.label || value;
  
  const POSITION_LABELS: Record<string, string> = {
    "cap": "Cap",
    "cap-edge": "Cap Edge",
    "cap-edge-favor-cap": "Cap Edge (Favor Cap)",
    "cap-edge-favor-cone": "Cap Edge (Favor Cone)",
    "cone": "Cone",
    "cap-off-center": "Cap Off Center",
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-white to-secondary pb-2">
            Distance Recommendations
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get expert recommendations for ideal microphone distances based on your mic and speaker combination.
            Optionally specify a genre to refine suggestions for specific tonal goals.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-2xl space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Mic2 className="w-3 h-3" /> Microphone
              </label>
              <select
                value={micType}
                onChange={(e) => setMicType(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                data-testid="select-mic"
              >
                <option value="">Select a microphone...</option>
                {MICS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
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
            <p className="text-xs text-muted-foreground">Leave as "Any / General" for position-agnostic distance recommendations</p>
          </div>

          <button
            type="submit"
            disabled={!micType || !speaker || isPending}
            className={cn(
              "w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 shadow-lg flex items-center justify-center gap-2",
              !micType || !speaker || isPending
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/25 hover:-translate-y-0.5"
            )}
            data-testid="button-get-recommendations"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <Lightbulb className="w-4 h-4" /> Get Distance Recommendations
              </>
            )}
          </button>
        </form>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-full border border-primary/20">
                    <Mic2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">{getMicLabel(result.mic)}</span>
                  </div>
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
        </AnimatePresence>
      </div>
    </div>
  );
}
