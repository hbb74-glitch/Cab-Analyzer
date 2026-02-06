import { useState, useCallback, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Layers, X, Blend, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { analyzeAudioFile, type AudioMetrics } from "@/hooks/use-analyses";
import { Button } from "@/components/ui/button";

interface RawBands {
  subBass: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  presence: number;
}

interface AnalyzedIR {
  filename: string;
  metrics: AudioMetrics;
  rawEnergy: RawBands;
  bands: RawBands;
}

const BAND_COLORS = [
  { label: "SubBass", key: "subBass" as const, color: "bg-purple-500" },
  { label: "Bass", key: "bass" as const, color: "bg-blue-500" },
  { label: "LowMid", key: "lowMid" as const, color: "bg-cyan-500" },
  { label: "Mid", key: "mid" as const, color: "bg-green-500" },
  { label: "HiMid", key: "highMid" as const, color: "bg-yellow-500" },
  { label: "Presence", key: "presence" as const, color: "bg-orange-500" },
];

const BLEND_RATIOS = [
  { label: "70/30", base: 0.7, feature: 0.3 },
  { label: "60/40", base: 0.6, feature: 0.4 },
  { label: "50/50", base: 0.5, feature: 0.5 },
  { label: "40/60", base: 0.4, feature: 0.6 },
  { label: "30/70", base: 0.3, feature: 0.7 },
];

function extractRawEnergy(m: AudioMetrics): RawBands {
  return {
    subBass: m.subBassEnergy,
    bass: m.bassEnergy,
    lowMid: m.lowMidEnergy,
    mid: m.midEnergy6,
    highMid: m.highMidEnergy,
    presence: m.presenceEnergy,
  };
}

function energyToPercent(raw: RawBands): RawBands {
  const total = raw.subBass + raw.bass + raw.lowMid + raw.mid + raw.highMid + raw.presence;
  if (total === 0) return { subBass: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, presence: 0 };
  return {
    subBass: Math.round((raw.subBass / total) * 1000) / 10,
    bass: Math.round((raw.bass / total) * 1000) / 10,
    lowMid: Math.round((raw.lowMid / total) * 1000) / 10,
    mid: Math.round((raw.mid / total) * 1000) / 10,
    highMid: Math.round((raw.highMid / total) * 1000) / 10,
    presence: Math.round((raw.presence / total) * 1000) / 10,
  };
}

function blendFromRaw(
  baseRaw: RawBands,
  featureRaw: RawBands,
  baseRatio: number,
  featureRatio: number
): RawBands {
  const blendedRaw: RawBands = {
    subBass: baseRaw.subBass * baseRatio + featureRaw.subBass * featureRatio,
    bass: baseRaw.bass * baseRatio + featureRaw.bass * featureRatio,
    lowMid: baseRaw.lowMid * baseRatio + featureRaw.lowMid * featureRatio,
    mid: baseRaw.mid * baseRatio + featureRaw.mid * featureRatio,
    highMid: baseRaw.highMid * baseRatio + featureRaw.highMid * featureRatio,
    presence: baseRaw.presence * baseRatio + featureRaw.presence * featureRatio,
  };
  return energyToPercent(blendedRaw);
}

function BandChart({ bands, height = 20, compact = false }: { bands: RawBands; height?: number; compact?: boolean }) {
  const hiMidMidRatio = bands.mid > 0 ? Math.round((bands.highMid / bands.mid) * 100) / 100 : 0;
  return (
    <div className="space-y-1">
      <div className={cn("grid grid-cols-6 gap-1", compact ? "text-[9px]" : "text-xs")}>
        {BAND_COLORS.map((band) => (
          <div key={band.key} className="flex flex-col items-center">
            <div className={cn("w-full bg-white/5 rounded overflow-hidden flex flex-col-reverse")} style={{ height: `${height * 4}px` }}>
              <div
                className={cn(band.color, "w-full transition-all")}
                style={{ height: `${Math.min(bands[band.key], 100)}%` }}
              />
            </div>
            <span className="text-muted-foreground mt-0.5">{compact ? band.label.slice(0, 3) : band.label}</span>
            <span className="text-foreground font-mono">{bands[band.key].toFixed(1)}%</span>
          </div>
        ))}
      </div>
      <div className="flex justify-center">
        <span className={cn(
          "text-xs font-mono px-2 py-0.5 rounded",
          hiMidMidRatio < 1.0 ? "bg-blue-500/20 text-blue-400" :
          hiMidMidRatio <= 2.0 ? "bg-green-500/20 text-green-400" :
          "bg-amber-500/20 text-amber-400"
        )}>
          HiMid/Mid: {hiMidMidRatio.toFixed(2)}
          {hiMidMidRatio < 1.0 ? " (dark)" : hiMidMidRatio > 2.0 ? " (bright)" : ""}
        </span>
      </div>
    </div>
  );
}

function DropZone({
  label,
  description,
  onFilesAdded,
  isLoading,
}: {
  label: string;
  description: string;
  onFilesAdded: (files: File[]) => void;
  isLoading: boolean;
}) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const wavFiles = acceptedFiles.filter((f) => f.name.toLowerCase().endsWith(".wav"));
    if (wavFiles.length > 0) onFilesAdded(wavFiles);
  }, [onFilesAdded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "audio/wav": [".wav"] },
    disabled: isLoading,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
        isDragActive ? "border-primary bg-primary/5" : "border-white/10",
        isLoading && "opacity-50 pointer-events-none"
      )}
      data-testid={`dropzone-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <input {...getInputProps()} />
      <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

export default function IRMixer() {
  const [baseIR, setBaseIR] = useState<AnalyzedIR | null>(null);
  const [featureIRs, setFeatureIRs] = useState<AnalyzedIR[]>([]);
  const [isLoadingBase, setIsLoadingBase] = useState(false);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState(2);
  const [expandedBlend, setExpandedBlend] = useState<string | null>(null);

  const handleBaseFile = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setIsLoadingBase(true);
    try {
      const file = files[0];
      const metrics = await analyzeAudioFile(file);
      const rawEnergy = extractRawEnergy(metrics);
      const bands = energyToPercent(rawEnergy);
      setBaseIR({ filename: file.name, metrics, rawEnergy, bands });
    } catch (e) {
      console.error("Failed to analyze base IR:", e);
    }
    setIsLoadingBase(false);
  }, []);

  const handleFeatureFiles = useCallback(async (files: File[]) => {
    setIsLoadingFeatures(true);
    try {
      const results: AnalyzedIR[] = [];
      for (const file of files) {
        const metrics = await analyzeAudioFile(file);
        const rawEnergy = extractRawEnergy(metrics);
        const bands = energyToPercent(rawEnergy);
        results.push({ filename: file.name, metrics, rawEnergy, bands });
      }
      setFeatureIRs((prev) => [...prev, ...results]);
    } catch (e) {
      console.error("Failed to analyze feature IRs:", e);
    }
    setIsLoadingFeatures(false);
  }, []);

  const removeFeature = useCallback((idx: number) => {
    setFeatureIRs((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const currentRatio = BLEND_RATIOS[selectedRatio];

  const blendResults = useMemo(() => {
    if (!baseIR || featureIRs.length === 0) return [];
    return featureIRs.map((feature) => {
      const allRatioBlends = BLEND_RATIOS.map((r) => ({
        ratio: r,
        bands: blendFromRaw(baseIR.rawEnergy, feature.rawEnergy, r.base, r.feature),
      }));
      return {
        feature,
        currentBlend: blendFromRaw(baseIR.rawEnergy, feature.rawEnergy, currentRatio.base, currentRatio.feature),
        allRatioBlends,
      };
    });
  }, [baseIR, featureIRs, currentRatio]);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <Blend className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">IR Mixer</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Drop a base IR and feature IRs to preview tonal balance of different blend permutations.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Base IR (foundation tone)</h3>
            {baseIR ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20"
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-sm font-mono text-indigo-400 truncate" data-testid="text-base-filename">{baseIR.filename}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setBaseIR(null)}
                    data-testid="button-remove-base"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <BandChart bands={baseIR.bands} />
              </motion.div>
            ) : (
              <DropZone
                label="Drop Base IR"
                description="The foundation tone for your blend"
                onFilesAdded={handleBaseFile}
                isLoading={isLoadingBase}
              />
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Feature IRs (blend candidates)</h3>
            <DropZone
              label="Drop Feature IRs"
              description="One or more IRs to blend with the base"
              onFilesAdded={handleFeatureFiles}
              isLoading={isLoadingFeatures}
            />
            {featureIRs.length > 0 && (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {featureIRs.map((ir, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-xs font-mono text-muted-foreground truncate" data-testid={`text-feature-filename-${idx}`}>
                      {ir.filename}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFeature(idx)}
                      data-testid={`button-remove-feature-${idx}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {baseIR && featureIRs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Blend Permutations
                <span className="text-muted-foreground font-normal">({featureIRs.length} combinations)</span>
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Base/Feature:</span>
                {BLEND_RATIOS.map((r, idx) => (
                  <Button
                    key={r.label}
                    size="sm"
                    variant={selectedRatio === idx ? "default" : "ghost"}
                    onClick={() => setSelectedRatio(idx)}
                    className={cn(
                      "font-mono text-xs",
                      selectedRatio === idx && "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                    )}
                    data-testid={`button-ratio-${r.label}`}
                  >
                    {r.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {blendResults.map((result, idx) => {
                  const isExpanded = expandedBlend === result.feature.filename;
                  const hiMidMidRatio = result.currentBlend.mid > 0
                    ? Math.round((result.currentBlend.highMid / result.currentBlend.mid) * 100) / 100
                    : 0;
                  return (
                    <motion.div
                      key={result.feature.filename}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: idx * 0.05 }}
                      className="rounded-xl bg-white/[0.02] border border-white/5"
                    >
                      <Button
                        variant="ghost"
                        onClick={() => setExpandedBlend(isExpanded ? null : result.feature.filename)}
                        className="w-full flex items-center justify-between gap-3 p-4 h-auto text-left rounded-xl"
                        data-testid={`button-expand-blend-${idx}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-xs font-mono text-indigo-400 truncate" data-testid={`text-blend-name-${idx}`}>
                            {baseIR.filename.replace(".wav", "")} + {result.feature.filename.replace(".wav", "")}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {currentRatio.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="hidden sm:flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground">Mid</span>
                            <span className="text-xs font-mono text-green-400">{result.currentBlend.mid.toFixed(1)}%</span>
                            <span className="text-[10px] text-muted-foreground ml-1">HiMid</span>
                            <span className="text-xs font-mono text-yellow-400">{result.currentBlend.highMid.toFixed(1)}%</span>
                            <span className="text-[10px] text-muted-foreground ml-1">Pres</span>
                            <span className="text-xs font-mono text-orange-400">{result.currentBlend.presence.toFixed(1)}%</span>
                            <span className={cn(
                              "text-[10px] font-mono px-1.5 py-0.5 rounded ml-1",
                              hiMidMidRatio < 1.0 ? "bg-blue-500/20 text-blue-400" :
                              hiMidMidRatio <= 2.0 ? "bg-green-500/20 text-green-400" :
                              "bg-amber-500/20 text-amber-400"
                            )}>
                              {hiMidMidRatio.toFixed(2)}
                            </span>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </Button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center" data-testid="text-label-base">Base</p>
                                  <BandChart bands={baseIR.bands} height={14} compact />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] text-indigo-400 uppercase tracking-wider text-center font-semibold" data-testid="text-label-blend">
                                    Blend ({currentRatio.label})
                                  </p>
                                  <BandChart bands={result.currentBlend} height={14} compact />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center" data-testid="text-label-feature">Feature</p>
                                  <BandChart bands={result.feature.bands} height={14} compact />
                                </div>
                              </div>

                              <div className="border-t border-white/5 pt-3">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">All Ratios</p>
                                <div className="grid grid-cols-5 gap-2">
                                  {result.allRatioBlends.map((rb) => {
                                    const r = rb.bands.mid > 0 ? Math.round((rb.bands.highMid / rb.bands.mid) * 100) / 100 : 0;
                                    return (
                                      <div key={rb.ratio.label} className={cn(
                                        "p-2 rounded-lg text-center text-[10px] border",
                                        rb.ratio.label === currentRatio.label
                                          ? "bg-indigo-500/10 border-indigo-500/20"
                                          : "bg-white/[0.02] border-white/5"
                                      )} data-testid={`text-ratio-card-${rb.ratio.label}`}>
                                        <p className="font-mono text-foreground mb-1">{rb.ratio.label}</p>
                                        <p className="text-green-400">M {rb.bands.mid.toFixed(1)}</p>
                                        <p className="text-yellow-400">HM {rb.bands.highMid.toFixed(1)}</p>
                                        <p className="text-orange-400">P {rb.bands.presence.toFixed(1)}</p>
                                        <p className={cn(
                                          "mt-1 font-mono",
                                          r < 1.0 ? "text-blue-400" : r <= 2.0 ? "text-green-400" : "text-amber-400"
                                        )}>
                                          {r.toFixed(2)}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {!baseIR && featureIRs.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Blend className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">Drop a base IR on the left and feature IRs on the right to preview blend permutations.</p>
          </div>
        )}
      </div>
    </div>
  );
}
