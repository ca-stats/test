import 'server-only';
import { BigQuery } from '@google-cloud/bigquery';

let _bigquery: BigQuery | undefined;

function getBigQuery(): BigQuery {
  if (!_bigquery) {
    if (!process.env.GCP_SERVICE_ACCOUNT_KEY) {
      throw new Error('GCP_SERVICE_ACCOUNT_KEY environment variable is not set');
    }
    const credentials = JSON.parse(
      Buffer.from(process.env.GCP_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8')
    );
    _bigquery = new BigQuery({
      projectId: process.env.GCP_PROJECT_ID,
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/bigquery',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    });
  }
  return _bigquery;
}

export const bigquery = new Proxy({} as BigQuery, {
  get(_target, prop, receiver) {
    return Reflect.get(getBigQuery(), prop, receiver);
  },
});

export async function runQuery(sql: string): Promise<Record<string, unknown>[]> {
  const [rows] = await getBigQuery().query({ query: sql });
  return rows as Record<string, unknown>[];
}

export async function introspectBigQuery(
  project: string,
  datasets: string[]
): Promise<{ tableName: string; columns: { name: string; type: string; description: string }[] }[]> {
  const bq = getBigQuery();
  const result: { tableName: string; columns: { name: string; type: string; description: string }[] }[] = [];

  for (const dataset of datasets) {
    const [rows] = await bq.query({
      query: `
        SELECT c.table_name, c.column_name, c.data_type, cfp.description
        FROM \`${project}.${dataset}.INFORMATION_SCHEMA.COLUMNS\` c
        LEFT JOIN \`${project}.${dataset}.INFORMATION_SCHEMA.COLUMN_FIELD_PATHS\` cfp
          ON c.table_name = cfp.table_name AND c.column_name = cfp.column_name
        ORDER BY c.table_name, c.ordinal_position
      `,
    });

    const tableMap = new Map<string, { name: string; type: string; description: string }[]>();
    for (const row of rows) {
      const tName = `${project}.${dataset}.${row.table_name}`;
      if (!tableMap.has(tName)) tableMap.set(tName, []);
      tableMap.get(tName)!.push({
        name: row.column_name,
        type: row.data_type,
        description: row.description || '',
      });
    }

    for (const [tableName, columns] of tableMap) {
      result.push({ tableName, columns });
    }
  }

  return result;
}
