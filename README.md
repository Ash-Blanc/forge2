# FORGE / research → reality ⬡

FORGE is an AI-powered platform that distills complex academic papers (via arXiv) into actionable SaaS opportunities for builders, researchers, and investors. The platform evaluates ideas based on market fit, build complexity, and innovation, giving each a composite NOVA score.

Users can browse a feed of AI-analyzed ideas, claim them to start building, and share their progress from "Open" to "Building" to "Launched".

## Features

- **AI-Powered Analysis**: The FORGE Python Agent uses Anthropic's Claude (via the Agno framework) to analyze academic papers, extracting target customers, TAM, MVP timelines, and competitive moats.
- **Idea Feed**: Browse and filter ideas by status (Open, Building, Launched).
- **Claim & Build**: Claim a promising SaaS opportunity, post regular build updates, and track progress.
- **Social Interaction**: Comment on ideas and follow builders' journeys.

## Tech Stack

- **Frontend**: [Next.js](https://nextjs.org) (App Router), React 19, Tailwind CSS v4
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, automatic API)
- **AI Agents**: Python, [Agno Framework](https://github.com/agno-agi/agno), FastAPI
- **LLM**: Anthropic Claude 3.5 Sonnet

## Getting Started

### Prerequisites

- Node.js & `npm` / `yarn` / `bun`
- Python 3.10+
- Supabase account (or local Supabase setup)
- Anthropic API Key (for the Agno agent)

### 1. Environment variables

Copy `.env.example` to `.env.local` and fill in your keys:

```bash
cp .env.example .env.local
```

### 2. Setup the Next.js Web App

Install the frontend dependencies and run the development server:

```bash
npm install
# or bun install

npm run dev
# or bun dev
```

The web app will be available at [http://localhost:3000](http://localhost:3000).

### 3. Setup the Python Agent Service

The AI agent runs as a separate FastAPI service. Navigate to the `agents` directory, install dependencies, and start the server:

```bash
cd agents
pip install -r requirements.txt
uvicorn server:app --port 8321 --reload
```
*(Alternatively, you can run `npm run agents` from the root directory).*

### 4. Database Schema Update

Ensure your Supabase database is up to date with the types. You can generate types using the CLI:

```bash
npm run db:types
```

## Contributing

Contributions are welcome! Please check out the issues or submit a pull request if you have ideas on how to improve the NOVA scoring algorithm or add new data sources beyond arXiv.
