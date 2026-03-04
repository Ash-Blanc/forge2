// app/api/analyze/route.ts
import { NextRequest } from "next/server";
import { processForgeWorkflow } from "@/lib/ai/forge";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const body = await req.json();
    if (!body.title || !body.abstract) {
        return new Response(JSON.stringify({ error: "title and abstract required" }), { status: 400 });
    }

    // We use a ReadableStream to stream status updates back to the UI as the Python agents run sequentially
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            const sendDelta = (text: string) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", text })}\n\n`));
            };

            try {
                // We fake a typing effect for the UI during the analysis if we have no inner streaming
                const id = "mock-id-for-now"; // if the paper is entirely ad-hoc from user input

                const opportunity = await processForgeWorkflow(
                    id,
                    body.title,
                    body.abstract,
                    body.authors || [],
                    (delta) => sendDelta(delta) // we pass a delta callback down to the TS orchestrator!
                );

                sendDelta(`\nMarket strategy complete. Finalizing output...\n`);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", analysis: opportunity })}\n\n`));
            } catch (err: any) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`));
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}
