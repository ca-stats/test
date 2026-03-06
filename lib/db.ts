import 'server-only';
import { Pool } from 'pg';

let _pool: Pool | undefined;

function getPool(): Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      query_timeout: 10000,
    });
  }
  return _pool;
}

export async function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<Record<string, unknown>[]> {
  const pool = getPool();

  // Build parameterized query from template literal
  let query = '';
  for (let i = 0; i < strings.length; i++) {
    query += strings[i];
    if (i < values.length) {
      query += `$${i + 1}`;
    }
  }

  const result = await pool.query(query, values);
  return result.rows;
}

export async function runRawSQL(query: string): Promise<Record<string, unknown>[]> {
  const pool = getPool();
  const result = await pool.query(query);
  return result.rows;
}
