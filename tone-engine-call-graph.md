# IR.Scope Tone Engine — Complete Call Graph

## ENTRY POINTS

### EP1: Single IR Upload (Drag & Drop)
- **File**: `client/src/pages/Analyzer.tsx`
- **Function**: `onDrop` callback (L3905)
- **Trigger**: User drops a WAV file on the main dropzone
- **Calls**: `parseFilename()` → `analyzeAudioFile()`

### EP2: Batch IR Upload
- **File**: `client/src/pages/Analyzer.tsx`
- **Function**: `onBatchDrop` (L2782)
- **Trigger**: User drops multiple WAV files for batch processing
- **Calls**: iterates files → `analyzeAudioFile()` for each

### EP3: A/B Comparison File Select
- **File**: `client/src/pages/Analyzer.tsx`
- **Function**: `handleFileChange` (L1406)
- **Trigger**: User selects ref/candidate IRs for A/B comparison
- **Calls**: `analyzeAudioFile()`

### EP4: Server-Side Single Analysis
- **File**: `server/routes.ts`
- **Endpoint**: `POST /api/analyze` (L2732)
- **Trigger**: Client submits analysis request with pre-computed metrics
- **Calls**: `scoreSingleIR()` → `storage.createAnalysis()`

### EP5: Server-Side Batch Analysis
- **File**: `server/routes.ts`
- **Endpoint**: `POST /api/analyze/batch` (L6351)
- **Trigger**: Client submits batch of IRs with metrics
- **Calls**: `Promise.all(irs.map(ir => scoreSingleIR()))` → summarize

### EP6: Pairing Analysis
- **File**: `server/routes.ts`
- **Endpoint**: `POST /api/pairing` (L4977)
- **Trigger**: User requests IR pairing suggestions
- **Calls**: `classifyRole()` → `computeComplementarity()` → AI prompt

### EP7: Superblend Creation
- **File**: `server/routes.ts`
- **Endpoint**: `POST /api/preferences/superblend` (L7091)
- **Trigger**: User requests multi-IR Superblend
- **Calls**: AI prompt → polygon snapping

### EP8: Superblend Reoptimize
- **File**: `server/routes.ts`
- **Endpoint**: `POST /api/superblend/reoptimize` (L5884)
- **Trigger**: User adjusts tone nudge sliders and re-optimizes
- **Calls**: scoring functions → hill-climbing optimizer → IR swap loop → polygon snap

### EP9: Client-Side Blend Optimization
- **File**: `client/src/lib/blend-optimizer.ts`
- **Function**: `optimizeBlendRatios()` (L175)
- **Trigger**: Called from Learner.tsx SuperblendPanel after AI returns initial blend
- **Calls**: `scoreBlendedCurve()` → `snapToAchievable()`

### EP10: Client-Side Pairing Suggestions
- **File**: `client/src/lib/preference-profiles.ts`
- **Function**: `suggestPairings()` (L626)
- **Trigger**: Learner/Pairing pages request IR pair recommendations
- **Calls**: role classification → ratio simulation → profile scoring

---

## PREPROCESSING — IR Loading & Normalization

### `analyzeAudioFile(file)`
- **File**: `client/src/hooks/use-analyses.ts` (L514)
- **Does**: Master orchestrator. Loads WAV, decodes to PCM, normalizes amplitude, dispatches to all analysis functions.
- **Calls**: `computePowerSpectrum()`, `computeSpectralCentroid()`, `computeSpectralTilt()`, `computeRolloff()`, `buildLogBands()`, `computeDisplayBands()`, `computePerceptualSmoothness()`, `computeTailLevel()`
- **Called by**: `onDrop`, `onBatchDrop`, `handleFileChange` (Analyzer.tsx)
- **Details**:
  - Creates `AudioContext({ sampleRate: 48000 })` — pinned sample rate
  - `decodeAudioData()` → `getChannelData(0)` (mono)
  - Peak-normalizes if peak < 1.0 (L543-546)
  - Returns `AudioMetrics` object with all computed fields

---

## SPECTRAL ANALYSIS — FFT & Magnitude

