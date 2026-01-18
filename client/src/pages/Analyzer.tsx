import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { UploadCloud, Music4, Mic2, AlertCircle, PlayCircle, Loader2, Activity, Layers, Trash2, Copy, Check, CheckCircle, XCircle, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useCreateAnalysis, analyzeAudioFile, type AudioMetrics } from "@/hooks/use-analyses";
import { FrequencyGraph } from "@/components/FrequencyGraph";
import { ResultCard } from "@/components/ResultCard";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { api, type BatchAnalysisResponse, type BatchIRInput } from "@shared/routes";

// Validation schema for the form
const formSchema = z.object({
  micType: z.string().min(1, "Microphone is required"),
  micPosition: z.enum(["cap", "cap-edge", "cap-edge-favor-cap", "cap-edge-favor-cone", "cone", "cap-off-center"]),
  speakerModel: z.string().min(1, "Speaker model is required"),
  distance: z.string().min(1, "Distance is required (e.g. '1 inch')"),
});

type FormData = z.infer<typeof formSchema>;

// Filename parsing to auto-populate fields
// Supports formats like: SM57_cap-edge_v30-china_1in.wav, 57_cap_greenback_0.5.wav, etc.
const MIC_PATTERNS: Record<string, string> = {
  "sm57": "57", "57": "57",
  "r121": "121", "r-121": "121", "121": "121",
  "r92": "r92", "aear92": "r92", "aea-r92": "r92",
  "m160": "160", "160": "160",
  "md421": "421", "421": "421",
  "421kompakt": "421-kompakt", "421-kompakt": "421-kompakt", "kompakt": "421-kompakt",
  "md441boost": "441-boost", "441-boost": "441-boost", "441boost": "441-boost", "md441-boost": "441-boost", "441presence": "441-boost",
  "md441flat": "441-flat", "441-flat": "441-flat", "441flat": "441-flat", "md441-flat": "441-flat", "md441": "441-flat", "441": "441-flat",
  "r10": "r10",
  "m88": "m88", "88": "m88",
  "pr30": "pr30", "30": "pr30",
  "e906boost": "e906-boost", "e906-boost": "e906-boost", "906boost": "e906-boost",
  "e906presence": "e906-boost", "e906-presence": "e906-boost", "906presence": "e906-boost",
  "e906flat": "e906-flat", "e906-flat": "e906-flat", "906flat": "e906-flat", "e906": "e906-flat",
  "m201": "m201", "201": "m201",
  "sm7b": "sm7b", "sm7": "sm7b", "7b": "sm7b",
  "c414": "c414", "akgc414": "c414", "akg-c414": "c414", "414": "c414",
  "roswellcab": "roswell-cab", "roswell-cab": "roswell-cab", "roswell": "roswell-cab",
};

const POSITION_PATTERNS: Record<string, string> = {
  "cap-edge-favor-cap": "cap-edge-favor-cap", "capedgefavorcap": "cap-edge-favor-cap",
  "cap-edge-favor-cone": "cap-edge-favor-cone", "capedgefavorcone": "cap-edge-favor-cone",
  "cap-edge": "cap-edge", "capedge": "cap-edge", "edge": "cap-edge",
  "cap-off-center": "cap-off-center", "capoffcenter": "cap-off-center", "offcenter": "cap-off-center",
  "cap": "cap", "center": "cap",
  "cone": "cone",
};

const SPEAKER_PATTERNS: Record<string, string> = {
  "g12m25": "g12m25", "greenback": "g12m25", "gb": "g12m25", "g12m": "g12m25",
  "v30china": "v30-china", "v30-china": "v30-china", "v30c": "v30-china",
  "v30blackcat": "v30-blackcat", "v30-blackcat": "v30-blackcat", "blackcat": "v30-blackcat", "v30bc": "v30-blackcat",
  "v30": "v30-china",
  "k100": "k100", "g12k100": "k100", "g12k-100": "k100",
  "g12t75": "g12t75", "t75": "g12t75", "g12t-75": "g12t75",
  "g12-65": "g12-65", "g1265": "g12-65", "65": "g12-65",
  "g12h30": "g12h30-anniversary", "g12h30-anniversary": "g12h30-anniversary", "anniversary": "g12h30-anniversary", "h30": "g12h30-anniversary",
  "cream": "celestion-cream", "celestion-cream": "celestion-cream", "celestioncream": "celestion-cream",
  "ga12sc64": "ga12-sc64", "ga12-sc64": "ga12-sc64", "sc64": "ga12-sc64",
  "g10sc64": "g10-sc64", "g10-sc64": "g10-sc64", "g10": "g10-sc64",
};

