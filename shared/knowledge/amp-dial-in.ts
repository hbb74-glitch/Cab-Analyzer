export interface AmpControl {
  id: string;
  label: string;
  max?: number;
}

export interface AmpSwitch {
  id: string;
  label: string;
  type: "toggle" | "multi";
  options?: string[];
}

export interface AmpControlLayout {
  knobs: AmpControl[];
  switches: AmpSwitch[];
  graphicEQ?: boolean;
}

export interface DialInSettings {
  [key: string]: number | boolean | string;
}

export interface DialInPreset {
  id: string;
  style: string;
  settings: DialInSettings;
  tips: string[];
  whatToListenFor: string[];
  source: string;
}

export interface AmpFamilyDefaults {
  familyId: string;
  familyName: string;
  modelPatterns: string[];
  controlLayout: AmpControlLayout;
  presets: DialInPreset[];
}

export interface ModelOverride {
  modelId: string;
  controlLayout?: AmpControlLayout;
  presets: DialInPreset[];
}

// ═══════════════════════════════════════════════════════════════
// CONTROL LAYOUTS — Matching Fractal "Authentic" view exactly
// ═══════════════════════════════════════════════════════════════

const STANDARD_MV: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "master", label: "Master" },
    { id: "presence", label: "Presence" },
  ],
  switches: [],
};

const STANDARD_MV_BRIGHT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "master", label: "Master" },
    { id: "presence", label: "Presence" },
  ],
  switches: [
    { id: "bright", label: "Bright", type: "toggle" },
  ],
};

const STANDARD_MV_BRIGHT_DEPTH: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "master", label: "Master" },
    { id: "presence", label: "Presence" },
  ],
  switches: [
    { id: "bright", label: "Bright", type: "toggle" },
    { id: "depth", label: "Depth", type: "toggle" },
  ],
};

const NON_MV_VOLUME_ONLY: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
  ],
  switches: [],
};

const NON_MV_TWEED: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "tone", label: "Tone" },
  ],
  switches: [],
};

const PRINCETON_TWEED: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "tone", label: "Tone" },
  ],
  switches: [],
};

const PRINCETON_REVERB: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "bass", label: "Bass" },
    { id: "treble", label: "Treble" },
  ],
  switches: [],
};

const DUAL_VOLUME_TWEED: AmpControlLayout = {
  knobs: [
    { id: "volume1", label: "Normal Vol" },
    { id: "volume2", label: "Bright Vol" },
    { id: "bass", label: "Bass" },
    { id: "treble", label: "Treble" },
  ],
  switches: [],
};

const DUAL_VOLUME_TWEED_PRESENCE: AmpControlLayout = {
  knobs: [
    { id: "volume1", label: "Normal Vol" },
    { id: "volume2", label: "Bright Vol" },
    { id: "bass", label: "Bass" },
    { id: "treble", label: "Treble" },
    { id: "presence", label: "Presence" },
  ],
  switches: [],
};

const BASSMAN_JUMPED: AmpControlLayout = {
  knobs: [
    { id: "volume1", label: "Normal Vol" },
    { id: "volume2", label: "Bright Vol" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Middle" },
    { id: "treble", label: "Treble" },
    { id: "presence", label: "Presence" },
  ],
  switches: [],
};

const BASSMAN_SINGLE: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Middle" },
    { id: "treble", label: "Treble" },
    { id: "presence", label: "Presence" },
  ],
  switches: [
    { id: "bright", label: "Bright", type: "toggle" },
  ],
};

const BASSMAN_DUAL: AmpControlLayout = {
  knobs: [
    { id: "volume1", label: "Normal Vol" },
    { id: "volume2", label: "Bright Vol" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Middle" },
    { id: "treble", label: "Treble" },
    { id: "presence", label: "Presence" },
  ],
  switches: [],
};

const BASSMAN_65: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
  ],
  switches: [],
};

const FENDER_BROWNFACE: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "bass", label: "Bass" },
    { id: "treble", label: "Treble" },
  ],
  switches: [],
};

const FENDER_DELUXE_REVERB: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "bass", label: "Bass" },
    { id: "treble", label: "Treble" },
  ],
  switches: [
    { id: "bright", label: "Bright", type: "toggle" },
  ],
};

const BLACKFACE_NORMAL: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "bass", label: "Bass" },
    { id: "treble", label: "Treble" },
  ],
  switches: [],
};

const BLACKFACE_VIBRATO: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "bass", label: "Bass" },
    { id: "treble", label: "Treble" },
  ],
  switches: [
    { id: "bright", label: "Bright", type: "toggle" },
  ],
};

const BLACKFACE_SUPER: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
  ],
  switches: [
    { id: "bright", label: "Bright", type: "toggle" },
  ],
};

const BLACKFACE_TWIN: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
  ],
  switches: [
    { id: "bright", label: "Bright", type: "toggle" },
  ],
};

const VIBRATO_KING_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
  ],
  switches: [
    { id: "fat", label: "Fat", type: "toggle" },
  ],
};

const BLUES_JR_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "master", label: "Master" },
  ],
  switches: [
    { id: "fat", label: "Fat", type: "toggle" },
  ],
};

const NON_MV_PLEXI: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "presence", label: "Presence" },
  ],
  switches: [],
};

const DUAL_VOLUME_PLEXI: AmpControlLayout = {
  knobs: [
    { id: "volume1", label: "Volume I" },
    { id: "volume2", label: "Volume II" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "presence", label: "Presence" },
  ],
  switches: [],
};

const JCM800_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "master", label: "Master" },
    { id: "presence", label: "Presence" },
  ],
  switches: [
    { id: "boost", label: "Boost", type: "toggle" },
  ],
};

const VOX_TOP_BOOST: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "bass", label: "Bass" },
    { id: "treble", label: "Treble" },
    { id: "cut", label: "Cut" },
  ],
  switches: [],
};

const VOX_NORMAL: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "tone", label: "Tone" },
    { id: "cut", label: "Cut" },
  ],
  switches: [],
};

const EVH_5153_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "bass", label: "Low" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "High" },
    { id: "master", label: "Volume" },
    { id: "presence", label: "Presence" },
    { id: "resonance", label: "Resonance" },
  ],
  switches: [],
};

const PEAVEY_5150_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "bass", label: "Low" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "High" },
    { id: "master", label: "Post Gain" },
    { id: "resonance", label: "Resonance" },
    { id: "presence", label: "Presence" },
  ],
  switches: [
    { id: "bright", label: "Bright", type: "toggle" },
  ],
};

const MESA_MARK_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "master", label: "Master" },
    { id: "presence", label: "Presence" },
  ],
  switches: [
    { id: "bright", label: "Bright", type: "toggle" },
  ],
  graphicEQ: true,
};

const MESA_RECTO_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "master", label: "Master" },
    { id: "presence", label: "Presence" },
  ],
  switches: [
    { id: "bold_spongy", label: "Rectifier", type: "multi", options: ["Bold", "Spongy"] },
  ],
};

const FRIEDMAN_BE_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "master", label: "Master" },
    { id: "presence", label: "Presence" },
  ],
  switches: [
    { id: "bright", label: "Bright", type: "toggle" },
    { id: "sat", label: "SAT", type: "toggle" },
    { id: "fat", label: "Fat", type: "toggle" },
    { id: "voicing", label: "Voicing", type: "multi", options: ["V1", "V2", "V3"] },
  ],
};

const REVV_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "master", label: "Master" },
    { id: "presence", label: "Presence" },
  ],
  switches: [
    { id: "aggression", label: "Aggression", type: "multi", options: ["Off", "On"] },
  ],
};

const BOGNER_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "master", label: "Master" },
    { id: "presence", label: "Presence" },
  ],
  switches: [
    { id: "bright", label: "Bright", type: "toggle" },
    { id: "structure", label: "Structure", type: "multi", options: ["Tight", "Open"] },
  ],
};

const DIEZEL_VH4_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "master", label: "Master" },
    { id: "presence", label: "Presence" },
    { id: "deep", label: "Deep" },
  ],
  switches: [],
};

const SOLDANO_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "master", label: "Master" },
    { id: "presence", label: "Presence" },
  ],
  switches: [
    { id: "bright", label: "Bright", type: "toggle" },
    { id: "depth", label: "Depth", type: "toggle" },
  ],
};

const DUMBLE_ODS_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "overdrive", label: "OD" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "master", label: "Master" },
    { id: "presence", label: "Presence" },
  ],
  switches: [
    { id: "pab", label: "PAB", type: "toggle" },
  ],
};

const HIWATT_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "presence", label: "Presence" },
  ],
  switches: [
    { id: "bright", label: "Brilliant", type: "toggle" },
  ],
};

const TRAINWRECK_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "cut", label: "Cut" },
  ],
  switches: [],
};

const ENGL_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "master", label: "Master" },
    { id: "presence", label: "Presence" },
  ],
  switches: [
    { id: "bright", label: "Bright", type: "toggle" },
    { id: "contour", label: "Contour", type: "toggle" },
  ],
};

const MESA_TC_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "master", label: "Master" },
    { id: "presence", label: "Presence" },
  ],
  switches: [
    { id: "voicing", label: "Voicing", type: "multi", options: ["Tight", "Normal", "Loose"] },
  ],
};

const JC120_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
  ],
  switches: [
    { id: "bright", label: "Bright", type: "toggle" },
    { id: "distortion", label: "Distortion", type: "toggle" },
  ],
};

const CAMERON_CCV_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "master", label: "Master" },
    { id: "presence", label: "Presence" },
  ],
  switches: [
    { id: "bright", label: "Bright", type: "toggle" },
  ],
};

const FAS_CUSTOM_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "master", label: "Master" },
    { id: "presence", label: "Presence" },
  ],
  switches: [],
};

// ═══════════════════════════════════════════════════════════════
// AMP FAMILY DEFAULTS
// ═══════════════════════════════════════════════════════════════