### `radix2FFT(real, imag)`
- **File**: `client/src/hooks/use-analyses.ts` (L98)
- **Does**: In-place Radix-2 FFT (Cooley-Tukey). Operates on 8192-point arrays.
- **Calls**: nothing (pure math)
- **Called by**: `computePowerSpectrum()`
- **Algorithm**: Bit-reversal permutation → butterfly operations with twiddle factors

### `computePowerSpectrum(samples, sampleRate)`
- **File**: `client/src/hooks/use-analyses.ts` (L134)
- **Does**: Windows signal with Blackman-Harris (85ms window), runs FFT, computes |X(k)|² and dB byte array
- **Calls**: `radix2FFT()`
- **Called by**: `analyzeAudioFile()`
- **Details**:
  - Window: `0.42 - 0.5·cos + 0.08·cos(2·)` (Blackman-Harris, L161)
  - FFT size: 8192 (constant)
  - Analysis window: 85ms or file length, whichever is shorter
  - Returns: `{ power: Float64Array, binCount, binSize, freqByteData }`

---

## FEATURE EXTRACTION — Band Energies, Tilt, Smoothness

### `buildLogBands(power, binSize, binCount)`
- **File**: `client/src/hooks/use-analyses.ts` (L188)
- **Does**: Creates 24-band log-frequency energy representation (80Hz–10kHz)
- **Calls**: nothing (pure math)
- **Called by**: `analyzeAudioFile()`
- **Details**:
  - 24 bands, logarithmically spaced from 80Hz to 10kHz
  - Each band: sum of power spectrum bins within frequency range
  - Output: `number[]` (24 values) — raw energy, NOT normalized

### `computeDisplayBands(power, binSize, binCount)`
- **File**: `client/src/hooks/use-analyses.ts` (L218)
- **Does**: Creates 8-band musical energy breakdown (subBass through fizz) plus legacy 3-band (low/mid/high)
- **Calls**: nothing (pure math)
- **Called by**: `analyzeAudioFile()`
- **Band ranges**:
  - subBass: 20–80Hz
  - bass: 80–200Hz
  - lowMid: 200–500Hz
  - mid: 500–1200Hz
  - highMid: 1200–4000Hz
  - presence: 4000–6000Hz
  - air: 6000–9000Hz
  - fizz: 9000–14000Hz
- **Output**: All values as **fraction of total energy** (0–1 range)
- Also computes legacy 3-band ratios (low 20-200, mid 200-4000, high 4000-14000)

### `computeSpectralCentroid(power, binSize, binCount)`
- **File**: `client/src/hooks/use-analyses.ts` (L276)
- **Does**: Frequency center-of-mass (Hz) — weighted mean of frequency bins
- **Calls**: nothing
- **Called by**: `analyzeAudioFile()`
- **Formula**: `Σ(freq × power) / Σ(power)` for bins up to 20kHz

### `computeSpectralTilt(power, binSize, binCount)`
- **File**: `client/src/hooks/use-analyses.ts` (L288)
- **Does**: Linear regression of dB magnitude vs log₂(frequency) over 200Hz–8kHz range
- **Calls**: nothing (inline linear regression)
- **Called by**: `analyzeAudioFile()`
- **Output**: dB/octave slope. Negative = dark/warm, positive = bright
- **Math**: `y = 10·log10(power)`, `x = log2(freq)`, standard OLS regression

### `computeRolloff(power, binSize, binCount, threshold=0.85)`
- **File**: `client/src/hooks/use-analyses.ts` (L326)
- **Does**: Finds frequency below which 85% of total energy resides
- **Calls**: nothing
- **Called by**: `analyzeAudioFile()`

### `computePerceptualSmoothness(logBandEnergies)`
- **File**: `client/src/hooks/use-analyses.ts` (L345)
- **Does**: High-resolution smoothness scoring via Gaussian-smoothed residual analysis
- **Calls**: nothing (self-contained)
- **Called by**: `analyzeAudioFile()`
- **Algorithm**:
  1. Convert 24-band energies to dB
  2. Apply Gaussian smoothing kernel (σ from 0.5 octave FWHM)
  3. Compute residuals (raw − smoothed) in 200Hz–8kHz range
  4. RMS of residuals → smoothScore (0–100, higher = smoother)
  5. Count notches (dips > 6dB) and track deepest notch
- **Output**: `{ smoothScore, maxNotchDepth, notchCount, residualRMS }`

