import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS data_sources (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('bigquery', 'mariadb')),
      config JSONB NOT NULL DEFAULT '{}',
      is_active BOOLEAN NOT NULL DEFAULT true,
      description TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS table_schemas (
      id SERIAL PRIMARY KEY,
      data_source_id INT NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
      table_name TEXT NOT NULL,
      columns JSONB NOT NULL DEFAULT '[]',
      table_note TEXT DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT true,
      synced_at TIMESTAMPTZ,
      UNIQUE(data_source_id, table_name)
    );
  `);

  console.log('Migration complete.');
  await pool.end();
}

migrate().catch((e) => { console.error(e); process.exit(1); });
