# Repository Guidelines

## Project Structure & Module Organization
- `forge-app/`: Next.js 16 frontend (App Router, React 19, TypeScript, Tailwind v4).
- `forge-app/app/api/*/route.ts`: API proxy routes that forward requests to the agent backend.
- `forge-app/agents/`: FastAPI + Agno orchestration (`server.py`, `workflow.py`).
- `mcp-server/`: MCP tooling and integrations.
- `docs/`: architecture notes, evals, migration docs.
- `ai-chats/`: research/chat context artifacts.
- `test_obsidian/`: local MCP testing sandbox.

## Build, Test, and Development Commands
- Frontend setup: `cd forge-app && bun install`
- Frontend dev server: `bun run dev` (default `http://localhost:3000`)
- Frontend quality checks: `bun run lint` and `bun run build`
- Seed app data: `bun run seed`
- Agent service setup: `cd forge-app/agents && uv sync`
- Agent service run: `uv run uvicorn server:app --port 8321 --reload`
- End-to-end smoke test: `uv run python test_revamp.py`

## Coding Style & Naming Conventions
- TypeScript is strict; prefer explicit types and small, focused components.
- Imports: use `@/` aliases for app-level modules (example: `@/lib/supabase`).
- Naming: components `PascalCase.tsx`, hooks `useX`, utility files `kebab-case.ts`.
- Python: PEP 8, type hints, Pydantic models for I/O validation.
- Styling: Tailwind utilities; keep inline styles for dynamic values only.

## Testing Guidelines
- Frontend has lint/build gates instead of a full test suite; run both before PRs.
- Backend validation relies on smoke flow tests in `forge-app/agents/test_revamp.py`.
- When adding features, include targeted tests near changed code when practical.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- Keep commits focused and atomic; avoid unrelated refactors.
- PRs should include: concise summary, linked issue (if any), verification steps (`lint`, `build`, smoke), and screenshots for UI changes.

## Security & Configuration Tips
- Configure `forge-app/.env.local` for AWS Bedrock and Supabase.
- Use Supabase service role key (JWT starting with `ey...`) for server-side operations.
- Do not commit secrets; verify `.env*` values locally before running migrations/seeding.
