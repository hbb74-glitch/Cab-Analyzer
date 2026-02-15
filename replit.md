# IR.Scope - Guitar Cabinet Impulse Response Analyzer

## Overview

IR.Scope is a web application designed to analyze guitar cabinet impulse responses (IRs). It allows users to upload WAV files of IRs, input microphone setup details, and receive AI-powered quality assessments and actionable advice. The application aims to provide a comprehensive tool for guitarists and producers to evaluate and improve their IR recordings, offering insights into microphone placement, speaker characteristics, and genre-specific tonal considerations. The project's ambition is to become a go-to resource for optimizing guitar tones through intelligent IR analysis and recommendations.

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
- **Schema**: `analyses` table stores IR filenames, mic configurations, audio metrics, AI feedback, quality scores, and timestamps. Drizzle Kit manages migrations.

### AI Integration
- **Provider**: OpenAI API for advanced analysis.
- **Functionality**: Generates quality scores (0-100), classifies IRs, and provides concise, actionable advice based on audio metrics and mic setup.
- **Recommendations**: Offers AI-generated optimal mic/position/distance combinations for speakers and genres. Refines user-provided IR lists and suggests speaker pairings based on amplifier descriptions and genre-specific studio techniques. Injects learned gear preferences into prompts.
- **Tonal Analysis**: Keyword system analyzes user text for specific mic/position preferences and avoids rules.
- **Preference Learning**: Learns mic/position/distance preferences from favorite IR filenames (session-based) for AI recommendations.
- **Cherry Picker**: Client-side module for learning audio preferences from favorite IRs and finding matches in new collections, using variance-aware matching for spectral centroid, smoothness, and energy distribution.
- **Deterministic Scoring**: Spectral centroid scoring uses a knowledge base of expected ranges per mic/position/speaker.
- **Modular Features**: Includes IR analysis (single/batch), recommendations (speaker/amp/import list), and IR pairing (single/mixed speaker).
- **Comprehensive Knowledge Base**: Database of 17 microphones, 10 speakers, 7 mic positions, distances, and genre-specific recording techniques.
- **IR Naming Convention**: Supports `Speaker_Mic_Position_distance_variant` for batch processing.
- **Genre-Specific Guidance**: Provides tonal goals, studio contexts, and "avoid" rules for 16 predefined genres.
- **Miking Guide**: Curated reference of close-miking techniques for 14 microphones from professional sources.
- **IR Culling**: Batch tool to reduce IR collections by maximizing variety and quality, using spectral similarity analysis and a greedy selection algorithm. Includes **Blend Redundancy Detection** to identify and score multi-mic blends against single-mic components. **Technique-Aware Blend Culling**: Named techniques (Fredman) are automatically protected as essential — unique mic arrangements not replicable from solo shots. Standard multi-mic blends (e.g., SM57+R121) are evaluated more strictly when both component mics have strong solo coverage (3+ shots each), lowering the redundancy threshold by 8% to cull more aggressively. Penalty for redundant standard blends increased to 10 (from 8), adds-value to 4 (from 3). **Role-Balance-Aware Culling**: Detects when Feature or Body shots are scarce (<25% of classified IRs) and offers three modes — No Role Guard (default), Protect Scarce (light boost), Favor Scarce (strong boost). Boost is quality-and-confidence-scaled to prevent low-quality IRs from over-promotion. Pre-cull preference query automatically asks about role protection when imbalance detected. Culler panel shows role balance stats (Feature X/Y, Body X/Y) with warnings when scarce roles lose shots.
- **IR Mixer**: Client-side tool for previewing blend permutations of a base IR + multiple feature IRs at configurable ratios, displaying 6-band breakdown and HiMid/Mid ratio.
- **Preference Profiles**: Two hardcoded tonal profiles (Featured, Body) with match scoring.
- **Preference Learning**: Persists sentiment-based feedback (Love/Like/Meh/Nope) to `preference_signals` DB table with tonal data. Server-side `computeLearnedProfile` adjusts profile targets with confidence scaling.
- **Per-Profile Learning**: Adjustments computed independently for Featured and Body profiles.
- **Gear Insights**: Computes net sentiment scores for mic/speaker/position from IR filenames in preference signals, displayed as color-coded tags.
- **Gear Tonal Profiling**: Computes average tonal band values per gear piece from all signals, deriving descriptive labels (e.g., Bright/Forward, Dark/Warm). Tracks gear combinations.
- **Gear-Contextualized Analysis**: Feeds learned gear tonal profiles into IR analysis for parseable filenames, providing contextual commentary.
- **Revisable Mastery**: Mastery status can be revoked due to taste drift, nope surges, or prediction misses.
- **Shot Intent System**: Knowledge base of mic/position role conventions. Ribbon mics (R121, R10, Roswell, R92) are body-intended. Dynamic/condenser mics (SM57, M201, C414, e906, M88, MD441, MD421, M160, SM7B, PR30) at cap-area positions (Cap, Cap Off-Center, CapEdge, CapEdge-Bright, CapEdge-Dark) are feature-intended. Same mics at cone-area positions (Cap-Cone Transition, Cone) are body-intended. Intent applies confidence-scaled bonuses to classification scoring, Foundation Finder ranking, and blend pairing suggestions. Intent badges shown on IR cards throughout the UI.
- **Foundation Finder**: Ranks IRs by Body score (with intent bonuses) to identify best base IRs.
- **Iterative Suggested Pairings**: Multi-round refinement system for blend suggestions, presenting dynamic numbers of fresh 50:50 blends and allowing sentiment ratings.
- **Novelty-Aware Suggestions**: Boosts scores and reserves slots for under-exposed or never-seen IRs.
- **Complementary Pairing Suggestions**: Identifies and suggests tonally compensating IRs when an IR hits avoid zones.
- **Tonal Feedback Tags**: Contextual quick-tag system for pairing ratings, mapping to band-specific nudges for learning algorithm.
- **Cross-Cab Pairing**: Dedicated section in IR Mixer for blending IRs from two different cabinets, ranking permutations by tonal profile match.
- **Free-Form Text Feedback**: Text input for nuanced descriptions. **AI-Interpreted Text Nudges**: All accumulated text comments are batch-sent to OpenAI (gpt-4o-mini) which interprets direction, context (rating sentiment), and the blend's actual tonal data to produce structured 6-band nudges with confidence-weighted strength. AI understands negation ("too bright" = reduce presence), context ("perfect highs" on a 35% presence blend = anchor at 35%), and combined sentiment across all comments. AI nudges are applied with full weight (scaled by AI's own confidence × learned profile confidence) alongside the existing keyword-matching system. Results are cached (7-day TTL). AI interpretation summary appears in `courseCorrections`. Text comments are also aggregated and injected into AI prompts (analysis, recommendations, gap finder) so the AI learns the user's vocabulary, perception style, and production context — mirroring their language in responses.
- **Tonal Insights Panel**: Collapsible "What I Think You Like" section in IR Mixer that displays a human-readable summary of learned tonal preferences, including what the user likes (band preferences), what they avoid (avoid zones), gear tendencies, blend ratio preferences, per-profile differences, and AI text interpretations. Built server-side by `buildTonalSummary()` using all available learned data. Supports markdown-like bold formatting.
- **Preference Corrections**: "Correct me" input in the Tonal Insights Panel. Users type corrections like "I actually prefer darker tones" which are sent through AI (gpt-4o-mini) to produce structured tonal nudges, stored as high-weight (5x) "correction" signals in `preference_signals`. Corrections have the strongest weight in `computeLearnedProfile`, immediately steering the learned profile. Clears text feedback cache to force recomputation.
- **Tone Request / Find Me This Tone**: Text input where users describe a desired tone (e.g., "thick aggressive metal with lots of bite") and the system uses AI to suggest 3-5 specific IR blend combinations from loaded IRs, with base/feature pairings and ratios. Incorporates learned preferences and gear insights for context-aware suggestions. Results show confidence scores, expected tones, and reasoning. Only available when 2+ IRs are loaded.
- **Tonal Intelligence System**: `tonal_profiles` database table stores running averages of 6-band tonal data, ratio, centroid, and smoothness, keyed by mic+position+distance+speaker.
- **Shot Designer**: Tab on Recommendations page that uses learned tonal profiles to design complete shot lists, predicting tonal characteristics and suggesting mixing pairs.
- **Gap Finder**: Tab on Recommendations page where users load actual WAV IR files for client-side audio analysis. Sends 6-band tonal data to server which combines it with tonal profiles, preference learning, and gear insights to identify tonal gaps, flag redundancies (including blend overlaps), and suggest specific new shots that would maximize collection variety. Server-side cluster analysis groups IRs by tonal similarity.
- **Reference Set Comparison**: Client-side feature to save a completed IR batch as a "reference palette" and compare new batches against it. Uses 6-band similarity (50%), HiMid/Mid ratio (25%), and centroid proximity (25%) to determine flavor coverage. Adjustable closeness threshold (55-95%). Shows covered/missing/bonus flavors with per-IR match details and mini band-shape visualizations. Stored in sessionStorage.
- **A/B Taste Check**: Progressive multi-round taste profiling before ratio refinement. Works like an eye chart — starts with 4 clearly different blends spread across a tonal axis (brightness, body, aggression, warmth), then narrows with binary A/B comparisons on the same or new axes. Each pick is recorded with axis context. After all rounds complete, ratio refinement unlocks automatically. Skippable. Uses `pickTasteCheckCandidates` which scores all pairings along defined `TASTE_AXES`, tracks explored axes, and applies narrowing factors based on history. **Confidence-adaptive**: `getTasteConfidence` evaluates learned profile status/signal counts to determine confidence level (high/moderate/low). High confidence (mastered/confident status) skips quad rounds entirely, starts with binary A/B, and runs only 2 rounds ("Taste Verify"). Moderate confidence (learning with 8+ signals or 4+ with likes) shows 1 quad round then binary, 3 rounds total ("Refining"). Low confidence (no data/few signals) shows 2 quad exploration rounds then binary, up to 5 rounds ("Exploring"). **Convergence-based stopping**: `shouldContinueTasteCheck` evaluates after each pick whether to continue. For high confidence (verify mode), checks if user's picks agree with the learned profile's axis directions — stops early if all picks confirm the profile. For lower confidence, checks if picks on repeated axes are consistent (same direction) — stops when convergence is detected. Hard caps prevent infinite loops (4/5/7 rounds for high/moderate/low). Progress dots grow dynamically rather than showing fixed bar.
- **A/B Ratio Refinement**: Second-round phase in IR Mixer for learning preferred blend ratios. After rating pairings and submitting, if any are Love/Like, a ratio refinement phase begins. User selects ONE pairing to refine (app suggests top candidate, user overrides). Adaptive rounds of side-by-side BandChart previews at different ratios on a 5% grid (30/70 through 70/30). Max 3 rounds then auto-concludes with best known ratio. Options include "No difference" (tie — widens the gap by 10% and tries again with more distinct ratios, up to grid edges) and "No ratio helps" (for Likes, downgrades to Meh). Final ratio stored as `ratio_pick` signal with `blendRatio` field. Server-side `computeLearnedProfile` computes weighted ratio preference distribution, snapped to 5% grid, exposed as `ratioPreference` in `LearnedProfileData`. `suggestPairings` evaluates learned preferred ratio alongside 50:50 and picks whichever scores higher. Per-profile ratio preferences supported (Featured vs Body). **Ratio Mode**: Dedicated "Ratio" button in the mode selector (alongside 4-Pick/Auto/A/B) enables direct A/B ratio refinement from any expanded blend card via the "A/B Refine" button. Results feed into the learning pipeline. Standalone ratio refine UI renders outside the Suggested Pairings section when no pairing pool exists.

## External Dependencies

- **Database**: PostgreSQL
- **AI Services**: OpenAI API
- **NPM Packages**:
    - `drizzle-orm` & `drizzle-kit`
    - `@tanstack/react-query`
    - `recharts`
    - `framer-motion`
    - `react-dropzone`
    - `zod`
    - `express`