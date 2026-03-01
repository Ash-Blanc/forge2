# AGENTS.md - Developer Guide for FORGE

## Overview

FORGE is an AI-powered platform that distills complex academic papers (via arXiv) into actionable SaaS opportunities. The tech stack includes:
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL), FastAPI Python agents
- **AI**: Anthropic Claude via Agno framework

---

## Build Commands

### Frontend (Next.js)
```bash
cd full-stack-web

# Install dependencies
npm install

# Development server (with Turbopack)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint code (ESLint)
npm run lint

# Seed database
npm run seed
```

### Python Agent Service
```bash
cd full-stack-web/agents

# Install dependencies
pip install -r requirements.txt

# Run the agent server
uvicorn server:app --port 8321 --reload

# Or from root with npm
npm run agents  # if configured
```

### Running a Single Test
This project does **not** currently have a test framework configured. Tests should be added using:
- **Frontend**: Vitest or Jest with React Testing Library
- **Python**: pytest

To add tests:
```bash
# Frontend - add Vitest
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom

# Python - ensure pytest
pip install pytest
```

Run a single test when configured:
```bash
# Vitest
npm test -- --run --reporter=verbose path/to/testfile.test.ts

# pytest
pytest path/to/test_file.py -v
```

---

## Code Style Guidelines

### General Principles

- **Keep code simple** - Avoid unnecessary abstraction unless explicitly needed
- **Use descriptive names** - Variables and functions should clearly convey purpose
- **Handle errors explicitly** - Throw meaningful errors with context, never silently fail

### TypeScript

- **Always use TypeScript** - No plain JavaScript files except configuration
- **Enable strict mode** - The project uses `"strict": true` in tsconfig.json
- **Define explicit types** - Avoid `any`, use proper interfaces/types
- **Use path aliases** - Import using `@/` prefix (e.g., `import { db } from "@/lib/supabase"`)

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `PaperCard.tsx`, `DetailPanel.tsx` |
| Pages (App Router) | `page.tsx` in directory | `app/dashboard/page.tsx` |
| Utilities/Lib | camelCase or kebab-case | `supabase.ts`, `arxiv.ts` |
| UI Components | PascalCase in folders | `components/ui/Button.tsx` |

### Component Structure

Follow the Next.js App Router conventions:
- Server Components by default (no "use client" directive)
- Add "use client" only when hooks are needed
- Co-locate related files when possible
- Use proper metadata exports for SEO

### Imports

```typescript
// External packages
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// Path alias (recommended)
import { db, type DBUser } from "@/lib/supabase";

// Relative imports (when not using alias)
import { ForgePaper } from "../lib/types";

// CSS
import "./globals.css";
```

### Tailwind CSS v4

- Use CSS variables defined in `app/globals.css` for theming
- Common pattern: `className="text-accent bg-surface hover:bg-border"`
- Avoid hardcoded colors - use design system variables
- Use `clamp()` for responsive typography

### React Patterns

- Use functional components with arrow functions or `function` declarations
- Prefer composition over inheritance
- Extract custom hooks for reusable logic
- Use early returns for conditional rendering

### Error Handling

```typescript
// Good - descriptive error with context
if (!url || !key) {
    throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY — check .env.local"
    );
}

// Good - try/catch with user-friendly messages
try {
    const { data, error } = await db.from("papers").select("*");
    if (error) throw error;
    return data;
} catch (e) {
    console.error("Failed to fetch papers:", e);
    throw new Error("Unable to load papers. Please try again.");
}
```

### Python (Agents)

- Follow PEP 8 style guidelines
- Use type hints for function signatures
- Use async/await for I/O operations
- Follow the existing pattern in `agents/server.py`

---

## Project Structure

```
/home/ab916/src/forge2/
├── full-stack-web/           # Next.js frontend
│   ├── app/                  # App Router pages
│   │   ├── api/              # API routes
│   │   ├── dashboard/        # Dashboard page
│   │   ├── onboarding/       # Onboarding page
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Landing page
│   │   └── globals.css       # Global styles + CSS variables
│   ├── components/           # React components
│   │   ├── ui/               # Reusable UI components
│   │   ├── PaperCard.tsx
│   │   ├── DetailPanel.tsx
│   │   └── SubmitModal.tsx
│   ├── lib/                  # Utility functions
│   │   ├── supabase.ts       # Supabase client
│   │   ├── types.ts          # TypeScript types
│   │   ├── arxiv.ts
│   │   └── claude.ts
│   ├── agents/               # Python FastAPI agent
│   │   ├── server.py
│   │   └── requirements.txt
│   └── package.json
├── streamlit-prototype/      # Python Streamlit prototype
│   ├── app.py
│   └── pyproject.toml
└── docs/archive/project_vision.md # Original project vision
```

---

## Environment Variables

Create `.env.local` in `full-stack-web/` with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# AI (for agents)
ANTHROPIC_API_KEY=your_anthropic_key
```

---

## IDE Recommendations

- **VS Code** with TypeScript and Tailwind CSS IntelliSense
- Enable "Format on Save" for consistent formatting
- Use ESLint extension for real-time linting feedback
