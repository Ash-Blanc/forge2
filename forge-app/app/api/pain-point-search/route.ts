import { NextRequest } from "next/server";
import { proxyStreamWithRetry } from "@/lib/ai/stream-proxy";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const body = await req.json();

    if (!body.problem) {
        return new Response(JSON.stringify({ error: "Pain point/problem description required" }), { status: 400 });
    }

    const prompt = `A user has described the following raw problem/pain point:

"${body.problem.trim()}"

Your task:
1. Search arXiv (or Semantic Scholar) for 3-5 recent papers (2023-2026) that provide methodologies, algorithms, or breakthroughs that could solve this exact problem.
2. For each paper, provide a concise summary of the abstract.
3. Explain HOW this paper's technique can directly address the user's pain point.

Return the list of papers and their relevance formatted clearly in Markdown.`;

    try {
        return await proxyStreamWithRetry({
            agentId: "forge-analyst", // The analyst has access to arxiv and semantic scholar tools
            message: prompt,
            route: "/api/pain-point-search",
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
