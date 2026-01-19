# IR.Scope - Guitar Cabinet Impulse Response Analyzer

## Overview

IR.Scope is a web application for analyzing guitar cabinet impulse responses (IRs). Users upload WAV files containing IR recordings, specify their microphone setup (type, position, distance), and receive AI-powered quality assessments with actionable advice. The app calculates audio metrics client-side using Web Audio API, sends them to the backend for OpenAI-based analysis, and stores results in PostgreSQL for historical review.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled via Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (dark mode default)
- **Audio Processing**: Web Audio API for client-side frequency analysis, peak detection, and spectral centroid calculation
- **Visualization**: Recharts for frequency response graphs
- **Animations**: Framer Motion for UI transitions
- **File Upload**: react-dropzone for drag-and-drop WAV file handling

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript compiled with tsx
- **API Pattern**: REST endpoints defined in shared/routes.ts with Zod schemas for input validation
- **Build System**: esbuild for server bundling, Vite for client bundling

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: shared/schema.ts defines the `analyses` table storing filenames, mic configuration, audio metrics, AI-generated advice, quality scores, and timestamps
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization

### AI Integration
- **Provider**: OpenAI API (via Replit AI Integrations)
- **Use Case**: Analyzes audio metrics and mic setup context to generate quality scores (0-100), perfect/imperfect classification, and 2-3 sentence advice
- **Prompt Engineering**: System prompt defines expert audio engineer persona with specific criteria for "perfect" IR characteristics

### Project Structure
```
client/           # React frontend
  src/
    components/   # UI components including FrequencyGraph, ResultCard, Navigation
    pages/        # Analyzer (upload + analyze), Pairing (multi-IR blending), History (past results), Recommendations (AI mic suggestions)
    hooks/        # Custom hooks for API calls
server/           # Express backend
  routes.ts       # API endpoint handlers
  storage.ts      # Database access layer
  db.ts           # Drizzle connection setup
shared/           # Shared between client/server
  schema.ts       # Drizzle table definitions + Zod schemas
  routes.ts       # API contract definitions + recommendation schemas
```

### Key Design Decisions
1. **Client-side audio analysis**: Reduces server load and latency by computing metrics in the browser before API calls
2. **Shared type definitions**: Using drizzle-zod ensures frontend and backend share identical validation schemas
3. **AI-assisted quality scoring**: Provides actionable, context-aware feedback rather than just raw metrics
4. **Recommendations feature**: AI generates optimal mic/position/distance combinations based on speaker AND genre
5. **Separation of concerns**: IR analysis is purely technical/objective; genre-specific advice is in Recommendations only
6. **Deterministic spectral centroid scoring**: Uses knowledge base with expected ranges per mic/position/speaker, not AI guessing
7. **Shared scoring function**: Both single and batch modes use `scoreSingleIR()` for identical results

### Feature Separation
- **IR Analysis (Analyzer page)**: Has two modes accessible via toggle:
  - **Single IR mode**: Manual entry of mic, position, speaker, distance. Detailed analysis with frequency graph visualization.
  - **Batch Analysis mode**: Drop multiple IR files for automatic quality assessment. System parses filenames to detect mic/position/speaker/distance and provides scores, highlights, and issues for each IR. Results are copyable.
- **Recommendations (Recommendations page)**: Has three modes accessible via toggle:
  - **By Speaker mode**: Mic/position/distance recommendations. Select just a speaker to get mic combos, or select both mic and speaker for distance-focused advice. Based on curated IR production knowledge.
  - **By Amp mode**: Speaker recommendations based on amp description. Enter free text describing your amp (model, type, characteristics) and get speaker suggestions based on classic amp/speaker pairings from legendary recordings.
  - **Import List mode**: Paste your tested IR positions (shorthand or written out format) and get AI-powered refinement suggestions. The AI keeps most of your tested positions (you liked them!) and suggests complementary additions to fill gaps. Removal is extremely rare - only for technically dangerous or broken combinations. **Speaker Clarification**: If ambiguous speaker names are detected (e.g., "SC64" without specifying GA12 or GA10), a clarification prompt appears before processing.
- **IR Pairing (Pairing page)**: Has two modes:
  - **Single Speaker mode**: Upload IRs from one speaker to find best pairings within that set.
  - **Mixed Speaker mode**: Upload IRs to two separate drop zones (Speaker 1 and Speaker 2) to find optimal cross-speaker pairings. Creates unique hybrid tones by blending IRs from different cabinets.
  - **Tone Preferences**: Optional free-text input for desired sound (edgy, bright, thick, dark, aggressive, chunky, rhythm, leads). AI prioritizes pairings that achieve these goals.
  - **Deterministic Results**: Uses fixed temperature and seed for consistent recommendations.
  - All results are copyable with full descriptions. **Important**: All IRs are assumed to be minimum phase transformed (MPT), so phase cancellation is never a concern when blending.

