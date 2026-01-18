import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UploadCloud, Music4, Mic2, AlertCircle, PlayCircle, Loader2, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useCreateAnalysis, analyzeAudioFile, type AudioMetrics } from "@/hooks/use-analyses";
import { FrequencyGraph } from "@/components/FrequencyGraph";
import { ResultCard } from "@/components/ResultCard";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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

export default function Analyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [metrics, setMetrics] = useState<AudioMetrics | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      distance: "1",
      speakerModel: "v30-china"
    }
  });

  const { mutateAsync: createAnalysis, isPending: isSubmitting } = useCreateAnalysis();
  const { toast } = useToast();

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
        </div>

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
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
