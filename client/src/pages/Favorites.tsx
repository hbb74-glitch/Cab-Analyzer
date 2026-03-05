import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Star, Copy, X, Blend, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  loadSuperblendFavorites,
  removeSuperblendFavorite,
  restoreTasteFromServer,
  loadFavoritesFromServer,
  syncFavoritesToServer,
  recoverBlendFavoritesFromServer,
  SUPERBLEND_INTENTS,
  type SavedSuperblend,
} from "@/lib/tasteStore";

const FAVORITES_KEY = "irscope.blendFavorites";
const PAIRING_FAVORITES_KEY = "irscope_blend_favorites";

interface BlendFavorite {
  ir1: string;
  ir2: string;
  ratio: string;
  ir1Role?: string;
  ir2Role?: string;
  source: string;
  score?: number;
  feedback?: string;
  feedbackText?: string;
  savedAt: string;
}

function loadBlendFavorites(): BlendFavorite[] {
  try {
    const learner = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    const pairing = JSON.parse(localStorage.getItem(PAIRING_FAVORITES_KEY) || "[]")
      .map((p: any) => ({
        ir1: p.ir1,
        ir2: p.ir2,
        ratio: p.mixRatio || "50:50",
        ir1Role: p.ir1Role,
        ir2Role: p.ir2Role,
        source: "pairing",
        score: p.score,
        savedAt: p.savedAt || new Date().toISOString(),
      }));
    const seen = new Set<string>();
    const merged: BlendFavorite[] = [];
    for (const f of [...learner, ...pairing]) {
      const key = `${f.ir1}|${f.ir2}|${f.ratio}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(f);
      }
    }
    return merged;
  } catch {
    return [];
  }
}

const strip = (f: string) => f.replace(/(_\d{13})?\.wav$/i, "");

export default function Favorites() {
  const [blendFavs, setBlendFavs] = useState<BlendFavorite[]>(() => loadBlendFavorites());
  const [superblendFavs, setSuperblendFavs] = useState<SavedSuperblend[]>(() => loadSuperblendFavorites());
  const [blendOpen, setBlendOpen] = useState(true);
  const [superblendOpen, setSuperblendOpen] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const localBlend = loadBlendFavorites();
    const localSuper = loadSuperblendFavorites();
    if (localBlend.length === 0 && localSuper.length === 0) {
      setRestoring(true);
      Promise.all([
        restoreTasteFromServer(),
        loadFavoritesFromServer("superblend"),
        loadFavoritesFromServer("pairing_blend"),
        loadFavoritesFromServer("learner_blend"),
        recoverBlendFavoritesFromServer(),
      ]).then(([_, serverSuper, serverPairingBlend, serverLearnerBlend, recoveredBlends]) => {
        if (Array.isArray(serverSuper) && serverSuper.length > 0) {
          const localSb = loadSuperblendFavorites();
          if (localSb.length === 0) {
            localStorage.setItem("irscope.superblendFavorites", JSON.stringify(serverSuper));
          }
        }
        if (Array.isArray(serverPairingBlend) && serverPairingBlend.length > 0) {
          const localPb = JSON.parse(localStorage.getItem(PAIRING_FAVORITES_KEY) || "[]");
          if (localPb.length === 0) {
            localStorage.setItem(PAIRING_FAVORITES_KEY, JSON.stringify(serverPairingBlend));
          }
        }
        const learnerData = (Array.isArray(serverLearnerBlend) && serverLearnerBlend.length > 0)
          ? serverLearnerBlend
          : (Array.isArray(recoveredBlends) && recoveredBlends.length > 0)
            ? recoveredBlends
            : [];
        if (learnerData.length > 0) {
          const localLb = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
          if (localLb.length === 0) {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(learnerData));
            syncFavoritesToServer("learner_blend", learnerData);
          }
        }
        setBlendFavs(loadBlendFavorites());
        setSuperblendFavs(loadSuperblendFavorites());
        setRestoring(false);
      }).catch(() => setRestoring(false));
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentBlend = loadBlendFavorites();
      const currentSuper = loadSuperblendFavorites();
      setBlendFavs(prev => (JSON.stringify(prev) !== JSON.stringify(currentBlend) ? currentBlend : prev));
      setSuperblendFavs(prev => (JSON.stringify(prev) !== JSON.stringify(currentSuper) ? currentSuper : prev));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const removeBlendFav = (idx: number) => {
    const removed = blendFavs[idx];
    const updated = [...blendFavs];
    updated.splice(idx, 1);
    if (removed?.source === "pairing") {
      const pairingFavs = JSON.parse(localStorage.getItem(PAIRING_FAVORITES_KEY) || "[]");
      const filtered = pairingFavs.filter((p: any) => !(p.ir1 === removed.ir1 && p.ir2 === removed.ir2));
      localStorage.setItem(PAIRING_FAVORITES_KEY, JSON.stringify(filtered));
      syncFavoritesToServer("pairing_blend", filtered);
    } else {
      const learnerFavs = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
      const filtered = learnerFavs.filter((f: any) => !(f.ir1 === removed.ir1 && f.ir2 === removed.ir2 && f.ratio === removed.ratio));
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
      syncFavoritesToServer("learner_blend", filtered);
    }
    setBlendFavs(updated);
    toast({ title: "Removed from favorites", duration: 1500 });
  };

  const removeSuperFav = (id: string) => {
    removeSuperblendFavorite(id);
    setSuperblendFavs(loadSuperblendFavorites());
    toast({ title: "Removed", description: "Superblend removed from collection." });
  };

  const copyBlendFavorites = () => {
    const lines = blendFavs.map(
      (f, i) =>
        `${i + 1}. ${strip(f.ir1)} + ${strip(f.ir2)} (${f.ratio})${f.ir1Role ? ` — ${f.ir1Role} / ${f.ir2Role}` : ""}${f.source ? ` [${f.source}]` : ""}`
    );
    navigator.clipboard.writeText(lines.join("\n"));
    toast({ title: "Copied blend favorites", duration: 2000 });
  };

  const copySuperblendFavorites = () => {
    const lines = superblendFavs.map((sb, i) => {
      const layers = sb.layers.map((l) => `  ${l.filename} — ${l.percentage}% (${l.role})`).join("\n");
      return `${i + 1}. ${sb.name}\n   Speaker: ${sb.speaker} | Intent: ${sb.intent} | Score: ${sb.versatilityScore}/100\n${layers}\n   Tone: ${sb.expectedTone}`;
    });
    navigator.clipboard.writeText(lines.join("\n\n"));
    toast({ title: "Copied superblend favorites", duration: 2000 });
  };

  const totalCount = blendFavs.length + superblendFavs.length;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-favorites-title">
          <Heart className="w-6 h-6 text-pink-400 fill-pink-400 inline mr-2 -mt-1" />
          Favorites
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totalCount === 0
            ? "No favorites saved yet. Save blends from the Learner or Blend Builder to see them here."
            : `${totalCount} saved favorite${totalCount !== 1 ? "s" : ""} across all blend types`}
        </p>
      </div>

      {blendFavs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-xl border border-pink-500/20 bg-pink-500/5 p-4"
          data-testid="favorites-blend-section"
        >
          <button
            onClick={() => setBlendOpen(!blendOpen)}
            className="w-full flex items-center justify-between"
            data-testid="button-toggle-blend-favorites"
          >
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Blend className="w-4 h-4 text-purple-400" />
              2-IR Blend Favorites
              <Badge variant="secondary" className="text-[10px] font-mono">
                {blendFavs.length}
              </Badge>
            </h2>
            {blendOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          <AnimatePresence>
            {blendOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-2"
              >
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyBlendFavorites}
                    className="text-[10px] h-6"
                    data-testid="button-copy-blend-favorites"
                  >
                    <Copy className="w-3 h-3 mr-1" /> Copy List
                  </Button>
                </div>
                {blendFavs.map((fav, i) => (
                  <div
                    key={`blend-${i}`}
                    className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/5"
                    data-testid={`favorite-blend-${i}`}
                  >
                    <Blend className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-mono text-foreground">{strip(fav.ir1)}</span>
                        <span className="text-[10px] text-muted-foreground">+</span>
                        <span className="text-xs font-mono text-foreground">{strip(fav.ir2)}</span>
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 font-bold text-purple-300"
                        >
                          {fav.ratio}
                        </Badge>
                      </div>
                      {(fav.ir1Role || fav.ir2Role) && (
                        <div className="flex gap-3 text-[9px] text-muted-foreground mt-0.5">
                          {fav.ir1Role && <span className="text-purple-300">{fav.ir1Role}</span>}
                          {fav.ir2Role && <span className="text-cyan-300">{fav.ir2Role}</span>}
                        </div>
                      )}
                      {fav.feedbackText && (
                        <p className="text-[9px] text-muted-foreground/70 italic mt-0.5 line-clamp-1">{fav.feedbackText}</p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-muted-foreground">{fav.source}</span>
                        {fav.score && <span className="text-[9px] text-emerald-400 font-mono">{fav.score}pts</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => removeBlendFav(i)}
                      className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                      title="Remove"
                      data-testid={`button-remove-blend-fav-${i}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {superblendFavs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"
          data-testid="favorites-superblend-section"
        >
          <button
            onClick={() => setSuperblendOpen(!superblendOpen)}
            className="w-full flex items-center justify-between"
            data-testid="button-toggle-superblend-favorites"
          >
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              Superblend Favorites
              <Badge variant="secondary" className="text-[10px] font-mono">
                {superblendFavs.length}
              </Badge>
            </h2>
            {superblendOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          <AnimatePresence>
            {superblendOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-3"
              >
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copySuperblendFavorites}
                    className="text-[10px] h-6"
                    data-testid="button-copy-superblend-favorites"
                  >
                    <Copy className="w-3 h-3 mr-1" /> Copy List
                  </Button>
                </div>
                {superblendFavs.map((sb) => (
                  <div
                    key={sb.id}
                    className="rounded-lg border border-amber-500/10 bg-amber-500/5 p-3 space-y-2"
                    data-testid={`favorite-superblend-${sb.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-sm font-semibold text-foreground">{sb.name}</span>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[9px]">
                            {sb.speaker}
                          </Badge>
                          <Badge variant="secondary" className="text-[9px]">
                            {SUPERBLEND_INTENTS.find((i) => i.value === sb.intent)?.label ||
                              sb.intent}
                          </Badge>
                          <span className="text-[9px] text-muted-foreground">
                            {sb.versatilityScore}/100
                          </span>
                        </div>
                        {sb.bestFor && (
                          <div className="text-[10px] text-muted-foreground mt-1 italic">
                            {sb.bestFor}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const lines = [
                              `Superblend: ${sb.name}`,
                              `Speaker: ${sb.speaker}`,
                              `Intent: ${sb.intent}`,
                              `Score: ${sb.versatilityScore}/100`,
                              "",
                              "Layers:",
                              ...sb.layers.map(
                                (l) => `  ${l.filename} — ${l.percentage}% (${l.role})`
                              ),
                              "",
                              `Tone: ${sb.expectedTone}`,
                            ];
                            navigator.clipboard.writeText(lines.join("\n"));
                            toast({ title: "Copied", description: "Superblend recipe copied." });
                          }}
                          className="text-muted-foreground hover:text-foreground"
                          data-testid={`button-copy-superblend-fav-${sb.id}`}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeSuperFav(sb.id)}
                          className="text-muted-foreground hover:text-destructive"
                          data-testid={`button-remove-superblend-fav-${sb.id}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sb.layers.map((l, i) => (
                        <span
                          key={i}
                          className="text-[10px] text-muted-foreground font-mono bg-white/[0.03] px-1.5 py-0.5 rounded"
                        >
                          {l.percentage}%{" "}
                          {l.filename.replace(/\.wav$/i, "").split("_").slice(1).join("_") ||
                            l.filename}
                        </span>
                      ))}
                    </div>
                    {sb.bandBreakdown && (
                      <div className="grid grid-cols-6 gap-1.5 text-center">
                        {(
                          ["subBass", "bass", "lowMid", "mid", "highMid", "presence"] as const
                        ).map((band) => (
                          <div key={band} className="text-[9px]">
                            <div className="text-muted-foreground">
                              {band === "subBass"
                                ? "Sub"
                                : band === "lowMid"
                                  ? "LoMid"
                                  : band === "highMid"
                                    ? "HiMid"
                                    : band.charAt(0).toUpperCase() + band.slice(1)}
                            </div>
                            <div className="font-mono text-foreground">
                              {sb.bandBreakdown[band]}%
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {sb.expectedTone && (
                      <div className="text-[10px] text-muted-foreground bg-white/[0.02] rounded p-2 mt-1">
                        {sb.expectedTone}
                      </div>
                    )}
                    {sb.baselineLayers && (
                      <div className="text-[9px] text-zinc-500 italic">
                        Baseline saved — original AI ratios preserved
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {totalCount === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          {restoring ? (
            <>
              <Loader2 className="w-12 h-12 mx-auto mb-4 opacity-40 animate-spin" />
              <p className="text-sm">Checking server for saved favorites...</p>
            </>
          ) : (
            <>
              <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">Save your favorite blends and superblends to see them here.</p>
              <p className="text-xs mt-2 opacity-60">
                Use the heart icon on blend suggestions or save Superblend results from the Learner or Blend Builder.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
