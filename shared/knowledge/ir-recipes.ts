export interface IRRecipe {
  speaker: string;
  speakerLabel: string;
  mic: string;
  micLabel: string;
  position: string;
  distance: string;
  notes: string;
  bestFor: string;
  source: string;
}

export const CURATED_IR_RECIPES: IRRecipe[] = [
  // SM57 Classic Combinations - The Industry Standard
  {
    speaker: "v30-china",
    speakerLabel: "V30",
    mic: "57",
    micLabel: "SM57",
    position: "capedge",
    distance: "1",
    notes: "The classic SM57 sweet spot on a V30. Balanced attack with enough brightness for modern tones without harshness.",
    bestFor: "Modern rock, hard rock, metal rhythm tracks",
    source: "Standard IR production technique"
  },
  {
    speaker: "v30-china",
    speakerLabel: "V30",
    mic: "57",
    micLabel: "SM57",
    position: "cap",
    distance: "0.5",
    notes: "Aggressive and bright. Great for cutting through dense mixes. The V30's upper-mid aggression combined with dead center cap placement.",
    bestFor: "Metal leads, aggressive rhythm tracks",
    source: "Standard IR production technique"
  },
  {
    speaker: "v30-china",
    speakerLabel: "V30",
    mic: "57",
    micLabel: "SM57",
    position: "capedge_dk",
    distance: "1.5",
    notes: "Tames the V30's harshness while keeping definition. Moving towards cone smooths out the upper mids.",
    bestFor: "Hard rock, classic metal, mix-ready tones",
    source: "IR producer technique for V30 smoothing"
  },

  // Greenback Combinations - Classic Rock Character
  {
    speaker: "g12m25",
    speakerLabel: "G12M-25 (Greenback)",
    mic: "57",
    micLabel: "SM57",
    position: "capedge",
    distance: "1",
    notes: "Classic rock tone. The Greenback's woody mids with SM57 presence. This is the Plexi sound.",
    bestFor: "Classic rock, blues rock, 70s tones",
    source: "Classic British studio technique"
  },
  {
    speaker: "g12m25",
    speakerLabel: "G12M-25 (Greenback)",
    mic: "121",
    micLabel: "R-121",
    position: "capedge",
    distance: "2",
    notes: "Ribbon smoothness on a Greenback. Tames harshness, adds vintage warmth. The ribbon's figure-8 pattern captures some room.",
    bestFor: "Blues, classic rock, vintage tones",
    source: "Modern ribbon technique on vintage speakers"
  },
  {
    speaker: "g12m25",
    speakerLabel: "G12M-25 (Greenback)",
    mic: "160",
    micLabel: "M160",
    position: "capedge",
    distance: "1.5",
    notes: "Hypercardioid ribbon keeps it focused. Less room bleed than R-121, tighter bass than figure-8 ribbons.",
    bestFor: "Classic rock, blues, roots rock",
    source: "IR producer technique for controlled ribbon sound"
  },

  // G12T-75 Combinations - Modern Metal
  {
    speaker: "g12t75",
    speakerLabel: "G12T-75",
    mic: "57",
    micLabel: "SM57",
    position: "cap",
    distance: "0.5",
    notes: "The scooped T-75 with bright cap placement. Classic 80s metal sound. Tight and aggressive.",
    bestFor: "80s metal, thrash, tight rhythm",
    source: "Standard metal IR production"
  },
  {
    speaker: "g12t75",
    speakerLabel: "G12T-75",
    mic: "421",
    micLabel: "MD421",
    position: "capedge",
    distance: "1",
    notes: "MD421 adds punch and body to the scooped T-75. Great for djent and modern metal where you need low-end definition.",
    bestFor: "Modern metal, djent, progressive",
    source: "Modern metal production technique"
  },
  {
    speaker: "g12t75",
    speakerLabel: "G12T-75",
    mic: "e906",
    micLabel: "e906 (Presence)",
    position: "capedge",
    distance: "1",
    notes: "The e906's presence boost cuts through on the already bright T-75. Extreme clarity for technical playing.",
    bestFor: "Technical metal, progressive, lead tones",
    source: "High-definition IR capture technique"
  },

  // Roswell Cab Mic - Manufacturer-Recommended Settings
  {
    speaker: "v30-china",
    speakerLabel: "V30",
    mic: "roswell-cab",
    micLabel: "Roswell Cab Mic",
    position: "cap",
    distance: "6",
    notes: "Manufacturer recommended starting point. Unlike dynamics, the Roswell is designed for dead center cap with no harshness. Start here and move closer for more bass.",
    bestFor: "Modern rock, metal, studio-ready tones",
    source: "Roswell manufacturer recommendation"
  },
  {
    speaker: "v30-china",
    speakerLabel: "V30",
    mic: "roswell-cab",
    micLabel: "Roswell Cab Mic",
    position: "cap",
    distance: "4",
    notes: "Closer than manufacturer default for more low-end weight. The Roswell's linear proximity effect means predictable bass increase.",
    bestFor: "Heavy rhythm, low-tuned guitars",
    source: "Roswell-based IR production"
  },
  {
    speaker: "g12m25",
    speakerLabel: "G12M-25 (Greenback)",
    mic: "roswell-cab",
    micLabel: "Roswell Cab Mic",
    position: "cap",
    distance: "5",
    notes: "Roswell on a Greenback captures the woody mids with extreme clarity. Great for vintage tones with modern definition.",
    bestFor: "Classic rock with modern clarity, blues",
    source: "Roswell-based IR production"
  },

  // Ribbon Mic Techniques
  {
    speaker: "v30-china",
    speakerLabel: "V30",
    mic: "121",
    micLabel: "R-121",
    position: "capedge",
    distance: "3",
    notes: "R-121 at distance smooths out V30 aggression. The ribbon's natural roll-off tames harshness. Classic pairing.",
    bestFor: "Hard rock, rock ballads, full tones",
    source: "Classic ribbon technique on modern speakers"
  },
  {
    speaker: "v30-china",
    speakerLabel: "V30",
    mic: "160",
    micLabel: "M160",
    position: "capedge_br",
    distance: "2",
    notes: "M160's hypercardioid keeps it tight on the V30. Less room, more focus than R-121. Bright for a ribbon.",
    bestFor: "Modern rock, alternative, defined highs",
    source: "Focused ribbon IR technique"
  },
  {
    speaker: "g12h30-anniversary",
    speakerLabel: "G12H",
    mic: "121",
    micLabel: "R-121",
    position: "capedge",
    distance: "2",
    notes: "R-121 on the Anniversary speaker. The H30's tight bass with ribbon warmth. Great for percussive playing.",
    bestFor: "Hard rock, 80s rock, punchy rhythm",
    source: "Classic ribbon on Anniversary technique"
  },

  // MD421 Combinations
  {
    speaker: "v30-blackcat",
    speakerLabel: "V30 (Black Cat)",
    mic: "421",
    micLabel: "MD421",
    position: "capedge",
    distance: "1.5",
    notes: "MD421's punch on the smoother Black Cat V30. More refined than standard V30, with MD421 body.",
    bestFor: "Modern rock, alternative, refined heavy",
    source: "Refined V30 IR technique"
  },
  {
    speaker: "g12-65",
    speakerLabel: "G12-65",
    mic: "421",
    micLabel: "MD421",
    position: "capedge",
    distance: "1",
    notes: "The warm G12-65 with MD421 punch. Big, warm sound with definition. Great for dropped tunings.",
    bestFor: "Stoner rock, doom, sludge, low tunings",
    source: "Warm speaker IR technique"
  },

  // e906 Variations
  {
    speaker: "v30-china",
    speakerLabel: "V30",
    mic: "e906",
    micLabel: "e906 (Flat)",
    position: "capedge",
    distance: "1",
    notes: "e906 in flat mode for neutral capture. The supercardioid pattern gives excellent rejection and focus.",
    bestFor: "All-purpose rock and metal",
    source: "Neutral e906 IR technique"
  },
  {
    speaker: "g12m25",
    speakerLabel: "G12M-25 (Greenback)",
    mic: "e906",
    micLabel: "e906 (Flat)",
    position: "capedge_dk",
    distance: "1.5",
    notes: "e906 flat towards cone on Greenback. Warm but defined. The cone position tames brightness.",
    bestFor: "Classic rock, blues, warmer tones",
    source: "Warm e906 IR technique"
  },

  // Specialty Speakers
  {
    speaker: "celestion-cream",
    speakerLabel: "Celestion Cream",
    mic: "57",
    micLabel: "SM57",
    position: "capedge",
    distance: "1.5",
    notes: "The Cream's Alnico smoothness with SM57 presence. Clean and warm but can handle gain.",
    bestFor: "Blues, clean tones, low-gain rock",
    source: "Alnico speaker IR production"
  },
  {
    speaker: "celestion-cream",
    speakerLabel: "Celestion Cream",
    mic: "121",
    micLabel: "R-121",
    position: "capedge",
    distance: "2.5",
    notes: "Double smooth - ribbon on Alnico. Extremely warm and vintage. Beautiful clean tones.",
    bestFor: "Jazz, clean tones, vintage warmth",
    source: "Vintage smooth IR technique"
  },
  {
    speaker: "ga12-sc64",
    speakerLabel: "GA12-SC64",
    mic: "57",
    micLabel: "SM57",
    position: "capedge",
    distance: "1",
    notes: "American vintage speaker with classic SM57. Tight and punchy, different character from British speakers.",
    bestFor: "Country, americana, tight clean/crunch",
    source: "American speaker IR production"
  },
  {
    speaker: "g10-sc64",
    speakerLabel: "G10-SC64",
    mic: "57",
    micLabel: "SM57",
    position: "cap",
    distance: "0.5",
    notes: "10-inch speaker with close SM57. Focused mids, less bass extension. Great for cutting through.",
    bestFor: "Indie rock, garage, lo-fi",
    source: "Small speaker IR production"
  },

  // G12K-100 Combinations
  {
    speaker: "k100",
    speakerLabel: "G12K-100",
    mic: "57",
    micLabel: "SM57",
    position: "capedge",
    distance: "1",
    notes: "K-100's neutral character with SM57 presence. Big low end with clear highs. Very versatile.",
    bestFor: "All genres, versatile base tone",
    source: "Neutral speaker IR production"
  },
  {
    speaker: "k100",
    speakerLabel: "G12K-100",
    mic: "421",
    micLabel: "MD421",
    position: "capedge",
    distance: "1.5",
    notes: "MD421 on K-100 for maximum punch and clarity. Great for modern progressive tones.",
    bestFor: "Progressive rock, modern metal, clean definition",
    source: "High-definition K-100 technique"
  },

  // M88 Warmth
  {
    speaker: "v30-china",
    speakerLabel: "V30",
    mic: "m88",
    micLabel: "M88",
    position: "capedge_dk",
    distance: "1",
    notes: "M88's warmth tames V30 aggression. Great low-end punch with controlled highs.",
    bestFor: "Warm rock, low tunings, bass-heavy tones",
    source: "Warm dynamic IR technique"
  },

  // PR30 Clarity
  {
    speaker: "v30-china",
    speakerLabel: "V30",
    mic: "pr30",
    micLabel: "PR30",
    position: "capedge",
    distance: "2",
    notes: "PR30's extended highs with less proximity effect. Very clear and detailed. Great for articulation.",
    bestFor: "Technical playing, leads, clarity",
    source: "High-clarity IR production"
  },

  // SM7B Smooth
  {
    speaker: "g12m25",
    speakerLabel: "G12M-25 (Greenback)",
    mic: "sm7b",
    micLabel: "SM7B",
    position: "capedge",
    distance: "1.5",
    notes: "SM7B's smooth character on a Greenback. Broadcast-quality smooth mids. Very polished sound.",
    bestFor: "Polished rock, radio-ready tones",
    source: "Broadcast-quality IR technique"
  }
];

export function getRecipesForSpeaker(speakerCode: string): IRRecipe[] {
  return CURATED_IR_RECIPES.filter(r => r.speaker === speakerCode);
}

export function getRecipesForMicAndSpeaker(micCode: string, speakerCode: string): IRRecipe[] {
  return CURATED_IR_RECIPES.filter(r => r.mic === micCode && r.speaker === speakerCode);
}

export function getAllSpeakers(): string[] {
  return Array.from(new Set(CURATED_IR_RECIPES.map(r => r.speaker)));
}

export function getAllMics(): string[] {
  return Array.from(new Set(CURATED_IR_RECIPES.map(r => r.mic)));
}
