export interface FractalImpedanceCurve {
  fractalCurve: string;
  confidence: 'exact' | 'high' | 'moderate';
  notes: string;
  alternates?: string[];
}

export interface FractalCabResonance {
  setting: string;
  value: number;
  notes: string;
}

export interface FractalSpeakerSettings {
  speaker: string;
  speakerLabel: string;
  impedanceCurve: FractalImpedanceCurve;
  cabResonance: FractalCabResonance;
  speakerDrive?: string;
  speakerThump?: string;
  additionalNotes?: string;
}

export const FRACTAL_SPEAKER_SETTINGS: FractalSpeakerSettings[] = [
  {
    speaker: "v30",
    speakerLabel: "Celestion Vintage 30",
    impedanceCurve: {
      fractalCurve: "1x12 V30",
      confidence: "exact",
      notes: "Direct match. V30 is one of the most commonly measured speakers in Fractal.",
      alternates: ["4x12 Recto Traditional", "4x12 Uber"]
    },
    cabResonance: {
      setting: "Medium-High",
      value: 6.5,
      notes: "Grossman closed-back iso cab is deeper than typical 1x12, so slightly higher resonance captures the extended low-end response."
    },
    speakerDrive: "5.0 - Default. V30s have good power handling.",
    speakerThump: "5.5 - Slightly above default for the deep Grossman enclosure.",
    additionalNotes: "V30s are aggressive in the upper mids (2-4kHz). The 1x12 curve is optimal for single-speaker iso cab use."
  },
  {
    speaker: "v30bc",
    speakerLabel: "Celestion Vintage 30 (Black Cat)",
    impedanceCurve: {
      fractalCurve: "1x12 V30",
      confidence: "high",
      notes: "Black Cat V30 variant - same base speaker with subtle cone differences. The 1x12 V30 curve is the best match.",
      alternates: ["4x12 Recto Traditional"]
    },
    cabResonance: {
      setting: "Medium-High",
      value: 6.5,
      notes: "Same as standard V30 - the BC variant doesn't significantly change impedance characteristics."
    },
    speakerDrive: "5.0",
    speakerThump: "5.5"
  },
  {
    speaker: "greenback",
    speakerLabel: "Celestion G12M Greenback",
    impedanceCurve: {
      fractalCurve: "4x12 Basketweave",
      confidence: "high",
      notes: "Basketweave cabs historically used G12M/G12H speakers. This is the classic British closed-back sound.",
      alternates: ["4x12 Brit Greenback", "2x12 Class-A Greenback", "1x12 Brit G12H75"]
    },
    cabResonance: {
      setting: "Medium",
      value: 5.5,
      notes: "Greenbacks have a lower power handling (25W) and looser cone - moderate resonance works well in the deep Grossman enclosure."
    },
    speakerDrive: "6.0 - Greenbacks break up earlier, slightly more drive captures this.",
    speakerThump: "5.0 - Default. Greenbacks already have woody low-end character.",
    additionalNotes: "The 25W Greenback has the classic 'woody' British tone. Lower resonance peak than V30."
  },
  {
    speaker: "g12h",
    speakerLabel: "Celestion G12H Anniversary (30W)",
    impedanceCurve: {
      fractalCurve: "4x12 Basketweave",
      confidence: "high",
      notes: "G12H Heritage/Anniversary is the heavier-magnet cousin of the Greenback. Basketweave curve captures the tight low-end.",
      alternates: ["1x12 Brit G12H75", "4x12 Brit Greenback"]
    },
    cabResonance: {
      setting: "Medium-High",
      value: 6.0,
      notes: "The 30W G12H has a heavier magnet than Greenback, resulting in tighter bass - slightly higher resonance for the Grossman depth."
    },
    speakerDrive: "5.5",
    speakerThump: "5.5",
    additionalNotes: "The G12H Anniversary is the 70th anniversary reissue with the original heavy magnet design."
  },
  {
    speaker: "g12-65",
    speakerLabel: "Celestion G12-65 Heritage",
    impedanceCurve: {
      fractalCurve: "4x12 Brit 800",
      confidence: "moderate",
      notes: "No direct G12-65 curve in Fractal. The Brit 800 (JCM800 era Marshall) used similar 65W Celestions. This is the closest match.",
      alternates: ["4x12 Basketweave", "1x12 Brit G12H75"]
    },
    cabResonance: {
      setting: "Medium",
      value: 5.5,
      notes: "G12-65 has tight bass and balanced mids - moderate resonance preserves articulation."
    },
    speakerDrive: "5.0",
    speakerThump: "5.0",
    additionalNotes: "The G12-65 sits between Greenback and Classic Lead 80 tonally. Fast attack, tight bass, crisp highs."
  },
  {
    speaker: "g12t75",
    speakerLabel: "Celestion G12T-75",
    impedanceCurve: {
      fractalCurve: "4x12 Brit 800",
      confidence: "exact",
      notes: "The JCM800 1960 cabinet was loaded with G12T-75s. This is a direct match.",
      alternates: ["4x12 SLO", "4x12 Brit JM45"]
    },
    cabResonance: {
      setting: "Medium-Low",
      value: 4.5,
      notes: "G12T-75 is a stiffer, higher-power speaker - lower resonance keeps the tight, sizzly character."
    },
    speakerDrive: "4.5 - T75s don't break up as easily.",
    speakerThump: "4.5 - Tighter low-end by design.",
    additionalNotes: "G12T-75 is brighter and stiffer than vintage Celestions. The 'sizzly' high-end is characteristic."
  },
  {
    speaker: "cream",
    speakerLabel: "Celestion Cream (Alnico)",
    impedanceCurve: {
      fractalCurve: "1x12 Cream",
      confidence: "exact",
      notes: "Fractal has a dedicated Cream impedance curve - direct match!",
      alternates: ["1x12 Blue", "1x12 Brit Class-A"]
    },
    cabResonance: {
      setting: "Medium-High",
      value: 6.5,
      notes: "Alnico speakers have a different resonance character - warmer, rounder. The deep Grossman enclosure enhances this."
    },
    speakerDrive: "6.0 - Alnico speakers are more touch-sensitive and break up smoothly.",
    speakerThump: "6.0 - Alnico has natural low-end warmth - enhance this with the deep enclosure.",
    additionalNotes: "The Cream is a 90W alnico speaker with 'bell-like chime' highs and smooth breakup. Exceptional touch sensitivity."
  },
  {
    speaker: "ga12-sc64",
    speakerLabel: "Eminence GA12-SC64 (Alessandro)",
    impedanceCurve: {
      fractalCurve: "1x12 Deluxe Oxford",
      confidence: "high",
      notes: "The GA12-SC64 is voiced for vintage Fender blackface tone. The Deluxe Oxford curve captures similar American ceramic character.",
      alternates: ["1x12 Bassguy", "2x12 65 Bassguy", "1x12 USA Clean"]
    },
    cabResonance: {
      setting: "Medium",
      value: 5.5,
      notes: "American voiced speaker with tight, punchy bass. Moderate resonance in the Grossman preserves the focused low-end."
    },
    speakerDrive: "5.5 - Smooth breakup characteristics.",
    speakerThump: "5.5",
    additionalNotes: "Designed by George Alessandro for vintage 1964 Fender blackface tones. Warm, balanced, excellent breakup."
  },
  {
    speaker: "g10-sc64",
    speakerLabel: "Eminence GA10-SC64 (Alessandro 10\")",
    impedanceCurve: {
      fractalCurve: "1x12 Deluxe Oxford",
      confidence: "high",
      notes: "Despite being a 10\" speaker, the GA10-SC64 has an unusually 12\"-like frequency response. Use the same curve as the 12\" version.",
      alternates: ["1x10 USA", "1x12 Bassguy"]
    },
    cabResonance: {
      setting: "Medium-Low",
      value: 4.5,
      notes: "10\" speakers have higher resonance frequency (100Hz vs 88Hz for 12\"). Lower cab resonance setting compensates in the deep Grossman."
    },
    speakerDrive: "5.5",
    speakerThump: "4.5 - Less low-end extension than 12\" version.",
    additionalNotes: "The GA10-SC64 is praised for having a very '12-inch-ish' frequency response despite being a 10\" speaker. Tight, punchy, sparkly."
  }
];