export const AMP_FAMILY_DEFAULTS: AmpFamilyDefaults[] = [

  // ─── FENDER TWEED ERA ───────────────────────────────────────

  {
    familyId: "fender-tweed-champ",
    familyName: "Fender Tweed Champ",
    modelPatterns: ["5f1-tweed"],
    controlLayout: NON_MV_VOLUME_ONLY,
    presets: [
      {
        id: "champ-breakup",
        style: "Sweet Breakup",
        settings: { volume: 7 },
        tips: [
          "The Champ has one knob: Volume. Pure simplicity",
          "Below 5 = clean with natural warmth. Above 7 = sweet singing overdrive",
          "Eric Clapton recorded his Layla solos through a cranked Champ",
          "In Fractal, the Drive parameter IS the volume knob — there is no master",
          "Single-ended Class A — natural sag and compression from the 6V6 power tube",
          "Supply Sag parameter in Fractal controls the rectifier sag feel — increase for more 'bloom'",
          "Pairs with 1x8 or 1x10 cabs — small speakers are part of the character"
        ],
        whatToListenFor: [
          "Warm, compressed breakup that responds to pick dynamics",
          "Natural sag from the single-ended circuit — notes bloom and decay musically"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "champ-clean",
        style: "Clean Recording",
        settings: { volume: 3 },
        tips: [
          "Low volume settings give a sweet, pure clean tone — perfect for recording",
          "Single-ended amps have a unique even-harmonic compression character",
          "Great for layering in a mix — sits beautifully under other guitars",
          "Try Input Trim at 0.500 to simulate the lower-gain input jack"
        ],
        whatToListenFor: [
          "Pure, uncolored tone with natural warmth",
          "The simplicity of the circuit means what you hear is pure guitar"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "fender-princeton-tweed",
    familyName: "Fender Tweed Princeton (5F2)",
    modelPatterns: ["princetone-5f2"],
    controlLayout: PRINCETON_TWEED,
    presets: [
      {
        id: "princeton-tweed-sweet",
        style: "Sweet Breakup",
        settings: { volume: 7, tone: 5 },
        tips: [
          "Volume + Tone — that's all you get. Pure simplicity",
          "Below 4: clean with natural warmth. 5-6: edge of breakup. Above 7: sweet singing overdrive",
          "Single-ended design means natural compression and sag",
          "The 5F2 is essentially a Champ with a tone control added",
          "Great recording amp — small, quiet, and full of character",
          "In Fractal: Drive IS the Volume knob, Tone maps to Treble"
        ],
        whatToListenFor: [
          "Warm, compressed breakup that responds to pick dynamics",
          "Natural sag from the single-ended circuit"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "princeton-tweed-clean",
        style: "Studio Clean",
        settings: { volume: 3, tone: 6 },
        tips: [
          "Keep volume below 4 for pristine cleans",
          "Tone at 6-7 adds sparkle without harshness",
          "The 5F2's simple circuit means very little coloration — pure guitar signal",
          "Perfect for bedroom recording and overdub work"
        ],
        whatToListenFor: [
          "Clear, warm clean tone with natural compression",
          "Minimal coloration — the guitar's natural voice comes through"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "fender-tweed-deluxe",
    familyName: "Fender Tweed Deluxe (5E3)",
    modelPatterns: ["deluxe-tweed"],
    controlLayout: NON_MV_TWEED,
    presets: [
      {
        id: "tweed-dlx-crunch",
        style: "Neil Young Crunch",
        settings: { volume: 8, tone: 6 },
        tips: [
          "The 5E3 has interactive Volume and Tone controls — they affect each other",
          "Cranking the volume is how you get the famous Tweed breakup",
          "No master volume — this amp is designed to be played loud",
          "The tone control is a simple treble roll-off — higher = brighter",
          "Neil Young's 'Old Black' through a Tweed Deluxe = this tone",
          "Supply Sag parameter controls the rectifier bloom — increase for more squish",
          "Pairs beautifully with a 1x12 Jensen P12R or similar vintage speaker"
        ],
        whatToListenFor: [
          "Thick, hairy breakup with tons of harmonic content",
          "Touch sensitivity — dig in for grit, back off for cleaner tones"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "tweed-dlx-clean",
        style: "Clean",
        settings: { volume: 4, tone: 5 },
        tips: [
          "Below about 4-5 you get clean tones with natural warmth",
          "The amp doesn't have tons of headroom — it breaks up early",
          "Roll back guitar volume for cleaner sounds — the amp responds beautifully",
          "The cathode-biased power amp adds natural compression even at low volumes"
        ],
        whatToListenFor: [
          "Warm, rounded clean with a slightly compressed feel",
          "Early hints of breakup even at lower volumes"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "fender-tweed-jumped",
    familyName: "Fender Tweed (Jumped Channels)",
    modelPatterns: ["deluxe-tweed-jumped", "supertweed"],
    controlLayout: DUAL_VOLUME_TWEED,
    presets: [
      {
        id: "tweed-jumped-full",
        style: "Full Crunch",
        settings: { volume1: 6, volume2: 8, bass: 6, treble: 6 },
        tips: [
          "Jumped channels combine Normal and Bright for a fuller tone",
          "Volume I (Normal) adds warmth, Volume II (Bright) adds sparkle and bite",
          "Balance the two volumes to blend the channel characteristics",
          "Tweeds break up early — start lower than you think",
          "The 5E3 Deluxe has Volume, Volume, Bass, Treble — no Mid or Presence on the real amp"
        ],
        whatToListenFor: [
          "Rich, full-spectrum tone combining warmth and clarity",
          "Complex harmonic content from both channels interacting"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "tweed-jumped-warm",
        style: "Warm Blues",
        settings: { volume1: 7, volume2: 5, bass: 7, treble: 5 },
        tips: [
          "Higher Normal volume with lower Bright gives a fatter, warmer tone",
          "Great for blues and roots — Neil Young / early Zeppelin territory",
          "The channels interact — changing one volume affects the other's loading",
          "Increase Supply Sag for more tube rectifier bloom and compression"
        ],
        whatToListenFor: [
          "Fat, warm crunch with smooth top end",
          "The channels interact — changing one volume affects the other"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  {
    familyId: "fender-tweed-5f8-jumped",
    familyName: "Fender 5F8 Tweed Twin (Jumped)",
    modelPatterns: ["5f8-tweed-jumped"],
    controlLayout: DUAL_VOLUME_TWEED_PRESENCE,
    presets: [
      {
        id: "5f8-jumped-full",
        style: "Full Crunch",
        settings: { volume1: 6, volume2: 8, bass: 6, treble: 6, presence: 6 },
        tips: [
          "The 5F8 Twin has Vol 1, Vol 2, Bass, Treble, and Presence — no Middle knob",
          "Jumped channels combine Normal and Bright for a fuller tone",
          "Presence is a real control on the 5F8 — use it to control top-end air",
          "Tweeds break up early — start lower than you think"
        ],
        whatToListenFor: [
          "Rich, full-spectrum tone combining warmth and clarity",
          "More headroom than the 5E3 Deluxe — the Twin stays cleaner longer"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "fender-bassman-jumped",
    familyName: "Fender Tweed Bassman (Jumped)",
    modelPatterns: ["59-bassguy-jumped", "59-bassguy-ri-jumped"],
    controlLayout: BASSMAN_JUMPED,
    presets: [
      {
        id: "bassman-jumped-blues",
        style: "Jumped Blues",
        settings: { volume1: 5, volume2: 7, bass: 7, mid: 5, treble: 7, presence: 8 },
        tips: [
          "The Bassman jumped configuration inspired Jim Marshall to create the first Marshalls",
          "The 5F6-A has Vol 1, Vol 2, Bass, Middle, Treble, Presence — all real controls",
          "Volume II (Bright channel) higher for cutting bite and sparkle",
          "Bass and Treble high (7-8) with Middle at noon — classic Bassman recipe",
          "Presence cranked (8-10) — authentic Bassman sound requires high presence"
        ],
        whatToListenFor: [
          "The full, rich Bassman tone with both channels blending",
          "The DNA of every Marshall ever made lives in this tone"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "bassman-jumped-cranked",
        style: "Cranked Rock",
        settings: { volume1: 7, volume2: 8, bass: 7, mid: 4, treble: 8, presence: 9 },
        tips: [
          "Both volumes high pushes both channels into breakup simultaneously",
          "Lower Middle when cranked to keep things focused and prevent mud",
          "This is THE classic rock foundation tone — everything starts here",
          "Supply Sag higher for more tube rectifier bloom and compression"
        ],
        whatToListenFor: [
          "Harmonically rich, aggressive crunch that responds to pick dynamics",
          "The raw, unrefined power that launched rock and roll"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  {
    familyId: "fender-tweed-bassman-single",
    familyName: "Fender Tweed Bassman (Single Channel)",
    modelPatterns: ["59-bassguy-bright", "59-bassguy-normal"],
    controlLayout: BASSMAN_SINGLE,
    presets: [
      {
        id: "bassman-bright-blues",
        style: "Classic Blues",
        settings: { volume: 6, bass: 8, mid: 5, treble: 8, presence: 8, bright: false },
        tips: [
          "The Bassman is the amp that inspired the Marshall — the grandfather of rock tone",
          "The real 5F6-A has Volume, Bass, Middle, Treble, Presence — all five knobs are critical",
          "Crank Bass and Treble high (7-8) — this is how the Tweed Bassman gets its magic",
          "Middle at noon (5) is a great starting point — the interactive tonestack does the rest",
          "Presence high (8-10) is authentic — the real amp sounds best with presence cranked",
          "Original controls go 1-12, Fractal goes 0-10 — adjust accordingly",
          "Pair with a 4x10 cab for the authentic Bassman experience"
        ],
        whatToListenFor: [
          "Warm, fat Fender tone with smooth breakup when pushed",
          "The amp that launched a thousand imitators — hear the Marshall DNA in its character"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "bassman-cranked",
        style: "Cranked Rock",
        settings: { volume: 8, bass: 7, mid: 4, treble: 8, presence: 9, bright: true },
        tips: [
          "Cranking the Bassman is how the Tweed era gets its magic",
          "Bright switch simulates the Bright channel input in Fractal",
          "Pull bass back slightly and lower middle when cranked to keep things tight",
          "This is the tone that made Jim Marshall say 'I want to build one of those'"
        ],
        whatToListenFor: [
          "Aggressive, harmonically rich breakup with a fat low-end",
          "The transition from clean to crunch as you pick harder"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  {
    familyId: "fender-tweed-bassman-dual",
    familyName: "Fender Tweed (Dual Volume)",
    modelPatterns: ["5f8-tweed-bright", "5f8-tweed-normal"],
    controlLayout: BASSMAN_DUAL,
    presets: [
      {
        id: "tweed-dual-classic",
        style: "Classic Tweed",
        settings: { volume1: 5, volume2: 7, bass: 6, mid: 5, treble: 6, presence: 5 },
        tips: [
          "The 5F8 Tweed Twin and Tweed Bassman single channels have dual volume pots",
          "Bright channel is brighter and breaks up earlier",
          "Normal channel is warmer with more headroom",
          "Balance both volumes to find your sweet spot between channels"
        ],
        whatToListenFor: [
          "Rich, warm Tweed character with the specific channel voicing",
          "Complex harmonic content from the push-pull power amp"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── FENDER BROWNFACE ERA ──────────────────────────────────

  {
    familyId: "fender-brownface",
    familyName: "Fender Brownface Era",
    modelPatterns: ["6g4-super", "6g12-concert", "deluxe-6g3"],
    controlLayout: FENDER_BROWNFACE,
    presets: [
      {
        id: "brownface-clean",
        style: "Warm Clean",
        settings: { volume: 4, bass: 5, treble: 6 },
        tips: [
          "Brownface Fenders are warmer and more harmonically rich than Blackface",
          "NO Mid or Presence knobs — Volume, Bass, and Treble only",
          "The tremolo circuit on brownface amps is considered superior to later Fenders — lush and organic",
          "Less headroom than Blackface — breaks up earlier for a warmer crunch",
          "The brownface era (1960-1963) is the transitional period between Tweed and Blackface",
          "Supply Sag slightly higher for the looser, more organic brownface feel"
        ],
        whatToListenFor: [
          "Warm, lush tone with more harmonic complexity than Blackface",
          "A slightly grittier, more organic character even at clean settings"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "brownface-breakup",
        style: "Edge of Breakup",
        settings: { volume: 6, bass: 4, treble: 5 },
        tips: [
          "Brownface amps break up earlier than their Blackface successors",
          "The 6G4 Super is 40W — still has decent headroom before breaking up",
          "Pull bass back when pushing volume to keep the tone focused",
          "Great for country, roots, and indie — a warmer alternative to Blackface"
        ],
        whatToListenFor: [
          "Musical, warm breakup with a distinctly different character from Blackface crunch",
          "More even-harmonic content compared to the cleaner Blackface designs"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── FENDER BLACKFACE / SILVERFACE ERA ────────────────────

  {
    familyId: "fender-princeton-reverb",
    familyName: "Fender Princeton Reverb",
    modelPatterns: ["princetone-reverb", "princetone-aa964"],
    controlLayout: PRINCETON_REVERB,
    presets: [
      {
        id: "princeton-rev-clean",
        style: "Studio Clean",
        settings: { volume: 4, bass: 4, treble: 6 },
        tips: [
          "One of the best recording amps ever made — pure, sweet Fender tone",
          "NO Mid knob, NO Presence — the midrange is set by the fixed tonestack topology",
          "The Reverb model (AA964) has an extra gain stage from reverb recovery — breaks up sooner",
          "Volume 3-5 for pristine cleans, 5-7 for edge of breakup",
          "For Low input simulation: set Input Trim to 0.500 in Fractal",
          "Pairs beautifully with a 1x10 Jensen C10R or Oxford speaker IR",
          "No Bright switch on the real Princeton — don't add one"
        ],
        whatToListenFor: [
          "Sweet, compressed Fender clean with natural warmth",
          "Touch-sensitive breakup that responds to picking dynamics"
        ],
        source: "Yek's Guide / Fractal Wiki / Fenderguru.com"
      },
      {
        id: "princeton-rev-breakup",
        style: "Cranked Breakup",
        settings: { volume: 7, bass: 3, treble: 5 },
        tips: [
          "Push the Volume past 6 for the Princeton's signature 'brown' breakup",
          "Pull Bass back when cranked — the small speaker and cab compress the lows",
          "The Princeton breaks up 'browner' than bigger Fenders — more low-mid saturation",
          "Ryan Adams uses Princeton amps exclusively — this is that tone",
          "The extra gain stage from the reverb recovery means more harmonic complexity",
          "Supply Sag higher for more tube rectifier sag and compression"
        ],
        whatToListenFor: [
          "Spongy, compressed breakup with a brownish character",
          "More midrange-focused than a Deluxe — the 1x10 speaker shapes the voice"
        ],
        source: "Yek's Guide / Fractal Forum / Fenderguru.com"
      }
    ]
  },

  {
    familyId: "fender-deluxe-reverb",
    familyName: "Fender Deluxe Reverb (AB763)",
    modelPatterns: ["deluxe-verb", "us-deluxe"],
    controlLayout: FENDER_DELUXE_REVERB,
    presets: [
      {
        id: "dlx-rv-clean",
        style: "Crystal Clean",
        settings: { volume: 4, bass: 6, treble: 6, bright: true },
        tips: [
          "The Deluxe Reverb is arguably the most recorded amp in history",
          "Volume, Bass, Treble + Bright switch — NO Mid, NO Presence on the real amp",
          "The Vibrato channel has the reverb — this is the one everyone uses",
          "No master volume — Volume IS your gain control",
          "Bright switch is most useful at lower volumes — it adds a cap across the volume pot",
          "At 22W it breaks up at manageable volumes — perfect for studio work",
          "For Low input simulation: set Input Trim to 0.500 in Fractal",
          "Pair with 1x12 Jensen C12N or similar Fender-voiced speaker IR"
        ],
        whatToListenFor: [
          "The classic Fender 'spank' on single coils — snappy attack with warm body",
          "Bell-like clean tone with the natural scoop of the Fender tonestack"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "dlx-rv-edge",
        style: "Edge of Breakup",
        settings: { volume: 6, bass: 5, treble: 5, bright: false },
        tips: [
          "The magic happens right at the edge of breakup around 6-7 on volume",
          "Turn Bright OFF at higher volumes — it adds too much fizz and harshness",
          "SRV, John Mayer, Keith Richards territory — ride your guitar volume",
          "Use guitar volume to ride between clean and dirty dynamically",
          "The Deluxe Reverb's breakup is smoother and fuller than the Princeton's"
        ],
        whatToListenFor: [
          "Clean notes when picking lightly, gritty bite when digging in",
          "Touch sensitivity is the hallmark — dynamics should be very responsive"
        ],
        source: "Fractal Forum / Yek's Guide"
      }
    ]
  },

  {
    familyId: "fender-super-reverb",
    familyName: "Fender Super Reverb (AB763)",
    modelPatterns: ["super-verb"],
    controlLayout: BLACKFACE_SUPER,
    presets: [
      {
        id: "super-rv-clean",
        style: "Full Clean",
        settings: { volume: 4, bass: 5, mid: 5, treble: 6, bright: true },
        tips: [
          "The Super Reverb has Volume, Bass, Mid, Treble + Bright switch — NO Presence",
          "More headroom than the Deluxe Reverb — 45W with 4x10 speakers",
          "The 4x10 configuration gives a wider, more spread-out sound",
          "Bright switch adds sparkle at lower volumes — turn OFF when pushing",
          "SRV's main amp for live use — more volume than the Deluxe Reverb"
        ],
        whatToListenFor: [
          "Wider, more spread-out Fender clean compared to a 1x12 Deluxe",
          "Punchy low end from the 4x10 configuration"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "super-rv-pushed",
        style: "SRV Pushed",
        settings: { volume: 7, bass: 4, mid: 6, treble: 5, bright: false },
        tips: [
          "SRV ran his Super Reverbs CRANKED — volume at 7-8+",
          "Pull bass back when cranked to prevent flub from the 4x10 cab",
          "Mid at 6 helps the tone cut through without the Presence knob",
          "Bright OFF at high volumes — it gets harsh and fizzy",
          "Use a Tube Screamer to push it further — the TS into Fender trick is legendary"
        ],
        whatToListenFor: [
          "Thick, spongy breakup with the wide spread of a 4x10 cab",
          "Rich harmonics and sustain when the power tubes saturate"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  {
    familyId: "fender-twin",
    familyName: "Fender Twin Reverb",
    modelPatterns: ["double-verb"],
    controlLayout: BLACKFACE_TWIN,
    presets: [
      {
        id: "twin-clean",
        style: "Pristine Clean",
        settings: { volume: 4, bass: 3, mid: 5, treble: 6, bright: true },
        tips: [
          "The Twin Reverb has Volume, Bass, Mid, Treble + Bright switch — NO Presence on the real amp",
          "Bass LOW (2-3) is critical — the Twin has massive bottom end that gets boomy fast",
          "The bright switch adds sparkle and is useful at most volume settings",
          "Great pedal platform — the clean stays clean even with effects in front",
          "The blackface Twin is THE clean tone reference for many players",
          "Pair with 2x12 Jensen C12N or JBL D120F speaker IRs"
        ],
        whatToListenFor: [
          "Ultra-clean, full-range tone with excellent clarity",
          "Massive headroom with zero breakup at moderate volumes"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "twin-pedal-platform",
        style: "Pedal Platform",
        settings: { volume: 3, bass: 3, mid: 6, treble: 5, bright: false },
        tips: [
          "The Twin excels as a pedal platform — stays clean behind everything",
          "Mid at 6 helps cut through in a band mix since there's no Presence",
          "Bright OFF when using drive pedals — keeps things smoother",
          "Volume at 3-4 gives tons of headroom for pedals to push into",
          "Jazz, country, worship, and studio work all love this amp"
        ],
        whatToListenFor: [
          "A blank canvas that takes pedals beautifully",
          "Zero coloration from the amp — what you put in is what you get out"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  {
    familyId: "fender-vibrato-king",
    familyName: "Fender Vibrato King",
    modelPatterns: ["vibrato-king"],
    controlLayout: VIBRATO_KING_LAYOUT,
    presets: [
      {
        id: "vk-fat-clean",
        style: "Fat Clean",
        settings: { volume: 4, bass: 5, mid: 6, treble: 5, fat: true },
        tips: [
          "The Vibrato King has Volume, Bass, Mid, Treble + Fat switch",
          "Fat switch adds low-end body and warmth — great for single coils",
          "A modern Fender design with vintage-inspired voicing",
          "Excellent for jazz, blues, and worship clean tones"
        ],
        whatToListenFor: [
          "Full, warm Fender clean with the Fat switch adding body",
          "A more modern, refined Fender character"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "fender-bandmaster",
    familyName: "Fender Bandmaster (AB763)",
    modelPatterns: ["band-commander"],
    controlLayout: BLACKFACE_VIBRATO,
    presets: [
      {
        id: "bandmaster-clean",
        style: "Clean Head",
        settings: { volume: 4, bass: 5, treble: 6, bright: true },
        tips: [
          "The Bandmaster has Volume, Bass, Treble + Bright switch — NO Mid, like the Deluxe Reverb",
          "Similar voicing to the Deluxe Reverb but as a head unit with more headroom",
          "Responds well to pedals — clean, bright, articulate",
          "Bright switch is useful at lower volumes for added sparkle",
          "Great for country, jazz, and clean rock tones"
        ],
        whatToListenFor: [
          "Clean, bright Fender tone similar to a Deluxe Reverb but with more headroom",
          "Excellent pedal platform character"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "fender-tremolux",
    familyName: "Fender Tremolux (AB763)",
    modelPatterns: ["tremolo-lux"],
    controlLayout: BLACKFACE_VIBRATO,
    presets: [
      {
        id: "tremolux-clean",
        style: "Clean with Tremolo",
        settings: { volume: 4, bass: 5, treble: 6, bright: true },
        tips: [
          "The Tremolux has Volume, Bass, Treble + Bright — NO Mid",
          "Similar to the Deluxe Reverb but as a head unit without reverb",
          "Built-in tremolo is the main feature — chimey, clean Fender tone",
          "At 35W it has more headroom than the Deluxe Reverb"
        ],
        whatToListenFor: [
          "Chimey, clean Fender tone similar to Deluxe Reverb character",
          "Great platform for tremolo effects"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "fender-65-bassman",
    familyName: "Fender '65 Bassman (AB165)",
    modelPatterns: ["65-bassguy", "dweezils-bassguy"],
    controlLayout: BASSMAN_65,
    presets: [
      {
        id: "65-bassman-clean",
        style: "Blackface Clean",
        settings: { volume: 4, bass: 5, mid: 5, treble: 6 },
        tips: [
          "The '65 Bassman has Volume, Bass, Mid, Treble — a different tonestack from the Tweed version",
          "More headroom and cleaner than the Tweed Bassman — a proper Blackface amp",
          "Good pedal platform with Fender sparkle and clarity",
          "Dweezil Zappa's personal Bassman is a community favorite model",
          "The AB165 circuit is fundamentally different from the 5F6-A Tweed version"
        ],
        whatToListenFor: [
          "Bright, clean, punchy Fender tone with good headroom",
          "Tighter bass response than the Tweed version"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "fender-blues-jr",
    familyName: "Fender Blues Junior",
    modelPatterns: ["jr-blues"],
    controlLayout: BLUES_JR_LAYOUT,
    presets: [
      {
        id: "blues-jr-crunch",
        style: "Pub Gig Crunch",
        settings: { volume: 7, bass: 5, mid: 6, treble: 5, master: 5, fat: false },
        tips: [
          "EL84 power tubes give it a more British flavor than typical Fenders",
          "Volume controls preamp gain, Master controls overall level",
          "Fat switch adds bass and midrange body — try it with single coils",
          "Popular gigging amp — great for blues, country, and roots",
          "The Blues Junior is one of Fender's best-selling amps ever"
        ],
        whatToListenFor: [
          "Warm cleans to moderate crunch with a slightly British flavor",
          "EL84 compression and breakup character"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── VOX / CLASS A ─────────────────────────────────────────

  {
    familyId: "vox-ac-tb",
    familyName: "Vox AC Top Boost",
    modelPatterns: ["class-a-30w-tb", "class-a-15w-tb", "ac-20-dlx-tb"],
    controlLayout: VOX_TOP_BOOST,
    presets: [
      {
        id: "vox-chime",
        style: "Chimey Clean",
        settings: { volume: 4, bass: 4, treble: 5, cut: 3 },
        tips: [
          "The Top Boost channel has Bass and Treble EQ — this is 'the AC30 sound'",
          "There is no Mid control — the midrange is fixed and prominent",
          "In Fractal, the Cut maps to the Presence knob — it acts as a Hi-Cut when Damping is 0 (default for AC30)",
          "Cut/Presence below noon = cuts highs (authentic AC30 behavior). Above noon = boosts highs (Fractal bonus)",
          "Cut at 3 (below noon) = bright, chimey tone. Increase to 5-6 to darken when cranked",
          "No master volume — Volume IS your gain. Crank it for breakup",
          "Supply Sag is critical for the AC30 feel — increase for more bloom and sag",
          "EL84 tubes saturate differently from 6L6/EL34 — more compression, more chime"
        ],
        whatToListenFor: [
          "Jangly, chimey highs with a pronounced upper-mid presence",
          "The characteristic Vox 'chime' — bright, complex, musical"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "vox-crunch",
        style: "British Crunch",
        settings: { volume: 7, bass: 4, treble: 5, cut: 5 },
        tips: [
          "Crank the volume for AC30 crunch — power amp saturation is the magic",
          "Increase Cut to 5-6 when cranked — tames the harsh highs that come with power amp breakup",
          "The amp sags beautifully when pushed — Supply Sag parameter is key in Fractal",
          "Brian May's tone: AC30 cranked with a treble booster (Dallas Rangemaster) in front",
          "Depth does nothing on AC30 models (Damping=0 disables it) — leave it alone",
          "Pair with a Vox 2x12 Alnico Blue speaker IR for the authentic experience"
        ],
        whatToListenFor: [
          "Aggressive, chimey breakup with lots of harmonic content",
          "Natural sag and compression that feels musical and responsive"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  {
    familyId: "vox-ac-normal",
    familyName: "Vox AC Normal Channel",
    modelPatterns: ["class-a-30w", "class-a-30w-bright", "class-a-30w-brilliant", "class-a-30w-hot", "class-a-15w", "ac-20-dlx-normal", "ac-20-12ax7", "ac-20-ef86"],
    controlLayout: VOX_NORMAL,
    presets: [
      {
        id: "vox-normal-warm",
        style: "Warm Clean",
        settings: { volume: 5, tone: 5, cut: 3 },
        tips: [
          "The Normal channel is warmer and fatter than the Top Boost",
          "Only has a single Tone control — simpler but effective",
          "Great for blues and jazz — less chimey, more round",
          "The EF86 models have a pentode preamp — more gain and a unique character",
          "Cut maps to Presence in Fractal — below noon darkens, above noon brightens",
          "Cut at 3 keeps the sparkle; raise to 5+ for a darker, jazzier tone"
        ],
        whatToListenFor: [
          "Warmer, darker tone compared to the Top Boost channel",
          "Smooth, round breakup when pushed"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── MARSHALL PLEXI ────────────────────────────────────────

  {
    familyId: "marshall-plexi-single",
    familyName: "Marshall Plexi (Single Channel)",
    modelPatterns: ["1959slp-normal", "1959slp-treble", "1987x-normal", "1987x-treble", "plexi-100w-high", "plexi-100w-normal", "plexi-100w-1970", "plexi-50w-high-1", "plexi-50w-high-2", "plexi-50w-normal", "plexi-50w-6550", "plexi-50w-6ca7"],
    controlLayout: NON_MV_PLEXI,
    presets: [
      {
        id: "plexi-single-rock",
        style: "Classic Rock",
        settings: { volume: 7, bass: 5, mid: 7, treble: 6, presence: 6 },
        tips: [
          "Plexis have NO master volume — Volume IS your gain control",
          "These amps want to be cranked — the power amp saturation is the magic",
          "Presence shapes the power amp frequency response via negative feedback",
          "Marshall mids are the key — don't scoop them, embrace them",
          "The Treble channel is brighter and more aggressive, the Normal is warmer and fatter",
          "50W models break up earlier than 100W — more accessible crunch",
          "6550 power tubes give a tighter, more American-flavored bottom end"
        ],
        whatToListenFor: [
          "Thick, aggressive midrange growl with singing sustain",
          "The roar — when the power tubes saturate, the amp comes alive"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "plexi-single-crunch",
        style: "Hard Crunch",
        settings: { volume: 8, bass: 4, mid: 8, treble: 7, presence: 5 },
        tips: [
          "Full-volume Plexi is the sound of rock and roll",
          "Pull bass back to keep it tight when cranked",
          "The Treble/High input is brighter, the Normal input is fatter",
          "AC/DC, Led Zeppelin, early Van Halen — this is the foundation",
          "Lower Presence when cranked to smooth out harsh treble from the power amp"
        ],
        whatToListenFor: [
          "Aggressive, punchy midrange attack with harmonic overtones",
          "String separation even at high gain — notes stay defined"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  {
    familyId: "marshall-plexi-jumped",
    familyName: "Marshall Plexi (Jumped Channels)",
    modelPatterns: ["1959slp-jumped", "1987x-jumped", "plexi-100w-jumped", "plexi-50w-6ca7-jumped", "plexi-50w-jumped"],
    controlLayout: DUAL_VOLUME_PLEXI,
    presets: [
      {
        id: "plexi-jumped-acdc",
        style: "AC/DC Rock",
        settings: { volume1: 5, volume2: 7, bass: 4, mid: 8, treble: 6, presence: 6 },
        tips: [
          "Jumped channels combine Volume I (darker) and Volume II (brighter) for the fullest tone",
          "Volume II higher than I gives the classic bright, aggressive Plexi tone",
          "Angus Young: Volume I around 5, Volume II around 7 — the classic recipe",
          "NO master volume — both Volume controls together set your overall gain",
          "Balance the two for your preferred blend of warmth and bite",
          "Pair with a 4x12 Greenback or Vintage 30 cab IR"
        ],
        whatToListenFor: [
          "Full-spectrum Plexi tone — warm body from Ch I, bite from Ch II",
          "The amp should feel alive and reactive to every touch"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      },
      {
        id: "plexi-jumped-brown",
        style: "Brown Sound",
        settings: { volume1: 7, volume2: 8, bass: 5, mid: 7, treble: 7, presence: 5 },
        tips: [
          "Both volumes high pushes the preamp harder for more saturation",
          "Presence lower smooths the top end — key for the 'brown sound'",
          "Eddie Van Halen's early tone: cranked Plexi + Variac for sag",
          "In Fractal, use Supply Sag and Bias parameters to emulate the Variac",
          "Increase Supply Sag to 3-5 for that saggy, compressed feel",
          "Try the Bright Cap parameter to fine-tune the high-frequency response"
        ],
        whatToListenFor: [
          "Thick, harmonically rich crunch with smooth top end",
          "Natural compression and sag that makes notes bloom"
        ],
        source: "Fractal Forum / Yek's Guide"
      }
    ]
  },

  {
    familyId: "marshall-plexi-mv",
    familyName: "Marshall Plexi with Master Volume",
    modelPatterns: ["plexi-2204", "plexi-studio-20"],
    controlLayout: STANDARD_MV_BRIGHT,
    presets: [
      {
        id: "plexi-mv-crunch",
        style: "Cranked Plexi",
        settings: { gain: 7, bass: 5, mid: 7, treble: 6, master: 7, presence: 5, bright: false },
        tips: [
          "These Plexi variants have a master volume for gain control",
          "The Studio 20 (SV20H) is a 20W reissue — breaks up earlier",
          "Plexi 2204 is the JMP-era transition — Plexi character with master volume",
          "Push the Master high for power tube saturation — this is where the feel lives",
          "Bright switch OFF at high gain — adds too much sizzle"
        ],
        whatToListenFor: [
          "Classic Plexi roar with master volume for better gain control",
          "Power tube saturation at more manageable volumes"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── MARSHALL JTM 45 ──────────────────────────────────────

  {
    familyId: "marshall-jtm45",
    familyName: "Marshall JTM 45",
    modelPatterns: ["brit-jm45"],
    controlLayout: NON_MV_PLEXI,
    presets: [
      {
        id: "jtm45-blues",
        style: "Blues Rock",
        settings: { volume: 6, bass: 5, mid: 6, treble: 6, presence: 5 },
        tips: [
          "The original Marshall — based on the Fender Bassman circuit with British voicing",
          "NO master volume — Volume IS your gain control",
          "Warmer and fatter than later Plexis — closer to the Bassman DNA",
          "GZ34 rectifier gives more sag and compression than later silicon-rectified Marshalls",
          "Great for blues rock, classic rock, and roots music",
          "The JTM 45 is the grandfather of all Marshall designs"
        ],
        whatToListenFor: [
          "Warm, fat crunch with a Fender-ish warmth to the low end",
          "More sag and bloom than a Plexi — the tube rectifier at work"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "marshall-jtm45-jumped",
    familyName: "Marshall JTM 45 (Jumped)",
    modelPatterns: ["brit-jm45-jumped"],
    controlLayout: DUAL_VOLUME_PLEXI,
    presets: [
      {
        id: "jtm45-jumped-full",
        style: "Full Classic Rock",
        settings: { volume1: 6, volume2: 7, bass: 5, mid: 6, treble: 6, presence: 5 },
        tips: [
          "Jumped channels on the JTM 45 — both channels linked for fuller tone",
          "Combines the warmth of the Normal channel with the bite of the Treble channel",
          "Rich, complex crunch with the warmth of the original Marshall circuit",
          "Eric Clapton's Bluesbreakers tone was a cranked JTM 45"
        ],
        whatToListenFor: [
          "Rich, full-spectrum crunch with Fender-influenced warmth",
          "Complex harmonic content from both channels interacting"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── MARSHALL JCM 800 ─────────────────────────────────────

  {
    familyId: "marshall-800-high",
    familyName: "Marshall JCM 800 (High Input)",
    modelPatterns: ["brit-800-2204-high", "brit-800-2203-high"],
    controlLayout: JCM800_LAYOUT,
    presets: [
      {
        id: "jcm800-high-classic-rock",
        style: "80s Hard Rock",
        settings: { gain: 5, bass: 4, mid: 7, treble: 7, master: 7, presence: 3, boost: false },
        tips: [
          "The High input is the classic JCM 800 input — bright, aggressive, cutting",
          "Lower preamp gain (4-6) with higher Master (6-7) is the authentic recipe — let the power amp work",
          "Keep Presence LOW (3-5) — this amp has extreme treble boost built into the circuit",
          "Treble at 7-8 is correct — the JCM 800 needs treble to come alive",
          "Boost switch OFF at moderate gain — it adds too much harsh treble peaking",
          "The 2203 is 100W (more headroom), the 2204 is 50W (breaks up earlier)",
          "Pair with 4x12 Greenback for classic rock or Vintage 30 for modern tightness"
        ],
        whatToListenFor: [
          "Aggressive, cutting midrange that defines 80s rock",
          "When the Master is pushed, the treble compresses and the tone fattens up"
        ],
        source: "Yek's Guide / Fractal Wiki / Cliff Chase quotes"
      },
      {
        id: "jcm800-high-boosted",
        style: "Boosted Metal",
        settings: { gain: 6, bass: 3, mid: 8, treble: 7, master: 7, presence: 4, boost: true },
        tips: [
          "A Tubescreamer in front is THE classic JCM 800 trick — low gain, high level on the TS",
          "The Boost switch tightens bass and pushes the preamp into heavier saturation",
          "The Saturation switch enables the Jose Arredondo clipping diode mod for even more gain",
          "Keep bass at 3-4 when boosted — tightens palm mutes dramatically",
          "Increase Damping parameter to add negative feedback and reduce treble boost in power amp",
          "Zakk Wylde, Randy Rhoads, Slash — this is their core sound with a boost"
        ],
        whatToListenFor: [
          "Tight, focused palm mutes with zero flub",
          "The Tube Screamer cuts low-end mud and pushes the mids forward"
        ],
        source: "Yek's Guide / Fractal Forum / Cliff Chase"
      }
    ]
  },

  {
    familyId: "marshall-800-low",
    familyName: "Marshall JCM 800 (Low Input)",
    modelPatterns: ["brit-800-2204-low", "brit-800-2203-low"],
    controlLayout: JCM800_LAYOUT,
    presets: [
      {
        id: "jcm800-low-clean",
        style: "Clean Platform",
        settings: { gain: 5, bass: 5, mid: 5, treble: 5, master: 5, presence: 5, boost: false },
        tips: [
          "The Low input has 6dB less gain than the High input — this is the CLEAN input",
          "Use this for clean tones and light crunch — NOT for high-gain rock or metal",
          "Makes an excellent pedal platform — stays clean with pedals in front",
          "In Fractal, selecting the Low input model is like setting Input Trim to 0.500 on the High input",
          "Great for worship, country, and jazz-influenced rock tones",
          "The darker voicing means less need to fight harshness"
        ],
        whatToListenFor: [
          "Cleaner, darker version of the JCM 800 character",
          "More headroom — the amp cleans up instead of breaking up"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "jcm800-low-crunch",
        style: "Warm Crunch",
        settings: { gain: 8, bass: 5, mid: 6, treble: 5, master: 6, presence: 4, boost: false },
        tips: [
          "Even cranked, the Low input stays tamer than the High input",
          "Good for classic crunch tones without the extreme treble harshness",
          "The darker voicing works well for warmer rock tones — think AC/DC territory",
          "Less bright = less need to tame the Presence"
        ],
        whatToListenFor: [
          "Warmer, less aggressive crunch than the High input",
          "More rounded attack on notes — less 'spitty'"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  {
    familyId: "marshall-800-mod",
    familyName: "Marshall JCM 800 (Modified)",
    modelPatterns: ["brit-800-34", "brit-800-mod", "brit-800-studio-20"],
    controlLayout: JCM800_LAYOUT,
    presets: [
      {
        id: "jcm800-mod-heavy",
        style: "Hot-Rodded Rock",
        settings: { gain: 7, bass: 4, mid: 7, treble: 5, master: 6, presence: 4, boost: true },
        tips: [
          "The Brit 800 #34 has the Santiago mod — same circuit as Slash's SIR #34 amp",
          "The Brit 800 Mod has common JCM 800 mods: treble peaker removed, more gain stages",
          "The Studio 20 is a 20W reissue — same preamp but breaks up earlier due to smaller power section",
          "These modded versions are less harsh than stock — the treble peaker removal is key",
          "Try the Saturation switch for the Jose Arredondo clipping diode mod",
          "Less ice-pick treble makes these more immediately usable than a stock 800"
        ],
        whatToListenFor: [
          "Smoother, more saturated than a stock JCM 800",
          "Less ice-pick treble, more usable gain range"
        ],
        source: "Yek's Guide / Fractal Wiki / Cliff Chase"
      },
      {
        id: "jcm800-mod-slash",
        style: "Slash #34 Rock",
        settings: { gain: 6, bass: 5, mid: 7, treble: 5, master: 7, presence: 3, boost: false },
        tips: [
          "The #34 Santiago mod is what Slash used at SIR Studios — his classic Appetite-era backup amp",
          "Push the Master high for power amp saturation — this is where the fat tone lives",
          "Presence very low — the Santiago mod already has the right treble balance",
          "The mod adds gain stages and removes the treble peaker for smoother saturation"
        ],
        whatToListenFor: [
          "Rich, singing sustain with a smooth top end",
          "Classic rock tone without the harshness of a stock JCM 800"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  // ─── MARSHALL MODERN ───────────────────────────────────────

  {
    familyId: "marshall-afd",
    familyName: "Marshall AFD100 (Slash Signature)",
    modelPatterns: ["brit-afs100", "brit-super"],
    controlLayout: STANDARD_MV_BRIGHT,
    presets: [
      {
        id: "afd-appetite",
        style: "Appetite for Destruction",
        settings: { gain: 6, bass: 5, mid: 7, treble: 5, master: 7, presence: 4, bright: false },
        tips: [
          "The AFD100 is Slash's signature Marshall — based on the modified Super Lead circuit",
          "Channel 1 (brit-afs100-1) is the lower-gain 'appetite' voicing",
          "Channel 2 (brit-afs100-2) has more gain for modern lead tones",
          "Push the Master high — power amp saturation is where the singing sustain lives",
          "Keep Presence conservative — the circuit already has the right top-end balance",
          "Pair with a 4x12 Celestion Vintage 30 or Greenback cab IR"
        ],
        whatToListenFor: [
          "The singing, harmonically rich sustain of the Appetite era",
          "Thick, vocal midrange with smooth saturation"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "marshall-brown",
    familyName: "Marshall Brown Sound",
    modelPatterns: ["brit-brown"],
    controlLayout: STANDARD_MV,
    presets: [
      {
        id: "brown-evh",
        style: "Eddie Van Halen Brown",
        settings: { gain: 7, bass: 5, mid: 7, treble: 6, master: 7, presence: 4 },
        tips: [
          "Custom Fractal model capturing the 'Brown Sound' character",
          "Hot-rodded Plexi voicing with extra gain and saturation — Eddie Van Halen inspired",
          "Increase Supply Sag for the Variac'd feel — saggy, compressed, blooming",
          "Presence moderate to low — the smooth top end is key to the brown sound",
          "This is an idealized version — the best of the Plexi-into-Variac concept"
        ],
        whatToListenFor: [
          "Thick, singing sustain with natural harmonic overtones",
          "The 'brown' quality — warm, saturated, never harsh"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "marshall-jubilee",
    familyName: "Marshall Silver Jubilee",
    modelPatterns: ["brit-silver"],
    controlLayout: STANDARD_MV_BRIGHT,
    presets: [
      {
        id: "jubilee-lead",
        style: "Hot Rod Lead",
        settings: { gain: 8, bass: 8, mid: 8, treble: 6, master: 6, presence: 6, bright: false },
        tips: [
          "The Silver Jubilee is a hot-rodded Marshall with diode clipping",
          "Bass HIGH (8-10) is authentic — Joe Bonamassa runs bass maxed on his Jubilee",
          "Mids high (7-9) — the Jubilee wants lots of midrange, it's not a tight modern amp",
          "Slash used a Jubilee extensively — it's the 'other' Slash amp",
          "The diode clipping adds compression and sustain unique to this model",
          "Alex Lifeson (Rush) also favored the Jubilee — versatile rock machine"
        ],
        whatToListenFor: [
          "Rich, creamy lead tone with more sustain than a stock JCM 800",
          "A tighter, more focused midrange than a Plexi"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "marshall-jvm",
    familyName: "Marshall JVM / Modern",
    modelPatterns: ["brit-jvm", "brit-ap", "brit-2020", "brit-pre", "jmpre-1", "js410"],
    controlLayout: STANDARD_MV_BRIGHT,
    presets: [
      {
        id: "jvm-crunch",
        style: "Modern Crunch",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 6, bright: false },
        tips: [
          "Modern Marshalls have more gain on tap and more versatile EQ",
          "The JVM OD1 Orange channel is many players' favorite — classic 800-style crunch",
          "The OD2 channels have more aggressive, modern voicing",
          "Joe Satriani's JS410 models are tuned for expressive lead work",
          "These amps respond well to the Bright switch at lower gain settings"
        ],
        whatToListenFor: [
          "Tighter, more refined Marshall crunch with modern levels of gain",
          "More controlled low end compared to vintage Marshalls"
        ],
        source: "Fractal Wiki / Yek's Guide"
      },
      {
        id: "jvm-lead",
        style: "Modern Lead",
        settings: { gain: 7, bass: 4, mid: 7, treble: 6, master: 6, presence: 5, bright: false },
        tips: [
          "OD2 Red mode is maximum gain — extreme saturation with tight response",
          "The JMP-1 preamp models are the rack version — same Marshall voicing in rack format",
          "Pull bass back at higher gain to maintain tightness and articulation",
          "Great for modern rock, metal, and progressive styles"
        ],
        whatToListenFor: [
          "Saturated, aggressive lead tone with modern Marshall precision",
          "Strong midrange presence that cuts through any mix"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  // ─── EVH 5150-III ──────────────────────────────────────────

  {
    familyId: "evh-5153-blue",
    familyName: "EVH 5150-III (Blue Channel)",
    modelPatterns: ["5153-100w-blue", "5153-100w-stealth-blue", "5153-50w-blue"],
    controlLayout: EVH_5153_LAYOUT,
    presets: [
      {
        id: "5153-blue-clean",
        style: "EVH Clean",
        settings: { gain: 3, bass: 5, mid: 5, treble: 6, master: 5, presence: 5, resonance: 5 },
        tips: [
          "The Blue channel is the clean/crunch channel — Fender-ish cleans with hot-rod capabilities",
          "Different amp from the original Peavey 5150 — the 5150-III is EVH's own design",
          "Low = bass, Mid = mid, High = treble on the real amp",
          "Very versatile from sparkling clean to edge-of-breakup",
          "The Stealth editions have slightly refined high-frequency response",
          "50W version breaks up slightly earlier due to lower wattage"
        ],
        whatToListenFor: [
          "Surprisingly good Fender-influenced clean tones from a high-gain amp",
          "Sparkly, clear, with good headroom at lower gain settings"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "evh-5153-green",
    familyName: "EVH 5150-III (Green Channel)",
    modelPatterns: ["5153-100w-green", "5153-100w-stealth-green"],
    controlLayout: EVH_5153_LAYOUT,
    presets: [
      {
        id: "5153-green-crunch",
        style: "EVH Crunch",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 5, resonance: 5 },
        tips: [
          "The Green channel is medium gain crunch — great for classic rock tones",
          "Bridge between the clean Blue and high-gain Red channels",
          "Rich harmonics with excellent pick dynamics and touch sensitivity",
          "Try pushing the gain to 7 for hard rock crunch territory",
          "The Stealth edition Green has tighter, more modern voicing"
        ],
        whatToListenFor: [
          "Rich, harmonically complex crunch with excellent dynamics",
          "Great clean-to-dirty transition when rolling back guitar volume"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "evh-5153-red",
    familyName: "EVH 5150-III (Red Channel)",
    modelPatterns: ["5153-100w-red", "5153-100w-stealth-red"],
    controlLayout: EVH_5153_LAYOUT,
    presets: [
      {
        id: "5153-red-rhythm",
        style: "Modern Metal Rhythm",
        settings: { gain: 6, bass: 4, mid: 5, treble: 7, master: 5, presence: 7, resonance: 5 },
        tips: [
          "The Red channel is Eddie Van Halen's modern high-gain — tight, aggressive, defined",
          "Keep bass low — the 5150-III has massive low end that can get muddy",
          "Presence high for cut and definition in a band mix",
          "Resonance adds low-end thump — moderate for tight chugs, higher for doom/stoner",
          "Less gain than you think — 5-6 is plenty for crushing rhythm tones",
          "Pair with 4x12 Vintage 30 or similar modern speaker IR"
        ],
        whatToListenFor: [
          "Tight, defined palm mutes with excellent note separation",
          "Modern rock/metal standard with singing lead tones when sustaining"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      },
      {
        id: "5153-red-lead",
        style: "Singing Lead",
        settings: { gain: 7, bass: 5, mid: 6, treble: 5, master: 6, presence: 5, resonance: 5 },
        tips: [
          "For leads, add more mids and reduce treble/presence for smoother top",
          "Push the master higher for more sustain from power amp compression",
          "Rolling back presence prevents fizzy top on lead passages",
          "The Red channel sustains beautifully for legato and tapping techniques",
          "The Stealth Red is tighter and more focused than the standard"
        ],
        whatToListenFor: [
          "Sustained, singing lead tone with enough aggression to cut through",
          "Smooth note transitions with good sustain on bends"
        ],
        source: "Fractal Forum / Yek's Guide"
      }
    ]
  },

  // ─── PEAVEY 5150 / 6505 ───────────────────────────────────

  {
    familyId: "peavey-5150",
    familyName: "Peavey 5150 / 6505",
    modelPatterns: ["pvh-6160"],
    controlLayout: PEAVEY_5150_LAYOUT,
    presets: [
      {
        id: "5150-chug",
        style: "Metal Rhythm",
        settings: { gain: 6, bass: 4, mid: 5, treble: 7, master: 5, resonance: 5, presence: 7, bright: false },
        tips: [
          "The 5150 Block Letter is raw and aggressive — the original",
          "Keep bass LOW — the 5150 has massive low end that gets muddy fast",
          "Resonance adds low-end thump — use it but don't overdo it at 5-6",
          "Bright switch OFF for high gain — it adds fizz and harshness",
          "Less gain than you think — 5-6 is plenty for crushing tones",
          "Killswitch Engage, August Burns Red — the modern metal standard",
          "The 6505+ has a better clean channel and tighter crunch than the original"
        ],
        whatToListenFor: [
          "Crushing, aggressive palm mutes with extreme tightness",
          "Raw, aggressive distortion that sits perfectly for modern metal"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      },
      {
        id: "5150-lead",
        style: "High Gain Lead",
        settings: { gain: 7, bass: 5, mid: 6, treble: 6, master: 6, resonance: 6, presence: 5, bright: false },
        tips: [
          "For leads, add more mids and reduce presence for smoother top end",
          "Push the master slightly higher for more sustain from power amp compression",
          "Rolling back presence prevents fizzy top on lead passages",
          "The 6505+ lead channel is even tighter than the original block letter"
        ],
        whatToListenFor: [
          "Sustained, singing lead tone with enough aggression to cut through",
          "Smooth note transitions with good sustain on bends"
        ],
        source: "Fractal Forum / Yek's Guide"
      }
    ]
  },

  // ─── MESA BOOGIE ───────────────────────────────────────────

  {
    familyId: "mesa-recto",
    familyName: "Mesa/Boogie Rectifier",
    modelPatterns: ["recto", "usa-pre-recto", "thordendal"],
    controlLayout: MESA_RECTO_LAYOUT,
    presets: [
      {
        id: "recto-modern",
        style: "Modern High Gain",
        settings: { gain: 4, bass: 3, mid: 5, treble: 6, master: 6, presence: 7, bold_spongy: "Bold" },
        tips: [
          "Gain LOW (2-4) — Rectifiers have tons of gain on tap, less is more",
          "A Tubescreamer boost in front is THE essential Recto trick — tightens everything up",
          "Bold = silicon rectifier (tighter, more immediate), Spongy = tube rectifier (more sag and compression)",
          "Bass very low (2-4) — Rectos are notorious for flubby bass, start lower than expected",
          "Metallica, Dream Theater, Foo Fighters — the modern high-gain standard",
          "The Recto2 (3-channel) has a more refined circuit than the Recto1 (2-channel)",
          "Orange channel Vintage mode is more mid-forward — better for mix presence"
        ],
        whatToListenFor: [
          "Thick, saturated distortion with a distinctive low-mid growl",
          "Scooped character in the midrange — classic 'Recto' voicing"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      },
      {
        id: "recto-vintage",
        style: "Vintage Spongy",
        settings: { gain: 3, bass: 4, mid: 6, treble: 6, master: 7, presence: 5, bold_spongy: "Spongy" },
        tips: [
          "Spongy mode adds tube rectifier sag and compression — great for feel",
          "Vintage mode has less gain but more dynamic response",
          "More mid-forward than Modern — better for cutting through a mix",
          "Try this for blues-rock, stoner rock, and classic rock tones",
          "Increase Supply Sag in Fractal for even more tube rectifier bloom"
        ],
        whatToListenFor: [
          "More open, dynamic high-gain with better note definition",
          "Sag and compression that responds to pick dynamics"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  {
    familyId: "mesa-mark-iic",
    familyName: "Mesa/Boogie Mark IIC+",
    modelPatterns: ["usa-iic", "usa-jp"],
    controlLayout: MESA_MARK_LAYOUT,
    presets: [
      {
        id: "iic-rhythm",
        style: "IIC+ Thrash/Prog Rhythm",
        settings: {
          gain: 7, bass: 1, mid: 4, treble: 7, master: 5, presence: 4, bright: false,
          eq80: 8, eq240: 6, eq750: 2, eq2200: 6, eq6600: 7
        },
        tips: [
          "The Graphic EQ is ESSENTIAL — without it the Mark IIC+ sounds thin and buzzy",
          "Classic V-curve: 80Hz max boost, 750Hz deep scoop, 6600Hz boost — this IS the tone",
          "Bass at 0-2 in main EQ — the GEQ 80Hz slider adds back the RIGHT bass frequencies",
          "Treble acts as a secondary gain control — higher treble = more cut and aggression",
          "The Mark IIC+ is Metallica Master of Puppets / Dream Theater — THE prog/thrash standard",
          "Pull Treble Shift (Fat switch) for thicker tone — Mesa Lead 2 mode had this engaged by default",
          "Master at 5 gives good power tube compression and midrange — go higher for more saturation"
        ],
        whatToListenFor: [
          "Laser-focused, cutting high-gain with extreme clarity and note definition",
          "Tight, defined palm mutes even during fast alternate picking"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      },
      {
        id: "iic-petrucci",
        style: "Petrucci Style",
        settings: {
          gain: 7, bass: 2, mid: 5, treble: 7, master: 5, presence: 4, bright: false,
          eq80: 6, eq240: 6, eq750: 3, eq2200: 4, eq6600: 5
        },
        tips: [
          "John Petrucci's approach: less extreme V-curve than classic thrash",
          "GEQ nearly flat on upper bands — Petrucci relies more on the preamp voicing",
          "750Hz still scooped but less aggressively — keeps more body for complex chords",
          "JP-2C models are his signature — refined IIC+ with Shred switch for extra gain/compression",
          "Try Master at 5 — Petrucci uses moderate MV for controlled power amp saturation"
        ],
        whatToListenFor: [
          "Articulate, detailed high-gain with excellent chord clarity",
          "Complex voicings stay defined — each note in a chord is audible"
        ],
        source: "Fractal Forum / Yek's Guide / Petrucci settings"
      },
      {
        id: "iic-lead",
        style: "Singing Lead",
        settings: {
          gain: 7, bass: 2, mid: 5, treble: 6, master: 7, presence: 3, bright: false,
          eq80: 5, eq240: 5, eq750: 5, eq2200: 6, eq6600: 5
        },
        tips: [
          "For leads, FLATTEN the V-curve — more mids help you cut through the mix",
          "Push master higher (7-8) for more power tube saturation and singing sustain",
          "Lower presence (3-4) smooths the top for liquid, vocal-like leads",
          "The Mark IIC+ lead tone is legendary — one of the most sought-after sounds ever",
          "Shred switch on JP-2C adds even more gain and compression for effortless sustain"
        ],
        whatToListenFor: [
          "Liquid, singing sustain with a smooth, musical top end",
          "Notes that bloom naturally without harsh fizz — endless sustain"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  {
    familyId: "mesa-mark-iv",
    familyName: "Mesa/Boogie Mark IV",
    modelPatterns: ["usa-lead", "usa-rhythm", "usa-clean", "usa-pre-lead", "usa-pre-rhythm"],
    controlLayout: MESA_MARK_LAYOUT,
    presets: [
      {
        id: "mark-iv-rhythm",
        style: "Mark IV Lead Channel Rhythm",
        settings: {
          gain: 7, bass: 2, mid: 5, treble: 7, master: 4, presence: 4, bright: true,
          eq80: 7, eq240: 5, eq750: 3, eq2200: 6, eq6600: 6
        },
        tips: [
          "The Mark IV is more versatile than the IIC+ — three channels with more EQ range",
          "Bass at 0-2 is standard — the GEQ 80Hz slider handles low-end shaping",
          "Treble high (6.5-8) acts as a secondary gain/aggression control on all Mark amps",
          "Bright switch ON for lead channel rhythm — adds definition and cut",
          "The Mark IV's tone controls are PRE-gain — they shape feel and response, not final tone",
          "GEQ moderate V-curve: less scooped than IIC+ for better mix presence",
          "Master moderate (3-4) — higher MV adds more midrange compression and softer highs"
        ],
        whatToListenFor: [
          "Tight, aggressive rhythm tone with more midrange body than the IIC+",
          "Excellent pick dynamics — the Mark IV responds to every nuance"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      },
      {
        id: "mark-iv-lead",
        style: "Mark IV Smooth Lead",
        settings: {
          gain: 7, bass: 2, mid: 6, treble: 7, master: 5, presence: 3, bright: false,
          eq80: 6, eq240: 5, eq750: 4, eq2200: 6, eq6600: 5
        },
        tips: [
          "For leads, flatten the V-curve — more 750Hz keeps body and sustain",
          "Bright switch OFF for leads — smoother top end, less fizz",
          "Push master to 5 for more power tube saturation and singing quality",
          "Lower presence (3) smooths out the top for effortless legato",
          "The Mark IV lead channel is warmer and more forgiving than the IIC+"
        ],
        whatToListenFor: [
          "Warm, sustaining lead tone with musical compression",
          "Smooth note-to-note transitions without harshness"
        ],
        source: "Yek's Guide / Fractal Forum"
      },
      {
        id: "mark-iv-clean",
        style: "Mark IV Clean",
        settings: {
          gain: 3, bass: 3, mid: 6, treble: 6, master: 4, presence: 5, bright: true,
          eq80: 5, eq240: 5, eq750: 5, eq2200: 5, eq6600: 5
        },
        tips: [
          "The Mark IV clean channel is rich and full — better than most dedicated clean amps",
          "GEQ flat for clean — let the natural voicing come through",
          "Bright switch ON adds sparkle and shimmer to the clean tone",
          "Great for jazz, worship, and clean studio work",
          "The clean channel responds beautifully to dynamics — quiet picking stays crystal clear"
        ],
        whatToListenFor: [
          "Full, rich clean tone with excellent depth and dimension",
          "Sparkly highs with warm lows — the complete clean package"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "mesa-mark-v",
    familyName: "Mesa/Boogie Mark V",
    modelPatterns: ["usa-mk-v"],
    controlLayout: MESA_MARK_LAYOUT,
    presets: [
      {
        id: "mark-v-iic-mode",
        style: "Mark V IIC+ Mode",
        settings: {
          gain: 7, bass: 2, mid: 3, treble: 8, master: 7, presence: 5, bright: false,
          eq80: 7, eq240: 3, eq750: 2, eq2200: 8, eq6600: 7
        },
        tips: [
          "Red Channel IIC+ mode replicates the legendary Mark IIC+ circuit",
          "Aggressive V-curve GEQ: deep 750Hz scoop with boosted extremes — this is the classic sound",
          "Bass at 1-2, Treble at 7-8 — low bass in main EQ, let the GEQ shape the bottom",
          "Dream Theater, Metallica — this mode captures the classic IIC+ character",
          "The Mark V IIC+ mode captures the classic IIC+ circuit topology"
        ],
        whatToListenFor: [
          "Laser-focused, cutting high-gain with the IIC+ signature",
          "Detailed note articulation even during fast, complex passages"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      },
      {
        id: "mark-v-iv-mode",
        style: "Mark V Mark IV Mode",
        settings: {
          gain: 6, bass: 2, mid: 5, treble: 7, master: 5, presence: 4, bright: true,
          eq80: 6, eq240: 5, eq750: 3, eq2200: 6, eq6600: 6
        },
        tips: [
          "Mark IV mode has tighter, more modern voicing than the IIC+ mode",
          "Bright switch ON is standard for Mark IV mode — adds definition",
          "Moderate V-curve GEQ: less extreme scoop for better mix presence",
          "More compressed feel than IIC+ — better for tight, chunky rhythm work",
          "More midrange body makes this better for rhythm work in a band context"
        ],
        whatToListenFor: [
          "Tighter, more modern voicing compared to IIC+ mode",
          "Better midrange presence for cutting through dense mixes"
        ],
        source: "Yek's Guide / Fractal Forum"
      },
      {
        id: "mark-v-extreme",
        style: "Mark V Extreme Mode",
        settings: {
          gain: 8, bass: 1, mid: 4, treble: 8, master: 5, presence: 5, bright: true,
          eq80: 7, eq240: 7, eq750: 1, eq2200: 7, eq6600: 7
        },
        tips: [
          "Extreme mode is the highest gain Mark V mode — maximum saturation",
          "The deepest V-curve: 750Hz maxed out in cut, everything else boosted",
          "Bass at 1 in main EQ is standard — the GEQ provides all the low end",
          "Bright switch ON with Extreme mode is the Petrucci extreme V approach",
          "This is modern prog metal territory — extreme gain with extreme clarity"
        ],
        whatToListenFor: [
          "Maximum saturation with the deepest mid scoop",
          "Extreme gain that somehow stays tight and articulate"
        ],
        source: "Fractal Forum / Mesa Boogie Forum / Yek's Guide"
      },
      {
        id: "mark-v-crunch",
        style: "Mark V Crunch (Green)",
        settings: {
          gain: 5, bass: 3, mid: 6, treble: 6, master: 5, presence: 5, bright: false,
          eq80: 5, eq240: 5, eq750: 4, eq2200: 6, eq6600: 5
        },
        tips: [
          "Green channel crunch mode — excellent for classic rock and blues",
          "Milder V-curve or nearly flat GEQ — let the preamp voicing shine",
          "The Mark V's crunch is more versatile than dedicated crunch amps",
          "Great for vintage rock tones with the Mark series' characteristic clarity"
        ],
        whatToListenFor: [
          "Rich, musical crunch with the Mark series clarity",
          "Excellent clean-up when rolling back guitar volume"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "mesa-lonestar",
    familyName: "Mesa/Boogie Lone Star",
    modelPatterns: ["lone-star", "texas-star"],
    controlLayout: STANDARD_MV,
    presets: [
      {
        id: "lonestar-clean",
        style: "Boutique Clean",
        settings: { gain: 3, bass: 5, mid: 6, treble: 6, master: 5, presence: 5 },
        tips: [
          "The Lone Star excels at clean and low-gain tones — Mesa's clean machine",
          "Channel 1 is pure clean, Channel 2 adds more gain staging",
          "Great for country, jazz, and worship music",
          "The Lead channel has a warmer, more singing overdrive character",
          "One of the most touch-sensitive Mesa designs"
        ],
        whatToListenFor: [
          "Rich, full-bodied clean tone with excellent depth and dimension",
          "Warm, 3D quality that sits beautifully in a mix"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "mesa-triple-crown",
    familyName: "Mesa Triple Crown",
    modelPatterns: ["triple-crest"],
    controlLayout: MESA_TC_LAYOUT,
    presets: [
      {
        id: "tc-crunch",
        style: "Versatile Crunch",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 5, voicing: "Normal" },
        tips: [
          "The Triple Crown is Mesa's most versatile modern design",
          "Voicing switch: Tight = focused lows, Normal = balanced, Loose = full/open",
          "Channel 2 is the sweet spot — great crunch to medium gain",
          "Channel 3 has more gain for modern rock and metal",
          "British-inspired voicing with Mesa build quality"
        ],
        whatToListenFor: [
          "A refined, modern rock tone that works across multiple genres",
          "Excellent clean-to-dirty transition when rolling back guitar volume"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "mesa-metro",
    familyName: "Mesa Subway Blues",
    modelPatterns: ["usa-metro"],
    controlLayout: STANDARD_MV,
    presets: [
      {
        id: "metro-blues",
        style: "Compact Blues",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 5 },
        tips: [
          "Compact Mesa combo with EL84 power tubes — warm, bluesy character",
          "Great for smaller venues and studio recording",
          "More British-flavored than typical Mesa amps due to EL84 tubes",
          "Excellent for blues, roots, and classic rock at manageable volumes"
        ],
        whatToListenFor: [
          "Warm, bluesy crunch with EL84 compression",
          "Great at lower volumes — the EL84s break up earlier"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── SOLDANO ───────────────────────────────────────────────

  {
    familyId: "soldano",
    familyName: "Soldano SLO / X88 / X99",
    modelPatterns: ["solo", "cameron-chs"],
    controlLayout: SOLDANO_LAYOUT,
    presets: [
      {
        id: "slo-crunch",
        style: "Hot Rod Crunch",
        settings: { gain: 4, bass: 5, mid: 6, treble: 6, master: 6, presence: 4, bright: true, depth: false },
        tips: [
          "The SLO-100 was one of the first modern high-gain amps — 1987",
          "Low gain (3-4) with HIGH master (6-6.5) is the SLO sweet spot — power amp does the work",
          "Bright switch ON is standard for the crunch channel — opens up the top end",
          "Presence moderate (4-5) — the SLO can get harsh if cranked",
          "Eric Clapton, Mark Knopfler, Lou Reed — more versatile than you'd think"
        ],
        whatToListenFor: [
          "Refined, muscular crunch with excellent note articulation",
          "A 'hot-rodded Plexi' character — Marshall DNA with modern refinement"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "slo-overdrive",
        style: "High Gain Lead",
        settings: { gain: 4, bass: 5, mid: 6, treble: 6, master: 6, presence: 4, bright: false, depth: true },
        tips: [
          "The SLO overdrive/lead channel is THE benchmark for smooth high-gain leads",
          "Even on the lead channel, gain 3-5 is plenty — the SLO has massive gain on tap",
          "Depth switch ON adds low-end resonance for thicker, fuller leads",
          "The SLO defines 'liquid' — notes flow and sustain effortlessly",
          "Bass setting varies widely (4-9 on the real amp) — experiment to taste"
        ],
        whatToListenFor: [
          "Smooth, liquid high-gain that sustains forever",
          "Harmonics that bloom naturally with a vocal quality"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  // ─── FRIEDMAN ──────────────────────────────────────────────

  {
    familyId: "friedman-be",
    familyName: "Friedman BE / HBE",
    modelPatterns: ["friedman-be", "friedman-hbe", "friedman-small"],
    controlLayout: FRIEDMAN_BE_LAYOUT,
    presets: [
      {
        id: "friedman-be-rock",
        style: "Hot Rod Marshall",
        settings: { gain: 4, bass: 4, mid: 7, treble: 6, master: 3, presence: 5, bright: false, sat: false, fat: false, voicing: "V1" },
        tips: [
          "Dave Friedman's amps are hot-rodded Marshalls with modern refinements",
          "Lower gain (3.5-5) and LOW master (3-3.5) is the Friedman sweet spot — the low MV opens up the tone",
          "SAT switch changes gain structure — OFF is more open and dynamic, ON is more saturated and compressed",
          "Voicing switch (V1/V2/V3) selects different circuit voicings — V1 is the original, V2 is refined, V3 is the most modern",
          "Fat switch adds low-end depth and midrange body — great for drop tuning",
          "Dynamic Presence at +2.00 in Fractal Advanced is the 'money control' for articulation",
          "The HBE has even more gain — for when the BE isn't enough",
          "The Smallbox is more Marshall-like with a tighter, more vintage character"
        ],
        whatToListenFor: [
          "The best of Marshall with modern tightness and clarity",
          "Rich, harmonically complex crunch that stays articulate at any gain"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "friedman-be-heavy",
        style: "Modern High Gain",
        settings: { gain: 5, bass: 3, mid: 7, treble: 7, master: 3, presence: 5, bright: false, sat: true, fat: false, voicing: "V1" },
        tips: [
          "SAT ON adds clipping for more compression and sustain",
          "Even with SAT, keep gain moderate (4-6) — the amp has tons of gain already",
          "Try Fat switch ON for drop tuning — adds low-end depth without muddiness",
          "Keep bass very low (3-4) with SAT ON to maintain tightness",
          "Try V2 or V3 voicing for a more refined, modern feel",
          "The HBE model has even more gain on tap for extreme metal"
        ],
        whatToListenFor: [
          "Saturated, compressed high-gain with excellent note definition",
          "Tight palm mutes with the modern Marshall character"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  {
    familyId: "friedman-dirty-shirley",
    familyName: "Friedman Dirty Shirley",
    modelPatterns: ["dirty-shirley"],
    controlLayout: STANDARD_MV_BRIGHT,
    presets: [
      {
        id: "dirty-shirley-crunch",
        style: "Vintage Classic Rock",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 6, presence: 5, bright: false },
        tips: [
          "Friedman's Plexi/JTM-45 inspired design — lower gain than the BE but richer tone",
          "Cleans up beautifully with guitar volume — incredibly touch-sensitive",
          "Vintage classic rock character — less gain, more dynamics",
          "Model 1 has slightly less gain than Model 2 — both are excellent",
          "Great for blues, classic rock, and roots — think Hendrix-into-Marshall territory"
        ],
        whatToListenFor: [
          "Rich, fat crunch with excellent clean-up when rolling back guitar volume",
          "Vintage Marshall character with modern refinement and reliability"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "dirty-shirley-edge",
        style: "Edge of Breakup",
        settings: { gain: 3, bass: 5, mid: 6, treble: 6, master: 7, presence: 5, bright: true },
        tips: [
          "The Dirty Shirley shines at low gain — the touch sensitivity is extraordinary",
          "Master higher (6-7) for power tube warmth while keeping preamp clean",
          "Bright switch ON at low gain adds sparkle without harshness",
          "Roll guitar volume to 7-8 for sparkling clean, dig in for gritty crunch",
          "This is the Dirty Shirley's sweet spot — few amps do edge-of-breakup this well"
        ],
        whatToListenFor: [
          "The magical transition zone between clean and dirty",
          "Every change in pick attack produces a different shade of tone"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  // ─── CAMERON ───────────────────────────────────────────────

  {
    familyId: "cameron-ccv",
    familyName: "Cameron CCV",
    modelPatterns: ["cameron-ccv"],
    controlLayout: CAMERON_CCV_LAYOUT,
    presets: [
      {
        id: "ccv-crunch",
        style: "Hot-Rodded Plexi Crunch",
        settings: { gain: 5, bass: 5, mid: 7, treble: 6, master: 6, presence: 5, bright: false },
        tips: [
          "Mark Cameron's hot-rodded Marshall with Plexi heritage",
          "Channel 1 (A/B) = clean to mild crunch. Channel 2 (A/B/C/D) = progressive gain levels",
          "Channel 2D is the maximum gain setting — crushing high-gain",
          "The CCV bridges the gap between vintage Plexi feel and modern high-gain",
          "Open, dynamic, incredibly touch-sensitive at lower gain settings"
        ],
        whatToListenFor: [
          "Plexi-rooted crunch with more gain and tightness on tap",
          "Dynamic response that rewards expressive picking"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "ccv-high-gain",
        style: "Cameron High Gain",
        settings: { gain: 7, bass: 4, mid: 7, treble: 6, master: 6, presence: 4, bright: false },
        tips: [
          "Channel 2C and 2D are the high-gain modes — thick, saturated, aggressive",
          "Pull bass back for tighter palm mutes at high gain",
          "The Cameron mod is essentially a complete preamp redesign over Plexi topology",
          "Less bright and harsh than a stock JCM 800 — the Cameron mods tame the treble"
        ],
        whatToListenFor: [
          "Thick, saturated high-gain with Plexi-rooted character",
          "Tight, focused response that retains Marshall midrange growl"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  {
    familyId: "cameron-atomica",
    familyName: "Cameron Atomica",
    modelPatterns: ["atomica"],
    controlLayout: STANDARD_MV_BRIGHT,
    presets: [
      {
        id: "atomica-aggressive",
        style: "Modern Aggressive",
        settings: { gain: 6, bass: 4, mid: 7, treble: 6, master: 5, presence: 6, bright: false },
        tips: [
          "The Atomica is Cameron's modern high-gain design — tight, aggressive, precise",
          "High channel has more gain on tap, Low channel is more crunch-oriented",
          "Great for modern rock and metal with excellent palm mute response",
          "Cameron amps are some of the most sought-after boutique high-gain amps"
        ],
        whatToListenFor: [
          "Tight, aggressive high-gain with excellent precision",
          "Strong midrange presence that cuts through dense mixes"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── BOGNER ────────────────────────────────────────────────

  {
    familyId: "bogner-ecstasy",
    familyName: "Bogner Ecstasy",
    modelPatterns: ["euro-blue", "euro-red"],
    controlLayout: BOGNER_LAYOUT,
    presets: [
      {
        id: "bogner-crunch",
        style: "Boutique Crunch",
        settings: { gain: 5, bass: 3, mid: 4, treble: 6, master: 5, presence: 7, bright: false, structure: "Open" },
        tips: [
          "Bogner Ecstasy blends Marshall aggression with American warmth",
          "Presence HIGH (7-8+) is critical on the Ecstasy — it shapes the top-end magic, crank it",
          "Bass LOW (3-3.5) — the Ecstasy has a lot of low end built in",
          "Structure switch: Tight = tighter low end, Open = fuller, more organic",
          "The Blue channel is Plexi-like crunch, Red is high gain",
          "Try Bright ON at lower gains, OFF at higher gains"
        ],
        whatToListenFor: [
          "Refined, articulate crunch with a touch of American smoothness",
          "Complex harmonics with excellent string-to-string separation"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "bogner-highgain",
        style: "High Gain Lead",
        settings: { gain: 7, bass: 3, mid: 4, treble: 6, master: 6, presence: 8, bright: false, structure: "Tight" },
        tips: [
          "Red channel is a high-gain monster with incredible feel and articulation",
          "Presence CRANKED (7-8+) — this is where the Bogner magic lives",
          "Bass LOW even at high gain — the Ecstasy generates plenty of bottom",
          "Structure = Tight keeps the low end focused for metal rhythm",
          "It tracks fast riffs better than most high-gain amps"
        ],
        whatToListenFor: [
          "Articulate high-gain that retains clarity even at extreme settings",
          "Smooth compression that enhances sustain without killing dynamics"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  {
    familyId: "bogner-uber",
    familyName: "Bogner Uberschall",
    modelPatterns: ["euro-uber"],
    controlLayout: BOGNER_LAYOUT,
    presets: [
      {
        id: "uber-metal",
        style: "Heavy Metal Rhythm",
        settings: { gain: 5, bass: 6, mid: 6, treble: 6, master: 5, presence: 6, bright: false, structure: "Tight" },
        tips: [
          "The Uberschall is Bogner's high-gain monster — extremely tight bass circuit",
          "Bass can go HIGHER than expected (5-7) — the circuit is so tight it handles bass without flub",
          "EL34 power tubes give it a more aggressive, British-flavored character",
          "Structure = Tight for metal rhythm, Open for more organic, breathing leads",
          "Less gain than you think — 5-6 is plenty for crushing tones",
          "Rev.Blue version has more low end and smoother gain than the original"
        ],
        whatToListenFor: [
          "Extremely tight, aggressive high-gain with surgical bass control",
          "Palm mutes that feel percussive and defined, never loose or flubby"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      },
      {
        id: "uber-lead",
        style: "Uberschall Lead",
        settings: { gain: 6, bass: 5, mid: 7, treble: 5, master: 6, presence: 5, bright: false, structure: "Open" },
        tips: [
          "Structure = Open for leads — adds breathing room and organic feel",
          "More mids (6-7) help leads cut through and sustain",
          "Lower treble and presence for a smoother, less aggressive lead tone",
          "Push the master for more power tube saturation and singing sustain"
        ],
        whatToListenFor: [
          "Thick, saturated lead tone that sustains effortlessly",
          "The Bogner refinement — smooth even at extreme gain levels"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  {
    familyId: "bogner-shiva",
    familyName: "Bogner Shiva",
    modelPatterns: ["shiver"],
    controlLayout: STANDARD_MV_BRIGHT,
    presets: [
      {
        id: "shiva-clean",
        style: "Crystal Clean",
        settings: { gain: 3, bass: 5, mid: 6, treble: 6, master: 5, presence: 5, bright: true },
        tips: [
          "The Shiva's clean channel has crystalline, bell-like cleans with EL34 warmth",
          "Bright switch ON at low gain adds sparkle without harsh edges",
          "One of the best clean tones in the Fractal library — boutique and refined",
          "The Shiva is NOT a metal amp — it excels at clean, crunch, and smooth lead"
        ],
        whatToListenFor: [
          "Bell-like clean tones with EL34 warmth and shimmer",
          "A refined European character that sits beautifully in a mix"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "shiva-lead",
        style: "Smooth Crunch/Lead",
        settings: { gain: 6, bass: 5, mid: 6, treble: 6, master: 6, presence: 5, bright: false },
        tips: [
          "The Shiva's lead channel is smooth and creamy — not aggressive or harsh",
          "Gain 5-6 is the sweet spot — enough saturation without losing dynamics",
          "Bright switch OFF for lead — keeps the top end smooth and musical",
          "Excellent for classic rock, blues-rock, and smooth lead work",
          "The Shiva cleans up beautifully with guitar volume — incredibly responsive"
        ],
        whatToListenFor: [
          "Smooth, creamy saturation with excellent note bloom",
          "Touch-sensitive dynamics — light picking cleans up, hard attack drives the amp"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  {
    familyId: "bogner-fish",
    familyName: "Bogner Fish Preamp",
    modelPatterns: ["bogfish"],
    controlLayout: STANDARD_MV,
    presets: [
      {
        id: "bogfish-warm",
        style: "Boutique Preamp",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 5 },
        tips: [
          "Bogner Fish preamp — rich, complex harmonic content",
          "Brown channel is warm, saturated overdrive",
          "Strato channel is brighter, more Fender-inspired voicing",
          "Great for recording — boutique preamp character without a power amp"
        ],
        whatToListenFor: [
          "Rich, complex harmonic content with warm saturation",
          "Boutique preamp character with excellent articulation"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── DIEZEL ────────────────────────────────────────────────

  {
    familyId: "diezel-vh4",
    familyName: "Diezel VH4",
    modelPatterns: ["dizzy-v4", "das-metall"],
    controlLayout: DIEZEL_VH4_LAYOUT,
    presets: [
      {
        id: "diezel-modern",
        style: "Modern Metal",
        settings: { gain: 6, bass: 7, mid: 5, treble: 6, master: 6, presence: 8, deep: 5 },
        tips: [
          "Diezel amps are tight, aggressive, and incredibly detailed — German precision",
          "Bass HIGHER than expected (6-8) — Diezels have a naturally tight circuit that handles bass well",
          "Presence crank it (7-8+) — the VH4 needs presence to come alive and cut through",
          "Deep control at 4-7 adds low-end thump without muddiness due to the tight circuit",
          "Blue channel is clean, Silver is gain — multiple gain positions via number suffix",
          "Das Metall is modeled from VH4 schematics — a community metal favorite",
          "Pair with 4x12 Vintage 30 for the classic Diezel experience"
        ],
        whatToListenFor: [
          "Extremely tight, articulate high-gain with pristine clarity",
          "Machine-gun palm mutes with zero flub in the low end"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "diezel-herbert",
    familyName: "Diezel Herbert",
    modelPatterns: ["herbie"],
    controlLayout: DIEZEL_VH4_LAYOUT,
    presets: [
      {
        id: "herbert-crunch",
        style: "Versatile Crunch",
        settings: { gain: 5, bass: 6, mid: 6, treble: 6, master: 5, presence: 7, deep: 4 },
        tips: [
          "The Herbert is tighter and more versatile than the VH4",
          "Same Diezel approach: bass higher (5-7), presence cranked (6-8)",
          "Channel 2 has + and - modes for different gain levels",
          "MKIII revision has updated circuit with refined gain structure",
          "Herbert has more midrange flexibility than the VH4"
        ],
        whatToListenFor: [
          "Tight, precise crunch with German engineering precision",
          "More midrange flexibility than the VH4 — versatile across genres"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "herbert-highgain",
        style: "Channel 3 High Gain",
        settings: { gain: 6, bass: 7, mid: 5, treble: 6, master: 6, presence: 8, deep: 5 },
        tips: [
          "Channel 3 is the high-gain lead channel — smooth and saturated",
          "Bass at 6-7 and presence cranked (7-8+) — same philosophy as the VH4",
          "Deep at 4-6 adds low-end thump that the tight circuit keeps controlled",
          "Less gain than you think — 5-6 is plenty for extreme high-gain tones",
          "The Herbert's Ch3 is smoother and more refined than the VH4's highest gain"
        ],
        whatToListenFor: [
          "Saturated, focused high-gain with the Diezel signature tightness",
          "Smooth lead tones that sustain effortlessly without fizz"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  // ─── ENGL ──────────────────────────────────────────────────

  {
    familyId: "engl",
    familyName: "ENGL Savage / Powerball",
    modelPatterns: ["angle", "energyball"],
    controlLayout: ENGL_LAYOUT,
    presets: [
      {
        id: "engl-lead",
        style: "Modern Lead",
        settings: { gain: 6, bass: 5, mid: 6, treble: 6, master: 5, presence: 6, bright: false, contour: false },
        tips: [
          "ENGL amps are known for extremely tight, focused high-gain tones",
          "The Contour switch scoops the midrange — keep it OFF for better mix presence",
          "Turn Contour ON for solo/bedroom playing where scooped tones sound bigger",
          "The Savage is more aggressive, the Powerball is more versatile with 4 channels",
          "Great for progressive metal, djent, and technical playing"
        ],
        whatToListenFor: [
          "Tight, compressed high-gain with excellent note articulation",
          "Strong upper-mid presence that helps cut through dense mixes"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "engl-rhythm",
        style: "Tight Metal Rhythm",
        settings: { gain: 5, bass: 4, mid: 7, treble: 6, master: 5, presence: 7, bright: false, contour: false },
        tips: [
          "For rhythm, keep gain moderate (5-6) — ENGL amps have massive gain on tap",
          "Higher mids (6-7) give rhythm parts presence and definition in a mix",
          "Bass moderate (4-5) — ENGL bass can get boomy if pushed too high",
          "Presence high (6-7) helps the pick attack cut through for tight chugging",
          "The Savage 120 is THE rhythm amp for European metal — Dimmu Borgir, Meshuggah"
        ],
        whatToListenFor: [
          "Extremely tight palm mutes with percussive attack",
          "Every note in a riff stays defined even at speed"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  // ─── DUMBLE ────────────────────────────────────────────────

  {
    familyId: "dumble",
    familyName: "Dumble ODS / Bludojai",
    modelPatterns: ["ods-100", "bludojai"],
    controlLayout: DUMBLE_ODS_LAYOUT,
    presets: [
      {
        id: "dumble-clean",
        style: "Boutique Clean",
        settings: { gain: 4, overdrive: 0, bass: 5, mid: 5, treble: 5, master: 10, presence: 5, pab: false },
        tips: [
          "The ODS-100 clean is Fender-derived but richer and more three-dimensional",
          "Master Volume at 10 is how Dumbles are meant to be played — the power amp IS the tone",
          "OD knob controls the overdrive channel gain — set to 0 for clean",
          "PAB (Pre Amp Boost) switch adds gain staging — leave OFF for clean",
          "Use Input Drive (gain) and guitar volume to control your level, not the master",
          "The Bludojai models are based on the Dumble SSS/Steel String Singer variant"
        ],
        whatToListenFor: [
          "Rich, three-dimensional clean that sounds 'expensive'",
          "Incredible depth and dimension compared to a standard Fender clean"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "dumble-overdrive",
        style: "Smooth Overdrive",
        settings: { gain: 3, overdrive: 6, bass: 5, mid: 6, treble: 5, master: 10, presence: 5, pab: true },
        tips: [
          "The overdrive channel is smooth, creamy, and incredibly musical",
          "Master at 10, Drive LOW (2-4) — use guitar volume for dynamics, not the amp controls",
          "PAB ON + OD dial at 5-7 = the classic Dumble lead tone",
          "The amp responds to guitar volume changes like no other — this is the magic",
          "Robben Ford, Larry Carlton, Carlos Santana territory"
        ],
        whatToListenFor: [
          "Creamy, vocal-like overdrive that sings and sustains",
          "Zero harshness or fizz — just pure, musical distortion"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  // ─── ORANGE ────────────────────────────────────────────────

  {
    familyId: "orange",
    familyName: "Orange (Citrus Series)",
    modelPatterns: ["citrus"],
    controlLayout: STANDARD_MV,
    presets: [
      {
        id: "orange-dirty",
        style: "Dirty Rock",
        settings: { gain: 6, bass: 5, mid: 6, treble: 5, master: 6, presence: 5 },
        tips: [
          "Orange amps have a distinctive thick, chewy midrange — the '70s British rock sound",
          "The OR series (OR120) has no master volume — cranked is the only way to get the tone",
          "The Rockerverb has a master volume and more versatility — cleans to high gain",
          "Treble moderate (5) — Orange amps can get harsh with treble above noon",
          "Orange amps are mid-heavy by design — they cut through naturally, don't scoop mids",
          "Stoner rock, doom metal, classic rock — Black Sabbath, Sleep, High on Fire territory"
        ],
        whatToListenFor: [
          "Thick, chewy midrange with a warm, almost fuzzy breakup character",
          "Chunky, percussive palm mutes with a woolly low end"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "orange-crunch",
        style: "Classic Orange Crunch",
        settings: { gain: 4, bass: 5, mid: 7, treble: 5, master: 7, presence: 5 },
        tips: [
          "Push the master and lower the gain for more power amp breakup character",
          "Mids higher (6-7) — this is what gives Orange its signature voice",
          "The OR-series sound is ALL about the power amp — crank it",
          "Excellent for blues-rock and classic rock with a distinctly British flavor"
        ],
        whatToListenFor: [
          "Rich, harmonically complex crunch that responds to pick dynamics",
          "The distinctive Orange 'growl' in the midrange"
        ],
        source: "Fractal Forum / Yek's Guide"
      }
    ]
  },

  // ─── MATCHLESS / BAD CAT ───────────────────────────────────

  {
    familyId: "matchless",
    familyName: "Matchless / Bad Cat (Class-A)",
    modelPatterns: ["matchbox"],
    controlLayout: {
      knobs: [
        { id: "volume", label: "Volume" },
        { id: "bass", label: "Bass" },
        { id: "treble", label: "Treble" },
        { id: "cut", label: "Cut" },
        { id: "master", label: "Master" },
      ],
      switches: [],
    },
    presets: [
      {
        id: "matchless-clean",
        style: "Boutique Clean",
        settings: { volume: 4, bass: 5, treble: 6, cut: 3, master: 5 },
        tips: [
          "Matchless amps combine Vox-like chime with more headroom and refinement",
          "The DC30 and HC30 are the flagships — chimey, responsive, musical",
          "Cut maps to Presence in Fractal (same as AC30) — below noon darkens, above noon brightens",
          "Cut at 3 keeps the sparkle; raise to 5+ when cranking volume to tame harshness",
          "Great for indie, jangly pop, and worship clean tones",
          "The EF86-based models have a different preamp character — more gain and warmth"
        ],
        whatToListenFor: [
          "Vox-like chime with more body, depth, and refinement",
          "Natural compression that makes clean tones feel alive"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── REVV ──────────────────────────────────────────────────

  {
    familyId: "revv",
    familyName: "REVV Generator",
    modelPatterns: ["revv"],
    controlLayout: REVV_LAYOUT,
    presets: [
      {
        id: "revv-purple",
        style: "Modern High Gain",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 6, aggression: "Off" },
        tips: [
          "REVV amps are extremely responsive and tight modern high-gain designs",
          "The Aggression switch: OFF = tighter/more controlled, ON = more aggressive/scooped",
          "Purple channel is the high-gain monster — incredibly detailed",
          "Try Aggression ON for thrash/death metal, OFF for progressive/modern metal"
        ],
        whatToListenFor: [
          "Pristine, detailed high-gain with excellent pick dynamics",
          "Clarity in complex chord voicings even at high gain settings"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "revv-aggressive",
        style: "Aggressive Metal",
        settings: { gain: 6, bass: 4, mid: 5, treble: 7, master: 5, presence: 7, aggression: "On" },
        tips: [
          "Aggression ON scoops mids slightly and adds a more aggressive attack",
          "Great for fast riffing and thrash styles",
          "Keep bass low when Aggression is ON — it adds low-end energy"
        ],
        whatToListenFor: [
          "More aggressive, scooped character with faster attack",
          "Percussive palm mutes with extra bite and aggression"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  // ─── SPLAWN ────────────────────────────────────────────────

  {
    familyId: "splawn",
    familyName: "Splawn (Spawn Series)",
    modelPatterns: ["spawn"],
    controlLayout: STANDARD_MV_BRIGHT,
    presets: [
      {
        id: "splawn-nitrous",
        style: "Aggressive Rock/Metal",
        settings: { gain: 6, bass: 5, mid: 7, treble: 6, master: 6, presence: 6, bright: false },
        tips: [
          "Splawn amps are hot-rodded Marshalls with more gain and tighter bass",
          "The Nitrous has a raw, aggressive character — more gain than the Quickrod",
          "The Quick Rod has multiple OD modes for progressive gain levels",
          "OD1 channels are lower gain, OD2 channels are high gain",
          "Great for aggressive rock, punk, metalcore, and modern metal"
        ],
        whatToListenFor: [
          "Raw, aggressive Marshall-derived tone with more tightness",
          "Punchy, in-your-face character that cuts through any mix"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── FRYETTE / VHT ─────────────────────────────────────────

  {
    familyId: "fryette",
    familyName: "Fryette / VHT",
    modelPatterns: ["fryette", "pittbull"],
    controlLayout: STANDARD_MV_BRIGHT_DEPTH,
    presets: [
      {
        id: "fryette-ultra",
        style: "Modern Lead",
        settings: { gain: 6, bass: 5, mid: 6, treble: 6, master: 6, presence: 5, bright: false, depth: false },
        tips: [
          "Fryette (formerly VHT) amps are smooth, refined high-gain machines",
          "The Pittbull Ultra Lead is legendary for smooth, singing leads",
          "The D60 is tighter and more focused than the Pittbull — great for rhythm",
          "Depth switch adds low-end resonance — try ON for solo work",
          "Bright switch adds top-end sparkle — useful at lower gain settings"
        ],
        whatToListenFor: [
          "Smooth, refined high-gain with excellent sustain",
          "A singing quality on lead lines that few other amps achieve"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── TRAINWRECK ────────────────────────────────────────────

  {
    familyId: "trainwreck",
    familyName: "Trainwreck (Wrecker Series)",
    modelPatterns: ["wrecker"],
    controlLayout: TRAINWRECK_LAYOUT,
    presets: [
      {
        id: "wreck-express",
        style: "Dynamic Crunch",
        settings: { volume: 6, bass: 5, mid: 6, treble: 6, cut: 4 },
        tips: [
          "Trainwreck amps are among the most coveted boutique amps ever made",
          "No master volume — the Volume IS your gain control",
          "Cut maps to Presence in Fractal — below noon = darken (authentic), above noon = brighten",
          "The Express is Vox-meets-Marshall, Liverpool is more Vox-like, Rocket is more Marshall-like",
          "Low wattage, high expressiveness — these want to be played hard",
          "Supply Sag is critical for the Trainwreck feel — they sag beautifully"
        ],
        whatToListenFor: [
          "Extraordinary touch sensitivity — the amp reacts to every nuance",
          "Complex harmonic content that evolves with pick dynamics"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── HIWATT ────────────────────────────────────────────────

  {
    familyId: "hiwatt",
    familyName: "Hiwatt (Hipower Series)",
    modelPatterns: ["hipower"],
    controlLayout: HIWATT_LAYOUT,
    presets: [
      {
        id: "hiwatt-clean",
        style: "Powerful Clean",
        settings: { volume: 5, bass: 5, mid: 6, treble: 6, presence: 6, bright: false },
        tips: [
          "Hiwatt amps have massive clean headroom — stay clean at deafening volumes",
          "No master volume — the Volume is your only gain control",
          "The Bright switch in Fractal simulates the Brilliant input (vs Normal input)",
          "Pete Townshend, David Gilmour — power and clarity",
          "The Hiwatt's tight, focused response makes it an excellent pedal platform",
          "Try with a Big Muff or Fuzz Face for Gilmour-style lead tones"
        ],
        whatToListenFor: [
          "Massive, clear, powerful clean tone with excellent projection",
          "Tight, focused response that stays clean even when pushed hard"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "hiwatt-cranked",
        style: "Cranked Townshend",
        settings: { volume: 8, bass: 5, mid: 6, treble: 5, presence: 7, bright: true },
        tips: [
          "Pete Townshend cranked Hiwatts with the Brilliant input for his live sound",
          "At high volume the Hiwatt breaks up with a tight, aggressive character",
          "Even cranked, the Hiwatt retains more clarity and definition than a Marshall",
          "Presence high (6-8) — the Hiwatt needs presence to open up the top end",
          "Treble moderate (5) — the Brilliant input adds enough treble already"
        ],
        whatToListenFor: [
          "Tight, controlled breakup that stays focused even at extreme volume",
          "An authority and power that smaller amps simply cannot achieve"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  // ─── HOOK CAPTAIN ──────────────────────────────────────────

  {
    familyId: "hook-captain",
    familyName: "Hook Captain (Captain Series)",
    modelPatterns: ["capt-hook"],
    controlLayout: STANDARD_MV_BRIGHT,
    presets: [
      {
        id: "captain-crunch",
        style: "Boutique Crunch",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 5, bright: false },
        tips: [
          "Hook Captain amps are boutique designs with multiple voicing options",
          "Channels 1A/1B are lower gain, 2A/2B are medium, 3A/3B are high gain",
          "The A/B suffixes indicate different voicing variants",
          "Great for players who want versatility in a single amp"
        ],
        whatToListenFor: [
          "Versatile boutique tone from clean to high-gain",
          "Refined, articulate character across all gain levels"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── CARR RAMBLER ──────────────────────────────────────────

  {
    familyId: "carr-rambler",
    familyName: "Carr Rambler",
    modelPatterns: ["car-ambler"],
    controlLayout: BLACKFACE_VIBRATO,
    presets: [
      {
        id: "carr-clean",
        style: "Boutique Fender Clean",
        settings: { volume: 4, bass: 5, treble: 6, bright: true },
        tips: [
          "Carr amps are handbuilt boutique Fender-inspired designs",
          "The Rambler has a classic Fender voicing with modern build quality",
          "Great for country, jazz, and clean studio work",
          "American-voiced — think Fender but more refined"
        ],
        whatToListenFor: [
          "Refined Fender-style clean with boutique quality",
          "Touch-sensitive response with musical breakup when pushed"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── CAROL-ANN ─────────────────────────────────────────────

  {
    familyId: "carol-ann",
    familyName: "Carol-Ann (Tucana / Triptik / OD2)",
    modelPatterns: ["tucana", "triptik", "carol-ann-od2", "ca3-plus"],
    controlLayout: STANDARD_MV_BRIGHT,
    presets: [
      {
        id: "carol-ann-lead",
        style: "Boutique Lead",
        settings: { gain: 6, bass: 5, mid: 6, treble: 6, master: 5, presence: 5, bright: false },
        tips: [
          "Carol-Ann amps are handbuilt boutique designs known for incredible feel",
          "The Tucana is the flagship — smooth, dynamic, harmonically rich",
          "The OD2 is a popular high-gain model",
          "The Triptik has 3 channels — clean, crunch, and lead",
          "The CA3+ is a versatile multi-channel design"
        ],
        whatToListenFor: [
          "Refined, articulate tone with a warm, inviting character",
          "Harmonics that sing and sustain naturally"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── MORGAN ────────────────────────────────────────────────

  {
    familyId: "morgan",
    familyName: "Morgan AC",
    modelPatterns: ["morgan"],
    controlLayout: VOX_TOP_BOOST,
    presets: [
      {
        id: "morgan-breakup",
        style: "Chimey Breakup",
        settings: { volume: 6, bass: 4, treble: 5, cut: 4 },
        tips: [
          "Morgan amps are inspired by vintage Vox circuits with modern refinements",
          "The AC20 is their take on the Vox AC — chimey, responsive, musical",
          "Cut maps to Presence in Fractal — below noon darkens, above noon brightens",
          "Treble at 5 (noon) — like the Vox AC30, these amps are naturally bright",
          "Low wattage means early breakup and natural compression",
          "Excellent for blues, roots, and indie rock"
        ],
        whatToListenFor: [
          "Chimey, three-dimensional tone with natural sag and compression",
          "The sweet spot where clean and dirty coexist"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── SUHR ──────────────────────────────────────────────────

  {
    familyId: "suhr",
    familyName: "Suhr Badger",
    modelPatterns: ["suhr-badger", "badger"],
    controlLayout: STANDARD_MV_BRIGHT,
    presets: [
      {
        id: "badger-crunch",
        style: "Boutique Crunch",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 5, bright: false },
        tips: [
          "Suhr Badger — modern boutique design with classic British voicing",
          "The 18W version has EL84 power tubes for earlier breakup",
          "The 30W version has more headroom and EL34s",
          "Incredibly responsive to pick dynamics and guitar volume"
        ],
        whatToListenFor: [
          "Refined British crunch with modern clarity and responsiveness",
          "Touch sensitivity that rewards expressive playing"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── JC-120 / SOLID STATE ──────────────────────────────────

  {
    familyId: "jc120",
    familyName: "Roland JC-120 / Solid State",
    modelPatterns: ["jazz-120", "super-trem"],
    controlLayout: JC120_LAYOUT,
    presets: [
      {
        id: "jc120-clean",
        style: "Pristine Clean",
        settings: { volume: 4, bass: 5, mid: 5, treble: 6, bright: true, distortion: false },
        tips: [
          "The JC-120 is THE clean tone reference — crystal clear with no breakup",
          "Solid-state — zero sag, immediate response, ultra-precise",
          "Bright switch adds sparkle — useful for single coils",
          "Andy Summers (The Police), Robert Smith (The Cure) — iconic clean tones",
          "The built-in chorus is legendary — the JC-120 chorus effect is a classic"
        ],
        whatToListenFor: [
          "Crystal clear, transparent clean with no harmonic coloring",
          "Ultra-precise response with zero compression or sag"
        ],
        source: "Fractal Wiki"
      }
    ]
  },

  // ─── SUPRO ─────────────────────────────────────────────────

  {
    familyId: "supro",
    familyName: "Supro / Valco",
    modelPatterns: ["supremo", "supro"],
    controlLayout: NON_MV_VOLUME_ONLY,
    presets: [
      {
        id: "supro-grit",
        style: "Dirty Clean",
        settings: { volume: 6 },
        tips: [
          "Supro amps have a raw, gritty character unlike any other amp",
          "Jimmy Page used Supros on early Zeppelin recordings — the secret weapon",
          "They break up early with a fuzzy, almost broken quality",
          "In Fractal the Volume is your only control — simplicity is the point",
          "The Black Magick model has built-in reverb and a more modern feature set"
        ],
        whatToListenFor: [
          "Raw, gritty breakup with a unique fuzzy character",
          "A 'garage band' quality that adds character to any recording"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── CORNFORD ──────────────────────────────────────────────

  {
    familyId: "cornford",
    familyName: "Cornford (Cornfed Series)",
    modelPatterns: ["cornfed"],
    controlLayout: STANDARD_MV,
    presets: [
      {
        id: "cornford-british",
        style: "British Rock",
        settings: { gain: 6, bass: 5, mid: 6, treble: 6, master: 5, presence: 6 },
        tips: [
          "Cornford was a respected British amp maker before closing in 2014",
          "The MK50 has a thick, chewy British character with excellent midrange",
          "Great for classic rock, blues rock, and British-flavored hard rock",
          "EL34 power tubes give it that classic British aggression"
        ],
        whatToListenFor: [
          "Thick, chewy British rock tone with excellent midrange presence",
          "A refined version of the Marshall-inspired British high-gain sound"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── LEGEND / CARVIN ───────────────────────────────────────

  {
    familyId: "carvin-legacy",
    familyName: "Carvin Legacy (Steve Vai)",
    modelPatterns: ["legend"],
    controlLayout: STANDARD_MV_BRIGHT,
    presets: [
      {
        id: "legacy-lead",
        style: "Vai Lead",
        settings: { gain: 6, bass: 5, mid: 6, treble: 6, master: 5, presence: 5, bright: false },
        tips: [
          "Steve Vai's signature amp — versatile 3-channel design",
          "The Legacy VL100 and VL300 (II) have slightly different voicing",
          "Balanced EQ with smooth, articulate character",
          "Great for expressive lead work, shred, and progressive rock"
        ],
        whatToListenFor: [
          "Smooth, articulate lead tone with excellent sustain",
          "Balanced, versatile character that works across genres"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── DR. Z ─────────────────────────────────────────────────

  {
    familyId: "dr-z",
    familyName: "Dr. Z (Mr Z Series)",
    modelPatterns: ["mr-z"],
    controlLayout: STANDARD_MV,
    presets: [
      {
        id: "drz-blues",
        style: "Boutique Blues",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 5 },
        tips: [
          "Dr. Z amps are warm, dynamic, and incredibly responsive boutique designs",
          "The Maz 38 is the flagship — EL84 power tubes with beautiful breakup",
          "The Maz 8 is a small, low-wattage studio amp — single EL84",
          "The Highway 66 is a 6V6-powered design with American voicing",
          "Great for blues, roots, classic rock, and studio recording"
        ],
        whatToListenFor: [
          "Warm, dynamic response with beautiful touch sensitivity",
          "Musical breakup that responds to every nuance of your playing"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── BOUTIQUE / OTHER ──────────────────────────────────────

  {
    familyId: "buddah",
    familyName: "Budda Duomaster",
    modelPatterns: ["buddah"],
    controlLayout: STANDARD_MV,
    presets: [
      {
        id: "buddah-warm",
        style: "Warm Crunch",
        settings: { gain: 5, bass: 5, mid: 6, treble: 5, master: 5, presence: 5 },
        tips: [
          "Budda amps have a warm, organic character with smooth breakup",
          "The Duomaster is known for its creamy overdrive and touch sensitivity",
          "Great for blues, fusion, and melodic rock"
        ],
        whatToListenFor: [
          "Warm, organic crunch with smooth compression",
          "Touch-sensitive response that rewards dynamics"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "comet",
    familyName: "Komet (Comet Series)",
    modelPatterns: ["comet"],
    controlLayout: STANDARD_MV,
    presets: [
      {
        id: "comet-clean",
        style: "Boutique Clean/Crunch",
        settings: { gain: 4, bass: 5, mid: 6, treble: 6, master: 5, presence: 5 },
        tips: [
          "Komet amps are handbuilt boutique designs with vintage-inspired circuits",
          "The Comet is clean-to-crunch with excellent dynamics",
          "Great for roots, blues, and vintage-flavored rock"
        ],
        whatToListenFor: [
          "Refined, vintage-inspired tone with boutique build quality",
          "Touch-sensitive dynamics and musical breakup"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "div-13",
    familyName: "Divided by 13",
    modelPatterns: ["div-13"],
    controlLayout: STANDARD_MV,
    presets: [
      {
        id: "div13-clean",
        style: "Boutique Clean",
        settings: { gain: 4, bass: 5, mid: 6, treble: 6, master: 5, presence: 5 },
        tips: [
          "Divided by 13 amps are highly regarded boutique designs",
          "The CJ series has a chimey, clear, dynamic character",
          "The FT37 has a unique voicing with different High/Low gain inputs",
          "Great for indie, pop, and expressive clean-to-crunch playing"
        ],
        whatToListenFor: [
          "Chimey, clear, boutique character with excellent dynamics",
          "Musical breakup that responds to pick attack and guitar volume"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "fox-ods",
    familyName: "Fox ODS",
    modelPatterns: ["fox-ods"],
    controlLayout: STANDARD_MV_BRIGHT_DEPTH,
    presets: [
      {
        id: "fox-smooth",
        style: "Smooth Overdrive",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 5, bright: false, depth: false },
        tips: [
          "Fox ODS — Dumble-inspired boutique overdrive design",
          "Smooth, creamy overdrive character",
          "Deep switch adds low-end body",
          "Great for blues, fusion, and expressive lead work"
        ],
        whatToListenFor: [
          "Smooth, Dumble-influenced overdrive character",
          "Creamy sustain with excellent touch sensitivity"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "two-rock",
    familyName: "Two-Rock Jet",
    modelPatterns: ["two-stone"],
    controlLayout: STANDARD_MV,
    presets: [
      {
        id: "two-rock-clean",
        style: "Boutique Clean",
        settings: { gain: 4, bass: 5, mid: 6, treble: 6, master: 5, presence: 5 },
        tips: [
          "Two-Rock Jet 35 — refined, Fender-influenced boutique design",
          "Sparkling cleans with sweet overdrive when pushed",
          "PAB version has Pre-Amp Boost for additional gain and richness",
          "Touch-sensitive with complex harmonics — a studio favorite"
        ],
        whatToListenFor: [
          "Sparkling, complex clean tones with sweet overdrive potential",
          "Boutique refinement of the Fender-style clean platform"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "nuclear-tone",
    familyName: "Swart Atomic Space Tone",
    modelPatterns: ["nuclear-tone"],
    controlLayout: NON_MV_TWEED,
    presets: [
      {
        id: "nuclear-warm",
        style: "Warm Boutique",
        settings: { volume: 5, tone: 5 },
        tips: [
          "Boutique Class A amp with unique tremolo and reverb",
          "Warm, lush cleans with EL84 power tube character",
          "Great for indie, ambient, and vintage-inspired tones",
          "Simple two-knob design — Volume and Tone"
        ],
        whatToListenFor: [
          "Warm, lush, boutique Class A character",
          "Musical tremolo and reverb interaction"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "ruby-rocket",
    familyName: "Paul Ruby Rocket",
    modelPatterns: ["ruby-rocket"],
    controlLayout: STANDARD_MV_BRIGHT,
    presets: [
      {
        id: "ruby-crunch",
        style: "Boutique Crunch",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 5, bright: false },
        tips: [
          "Paul Ruby boutique amp — EL84 powered with unique voicing",
          "Dynamic, responsive, with warm musical breakup",
          "Bright version has enhanced treble for more cutting tones"
        ],
        whatToListenFor: [
          "Dynamic, responsive EL84-powered boutique tone",
          "Warm, musical breakup with excellent touch sensitivity"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "diamante",
    familyName: "Diamante",
    modelPatterns: ["diamante"],
    controlLayout: STANDARD_MV,
    presets: [
      {
        id: "diamante-fire",
        style: "Fiery Lead",
        settings: { gain: 6, bass: 5, mid: 6, treble: 6, master: 5, presence: 5 },
        tips: [
          "Boutique high-gain design with a unique fiery character",
          "Great for expressive lead work with excellent sustain"
        ],
        whatToListenFor: [
          "Fiery, expressive lead tone with natural sustain",
          "Unique boutique character different from mainstream high-gain amps"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "gibtone",
    familyName: "Gibtone Scout",
    modelPatterns: ["gibtone"],
    controlLayout: NON_MV_VOLUME_ONLY,
    presets: [
      {
        id: "gibtone-vintage",
        style: "Vintage Clean",
        settings: { volume: 5 },
        tips: [
          "Vintage-style boutique amp with simple Volume-only control",
          "Warm, organic character with natural compression"
        ],
        whatToListenFor: [
          "Vintage, organic tone with natural warmth",
          "Simple, pure guitar amplification"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "hot-kitty",
    familyName: "Hot Kitty",
    modelPatterns: ["hot-kitty"],
    controlLayout: STANDARD_MV_BRIGHT,
    presets: [
      {
        id: "hot-kitty-crunch",
        style: "Class A Crunch",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 5, bright: false },
        tips: [
          "Bad Cat Hot Cat inspired — EL34 powered Class A design",
          "Dynamic, responsive with excellent touch sensitivity",
          "Great for blues, rock, and expressive playing"
        ],
        whatToListenFor: [
          "Dynamic Class A character with EL34 midrange bite",
          "Touch-sensitive breakup that rewards expressive playing"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  // ─── FAS CUSTOM MODELS ─────────────────────────────────────

  {
    familyId: "fas-custom",
    familyName: "FAS Custom Models",
    modelPatterns: ["fas-"],
    controlLayout: FAS_CUSTOM_LAYOUT,
    presets: [
      {
        id: "fas-modern-metal",
        style: "Idealized Modern Metal",
        settings: { gain: 6, bass: 4, mid: 6, treble: 6, master: 5, presence: 6 },
        tips: [
          "FAS models are Fractal's custom, idealized amp designs — no real-world equivalent",
          "They remove undesirable characteristics of real amps for 'perfect' versions",
          "FAS Modern (I/II/III) = idealized modern metal — community favorites",
          "FAS Brootalz / Skull Crusher = extreme high-gain for the heaviest genres",
          "FAS Crunch = idealized British crunch, FAS Hot Rod = idealized modded Marshall",
          "FAS Lead 1/2 = smooth, singing lead tones",
          "FAS Class-A = idealized Vox-style chimey tones",
          "FAS Express / Wreck = idealized Trainwreck-style tones",
          "FAS Brown / 6160 = idealized EVH/5150 tones",
          "These are often the best starting point for players who want great tone without chasing specific real-amp voicings"
        ],
        whatToListenFor: [
          "Tight, surgical precision without the quirks of real amp models",
          "The 'ideal' version of each amp category"
        ],
        source: "Fractal Wiki / Cliff Chase"
      },
      {
        id: "fas-clean-platform",
        style: "Idealized Clean",
        settings: { gain: 3, bass: 5, mid: 5, treble: 6, master: 5, presence: 5 },
        tips: [
          "FAS Buttery = warm, smooth overdrive for blues/fusion",
          "FAS Class-A = chimey, complex harmonics with Vox-like breakup",
          "FAS Stealth Blue = versatile clean-to-crunch inspired by 5150 Stealth",
          "FAS Bass = idealized bass amp — clean, punchy, defined",
          "These custom models often sound great immediately with minimal tweaking"
        ],
        whatToListenFor: [
          "Clean, articulate starting point without real-amp limitations",
          "Immediate 'just works' quality with minimal EQ adjustments needed"
        ],
        source: "Fractal Wiki / Cliff Chase"
      }
    ]
  },

  // ─── TUBE PRE ──────────────────────────────────────────────

  {
    familyId: "tube-pre",
    familyName: "Tube Preamp (Utility)",
    modelPatterns: ["tube-pre"],
    controlLayout: FAS_CUSTOM_LAYOUT,
    presets: [
      {
        id: "tube-pre-clean",
        style: "Clean Preamp",
        settings: { gain: 3, bass: 5, mid: 5, treble: 5, master: 5, presence: 5 },
        tips: [
          "Generic tube preamp model — clean, transparent tube amplification",
          "Useful as a building block for custom tones or as a clean boost",
          "No specific real-world amp — a clean tube stage for sound design",
          "Great for acoustic guitar amplification or clean pedal platform"
        ],
        whatToListenFor: [
          "Transparent, clean amplification with subtle tube warmth",
          "A blank canvas for building custom tones with pedals and effects"
        ],
        source: "Fractal Wiki"
      }
    ]
  }
];

// ═══════════════════════════════════════════════════════════════
// MODEL OVERRIDES — Specific models that need unique presets
// ═══════════════════════════════════════════════════════════════

export const MODEL_OVERRIDES: ModelOverride[] = [
  {
    modelId: "deluxe-verb-vibrato",
    controlLayout: FENDER_DELUXE_REVERB,
    presets: [
      {
        id: "dlx-reverb-clean",
        style: "Classic Fender Clean",
        settings: { volume: 4, bass: 6, treble: 6, bright: true },
        tips: [
          "The Deluxe Reverb Vibrato channel is arguably the most recorded amp in history",
          "Volume, Bass, Treble + Bright — NO Mid, NO Presence on the real amp",
          "The Vibrato channel has the reverb — everyone uses this one",
          "At 22W it breaks up at manageable volumes — perfect for studio",
          "No master volume — Volume IS your gain. Keep below 5 for cleans",
          "For Low input: set Input Trim to 0.500 in the Advanced parameters",
          "Pair with a 1x12 Jensen C12N or Celestion Cream Alnico IR"
        ],
        whatToListenFor: [
          "Warm, three-dimensional clean with natural compression",
          "The signature Fender 'drip' reverb that defines the amp's character"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      },
      {
        id: "dlx-reverb-edge",
        style: "Edge of Breakup",
        settings: { volume: 6, bass: 5, treble: 5, bright: false },
        tips: [
          "Around 6 the Deluxe Reverb starts breaking up — this is the sweet spot",
          "Turn Bright OFF at higher volumes to avoid harsh fizz",
          "SRV lived in this territory — ride your guitar volume for dynamics",
          "The Deluxe breaks up earlier and more musically than the Twin",
          "Supply Sag at 3-4 adds tube rectifier bloom and compression"
        ],
        whatToListenFor: [
          "Musical breakup that responds to every touch",
          "Clean when gentle, gritty when you dig in"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },
  {
    modelId: "deluxe-verb-normal",
    controlLayout: BLACKFACE_NORMAL,
    presets: [
      {
        id: "dlx-normal-clean",
        style: "Warm Normal Channel",
        settings: { volume: 4, bass: 6, treble: 5 },
        tips: [
          "The Normal channel has no Bright switch — simpler, warmer voicing",
          "Darker and warmer than the Vibrato channel",
          "Great for jazz and warm clean tones where the Vibrato channel is too bright",
          "No reverb on this channel — use external reverb"
        ],
        whatToListenFor: [
          "Warm, round clean tone without the sparkle of the Vibrato channel",
          "A simpler, more direct Fender clean"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },
  {
    modelId: "1959slp-jumped",
    controlLayout: DUAL_VOLUME_PLEXI,
    presets: [
      {
        id: "slp-acdc",
        style: "Classic AC/DC Rock",
        settings: { volume1: 5, volume2: 7, bass: 4, mid: 8, treble: 6, presence: 6 },
        tips: [
          "The 1959 SLP is THE Marshall Plexi — the sound of rock and roll",
          "Volume I = Normal (darker), Volume II = Treble (brighter)",
          "Angus and Malcolm Young: Volume II higher for cutting bite",
          "NO master volume — the two Volume controls together set your gain",
          "Keep bass conservative — these amps have plenty of low end",
          "Pair with 4x12 Celestion Greenback for the classic AC/DC sound"
        ],
        whatToListenFor: [
          "Thick, aggressive midrange roar with singing overtones",
          "The amp should feel alive and reactive to every touch"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      }
    ]
  },
  {
    modelId: "plexi-100w-jumped",
    controlLayout: DUAL_VOLUME_PLEXI,
    presets: [
      {
        id: "plexi-100-jumped",
        style: "70s Hard Rock",
        settings: { volume1: 6, volume2: 7, bass: 5, mid: 7, treble: 7, presence: 5 },
        tips: [
          "Both volumes fairly high pushes the preamp for more saturation",
          "Balance Volume I (warmth) and Volume II (bite) to taste",
          "Think early Judas Priest, UFO, Thin Lizzy — the classic 70s hard rock sound",
          "Supply Sag higher for more vintage feel and sag"
        ],
        whatToListenFor: [
          "Full-spectrum Plexi crunch with rich harmonic overtones",
          "The roar of power tubes being pushed hard"
        ],
        source: "Fractal Wiki / Yek's Guide"
      }
    ]
  },
  {
    modelId: "class-a-30w-tb",
    controlLayout: VOX_TOP_BOOST,
    presets: [
      {
        id: "ac30-jangle",
        style: "Chimey Jangle",
        settings: { volume: 4, bass: 4, treble: 5, cut: 3 },
        tips: [
          "The AC30 Top Boost is one of the most iconic amps ever made",
          "NO master volume, NO mid control — this is how the real amp works",
          "Cut maps to Presence in Fractal — below noon = darken (authentic), above noon = brighten (bonus)",
          "Treble at 5 (noon) — the AC30 is naturally bright, don't push treble too high",
          "Supply Sag is crucial — increase for more bloom and EL84 compression"
        ],
        whatToListenFor: [
          "Glassy, chimey treble with a pronounced upper-mid presence peak",
          "The jangly character that defined British Invasion and modern indie"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      },
      {
        id: "ac30-breakup",
        style: "Cranked AC30",
        settings: { volume: 7, bass: 4, treble: 5, cut: 5 },
        tips: [
          "Cranking the volume is how you get AC30 breakup — no other way",
          "Increase Cut to 5-6 when cranked — tames harsh highs from power amp breakup",
          "Brian May: AC30 cranked with treble booster in front (Dallas Rangemaster)",
          "Supply Sag parameter in Fractal is critical for the AC30 feel",
          "Depth does nothing on AC30 models (Damping=0) — don't bother adjusting it"
        ],
        whatToListenFor: [
          "Aggressive, chimey breakup with musical compression",
          "Natural sag that makes playing feel bouncy and responsive"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },
  {
    modelId: "usa-mk-v-red-iic",
    controlLayout: MESA_MARK_LAYOUT,
    presets: [
      {
        id: "mkv-iic-metal",
        style: "IIC+ Metal",
        settings: {
          gain: 7, bass: 1, mid: 3, treble: 8, master: 7, presence: 5, bright: false,
          eq80: 8, eq240: 6, eq750: 2, eq2200: 6, eq6600: 7
        },
        tips: [
          "The Mark V's Red IIC+ mode replicates the legendary IIC+ circuit",
          "Bass at 0-1 — the GEQ 80Hz slider (cranked) provides all the low end you need",
          "Classic V-curve: 80Hz max boost, 750Hz deep scoop, 6600Hz boost — this IS the tone",
          "Dream Theater, Metallica Master of Puppets — THE progressive/thrash tone",
          "Treble high (7-8) acts as a secondary gain control on all Mark amps"
        ],
        whatToListenFor: [
          "Laser-focused, cutting high-gain with extreme clarity",
          "Detailed note articulation even during fast passages"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      },
      {
        id: "mkv-iic-lead",
        style: "IIC+ Singing Lead",
        settings: {
          gain: 7, bass: 2, mid: 5, treble: 7, master: 8, presence: 3, bright: false,
          eq80: 5, eq240: 5, eq750: 5, eq2200: 6, eq6600: 5
        },
        tips: [
          "For leads, FLATTEN the V-curve — more 750Hz keeps body and sustain",
          "Push master to 7-8 for power tube saturation and singing quality",
          "Lower presence (3) smooths the top for liquid, vocal-like leads",
          "The Mark IIC+ lead tone is legendary — one of the most musical ever"
        ],
        whatToListenFor: [
          "Liquid, singing sustain with a smooth, musical top end",
          "Notes that bloom naturally without harsh fizz"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },
  {
    modelId: "recto1-orange-modern",
    controlLayout: MESA_RECTO_LAYOUT,
    presets: [
      {
        id: "recto-djent",
        style: "Modern Djent/Metal",
        settings: { gain: 5, bass: 3, mid: 5, treble: 7, master: 7, presence: 8, bold_spongy: "Bold" },
        tips: [
          "For djent and modern metal, less gain is more — keeps things tight",
          "Bold (silicon rectifier) for maximum tightness and attack",
          "Bass very low to prevent the characteristic Recto mud",
          "Combine with a tight boost (TS or Precision Drive) for maximum definition"
        ],
        whatToListenFor: [
          "Extremely tight, percussive distortion with zero flub",
          "Crystalline clarity on fast, syncopated riffing"
        ],
        source: "Fractal Forum / Yek's Guide"
      }
    ]
  },
  {
    modelId: "pvh-6160-block",
    controlLayout: PEAVEY_5150_LAYOUT,
    presets: [
      {
        id: "6160-metalcore",
        style: "Metalcore Rhythm",
        settings: { gain: 6, bass: 4, mid: 5, treble: 7, master: 5, resonance: 5, presence: 7, bright: false },
        tips: [
          "The Block Letter 5150 is the original — raw and aggressive",
          "Resonance moderate for tight chugs — don't overdo it",
          "Bright switch OFF for high gain — it adds harsh fizz",
          "Killswitch Engage, Trivium, All That Remains — the metalcore standard",
          "Less gain than you think — 5-6 is plenty for crushing tones"
        ],
        whatToListenFor: [
          "Raw, aggressive distortion with extreme tightness",
          "The 'chainsaw' quality that defines metalcore rhythm tones"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      }
    ]
  },
  {
    modelId: "5153-100w-red",
    controlLayout: EVH_5153_LAYOUT,
    presets: [
      {
        id: "5153-red-evh",
        style: "Modern EVH",
        settings: { gain: 6, bass: 4, mid: 5, treble: 7, master: 6, presence: 7, resonance: 5 },
        tips: [
          "Eddie Van Halen's modern high-gain channel — the Red channel",
          "Lower gain than you'd expect — 5-6 is plenty for aggressive rhythm",
          "Low/Bass at 4 prevents the massive low end from getting muddy",
          "Presence high for cut and definition in a mix",
          "Resonance at 5 adds just enough low-end thump without flub"
        ],
        whatToListenFor: [
          "Tight, defined palm mutes with the modern EVH character",
          "Singing lead tones with excellent sustain when holding notes"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      }
    ]
  },
  {
    modelId: "ods-100-clean",
    controlLayout: DUMBLE_ODS_LAYOUT,
    presets: [
      {
        id: "ods-boutique-clean",
        style: "Ultimate Clean",
        settings: { gain: 4, overdrive: 0, bass: 5, mid: 5, treble: 5, master: 10, presence: 5, pab: false },
        tips: [
          "The Dumble ODS-100 clean is Fender-derived with more body and dimension",
          "Master at 10 is how Dumbles are meant to be played — the power amp IS the tone",
          "PAB OFF and OD at 0 = pure, rich clean channel",
          "Use Input Drive (gain) and guitar volume to control your level, not the master",
          "Robben Ford, Larry Carlton, Carlos Santana — the boutique clean standard"
        ],
        whatToListenFor: [
          "An almost 3D quality — depth, width, and presence in the clean tone",
          "Every note has body and weight without being tubby"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },
  {
    modelId: "solo-100-lead",
    controlLayout: SOLDANO_LAYOUT,
    presets: [
      {
        id: "slo-lead-liquid",
        style: "Liquid Lead",
        settings: { gain: 4, bass: 5, mid: 6, treble: 6, master: 7, presence: 4, bright: false, depth: true },
        tips: [
          "The SLO-100 Lead channel is THE benchmark for smooth, liquid lead tones",
          "Even on the lead channel, gain 3-5 is plenty — the SLO has massive gain on tap",
          "Depth switch ON adds low-end resonance for thicker, fuller leads",
          "Push the Master high (6-7) for power tube saturation — this is where the sustain lives",
          "Presence at 4 — the SLO can get harsh if presence and treble are both too high"
        ],
        whatToListenFor: [
          "Smooth, liquid sustain that flows effortlessly",
          "Vocal-like quality — notes sing and sustain with harmonic bloom"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      }
    ]
  },
  {
    modelId: "dirty-shirley-1",
    controlLayout: STANDARD_MV_BRIGHT,
    presets: [
      {
        id: "dirty-shirley-1-crunch",
        style: "Vintage Crunch",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 6, presence: 5, bright: false },
        tips: [
          "Model 1 of the Dirty Shirley — vintage Plexi/JTM-45 inspired",
          "Lower gain than the BE — more focused on vintage character",
          "Cleans up beautifully with guitar volume — incredibly dynamic",
          "Think Hendrix, Clapton Bluesbreakers, vintage Marshall territory"
        ],
        whatToListenFor: [
          "Rich, fat vintage crunch with musical clean-up",
          "The transition from clean to crunch as you change pick attack"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  }
];

// ═══════════════════════════════════════════════════════════════
// MODEL INTELLIGENCE — Contextual knowledge for expert AI guidance
// ═══════════════════════════════════════════════════════════════

export interface ModelIntelligence {
  pattern: string;
  category: "clean" | "crunch" | "high-gain" | "pedal-platform" | "full-range" | "specialty";
  gainRange: [number, number];
  intendedUse: string[];
  unconventionalFor?: string[];
  inputNote?: string;
  channelNote?: string;
  relatedModels?: string[];
  warnings?: string[];
  sweetSpot?: string;
  historicalContext?: string;
}

export const MODEL_INTELLIGENCE: ModelIntelligence[] = [
  // ─── FENDER ────────────────────────────────────────────────
  {
    pattern: "57-champ",
    category: "clean",
    gainRange: [0, 3],
    intendedUse: ["recording", "studio", "low-volume practice", "blues at bedroom levels"],
    unconventionalFor: ["high-gain", "metal", "thrash", "hard rock", "band rehearsal volume"],
    warnings: [
      "This is a 5W single-ended amp — it CANNOT do high gain or metal tones no matter what settings you use",
      "If you want high-gain tones, use a Marshall, Mesa, Soldano, Diezel, or 5150-based model instead",
      "The Champ has ONE knob (Volume) on the real amp — it's meant for simple, raw amplification"
    ],
    sweetSpot: "Volume at 6-8 for natural breakup — the Champ's magic is cranked tube sag",
    historicalContext: "Clapton's Layla tones, countless studio recordings. The secret weapon for warm, intimate guitar sounds."
  },
  {
    pattern: "deluxe-verb",
    category: "clean",
    gainRange: [0, 5],
    intendedUse: ["studio recording", "blues", "country", "jazz", "worship", "singer-songwriter"],
    unconventionalFor: ["metal", "thrash", "djent", "extreme high-gain"],
    channelNote: "Vibrato channel has reverb and Bright switch. Normal channel is warmer/darker with no reverb.",
    warnings: [
      "22W non-master-volume amp — gains breakup from Volume control only",
      "For heavy genres, choose a Mesa Rectifier, 5150, Soldano, or similar high-gain model"
    ],
    sweetSpot: "Volume 4-5 for pristine cleans, 6-7 for edge of breakup — THE studio amp",
    historicalContext: "The most recorded amp in history. SRV, John Mayer, countless Nashville sessions."
  },
  {
    pattern: "65-twin",
    category: "pedal-platform",
    gainRange: [0, 3],
    intendedUse: ["pristine cleans", "pedal platform", "country", "jazz", "worship"],
    unconventionalFor: ["natural overdrive at low volume", "metal", "high-gain"],
    warnings: [
      "85W — stays clean at extreme volumes. If you want natural amp breakup, choose a Deluxe Reverb or smaller Fender instead",
      "The Twin is THE pedal platform — it excels when you put drive pedals in front"
    ],
    sweetSpot: "Volume 3-4 for massive headroom cleans. Push to 6+ for rare power tube breakup.",
    historicalContext: "The jazz/country standard. Keith Richards live rig, B.B. King."
  },
  {
    pattern: "bassman",
    category: "crunch",
    gainRange: [0, 6],
    intendedUse: ["blues", "classic rock", "country", "roots", "early rock and roll"],
    channelNote: "Jumped models blend both channels for fuller tone. Single/Dual refer to input configurations.",
    sweetSpot: "Volume 5-7 for warm, fat breakup. Bass at 4-6 (it's a BASS amp originally — lots of low end).",
    historicalContext: "Originally a bass amp, adopted by guitarists. Jim Marshall studied the Bassman to create the first Marshall amps."
  },
  {
    pattern: "vibro-king",
    category: "clean",
    gainRange: [0, 5],
    intendedUse: ["boutique clean", "blues", "country", "jazz", "studio"],
    unconventionalFor: ["metal", "high-gain", "aggressive rock"],
    sweetSpot: "Volume 3-5 for sparkling cleans, push for rich Fender breakup",
    historicalContext: "Fender's modern boutique amp. Combines Twin-like cleans with more complex voicing."
  },
  {
    pattern: "vibrolux",
    category: "clean",
    gainRange: [0, 5],
    intendedUse: ["blues", "country", "recording", "small club gigs"],
    sweetSpot: "Volume 4-6 for sweet spot between clean and breakup",
    historicalContext: "40W Fender — louder than Deluxe, breaks up earlier than Twin. The Goldilocks Fender."
  },
  {
    pattern: "blues-jr",
    category: "crunch",
    gainRange: [0, 5],
    intendedUse: ["blues", "practice", "small venue", "recording"],
    unconventionalFor: ["metal", "high-gain", "loud band situations"],
    warnings: ["15W EL84 amp — breaks up early, limited clean headroom"],
    sweetSpot: "Master 4-5, Volume to taste for breakup level",
    historicalContext: "The best-selling tube amp in history. Affordable, simple, sounds great cranked."
  },
  {
    pattern: "59-bassguy|5e3-",
    category: "crunch",
    gainRange: [0, 6],
    intendedUse: ["blues", "roots", "classic rock", "recording"],
    unconventionalFor: ["clean headroom", "metal", "high-gain"],
    channelNote: "Jumped models combine both inputs for the classic Neil Young/cranked Tweed sound.",
    warnings: ["The 5E3 Deluxe has almost NO clean headroom — it starts breaking up almost immediately"],
    sweetSpot: "Volume 7-12 for the classic cranked Tweed sound — it's MEANT to be pushed",
    historicalContext: "Neil Young, Billy Gibbons, early rock and roll. The raw, dirty Fender sound."
  },
  {
    pattern: "5f8-",
    category: "clean",
    gainRange: [0, 5],
    intendedUse: ["blues", "classic rock", "country", "studio"],
    channelNote: "Jumped models blend both channels for a fuller, more complex tone.",
    sweetSpot: "Volume 4-6 for sparkling cleans, push higher for rich breakup",
    historicalContext: "The Tweed Twin — louder and cleaner than the 5E3 Deluxe, with more headroom."
  },

  // ─── MARSHALL ──────────────────────────────────────────────
  {
    pattern: "1959slp|plexi-100w|plexi-50w",
    category: "crunch",
    gainRange: [0, 7],
    intendedUse: ["classic rock", "blues-rock", "hard rock", "70s rock"],
    unconventionalFor: ["pristine cleans (too much harmonic content)", "modern metal (not tight enough)"],
    channelNote: "Jumped models combine Normal (warm) and Treble (bright) channels. Volume I = Normal, Volume II = Treble. Most classic sounds use the Treble input or jumped.",
    warnings: [
      "Non-master-volume amp — gets louder as you add gain. Use Fractal's Level control to compensate.",
      "For tighter modern metal, use JCM 800, 5150, or Soldano instead"
    ],
    sweetSpot: "Both volumes at 6-8 for the classic rock crunch. Treble channel slightly higher for more bite.",
    historicalContext: "THE rock amp. Hendrix, AC/DC, Led Zeppelin, Van Halen (modded). Defined the sound of rock music."
  },
  {
    pattern: "jtm-45|jtm45",
    category: "crunch",
    gainRange: [0, 5],
    intendedUse: ["blues-rock", "classic rock", "blues", "vintage tones"],
    unconventionalFor: ["metal", "high-gain", "modern rock"],
    warnings: ["Lower gain than JCM 800 or Plexi — more Fender-like character due to shared Bassman heritage"],
    sweetSpot: "Volume 6-8 for warm, bluesy breakup",
    historicalContext: "The FIRST Marshall amp. Based on the Fender Bassman circuit. Eric Clapton Bluesbreakers."
  },
  {
    pattern: "800",
    category: "crunch",
    gainRange: [2, 8],
    intendedUse: ["hard rock", "classic metal", "NWOBHM", "thrash (with boost)", "punk"],
    inputNote: "CRITICAL: Models ending in 'low' or 'low-input' are the LOW input — 6dB LESS gain than the High input. The Low input is the CLEAN input on a JCM 800. For high-gain tones (thrash, metal), you MUST use the High input model (no 'low' suffix). If a user asks for thrash/metal tone on a Low input model, ALWAYS recommend switching to the High input model instead.",
    relatedModels: ["For more gain: Friedman BE (hot-rodded 800)", "For less gain: JTM-45 or Plexi"],
    warnings: [
      "The JCM 800 Low Input has 6dB less gain — it's the CLEAN input. Don't try to get metal tones from it.",
      "For thrash metal, the JCM 800 High Input with a Tube Screamer in front is the classic approach (Metallica, Slayer)"
    ],
    sweetSpot: "Gain 6-8 on High input for classic hard rock/metal crunch. With a boost pedal in front, it becomes a thrash machine.",
    historicalContext: "THE metal amp of the 80s. Iron Maiden, Metallica (with TS boost), Slayer, Zakk Wylde."
  },
  {
    pattern: "silver-j",
    category: "full-range",
    gainRange: [1, 8],
    intendedUse: ["hard rock", "classic rock", "80s rock", "versatile Marshall tones"],
    channelNote: "The Silver Jubilee (2555) has two gain modes and a built-in attenuator. More gain than a Plexi, more refined than a JCM 800.",
    sweetSpot: "Gain 5-6 for classic 80s rock crunch. The Jubilee has a smoother top end than the JCM 800.",
    historicalContext: "Marshall's 25th anniversary amp. Slash's main amp. Joe Bonamassa, Brad Whitford."
  },
  {
    pattern: "jcm900",
    category: "crunch",
    gainRange: [2, 7],
    intendedUse: ["90s rock", "grunge", "alternative", "hard rock"],
    warnings: ["Often considered the 'unloved' Marshall — but it has its own character. More compressed than JCM 800."],
    sweetSpot: "Gain 5-7 for saturated 90s rock. Less dynamic than JCM 800 but more gain on tap.",
    historicalContext: "The 90s Marshall. Widely used despite mixed reputation. Found on countless 90s rock/grunge recordings."
  },
  {
    pattern: "jvm",
    category: "full-range",
    gainRange: [0, 9],
    intendedUse: ["versatile", "clean to high-gain", "modern rock", "classic rock", "metal"],
    channelNote: "The JVM has 4 channels (Clean, Crunch, OD1, OD2) each with 3 modes (Green, Orange, Red). OD2 Red is the highest gain.",
    sweetSpot: "OD1 Orange for classic rock, OD2 Red for modern metal",
    historicalContext: "Marshall's most versatile amp. 4 channels x 3 modes = 12 voices."
  },
  {
    pattern: "brit-2203",
    category: "crunch",
    gainRange: [2, 8],
    intendedUse: ["hard rock", "classic metal", "punk", "thrash with boost"],
    inputNote: "Same as JCM 800 — check for 'low' suffix indicating the clean/low-gain input.",
    sweetSpot: "Preamp 6-8 for aggressive rock. Master to taste for power amp saturation.",
    historicalContext: "The JCM 800 2203 master volume model. Randy Rhoads, Zakk Wylde."
  },
  {
    pattern: "brit-pre",
    category: "crunch",
    gainRange: [2, 7],
    intendedUse: ["hard rock", "classic rock", "Marshall character without power amp"],
    sweetSpot: "Gain 5-7 for classic Marshall preamp character",
    historicalContext: "Marshall preamp — the front end of a JCM 800 without the power section."
  },

  // ─── VOX ───────────────────────────────────────────────────
  {
    pattern: "class-a-30w|class-a-15w",
    category: "crunch",
    gainRange: [0, 6],
    intendedUse: ["jangle pop", "indie", "classic rock", "blues", "worship", "British Invasion"],
    unconventionalFor: ["metal", "high-gain", "thrash"],
    channelNote: "Top Boost has treble/bass EQ. Normal channel is simpler/darker. AC15 has less headroom (breaks up earlier).",
    warnings: [
      "No Mid control on the real AC30 Top Boost — don't expect one",
      "Cut control works OPPOSITE to Presence — higher Cut = darker tone (below noon)",
      "For heavy genres, use a Marshall, Mesa, or Diezel instead"
    ],
    sweetSpot: "Volume 4-5 for chimey cleans, 7+ for classic British breakup",
    historicalContext: "The Beatles, Queen (Brian May), The Edge (U2), Radiohead. THE British clean/crunch sound."
  },

  // ─── MESA/BOOGIE ───────────────────────────────────────────
  {
    pattern: "recto|rect-",
    category: "high-gain",
    gainRange: [3, 10],
    intendedUse: ["metal", "hard rock", "nu-metal", "djent", "modern rock"],
    channelNote: "Orange channel = higher gain than Red in some modes. Modern mode = tightest, Vintage = loosest/most organic. Raw mode = lowest gain.",
    warnings: [
      "The Rectifier's biggest trap is too much gain and bass — start with gain at 5 and bass at 3",
      "Bold = silicon rectifier (tight). Spongy = tube rectifier (saggy, organic). Bold for metal, Spongy for rock."
    ],
    sweetSpot: "Gain 5-6, Bass 2-4 for tight metal. Push gain for nu-metal sludge.",
    historicalContext: "Metallica (Black Album onward), Tool, Foo Fighters, Dream Theater. Defined 90s-2000s metal."
  },
  {
    pattern: "usa-iic|mark-iic",
    category: "high-gain",
    gainRange: [3, 10],
    intendedUse: ["progressive metal", "thrash metal", "technical lead", "80s metal"],
    channelNote: "The IIC+ has a unique EQ topology — Treble acts as a secondary gain control. The 5-band GEQ is essential for shaping the tone.",
    warnings: [
      "Bass in main EQ should be at 0-2 — use the 80Hz GEQ slider for bass instead",
      "The V-curve GEQ is NOT optional — it IS the Mark IIC+ sound"
    ],
    sweetSpot: "Gain 7, Bass 0-2, Treble 7-8, V-curve GEQ (80:8, 240:3, 750:2, 2200:8, 6600:7)",
    historicalContext: "Dream Theater, Metallica (Master of Puppets), John Petrucci. THE progressive metal tone."
  },
  {
    pattern: "usa-mk-iv|mark-iv",
    category: "high-gain",
    gainRange: [2, 9],
    intendedUse: ["modern metal", "progressive rock", "versatile high-gain"],
    channelNote: "3 channels: Clean, Crunch, Lead. Each has different voicing. Lead channel is tighter than IIC+.",
    sweetSpot: "Lead channel: Gain 6, moderate V-curve. Clean channel rivals the best Fender cleans.",
    historicalContext: "The most versatile Mark series amp. Used across rock, metal, and fusion."
  },
  {
    pattern: "usa-mk-v",
    category: "full-range",
    gainRange: [0, 10],
    intendedUse: ["everything from pristine cleans to extreme metal"],
    channelNote: "3 channels, each with multiple modes: Clean (Clean/Fat/Crunch), Crunch (Mark I/Thick/Brit), Lead (Mark IV/IIC+/Extreme).",
    sweetSpot: "IIC+ mode: classic Mark tone. Extreme mode: maximum modern gain. Crunch channel's Mark I mode is amazing for blues.",
    historicalContext: "Mesa's 'everything' amp. Every Mark circuit in one box."
  },
  {
    pattern: "lone-star|texas-star",
    category: "clean",
    gainRange: [0, 5],
    intendedUse: ["boutique clean", "country", "jazz", "worship", "light blues"],
    unconventionalFor: ["metal", "high-gain", "aggressive rock"],
    sweetSpot: "Channel 1 for pristine cleans, Channel 2 for warm singing overdrive",
    historicalContext: "Mesa's clean machine. One of the best clean amps in the Fractal library."
  },
  {
    pattern: "triple-crest",
    category: "full-range",
    gainRange: [1, 8],
    intendedUse: ["versatile modern rock", "blues to metal"],
    sweetSpot: "Channel 2 for classic crunch, Channel 3 for modern gain",
    historicalContext: "Mesa's British-inspired modern design. More versatile than the Rectifier."
  },

  // ─── SOLDANO ───────────────────────────────────────────────
  {
    pattern: "solo-100|solo-",
    category: "high-gain",
    gainRange: [2, 8],
    intendedUse: ["smooth lead", "high-gain rock", "80s/90s rock", "liquid lead tones"],
    channelNote: "Normal/Crunch channel: Bright switch available. Lead/Overdrive channel: uses Depth switch instead. Even on lead channel, gain 3-5 is plenty.",
    warnings: [
      "The SLO has MASSIVE gain — even at 4, it's very saturated. Don't crank the gain thinking you need to.",
      "Low gain + high master is THE SLO technique — let the power amp do the work"
    ],
    sweetSpot: "Gain 3-5, Master 6-7 for the signature smooth, liquid SLO lead",
    historicalContext: "One of the first modern high-gain amps (1987). Eric Clapton, Mark Knopfler, Lou Reed, Mick Mars."
  },
  {
    pattern: "cameron-chs",
    category: "high-gain",
    gainRange: [2, 9],
    intendedUse: ["hot-rodded Soldano tones", "modified SLO", "versatile high-gain"],
    sweetSpot: "Similar to SLO but with Cameron's refined voicing modifications",
    historicalContext: "Mark Cameron's modified SLO circuits — among the most sought-after boutique high-gain amps."
  },

  // ─── FRIEDMAN ──────────────────────────────────────────────
  {
    pattern: "friedman-be|friedman-hbe|friedman-small",
    category: "high-gain",
    gainRange: [2, 9],
    intendedUse: ["modern rock", "hard rock", "metal", "hot-rodded Marshall character"],
    channelNote: "SAT switch adds clipping for more compression. Voice switch (3-pos) changes midrange character. C45/FAT are rear panel switches. HBE has more gain than BE.",
    warnings: ["Low master volume (3-3.5) is CRITICAL — this is counterintuitive but it opens up the tone"],
    sweetSpot: "Gain 4-5, Master 3, Presence 5, Dynamic Presence +2.00 in Advanced parameters",
    historicalContext: "Dave Friedman's hot-rodded Marshalls. Jerry Cantrell, Phil X, The Def Leppard camp."
  },
  {
    pattern: "dirty-shirley",
    category: "crunch",
    gainRange: [0, 6],
    intendedUse: ["vintage rock", "blues-rock", "classic rock", "edge of breakup"],
    unconventionalFor: ["metal", "extreme high-gain"],
    sweetSpot: "Gain 3-5 for gorgeous vintage crunch. Master 6-7 for power tube warmth.",
    historicalContext: "Friedman's Plexi/JTM-45 inspired design. Lower gain, more dynamics than the BE."
  },

  // ─── BOGNER ────────────────────────────────────────────────
  {
    pattern: "euro-blue|euro-red",
    category: "full-range",
    gainRange: [1, 9],
    intendedUse: ["boutique rock", "hard rock", "metal", "versatile high-end"],
    channelNote: "Blue channel = Plexi-like crunch. Red channel = high gain. Structure switch: Tight/Open affects low-end response.",
    warnings: ["Presence MUST be cranked (7-8+) — this is where the Bogner magic lives. Don't leave it at 5."],
    sweetSpot: "Bass low (3), Presence high (7-8), Structure to taste",
    historicalContext: "Reinhold Bogner's masterpiece. Blends Marshall aggression with American smoothness."
  },
  {
    pattern: "euro-uber",
    category: "high-gain",
    gainRange: [3, 9],
    intendedUse: ["metal", "heavy rhythm", "aggressive high-gain"],
    warnings: [
      "The Uberschall has an EXTREMELY tight bass circuit — bass can go much higher (5-7) than other amps without flubbing",
      "Less gain than you think — 5-6 is plenty for crushing tones"
    ],
    sweetSpot: "Gain 5, Bass 6, Structure Tight for crushing metal rhythm",
    historicalContext: "Bogner's metal monster. Extremely tight bass response lets you run higher bass settings."
  },
  {
    pattern: "shiver",
    category: "crunch",
    gainRange: [0, 7],
    intendedUse: ["boutique clean", "smooth crunch", "blues-rock", "singing leads"],
    unconventionalFor: ["extreme metal", "djent", "thrash"],
    warnings: ["The Shiva is NOT a metal amp — it excels at clean, crunch, and smooth lead"],
    sweetSpot: "Clean channel with Bright ON for bell-like cleans. Lead channel gain 5-6 for smooth, creamy saturation.",
    historicalContext: "Bogner's smooth, refined amp. EL34 warmth with boutique character."
  },

  // ─── DIEZEL ────────────────────────────────────────────────
  {
    pattern: "dizzy-v4|das-metall",
    category: "high-gain",
    gainRange: [3, 9],
    intendedUse: ["modern metal", "progressive metal", "tight high-gain rhythm"],
    unconventionalFor: ["jazz", "country", "vintage cleans"],
    warnings: [
      "Diezel approach is OPPOSITE to most amps: Bass HIGHER (6-8), Presence CRANKED (7-8+)",
      "The naturally tight circuit handles high bass without flub — trust it",
      "CAN do clean/jazz at low gain but the voicing is modern and aggressive — roll back Treble and Presence significantly to tame the upper mids",
      "More typical jazz choices: Fender Twin/Deluxe Reverb, JC120, Dumble — but VH4 cleans have a unique modern clarity some players prefer"
    ],
    sweetSpot: "Gain 6, Bass 7, Presence 8, Deep 5 for the signature Diezel precision",
    historicalContext: "German precision engineering. Adam Jones (Tool), Metallica live rigs, Meshuggah."
  },
  {
    pattern: "herbie",
    category: "high-gain",
    gainRange: [2, 9],
    intendedUse: ["modern metal", "versatile high-gain", "progressive"],
    unconventionalFor: ["jazz", "country"],
    channelNote: "More versatile than VH4. Channel 2 +/- modes. Herbert has more midrange flexibility.",
    warnings: [
      "More versatile than VH4 — can get usable cleans on lower channels with gain dialed back",
      "For jazz, roll back gain, treble, and presence — the Herbert's midrange flexibility helps here more than the VH4"
    ],
    sweetSpot: "Same Diezel philosophy: bass higher, presence cranked. Herbert is tighter than VH4.",
    historicalContext: "Diezel's more versatile design. Tighter and more refined than the VH4."
  },

  // ─── ENGL ──────────────────────────────────────────────────
  {
    pattern: "angle|energyball",
    category: "high-gain",
    gainRange: [3, 9],
    intendedUse: ["European metal", "progressive metal", "djent", "tight rhythm"],
    warnings: [
      "Contour switch scoops mids — keep OFF for mix presence, ON for solo/bedroom playing",
      "Bright switch only affects Clean/Crunch channels"
    ],
    sweetSpot: "Gain 5-6, Contour OFF, Mids 6-7 for cutting rhythm. Presence 6-7 for pick attack.",
    historicalContext: "European metal standard. Dimmu Borgir, Meshuggah, progressive metal players."
  },

  // ─── PEAVEY / EVH ──────────────────────────────────────────
  {
    pattern: "pvh-6160|pvh6160",
    category: "high-gain",
    gainRange: [3, 10],
    intendedUse: ["metal", "metalcore", "hard rock", "thrash", "nu-metal"],
    channelNote: "Block Letter (original 5150) is rawest. 5150 II is more refined. Rhythm channel = crunch, Lead channel = high gain.",
    warnings: [
      "The 5150 has TONS of gain — 5-6 is plenty for extreme metal. More gain = more fizz, not more heaviness",
      "Bright switch OFF for high gain — adds harsh fizz"
    ],
    sweetSpot: "Lead channel: Gain 5-6, Bass 4, Treble 7, Resonance 5 for tight metal",
    historicalContext: "Eddie Van Halen's signature amp. THE metal/metalcore amp. Killswitch Engage, Trivium, Bullet for My Valentine."
  },
  {
    pattern: "5153",
    category: "full-range",
    gainRange: [0, 10],
    intendedUse: ["modern EVH tones", "versatile rock to metal"],
    channelNote: "3 channels: Blue (clean), Green (crunch), Red (high gain). The 5153 is the most versatile EVH amp.",
    sweetSpot: "Red channel: Gain 5-6, Presence 7 for modern EVH. Blue channel has surprisingly good cleans.",
    historicalContext: "Eddie Van Halen's final amp design. 3 channels from clean to crushing high-gain."
  },

  // ─── DUMBLE ────────────────────────────────────────────────
  {
    pattern: "ods-100|bludojai",
    category: "crunch",
    gainRange: [0, 7],
    intendedUse: ["boutique overdrive", "blues", "fusion", "smooth lead", "sophisticated clean"],
    unconventionalFor: ["metal", "thrash", "aggressive high-gain"],
    channelNote: "OD knob controls overdrive channel gain. PAB (Pre Amp Boost) adds gain staging. Master at 10 is standard — the power amp IS the tone.",
    warnings: [
      "Master Volume at 10 is how Dumbles are meant to be played — don't turn it down",
      "For heavy genres, this is the wrong amp entirely — choose a Mesa, 5150, or Diezel"
    ],
    sweetSpot: "Master 10, Input Drive 3-4, OD 5-7 with PAB ON for classic Dumble lead",
    historicalContext: "The most expensive/exclusive amps ever made. Robben Ford, Larry Carlton, Carlos Santana, John Mayer."
  },

  // ─── ORANGE ────────────────────────────────────────────────
  {
    pattern: "citrus",
    category: "crunch",
    gainRange: [1, 7],
    intendedUse: ["stoner rock", "doom", "classic rock", "grunge", "sludge"],
    warnings: ["Orange amps are mid-heavy by design — don't scoop the mids, it kills their character"],
    sweetSpot: "Mids at 6-7, Master pushed for power amp saturation",
    historicalContext: "Black Sabbath, Sleep, High on Fire. THE stoner/doom sound."
  },

  // ─── CAMERON ───────────────────────────────────────────────
  {
    pattern: "cameron-ccv",
    category: "full-range",
    gainRange: [1, 9],
    intendedUse: ["hot-rodded Plexi", "classic to high-gain rock"],
    channelNote: "Ch1 A/B = clean to mild crunch. Ch2 A/B/C/D = progressive gain. Ch2D = maximum gain.",
    sweetSpot: "Ch2B for crunch, Ch2D for high-gain. The CCV bridges Plexi feel and modern gain.",
    historicalContext: "Mark Cameron's hot-rodded Marshall. Bridges vintage Plexi and modern high-gain."
  },
  {
    pattern: "atomica",
    category: "high-gain",
    gainRange: [3, 9],
    intendedUse: ["modern aggressive rock", "metal", "tight high-gain"],
    sweetSpot: "Gain 6, Mids 7 for cutting aggressive tone",
    historicalContext: "Cameron's modern high-gain design. Tight, aggressive, precise."
  },

  // ─── REVV ──────────────────────────────────────────────────
  {
    pattern: "revv",
    category: "high-gain",
    gainRange: [2, 9],
    intendedUse: ["modern metal", "progressive metal", "djent", "tight rhythm"],
    channelNote: "Aggression switch: OFF = tighter/more controlled, ON = more aggressive/scooped. Purple channel = highest gain.",
    sweetSpot: "Purple channel: Gain 5, Aggression OFF for prog. Aggression ON for thrash/death.",
    historicalContext: "Modern Canadian high-gain design. Extremely responsive and tight."
  },

  // ─── MATCHLESS / TRAINWRECK / MORGAN ───────────────────────
  {
    pattern: "matchbox",
    category: "crunch",
    gainRange: [0, 6],
    intendedUse: ["boutique clean/crunch", "indie", "jangly pop", "worship"],
    unconventionalFor: ["metal", "high-gain", "thrash"],
    sweetSpot: "Volume 4-5 for chimey cleans, push for rich crunch",
    historicalContext: "Matchless DC30/HC30. Vox-like chime with more refinement and headroom."
  },
  {
    pattern: "wrecker",
    category: "crunch",
    gainRange: [0, 7],
    intendedUse: ["boutique crunch", "dynamic rock", "blues", "expressive playing"],
    unconventionalFor: ["metal", "high-gain"],
    warnings: ["No master volume — Volume IS your gain. These amps want to be played HARD."],
    sweetSpot: "Volume 6-8 for extraordinary touch sensitivity and harmonic complexity",
    historicalContext: "Among the most coveted boutique amps ever. Express = Vox-meets-Marshall, Liverpool = more Vox, Rocket = more Marshall."
  },
  {
    pattern: "morgan",
    category: "crunch",
    gainRange: [0, 6],
    intendedUse: ["Vox-inspired boutique", "blues", "indie", "worship"],
    unconventionalFor: ["metal", "high-gain"],
    sweetSpot: "Volume 5-7 for chimey breakup with natural sag",
    historicalContext: "Morgan AC20 — modern take on the Vox AC circuit."
  },

  // ─── HIWATT ────────────────────────────────────────────────
  {
    pattern: "hipower",
    category: "pedal-platform",
    gainRange: [0, 4],
    intendedUse: ["powerful cleans", "pedal platform", "Pink Floyd tones", "The Who"],
    unconventionalFor: ["natural high-gain (stays clean too long)", "metal without pedals"],
    warnings: [
      "Massive clean headroom — harder to break up than almost any other amp",
      "Excels as a pedal platform: Big Muff for Gilmour leads, fuzz for Townshend power chords"
    ],
    sweetSpot: "Volume 5 for massive cleans. Volume 8+ for tight controlled breakup.",
    historicalContext: "Pete Townshend, David Gilmour. Power, clarity, and definition."
  },

  // ─── FRYETTE / VHT ────────────────────────────────────────
  {
    pattern: "fryette|pittbull",
    category: "high-gain",
    gainRange: [2, 8],
    intendedUse: ["smooth lead", "modern rock", "progressive", "singing sustain"],
    sweetSpot: "Gain 6 for smooth, singing lead. Depth ON for solo work.",
    historicalContext: "Fryette (formerly VHT) Pittbull Ultra Lead — legendary for smooth, singing leads."
  },

  // ─── SPLAWN ────────────────────────────────────────────────
  {
    pattern: "spawn",
    category: "high-gain",
    gainRange: [3, 9],
    intendedUse: ["aggressive rock", "metal", "punk", "metalcore"],
    sweetSpot: "Gain 6, Mids 7 for raw aggressive Marshall-derived tone",
    historicalContext: "Hot-rodded Marshall with more gain and tighter bass."
  },

  // ─── SOLID STATE ───────────────────────────────────────────
  {
    pattern: "jazz-120|super-trem",
    category: "clean",
    gainRange: [0, 1],
    intendedUse: ["pristine clean", "jazz", "new wave", "post-punk", "chorus-based tones"],
    unconventionalFor: ["any form of overdrive or distortion (it's solid-state — no tube breakup)", "metal", "rock"],
    warnings: [
      "Solid-state amp — ZERO natural breakup. It stays perfectly clean forever.",
      "The Distortion circuit on the JC-120 is a separate solid-state circuit, not tube overdrive",
      "For any drive tones, use a different amp model entirely"
    ],
    sweetSpot: "Volume 4, Bright ON for the classic pristine JC-120 clean",
    historicalContext: "THE clean tone standard. Andy Summers (The Police), Robert Smith (The Cure), Jazz players worldwide."
  },

  // ─── SUPRO / VINTAGE ───────────────────────────────────────
  {
    pattern: "supremo|supro",
    category: "specialty",
    gainRange: [0, 4],
    intendedUse: ["lo-fi", "recording", "vintage character", "garage rock"],
    unconventionalFor: ["clean headroom", "metal", "high-gain", "modern tones"],
    warnings: ["Volume-only control. Raw, gritty character. Breaks up early with a fuzzy quality."],
    sweetSpot: "Volume 6 for dirty, characterful tones",
    historicalContext: "Jimmy Page's secret weapon on early Led Zeppelin. Raw, gritty, unlike anything else."
  },

  // ─── FAS CUSTOM ────────────────────────────────────────────
  {
    pattern: "fas-",
    category: "full-range",
    gainRange: [0, 10],
    intendedUse: ["idealized versions of classic amp types", "quick great tones without chasing specific voicings"],
    channelNote: "FAS models are Fractal's custom designs — no real-world equivalent. They remove undesirable characteristics for 'perfect' versions of each category.",
    sweetSpot: "Start at noon and adjust to taste — these are designed to sound great immediately",
    historicalContext: "Cliff Chase / Fractal Audio custom designs. Community favorites for direct recording."
  },

  // ─── CARR / CAROL-ANN / BOUTIQUE ───────────────────────────
  {
    pattern: "car-ambler",
    category: "clean",
    gainRange: [0, 5],
    intendedUse: ["boutique Fender-style clean", "country", "jazz", "studio"],
    sweetSpot: "Volume 4 for refined Fender-style clean with boutique quality",
    historicalContext: "Carr handbuilt boutique — refined Fender voicing."
  },
  {
    pattern: "tucana|triptik|carol-ann",
    category: "full-range",
    gainRange: [1, 8],
    intendedUse: ["boutique lead", "smooth dynamics", "expressive playing"],
    sweetSpot: "Gain 6 for smooth, harmonically rich lead tone",
    historicalContext: "Carol-Ann handbuilt boutique designs. Incredible feel and harmonic richness."
  },
  {
    pattern: "suhr-badger|badger",
    category: "crunch",
    gainRange: [1, 7],
    intendedUse: ["boutique British crunch", "blues-rock", "classic rock"],
    sweetSpot: "Gain 5 for refined British crunch. Incredibly responsive to dynamics.",
    historicalContext: "Suhr Badger — modern boutique with classic British voicing."
  },
  {
    pattern: "two-stone",
    category: "clean",
    gainRange: [0, 5],
    intendedUse: ["boutique Fender-influenced clean", "studio", "worship"],
    sweetSpot: "Gain 4 for sparkling complex clean. PAB version adds richness.",
    historicalContext: "Two-Rock Jet 35 — refined Fender-influenced boutique."
  }
];

export function getModelIntelligence(modelId: string): ModelIntelligence | undefined {
  return MODEL_INTELLIGENCE.find(mi => {
    const patterns = mi.pattern.split("|");
    return patterns.some(p => modelId.startsWith(p) || modelId.includes(p));
  });
}

// ═══════════════════════════════════════════════════════════════
// LOOKUP FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function getControlLayout(modelId: string, allModels: { id: string; label: string; basedOn: string; characteristics: string }[]): AmpControlLayout {
  const override = MODEL_OVERRIDES.find(o => o.modelId === modelId);
  if (override?.controlLayout) {
    return override.controlLayout;
  }

  for (const family of AMP_FAMILY_DEFAULTS) {
    if (family.modelPatterns.some(pattern => modelId.startsWith(pattern) || modelId.includes(pattern))) {
      return family.controlLayout;
    }
  }

  return STANDARD_MV;
}

export function getDialInPresets(modelId: string, allModels: { id: string; label: string; basedOn: string; characteristics: string }[]): { presets: DialInPreset[]; source: "model" | "family" | "generic"; familyName?: string; controlLayout: AmpControlLayout } {
  const controlLayout = getControlLayout(modelId, allModels);

  const override = MODEL_OVERRIDES.find(o => o.modelId === modelId);
  if (override) {
    return { presets: override.presets, source: "model", controlLayout };
  }

  for (const family of AMP_FAMILY_DEFAULTS) {
    if (family.modelPatterns.some(pattern => modelId.startsWith(pattern) || modelId.includes(pattern))) {
      return { presets: family.presets, source: "family", familyName: family.familyName, controlLayout };
    }
  }

  const model = allModels.find(m => m.id === modelId);
  if (model) {
    const characteristics = model.characteristics.toLowerCase();
    let defaultPreset: DialInPreset;

    if (characteristics.includes("clean") || characteristics.includes("jazz") || characteristics.includes("pristine")) {
      defaultPreset = {
        id: "generic-clean",
        style: "Clean Starting Point",
        settings: { gain: 3, bass: 5, mid: 5, treble: 6, master: 5, presence: 5 },
        tips: [
          "Start with moderate settings and adjust to taste",
          "Use guitar volume to control dynamics and breakup threshold",
          "Experiment with the Bright switch at lower gain settings",
          "Try Input Trim at 0.500 for a lower-gain input simulation"
        ],
        whatToListenFor: [
          "A clear, balanced tone as a starting point",
          "Check how the amp responds to pick dynamics"
        ],
        source: "General starting point"
      };
    } else if (characteristics.includes("high gain") || characteristics.includes("metal") || characteristics.includes("aggressive")) {
      defaultPreset = {
        id: "generic-highgain",
        style: "High Gain Starting Point",
        settings: { gain: 6, bass: 4, mid: 6, treble: 6, master: 5, presence: 6 },
        tips: [
          "Start with gain lower than you think — modern models have a lot on tap",
          "Keep bass conservative to maintain tightness",
          "Use presence to control the top-end sizzle",
          "Try a Tube Screamer (low gain, high level) in front for tighter palm mutes"
        ],
        whatToListenFor: [
          "Tight, defined palm mutes with good note separation",
          "No fizzy or harsh top end — adjust presence and treble if needed"
        ],
        source: "General starting point"
      };
    } else {
      defaultPreset = {
        id: "generic-versatile",
        style: "Versatile Starting Point",
        settings: { gain: 5, bass: 5, mid: 5, treble: 5, master: 5, presence: 5 },
        tips: [
          "Start with everything at noon and adjust from there",
          "Move one knob at a time to hear what each control does",
          "Listen for the amp's natural voicing before shaping with EQ",
          "Check the Fractal Wiki for model-specific tips from Yek's guide"
        ],
        whatToListenFor: [
          "The amp's natural character at neutral settings",
          "Which frequencies are prominent and which need adjustment"
        ],
        source: "General starting point"
      };
    }

    return { presets: [defaultPreset], source: "generic", controlLayout };
  }

  return {
    presets: [{
      id: "fallback",
      style: "Neutral Starting Point",
      settings: { gain: 5, bass: 5, mid: 5, treble: 5, master: 5, presence: 5 },
      tips: ["Start with all controls at noon and adjust from there"],
      whatToListenFor: ["The amp's natural voicing and response to dynamics"],
      source: "Default"
    }],
    source: "generic",
    controlLayout
  };
}
