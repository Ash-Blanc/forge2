import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

// Initialize AWS Bedrock Client for embeddings
const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

/**
 * Generate a 1536-dimensional vector embedding for the query.
 * Must exactly match the model used in the ingestion pipeline.
 */
async function generateQueryEmbedding(text: string): Promise<number[]> {
  try {
    const response = await bedrock.send(
      new InvokeModelCommand({
        modelId: "amazon.titan-embed-text-v1",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({ inputText: text }),
      })
    );
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.embedding;
  } catch (error) {
    console.error("Error generating query embedding:", error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    const limitParam = searchParams.get("limit");
    
    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: "Missing 'query' parameter" }, { status: 400 });
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    
    console.log(`[Custom Research API] Generating embedding for query: "${query}"`);
    const queryVector = await generateQueryEmbedding(query.trim());

    console.log(`[Custom Research API] Searching Supabase vector database...`);
    // Call the match_papers RPC function created in the migration
    const { data: matchedPapers, error } = await supabase.rpc("match_papers", {
      query_embedding: queryVector,
      match_threshold: 0.5, // Minimum similarity threshold (0 to 1)
      match_count: limit
    });

    if (error) {
      console.error("[Custom Research API] Supabase RPC error:", error);
      throw error;
    }

    // Map database results to standard frontend Paper interface
    const formattedPapers = (matchedPapers || []).map((p: any) => ({
      title: p.title,
      authors: p.authors || [],
      abstract_snippet: p.abstract ? p.abstract.substring(0, 300) + "..." : "",
      pdf_url: p.pdf_url || "",
      citation_count: 0, // In our custom DB, we might not track this live
      year: p.year || new Date().getFullYear(),
      source: p.source || "internal",
      similarity_score: p.similarity // Expose the vector math score for debugging/UI
    }));

    return NextResponse.json({ papers: formattedPapers }, { status: 200 });
    
  } catch (error: any) {
    console.error("[Custom Research API Error]", error);
    return NextResponse.json({ 
        error: "Internal Server Error", 
        details: error.message || "Unknown error occurred" 
    }, { status: 500 });
  }
}
