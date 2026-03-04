# AGENTS.md - FORGE Context & Instructions

This file serves as the primary instructional context for AI agents when working on the FORGE project. It takes precedence over general defaults.

## Project Overview

**FORGE** is an AI-powered platform that analyzes academic research (primarily arXiv papers) to identify and evaluate SaaS opportunities. It uses a 3-agent orchestration flow (ForgeFlow) to transform technical breakthroughs into actionable business plans.

- **Architecture**: Next.js frontend communicating with a Python FastAPI backend for AI agent tasks.
- **Repository Structure**:
  - `forge-app/`: Main Next.js application (App Router, React 19, TypeScript, Tailwind CSS v4).
  - `forge-app/agents/`: Python FastAPI service utilizing the **Agno framework** for AI agents.
  - `mcp-server/`: Model Context Protocol server for local tool integration (Excalidraw, GitHub, local ideas).
  - `test_obsidian/`: Test environment for Obsidian-like idea management via MCP.
  - `docs/`: Project documentation, quality gates, and evaluation benchmarks.
  - `ai-chats/`: Relevant chat history and research context.

## Tech Stack

| Layer               | Technology                                                     |
| ------------------- | -------------------------------------------------------------- |
| **Frontend**        | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| **Backend (Agents** | Python FastAPI, Agno Framework, Pydantic                       |
| **AI Models**       | AWS Bedrock (Nova Pro/Lite) via Agno                           |
| **Database**        | Supabase (PostgreSQL) with PgVector                            |
| **Authentication**  | Clerk (`@clerk/nextjs`)                                        |
| **Styling**         | Tailwind CSS v4                                                |

## Build, Lint, and Test Commands

### Frontend (forge-app/)

```bash
# Install dependencies
cd forge-app && bun install

# Development server (Port 3000)
bun run dev

# Production build with type checks
bun run build

# Run ESLint
bun run lint

# Seed database
bun run seed
```

### Python Agents (forge-app/agents/)

```bash
cd forge-app/agents

# Setup virtual environment
uv sync

# Run FastAPI server (Port 8321)
uv run uvicorn server:app --port 8321 --reload

# Run end-to-end smoke test
uv run python test_revamp.py
```

### MCP Server (mcp-server/)

```bash
cd mcp-server
npm install && npm run build
npm run dev
```

### Running Single Tests

- **Python smoke tests**: `uv run python test_revamp.py` (runs the full workflow test)
- **Single smoke**: Not test function supported - edit the test file to comment out other calls
- **No formal frontend tests exist** - write tests alongside components if needed

### Environment Variables

Create `forge-app/.env.local`:

```env
AWS_BEARER_TOKEN_BEDROCK=...
AWS_REGION=us-east-1
# Optional:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Code Style Guidelines

### General Principles

- **KISS**: Keep it simple. Avoid over-engineering.
- **Surgical Changes**: Focus on specific tasks without unrelated refactoring.
- **Validation**: Always verify changes by running `bun run lint` and `bun run build`.

### Frontend (Next.js/TypeScript)

**TypeScript**

- Strict mode enabled. Use explicit types, avoid `any`.
- ESLint allows `any` via `@typescript-eslint/no-explicit-any: off` - use sparingly only when type is truly unknown.
- Unused vars are allowed (`@typescript-eslint/no-unused-vars: off`) - clean up when practical.

**Imports**

- Use `@/` path alias for absolute imports (e.g., `@/lib/supabase`, `@/components/Button`)
- Relative imports for sibling files (e.g., `./utils`, `../types`)

**Naming Conventions**

- Components: PascalCase (e.g., `PaperCard.tsx`, `AnalysisFlow.tsx`)
- Hooks: camelCase starting with `use` (e.g., `useAnalysis`, `usePaperData`)
- Utilities: PascalCase for classes, camelCase for functions
- Files: kebab-case for non-component files (e.g., `api-client.ts`, `types.ts`)

**Components**

- Use functional components with React hooks
- Keep components small and focused
- Prefer composition over inheritance
- React hooks rules relaxed (`react-hooks/exhaustive-deps: off`) - use sparingly

**Styling**

- Tailwind CSS v4 utility classes
- Avoid inline styles except for dynamic values
- Use CSS variables for theme colors in `globals.css`

**Routing**

- Use `app/api/*/route.ts` files (App Router)
- API routes proxy to Python backend at `localhost:8321`

### Backend (Python/FastAPI)

**Framework**

- Agno for agent orchestration
- FastAPI for REST endpoints

**Response Format**

- Agents output raw JSON for frontend consumption
- Use Pydantic models for request/response validation

**Models**

- Use `AwsBedrock` for Nova models
- Define agent models in respective modules

**Error Handling**

- Return proper HTTP status codes (200, 400, 422, 500)
- Agno agents reject large payloads (422) - implement retry with minimal payload
- Use try/except blocks for external API calls

**Python Style**

- Follow PEP 8
- Type hints for function signatures
- Use `pydantic` for data validation

### ESLint Configuration

Located at `forge-app/eslint.config.mjs` with these overrides:

- `@typescript-eslint/no-explicit-any`: off
- `@typescript-eslint/no-unused-vars`: off
- `react-hooks/exhaustive-deps`: off
- `react-hooks/set-state-in-effect`: off
- `react-hooks/purity`: off

## API Architecture

### Frontend to Backend Communication

- Frontend calls Next.js API routes (e.g., `/api/analyze`)
- API routes proxy to Agno agents on `localhost:8321`
- Uses Server-Sent Events (SSE) for streaming responses
- Handles 422 errors with retry logic using minimal payload

### Agent Flow

1. **Forge Analyst**: Analyzes paper content and extracts technical essence
2. **Product Architect**: Generates SaaS opportunity based on technical insights
3. **Market Strategist**: Evaluates market potential and competitive landscape

## Common Patterns and Gotchas

### Environment Configuration

- AWS credentials must be properly set in `.env.local`
- Empty AWS credential values will poison boto3 resolution
- Supabase variables optional but required for persistence features

### Error Handling

- Agno agents can reject large payloads (422 error) - implement retry with minimal shape
- Use proper SSE streaming for real-time agent responses
- Handle partial JSON parsing in event streams

### Development Tips

- Run both frontend and backend servers simultaneously
- Use browser dev tools to inspect SSE streams
- Check `docs/evals/mvp_papers.yaml` for test papers
- Monitor `docs/wip-log.md` for current sprint status

## Key Files

| File                                 | Purpose                                 |
| ------------------------------------ | --------------------------------------- |
| `forge-app/app/api/analyze/route.ts` | Proxies requests to Python agent server |
| `forge-app/agents/server.py`         | FastAPI entry point                     |
| `forge-app/agents/workflow.py`       | ForgeFlow orchestration logic           |
| `forge-app/eslint.config.mjs`        | ESLint configuration                    |
| `forge-app/tsconfig.json`            | TypeScript configuration                |

## Commit Guidelines

Follow Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `style:`, `chore:`.
PRs should include clear summaries, linked issues, and verification steps (`lint`, `build`, smoke scripts).
