# DEBUG_REFERENCE v27 — Tone Architect / IR.Scope

## File Map

### Engine Layer (`client/src/lib/`)

| File | Lines | Purpose |
|---|---|---|
| `tonal-engine.ts` | 553 | Band math, TonalFeatures struct, blending, scoring, redundancy |
| `musical-roles.ts` | 476 | Role classification, intent prefs, role softening, foundation finder, badge colors |
| `preference-profiles.ts` | 1640 | Profiles (Featured/Body), suggestPairings, taste-check candidates, gear parsing, A/B logic, learned adjustments |
| `tasteStore.ts` | 496 | localStorage taste state, featurize, vote recording, win records, complement boost |
| `queryClient.ts` | ~30 | TanStack Query default fetcher + apiRequest helper |
| `utils.ts` | ~10 | cn() classname merge |

### Pages (`client/src/pages/`)

| Page | Lines | Purpose |
|---|---|---|
| `IRMixer.tsx` | 4483 | Blend preview, individual IR eval, taste learning, pairing suggestions, Learner quad-pick, Foundation Finder, Gap Finder, tonal insights, TSV export |
| `Analyzer.tsx` | 6925 | Single/batch IR upload + analysis, AI quality assessment, spectral centroid scoring, batch TSV export |
| `Pairing.tsx` | 668 | Server-side IR pairing analysis (mic A + mic B + AI) |
| `CherryPicker.tsx` | 698 | Match user audio preference across new IR collections |
| `Recommendations.tsx` | — | AI-generated recording recommendations |
| `AmpDesigner.tsx` | — | Amp/pedal mod → Fractal parameter translation |
| `AmpDialIn.tsx` | — | Starting settings per Fractal amp model |
| `AmpAndDriveDialer.tsx` | — | Combined amp/drive dialer |
| `FractalSettings.tsx` | — | Fractal settings reference |
| `MikingGuide.tsx` | — | Curated close-miking reference |
| `History.tsx` | — | Past analyses from DB |
| `ReferenceManual.tsx` | — | Knowledge base reference |

### Components (`client/src/components/`)

| Component | Purpose |
|---|---|
| `MusicalRoleBadge.tsx` | Role badge display + `MusicalRoleBadgeFromFeatures` (runs classifyIR inline) |
| `ShotIntentBadge.tsx` | Featured/Body/Neutral shot intent badge |
| `FrequencyGraph.tsx` | Recharts frequency response visualization |
| `TonalDashboard.tsx` | 6-band breakdown + tilt/centroid/smoothness readouts |
| `ResultCard.tsx` | Analysis result display card |
| `SummaryCopyButton.tsx` | Copy analysis summary to clipboard |
| `Navigation.tsx` | Top nav / sidebar |

### Server (`server/`)

| File | Purpose |
|---|---|
| `routes.ts` | All API endpoints (analysis, recommendations, pairing, prefs, amp designer, dial-in) |
| `storage.ts` | `IStorage` interface + `DatabaseStorage` (analyses, preferences, tonal profiles, custom mods) |
| `db.ts` | Drizzle + Neon Postgres connection |
| `static.ts` | Static asset serving |
| `vite.ts` | Vite dev server integration (DO NOT EDIT) |

### Shared (`shared/`)

| File | Purpose |
|---|---|
| `schema.ts` | Drizzle tables: analyses, preferenceSignals, tonalProfiles, customMods |
| `routes.ts` | Zod request/response schemas for all API endpoints |
| `knowledge/spectral-centroid.ts` | Mic/position/speaker centroid ranges, deviation scoring, smoothness baselines |
| `knowledge/ir-recipes.ts` | Curated mic/speaker recording recipes |
| `knowledge/amp-designer.ts` | 326 Fractal amp models, 15 drive models, 15 mods, Expert parameters |
| `knowledge/amp-dial-in.ts` | Amp family defaults, model overrides, control layouts, dial-in presets |
| `knowledge/fractal-settings.ts` | Fractal settings reference data |

---

## Core Data Types

