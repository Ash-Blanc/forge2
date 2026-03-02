# FORGE: Task Tracker

Development tasks for FORGE, focused on reliable research analysis workflows.

## Quick Reference

| Command | Description |
|---------|-------------|
| `cd forge-app && bun run dev` | Frontend (localhost:3000) |
| `cd forge-app/agents && uv run uvicorn server:app --port 8321 --reload` | Agent API |
| `cd forge-app && bun run lint` | Lint frontend |
| `cd forge-app && bun run build` | Production build |

## In Progress

- [ ] Improve output rendering for large JSON analysis responses
- [ ] Add stronger backend health/error telemetry in dashboard
- [ ] Harden agent timeout/retry behavior in API routes

## To Do

### Frontend (`forge-app/app/`)
- [ ] Session search/filter for long histories
- [ ] Better structured visualization of agent output by section
- [ ] Export analysis to markdown/json

### Backend (`forge-app/agents/`)
- [ ] Auth integration for protected agent operations
- [ ] Rate limiting and request budgeting
- [ ] Better eval harness for regression testing prompts

### Data / Infra
- [ ] RLS policy refinement for shared deployments
- [ ] Optional persistent session store beyond localStorage

## Done

- [x] Dashboard wired to Agno backend on `localhost:8321`
- [x] Session deletion in dashboard sidebar
- [x] AWS Bedrock OpenAI-compatible model path
- [x] Light theme normalization across main screens

## Priority

### High
1. Stable paper submission flow (arXiv -> analyze -> render)
2. Reliable backend streaming + error handling
3. Session management UX and persistence

### Medium
4. Structured result views and export paths
5. Authentication and access control
6. Evaluation and test coverage

### Low
7. Advanced filtering and search
8. Sharing/collaboration affordances
9. Performance tuning for large responses

## Notes

- Legacy collaboration/feed workflows are intentionally removed from current scope.
- Run both frontend and agent services during development.