### `computeTailLevel(channelData, sampleRate)`
- **File**: `client/src/hooks/use-analyses.ts` (L411)
- **Does**: Measures IR tail decay level and noise floor
- **Calls**: nothing
- **Called by**: `analyzeAudioFile()`
- **Details**:
  - For short IRs (<200ms): extrapolates noise floor from quarter-segmented RMS decay
  - For normal IRs: measures RMS at 120–200ms tail region relative to peak
  - Scans for quietest 15ms window in latter half for noise floor

### `normalizeVector(v)`
- **File**: `client/src/hooks/use-analyses.ts` (L211)
- **Does**: Normalizes array to sum to 1 (L1 normalization)
- **Called by**: `analyzeAudioFile()` (for logBandEnergies normalization)

---

## TONAL FEATURE MAPPING — Higher-Level Interpretation

### `computeTonalFeatures(r)`
- **File**: `client/src/lib/tonal-engine.ts` (L54)
- **Does**: Master converter — takes raw analysis results and produces standardized `TonalFeatures` object
- **Calls**: internal `normalizeBands()`, `bandsToShapeDb()`, tilt/centroid proxies
- **Called by**: Analyzer.tsx, Learner.tsx, Pairing.tsx (wherever IRs are rendered)
- **Key transforms**:
  - `normalizeBands()`: Handles variant field names, detects fraction vs. percent scale, normalizes to fractions
  - `bandsToShapeDb()`: Converts band fractions to dB-relative-to-mean shape (each band in dB relative to average band energy)
  - Computes `tiltDbPerOct` from band data if no direct tilt is available (proxy calculation)
  - Adds `smoothScore`, `spectralCentroidHz`, `fizzEnergy` from raw metrics if present

### `computeProxySmoothScoreFromShapeDb(shapeDb)`
- **File**: `client/src/lib/tonal-engine.ts` (L254)
- **Does**: Heuristic smoothness score for virtual blends (no FFT data available)
- **Calls**: nothing
- **Called by**: `computeTonalFeatures()` when `smoothScore` is not directly available
- **Algorithm**: Counts zig-zags and spikes in the 8-band shape; penalizes sharp transitions

---

## MUSICAL ROLE CLASSIFICATION

### `classifyMusicalRole(ir, speakerStats?)`
- **File**: `client/src/lib/musical-roles.ts` (L81)
- **Does**: Assigns one of 5 musical roles based on spectral features
- **Calls**: `computeSpeakerStats()` (for Z-score normalization), `applyContextBias()`
- **Called by**: Analyzer.tsx (for each loaded IR), Pairing.tsx
- **Roles**: Foundation, Cut Layer, Mid Thickener, Fizz Tamer, Dark Specialty
- **Logic**: Thresholds on spectral centroid, hi-mid/mid ratio, z-scores for presence/brightness relative to speaker average

### `applyContextBias(role, features, filename)`
- **File**: `client/src/lib/musical-roles.ts` (L212)
- **Does**: Adjusts role classification based on filename tokens (mic type, position)
- **Called by**: `classifyMusicalRole()`

### `computeSpeakerStats(irs)`
- **File**: `client/src/lib/musical-roles.ts` (L23)
- **Does**: Computes per-speaker mean and std for centroid, brightness, presence, air, fizz
- **Called by**: `classifyMusicalRole()`

### `classifyRole(ir)` (Server-side)
- **File**: `server/routes.ts` (L4999)
- **Does**: Simplified server-side role classification for pairing endpoint
- **Calls**: nothing (threshold-based on centroid + hmRatio)
- **Called by**: Pairing endpoint (EP6)

---

## IR COMPARISON — Distance & Similarity Metrics

### `buildPerceptualFeatureVector(m)`
- **File**: `client/src/pages/Analyzer.tsx` (L411)
- **Does**: Constructs a normalized feature vector from 24-band log energies, tilt, rolloff, residual RMS, notch depth/count
- **Calls**: nothing
- **Called by**: `calculateSimilarity()`, redundancy clustering

### `cosineSimilarity(a, b)`
- **File**: `client/src/pages/Analyzer.tsx` (L427)
- **Does**: Standard cosine similarity between two feature vectors
- **Calls**: nothing
- **Called by**: `calculateSimilarity()`, redundancy detection

