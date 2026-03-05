import { NextRequest, NextResponse } from "next/server";
import { ForgeAnalysis } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const { analysis } = await req.json() as { analysis: Partial<ForgeAnalysis> };
        
        if (!analysis || !analysis.opportunity) {
            return NextResponse.json({ error: "Missing required analysis data" }, { status: 400 });
        }

        // Generate a minimal landing page using inline styles and the analysis data
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${analysis.opportunity.substring(0, 50)}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen font-sans">
    <nav class="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <div class="font-bold text-xl tracking-tight text-indigo-600">Product Concept</div>
        <button class="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">Join Waitlist</button>
    </nav>
    
    <main class="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 class="text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
            ${analysis.opportunity}
        </h1>
        <p class="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            ${analysis.coreInnovation || "Leveraging modern tech to transform your workflow."}
        </p>
        
        <div class="flex justify-center gap-4">
            <input type="email" placeholder="Enter your email" class="px-4 py-3 border border-gray-300 rounded-md shadow-sm w-72 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button class="bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 shadow-sm">Get Early Access</button>
        </div>

        <div class="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mb-4"><span class="text-indigo-600 font-bold">1</span></div>
                <h3 class="text-lg font-bold text-gray-900 mb-2">Target Customer</h3>
                <p class="text-gray-600">${analysis.targetCustomer}</p>
            </div>
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                 <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mb-4"><span class="text-indigo-600 font-bold">2</span></div>
                <h3 class="text-lg font-bold text-gray-900 mb-2">Market</h3>
                <p class="text-gray-600">${analysis.marketSize}</p>
            </div>
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mb-4"><span class="text-indigo-600 font-bold">3</span></div>
                <h3 class="text-lg font-bold text-gray-900 mb-2">The Moat</h3>
                <p class="text-gray-600">${analysis.moatAnalysis}</p>
            </div>
        </div>
    </main>
</body>
</html>`;

        return NextResponse.json({ html, url: "https://generated-landing-page.vercel.app" });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
