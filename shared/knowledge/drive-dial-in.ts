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

export const DRIVE_FAMILY_DEFAULTS: DriveFamilyDefaults[] = [

  // ─── TUBE SCREAMER FAMILY ─────────────────────────────────
  {
    familyId: "ts-family",
    familyName: "Tube Screamer / Mid-Hump OD",
    modelPatterns: ["ts808", "sd-1"],
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
    modelPatterns: ["klon"],
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
    modelPatterns: ["rat", "fat-rat"],
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

  // ─── OCD FAMILY ───────────────────────────────────────────
  {
    familyId: "ocd-family",
    familyName: "OCD / Versatile Drive",
    modelPatterns: ["ocd"],
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

  // ─── BLUES DRIVER FAMILY ──────────────────────────────────
  {
    familyId: "blues-driver-family",
    familyName: "Blues Driver",
    modelPatterns: ["blues-driver"],
    controlLayout: STANDARD_DRIVE_LAYOUT,
    presets: [
      {
        id: "bd-edge",
        style: "Edge of Breakup",
        settings: { drive: 3, tone: 6, level: 7 },
        tips: [
          "The BD-2 is more open and less mid-humped than a Tube Screamer",
          "FET-based clipping gives it a more amp-like, natural breakup character",
          "Excellent at low drive as a clean boost with just a hint of hair",
          "Responds extremely well to pick dynamics — light touch cleans up, dig in for crunch",
          "Great into Fender and Vox amps where you want to preserve the amp's character",
        ],
        whatToListenFor: [
          "More open frequency response than a TS — you hear more of the amp",
          "Pick dynamics translate clearly — soft = clean, hard = crunchy",
          "Treble content is more natural and less filtered than a Tube Screamer",
        ],
        source: "Boss BD-2 standard application",
      },
    ],
  },

  // ─── KING OF TONE FAMILY ──────────────────────────────────
  {
    familyId: "kot-family",
    familyName: "King of Tone",
    modelPatterns: ["king-of-tone"],
    controlLayout: STANDARD_DRIVE_LAYOUT,
    presets: [
      {
        id: "kot-rhythm",
        style: "Dual-Stage Rhythm",
        settings: { drive: 4, tone: 5, level: 6 },
        tips: [
          "The King of Tone is a dual Marshall Blues Breaker circuit — warm, amp-like drive",
          "It's subtle and musical — not a high-gain pedal, but incredibly dynamic",
          "Stacks beautifully with itself — the dual stages interact musically",
          "One of the most sought-after pedals ever made (years-long waitlist for the real thing)",
          "Works with virtually any amp — it's designed to enhance, not replace, your amp's character",
        ],
        whatToListenFor: [
          "Amp-like, warm breakup — sounds like turning up a good amp",
          "Extremely musical compression — notes bloom rather than squash",
          "Dual-stage interaction adds harmonic complexity",
        ],
        source: "Analogman King of Tone standard settings",
      },
    ],
  },

  // ─── BB PREAMP FAMILY ─────────────────────────────────────
  {
    familyId: "bb-family",
    familyName: "BB Preamp",
    modelPatterns: ["bb-preamp"],
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
    modelPatterns: ["timmy"],
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
    modelPatterns: ["zendrive"],
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
    modelPatterns: ["fuzz-face-g", "fuzz-face-s"],
    controlLayout: FUZZ_FACE_LAYOUT,
    presets: [
      {
        id: "fuzz-hendrix",
        style: "Hendrix Fuzz",
        settings: { fuzz: 7, volume: 6 },
        tips: [
          "The Fuzz Face has only two controls — Fuzz and Volume. Simple but powerful",
          "Germanium version (G) is warmer, woolier, and cleans up better with guitar volume",
          "Silicon version (S) is brighter, more aggressive, and more consistent",
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
    modelPatterns: ["big-muff"],
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
    modelPatterns: ["tone-bender"],
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
    modelPatterns: ["octavia"],
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
    modelPatterns: ["ds-1"],
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
    familyName: "MXR Distortion+",
    modelPatterns: ["mxr-dist-plus"],
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
        source: "MXR Distortion+ — Randy Rhoads, Bob Mould",
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

  // ─── FET FUZZ FAMILY ──────────────────────────────────────
  {
    familyId: "fet-fuzz-family",
    familyName: "FET Fuzz",
    modelPatterns: ["fe-fuzz"],
    controlLayout: STANDARD_DRIVE_LAYOUT,
    presets: [
      {
        id: "fet-wild",
        style: "Wild Oscillating Fuzz",
        settings: { drive: 7, tone: 5, level: 4 },
        tips: [
          "The FET Fuzz is based on the ZVEX Fuzz Factory — wild, unpredictable, chaotic",
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
    pattern: "ts808|sd-1",
    category: "overdrive",
    gainRange: [0, 6],
    intendedUse: ["amp tightening", "mid-hump boost", "blues lead", "metal rhythm boost"],
    placement: "Before amp. The #1 drive for tightening high-gain amps — cuts bass, pushes mids.",
    stacksWith: "Goes before Klon for mid-boosted lead tones. Into Mesa/5150/Friedman for tight metal rhythm.",
    sweetSpot: "As a boost: Drive 2-3, Level 7-8. As a drive: Drive 5-7, Level 5.",
    historicalContext: "SRV, John Mayer (blues). Every modern metal guitarist (as a boost). The most influential drive pedal ever made.",
  },
  {
    pattern: "klon",
    category: "overdrive",
    gainRange: [0, 7],
    intendedUse: ["transparent boost", "clean boost", "light overdrive", "always-on tone sweetener"],
    placement: "Before amp for boost, or after another drive for volume lift. Internal charge pump = lots of headroom.",
    stacksWith: "After TS for boosted lead. Before a clean Fender for edge-of-breakup.",
    sweetSpot: "Boost: Gain 1-2, Output 7-8. Drive: Gain 5-6, Output 5.",
    historicalContext: "Jeff Beck, John Mayer, Nels Cline. $5,000+ on the used market. Bill Finnegan's design masterpiece.",
  },
  {
    pattern: "rat|fat-rat",
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
    pattern: "ocd",
    category: "overdrive",
    gainRange: [1, 8],
    intendedUse: ["Marshall-in-a-box", "crunch", "versatile drive", "rock rhythm"],
    placement: "Before amp. HP mode for tight, LP mode for compressed. Extremely versatile.",
    stacksWith: "Works well after a TS for boosted mid-heavy leads. HP mode stacks better into high-gain amps.",
    sweetSpot: "Drive 4-6, HP mode for tighter amps, LP mode for Fender-style amps.",
    historicalContext: "Fulltone's most famous design. MOSFET clipping for amp-like response. Used across rock, blues, country.",
  },
  {
    pattern: "blues-driver",
    category: "overdrive",
    gainRange: [0, 7],
    intendedUse: ["edge of breakup", "blues", "dynamic drive", "clean boost"],
    placement: "Before amp. Less colored than TS — more open frequency response.",
    sweetSpot: "Drive 2-4 for edge of breakup, Tone 5-7, Level to taste.",
    historicalContext: "Boss BD-2. FET-based clipping. More open than TS. Popular in blues, indie, worship.",
  },
  {
    pattern: "king-of-tone",
    category: "overdrive",
    gainRange: [0, 6],
    intendedUse: ["warm drive", "dual-stage stacking", "amp-like breakup"],
    placement: "Before amp. Dual circuit stacks with itself. Works with any amp style.",
    sweetSpot: "Drive 3-5, Tone at noon, Level at unity or slightly above.",
    historicalContext: "Analogman. Years-long waitlist. Based on Marshall Blues Breaker circuit. Dual independent stages.",
  },
  {
    pattern: "bb-preamp",
    category: "overdrive",
    gainRange: [0, 8],
    intendedUse: ["full-range boost", "transparent drive", "session work"],
    placement: "Before amp. Two-band EQ offers precise tone shaping. Huge gain range.",
    sweetSpot: "Gain 2-4 for boost, Bass/Treble at noon (both are cut controls).",
    historicalContext: "Xotic. Andy Timmons signature. Nashville session favorite. Very wide gain range from clean boost to saturation.",
  },
  {
    pattern: "timmy",
    category: "overdrive",
    gainRange: [0, 6],
    intendedUse: ["transparent stacking", "always-on drive", "subtle enhancement"],
    placement: "Before amp. Designed to disappear — adds gain without coloring tone. Ultimate stacker.",
    sweetSpot: "Gain 3-5, Bass and Treble at noon (cut controls).",
    historicalContext: "Paul Cochrane design. Cult following. Bass/Treble are CUT controls. Designed to let amp and guitar speak.",
  },
  {
    pattern: "zendrive",
    category: "overdrive",
    gainRange: [1, 7],
    intendedUse: ["Dumble-style drive", "fusion", "blues", "jazz lead"],
    placement: "Before clean amp for Dumble tones. The overdrive channel of a Dumble in a box.",
    sweetSpot: "Drive 4-6, Tone 4-6 for warm fusion leads.",
    historicalContext: "Hermida Audio. Dumble ODS in a pedal. Robben Ford, Larry Carlton territory. Warm, vocal midrange.",
  },
  {
    pattern: "fuzz-face-g|fuzz-face-s",
    category: "fuzz",
    gainRange: [3, 10],
    intendedUse: ["classic fuzz", "blues fuzz", "psychedelic", "lead fuzz"],
    warnings: [
      "Must be FIRST in chain — hates buffers before it (low input impedance)",
      "Germanium version is temperature-sensitive and less consistent",
      "Guitar volume cleanup is essential technique — don't just leave Fuzz maxed",
    ],
    placement: "FIRST in chain, before everything else. Before a cranked amp for classic tones.",
    stacksWith: "After a wah is the classic Hendrix chain (wah → fuzz → cranked Marshall).",
    sweetSpot: "Fuzz 6-8, Volume to taste. Use guitar volume for dynamics.",
    historicalContext: "Hendrix (germanium), Gilmour (silicon). Dallas Arbiter original. The foundation of fuzz.",
  },
  {
    pattern: "big-muff",
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
    historicalContext: "EHX. Billy Corgan, J Mascis, Gilmour (live Comfortably Numb). Massive sustain with scooped mids.",
  },
  {
    pattern: "tone-bender",
    category: "fuzz",
    gainRange: [3, 9],
    intendedUse: ["aggressive fuzz", "British classic rock fuzz", "raw lead"],
    placement: "Before amp. More aggressive than Fuzz Face. Retains more edge when cleaned up.",
    sweetSpot: "Fuzz 5-7, Tone at noon, Volume to taste.",
    historicalContext: "Sola Sound MkII. Jimmy Page (Led Zep I/II), Jeff Beck (Yardbirds). British fuzz tradition.",
  },
  {
    pattern: "octavia",
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
    pattern: "ds-1",
    category: "distortion",
    gainRange: [2, 8],
    intendedUse: ["punk", "grunge", "raw distortion", "aggressive rock"],
    placement: "Before clean amp as standalone distortion. Can push a crunchy amp harder.",
    sweetSpot: "Distortion 5-7, Tone 3-5 (can be harsh above 7), Level to taste.",
    historicalContext: "Boss. Kurt Cobain, Steve Vai, Joe Satriani (early). Op-amp hard clipping. Raw, no-frills.",
  },
  {
    pattern: "mxr-dist-plus",
    category: "distortion",
    gainRange: [2, 7],
    intendedUse: ["classic rock distortion", "bright cutting distortion", "'70s rock"],
    placement: "Before amp. Simple, direct distortion. Cuts through a mix.",
    sweetSpot: "Distortion 4-6, Output to taste. Bright character — may need treble rolloff on bright amps.",
    historicalContext: "MXR. Randy Rhoads, Bob Mould. One of the first distortion pedals. Germanium diode clipping.",
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
    pattern: "fe-fuzz",
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
