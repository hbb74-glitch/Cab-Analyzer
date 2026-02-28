import type { AmpControlLayout } from "./amp-dial-in";

export interface DriveDialInPreset {
  id: string;
  style: string;
  settings: Record<string, number | boolean>;
  tips: string[];
  whatToListenFor: string[];
  source: string;
}

export interface DriveFamilyDefaults {
  familyId: string;
  familyName: string;
  modelPatterns: string[];
  controlLayout: AmpControlLayout;
  presets: DriveDialInPreset[];
}

export interface DriveModelOverride {
  modelId: string;
  controlLayout?: AmpControlLayout;
  presets?: DriveDialInPreset[];
}

const STANDARD_DRIVE_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "drive", label: "Drive" },
    { id: "tone", label: "Tone" },
    { id: "level", label: "Level" },
  ],
  switches: [],
};

const KLON_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "treble", label: "Treble" },
    { id: "output", label: "Output" },
  ],
  switches: [],
};

const RAT_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "distortion", label: "Distortion" },
    { id: "filter", label: "Filter" },
    { id: "volume", label: "Volume" },
  ],
  switches: [],
};

const BIG_MUFF_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "sustain", label: "Sustain" },
    { id: "tone", label: "Tone" },
    { id: "volume", label: "Volume" },
  ],
  switches: [],
};

const FUZZ_FACE_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "fuzz", label: "Fuzz" },
    { id: "volume", label: "Volume" },
  ],
  switches: [],
};

const TONE_BENDER_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "fuzz", label: "Fuzz" },
    { id: "tone", label: "Tone" },
    { id: "volume", label: "Volume" },
  ],
  switches: [],
};

const TREBLE_BOOST_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "boost", label: "Boost" },
  ],
  switches: [],
};

const OCD_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "drive", label: "Drive" },
    { id: "tone", label: "Tone" },
    { id: "volume", label: "Volume" },
  ],
  switches: [
    { id: "hp_lp", label: "HP/LP", type: "multi", options: ["HP", "LP"] },
  ],
};

const BB_PREAMP_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "bass", label: "Bass" },
    { id: "treble", label: "Treble" },
    { id: "volume", label: "Volume" },
  ],
  switches: [],
};

const TIMMY_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "bass", label: "Bass" },
    { id: "treble", label: "Treble" },
    { id: "volume", label: "Volume" },
  ],
  switches: [],
};

const DS1_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "distortion", label: "Dist" },
    { id: "tone", label: "Tone" },
    { id: "level", label: "Level" },
  ],
  switches: [],
};

const OCTAVIA_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "fuzz", label: "Fuzz" },
    { id: "volume", label: "Volume" },
  ],
  switches: [],
};

const MXR_77_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "drive", label: "Drive" },
    { id: "tone", label: "Tone" },
    { id: "output", label: "Output" },
    { id: "bass_100hz", label: "100Hz" },
  ],
  switches: [],
};

const JHS_ANGRY_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "drive", label: "Drive" },
    { id: "tone", label: "Tone" },
    { id: "presence", label: "Presence" },
  ],
  switches: [],
};

const DARKGLASS_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "drive", label: "Drive" },
    { id: "blend", label: "Blend" },
    { id: "level", label: "Level" },
    { id: "bass", label: "Bass" },
    { id: "treble", label: "Treble" },
    { id: "mids", label: "Mids" },
  ],
  switches: [],
};

const BOSOM_BOOST_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "tight", label: "Tight" },
  ],
  switches: [],
};

const ESOTERIC_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "bass", label: "Bass" },
    { id: "treble", label: "Treble" },
    { id: "volume", label: "Volume" },
  ],
  switches: [],
};

const FAS_DRIVE_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "drive", label: "Drive" },
    { id: "level", label: "Level" },
  ],
  switches: [],
};

const FET_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "level", label: "Level" },
  ],
  switches: [],
};

const FULL_OD_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "drive", label: "Drive" },
    { id: "tone", label: "Tone" },
    { id: "volume", label: "Volume" },
  ],
  switches: [],
};

const HORIZON_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "drive", label: "Drive" },
    { id: "tone", label: "Tone" },
    { id: "level", label: "Level" },
    { id: "attack", label: "Attack" },
  ],
  switches: [
    { id: "bright", label: "Bright", type: "toggle" },
    { id: "gate", label: "Gate", type: "toggle" },
  ],
};

const INTEGRAL_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "level", label: "Level" },
  ],
  switches: [],
};

const JAM_RAY_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "drive", label: "Drive" },
    { id: "tone", label: "Tone" },
    { id: "volume", label: "Volume" },
    { id: "bass", label: "Bass" },
  ],
  switches: [],
};

const METAL_ZONE_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "level", label: "Level" },
    { id: "drive", label: "Drive" },
    { id: "low", label: "Low" },
    { id: "high", label: "High" },
    { id: "mid", label: "Mid" },
    { id: "mid_freq", label: "Mid Freq" },
  ],
  switches: [],
};

const MASTER_FUZZ_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "volume", label: "Volume" },
    { id: "attack", label: "Attack" },
  ],
  switches: [],
};

const DRV_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "drive", label: "Drive" },
    { id: "tone", label: "Tone" },
    { id: "level", label: "Level" },
    { id: "preamp", label: "Preamp" },
  ],
  switches: [],
};

const SINGLE_KNOB_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
  ],
  switches: [],
};

const BASS_DI_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "drive", label: "Drive" },
    { id: "blend", label: "Blend" },
    { id: "level", label: "Level" },
    { id: "bass", label: "Bass" },
    { id: "treble", label: "Treble" },
    { id: "presence", label: "Presence" },
  ],
  switches: [],
};

const NOBELLIUM_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "drive", label: "Drive" },
    { id: "spectrum", label: "Spectrum" },
    { id: "level", label: "Level" },
  ],
  switches: [],
};

const SDD_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "gain", label: "Gain" },
    { id: "tone", label: "Tone" },
  ],
  switches: [],
};

const BIT_CRUSHER_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "bit_depth", label: "Bit Depth" },
    { id: "sample_rate", label: "Sample Rate" },
    { id: "level", label: "Level" },
  ],
  switches: [],
};

const GRIDDLE_LAYOUT: AmpControlLayout = {
  knobs: [
    { id: "drive", label: "Drive" },
    { id: "presence", label: "Presence" },
    { id: "level", label: "Level" },
  ],
  switches: [],
};

