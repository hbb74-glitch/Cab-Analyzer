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
- **Foundation Finder**: Analyzes a batch of IRs and ranks them by Body score (warmth/weight). The highest Body-scoring IR makes the best base. Includes Suggested Pairings with iterative refinement.
- **Iterative Suggested Pairings**: Multi-round refinement system. Each round presents 3 fresh 50:50 blends (excluding previously evaluated pairs). Users rate blends with sentiment (Love/Like/Meh) or Nope, with ties allowed. Submit to refine the learned profile, then get a new round of suggestions informed by updated preferences. Shows round counter and cumulative signal stats. Two exit paths: "Submit & Show More" (keep refining) or "Load Top Pick" (done). Continues until user is satisfied or all pair combinations are exhausted.

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