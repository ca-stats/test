# Schema Management GUI - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hardcoded TABLE_SCHEMAS in chat route with a GUI-managed schema system that auto-introspects BigQuery and MariaDB, allows user annotations, and dynamically builds the AI system prompt.

**Architecture:** New Neon tables (`data_sources`, `table_schemas`) store connection configs and introspected schemas with user annotations. A settings page at `/settings/data-sources` provides CRUD + schema sync. The chat API reads active schemas from Neon at request time and builds the system prompt dynamically.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Neon PostgreSQL, mysql2 (MariaDB client), Lucide icons.

---

### Task 1: Database Migration — Create data_sources and table_schemas tables

**Files:**
- Modify: `lib/db.ts` (add `runMigration` function)
- Create: `scripts/migrate.ts` (migration script)

**Step 1: Add runMigration helper to lib/db.ts**

Add this export at the bottom of `lib/db.ts`:

```typescript
export async function runRawSQL(query: string): Promise<Record<string, unknown>[]> {
  const pool = getPool();
  const result = await pool.query(query);
  return result.rows;
}
```

**Step 2: Create the migration script**

Create `scripts/migrate.ts`:

```typescript
import 'dotenv/config';
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
```

**Step 3: Run the migration**

Run: `npx tsx scripts/migrate.ts`
Expected: "Migration complete."

**Step 4: Commit**

```bash
git add lib/db.ts scripts/migrate.ts
git commit -m "feat: add data_sources and table_schemas tables"
```

---

### Task 2: Install mysql2 and create MariaDB client

**Files:**
- Modify: `package.json` (add mysql2)
- Create: `lib/mariadb.ts`
- Modify: `.env.local.example` (add MariaDB env vars)

**Step 1: Install mysql2**

Run: `npm install mysql2`

**Step 2: Create lib/mariadb.ts**

```typescript
import 'server-only';
import mysql from 'mysql2/promise';

let _pool: mysql.Pool | undefined;

function getPool(config: {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}): mysql.Pool {
  if (!_pool) {
    _pool = mysql.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }
  return _pool;
}

export async function runMariaQuery(
  sql: string,
  config: { host: string; port: number; database: string; user: string; password: string }
): Promise<Record<string, unknown>[]> {
  const pool = getPool(config);
  const [rows] = await pool.query(sql);
  return rows as Record<string, unknown>[];
}

export async function introspectMariaDB(config: {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}): Promise<{ tableName: string; columns: { name: string; type: string; description: string }[] }[]> {
  const pool = getPool(config);

  const [tables] = await pool.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
    [config.database]
  );

  const result: { tableName: string; columns: { name: string; type: string; description: string }[] }[] = [];

  for (const table of tables as { TABLE_NAME: string }[]) {
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [config.database, table.TABLE_NAME]
    );

    result.push({
      tableName: `${config.database}.${table.TABLE_NAME}`,
      columns: (cols as { COLUMN_NAME: string; COLUMN_TYPE: string; COLUMN_COMMENT: string }[]).map((c) => ({
        name: c.COLUMN_NAME,
        type: c.COLUMN_TYPE,
        description: c.COLUMN_COMMENT || '',
      })),
    });
  }

  return result;
}
```

**Step 3: Add MariaDB env vars to .env.local.example**

Append to `.env.local.example`:
```
# MariaDB (optional - for MariaDB data sources)
# MARIADB_PASSWORD=your-mariadb-password
```

**Step 4: Commit**

```bash
git add lib/mariadb.ts package.json package-lock.json .env.local.example
git commit -m "feat: add MariaDB client with introspection"
```

---

### Task 3: BigQuery introspection function

**Files:**
- Modify: `lib/bigquery.ts` (add `introspectBigQuery` function)

**Step 1: Add introspection function**

Add to the bottom of `lib/bigquery.ts`:

```typescript
export async function introspectBigQuery(
  project: string,
  datasets: string[]
): Promise<{ tableName: string; columns: { name: string; type: string; description: string }[] }[]> {
  const bq = getBigQuery();
  const result: { tableName: string; columns: { name: string; type: string; description: string }[] }[] = [];

  for (const dataset of datasets) {
    const [rows] = await bq.query({
      query: `
        SELECT table_name, column_name, data_type, description
        FROM \`${project}.${dataset}.INFORMATION_SCHEMA.COLUMN_FIELD_PATHS\`
        ORDER BY table_name, ordinal_position
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
```

