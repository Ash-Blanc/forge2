// lib/hydrate.ts
// Transforms Supabase snake_case rows into the camelCase ForgePaper shape
// the frontend expects. Keep all DBUI translation in one place.

import type { ForgePaper } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hydratePaper(row: any): ForgePaper {
    return {
        id: row.id,
        arxivId: row.arxiv_id,
        title: row.title,
        abstract: row.abstract ?? "",
        authors: row.authors ?? [],
        published: row.published ?? "",
        status: row.status,

        opportunity: row.opportunity ?? undefined,
        coreInnovation: row.core_innovation ?? undefined,
        targetCustomer: row.target_customer ?? undefined,
        marketSize: row.market_size ?? undefined,
        buildComplexity: row.build_complexity ?? undefined,
        mvpDays: row.mvp_days ?? undefined,
        moatAnalysis: row.moat_analysis ?? undefined,
        tags: row.tags ?? [],
        first90Days: row.first_90_days ?? [],
        narrativeAnalysis: row.narrative_analysis ?? undefined,

        submittedBy: row.submitted_by
            ? { id: row.submitted_by.id, name: row.submitted_by.name, role: row.submitted_by.role }
            : { id: row.submitted_by_id, name: "Unknown", role: "researcher" },

        createdAt: row.created_at,

        followers: (row.followers ?? []).map((f: any) => ({
            userId: f.user_id,
            user: { name: f.user?.name ?? "", role: f.user?.role ?? "researcher" },
        })),

        claims: (row.claims ?? []).map((c: any) => ({
            id: c.id,
            userId: c.user_id,
            status: c.status,
            createdAt: c.created_at,
            user: { name: c.user?.name ?? "", role: c.user?.role ?? "builder" },
            updates: (c.updates ?? []).map((u: any) => ({
                id: u.id,
                text: u.text,
                createdAt: u.created_at,
            })),
        })),

        comments: (row.comments ?? []).map((c: any) => ({
            id: c.id,
            text: c.text,
            createdAt: c.created_at,
            user: {
                id: c.user?.id ?? c.user_id,
                name: c.user?.name ?? "",
                role: c.user?.role ?? "researcher",
            },
        })),
    };
}