import { createContext, useContext, useState, ReactNode } from "react";
import type { RecommendationsResponse, SpeakerRecommendationsResponse, AmpRecommendationsResponse, PositionImportResponse, PairingResponse, BatchAnalysisResponse } from "@shared/routes";

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

  const clearAllResults = () => {
    setRecommendationsResult(null);
    setSpeakerResult(null);
    setAmpResult(null);
    setImportResult(null);
    setPairingResult(null);
    setBatchAnalysisResult(null);
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
