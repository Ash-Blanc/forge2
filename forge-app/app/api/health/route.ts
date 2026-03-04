// app/api/health/route.ts
import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Lightweight liveness probe — returns 200 with a timestamp so load
 * balancers, dashboards, and CI jobs can verify the server is running.
 */
export async function GET() {
    return NextResponse.json({ status: "ok", ts: Date.now() });
}
