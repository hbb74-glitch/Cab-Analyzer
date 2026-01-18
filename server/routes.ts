
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
      
      // AI Analysis Logic - Purely technical, objective quality assessment
      const systemPrompt = `You are an expert audio engineer specializing in guitar cabinet impulse responses (IRs). 
      Analyze the provided technical metrics and user context to determine the TECHNICAL QUALITY of the IR.
      Your analysis should be purely objective, focusing on audio quality metrics - NOT genre or stylistic preferences.
      
      Knowledge Base (Microphones):
      - SM57: Classic dynamic, mid-forward, aggressive.
      - R-121 / R10: Ribbon, smooth highs, big low-mid, figure-8.
      - M160: Hypercardioid ribbon, tighter, more focused.
      - MD421 / Kompakt: Large diaphragm dynamic, punchy.
      - M88: Warm, great low-end punch.
      - PR30: Large diaphragm dynamic, very clear highs.
      - e906: Supercardioid, presence boost or flat modes.
      - M201: Very accurate dynamic.
      - SM7B: Smooth, thick dynamic.
      - Roswell Cab Mic: Condenser designed for loud cabs.
      
      Knowledge Base (Speakers):
      - G12M-25 (Greenback): Classic woody, mid-forward, compression at high volume.
      - V30: Aggressive upper-mids, modern rock. The standard unlabeled Vintage 30.
      - V30 (Black Cat): Smoother, more refined than standard V30.
      - G12K-100: Big low end, clear highs, neutral.
      - G12T-75: Scooped mids, sizzly highs.
      - G12-65: Warm, punchy, large sound.
      - G12H30 Anniversary: Tight bass, bright highs, detailed.
      - Celestion Cream: Alnico smoothness with high power.
      - GA12-SC64: Vintage American, tight and punchy.
      - G10-SC64: 10" version, more focused.
      
      Microphone Position Tonal Characteristics:
      - Cap: Center of speaker. Brightest, most aggressive tone with high-end detail.
      - Cap Edge: Transition zone. Balanced tone, often the "sweet spot."
      - Cap Edge (Favor Cap): Slightly brighter than cap-edge.
      - Cap Edge (Favor Cone): Slightly warmer than cap-edge.
      - Cone: Outer area. Darker, warmer tone with more body.
      - Cap Off Center: Off-axis. Reduces harshness, different high-end character.
      
      Technical Scoring Criteria:
      - 90-100: Exceptional. Professional studio quality, no technical issues.
      - 85-89: Very Good. High quality capture, minor improvements possible.
      - 80-84: Good. Usable quality, some technical aspects could be improved.
      - 70-79: Acceptable. Noticeable issues but still usable.
      - Below 70: Needs work. Significant technical problems.
      
      Criteria for "Perfect" IR (technical quality):
      - Normalization: The system normalizes every IR to 0dB peak before analysis.
      - Duration: 20ms - 50ms ideal (too short = missing bass response, too long = room noise/reflections)
      - Peak: Should be around 0dB (since it's normalized).
      - Spectral balance: Appropriate frequency content for the mic/speaker/position combination.
      - No clipping, phase issues, or excessive noise.
      
      Advice Guidelines:
      - Focus on TECHNICAL quality only - not genre or style preferences.
      - Comment on whether the mic/position/distance choice captures the speaker well.
      - Identify any technical issues (duration, frequency response, noise).
      - Suggest technical improvements if needed (different position, distance adjustments).
      
      Best Position Guidelines:
      For each mic+speaker combo, recommend the best positions based on their characteristics:
      - Cap: Best for bright, aggressive tones. Good for mics that need high-end detail.
      - Cap Edge: Most versatile, often the "sweet spot" for balanced capture.
      - Cone: Best for darker, warmer tones. Good for taming bright mics/speakers.
      - Cap Off Center: Good for reducing harshness while maintaining presence.
      
      Output JSON format:
      {
        "score": number (0-100),
        "is_perfect": boolean (true if score >= 85),
        "advice": "string (2-3 sentences max, focus on technical quality)",
        "bestPositions": [
          {
            "position": "cap|cap-edge|cap-edge-favor-cap|cap-edge-favor-cone|cone|cap-off-center",
            "reason": "Brief reason why this position works well for this mic+speaker combo"
          }
        ]
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
        
        Please analyze the technical quality of this IR capture.
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

  // Recommendations endpoint - ideal distances for mic+speaker combo
  app.post(api.recommendations.get.path, async (req, res) => {
    try {
      const input = api.recommendations.get.input.parse(req.body);
      const { micType, speakerModel, genre } = input;

      const systemPrompt = `You are an expert audio engineer specializing in guitar cabinet impulse responses (IRs).
      Your task is to recommend IDEAL DISTANCES for a specific microphone and speaker combination.
      Distance is the primary variable - position on the speaker is less important for this analysis.
      Focus on how distance affects the tonal characteristics of this specific mic+speaker pairing.
      
      Microphone Knowledge:
      - 57 (SM57): Classic dynamic, mid-forward, aggressive. Proximity effect adds bass up close.
      - 121 (R-121): Ribbon, smooth highs, big low-mid, figure-8. Strong proximity effect.
      - 160 (M160): Hypercardioid ribbon, tighter, more focused. Less proximity effect than R-121.
      - 421 (MD421): Large diaphragm dynamic, punchy. Moderate proximity effect.
      - 421-kompakt (MD421 Kompakt): Compact version, similar character.
      - r10 (R10): Ribbon, smooth and warm.
      - m88 (M88): Warm, great low-end punch.
      - pr30 (PR30): Large diaphragm dynamic, very clear highs, less proximity effect.
      - e906-boost (e906 Presence Boost): Supercardioid with bite.
      - e906-flat (e906 Flat): Supercardioid, balanced.
      - m201 (M201): Very accurate dynamic.
      - sm7b (SM7B): Smooth, thick.
      - roswell-cab (Roswell Cab Mic): Condenser for loud cabs.
      
      Available Distances (in inches): 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6
      
      Speakers Knowledge:
      - g12m25 (G12M-25 Greenback): Classic woody, mid-forward, compression at high volume.
      - v30-china (V30): Aggressive upper-mids, modern rock.
      - v30-blackcat (V30 Black Cat): Smoother, refined V30.
      - k100 (G12K-100): Big low end, clear highs, neutral.
      - g12t75 (G12T-75): Scooped mids, sizzly highs, metal.
      - g12-65 (G12-65): Warm, punchy, large sound.
      - g12h30-anniversary (G12H30 Anniversary): Tight bass, bright highs.
      - celestion-cream (Celestion Cream): Alnico smooth, high power.
      - ga12-sc64 (GA12-SC64): Vintage American, tight and punchy.
      - g10-sc64 (G10-SC64): 10" version, more focused.
      
      Distance Effects (general principles):
      - 0-0.5": Maximum proximity effect (bass boost), very direct/aggressive, potential for bass buildup
      - 1-2": Sweet spot for most dynamics, balanced proximity, punchy attack
      - 2.5-4": Reduced proximity, more natural tonal balance, some room interaction
      - 4.5-6": Minimal proximity, roomier sound, more natural but less direct${genre ? `
      
      Genre Context (${genre}):
      Use this to refine recommendations. Consider what distances work best for achieving the signature sound of this genre.` : ''}
      
      Provide 4-6 distance recommendations covering the usable range for this mic+speaker combo.
      Explain how each distance affects the tone and what it's best suited for.
      
      Output JSON format:
      {
        "mic": "${micType}",
        "micDescription": "Brief description of the microphone's character",
        "speaker": "${speakerModel}",
        "speakerDescription": "Brief description of the speaker's tonal characteristics",
        ${genre ? `"genre": "${genre}",` : ''}
        "recommendations": [
          {
            "distance": "distance in inches as string (e.g. '1' or '2.5')",
            "rationale": "Why this distance works for this mic+speaker combo and what tonal effect it produces",
            "expectedTone": "Description of the expected tonal result",
            "bestFor": "What styles/sounds this distance is ideal for (e.g., 'tight rhythm tracks', 'warm leads', 'room ambience')"
          }
        ]
      }`;

      let userMessage = `Please recommend ideal distances for the ${micType} microphone paired with the ${speakerModel} speaker.`;
      if (genre) {
        userMessage += ` Optimize recommendations for the ${genre} genre, referencing classic studio techniques.`;
      }
      userMessage += ` Cover a range of distances from close to far, explaining the tonal differences.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      res.json(result);
    } catch (err) {
      console.error('Recommendations error:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  return httpServer;
}