### `calculateSimilarity(metrics1, metrics2)`
- **File**: `client/src/pages/Analyzer.tsx` (L439)
- **Does**: Combined similarity score: cosine of perceptual vectors + spectral centroid proximity
- **Calls**: `buildPerceptualFeatureVector()`, `cosineSimilarity()`
- **Called by**: Cull engine, redundancy detection, reference set comparison

### `tonalDistance(a, b)`
- **File**: `client/src/lib/preference-profiles.ts` (L1192)
- **Does**: Euclidean distance between tonal band vectors, with hi-mid/mid ratio penalty
- **Calls**: nothing
- **Called by**: `suggestPairings()`, taste map

### Redundancy Clustering (Union-Find)
- **File**: `client/src/pages/Analyzer.tsx` (L489)
- **Does**: Groups IRs with similarity > threshold (typically 0.985) using Union-Find
- **Calls**: `calculateSimilarity()`, `maxAbsDiff` check
- **Called by**: `cullIRs()`

---

## IR CULLING ENGINE

### `cullIRs(irs, targetCount, ...)`
- **File**: `client/src/pages/Analyzer.tsx` (L664)
- **Does**: Reduces IR collection by maximizing diversity and quality
- **Calls**: `calculateSimilarity()` (similarity matrix), redundancy clustering, proportional slot allocation
- **Called by**: Analyzer UI (cull button)
- **Algorithm**:
  1. Build similarity matrix (all pairs)
  2. Identify redundant clusters (Union-Find)
  3. Allocate slots per mic type/speaker proportionally
  4. For blended IRs: check if a solo shot covers the same tone (threshold 0.93)
  5. Within clusters: keep the highest-quality representative
  6. Prefer IRs with user feedback (ELO, solo ratings)

---

## SUPERBLEND ENGINE — Server-Side Scoring & Optimization

### `getEnergies(ir)` / `getLogBands(ir)`
- **File**: `server/routes.ts` (L5919/L5923)
- **Does**: Extract 6-band and 24-band energy data from IR objects
- **Called by**: Reoptimize endpoint setup

### `blendBands6(irs, ratios)`
- **File**: `server/routes.ts` (L5954)
- **Does**: Linear mix of 6-band energy data at given ratios
- **Calls**: nothing
- **Called by**: `scoreBlend6()`, `computeVec6()`

### `blendBands24(irs, ratios)`
- **File**: `server/routes.ts` (L5964)
- **Does**: Linear mix of 24-band log energy data at given ratios
- **Calls**: nothing
- **Called by**: `scoreBlend24()`, `computeVec24()`

### `bands24To8(logBands)`
- **File**: `server/routes.ts` (L5977)
- **Does**: Aggregates 24 log-bands into 8 musical bands by averaging within edge ranges
- **Calls**: nothing
- **Called by**: `computeVec24()`, `scoreBlend24()`
- **Edge indices**: `[0,2,4,7,10,14,18,21,24]`

### `toPercent(bands)`
- **File**: `server/routes.ts` (L5990)
- **Does**: Converts raw band energies to percentage distribution
- **Called by**: `computeVec6()`

### `regressionTilt(xs, ys)` (server)
- **File**: `server/routes.ts` (L5995)
- **Does**: OLS linear regression slope. Same algorithm as client-side `computeSpectralTilt` but on pre-computed band data.
- **Called by**: `computeTilt24()`, `computeTilt6()`

### `computeTilt24(bands)` / `computeTilt6(bands)` (server)
- **File**: `server/routes.ts` (L6011 / L6026)
- **Does**: Tilt from blended bands. 24-band version uses log-spaced centers 80–10kHz, 6-band uses fixed centers `[100, 175, 350, 1000, 2750, 6000]`
- **Calls**: `regressionTilt()`
- **Called by**: `scoreBlend24()` / `scoreBlend6()`, `computeVec24()` / `computeVec6()`

### `computeSmoothness24(bands)` / `computeSmoothness6(bands)` (server)
- **File**: `server/routes.ts` (L6042 / L6046)
- **Does**: Roughness = mean |dB[i]-dB[i-1]|, score = 100 − roughness×8. Clamped to [0,100].
- **Called by**: `scoreBlend24()` / `scoreBlend6()`, `computeVec24()` / `computeVec6()`
- **Note**: This is a simplified proxy vs the client-side Gaussian-smoothed version