### TonalFeatures (`tonal-engine.ts:13`)
```
{
  bandsRaw: TonalBands        // absolute dB per band
  bandsPercent: TonalBands    // normalized 0–1 per band
  bandsShapeDb: TonalBands    // relative shape in dB

  tiltDbPerOct: number        // spectral tilt (negative = darker)
  smoothScore?: number        // 0–100, higher = smoother
  spectralCentroidHz?: number // frequency center of mass
  notchCount?: number
  maxNotchDepth?: number
  rolloffFreq?: number        // high-frequency rolloff Hz
  fizzEnergy?: number         // 0–1 (or raw if >1.2, auto-scaled)
  tailLevelDb?: number
  tailStatus?: string
}
```

### BandKey / TonalBands
```
BandKey = "subBass" | "bass" | "lowMid" | "mid" | "highMid" | "presence" | "air" | "fizz"
TonalBands = Record<BandKey, number>
```

### MusicalRole (`musical-roles.ts:8`)
```
"Foundation" | "Cut Layer" | "Mid Thickener" | "Fizz Tamer" | "Lead Polish" | "Dark Specialty"
```

### Intent (`musical-roles.ts:293`)
```
"rhythm" | "lead" | "clean"
```

### SpeakerStats (`musical-roles.ts:3`)
```
{
  mean: { centroid, tilt, ext, presence, hiMidMid, air, fizz }
  std:  { centroid, tilt, ext, presence, hiMidMid, air, fizz }
}
```

### PreferenceProfile (`preference-profiles.ts:29`)
```
{ name: string, targetBands: TonalBands, weights: TonalBands }
```
Default profiles: `FEATURED_PROFILE`, `BODY_PROFILE`

### LearnedProfileData (`preference-profiles.ts:475`)
```
{
  adjustments: ProfileAdjustment[]
  avoidZones: { band, threshold, direction }[]
  gearInsights: GearInsights
  ratioPreference?: RatioPreference
  textNudges?: ...
  preferenceCorrections?: ...
}
```

### IRWinRecord (`musical-roles.ts:356`)
```
{ wins: number, losses: number, bothCount: number }
```

### TasteContext (`tasteStore.ts:9`)
```
{ mode: "singleIR" | "blend", intent: "rhythm" | "lead" | "clean" }
```

---

## Classification Pipeline

### Full Role Classification: `classifyIR()`
**File:** `musical-roles.ts:288`
**Pipeline:** `classifyMusicalRole(tf, speakerStats)` → `applyContextBias(baseRole, tf, filename, speakerStats)`

This is the canonical classifier. All UI badges and scoring must use this, NOT raw `classifyMusicalRole()`.

### Step 1: `classifyMusicalRole(tf, speakerStats)` (line 78)
Deterministic rule cascade using absolute band percentages AND speaker-relative z-scores:

1. **Foundation** (balanced): mid 22–35%, presence 18–42%, highMid 18–45%, cutCoreRatio 1.10–2.40, air ≤6%, fizz ≤1.5%, tilt -5.5 to -1.0, ext ≥4200 (or z≥-0.2)
2. **Foundation** (speaker-relative): |zCentroid| ≤0.8, (|zTilt| ≤1.2 or |zExt| ≤0.8), smooth ≥84, fizz ≤2.0 or zFizz ≤0.4
3. **Dark Specialty**: ext <2900 or tilt ≤-8.0 (absolute), OR zExt ≤-1.1 or (zTilt ≤-1.2 AND zCentroid ≤-0.6)
4. **Lead Polish**: ext ≥4600 (or z≥0.6), smooth ≥88, air ≥4% or zAir ≥0.70, fizz ≤1.2, presence 22–55%, core ≥22%, cutCoreRatio ≤3.4
5. **Cut Layer**: presence ≥50% or cutCoreRatio ≥3.0 or zPresence ≥1.15 or zCentroid ≥1.15, AND core ≤24%
6. **Mid Thickener**: mid ≥34% or lowMid ≥10% or bassLowMid ≥24%, AND presence ≤36% and zPresence ≤0.35
7. **Foundation** (near-voice fallback): |zCentroid| ≤0.9, |zExt| ≤1.0, |zTilt| ≤1.3, smooth ≥84
8. **Fizz Tamer**: dark relative + smooth ≥82 + low fizz + low air + zPresence ≤-0.5
9. **Late fallbacks**: Cut Layer (relaxed core ≤28), Mid Thickener (no presence gate), Fizz Tamer (relaxed), then Foundation

