/**
 * Unit tests for GET /api/arxiv and related input validation.
 * Uses a NextRequest-compatible mock so req.nextUrl.searchParams works.
 */
import { describe, it, expect, vi } from "vitest";

// ── Mock arxiv lib ─────────────────────────────────────────────────────────
vi.mock("@/lib/arxiv", () => ({
    fetchArxivMeta: vi.fn().mockImplementation(async (id: string) => {
        if (id === "bad-id") throw new Error("Not found on arXiv");
        return {
            title: "Test Paper",
            abstract: "Abstract text",
            authors: ["Author One"],
            published: "2024-01-01",
        };
    }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────
/** Build a mock that looks like NextRequest to the route handler */
function makeNextReq(urlStr: string) {
    const url = new URL(urlStr);
    const req = new Request(urlStr) as any;
    req.nextUrl = url;
    return req;
}

async function callRoute(searchParams: string) {
    const { GET } = await import("@/app/api/arxiv/route");
    return GET(makeNextReq(`http://localhost/api/arxiv${searchParams}`));
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe("GET /api/arxiv", () => {
    it("returns 400 when id param is missing", async () => {
        const res = await callRoute("");
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toMatch(/missing id/i);
    });

    it("returns 422 when arXiv fetch throws", async () => {
        const res = await callRoute("?id=bad-id");
        expect(res.status).toBe(422);
        const json = await res.json();
        expect(json.error).toBeTruthy();
    });

    it("returns paper metadata for a valid id", async () => {
        const res = await callRoute("?id=2312.00001");
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.title).toBe("Test Paper");
        expect(json.authors).toHaveLength(1);
    });
});
