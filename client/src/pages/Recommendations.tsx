import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Lightbulb, Mic2, Target, Ruler } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { api, type RecommendationsResponse } from "@shared/routes";

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
  { value: "classic-rock", label: "Classic Rock" },
  { value: "hard-rock", label: "Hard Rock" },
  { value: "alternative-rock", label: "Alternative Rock" },
  { value: "punk", label: "Punk" },
  { value: "grunge", label: "Grunge" },
  { value: "classic-metal", label: "Classic Heavy Metal" },
  { value: "indie-rock", label: "Indie Rock" },
];

const MIC_LABELS: Record<string, string> = {
  "57": "SM57",
  "121": "R-121",
  "160": "M160",
  "421": "MD421",
  "421-kompakt": "MD421 Kompakt",
  "r10": "R10",
  "m88": "M88",
  "pr30": "PR30",
  "e906-boost": "e906 (Presence Boost)",
  "e906-flat": "e906 (Flat)",
  "m201": "M201",
  "sm7b": "SM7B",
  "roswell-cab": "Roswell Cab Mic",
};

const POSITION_LABELS: Record<string, string> = {
  "cap": "Cap",
  "cap-edge": "Cap Edge",
  "cap-edge-favor-cap": "Cap Edge (Favor Cap)",
  "cap-edge-favor-cone": "Cap Edge (Favor Cone)",
  "cone": "Cone",
  "cap-off-center": "Cap Off Center",
};

export default function Recommendations() {
  const [speaker, setSpeaker] = useState<string>("");
  const [genre, setGenre] = useState<string>("");
  const [result, setResult] = useState<RecommendationsResponse | null>(null);
  const { toast } = useToast();

  const { mutate: getRecommendations, isPending } = useMutation({
    mutationFn: async ({ speakerModel, genre }: { speakerModel: string; genre: string }) => {
      const validated = api.recommendations.get.input.parse({ speakerModel, genre });
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
    if (!speaker) {
      toast({ title: "Select a speaker", description: "Please choose a speaker model first", variant: "destructive" });
      return;
    }
    if (!genre) {
      toast({ title: "Select a genre", description: "Please choose a target genre", variant: "destructive" });
      return;
    }
    getRecommendations({ speakerModel: speaker, genre });
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-white to-secondary pb-2">
            Mic Recommendations
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get expert suggestions for microphone, position, and distance based on your speaker model.
            These recommendations are tailored for capturing high-quality impulse responses.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-2xl space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Speaker Model</label>
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

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Target Genre</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              data-testid="select-genre"
            >
              <option value="">Select a genre...</option>
              {GENRES.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={!speaker || !genre || isPending}
            className={cn(
              "w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 shadow-lg flex items-center justify-center gap-2",
              !speaker || !genre || isPending
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/25 hover:-translate-y-0.5"
            )}
            data-testid="button-get-recommendations"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Lightbulb className="w-4 h-4" /> Get Recommendations
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
              <div className="glass-panel p-6 rounded-2xl">
                <h2 className="text-xl font-bold text-white mb-2">{SPEAKERS.find(s => s.value === result.speaker)?.label}</h2>
                <p className="text-muted-foreground">{result.speakerDescription}</p>
              </div>

              <div className="grid gap-4">
                {result.recommendations.map((rec, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-panel p-5 rounded-xl space-y-4"
                    data-testid={`card-recommendation-${i}`}
                  >
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2 bg-primary/20 px-3 py-1.5 rounded-full border border-primary/20">
                        <Mic2 className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">{MIC_LABELS[rec.mic] || rec.mic}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-secondary/20 px-3 py-1.5 rounded-full border border-secondary/20">
                        <Target className="w-4 h-4 text-secondary" />
                        <span className="text-sm font-medium text-secondary">{POSITION_LABELS[rec.position] || rec.position}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                        <Ruler className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{rec.distance}"</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground"><span className="text-foreground font-medium">Why:</span> {rec.rationale}</p>
                      <p className="text-sm text-muted-foreground"><span className="text-foreground font-medium">Expected Tone:</span> {rec.expectedTone}</p>
                    </div>
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
