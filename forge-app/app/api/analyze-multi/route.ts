import { NextRequest } from "next/server";
import { proxyStreamWithRetry } from "@/lib/ai/stream-proxy";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const body = await req.json();

    if (!body.papers || !Array.isArray(body.papers) || body.papers.length === 0) {
        return new Response(JSON.stringify({ error: "Array of related papers is required" }), { status: 400 });
    }

    const papersContext = body.papers.map((p: any, i: number) => 
        `Paper ${i+1}: ${p.title}\nAbstract: ${p.abstract}`
    ).join("\n\n");

    const prompt = `I have the following related research papers:

${papersContext}

Your task is to perform a multi-paper synthesis and generate a unified SaaS blueprint.
Blend the technical breakthroughs of all these papers into a single coherent product vision.
Return a structured output evaluating:
1. Core Unified Innovation
2. Target Customer Profile addressing multiple papers
3. Market Size
4. Multi-layered Defensibility Moat

Return ONLY valid JSON mapping these fields as if it were a standard ForgeAnalysis.`;

    try {
        return await proxyStreamWithRetry({
            agentId: "product-architect",
            message: prompt,
            route: "/api/analyze-multi", // Custom route identifier
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
