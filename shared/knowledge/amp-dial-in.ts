export interface DialInSettings {
  gain: number;
  bass: number;
  mid: number;
  treble: number;
  master: number;
  presence: number;
  bright?: boolean;
  depth?: boolean;
  boost?: boolean;
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
  presets: DialInPreset[];
}

export interface ModelOverride {
  modelId: string;
  presets: DialInPreset[];
}

export const AMP_FAMILY_DEFAULTS: AmpFamilyDefaults[] = [

  {
    familyId: "fender-tweed",
    familyName: "Fender Tweed Era",
    modelPatterns: ["5f1-tweed", "5f8-tweed", "deluxe-tweed", "59-bassguy", "junior-tweed"],
    presets: [
      {
        id: "tweed-clean",
        style: "Clean",
        settings: { gain: 3, bass: 6, mid: 5, treble: 6, master: 5, presence: 5 },
        tips: [
          "Tweed amps are interactive — the volume controls on both channels affect each other when jumped",
          "These amps break up early so keep gain conservative for cleans",
          "The tone stack in tweed amps is passive and works differently from later Fenders",
          "Try backing off guitar volume for sparkling cleans"
        ],
        whatToListenFor: [
          "Warm, rounded clean tone with slight harmonic richness",
          "Touch sensitivity — should clean up nicely with lighter picking"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "tweed-crunch",
        style: "Crunch",
        settings: { gain: 6, bass: 7, mid: 4, treble: 5, master: 6, presence: 5 },
        tips: [
          "Tweed crunch is thick and hairy — Neil Young territory",
          "The sag and compression are a big part of the tone, use the Supply Sag parameter",
          "Bass can get woofy fast on tweed amps — pull it back if it gets muddy",
          "Master volume interacts heavily with gain — experiment with the ratio"
        ],
        whatToListenFor: [
          "Chewy, harmonically rich breakup that responds to pick attack",
          "Natural compression that evens out dynamics without squashing them"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  {
    familyId: "fender-blackface",
    familyName: "Fender Blackface / Silverface",
    modelPatterns: ["deluxe-verb", "double-verb", "us-deluxe", "prince-tone", "vibrato-king", "super-verb"],
    presets: [
      {
        id: "bf-clean",
        style: "Clean",
        settings: { gain: 4, bass: 5, mid: 5, treble: 6, master: 5, presence: 4 },
        tips: [
          "Blackface Fenders are the gold standard for clean tone — crystal clear with a scooped mid character",
          "The Normal channel is warmer, the Vibrato channel has more sparkle and reverb",
          "Keep presence moderate — too high adds an ice-pick quality",
          "Bass and treble interact on these amps — cutting bass adds perceived brightness",
          "The Bright switch adds a cap across the volume pot — most useful at lower gain settings"
        ],
        whatToListenFor: [
          "Bell-like clean tone with natural scoop in the mids",
          "The classic Fender 'spank' on single coils — snappy attack with warm body"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "bf-edge",
        style: "Edge of Breakup",
        settings: { gain: 6, bass: 4, mid: 6, treble: 6, master: 6, presence: 5 },
        tips: [
          "Blackface breakup is glassy and chimey — the magic happens right at the edge",
          "Use guitar volume knob to ride between clean and dirty",
          "Adding mids helps the breakup character — don't be afraid to boost them",
          "This is classic SRV, John Mayer territory"
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
    familyId: "vox-ac",
    familyName: "Vox AC Series",
    modelPatterns: ["ac-20", "class-a-15", "class-a-30"],
    presets: [
      {
        id: "vox-chime",
        style: "Chimey Clean",
        settings: { gain: 3, bass: 4, mid: 5, treble: 7, master: 5, presence: 6 },
        tips: [
          "Vox amps have a unique top-boost circuit — the treble and bass controls on the top-boost channel are where the magic is",
          "The Cut control acts like reverse presence — it rolls off highs at the power amp stage",
          "These are cathode-biased Class A — they compress naturally and feel very responsive",
          "The Normal channel (no top boost) is warmer and fatter — try it for blues"
        ],
        whatToListenFor: [
          "Jangly, chimey highs with a pronounced upper-mid presence",
          "The characteristic Vox 'chime' that made The Beatles and The Edge famous"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "vox-crunch",
        style: "British Crunch",
        settings: { gain: 6, bass: 4, mid: 6, treble: 6, master: 7, presence: 5 },
        tips: [
          "AC30 crunch is jangly and aggressive — great for rhythm guitar",
          "The amp sags beautifully when pushed — Supply Sag parameter is key",
          "Brian May got his tone with a Vox cranked to the edge with a treble booster",
          "Tom Petty, U2 Edge, Radiohead — this is a desert island amp tone"
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
    familyId: "marshall-plexi",
    familyName: "Marshall Plexi / JTM / SLP",
    modelPatterns: ["plexi", "1959slp", "brit-pre", "brit-silver"],
    presets: [
      {
        id: "plexi-classic",
        style: "Classic Rock",
        settings: { gain: 5, bass: 5, mid: 7, treble: 6, master: 7, presence: 6 },
        tips: [
          "Plexis want to be cranked — the magic is in the power amp section",
          "Jump the channels for fuller tone — Fractal models this with jumped channel variants",
          "Presence control is critical on Marshalls — it shapes the power amp response",
          "These amps are mid-forward by nature — embrace it, that's the Marshall sound",
          "A Tube Screamer in front is the classic formula for more gain and tighter bass"
        ],
        whatToListenFor: [
          "Thick, aggressive midrange growl with singing sustain when pushed",
          "The roar — when the power tubes start to saturate, the amp comes alive"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      },
      {
        id: "plexi-crunch",
        style: "Hard Crunch",
        settings: { gain: 7, bass: 4, mid: 8, treble: 7, master: 8, presence: 5 },
        tips: [
          "Pull back bass to keep the low end tight — Plexis can get woolly",
          "High master volume drives the power tubes harder — this is where the feel comes from",
          "Try the Bright switch on — it adds clarity at higher gain settings",
          "AC/DC, Led Zeppelin, early Van Halen — this is the sound of rock and roll"
        ],
        whatToListenFor: [
          "Aggressive, punchy midrange attack with harmonic overtones",
          "String separation even at high gain — each note should be distinguishable"
        ],
        source: "Yek's Guide / Fractal Forum"
      }
    ]
  },

  {
    familyId: "marshall-800",
    familyName: "Marshall JCM 800",
    modelPatterns: ["brit-800", "brit-studio-20"],
    presets: [
      {
        id: "jcm800-rhythm",
        style: "Hard Rock Rhythm",
        settings: { gain: 6, bass: 5, mid: 7, treble: 6, master: 6, presence: 6 },
        tips: [
          "The JCM 800 is a one-channel amp — the 2203 (master volume) and 2204 (lower wattage) are the classics",
          "It's a medium-gain amp by modern standards — use a boost pedal for more saturation",
          "The preamp clip on these is aggressive and bright — Presence tames the fizz",
          "Zakk Wylde, Randy Rhoads, Slash — the 80s metal/hard rock standard",
          "The 2204 version is lower wattage and breaks up earlier"
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
          "A Tube Screamer (gain low, level high) in front is THE classic JCM 800 trick",
          "The boost tightens the bass and pushes the preamp into saturation",
          "Keep bass conservative when boosted — it tightens the palm mutes",
          "This is the Zakk Wylde / Slash / AFD approach to getting modern gain from a vintage circuit"
        ],
        whatToListenFor: [
          "Tighter, more saturated version of the stock tone with better note articulation",
          "Palm mutes should be chunky and defined, not loose or flubby"
        ],
        source: "Fractal Forum / Yek's Guide"
      }
    ]
  },

  {
    familyId: "marshall-jcm900",
    familyName: "Marshall JCM 900",
    modelPatterns: ["brit-jm45", "brit-j-45"],
    presets: [
      {
        id: "jcm900-drive",
        style: "90s Rock",
        settings: { gain: 6, bass: 5, mid: 6, treble: 6, master: 6, presence: 5 },
        tips: [
          "JCM 900s use diode clipping in the preamp — more gain than JCM 800 but a different character",
          "Some players feel the tone is less organic than pure-tube Marshalls",
          "Works great for 90s grunge and alternative rock tones",
          "Try rolling back the gain for a more open, dynamic response"
        ],
        whatToListenFor: [
          "More compressed, saturated distortion than a JCM 800",
          "Tighter overall response with less sag"
        ],
        source: "Yek's Guide"
      }
    ]
  },

  {
    familyId: "marshall-jvm",
    familyName: "Marshall JVM / Modern",
    modelPatterns: ["brit-ap", "brit-2020"],
    presets: [
      {
        id: "jvm-crunch",
        style: "Modern Crunch",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 6 },
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
    presets: [
      {
        id: "jubilee-lead",
        style: "Hot Rod Lead",
        settings: { gain: 7, bass: 5, mid: 7, treble: 6, master: 6, presence: 6 },
        tips: [
          "The Silver Jubilee (2555) is a hot-rodded Marshall with a diode clipping circuit",
          "It bridges the gap between JCM 800 and JCM 900 — more gain than the 800 but retains tube feel",
          "Slash used a Jubilee extensively — it's the 'other' Slash amp",
          "The Lead channel has a lot of gain — start lower than you think"
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
    presets: [
      {
        id: "recto-modern",
        style: "Modern High Gain",
        settings: { gain: 6, bass: 4, mid: 5, treble: 6, master: 6, presence: 7 },
        tips: [
          "Rectifiers are notorious for too much bass — start with bass lower than you'd expect",
          "Modern mode has more gain and tighter response than Vintage mode",
          "The Bold/Spongy switch (silicon/tube rectifier) dramatically changes feel",
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
        style: "Vintage Mode",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 7, presence: 5 },
        tips: [
          "Vintage mode has less gain but more dynamic response",
          "Spongy (tube rectifier) mode adds sag and compression — great for feel",
          "More mid-forward than Modern mode — better for cutting through a mix",
          "Try this for blues-rock and classic rock tones"
        ],
        whatToListenFor: [
          "More open, dynamic high-gain tone with better note definition",
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
    presets: [
      {
        id: "mark-rhythm",
        style: "Mark IIC+ Rhythm",
        settings: { gain: 6, bass: 3, mid: 4, treble: 7, master: 7, presence: 5 },
        tips: [
          "The Mark series tone stack is very powerful — small changes make big differences",
          "The classic V-shaped EQ (bass 3, mid 3, treble 7) is the Metallica Master of Puppets setting",
          "The graphic EQ is critical on Mark amps — the preset 'V' curve is legendary",
          "Pull the bass back to tighten the low end for metal rhythm",
          "John Petrucci, Metallica, Lamb of God — the progressive/thrash metal standard"
        ],
        whatToListenFor: [
          "Tight, focused distortion with cutting treble and controlled bass",
          "Extreme clarity and note definition even at high gain settings"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      },
      {
        id: "mark-lead",
        style: "Singing Lead",
        settings: { gain: 7, bass: 3, mid: 5, treble: 6, master: 8, presence: 4 },
        tips: [
          "Push the master higher for more power tube saturation and sustain",
          "Adding mids helps leads cut through — the scooped rhythm EQ doesn't always work for solos",
          "The Mark IIC+ lead channel is one of the most sought-after high-gain lead tones ever",
          "Lower presence helps smooth out the top end for liquid lead tones"
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
    presets: [
      {
        id: "lonestar-clean",
        style: "Boutique Clean",
        settings: { gain: 3, bass: 5, mid: 6, treble: 6, master: 5, presence: 5 },
        tips: [
          "The Lone Star excels at clean and low-gain tones — it's Mesa's clean machine",
          "Channel 1 is pure clean, Channel 2 adds more gain staging",
          "The Drive control on Channel 2 adds a warm, organic crunch",
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
    presets: [
      {
        id: "bogner-crunch",
        style: "Boutique Crunch",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 6 },
        tips: [
          "Bogner amps (Euro in Fractal naming) blend Marshall aggression with American warmth",
          "The Ecstasy is incredibly versatile — from clean to high gain on one amp",
          "The Blue channel is Plexi-like, Red is high gain, Green is clean",
          "Structure switch changes the voicing dramatically"
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
        settings: { gain: 7, bass: 5, mid: 6, treble: 6, master: 6, presence: 5 },
        tips: [
          "The Ecstasy Red channel is a high-gain monster with incredible feel",
          "It tracks fast riffs better than most high-gain amps",
          "Try lower presence for smoother lead tones — it's naturally bright enough"
        ],
        whatToListenFor: [
          "Articulate high-gain tone that retains clarity even at extreme settings",
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
    presets: [
      {
        id: "diezel-modern",
        style: "Modern Metal",
        settings: { gain: 6, bass: 4, mid: 5, treble: 6, master: 6, presence: 7 },
        tips: [
          "Diezel amps (Dizzy in Fractal) are tight, aggressive, and incredibly detailed",
          "The VH4 channel 3 is the legendary high-gain channel — tight and crushing",
          "Channel 4 is even more gained up but looser — great for doom/sludge",
          "Deep switch adds low-end resonance — use sparingly for tight rhythm",
          "Herbert and VH4 are different beasts — Herbert is tighter, VH4 is thicker"
        ],
        whatToListenFor: [
          "Extremely tight, articulate high-gain tone with pristine clarity",
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
    presets: [
      {
        id: "engl-lead",
        style: "Modern Lead",
        settings: { gain: 6, bass: 5, mid: 6, treble: 6, master: 5, presence: 6 },
        tips: [
          "ENGL amps (Angle in Fractal) are known for extremely tight, focused high-gain tones",
          "The Fireball and Savage models are metal staples",
          "ENGL amps tend to have more midrange presence than Mesa Rectifiers",
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
    presets: [
      {
        id: "5150-chug",
        style: "Metal Rhythm",
        settings: { gain: 6, bass: 4, mid: 5, treble: 7, master: 5, presence: 7 },
        tips: [
          "The 5150 Block Letter (original) has a more raw, aggressive character than the later versions",
          "Keep bass lower than you think — the 5150 has massive low end",
          "The resonance control adds low-end thump — use it, but don't overdo it",
          "5150/6505 is THE modern metal amp — used by everyone from Killswitch Engage to August Burns Red",
          "Bright switch should generally be OFF for high gain — it adds fizz"
        ],
        whatToListenFor: [
          "Crushing, aggressive palm mutes with extreme tightness",
          "Raw, aggressive distortion character that sits perfectly for modern metal"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      },
      {
        id: "5150-lead",
        style: "High Gain Lead",
        settings: { gain: 7, bass: 5, mid: 6, treble: 6, master: 6, presence: 5 },
        tips: [
          "For leads, add more mids and reduce presence for a smoother top end",
          "The 5150 III (EVH) has more gain and better lead tones than the original",
          "Push the master slightly higher for more sustain and compression",
          "Rolling back presence prevents the fizzy top end on lead passages"
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
    modelPatterns: ["ods-100", "bludojai", "mr-z"],
    presets: [
      {
        id: "dumble-clean",
        style: "Boutique Clean",
        settings: { gain: 3, bass: 5, mid: 5, treble: 5, master: 5, presence: 5 },
        tips: [
          "Dumble amps are the holy grail of boutique tones — the ODS-100 is the most famous",
          "The clean channel is Fender-derived but richer and more three-dimensional",
          "These amps are incredibly touch-sensitive — the feel is the magic",
          "Robben Ford, Larry Carlton, John Mayer (Dumble-style) — smooth, singing leads"
        ],
        whatToListenFor: [
          "Rich, three-dimensional clean tone that sounds 'expensive'",
          "Incredible depth and dimension compared to a standard Fender clean"
        ],
        source: "Yek's Guide / Fractal Wiki"
      },
      {
        id: "dumble-overdrive",
        style: "Smooth Overdrive",
        settings: { gain: 5, bass: 5, mid: 6, treble: 5, master: 6, presence: 5 },
        tips: [
          "The overdrive channel of a Dumble is smooth, creamy, and incredibly musical",
          "It's the ultimate blues-rock lead tone — warm, singing sustain",
          "The amp responds to guitar volume changes like no other",
          "PAF-style humbuckers or single coils both sound incredible through a Dumble"
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
    presets: [
      {
        id: "orange-dirty",
        style: "Dirty Rock",
        settings: { gain: 6, bass: 5, mid: 6, treble: 5, master: 6, presence: 5 },
        tips: [
          "Orange amps (Citrus in Fractal) have a distinctive thick, chewy midrange",
          "The Rockerverb is more versatile, the OR has that classic raw Orange tone",
          "Orange amps tend to be mid-heavy — they cut through dense mixes naturally",
          "Great for stoner rock, doom, and British rock tones"
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
    presets: [
      {
        id: "slo-crunch",
        style: "Hot Rod Crunch",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 6 },
        tips: [
          "The SLO-100 was one of the first modern high-gain amps — designed by Mike Soldano in 1987",
          "The Crunch channel is Plexi-derived with more gain on tap",
          "The Overdrive channel is smooth, singing, and incredibly musical",
          "Presence on the SLO is very powerful — start moderate",
          "Used by Eric Clapton, Mark Knopfler, Lou Reed"
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
        settings: { gain: 7, bass: 4, mid: 6, treble: 6, master: 6, presence: 5 },
        tips: [
          "The SLO overdrive channel is THE benchmark for smooth, singing high-gain lead tones",
          "It's creamy and musical without being muddy or fizzy",
          "The Depth control adds low-end resonance — use judiciously for tight tones",
          "Lower presence smooths the top for liquid leads"
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
    modelPatterns: ["matchbox", "mr-z", "herbie"],
    presets: [
      {
        id: "matchless-clean",
        style: "Boutique Clean",
        settings: { gain: 3, bass: 5, mid: 6, treble: 6, master: 5, presence: 5 },
        tips: [
          "Matchless amps combine Vox-like chime with more headroom and refinement",
          "The DC30 and HC30 are the flagships — chimey, responsive, and musical",
          "Class A operation gives natural compression and a lively feel",
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
    presets: [
      {
        id: "friedman-be",
        style: "Hot Rod Marshall",
        settings: { gain: 6, bass: 5, mid: 7, treble: 6, master: 6, presence: 6 },
        tips: [
          "Dave Friedman's amps are hot-rodded Marshalls with modern refinements",
          "The BE-100 has tighter bass, more gain, and better note definition than a stock Plexi",
          "The SAT switch changes gain structure — toggle it to find your sweet spot",
          "The Friedman HBE channel has even more gain for modern metal rhythm"
        ],
        whatToListenFor: [
          "The best of Marshall with modern tightness and clarity",
          "Rich, harmonically complex crunch that stays articulate at any gain level"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "revv",
    familyName: "REVV Generator",
    modelPatterns: ["revv"],
    presets: [
      {
        id: "revv-purple",
        style: "Modern High Gain",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 6 },
        tips: [
          "REVV amps are extremely responsive and tight modern high-gain designs",
          "The Purple channel is the high-gain monster — incredibly detailed and clear",
          "Red channel has more gain but retains dynamics — good for progressive styles",
          "The aggression switch changes the voicing — try both"
        ],
        whatToListenFor: [
          "Pristine, detailed high-gain with excellent pick dynamics",
          "Clarity in complex chord voicings even at high gain settings"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "splawn",
    familyName: "Splawn (Spawn Series)",
    modelPatterns: ["spawn"],
    presets: [
      {
        id: "splawn-nitrous",
        style: "Aggressive Rock/Metal",
        settings: { gain: 6, bass: 5, mid: 7, treble: 6, master: 6, presence: 6 },
        tips: [
          "Splawn amps (Spawn in Fractal) are hot-rodded Marshalls with more gain and tighter bass",
          "The Nitrous has a raw, aggressive character — not refined but powerful",
          "The Quick Rod is tighter and more modern-sounding",
          "Great for aggressive rock, punk, and metalcore"
        ],
        whatToListenFor: [
          "Raw, aggressive Marshall-derived tone with more gain and tightness",
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
    presets: [
      {
        id: "fryette-ultra",
        style: "Modern Lead",
        settings: { gain: 6, bass: 5, mid: 6, treble: 6, master: 6, presence: 5 },
        tips: [
          "Fryette (formerly VHT) amps are smooth, refined high-gain machines",
          "The Pittbull Ultra Lead is legendary for its smooth, singing lead tone",
          "The Deliverance is tighter and more aggressive — great for modern metal",
          "Sig:X series adds more versatility with different gain structures"
        ],
        whatToListenFor: [
          "Smooth, refined high-gain with excellent sustain and feel",
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
    presets: [
      {
        id: "wreck-express",
        style: "Dynamic Crunch",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 6, presence: 5 },
        tips: [
          "Trainwreck amps are among the most coveted boutique amps ever made",
          "They're incredibly touch-sensitive — the amp breathes with your playing",
          "The Express is the most popular — Vox-meets-Marshall character",
          "The Liverpool is more Vox-like, the Rocket is more aggressive",
          "Low wattage, high expressiveness — these amps want to be played hard"
        ],
        whatToListenFor: [
          "Extraordinary touch sensitivity — the amp reacts to every nuance",
          "Complex harmonic content that evolves as you change pick dynamics"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  },

  {
    familyId: "suhr",
    familyName: "Suhr Badger",
    modelPatterns: ["badger"],
    presets: [
      {
        id: "badger-crunch",
        style: "Boutique Crunch",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 5 },
        tips: [
          "The Suhr Badger is a modern boutique design with classic British voicing",
          "Incredibly responsive to pick dynamics and guitar volume changes",
          "The Badger 18 is lower wattage and breaks up earlier — more bedroom friendly",
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
    presets: [
      {
        id: "tc-crunch",
        style: "Versatile Crunch",
        settings: { gain: 5, bass: 5, mid: 6, treble: 6, master: 5, presence: 5 },
        tips: [
          "The Triple Crown is Mesa's most versatile modern design",
          "Channel 2 is the sweet spot — great crunch to medium gain",
          "Channel 3 has more gain for modern rock and metal",
          "The Tight/Normal/Loose switch changes the low-end response dramatically"
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
    presets: [
      {
        id: "hiwatt-clean",
        style: "Powerful Clean",
        settings: { gain: 4, bass: 5, mid: 6, treble: 6, master: 5, presence: 6 },
        tips: [
          "Hiwatt amps have massive clean headroom — they stay clean at deafening volumes",
          "The tone is tighter and more focused than a Fender clean",
          "Pete Townshend, David Gilmour, The Who — power and clarity",
          "The midrange is more present than Fender — great for cutting through a loud band"
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
    presets: [
      {
        id: "carol-ann-lead",
        style: "Boutique Lead",
        settings: { gain: 6, bass: 5, mid: 6, treble: 6, master: 5, presence: 5 },
        tips: [
          "Carol-Ann amps are handbuilt boutique designs known for incredible feel",
          "The Tucana is the flagship — smooth, dynamic, and harmonically rich",
          "These amps are favorites among Nashville session players",
          "Great for country, pop, and worship styles where clarity and feel matter"
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
    presets: [
      {
        id: "morgan-breakup",
        style: "Chimey Breakup",
        settings: { gain: 5, bass: 4, mid: 6, treble: 7, master: 6, presence: 5 },
        tips: [
          "Morgan amps are inspired by vintage British circuits with modern refinements",
          "The AC20 is their take on the Vox AC — chimey, responsive, and musical",
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
    presets: [
      {
        id: "jc120-clean",
        style: "Pristine Clean",
        settings: { gain: 4, bass: 5, mid: 5, treble: 6, master: 5, presence: 5 },
        tips: [
          "The JC-120 is THE clean tone reference — crystal clear with no breakup",
          "The built-in chorus is legendary — it defines the '80s clean tone",
          "Solid-state cleans have zero sag — the response is immediate and articulate",
          "Andy Summers (The Police), Robert Smith (The Cure), jazz players worldwide"
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
    modelPatterns: ["supremo", "prince-tone"],
    presets: [
      {
        id: "supro-grit",
        style: "Dirty Clean",
        settings: { gain: 5, bass: 5, mid: 6, treble: 5, master: 5, presence: 5 },
        tips: [
          "Supro amps have a raw, gritty character unlike any other amp",
          "Jimmy Page used Supros extensively on early Zeppelin recordings",
          "They break up early and have a fuzzy, almost broken quality when pushed",
          "Low wattage means they come alive at lower volumes"
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
    presets: [
      {
        id: "dlx-reverb-clean",
        style: "Classic Fender Clean",
        settings: { gain: 4, bass: 6, mid: 5, treble: 6, master: 5, presence: 4, bright: true },
        tips: [
          "The Deluxe Reverb is arguably the most recorded amp in history",
          "The Vibrato channel is the one everyone uses — it has the reverb circuit",
          "At 22 watts it breaks up at manageable volumes — perfect for studio work",
          "Keep Presence low for warmer tones, higher for more sparkle and cut",
          "The amp's natural compression is part of the tone — don't fight it"
        ],
        whatToListenFor: [
          "Warm, three-dimensional clean with natural compression",
          "The signature Fender 'drip' reverb that defines the amp's character"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      }
    ]
  },
  {
    modelId: "1959slp-jumped",
    presets: [
      {
        id: "slp-acdc",
        style: "Classic AC/DC Rock",
        settings: { gain: 6, bass: 4, mid: 8, treble: 6, master: 8, presence: 6 },
        tips: [
          "The 1959 SLP is THE Marshall Plexi — the sound of rock and roll",
          "Jumped channels combine both inputs for the fullest tone",
          "Angus and Malcolm Young used SLPs cranked to the max with no pedals",
          "Keep bass conservative — these amps have plenty of low end",
          "The power amp section is where the magic happens — push the master"
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
    modelId: "plexi-100w-1970",
    presets: [
      {
        id: "plexi-70s",
        style: "70s Hard Rock",
        settings: { gain: 7, bass: 4, mid: 7, treble: 7, master: 8, presence: 5 },
        tips: [
          "The 1970 Plexi has a slightly different character from the '60s models — more aggressive",
          "The aluminum-panel era introduced subtle circuit changes that added bite",
          "Think early Judas Priest, UFO, early Iron Maiden",
          "Crank the master and control gain with your guitar volume"
        ],
        whatToListenFor: [
          "Brighter, more aggressive version of the classic Plexi tone",
          "More bite and presence than the earlier 1959 models"
        ],
        source: "Fractal Wiki / Yek's Guide"
      }
    ]
  },
  {
    modelId: "plexi-studio-20",
    presets: [
      {
        id: "studio20-crunch",
        style: "Low Watt Plexi Crunch",
        settings: { gain: 6, bass: 5, mid: 7, treble: 6, master: 7, presence: 5 },
        tips: [
          "The Studio 20 is Marshall's SV20H — a 20W reissue of the Plexi",
          "Lower wattage means earlier breakup — the sweet spot is more accessible",
          "It captures the essential Plexi character in a more manageable package",
          "Great for recording — you get cranked Plexi tones at lower SPL",
          "The power section saturates earlier giving more of that sought-after feel"
        ],
        whatToListenFor: [
          "Classic Plexi roar in a more compressed, manageable package",
          "Earlier power tube saturation — the feel is more immediate"
        ],
        source: "Fractal Wiki / Fractal Forum"
      }
    ]
  },
  {
    modelId: "brit-800-2204",
    presets: [
      {
        id: "800-2204-rock",
        style: "80s Hard Rock",
        settings: { gain: 7, bass: 5, mid: 7, treble: 6, master: 6, presence: 6 },
        tips: [
          "The 2204 is the 50W JCM 800 — breaks up earlier than the 100W 2203",
          "This is the amp that defined 80s metal and hard rock",
          "A Tube Screamer or SD-1 in front is the classic recipe for more gain",
          "Keep mids high — the midrange bark is what makes a JCM 800 special",
          "Randy Rhoads used a 2203, Zakk Wylde used both"
        ],
        whatToListenFor: [
          "Bright, aggressive crunch with that signature Marshall 'bark'",
          "Tight, punchy response that cuts through a band like a knife"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      }
    ]
  },
  {
    modelId: "recto-orange-modern",
    presets: [
      {
        id: "recto-djent",
        style: "Modern Djent/Metal",
        settings: { gain: 5, bass: 3, mid: 5, treble: 7, master: 7, presence: 8 },
        tips: [
          "For djent and modern metal, less gain is more — it keeps the tone tight",
          "Bass should be very low to prevent the characteristic Recto mud",
          "Presence should be high for the percussive attack that defines the style",
          "Combine with a tight boost (TS or Precision Drive) for maximum definition",
          "Used by Periphery, After the Burial, Monuments for the modern metal sound"
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
    presets: [
      {
        id: "6160-metalcore",
        style: "Metalcore Rhythm",
        settings: { gain: 6, bass: 4, mid: 5, treble: 7, master: 5, presence: 7 },
        tips: [
          "The Block Letter 5150 is the original — raw and aggressive",
          "Keep Resonance (low-end depth) moderate for tight chugs",
          "The Lead channel has more than enough gain — start at 5-6",
          "Bright switch should be OFF for high gain use",
          "Killswitch Engage, Trivium, All That Remains — the metalcore standard"
        ],
        whatToListenFor: [
          "Raw, aggressive distortion with extreme tightness",
          "The 'chainsaw' quality that defines modern metalcore rhythm tones"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      }
    ]
  },
  {
    modelId: "class-a-30-tb",
    presets: [
      {
        id: "ac30-jangle",
        style: "Chimey Jangle",
        settings: { gain: 4, bass: 4, mid: 5, treble: 7, master: 5, presence: 5, bright: true },
        tips: [
          "The AC30 Top Boost is one of the most iconic amps ever made",
          "The Top Boost circuit adds the treble/bass EQ section — this is 'the sound'",
          "The Cut control acts as reverse presence — turn it up to tame harsh treble",
          "The Beatles, Brian May, The Edge, Radiohead — this amp is everywhere",
          "Treble and bass controls are passive and interactive"
        ],
        whatToListenFor: [
          "Glassy, chimey treble with a pronounced upper-mid presence peak",
          "The jangly character that defined British Invasion and modern indie"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      }
    ]
  },
  {
    modelId: "usa-mk-v-red-iic",
    presets: [
      {
        id: "mkv-iic-metal",
        style: "IIC+ Metal",
        settings: { gain: 7, bass: 2, mid: 3, treble: 8, master: 7, presence: 5 },
        tips: [
          "The Mark V's IIC+ mode recreates the legendary Mesa Mark IIC+ tone",
          "Use the classic V-shaped EQ: bass low, mid low, treble high",
          "The Graphic EQ is essential — use the famous 'V' curve",
          "Dream Theater, Metallica Master of Puppets — this is THE progressive/thrash tone",
          "Keep bass extremely low for tight, focused palm mutes"
        ],
        whatToListenFor: [
          "Laser-focused, cutting high-gain with extreme clarity",
          "Detailed note articulation even during fast passages"
        ],
        source: "Yek's Guide / Fractal Wiki / Fractal Forum"
      }
    ]
  },
  {
    modelId: "ods-100-clean",
    presets: [
      {
        id: "ods-boutique-clean",
        style: "Ultimate Clean",
        settings: { gain: 3, bass: 5, mid: 5, treble: 5, master: 5, presence: 5 },
        tips: [
          "The Dumble ODS-100 clean channel is Fender-derived but with more body and dimension",
          "Real Dumbles sell for $50k-$150k — Fractal modeling is the accessible path",
          "The PAB (Pre Amp Boost) switch adds gain staging for overdrive tones",
          "Robben Ford, Larry Carlton, Carlos Santana — the boutique clean standard",
          "Try with single coils for that glassy, three-dimensional quality"
        ],
        whatToListenFor: [
          "An almost 3D quality to the clean tone — depth, width, and presence",
          "Every note should have body and weight without being tubby"
        ],
        source: "Yek's Guide / Fractal Wiki"
      }
    ]
  }
];

export function getDialInPresets(modelId: string, allModels: { id: string; label: string; basedOn: string; characteristics: string }[]): { presets: DialInPreset[]; source: "model" | "family" | "generic"; familyName?: string } {
  const override = MODEL_OVERRIDES.find(o => o.modelId === modelId);
  if (override) {
    return { presets: override.presets, source: "model" };
  }

  for (const family of AMP_FAMILY_DEFAULTS) {
    if (family.modelPatterns.some(pattern => modelId.startsWith(pattern) || modelId.includes(pattern))) {
      return { presets: family.presets, source: "family", familyName: family.familyName };
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
          "A clear, balanced tone as a starting point for further tweaking",
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
          "Move one knob at a time to hear what each control does on this particular model",
          "Listen for the amp's natural voicing before shaping with EQ"
        ],
        whatToListenFor: [
          "The amp's natural character at neutral settings",
          "Which frequencies are prominent and which need adjustment"
        ],
        source: "General starting point"
      };
    }

    return { presets: [defaultPreset], source: "generic" };
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
    source: "generic"
  };
}
