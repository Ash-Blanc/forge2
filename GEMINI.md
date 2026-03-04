# GEMINI.md - FORGE Context & Instructions

This file serves as the primary instructional context for Gemini CLI when working on the FORGE project. It takes precedence over general defaults.

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

| Layer                | Technology                                                     |
| -------------------- | -------------------------------------------------------------- |
| **Frontend**         | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| **Backend (Agents)** | Python FastAPI, Agno Framework, Pydantic                       |
| **AI Models**        | AWS Bedrock (Nova Pro/Lite) via Agno                           |
| **Database**         | Supabase (PostgreSQL) with PgVector                            |
| **Authentication**   | Clerk (`@clerk/nextjs`)                                        |
| **Styling**          | Tailwind CSS v4                                                |

## Building and Running

### Prerequisites

- **Bun**: Modern JavaScript runtime and package manager (preferred over npm).
- **uv**: Fast Python package manager (preferred over pip).
- **AWS Bedrock**: Configured access for Nova models.

### Setup

#### Web Application (`forge-app/`)

- `cd forge-app`
- `bun install`: Install dependencies.
- `bun run dev`: Start Next.js development server with Turbopack (Port 3000).
- `bun run build`: Build for production and run type checks.
- `bun run lint`: Run ESLint.
- `bun run seed`: Seed the database via API endpoint.

#### Python Agents Backend (`forge-app/agents/`)

- `cd forge-app/agents`
- `uv sync`: Setup virtual environment and install dependencies.
- `uv run uvicorn server:app --port 8321 --reload`: Start the FastAPI server (Port 8321).
- **End-to-End Test**: `uv run python test_revamp.py`.

#### MCP Server (`mcp-server/`)

- `cd mcp-server`
- `npm install && npm run build`: Setup and build the server.
- `npm run dev`: Run the server in development mode.

### Environment Variables

Ensure `forge-app/.env.local` is configured with:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
# Optional:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Development Conventions

### General Principles

- **KISS**: Keep it simple. Avoid over-engineering.
- **Surgical Changes**: Focus on specific tasks without unrelated refactoring.
- **Validation**: Always verify changes by running `bun run lint` and `bun run build`.

### Frontend (Next.js/TypeScript)

- **TypeScript**: Strict mode enabled. Use explicit types, avoid `any`.
- **Imports**: Use `@/` path alias (e.g., `@/lib/supabase`).
- **Components**: PascalCase (e.g., `PaperCard.tsx`).
- **Styling**: Tailwind CSS v4 utility classes.
- **State Management**: React hooks; prefer functional components.

### Backend (Python/FastAPI)

- **Framework**: Agno for agent orchestration.
- **Response Format**: Agents are configured to output raw JSON for frontend consumption.
- **Models**: Primarily use `AwsBedrock` for Nova models.
- **Tracing**: Recommendations must link back to the technical essence extracted from papers.

### Testing

- **Frontend Strategy**: Keep tests (`<feature>.test.ts(x)`) near the code they validate.
- **Python Strategy**: Use `test_<feature>.py` smoke scripts.
- **Quality Gate**: Refer to `docs/evals/mvp_gate.md` for MVP requirements.

## Key Files

- `forge-app/app/api/analyze/route.ts`: Proxies requests to the Python agent server.
- `forge-app/agents/server.py`: FastAPI entry point.
- `forge-app/agents/workflow.py`: Orchestration logic for `ForgeFlow`.
- `AGENTS.md`: Detailed developer guidelines and module organization.
- `docs/wip-log.md`: Active sprint tracking.