### Step 2: `applyContextBias(baseRole, tf, filename, speakerStats)` (line 200)
Filename-based score adjustments on top of base role:

- `"presence"` → +0.8 Cut Layer
- `"capedge_br"` → +0.4 Cut Layer
- `"cone_tr"` / `"cap_cone_tr"` → +0.4 Fizz Tamer
- `"cone_"` → +0.3 Mid Thickener
- `"_thick_"` → +0.5 Mid Thickener
- `"_balanced_"` → +0.4 Foundation
- `"_r121_"` → +0.4 Mid Thickener
- `"_roswell_"` → +0.7 Dark Specialty
- `"_md441_"` → +0.4 Cut Layer
- `"_pr30_"` → +0.35 Foundation
- etc.

Also: Fizz Tamer override to Cut Layer if `"presence"` in name AND presence ≥28% AND not clearly dark. Objective cut detection via z-scores overrides Foundation to Cut Layer.

Base role gets +3.0 head start, highest score wins.

### Speaker Normalization: `computeSpeakerStats()` (line 23)
Groups IRs by speaker ID (prefix before first `_`), computes mean/std for centroid, tilt, ext, presence%, hiMid/mid ratio, air%, fizz% across each speaker group.

### Foundation Guarantee: `findFoundationCandidates()` (line 391)
Per speaker, if no IR has Foundation role, the most "center" IR (lowest deviation score) is promoted to Foundation. Deviation = |zCentroid| + |zTilt| + |zExt| + smoothness penalty + presence penalty + role bias.

---

## Intent System

### INTENT_ROLE_PREFERENCES (`musical-roles.ts:295`)

| Intent | Preferred Pairs (scored 3.0→1.4) | Good Roles (+1 each) | Avoid Roles (-2 each) |
|---|---|---|---|
| **rhythm** | Foundation+Mid Thickener, Foundation+Fizz Tamer, Foundation+Foundation, Mid Thickener+Fizz Tamer, Foundation+Dark Specialty | Foundation, Mid Thickener, Fizz Tamer | Lead Polish |
| **lead** | Foundation+Cut Layer, Foundation+Lead Polish, Cut Layer+Lead Polish, Cut Layer+Mid Thickener, Foundation+Foundation | Cut Layer, Lead Polish, Foundation | Dark Specialty, Fizz Tamer |
| **clean** | Foundation+Lead Polish, Foundation+Foundation, Lead Polish+Lead Polish, Foundation+Cut Layer, Lead Polish+Mid Thickener | Foundation, Lead Polish | Dark Specialty |

### `scoreRolePairForIntent(roleA, roleB, intent)` (line 331)
- Sorts pair alphabetically, matches against preferred list
- Preferred match: 3.0 − index × 0.4 (so 1st = 3.0, 2nd = 2.6, 3rd = 2.2, 4th = 1.8, 5th = 1.4)
- No match: sum of good (+1 each) and avoid (-2 each) for both roles

### Role Softening: `softenRolesFromLearning()` (line 362)
Uses IRWinRecord per filename:
- net = wins + bothCount×0.5 − losses
- If net ≥4 AND winRate ≥0.6 → promote to Foundation
- If net ≥2 AND winRate ≥0.5 AND current role not in good list for intent → shift to first good role

---

## Taste / Learning System

### State Shape (`tasteStore.ts`)
localStorage key: `taste_v2`

Per TasteContext (keyed by `mode:intent`):
- `votes[]`: array of `{ vec: number[], win: boolean, source }` — feature vectors of winning/losing blends
- `irVotes[]`: per-IR outcomes `{ filename, win, source }`

