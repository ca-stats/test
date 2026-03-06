import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Create BigQuery data source
  const { rows: [source] } = await pool.query(`
    INSERT INTO data_sources (name, type, config, description)
    VALUES (
      'BigQuery - Planning Ops',
      'bigquery',
      '{"project": "planning-ops", "datasets": ["mart", "staging"]}',
      '메인 영업/계약 데이터'
    )
    ON CONFLICT DO NOTHING
    RETURNING id
  `);

  if (!source) {
    console.log('Data source already exists, skipping seed.');
    await pool.end();
    return;
  }

  console.log(`Created data source id=${source.id}. Run schema sync from the UI to populate tables.`);
  await pool.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