### `computeVec6(irs, ratios)` / `computeVec24(irs, ratios)` (server)
- **File**: `server/routes.ts` (L6070 / L6133)
- **Does**: Computes a feature vector from a blended IR set for nudge-target comparison
- **Calls**: `blendBands6/24()`, `toPercent()`, `computeTilt6/24()`, `computeSmoothness6/24()`
- **Called by**: `computeBaselineVec()`, `scoreBlend6/24()`
- **Vec6 output**: `[6 band pcts, airPct, tilt, smoothness]` (9 dims)
- **Vec24 output**: `[8 dB-relative-to-mean bands, tilt/10, smoothness/100]` (10 dims)

### `computeBaselineVec(irs, ratios)` (server)
- **File**: `server/routes.ts` (L6054)
- **Does**: Computes the baseline feature vectors (both 6-band and 24-band) for the original AI blend before nudging
- **Calls**: `computeVec6()`, `computeVec24()`
- **Called by**: Reoptimize main loop

### `scoreBlend6(irs, ratios, baseVec6?)` (server)
- **File**: `server/routes.ts` (L6081)
- **Does**: Scores a 6-band blend. Smoothness bonus + dB-transition penalty + nudge alignment
- **Calls**: `blendBands6()`, `toPercent()`, `computeTilt6()`, `computeSmoothness6()`
- **Called by**: `scoreBlend()` (when 24-band data unavailable)
- **Scoring**: `score = smooth×0.01 − Σ|dBdiff|×0.005 − nudgePenalties`

### `scoreBlend24(irs, ratios, baseVec24?)` (server)
- **File**: `server/routes.ts` (L6148)
- **Does**: High-fidelity 24-band scoring with perceptual weighting
- **Calls**: `blendBands24()`, `bands24To8()`, `computeTilt24()`, `computeSmoothness24()`
- **Called by**: `scoreBlend()` (when all IRs have logBandEnergies)
- **Scoring**: `smoothBonus + perceptualScore + nudgeBonus`
  - Perceptual: `Σ|dB[i]-dB[i-1]| × PERCEPTUAL_WEIGHTS[i] × 0.01`
  - Nudge: distance from target × 3.0 penalty weight

### `scoreBlend(irs, ratios, baseVecs?)` (server)
- **File**: `server/routes.ts` (L6060)
- **Does**: Router — dispatches to `scoreBlend24` if all IRs have 24-band data, else `scoreBlend6`
- **Called by**: Optimizer loops

### `normalizeRatios(r)` / `clampRatios(ratios)` (server)
- **File**: `server/routes.ts` (L6198 / L6210)
- **Does**: Normalize to sum=1 / clamp within min/max per-IR fraction
- **Called by**: Optimizer loops

### `optimizeRatiosForIRs(irs, startRatios, optimIters)` (server)
- **File**: `server/routes.ts` (L6244)
- **Does**: Hill-climbing ratio optimizer for a fixed IR set
- **Calls**: `scoreBlend()`, `clampRatios()`, `normalizeRatios()`
- **Called by**: IR swap loop in reoptimize endpoint

### Reoptimize Main Loop
- **File**: `server/routes.ts` (L6219–6340)
- **Does**: Two-phase optimization:
  1. **Phase 1 — Ratio optimization** (L6226): Random walk, adjusting pairs of ratios, keeping improvements
  2. **Phase 2 — IR swap** (L6267): For each slot, tests replacing with every pool IR, re-optimizing ratios for each candidate
- **Called by**: EP8 endpoint handler
- **Output**: Best IRs, ratios, swaps list, band breakdown → polygon snap

---

## SUPERBLEND ENGINE — Client-Side Scoring & Optimization

### `blendMagnitudes(irBands, ratios)`
- **File**: `client/src/lib/blend-optimizer.ts` (L35)
- **Does**: Linear mix of 24-band log-magnitude arrays (same math as server `blendBands24`)
- **Called by**: `scoreBlendedCurve()`, `optimizeBlendRatios()`

### `regressionTiltFrom24Bands(bands)` (client)
- **File**: `client/src/lib/blend-optimizer.ts` (L51)
- **Does**: Same regression tilt as server `computeTilt24` — OLS on log₂(Hz) vs dB, 200–8kHz range
- **Called by**: `computeVec()`, `scoreBlendedCurve()`

