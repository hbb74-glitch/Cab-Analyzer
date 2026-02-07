# IR.Scope - Guitar Cabinet Impulse Response Analyzer

## Overview

IR.Scope is a web application designed to analyze guitar cabinet impulse responses (IRs). It allows users to upload WAV files of IRs, input their microphone setup details, and receive AI-powered quality assessments along with actionable advice. The application aims to provide a comprehensive tool for guitarists and producers to evaluate and improve their IR recordings, offering insights into microphone placement, speaker characteristics, and genre-specific tonal considerations. The project's ambition is to become a go-to resource for optimizing guitar tones through intelligent IR analysis and recommendations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite.
- **UI/UX**: Utilizes shadcn/ui (built on Radix UI) and Tailwind CSS with CSS variables for theming, including a dark mode by default.
- **Audio Processing**: Client-side audio analysis (frequency analysis, peak detection, spectral centroid) is performed using the Web Audio API.
- **Visualization**: Recharts is used for displaying frequency response graphs.
- **Interactivity**: Framer Motion handles UI animations, and react-dropzone enables drag-and-drop file uploads.

### Backend Architecture
- **Technology Stack**: Node.js with Express 5, written in TypeScript.
- **API**: Implements RESTful API endpoints, with Zod schemas used for robust input validation.

### Data Storage
- **Database**: PostgreSQL is used as the primary data store, managed via Drizzle ORM.
- **Schema**: A shared `analyses` table stores IR filenames, mic configurations, audio metrics, AI feedback, quality scores, and timestamps. Drizzle Kit handles schema migrations.

### AI Integration
- **Provider**: OpenAI API is integrated for advanced analysis.
- **Functionality**: The AI generates quality scores (0-100), classifies IRs as perfect/imperfect, and provides concise, actionable advice based on audio metrics and mic setup context.
- **Recommendations**: The system offers AI-generated optimal mic/position/distance combinations for speakers and genres. It also refines user-provided IR position lists and suggests speaker pairings based on amplifier descriptions and genre-specific studio techniques.
- **Tonal Analysis**: A keyword system analyzes custom user text (e.g., "spanky cleans") to generate specific mic and position preferences and avoid rules.
- **Preference Learning**: Users can upload their favorite IRs and the app learns their mic/position/distance preferences from filenames, then incorporates these into AI recommendations (session-based, no persistence).
- **Cherry Picker**: A client-side module for learning audio preferences from favorite IRs and finding matches in new collections. Uses variance-aware matching with standard deviation to score spectral centroid, smoothness, and energy distribution. Preference profiles persist in sessionStorage.

