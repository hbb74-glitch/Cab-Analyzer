import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Loader2, Cherry, FileAudio, Trash2, Brain, Target, Sparkles, ThumbsUp, ThumbsDown, HelpCircle, Check, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { analyzeAudioFile, type AudioMetrics } from "@/hooks/use-analyses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UploadedIR {
  file: File;
  metrics: AudioMetrics | null;
  analyzing: boolean;
  error: string | null;
}

interface MetricRange {
  min: number;
  max: number;
  avg: number;
  stdDev: number;  // Standard deviation for variance-aware matching
}

interface PreferenceProfile {
  centroid: MetricRange;
  smoothness: MetricRange;
  lowEnergy: MetricRange;
  midEnergy: MetricRange;
  highEnergy: MetricRange;
  sampleCount: number;
}

const STORAGE_KEY = 'cherryPicker_preferenceProfile';

interface ExaminedIR {
  filename: string;
  metrics: AudioMetrics;
  matchScore: number;
  matchLevel: 'excellent' | 'good' | 'fair' | 'poor';
  matchDetails: {
    centroidMatch: number;
    smoothnessMatch: number;
    energyMatch: number;
  };
}

// Helper to calculate standard deviation
function calculateStdDev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.sqrt(variance);
}

// Helper to build a metric range with stdDev
function buildMetricRange(values: number[]): MetricRange {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const stdDev = calculateStdDev(values, avg);
  return { min, max, avg, stdDev };
}

