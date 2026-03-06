-- lib/db-schema.sql
-- Run this manually in Neon console or via a migration script

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dashboards (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
  widgets JSONB NOT NULL DEFAULT '[]',
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_dashboards_folder ON dashboards(folder_id);
CREATE INDEX idx_dashboards_favorite ON dashboards(is_favorite);