### Featurization
- **Blend** (`featurizeBlend`): 19-dim vector = 8 band pcts (base) + 8 band pcts (feature) + baseRatio + tilt + smoothScore
- **Single IR** (`featurizeSingleIR`): 10-dim vector = 8 band pcts + tilt + smoothScore

### Taste Bias (`getTasteBias`)
Computes mean of winning vectors, centers query vector, returns dot-product bias + confidence (0–1 based on vote count, saturates at 20 votes).

### Vote Sources
- `"learning"` — love/like/meh/nope quad-pick mode
- `"pick4"` — A/B taste check rounds
- `"ab"` — A/B comparison mode
- `"ratio"` — ratio refinement mode

### Win Records (`getIRWinRecords`)
Aggregates per-filename wins/losses/bothCount from `irVotes[]` array for the given TasteContext.

---

## Pairing Suggestion Pipeline

### `suggestPairings()` (`preference-profiles.ts:587`)
**Signature:**
```
suggestPairings(
  irs: { filename, features }[],
  profiles = DEFAULT_PROFILES,
  count = 3,
  learned?: LearnedProfileData,
  excludePairs?: Set<string>,
  exposureCounts?: Map<string, number>,
  intent?: "rhythm" | "lead" | "clean",
  irWinRecords?: Record<string, IRWinRecord>
): SuggestedPairing[]
```

**Pipeline:**
1. Build ratio grid from learned ratio preference (if confidence ≥0.3)
2. Compute speaker stats → classify all IRs via `classifyIR()`
3. Run `findFoundationCandidates()` to guarantee Foundation per speaker
4. If irWinRecords + intent: run `softenRolesFromLearning()`
5. For each ordered pair (i, j):
   a. Try each ratio, blend features, score against profiles (with avoid penalty if learned)
   b. Keep best ratio/score combo
   c. Compute novelty boost from exposure counts (0–15 points)
   d. Compute shot-intent alignment boost from filename parsing (+5 / -3)
   e. Compute role-pair bonus via `scoreRolePairForIntent()` (0–3 points)
   f. Total score = blendScore + noveltyBoost + intentAlignBoost + roleBonus
6. Sort descending, deduplicate mirrored pairs, return top N

### Quad-Pick (Learner) Logic
Located in `pickTasteCheckCandidates()` (line 1054) and `pickSpreadCandidates()` (line 1348).

Console log tag: `[INTENT-PICK quad]`
Logs show: intent, combo count, top 8 ranked pairs with roles and role bonus, final 4 selected.

---

## Role Badge Colors

| Role | Badge Class |
|---|---|
| Foundation | `bg-emerald-500/15 text-emerald-400` |
| Cut Layer | `bg-cyan-500/15 text-cyan-400` |
| Mid Thickener | `bg-amber-500/15 text-amber-400` |
| Fizz Tamer | `bg-sky-500/15 text-sky-400` |
| Lead Polish | `bg-violet-500/15 text-violet-400` |
| Dark Specialty | `bg-zinc-500/15 text-zinc-300` |

**Badge Component:** `MusicalRoleBadge.tsx`
- `<MusicalRoleBadge role={role} />` — static role string
- `<MusicalRoleBadgeFromFeatures filename={fn} features={tf} speakerStatsMap={map} />` — computes role via `classifyIR()` inline

---

## API Routes

### Analysis
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/analyses` | Create single IR analysis (AI-powered) |
| GET | `/api/analyses` | List all past analyses |
| POST | `/api/batch-analysis` | Batch IR analysis |

### Recommendations
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/recommendations` | AI mic/position/distance recommendations |
| POST | `/api/recommendations/by-speaker` | Speaker-specific recommendations |
| POST | `/api/recommendations/by-amp` | Amp-based speaker suggestions |

### Pairing
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/pairing` | AI-powered IR pairing analysis |

### Position Import
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/position-import` | Refine position import list |

