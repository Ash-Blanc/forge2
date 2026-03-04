/**
 * Unit tests for GET and POST /api/papers
 * Mocks the Supabase client so no real DB calls are made.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock Supabase ──────────────────────────────────────────────────────────
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockUpsert = vi.fn();

const createBuilderChain = (finalData: unknown, finalError: null | { message: string } = null) => {
    const chain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        single: vi.fn().mockResolvedValue({ data: finalData, error: finalError }),
        then: (resolve: (v: any) => any) =>
            Promise.resolve({ data: finalData, error: finalError }).then(resolve),
    };
    return chain;
};

vi.mock("@/lib/supabase", () => ({
    db: {
        from: vi.fn().mockImplementation((table: string) => {
            if (table === "papers") {
                return createBuilderChain([
                    {
                        id: "paper-1",
                        title: "Test Paper",
                        abstract: "Abstract",
                        authors: ["Author"],
                        published: "2024-01-01",
                        status: "unclaimed",
                        submitted_by: null,
                        followers: [],
                        claims: [],
                        comments: [],
                    },
                ]);
            }
            return createBuilderChain(null);
        }),
    },
}));

vi.mock("@/lib/hydrate", () => ({
    hydratePaper: vi.fn().mockImplementation((p: any) => p),
}));

vi.mock("@/lib/seed", () => ({
    seedIfEmpty: vi.fn().mockResolvedValue(undefined),
}));

// ── Helpers ────────────────────────────────────────────────────────────────
async function doGet(query = "") {
    const { GET } = await import("@/app/api/papers/route");
    const urlStr = `http://localhost/api/papers${query}`;
    const req = new Request(urlStr) as any;
    req.nextUrl = new URL(urlStr);
    return GET(req);
}

async function doPost(body: Record<string, unknown>) {
    const { POST } = await import("@/app/api/papers/route");
    const req = new Request("http://localhost/api/papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return POST(req as any);
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe("GET /api/papers", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns 200 with an array of papers", async () => {
        const res = await doGet();
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(Array.isArray(json)).toBe(true);
    });
});

describe("POST /api/papers", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns 400 when userId is missing", async () => {
        const res = await doPost({
            meta: { title: "t", abstract: "a" },
            analysis: { paperAnalysis: {} },
        });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toMatch(/missing/i);
    });

    it("returns 400 when meta is missing", async () => {
        const res = await doPost({
            userId: "user-1",
            analysis: { paperAnalysis: {} },
        });
        expect(res.status).toBe(400);
    });

    it("returns 400 when analysis is missing", async () => {
        const res = await doPost({
            userId: "user-1",
            meta: { title: "t", abstract: "a" },
        });
        expect(res.status).toBe(400);
    });
});
