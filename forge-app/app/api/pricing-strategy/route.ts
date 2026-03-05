import { NextRequest } from "next/server";
import { proxyStreamWithRetry } from "@/lib/ai/stream-proxy";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const body = await req.json();

    if (!body.analysis) {
        return new Response(JSON.stringify({ error: "Blueprint analysis is required" }), { status: 400 });
    }

    const prompt = `Based on the following SaaS product blueprint:
    
Opportunity: ${body.analysis.opportunity}
Target Customer: ${body.analysis.targetCustomer}
Market Size: ${body.analysis.marketSize}

Your task is to generate an optimal SaaS pricing strategy.
1. Determine the appropriate pricing model (Flat-rate, Usage-based, Tiered, or Freemium).
2. Recommend 2-3 specific tiers with proposed monthly/annual price points.
3. Briefly explain why this pricing aligns with the target customer and market size.
4. List 2 similar real-world SaaS products and their pricing as benchmarks.

Return your strategy clearly. You do not have to strictly return JSON, you can return a structured markdown text outlining the proposed strategy.`;

    try {
        return await proxyStreamWithRetry({
            agentId: "product-architect", // Uses product architect for pricing
            message: prompt,
            route: "/api/pricing-strategy",
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
