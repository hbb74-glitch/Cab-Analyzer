# IR.Scope - Guitar Cabinet Impulse Response Analyzer

## Overview
IR.Scope is a web application for analyzing guitar cabinet impulse responses (IRs). It enables users to upload WAV IR files, input microphone setup details, and receive AI-powered quality assessments and actionable advice. The application aims to help guitarists and producers evaluate and improve their IR recordings by providing insights into microphone placement, speaker characteristics, and genre-specific tonal considerations. Its goal is to be a primary resource for optimizing guitar tones through intelligent IR analysis and recommendations.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript and Vite.
- **UI/UX**: shadcn/ui (Radix UI) and Tailwind CSS with CSS variables, dark mode by default.
- **Audio Processing**: Client-side analysis using Web Audio API for frequency, peak detection, and spectral centroid.
- **Visualization**: Recharts for frequency response graphs.
- **Interactivity**: Framer Motion for animations, react-dropzone for file uploads.

### Backend
- **Technology**: Node.js with Express 5, written in TypeScript.
- **API**: RESTful API with Zod for input validation.

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM.
- **Schema**: `analyses` table stores IR filenames, mic configurations, audio metrics, AI feedback, quality scores, and timestamps. `taste_backups` table stores server-side backups of client taste data (Elo ratings, solo evaluations, blend preferences) for persistence across deployments.
- **Taste Persistence**: Client-side taste data auto-backs up to server after each vote (10s debounce). On page load, if localStorage is empty, automatically restores from server backup. Manual backup/restore buttons available in Learner UI.

