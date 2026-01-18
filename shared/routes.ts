
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
  speakerModel: z.string().min(1, "Speaker model is required"),
  genre: z.string().min(1, "Genre is required"),
});

export const recommendationSchema = z.object({
  mic: z.string(),
  micLabel: z.string(),
  position: z.string(),
  positionLabel: z.string(),
  distance: z.string(),
  rationale: z.string(),
  expectedTone: z.string(),
});

export const recommendationsResponseSchema = z.object({
  speaker: z.string(),
  speakerDescription: z.string(),
  recommendations: z.array(recommendationSchema),
});

export type RecommendationInput = z.infer<typeof recommendationInputSchema>;
export type Recommendation = z.infer<typeof recommendationSchema>;
export type RecommendationsResponse = z.infer<typeof recommendationsResponseSchema>;

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
  },
};
