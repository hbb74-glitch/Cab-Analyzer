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
- **Schema**: `analyses` table stores IR filenames, mic configurations, audio metrics, AI feedback, quality scores, and timestamps.

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
- **IR Mixer**: Client-side tool for previewing blend permutations with configurable ratios, 6-band breakdown, HiMid/Mid ratio display, and tilt/centroid/smoothness readouts. Features Individual IR evaluation mode (separate from blend context) with role suggestions and profile matching. Uses canonical `computeTonalFeatures`/`blendFeatures` pipeline from `tonal-engine.ts`. Find Tone panel sends real computed centroid, smoothness, and tilt to AI (not hardcoded zeros).
- **Preference Profiles**: Uses "Featured" and "Body" tonal profiles with sentiment-based feedback (`Love/Like/Meh/Nope`) to adjust profile targets.
- **Gear Insights**: Computes net sentiment and average tonal band values for individual gear pieces and combinations.
- **Shot Intent System**: Classifies mic/position roles (e.g., "feature-intended" or "body-intended") based on a knowledge base, applying confidence-scaled bonuses to classification and pairing suggestions.
- **Foundation Finder**: Ranks IRs by Body score to identify best base IRs.
- **Iterative Suggested Pairings**: Multi-round refinement system for blend suggestions with sentiment ratings.
- **Novelty-Aware Suggestions**: Boosts scores for under-exposed or new IRs.
- **Complementary Pairing Suggestions**: Identifies tonally compensating IRs.
- **Tonal Feedback Tags**: Contextual quick-tag system for pairing ratings, mapping to band-specific nudges for the learning algorithm.
- **Free-Form Text Feedback**: AI-interpreted text nudges from user comments produce structured 6-band nudges, learn user vocabulary, and are integrated into AI prompts.
- **Tonal Insights Panel**: Displays a human-readable summary of learned tonal preferences, including likes, avoid zones, gear tendencies, and blend ratio preferences.
- **Preference Corrections**: User input to correct learned preferences, immediately steering the learned profile.
- **Tone Request / Find Me This Tone**: Users describe a desired tone, and the system suggests IR blend combinations using AI, incorporating learned preferences.
- **Test AI**: Diagnostic tool for users to query the AI about loaded IRs, verifying its tonal understanding.
- **Tonal Intelligence System**: Stores running averages of 6-band tonal data, ratio, centroid, and smoothness, keyed by mic+position+distance+speaker.
- **Shot Designer**: Uses learned tonal profiles to design shot lists.
- **Gap Finder**: Analyzes loaded IRs to identify tonal gaps, flag redundancies, and suggest new shots.
- **Reference Set Comparison**: Client-side feature to compare new IR batches against a saved "reference palette" for flavor coverage.
- **A/B Taste Check**: Progressive multi-round taste profiling to learn preferred tonal axes, starting with broad comparisons and narrowing down. Confidence-adaptive based on learned profile status.
- **A/B Ratio Refinement**: Phase for learning preferred blend ratios through side-by-side band chart previews at different ratios.
- **Amp Designer / Mod Lab**: Translates real-world amp and pedal circuit mods (Jose Arredondo, Snorkler, Cameron, diode swaps, op-amp mods, etc.) into Fractal Audio Axe-FX/FM3 Expert parameters. Knowledge base covers 326 amp models, 15 drive/fuzz models, 15 known mods, and 20+ Expert parameter definitions. AI generates parameter recipes with rationale, starting points, interaction notes, and alternatives.
- **Amp Dial-In Guide**: Starting settings for every Fractal Audio amp model (326 models). Provides curated dial-in presets organized by amp family (Fender Tweed, Blackface, Vox AC, Marshall Plexi/JCM800, Mesa Recto/Mark, Peavey 5150, Dumble, etc.) with per-model overrides for popular amps. Features SVG knob visualizations, multiple style presets per family, tips, and "what to listen for" guidance. AI-powered advisor generates personalized settings using Fractal Wiki, Yek's Guide, and forum knowledge.

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