### AI Integration
- **Provider**: OpenAI API for advanced analysis.
- **Functionality**: Generates quality scores, classifies IRs, and provides actionable advice based on audio metrics and mic setup. Offers AI-generated optimal mic/position/distance combinations and suggests speaker pairings based on amplifier descriptions and genre. Learns and injects user gear preferences into prompts.
- **Preference Learning**: Learns mic/position/distance preferences from user feedback and favorite IRs. Includes a "Cherry Picker" module for matching audio preferences in new collections.
- **Deterministic Scoring**: Spectral centroid scoring uses a knowledge base of expected ranges per mic/position/speaker.
- **Modular Features**: Supports single/batch IR analysis, recommendations (speaker/amp/import list), and IR pairing (single/mixed speaker).
- **Comprehensive Knowledge Base**: Includes a database of microphones, speakers, mic positions, distances, and genre-specific recording techniques.
- **Genre-Specific Guidance**: Provides tonal goals and "avoid" rules for predefined genres.
- **Miking Guide**: Curated reference of close-miking techniques.
- **IR Culling**: Batch tool to reduce IR collections by maximizing variety and quality using spectral similarity analysis. Features Blend Redundancy Detection and Technique-Aware Blend Culling. Role-Balance-Aware Culling helps protect scarce mic roles.
- **Learner** (`Learner.tsx`): Client-side taste learning module for previewing blend permutations with configurable ratios, 6-band breakdown, HiMid/Mid ratio display, and tilt/centroid/smoothness readouts. Features Individual IR evaluation mode (separate from blend context) with role suggestions and profile matching. Uses canonical `computeTonalFeatures`/`blendFeatures` pipeline from `tonal-engine.ts`. Find Tone panel sends real computed centroid, smoothness, and tilt to AI (not hardcoded zeros). Foundation Candidate selection uses shared `pickFoundationCandidates()` utility from `musical-roles.ts`.
- **Preference Profiles**: Uses "Featured" and "Body" tonal profiles with sentiment-based feedback (`Love/Like/Meh/Nope`) to adjust profile targets.
- **Gear Insights**: Computes net sentiment and average tonal band values for individual gear pieces and combinations.
- **Shot Intent System**: Classifies mic/position roles (e.g., "feature-intended" or "body-intended") based on a knowledge base, applying confidence-scaled bonuses to classification and pairing suggestions.
- **Collection Designer** (`shared/knowledge/mic-role-map.ts`): AI-powered collection planner with hardcoded mic-role knowledge base (40+ mic/position rules). Maps each mic+position combo to a predicted musical role (Foundation, Cut Layer, Mid Thickener, Fizz Tamer, Lead Polish, Dark Specialty) and intent suitability (rhythm/lead/clean). Supports intent-based planning with per-context shot counts and automatic role budget computation. `ShotIntentBadge` component displays predicted roles from the knowledge base with consistent color coding. Server route cross-references knowledge base with learned tonal profiles for grounded AI prompting. **Solo-First Learning Philosophy**: Solo IR evaluations are the strongest teaching signal — they provide clean, unambiguous tonal preference data without blend noise. Solo-proven IRs are treated as safe foundation choices that blend well with almost anything. The system prioritizes solo data over blend data (65/35 weighting in insight ranking). **Validated Insights Feedback Loop**: Solo IR ratings, A/B win records, and Elo blend ratings from Learner/Pairing modules feed back into Shot Designer via `getValidatedShotInsights()` in `tasteStore.ts`. Aggregates learner data by mic/position/distance, computes solo and blend scores, identifies top blend partners. Shot Designer prompt separates insights into SOLO-PROVEN (highest priority), BLEND-PROVEN, and DEMOTED tiers. A dedicated "Tonal Fingerprints of Solo-Loved IRs" section cross-references solo-loved shots with actual tonal profile data so the AI can study the user's preferred frequency balance, tilt, and rolloff. Pairing system gives enhanced bonuses for solo-loved IRs (+10 per IR, +5 when both are solo-proven).
- **Proven Shots Leaderboard**: Live-updated panel in Shot Designer showing mic/position combos consistently rated well in solo eval. Aggregates love/like counts, tracks which speakers each combo has been proven on, highlights cross-speaker patterns, and shows avoided combos. Data sourced from server-side `standaloneRecipes` via `/api/tonal-profiles/proven-shots` endpoint.
- **Foundation Finder**: Ranks IRs by Body score to identify best base IRs.
- **IR Pairing** (`Pairing.tsx`): Role-aware, intent-driven, psychoacoustically informed IR blend analyzer. Supports single-speaker and mixed-speaker modes. Uses 6-band spectral analysis, KB role predictions, learned tonal profiles, and psychoacoustic descriptors. Intent selector (Rhythm/Lead/Clean/Versatile) optimizes role pairing guidelines. Mixed speaker mode determines optimal per-speaker role assignments (e.g., Speaker 1 = Foundation, Speaker 2 = Cut Layer). Copy list includes roles, intent fit, psychoacoustic summaries, and speaker role analysis.
- **Iterative Suggested Pairings**: Multi-round refinement system for blend suggestions with sentiment ratings.
- **Novelty-Aware Suggestions**: Boosts scores for under-exposed or new IRs.
- **Complementary Pairing Suggestions**: Identifies tonally compensating IRs.
- **Tonal Feedback Tags**: Contextual quick-tag system for pairing ratings, mapping to band-specific nudges for the learning algorithm.
- **Free-Form Text Feedback**: AI-interpreted text nudges from user comments produce structured 6-band nudges, learn user vocabulary, and are integrated into AI prompts.
- **Tonal Insights Panel**: Displays a human-readable summary of learned tonal preferences, including likes, avoid zones, gear tendencies, and tonal balance. Features refresh button and "recent only" filter (Last 50/100/200 ratings) to view evolving taste. Ratio reporting suppressed unless sufficient dedicated ratio refinement data exists; falls back to median-based dark/bright tonal balance analysis.
- **Preference Corrections**: User input to correct learned preferences, immediately steering the learned profile.
- **Tone Request / Find Me This Tone**: Users describe a desired tone, and the system suggests IR blend combinations using AI, incorporating learned preferences.
- **Test AI**: Diagnostic tool for users to query the AI about loaded IRs, verifying its tonal understanding. Supports blend queries — asking about IR combinations, pairings, or mixes triggers blend analysis mode with specific IR pair suggestions, ratios, per-IR role descriptions, and expected blended band values.
- **Tonal Intelligence System**: Stores running averages of 6-band tonal data, ratio, centroid, and smoothness, keyed by mic+position+distance+speaker.
- **Shot Designer**: Uses learned tonal profiles to design shot lists.
- **Gap Finder**: Analyzes loaded IRs to identify tonal gaps, flag redundancies, and suggest new shots.
- **Reference Set Comparison**: Client-side feature to compare new IR batches against a saved "reference palette" for flavor coverage.
- **A/B Taste Check**: Progressive multi-round taste profiling to learn preferred tonal axes, starting with broad comparisons and narrowing down. Confidence-adaptive based on learned profile status.
- **A/B Ratio Refinement**: Phase for learning preferred blend ratios through side-by-side band chart previews at different ratios.
- **Amp Designer / Mod Lab**: Translates real-world amp and pedal circuit mods (Jose Arredondo, Snorkler, Cameron, diode swaps, op-amp mods, etc.) into Fractal Audio Axe-FX/FM3 Expert parameters. Knowledge base covers 326 amp models, 15 drive/fuzz models, 15 known mods, and 20+ Expert parameter definitions. AI generates parameter recipes with rationale, starting points, interaction notes, and alternatives.
- **Amp Dial-In Guide**: Starting settings for every Fractal Audio amp model (326 models). Provides curated dial-in presets organized by amp family (Fender Tweed, Blackface, Vox AC, Marshall Plexi/JCM800, Mesa Recto/Mark, Peavey 5150, Dumble, etc.) with per-model overrides for popular amps. Features SVG knob visualizations, multiple style presets per family, tips, and "what to listen for" guidance. AI-powered advisor generates personalized settings using Fractal Wiki, Yek's Guide, and forum knowledge. Enhanced artist-to-drive knowledge base (80+ entries) sourced from Equipboard, Premier Guitar Rig Rundowns, and Guitar Geek rig diagrams — includes specific pedal settings, signal chains, amp pairings, and historical context for each artist. Amp-artist association map links Fractal amp model families to documented users (e.g., SRV→Vibroverb, Gilmour→Hiwatt, Edge→AC30, Jones→VH4+Recto).

## External Dependencies
- **Database**: PostgreSQL
- **AI Services**: OpenAI API
- **NPM Packages**:
    - `drizzle-orm`
    - `drizzle-kit`
    - `@tanstack/react-query`
    - `recharts`
    - `framer-motion`
    - `react-dropzone`
    - `zod`
    - `express`