### `computeSmoothnessFrom24Bands(bands)` (client)
- **File**: `client/src/lib/blend-optimizer.ts` (L75)
- **Does**: Same as server `computeSmoothness24` — mean |dB diff| → 100 − avg×8
- **Called by**: `computeVec()`, `scoreBlendedCurve()`

### `bandsTo8Band(logBands)` (client)
- **File**: `client/src/lib/blend-optimizer.ts` (L85)
- **Does**: Same aggregation as server `bands24To8` using BAND_KEYS mapping
- **Called by**: `computeVec()`
- **Edge indices**: `[0,2,4,7,10,14,18,21,24]`

### `computeVec(blended)` (client)
- **File**: `client/src/lib/blend-optimizer.ts` (L101)
- **Does**: Feature vector from 24-band blend: 8 dB-relative-to-mean bands + tilt/10 + smoothness/100
- **Calls**: `bandsTo8Band()`, `regressionTiltFrom24Bands()`, `computeSmoothnessFrom24Bands()`
- **Called by**: `scoreBlendedCurve()`

### `scoreBlendedCurve(blended, ctx, nudges?, baselineVec?)`
- **File**: `client/src/lib/blend-optimizer.ts` (L116)
- **Does**: Master scoring function. Combines taste bias + smoothness + perceptual roughness + nudge alignment
- **Calls**: `computeVec()`, `getTasteBias()`, `computeSmoothnessFrom24Bands()`, `expandLowEndNudge()`
- **Called by**: `optimizeBlendRatios()`
- **Scoring**: `bias + smoothBonus + perceptualScore + nudgeBonus`
  - `bias`: from linear taste model (learned user preferences)
  - `smoothBonus`: smoothness × 0.003
  - `perceptualScore`: weighted dB band-to-band transitions (PERCEPTUAL_WEIGHTS)
  - `nudgeBonus`: distance from nudge targets × penalty weight

### `optimizeBlendRatios(irLogBands, aiRatios, ctx, iterations=200, nudges?)`
- **File**: `client/src/lib/blend-optimizer.ts` (L175)
- **Does**: Stochastic hill-climbing optimizer for blend ratios
- **Calls**: `blendMagnitudes()`, `scoreBlendedCurve()`, `normalizeRatios()`, `snapToAchievable()`
- **Called by**: Learner.tsx SuperblendPanel
- **Algorithm**:
  1. Normalize AI ratios, compute baseline score
  2. For each iteration: randomly pick two active IRs, adjust ratios
  3. Evaluate candidate with `scoreBlendedCurve()`
  4. Keep if better (greedy hill-climb)
  5. Snap final ratios to polygon-achievable coordinates

---

## POLYGON MIXER — Geometry Constraint

### `snapToAchievable(ratios)`
- **File**: `client/src/lib/polygon-mixer.ts` (L153)
- **Does**: Snaps N-way blend ratios to achievable point inside regular polygon (3–8 sides)
- **Calls**: `findOptimalDot()`, `computeVertexRatios()`
- **Called by**: `optimizeBlendRatios()` (client), `polygonSnapRatios()` (server)
- **Algorithm**: Inverse Distance Weighting (IDW) → gradient descent to find 2D dot position that best represents target ratios

### `computeMixerPosition(ratios)`
- **File**: `client/src/lib/polygon-mixer.ts`
- **Does**: Computes 2D (x,y) position for a given ratio set within the polygon
- **Called by**: SVG polygon diagram rendering

### `computeVertexRatios(x, y, n)`
- **File**: `client/src/lib/polygon-mixer.ts`
- **Does**: Recovers ratios from a 2D point inside an N-gon using IDW
- **Called by**: `snapToAchievable()`

---

## TASTE & PREFERENCE SYSTEM

### `getTasteBias(ctx, featureVec)`
- **File**: `client/src/lib/tasteStore.ts` (L286)
- **Does**: Linear model: dot product of learned weight vector × feature vector
- **Calls**: reads localStorage weights
- **Called by**: `scoreBlendedCurve()` (client optimizer)

### `featurizeSuperblendBands(bandBreakdown)`
- **File**: `client/src/lib/tasteStore.ts` (L266)
- **Does**: Converts 6-band breakdown + tilt + smoothness into 8D feature vector for taste model
- **Called by**: Superblend learning signals

