/**
 * Unit tests for POST /api/analyze
 * Mocks processForgeWorkflow so no real agent calls are made.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock("@/lib/ai/forge", () => ({
    processForgeWorkflow: vi.fn().mockResolvedValue({
        opportunity: "Test SaaS idea",
        coreInnovation: "Core breakthrough",
        targetCustomer: "Developers",
        marketSize: "Large",
        buildComplexity: "medium",
        mvpDays: 45,
        moatAnalysis: "Strong moat",
        tags: ["AI", "SaaS"],
        first90Days: ["Launch MVP"],
        narrativeAnalysis: "Test narrative",
    }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────
async function callRoute(body: Record<string, unknown>) {
    const { POST } = await import("@/app/api/analyze/route");
    const req = new Request("http://localhost/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return POST(req as any);
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe("POST /api/analyze", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns 400 when title is missing", async () => {
        const res = await callRoute({ abstract: "some abstract" });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toMatch(/title|abstract/i);
    });

    it("returns 400 when abstract is missing", async () => {
        const res = await callRoute({ title: "Some Title" });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toMatch(/title|abstract/i);
    });

    it("returns a streaming SSE response for valid input", async () => {
        const res = await callRoute({
            title: "Attention Is All You Need",
            abstract: "We propose a new architecture called the Transformer...",
            authors: ["Vaswani et al."],
        });

        // Should be 200 (streaming)
        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toContain("text/event-stream");
    });
});
