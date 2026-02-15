import { createContext, useContext, useState, ReactNode } from "react";
import type { RecommendationsResponse, SpeakerRecommendationsResponse, AmpRecommendationsResponse, PositionImportResponse, PairingResponse, BatchAnalysisResponse } from "@shared/routes";
import type { Analysis } from "@shared/schema";

type RecommendationsMode = 'by-speaker' | 'by-amp' | 'import-positions' | 'shot-designer';
type AnalyzerMode = 'single' | 'batch';

interface RenameSuggestion {
  suggestedModifier: string;
  reason: string;
}

interface SpectralDeviation {
  expectedMin: number;
  expectedMax: number;
  actual: number;
  deviationHz: number;
  deviationPercent: number;
  direction: 'bright' | 'dark' | 'normal';
  isWithinRange: boolean;
}

type SingleAnalysisResult = Analysis & { 
  micLabel?: string; 
  renameSuggestion?: RenameSuggestion | null;
  filename?: string;
  spectralDeviation?: SpectralDeviation | null;
};

export interface SingleAnalysisMetrics {
  durationMs: number;
  durationSamples: number;
  peakAmplitudeDb: number;
  spectralCentroid: number;
  frequencyData: number[];
  lowEnergy: number;
  midEnergy: number;
  highEnergy: number;
  subBassEnergy: number;
  bassEnergy: number;
  lowMidEnergy: number;
  midEnergy6: number;
  highMidEnergy: number;
  presenceEnergy: number;
  ultraHighEnergy: number;
  hasClipping: boolean;
  clippedSamples: number;
  crestFactorDb: number;
  frequencySmoothness: number;
  noiseFloorDb: number;
  spectralTilt?: number;
  rolloffFreq?: number;
  smoothScore?: number;
  maxNotchDepth?: number;
  notchCount?: number;
  logBandEnergies?: number[];
  tailLevelDb?: number | null;
  tailStatus?: string;
}

interface ResultsContextType {
  recommendationsResult: RecommendationsResponse | null;
  setRecommendationsResult: (r: RecommendationsResponse | null) => void;
  speakerResult: SpeakerRecommendationsResponse | null;
  setSpeakerResult: (r: SpeakerRecommendationsResponse | null) => void;
  ampResult: AmpRecommendationsResponse | null;
  setAmpResult: (r: AmpRecommendationsResponse | null) => void;
  importResult: PositionImportResponse | null;
  setImportResult: (r: PositionImportResponse | null) => void;
  pairingResult: PairingResponse | null;
  setPairingResult: (r: PairingResponse | null) => void;
  batchAnalysisResult: BatchAnalysisResponse | null;
  setBatchAnalysisResult: (r: BatchAnalysisResponse | null) => void;
  singleAnalysisResult: SingleAnalysisResult | null;
  setSingleAnalysisResult: (r: SingleAnalysisResult | null) => void;
  singleAnalysisMetrics: SingleAnalysisMetrics | null;
  setSingleAnalysisMetrics: (m: SingleAnalysisMetrics | null) => void;
  recommendationsMode: RecommendationsMode;
  setRecommendationsMode: (m: RecommendationsMode) => void;
  analyzerMode: AnalyzerMode;
  setAnalyzerMode: (m: AnalyzerMode) => void;
  clearAllResults: () => void;
}

const ResultsContext = createContext<ResultsContextType | undefined>(undefined);

export function ResultsProvider({ children }: { children: ReactNode }) {
  const [recommendationsResult, setRecommendationsResult] = useState<RecommendationsResponse | null>(null);
  const [speakerResult, setSpeakerResult] = useState<SpeakerRecommendationsResponse | null>(null);
  const [ampResult, setAmpResult] = useState<AmpRecommendationsResponse | null>(null);
  const [importResult, setImportResult] = useState<PositionImportResponse | null>(null);
  const [pairingResult, setPairingResult] = useState<PairingResponse | null>(null);
  const [batchAnalysisResult, setBatchAnalysisResult] = useState<BatchAnalysisResponse | null>(null);
  const [singleAnalysisResult, setSingleAnalysisResult] = useState<SingleAnalysisResult | null>(null);
  const [singleAnalysisMetrics, setSingleAnalysisMetrics] = useState<SingleAnalysisMetrics | null>(null);
  const [recommendationsMode, setRecommendationsMode] = useState<RecommendationsMode>('by-speaker');
  const [analyzerMode, setAnalyzerMode] = useState<AnalyzerMode>('single');

  const clearAllResults = () => {
    setRecommendationsResult(null);
    setSpeakerResult(null);
    setAmpResult(null);
    setImportResult(null);
    setPairingResult(null);
    setBatchAnalysisResult(null);
    setSingleAnalysisResult(null);
    setSingleAnalysisMetrics(null);
  };

  return (
    <ResultsContext.Provider value={{
      recommendationsResult,
      setRecommendationsResult,
      speakerResult,
      setSpeakerResult,
      ampResult,
      setAmpResult,
      importResult,
      setImportResult,
      pairingResult,
      setPairingResult,
      batchAnalysisResult,
      setBatchAnalysisResult,
      singleAnalysisResult,
      setSingleAnalysisResult,
      singleAnalysisMetrics,
      setSingleAnalysisMetrics,
      recommendationsMode,
      setRecommendationsMode,
      analyzerMode,
      setAnalyzerMode,
      clearAllResults,
    }}>
      {children}
    </ResultsContext.Provider>
  );
}

export function useResults() {
  const context = useContext(ResultsContext);
  if (context === undefined) {
    throw new Error("useResults must be used within a ResultsProvider");
  }
  return context;
}
