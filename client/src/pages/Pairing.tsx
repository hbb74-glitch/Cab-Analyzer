import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Layers, FileAudio, Trash2, Zap, Music4 } from "lucide-react";
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
  const [uploadedIRs, setUploadedIRs] = useState<UploadedIR[]>([]);
  const [result, setResult] = useState<PairingResponse | null>(null);
  const { toast } = useToast();

  const { mutate: analyzePairings, isPending } = useMutation({
    mutationFn: async (irs: IRMetrics[]) => {
      const validated = api.pairing.analyze.input.parse({ irs });
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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const wavFiles = acceptedFiles.filter(f => f.name.toLowerCase().endsWith('.wav'));
    
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

    setUploadedIRs(prev => [...prev, ...newIRs]);
    setResult(null);

    for (let i = 0; i < wavFiles.length; i++) {
      const file = wavFiles[i];
      try {
        const metrics = await analyzeAudioFile(file);
        setUploadedIRs(prev => prev.map(ir => 
          ir.file.name === file.name && ir.file.size === file.size
            ? { ...ir, metrics, analyzing: false }
            : ir
        ));
      } catch (err) {
        setUploadedIRs(prev => prev.map(ir => 
          ir.file.name === file.name && ir.file.size === file.size
            ? { ...ir, analyzing: false, error: "Failed to analyze" }
            : ir
        ));
      }
    }
  }, [toast]);

  const removeIR = (index: number) => {
    setUploadedIRs(prev => prev.filter((_, i) => i !== index));
    setResult(null);
  };

  const clearAll = () => {
    setUploadedIRs([]);
    setResult(null);
  };

  const handleAnalyze = () => {
    const validIRs = uploadedIRs.filter(ir => ir.metrics && !ir.error);
    if (validIRs.length < 2) {
      toast({ title: "Need more IRs", description: "Upload at least 2 valid IRs to analyze pairings", variant: "destructive" });
      return;
    }

    const irMetrics: IRMetrics[] = validIRs.map(ir => ({
      filename: ir.file.name,
      duration: ir.metrics!.durationMs,
      peakLevel: ir.metrics!.peakAmplitudeDb,
      spectralCentroid: ir.metrics!.spectralCentroid,
      lowEnergy: ir.metrics!.lowEnergy,
      midEnergy: ir.metrics!.midEnergy,
      highEnergy: ir.metrics!.highEnergy,
    }));

    analyzePairings(irMetrics);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "audio/wav": [".wav"] },
    multiple: true,
  });

  const validCount = uploadedIRs.filter(ir => ir.metrics && !ir.error).length;
  const analyzingCount = uploadedIRs.filter(ir => ir.analyzing).length;

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-white to-secondary pb-2">
            IR Pairing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload multiple IRs and discover which ones pair best together with optimal mix ratios.
          </p>
        </div>

        <div
          {...getRootProps()}
          className={cn(
            "glass-panel p-8 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer",
            isDragActive
              ? "border-primary bg-primary/5 shadow-[0_0_30px_-10px_rgba(34,197,94,0.4)]"
              : "border-white/10 hover:border-primary/50"
          )}
          data-testid="dropzone-pairing"
        >
          <input {...getInputProps()} data-testid="input-files-pairing" />
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Layers className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">
                {isDragActive ? "Drop your IR files here" : "Drop multiple IR files here"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload 2 or more .wav files to analyze pairing compatibility
              </p>
            </div>
          </div>
        </div>

        {uploadedIRs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileAudio className="w-5 h-5 text-primary" />
                Uploaded IRs ({validCount} ready)
              </h2>
              <button
                onClick={clearAll}
                className="text-sm text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                data-testid="button-clear-all"
              >
                <Trash2 className="w-4 h-4" />
                Clear all
              </button>
            </div>

            <div className="grid gap-2">
              <AnimatePresence>
                {uploadedIRs.map((ir, index) => (
                  <motion.div
                    key={`${ir.file.name}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={cn(
                      "glass-panel p-3 rounded-lg flex items-center justify-between",
                      ir.error && "border-destructive/50"
                    )}
                    data-testid={`ir-item-${index}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        "w-8 h-8 rounded flex items-center justify-center flex-shrink-0",
                        ir.analyzing ? "bg-yellow-500/20" :
                        ir.error ? "bg-destructive/20" :
                        "bg-primary/20"
                      )}>
                        {ir.analyzing ? (
                          <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                        ) : ir.error ? (
                          <Music4 className="w-4 h-4 text-destructive" />
                        ) : (
                          <Music4 className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ir.file.name}</p>
                        {ir.metrics && (
                          <p className="text-xs text-muted-foreground">
                            {ir.metrics.durationMs.toFixed(1)}ms | Centroid: {ir.metrics.spectralCentroid.toFixed(0)}Hz
                          </p>
                        )}
                        {ir.error && (
                          <p className="text-xs text-destructive">{ir.error}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeIR(index)}
                      className="p-1 hover:bg-white/5 rounded transition-colors"
                      data-testid={`button-remove-ir-${index}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={validCount < 2 || analyzingCount > 0 || isPending}
              className={cn(
                "w-full py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2",
                validCount >= 2 && analyzingCount === 0 && !isPending
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_-5px_rgba(34,197,94,0.5)]"
                  : "bg-white/5 text-muted-foreground cursor-not-allowed"
              )}
              data-testid="button-analyze-pairings"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing Pairings...
                </>
              ) : analyzingCount > 0 ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing {analyzingCount} file(s)...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Find Best Pairings ({validCount} IRs)
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
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Zap className="w-6 h-6 text-primary" />
                  Best Pairings
                </h2>
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
