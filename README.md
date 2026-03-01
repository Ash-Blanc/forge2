# FORGE

An AI-powered platform that distills complex academic papers (arXiv) into actionable SaaS opportunities with NOVA scores.

## What Does FORGE Do?

1. **Submit an arXiv paper** - Users paste a paper ID (e.g., `2310.12345`)
2. **AI Analysis** - Claude analyzes the paper to extract:
   - Target customers
   - Total Addressable Market (TAM)
   - MVP timeline estimate
   - Competitive moats
   - NOVA composite score
3. **Browse & Claim** - Users browse analyzed ideas, claim them, and track building progress from "Open" → "Building" → "Launched"

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh)
- [uv](https://docs.astral.sh/uv/)
- Supabase account
- Anthropic API key

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/your-org/forge.git
cd forge

# 2. Set up frontend
cd full-stack-web
cp .env.local.example .env.local
# Edit .env.local with your keys

bun install
bun run dev

# 3. Set up Python agent service
cd agents
uv venv
source .venv/bin/activate
uv add -r requirements.txt
uv run uvicorn server:app --port 8321 --reload
```

Visit **http://localhost:3000**

---

## Project Structure

```
forge/
├── full-stack-web/          # Main Next.js application
│   ├── app/                  # App Router pages
│   ├── components/           # React components
│   ├── lib/                  # Utilities (Supabase, types, API clients)
│   └── agents/               # Python FastAPI agent service
│
├── streamlit-prototype/      # Python prototype for rapid iteration (use uv)
│
├── docs/                     # Documentation and historical notes
│   ├── AGENTS.md             # Developer guide
│   └── archive/              # Original project vision
│
├── tasks.md                  # Task tracker
└── CONTRIBUTING.md            # Contributor guidelines
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Package Manager | Bun (JS), uv (Python) |
| Frontend | Next.js 16, React 19, Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) |
| AI | Anthropic Claude (via Agno framework) |
| Agent API | Python FastAPI |
| Prototyping | Streamlit |

---

## Useful Commands

```bash
# Frontend development
bun run dev          # Start dev server (localhost:3000)
bun run build        # Production build
bun run lint         # Lint code

# Python agent
cd agents
uv run uvicorn server:app --port 8321 --reload

# Streamlit prototype
cd streamlit-prototype
uv run streamlit run app.py

# Database
bun run seed         # Seed database with sample data
```

---

## Environment Variables

Create `full-stack-web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_anon_key
ANTHROPIC_API_KEY=your_anthropic_key
```

---

## Getting Help

- Check [docs/AGENTS.md](./docs/AGENTS.md) for detailed developer docs
- See [tasks.md](./tasks.md) for what needs doing
- Read [CONTRIBUTING.md](./CONTRIBUTING.md) to contribute
