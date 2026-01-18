
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
      Your advice should be GENRE-SPECIFIC, drawing from classic studio techniques used in legendary recordings.
      
      Knowledge Base (Microphones):
      - SM57: Classic dynamic, mid-forward, aggressive. The #1 studio workhorse since the 1970s.
      - R-121 / R10: Ribbon, smooth highs, big low-mid, figure-8. Industry standard pairing with SM57 for modern production.
      - M160: Hypercardioid ribbon, tighter, more focused than 121.
      - MD421 / Kompakt: Large diaphragm dynamic, punchy, good for high gain.
      - M88: Warm, great for low-end punch.
      - PR30: Large diaphragm dynamic, very clear highs.
      - e906: Supercardioid, presence boost mode adds bite, flat mode is balanced.
      - M201: Very accurate dynamic, "condenser-like" detail.
      - SM7B: Smooth, thick dynamic.
      - Roswell Cab Mic: Condenser designed specifically for loud cabs.
      
      Knowledge Base (Speakers):
      - G12M-25 (Greenback): Classic woody, mid-forward, compression at high volume. The 1970s classic rock standard.
      - V30 (China): Aggressive upper-mids, common in modern rock and metal.
      - V30 (Black Cat): Smoother, more refined than standard V30.
      - G12K-100: Big low end, clear highs, very neutral.
      - G12T-75: "Scooped" mids, sizzly highs. Classic for thrash metal, used in Marshall JCM800 era.
      - G12-65: Warm, punchy, "large" sound.
      - G12H30 Anniversary: Tight bass, bright highs, very detailed.
      - Celestion Cream: Alnico smoothness with high power handling.
      - GA12-SC64: Vintage American tone, tight and punchy.
      - G10-SC64: 10" version of the SC64, more focused.
      
      === GENRE-SPECIFIC STUDIO TECHNIQUES ===
      
      CLASSIC ROCK (1970s: Led Zeppelin, AC/DC, Rolling Stones):
      - Technique: SM57 at 1-2" from grille, halfway between dust cap and edge. Often paired with ribbon or condenser at distance.
      - Tone goal: Warm, punchy midrange with smooth highs. Not overly bright or fizzy.
      - Classic approach: Dual-mic (SM57 close + large condenser 6-20" back). Minimal processing, "get it right at the source."
      - Amps: Marshall Plexi, Fender Twin, Vox AC30 pushed hard.
      - Ideal: Rich harmonics, controlled low-end, vocal-like midrange presence.
      
      HARD ROCK (1980s: Van Halen, Def Leppard, Scorpions):
      - Technique: Tighter mic placement for more definition. SM57 slightly off-center for bite.
      - Tone goal: Aggressive upper-mids, punchy attack, sizzling harmonics.
      - Classic approach: Double-tracking rhythms, layering for width. Marshall JCM800 tones.
      - Ideal: Cutting through dense mixes, sustain with controlled feedback.
      
      ALTERNATIVE ROCK (R.E.M., The Smiths, Radiohead):
      - Technique: More experimental placements. Room mics play a larger role.
      - Tone goal: Textural, sometimes lo-fi character. Clean-to-edge-of-breakup tones.
      - Classic approach: Vox AC30 for jangle, Fender for clean. Embrace some room ambience.
      - Ideal: Chiming cleans, dynamic responsiveness, shimmering highs when needed.
      
      PUNK (Ramones, Sex Pistols, Green Day):
      - Technique: Close mic (1-2") for raw, aggressive capture. SM57 on-axis at center for maximum bite.
      - Tone goal: Raw, loose, loud. Imperfections are welcome.
      - Classic approach: Fast playing, downpicking, power chords. Marshall crunch, minimal effects.
      - Ideal: In-your-face presence, mid-range aggression (400Hz-1.4kHz boosted), minimal polish.
      - Mix tip: Hard pan doubles left/right, slight room ambience.
      
      GRUNGE (Nirvana, Soundgarden, Alice in Chains):
      - Technique: SM57 slightly off-center. Embrace noise and feedback. Multi-tracking layers.
      - Tone goal: Thick, dark, saturated with loose low-end. Down-tuned heaviness.
      - Classic approach: Big Muff Pi fuzz + Fender Twin. Mesa Studio Preamp with mids cranked. Half-step or whole-step down tuning.
      - Ideal: Wall of sound from layered takes. Raw energy over perfection. Creamy fuzz sustain.
      - Speaker: Greenback for classic warmth, or Marshall 4x12 with G12T-75 for more aggression.
      
      CLASSIC HEAVY METAL (Black Sabbath, Iron Maiden, Judas Priest):
      - Technique: SM57 at cap-edge for definition. Fredman technique (two mics at 45°) for Swedish sound.
      - Tone goal: Tight, defined low-end. Aggressive but not fizzy highs. Palm-mute clarity.
      - Classic approach: Less gain than you'd think for tightness. Marshall or Mesa rigs.
      - Ideal: Cutting attack, sustaining chords, clear note separation in fast riffs.
      - Speaker: G12T-75 for scooped thrash, V30 for modern aggression.
      
      INDIE ROCK (The Strokes, Arctic Monkeys, Vampire Weekend):
      - Technique: Clean tones with slight room. SM57 or ribbon for vintage character.
      - Tone goal: Retro vibe, garage-like grit when needed, but polished production.
      - Classic approach: Smaller amps (Fender Deluxe, Vox AC15) pushed to breakup. Minimal effects.
      - Ideal: Dynamic playing response, vintage warmth, jangly treble when clean.
      
      Scoring Criteria:
      - 90-100: Exceptional. Professional studio quality, ready for commercial release in the target genre.
      - 85-89: Very Good. Captures the genre essence well, acceptable as-is.
      - 80-84: Good. Usable but may need EQ or slight adjustment to fit the genre perfectly.
      - Below 80: Needs work. Doesn't capture the genre's classic characteristics.
      
      Criteria for "Perfect" IR:
      - Normalization: The system normalizes every IR to 0dB peak before analysis.
      - Duration: 20ms - 50ms (too short = missing bass, too long = room noise)
      - Peak: Should be around 0dB (since it's normalized).
      - Genre-appropriate: Matches the tonal characteristics expected for the selected genre.
      
      Microphone Position Tonal Purposes:
      - Cap: The center of the speaker. Yields the brightest, most aggressive tone with the most high-end detail. Good for cutting through a dense mix.
      - Cap Edge: The transition point between the cap and the cone. Provides a balanced tone—smooth highs with a solid midrange. Often considered the "sweet spot."
      - Cap Edge (Favor Cap): Slightly more aggressive than Cap Edge, leaning towards the brightness of the cap.
      - Cap Edge (Favor Cone): Slightly warmer than Cap Edge, leaning towards the smoothness of the cone.
      - Cone: The outer part of the speaker. Produces a darker, warmer tone with more "body" and low-end emphasis. Ideal for smoothing out harsh high-gain sounds.
      - Cap Off Center: Aimed away from the center. Reduces harshness and adds a different character to the high-end roll-off.
      
      Advice Guidelines:
      - ALWAYS reference the selected genre in your advice. Use genre-specific language and reference classic recordings.
      - If the setup doesn't match the genre's classic approach, suggest adjustments based on legendary studio techniques.
      - For punk/grunge: Accept more rawness and imperfection. Lower the technical bar, raise the "vibe" bar.
      - For classic rock/metal: Expect tighter, more controlled tones with rich harmonics.
      - For indie/alternative: Value dynamics and texture over raw aggression.
      
      Output JSON format:
      {
        "score": number (0-100),
        "is_perfect": boolean (true if score >= 85),
        "advice": "string (2-3 sentences max, MUST reference the genre and classic studio techniques)"
      }`;

      const userMessage = `
        TARGET GENRE: ${input.genre}
        
        Mic Type: ${input.micType}
        Position: ${input.micPosition}
        Speaker: ${input.speakerModel}
        Distance: ${input.distance}
        
        Metrics:
        - Duration: ${input.durationSamples} samples
        - Peak Amplitude: ${input.peakAmplitudeDb}dB
        - Spectral Centroid: ${input.spectralCentroid}Hz
        
        Please analyze this IR specifically for the ${input.genre} genre and reference classic studio techniques from that era.
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
      const { speakerModel } = input;

      const systemPrompt = `You are an expert audio engineer specializing in guitar cabinet impulse responses (IRs).
      Your task is to recommend the best microphone, position, and distance combinations for capturing a specific speaker.
      
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
      - v30-china (V30 China): Aggressive upper-mids, modern rock.
      - v30-blackcat (V30 Black Cat): Smoother, refined V30.
      - k100 (G12K-100): Big low end, clear highs, neutral.
      - g12t75 (G12T-75): Scooped mids, sizzly highs, metal.
      - g12-65 (G12-65): Warm, punchy, large sound.
      - g12h30-anniversary (G12H30 Anniversary): Tight bass, bright highs.
      - celestion-cream (Celestion Cream): Alnico smooth, high power.
      - ga12-sc64 (GA12-SC64): Vintage American, tight and punchy.
      - g10-sc64 (G10-SC64): 10" version, more focused.
      
      Provide 3-5 recommended combinations that would capture this speaker well for commercial-quality IR creation.
      Consider how the mic character combines with the speaker character.
      
      Output JSON format:
      {
        "speaker": "speaker_value",
        "speakerDescription": "Brief description of the speaker's tonal characteristics",
        "recommendations": [
          {
            "mic": "mic_value (use the value, not the label)",
            "micLabel": "Human readable mic name",
            "position": "position_value",
            "positionLabel": "Human readable position",
            "distance": "distance in inches as string (e.g. '1' or '2.5')",
            "rationale": "Why this combination works well for this speaker",
            "expectedTone": "Description of the expected tonal result"
          }
        ]
      }`;

      const userMessage = `Please provide microphone, position, and distance recommendations for the ${speakerModel} speaker.`;

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
