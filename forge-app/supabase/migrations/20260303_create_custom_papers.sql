-- Enable pgvector if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the custom papers table
CREATE TABLE IF NOT EXISTS forge_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  authors jsonb NOT NULL DEFAULT '[]',
  abstract text,
  pdf_url text,
  year integer,
  source text DEFAULT 'internal',
  -- We'll use 1536 dimensions as the standard (works with OpenAI & Amazon Titan embeddings)
  embedding vector(1536),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Basic RLS policies (allow anyone to read)
ALTER TABLE forge_papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to papers"
  ON forge_papers FOR SELECT
  USING (true);

-- Allow authenticated service roles or anon keys to insert for our MVP ingestion script
CREATE POLICY "Allow public insert to papers"
  ON forge_papers FOR INSERT
  WITH CHECK (true);

-- Create the vector similarity search RPC function
CREATE OR REPLACE FUNCTION match_papers (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  authors jsonb,
  abstract text,
  pdf_url text,
  year integer,
  source text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  select
    forge_papers.id,
    forge_papers.title,
    forge_papers.authors,
    forge_papers.abstract,
    forge_papers.pdf_url,
    forge_papers.year,
    forge_papers.source,
    1 - (forge_papers.embedding <=> query_embedding) as similarity
  from forge_papers
  where 1 - (forge_papers.embedding <=> query_embedding) > match_threshold
  order by forge_papers.embedding <=> query_embedding
  limit match_count;
$$;