### `suggestPairings(irs, profiles, learnedProfile?)`
- **File**: `client/src/lib/preference-profiles.ts` (L626)
- **Does**: Generates IR pair recommendations by simulating blends at multiple ratios
- **Calls**: `scoreBlendQuality()`, `scoreBlendWithAvoidPenalty()`, `tonalDistance()`, role inference
- **Called by**: Learner.tsx, Pairing.tsx

### `scoreBlendQuality(features, profiles)`
- **File**: `client/src/lib/preference-profiles.ts` (L285)
- **Does**: Evaluates blend quality against multiple preference profiles
- **Called by**: `suggestPairings()`, blend preview panels

### `findBestPairWithOptimalRatio(irs, targetBands)`
- **File**: `client/src/lib/ir-count-advisor.ts` (L290)
- **Does**: Exhaustive search over all IR pairs × ratio grid to find closest match to target tone
- **Called by**: Superblend vs 2-IR comparison feature

---

## SERVER-SIDE QUALITY SCORING

### `scoreSingleIR(input)`
- **File**: `server/routes.ts` (L1138 approx)
- **Does**: Comprehensive quality assessment combining spectral metrics + AI analysis
- **Calls**: `parseFilenameForExpectations()`, `getExpectedCentroidRange()`, `calculateCentroidDeviation()`, `getMicRelativeSmoothnessAdjustment()`, `openai.chat.completions.create()`
- **Called by**: EP4 (single analysis), EP5 (batch analysis)
- **Scoring components**:
  - Centroid deviation from expected range for mic+position
  - Smoothness relative to mic type baseline
  - Noise floor assessment
  - Tail decay quality
  - AI-generated quality score (0-100) + highlights + advice

### Pairing Scoring Functions (server)

### `computeComplementarity(a, b)`
- **File**: `server/routes.ts` (L5115)
- **Does**: Scores how well two IRs complement each other tonally
- **Metrics**: centroid spread, brightness diversity, 6-band gap coverage
- **Called by**: Pairing endpoint

### `getRoleCompat(r1, r2)`
- **File**: `server/routes.ts` (L5031)
- **Does**: Lookup compatibility score for role pairs (e.g., Foundation+Cut Layer = 95)
- **Called by**: Pairing endpoint

### `computePreferenceAlignment(a, b)`
- **File**: `server/routes.ts` (L5189)
- **Does**: Scores blend against learned user preferences
- **Called by**: Pairing endpoint

### `computeLearnerBonus(a, b)`
- **File**: `server/routes.ts` (L5228)
- **Does**: Adds bonus based on ELO ratings and win/loss records from learner insights
- **Called by**: Pairing endpoint

---

## OUTPUT — Result Generation

### Analysis Results
- Server stores via `storage.createAnalysis()` → PostgreSQL
- Client displays via `TonalDashboard`, `ResultCard`, frequency response charts (Recharts)

### Superblend Results
- Server returns `{ layers[], bandBreakdown, swaps[], tilt, smoothness }` after polygon snapping
- Client applies `optimizeBlendRatios()` for final refinement
- Results saved to localStorage as favorites, backed up to server

### Pairing Results
- Server returns ranked pairs with AI-generated rationales
- Client renders in Pairing.tsx with band charts and voting UI

---

## DUPLICATE IMPLEMENTATIONS NOTED (for future audit)

| Function | Client Location | Server Location | Notes |
|---|---|---|---|
| Tilt regression | `blend-optimizer.ts:51` | `routes.ts:5995` | Identical algorithm |
| Smoothness (proxy) | `blend-optimizer.ts:75` | `routes.ts:6042` | Identical algorithm |
| 24→8 band aggregation | `blend-optimizer.ts:85` | `routes.ts:5977` | Same edge indices |
| Feature vector (10D) | `blend-optimizer.ts:101` | `routes.ts:6133` | Same structure |
| Perceptual weights | `blend-optimizer.ts:5` | `routes.ts:5911` | Identical array |
| Blend linear mix | `blend-optimizer.ts:35` | `routes.ts:5964` | Same math |
| Ratio normalization | `blend-optimizer.ts:163` | `routes.ts:6198` | Same logic |