function parseFilename(filename: string): Partial<FormData> {
  const result: Partial<FormData> = {};
  const name = filename.toLowerCase().replace('.wav', '');
  const parts = name.split(/[_\-\s]+/);
  const fullName = parts.join('');
  
  // Try to find mic type
  for (const [pattern, value] of Object.entries(MIC_PATTERNS)) {
    if (parts.includes(pattern) || fullName.includes(pattern)) {
      result.micType = value;
      break;
    }
  }
  
  // Try to find position (check longer patterns first)
  const sortedPositions = Object.entries(POSITION_PATTERNS).sort((a, b) => b[0].length - a[0].length);
  for (const [pattern, value] of sortedPositions) {
    if (parts.includes(pattern) || fullName.includes(pattern)) {
      result.micPosition = value as FormData["micPosition"];
      break;
    }
  }
  
  // Try to find speaker
  const sortedSpeakers = Object.entries(SPEAKER_PATTERNS).sort((a, b) => b[0].length - a[0].length);
  for (const [pattern, value] of sortedSpeakers) {
    if (parts.includes(pattern) || fullName.includes(pattern)) {
      result.speakerModel = value;
      break;
    }
  }
  
  // Try to find distance - prioritize patterns with "in" or "inch" suffix
  const validDistances = ["0", "0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6"];
  
  // First, look for explicit "in" or "inch" patterns (e.g., "1in", "2.5inch", "0.5in")
  const inchMatch = name.match(/(\d+(?:\.\d+)?)\s*(?:in|inch|")/);
  if (inchMatch && validDistances.includes(inchMatch[1])) {
    result.distance = inchMatch[1];
  } else {
    // Fallback: look for standalone numbers that are valid distances
    // Check each part separately to avoid matching numbers in speaker names like "v30"
    for (const part of parts) {
      if (validDistances.includes(part)) {
        result.distance = part;
        break;
      }
    }
  }
  
  return result;
}

interface BatchIR {
  file: File;
  metrics: AudioMetrics | null;
  analyzing: boolean;
  error: string | null;
}

export default function Analyzer() {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  
  // Single mode state
  const [file, setFile] = useState<File | null>(null);
  const [metrics, setMetrics] = useState<AudioMetrics | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  // Batch mode state
  const [batchIRs, setBatchIRs] = useState<BatchIR[]>([]);
  const [batchResult, setBatchResult] = useState<BatchAnalysisResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      distance: "1",
      speakerModel: "v30-china"
    }
  });

  const { mutateAsync: createAnalysis, isPending: isSubmitting } = useCreateAnalysis();
  const { toast } = useToast();

  // Batch analysis mutation
  const { mutate: analyzeBatch, isPending: isBatchAnalyzing } = useMutation({
    mutationFn: async (irs: BatchIRInput[]) => {
      const validated = api.batchAnalysis.analyze.input.parse({ irs });
      const res = await fetch(api.batchAnalysis.analyze.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to analyze batch");
      return api.batchAnalysis.analyze.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      setBatchResult(data);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to analyze IR batch", variant: "destructive" });
    },
  });

  // Batch file drop handler
  const onBatchDrop = useCallback(async (acceptedFiles: File[]) => {
    const wavFiles = acceptedFiles.filter(f => f.name.toLowerCase().endsWith('.wav'));
    
    if (wavFiles.length === 0) {
      toast({ title: "Invalid files", description: "Please upload .wav files only", variant: "destructive" });
      return;
    }

    const newIRs: BatchIR[] = wavFiles.map(file => ({
      file,
      metrics: null,
      analyzing: true,
      error: null,
    }));

    setBatchIRs(newIRs);
    setBatchResult(null);

    for (let i = 0; i < wavFiles.length; i++) {
      const file = wavFiles[i];
      try {
        const audioMetrics = await analyzeAudioFile(file);
        setBatchIRs(prev => prev.map(ir => 
          ir.file.name === file.name && ir.file.size === file.size
            ? { ...ir, metrics: audioMetrics, analyzing: false }
            : ir
        ));
      } catch (err) {
        setBatchIRs(prev => prev.map(ir => 
          ir.file.name === file.name && ir.file.size === file.size
            ? { ...ir, analyzing: false, error: "Failed to analyze" }
            : ir
        ));
      }
    }
  }, [toast]);

  const handleBatchAnalyze = () => {
    const validIRs = batchIRs.filter(ir => ir.metrics && !ir.error);
    if (validIRs.length === 0) {
      toast({ title: "No valid IRs", description: "Upload at least 1 valid IR file", variant: "destructive" });
      return;
    }

    const irInputs: BatchIRInput[] = validIRs.map(ir => ({
      filename: ir.file.name,
      duration: ir.metrics!.durationMs,
      peakLevel: ir.metrics!.peakAmplitudeDb,
      spectralCentroid: ir.metrics!.spectralCentroid,
      lowEnergy: ir.metrics!.lowEnergy,
      midEnergy: ir.metrics!.midEnergy,
      highEnergy: ir.metrics!.highEnergy,
    }));

    analyzeBatch(irInputs);
  };

  const clearBatch = () => {
    setBatchIRs([]);
    setBatchResult(null);
  };

  const copyBatchResults = () => {
    if (!batchResult) return;
    
    let text = "IR Batch Analysis Results\n";
    text += "=".repeat(40) + "\n\n";
    text += `Average Score: ${batchResult.averageScore}/100\n`;
    text += `Summary: ${batchResult.summary}\n\n`;
    
    batchResult.results.forEach((r, i) => {
      text += `${i + 1}. ${r.filename}\n`;
      text += `   Score: ${r.score}/100 ${r.isPerfect ? "(Perfect)" : ""}\n`;
      if (r.parsedInfo) {
        const info = [];
        if (r.parsedInfo.mic) info.push(`Mic: ${r.parsedInfo.mic}`);
        if (r.parsedInfo.position) info.push(`Pos: ${r.parsedInfo.position}`);
        if (r.parsedInfo.speaker) info.push(`Spk: ${r.parsedInfo.speaker}`);
        if (r.parsedInfo.distance) info.push(`Dist: ${r.parsedInfo.distance}`);
        if (info.length) text += `   Detected: ${info.join(", ")}\n`;
      }
      text += `   Advice: ${r.advice}\n`;
      if (r.highlights?.length) text += `   Highlights: ${r.highlights.join(", ")}\n`;
      if (r.issues?.length) text += `   Issues: ${r.issues.join(", ")}\n`;
      if (r.renameSuggestion) {
        text += `   Tonal Character: ${r.renameSuggestion.suggestedModifier}\n`;
        text += `   Suggested Name: ${r.renameSuggestion.suggestedFilename}\n`;
        text += `   Reason: ${r.renameSuggestion.reason}\n`;
      }
      text += "\n";
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied to clipboard", description: "Batch analysis results copied." });
    setTimeout(() => setCopied(false), 2000);
  };

  const batchDropzone = useDropzone({
    onDrop: onBatchDrop,
    accept: { "audio/wav": [".wav"] },
    multiple: true,
  });

  const validBatchCount = batchIRs.filter(ir => ir.metrics && !ir.error).length;
  const analyzingBatchCount = batchIRs.filter(ir => ir.analyzing).length;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selected = acceptedFiles[0];
    if (!selected) return;
    
    // Only accept wav
    if (!selected.name.endsWith('.wav')) {
      toast({ title: "Invalid file", description: "Please upload a .wav file", variant: "destructive" });
      return;
    }

    setFile(selected);
    setAnalyzing(true);
    setResult(null); // Clear previous result
    
    // Parse filename and auto-populate fields
    const parsed = parseFilename(selected.name);
    let fieldsPopulated = 0;
    if (parsed.micType) {
      setValue("micType", parsed.micType);
      fieldsPopulated++;
    }
    if (parsed.micPosition) {
      setValue("micPosition", parsed.micPosition);
      fieldsPopulated++;
    }
    if (parsed.speakerModel) {
      setValue("speakerModel", parsed.speakerModel);
      fieldsPopulated++;
    }
    if (parsed.distance) {
      setValue("distance", parsed.distance);
      fieldsPopulated++;
    }
    
    if (fieldsPopulated > 0) {
      toast({ 
        title: "Fields auto-populated", 
        description: `Detected ${fieldsPopulated} field(s) from filename` 
      });
    }
    
    try {
      const audioMetrics = await analyzeAudioFile(selected);
      setMetrics(audioMetrics);
    } catch (err) {
      toast({ title: "Error", description: "Failed to process audio file", variant: "destructive" });
      setFile(null);
    } finally {
      setAnalyzing(false);
    }
  }, [toast, setValue]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/wav': ['.wav'] },
    maxFiles: 1,
  });

  const onSubmit = async (data: FormData) => {
    if (!file || !metrics) {
      toast({ title: "No file", description: "Please upload an IR file first", variant: "destructive" });
      return;
    }

    try {
      const response = await createAnalysis({
        filename: file.name,
        micType: data.micType,
        micPosition: data.micPosition,
        speakerModel: data.speakerModel,
        distance: data.distance,
        durationSamples: metrics.durationSamples,
        peakAmplitudeDb: metrics.peakAmplitudeDb,
        spectralCentroid: metrics.spectralCentroid,
      });
      setResult(response);
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-white to-secondary pb-2">
            Analyze Your Tone
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload your guitar cabinet impulse response to get instant feedback on mic placement, 
            phase issues, and frequency balance.
          </p>
          
          {/* Mode Toggle */}
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setMode('single')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                mode === 'single' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              )}
              data-testid="button-mode-single"
            >
              <Music4 className="w-4 h-4 inline-block mr-2" />
              Single IR
            </button>
            <button
              onClick={() => setMode('batch')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                mode === 'batch' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              )}
              data-testid="button-mode-batch"
            >
              <Layers className="w-4 h-4 inline-block mr-2" />
              Batch Analysis
            </button>
          </div>
        </div>

        {/* Batch Analysis Mode */}
        {mode === 'batch' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Batch Dropzone */}
            <div
              {...batchDropzone.getRootProps()}
              className={cn(
                "glass-panel p-8 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer",
                batchDropzone.isDragActive
                  ? "border-primary bg-primary/5 shadow-[0_0_30px_-10px_rgba(34,197,94,0.4)]"
                  : "border-white/10 hover:border-primary/50"
              )}
              data-testid="dropzone-batch"
            >
              <input {...batchDropzone.getInputProps()} data-testid="input-files-batch" />
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Layers className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium">
                    {batchDropzone.isDragActive ? "Drop your IR files here" : "Drop multiple IR files for batch analysis"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The system will automatically read and analyze each IR
                  </p>
                </div>
              </div>
            </div>

            {/* Batch IR List */}
            {batchIRs.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Music4 className="w-5 h-5 text-primary" />
                    IRs to Analyze ({validBatchCount} ready)
                  </h2>
                  <button
                    onClick={clearBatch}
                    className="text-sm text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                    data-testid="button-clear-batch"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear all
                  </button>
                </div>

                <div className="grid gap-2 max-h-64 overflow-y-auto">
                  <AnimatePresence>
                    {batchIRs.map((ir, index) => (
                      <motion.div
                        key={`${ir.file.name}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={cn(
                          "glass-panel p-3 rounded-lg flex items-center justify-between",
                          ir.error && "border-destructive/50"
                        )}
                        data-testid={`batch-ir-item-${index}`}
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
                              <XCircle className="w-4 h-4 text-destructive" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-primary" />
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
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <button
                  onClick={handleBatchAnalyze}
                  disabled={validBatchCount === 0 || analyzingBatchCount > 0 || isBatchAnalyzing}
                  className={cn(
                    "w-full py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2",
                    validBatchCount > 0 && analyzingBatchCount === 0 && !isBatchAnalyzing
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_-5px_rgba(34,197,94,0.5)]"
                      : "bg-white/5 text-muted-foreground cursor-not-allowed"
                  )}
                  data-testid="button-analyze-batch"
                >
                  {isBatchAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing {validBatchCount} IRs...
                    </>
                  ) : analyzingBatchCount > 0 ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing {analyzingBatchCount} file(s)...
                    </>
                  ) : (
                    <>
                      <Activity className="w-5 h-5" />
                      Analyze All ({validBatchCount} IRs)
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Batch Results */}
            <AnimatePresence>
              {batchResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="glass-panel p-6 rounded-2xl space-y-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Activity className="w-6 h-6 text-primary" />
                        Batch Analysis Results
                      </h2>
                      <p className="text-muted-foreground mt-1">
                        Average Score: <span className="text-primary font-bold">{batchResult.averageScore}/100</span>
                      </p>
                    </div>
                    <button
                      onClick={copyBatchResults}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
                      data-testid="button-copy-batch-results"
                    >
                      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy All"}
                    </button>
                  </div>

                  <p className="text-muted-foreground">{batchResult.summary}</p>

                  <div className="space-y-3">
                    {batchResult.results.map((r, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2"
                        data-testid={`batch-result-${index}`}
                      >
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm font-medium truncate">{r.filename}</p>
                            {r.parsedInfo && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {r.parsedInfo.mic && (
                                  <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                                    {r.parsedInfo.mic}
                                  </span>
                                )}
                                {r.parsedInfo.position && (
                                  <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                                    {r.parsedInfo.position}
                                  </span>
                                )}
                                {r.parsedInfo.speaker && (
                                  <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">
                                    {r.parsedInfo.speaker}
                                  </span>
                                )}
                                {r.parsedInfo.distance && (
                                  <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                    {r.parsedInfo.distance}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className={cn(
                            "w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg flex-shrink-0",
                            r.score >= 85 ? "bg-primary/20 text-primary" :
                            r.score >= 70 ? "bg-yellow-500/20 text-yellow-500" :
                            "bg-orange-500/20 text-orange-500"
                          )}>
                            {r.score}
                          </div>
                        </div>

                        <p className="text-sm text-foreground/80">{r.advice}</p>

                        {(r.highlights?.length || r.issues?.length) && (
                          <div className="flex flex-wrap gap-4 text-xs pt-1">
                            {r.highlights?.length ? (
                              <div className="flex items-start gap-1">
                                <CheckCircle className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">{r.highlights.join(", ")}</span>
                              </div>
                            ) : null}
                            {r.issues?.length ? (
                              <div className="flex items-start gap-1">
                                <AlertCircle className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">{r.issues.join(", ")}</span>
                              </div>
                            ) : null}
                          </div>
                        )}

                        {/* Tonal Modifier Suggestion */}
                        {r.renameSuggestion && (
                          <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <div className="flex items-start gap-2">
                              <Pencil className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-amber-400">Tonal character: {r.renameSuggestion.suggestedModifier}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{r.renameSuggestion.reason}</p>
                                <p className="text-xs font-mono text-amber-300/80 mt-1 truncate">
                                  Suggested name: {r.renameSuggestion.suggestedFilename}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Single IR Mode */}
        {mode === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input & Controls */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Upload Zone */}
            <div
              {...getRootProps()}
              className={cn(
                "relative group cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 min-h-[200px] flex flex-col items-center justify-center p-8 text-center bg-card/30",
                isDragActive 
                  ? "border-primary bg-primary/5 scale-[1.02]" 
                  : file 
                    ? "border-primary/50 bg-card/60" 
                    : "border-white/10 hover:border-white/20 hover:bg-white/5"
              )}
            >
              <input {...getInputProps()} />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {file ? (
                <div className="z-10 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 border border-primary/20">
                    <Music4 className="w-8 h-8 text-primary" />
                  </div>
                  <p className="font-mono text-sm font-medium truncate max-w-[200px] mx-auto text-primary">
                    {file.name}
                  </p>
                  <span className="text-xs text-muted-foreground block">
                    {(file.size / 1024).toFixed(1)} KB • Click to change
                  </span>
                </div>
              ) : (
                <div className="z-10 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/5 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="font-medium text-lg">Drop your IR here</p>
                    <p className="text-sm text-muted-foreground mt-1">Accepts .wav files only</p>
                  </div>
                </div>
              )}
            </div>

            {/* Metadata Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="glass-panel p-6 rounded-2xl space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Microphone</label>
                    <select
                      {...register("micType")}
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    >
                      <option value="57">SM57</option>
                      <option value="121">R121</option>
                      <option value="r92">R92</option>
                      <option value="160">M160</option>
                      <option value="421">MD421</option>
                      <option value="421-kompakt">MD421 Kompakt</option>
                      <option value="441-boost">MD441 (Presence Boost)</option>
                      <option value="441-flat">MD441 (Flat)</option>
                      <option value="r10">R10</option>
                      <option value="m88">M88</option>
                      <option value="pr30">PR30</option>
                      <option value="e906-boost">e906 (Presence Boost)</option>
                      <option value="e906-flat">e906 (Flat)</option>
                      <option value="m201">M201</option>
                      <option value="sm7b">SM7B</option>
                      <option value="c414">C414</option>
                      <option value="roswell-cab">Roswell Cab Mic</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Position</label>
                    <select
                      {...register("micPosition")}
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    >
                      <option value="cap">Cap</option>
                      <option value="cap-edge">Cap Edge</option>
                      <option value="cap-edge-favor-cap">Cap Edge (Favor Cap)</option>
                      <option value="cap-edge-favor-cone">Cap Edge (Favor Cone)</option>
                      <option value="cone">Cone</option>
                      <option value="cap-off-center">Cap Off Center</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Speaker</label>
                  <select
                    {...register("speakerModel")}
                    data-testid="select-speaker"
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  >
                    <option value="g12m25">G12M (Greenback)</option>
                    <option value="v30-china">V30</option>
                    <option value="v30-blackcat">V30BC (Black Cat)</option>
                    <option value="k100">K100</option>
                    <option value="g12t75">G12T75</option>
                    <option value="g12-65">G12-65 Heritage</option>
                    <option value="g12h30-anniversary">G12H Anniversary</option>
                    <option value="celestion-cream">Cream</option>
                    <option value="ga12-sc64">GA12-SC64</option>
                    <option value="g10-sc64">GA10-SC64</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Distance</label>
                  <div className="relative">
                    <select
                      {...register("distance")}
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    >
                      <option value="0">0"</option>
                      <option value="0.5">0.5"</option>
                      <option value="1">1"</option>
                      <option value="1.5">1.5"</option>
                      <option value="2">2"</option>
                      <option value="2.5">2.5"</option>
                      <option value="3">3"</option>
                      <option value="3.5">3.5"</option>
                      <option value="4">4"</option>
                      <option value="4.5">4.5"</option>
                      <option value="5">5"</option>
                      <option value="5.5">5.5"</option>
                      <option value="6">6"</option>
                    </select>
                    <Mic2 className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                  </div>
                  {errors.distance && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.distance.message}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={!file || isSubmitting || analyzing}
                className={cn(
                  "w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 shadow-lg",
                  !file || isSubmitting
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/25 hover:-translate-y-0.5"
                )}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                  </span>
                ) : (
                  "Analyze IR"
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Visualization & Results */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Graph Card */}
            <div className="glass-panel rounded-2xl p-6 min-h-[300px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-mono font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
                  <Activity className="w-4 h-4 text-primary" /> Frequency Response
                </h3>
                {metrics && (
                  <span className="text-xs font-mono text-muted-foreground">
                    {metrics.durationSamples} samples / {metrics.peakAmplitudeDb}dB
                  </span>
                )}
              </div>
              
              <div className="flex-1 relative bg-black/20 rounded-xl overflow-hidden border border-white/5">
                {analyzing ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                ) : metrics ? (
                  <FrequencyGraph 
                    data={metrics.frequencyData} 
                    height={300} 
                    className="w-full h-full"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 font-mono text-sm">
                    AWAITING SIGNAL
                  </div>
                )}
              </div>
            </div>

            {/* Results Area */}
            <AnimatePresence>
              {result && metrics && (
                <ResultCard
                  score={result.qualityScore}
                  isPerfect={result.isPerfect}
                  advice={result.advice}
                  metrics={{
                    peak: metrics.peakAmplitudeDb,
                    duration: metrics.durationMs,
                    centroid: metrics.spectralCentroid
                  }}
                  renameSuggestion={result.renameSuggestion}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
