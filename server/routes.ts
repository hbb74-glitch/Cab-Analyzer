
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post(api.analyses.create.path, async (req, res) => {
    try {
      const input = api.analyses.create.input.parse(req.body);
      
      // AI Analysis Logic
      const systemPrompt = `You are an expert audio engineer specializing in guitar cabinet impulse responses (IRs). 
      Analyze the provided technical metrics and user context to determine the quality of the IR and provide actionable advice.
      
      Knowledge Base (Microphones):
      - SM57: Classic dynamic, mid-forward, aggressive.
      - R-121 / R10: Ribbon, smooth highs, big low-mid, figure-8.
      - M160: Hypercardioid ribbon, tighter, more focused than 121.
      - MD421 / Kompakt: Large diaphragm dynamic, punchy, good for high gain.
      - M88: Warm, great for low-end punch.
      - PR30: Large diaphragm dynamic, very clear highs.
      - e906: Supercardioid, presence boost mode adds bite, flat mode is balanced.
      - M201: Very accurate dynamic, "condenser-like" detail.
      - SM7B: Smooth, thick dynamic.
      - Roswell Cab Mic: Condenser designed specifically for loud cabs.
      
      Knowledge Base (Speakers):
      - G12M-25 (Greenback): Classic woody, mid-forward, compression at high volume.
      - V30 (China): Aggressive upper-mids, common in modern rock.
      - V30 (Black Cat): Smoother, more refined than standard V30.
      - G12K-100: Big low end, clear highs, very neutral.
      - G12T-75: "Scooped" mids, sizzly highs, classic for metal.
      - G12-65: Warm, punchy, "large" sound.
      - G12H30 Anniversary: Tight bass, bright highs, very detailed.
      - Celestion Cream: Alnico smoothness with high power handling.
      - GA12-SC64: Vintage American tone, tight and punchy.
      - G10-SC64: 10" version of the SC64, more focused.
      
      Scoring Criteria:
      - 90-100: Exceptional. Professional studio quality, ready for a commercial release.
      - 85-89: Very Good. Acceptable as-is, minor character differences but technically sound.
      - 80-84: Good. Decent but has noticeable flaws that might need EQ or slight mic adjustment.
      - Below 80: Needs significant work. Noticeable technical or tonal issues.
      
      Criteria for "Perfect" IR:
      - Normalization: The system now normalizes every IR to 0dB peak before analysis.
      - Duration: 20ms - 50ms (too short = missing bass, too long = room noise)
      - Peak: Should be around 0dB (since it's normalized).
      
      Microphone Position Tonal Purposes:
      - Cap: The center of the speaker. Yields the brightest, most aggressive tone with the most high-end detail. Good for cutting through a dense mix.
      - Cap Edge: The transition point between the cap and the cone. Provides a balanced tone—smooth highs with a solid midrange. Often considered the "sweet spot."
      - Cap Edge (Favor Cap): Slightly more aggressive than Cap Edge, leaning towards the brightness of the cap.
      - Cap Edge (Favor Cone): Slightly warmer than Cap Edge, leaning towards the smoothness of the cone.
      - Cone: The outer part of the speaker. Produces a darker, warmer tone with more "body" and low-end emphasis. Ideal for smoothing out harsh high-gain sounds.
      - Cap Off Center: Aimed away from the center. Reduces harshness and adds a different character to the high-end roll-off.
      
      Advice Guidelines:
      - If a "Cap" position is too dark, suggest moving closer to the center or checking the mic angle.
      - If a "Cone" position is too bright, suggest moving further from the cap or checking for unwanted reflections.
      - Always consider the Microphone model (e.g., SM57 brightness vs. R121 warmth) and Speaker model when giving advice.
      
      Output JSON format:
      {
        "score": number (0-100),
        "is_perfect": boolean (true if score >= 85),
        "advice": "string (2-3 sentences max, specific to the microphone model, position, speaker, and metrics)"
      }`;

      const userMessage = `
        Mic Type: ${input.micType}
        Position: ${input.micPosition}
        Speaker: ${input.speakerModel}
        Distance: ${input.distance}
        
        Metrics:
        - Duration: ${input.durationSamples} samples
        - Peak Amplitude: ${input.peakAmplitudeDb}dB
        - Spectral Centroid: ${input.spectralCentroid}Hz
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" }
      });

      const aiResult = JSON.parse(response.choices[0].message.content || "{}");
      
      const saved = await storage.createAnalysis({
        ...input,
        advice: aiResult.advice || "Could not generate advice.",
        qualityScore: aiResult.score || 0,
        isPerfect: aiResult.is_perfect || false
      });

      res.status(201).json(saved);
    } catch (err) {
      console.error('Analysis error:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to analyze IR" });
    }
  });

  app.get(api.analyses.list.path, async (req, res) => {
    const history = await storage.getAnalyses();
    res.json(history);
  });

  return httpServer;
}
