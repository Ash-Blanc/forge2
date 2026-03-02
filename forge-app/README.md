# FORGE App

Next.js frontend and FastAPI agent backend for research-to-SaaS analysis.

## What It Does

- Accepts arXiv IDs/URLs or product prompts
- Streams analysis from Agno agents via API routes
- Stores local dashboard sessions and supports session deletion
- Supports paper mode, SaaS mode, and constellation mode

Deprecated/removed: legacy collaboration/feed workflows.

## Run Locally

### 1) Frontend

```bash
bun install
bun run dev
```

### 2) Agents backend

```bash
cd agents
uv sync
uv run uvicorn server:app --port 8321 --reload
```

## Required Env

In `forge-app/.env.local`:

```env
AWS_BEARER_TOKEN_BEDROCK=...
AWS_REGION=us-east-1
```

Optional:
- Supabase variables for persistence-related API routes

## Notes

- The dashboard calls Next API routes, which proxy to the agents service on `localhost:8321`.
- The model path is AWS Bedrock (OpenAI-compatible API).
