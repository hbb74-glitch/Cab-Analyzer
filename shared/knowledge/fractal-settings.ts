export interface FractalImpedanceCurve {
  fractalCurve: string;
  confidence: 'exact' | 'high' | 'moderate';
  notes: string;
  alternates?: string[];
}

export interface FractalSPKRSettings {
  lfResonanceFreq: number;
  lfResonance: number;
  hfResonanceFreq: number;
  speakerThump: number;
  speakerDrive: number;
  speakerCompression: number;
}

export interface FractalSpeakerSettings {
  speaker: string;
  speakerLabel: string;
  impedanceCurve: FractalImpedanceCurve;
  spkrSettings: FractalSPKRSettings;
  notes: string;
  additionalNotes?: string;
}

export const AM4_SPKR_DEFAULTS = {
  lfResonanceFreq: 90,
  lfResonance: 1.0,
  hfResonanceFreq: 1200,
  speakerThump: 1.25,
  speakerDrive: 0.20,
  speakerCompression: 1.0,
};

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
    spkrSettings: {
      lfResonanceFreq: 95,
      lfResonance: 1.2,
      hfResonanceFreq: 1400,
      speakerThump: 1.4,
      speakerDrive: 0.20,
      speakerCompression: 1.0,
    },
    notes: "V30s resonate around 75-80Hz. LF Reso Freq (95Hz) is tuned for closed-back 1x12 use. Slightly elevated Speaker Thump (1.4) captures the aggressive V30 punch.",
    additionalNotes: "V30s are known for aggressive upper-mids (2-4kHz). The 1x12 curve is optimal for IRs captured with a single V30."
  },
  {
    speaker: "v30bc",
    speakerLabel: "Celestion Vintage 30 (Black Cat)",
    impedanceCurve: {
      fractalCurve: "1x12 Hot Kitty Cat",
      confidence: "exact",
      notes: "Direct match! The Hot Kitty Cat curve is based on a Black Cat V30. Perfect for your Black Cat captures.",
      alternates: ["1x12 V30", "4x12 Recto Traditional"]
    },
    spkrSettings: {
      lfResonanceFreq: 90,
      lfResonance: 1.1,
      hfResonanceFreq: 1300,
      speakerThump: 1.3,
      speakerDrive: 0.20,
      speakerCompression: 1.0,
    },
    notes: "Black Cat is slightly smoother than standard V30. The Hot Kitty Cat curve is the ideal match for this speaker variant.",
  },
  {
    speaker: "greenback",
    speakerLabel: "Celestion G12M Greenback",
    impedanceCurve: {
      fractalCurve: "1x12 Div 13 CJ11",
      confidence: "exact",
      notes: "Direct 1x12 G12M match! The Divided by 13 CJ11 uses a Greenback. Perfect for single-speaker G12M captures.",
      alternates: ["4x12 Basketweave", "4x12 Brit Greenback", "2x12 Class-A Greenback"]
    },
    spkrSettings: {
      lfResonanceFreq: 85,
      lfResonance: 1.3,
      hfResonanceFreq: 1100,
      speakerThump: 1.5,
      speakerDrive: 0.30,
      speakerCompression: 1.2,
    },
    notes: "Greenbacks (25W) have a looser cone and break up earlier. Higher Speaker Drive (0.30) and Thump (1.5) capture the woody, vintage character. Slightly higher compression adds the natural speaker sag.",
    additionalNotes: "The 25W Greenback has the classic 'woody' British tone with a lower resonance peak than V30."
  },
  {
    speaker: "g12h",
    speakerLabel: "Celestion G12H Anniversary (30W)",
    impedanceCurve: {
      fractalCurve: "1x12 Brit G12H75",
      confidence: "high",
      notes: "The G12H75 is the 75W version of the G12H family. The G12H Anniversary (30W) is slightly brighter but shares the same impedance characteristics. Best 1x12 match.",
      alternates: ["4x12 Basketweave", "4x12 Brit Greenback"]
    },
    spkrSettings: {
      lfResonanceFreq: 90,
      lfResonance: 1.2,
      hfResonanceFreq: 1200,
      speakerThump: 1.4,
      speakerDrive: 0.25,
      speakerCompression: 1.1,
    },
    notes: "The 30W G12H has a heavier magnet than Greenback, resulting in tighter bass. Your Anniversary is slightly brighter than the G12H75 curve but otherwise a strong match.",
    additionalNotes: "The G12H Anniversary is the 70th anniversary reissue with the original heavy magnet design. Brighter than Greenback but warmer than V30."
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
    spkrSettings: {
      lfResonanceFreq: 88,
      lfResonance: 1.1,
      hfResonanceFreq: 1300,
      speakerThump: 1.3,
      speakerDrive: 0.22,
      speakerCompression: 1.0,
    },
    notes: "G12-65 has tight, controlled bass and crisp highs. Lower thump and drive preserve the fast attack and articulation characteristic of this speaker.",
    additionalNotes: "The G12-65 sits between Greenback and Classic Lead 80 tonally. Fast attack, tight bass, crisp highs. Resonance frequency is 85Hz."
  },
  {
    speaker: "g12t75",
    speakerLabel: "Celestion G12T-75",
    impedanceCurve: {
      fractalCurve: "1x12 G12T75",
      confidence: "exact",
      notes: "Direct 1x12 G12T-75 match! Perfect for single-speaker captures.",
      alternates: ["4x12 Brit 800", "4x12 SLO"]
    },
    spkrSettings: {
      lfResonanceFreq: 100,
      lfResonance: 1.0,
      hfResonanceFreq: 1500,
      speakerThump: 1.1,
      speakerDrive: 0.18,
      speakerCompression: 0.9,
    },
    notes: "G12T-75 is a stiff, high-power speaker. Lower Thump (1.1) and Drive (0.18) keep the tight, modern character. Higher HF Resonance captures the sizzly highs.",
    additionalNotes: "G12T-75 is brighter and stiffer than vintage Celestions. The 'sizzly' high-end is characteristic. Higher power handling = less speaker breakup."
  },
  {
    speaker: "cream",
    speakerLabel: "Celestion Cream (Alnico)",
    impedanceCurve: {
      fractalCurve: "1x12 Blue",
      confidence: "high",
      notes: "No dedicated Cream impedance curve in Fractal. The Blue is the closest alnico match - both are Celestion alnicos with 75Hz resonance and smooth impedance curves. The Cream is higher power (90W vs 15W) with slightly stiffer cone.",
      alternates: ["1x12 Brit Class-A", "2x12 Guy Tron Alnico Blue"]
    },
    spkrSettings: {
      lfResonanceFreq: 80,
      lfResonance: 1.2,
      hfResonanceFreq: 1100,
      speakerThump: 1.3,
      speakerDrive: 0.25,
      speakerCompression: 1.1,
    },
    notes: "The Cream is a higher-power alnico (90W) than the Blue (15W), so it has less speaker breakup. Lower Drive (0.25) and Compression (1.1) vs typical alnico settings reflect the stiffer, higher-headroom character. Still has the smooth alnico warmth.",
    additionalNotes: "The Cream's 90W rating means less cone movement/breakup than vintage alnicos. Resonance frequency is 75Hz. Bell-like chime highs, warm lows, exceptional touch sensitivity. Consider slightly lower Thump (1.3) for the more controlled low-end."
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
    spkrSettings: {
      lfResonanceFreq: 92,
      lfResonance: 1.2,
      hfResonanceFreq: 1250,
      speakerThump: 1.3,
      speakerDrive: 0.28,
      speakerCompression: 1.1,
    },
    notes: "American voiced speaker with tight, punchy bass. Moderate settings preserve the focused low-end and vintage 1964 blackface character. Smooth breakup like vintage Fender speakers.",
    additionalNotes: "Designed by George Alessandro for vintage 1964 Fender blackface tones. Resonance frequency is 88Hz. Warm, balanced, excellent breakup."
  },
  {
    speaker: "g10-sc64",
    speakerLabel: "Eminence GA10-SC64 (Alessandro 10\")",
    impedanceCurve: {
      fractalCurve: "1x10 BF Princeton's",
      confidence: "exact",
      notes: "Direct 1x10 Blackface Princeton match! The GA10-SC64 is voiced for vintage Fender blackface tone - this curve captures the 10\" character perfectly.",
      alternates: ["1x12 Deluxe Oxford", "1x10 USA", "1x12 Bassguy"]
    },
    spkrSettings: {
      lfResonanceFreq: 105,
      lfResonance: 1.0,
      hfResonanceFreq: 1400,
      speakerThump: 1.1,
      speakerDrive: 0.30,
      speakerCompression: 1.0,
    },
    notes: "10\" speakers have higher resonance frequency (100Hz vs 88Hz for 12\"). Higher LF Reso Freq (105Hz) and lower Thump (1.1) capture the focused, punchy 10\" character with smooth breakup.",
    additionalNotes: "The GA10-SC64 is praised for vintage Fender blackface tone. The Princeton curve is ideal for this speaker's voiced character."
  },
  {
    speaker: "k100",
    speakerLabel: "Celestion G12K-100",
    impedanceCurve: {
      fractalCurve: "2x12 Band Commander SRO",
      confidence: "high",
      notes: "No dedicated K100 curve in Fractal. The Band Commander SRO has a similar large magnet with clean response and solid bass - matches the K100's character. Both have broader, less tall resonance peaks.",
      alternates: ["2x12 Recto", "4x12 C90", "1x12 USA Lead"]
    },
    spkrSettings: {
      lfResonanceFreq: 90,
      lfResonance: 1.0,
      hfResonanceFreq: 1150,
      speakerThump: 1.4,
      speakerDrive: 0.18,
      speakerCompression: 1.0,
    },
    notes: "The K100 has the heaviest ceramic magnet in the G12 line (50oz). Very low Drive (0.18) reflects its clean, stiff cone with minimal breakup. Higher Thump (1.4) captures the massive low-end. Low Compression for tight response.",
    additionalNotes: "85Hz resonance frequency. 100W power handling. Massive bottom-end, rock-hard midrange, restrained top-end. Ideal for high-gain metal and modern rock. Used in Mesa Boogie and Marshall Mode 4 cabs."
  }
];

