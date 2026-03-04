-- Create the forge_opportunities table to store the results of the 3-agent analysis pipeline
CREATE TABLE IF NOT EXISTS forge_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid NOT NULL REFERENCES forge_papers(id) ON DELETE CASCADE,
  analyst_summary jsonb,
  architect_design jsonb,
  strategist_plan jsonb,
  nova_score jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- Ensure one opportunity profile per paper to avoid duplicate analyses
  CONSTRAINT unique_paper_opportunity UNIQUE (paper_id)
);

-- Basic RLS policies
ALTER TABLE forge_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to opportunities"
  ON forge_opportunities FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to opportunities"
  ON forge_opportunities FOR INSERT
  WITH CHECK (true);
