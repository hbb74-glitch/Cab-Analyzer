
import { z } from 'zod';
import { insertAnalysisSchema, analyses } from './schema';

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
});

export const distanceRecommendationSchema = z.object({
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
  micDescription: z.string(),
  speaker: z.string(),
  speakerDescription: z.string(),
  genre: z.string().optional(),
  recommendations: z.array(distanceRecommendationSchema),
  bestPositions: z.array(positionRecommendationSchema).optional(),
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
});

export type RecommendationInput = z.infer<typeof recommendationInputSchema>;
export type DistanceRecommendation = z.infer<typeof distanceRecommendationSchema>;
export type RecommendationsResponse = z.infer<typeof recommendationsResponseSchema>;
export type MicRecommendation = z.infer<typeof micRecommendationSchema>;
export type SpeakerRecommendationsResponse = z.infer<typeof speakerRecommendationsResponseSchema>;

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
  irs: z.array(irMetricsSchema).min(2, "Need at least 2 IRs to analyze pairings"),
});

export const pairingResultSchema = z.object({
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

export const api = {
  analyses: {
    create: {
      method: 'POST' as const,
      path: '/api/analyze',
      input: insertAnalysisSchema, 
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
      }),
      responses: {
        200: speakerRecommendationsResponseSchema,
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
};