export const GROSSMAN_CAB_NOTES = `
## Grossman Iso Cab - AM4 Settings Notes

The Grossman iso cab is a **closed-back** design with deeper internal dimensions than a typical guitar cabinet. This affects the speaker impedance curve interaction.

### Key Characteristics:
- **Closed-back design** - Use closed-back impedance curves (not open-back)
- **Deeper enclosure** - More low-end extension than typical 1x12 or 2x12 cabs
- **Single speaker** - Use 1x12 curves when available (not 4x12)
- **Acoustic isolation** - No room interaction, so speaker modeling matters more

### AM4 SPKR Page Settings (for FRFR/Monitors):
The SPKR page parameters model the amp-to-speaker interaction. For FRFR use:

| Parameter | Default | Description |
|-----------|---------|-------------|
| **LF Reso Freq** | 90 Hz | Low frequency resonance point - adjust per speaker |
| **LF Resonance** | 1.0 | Amount of low frequency resonance peak |
| **HF Reso Freq** | 1200 Hz | High frequency resonance (voice coil inductance) |
| **Speaker Thump** | 1.25 | Low frequency excursion modeling |
| **Speaker Drive** | 0.20 | Speaker cone distortion/nonlinearity |
| **Speaker Compression** | 1.0 | Dynamic compression from speaker excursion |

### Grossman-Specific Adjustments:
Because the Grossman has a deeper enclosure than typical 1x12 cabs:

1. **LF Reso Freq**: May need +5-10 Hz higher to compensate for extended bass
2. **Speaker Thump**: 1.3-1.5 range captures the deeper cabinet's punch
3. **LF Resonance**: Slight boost (1.1-1.3) for the extended low-end

### When in Doubt:
- Start with the recommended settings for your speaker
- If tone is too boomy, reduce LF Resonance and Speaker Thump
- If tone is too thin, increase LF Resonance and Speaker Thump
- Trust your ears - impedance curves affect feel as much as tone
`;