export default function CherryPicker() {
  const [trainingIRs, setTrainingIRs] = useState<UploadedIR[]>([]);
  const [examineIRs, setExamineIRs] = useState<UploadedIR[]>([]);
  const [preferenceProfile, setPreferenceProfile] = useState<PreferenceProfile | null>(null);
  const [examinedResults, setExaminedResults] = useState<ExaminedIR[]>([]);
  const [isLearning, setIsLearning] = useState(false);
  const [isExamining, setIsExamining] = useState(false);
  const { toast } = useToast();

  // Load saved profile from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        setPreferenceProfile(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Save profile to sessionStorage when it changes
  useEffect(() => {
    if (preferenceProfile) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(preferenceProfile));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [preferenceProfile]);

  const processFiles = async (
    files: File[], 
    setIRs: React.Dispatch<React.SetStateAction<UploadedIR[]>>,
    append: boolean = false
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

    if (append) {
      setIRs(prev => [...prev, ...newIRs]);
    } else {
      setIRs(newIRs);
    }

    for (let i = 0; i < wavFiles.length; i++) {
      const file = wavFiles[i];
      try {
        const metrics = await analyzeAudioFile(file);
        setIRs(prev => prev.map(ir => 
          ir.file.name === file.name ? { ...ir, metrics, analyzing: false } : ir
        ));
      } catch (error) {
        setIRs(prev => prev.map(ir => 
          ir.file.name === file.name ? { ...ir, analyzing: false, error: "Analysis failed" } : ir
        ));
      }
    }
  };

  const onDropTraining = useCallback((acceptedFiles: File[]) => {
    processFiles(acceptedFiles, setTrainingIRs, true);
    setPreferenceProfile(null);
    setExaminedResults([]);
  }, []);

  const onDropExamine = useCallback((acceptedFiles: File[]) => {
    processFiles(acceptedFiles, setExamineIRs, true);
    setExaminedResults([]);
  }, []);

  const { getRootProps: getTrainingRootProps, getInputProps: getTrainingInputProps, isDragActive: isTrainingDragActive } = useDropzone({
    onDrop: onDropTraining,
    accept: { 'audio/wav': ['.wav'] },
    multiple: true,
  });

  const { getRootProps: getExamineRootProps, getInputProps: getExamineInputProps, isDragActive: isExamineDragActive } = useDropzone({
    onDrop: onDropExamine,
    accept: { 'audio/wav': ['.wav'] },
    multiple: true,
    disabled: !preferenceProfile,  // Disable dropzone when no profile learned
  });

  const learnPreferences = () => {
    const validIRs = trainingIRs.filter(ir => ir.metrics && !ir.error);
    if (validIRs.length < 2) {
      toast({ title: "Need more samples", description: "Upload at least 2 IRs to learn preferences", variant: "destructive" });
      return;
    }

    setIsLearning(true);

    const metrics = validIRs.map(ir => ir.metrics!);
    
    // Build profile with variance-aware ranges using standard deviation
    const profile: PreferenceProfile = {
      centroid: buildMetricRange(metrics.map(m => m.spectralCentroid)),
      smoothness: buildMetricRange(metrics.map(m => m.frequencySmoothness || 0)),
      lowEnergy: buildMetricRange(metrics.map(m => m.lowEnergy)),
      midEnergy: buildMetricRange(metrics.map(m => m.midEnergy)),
      highEnergy: buildMetricRange(metrics.map(m => m.highEnergy)),
      sampleCount: validIRs.length,
    };

    setTimeout(() => {
      setPreferenceProfile(profile);
      setIsLearning(false);
      toast({ title: "Preferences learned", description: `Analyzed ${validIRs.length} IRs to build your preference profile` });
    }, 500);
  };

  const examineIRsAgainstProfile = () => {
    if (!preferenceProfile) {
      toast({ title: "Learn first", description: "Train your preferences before examining IRs", variant: "destructive" });
      return;
    }

    const validIRs = examineIRs.filter(ir => ir.metrics && !ir.error);
    if (validIRs.length === 0) {
      toast({ title: "No IRs to examine", description: "Upload IRs to examine", variant: "destructive" });
      return;
    }

    setIsExamining(true);

    const results: ExaminedIR[] = validIRs.map(ir => {
      const m = ir.metrics!;
      const p = preferenceProfile;

      // Use variance-aware matching with stdDev
      const centroidMatch = calculateMatchWithVariance(m.spectralCentroid, p.centroid);
      const smoothnessMatch = calculateMatchWithVariance(m.frequencySmoothness || 0, p.smoothness);
      
      const lowMatch = calculateMatchWithVariance(m.lowEnergy, p.lowEnergy);
      const midMatch = calculateMatchWithVariance(m.midEnergy, p.midEnergy);
      const highMatch = calculateMatchWithVariance(m.highEnergy, p.highEnergy);
      const energyMatch = (lowMatch + midMatch + highMatch) / 3;

      const matchScore = Math.round(centroidMatch * 0.4 + smoothnessMatch * 0.3 + energyMatch * 0.3);

      let matchLevel: 'excellent' | 'good' | 'fair' | 'poor';
      if (matchScore >= 85) matchLevel = 'excellent';
      else if (matchScore >= 70) matchLevel = 'good';
      else if (matchScore >= 50) matchLevel = 'fair';
      else matchLevel = 'poor';

      return {
        filename: ir.file.name,
        metrics: m,
        matchScore,
        matchLevel,
        matchDetails: {
          centroidMatch: Math.round(centroidMatch),
          smoothnessMatch: Math.round(smoothnessMatch),
          energyMatch: Math.round(energyMatch),
        },
      };
    });

    results.sort((a, b) => b.matchScore - a.matchScore);

    setTimeout(() => {
      setExaminedResults(results);
      setIsExamining(false);
      toast({ title: "Examination complete", description: `Compared ${results.length} IRs against your preferences` });
    }, 500);
  };

  // Variance-aware matching: uses stdDev to determine acceptable deviation
  // Values within range get 100%, values outside are penalized based on stdDev distance
  const calculateMatchWithVariance = (value: number, range: MetricRange): number => {
    const { min, max, avg, stdDev } = range;
    
    // If value is within the learned range, it's a perfect match
    if (value >= min && value <= max) {
      return 100;
    }
    
    // Calculate how many stdDevs away from the nearest boundary
    const distance = value < min ? min - value : value - max;
    
    // Use stdDev as the tolerance (minimum 1 to avoid division issues)
    // If stdDev is small (tight cluster), use range width as fallback tolerance
    const rangeWidth = max - min;
    const effectiveTolerance = Math.max(stdDev, rangeWidth * 0.25, 1);
    
    // Score drops based on distance in stdDev units
    // 1 stdDev away = 75%, 2 stdDevs = 50%, 3+ stdDevs = 25% or less
    const stdDevsAway = distance / effectiveTolerance;
    const score = Math.max(0, 100 - (stdDevsAway * 25));
    
    return score;
  };

  const clearAll = () => {
    setTrainingIRs([]);
    setExamineIRs([]);
    setPreferenceProfile(null);
    setExaminedResults([]);
  };

  const trainingReady = trainingIRs.filter(ir => ir.metrics && !ir.error).length;
  const trainingAnalyzing = trainingIRs.filter(ir => ir.analyzing).length;
  const examineReady = examineIRs.filter(ir => ir.metrics && !ir.error).length;
  const examineAnalyzing = examineIRs.filter(ir => ir.analyzing).length;

  const getMatchIcon = (level: string) => {
    switch (level) {
      case 'excellent': return <ThumbsUp className="w-4 h-4 text-green-400" />;
      case 'good': return <ThumbsUp className="w-4 h-4 text-blue-400" />;
      case 'fair': return <HelpCircle className="w-4 h-4 text-yellow-400" />;
      case 'poor': return <ThumbsDown className="w-4 h-4 text-red-400" />;
      default: return null;
    }
  };

  const getMatchColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'good': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'fair': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'poor': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Cherry className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Cherry Picker</h1>
          </div>
          <p className="text-muted-foreground">
            Train on your favorite IRs, then find matching gems in professional collections
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">1. Train</CardTitle>
                </div>
                {trainingIRs.length > 0 && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => { setTrainingIRs([]); setPreferenceProfile(null); setExaminedResults([]); }}
                    data-testid="button-clear-training"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <CardDescription>Upload IRs you love to teach your preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getTrainingRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all",
                  isTrainingDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
                )}
                data-testid="dropzone-training"
              >
                <input {...getTrainingInputProps()} />
                <FileAudio className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {isTrainingDragActive ? "Drop your favorites here..." : "Drop your favorite IRs here"}
                </p>
              </div>

              {trainingIRs.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {trainingReady} IR{trainingReady !== 1 ? 's' : ''} loaded
                      {trainingAnalyzing > 0 && ` (${trainingAnalyzing} analyzing...)`}
                    </span>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {trainingIRs.slice(0, 5).map((ir, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        {ir.analyzing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : ir.error ? (
                          <span className="text-red-400">✗</span>
                        ) : (
                          <Check className="w-3 h-3 text-green-400" />
                        )}
                        <span className="truncate">{ir.file.name}</span>
                      </div>
                    ))}
                    {trainingIRs.length > 5 && (
                      <div className="text-xs text-muted-foreground">
                        +{trainingIRs.length - 5} more...
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button
                className="w-full mt-4"
                onClick={learnPreferences}
                disabled={trainingReady < 2 || trainingAnalyzing > 0 || isLearning}
                data-testid="button-learn-preferences"
              >
                {isLearning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Learning...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Learn Preferences
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className={cn("border-muted-foreground/20", preferenceProfile && "border-primary/20")}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">2. Examine</CardTitle>
                </div>
                {examineIRs.length > 0 && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => { setExamineIRs([]); setExaminedResults([]); }}
                    data-testid="button-clear-examine"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <CardDescription>Upload IRs to evaluate against your preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getExamineRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all",
                  !preferenceProfile && "opacity-50 cursor-not-allowed",
                  isExamineDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
                )}
                data-testid="dropzone-examine"
              >
                <input {...getExamineInputProps()} disabled={!preferenceProfile} />
                <FileAudio className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {!preferenceProfile 
                    ? "Train your preferences first" 
                    : isExamineDragActive 
                      ? "Drop IRs to examine..." 
                      : "Drop IRs to find matches"
                  }
                </p>
              </div>

              {examineIRs.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {examineReady} IR{examineReady !== 1 ? 's' : ''} loaded
                      {examineAnalyzing > 0 && ` (${examineAnalyzing} analyzing...)`}
                    </span>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {examineIRs.slice(0, 5).map((ir, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        {ir.analyzing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : ir.error ? (
                          <span className="text-red-400">✗</span>
                        ) : (
                          <Check className="w-3 h-3 text-green-400" />
                        )}
                        <span className="truncate">{ir.file.name}</span>
                      </div>
                    ))}
                    {examineIRs.length > 5 && (
                      <div className="text-xs text-muted-foreground">
                        +{examineIRs.length - 5} more...
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button
                className="w-full mt-4"
                onClick={examineIRsAgainstProfile}
                disabled={!preferenceProfile || examineReady === 0 || examineAnalyzing > 0 || isExamining}
                data-testid="button-examine-irs"
              >
                {isExamining ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Examining...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Find Matches
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {preferenceProfile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">Your Preference Profile</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Learned from {preferenceProfile.sampleCount} IRs
                  </Badge>
                </div>
              </CardHeader>
              <CardContent data-testid="profile-content">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div data-testid="profile-centroid">
                    <div className="text-muted-foreground text-xs mb-1">Spectral Centroid</div>
                    <div className="font-mono">{preferenceProfile.centroid.avg.toFixed(0)} Hz</div>
                    <div className="text-xs text-muted-foreground">
                      {preferenceProfile.centroid.min.toFixed(0)}-{preferenceProfile.centroid.max.toFixed(0)} (±{preferenceProfile.centroid.stdDev.toFixed(0)})
                    </div>
                  </div>
                  <div data-testid="profile-smoothness">
                    <div className="text-muted-foreground text-xs mb-1">Smoothness</div>
                    <div className="font-mono">{preferenceProfile.smoothness.avg.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">
                      {preferenceProfile.smoothness.min.toFixed(0)}-{preferenceProfile.smoothness.max.toFixed(0)} (±{preferenceProfile.smoothness.stdDev.toFixed(1)})
                    </div>
                  </div>
                  <div data-testid="profile-low-energy">
                    <div className="text-muted-foreground text-xs mb-1">Low Energy</div>
                    <div className="font-mono">{preferenceProfile.lowEnergy.avg.toFixed(1)}%</div>
                  </div>
                  <div data-testid="profile-mid-energy">
                    <div className="text-muted-foreground text-xs mb-1">Mid Energy</div>
                    <div className="font-mono">{preferenceProfile.midEnergy.avg.toFixed(1)}%</div>
                  </div>
                  <div data-testid="profile-high-energy">
                    <div className="text-muted-foreground text-xs mb-1">High Energy</div>
                    <div className="font-mono">{preferenceProfile.highEnergy.avg.toFixed(1)}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {examinedResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cherry className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">Match Results</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {examinedResults.filter(r => r.matchLevel === 'excellent' || r.matchLevel === 'good').length} matches found
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  IRs ranked by how well they match your preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {examinedResults.map((result, i) => (
                    <div 
                      key={i}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-lg border",
                        result.matchLevel === 'excellent' ? "bg-green-500/5 border-green-500/20" :
                        result.matchLevel === 'good' ? "bg-blue-500/5 border-blue-500/20" :
                        result.matchLevel === 'fair' ? "bg-yellow-500/5 border-yellow-500/20" :
                        "bg-red-500/5 border-red-500/20"
                      )}
                      data-testid={`result-ir-${i}`}
                    >
                      <div className="flex items-center gap-2 min-w-[60px]">
                        {getMatchIcon(result.matchLevel)}
                        <span className="text-lg font-bold">{result.matchScore}</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{result.filename}</div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>Centroid: {result.metrics.spectralCentroid.toFixed(0)} Hz</span>
                          <span>Smooth: {(result.metrics.frequencySmoothness || 0).toFixed(0)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-xs", getMatchColor(result.matchLevel))}>
                          {result.matchLevel}
                        </Badge>
                      </div>

                      <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex flex-col items-center">
                          <span>Tone</span>
                          <span className="font-mono">{result.matchDetails.centroidMatch}%</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span>Smooth</span>
                          <span className="font-mono">{result.matchDetails.smoothnessMatch}%</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span>EQ</span>
                          <span className="font-mono">{result.matchDetails.energyMatch}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {(trainingIRs.length > 0 || examineIRs.length > 0) && (
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={clearAll} data-testid="button-clear-all">
              <RotateCcw className="w-4 h-4 mr-2" />
              Start Over
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
