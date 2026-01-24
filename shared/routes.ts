
import { z } from 'zod';
import { insertAnalysisSchema, analysisRequestSchema, analyses } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// Recommendations schemas
export const recommendationInputSchema = z.object({
  micType: z.string().optional(), // Optional - if not provided, AI will recommend mics
  speakerModel: z.string().min(1, "Speaker model is required"),
  genre: z.string().optional(),
  preferredShots: z.string().optional(), // User's preferred distances, positions, or existing shots to consider
  targetShotCount: z.number().min(1).max(50).optional(), // Target number of shots to generate (1-50)
  basicPositionsOnly: z.boolean().optional(), // Limit to basic positions: Cap, CapEdge, CapEdge_Cone_Tr, Cone
  singleDistancePerMic: z.boolean().optional(), // 1D: Use one optimal distance per mic type (dynamics)
  singlePositionForRibbons: z.boolean().optional(), // 1P: Use one position per mic type (ribbons/condensers)
  micShotCounts: z.string().optional(), // User's mic recipe e.g. "SM57 x 3, MD421K x 2"
});

export const distanceRecommendationSchema = z.object({
  distance: z.string(),
  rationale: z.string(),
  expectedTone: z.string(),
  bestFor: z.string(),
});

export const shotRecommendationSchema = z.object({
  position: z.string(),
  distance: z.string(),
  rationale: z.string(),
  expectedTone: z.string(),
  bestFor: z.string(),
});

export const positionRecommendationSchema = z.object({
  position: z.string(),
  reason: z.string(),
});

export const recommendationsResponseSchema = z.object({
  mic: z.string(),
  micLabel: z.string().optional(),
  micDescription: z.string(),
  speaker: z.string(),
  speakerDescription: z.string(),
  genre: z.string().optional(),
  shots: z.array(shotRecommendationSchema).optional(),
  recommendations: z.array(distanceRecommendationSchema).optional(),
  bestPositions: z.array(positionRecommendationSchema).optional(),
  selectionRationale: z.string().optional(), // Brief explanation of why these specific shots were chosen (for ≤5 shots)
});

// Speaker-only recommendations - recommends mics with positions and distances
export const micRecommendationSchema = z.object({
  mic: z.string(),
  micLabel: z.string(),
  position: z.string(),
  distance: z.string(),
  rationale: z.string(),
  expectedTone: z.string(),
  bestFor: z.string(),
});

export const speakerRecommendationsResponseSchema = z.object({
  speaker: z.string(),
  speakerDescription: z.string(),
  genre: z.string().optional(),
  micRecommendations: z.array(micRecommendationSchema),
  summary: z.string(),
  selectionRationale: z.string().optional(), // Brief explanation of why these specific shots were chosen (for ≤5 shots)
});

export type RecommendationInput = z.infer<typeof recommendationInputSchema>;
export type DistanceRecommendation = z.infer<typeof distanceRecommendationSchema>;
export type ShotRecommendation = z.infer<typeof shotRecommendationSchema>;
export type RecommendationsResponse = z.infer<typeof recommendationsResponseSchema>;
export type MicRecommendation = z.infer<typeof micRecommendationSchema>;
export type SpeakerRecommendationsResponse = z.infer<typeof speakerRecommendationsResponseSchema>;

// Amp-based speaker recommendations - free text amp description
export const ampInputSchema = z.object({
  ampDescription: z.string().min(1, "Please describe your amp"),
  genre: z.string().optional(),
  targetShotCount: z.number().min(1).max(20).optional(), // Target number of speaker suggestions (1-20)
  basicPositionsOnly: z.boolean().optional(), // Limit to basic positions: Cap, CapEdge, CapEdge_Cone_Tr, Cone
});

export const speakerSuggestionSchema = z.object({
  speaker: z.string(),
  speakerLabel: z.string(),
  rationale: z.string(),
  expectedTone: z.string(),
  bestFor: z.string(),
});