export const DRIVE_FAMILY_DEFAULTS: DriveFamilyDefaults[] = [

  // ─── TUBE SCREAMER FAMILY ─────────────────────────────────
  {
    familyId: "ts-family",
    familyName: "Tube Screamer / Mid-Hump OD",
    modelPatterns: ["t808-od", "t808-mod", "maxon-808", "super-od", "od-one"],
    controlLayout: STANDARD_DRIVE_LAYOUT,
    presets: [
      {
        id: "ts-boost",
        style: "Amp Tightener / Boost",
        settings: { drive: 3, tone: 6, level: 8 },
        tips: [
          "The #1 use for a TS: tighten a high-gain amp by cutting bass and pushing mids",
          "Low drive, high level — you're using it as a boost, not a distortion pedal",
          "The mid-hump is the secret: it cuts low-end flub and adds midrange definition",
          "Into a Mesa Recto or 5150: tames the fizz and tightens the low end dramatically",
          "Fractal note: Drive 5.0 on the Axe-FX = 0 on the real pedal. Below 5 goes below real pedal range",
          "Pair with high-gain amps for metal rhythm — this is the modern metal secret weapon",
        ],
        whatToListenFor: [
          "Tighter, more focused low end compared to amp alone",
          "Mids come forward — notes cut through the mix better",
          "Less fizzy high-frequency content on palm mutes",
        ],
        source: "Standard metal/rock production technique — universal knowledge",
      },
      {
        id: "ts-bluesy",
        style: "Blues / Classic Rock Drive",
        settings: { drive: 6, tone: 5, level: 5 },
        tips: [
          "SRV's signature sound: TS808 into a cranked Fender Twin or Vibroverb",
          "Medium drive gives that sweet, singing sustain without getting mushy",
          "Tone at noon keeps the mid-hump balanced — lower for neck pickup warmth",
          "Roll your guitar volume down to clean up — the TS responds beautifully to dynamics",
          "Stacks well into an already slightly overdriven amp for more sustain",
        ],
        whatToListenFor: [
          "Vocal, singing quality to sustained notes",
          "Notes bloom with sustain rather than hitting hard and dying",
          "Guitar volume roll-off should produce usable clean tones",
        ],
        source: "SRV, John Mayer, Gary Moore — classic TS technique",
      },
    ],
  },

  // ─── KLON FAMILY ──────────────────────────────────────────
  {
    familyId: "klon-family",
    familyName: "Klon / Transparent OD",
    modelPatterns: ["klone-chiron"],
    controlLayout: KLON_LAYOUT,
    presets: [
      {
        id: "klon-boost",
        style: "Transparent Clean Boost",
        settings: { gain: 2, treble: 5, output: 7 },
        tips: [
          "The Klon's magic is its clean blend circuit — at low gain, it's mostly clean signal with a touch of grit",
          "Low gain + high output = transparent volume boost that preserves your amp's character",
          "The internal charge pump doubles the voltage for more headroom — this is why it sounds open",
          "Works beautifully into any amp — it adds volume and presence without changing your core tone",
          "The Treble control is subtle — adjust to taste, it's not a dramatic EQ shift",
        ],
        whatToListenFor: [
          "Your amp tone but louder and slightly more present",
          "Added harmonic sparkle without obvious coloring",
          "Dynamics fully preserved — light touch stays clean, dig in for grit",
        ],
        source: "Klon Centaur standard boost setting — Bill Finnegan design philosophy",
      },
      {
        id: "klon-drive",
        style: "Overdrive Mode",
        settings: { gain: 6, treble: 5, output: 5 },
        tips: [
          "Higher gain brings in the Klon's clipping character — still transparent but with real drive",
          "The clean blend circuit means even at higher gain there's always some clean signal mixed in",
          "This is why the Klon never sounds mushy or compressed — the clean blend keeps it open",
          "Great into a Fender or Vox for blues rock — adds sustain without losing the amp's identity",
          "Stacks beautifully with a TS in front for lead tones",
        ],
        whatToListenFor: [
          "Drive character that still lets the amp voice through",
          "Compression that feels natural, not squashed",
          "Clean blend underneath — notes ring with clarity even when driven",
        ],
        source: "Standard Klon overdrive application",
      },
    ],
  },

  // ─── RAT FAMILY ───────────────────────────────────────────
  {
    familyId: "rat-family",
    familyName: "RAT Distortion",
    modelPatterns: ["rat-dist", "fat-rat"],
    controlLayout: RAT_LAYOUT,
    presets: [
      {
        id: "rat-crunch",
        style: "Classic RAT Crunch",
        settings: { distortion: 4, filter: 4, volume: 6 },
        tips: [
          "The RAT's Filter knob works BACKWARDS — lower = brighter, higher = darker",
          "This catches everyone out: Filter is a low-pass, so turning it up REMOVES treble",
          "Low-to-medium distortion is where the RAT excels — it gets fizzy at high settings",
          "Jeff Beck, Radiohead's Thom Yorke, and Dave Grohl are famous RAT users",
          "Pairs exceptionally well with Vox-style and Fender-style amps",
          "The op-amp hard clipping gives it a unique raspy character unlike tube-style drives",
        ],
        whatToListenFor: [
          "Raspy, gritty texture — distinct from the smooth TS or transparent Klon",
          "Hard clipping edge — more aggressive attack than soft-clipping drives",
          "Filter setting changes the character dramatically — experiment",
        ],
        source: "ProCo RAT standard settings — Jeff Beck, Radiohead",
      },
      {
        id: "rat-lead",
        style: "Searing Lead",
        settings: { distortion: 7, filter: 5, volume: 5 },
        tips: [
          "Higher distortion for sustained lead tones — the RAT compresses and sustains well",
          "Filter around 5 rolls off the harshest fizz while keeping enough bite to cut through",
          "Works great for shoegaze and noise rock at higher settings",
          "The Fat RAT variant uses germanium diodes for a fuller, smoother version of this",
        ],
        whatToListenFor: [
          "Sustained, singing quality on single notes",
          "Controlled feedback that's usable and musical",
          "The transition from clean picking to driven is abrupt — that's the RAT character",
        ],
        source: "RAT high-gain application — alternative rock / shoegaze",
      },
    ],
  },

  // ─── OCD / COMPULSION FAMILY ────────────────────────────────
  {
    familyId: "ocd-family",
    familyName: "OCD / Versatile Drive",
    modelPatterns: ["compulsion-dist"],
    controlLayout: OCD_LAYOUT,
    presets: [
      {
        id: "ocd-crunch",
        style: "Marshall-in-a-Box",
        settings: { drive: 5, tone: 5, volume: 6, hp_lp: true },
        tips: [
          "HP mode = more headroom, tighter bass, better for higher-gain amps",
          "LP mode = more compressed, earlier breakup, better for cleans-to-crunch",
          "The OCD is one of the most versatile drive pedals — it can go from boost to near-distortion",
          "MOSFET clipping gives a unique feel — more open and dynamic than diode clipping",
          "HP mode into a Marshall-type amp gives convincing cranked Plexi tones at lower volumes",
        ],
        whatToListenFor: [
          "British-voiced midrange character — the OCD has a Marshall-like quality",
          "Touch sensitivity — cleans up well with guitar volume",
          "HP vs LP makes a dramatic difference — try both",
        ],
        source: "Fulltone OCD standard settings",
      },
    ],
  },

  // ─── BLUESBREAKER FAMILY ──────────────────────────────────
  {
    familyId: "bluesbreaker-family",
    familyName: "Marshall Bluesbreaker",
    modelPatterns: ["blues-od"],
    controlLayout: STANDARD_DRIVE_LAYOUT,
    presets: [
      {
        id: "bb-edge",
        style: "Edge of Breakup",
        settings: { drive: 3, tone: 6, level: 7 },
        tips: [
          "The Marshall Bluesbreaker is the original amp-in-a-box pedal — warm, dynamic, touch-sensitive",
          "At low drive it produces the sound of a cranked Marshall JTM45 at bedroom volume",
          "The circuit inspired the King of Tone, Morning Glory, and many other legendary pedals",
          "Responds extremely well to pick dynamics — light touch cleans up, dig in for crunch",
          "Stacks beautifully — one of the best foundation drives for layering other pedals on top",
        ],
        whatToListenFor: [
          "Warm, amp-like breakup — sounds like turning up a good Marshall",
          "Pick dynamics translate clearly — soft = clean, hard = crunchy",
          "Harmonic richness that blooms with sustain rather than compressing",
        ],
        source: "Marshall Bluesbreaker pedal — the original amp-in-a-box",
      },
      {
        id: "bb-pushed",
        style: "Pushed Blues Drive",
        settings: { drive: 6, tone: 5, level: 5 },
        tips: [
          "Higher drive brings out the Bluesbreaker's warm clipping character",
          "The midrange is fuller and warmer than a Tube Screamer — less nasal, more amp-like",
          "John Mayer, Joe Bonamassa, and countless session players rely on this circuit",
          "Into a Fender or Vox, it provides that 'big amp turned up' feel at any volume",
        ],
        whatToListenFor: [
          "Warm, thick overdrive that doesn't sound like a pedal",
          "Musical compression — notes bloom rather than squash",
          "Touch-sensitive response that rewards expressive playing",
        ],
        source: "Marshall Bluesbreaker pushed drive application",
      },
    ],
  },

  // ─── BB PREAMP FAMILY ─────────────────────────────────────
  {
    familyId: "bb-family",
    familyName: "BB Preamp",
    modelPatterns: ["bb-pre", "bb-pre-at"],
    controlLayout: BB_PREAMP_LAYOUT,
    presets: [
      {
        id: "bb-boost",
        style: "Full-Range Boost",
        settings: { gain: 3, bass: 5, treble: 5, volume: 7 },
        tips: [
          "The BB Preamp has a huge gain range — from clean boost to thick saturation",
          "Two-band EQ gives more tonal flexibility than single-Tone pedals",
          "At low gain it's one of the most transparent boosts available",
          "Popular with Andy Timmons and many Nashville session players",
          "Bass and Treble are cut controls — center position is flat, turning up cuts that frequency",
        ],
        whatToListenFor: [
          "Transparent, full-range boost at low gain settings",
          "The two-band EQ lets you shape the boost precisely",
          "More headroom and clarity than most drive pedals",
        ],
        source: "Xotic BB Preamp standard application",
      },
    ],
  },

  // ─── TIMMY FAMILY ─────────────────────────────────────────
  {
    familyId: "timmy-family",
    familyName: "Timmy",
    modelPatterns: ["timothy"],
    controlLayout: TIMMY_LAYOUT,
    presets: [
      {
        id: "timmy-transparent",
        style: "Transparent Stacker",
        settings: { gain: 4, bass: 5, treble: 5, volume: 6 },
        tips: [
          "The Timmy is designed to be invisible — it adds gain without coloring your tone",
          "Bass and Treble are CUT controls — noon is flat, turning up removes that frequency",
          "One of the best stacking pedals ever — put it before or after almost anything",
          "Paul Cochrane designed it to let your amp and guitar speak, not impose its own voice",
          "Works beautifully as an always-on light drive for added sustain and presence",
        ],
        whatToListenFor: [
          "Your amp's character should still be fully recognizable",
          "Added sustain and harmonic content without obvious coloring",
          "The bass/treble cuts let you fine-tune how it sits in the mix",
        ],
        source: "Paul Cochrane Timmy transparent OD philosophy",
      },
    ],
  },

  // ─── ZENDRIVE FAMILY ──────────────────────────────────────
  {
    familyId: "zendrive-family",
    familyName: "Zendrive",
    modelPatterns: ["zenith-drive"],
    controlLayout: STANDARD_DRIVE_LAYOUT,
    presets: [
      {
        id: "zen-fusion",
        style: "Dumble-Style Fusion",
        settings: { drive: 5, tone: 5, level: 5 },
        tips: [
          "The Zendrive is a Dumble Overdrive Special in a pedal — warm, vocal midrange",
          "Perfect for blues, fusion, and jazz-adjacent tones",
          "The voice control (Tone) shapes the midrange character — subtle but important",
          "Robben Ford, Larry Carlton territory — smooth, creamy, singing leads",
          "Works best into a clean amp with headroom — Fender Twin, JC120, or Dumble-style",
        ],
        whatToListenFor: [
          "Warm, vocal midrange — notes should almost speak",
          "Creamy sustain without harsh breakup",
          "Dumble-like harmonic complexity — rich, layered overtones",
        ],
        source: "Hermida Zendrive — Dumble-inspired design",
      },
    ],
  },

  // ─── FUZZ FACE FAMILY ─────────────────────────────────────
  {
    familyId: "fuzz-face-family",
    familyName: "Fuzz Face",
    modelPatterns: ["face-fuzz"],
    controlLayout: FUZZ_FACE_LAYOUT,
    presets: [
      {
        id: "fuzz-hendrix",
        style: "Hendrix Fuzz",
        settings: { fuzz: 7, volume: 6 },
        tips: [
          "The Fuzz Face has only two controls — Fuzz and Volume. Simple but powerful",
          "Germanium version is warmer, woolier, and cleans up better with guitar volume",
          "Silicon version is brighter, more aggressive, and more consistent",
          "The magic of the Fuzz Face is guitar volume cleanup — set Fuzz high, use guitar knob for dynamics",
          "Hendrix ran his germanium Fuzz Face into a cranked Marshall Plexi — that's the classic setup",
          "IMPORTANT: Fuzz Face must be FIRST in the chain — it hates buffers before it (low input impedance)",
          "In Fractal: put the Drive block before any other effects for authentic Fuzz Face behavior",
        ],
        whatToListenFor: [
          "Thick, wooly fuzz that cleans up when you back off the guitar volume",
          "Germanium: softer attack, warmer decay. Silicon: brighter, more sustain",
          "Octave-like overtones on the neck pickup above the 12th fret",
        ],
        source: "Jimi Hendrix, David Gilmour (silicon), Eric Johnson — classic fuzz technique",
      },
    ],
  },

  // ─── BIG MUFF FAMILY ──────────────────────────────────────
  {
    familyId: "big-muff-family",
    familyName: "Big Muff",
    modelPatterns: ["pi-fuzz", "pi-fuzz-bass"],
    controlLayout: BIG_MUFF_LAYOUT,
    presets: [
      {
        id: "muff-wall",
        style: "Wall of Fuzz",
        settings: { sustain: 7, tone: 5, volume: 5 },
        tips: [
          "The Big Muff is ALL about sustain — notes ring out forever with massive harmonic content",
          "The famous scooped mids are built into the circuit — it naturally cuts midrange",
          "This mid-scoop means it can disappear in a band mix — boost mids elsewhere to compensate",
          "Billy Corgan (Smashing Pumpkins), J Mascis (Dinosaur Jr), David Gilmour live tones",
          "Tone control is powerful — lower for thick bass, higher for cutting lead",
          "Works best into a clean amp — stacking with an already overdriven amp gets mushy fast",
        ],
        whatToListenFor: [
          "Massive, sustaining wall of fuzz with infinite decay",
          "Scooped midrange — fat lows and sizzling highs with a mid dip",
          "Single notes sustain and bloom into rich harmonics",
        ],
        source: "EHX Big Muff Pi — Billy Corgan, J Mascis, Gilmour",
      },
    ],
  },

  // ─── TONE BENDER FAMILY ───────────────────────────────────
  {
    familyId: "tone-bender-family",
    familyName: "Tone Bender",
    modelPatterns: ["bender-fuzz"],
    controlLayout: TONE_BENDER_LAYOUT,
    presets: [
      {
        id: "tb-classic",
        style: "Classic British Fuzz",
        settings: { fuzz: 6, tone: 5, volume: 5 },
        tips: [
          "More aggressive and biting than the Fuzz Face — raspy, spitting character",
          "Jimmy Page's early Led Zeppelin tones (I, II) were heavily Tone Bender influenced",
          "Jeff Beck's Yardbirds-era fuzz tones — aggressive, cutting, raw",
          "The MkII is the most famous version — three germanium transistors",
          "Like the Fuzz Face, it responds to guitar volume for cleanup — but retains more edge",
        ],
        whatToListenFor: [
          "Aggressive, spitting attack — more raspy than a Fuzz Face",
          "Rich harmonic content with a cutting edge",
          "Guitar volume cleanup maintains some grit even backed off",
        ],
        source: "Sola Sound Tone Bender — Jimmy Page, Jeff Beck",
      },
    ],
  },

  // ─── OCTAVIA FAMILY ───────────────────────────────────────
  {
    familyId: "octavia-family",
    familyName: "Octavia",
    modelPatterns: ["octave-dist"],
    controlLayout: OCTAVIA_LAYOUT,
    presets: [
      {
        id: "octavia-hendrix",
        style: "Octave-Up Fuzz",
        settings: { fuzz: 7, volume: 5 },
        tips: [
          "The Octavia adds an octave-up effect to the fuzz — most pronounced above the 12th fret",
          "Below the 12th fret it produces ring modulator-like dissonance — use intentionally",
          "Hendrix's Purple Haze solo is THE Octavia moment — neck pickup, upper frets",
          "Works best with single-coil pickups — humbuckers can make the octave effect less distinct",
          "Try it into a cranked amp for the classic Hendrix Band of Gypsys sound",
        ],
        whatToListenFor: [
          "Octave-up ring above the 12th fret — shimmery, bell-like harmonics",
          "Metallic, ring-mod textures on lower frets — intentionally dissonant",
          "The fuzz character underneath is thick and sustaining",
        ],
        source: "Roger Mayer Octavia — Hendrix Purple Haze, Band of Gypsys",
      },
    ],
  },

  // ─── DS-1 / DISTORTION FAMILY ─────────────────────────────
  {
    familyId: "ds1-family",
    familyName: "DS-1 / Boss Distortion",
    modelPatterns: ["ds1-distortion", "ds1-distortion-mod"],
    controlLayout: DS1_LAYOUT,
    presets: [
      {
        id: "ds1-punk",
        style: "Punk / Grunge Distortion",
        settings: { distortion: 6, tone: 4, level: 6 },
        tips: [
          "Kurt Cobain used a DS-1 for much of Nevermind — raw, aggressive, no-frills distortion",
          "Steve Vai and Joe Satriani also used DS-1s early in their careers",
          "The Tone control can be harsh above 7 — keep it moderate for usable aggression",
          "Op-amp hard clipping gives it a defined, cutting character",
          "Works well into clean amps where you want the pedal to provide all the distortion",
        ],
        whatToListenFor: [
          "Raw, aggressive distortion — less polished than amp distortion",
          "Defined attack with hard clipping edge",
          "Can be buzzy at high settings — that's the character, not a flaw",
        ],
        source: "Boss DS-1 — Kurt Cobain, Steve Vai, Joe Satriani",
      },
    ],
  },

  // ─── MXR DIST+ FAMILY ─────────────────────────────────────
  {
    familyId: "mxr-family",
    familyName: "MXR Distortion+ / DOD 250",
    modelPatterns: ["plus-dist", "od-250", "od-250-gray"],
    controlLayout: { knobs: [{ id: "distortion", label: "Distortion" }, { id: "output", label: "Output" }], switches: [] },
    presets: [
      {
        id: "mxr-classic",
        style: "Classic '70s Distortion",
        settings: { distortion: 5, output: 6 },
        tips: [
          "One of the original distortion pedals — Randy Rhoads used it extensively",
          "Simple circuit: op-amp with germanium diode clipping",
          "Bright, cutting character — sits on top of the mix",
          "Only two controls — Distortion and Output. Simplicity is the point",
          "Works great into Marshall-type amps for classic rock and early metal tones",
        ],
        whatToListenFor: [
          "Bright, aggressive distortion with germanium warmth underneath",
          "Cuts through a band mix easily due to upper-mid emphasis",
          "Simple, direct — what you set is what you get",
        ],
        source: "MXR Distortion+ / DOD 250 — Randy Rhoads, Bob Mould, YJM",
      },
    ],
  },

  // ─── TAPE DIST FAMILY ─────────────────────────────────────
  {
    familyId: "tape-dist-family",
    familyName: "Tape Distortion",
    modelPatterns: ["tape-dist"],
    controlLayout: STANDARD_DRIVE_LAYOUT,
    presets: [
      {
        id: "tape-warmth",
        style: "Tape Saturation Warmth",
        settings: { drive: 4, tone: 5, level: 5 },
        tips: [
          "Emulates the saturation characteristics of overdriven tape machines",
          "Soft, warm compression — nothing like transistor or tube clipping",
          "Great as a subtle always-on effect to add analog warmth to digital signals",
          "The compression is gentle and musical — rounds off harsh transients",
          "Try it at the END of your chain (after amp) for a mastering-style effect",
        ],
        whatToListenFor: [
          "Gentle, warm compression — transients are softened, not squashed",
          "Subtle harmonic enhancement — warmth without obvious distortion",
          "High frequencies are gently rolled off like real tape",
        ],
        source: "Tape saturation emulation — studio technique",
      },
    ],
  },

  // ─── HARD FUZZ FAMILY (FET Fuzz) ──────────────────────────
  {
    familyId: "fet-fuzz-family",
    familyName: "Hard Fuzz",
    modelPatterns: ["hard-fuzz"],
    controlLayout: STANDARD_DRIVE_LAYOUT,
    presets: [
      {
        id: "fet-wild",
        style: "Wild Oscillating Fuzz",
        settings: { drive: 7, tone: 5, level: 4 },
        tips: [
          "The Hard Fuzz is based on the ZVEX Fuzz Factory — wild, unpredictable, chaotic",
          "Can self-oscillate at extreme settings — produces synth-like squeals",
          "NOT a subtle pedal — this is for experimental textures and noise",
          "Matt Bellamy (Muse) is a famous user — those wild solo sounds",
          "Level lower than usual because this thing gets LOUD and unruly fast",
        ],
        whatToListenFor: [
          "Wild, gated fuzz textures — sputtery, velcro-like at some settings",
          "Self-oscillation and feedback at extreme settings",
          "Unpredictable, chaotic — that's the appeal",
        ],
        source: "ZVEX Fuzz Factory — Matt Bellamy, Jack White",
      },
    ],
  },

  // ─── TREBLE BOOST FAMILY ──────────────────────────────────
  {
    familyId: "treble-boost-family",
    familyName: "Treble Booster",
    modelPatterns: ["treble-boost"],
    controlLayout: TREBLE_BOOST_LAYOUT,
    presets: [
      {
        id: "tb-may",
        style: "Brian May Boost",
        settings: { boost: 7 },
        tips: [
          "The Rangemaster treble booster into a cranked Vox AC30 = Brian May's tone",
          "It cuts bass and boosts upper mids/treble — makes the amp break up more in the frequencies that cut through",
          "Tony Iommi's early Sabbath tones used a Rangemaster into a cranked Laney — heavy riffing with a treble boost",
          "Rory Gallagher was another famous Rangemaster user — raw, cutting blues rock",
          "One knob: Boost. Set it and let the amp do the rest",
          "Works best into a cranked, non-master-volume amp — it pushes the amp into natural breakup",
        ],
        whatToListenFor: [
          "Cutting, bright breakup from the amp — the boost pushes the top end into distortion",
          "Bass is tighter because it's cut before the amp — less flub, more definition",
          "Single-note lines cut through everything — the treble boost is a lead player's weapon",
        ],
        source: "Dallas Rangemaster — Brian May, Tony Iommi, Rory Gallagher",
      },
    ],
  },

  // ─── MXR M77 CUSTOM OD FAMILY ────────────────────────────
  {
    familyId: "mxr-77-family",
    familyName: "MXR Custom Badass '77 OD",
    modelPatterns: ["77-custom-od"],
    controlLayout: MXR_77_LAYOUT,
    presets: [
      {
        id: "mxr77-standard",
        style: "Versatile Rhythm OD",
        settings: { drive: 5, tone: 5, output: 6, bass_100hz: 5 },
        tips: [
          "The 100Hz knob is the secret weapon — it controls low-end thump independently of the Tone knob",
          "Great for dialing out bass mud while keeping a warm overall tone",
          "Versatile enough for blues to hard rock — covers a lot of ground",
          "The MXR M77 bridges the gap between overdrive and distortion",
        ],
        whatToListenFor: [
          "Warm, full-bodied overdrive with separate bass control",
          "The 100Hz knob tightens or loosens the low end independently",
          "Dynamic response — cleans up well with guitar volume",
        ],
        source: "MXR M77 Custom Badass Modified O.D.",
      },
      {
        id: "mxr77-tight",
        style: "Tight Modern Rock",
        settings: { drive: 7, tone: 6, output: 5, bass_100hz: 3 },
        tips: [
          "Cut the 100Hz to tighten up palm mutes and chugs",
          "Higher drive pushes into distortion territory — great for modern rock rhythm",
          "Works well stacked after a TS-style boost for extra tightness",
        ],
        whatToListenFor: [
          "Tight, focused low end with aggressive drive",
          "Defined palm mutes without low-end flub",
          "Enough gain for hard rock without needing a high-gain amp",
        ],
        source: "MXR M77 high-gain application",
      },
    ],
  },

  // ─── JHS ANGRY CHARLIE FAMILY ─────────────────────────────
  {
    familyId: "jhs-angry-family",
    familyName: "JHS Angry Charlie",
    modelPatterns: ["angry-chuck"],
    controlLayout: JHS_ANGRY_LAYOUT,
    presets: [
      {
        id: "angry-plexi",
        style: "JCM800 Crunch",
        settings: { volume: 6, drive: 5, tone: 5, presence: 5 },
        tips: [
          "The Angry Charlie captures the JCM800 in a pedal — tight, aggressive, British crunch",
          "The Presence control adds upper-harmonic shimmer like a real Marshall's presence knob",
          "Perfect for classic rock and hard rock rhythm tones without needing a cranked Marshall",
          "Responds well to guitar volume — roll back for cleaner crunch, dig in for full roar",
        ],
        whatToListenFor: [
          "Tight, punchy British crunch — JCM800 character in a box",
          "Presence adds air and shimmer without harshness",
          "Dynamic response that rewards expressive playing",
        ],
        source: "JHS Angry Charlie — Marshall JCM800 in a pedal",
      },
      {
        id: "angry-high-gain",
        style: "Full Roar Lead",
        settings: { volume: 5, drive: 8, tone: 6, presence: 4 },
        tips: [
          "Crank the drive for singing lead tones with Marshall-like sustain",
          "Back off presence slightly to avoid harshness at high gain",
          "Perfect for that JCM800-in-a-pedal lead tone",
          "Stacks well after a TS for extra tightness and mid-push",
        ],
        whatToListenFor: [
          "Sustained, singing lead tones with Marshall-like compression",
          "Rich harmonics that bloom as notes sustain",
          "Tight low end even at high gain settings",
        ],
        source: "JHS Angry Charlie high-gain application",
      },
    ],
  },

  // ─── DARKGLASS FAMILY ─────────────────────────────────────
  {
    familyId: "darkglass-family",
    familyName: "Darkglass B7K Bass Preamp",
    modelPatterns: ["blackglass-7k"],
    controlLayout: DARKGLASS_LAYOUT,
    presets: [
      {
        id: "darkglass-modern",
        style: "Modern Metal Bass",
        settings: { drive: 6, blend: 5, level: 5, bass: 6, treble: 6, mids: 4 },
        tips: [
          "The Blend knob is crucial — it mixes clean and driven signal for bass clarity",
          "Scooped mids with boosted bass and treble = modern metal bass tone",
          "The Darkglass B7K is THE modern metal bass preamp — used on countless records",
          "Can also work as a DI for recording direct bass tones",
        ],
        whatToListenFor: [
          "Aggressive grind with clean low-end preserved through the blend control",
          "Defined pick attack even at high drive settings",
          "Modern, scooped bass tone that sits perfectly in a metal mix",
        ],
        source: "Darkglass B7K Ultra — modern metal bass standard",
      },
      {
        id: "darkglass-gritty",
        style: "Gritty Rock Bass",
        settings: { drive: 4, blend: 7, level: 5, bass: 5, treble: 5, mids: 5 },
        tips: [
          "Higher blend for more of the driven signal — great for rock bass",
          "Moderate drive keeps definition while adding grit and presence",
          "Flat EQ with the blend doing the heavy lifting — warm and present",
        ],
        whatToListenFor: [
          "Warm grit that adds presence without losing low-end weight",
          "Bass notes retain fundamental clarity even with drive engaged",
          "Full, authoritative bass tone that fills the mix",
        ],
        source: "Darkglass B7K rock bass application",
      },
    ],
  },

  // ─── BOSOM BOOST FAMILY ───────────────────────────────────
  {
    familyId: "bosom-boost-family",
    familyName: "Friedman Bosom Boost",
    modelPatterns: ["bosom-boost"],
    controlLayout: BOSOM_BOOST_LAYOUT,
    presets: [
      {
        id: "bosom-clean",
        style: "Clean Boost",
        settings: { volume: 7, tight: 3 },
        tips: [
          "Simple, transparent clean boost — Volume controls output, Tight controls bass cut",
          "Low Tight = full bass response, High Tight = tighter low end",
          "Perfect for pushing an amp into natural breakup without changing the tone",
          "Friedman designed this as a companion to their amps — works with any amp",
        ],
        whatToListenFor: [
          "Your amp's character preserved but louder and more present",
          "Tight control subtly shapes the low end — useful for tightening flubby amps",
          "Transparent volume increase without tonal coloring",
        ],
        source: "Friedman Bosom Boost — clean boost application",
      },
      {
        id: "bosom-tight",
        style: "Tight Boost for High-Gain",
        settings: { volume: 6, tight: 7 },
        tips: [
          "High Tight setting cuts bass before the amp — tightens high-gain tones dramatically",
          "Similar concept to using a TS as a boost but without the mid-hump coloring",
          "Works perfectly in front of Friedman, Marshall, or Mesa amps on high-gain channels",
        ],
        whatToListenFor: [
          "Significantly tighter low end — palm mutes become more defined",
          "Less low-end flub without losing warmth in the midrange",
          "Clean boost character with bass tightening — not a drive pedal",
        ],
        source: "Friedman Bosom Boost tight boost application",
      },
    ],
  },

  // ─── BOX O' CRUNCH FAMILY ────────────────────────────────
  {
    familyId: "box-crunch-family",
    familyName: "Box o' Crunch",
    modelPatterns: ["box-o-crunch"],
    controlLayout: STANDARD_DRIVE_LAYOUT,
    presets: [
      {
        id: "box-rhythm",
        style: "High-Gain Rhythm",
        settings: { drive: 7, tone: 5, level: 5 },
        tips: [
          "Marshall-like high-gain distortion in a box — aggressive and tight",
          "Great for hard rock and metal rhythm tones into a clean amp",
          "The tone control shapes the top end — lower for darker, higher for more cut",
        ],
        whatToListenFor: [
          "Tight, aggressive distortion with Marshall-like character",
          "Defined palm mutes and power chords",
          "British-voiced midrange even at high gain",
        ],
        source: "High-gain Marshall-style distortion pedal",
      },
      {
        id: "box-crunch",
        style: "Classic Crunch",
        settings: { drive: 4, tone: 6, level: 6 },
        tips: [
          "Moderate drive for crunchy rhythm tones — AC/DC, classic rock territory",
          "Responds well to pick dynamics at lower drive settings",
          "Great foundation tone for stacking with a boost for lead tones",
        ],
        whatToListenFor: [
          "Crunchy, dynamic rhythm tone",
          "Cleans up with lighter picking",
          "Full, present midrange with enough gain for rock",
        ],
        source: "Box o' Crunch moderate gain application",
      },
    ],
  },

  // ─── COLORTONE FAMILY ─────────────────────────────────────
  {
    familyId: "colortone-family",
    familyName: "Colortone Booster / OD",
    modelPatterns: ["colortone-booster", "colortone-od"],
    controlLayout: STANDARD_DRIVE_LAYOUT,
    presets: [
      {
        id: "colortone-vintage",
        style: "Vintage British Boost",
        settings: { drive: 3, tone: 6, level: 7 },
        tips: [
          "Inspired by vintage Dallas Rangemaster-style boosts with more tonal flexibility",
          "Jeff Beck-style treble boost character — bright, cutting, dynamic",
          "Great for pushing a Vox or Marshall into singing, harmonically rich breakup",
        ],
        whatToListenFor: [
          "Bright, cutting boost that pushes the amp into breakup",
          "Vintage character with harmonic sparkle",
          "Dynamic response — pick hard for crunch, light for shimmer",
        ],
        source: "Vintage British boost circuit — Jeff Beck territory",
      },
      {
        id: "colortone-drive",
        style: "Colored Overdrive",
        settings: { drive: 6, tone: 5, level: 5 },
        tips: [
          "Higher drive brings out the vintage character of the circuit",
          "Not transparent — intentionally adds color and harmonic character",
          "Works well with single-coils for classic rock tones",
        ],
        whatToListenFor: [
          "Warm, vintage-voiced overdrive with character",
          "Harmonically rich with a musical quality to the coloring",
          "Responds well to guitar volume for cleanup",
        ],
        source: "Colortone overdrive application",
      },
    ],
  },

  // ─── ESOTERIC / XOTIC FAMILY ──────────────────────────────
  {
    familyId: "esoteric-family",
    familyName: "Xotic Boosters",
    modelPatterns: ["esoteric-acb", "esoteric-bass-rcb", "esoteric-rcb"],
    controlLayout: ESOTERIC_LAYOUT,
    presets: [
      {
        id: "esoteric-clean",
        style: "Clean Boost",
        settings: { gain: 3, bass: 5, treble: 5, volume: 7 },
        tips: [
          "Xotic boosters are designed for transparent signal enhancement",
          "Two-band EQ lets you shape the boost precisely to your amp",
          "The AC Booster adds a touch of grit, the RC is more compressed and tube-like",
          "Great as an always-on tone enhancer — adds presence and sparkle",
        ],
        whatToListenFor: [
          "Transparent boost with precise EQ shaping",
          "Your amp's character enhanced without being covered up",
          "Added presence and definition in the mix",
        ],
        source: "Xotic AC/RC Booster — studio-quality boost",
      },
      {
        id: "esoteric-driven",
        style: "Pushed Boost / Light OD",
        settings: { gain: 6, bass: 4, treble: 6, volume: 5 },
        tips: [
          "Higher gain pushes into light overdrive territory",
          "Cut some bass for tighter response, boost treble for more presence",
          "The Xotic boosters excel as stackers — put them before or after other drives",
        ],
        whatToListenFor: [
          "Light, musical overdrive with clarity",
          "Defined note separation even with drive engaged",
          "Smooth, usable breakup that responds to picking dynamics",
        ],
        source: "Xotic AC/RC Booster driven application",
      },
    ],
  },

  // ─── ETERNAL LOVE FAMILY ──────────────────────────────────
  {
    familyId: "eternal-love-family",
    familyName: "Eternal Love",
    modelPatterns: ["eternal-love"],
    controlLayout: STANDARD_DRIVE_LAYOUT,
    presets: [
      {
        id: "eternal-transparent",
        style: "Transparent Low-Gain OD",
        settings: { drive: 3, tone: 5, level: 6 },
        tips: [
          "Inspired by the Lovepedal Eternity — transparent, open overdrive",
          "Low drive settings yield a beautiful, shimmery edge-of-breakup tone",
          "Works best into a clean amp where it provides all the color",
        ],
        whatToListenFor: [
          "Open, airy overdrive without heavy compression",
          "Shimmery harmonics at low drive settings",
          "Natural, amp-like breakup character",
        ],
        source: "Lovepedal Eternity — transparent OD",
      },
      {
        id: "eternal-pushed",
        style: "Pushed Blues Drive",
        settings: { drive: 6, tone: 5, level: 5 },
        tips: [
          "Higher drive brings out a smooth, singing quality",
          "Great for blues and classic rock lead tones",
          "Maintains clarity even at higher gain settings",
        ],
        whatToListenFor: [
          "Smooth, singing sustain for lead playing",
          "Warm, musical compression",
          "Touch-sensitive dynamics throughout the gain range",
        ],
        source: "Lovepedal Eternity pushed application",
      },
    ],
  },

  // ─── FAS DRIVE FAMILY ─────────────────────────────────────
  {
    familyId: "fas-drive-family",
    familyName: "FAS Boost / LED Drive",
    modelPatterns: ["fas-boost", "fas-led-drive"],
    controlLayout: FAS_DRIVE_LAYOUT,
    presets: [
      {
        id: "fas-clean-boost",
        style: "Clean Boost",
        settings: { drive: 2, level: 7 },
        tips: [
          "Fractal's custom boost design — transparent volume increase",
          "Great for level matching or pushing an amp into breakup",
          "No EQ coloring — what goes in comes out louder",
        ],
        whatToListenFor: [
          "Transparent volume increase with no tonal change",
          "Your amp pushed harder for natural breakup",
          "Clean, uncolored signal boost",
        ],
        source: "Fractal Audio custom boost design",
      },
      {
        id: "fas-led-crunch",
        style: "LED Drive Crunch",
        settings: { drive: 6, level: 5 },
        tips: [
          "The LED Drive uses LED clipping for a unique, open breakup character",
          "More headroom than standard diode clipping — stays open longer",
          "Fractal's take on a simple, effective drive circuit",
        ],
        whatToListenFor: [
          "Open, dynamic drive with LED clipping character",
          "More headroom before heavy compression",
          "Natural, amp-like response to picking dynamics",
        ],
        source: "Fractal Audio LED Drive — custom design",
      },
    ],
  },

  // ─── FET BOOST / PREAMP FAMILY ────────────────────────────
  {
    familyId: "fet-family",
    familyName: "FET Boost / Preamp",
    modelPatterns: ["fet-boost", "fet-preamp"],
    controlLayout: FET_LAYOUT,
    presets: [
      {
        id: "fet-clean-boost",
        style: "Clean FET Boost",
        settings: { gain: 3, level: 7 },
        tips: [
          "FET-based boost — clean, transparent, with a touch of warmth",
          "The FET Preamp is associated with The Edge's U2 tones via the Korg SDD-3000 preamp section",
          "Adds slight compression and warmth characteristic of FET circuits",
        ],
        whatToListenFor: [
          "Clean boost with a subtle FET warmth",
          "Slight compression that makes notes feel more even",
          "Transparent enhancement of your amp's character",
        ],
        source: "FET boost/preamp — The Edge, studio preamp style",
      },
      {
        id: "fet-pushed",
        style: "Pushed Preamp",
        settings: { gain: 6, level: 5 },
        tips: [
          "Higher gain pushes the FET circuit into gentle saturation",
          "Not a heavy drive — more like a preamp stage being pushed",
          "Great as an always-on tone enhancer for added presence",
        ],
        whatToListenFor: [
          "Gentle FET saturation — warm and musical",
          "Added harmonic content without heavy distortion",
          "Amp-like feel from the FET circuit topology",
        ],
        source: "FET preamp driven application",
      },
    ],
  },

  // ─── FULL-DRIVE 2 FAMILY ──────────────────────────────────
  {
    familyId: "full-od-family",
    familyName: "Fulltone Full-Drive 2",
    modelPatterns: ["full-od"],
    controlLayout: FULL_OD_LAYOUT,
    presets: [
      {
        id: "full-od-standard",
        style: "Standard Overdrive",
        settings: { drive: 5, tone: 5, volume: 6 },
        tips: [
          "The Full-Drive 2 is a MOSFET-based overdrive with a built-in boost",
          "More open and dynamic than a Tube Screamer — wider frequency response",
          "Excellent for blues, rock, and country — versatile mid-gain drive",
        ],
        whatToListenFor: [
          "Open, dynamic overdrive with MOSFET character",
          "Fuller frequency response than a TS-style drive",
          "Musical compression that rewards dynamic playing",
        ],
        source: "Fulltone Full-Drive 2 standard application",
      },
      {
        id: "full-od-boost",
        style: "Boosted Lead",
        settings: { drive: 7, tone: 6, volume: 5 },
        tips: [
          "Higher drive for sustaining lead tones",
          "The Full-Drive 2's boost channel can be engaged for even more gain",
          "Great for blues-rock lead tones with singing sustain",
        ],
        whatToListenFor: [
          "Singing lead tones with smooth sustain",
          "Rich harmonics that bloom at higher drive settings",
          "Defined note separation even with high drive",
        ],
        source: "Fulltone Full-Drive 2 lead application",
      },
    ],
  },

  // ─── GAUSS / FLUX-DRIVE FAMILY ────────────────────────────
  {
    familyId: "gauss-family",
    familyName: "Gauss Drive (Mesa Flux-Drive)",
    modelPatterns: ["gauss-drive"],
    controlLayout: STANDARD_DRIVE_LAYOUT,
    presets: [
      {
        id: "gauss-standard",
        style: "Mesa-Style Overdrive",
        settings: { drive: 5, tone: 5, level: 6 },
        tips: [
          "Based on the Mesa Flux-Drive — warm, tube-like overdrive",
          "Designed to complement Mesa amps but works well with any amp",
          "Warm, rounded drive character with Mesa's signature voicing",
        ],
        whatToListenFor: [
          "Warm, tube-like overdrive character",
          "Smooth compression with musical clipping",
          "Mesa-voiced midrange — slightly scooped but present",
        ],
        source: "Mesa Flux-Drive — warm tube-style overdrive",
      },
      {
        id: "gauss-pushed",
        style: "Pushed Mesa Drive",
        settings: { drive: 7, tone: 6, level: 5 },
        tips: [
          "Higher drive for more aggressive Mesa-style tones",
          "Great for heavier rock applications where you want Mesa character from a pedal",
        ],
        whatToListenFor: [
          "Thicker, more saturated Mesa-style drive",
          "Defined note separation even with higher gain",
          "Rich harmonics with smooth top end",
        ],
        source: "Mesa Flux-Drive pushed application",
      },
    ],
  },

  // ─── GRIDDLE CAKE / HOT CAKE FAMILY ───────────────────────
  {
    familyId: "griddle-family",
    familyName: "Griddle Cake (Crowther Hot Cake)",
    modelPatterns: ["griddle-cake"],
    controlLayout: GRIDDLE_LAYOUT,
    presets: [
      {
        id: "griddle-standard",
        style: "Hot Cake Crunch",
        settings: { drive: 5, presence: 5, level: 6 },
        tips: [
          "The Hot Cake is a New Zealand classic — warm, crunchy overdrive with unique Presence control",
          "Presence controls the upper-harmonic content independently from the drive",
          "Extremely amp-like response — designed to sound like a cranked amp at any volume",
        ],
        whatToListenFor: [
          "Warm, amp-like crunch with smooth compression",
          "Presence adds shimmer and air without harshness",
          "Dynamic response that cleans up beautifully with guitar volume",
        ],
        source: "Crowther Hot Cake — New Zealand classic overdrive",
      },
      {
        id: "griddle-pushed",
        style: "Full Drive",
        settings: { drive: 8, presence: 4, level: 5 },
        tips: [
          "Higher drive for singing, sustained tones",
          "Back off presence to tame the top end at high gain",
          "Great for blues-rock lead work — smooth and musical",
        ],
        whatToListenFor: [
          "Smooth, singing sustain with warm character",
          "Musical compression that never feels squashed",
          "Harmonically rich overtones that bloom with sustain",
        ],
        source: "Crowther Hot Cake high-drive application",
      },
    ],
  },

  // ─── GUARDIAN / GREER LIGHTSPEED FAMILY ───────────────────
  {
    familyId: "guardian-family",
    familyName: "Guardian Photon Speed (Greer Lightspeed)",
    modelPatterns: ["guardian-photon-speed"],
    controlLayout: FULL_OD_LAYOUT,
    presets: [
      {
        id: "guardian-transparent",
        style: "Transparent Low-Gain",
        settings: { drive: 3, tone: 5, volume: 7 },
        tips: [
          "The Greer Lightspeed is one of the most transparent overdrives ever made",
          "Designed to be invisible — it adds gain without imposing its own character",
          "Perfect as an always-on drive for added sustain and warmth",
        ],
        whatToListenFor: [
          "Your amp tone with added sustain and gentle breakup",
          "Extremely transparent — minimal EQ coloring",
          "Dynamic response that follows your picking perfectly",
        ],
        source: "Greer Lightspeed — transparent overdrive",
      },
      {
        id: "guardian-medium",
        style: "Medium Drive",
        settings: { drive: 6, tone: 5, volume: 5 },
        tips: [
          "Even at medium drive, the Lightspeed maintains transparency",
          "Great for blues and roots music where you want the guitar and amp to shine",
          "Stacks beautifully with other drives",
        ],
        whatToListenFor: [
          "Smooth, dynamic overdrive that still sounds like your amp",
          "Natural compression that enhances sustain",
          "Clear note definition even with drive engaged",
        ],
        source: "Greer Lightspeed medium drive application",
      },
    ],
  },

  // ─── HEARTPEDAL FAMILY ────────────────────────────────────
  {
    familyId: "heartpedal-family",
    familyName: "Heartpedal 11",
    modelPatterns: ["heartpedal-11"],
    controlLayout: STANDARD_DRIVE_LAYOUT,
    presets: [
      {
        id: "heart-standard",
        style: "Amp-in-a-Box",
        settings: { drive: 5, tone: 5, level: 6 },
        tips: [
          "Lovepedal-inspired amp-in-a-box circuit — warm, dynamic overdrive",
          "Designed to sound like a cranked amp at any volume level",
          "Responds beautifully to pick dynamics and guitar volume",
        ],
        whatToListenFor: [
          "Warm, amp-like breakup character",
          "Dynamic response that rewards expressive playing",
          "Musical compression that enhances sustain",
        ],
        source: "Lovepedal amp-in-a-box circuit",
      },
      {
        id: "heart-pushed",
        style: "Pushed Lead",
        settings: { drive: 7, tone: 6, level: 5 },
        tips: [
          "Higher drive for singing lead tones with smooth sustain",
          "Great for blues and classic rock solos",
        ],
        whatToListenFor: [
          "Smooth, singing lead tones",
          "Rich harmonics that develop as notes sustain",
          "Warm clipping character",
        ],
        source: "Lovepedal amp-in-a-box lead application",
      },
    ],
  },

  // ─── HOODOO DRIVE FAMILY ──────────────────────────────────
  {
    familyId: "hoodoo-family",
    familyName: "Hoodoo Drive",
    modelPatterns: ["hoodoo-drive"],
    controlLayout: STANDARD_DRIVE_LAYOUT,
    presets: [
      {
        id: "hoodoo-warm",
        style: "Warm Blues OD",
        settings: { drive: 4, tone: 4, level: 6 },
        tips: [
          "Warm, bluesy overdrive with a touch of darkness",
          "Lower tone settings emphasize the warm, round character",
          "Perfect for blues rhythm playing and mellow lead work",
        ],
        whatToListenFor: [
          "Warm, round overdrive with soft clipping",
          "Mellow, smooth tone that sits well in a blues mix",
          "Gentle compression that enhances sustain naturally",
        ],
        source: "Warm blues overdrive application",
      },
      {
        id: "hoodoo-biting",
        style: "Biting Blues Drive",
        settings: { drive: 6, tone: 6, level: 5 },
        tips: [
          "Higher tone for more bite and cut in a band context",
          "Medium-high drive for sustaining blues lead tones",
          "Great for BB King-style lead work with a biting edge",
        ],
        whatToListenFor: [
          "Blues drive with more bite and presence",
          "Sustaining lead tones that cut through",
          "Dynamic response to pick attack",
        ],
        source: "Hoodoo Drive blues lead application",
      },
    ],
  },

  // ─── HORIZON PRECISION DRIVE FAMILY ───────────────────────
  {
    familyId: "horizon-family",
    familyName: "Horizon Precision Drive",
    modelPatterns: ["horizon-precision"],
    controlLayout: HORIZON_LAYOUT,
    presets: [
      {
        id: "horizon-djent",
        style: "Djent Tightener",
        settings: { drive: 4, tone: 6, level: 7, attack: 7, bright: true, gate: true },
        tips: [
          "THE djent tightener — designed by Misha Mansoor (Periphery) for modern metal",
          "The Attack knob controls how much pick attack comes through — higher = more defined",
          "Gate switch engages a noise gate for tight, silent stops between chugs",
          "Bright switch adds top-end presence for cutting through dense mixes",
          "Used as a boost before a high-gain amp — low drive, high level, high attack",
        ],
        whatToListenFor: [
          "Extremely tight, defined palm mutes with no flub",
          "Pick attack is precise and percussive",
          "Silent stops between notes — the gate keeps it clean",
        ],
        source: "Horizon Devices Precision Drive — Misha Mansoor / Periphery",
      },
      {
        id: "horizon-smooth",
        style: "Smooth Lead Boost",
        settings: { drive: 3, tone: 4, level: 6, attack: 3, bright: false, gate: false },
        tips: [
          "Lower attack and tone for smoother, more legato-friendly lead tones",
          "Gate off for natural sustain on lead passages",
          "Even the Precision Drive can do smooth — back off attack and tone",
        ],
        whatToListenFor: [
          "Smoother lead tones with natural sustain",
          "Less percussive attack for legato and flowing lines",
          "Warm, musical boost into the amp's gain channel",
        ],
        source: "Horizon Precision Drive lead application",
      },
    ],
  },

  // ─── INTEGRAL PREAMP FAMILY ───────────────────────────────
  {
    familyId: "integral-family",
    familyName: "Integral Preamp",
    modelPatterns: ["integral-pre"],
    controlLayout: INTEGRAL_LAYOUT,
    presets: [
      {
        id: "integral-clean",
        style: "Studio Clean Boost",
        settings: { gain: 3, level: 7 },
        tips: [
          "Clean, studio-quality preamp boost — transparent signal enhancement",
          "TC Electronic-inspired design for pristine signal handling",
          "Perfect as an always-on tone enhancer in front of the amp",
        ],
        whatToListenFor: [
          "Transparent signal boost with studio-quality clarity",
          "No coloring — pure, clean level increase",
          "Preserved dynamics and frequency response",
        ],
        source: "TC Electronic-style studio preamp boost",
      },
      {
        id: "integral-pushed",
        style: "Pushed Preamp Stage",
        settings: { gain: 6, level: 5 },
        tips: [
          "Higher gain to push the preamp into gentle saturation",
          "Adds subtle harmonic content and compression",
          "Great for adding a touch of studio warmth to the signal",
        ],
        whatToListenFor: [
          "Subtle harmonic warmth from the preamp saturation",
          "Gentle compression that evens out dynamics",
          "Warm, musical character added to the signal",
        ],
        source: "Integral preamp pushed application",
      },
    ],
  },

  // ─── JAM RAY / JAN RAY FAMILY ────────────────────────────
  {
    familyId: "jam-ray-family",
    familyName: "Jam Ray (Jan Ray)",
    modelPatterns: ["jam-ray"],
    controlLayout: JAM_RAY_LAYOUT,
    presets: [
      {
        id: "jam-ray-nashville",
        style: "Nashville Transparent OD",
        settings: { drive: 3, tone: 5, volume: 6, bass: 5 },
        tips: [
          "The Jan Ray is a Nashville studio favorite — transparent, dynamic, musical",
          "The Bass control lets you dial in exactly how much low end you want",
          "Perfect for country, blues, and worship — always-on edge-of-breakup",
          "Extremely touch-sensitive — responds to every nuance of your playing",
        ],
        whatToListenFor: [
          "Transparent, shimmery edge-of-breakup tone",
          "Exceptional touch sensitivity — dynamics translate perfectly",
          "Clean, musical compression that enhances your playing",
        ],
        source: "Vemuram Jan Ray — Nashville session standard",
      },
      {
        id: "jam-ray-driven",
        style: "Driven Blues Tone",
        settings: { drive: 6, tone: 5, volume: 5, bass: 4 },
        tips: [
          "Higher drive for blues lead work with smooth, musical breakup",
          "Cut a little bass for tighter response at higher drive",
          "Maintains its transparent character even when pushed",
        ],
        whatToListenFor: [
          "Smooth, singing blues lead tone",
          "Musical compression that enhances sustain",
          "Transparent drive character — your guitar and amp shine through",
        ],
        source: "Vemuram Jan Ray driven application",
      },
    ],
  },

  // ─── METAL ZONE FAMILY ────────────────────────────────────
  {
    familyId: "metal-zone-family",
    familyName: "Metal Zone (Boss MT-2)",
    modelPatterns: ["m-zone-dist"],
    controlLayout: METAL_ZONE_LAYOUT,
    presets: [
      {
        id: "mz-scooped",
        style: "Scooped Metal",
        settings: { level: 6, drive: 7, low: 7, high: 7, mid: 3, mid_freq: 5 },
        tips: [
          "The Boss MT-2 Metal Zone — the most controversial pedal ever made",
          "The parametric mid EQ is the key — sweep the Mid Freq to find resonant spots",
          "Scooped settings are the classic MT-2 sound — all lows and highs with cut mids",
          "Works surprisingly well in the effects loop or as a preamp into a power amp",
        ],
        whatToListenFor: [
          "Massive, scooped distortion — fat lows, sizzling highs, carved mids",
          "The parametric mid lets you precisely control where the scoop sits",
          "High gain with lots of sustain",
        ],
        source: "Boss MT-2 Metal Zone — classic scooped metal tone",
      },
      {
        id: "mz-mid-push",
        style: "Mid-Heavy Crunch",
        settings: { level: 5, drive: 5, low: 5, high: 5, mid: 7, mid_freq: 5 },
        tips: [
          "Boosting the mids on a Metal Zone gives it a completely different character",
          "More cutting, aggressive tone that sits better in a band mix",
          "Lower drive with mid-push = surprisingly usable rock/metal crunch",
          "This is the 'secret' Metal Zone setting that session players actually use",
        ],
        whatToListenFor: [
          "Cutting, mid-forward distortion that sits well in a mix",
          "More defined and musical than the typical scooped setting",
          "Aggressive but controlled — great for rhythm playing",
        ],
        source: "Boss MT-2 mid-boosted application — the 'secret' setting",
      },
    ],
  },

  // ─── MASTER FUZZ / MAESTRO FUZZ-TONE FAMILY ───────────────
  {
    familyId: "master-fuzz-family",
    familyName: "Maestro Fuzz-Tone",
    modelPatterns: ["master-fuzz"],
    controlLayout: MASTER_FUZZ_LAYOUT,
    presets: [
      {
        id: "master-satisfaction",
        style: "Satisfaction Fuzz",
        settings: { volume: 5, attack: 7 },
        tips: [
          "THE original fuzz tone — Keith Richards' Satisfaction riff was played through a Maestro FZ-1",
          "The Attack knob controls the fuzz amount — it's basically a 'fuzz' control",
          "Raw, buzzy, and aggressive — this is how fuzz began",
          "Simple circuit: two controls, massive sound",
        ],
        whatToListenFor: [
          "Raw, buzzy fuzz with a distinct vintage character",
          "The original fuzz sound — brighter and buzzier than a Fuzz Face",
          "Aggressive, unrefined — that's the charm",
        ],
        source: "Maestro FZ-1 Fuzz-Tone — Keith Richards, Rolling Stones",
      },
      {
        id: "master-full-blast",
        style: "Full Attack Fuzz",
        settings: { volume: 5, attack: 10 },
        tips: [
          "Full attack for maximum fuzz — the original fuzz factory set to destroy",
          "Massive, saturated fuzz with tons of harmonic content",
          "Not subtle — this is full-tilt vintage fuzz at its rawest",
        ],
        whatToListenFor: [
          "Maximum fuzz saturation with vintage character",
          "Harmonically rich, buzzy, and aggressive",
          "Notes sustain and decay into rich harmonic feedback",
        ],
        source: "Maestro Fuzz-Tone full attack application",
      },
    ],
  },

  // ─── 1981 DRV FAMILY ──────────────────────────────────────
  {
    familyId: "drv-family",
    familyName: "1981 DRV",
    modelPatterns: ["mcmlxxxi-drv"],
    controlLayout: DRV_LAYOUT,
    presets: [
      {
        id: "drv-standard",
        style: "Dynamic High-Headroom OD",
        settings: { drive: 5, tone: 5, level: 6, preamp: 5 },
        tips: [
          "Refined RAT-inspired circuit with massive dynamic range",
          "The Preamp knob controls the voicing — lower for cleaner, higher for more saturated",
          "Incredibly dynamic — responds to pick attack like a great tube amp",
          "1981 Inventions' flagship — modern boutique overdrive/distortion",
        ],
        whatToListenFor: [
          "Massive dynamic range — from clean to crunchy with pick attack alone",
          "RAT-inspired grit with more refinement and headroom",
          "Musical, open compression that never squashes the signal",
        ],
        source: "1981 Inventions DRV — refined RAT-inspired design",
      },
      {
        id: "drv-aggressive",
        style: "Aggressive Drive",
        settings: { drive: 8, tone: 6, level: 5, preamp: 7 },
        tips: [
          "Higher drive and preamp for aggressive, saturated tones",
          "Still maintains the DRV's signature dynamic range even at high gain",
          "Great for heavier rock and aggressive rhythm tones",
        ],
        whatToListenFor: [
          "Aggressive, saturated drive that still breathes",
          "Defined note separation even at high gain",
          "Dynamic response preserved — not a compressed wall of gain",
        ],
        source: "1981 DRV aggressive application",
      },
    ],
  },

  // ─── MICRO BOOST FAMILY ───────────────────────────────────
  {
    familyId: "micro-boost-family",
    familyName: "Micro Boost",
    modelPatterns: ["micro-boost"],
    controlLayout: SINGLE_KNOB_LAYOUT,
    presets: [
      {
        id: "micro-clean",
        style: "Clean Boost",
        settings: { gain: 5 },
        tips: [
          "Simple, clean boost with a single Gain control",
          "Perfect for level matching or pushing an amp into breakup",
          "Transparent — no EQ coloring, just more signal",
        ],
        whatToListenFor: [
          "Transparent volume increase",
          "Your amp pushed harder for natural breakup",
          "No tonal coloring — pure signal boost",
        ],
        source: "Clean micro boost application",
      },
      {
        id: "micro-full",
        style: "Full Boost",
        settings: { gain: 8 },
        tips: [
          "Full boost for significant volume increase and amp pushing",
          "Great for lead boost — engage for solos, bypass for rhythm",
        ],
        whatToListenFor: [
          "Significant volume increase for lead boost applications",
          "Amp driven harder into natural saturation",
          "Clean signal boost even at high gain settings",
        ],
        source: "Micro boost full application",
      },
    ],
  },

  // ─── MID BOOST FAMILY ─────────────────────────────────────
  {
    familyId: "mid-boost-family",
    familyName: "Mid Boost",
    modelPatterns: ["mid-boost"],
    controlLayout: SINGLE_KNOB_LAYOUT,
    presets: [
      {
        id: "mid-clean",
        style: "Subtle Mid Push",
        settings: { gain: 4 },
        tips: [
          "Boosts the midrange for better cut in a band mix",
          "Great for making guitars more present without adding volume",
          "Works perfectly after a Big Muff to compensate for the mid-scoop",
        ],
        whatToListenFor: [
          "Enhanced midrange presence in the mix",
          "Notes cut through better without being louder",
          "Warmer, more forward tone",
        ],
        source: "Mid boost subtle application",
      },
      {
        id: "mid-push",
        style: "Aggressive Mid Push",
        settings: { gain: 7 },
        tips: [
          "Heavy mid boost for maximum cut and presence",
          "Great for lead boost — the mids help you cut through everything",
          "Essential for Big Muff users who need to be heard in a band",
        ],
        whatToListenFor: [
          "Prominent midrange push — notes jump out of the mix",
          "Increased sustain from the mid-focused boost",
          "More aggressive, forward tone",
        ],
        source: "Mid boost aggressive application",
      },
    ],
  },

  // ─── MOSFET DISTORTION FAMILY ─────────────────────────────
  {
    familyId: "mosfet-family",
    familyName: "MOSFET Distortion",
    modelPatterns: ["mosfet-dist"],
    controlLayout: STANDARD_DRIVE_LAYOUT,
    presets: [
      {
        id: "mosfet-standard",
        style: "MOSFET Crunch",
        settings: { drive: 5, tone: 5, level: 6 },
        tips: [
          "MOSFET clipping provides a unique, amp-like distortion character",
          "More open and dynamic than standard diode clipping",
          "Ibanez-style MOSFET distortion — warm, tube-like feel",
        ],
        whatToListenFor: [
          "Open, amp-like distortion with MOSFET warmth",
          "Dynamic response similar to tube clipping",
          "Warm, musical breakup character",
        ],
        source: "MOSFET distortion — Ibanez style",
      },
      {
        id: "mosfet-heavy",
        style: "Heavy MOSFET Drive",
        settings: { drive: 8, tone: 6, level: 5 },
        tips: [
          "Higher drive for heavier rock and metal applications",
          "MOSFET clipping keeps it musical even at high gain",
          "Great for aggressive rhythm tones with tube-like dynamics",
        ],
        whatToListenFor: [
          "Heavy distortion that retains dynamic response",
          "Musical, tube-like clipping at high gain",
          "Defined note separation even when saturated",
        ],
        source: "MOSFET distortion heavy application",
      },
    ],
  },

  // ─── BASS DI / SANSAMP FAMILY ─────────────────────────────
  {
    familyId: "bass-di-family",
    familyName: "Bass DI / SansAmp Preamp",
    modelPatterns: ["no-amp-bass-di", "no-amp-bass-pre"],
    controlLayout: BASS_DI_LAYOUT,
    presets: [
      {
        id: "bass-di-standard",
        style: "Standard Bass DI",
        settings: { drive: 4, blend: 5, level: 5, bass: 6, treble: 5, presence: 5 },
        tips: [
          "The SansAmp is THE bass DI — used on countless records for direct bass recording",
          "Blend mixes clean and driven signal for bass clarity with grit",
          "Can be used as a standalone amp simulator or as a preamp into a power amp",
          "The standard Nashville/LA session bass tone starts here",
        ],
        whatToListenFor: [
          "Full, round bass tone with tube-like warmth",
          "Blend control preserves clean low end while adding grit",
          "Record-ready bass tone straight from the DI",
        ],
        source: "Tech 21 SansAmp Bass Driver DI — industry standard bass DI",
      },
      {
        id: "bass-di-gritty",
        style: "Gritty Rock Bass",
        settings: { drive: 7, blend: 7, level: 5, bass: 5, treble: 6, presence: 6 },
        tips: [
          "Higher drive and blend for aggressive rock bass tones",
          "More drive character present in the mix — great for rock and punk bass",
          "The presence control adds definition and attack to the grit",
        ],
        whatToListenFor: [
          "Aggressive, gritty bass tone with plenty of drive",
          "Defined pick attack with grind",
          "Warm low end preserved through the blend circuit",
        ],
        source: "SansAmp Bass Driver gritty rock application",
      },
    ],
  },

  // ─── NOBELLIUM / NOBELS ODR-1 FAMILY ──────────────────────
  {
    familyId: "nobellium-family",
    familyName: "Nobels ODR-1",
    modelPatterns: ["nobellium-ovd1"],
    controlLayout: NOBELLIUM_LAYOUT,
    presets: [
      {
        id: "nobellium-country",
        style: "Nashville Country OD",
        settings: { drive: 3, spectrum: 5, level: 7 },
        tips: [
          "THE Nashville country overdrive — the Nobels ODR-1 is on every country pedalboard",
          "The Spectrum control shapes the overall tonal character — unique to this pedal",
          "Low drive for clean boost with that signature 'Nashville sparkle'",
          "Brad Paisley, Brent Mason, and countless Nashville session players use this",
        ],
        whatToListenFor: [
          "Sparkling, shimmery clean boost with just a touch of warmth",
          "The Spectrum control adds a unique 'Nashville' quality to the tone",
          "Dynamic, touch-sensitive response perfect for chicken pickin'",
        ],
        source: "Nobels ODR-1 — Nashville country standard",
      },
      {
        id: "nobellium-driven",
        style: "Pushed Blues/Rock",
        settings: { drive: 6, spectrum: 4, level: 5 },
        tips: [
          "Higher drive reveals a warm, musical overdrive character",
          "Lower spectrum for a warmer, more vintage character",
          "Works surprisingly well for blues and roots rock, not just country",
        ],
        whatToListenFor: [
          "Warm, musical overdrive with the ODR-1's unique character",
          "Smooth clipping that doesn't get harsh",
          "Musical compression that enhances sustain naturally",
        ],
        source: "Nobels ODR-1 driven application",
      },
    ],
  },

  // ─── PARADIGM SHIFTER FAMILY ──────────────────────────────
  {
    familyId: "paradigm-family",
    familyName: "Paradigm Shifter (Barber)",
    modelPatterns: ["paradigm-shifter"],
    controlLayout: STANDARD_DRIVE_LAYOUT,
    presets: [
      {
        id: "paradigm-transparent",
        style: "Transparent OD",
        settings: { drive: 4, tone: 5, level: 6 },
        tips: [
          "Barber-inspired transparent overdrive — clean, open, dynamic",
          "Designed to be transparent and let your amp's character through",
          "Great for players who want to add gain without changing their tone",
        ],
        whatToListenFor: [
          "Transparent overdrive that preserves your amp's voice",
          "Clean, open character with minimal EQ coloring",
          "Dynamic response that follows your playing",
        ],
        source: "Barber-style transparent overdrive",
      },
      {
        id: "paradigm-crunch",
        style: "Pushed Crunch",
        settings: { drive: 7, tone: 6, level: 5 },
        tips: [
          "Higher drive for more assertive crunch tones",
          "Maintains transparency even when pushed harder",
          "Great for rock rhythm and blues lead applications",
        ],
        whatToListenFor: [
          "Assertive crunch that still sounds transparent",
          "Defined note separation at medium-high gain",
          "Musical compression that enhances the playing feel",
        ],
        source: "Barber-style OD pushed application",
      },
    ],
  },

  // ─── ROYAL BASS DI FAMILY ─────────────────────────────────
  {
    familyId: "royal-bass-family",
    familyName: "Royal Bass DI",
    modelPatterns: ["royal-bass-di"],
    controlLayout: STANDARD_DRIVE_LAYOUT,
    presets: [
      {
        id: "royal-clean",
        style: "Clean Bass DI",
        settings: { drive: 3, tone: 5, level: 6 },
        tips: [
          "Simple bass DI with Gain/Tone/Level — straightforward tone shaping",
          "Clean, full bass tone for recording or live direct applications",
        ],
        whatToListenFor: [
          "Clean, full-range bass tone",
          "Warm, round low end with clear definition",
          "Simple, effective bass DI tone",
        ],
        source: "Royal Bass DI clean application",
      },
      {
        id: "royal-driven",
        style: "Driven Bass DI",
        settings: { drive: 6, tone: 6, level: 5 },
        tips: [
          "Higher drive for gritty bass tones with more presence",
          "Great for rock and indie bass where you want some character",
        ],
        whatToListenFor: [
          "Gritty bass tone with warmth and presence",
          "Defined pick attack with drive character",
          "Warm low end maintained through the drive",
        ],
        source: "Royal Bass DI driven application",
      },
    ],
  },

  // ─── SDD PREAMP FAMILY ────────────────────────────────────
  {
    familyId: "sdd-family",
    familyName: "SDD Preamp (Korg SDD-3000)",
    modelPatterns: ["sdd-preamp"],
    controlLayout: SDD_LAYOUT,
    presets: [
      {
        id: "sdd-edge",
        style: "The Edge Clean Boost",
        settings: { gain: 3, tone: 6 },
        tips: [
          "The Korg SDD-3000's preamp section is essential to The Edge's U2 tone",
          "Adds a subtle compression and brightness that makes delay effects shimmer",
          "Perfect as an always-on preamp stage before delay and reverb",
        ],
        whatToListenFor: [
          "Subtle brightness and compression — makes everything shimmer",
          "The Edge's signature 'crystalline' quality",
          "Enhanced harmonic content that responds well to delay effects",
        ],
        source: "Korg SDD-3000 preamp — The Edge / U2",
      },
      {
        id: "sdd-driven",
        style: "Driven Preamp",
        settings: { gain: 6, tone: 5 },
        tips: [
          "Higher gain for more preamp saturation — still musical and musical",
          "Adds warmth and harmonic content",
          "Works well as a foundation drive before effects",
        ],
        whatToListenFor: [
          "Warm preamp saturation with musical character",
          "Added harmonic content and gentle compression",
          "Smooth, musical clipping from the preamp stage",
        ],
        source: "SDD preamp driven application",
      },
    ],
  },

  // ─── SHIMMER DRIVE / BOGNER WESSEX FAMILY ─────────────────
  {
    familyId: "shimmer-family",
    familyName: "Shimmer Drive (Bogner Wessex)",
    modelPatterns: ["shimmer-drive"],
    controlLayout: STANDARD_DRIVE_LAYOUT,
    presets: [
      {
        id: "shimmer-amp-like",
        style: "Amp-Like Overdrive",
        settings: { drive: 5, tone: 5, level: 6 },
        tips: [
          "The Bogner Wessex is designed to sound like a cranked Bogner amp",
          "Amp-like response with rich harmonics and dynamic breakup",
          "Great for rock, blues, and any style where you want amp-like drive from a pedal",
        ],
        whatToListenFor: [
          "Amp-like overdrive with Bogner character",
          "Rich harmonics and dynamic breakup",
          "Touch-sensitive response that rewards expressive playing",
        ],
        source: "Bogner Wessex — amp-like overdrive",
      },
      {
        id: "shimmer-pushed",
        style: "Pushed Bogner Drive",
        settings: { drive: 7, tone: 6, level: 5 },
        tips: [
          "Higher drive for richer, more saturated amp-like tones",
          "Great for sustaining lead work with Bogner character",
          "Maintains its amp-like dynamic response even when pushed",
        ],
        whatToListenFor: [
          "Richer, more saturated Bogner-style drive",
          "Singing sustain for lead playing",
          "Musical compression that enhances the playing experience",
        ],
        source: "Bogner Wessex pushed application",
      },
    ],
  },

  // ─── BIT CRUSHER FAMILY ───────────────────────────────────
  {
    familyId: "bit-crusher-family",
    familyName: "Bit Crusher",
    modelPatterns: ["bit-crusher"],
    controlLayout: BIT_CRUSHER_LAYOUT,
    presets: [
      {
        id: "bitcrush-lofi",
        style: "Lo-Fi Texture",
        settings: { bit_depth: 6, sample_rate: 5, level: 5 },
        tips: [
          "Reduces bit depth and sample rate for lo-fi, digital distortion textures",
          "Lower bit depth = more distortion and aliasing artifacts",
          "Lower sample rate = more aliasing and frequency folding effects",
          "Use intentionally for industrial, electronic, or experimental textures",
        ],
        whatToListenFor: [
          "Digital aliasing and quantization noise",
          "Lo-fi, crunchy digital character unlike any analog distortion",
          "Frequency folding effects as sample rate decreases",
        ],
        source: "Bit crusher lo-fi effect — digital distortion",
      },
      {
        id: "bitcrush-extreme",
        style: "Extreme Destruction",
        settings: { bit_depth: 3, sample_rate: 3, level: 4 },
        tips: [
          "Extreme settings for heavily destroyed, 8-bit-style sounds",
          "Great for industrial, noise, and experimental applications",
          "Lower level to compensate for the increased noise floor",
        ],
        whatToListenFor: [
          "Heavily destroyed, barely recognizable signal",
          "8-bit video game-style quantization",
          "Extreme aliasing and digital artifacts",
        ],
        source: "Bit crusher extreme application",
      },
    ],
  },
];