### Core Design Principles
- **Client-side Processing**: Audio analysis is offloaded to the client to reduce server load and improve responsiveness.
- **Shared Schemas**: Drizzle-Zod ensures consistent data validation between frontend and backend.
- **AI-Assisted Feedback**: Provides intelligent, context-aware feedback beyond raw metrics.
- **Deterministic Scoring**: Spectral centroid scoring uses a knowledge base of expected ranges per mic/position/speaker for consistent and objective results.
- **Modular Features**: Distinct features like IR analysis (single/batch), recommendations (speaker/amp/import list), and IR pairing (single/mixed speaker) are clearly separated and accessible.
- **Comprehensive Knowledge Base**: Includes a detailed database of 17 microphones, 10 speakers, 7 mic positions, distances, and genre-specific recording techniques to inform AI recommendations and analysis.
- **IR Naming Convention**: Supports a structured shorthand for IR filenames (`Speaker_Mic_Position_distance_variant`) for efficient batch processing.
- **Genre-Specific Guidance**: Offers detailed tonal goals, studio contexts, and "avoid" rules for 16 predefined genres plus custom options.
- **Miking Guide**: A curated reference of close-miking techniques for 14 microphones, sourced from professional recording engineering references, including distance ranges, best positions, switch settings, and blending recommendations.
- **IR Culling**: A batch tool that reduces an IR collection to a target count while maximizing variety (mic types, positions) and quality. Uses spectral similarity analysis and greedy selection algorithm to recommend which IRs to keep vs cut.
- **IR Mixer**: A client-side tool for previewing blend permutations of a base IR + multiple feature IRs at 5 configurable ratios (70/30 through 30/70). Uses raw energy blending (not rounded percentages) for accurate tonal predictions. Displays 6-band breakdown and HiMid/Mid ratio for each blend.
- **Preference Profiles**: Two hardcoded tonal profiles derived from user's real IR data: Featured (Mid 19-26%, Presence 28-39%, ratio 1.4-1.9) and Body (Mid 30-39%, Presence 5-18%, ratio 1.0-1.4). Match scoring evaluates each IR against both profiles with deviation tracking.
- **Preference Learning**: Persists sentiment-based feedback (Love/Like/Meh/Nope) to a `preference_signals` DB table with full tonal data. Ties are allowed — multiple blends can share the same sentiment. Weights: Love=3, Like=1.5, Meh=0.5, Nope=strong negative (avoid zones). A server-side `computeLearnedProfile` function computes weighted averages of positive blends to shift profile targets, with confidence scaling (0-1 based on signal count, confident at 5+ likes). Avoid zones are derived from noped patterns. The learned profile is served via `/api/preferences/learned` and consumed on the client to adjust `activeProfiles` used for all scoring/ranking in the IR Mixer. Learning status indicator shows signal count, profile shifts, and confidence level.
- **Gear Insights**: Once 5+ signals are collected, the system parses mic/speaker/position from IR filenames in preference signals and computes net sentiment scores for each piece of gear (love=+3, like=+1.5, meh=+0.2, nope=-2). Gear with 2+ appearances is shown as color-coded tags (green=positive, red=negative) in the learning status display. Parsing uses joined-string fallback for robust matching.
- **Gear Tonal Profiling**: Beyond sentiment, the system computes average tonal band values (subBass, bass, lowMid, mid, highMid, presence, ratio) per gear piece from all signals where that gear appears (deduplicated per signal). Compares each gear's tonal profile against global signal averages and derives descriptive labels (Bright/Forward, Dark/Warm, Thick/Muddy, Lean/Tight, Dense Mids, Scooped, Bite/Cut, Smooth, Crisp/Articulate, Warm/Round, Full/Thin Low-End) with configurable thresholds. Requires 3+ samples for tonal data. Also tracks gear combinations (mic+speaker, mic@position, speaker@position) with their own tonal profiles and descriptors. Top 8 combos shown sorted by sentiment magnitude. Learns intrinsic tonal characteristics of gear rather than just user preference.
- **Gear-Contextualized Analysis**: Feeds learned gear tonal profiles back into the IR analysis function. For parseable filenames (user's own IRs following Speaker_Mic_Position_distance naming), the batch and single analysis views show a "Learned Gear Profile" section with gear-specific tonal descriptors and contextual commentary (e.g., "SM57 typically: Bright/Forward", "This IR is darker than typical for SM57 @ CapEdge"). For non-parseable filenames (other people's IRs), falls back to preference-only analysis without gear-specific commentary. Client-side gear parsing mirrors server-side patterns for performance.
- **Revisable Mastery**: Mastery status is not permanent. Three checks can revoke it: taste drift (recent liked signals deviate from all-time averages by >5% mid, >7% presence, or >0.4 ratio), nope surge (4+ nopes in last 9 signals), and prediction misses (nope/meh on a 80+ scored blend). When mastery drops, the UI shows "Readjusting -- taste shift detected."
- **Foundation Finder**: Analyzes a batch of IRs and ranks them by Body score (warmth/weight). The highest Body-scoring IR makes the best base. Includes Suggested Pairings with iterative refinement.
- **Iterative Suggested Pairings**: Multi-round refinement system. Each round presents 3 fresh 50:50 blends (excluding previously evaluated pairs). Users rate blends with sentiment (Love/Like/Meh) or Nope, with ties allowed. Submit to refine the learned profile, then get a new round of suggestions informed by updated preferences. Shows round counter and cumulative signal stats. Two exit paths: "Submit & Show More" (keep refining) or "Load Top Pick" (done). Continues until user is satisfied or all pair combinations are exhausted.
- **Novelty-Aware Suggestions**: Tracks per-IR exposure counts across pairing rounds. Under-exposed IRs receive a score boost (up to +15 points scaled by how under-represented they are). Never-seen IRs are guaranteed dedicated suggestion slots (up to count-1 slots reserved). Mastery status requires full coverage — all IRs in the current pool must have been evaluated at least once. Learning status indicator shows unseen IR count and communicates that novel options are being prioritized.
- **Complementary Pairing Suggestions**: When an IR hits avoid zones in batch analysis, the system identifies other IRs in the batch that tonally compensate (lower mids if muddy, higher presence/ratio if dull) and suggests up to 3 specific filenames with reasons. Single IR mode shows general pairing guidance text.
- **Tonal Feedback Tags**: Contextual quick-tag system on pairing ratings. Love shows validation tags (Perfect/Balanced/Punchy/Warm/Aggressive), Like shows improvement suggestions (More bottom/Less harsh/More bite/Tighter/More air), Meh shows problem tags (Thin/Muddy/Harsh/Dull/Boomy/Fizzy). Multiple tags can be selected per rating for compound feedback (e.g., "thin" + "harsh"). Tags stored as comma-separated in `preference_signals.feedback`, and feed into the learning algorithm as band-specific nudges. Noped problem tags also generate targeted avoid zones (e.g., 2+ "muddy" nopes create a lowMid avoid zone). Tags map to specific band adjustments: bass/lowMid tags route through mid and ratio dimensions proportionally. Course corrections report active feedback tags.
- **Free-Form Text Feedback**: Each rating includes a text input for nuanced descriptions beyond predefined tags. Stored in `preference_signals.feedbackText`. Server-side keyword parser scans text for ~28 tonal descriptors (bright, dark, scooped, honky, nasal, boxy, crisp, smooth, tight, loose, wooly, sizzle, shrill, flat, full, sterile, fat, chunky, glassy, brittle, thick, airy, ice, spank, compressed, open, closed) and applies proportional band nudges at 70% weight of tag nudges. Enables faster learning from natural language descriptions.

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