export const GROSSMAN_CAB_NOTES = `
## Grossman Iso Cab Settings Notes

The Grossman iso cab is a **closed-back** design with deeper internal dimensions than a typical guitar cabinet. This affects the impedance curve interaction:

### Key Characteristics:
- **Closed-back design** - Use closed-back impedance curves (not open-back like Deluxe Reverb)
- **Deeper enclosure** - More low-end extension than typical 1x12 or 2x12 cabs
- **Single speaker** - Use 1x12 curves when available (not 4x12)
- **Acoustic isolation** - No room interaction, so cab resonance modeling matters more

### General Recommendations:
1. **Cab Resonance**: Start at 5.5-6.5 (higher than default) to capture the extended low-end
2. **Speaker Thump**: 5.0-6.0 depending on speaker (alnico speakers benefit from more)
3. **Speaker Drive**: Match to speaker power handling (lower wattage = more drive)
4. **LF Resonance**: May need slight boost (+0.5-1.0) for the deeper enclosure

### When in Doubt:
- Start with the recommended 1x12 curve for your speaker
- If tone is too tight/thin, try a 2x12 curve variant
- If tone is too boomy, reduce Cab Resonance and Speaker Thump
`;

export const FRACTAL_SETTINGS_INTRO = `
This page provides recommended Fractal Audio Axe-Fx/FM9/FM3/AM4 settings for using your IRs with the proper speaker impedance curves and cabinet resonance. These recommendations are specifically tuned for use with a **Grossman iso cab** (closed-back, deep enclosure design).

**Important**: Speaker Impedance Curves model the electrical interaction between the power amp and speaker - they're NOT EQ and work differently than cabinet IRs. Using the correct curve adds realism and feel to your tone.
`;