export const ampRecommendationsResponseSchema = z.object({
  ampSummary: z.string(),
  speakerSuggestions: z.array(speakerSuggestionSchema),
  summary: z.string(),
});

export type AmpInput = z.infer<typeof ampInputSchema>;
export type SpeakerSuggestion = z.infer<typeof speakerSuggestionSchema>;
export type AmpRecommendationsResponse = z.infer<typeof ampRecommendationsResponseSchema>;

// IR Pairing schemas
export const irMetricsSchema = z.object({
  filename: z.string(),
  duration: z.number(),
  peakLevel: z.number(),
  spectralCentroid: z.number(),
  lowEnergy: z.number(),
  midEnergy: z.number(),
  highEnergy: z.number(),
});

export const pairingInputSchema = z.object({
  irs: z.array(irMetricsSchema).min(1, "Need at least 1 IR"),
  irs2: z.array(irMetricsSchema).optional(), // Second speaker set for mixed pairing
  tonePreferences: z.string().optional(), // Free-text tone goals: edgy, bright, thick, dark, aggressive, etc.
  mixedMode: z.boolean().optional(), // True when pairing across two different speakers
});

export const pairingResultSchema = z.object({
  title: z.string(),
  ir1: z.string(),
  ir2: z.string(),
  mixRatio: z.string(),
  score: z.number(),
  rationale: z.string(),
  expectedTone: z.string(),
  bestFor: z.string(),
});

export const pairingResponseSchema = z.object({
  pairings: z.array(pairingResultSchema),
  summary: z.string(),
});

export type IRMetrics = z.infer<typeof irMetricsSchema>;
export type PairingInput = z.infer<typeof pairingInputSchema>;
export type PairingResult = z.infer<typeof pairingResultSchema>;
export type PairingResponse = z.infer<typeof pairingResponseSchema>;

// Position Import/Refinement schemas
export const positionImportInputSchema = z.object({
  positionList: z.string().min(1, "Please paste your IR position list"),
  speaker: z.string().optional(),
  genre: z.string().optional(),
  targetShotCount: z.number().min(1).max(50).optional(), // Target number of refined shots (1-50)
  basicPositionsOnly: z.boolean().optional(), // Limit to basic positions: Cap, CapEdge, CapEdge_Cone_Tr, Cone
  singleDistancePerMic: z.boolean().optional(), // Use one optimal distance per mic type for workflow efficiency
  micShotCounts: z.string().optional(), // User's mic recipe e.g. "SM57 x 3, MD421K x 2, R121 x 2"
});

export const parsedPositionSchema = z.object({
  original: z.string(),
  speaker: z.string().optional(),
  mic: z.string().optional(),
  position: z.string().optional(),
  distance: z.string().optional(),
  variant: z.string().optional(),
  parsed: z.boolean(),
});

export const refinementSuggestionSchema = z.object({
  type: z.enum(['keep', 'modify', 'add', 'remove']),
  original: z.string().optional(),
  suggestion: z.string(),
  shorthand: z.string(),
  rationale: z.string(),
});

export const positionImportResponseSchema = z.object({
  parsedPositions: z.array(parsedPositionSchema),
  refinements: z.array(refinementSuggestionSchema),
  summary: z.string(),
});

export type PositionImportInput = z.infer<typeof positionImportInputSchema>;
export type ParsedPosition = z.infer<typeof parsedPositionSchema>;
export type RefinementSuggestion = z.infer<typeof refinementSuggestionSchema>;
export type PositionImportResponse = z.infer<typeof positionImportResponseSchema>;

// Batch IR Analysis schemas - automatic analysis without manual input
export const batchIRInputSchema = z.object({
  filename: z.string(),
  duration: z.number(),
  peakLevel: z.number(),
  spectralCentroid: z.number(),
  lowEnergy: z.number(),
  midEnergy: z.number(),
  highEnergy: z.number(),
  hasClipping: z.boolean().optional(),
  clippedSamples: z.number().optional(),
  crestFactorDb: z.number().optional(),
});

export const batchAnalysisInputSchema = z.object({
  irs: z.array(batchIRInputSchema).min(1, "At least one IR is required"),
});