### Microphone & Speaker Knowledge Base
- **17 microphones**: SM57, R-121, AEA R92, M160, MD421, MD421 Kompakt, MD441 (Presence Boost/Flat), R10, M88, PR30, e906 (Presence Boost/Flat), M201, SM7B, AKG C414, Roswell Cab Mic
- **10 speakers**: V30, V30 (Black Cat), Greenback, G12T-75, G12-65, G12H30 Anniversary, Celestion Cream, GA12-SC64, G10-SC64
- **7 mic positions**: Cap, Cap_OffCenter, CapEdge, CapEdge_BR, CapEdge_DK, CapEdge_Cone_Tr, Cone
- **Distances**: 0" to 6" in 0.5" increments

### Spectral Centroid Knowledge Base (`shared/knowledge/spectral-centroid.ts`)
Deterministic expected spectral centroid ranges for consistent scoring:

**Mic Base Ranges (Hz):**
- SM57: 2200-3000 (mid-forward)
- R121/R10/R92: 1400-2200 (ribbon smooth)
- M160: 1800-2600 (tighter ribbon)
- MD421/Kompakt: 2000-2900 (punchy dynamic)
- PR30: 2800-3800 (very bright)
- e906: 2300-3200 (flat), 2600-3600 (presence boost)
- SM7B: 1700-2400 (smooth/thick)
- C414: 2600-3600 (detailed condenser)
- Roswell: 2400-3400 (specialized cab mic)

**Position Offsets (Hz):**
- Cap: +400 (dead center of dust cap, brightest)
- Cap_OffCenter: +250 (small lateral offset from Cap, still on dust cap)
- CapEdge: 0 (seam line where dust cap meets cone, baseline)
- CapEdge_BR: +150 (CapEdge favoring cap side, brighter)
- CapEdge_DK: -150 (CapEdge favoring cone side, darker)
- CapEdge_Cone_Tr: -250 (smooth cone immediately past cap edge, transition zone)
- Cone: -500 (true mid-cone position, ribs allowed, darkest)

**Speaker Offsets (Hz):**
- V30: +200 (aggressive mids)
- V30BC: +100 (smoother)
- Greenback/G12M: -150 (woody)
- Cream: -100 (alnico smooth)
- G12H Anniversary: +150 (bright)
- G12T-75: +100 (sizzly highs)

**Scoring Adjustments:**
- Within range: 0 points
- <25% deviation: -1 point
- 25-50% deviation: -2 points
- 50-100% deviation: -3-4 points
- >100% deviation: -5-6 points

### IR Shorthand Naming Convention
Format: `Speaker_Mic_Position_distance_variant`

**Speaker Shorthand:**
- Cream, V30, V30BC, G12M, G12HAnni, G12-65Heri, GA12-SC64, GA10-SC64, K100, G12T75

**Mic Shorthand:**
- SM57, R121, R10, MD421, MD421Kompakt, M201, M88, Roswell, M160, e906, C414, R92, PR30
- Variants: MD441 and e906 have `_Presence` or `_Flat` suffixes

**Position Format:**
- Simple: `Cap`, `Cone`, `CapEdge`
- Complex with underscore: `Cap_OffCenter`, `CapEdge_BR`, `CapEdge_DK`, `CapEdge_Cone_Tr`

**Position Definitions:**
- Cap: Dead center of the dust cap
- Cap_OffCenter: Small lateral offset from Cap, still fully on the dust cap
- CapEdge: Seam line where the dust cap meets the cone
- CapEdge_BR: CapEdge favoring the cap side of the seam (brighter)
- CapEdge_DK: CapEdge favoring the cone side of the seam (darker)
- CapEdge_Cone_Tr: Smooth cone immediately past the cap edge (transition zone)
- Cone: True mid-cone position, further out from the cap edge, ribs allowed

**Examples:**
- `V30_SM57_CapEdge_BR_2in`
- `Cream_e906_Cap_1in_Presence`
- `G12M_R121_Cone_1.5in`
- `V30_MD421_CapEdge_Cone_Tr_1.5in`

### Genre-Specific Studio Techniques (Recommendations only)
The Recommendations AI is trained on classic recording techniques for each genre:
- **Classic Rock** (1970s): Led Zeppelin, AC/DC - SM57 at 1-2" from grille, dual-mic with ribbon at distance
- **Hard Rock** (1980s): Van Halen, Def Leppard - Tighter placement for definition, double-tracking
- **Alternative Rock**: R.E.M., Radiohead - Experimental placements, room mics, dynamic response
- **Punk**: Ramones, Green Day - Close mic for raw aggression, embrace imperfections
- **Grunge**: Nirvana, Soundgarden - Big Muff fuzz, multi-tracking layers, wall of sound
- **Classic Heavy Metal**: Black Sabbath, Iron Maiden - Fredman technique, tight low-end definition
- **Indie Rock**: The Strokes, Arctic Monkeys - Vintage character, smaller amps pushed to breakup

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable

### AI Services
- **OpenAI API**: Used for IR quality analysis
  - Configured via `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables
  - Model: gpt-4 or similar for JSON-structured responses

### NPM Packages (Key)
- **drizzle-orm** + **drizzle-kit**: Database ORM and migration tooling
- **@tanstack/react-query**: Async state management
- **recharts**: Data visualization
- **framer-motion**: Animation library
- **react-dropzone**: File upload handling
- **zod**: Runtime type validation
- **express**: HTTP server framework