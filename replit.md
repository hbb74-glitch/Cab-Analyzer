# IR.Scope - Guitar Cabinet Impulse Response Analyzer

## Overview
IR.Scope is a web application designed to analyze guitar cabinet impulse responses (IRs). It allows users to upload WAV IR files, provide microphone setup details, and receive AI-powered quality assessments and actionable advice. The primary goal is to assist guitarists and producers in evaluating and enhancing their IR recordings by offering insights into microphone placement, speaker characteristics, and genre-specific tonal considerations, ultimately optimizing guitar tones through intelligent IR analysis and recommendations.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript and Vite.
- **UI/UX**: shadcn/ui (Radix UI) and Tailwind CSS with CSS variables, defaulting to dark mode.
- **Audio Processing**: Client-side analysis utilizing Web Audio API for frequency, peak detection, and spectral centroid.
- **Visualization**: Recharts for frequency response graphs.
- **Interactivity**: Framer Motion for animations and react-dropzone for file uploads.

### Backend
- **Technology**: Node.js with Express 5, written in TypeScript.
- **API**: RESTful API with Zod for input validation.

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM.
- **Schema**: Stores IR analysis data, mic configurations, audio metrics, AI feedback, quality scores, and timestamps. Also stores server-side backups of client taste data (Elo ratings, solo evaluations, blend preferences) for persistence.
- **Taste Persistence**: Client-side taste data automatically backs up to the server, with client-side restoration from server backup if local data is empty.

### AI Integration
- **Functionality**: Generates quality scores, classifies IRs, and provides actionable advice based on audio metrics and mic setup. Offers AI-generated optimal mic/position/distance combinations and suggests speaker pairings based on amplifier descriptions and genre.
- **Preference Learning**: Learns mic/position/distance preferences from user feedback and favorite IRs, including a "Cherry Picker" module for matching audio preferences.
- **Knowledge Base**: Includes a database of microphones, speakers, mic positions, distances, genre-specific recording techniques, and a comprehensive miking guide.
- **Genre-Specific Guidance**: Provides tonal goals and "avoid" rules for predefined genres.
- **IR Culling**: Batch tool to reduce IR collections by maximizing variety and quality using spectral similarity analysis, incorporating Blend Redundancy Detection and Technique-Aware Blend Culling.
- **Learner Module**: Client-side taste learning for blend permutation preview, IR evaluation, and profile matching. Uses a canonical pipeline for tonal feature computation.
- **Preference Profiles**: Utilizes "Featured" and "Body" tonal profiles with sentiment-based feedback (`Love/Like/Meh/Nope`) to adjust profile targets.
- **Gear Insights**: Computes sentiment and average tonal band values for individual gear.
- **Musical Roles**: 5 roles — Foundation (balanced workhorse, includes smooth condensers), Cut Layer (bright/aggressive), Mid Thickener (warm body), Fizz Tamer (smooth/dark top), Dark Specialty (very dark). "Lead Polish" was removed as it didn't map to real mic recording behavior.
- **Shot Intent System**: Classifies mic/position roles (e.g., "feature-intended" or "body-intended") based on a knowledge base, applying confidence-scaled bonuses to classification and pairing suggestions.
- **Collection Designer**: AI-powered collection planner with a mic-role knowledge base (40+ mic/position rules), mapping combos to predicted musical roles and intent suitability. Supports intent-based planning and automatic role budget computation.
- **Solo-First Learning Philosophy**: Prioritizes solo IR evaluations as the strongest teaching signal for clear tonal preference data, treating solo-proven IRs as safe foundation choices.
- **Validated Insights Feedback Loop**: Solo IR ratings, A/B win records, and Elo blend ratings feed into Shot Designer for grounded AI prompting.
- **Proven Shots Leaderboard**: Live-updated panel in Shot Designer showing consistently well-rated mic/position combos in solo evaluation.
- **Foundation Finder**: Ranks IRs by Body score to identify optimal base IRs.
- **IR Pairing**: Role-aware, intent-driven, psychoacoustically informed IR blend analyzer supporting single and mixed-speaker modes. Incorporates 6-band spectral analysis, KB role predictions, learned tonal profiles, and psychoacoustic descriptors.
- **Refinement-Aware Mastery**: Tracks refinement rates for blend suggestions and generates course corrections if needed, impacting mastery status.
- **Iterative Suggested Pairings**: Multi-round refinement system for blend suggestions with sentiment ratings.
- **Novelty-Aware Suggestions**: Boosts scores for under-exposed or new IRs.
- **Complementary Pairing Suggestions**: Identifies tonally compensating IRs.
- **Tonal Feedback Tags**: Contextual quick-tag system for pairing ratings, mapping to band-specific nudges for the learning algorithm.
- **Free-Form Text Feedback**: AI-interpreted text nudges from user comments produce structured 6-band nudges and learn user vocabulary.
- **Tonal Insights Panel**: Displays a human-readable summary of learned tonal preferences, including likes, avoid zones, gear tendencies, and tonal balance.
- **Preference Corrections**: User input to directly steer learned preferences.
- **Tone Request / Find Me This Tone**: Users describe a desired tone, and the system suggests IR blend combinations using AI, incorporating learned preferences.
- **Test AI**: Diagnostic tool for users to query the AI about loaded IRs and blends, verifying its tonal understanding.
- **Tonal Intelligence System**: Stores running averages of 6-band tonal data, ratio, centroid, and smoothness, keyed by mic+position+distance+speaker.
- **Shot Designer**: Uses learned tonal profiles to design shot lists, prioritizing user preferences over knowledge base defaults.
- **Usefulness Ranking**: Server-side scoring system that computes per-IR usefulness scores from solo ratings and blend performance, assigning client-side tiers.
- **Blend Favorites**: Persistent local storage-based system for saving favorite blends with IR names, ratio, roles, and source.
- **Test AI Feedback**: Allows users to save (Heart) or refine (X) Test AI suggestions, with refinement options for mic-family IR swapping and ratio adjustment.
- **Suggested Pairings Refinement**: Auto-opens a refinement panel after voting on a pairing card, offering mic-family IR swapping and ratio adjustment.
- **Gap Finder**: Analyzes loaded IRs to identify tonal gaps, flag redundancies, and suggest new shots.
- **Reference Set Comparison**: Client-side feature to compare new IR batches against a saved "reference palette."
- **A/B Taste Check**: Progressive multi-round taste profiling to learn preferred tonal axes, starting broad and narrowing down.
- **A/B Ratio Refinement**: Phase for learning preferred blend ratios through side-by-side band chart previews.
- **Amp Designer / Mod Lab**: Translates real-world amp and pedal circuit mods into Fractal Audio Axe-FX/FM3 Expert parameters, leveraging a knowledge base of amp models, drive/fuzz models, and mods.
- **Amp Dial-In Guide**: Provides starting settings for Fractal Audio amp models, with curated presets, SVG knob visualizations, and AI-powered personalized settings based on extensive knowledge bases.

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