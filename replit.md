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
    components/   # UI components including FrequencyGraph, ResultCard
    pages/        # Analyzer (upload + analyze) and History (past results)
    hooks/        # Custom hooks for API calls
server/           # Express backend
  routes.ts       # API endpoint handlers
  storage.ts      # Database access layer
  db.ts           # Drizzle connection setup
shared/           # Shared between client/server
  schema.ts       # Drizzle table definitions + Zod schemas
  routes.ts       # API contract definitions
```

### Key Design Decisions
1. **Client-side audio analysis**: Reduces server load and latency by computing metrics in the browser before API calls
2. **Shared type definitions**: Using drizzle-zod ensures frontend and backend share identical validation schemas
3. **AI-assisted quality scoring**: Provides actionable, context-aware feedback rather than just raw metrics

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