export const DRIVE_MODEL_OVERRIDES: DriveModelOverride[] = [];

export interface DriveIntelligence {
  pattern: string;
  category: "boost" | "overdrive" | "distortion" | "fuzz" | "specialty";
  gainRange: [number, number];
  intendedUse: string[];
  unconventionalFor?: string[];
  placement?: string;
  stacksWith?: string;
  warnings?: string[];
  sweetSpot?: string;
  historicalContext?: string;
}

export const DRIVE_INTELLIGENCE: DriveIntelligence[] = [
  {
    pattern: "t808-od|t808-mod|maxon-808|super-od|od-one",
    category: "overdrive",
    gainRange: [0, 6],
    intendedUse: ["amp tightening", "mid-hump boost", "blues lead", "metal rhythm boost"],
    placement: "Before amp. The #1 drive for tightening high-gain amps — cuts bass, pushes mids.",
    stacksWith: "Goes before Klon for mid-boosted lead tones. Into Mesa/5150/Friedman for tight metal rhythm.",
    sweetSpot: "As a boost: Drive 2-3, Level 7-8. As a drive: Drive 5-7, Level 5.",
    historicalContext: "SRV, John Mayer (blues). Every modern metal guitarist (as a boost). The most influential drive pedal ever made.",
  },
  {
    pattern: "klone-chiron",
    category: "overdrive",
    gainRange: [0, 7],
    intendedUse: ["transparent boost", "clean boost", "light overdrive", "always-on tone sweetener"],
    placement: "Before amp for boost, or after another drive for volume lift. Internal charge pump = lots of headroom.",
    stacksWith: "After TS for boosted lead. Before a clean Fender for edge-of-breakup.",
    sweetSpot: "Boost: Gain 1-2, Output 7-8. Drive: Gain 5-6, Output 5.",
    historicalContext: "Jeff Beck, John Mayer, Nels Cline. $5,000+ on the used market. Bill Finnegan's design masterpiece.",
  },
  {
    pattern: "rat-dist|fat-rat",
    category: "distortion",
    gainRange: [2, 9],
    intendedUse: ["crunch rhythm", "alternative rock", "shoegaze", "lead distortion"],
    warnings: [
      "Filter knob works BACKWARDS — higher = darker, lower = brighter",
      "Gets fizzy at extreme distortion settings — sweet spot is low-to-medium",
    ],
    placement: "Before amp. Can be used as standalone distortion into clean amp, or to push an already crunchy amp.",
    sweetSpot: "Distortion 3-5, Filter 3-5 for crunch. Higher distortion for sustaining lead.",
    historicalContext: "Jeff Beck, Radiohead, Dave Grohl, Scott Ian. Op-amp hard clipping circuit. Fat RAT variant has germanium diodes.",
  },
  {
    pattern: "compulsion-dist",
    category: "overdrive",
    gainRange: [1, 8],
    intendedUse: ["Marshall-in-a-box", "crunch", "versatile drive", "rock rhythm"],
    placement: "Before amp. HP mode for tight, LP mode for compressed. Extremely versatile.",
    stacksWith: "Works well after a TS for boosted mid-heavy leads. HP mode stacks better into high-gain amps.",
    sweetSpot: "Drive 4-6, HP mode for tighter amps, LP mode for Fender-style amps.",
    historicalContext: "Fulltone's most famous design. MOSFET clipping for amp-like response. Used across rock, blues, country.",
  },
  {
    pattern: "blues-od",
    category: "overdrive",
    gainRange: [0, 7],
    intendedUse: ["edge of breakup", "warm drive", "amp-like breakup", "dual-stage stacking"],
    placement: "Before amp. Warm, dynamic, amp-like breakup. Inspired the King of Tone and Morning Glory.",
    sweetSpot: "Drive 2-4 for edge of breakup, Drive 5-7 for pushed blues tone.",
    historicalContext: "Marshall Bluesbreaker pedal. The original amp-in-a-box. Inspired King of Tone, Morning Glory, and many more. John Mayer, Joe Bonamassa.",
  },
  {
    pattern: "bb-pre|bb-pre-at",
    category: "overdrive",
    gainRange: [0, 8],
    intendedUse: ["full-range boost", "transparent drive", "session work"],
    placement: "Before amp. Two-band EQ offers precise tone shaping. Huge gain range.",
    sweetSpot: "Gain 2-4 for boost, Bass/Treble at noon (both are cut controls).",
    historicalContext: "Xotic. Andy Timmons signature. Nashville session favorite. Very wide gain range from clean boost to saturation.",
  },
  {
    pattern: "timothy",
    category: "overdrive",
    gainRange: [0, 6],
    intendedUse: ["transparent stacking", "always-on drive", "subtle enhancement"],
    placement: "Before amp. Designed to disappear — adds gain without coloring tone. Ultimate stacker.",
    sweetSpot: "Gain 3-5, Bass and Treble at noon (cut controls).",
    historicalContext: "Paul Cochrane design. Cult following. Bass/Treble are CUT controls. Designed to let amp and guitar speak.",
  },
  {
    pattern: "zenith-drive",
    category: "overdrive",
    gainRange: [1, 7],
    intendedUse: ["Dumble-style drive", "fusion", "blues", "jazz lead"],
    placement: "Before clean amp for Dumble tones. The overdrive channel of a Dumble in a box.",
    sweetSpot: "Drive 4-6, Tone 4-6 for warm fusion leads.",
    historicalContext: "Hermida Audio. Dumble ODS in a pedal. Robben Ford, Larry Carlton territory. Warm, vocal midrange.",
  },
  {
    pattern: "face-fuzz",
    category: "fuzz",
    gainRange: [3, 10],
    intendedUse: ["classic fuzz", "blues fuzz", "psychedelic", "lead fuzz"],
    warnings: [
      "Must be FIRST in chain — hates buffers before it (low input impedance)",
      "Germanium version is temperature-sensitive and less consistent",
      "Guitar volume cleanup is essential technique — don't just leave Fuzz maxed",
    ],
    placement: "FIRST in chain, before everything else. Before a cranked amp for classic tones.",
    stacksWith: "After a wah is the classic Hendrix chain (wah -> fuzz -> cranked Marshall).",
    sweetSpot: "Fuzz 6-8, Volume to taste. Use guitar volume for dynamics.",
    historicalContext: "Hendrix (germanium), Gilmour (silicon). Dallas Arbiter original. The foundation of fuzz.",
  },
  {
    pattern: "pi-fuzz|pi-fuzz-bass",
    category: "fuzz",
    gainRange: [4, 10],
    intendedUse: ["sustaining fuzz", "wall of fuzz", "shoegaze", "grunge leads"],
    unconventionalFor: ["tight rhythm", "clean boost", "transparent drive"],
    warnings: [
      "Scooped mids can disappear in a band mix — consider a mid boost elsewhere in the chain",
      "Works best into a CLEAN amp — stacking with overdriven amps gets mushy",
    ],
    placement: "Before clean amp. Not a stacking pedal — it provides all the gain you need.",
    sweetSpot: "Sustain 6-8, Tone 4-6. Lower tone for bass-heavy, higher for cutting leads.",
    historicalContext: "EHX. Billy Corgan, J Mascis, Gilmour (live Comfortably Numb). Massive sustain with scooped mids. Multiple variants: Triangle (early '70s, smoother), Ram's Head (mid '70s, more aggressive), Russian (darker, grittier).",
  },
  {
    pattern: "bender-fuzz",
    category: "fuzz",
    gainRange: [3, 9],
    intendedUse: ["aggressive fuzz", "British classic rock fuzz", "raw lead"],
    placement: "Before amp. More aggressive than Fuzz Face. Retains more edge when cleaned up.",
    sweetSpot: "Fuzz 5-7, Tone at noon, Volume to taste.",
    historicalContext: "Sola Sound MkII. Jimmy Page (Led Zep I/II), Jeff Beck (Yardbirds). British fuzz tradition.",
  },
  {
    pattern: "octave-dist",
    category: "fuzz",
    gainRange: [5, 10],
    intendedUse: ["octave fuzz", "experimental lead", "psychedelic"],
    unconventionalFor: ["rhythm guitar", "clean tones", "subtle drive"],
    warnings: [
      "Octave effect is strongest above 12th fret on neck pickup",
      "Below 12th fret produces ring-mod-like dissonance — cool but extreme",
    ],
    placement: "Before amp. Most effective with single-coil pickups for clear octave tracking.",
    sweetSpot: "Fuzz 6-8. Play above 12th fret for clean octave, lower for dissonance.",
    historicalContext: "Roger Mayer design for Hendrix. Purple Haze solo. Band of Gypsys tones.",
  },
  {
    pattern: "ds1-distortion|ds1-distortion-mod",
    category: "distortion",
    gainRange: [2, 8],
    intendedUse: ["punk", "grunge", "raw distortion", "aggressive rock"],
    placement: "Before clean amp as standalone distortion. Can push a crunchy amp harder.",
    sweetSpot: "Distortion 5-7, Tone 3-5 (can be harsh above 7), Level to taste.",
    historicalContext: "Boss. Kurt Cobain, Steve Vai, Joe Satriani (early). Op-amp hard clipping. Raw, no-frills.",
  },
  {
    pattern: "plus-dist|od-250|od-250-gray",
    category: "distortion",
    gainRange: [2, 7],
    intendedUse: ["classic rock distortion", "bright cutting distortion", "'70s rock"],
    placement: "Before amp. Simple, direct distortion. Cuts through a mix.",
    sweetSpot: "Distortion 4-6, Output to taste. Bright character — may need treble rolloff on bright amps.",
    historicalContext: "MXR Dist+ / DOD 250. Randy Rhoads, Bob Mould, Yngwie. One of the first distortion pedals. Germanium diode clipping.",
  },
  {
    pattern: "tape-dist",
    category: "specialty",
    gainRange: [0, 5],
    intendedUse: ["analog warmth", "tape saturation", "subtle enhancement", "mastering-style warmth"],
    placement: "Before or AFTER amp. After amp for mastering-style tape saturation. Before for warm boost.",
    sweetSpot: "Drive 3-5 for subtle warmth. Higher for more obvious tape compression.",
    historicalContext: "Emulates overdriven tape machines. Studio recording technique brought to a pedal. Warm, soft clipping.",
  },
  {
    pattern: "hard-fuzz",
    category: "fuzz",
    gainRange: [5, 10],
    intendedUse: ["experimental fuzz", "noise", "synth-like textures", "self-oscillation"],
    unconventionalFor: ["subtle drive", "clean tones", "standard rock"],
    warnings: [
      "This is NOT a subtle pedal — it's designed for extreme, experimental textures",
      "Can self-oscillate and produce uncontrollable feedback — use intentionally",
    ],
    placement: "Before amp. Chaotic and unpredictable by design.",
    sweetSpot: "Experiment — there's no 'normal' setting. That's the point.",
    historicalContext: "ZVEX Fuzz Factory inspired. Matt Bellamy (Muse), Jack White. Wild, gated, oscillating fuzz.",
  },
  {
    pattern: "treble-boost",
    category: "boost",
    gainRange: [0, 8],
    intendedUse: ["treble boost into cranked amp", "lead cutting", "Brian May tone", "classic rock boost"],
    placement: "Before a cranked, non-master-volume amp. The boost pushes the amp's top end into breakup.",
    stacksWith: "Into cranked Vox AC30 = Brian May. Into cranked Laney/Marshall = Tony Iommi.",
    sweetSpot: "Boost 6-8 into a cranked amp.",
    historicalContext: "Dallas Rangemaster. Brian May, Tony Iommi, Rory Gallagher. Germanium transistor. Cuts bass, boosts treble.",
  },
  {
    pattern: "77-custom-od",
    category: "overdrive",
    gainRange: [1, 7],
    intendedUse: ["versatile overdrive", "rock rhythm", "blues", "modern rock"],
    placement: "Before amp. The 100Hz knob provides independent bass control for tightening.",
    sweetSpot: "Drive 4-6, Tone 5, 100Hz to taste for bass control.",
    historicalContext: "MXR M77 Custom Badass Modified O.D. Versatile overdrive with independent bass EQ. Bridges OD and distortion.",
  },
  {
    pattern: "angry-chuck",
    category: "distortion",
    gainRange: [2, 9],
    intendedUse: ["Marshall-in-a-box", "JCM800 crunch", "hard rock", "classic rock lead"],
    placement: "Before amp. Perfect for that JCM800-in-a-pedal tone. Presence adds Marshall-style air.",
    sweetSpot: "Drive 4-6 for crunch, 7-9 for lead. Presence adds top-end shimmer.",
    historicalContext: "JHS Angry Charlie. Marshall JCM800 in a pedal. Tight, aggressive, British crunch with Presence control.",
  },
  {
    pattern: "blackglass-7k",
    category: "distortion",
    gainRange: [2, 9],
    intendedUse: ["modern metal bass", "bass distortion", "bass DI/preamp", "aggressive bass"],
    placement: "Before amp or used as a DI. Blend control preserves clean low end. THE modern metal bass preamp.",
    sweetSpot: "Drive 5-7, Blend 4-6 for metal. Higher blend for rock. EQ to taste.",
    historicalContext: "Darkglass B7K Ultra. The modern metal bass standard. Used on countless records. 3-band EQ with blend circuit.",
  },
  {
    pattern: "bosom-boost",
    category: "boost",
    gainRange: [0, 3],
    intendedUse: ["clean boost", "amp pushing", "volume boost", "tight boost"],
    placement: "Before amp. Simple, transparent boost with bass tightening. Friedman design.",
    sweetSpot: "Volume 6-8 for boost. Tight higher for less bass, lower for full range.",
    historicalContext: "Friedman Bosom Boost. Simple clean boost with Tight control for bass cut. Companion to Friedman amps.",
  },
  {
    pattern: "box-o-crunch",
    category: "distortion",
    gainRange: [3, 9],
    intendedUse: ["high-gain distortion", "Marshall-like crunch", "hard rock", "metal rhythm"],
    placement: "Before amp. Marshall-like high-gain distortion. Works into clean amps for standalone distortion.",
    sweetSpot: "Drive 5-7 for classic crunch, higher for metal rhythm.",
    historicalContext: "High-gain Marshall-style distortion in a box. Tight, aggressive, British-voiced.",
  },
  {
    pattern: "colortone-booster|colortone-od",
    category: "boost",
    gainRange: [1, 7],
    intendedUse: ["vintage boost", "British boost", "treble boost alternative", "colored overdrive"],
    placement: "Before amp. Vintage British boost character. Jeff Beck-style treble boost territory.",
    sweetSpot: "Drive 2-4 for boost, 5-7 for colored overdrive.",
    historicalContext: "Vintage British boost circuit. Jeff Beck territory. Dallas Rangemaster-inspired with more tonal flexibility.",
  },
  {
    pattern: "esoteric-acb|esoteric-rcb|esoteric-bass-rcb",
    category: "boost",
    gainRange: [0, 5],
    intendedUse: ["clean boost", "transparent OD", "session stacking", "always-on enhancer"],
    placement: "Before amp or before/after other drives. Transparent boost/OD with 2-band EQ.",
    sweetSpot: "Gain 2-4 for boost, Bass/Treble at noon. Higher gain for light OD.",
    historicalContext: "Xotic AC/RC Booster. Studio-quality boost with precise EQ. Transparent, musical enhancement.",
  },
  {
    pattern: "eternal-love",
    category: "overdrive",
    gainRange: [0, 6],
    intendedUse: ["transparent OD", "low-gain drive", "blues", "always-on drive"],
    placement: "Before amp. Transparent, open overdrive. Works best into clean amps.",
    sweetSpot: "Drive 2-4 for shimmery edge-of-breakup. Higher for smooth blues drive.",
    historicalContext: "Lovepedal Eternity-inspired. Transparent, open character. Dynamic and musical low-gain overdrive.",
  },
  {
    pattern: "fas-boost|fas-led-drive",
    category: "boost",
    gainRange: [0, 5],
    intendedUse: ["clean boost", "simple drive", "amp pushing", "transparent boost"],
    placement: "Before amp. Fractal's custom designs — simple, effective, transparent.",
    sweetSpot: "Drive 1-3, Level 6-8 for boost. Higher drive for LED Drive crunch.",
    historicalContext: "Fractal Audio custom designs. FAS Boost is pure transparent boost. LED Drive uses LED clipping for open breakup.",
  },
  {
    pattern: "fet-boost|fet-preamp",
    category: "boost",
    gainRange: [0, 4],
    intendedUse: ["clean boost", "preamp stage", "always-on enhancer", "The Edge tone"],
    placement: "Before amp or before effects. FET-based boost/preamp with subtle warmth.",
    sweetSpot: "Gain 2-4 for clean boost. Higher for gentle FET saturation.",
    historicalContext: "FET-based boost/preamp. The Edge (U2) uses the Korg SDD-3000 preamp section. Subtle compression and warmth.",
  },
  {
    pattern: "full-od",
    category: "overdrive",
    gainRange: [1, 7],
    intendedUse: ["versatile OD", "blues", "rock", "MOSFET drive"],
    placement: "Before amp. MOSFET-based overdrive with built-in boost. Wider frequency response than TS.",
    sweetSpot: "Drive 4-6, Tone 4-6 for standard OD. Higher drive for lead.",
    historicalContext: "Fulltone Full-Drive 2. MOSFET-based OD with built-in boost. More open than TS. Blues, rock, country staple.",
  },
  {
    pattern: "gauss-drive",
    category: "overdrive",
    gainRange: [1, 6],
    intendedUse: ["warm OD", "tube-like drive", "Mesa-style OD"],
    placement: "Before amp. Mesa Flux-Drive-inspired warm, tube-like overdrive.",
    sweetSpot: "Drive 4-6 for warm OD. Tone shapes brightness.",
    historicalContext: "Mesa Flux-Drive inspired. Warm, tube-like overdrive designed to complement Mesa amps.",
  },
  {
    pattern: "griddle-cake",
    category: "overdrive",
    gainRange: [1, 8],
    intendedUse: ["amp-like crunch", "dynamic drive", "blues rock", "lead"],
    placement: "Before amp. Crowther Hot Cake-inspired — extremely amp-like response.",
    sweetSpot: "Drive 4-6, Presence 4-6. Higher drive for singing lead tones.",
    historicalContext: "Crowther Hot Cake. New Zealand classic. Extremely amp-like with unique Presence control. Dynamic and touch-sensitive.",
  },
  {
    pattern: "guardian-photon-speed",
    category: "overdrive",
    gainRange: [0, 5],
    intendedUse: ["transparent OD", "always-on drive", "low-gain overdrive"],
    placement: "Before amp. One of the most transparent overdrives — designed to disappear.",
    sweetSpot: "Drive 2-4 for transparent OD. Volume for level matching.",
    historicalContext: "Greer Lightspeed. Extremely transparent overdrive. Designed to be invisible and let amp/guitar shine through.",
  },
  {
    pattern: "heartpedal-11",
    category: "overdrive",
    gainRange: [1, 6],
    intendedUse: ["amp-in-a-box", "warm drive", "dynamic overdrive"],
    placement: "Before amp. Amp-like breakup character. Dynamic and touch-sensitive.",
    sweetSpot: "Drive 4-6 for amp-like crunch. Tone shapes brightness.",
    historicalContext: "Lovepedal-inspired amp-in-a-box circuit. Warm, dynamic, designed to sound like a cranked amp.",
  },
  {
    pattern: "hoodoo-drive",
    category: "overdrive",
    gainRange: [1, 6],
    intendedUse: ["warm blues OD", "mellow drive", "blues rhythm"],
    placement: "Before amp. Warm, round overdrive for blues and classic rock.",
    sweetSpot: "Drive 3-5 for warm blues. Higher for more biting blues lead.",
    historicalContext: "Warm, blues-focused overdrive. Mellow, musical character. Great for classic blues tones.",
  },
  {
    pattern: "horizon-precision",
    category: "overdrive",
    gainRange: [1, 7],
    intendedUse: ["djent tightener", "modern metal boost", "tight rhythm boost", "precision boost"],
    placement: "Before high-gain amp. THE djent tightener. Gate + Attack for precise picking control.",
    warnings: [
      "Designed for modern metal — may be too tight/precise for blues or classic rock",
    ],
    sweetSpot: "Low drive, high level, high attack for djent. Gate on for tight stops.",
    historicalContext: "Horizon Devices Precision Drive. Misha Mansoor (Periphery). Attack knob, Bright switch, and Gate for ultimate picking precision. THE djent tightener.",
  },
  {
    pattern: "integral-pre",
    category: "boost",
    gainRange: [0, 4],
    intendedUse: ["studio preamp", "clean boost", "always-on enhancer"],
    placement: "Before amp. Studio-quality clean boost/preamp. Transparent signal enhancement.",
    sweetSpot: "Gain 2-4 for clean boost. Higher for gentle saturation.",
    historicalContext: "TC Electronic-inspired studio preamp. Pristine, transparent signal handling.",
  },
  {
    pattern: "jam-ray",
    category: "overdrive",
    gainRange: [0, 5],
    intendedUse: ["transparent OD", "Nashville tone", "low-gain drive", "country", "worship"],
    placement: "Before amp. THE Nashville transparent OD. Exceptional touch sensitivity.",
    sweetSpot: "Drive 2-4 for Nashville sparkle. Bass control shapes low-end response.",
    historicalContext: "Vemuram Jan Ray. Nashville session standard. Brad Paisley, studio players. Transparent, dynamic, with independent Bass control.",
  },
  {
    pattern: "m-zone-dist",
    category: "distortion",
    gainRange: [3, 10],
    intendedUse: ["metal distortion", "scooped metal", "high-gain", "parametric EQ distortion"],
    warnings: [
      "The parametric mid EQ is the key to getting usable tones — don't leave it flat",
      "Scooped settings can disappear in a band mix — try boosting mids",
    ],
    placement: "Before clean amp or in effects loop. The parametric mid EQ makes it surprisingly versatile.",
    sweetSpot: "Drive 6-8, sweep Mid Freq to find sweet spots. Try boosting mids for better mix presence.",
    historicalContext: "Boss MT-2 Metal Zone. Most controversial pedal ever. Parametric mid EQ is the hidden gem. Works great in effects loops.",
  },
  {
    pattern: "master-fuzz",
    category: "fuzz",
    gainRange: [5, 10],
    intendedUse: ["original fuzz", "vintage fuzz", "buzzy distortion"],
    placement: "Before amp. THE original fuzz pedal. Raw, buzzy, aggressive.",
    sweetSpot: "Attack 6-8 for classic fuzz. Volume to taste.",
    historicalContext: "Maestro FZ-1 Fuzz-Tone. Keith Richards' Satisfaction riff. The first commercially successful fuzz pedal. Raw, buzzy, historic.",
  },
  {
    pattern: "mcmlxxxi-drv",
    category: "overdrive",
    gainRange: [1, 9],
    intendedUse: ["high-headroom OD", "dynamic drive", "RAT-inspired", "versatile drive"],
    placement: "Before amp. Refined RAT-inspired circuit with massive dynamic range.",
    sweetSpot: "Drive 4-6, Preamp 4-6 for dynamic OD. Higher for aggressive distortion.",
    historicalContext: "1981 Inventions DRV. Refined RAT-inspired circuit with massive dynamic range. Modern boutique classic. Incredibly dynamic response.",
  },
  {
    pattern: "micro-boost|mid-boost",
    category: "boost",
    gainRange: [0, 5],
    intendedUse: ["clean boost", "level boost", "lead boost", "mid-range boost"],
    placement: "Before amp or before other drives. Simple, effective boost.",
    sweetSpot: "Gain 4-6 for moderate boost. Higher for lead boost applications.",
    historicalContext: "Simple single-knob boost. Micro Boost for clean volume. Mid Boost for midrange-focused boost (great after Big Muff).",
  },
  {
    pattern: "mosfet-dist",
    category: "distortion",
    gainRange: [2, 8],
    intendedUse: ["MOSFET distortion", "amp-like distortion", "rock rhythm", "dynamic distortion"],
    placement: "Before amp. MOSFET clipping for amp-like distortion character.",
    sweetSpot: "Drive 4-6 for crunch. Higher for heavier rock tones.",
    historicalContext: "MOSFET-based distortion. Ibanez-style. More open and dynamic than standard diode clipping. Tube-like feel.",
  },
  {
    pattern: "no-amp-bass-di|no-amp-bass-pre",
    category: "specialty",
    gainRange: [0, 7],
    intendedUse: ["bass DI", "bass preamp", "direct recording", "amp simulation"],
    placement: "End of chain or as standalone DI. Blend circuit preserves clean bass while adding drive. THE bass DI.",
    sweetSpot: "Drive 3-5, Blend 4-6 for standard DI. Higher drive for rock bass. Presence for attack definition.",
    historicalContext: "Tech 21 SansAmp Bass Driver DI. Industry standard bass DI/preamp. Used on countless records. Blend circuit for clean/driven mix.",
  },
  {
    pattern: "nobellium-ovd1",
    category: "overdrive",
    gainRange: [0, 6],
    intendedUse: ["country OD", "Nashville sparkle", "light overdrive", "chicken pickin'"],
    placement: "Before amp. THE Nashville country overdrive. Unique Spectrum control.",
    sweetSpot: "Drive 2-4, Spectrum 4-6 for Nashville sparkle. Higher drive for blues.",
    historicalContext: "Nobels ODR-1. Nashville country standard. Brad Paisley, Brent Mason. Unique Spectrum control. On every Nashville pedalboard.",
  },
  {
    pattern: "paradigm-shifter",
    category: "overdrive",
    gainRange: [0, 7],
    intendedUse: ["transparent OD", "versatile drive", "stacking"],
    placement: "Before amp. Barber-inspired transparent overdrive. Dynamic and open.",
    sweetSpot: "Drive 3-5 for transparent OD. Higher for rock crunch.",
    historicalContext: "Barber-inspired transparent overdrive. Clean, open, dynamic. Designed to let your amp speak.",
  },
  {
    pattern: "royal-bass-di",
    category: "specialty",
    gainRange: [0, 5],
    intendedUse: ["bass DI", "simple bass preamp", "clean bass tone"],
    placement: "End of chain or standalone DI. Simple bass DI with Gain/Tone/Level.",
    sweetSpot: "Drive 3-5 for clean DI. Higher for gritty bass.",
    historicalContext: "Simple bass DI/preamp for clean, full bass tones. Recording and live direct applications.",
  },
  {
    pattern: "sdd-preamp",
    category: "boost",
    gainRange: [0, 4],
    intendedUse: ["preamp boost", "The Edge tone", "shimmer enhancement", "delay enhancer"],
    placement: "Before effects chain. Adds subtle compression and brightness. Essential for delay-heavy rigs.",
    sweetSpot: "Gain 2-4 for The Edge-style shimmer. Tone higher for more brightness.",
    historicalContext: "Korg SDD-3000 preamp section. Essential to The Edge's U2 tone. Subtle compression and brightness that makes delay effects shimmer.",
  },
  {
    pattern: "shimmer-drive",
    category: "overdrive",
    gainRange: [1, 6],
    intendedUse: ["amp-like OD", "Bogner-style drive", "rock overdrive", "lead drive"],
    placement: "Before amp. Bogner Wessex-inspired amp-like overdrive. Rich harmonics and dynamic breakup.",
    sweetSpot: "Drive 4-6 for amp-like crunch. Higher for singing lead tones.",
    historicalContext: "Bogner Wessex-inspired. Designed to sound like a cranked Bogner amp in a pedal. Amp-like dynamics and harmonics.",
  },
  {
    pattern: "bit-crusher",
    category: "specialty",
    gainRange: [0, 10],
    intendedUse: ["lo-fi effect", "digital distortion", "experimental", "industrial", "8-bit sounds"],
    unconventionalFor: ["subtle drive", "transparent boost", "blues", "classic rock"],
    warnings: [
      "This is digital destruction — not analog distortion. Use intentionally.",
      "Extreme settings produce very harsh, lo-fi sounds — start subtle and increase.",
    ],
    placement: "Before or after amp. Different character in each position. After amp for mastered lo-fi effect.",
    sweetSpot: "Bit Depth 6-8, Sample Rate 5-7 for subtle lo-fi. Lower for extreme destruction.",
    historicalContext: "Digital bit reduction and sample rate reduction. Used for industrial, electronic, and experimental textures. Lo-fi aesthetic tool.",
  },
];