### Preferences & Learning
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/preferences` | Submit preference signal |
| GET | `/api/preferences` | List all preference signals |
| DELETE | `/api/preferences/clear-speaker` | Clear per-speaker prefs |
| GET | `/api/preferences/learned` | Get learned profile |
| POST | `/api/preferences/correct` | Submit preference correction |
| POST | `/api/preferences/tone-request` | "Find Me This Tone" AI query |
| POST | `/api/preferences/test-ai` | Test AI tonal understanding |

### Tonal Profiles
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/tonal-profiles` | List saved tonal profiles |
| POST | `/api/tonal-profiles/design` | AI shot designer |
| POST | `/api/tonal-profiles/gap-finder` | AI gap finder |

### Amp Designer / Dial-In
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/amp-designer` | Mod → Fractal parameter translation |
| POST | `/api/amp-dial-in` | AI dial-in advisor |
| GET | `/api/custom-mods` | List custom mods |
| POST | `/api/custom-mods` | Create custom mod |
| DELETE | `/api/custom-mods/:id` | Delete custom mod |

### Utility
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/clear-cache` | Clear all server caches |

---

## Database Schema

### analyses
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| filename | text | IR filename |
| micType | text | nullable |
| micPosition | text | nullable |
| micDistance | text | nullable |
| speakerModel | text | nullable |
| audioMetrics | jsonb | Raw frequency/peak/centroid data |
| aiAnalysis | text | Full AI response text |
| qualityScore | integer | 0–100 |
| createdAt | timestamp | default now() |

### preferenceSignals
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| filename | text | |
| speaker | text | nullable |
| sentiment | text | love/like/meh/nope |
| tonalBands | jsonb | 6-band snapshot |
| gearInfo | jsonb | mic/position/distance |
| context | text | nullable |
| createdAt | timestamp | |

### tonalProfiles
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| name | text | |
| profileType | text | |
| targetBands | jsonb | |
| metadata | jsonb | nullable |
| createdAt | timestamp | |

### customMods
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| name | text | |
| description | text | |
| parameters | jsonb | |
| createdAt | timestamp | |

---

## Console Log Tags for Debugging

| Tag | Location | What it shows |
|---|---|---|
| `[INTENT-PICK quad]` | `preference-profiles.ts:1174` | Intent, combo count, top 8 ranked pairs with roles and role bonuses, final 4 selected |
| `[Cache]` | `server/routes.ts` | Server-side cache clears |

---

## Key Design Decisions

1. **Classification uses full pipeline**: `classifyIR()` = `classifyMusicalRole()` + `applyContextBias()`. Never call `classifyMusicalRole()` alone for UI display.

2. **Speaker normalization**: All z-score thresholds assume speaker-grouped stats. Without speaker stats, absolute thresholds apply (less accurate for mixed collections).

3. **Foundation guarantee**: `findFoundationCandidates()` ensures every speaker group has at least one Foundation IR, promoting the most neutral candidate if none exists.

4. **Role softening is intent-aware**: `softenRolesFromLearning()` only softens toward roles in the current intent's `good` list, not blindly.

5. **suggestPairings score components**: blendScore (profile match, 0–100) + noveltyBoost (0–15) + intentAlignBoost (-3 to +5) + roleBonus (0–3). Role bonus is the newest addition.

6. **Taste learning is per-context**: TasteContext = mode × intent. Switching intent gives you a separate vote history and separate win records.

7. **TSV exports**: Analyzer batch export and single-analysis export both use `buildSummaryTSVForRow()` → `tsvHeader` column scheme.

8. **Learned adjustments flow**: Server `/api/preferences/learned` → client `learnedProfile` → passed to `suggestPairings()`, `scoreBlendWithAvoidPenalty()`, `scoreWithAvoidPenalty()`.

9. **Client-side only**: Role classification, tonal features, blending, taste learning, and pairing suggestions all run in the browser. Server handles AI calls, DB persistence, and knowledge base lookups.

10. **Deterministic scoring**: Spectral centroid scoring uses `spectral-centroid.ts` knowledge base of mic/position/speaker expected ranges, independent of AI.
