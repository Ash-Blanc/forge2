# 📋 FORGE: Task Tracker

Development tasks for FORGE — an AI platform that distills arXiv papers into actionable SaaS opportunities.

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Frontend (localhost:3000) |
| `cd agents && uvicorn server:app --port 8321 --reload` | Python Agent API |
| `npm run lint` | Lint frontend |
| `npm run build` | Production build |

---

## 🚧 In Progress

- [ ] Dashboard page with paper feed
- [ ] Paper detail view with NOVA scores (Powered by Amazon Nova Pro Multimodal)
- [ ] Submit modal for new arXiv papers (Trigger PDF analysis)

---

## 📋 To Do

### Frontend (`full-stack-web/app/`)

**Pages**
- [ ] Dashboard page - paper feed with filters
- [ ] Paper detail view - full analysis display
- [ ] Onboarding flow for new users

**Components**
- [ ] PaperCard - display paper info + NOVA score
- [ ] DetailPanel - show full analysis
- [ ] SubmitModal - input arXiv ID for analysis
- [ ] StatusBadge - Open/Building/Launched states
- [ ] FilterBar - filter by status, score, date

**Features**
- [ ] Claim & build workflow
- [ ] Build updates (progress tracking)
- [ ] User profiles

### Backend (`full-stack-web/agents/`)

- [ ] `POST /analyze` - Submit arXiv ID for analysis (Nova Pro Multimodal PDF analysis)
- [ ] `GET /papers` - List analyzed papers
- [ ] `GET /papers/:id` - Get specific analysis
- [ ] Authentication for protected endpoints
- [ ] Rate limiting (Amazon Bedrock quotas)
- [ ] **Migration**: Move to OpenAI-compatible Bedrock API once Nova models are supported (ref: docs/issues/nova_openai_compatibility_issue.md)

### Database (`Supabase`)

- [ ] Users table
- [ ] Papers table (arXiv data + analysis)
- [ ] Claims table (user → paper)
- [ ] Updates table (build progress)
- [ ] RLS policies

### Streamlit Prototype (`streamlit-prototype/`)

- [ ] Maintain feature parity with agent backend
- [ ] Test new prompt iterations here first

---

## ✅ Done

### Foundation
- [x] Next.js 16 setup with Tailwind CSS v4
- [x] Supabase client configuration
- [x] TypeScript types for papers
- [x] arXiv API integration
- [x] Python FastAPI agent service

### Initial Features
- [x] Landing page
- [x] Basic dashboard layout
- [x] Claude API integration for analysis

---

## Priority Order

### High
1. Paper submission flow (arXiv → analyze → display)
2. Dashboard with paper feed
3. NOVA score display

### Medium
4. Claim & build tracking
5. User authentication
6. Build updates/comments

### Low
7. Social features (follow, share)
8. Advanced filtering
9. Export options

---

## Testing

Not yet configured. To add:

```bash
# Frontend
npm install -D vitest @testing-library/react

# Python
pip install pytest
```

---

## Notes

- Run both frontend (`npm run dev`) and agent (`uvicorn server:app --port 8321`) for full functionality
- Use `npm run lint` and `npm run build` before committing
- Check `.env.local.example` for required environment variables
