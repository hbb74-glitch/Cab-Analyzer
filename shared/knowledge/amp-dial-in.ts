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

const DUAL_VOLUME_TWEED: AmpControlLayout = {
  knobs: [
    { id: "volume1", label: "Normal Vol" },
    { id: "volume2", label: "Bright Vol" },
    { id: "bass", label: "Bass" },
    { id: "treble", label: "Treble" },
  ],
  switches: [],
};

const DUAL_VOLUME_BASSMAN: AmpControlLayout = {
  knobs: [
    { id: "volume1", label: "Normal Vol" },
    { id: "volume2", label: "Bright Vol" },
    { id: "bass", label: "Bass" },
    { id: "mid", label: "Mid" },
    { id: "treble", label: "Treble" },
    { id: "presence", label: "Presence" },
  ],
  switches: [
    { id: "bright", label: "Bright", type: "toggle" },
    { id: "deep", label: "Deep", type: "toggle" },
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
    { id: "voicing", label: "Voicing", type: "multi", options: ["Fat", "Tight"] },
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

export const AMP_FAMILY_DEFAULTS: AmpFamilyDefaults[] = [

  {
    familyId: "fender-tweed-champ",
    familyName: "Fender Tweed Champ / Princeton",
    modelPatterns: ["5f1-tweed", "princetone-5f2"],
    controlLayout: NON_MV_VOLUME_ONLY,
    presets: [
      {
        id: "champ-breakup",
        style: "Sweet Breakup",
        settings: { volume: 7 },
        tips: [
          "The Champ has one knob: Volume. That's it. Pure simplicity",
          "Below 5 you get clean tones, above 7 it starts breaking up beautifully",
          "Eric Clapton recorded his Layla solos through a cranked Champ",
          "In Fractal, the Gain parameter IS the volume knob — there is no master"
        ],
        whatToListenFor: [
          "Warm, compressed breakup that responds to pick dynamics",
          "Natural sag and compression from the single-ended circuit"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "champ-clean",
        style: "Clean",
        settings: { volume: 3 },
        tips: [
          "Low volume settings give you a sweet, pure clean tone",
          "Single-ended amps have a unique compression character",
          "Great for recording — quiet, warm, intimate"
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
          "There is no master volume — this amp is designed to be played loud",
          "The tone control is a simple treble roll-off"
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
          "Roll back guitar volume for cleaner sounds"
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
    modelPatterns: ["deluxe-tweed-jumped", "5f8-tweed-jumped", "59-bassguy-jumped", "59-bassguy-ri-jumped", "supertweed"],
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
          "Tweeds break up early — start lower than you think"
        ],
        whatToListenFor: [
          "Rich, full-spectrum tone combining warmth and clarity",
          "Complex harmonic content from both channels interacting"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "tweed-jumped-warm",
        style: "Warm Blend",
        settings: { volume1: 7, volume2: 5, bass: 7, treble: 5 },
        tips: [
          "Higher Normal volume with lower Bright gives a fatter, warmer tone",
          "Great for blues and roots — Neil Young / early Zeppelin territory",
          "The Bassman jumped is the amp that inspired Jim Marshall"
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
    familyId: "fender-tweed-single",
    familyName: "Fender Tweed (Single Channel)",
    modelPatterns: ["5f8-tweed-bright", "5f8-tweed-normal", "59-bassguy-bright", "59-bassguy-normal"],
    controlLayout: DUAL_VOLUME_BASSMAN,
    presets: [
      {
        id: "bassguy-classic",
        style: "Classic Blues",
        settings: { volume1: 6, volume2: 0, bass: 6, mid: 5, treble: 6, presence: 5, bright: false, deep: false },
        tips: [
          "The Bassman is the amp that inspired the Marshall — the grandfather of rock tone",
          "Bright channel has more treble and earlier breakup",
          "Normal channel is fatter and warmer — great for jazz and blues",
          "The Presence control shapes the power amp response"
        ],
        whatToListenFor: [
          "Warm, fat Fender tone with smooth breakup when pushed",
          "The amp that launched a thousand imitators"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "fender-brownface",
    familyName: "Fender Brownface Era",
    modelPatterns: ["6g4-super", "6g12-concert", "deluxe-6g3"],
    controlLayout: BLACKFACE_VIBRATO,
    presets: [
      {
        id: "brownface-clean",
        style: "Clean",
        settings: { volume: 4, bass: 5, treble: 6, bright: false },
        tips: [
          "Brownface Fenders are warmer and more harmonically rich than Blackface",
          "The tremolo circuit on these is considered superior to later Fenders",
          "Less headroom than Blackface — breaks up earlier for a warmer crunch"
        ],
        whatToListenFor: [
          "Warm, lush tone with more harmonic complexity than Blackface",
          "A slightly grittier, more organic character"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "fender-blackface",
    familyName: "Fender Blackface / Silverface",
    modelPatterns: ["deluxe-verb", "super-verb", "us-deluxe", "prince-tone", "vibrato-king"],
    controlLayout: BLACKFACE_VIBRATO,
    presets: [
      {
        id: "bf-clean",
        style: "Crystal Clean",
        settings: { volume: 4, bass: 5, treble: 6, bright: true },
        tips: [
          "Blackface Fenders define clean tone — bell-like clarity with natural scoop",
          "The Vibrato channel has the reverb — this is the one everyone uses",
          "No master volume — the Volume IS your gain control",
          "Bright switch adds a cap across the volume pot — most useful at lower volumes",
          "Keep it below 5-6 for cleans, above 6 for edge of breakup"
        ],
        whatToListenFor: [
          "The classic Fender 'spank' on single coils — snappy attack with warm body",
          "Bell-like clean tone with natural scoop in the mids"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "bf-edge",
        style: "Edge of Breakup",
        settings: { volume: 6, bass: 4, treble: 6, bright: false },
        tips: [
          "The magic happens right at the edge of breakup around 6-7 on volume",
          "Turn Bright OFF at higher volumes — it adds too much fizz",
          "Use guitar volume to ride between clean and dirty",
          "SRV, John Mayer territory — the amp should sing when you dig in"
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
    familyId: "fender-twin",
    familyName: "Fender Twin / Large Fender",
    modelPatterns: ["double-verb", "vibrato-verb", "us-ultra"],
    controlLayout: BLACKFACE_TWIN,
    presets: [
      {
        id: "twin-clean",
        style: "Pristine Clean",
        settings: { volume: 4, bass: 5, mid: 5, treble: 6, bright: true },
        tips: [
          "The Twin Reverb has massive headroom — it stays clean very loud",
          "100W means it rarely breaks up naturally — use pedals for dirt",
          "The bright switch adds sparkle and is useful at most volume settings",
          "Great pedal platform — the clean stays clean even with effects"
        ],
        whatToListenFor: [
          "Ultra-clean, full-range tone with excellent clarity",
          "Massive headroom with zero breakup at moderate volumes"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "vox-ac-tb",
    familyName: "Vox AC Top Boost",
    modelPatterns: ["class-a-30w-tb", "class-a-15w-tb", "ac-20-dlx-tb"],
    controlLayout: VOX_TOP_BOOST,
    presets: [
      {
        id: "vox-chime",
        style: "Chimey Clean",
        settings: { volume: 4, bass: 4, treble: 7, cut: 3 },
        tips: [
          "The Top Boost channel has the Bass and Treble EQ — this is 'the AC30 sound'",
          "There is no Mid control — the midrange is fixed and prominent",
          "The Cut control rolls off highs at the power amp — turn it UP to tame brightness",
          "No master volume — the Volume IS your gain. Crank it for breakup",
          "The Beatles, Brian May, The Edge — this amp is everywhere"
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
        settings: { volume: 7, bass: 4, treble: 6, cut: 4 },
        tips: [
          "Crank the volume for AC30 crunch — the power amp saturation is the magic",
          "Use the Cut control to tame harsh treble at higher volumes",
          "The amp sags beautifully when pushed — Supply Sag parameter is key in Fractal",
          "Brian May's tone: AC30 cranked with a treble booster in front"
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
          "Cut control still works to tame brightness"
        ],
        whatToListenFor: [
          "Warmer, darker tone compared to the Top Boost channel",
          "Smooth, round breakup when pushed"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "marshall-plexi-single",
    familyName: "Marshall Plexi (Single Channel)",
    modelPatterns: ["1959slp-normal", "1959slp-treble", "1987x-normal", "1987x-treble", "plexi-100w-high", "plexi-100w-normal", "plexi-50w-high", "plexi-100w-1970", "plexi-50w-6550", "plexi-50w-6ca7"],
    controlLayout: NON_MV_PLEXI,
    presets: [
      {
        id: "plexi-single-rock",
        style: "Classic Rock",
        settings: { volume: 7, bass: 5, mid: 7, treble: 6, presence: 6 },
        tips: [
          "Plexis have NO master volume — the Volume IS your gain control",
          "These amps want to be cranked — the power amp saturation is the magic",
          "Presence shapes the power amp frequency response, not the preamp",
          "Marshall mids are the key — don't scoop them, embrace them"
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
          "AC/DC, Led Zeppelin, early Van Halen — this is the foundation"
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
    modelPatterns: ["1959slp-jumped", "1987x-jumped", "plexi-100w-jumped", "plexi-50w-6ca7-jumped", "plexi-50w-high-1-jumped"],
    controlLayout: DUAL_VOLUME_PLEXI,
    presets: [
      {
        id: "plexi-jumped-acdc",
        style: "AC/DC Rock",
        settings: { volume1: 5, volume2: 7, bass: 4, mid: 8, treble: 6, presence: 6 },
        tips: [
          "Jumped channels combine Volume I (darker) and Volume II (brighter) for the fullest tone",
          "Volume II higher than Volume I gives the classic bright, aggressive Plexi tone",
          "Angus Young: Volume I around 5, Volume II around 7 — the classic recipe",
          "NO master volume — both Volume controls together set your overall gain",
          "Balance the two for your preferred blend of warmth and bite"
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
          "In Fractal, use Supply Sag and Bias parameters to emulate the Variac"
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
          "Plexi 2204 is the JMP-era transition model — Plexi character with master volume"
        ],
        whatToListenFor: [
          "Classic Plexi roar with master volume for better gain control",
          "Power tube saturation at more manageable volumes"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "marshall-800",
    familyName: "Marshall JCM 800",
    modelPatterns: ["brit-800", "brit-studio-20"],
    controlLayout: JCM800_LAYOUT,
    presets: [
      {
        id: "jcm800-rhythm",
        style: "Hard Rock Rhythm",
        settings: { gain: 6, bass: 5, mid: 7, treble: 6, master: 6, presence: 6, boost: false },
        tips: [
          "The JCM 800 is a medium-gain amp — use a boost for more saturation",
          "The 2203 (100W) and 2204 (50W) are the classics",
          "It's bright and aggressive — Presence tames the fizz",
          "Zakk Wylde, Randy Rhoads, Slash — the 80s rock standard"
        ],
        whatToListenFor: [
          "Tight, aggressive crunch with excellent note definition",
          "Bright, cutting midrange that sits perfectly in a band mix"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "jcm800-boosted",
        style: "Boosted High Gain",
        settings: { gain: 8, bass: 4, mid: 8, treble: 6, master: 7, presence: 5, boost: true },
        tips: [
          "A Tube Screamer in front is THE classic JCM 800 trick",
          "The boost tightens bass and pushes the preamp into saturation",
          "Keep bass conservative when boosted — tightens palm mutes",
          "This is the Zakk Wylde / Slash approach to modern gain from a vintage circuit"
        ],
        whatToListenFor: [
          "Tighter, more saturated version with better note articulation",
          "Palm mutes should be chunky and defined, not loose or flubby"
        ],
        source: "Fractal Forum / Yek's Guide"
      }
    ]
  },

  {
    familyId: "marshall-jvm",
    familyName: "Marshall JVM / Modern",
    modelPatterns: ["brit-ap", "brit-2020"],
    controlLayout: STANDARD_MV_BRIGHT,
    presets: [
      {
        id: "jvm-crunch",
        style: "Modern Crunch",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 6, bright: false },
        tips: [
          "Modern Marshalls have more gain on tap and more versatile EQ",
          "The Orange (crunch) channel on the JVM is many players' favorite",
          "These amps respond well to the Bright switch at lower gain settings"
        ],
        whatToListenFor: [
          "Tighter, more refined Marshall crunch with modern levels of gain",
          "More controlled low end compared to vintage Marshalls"
        ],
        source: "Fractal Wiki / Yek's Guide"
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
        settings: { gain: 7, bass: 5, mid: 7, treble: 6, master: 6, presence: 6, bright: false },
        tips: [
          "The Silver Jubilee is a hot-rodded Marshall with diode clipping",
          "Bridges the gap between JCM 800 and JCM 900",
          "Slash used a Jubilee extensively — it's the 'other' Slash amp",
          "Start gain lower than you think — it has plenty"
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
    familyId: "mesa-recto",
    familyName: "Mesa/Boogie Rectifier",
    modelPatterns: ["recto", "usa-pre-recto"],
    controlLayout: MESA_RECTO_LAYOUT,
    presets: [
      {
        id: "recto-modern",
        style: "Modern High Gain",
        settings: { gain: 6, bass: 4, mid: 5, treble: 6, master: 6, presence: 7, bold_spongy: "Bold" },
        tips: [
          "Rectifiers are notorious for too much bass — start with bass lower than expected",
          "Bold = silicon rectifier (tighter), Spongy = tube rectifier (more sag and compression)",
          "Presence and Master interact — higher master with lower presence can be smoother",
          "Metallica, Dream Theater, Foo Fighters — the modern high-gain standard"
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
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 7, presence: 5, bold_spongy: "Spongy" },
        tips: [
          "Spongy mode adds tube rectifier sag and compression — great for feel",
          "Vintage mode has less gain but more dynamic response",
          "More mid-forward than Modern — better for cutting through a mix",
          "Try this for blues-rock and classic rock tones"
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
    familyId: "mesa-mark",
    familyName: "Mesa/Boogie Mark Series",
    modelPatterns: ["usa-mk", "usa-lead", "usa-pre"],
    controlLayout: MESA_MARK_LAYOUT,
    presets: [
      {
        id: "mark-rhythm",
        style: "Mark IIC+ Rhythm",
        settings: {
          gain: 6, bass: 3, mid: 4, treble: 7, master: 7, presence: 5, bright: false,
          eq80: 4, eq240: 3, eq750: 2, eq2200: 7, eq6600: 6
        },
        tips: [
          "The Graphic EQ is CRITICAL on Mark amps — it reshapes the tone dramatically",
          "The classic V-curve: 80Hz up, 240Hz down, 750Hz down, 2.2kHz up, 6.6kHz up",
          "Without the GEQ, Mark amps sound thin and buzzy — the GEQ IS the tone",
          "The Mark IIC+ is the Metallica Master of Puppets / Dream Theater standard",
          "Keep bass low in the main EQ — the GEQ handles the low-end shaping"
        ],
        whatToListenFor: [
          "Tight, focused distortion with cutting treble and controlled bass",
          "Extreme clarity and note definition even at high gain"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      },
      {
        id: "mark-lead",
        style: "Singing Lead",
        settings: {
          gain: 7, bass: 3, mid: 5, treble: 6, master: 8, presence: 4, bright: false,
          eq80: 5, eq240: 4, eq750: 5, eq2200: 6, eq6600: 5
        },
        tips: [
          "For leads, flatten the V-curve slightly — more mids help leads cut through",
          "Push the master higher for more power tube saturation and sustain",
          "The Mark IIC+ lead channel is one of the most sought-after tones ever",
          "Lower presence helps smooth out the top for liquid leads"
        ],
        whatToListenFor: [
          "Liquid, singing sustain with a smooth top end",
          "Notes that bloom and sustain naturally without harsh fizz"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  {
    familyId: "mesa-lonestar",
    familyName: "Mesa/Boogie Lone Star",
    modelPatterns: ["lone-star"],
    controlLayout: STANDARD_MV,
    presets: [
      {
        id: "lonestar-clean",
        style: "Boutique Clean",
        settings: { gain: 3, bass: 5, mid: 6, treble: 6, master: 5, presence: 5 },
        tips: [
          "The Lone Star excels at clean and low-gain tones — Mesa's clean machine",
          "Channel 1 is pure clean, Channel 2 adds more gain staging",
          "Great for country, jazz, and worship music"
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
    familyId: "bogner",
    familyName: "Bogner (Euro Series)",
    modelPatterns: ["euro"],
    controlLayout: BOGNER_LAYOUT,
    presets: [
      {
        id: "bogner-crunch",
        style: "Boutique Crunch",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 6, bright: false, structure: "Open" },
        tips: [
          "Bogner Ecstasy blends Marshall aggression with American warmth",
          "Structure switch: Tight = tighter low end, Open = fuller, more organic",
          "The Blue channel is Plexi-like, Red is high gain, Green is clean",
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
        settings: { gain: 7, bass: 5, mid: 6, treble: 6, master: 6, presence: 5, bright: false, structure: "Tight" },
        tips: [
          "Red channel is a high-gain monster with incredible feel",
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
    familyId: "diezel",
    familyName: "Diezel (Dizzy Series)",
    modelPatterns: ["dizzy"],
    controlLayout: DIEZEL_VH4_LAYOUT,
    presets: [
      {
        id: "diezel-modern",
        style: "Modern Metal",
        settings: { gain: 6, bass: 4, mid: 5, treble: 6, master: 6, presence: 7, deep: 3 },
        tips: [
          "Diezel amps are tight, aggressive, and incredibly detailed",
          "The VH4 Channel 3 is the legendary high-gain channel",
          "The Deep control adds low-end resonance — use sparingly for tight rhythm",
          "Herbert and VH4 are different beasts — Herbert is tighter, VH4 is thicker"
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
    familyId: "engl",
    familyName: "ENGL (Angle Series)",
    modelPatterns: ["angle"],
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
          "Great for progressive metal and djent-style tones"
        ],
        whatToListenFor: [
          "Tight, compressed high-gain with excellent note articulation",
          "Strong upper-mid presence that helps cut through dense mixes"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "peavey-5150",
    familyName: "Peavey 5150 / 6505 / EVH",
    modelPatterns: ["pvh-6160", "pvh-v1", "pvh-v2", "pvh-v3"],
    controlLayout: PEAVEY_5150_LAYOUT,
    presets: [
      {
        id: "5150-chug",
        style: "Metal Rhythm",
        settings: { gain: 6, bass: 4, mid: 5, treble: 7, master: 5, resonance: 5, presence: 7, bright: false },
        tips: [
          "The 5150 Block Letter is raw and aggressive — the original",
          "Keep bass low — the 5150 has massive low end",
          "Resonance adds low-end thump — use it but don't overdo it",
          "Bright switch OFF for high gain — it adds fizz",
          "Killswitch Engage, August Burns Red — the modern metal standard"
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
          "For leads, add more mids and reduce presence for smoother top",
          "The 5150 III (EVH) has better lead tones than the original",
          "Push the master slightly higher for more sustain",
          "Rolling back presence prevents fizzy top on lead passages"
        ],
        whatToListenFor: [
          "Sustained, singing lead tone with enough aggression to cut through",
          "Smooth note transitions with good sustain on bends"
        ],
        source: "Fractal Forum / Yek's Guide"
      }
    ]
  },

  {
    familyId: "dumble",
    familyName: "Dumble ODS / SSS",
    modelPatterns: ["ods-100", "bludojai"],
    controlLayout: DUMBLE_ODS_LAYOUT,
    presets: [
      {
        id: "dumble-clean",
        style: "Boutique Clean",
        settings: { gain: 3, overdrive: 0, bass: 5, mid: 5, treble: 5, master: 5, presence: 5, pab: false },
        tips: [
          "The ODS-100 clean is Fender-derived but richer and more three-dimensional",
          "OD (Overdrive) knob controls the overdrive channel gain — set to 0 for clean",
          "PAB (Pre Amp Boost) switch adds gain staging — leave OFF for clean",
          "These amps are incredibly touch-sensitive — the feel is the magic"
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
        settings: { gain: 5, overdrive: 6, bass: 5, mid: 6, treble: 5, master: 6, presence: 5, pab: true },
        tips: [
          "The overdrive channel is smooth, creamy, and incredibly musical",
          "PAB ON + OD dial at 5-7 = the classic Dumble lead tone",
          "The amp responds to guitar volume changes like no other",
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
          "Orange amps have a distinctive thick, chewy midrange",
          "The Rockerverb is more versatile, the OR has that classic raw tone",
          "Orange amps tend to be mid-heavy — they cut through naturally",
          "Great for stoner rock, doom, and British rock"
        ],
        whatToListenFor: [
          "Thick, chewy midrange with a warm, almost fuzzy breakup",
          "A chunky, percussive quality to palm mutes"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "soldano",
    familyName: "Soldano SLO",
    modelPatterns: ["solo", "cameron-chs"],
    controlLayout: SOLDANO_LAYOUT,
    presets: [
      {
        id: "slo-crunch",
        style: "Hot Rod Crunch",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 6, bright: false, depth: false },
        tips: [
          "The SLO-100 was one of the first modern high-gain amps — 1987",
          "Crunch channel is Plexi-derived with more gain",
          "Presence is very powerful — start moderate",
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
        style: "High Gain Overdrive",
        settings: { gain: 7, bass: 4, mid: 6, treble: 6, master: 6, presence: 5, bright: false, depth: true },
        tips: [
          "The SLO overdrive channel is THE benchmark for smooth high-gain leads",
          "Depth switch adds low-end resonance — try ON for thicker leads",
          "It's creamy and musical without being muddy or fizzy"
        ],
        whatToListenFor: [
          "Smooth, liquid high-gain that sustains forever",
          "Harmonics that bloom naturally with a vocal quality"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  {
    familyId: "matchless",
    familyName: "Matchless / Bad Cat (Class-A)",
    modelPatterns: ["matchbox", "herbie"],
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
          "The Cut control is like the Vox — rolls off power amp highs",
          "Great for indie, jangly pop, and worship clean tones"
        ],
        whatToListenFor: [
          "Vox-like chime with more body, depth, and refinement",
          "Natural compression that makes clean tones feel alive"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "friedman",
    familyName: "Friedman BE / HBE",
    modelPatterns: ["friedman"],
    controlLayout: FRIEDMAN_BE_LAYOUT,
    presets: [
      {
        id: "friedman-be",
        style: "Hot Rod Marshall",
        settings: { gain: 6, bass: 5, mid: 7, treble: 6, master: 6, presence: 6, bright: false, sat: false, voicing: "Tight" },
        tips: [
          "Dave Friedman's amps are hot-rodded Marshalls with modern refinements",
          "SAT switch changes gain structure — OFF is more open, ON is more saturated",
          "Voicing: Tight = focused low end, Fat = fuller, more open response",
          "The Friedman HBE channel has even more gain for modern metal"
        ],
        whatToListenFor: [
          "The best of Marshall with modern tightness and clarity",
          "Rich, harmonically complex crunch that stays articulate at any gain"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

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
          "The Aggression switch changes voicing — OFF is tighter, ON is more aggressive/scooped",
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
          "The Nitrous has a raw, aggressive character",
          "The Quick Rod is tighter and more modern-sounding",
          "Great for aggressive rock, punk, and metalcore"
        ],
        whatToListenFor: [
          "Raw, aggressive Marshall-derived tone with more tightness",
          "Punchy, in-your-face character that cuts through any mix"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

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
          "The Cut control tames brightness like a Vox — turn UP to darken",
          "The Express is Vox-meets-Marshall, Liverpool is more Vox-like",
          "Low wattage, high expressiveness — these want to be played hard"
        ],
        whatToListenFor: [
          "Extraordinary touch sensitivity — the amp reacts to every nuance",
          "Complex harmonic content that evolves with pick dynamics"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "suhr",
    familyName: "Suhr Badger",
    modelPatterns: ["badger"],
    controlLayout: STANDARD_MV_BRIGHT,
    presets: [
      {
        id: "badger-crunch",
        style: "Boutique Crunch",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 5, bright: false },
        tips: [
          "Modern boutique design with classic British voicing",
          "Incredibly responsive to pick dynamics and guitar volume",
          "Great for blues-rock, classic rock, and roots music"
        ],
        whatToListenFor: [
          "Refined British crunch with modern clarity and responsiveness",
          "Touch sensitivity that rewards expressive playing"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "triple-crown",
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
          "Channel 3 has more gain for modern rock and metal"
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
          "The Brilliant switch adds brightness — works well at moderate volumes",
          "Pete Townshend, David Gilmour — power and clarity"
        ],
        whatToListenFor: [
          "Massive, clear, powerful clean tone with excellent projection",
          "Tight, focused response that stays clean even when pushed"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "carol-ann",
    familyName: "Carol-Ann (Tucana Series)",
    modelPatterns: ["tucana", "triptik"],
    controlLayout: STANDARD_MV_BRIGHT,
    presets: [
      {
        id: "carol-ann-lead",
        style: "Boutique Lead",
        settings: { gain: 6, bass: 5, mid: 6, treble: 6, master: 5, presence: 5, bright: false },
        tips: [
          "Carol-Ann amps are handbuilt boutique designs known for incredible feel",
          "The Tucana is the flagship — smooth, dynamic, harmonically rich",
          "Great for country, pop, and worship styles"
        ],
        whatToListenFor: [
          "Refined, articulate tone with a warm, inviting character",
          "Harmonics that sing and sustain naturally"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "morgan",
    familyName: "Morgan AC",
    modelPatterns: ["morgan"],
    controlLayout: VOX_TOP_BOOST,
    presets: [
      {
        id: "morgan-breakup",
        style: "Chimey Breakup",
        settings: { volume: 6, bass: 4, treble: 7, cut: 3 },
        tips: [
          "Morgan amps are inspired by vintage Vox circuits with modern refinements",
          "The AC20 is their take on the Vox AC — chimey, responsive, musical",
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
          "Andy Summers, Robert Smith, jazz players worldwide"
        ],
        whatToListenFor: [
          "Crystal clear, transparent clean with no harmonic coloring",
          "Ultra-precise response with zero compression or sag"
        ],
        source: "Fractal Wiki"
      }
    ]
  },

  {
    familyId: "supro",
    familyName: "Supro / Valco",
    modelPatterns: ["supremo"],
    controlLayout: NON_MV_VOLUME_ONLY,
    presets: [
      {
        id: "supro-grit",
        style: "Dirty Clean",
        settings: { volume: 6 },
        tips: [
          "Supro amps have a raw, gritty character unlike any other amp",
          "Jimmy Page used Supros on early Zeppelin recordings",
          "They break up early with a fuzzy, almost broken quality",
          "In Fractal the Volume is your only control — simplicity is the point"
        ],
        whatToListenFor: [
          "Raw, gritty breakup with a unique fuzzy character",
          "A 'garage band' quality that adds character to any recording"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  }
];

export const MODEL_OVERRIDES: ModelOverride[] = [
  {
    modelId: "deluxe-verb-vibrato",
    controlLayout: BLACKFACE_VIBRATO,
    presets: [
      {
        id: "dlx-reverb-clean",
        style: "Classic Fender Clean",
        settings: { volume: 4, bass: 6, treble: 6, bright: true },
        tips: [
          "The Deluxe Reverb is arguably the most recorded amp in history",
          "The Vibrato channel has the reverb — everyone uses this one",
          "At 22W it breaks up at manageable volumes — perfect for studio",
          "No master volume — Volume IS your gain. Keep below 5 for cleans"
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
          "Turn Bright OFF at higher volumes to avoid fizz",
          "SRV lived in this territory — ride your guitar volume"
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
          "Keep bass conservative — these amps have plenty of low end"
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
          "Think early Judas Priest, UFO, Thin Lizzy"
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
        settings: { volume: 4, bass: 4, treble: 7, cut: 3 },
        tips: [
          "The AC30 Top Boost is one of the most iconic amps ever made",
          "NO master volume, NO mid control — this is how the real amp works",
          "The Cut control is key — turn UP to tame harsh highs",
          "The Beatles, Brian May, The Edge, Radiohead — this amp is everywhere"
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
        settings: { volume: 7, bass: 4, treble: 6, cut: 5 },
        tips: [
          "Cranking the volume is how you get AC30 breakup — no other way",
          "Turn Cut UP as you increase volume to control harshness",
          "Brian May: AC30 cranked with treble booster in front",
          "Supply Sag parameter in Fractal is critical for the AC30 feel"
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
          gain: 7, bass: 2, mid: 3, treble: 8, master: 7, presence: 5, bright: false,
          eq80: 6, eq240: 3, eq750: 2, eq2200: 8, eq6600: 7
        },
        tips: [
          "The Graphic EQ is ESSENTIAL — without it the tone is thin and buzzy",
          "Classic V-curve: 80Hz UP, 240Hz DOWN, 750Hz DOWN, 2.2kHz UP, 6.6kHz UP",
          "The V-curve reshapes the scooped preamp into a tight, focused monster",
          "Dream Theater, Metallica Master of Puppets — THE progressive/thrash tone",
          "Bass extremely low in main EQ — the GEQ adds back the right bass frequencies"
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
          gain: 7, bass: 2, mid: 5, treble: 7, master: 8, presence: 4, bright: false,
          eq80: 5, eq240: 4, eq750: 5, eq2200: 6, eq6600: 5
        },
        tips: [
          "For leads, flatten the V-curve — more mids help you cut through",
          "Push master higher for power tube saturation and singing sustain",
          "Lower presence smooths the top for liquid leads",
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
    modelId: "recto-orange-modern",
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
          "Bright switch OFF for high gain — it adds fizz",
          "Killswitch Engage, Trivium, All That Remains — the metalcore standard"
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
    modelId: "ods-100-clean",
    controlLayout: DUMBLE_ODS_LAYOUT,
    presets: [
      {
        id: "ods-boutique-clean",
        style: "Ultimate Clean",
        settings: { gain: 3, overdrive: 0, bass: 5, mid: 5, treble: 5, master: 5, presence: 5, pab: false },
        tips: [
          "The Dumble ODS-100 clean is Fender-derived with more body and dimension",
          "Real Dumbles sell for $50k-$150k — Fractal modeling is the accessible path",
          "PAB OFF and OD at 0 = pure, rich clean channel",
          "Robben Ford, Larry Carlton, Carlos Santana — the boutique clean standard"
        ],
        whatToListenFor: [
          "An almost 3D quality — depth, width, and presence in the clean tone",
          "Every note has body and weight without being tubby"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  }
];

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
          "Experiment with the Bright switch at lower gain settings"
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
          "Use presence to control the top-end sizzle"
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
          "Listen for the amp's natural voicing before shaping with EQ"
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
