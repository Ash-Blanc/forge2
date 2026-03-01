# GEMINI.md - FORGE Context & Instructions

This file serves as the primary instructional context for Gemini CLI when working on the FORGE project. It takes precedence over general defaults.

## Project Overview

**FORGE** is an AI-powered platform that analyzes academic papers (primarily from arXiv) to identify and evaluate SaaS opportunities. It uses a "NOVA" scoring system to rank these ideas.

- **Architecture**: A Next.js frontend that communicates with a Python FastAPI backend for AI agent tasks.
- **Repository Structure**:
    - `full-stack-web/`: Main Next.js application (App Router, React 19, TypeScript, Tailwind CSS v4).
    - `full-stack-web/agents/`: Python FastAPI service utilizing the **Agno framework** for AI agents.
    - `streamlit-prototype/`: Active Python-based prototype for rapid feature development.
    - `supabase/`: Database schema and seed files.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| **Backend (Web)** | Next.js API Routes (Node.js runtime) |
| **Backend (Agents)** | Python FastAPI, Agno Framework, Pydantic |
| **AI Models** | Anthropic Claude, Cerebras (Llama), AWS Bedrock (Nova-lite) |
| **Database** | Supabase (PostgreSQL) with PgVector |
| **Styling** | Tailwind CSS v4 |

## Building and Running

### Prerequisites
- Node.js 18+ & npm
- Python 3.10+
- Supabase account (PostgreSQL + PgVector)
- API Keys: `ANTHROPIC_API_KEY`, `AWS_REGION`, etc.

### Database Setup
- **Supabase**: PostgreSQL with `pgvector` extension.
- **Schema**: `full-stack-web/supabase/schema.sql` (apply via Supabase SQL Editor).
- **Seed**: `full-stack-web/supabase/seed.sql` or `npm run seed` for sample data.

### Commands

#### Root
- The project is split into `full-stack-web` and `streamlit-prototype`. Most work happens in `full-stack-web`.

#### Frontend (`full-stack-web/`)
- `npm install`: Install dependencies.
- `npm run dev`: Start Next.js development server (uses Turbopack).
- `npm run build`: Build for production.
- `npm run lint`: Run ESLint.
- `npm run seed`: Seed the database (via internal API call to `http://localhost:3000/api/seed`).

#### Python Agents (`full-stack-web/agents/`)
- `pip install -r requirements.txt`: Install Python dependencies.
- `uvicorn server:app --port 8321 --reload`: Start the agent server.
- **Independent Tests**: `test_bedrock.py`, `test_openai.py`, `test_cerebras.py` are available for provider-specific testing.
- **Note**: The frontend API routes expect this server to be running on port `8321`.

### Environment Variables
Create `full-stack-web/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...
AWS_REGION=us-east-1
```

## Development Conventions

### General Principles
- **KISS**: Keep it simple. Avoid over-engineering.
- **Surgical Changes**: Focus on specific tasks without unrelated refactoring.
- **Validation**: Always run `npm run lint` and `npm run build` to verify changes.

### Frontend (Next.js/TypeScript)
- **TypeScript**: Strict mode enabled. Always use explicit types, avoid `any`.
- **Imports**: Use `@/` path alias for absolute imports (e.g., `@/lib/supabase`).
- **Components**: PascalCase (e.g., `PaperCard.tsx`).
- **React**: Functional components with hooks. Use "use client" only when necessary.
- **Styling**: Use Tailwind CSS v4 utility classes. Prefer CSS variables in `app/globals.css`.

### Backend (Python/FastAPI)
- **Style**: PEP 8.
- **Types**: Use type hints for all function signatures and Pydantic models for request/response validation.
- **Agents**: Utilize the Agno framework. Models are often selected via provider prefixes (e.g., `anthropic:claude-3-5-sonnet-20241022`).

### Testing
- **Current State**: No formal test suite exists.
- **Frontend Strategy**: Add Vitest or Jest if needed.
- **Python Strategy**: Use `pytest`.
- **TODO**: Implement basic unit tests for the NOVA scoring logic and agent prompts.

## Key Files
- `full-stack-web/app/api/analyze/route.ts`: Proxies requests to the Python agent server.
- `full-stack-web/agents/server.py`: Main FastAPI entry point for AI tasks.
- `full-stack-web/lib/supabase.ts`: Supabase client configuration.
- `docs/AGENTS.md`: Detailed developer guide.
- `docs/archive/project_vision.md`: Original vision and roadmap.
- `tasks.md`: Current backlog.

## Safety & Security
- Never commit `.env.local` or other secret files.
- Protect `.git` and system configurations.
- Do not stage or commit changes unless explicitly requested.
