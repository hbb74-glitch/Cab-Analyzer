import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Layers, FileAudio, Trash2, Zap, Music4, Copy, Check, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { analyzeAudioFile, type AudioMetrics } from "@/hooks/use-analyses";
import { api, type PairingResponse, type IRMetrics } from "@shared/routes";

interface UploadedIR {
  file: File;
  metrics: AudioMetrics | null;
  analyzing: boolean;
  error: string | null;
}

export default function Pairing() {
  const [speaker1IRs, setSpeaker1IRs] = useState<UploadedIR[]>([]);
  const [speaker2IRs, setSpeaker2IRs] = useState<UploadedIR[]>([]);
  const [result, setResult] = useState<PairingResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [tonePreferences, setTonePreferences] = useState("");
  const { toast } = useToast();

  const isMixedMode = speaker1IRs.length > 0 && speaker2IRs.length > 0;

  const copyPairings = () => {
    if (!result) return;
    
    let text = isMixedMode ? "Mixed Speaker IR Pairing Recommendations\n" : "IR Pairing Recommendations\n";
    text += "=".repeat(40) + "\n\n";
    
    result.pairings.forEach((pairing, i) => {
      text += `${i + 1}. ${pairing.title}\n`;
      text += `   ${pairing.ir1} + ${pairing.ir2}\n`;
      text += `   Mix Ratio: ${pairing.mixRatio}\n`;
      text += `   Score: ${pairing.score}/100\n`;
      text += `   Expected Tone: ${pairing.expectedTone}\n`;
      text += `   Best For: ${pairing.bestFor}\n`;
      text += `   Why: ${pairing.rationale}\n\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "Pairing recommendations copied with descriptions.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const { mutate: analyzePairings, isPending } = useMutation({
    mutationFn: async ({ irs, irs2, tonePrefs, mixedMode }: { 
      irs: IRMetrics[], 
      irs2?: IRMetrics[], 
      tonePrefs?: string,
      mixedMode?: boolean 
    }) => {
      const validated = api.pairing.analyze.input.parse({ 
        irs, 
        irs2, 
        tonePreferences: tonePrefs,
        mixedMode 
      });
      const res = await fetch(api.pairing.analyze.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to analyze pairings");
      return api.pairing.analyze.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to analyze IR pairings", variant: "destructive" });
    },
  });

  const processFiles = async (
    files: File[], 
    setIRs: React.Dispatch<React.SetStateAction<UploadedIR[]>>
  ) => {
    const wavFiles = files.filter(f => f.name.toLowerCase().endsWith('.wav'));
    
    if (wavFiles.length === 0) {
      toast({ title: "Invalid files", description: "Please upload .wav files only", variant: "destructive" });
      return;
    }

    const newIRs: UploadedIR[] = wavFiles.map(file => ({
      file,
      metrics: null,
      analyzing: true,
      error: null,
    }));

    setIRs(newIRs);
    setResult(null);

    for (let i = 0; i < wavFiles.length; i++) {
      const file = wavFiles[i];
      try {
        const metrics = await analyzeAudioFile(file);
        setIRs(prev => prev.map(ir => 
          ir.file.name === file.name && ir.file.size === file.size
            ? { ...ir, metrics, analyzing: false }
            : ir
        ));
      } catch (err) {
        setIRs(prev => prev.map(ir => 
          ir.file.name === file.name && ir.file.size === file.size
            ? { ...ir, analyzing: false, error: "Failed to analyze" }
            : ir
        ));
      }
    }
  };

  const onDropSpeaker1 = useCallback(async (acceptedFiles: File[]) => {
    await processFiles(acceptedFiles, setSpeaker1IRs);
  }, [toast]);

  const onDropSpeaker2 = useCallback(async (acceptedFiles: File[]) => {
    await processFiles(acceptedFiles, setSpeaker2IRs);
  }, [toast]);

  const removeIR = (index: number, speaker: 1 | 2) => {
    if (speaker === 1) {
      setSpeaker1IRs(prev => prev.filter((_, i) => i !== index));
    } else {
      setSpeaker2IRs(prev => prev.filter((_, i) => i !== index));
    }
    setResult(null);
  };

  const clearSpeaker = (speaker: 1 | 2) => {
    if (speaker === 1) {
      setSpeaker1IRs([]);
    } else {
      setSpeaker2IRs([]);
    }
    setResult(null);
  };

  const handleAnalyze = () => {
    const valid1 = speaker1IRs.filter(ir => ir.metrics && !ir.error);
    const valid2 = speaker2IRs.filter(ir => ir.metrics && !ir.error);

    // Mixed mode requires at least 1 IR in each set
    if (isMixedMode) {
      if (valid1.length === 0 || valid2.length === 0) {
        toast({ 
          title: "Need IRs in both sets", 
          description: "For mixed speaker pairing, add at least 1 IR to each speaker set", 
          variant: "destructive" 
        });
        return;
      }
    } else {
      // Single speaker mode requires at least 2 IRs
      if (valid1.length < 2) {
        toast({ 
          title: "Need more IRs", 
          description: "Upload at least 2 valid IRs to analyze pairings", 
          variant: "destructive" 
        });
        return;
      }
    }

    const toMetrics = (irs: UploadedIR[]): IRMetrics[] => 
      irs.filter(ir => ir.metrics && !ir.error).map(ir => ({
        filename: ir.file.name,
        duration: ir.metrics!.durationMs,
        peakLevel: ir.metrics!.peakAmplitudeDb,
        spectralCentroid: ir.metrics!.spectralCentroid,
        lowEnergy: ir.metrics!.lowEnergy,
        midEnergy: ir.metrics!.midEnergy,
        highEnergy: ir.metrics!.highEnergy,
      }));

    if (isMixedMode) {
      analyzePairings({ 
        irs: toMetrics(valid1), 
        irs2: toMetrics(valid2), 
        tonePrefs: tonePreferences || undefined,
        mixedMode: true 
      });
    } else {
      analyzePairings({ 
        irs: toMetrics(valid1), 
        tonePrefs: tonePreferences || undefined 
      });
    }
  };

  const dropzone1 = useDropzone({
    onDrop: onDropSpeaker1,
    accept: { "audio/wav": [".wav"] },
    multiple: true,
  });

  const dropzone2 = useDropzone({
    onDrop: onDropSpeaker2,
    accept: { "audio/wav": [".wav"] },
    multiple: true,
  });

  const valid1Count = speaker1IRs.filter(ir => ir.metrics && !ir.error).length;
  const valid2Count = speaker2IRs.filter(ir => ir.metrics && !ir.error).length;
  const analyzing1Count = speaker1IRs.filter(ir => ir.analyzing).length;
  const analyzing2Count = speaker2IRs.filter(ir => ir.analyzing).length;
  const totalAnalyzing = analyzing1Count + analyzing2Count;

  const canAnalyze = isMixedMode 
    ? (valid1Count >= 1 && valid2Count >= 1 && totalAnalyzing === 0)
    : (valid1Count >= 2 && totalAnalyzing === 0);

  const IRList = ({ 
    irs, 
    speaker, 
    onRemove, 
    onClear 
  }: { 
    irs: UploadedIR[], 
    speaker: 1 | 2, 
    onRemove: (index: number) => void,
    onClear: () => void 
  }) => {
    const validCount = irs.filter(ir => ir.metrics && !ir.error).length;
    
    if (irs.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {validCount} IR{validCount !== 1 ? 's' : ''} ready
          </span>
          <button
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
            data-testid={`button-clear-speaker-${speaker}`}
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          <AnimatePresence>
            {irs.map((ir, index) => (
              <motion.div
                key={`${ir.file.name}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={cn(
                  "p-2 rounded-lg bg-white/5 flex items-center justify-between gap-2",
                  ir.error && "border border-destructive/50"
                )}
                data-testid={`ir-item-speaker${speaker}-${index}`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={cn(
                    "w-6 h-6 rounded flex items-center justify-center flex-shrink-0",
                    ir.analyzing ? "bg-yellow-500/20" :
                    ir.error ? "bg-destructive/20" :
                    speaker === 1 ? "bg-primary/20" : "bg-secondary/20"
                  )}>
                    {ir.analyzing ? (
                      <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />
                    ) : ir.error ? (
                      <Music4 className="w-3 h-3 text-destructive" />
                    ) : (
                      <Music4 className={cn("w-3 h-3", speaker === 1 ? "text-primary" : "text-secondary")} />
                    )}
                  </div>
                  <p className="text-xs truncate flex-1">{ir.file.name}</p>
                </div>
                <button
                  onClick={() => onRemove(index)}
                  className="p-1 hover:bg-white/5 rounded transition-colors flex-shrink-0"
                  data-testid={`button-remove-ir-speaker${speaker}-${index}`}
                >
                  <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-white to-secondary pb-2">
            IR Pairing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload IRs to find optimal pairings. Use one speaker or mix two different speakers for hybrid tones.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Speaker 1 Dropzone */}
          <div className="space-y-4">
            <div
              {...dropzone1.getRootProps()}
              className={cn(
                "glass-panel p-6 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer",
                dropzone1.isDragActive
                  ? "border-primary bg-primary/5 shadow-[0_0_30px_-10px_rgba(34,197,94,0.4)]"
                  : "border-white/10 hover:border-primary/50"
              )}
              data-testid="dropzone-speaker1"
            >
              <input {...dropzone1.getInputProps()} data-testid="input-files-speaker1" />
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Layers className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-primary">
                    Speaker 1 IRs
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dropzone1.isDragActive ? "Drop files here" : "Drop .wav files or click to browse"}
                  </p>
                </div>
              </div>
            </div>
            <IRList 
              irs={speaker1IRs} 
              speaker={1} 
              onRemove={(i) => removeIR(i, 1)}
              onClear={() => clearSpeaker(1)}
            />
          </div>

          {/* Speaker 2 Dropzone */}
          <div className="space-y-4">
            <div
              {...dropzone2.getRootProps()}
              className={cn(
                "glass-panel p-6 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer",
                dropzone2.isDragActive
                  ? "border-secondary bg-secondary/5 shadow-[0_0_30px_-10px_rgba(168,85,247,0.4)]"
                  : "border-white/10 hover:border-secondary/50"
              )}
              data-testid="dropzone-speaker2"
            >
              <input {...dropzone2.getInputProps()} data-testid="input-files-speaker2" />
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-secondary" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-secondary">
                    Speaker 2 IRs (optional)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dropzone2.isDragActive ? "Drop files here" : "Add for cross-speaker mixing"}
                  </p>
                </div>
              </div>
            </div>
            <IRList 
              irs={speaker2IRs} 
              speaker={2} 
              onRemove={(i) => removeIR(i, 2)}
              onClear={() => clearSpeaker(2)}
            />
          </div>
        </div>

        {/* Mode indicator */}
        {(speaker1IRs.length > 0 || speaker2IRs.length > 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <span className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
              isMixedMode 
                ? "bg-gradient-to-r from-primary/20 to-secondary/20 text-white" 
                : "bg-primary/20 text-primary"
            )}>
              {isMixedMode ? (
                <>
                  <Layers className="w-4 h-4" />
                  Mixed Speaker Mode - Cross-speaker pairings
                </>
              ) : (
                <>
                  <FileAudio className="w-4 h-4" />
                  Single Speaker Mode - {valid1Count >= 2 ? "Ready to analyze" : "Add at least 2 IRs"}
                </>
              )}
            </span>
          </motion.div>
        )}

        {/* Tone preferences and analyze button */}
        {(valid1Count >= 2 || isMixedMode) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 max-w-2xl mx-auto"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Desired Tone (optional)
              </label>
              <textarea
                value={tonePreferences}
                onChange={(e) => setTonePreferences(e.target.value)}
                placeholder="Describe your desired sound: edgy, bright, thick, dark, aggressive, chunky, rhythm tones, leads, smooth highs, tight bass..."
                className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-sm placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                rows={2}
                data-testid="input-tone-preferences"
              />
              <p className="text-xs text-muted-foreground">
                The AI will prioritize pairings that achieve your tonal goals
              </p>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze || isPending}
              className={cn(
                "w-full py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2",
                canAnalyze && !isPending
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_-5px_rgba(34,197,94,0.5)]"
                  : "bg-white/5 text-muted-foreground cursor-not-allowed"
              )}
              data-testid="button-analyze-pairings"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing {isMixedMode ? "Cross-Speaker " : ""}Pairings...
                </>
              ) : totalAnalyzing > 0 ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing {totalAnalyzing} file(s)...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  {isMixedMode 
                    ? `Find Best Cross-Speaker Pairings (${valid1Count} + ${valid2Count} IRs)`
                    : `Find Best Pairings (${valid1Count} IRs)`
                  }
                </>
              )}
            </button>
          </motion.div>
        )}

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="glass-panel p-6 rounded-2xl">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Zap className="w-6 h-6 text-primary" />
                    {isMixedMode ? "Best Cross-Speaker Pairings" : "Best Pairings"}
                  </h2>
                  <button
                    onClick={copyPairings}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
                    data-testid="button-copy-pairings"
                  >
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied!" : "Copy All"}
                  </button>
                </div>
                <p className="text-muted-foreground mb-6">{result.summary}</p>

                <div className="space-y-4">
                  {result.pairings.map((pairing, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3"
                      data-testid={`pairing-result-${index}`}
                    >
                      {/* Pairing Title */}
                      <h3 className="text-lg font-bold text-foreground">{pairing.title}</h3>
                      
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-mono rounded">
                              {pairing.ir1}
                            </span>
                            <span className="text-muted-foreground">+</span>
                            <span className="px-2 py-1 bg-secondary/20 text-secondary text-xs font-mono rounded">
                              {pairing.ir2}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">{pairing.mixRatio}</p>
                            <p className="text-xs text-muted-foreground">mix ratio</p>
                          </div>
                          <div className={cn(
                            "w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg",
                            pairing.score >= 85 ? "bg-primary/20 text-primary" :
                            pairing.score >= 70 ? "bg-yellow-500/20 text-yellow-500" :
                            "bg-orange-500/20 text-orange-500"
                          )}>
                            {pairing.score}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-foreground/80">{pairing.rationale}</p>

                      <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <div className="p-2 rounded bg-white/5">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Expected Tone</p>
                          <p className="text-foreground/90">{pairing.expectedTone}</p>
                        </div>
                        <div className="p-2 rounded bg-white/5">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Best For</p>
                          <p className="text-foreground/90">{pairing.bestFor}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