export function getDriveIntelligence(driveId: string): DriveIntelligence | undefined {
  return DRIVE_INTELLIGENCE.find(di => {
    const patterns = di.pattern.split("|");
    return patterns.some(p => driveId.startsWith(p) || driveId.includes(p));
  });
}

export function getDriveControlLayout(driveId: string): AmpControlLayout {
  const override = DRIVE_MODEL_OVERRIDES.find(o => o.modelId === driveId);
  if (override?.controlLayout) return override.controlLayout;

  for (const family of DRIVE_FAMILY_DEFAULTS) {
    if (family.modelPatterns.some(p => driveId.startsWith(p) || driveId.includes(p))) {
      return family.controlLayout;
    }
  }

  return STANDARD_DRIVE_LAYOUT;
}

export function getDriveDialInPresets(driveId: string): {
  presets: DriveDialInPreset[];
  controlLayout: AmpControlLayout;
  source: "model" | "family" | "generic";
  familyName?: string;
} {
  const override = DRIVE_MODEL_OVERRIDES.find(o => o.modelId === driveId);
  if (override?.presets && override.presets.length > 0) {
    return {
      presets: override.presets,
      controlLayout: override.controlLayout || getDriveControlLayout(driveId),
      source: "model",
    };
  }

  for (const family of DRIVE_FAMILY_DEFAULTS) {
    if (family.modelPatterns.some(p => driveId.startsWith(p) || driveId.includes(p))) {
      return {
        presets: family.presets,
        controlLayout: family.controlLayout,
        source: "family",
        familyName: family.familyName,
      };
    }
  }

  return {
    presets: [{
      id: "generic-drive",
      style: "General Starting Point",
      settings: { drive: 5, tone: 5, level: 5 },
      tips: [
        "Start with everything at noon and adjust by ear",
        "Drive controls the distortion amount — lower for boost, higher for heavier saturation",
        "Tone shapes the frequency balance — adjust to match your amp and guitar",
        "Level sets the output volume — match to your bypassed volume, then adjust for boost if desired",
      ],
      whatToListenFor: [
        "How the drive interacts with your amp — does it tighten or loosen the low end?",
        "Pick dynamics — does the pedal respond to how hard you play?",
        "How it cleans up when you roll back your guitar volume",
      ],
      source: "General drive pedal starting guide",
    }],
    controlLayout: STANDARD_DRIVE_LAYOUT,
    source: "generic",
  };
}
