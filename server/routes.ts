
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
      
      Output JSON format:
      {
        "score": number (0-100),
        "is_perfect": boolean (true if score >= 85),
        "advice": "string (2-3 sentences max, focus on technical quality)"
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

  // Recommendations endpoint
  app.post(api.recommendations.get.path, async (req, res) => {
    try {
      const input = api.recommendations.get.input.parse(req.body);
      const { speakerModel, genre } = input;

      const systemPrompt = `You are an expert audio engineer specializing in guitar cabinet impulse responses (IRs).
      Your task is to recommend the best microphone, position, and distance combinations for capturing a specific speaker FOR A SPECIFIC GENRE.
      Your recommendations should be GENRE-SPECIFIC, drawing from classic studio techniques used in legendary recordings.
      
      Available Microphones:
      - 57 (SM57): Classic dynamic, mid-forward, aggressive.
      - 121 (R-121): Ribbon, smooth highs, big low-mid, figure-8.
      - 160 (M160): Hypercardioid ribbon, tighter, more focused.
      - 421 (MD421): Large diaphragm dynamic, punchy.
      - 421-kompakt (MD421 Kompakt): Compact version.
      - r10 (R10): Ribbon, smooth.
      - m88 (M88): Warm, great low-end punch.
      - pr30 (PR30): Large diaphragm dynamic, very clear highs.
      - e906-boost (e906 Presence Boost): Supercardioid with bite.
      - e906-flat (e906 Flat): Supercardioid, balanced.
      - m201 (M201): Very accurate dynamic.
      - sm7b (SM7B): Smooth, thick.
      - roswell-cab (Roswell Cab Mic): Condenser for loud cabs.
      
      Available Positions:
      - cap: Center of speaker, brightest.
      - cap-edge: Transition zone, balanced.
      - cap-edge-favor-cap: Slightly brighter than cap-edge.
      - cap-edge-favor-cone: Slightly warmer than cap-edge.
      - cone: Outer area, warmest/darkest.
      - cap-off-center: Off-axis, reduced harshness.
      
      Available Distances (in inches):
      0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6
      
      Speakers Knowledge:
      - g12m25 (G12M-25 Greenback): Classic woody, mid-forward, compression at high volume.
      - v30-china (V30): Aggressive upper-mids, modern rock. The standard unlabeled V30.
      - v30-blackcat (V30 Black Cat): Smoother, refined V30.
      - k100 (G12K-100): Big low end, clear highs, neutral.
      - g12t75 (G12T-75): Scooped mids, sizzly highs, metal.
      - g12-65 (G12-65): Warm, punchy, large sound.
      - g12h30-anniversary (G12H30 Anniversary): Tight bass, bright highs.
      - celestion-cream (Celestion Cream): Alnico smooth, high power.
      - ga12-sc64 (GA12-SC64): Vintage American, tight and punchy.
      - g10-sc64 (G10-SC64): 10" version, more focused.
      
      === GENRE-SPECIFIC STUDIO TECHNIQUES ===
      
      CLASSIC ROCK (classic-rock) - 1970s: Led Zeppelin, AC/DC, Rolling Stones:
      - Mic approach: SM57 at 1-2" from grille, halfway between dust cap and edge. Often paired with ribbon at distance.
      - Tone goal: Warm, punchy midrange with smooth highs. Not overly bright or fizzy.
      - Classic approach: Dual-mic (SM57 close + ribbon 6-20" back). Minimal processing, "get it right at the source."
      - Ideal: Rich harmonics, controlled low-end, vocal-like midrange presence.
      
      HARD ROCK (hard-rock) - 1980s: Van Halen, Def Leppard, Scorpions:
      - Mic approach: Tighter mic placement for more definition. SM57 slightly off-center for bite.
      - Tone goal: Aggressive upper-mids, punchy attack, sizzling harmonics.
      - Classic approach: Double-tracking rhythms, layering for width. Marshall JCM800 tones.
      - Ideal: Cutting through dense mixes, sustain with controlled feedback.
      
      ALTERNATIVE ROCK (alternative-rock) - R.E.M., The Smiths, Radiohead:
      - Mic approach: More experimental placements. Room mics play a larger role.
      - Tone goal: Textural, sometimes lo-fi character. Clean-to-edge-of-breakup tones.
      - Classic approach: Vox AC30 for jangle, Fender for clean. Embrace some room ambience.
      - Ideal: Chiming cleans, dynamic responsiveness, shimmering highs when needed.
      
      PUNK (punk) - Ramones, Sex Pistols, Green Day:
      - Mic approach: Close mic (1-2") for raw, aggressive capture. SM57 on-axis at center for maximum bite.
      - Tone goal: Raw, loose, loud. Imperfections are welcome.
      - Classic approach: Fast playing, downpicking, power chords. Marshall crunch, minimal effects.
      - Ideal: In-your-face presence, mid-range aggression, minimal polish.
      
      GRUNGE (grunge) - Nirvana, Soundgarden, Alice in Chains:
      - Mic approach: SM57 slightly off-center. Embrace noise and feedback. Multi-tracking layers.
      - Tone goal: Thick, dark, saturated with loose low-end. Down-tuned heaviness.
      - Classic approach: Big Muff Pi fuzz + Fender Twin. Mesa with mids cranked.
      - Ideal: Wall of sound from layered takes. Raw energy over perfection. Creamy fuzz sustain.
      
      CLASSIC HEAVY METAL (classic-metal) - Black Sabbath, Iron Maiden, Judas Priest:
      - Mic approach: SM57 at cap-edge for definition. Fredman technique (two mics at 45°) for Swedish sound.
      - Tone goal: Tight, defined low-end. Aggressive but not fizzy highs. Palm-mute clarity.
      - Classic approach: Less gain than you'd think for tightness. Marshall or Mesa rigs.
      - Ideal: Cutting attack, sustaining chords, clear note separation in fast riffs.
      
      INDIE ROCK (indie-rock) - The Strokes, Arctic Monkeys, Vampire Weekend:
      - Mic approach: Clean tones with slight room. SM57 or ribbon for vintage character.
      - Tone goal: Retro vibe, garage-like grit when needed, but polished production.
      - Classic approach: Smaller amps (Fender Deluxe, Vox AC15) pushed to breakup. Minimal effects.
      - Ideal: Dynamic playing response, vintage warmth, jangly treble when clean.
      
      Provide 3-5 recommended combinations that would capture this speaker well for the TARGET GENRE.
      Your recommendations should reference classic studio techniques from legendary recordings of that genre.
      Consider how the mic character combines with the speaker character to achieve the genre's signature sound.
      
      Output JSON format:
      {
        "speaker": "speaker_value",
        "speakerDescription": "Brief description of the speaker's tonal characteristics FOR THIS GENRE",
        "recommendations": [
          {
            "mic": "mic_value (use the value, not the label)",
            "micLabel": "Human readable mic name",
            "position": "position_value",
            "positionLabel": "Human readable position",
            "distance": "distance in inches as string (e.g. '1' or '2.5')",
            "rationale": "Why this combination works for this speaker AND genre, reference classic recordings",
            "expectedTone": "Description of the expected tonal result with genre-specific language"
          }
        ]
      }`;

      const userMessage = `Please provide microphone, position, and distance recommendations for the ${speakerModel} speaker, optimized for the ${genre} genre. Reference classic studio techniques from legendary ${genre} recordings.`;

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
