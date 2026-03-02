# FORGE Agents Backend

Modular Agno-powered backend for research paper analysis and SaaS commercialization strategy.

## 🚀 Overview

This backend uses a 3-agent orchestration flow to transform academic research into actionable business plans.

### 🤖 The 3-Agent Flow (`ForgeFlow`)
1.  **Forge Analyst**: Extracts the "Core Breakthrough" and technical essence from an arXiv paper.
2.  **Product Architect**: Brainstorms 3-5 distinct SaaS startup or feature directions from the breakthrough.
3.  **Market Strategist**: Refines the best idea with competitor research, MVP scope, and GTM strategy.

## 📁 Directory Structure

```text
agents/
├── server.py           # Main AgentOS entry point (Port 8321)
├── core.py             # Agent definitions (Analyst, Architect, Strategist)
├── workflow.py         # Orchestration (ForgeFlow)
├── models.py           # Model factory (AWS Bedrock only)
├── prompts/            # Specialized LLM instructions
│   ├── analyst.py
│   ├── architect.py
│   └── strategist.py
├── tools/              # Custom Agno toolkits
│   ├── arxiv.py        # Context-optimized Arxiv search
│   └── scholar.py      # Semantic Scholar API integration
├── lib/                # Shared utilities
│   ├── parsers.py      # JSON parsing and repair logic
│   └── hooks.py        # Agno post-hooks (e.g., vector indexing)
└── knowledge.py        # Vector Database (Supabase PgVector) integration
```

## 🛠️ Setup & Running

### Prerequisites
- Python 3.10+
- `uv` (recommended) or `pip`

### 1. Install Dependencies
```bash
uv sync
```

### 2. Configure Environment
Ensure `.env.local` exists in `forge-app/` with:
- `AWS_BEARER_TOKEN_BEDROCK`
- `AWS_REGION`
- `SUPABASE_DB_URL` (for PgVector)
- `PARALLEL_API_KEY` (optional, for advanced web research)

### 3. Start the Server
```bash
uv run python server.py
```
The server will start on `http://localhost:8321`.

## 🧪 Testing

Run an end-to-end flow test for a specific paper:
```bash
uv run python test_revamp.py
```

## 📜 Development Guidelines

- **JSON Only**: All agents are configured to output raw JSON for seamless frontend integration.
- **Traceability**: Every recommendation must be linked back to the "Core Breakthrough" extracted by the Analyst.
- **Tools**: Use `DuckDuckGoTools` as a fallback for web search if `ParallelTools` is unavailable.