export const FRACTAL_SETTINGS_INTRO = `
This page provides recommended Fractal Audio AM4 settings for using your IRs with the proper speaker impedance curves and SPKR page parameters. These recommendations are specifically tuned for use with a **Grossman iso cab** (closed-back, deep enclosure design) and FRFR monitoring.

**Important**: Speaker Impedance Curves model the electrical interaction between the power amp and speaker. They affect tone AND feel - they're NOT EQ and work differently than cabinet IRs. Using the correct curve adds realism and responsiveness to your tone.
`;

export const AM4_PARAMETER_INFO = `
## AM4 Amp Block - SPKR Page Parameters

These are the adjustable parameters on the AM4's Amp block SPKR (Speaker) page:

### Impedance Curve Selection
- **Speaker Impedance Curve**: Dropdown selector with 80+ preset curves
- Automatically loads appropriate curve when you select an amp model
- Can be manually changed to match your IR/cab

### Resonance Parameters
| Parameter | Range | What it does |
|-----------|-------|--------------|
| **LF Reso Freq** | 50-120 Hz | Sets the low-frequency resonance point where impedance peaks |
| **LF Resonance** | 0.0-2.0+ | Controls the intensity of the low-frequency resonance peak |
| **HF Reso Freq** | 700-2000 Hz | Sets the high-frequency resonance (voice coil inductance) |
| **HF Resonance** | 0.0-2.0+ | Controls the amplitude of high-frequency resonance |
| **HF Slope** | 3.0-4.5 | Rate of high-frequency impedance rise (affects mids) |

### Speaker Modeling
| Parameter | Default | What it does |
|-----------|---------|--------------|
| **Speaker Thump** | 1.25 | Models low-frequency resonance/excursion (the "knock" of a cab) |
| **Speaker Drive** | 0.20 | Models speaker cone distortion and nonlinearity |
| **Speaker Compression** | 1.0 | Models dynamic compression from speaker excursion |

### For FRFR/Headphone Use:
Use the default values or the Grossman-optimized settings in this guide.

### For Real Cab + Solid State Power Amp:
Set Speaker Thump, Speaker Drive, and Speaker Compression to 0 (your real cab provides these characteristics).
`;