**Step 2: Commit**

```bash
git add lib/bigquery.ts
git commit -m "feat: add BigQuery schema introspection"
```

---

### Task 4: Data Sources API routes

**Files:**
- Create: `app/api/data-sources/route.ts` (list + create)
- Create: `app/api/data-sources/[id]/route.ts` (get + update + delete)
- Create: `app/api/data-sources/[id]/sync/route.ts` (introspect schemas)

**Step 1: Create app/api/data-sources/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET: list all data sources (hide sensitive config)
export async function GET() {
  try {
    const rows = await sql`
      SELECT id, name, type, config, is_active, description, created_at, updated_at
      FROM data_sources ORDER BY created_at ASC
    `;

    // Count tables per source
    const counts = await sql`
      SELECT data_source_id, COUNT(*)::int as table_count,
             MAX(synced_at) as last_synced
      FROM table_schemas GROUP BY data_source_id
    `;
    const countMap = new Map(
      counts.map((c) => [c.data_source_id, { tableCount: c.table_count, lastSynced: c.last_synced }])
    );

    const sources = rows.map((r) => {
      const config = r.config as Record<string, unknown>;
      // Redact password-related fields
      const safeConfig = { ...config };
      delete safeConfig.password;
      delete safeConfig.passwordEnvVar;

      return {
        ...r,
        config: safeConfig,
        tableCount: countMap.get(r.id)?.tableCount || 0,
        lastSynced: countMap.get(r.id)?.lastSynced || null,
      };
    });

    return NextResponse.json(sources);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list data sources';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: create a new data source
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type, config, description } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'name and type are required' }, { status: 400 });
    }
    if (!['bigquery', 'mariadb'].includes(type)) {
      return NextResponse.json({ error: 'type must be bigquery or mariadb' }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO data_sources (name, type, config, description)
      VALUES (${name}, ${type}, ${JSON.stringify(config || {})}, ${description || ''})
      RETURNING *
    `;

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create data source';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 2: Create app/api/data-sources/[id]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET: single data source with its table schemas
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const sources = await sql`SELECT * FROM data_sources WHERE id = ${id}`;
    if (!sources[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const tables = await sql`
      SELECT * FROM table_schemas
      WHERE data_source_id = ${id}
      ORDER BY table_name ASC
    `;

    return NextResponse.json({ ...sources[0], tables });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get data source';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT: update data source
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { name, config, is_active, description, tables } = body;

    // Update data source fields
    if (name !== undefined || config !== undefined || is_active !== undefined || description !== undefined) {
      await sql`
        UPDATE data_sources SET
          name = COALESCE(${name ?? null}, name),
          config = COALESCE(${config ? JSON.stringify(config) : null}, config),
          is_active = COALESCE(${is_active ?? null}, is_active),
          description = COALESCE(${description ?? null}, description),
          updated_at = NOW()
        WHERE id = ${id}
      `;
    }

    // Update table schemas (notes, is_active)
    if (Array.isArray(tables)) {
      for (const t of tables) {
        if (t.id) {
          await sql`
            UPDATE table_schemas SET
              table_note = COALESCE(${t.table_note ?? null}, table_note),
              is_active = COALESCE(${t.is_active ?? null}, is_active),
              columns = COALESCE(${t.columns ? JSON.stringify(t.columns) : null}, columns)
            WHERE id = ${t.id}
          `;
        }
      }
    }

    const updated = await sql`SELECT * FROM data_sources WHERE id = ${id}`;
    return NextResponse.json(updated[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update data source';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: remove data source and its schemas (CASCADE)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await sql`DELETE FROM data_sources WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete data source';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 3: Create app/api/data-sources/[id]/sync/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { introspectBigQuery } from '@/lib/bigquery';
import { introspectMariaDB } from '@/lib/mariadb';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const sources = await sql`SELECT * FROM data_sources WHERE id = ${id}`;
    const source = sources[0];
    if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const config = source.config as Record<string, unknown>;
    let introspected: { tableName: string; columns: { name: string; type: string; description: string }[] }[];

    if (source.type === 'bigquery') {
      introspected = await introspectBigQuery(
        config.project as string,
        config.datasets as string[]
      );
    } else if (source.type === 'mariadb') {
      const password = config.passwordEnvVar
        ? process.env[config.passwordEnvVar as string] || ''
        : '';
      introspected = await introspectMariaDB({
        host: config.host as string,
        port: (config.port as number) || 3306,
        database: config.database as string,
        user: config.user as string,
        password,
      });
    } else {
      return NextResponse.json({ error: `Unknown type: ${source.type}` }, { status: 400 });
    }

    // Get existing schemas to preserve user_notes
    const existing = await sql`
      SELECT table_name, columns FROM table_schemas WHERE data_source_id = ${id}
    `;
    const existingMap = new Map(
      existing.map((e) => [e.table_name as string, e.columns as { name: string; user_note?: string }[]])
    );

    // Upsert each table
    for (const table of introspected) {
      const oldCols = existingMap.get(table.tableName) || [];
      const noteMap = new Map(oldCols.map((c) => [c.name, c.user_note || '']));

      const mergedColumns = table.columns.map((col) => ({
        name: col.name,
        type: col.type,
        description: col.description,
        user_note: noteMap.get(col.name) || '',
      }));

      // Upsert: insert or update on conflict
      await sql`
        INSERT INTO table_schemas (data_source_id, table_name, columns, synced_at)
        VALUES (${id}, ${table.tableName}, ${JSON.stringify(mergedColumns)}, NOW())
        ON CONFLICT (data_source_id, table_name)
        DO UPDATE SET columns = ${JSON.stringify(mergedColumns)}, synced_at = NOW()
      `;
    }

    // Fetch updated tables
    const tables = await sql`
      SELECT * FROM table_schemas WHERE data_source_id = ${id} ORDER BY table_name
    `;

    return NextResponse.json({ synced: introspected.length, tables });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Schema sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 4: Commit**

```bash
git add app/api/data-sources/
git commit -m "feat: add data sources CRUD and sync API routes"
```

---

### Task 5: Schema builder — dynamic TABLE_SCHEMAS from Neon

**Files:**
- Create: `lib/schema-builder.ts`
- Modify: `app/api/chat/route.ts` (replace hardcoded TABLE_SCHEMAS)

**Step 1: Create lib/schema-builder.ts**

```typescript
import 'server-only';
import { sql } from '@/lib/db';

interface Column {
  name: string;
  type: string;
  description: string;
  user_note?: string;
}

export async function buildTableSchemas(): Promise<string> {
  const sources = await sql`
    SELECT id, name, type, description
    FROM data_sources WHERE is_active = true ORDER BY id
  `;

  if (sources.length === 0) return '(No data sources configured)';

  const parts: string[] = [];

  for (const source of sources) {
    const tables = await sql`
      SELECT table_name, columns, table_note
      FROM table_schemas
      WHERE data_source_id = ${source.id} AND is_active = true
      ORDER BY table_name
    `;

    if (tables.length === 0) continue;

    const sourceHeader = `=== ${source.name} (${source.type}) ===`;
    const sourceNote = source.description ? `Note: ${source.description}` : '';

    const tableLines = tables.map((t) => {
      const cols = (t.columns as Column[])
        .map((c) => {
          let line = `  ${c.name} (${c.type})`;
          if (c.description) line += ` -- ${c.description}`;
          if (c.user_note) line += ` [${c.user_note}]`;
          return line;
        })
        .join('\n');

      const tableNote = t.table_note ? `  Note: ${t.table_note}\n` : '';
      return `Table: ${t.table_name}\n${tableNote}${cols}`;
    });

    parts.push([sourceHeader, sourceNote, ...tableLines].filter(Boolean).join('\n\n'));
  }

  return parts.join('\n\n');
}
```

**Step 2: Modify app/api/chat/route.ts**

Replace the hardcoded `TABLE_SCHEMAS` constant and update the route to use dynamic schema builder. Remove lines 10-140 (the entire `const TABLE_SCHEMAS = ...` block) and replace with a dynamic fetch:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { buildTableSchemas } from '@/lib/schema-builder';
import type { ChatRequest } from '@/lib/types/api';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { messages, dashboardContext, mode } = (await req.json()) as ChatRequest;

    const tableSchemas = await buildTableSchemas();

    const systemPrompt = buildSystemPrompt(
      tableSchemas,
      dashboardContext?.widgets
    );

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    });

    const rawText = response.choices[0]?.message?.content || '';

    const jsonMatch = rawText.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return NextResponse.json(parsed);
      } catch {
        // If JSON parsing fails, return as plain message
      }
    }

    return NextResponse.json({ message: rawText, actions: [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add lib/schema-builder.ts app/api/chat/route.ts
git commit -m "feat: replace hardcoded TABLE_SCHEMAS with dynamic schema builder"
```

---

### Task 6: Settings page — Data Sources list

**Files:**
- Create: `app/(app)/settings/data-sources/page.tsx` (server component)
- Create: `components/settings/DataSourceList.tsx` (client component)

**Step 1: Create the server page**

Create `app/(app)/settings/data-sources/page.tsx`:

```typescript
import { sql } from '@/lib/db';
import { DataSourceList } from '@/components/settings/DataSourceList';

export default async function DataSourcesPage() {
  let sources: Record<string, unknown>[] = [];
  try {
    sources = await sql`
      SELECT ds.*,
        (SELECT COUNT(*)::int FROM table_schemas ts WHERE ts.data_source_id = ds.id) as table_count,
        (SELECT MAX(synced_at) FROM table_schemas ts WHERE ts.data_source_id = ds.id) as last_synced
      FROM data_sources ds ORDER BY ds.created_at ASC
    `;
  } catch {
    // DB not available
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <DataSourceList initialSources={sources} />
    </div>
  );
}
```

**Step 2: Create the client list component**

Create `components/settings/DataSourceList.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Database, Plus, RefreshCw, Settings, Trash2, ToggleLeft, ToggleRight,
} from 'lucide-react';

interface DataSource {
  id: number;
  name: string;
  type: string;
  config: Record<string, unknown>;
  is_active: boolean;
  description: string;
  table_count: number;
  last_synced: string | null;
}

export function DataSourceList({ initialSources }: { initialSources: Record<string, unknown>[] }) {
  const router = useRouter();
  const [sources, setSources] = useState<DataSource[]>(initialSources as unknown as DataSource[]);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', type: 'bigquery', description: '' });
  const [addConfig, setAddConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleSync(id: number) {
    setSyncing(id);
    try {
      await fetch(`/api/data-sources/${id}/sync`, { method: 'POST' });
      router.refresh();
      const res = await fetch('/api/data-sources');
      const data = await res.json();
      if (Array.isArray(data)) setSources(data as DataSource[]);
    } catch {
      alert('스키마 동기화에 실패했습니다.');
    }
    setSyncing(null);
  }

  async function handleToggle(id: number, current: boolean) {
    await fetch(`/api/data-sources/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    });
    setSources((prev) => prev.map((s) => s.id === id ? { ...s, is_active: !current } : s));
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`"${name}" 데이터 소스를 삭제하시겠습니까?`)) return;
    await fetch(`/api/data-sources/${id}`, { method: 'DELETE' });
    setSources((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleAdd() {
    setSaving(true);
    try {
      const config = addForm.type === 'bigquery'
        ? { project: addConfig.project || '', datasets: (addConfig.datasets || '').split(',').map((d) => d.trim()).filter(Boolean) }
        : { host: addConfig.host || '', port: parseInt(addConfig.port || '3306'), database: addConfig.database || '', user: addConfig.user || '', passwordEnvVar: addConfig.passwordEnvVar || 'MARIADB_PASSWORD' };

      const res = await fetch('/api/data-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, config }),
      });
      if (!res.ok) throw new Error();

      setShowAdd(false);
      setAddForm({ name: '', type: 'bigquery', description: '' });
      setAddConfig({});

      const listRes = await fetch('/api/data-sources');
      const data = await listRes.json();
      if (Array.isArray(data)) setSources(data as DataSource[]);
    } catch {
      alert('데이터 소스 추가에 실패했습니다.');
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">데이터 소스</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-lg hover:bg-blue-800 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> 추가
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <h3 className="font-medium text-[var(--color-text)] mb-4">새 데이터 소스</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">이름</label>
              <input
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
                placeholder="BigQuery - Planning Ops"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">타입</label>
              <select
                value={addForm.type}
                onChange={(e) => { setAddForm({ ...addForm, type: e.target.value }); setAddConfig({}); }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)] cursor-pointer"
              >
                <option value="bigquery">BigQuery</option>
                <option value="mariadb">MariaDB</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">설명 (AI에게 전달됨)</label>
            <input
              value={addForm.description}
              onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
              placeholder="메인 영업/계약 데이터"
            />
          </div>

          {/* Type-specific config fields */}
          {addForm.type === 'bigquery' ? (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">GCP Project</label>
                <input
                  value={addConfig.project || ''}
                  onChange={(e) => setAddConfig({ ...addConfig, project: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
                  placeholder="planning-ops"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Datasets (쉼표 구분)</label>
                <input
                  value={addConfig.datasets || ''}
                  onChange={(e) => setAddConfig({ ...addConfig, datasets: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
                  placeholder="mart, staging"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Host</label>
                <input
                  value={addConfig.host || ''}
                  onChange={(e) => setAddConfig({ ...addConfig, host: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
                  placeholder="localhost"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Port</label>
                <input
                  value={addConfig.port || '3306'}
                  onChange={(e) => setAddConfig({ ...addConfig, port: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Database</label>
                <input
                  value={addConfig.database || ''}
                  onChange={(e) => setAddConfig({ ...addConfig, database: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
                  placeholder="erp_prod"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">User</label>
                <input
                  value={addConfig.user || ''}
                  onChange={(e) => setAddConfig({ ...addConfig, user: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
                  placeholder="readonly_user"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Password 환경변수 이름</label>
                <input
                  value={addConfig.passwordEnvVar || 'MARIADB_PASSWORD'}
                  onChange={(e) => setAddConfig({ ...addConfig, passwordEnvVar: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">.env.local에 설정된 환경변수 이름</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving || !addForm.name}
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-lg hover:bg-blue-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Source cards */}
      {sources.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-text-muted)]">
          <Database className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>데이터 소스가 없습니다.</p>
          <p className="text-sm mt-1">데이터 소스를 추가하여 AI에게 테이블 정보를 제공하세요.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sources.map((s) => (
            <div
              key={s.id}
              className={`bg-white border rounded-lg p-5 transition-colors ${s.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-[var(--color-secondary)]" />
                  <div>
                    <h3 className="font-medium text-[var(--color-text)]">{s.name}</h3>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {s.type === 'bigquery' ? 'BigQuery' : 'MariaDB'}
                      {' · '}테이블 {s.table_count}개
                      {s.last_synced && ` · 마지막 동기화: ${new Date(s.last_synced).toLocaleDateString('ko-KR')}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(s.id, s.is_active)}
                  className="cursor-pointer"
                  title={s.is_active ? 'AI 프롬프트에 포함됨' : 'AI 프롬프트에서 제외됨'}
                >
                  {s.is_active
                    ? <ToggleRight className="w-6 h-6 text-[var(--color-primary)]" />
                    : <ToggleLeft className="w-6 h-6 text-gray-300" />
                  }
                </button>
              </div>
              {s.description && (
                <p className="text-sm text-[var(--color-text-muted)] mb-3">{s.description}</p>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSync(s.id)}
                  disabled={syncing === s.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing === s.id ? 'animate-spin' : ''}`} />
                  {syncing === s.id ? '동기화 중...' : '스키마 동기화'}
                </button>
                <button
                  onClick={() => router.push(`/settings/data-sources/${s.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" /> 편집
                </button>
                <button
                  onClick={() => handleDelete(s.id, s.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" /> 삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add app/(app)/settings/ components/settings/
git commit -m "feat: add data sources list page"
```

---

### Task 7: Settings page — Data Source Editor with table/column annotations

**Files:**
- Create: `app/(app)/settings/data-sources/[id]/page.tsx` (server component)
- Create: `components/settings/DataSourceEditor.tsx` (client component)

**Step 1: Create the server page**

Create `app/(app)/settings/data-sources/[id]/page.tsx`:

```typescript
import { sql } from '@/lib/db';
import { notFound } from 'next/navigation';
import { DataSourceEditor } from '@/components/settings/DataSourceEditor';

export default async function EditDataSourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sources = await sql`SELECT * FROM data_sources WHERE id = ${id}`;
  if (!sources[0]) notFound();

  const tables = await sql`
    SELECT * FROM table_schemas
    WHERE data_source_id = ${id}
    ORDER BY table_name ASC
  `;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <DataSourceEditor
        source={sources[0] as Record<string, unknown>}
        tables={tables as Record<string, unknown>[]}
      />
    </div>
  );
}
```

**Step 2: Create the editor component**

Create `components/settings/DataSourceEditor.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, RefreshCw, ChevronDown, ChevronRight, ToggleLeft, ToggleRight,
} from 'lucide-react';

interface Column {
  name: string;
  type: string;
  description: string;
  user_note: string;
}

interface TableSchema {
  id: number;
  table_name: string;
  columns: Column[];
  table_note: string;
  is_active: boolean;
  synced_at: string | null;
}

interface DataSourceData {
  id: number;
  name: string;
  type: string;
  description: string;
  is_active: boolean;
}

export function DataSourceEditor({
  source,
  tables: initialTables,
}: {
  source: Record<string, unknown>;
  tables: Record<string, unknown>[];
}) {
  const router = useRouter();
  const [name, setName] = useState(source.name as string);
  const [description, setDescription] = useState((source.description as string) || '');
  const [isActive, setIsActive] = useState(source.is_active as boolean);
  const [tables, setTables] = useState<TableSchema[]>(initialTables as unknown as TableSchema[]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateTableNote(tableId: number, note: string) {
    setTables((prev) => prev.map((t) => t.id === tableId ? { ...t, table_note: note } : t));
  }

  function toggleTable(tableId: number) {
    setTables((prev) => prev.map((t) => t.id === tableId ? { ...t, is_active: !t.is_active } : t));
  }

  function updateColumnNote(tableId: number, colIdx: number, note: string) {
    setTables((prev) => prev.map((t) => {
      if (t.id !== tableId) return t;
      const cols = [...t.columns];
      cols[colIdx] = { ...cols[colIdx], user_note: note };
      return { ...t, columns: cols };
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/data-sources/${source.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          is_active: isActive,
          tables: tables.map((t) => ({
            id: t.id,
            table_note: t.table_note,
            is_active: t.is_active,
            columns: t.columns,
          })),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('저장에 실패했습니다.');
    }
    setSaving(false);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch(`/api/data-sources/${source.id}/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.tables) setTables(data.tables as TableSchema[]);
    } catch {
      alert('스키마 동기화에 실패했습니다.');
    }
    setSyncing(false);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/settings/data-sources')}
          className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> 데이터 소스 목록
        </button>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-600">저장됨</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-lg hover:bg-blue-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {/* Source info */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
            />
          </div>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">타입</label>
              <p className="px-3 py-2 text-sm text-[var(--color-text)] bg-gray-50 rounded-lg">
                {source.type === 'bigquery' ? 'BigQuery' : 'MariaDB'}
              </p>
            </div>
            <button
              onClick={() => setIsActive(!isActive)}
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer"
            >
              {isActive
                ? <><ToggleRight className="w-5 h-5 text-[var(--color-primary)]" /> 활성</>
                : <><ToggleLeft className="w-5 h-5 text-gray-300" /> 비활성</>
              }
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">설명 (AI에게 전달됨)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
            placeholder="이 데이터 소스에 대한 설명을 입력하세요"
          />
        </div>
      </div>

      {/* Tables */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-medium text-[var(--color-text)]">테이블 ({tables.length})</h3>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? '동기화 중...' : '스키마 동기화'}
          </button>
        </div>

        {tables.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[var(--color-text-muted)]">
            스키마 동기화 버튼을 클릭하여 테이블 정보를 가져오세요.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tables.map((t) => (
              <div key={t.id}>
                {/* Table header */}
                <div className="flex items-center gap-2 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <button
                    onClick={() => toggleExpand(t.id)}
                    className="cursor-pointer"
                  >
                    {expanded.has(t.id)
                      ? <ChevronDown className="w-4 h-4 text-gray-400" />
                      : <ChevronRight className="w-4 h-4 text-gray-400" />
                    }
                  </button>
                  <span className="flex-1 text-sm font-mono text-[var(--color-text)]">{t.table_name}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{t.columns.length}개 컬럼</span>
                  <button onClick={() => toggleTable(t.id)} className="cursor-pointer">
                    {t.is_active
                      ? <ToggleRight className="w-5 h-5 text-[var(--color-primary)]" />
                      : <ToggleLeft className="w-5 h-5 text-gray-300" />
                    }
                  </button>
                </div>

                {/* Expanded: table note + columns */}
                {expanded.has(t.id) && (
                  <div className="px-5 pb-4 ml-6">
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">테이블 메모 (AI에게 전달됨)</label>
                      <input
                        value={t.table_note}
                        onChange={(e) => updateTableNote(t.id, e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
                        placeholder="이 테이블에 대한 메모를 입력하세요"
                      />
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-[var(--color-text-muted)] border-b border-gray-100">
                            <th className="pb-2 pr-4 font-medium">컬럼</th>
                            <th className="pb-2 pr-4 font-medium">타입</th>
                            <th className="pb-2 pr-4 font-medium">설명 (DB)</th>
                            <th className="pb-2 font-medium">메모 (사용자)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {t.columns.map((col, idx) => (
                            <tr key={col.name} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="py-2 pr-4 font-mono text-xs">{col.name}</td>
                              <td className="py-2 pr-4 text-xs text-[var(--color-text-muted)]">{col.type}</td>
                              <td className="py-2 pr-4 text-xs text-[var(--color-text-muted)]">{col.description || '—'}</td>
                              <td className="py-2">
                                <input
                                  value={col.user_note}
                                  onChange={(e) => updateColumnNote(t.id, idx, e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
                                  placeholder="추가 정보..."
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add app/(app)/settings/data-sources/[id]/ components/settings/DataSourceEditor.tsx
git commit -m "feat: add data source editor with table/column annotations"
```

---

### Task 8: Add Settings link to Sidebar

**Files:**
- Modify: `components/navigation/Sidebar.tsx`

**Step 1: Add Settings link**

Add `Settings` to the lucide-react imports (line 8) and add a settings link in the footer section, above the logout button.

Import to add: `Settings`

Before the logout button div (line 212-219), insert:

```tsx
<Link
  href="/settings/data-sources"
  className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
    pathname.startsWith('/settings')
      ? 'text-[var(--color-primary)] bg-blue-50 font-medium'
      : 'text-[var(--color-text-muted)] hover:bg-gray-50'
  }`}
>
  <Settings className="w-3.5 h-3.5" /> 설정
</Link>
```

**Step 2: Commit**

```bash
git add components/navigation/Sidebar.tsx
git commit -m "feat: add settings link to sidebar"
```

---

### Task 9: Seed existing BigQuery schemas into new tables

**Files:**
- Create: `scripts/seed-bigquery.ts`

**Step 1: Create seed script**

This migrates the existing hardcoded TABLE_SCHEMAS into the new data_sources/table_schemas tables so existing functionality is preserved.

Create `scripts/seed-bigquery.ts`:

```typescript
import 'dotenv/config';
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
```

**Step 2: Run the seed**

Run: `npx tsx scripts/seed-bigquery.ts`

**Step 3: Commit**

```bash
git add scripts/seed-bigquery.ts
git commit -m "feat: add seed script for existing BigQuery data source"
```

---

### Task 10: Update middleware to allow /settings routes

**Files:**
- Modify: `middleware.ts`

**Step 1: Check and update middleware**

The middleware protects `/dashboard` routes. Since `/settings` is under `/(app)` layout, verify the middleware allows access to `/settings` for authenticated users (it should work if the matcher covers `/(app)` routes, but confirm the path matching includes `/settings`).

If the middleware matcher only targets `/dashboard`, add `/settings/:path*` to the matcher config.

**Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add settings routes to auth middleware"
```

---

## Execution Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | DB migration (data_sources + table_schemas) | lib/db.ts, scripts/migrate.ts |
| 2 | MariaDB client + introspection | lib/mariadb.ts, package.json |
| 3 | BigQuery introspection function | lib/bigquery.ts |
| 4 | Data sources API routes (CRUD + sync) | app/api/data-sources/ (3 files) |
| 5 | Dynamic schema builder + chat route update | lib/schema-builder.ts, app/api/chat/route.ts |
| 6 | Settings page — data source list | app/(app)/settings/, components/settings/DataSourceList.tsx |
| 7 | Settings page — data source editor | app/(app)/settings/[id]/, components/settings/DataSourceEditor.tsx |
| 8 | Sidebar settings link | components/navigation/Sidebar.tsx |
| 9 | Seed existing BigQuery source | scripts/seed-bigquery.ts |
| 10 | Middleware update for /settings | middleware.ts |
