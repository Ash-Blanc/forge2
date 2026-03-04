-- Enable the vector extension for pgvector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- FORGE Database Schema
-- =============================================================================
-- This schema supports two pipelines:
-- 1. The Harvester (Ingestion): Background job that ingests arXiv papers
-- 2. The Forge Workflow (Analysis): On-demand AI analysis of papers
-- =============================================================================

-- =============================================================================
-- Table: forge_papers
-- =============================================================================
-- Stores ingested research papers from arXiv with vector embeddings
-- for semantic similarity search
-- =============================================================================

CREATE TABLE IF NOT EXISTS forge_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ArXiv metadata
    arxiv_id TEXT UNIQUE,
    title TEXT NOT NULL,
    authors TEXT[] DEFAULT '{}',
    abstract TEXT DEFAULT '',
    pdf_url TEXT,
    year INTEGER,
    source TEXT DEFAULT 'arxiv',

    -- Vector embedding (1536 dimensions for AWS Titan embeddings)
    embedding VECTOR(1536),

    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzed', 'failed')),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Metadata for searching/filtering
    category TEXT,
    doi TEXT,
    journal_ref TEXT
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_forge_papers_status ON forge_papers(status);
CREATE INDEX IF NOT EXISTS idx_forge_papers_created_at ON forge_papers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forge_papers_arxiv_id ON forge_papers(arxiv_id);
CREATE INDEX IF NOT EXISTS idx_forge_papers_year ON forge_papers(year DESC);

-- Create GIN index for full-text search on title and abstract
CREATE INDEX IF NOT EXISTS idx_forge_papers_search
ON forge_papers USING GIN(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(abstract, '')));

-- Create vector similarity search index (IVFFlat for approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS idx_forge_papers_embedding
ON forge_papers USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- =============================================================================
-- Table: forge_opportunities
-- =============================================================================
-- Stores AI-generated SaaS opportunity analysis for papers
-- Each opportunity is linked to a paper via paper_id
-- =============================================================================

CREATE TABLE IF NOT EXISTS forge_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key to the paper (1:1 relationship)
    paper_id UUID NOT NULL REFERENCES forge_papers(id) ON DELETE CASCADE,

    -- Agent 1: Analyst output (technical essence extraction)
    analyst_summary JSONB DEFAULT '{}',

    -- Agent 2: Architect output (SaaS architecture design)
    architect_design JSONB DEFAULT '{}',

    -- Agent 3: Strategist output (GTM strategy)
    strategist_plan JSONB DEFAULT '{}',

    -- NOVA Score (0-100) - calculated by Strategist agent
    -- Represents: Novelty, Opportunity, Velocity, Advantage
    nova_score INTEGER CHECK (nova_score >= 0 AND nova_score <= 100),

    -- Status tracking
    analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'running', 'completed', 'failed')),

    -- Error tracking
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure only one opportunity per paper
    CONSTRAINT unique_paper_opportunity UNIQUE (paper_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_forge_opportunities_paper_id ON forge_opportunities(paper_id);
CREATE INDEX IF NOT EXISTS idx_forge_opportunities_nova_score ON forge_opportunities(nova_score DESC);
CREATE INDEX IF NOT EXISTS idx_forge_opportunities_status ON forge_opportunities(analysis_status);
CREATE INDEX IF NOT EXISTS idx_forge_opportunities_created_at ON forge_opportunities(created_at DESC);

-- Create GIN indexes for JSONB queries
CREATE INDEX IF NOT EXISTS idx_forge_opportunities_analyst ON forge_opportunities USING GIN(analyst_summary);
CREATE INDEX IF NOT EXISTS idx_forge_opportunities_architect ON forge_opportunities USING GIN(architect_design);
CREATE INDEX IF NOT EXISTS idx_forge_opportunities_strategist ON forge_opportunities USING GIN(strategist_plan);

-- =============================================================================
-- Function: update_updated_at_column
-- =============================================================================
-- Trigger function to automatically update the updated_at timestamp
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Triggers: Auto-update updated_at
-- =============================================================================

CREATE TRIGGER update_forge_papers_updated_at
    BEFORE UPDATE ON forge_papers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forge_opportunities_updated_at
    BEFORE UPDATE ON forge_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================

-- Enable RLS on tables
ALTER TABLE forge_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE forge_opportunities ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to papers
CREATE POLICY "Allow public read access to papers"
    ON forge_papers
    FOR SELECT
    TO PUBLIC
    USING (true);

-- Policy: Allow service role to insert/update papers (for harvester)
CREATE POLICY "Allow service role to manage papers"
    ON forge_papers
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Allow public read access to opportunities
CREATE POLICY "Allow public read access to opportunities"
    ON forge_opportunities
    FOR SELECT
    TO PUBLIC
    USING (true);

-- Policy: Allow service role to manage opportunities (for analysis pipeline)
CREATE POLICY "Allow service role to manage opportunities"
    ON forge_opportunities
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- Views: Common query patterns
-- =============================================================================

-- View: Papers with their opportunity analysis (if available)
CREATE OR REPLACE VIEW papers_with_opportunities AS
SELECT
    p.id AS paper_id,
    p.arxiv_id,
    p.title,
    p.authors,
    p.abstract,
    p.year,
    p.status AS paper_status,
    p.created_at AS paper_created_at,
    o.id AS opportunity_id,
    o.nova_score,
    o.analysis_status,
    o.analyst_summary->'paperAnalysis'->>'coreBreakthrough' AS core_breakthrough,
    o.architect_design->>'recommendedPath' AS recommended_path,
    o.strategist_plan->'strategy'->>'marketVerdict' AS market_verdict,
    o.created_at AS analysis_created_at
FROM forge_papers p
LEFT JOIN forge_opportunities o ON p.id = o.paper_id;

-- View: High-value opportunities (NOVA score >= 70)
CREATE OR REPLACE VIEW high_value_opportunities AS
SELECT
    p.id AS paper_id,
    p.title,
    p.authors,
    p.year,
    o.nova_score,
    o.analyst_summary->'paperAnalysis'->>'coreBreakthrough' AS core_breakthrough,
    o.architect_design->'opportunities'->0->>'oneLiner' AS top_opportunity,
    o.strategist_plan->'strategy'->>'mvpScope' AS mvp_scope
FROM forge_papers p
JOIN forge_opportunities o ON p.id = o.paper_id
WHERE o.nova_score >= 70
ORDER BY o.nova_score DESC;

-- =============================================================================
-- Function: Semantic search for papers
-- =============================================================================

CREATE OR REPLACE FUNCTION search_papers_by_similarity(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    arxiv_id TEXT,
    title TEXT,
    authors TEXT[],
    abstract TEXT,
    year INTEGER,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.arxiv_id,
        p.title,
        p.authors,
        p.abstract,
        p.year,
        1 - (p.embedding <=> query_embedding) AS similarity
    FROM forge_papers p
    WHERE 1 - (p.embedding <=> query_embedding) > match_threshold
    ORDER BY p.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Comments for documentation
-- =============================================================================

COMMENT ON TABLE forge_papers IS 'Stores research papers ingested from arXiv with vector embeddings for semantic search';
COMMENT ON TABLE forge_opportunities IS 'Stores AI-generated SaaS opportunity analysis linked to papers';
COMMENT ON COLUMN forge_papers.embedding IS '1536-dimensional vector embedding from AWS Bedrock Titan';
COMMENT ON COLUMN forge_opportunities.nova_score IS 'NOVA Score (0-100): Novelty, Opportunity, Velocity, Advantage';