export const spectralDeviationSchema = z.object({
  expectedMin: z.number(),
  expectedMax: z.number(),
  actual: z.number(),
  deviationHz: z.number(),
  deviationPercent: z.number(),
  direction: z.enum(['bright', 'dark', 'normal']),
  isWithinRange: z.boolean(),
});

export const batchIRResultSchema = z.object({
  filename: z.string(),
  parsedInfo: z.object({
    mic: z.string().optional().nullable(),
    position: z.string().optional().nullable(),
    speaker: z.string().optional().nullable(),
    distance: z.string().optional().nullable(),
  }).optional().nullable(),
  score: z.number(),
  isPerfect: z.boolean(),
  advice: z.string(),
  highlights: z.array(z.string()).optional().nullable(),
  issues: z.array(z.string()).optional().nullable(),
  renameSuggestion: z.object({
    suggestedModifier: z.string(),
    suggestedFilename: z.string(),
    reason: z.string(),
  }).optional().nullable(),
  spectralDeviation: spectralDeviationSchema.optional().nullable(),
});

export const gapSuggestionSchema = z.object({
  missingTone: z.string(),
  recommendation: z.object({
    mic: z.string(),
    position: z.string(),
    distance: z.string(),
    speaker: z.string(),
  }),
  reason: z.string(),
});

export const batchAnalysisResponseSchema = z.object({
  results: z.array(batchIRResultSchema),
  summary: z.string(),
  averageScore: z.number(),
  gapsSuggestions: z.array(gapSuggestionSchema).optional().nullable(),
});

export type GapSuggestion = z.infer<typeof gapSuggestionSchema>;

export type BatchIRInput = z.infer<typeof batchIRInputSchema>;
export type BatchAnalysisInput = z.infer<typeof batchAnalysisInputSchema>;
export type BatchIRResult = z.infer<typeof batchIRResultSchema>;
export type BatchAnalysisResponse = z.infer<typeof batchAnalysisResponseSchema>;

export const api = {
  analyses: {
    create: {
      method: 'POST' as const,
      path: '/api/analyze',
      input: analysisRequestSchema, 
      responses: {
        201: z.custom<typeof analyses.$inferSelect>(), 
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/history',
      responses: {
        200: z.array(z.custom<typeof analyses.$inferSelect>()),
      },
    },
  },
  recommendations: {
    get: {
      method: 'POST' as const,
      path: '/api/recommendations',
      input: recommendationInputSchema,
      responses: {
        200: recommendationsResponseSchema,
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
    bySpeaker: {
      method: 'POST' as const,
      path: '/api/recommendations/by-speaker',
      input: z.object({
        speakerModel: z.string().min(1, "Speaker model is required"),
        genre: z.string().optional(),
        preferredShots: z.string().optional(),
        targetShotCount: z.number().min(1).max(50).optional(),
        basicPositionsOnly: z.boolean().optional(),
        singleDistancePerMic: z.boolean().optional(),
        singlePositionForRibbons: z.boolean().optional(),
        micShotCounts: z.string().optional(),
      }),
      responses: {
        200: speakerRecommendationsResponseSchema,
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
    byAmp: {
      method: 'POST' as const,
      path: '/api/recommendations/by-amp',
      input: ampInputSchema,
      responses: {
        200: ampRecommendationsResponseSchema,
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
  },
  pairing: {
    analyze: {
      method: 'POST' as const,
      path: '/api/pairing',
      input: pairingInputSchema,
      responses: {
        200: pairingResponseSchema,
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
  },
  positionImport: {
    refine: {
      method: 'POST' as const,
      path: '/api/positions/refine',
      input: positionImportInputSchema,
      responses: {
        200: positionImportResponseSchema,
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
  },
  batchAnalysis: {
    analyze: {
      method: 'POST' as const,
      path: '/api/analyze/batch',
      input: batchAnalysisInputSchema,
      responses: {
        200: batchAnalysisResponseSchema,
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
  },
};
