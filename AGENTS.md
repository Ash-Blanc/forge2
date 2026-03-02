# Repository Guidelines

## Project Structure & Module Organization
FORGE is organized around one active app and shared docs:
- `forge-app/`: Main Next.js 16 + React 19 product (App Router)
  - `app/` routes and API handlers (`app/api/*/route.ts`)
  - `components/` UI components
  - `lib/` typed utilities
  - `agents/` FastAPI service used by analysis routes
- `docs/`: project docs and archived planning material

## Build, Test, and Development Commands
Primary workflow uses Bun for web and `uv` for Python.

```bash
cd forge-app
bun install
bun run dev      # Next.js dev server on :3000
bun run build    # production build + type checks
bun run lint     # ESLint (Next core-web-vitals + TS)
```

```bash
cd forge-app/agents
uv sync
uv run uvicorn server:app --port 8321 --reload
```

## Coding Style & Naming Conventions
- TypeScript is strict (`tsconfig.json` has `"strict": true`); avoid `any`
- Use 4-space indentation and semicolon-terminated TS statements
- Components: `PascalCase.tsx`; helpers/lib files: `camelCase` or domain names
- Use `@/*` import alias for app-internal imports in `forge-app`
- Run `bun run lint` before opening a PR

## Testing Guidelines
Current checks are:
- Web quality gate: `bun run lint` and `bun run build`
- Python smoke: targeted scripts in `forge-app/agents/`

When adding tests, keep names `test_<feature>.py` (Python) or `<feature>.test.ts(x)` (web), and place them near the code they validate.

## Commit & Pull Request Guidelines
Follow Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `style:`, `chore:`.

PRs should include:
- clear summary of behavior changes
- linked issue/task
- local verification steps run (`lint`, `build`, smoke script)
- screenshots for UI changes (landing/dashboard/onboarding)

## Security & Configuration Tips
- Never commit `.env*` files or API keys
- Required local vars live in `forge-app/.env.local`
- Treat `NEXT_PUBLIC_*` as client-visible; do not store secrets in those variables
