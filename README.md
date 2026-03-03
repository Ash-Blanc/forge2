# 🚀 FORGE

**Turn research papers or product ideas into full SaaS blueprints — powered by AI agents in minutes!**

## Why Forge? 🔥

- From idea/paper to blueprint **fast** — No more endless reading or blank-page syndrome
- AI agents do the heavy thinking — Agno + FastAPI + Bedrock = deep, structured analysis
- Live streaming dashboard — Watch ideas form in real-time (feels magical!)
- Save & revisit sessions — Build on previous blueprints, delete when done
- Hackathon-proven — Quick setup, modern stack, ready for demos

Perfect for: turning academic papers into startups, brainstorming MVPs, or impressing judges with AI depth.

## Current Product Scope

1. **Ingest input**: arXiv ID/URL or product idea
2. **Run analysis**: Agno-backed FastAPI agents process the request
3. **Review output**: Dashboard shows streamed analysis and saved session history
4. **Manage sessions**: Create, revisit, and delete analysis sessions

Note: legacy collaboration/feed workflows are removed from the current product scope.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh)
- [uv](https://docs.astral.sh/uv/)
- AWS Bedrock access

### Setup

```bash
# 1) Clone
git clone https://github.com/Ash-Blanc/forge.git
cd forge

# 2) Web app
cd forge-app
bun install
bun run dev

# 3) Agent backend (new terminal)
cd forge-app/agents
uv sync
uv run uvicorn server:app --port 8321 --reload
```

Web app: `http://localhost:3000`

## Structure

```text
forge/
├── forge-app/              # Next.js app + API routes + agents backend
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── agents/
├── docs/
├── tasks.md
└── CONTRIBUTING.md
```

## Tech Stack

- Frontend: Next.js 16, React 19, Tailwind CSS v4
- Agents API: FastAPI + Agno
- Model runtime: AWS Bedrock via OpenAI-compatible endpoint
- Data: Supabase (for persisted app data)

## Environment Variables

Set `forge-app/.env.local` at minimum with:

```env
AWS_BEARER_TOKEN_BEDROCK=...
AWS_REGION=us-east-1
```

Add Supabase vars if you are using persistence features.
