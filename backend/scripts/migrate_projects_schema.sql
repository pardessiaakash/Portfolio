-- =============================================================================
-- scripts/migrate_projects_schema.sql
--
-- Adds rich structured columns to the `projects` table.
-- Uses JSONB for arrays (fast GIN-indexed lookups) and TEXT for scalars.
--
-- Run once:
--   psql -U <user> -d <dbname> -f scripts/migrate_projects_schema.sql
-- =============================================================================

-- Scalar enrichment columns
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS short_description   TEXT,
    ADD COLUMN IF NOT EXISTS motivation          TEXT,
    ADD COLUMN IF NOT EXISTS goal                TEXT,
    ADD COLUMN IF NOT EXISTS problem_solved      TEXT,
    ADD COLUMN IF NOT EXISTS architecture        TEXT,
    ADD COLUMN IF NOT EXISTS design_process      TEXT,
    ADD COLUMN IF NOT EXISTS skills              TEXT;   -- already referenced in code

-- JSONB array columns (stored as native JSON, fast to read/filter)
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS key_features        JSONB   DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS target_users        JSONB   DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS challenges          JSONB   DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS results             JSONB   DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS future_improvements JSONB   DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS tags                JSONB   DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS keywords            JSONB   DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS faq                 JSONB   DEFAULT '[]'::jsonb;

-- GIN indexes on JSONB columns for fast containment queries (@>, ?)
CREATE INDEX IF NOT EXISTS idx_projects_tags       ON projects USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_projects_keywords   ON projects USING GIN (keywords);
CREATE INDEX IF NOT EXISTS idx_projects_key_features ON projects USING GIN (key_features);
CREATE INDEX IF NOT EXISTS idx_projects_target_users ON projects USING GIN (target_users);
