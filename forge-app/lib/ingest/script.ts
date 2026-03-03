import { createClient } from "@supabase/supabase-js";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import * as dotenv from "dotenv";
import * as path from "path";

// 1. Load Environment Variables from Forge Next.js root (.env.local)
dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });

// 2. Initialize Clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY are in your .env.local.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// We'll use the AWS Titan Text Embeddings model since it's standard and outputs 1536 dims natively.
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.warn("Warning: Missing AWS credentials. Make sure you have AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local if you are using AWS Bedrock Titan.");
}

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  }
});

/**
 * Generate a 1536-dimensional vector embedding for a piece of text using AWS Bedrock Titan.
 * Includes retry logic to handle intermittent AWS HTTP/2 connection drops in Node/Bun.
 */
async function generateEmbedding(text: string, retries: number = 5): Promise<number[]> {
  for (let attempt = 1; attempt <= retries; attempt++) {
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
    } catch (error: any) {
      if (attempt === retries) {
        console.error(`Error generating embedding from Bedrock (Final Attempt ${attempt}):`, error.message);
        throw error;
      }
      
      const backoffMs = attempt * 3000;
      console.warn(`AWS Bedrock connection dropped or rate limited (Attempt ${attempt}/${retries}). Retrying in ${backoffMs}ms...`);
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }
  return [];
}

/**
 * Fetch recent papers from arXiv API
 */
async function fetchArxivPapers(limit: number = 100): Promise<any[]> {
  console.log(`Fetching ${limit} recent papers from arXiv (CS & physics domains)...`);
  // Searching AI, ML, and Quantum Computing categories arbitrarily for our dataset
  const url = `http://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:quant-ph&start=0&max_results=${limit}&sortBy=submittedDate&sortOrder=descending`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`arXiv API failed: ${response.statusText}`);
  }

  const xmlData = await response.text();
  const entries = xmlData.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  
  return entries.map(entry => {
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
    const abstractMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
    const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/);
    const pdfMatch = entry.match(/<link title="pdf" href="([\s\S]*?)"/);
    
    const authorMatches = entry.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g) || [];
    const authors = authorMatches.map(a => {
        const nameMatch = a.match(/<name>([\s\S]*?)<\/name>/);
        return nameMatch ? nameMatch[1].trim() : "Unknown";
    });

    return {
      title: titleMatch ? titleMatch[1].replace(/\n/g, " ").trim() : "Unknown",
      authors,
      abstract: abstractMatch ? abstractMatch[1].replace(/\n/g, " ").trim() : "",
      pdf_url: pdfMatch ? pdfMatch[1] : "",
      year: publishedMatch ? new Date(publishedMatch[1]).getFullYear() : new Date().getFullYear(),
      source: "arxiv"
    };
  });
}

/**
 * Main ingestion orchestrator
 */
async function runIngestion() {
  const limit = 100;
  let papers: any[] = [];
  
  try {
     papers = await fetchArxivPapers(limit);
     console.log(`Successfully fetched ${papers.length} papers from arXiv.`);
  } catch (err) {
      console.error("Failed to fetch from arXiv:", err);
      process.exit(1);
  }

  console.log(`\nStarting ingestion into Supabase...`);

  let count = 0;
  for (const paper of papers) {
    console.log(`\nProcessing: "${paper.title}"`);
    
    // We create a rich text block combining the title and abstract so the embedding is highly semantically relevant
    const textToEmbed = `Title: ${paper.title}\nAuthors: ${paper.authors.join(", ")}\nAbstract: ${paper.abstract}`;
    
    try {
      console.log(` Generating 1536-dimensional vector embedding...`);
      const embedding = await generateEmbedding(textToEmbed);
      
      console.log(` Inserting into Supabase [forge_papers] table...`);
      const { error } = await supabase.from("forge_papers").insert({
        title: paper.title,
        authors: paper.authors,
        abstract: paper.abstract,
        pdf_url: paper.pdf_url,
        year: paper.year,
        source: paper.source,
        embedding: embedding,
      });

      if (error) {
         console.error("Supabase insert failed:", error);
      } else {
         console.log("Successfully ingested.");
         count++;
      }
    } catch (err) {
      console.error(`Failed to process paper.`, err);
    }
    
    // Wait a brief period (1000ms) between processing papers to prevent overwhelming AWS Bedrock
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\nIngestion complete. Successfully embedded and stored ${count}/${papers.length} papers.`);
}

// Execute the script
runIngestion().catch(console.error);
