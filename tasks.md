# 📋 FORGE: Task Tracker

This document tracks development tasks for FORGE — an AI platform that distills arXiv papers into actionable SaaS opportunities.

## Current Strategy

We iterate on pipelines and agents in the **Streamlit prototype** before finalizing in the full-stack-web app.

---

## Streamlit Prototype (`streamlit-prototype/`)

### Pipeline Iteration

- [ ] **Refine arXiv ingestion** - Handle edge cases (invalid IDs, rate limiting, missing abstracts)
- [ ] **Improve agent prompts** - Test different system prompts for better SaaS blueprints
- [ ] **Add model options** - Support multiple LLMs (Cerebras, Anthropic, OpenAI)
- [ ] **Enhance output parsing** - Handle malformed JSON from agent responses
- [ ] **Add paper search** - Allow searching by keywords, not just arXiv ID
- [ ] **Batch processing** - Analyze multiple papers and compare outputs

### UI/UX Improvements

- [ ] **Better loading states** - Show detailed progress during analysis
- [ ] **Export options** - Download blueprint as PDF/Markdown
- [ ] **History** - Save and revisit previous analyses
- [ ] **Comparison view** - Side-by-side comparison of multiple paper analyses

### Testing

- [ ] **Add pytest tests** - Test arXiv fetching, prompt building, JSON parsing
- [ ] **Test with diverse papers** - Math-heavy, architecture-heavy, survey papers
- [ ] **Prompt evaluation** - Measure output quality with different prompts

---

## Full-Stack Web App (`full-stack-web/`)

### Python Agent Service (`agents/`)

- [ ] **Migrate agent from Streamlit** - Port the Agno agent logic to FastAPI
- [ ] **Add Supabase storage** - Save paper analyses to database
- [ ] **API endpoints**:
  - `POST /analyze` - Submit arXiv ID for analysis
  - `GET /analyses` - List user's analyses
  - `GET /analyses/:id` - Get specific analysis
- [ ] **Add authentication** - Secure agent endpoints

### Frontend (`app/`)

- [ ] **Dashboard improvements** - Show paper feed with filters
- [ ] **Paper detail view** - Full analysis display matching Streamlit output
- [ ] **Claim & build workflow** - Allow users to claim ideas and track progress
- [ ] **Social features** - Comments, follows, build updates
- [ ] **User profiles** - Show user's claimed ideas and contributions

### Database

- [ ] **Design schema** - Users, papers, claims, updates, comments tables
- [ ] **Add RLS policies** - Secure row-level security
- [ ] **Seed data** - Populate with example analyses

### Testing

- [ ] **Add Vitest** - Set up frontend testing framework
- [ ] **Add pytest** - Test FastAPI endpoints
- [ ] **E2E tests** - Critical user flows

---

## Environment Setup

### Streamlit Prototype
```bash
cd streamlit-prototype
pip install -r requirements.txt
streamlit run app.py
```

### Full-Stack Web
```bash
cd full-stack-web
npm install
npm run dev  # Frontend on :3000

cd agents
pip install -r requirements.txt
uvicorn server:app --port 8321 --reload  # Agent API on :8321
```

---

## Running Tests

### Python (prototype)
```bash
cd streamlit-prototype
pytest -v
```

### Frontend (when configured)
```bash
cd full-stack-web
npm test -- --run
```

### Agent API (when configured)
```bash
cd full-stack-web/agents
pytest -v
```

---

## Priority Order

1. **Immediate**: Refine agent prompts and fix parsing in Streamlit prototype
2. **Short-term**: Add model options, export, and history to prototype
3. **Medium-term**: Design database schema, build FastAPI agent service
4. **Long-term**: Full frontend with social features, migrate from prototype
