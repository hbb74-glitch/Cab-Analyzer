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
    pages/        # Analyzer (upload + analyze), History (past results), Recommendations (AI mic suggestions)
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
4. **Recommendations feature**: AI generates optimal mic/position/distance combinations based on speaker characteristics
5. **Genre-aware analysis**: AI references classic studio techniques from legendary recordings for genre-specific advice

### Microphone & Speaker Knowledge Base
- **13 microphones**: SM57, R-121, M160, MD421, e906, i5, U87, E609, Fathead II, KSM32, TM700, Heil PR40, PR30
- **10 speakers**: V30 (China/Germany), Greenback, G12T-75, Creamback H/M, G12-65/EVH, GA12-SC64, G10-SC64
- **6 mic positions**: cap, cap-edge, cap-edge-outer, cone, cap-off-center, between-cap-cone
- **Distances**: 0" to 6" in 0.5" increments

### Genre-Specific Studio Techniques
The AI is trained on classic recording techniques for each genre:
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