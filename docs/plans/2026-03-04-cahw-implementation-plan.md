# CAHW AI Dashboard - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI-powered dashboard app where users create and modify charts via natural language, backed by BigQuery data, deployed on Vercel.

**Architecture:** Next.js 14 App Router full-stack app. Claude API generates JSON chart configs + SQL queries from natural language. Recharts renders charts. react-grid-layout handles drag-and-drop positioning. Neon Postgres stores dashboard configs. Upstash Redis caches BigQuery query results.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Recharts, react-grid-layout, @anthropic-ai/sdk, @google-cloud/bigquery, @neondatabase/serverless, @upstash/redis, lucide-react

---

## Parallel Execution Map

```
Phase 1 (parallel):
  Agent A: Task 1 - Project scaffolding

Phase 2 (parallel, after Task 1):
  Agent A: Task 2 - TypeScript types & chart config schema
  Agent B: Task 3 - PIN auth system (middleware + login page)
  Agent C: Task 4 - BigQuery client + /api/query route
  Agent D: Task 5 - Neon Postgres setup + dashboard CRUD API

Phase 3 (parallel, after Tasks 2, 4, 5):
  Agent A: Task 6 - Upstash Redis cache layer
  Agent B: Task 7 - Chart renderer components (Recharts)
  Agent C: Task 8 - Data table component
  Agent D: Task 9 - KPI card component

Phase 4 (parallel, after Tasks 7, 8, 9):
  Agent A: Task 10 - Dashboard grid layout (react-grid-layout)
  Agent B: Task 11 - Claude AI chat integration (/api/chat)

Phase 5 (parallel, after Tasks 10, 11):
  Agent A: Task 12 - Dashboard viewer page (/dashboard/[id])
  Agent B: Task 13 - Sidebar navigation

Phase 6 (after Tasks 12, 13):
  Agent A: Task 14 - Builder mode (/builder)

Phase 7 (after all):
  Agent A: Task 15 - Design system tokens + polish
  Agent B: Task 16 - Vercel deployment config
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Create: `.env.local.example`
- Create: `.gitignore`

**Step 1: Initialize Next.js project**

```bash
cd /Users/heeyounglee/Documents/dashboard_CAHW
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

Select: App Router = Yes, src/ directory = No, Tailwind = Yes, import alias = @/*

**Step 2: Install all dependencies**

```bash
npm install @anthropic-ai/sdk @google-cloud/bigquery @neondatabase/serverless @upstash/redis recharts react-grid-layout lucide-react server-only
npm install -D @types/react-grid-layout
```

**Step 3: Create .env.local.example**

Create `.env.local.example`:
```bash
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# BigQuery
GCP_PROJECT_ID=your-gcp-project
GCP_SERVICE_ACCOUNT_KEY=base64-encoded-service-account-json

# Neon Postgres
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AX...

# Auth
AUTH_PIN=1234
AUTH_SECRET=generate-a-random-64-char-string
```

**Step 4: Update next.config.ts for lucide optimization**

```ts
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['lucide-react'],
};

export default nextConfig;
```

**Step 5: Update globals.css with design system tokens**

```css
/* app/globals.css */
@import "tailwindcss";

@import 'react-grid-layout/css/styles.css';
@import 'react-resizable/css/styles.css';

:root {
  --color-primary: #1E40AF;
  --color-secondary: #3B82F6;
  --color-accent: #F59E0B;
  --color-background: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-text: #1E3A8A;
  --color-text-muted: #475569;
}
```

**Step 6: Set up root layout with fonts**

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import { Fira_Sans, Fira_Code } from 'next/font/google';
import './globals.css';

const firaSans = Fira_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-fira-sans',
});

const firaCode = Fira_Code({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fira-code',
});

export const metadata: Metadata = {
  title: 'CAHW Dashboard',
  description: 'AI-powered sales dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={`${firaSans.variable} ${firaCode.variable} font-sans bg-[var(--color-background)]`}>
        {children}
      </body>
    </html>
  );
}
```

**Step 7: Create placeholder home page**

```tsx
// app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
```

**Step 8: Verify it runs**

```bash
npm run dev
```

Expected: App starts on localhost:3000, redirects to /dashboard (404 is fine for now).

**Step 9: Commit**

```bash
git init && git add -A && git commit -m "feat: scaffold Next.js project with all dependencies"
```

---

## Task 2: TypeScript Types & Chart Config Schema

**Files:**
- Create: `lib/types/chart.ts`
- Create: `lib/types/dashboard.ts`
- Create: `lib/types/api.ts`

**Step 1: Define chart config types**

```ts
// lib/types/chart.ts
export type ChartType = 'bar' | 'line' | 'combo' | 'pie' | 'donut' | 'area' | 'table' | 'kpi';

export interface SeriesConfig {
  field: string;
  type: 'bar' | 'line' | 'area';
  color: string;
  label: string;
  yAxis?: 'left' | 'right';
}

export interface ChartMapping {
  xAxis: string;
  series: SeriesConfig[];
}

export interface TableColumn {
  field: string;
  label: string;
  format?: 'number' | 'percent' | 'currency' | 'text';
  width?: number;
  sortable?: boolean;
  conditionalColor?: {
    ranges: { min: number; max: number; color: string }[];
  };
}

export interface TableMapping {
  columns: TableColumn[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  showRowNumbers?: boolean;
}

export interface KpiMapping {
  valueField: string;
  format: 'number' | 'percent' | 'currency';
  comparisonField?: string;
  comparisonLabel?: string;
}

export interface ChartStyle {
  fontSize: {
    title: number;
    axis: number;
    label: number;
  };
  legend: {
    position: 'top' | 'bottom' | 'left' | 'right';
    visible: boolean;
  };
  dataLabels: {
    visible: boolean;
    format?: string;
  };
  gridLines: boolean;
  backgroundColor: string;
  borderRadius: number;
}

export interface ChartPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CacheConfig {
  ttl: number;
  enabled: boolean;
}

export interface ChartWidget {
  id: string;
  type: ChartType;
  title: string;
  position: ChartPosition;
  sql: string;
  cache: CacheConfig;
  mapping: ChartMapping | TableMapping | KpiMapping;
  style: ChartStyle;
}
```

**Step 2: Define dashboard types**

```ts
// lib/types/dashboard.ts
import { ChartWidget } from './chart';

export interface DashboardFolder {
  id: string;
  name: string;
  order: number;
}

export interface Dashboard {
  id: string;
  title: string;
  folderId: string | null;
  widgets: ChartWidget[];
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
}

export interface DashboardListItem {
  id: string;
  title: string;
  folderId: string | null;
  isFavorite: boolean;
  updatedAt: string;
}
```

**Step 3: Define API types**

```ts
// lib/types/api.ts
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  dashboardContext?: {
    widgets: { id: string; type: string; title: string }[];
  };
  mode: 'chat' | 'builder';
}

export interface ChatResponse {
  message: string;
  actions?: WidgetAction[];
}

export interface WidgetAction {
  action: 'create' | 'update' | 'delete';
  widget?: import('./chart').ChartWidget;
  widgetId?: string;
  sql?: string;
}

export interface QueryRequest {
  sql: string;
  cacheKey?: string;
  cacheTtl?: number;
}

export interface QueryResponse {
  data: Record<string, unknown>[];
  fromCache: boolean;
  cachedAt?: string;
}
```

**Step 4: Commit**

```bash
git add lib/types/ && git commit -m "feat: add TypeScript types for charts, dashboards, and API"
```

---

## Task 3: PIN Auth System

**Files:**
- Create: `middleware.ts`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/api/auth/route.ts`

**Step 1: Create auth API route**

```ts
// app/api/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { pin } = await req.json();

  if (pin !== process.env.AUTH_PIN) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set('auth_token', process.env.AUTH_SECRET!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('auth_token');
  return response;
}
```

**Step 2: Create middleware for route protection**

```ts
// middleware.ts (project root)
import { NextRequest, NextResponse } from 'next/server';

const protectedPrefixes = ['/dashboard', '/builder'];

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((p) => path.startsWith(p));

  if (isProtected) {
    const authToken = req.cookies.get('auth_token')?.value;
    if (authToken !== process.env.AUTH_SECRET) {
      return NextResponse.redirect(new URL('/login', req.nextUrl));
    }
  }

  if (path === '/login') {
    const authToken = req.cookies.get('auth_token')?.value;
    if (authToken === process.env.AUTH_SECRET) {
      return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

**Step 3: Create login page**

```tsx
// app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });

    if (res.ok) {
      router.push('/dashboard');
    } else {
      setError('잘못된 PIN입니다');
      setPin('');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Lock className="w-6 h-6 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">CAHW Dashboard</h1>
        </div>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN 입력"
          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] mb-4"
          autoFocus
        />
        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading || !pin}
          className="w-full py-3 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-blue-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? '확인 중...' : '로그인'}
        </button>
      </form>
    </div>
  );
}
```

**Step 4: Verify login flow works**

```bash
npm run dev
```

Open localhost:3000 → should redirect to /login. Enter PIN → should redirect to /dashboard.

**Step 5: Commit**

```bash
git add middleware.ts app/api/auth/ app/\(auth\)/ && git commit -m "feat: add PIN auth with middleware and login page"
```

---

## Task 4: BigQuery Client + Query API

**Files:**
- Create: `lib/bigquery.ts`
- Create: `app/api/query/route.ts`

**Step 1: Create BigQuery client singleton**

```ts
// lib/bigquery.ts
import 'server-only';
import { BigQuery } from '@google-cloud/bigquery';

const credentials = JSON.parse(
  Buffer.from(process.env.GCP_SERVICE_ACCOUNT_KEY!, 'base64').toString('utf-8')
);

export const bigquery = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID,
  credentials,
});

export async function runQuery(sql: string): Promise<Record<string, unknown>[]> {
  const [rows] = await bigquery.query({ query: sql });
  return rows as Record<string, unknown>[];
}
```

**Step 2: Create query API route**

```ts
// app/api/query/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/bigquery';
import type { QueryRequest, QueryResponse } from '@/lib/types/api';

export async function POST(req: NextRequest) {
  try {
    const { sql } = (await req.json()) as QueryRequest;

    if (!sql || typeof sql !== 'string') {
      return NextResponse.json({ error: 'SQL query is required' }, { status: 400 });
    }

    // Basic SQL injection prevention: block dangerous statements
    const forbidden = /\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE|EXEC)\b/i;
    if (forbidden.test(sql)) {
      return NextResponse.json({ error: 'Only SELECT queries are allowed' }, { status: 403 });
    }

    const data = await runQuery(sql);

    const response: QueryResponse = {
      data,
      fromCache: false,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Query failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add lib/bigquery.ts app/api/query/ && git commit -m "feat: add BigQuery client and query API route"
```

---

## Task 5: Neon Postgres Setup + Dashboard CRUD API

**Files:**
- Create: `lib/db.ts`
- Create: `lib/db-schema.sql`
- Create: `app/api/dashboard/route.ts`
- Create: `app/api/dashboard/[id]/route.ts`

**Step 1: Create Neon Postgres client**

```ts
// lib/db.ts
import 'server-only';
import { neon } from '@neondatabase/serverless';

export const sql = neon(process.env.DATABASE_URL!);
```

**Step 2: Create database schema SQL**

```sql
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
```

**Step 3: Create dashboard list + create API route**

```ts
// app/api/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/dashboard - list all dashboards
export async function GET() {
  try {
    const dashboards = await sql`
      SELECT id, title, folder_id, is_favorite, updated_at
      FROM dashboards
      ORDER BY updated_at DESC
    `;
    return NextResponse.json(dashboards);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboards';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/dashboard - create new dashboard
export async function POST(req: NextRequest) {
  try {
    const { title, folderId, widgets } = await req.json();

    const [dashboard] = await sql`
      INSERT INTO dashboards (title, folder_id, widgets)
      VALUES (${title}, ${folderId || null}, ${JSON.stringify(widgets || [])})
      RETURNING id, title, folder_id, widgets, is_favorite, created_at, updated_at
    `;

    return NextResponse.json(dashboard, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create dashboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 4: Create single dashboard CRUD route**

```ts
// app/api/dashboard/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/dashboard/[id] - get single dashboard
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [dashboard] = await sql`
      SELECT id, title, folder_id, widgets, is_favorite, created_at, updated_at
      FROM dashboards WHERE id = ${id}
    `;

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    return NextResponse.json(dashboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/dashboard/[id] - update dashboard
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const [dashboard] = await sql`
      UPDATE dashboards SET
        title = COALESCE(${body.title ?? null}, title),
        folder_id = COALESCE(${body.folderId ?? null}, folder_id),
        widgets = COALESCE(${body.widgets ? JSON.stringify(body.widgets) : null}::jsonb, widgets),
        is_favorite = COALESCE(${body.isFavorite ?? null}, is_favorite),
        updated_at = now()
      WHERE id = ${id}
      RETURNING id, title, folder_id, widgets, is_favorite, created_at, updated_at
    `;

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    return NextResponse.json(dashboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update dashboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/dashboard/[id] - delete dashboard
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [deleted] = await sql`
      DELETE FROM dashboards WHERE id = ${id} RETURNING id
    `;

    if (!deleted) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete dashboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 5: Commit**

```bash
git add lib/db.ts lib/db-schema.sql app/api/dashboard/ && git commit -m "feat: add Neon Postgres client and dashboard CRUD API"
```

---

## Task 6: Upstash Redis Cache Layer

**Files:**
- Create: `lib/cache.ts`
- Modify: `app/api/query/route.ts` (add caching)

**Step 1: Create cache utility**

```ts
// lib/cache.ts
import 'server-only';
import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';

export const redis = Redis.fromEnv();

const DEFAULT_TTL = 900; // 15 minutes

export function hashQuery(sql: string): string {
  return createHash('sha256').update(sql).digest('hex');
}

export async function getCachedQuery(sql: string): Promise<{ data: Record<string, unknown>[]; cachedAt: string } | null> {
  const key = `query:${hashQuery(sql)}`;
  const cached = await redis.get<{ data: Record<string, unknown>[]; cachedAt: string }>(key);
  return cached;
}

export async function setCachedQuery(sql: string, data: Record<string, unknown>[], ttl: number = DEFAULT_TTL): Promise<void> {
  const key = `query:${hashQuery(sql)}`;
  await redis.set(key, { data, cachedAt: new Date().toISOString() }, { ex: ttl });
}

export async function invalidateQuery(sql: string): Promise<void> {
  const key = `query:${hashQuery(sql)}`;
  await redis.del(key);
}
```

**Step 2: Update query API route with caching**

Replace `app/api/query/route.ts` with:

```ts
// app/api/query/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/bigquery';
import { getCachedQuery, setCachedQuery, invalidateQuery } from '@/lib/cache';
import type { QueryRequest, QueryResponse } from '@/lib/types/api';

export async function POST(req: NextRequest) {
  try {
    const { sql, cacheTtl } = (await req.json()) as QueryRequest;
    const forceRefresh = req.headers.get('x-force-refresh') === 'true';

    if (!sql || typeof sql !== 'string') {
      return NextResponse.json({ error: 'SQL query is required' }, { status: 400 });
    }

    const forbidden = /\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE|EXEC)\b/i;
    if (forbidden.test(sql)) {
      return NextResponse.json({ error: 'Only SELECT queries are allowed' }, { status: 403 });
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await getCachedQuery(sql);
      if (cached) {
        const response: QueryResponse = {
          data: cached.data,
          fromCache: true,
          cachedAt: cached.cachedAt,
        };
        return NextResponse.json(response);
      }
    } else {
      await invalidateQuery(sql);
    }

    // Cache miss or force refresh: query BigQuery
    const data = await runQuery(sql);

    // Store in cache
    await setCachedQuery(sql, data, cacheTtl);

    const response: QueryResponse = {
      data,
      fromCache: false,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Query failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add lib/cache.ts app/api/query/ && git commit -m "feat: add Upstash Redis caching for BigQuery queries"
```

---

## Task 7: Chart Renderer Components (Recharts)

**Files:**
- Create: `components/charts/BarChartWidget.tsx`
- Create: `components/charts/LineChartWidget.tsx`
- Create: `components/charts/ComboChartWidget.tsx`
- Create: `components/charts/PieChartWidget.tsx`
- Create: `components/charts/AreaChartWidget.tsx`
- Create: `components/charts/ChartRenderer.tsx`

**Step 1: Create ComboChartWidget (most complex, covers bar+line)**

```tsx
// components/charts/ComboChartWidget.tsx
'use client';

import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { ChartWidget, ChartMapping } from '@/lib/types/chart';

interface Props {
  widget: ChartWidget;
  data: Record<string, unknown>[];
}

export function ComboChartWidget({ widget, data }: Props) {
  const mapping = widget.mapping as ChartMapping;
  const { style } = widget;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        {style.gridLines && <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />}
        <XAxis
          dataKey={mapping.xAxis}
          tick={{ fontSize: style.fontSize.axis }}
          tickLine={false}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: style.fontSize.axis }}
          tickLine={false}
        />
        {mapping.series.some((s) => s.yAxis === 'right') && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: style.fontSize.axis }}
            tickLine={false}
          />
        )}
        <Tooltip />
        {style.legend.visible && (
          <Legend
            verticalAlign={style.legend.position === 'bottom' ? 'bottom' : 'top'}
            align="center"
          />
        )}
        {mapping.series.map((s) => {
          if (s.type === 'bar') {
            return (
              <Bar
                key={s.field}
                yAxisId={s.yAxis || 'left'}
                dataKey={s.field}
                name={s.label}
                fill={s.color}
                radius={[4, 4, 0, 0]}
                label={style.dataLabels.visible ? { fontSize: style.fontSize.label } : false}
              />
            );
          }
          return (
            <Line
              key={s.field}
              yAxisId={s.yAxis || 'left'}
              type="monotone"
              dataKey={s.field}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 4 }}
              label={style.dataLabels.visible ? { fontSize: style.fontSize.label } : false}
            />
          );
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
```

**Step 2: Create BarChartWidget**

```tsx
// components/charts/BarChartWidget.tsx
'use client';

import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { ChartWidget, ChartMapping } from '@/lib/types/chart';

interface Props {
  widget: ChartWidget;
  data: Record<string, unknown>[];
}

export function BarChartWidget({ widget, data }: Props) {
  const mapping = widget.mapping as ChartMapping;
  const { style } = widget;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        {style.gridLines && <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />}
        <XAxis dataKey={mapping.xAxis} tick={{ fontSize: style.fontSize.axis }} />
        <YAxis tick={{ fontSize: style.fontSize.axis }} />
        <Tooltip />
        {style.legend.visible && <Legend verticalAlign={style.legend.position === 'bottom' ? 'bottom' : 'top'} />}
        {mapping.series.map((s) => (
          <Bar
            key={s.field}
            dataKey={s.field}
            name={s.label}
            fill={s.color}
            radius={[4, 4, 0, 0]}
            label={style.dataLabels.visible ? { fontSize: style.fontSize.label } : false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
```

**Step 3: Create LineChartWidget**

```tsx
// components/charts/LineChartWidget.tsx
'use client';

import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { ChartWidget, ChartMapping } from '@/lib/types/chart';

interface Props {
  widget: ChartWidget;
  data: Record<string, unknown>[];
}

export function LineChartWidget({ widget, data }: Props) {
  const mapping = widget.mapping as ChartMapping;
  const { style } = widget;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        {style.gridLines && <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />}
        <XAxis dataKey={mapping.xAxis} tick={{ fontSize: style.fontSize.axis }} />
        <YAxis tick={{ fontSize: style.fontSize.axis }} />
        <Tooltip />
        {style.legend.visible && <Legend verticalAlign={style.legend.position === 'bottom' ? 'bottom' : 'top'} />}
        {mapping.series.map((s) => (
          <Line
            key={s.field}
            type="monotone"
            dataKey={s.field}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 4 }}
            label={style.dataLabels.visible ? { fontSize: style.fontSize.label } : false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Step 4: Create PieChartWidget**

```tsx
// components/charts/PieChartWidget.tsx
'use client';

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { ChartWidget, ChartMapping } from '@/lib/types/chart';

const COLORS = ['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#F59E0B', '#FBBF24', '#34D399', '#F87171'];

interface Props {
  widget: ChartWidget;
  data: Record<string, unknown>[];
}

export function PieChartWidget({ widget, data }: Props) {
  const mapping = widget.mapping as ChartMapping;
  const { style } = widget;
  const series = mapping.series[0];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey={series.field}
          nameKey={mapping.xAxis}
          cx="50%"
          cy="50%"
          outerRadius="70%"
          innerRadius={widget.type === 'donut' ? '40%' : 0}
          label={style.dataLabels.visible ? { fontSize: style.fontSize.label } : false}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        {style.legend.visible && <Legend verticalAlign={style.legend.position === 'bottom' ? 'bottom' : 'top'} />}
      </PieChart>
    </ResponsiveContainer>
  );
}
```

**Step 5: Create AreaChartWidget**

```tsx
// components/charts/AreaChartWidget.tsx
'use client';

import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { ChartWidget, ChartMapping } from '@/lib/types/chart';

interface Props {
  widget: ChartWidget;
  data: Record<string, unknown>[];
}

export function AreaChartWidget({ widget, data }: Props) {
  const mapping = widget.mapping as ChartMapping;
  const { style } = widget;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        {style.gridLines && <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />}
        <XAxis dataKey={mapping.xAxis} tick={{ fontSize: style.fontSize.axis }} />
        <YAxis tick={{ fontSize: style.fontSize.axis }} />
        <Tooltip />
        {style.legend.visible && <Legend verticalAlign={style.legend.position === 'bottom' ? 'bottom' : 'top'} />}
        {mapping.series.map((s) => (
          <Area
            key={s.field}
            type="monotone"
            dataKey={s.field}
            name={s.label}
            stroke={s.color}
            fill={s.color}
            fillOpacity={0.2}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

**Step 6: Create unified ChartRenderer dispatcher**

```tsx
// components/charts/ChartRenderer.tsx
'use client';

import dynamic from 'next/dynamic';
import type { ChartWidget } from '@/lib/types/chart';

const BarChartWidget = dynamic(() => import('./BarChartWidget').then(m => ({ default: m.BarChartWidget })), { ssr: false });
const LineChartWidget = dynamic(() => import('./LineChartWidget').then(m => ({ default: m.LineChartWidget })), { ssr: false });
const ComboChartWidget = dynamic(() => import('./ComboChartWidget').then(m => ({ default: m.ComboChartWidget })), { ssr: false });
const PieChartWidget = dynamic(() => import('./PieChartWidget').then(m => ({ default: m.PieChartWidget })), { ssr: false });
const AreaChartWidget = dynamic(() => import('./AreaChartWidget').then(m => ({ default: m.AreaChartWidget })), { ssr: false });
const DataTableWidget = dynamic(() => import('./DataTableWidget').then(m => ({ default: m.DataTableWidget })), { ssr: false });
const KpiCardWidget = dynamic(() => import('./KpiCardWidget').then(m => ({ default: m.KpiCardWidget })), { ssr: false });

interface Props {
  widget: ChartWidget;
  data: Record<string, unknown>[];
}

export function ChartRenderer({ widget, data }: Props) {
  switch (widget.type) {
    case 'bar':
      return <BarChartWidget widget={widget} data={data} />;
    case 'line':
      return <LineChartWidget widget={widget} data={data} />;
    case 'combo':
      return <ComboChartWidget widget={widget} data={data} />;
    case 'pie':
    case 'donut':
      return <PieChartWidget widget={widget} data={data} />;
    case 'area':
      return <AreaChartWidget widget={widget} data={data} />;
    case 'table':
      return <DataTableWidget widget={widget} data={data} />;
    case 'kpi':
      return <KpiCardWidget widget={widget} data={data} />;
    default:
      return <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">Unsupported chart type</div>;
  }
}
```

**Step 7: Commit**

```bash
git add components/charts/ && git commit -m "feat: add Recharts widget components and unified renderer"
```

---

## Task 8: Data Table Component

**Files:**
- Create: `components/charts/DataTableWidget.tsx`

**Step 1: Create data table with sorting and conditional formatting**

```tsx
// components/charts/DataTableWidget.tsx
'use client';

import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { ChartWidget, TableMapping } from '@/lib/types/chart';

interface Props {
  widget: ChartWidget;
  data: Record<string, unknown>[];
}

export function DataTableWidget({ widget, data }: Props) {
  const mapping = widget.mapping as TableMapping;
  const { style } = widget;
  const [sortField, setSortField] = useState(mapping.sortBy || '');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(mapping.sortOrder || 'asc');

  const sortedData = useMemo(() => {
    if (!sortField) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortOrder === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [data, sortField, sortOrder]);

  function handleSort(field: string) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }

  function formatValue(value: unknown, format?: string): string {
    if (value == null) return '-';
    if (format === 'percent') return `${Number(value).toFixed(0)}%`;
    if (format === 'currency') return `₩${Number(value).toLocaleString()}`;
    if (format === 'number') return Number(value).toLocaleString();
    return String(value);
  }

  function getCellColor(value: unknown, col: (typeof mapping.columns)[0]): string | undefined {
    if (!col.conditionalColor || typeof value !== 'number') return undefined;
    for (const range of col.conditionalColor.ranges) {
      if (value >= range.min && value <= range.max) return range.color;
    }
    return undefined;
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full border-collapse" style={{ fontSize: style.fontSize.axis }}>
        <thead>
          <tr className="border-b border-gray-200">
            {mapping.showRowNumbers && (
              <th className="px-3 py-2 text-left text-[var(--color-text-muted)] font-medium">#</th>
            )}
            {mapping.columns.map((col) => (
              <th
                key={col.field}
                className="px-3 py-2 text-left text-[var(--color-text-muted)] font-medium"
                style={{ width: col.width }}
              >
                <button
                  onClick={() => col.sortable !== false && handleSort(col.field)}
                  className="flex items-center gap-1 cursor-pointer hover:text-[var(--color-text)]"
                  disabled={col.sortable === false}
                >
                  {col.label}
                  {col.sortable !== false && (
                    sortField === col.field
                      ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
                      : <ArrowUpDown className="w-3 h-3 opacity-30" />
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              {mapping.showRowNumbers && (
                <td className="px-3 py-2 text-[var(--color-text-muted)]">{i + 1}.</td>
              )}
              {mapping.columns.map((col) => (
                <td
                  key={col.field}
                  className="px-3 py-2"
                  style={{ backgroundColor: getCellColor(row[col.field], col) }}
                >
                  <span className="font-mono">{formatValue(row[col.field], col.format)}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/charts/DataTableWidget.tsx && git commit -m "feat: add sortable data table with conditional formatting"
```

---

## Task 9: KPI Card Component

**Files:**
- Create: `components/charts/KpiCardWidget.tsx`

**Step 1: Create KPI card**

```tsx
// components/charts/KpiCardWidget.tsx
'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ChartWidget, KpiMapping } from '@/lib/types/chart';

interface Props {
  widget: ChartWidget;
  data: Record<string, unknown>[];
}

export function KpiCardWidget({ widget, data }: Props) {
  const mapping = widget.mapping as KpiMapping;
  const { style } = widget;
  const row = data[0] || {};

  const value = Number(row[mapping.valueField] || 0);
  const comparison = mapping.comparisonField ? Number(row[mapping.comparisonField] || 0) : null;

  function formatValue(val: number): string {
    if (mapping.format === 'percent') return `${val.toFixed(1)}%`;
    if (mapping.format === 'currency') return `₩${val.toLocaleString()}`;
    return val.toLocaleString();
  }

  const TrendIcon = comparison === null
    ? null
    : comparison > 0
      ? TrendingUp
      : comparison < 0
        ? TrendingDown
        : Minus;

  const trendColor = comparison === null
    ? ''
    : comparison > 0
      ? 'text-green-600'
      : comparison < 0
        ? 'text-red-500'
        : 'text-gray-400';

  return (
    <div className="flex flex-col justify-center items-center h-full gap-2">
      <span className="font-mono text-3xl font-bold text-[var(--color-text)]" style={{ fontSize: style.fontSize.title * 2 }}>
        {formatValue(value)}
      </span>
      {comparison !== null && TrendIcon && (
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          <span className="text-sm font-medium">
            {comparison > 0 ? '+' : ''}{formatValue(comparison)}
          </span>
          {mapping.comparisonLabel && (
            <span className="text-xs text-[var(--color-text-muted)]">{mapping.comparisonLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/charts/KpiCardWidget.tsx && git commit -m "feat: add KPI card component with trend indicators"
```

---

## Task 10: Dashboard Grid Layout

**Files:**
- Create: `components/dashboard/DashboardGrid.tsx`
- Create: `components/dashboard/WidgetCard.tsx`
- Create: `hooks/useWidgetData.ts`

**Step 1: Create data fetching hook**

```ts
// hooks/useWidgetData.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ChartWidget } from '@/lib/types/chart';

interface WidgetDataState {
  data: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
  fromCache: boolean;
}

export function useWidgetData(widget: ChartWidget) {
  const [state, setState] = useState<WidgetDataState>({
    data: [],
    loading: true,
    error: null,
    fromCache: false,
  });

  const fetchData = useCallback(async (forceRefresh = false) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(forceRefresh ? { 'x-force-refresh': 'true' } : {}),
        },
        body: JSON.stringify({
          sql: widget.sql,
          cacheTtl: widget.cache.enabled ? widget.cache.ttl : 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Query failed');
      }

      const result = await res.json();
      setState({ data: result.data, loading: false, error: null, fromCache: result.fromCache });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [widget.sql, widget.cache.enabled, widget.cache.ttl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refresh: () => fetchData(true) };
}
```

**Step 2: Create WidgetCard wrapper**

```tsx
// components/dashboard/WidgetCard.tsx
'use client';

import { RefreshCw, GripVertical } from 'lucide-react';
import { ChartRenderer } from '@/components/charts/ChartRenderer';
import { useWidgetData } from '@/hooks/useWidgetData';
import type { ChartWidget } from '@/lib/types/chart';

interface Props {
  widget: ChartWidget;
}

export function WidgetCard({ widget }: Props) {
  const { data, loading, error, fromCache, refresh } = useWidgetData(widget);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
          <h3 className="font-medium text-sm text-[var(--color-text)]" style={{ fontSize: widget.style.fontSize.title }}>
            {widget.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {fromCache && (
            <span className="text-xs text-[var(--color-text-muted)]">cached</span>
          )}
          <button
            onClick={refresh}
            className="p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[var(--color-text-muted)] ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-2 min-h-0">
        {loading && !data.length ? (
          <div className="h-full animate-pulse bg-gray-50 rounded" />
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500 text-sm">{error}</div>
        ) : (
          <ChartRenderer widget={widget} data={data} />
        )}
      </div>
    </div>
  );
}
```

**Step 3: Create DashboardGrid**

```tsx
// components/dashboard/DashboardGrid.tsx
'use client';

import { useState, useCallback } from 'react';
import ReactGridLayout from 'react-grid-layout';
import { useContainerWidth } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import { WidgetCard } from './WidgetCard';
import type { ChartWidget } from '@/lib/types/chart';

interface Props {
  widgets: ChartWidget[];
  onLayoutChange?: (widgets: ChartWidget[]) => void;
  editable?: boolean;
}

export function DashboardGrid({ widgets, onLayoutChange, editable = true }: Props) {
  const { width, containerRef, mounted } = useContainerWidth();
  const [currentWidgets, setCurrentWidgets] = useState(widgets);

  const layout: Layout[] = currentWidgets.map((w) => ({
    i: w.id,
    x: w.position.x,
    y: w.position.y,
    w: w.position.w,
    h: w.position.h,
    minW: 2,
    minH: 2,
  }));

  const handleLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      const updated = currentWidgets.map((widget) => {
        const layoutItem = newLayout.find((l) => l.i === widget.id);
        if (!layoutItem) return widget;
        return {
          ...widget,
          position: { x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h },
        };
      });
      setCurrentWidgets(updated);
      onLayoutChange?.(updated);
    },
    [currentWidgets, onLayoutChange]
  );

  return (
    <div ref={containerRef} className="w-full">
      {mounted && (
        <ReactGridLayout
          layout={layout}
          width={width}
          gridConfig={{ cols: 12, rowHeight: 80, margin: [16, 16] }}
          dragConfig={{ enabled: editable }}
          resizeConfig={{ enable: editable }}
          onLayoutChange={handleLayoutChange}
        >
          {currentWidgets.map((widget) => (
            <div key={widget.id}>
              <WidgetCard widget={widget} />
            </div>
          ))}
        </ReactGridLayout>
      )}
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add components/dashboard/ hooks/ && git commit -m "feat: add dashboard grid with drag-and-drop and data fetching"
```

---

## Task 11: Claude AI Chat Integration

**Files:**
- Create: `lib/ai/system-prompt.ts`
- Create: `lib/ai/schema.ts`
- Create: `app/api/chat/route.ts`
- Create: `components/chat/ChatPanel.tsx`
- Create: `components/chat/ChatMessage.tsx`

**Step 1: Create system prompt builder**

```ts
// lib/ai/system-prompt.ts
import 'server-only';
import type { ChartWidget } from '@/lib/types/chart';
import { CHART_CONFIG_SCHEMA } from './schema';

export function buildSystemPrompt(
  tableSchemas: string,
  dashboardWidgets?: { id: string; type: string; title: string }[]
): string {
  const widgetContext = dashboardWidgets?.length
    ? `\n\nCurrent dashboard widgets:\n${JSON.stringify(dashboardWidgets, null, 2)}`
    : '';

  return `You are a dashboard assistant that creates and modifies chart configurations for a sales analytics dashboard.

You communicate in Korean. When you create or modify charts, you MUST respond with valid JSON actions.

Available BigQuery tables and their schemas:
${tableSchemas}

Chart config JSON schema:
${CHART_CONFIG_SCHEMA}
${widgetContext}

When a user asks you to create or modify a chart, respond with a JSON block in this format:
\`\`\`json
{
  "message": "Your Korean response explaining what you did",
  "actions": [
    {
      "action": "create" | "update" | "delete",
      "widget": { ...full chart widget config... },
      "widgetId": "id of widget to update/delete"
    }
  ]
}
\`\`\`

Rules:
- Always generate valid SQL for BigQuery
- Use appropriate chart types for the data
- Use the design system colors: primary #1E40AF, secondary #3B82F6, accent #F59E0B
- Generate unique IDs for new widgets (format: widget_<timestamp>)
- Position new widgets in the next available grid position
- If the user asks a question that doesn't require chart changes, respond with just a message (no actions)
- Keep SQL queries as SELECT-only, never modify data`;
}
```

**Step 2: Create schema definition**

```ts
// lib/ai/schema.ts
export const CHART_CONFIG_SCHEMA = `{
  "id": "string (unique, format: widget_<timestamp>)",
  "type": "bar | line | combo | pie | donut | area | table | kpi",
  "title": "string (Korean)",
  "position": { "x": 0-11, "y": number, "w": 1-12, "h": 1-8 },
  "sql": "SELECT ... FROM ... (valid BigQuery SQL)",
  "cache": { "ttl": number_seconds, "enabled": boolean },
  "mapping": {
    "xAxis": "column_name",
    "series": [{ "field": "column_name", "type": "bar|line|area", "color": "#hex", "label": "Korean label", "yAxis": "left|right" }]
  },
  "style": {
    "fontSize": { "title": 12-24, "axis": 10-16, "label": 9-14 },
    "legend": { "position": "top|bottom|left|right", "visible": boolean },
    "dataLabels": { "visible": boolean, "format": "{value} or {value}%" },
    "gridLines": boolean,
    "backgroundColor": "#hex",
    "borderRadius": 0-16
  }
}

For table type, mapping uses:
{
  "columns": [{ "field": "col", "label": "Korean", "format": "number|percent|currency|text", "sortable": boolean }],
  "showRowNumbers": boolean
}

For kpi type, mapping uses:
{
  "valueField": "column",
  "format": "number|percent|currency",
  "comparisonField": "optional_column",
  "comparisonLabel": "전월 대비"
}`;
```

**Step 3: Create chat API route**

```ts
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import type { ChatRequest } from '@/lib/types/api';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// TODO: Replace with actual BigQuery schema discovery
const TABLE_SCHEMAS = `
-- Replace this with your actual BigQuery table schemas
-- Example:
-- Table: project.dataset.sales_data
-- Columns: team_lead (STRING), total_contracts (INTEGER), completed_count (INTEGER), incomplete_count (INTEGER), completion_rate (FLOAT)
`;

export async function POST(req: NextRequest) {
  try {
    const { messages, dashboardContext, mode } = (await req.json()) as ChatRequest;

    const systemPrompt = buildSystemPrompt(
      TABLE_SCHEMAS,
      dashboardContext?.widgets
    );

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const textContent = response.content.find((c) => c.type === 'text');
    const rawText = textContent?.text || '';

    // Try to parse JSON response with actions
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

**Step 4: Create ChatMessage component**

```tsx
// components/chat/ChatMessage.tsx
'use client';

import { Bot, User } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/lib/types/api';

interface Props {
  message: ChatMessageType;
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-[var(--color-primary)]' : 'bg-gray-100'
      }`}>
        {isUser
          ? <User className="w-4 h-4 text-white" />
          : <Bot className="w-4 h-4 text-[var(--color-text-muted)]" />
        }
      </div>
      <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
        isUser
          ? 'bg-[var(--color-primary)] text-white'
          : 'bg-gray-100 text-[var(--color-text)]'
      }`}>
        {message.content}
      </div>
    </div>
  );
}
```

**Step 5: Create ChatPanel component**

```tsx
// components/chat/ChatPanel.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, X, MessageSquare, Loader2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import type { ChatMessage as ChatMessageType, ChatResponse, WidgetAction } from '@/lib/types/api';

interface Props {
  dashboardWidgets?: { id: string; type: string; title: string }[];
  onActions?: (actions: WidgetAction[]) => void;
}

export function ChatPanel({ dashboardWidgets, onActions }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessageType = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          dashboardContext: { widgets: dashboardWidgets || [] },
          mode: 'chat',
        }),
      });

      const data: ChatResponse = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message },
      ]);

      if (data.actions?.length && onActions) {
        onActions(data.actions);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '오류가 발생했습니다. 다시 시도해주세요.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[var(--color-primary)] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-800 transition-colors cursor-pointer z-50"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 w-96 h-[600px] bg-white border-l border-t border-gray-200 shadow-xl flex flex-col z-50 rounded-tl-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-[var(--color-text)]">AI 어시스턴트</h3>
        <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-sm text-[var(--color-text-muted)] mt-8">
            차트를 만들거나 수정하고 싶으시면 말씀해주세요.
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-[var(--color-text-muted)] animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="border-t border-gray-100 p-3 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="예: 매출완료율을 막대차트로 보여줘"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
```

**Step 6: Commit**

```bash
git add lib/ai/ app/api/chat/ components/chat/ && git commit -m "feat: add Claude AI chat integration with system prompt and chat panel"
```

---

## Task 12: Dashboard Viewer Page

**Files:**
- Create: `app/(app)/layout.tsx`
- Create: `app/(app)/dashboard/page.tsx`
- Create: `app/(app)/dashboard/[id]/page.tsx`
- Create: `components/dashboard/DashboardHeader.tsx`

**Step 1: Create app layout (with sidebar slot)**

```tsx
// app/(app)/layout.tsx
import { Sidebar } from '@/components/navigation/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[var(--color-background)]">
        {children}
      </main>
    </div>
  );
}
```

**Step 2: Create dashboard list page**

```tsx
// app/(app)/dashboard/page.tsx
import { sql } from '@/lib/db';
import Link from 'next/link';
import { LayoutDashboard, Star, Plus } from 'lucide-react';

export default async function DashboardListPage() {
  const dashboards = await sql`
    SELECT id, title, folder_id, is_favorite, updated_at
    FROM dashboards ORDER BY updated_at DESC
  `;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">대시보드</h1>
        <Link
          href="/builder"
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-blue-800 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> 새 대시보드
        </Link>
      </div>

      {dashboards.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-text-muted)]">
          <LayoutDashboard className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>아직 대시보드가 없습니다.</p>
          <p className="text-sm mt-1">새 대시보드를 만들어 시작하세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboards.map((d: Record<string, unknown>) => (
            <Link
              key={d.id as string}
              href={`/dashboard/${d.id}`}
              className="bg-white rounded-lg border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-[var(--color-text)]">{d.title as string}</h3>
                {d.is_favorite && <Star className="w-4 h-4 text-[var(--color-accent)] fill-current" />}
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-2">
                {new Date(d.updated_at as string).toLocaleDateString('ko-KR')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Create single dashboard viewer page**

```tsx
// app/(app)/dashboard/[id]/page.tsx
import { sql } from '@/lib/db';
import { notFound } from 'next/navigation';
import { DashboardView } from '@/components/dashboard/DashboardView';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [dashboard] = await sql`
    SELECT id, title, folder_id, widgets, is_favorite, created_at, updated_at
    FROM dashboards WHERE id = ${id}
  `;

  if (!dashboard) notFound();

  return (
    <DashboardView
      dashboard={{
        id: dashboard.id as string,
        title: dashboard.title as string,
        folderId: dashboard.folder_id as string | null,
        widgets: (dashboard.widgets || []) as import('@/lib/types/chart').ChartWidget[],
        createdAt: dashboard.created_at as string,
        updatedAt: dashboard.updated_at as string,
        isFavorite: dashboard.is_favorite as boolean,
      }}
    />
  );
}
```

**Step 4: Create DashboardView client component**

```tsx
// components/dashboard/DashboardView.tsx
'use client';

import { useState, useCallback } from 'react';
import { RefreshCw, Star } from 'lucide-react';
import { DashboardGrid } from './DashboardGrid';
import { ChatPanel } from '@/components/chat/ChatPanel';
import type { Dashboard } from '@/lib/types/dashboard';
import type { ChartWidget } from '@/lib/types/chart';
import type { WidgetAction } from '@/lib/types/api';

interface Props {
  dashboard: Dashboard;
}

export function DashboardView({ dashboard }: Props) {
  const [widgets, setWidgets] = useState<ChartWidget[]>(dashboard.widgets);
  const [saving, setSaving] = useState(false);

  const saveWidgets = useCallback(async (updated: ChartWidget[]) => {
    setSaving(true);
    await fetch(`/api/dashboard/${dashboard.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widgets: updated }),
    });
    setSaving(false);
  }, [dashboard.id]);

  const handleLayoutChange = useCallback((updated: ChartWidget[]) => {
    setWidgets(updated);
    saveWidgets(updated);
  }, [saveWidgets]);

  const handleAiActions = useCallback((actions: WidgetAction[]) => {
    setWidgets((prev) => {
      let updated = [...prev];
      for (const action of actions) {
        if (action.action === 'create' && action.widget) {
          updated.push(action.widget);
        } else if (action.action === 'update' && action.widgetId && action.widget) {
          updated = updated.map((w) => w.id === action.widgetId ? action.widget! : w);
        } else if (action.action === 'delete' && action.widgetId) {
          updated = updated.filter((w) => w.id !== action.widgetId);
        }
      }
      saveWidgets(updated);
      return updated;
    });
  }, [saveWidgets]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-[var(--color-text)]">{dashboard.title}</h1>
          <Star className={`w-4 h-4 cursor-pointer ${dashboard.isFavorite ? 'text-[var(--color-accent)] fill-current' : 'text-gray-300'}`} />
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          {saving && <span>저장 중...</span>}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {widgets.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
            <p>AI 채팅으로 차트를 추가해보세요.</p>
          </div>
        ) : (
          <DashboardGrid widgets={widgets} onLayoutChange={handleLayoutChange} />
        )}
      </div>

      {/* Chat */}
      <ChatPanel
        dashboardWidgets={widgets.map((w) => ({ id: w.id, type: w.type, title: w.title }))}
        onActions={handleAiActions}
      />
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add app/\(app\)/ components/dashboard/DashboardView.tsx && git commit -m "feat: add dashboard viewer pages with AI-powered widget management"
```

---

## Task 13: Sidebar Navigation

**Files:**
- Create: `components/navigation/Sidebar.tsx`

**Step 1: Create sidebar with dashboard list, folders, search, favorites**

```tsx
// components/navigation/Sidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Plus, Search, Star, ChevronDown, ChevronRight,
  FolderOpen, Settings, LogOut,
} from 'lucide-react';
import type { DashboardListItem } from '@/lib/types/dashboard';

export function Sidebar() {
  const pathname = usePathname();
  const [dashboards, setDashboards] = useState<DashboardListItem[]>([]);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setDashboards)
      .catch(() => {});
  }, []);

  const filtered = dashboards.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  const favorites = filtered.filter((d) => d.isFavorite);
  const recent = filtered.slice(0, 5);

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' });
    window.location.href = '/login';
  }

  return (
    <aside className="w-60 h-screen bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-50">
        <h2 className="font-bold text-[var(--color-text)] text-lg">CAHW</h2>
        <p className="text-xs text-[var(--color-text-muted)]">Dashboard</p>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="검색..."
            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
          />
        </div>
      </div>

      {/* New dashboard button */}
      <div className="px-3 py-1">
        <Link
          href="/builder"
          className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-[var(--color-primary)] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> 새 대시보드
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {/* Favorites */}
        {favorites.length > 0 && (
          <div>
            <button
              onClick={() => setCollapsed((p) => ({ ...p, fav: !p.fav }))}
              className="flex items-center gap-1 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1 cursor-pointer"
            >
              {collapsed.fav ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              즐겨찾기
            </button>
            {!collapsed.fav && favorites.map((d) => (
              <Link
                key={d.id}
                href={`/dashboard/${d.id}`}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  pathname === `/dashboard/${d.id}`
                    ? 'bg-blue-50 text-[var(--color-primary)] font-medium'
                    : 'text-[var(--color-text)] hover:bg-gray-50'
                }`}
              >
                <Star className="w-3.5 h-3.5 text-[var(--color-accent)] fill-current" />
                <span className="truncate">{d.title}</span>
              </Link>
            ))}
          </div>
        )}

        {/* All dashboards */}
        <div>
          <button
            onClick={() => setCollapsed((p) => ({ ...p, all: !p.all }))}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1 cursor-pointer"
          >
            {collapsed.all ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            대시보드
          </button>
          {!collapsed.all && filtered.map((d) => (
            <Link
              key={d.id}
              href={`/dashboard/${d.id}`}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                pathname === `/dashboard/${d.id}`
                  ? 'bg-blue-50 text-[var(--color-primary)] font-medium'
                  : 'text-[var(--color-text)] hover:bg-gray-50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="truncate">{d.title}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-50 px-3 py-2">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> 로그아웃
        </button>
      </div>
    </aside>
  );
}
```

**Step 2: Commit**

```bash
git add components/navigation/ && git commit -m "feat: add sidebar navigation with search, favorites, and dashboard list"
```

---

## Task 14: Builder Mode

**Files:**
- Create: `app/(app)/builder/page.tsx`
- Create: `components/builder/BuilderView.tsx`

**Step 1: Create builder page**

```tsx
// app/(app)/builder/page.tsx
import { BuilderView } from '@/components/builder/BuilderView';

export default function BuilderPage() {
  return <BuilderView />;
}
```

**Step 2: Create BuilderView (full-screen AI-guided dashboard creation)**

```tsx
// components/builder/BuilderView.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, ArrowLeft } from 'lucide-react';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import type { ChartWidget } from '@/lib/types/chart';
import type { ChatMessage, WidgetAction } from '@/lib/types/api';

export function BuilderView() {
  const router = useRouter();
  const [title, setTitle] = useState('새 대시보드');
  const [widgets, setWidgets] = useState<ChartWidget[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          dashboardContext: { widgets: widgets.map((w) => ({ id: w.id, type: w.type, title: w.title })) },
          mode: 'builder',
        }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);

      if (data.actions?.length) {
        setWidgets((prev) => {
          let updated = [...prev];
          for (const action of data.actions as WidgetAction[]) {
            if (action.action === 'create' && action.widget) updated.push(action.widget);
            else if (action.action === 'update' && action.widgetId && action.widget) {
              updated = updated.map((w) => w.id === action.widgetId ? action.widget! : w);
            } else if (action.action === 'delete' && action.widgetId) {
              updated = updated.filter((w) => w.id !== action.widgetId);
            }
          }
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '오류가 발생했습니다.' }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, widgets }),
      });
      const dashboard = await res.json();
      router.push(`/dashboard/${dashboard.id}`);
    } catch {
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-bold text-[var(--color-text)] border-none focus:outline-none bg-transparent"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving || widgets.length === 0}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? '저장 중...' : '대시보드 저장'}
        </button>
      </div>

      {/* Main area: Grid + Chat side by side */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 overflow-y-auto p-4">
          {widgets.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
              <div className="text-center">
                <p className="text-lg mb-2">어떤 대시보드를 만들까요?</p>
                <p className="text-sm">오른쪽 채팅에서 원하는 차트를 설명해주세요.</p>
              </div>
            </div>
          ) : (
            <DashboardGrid widgets={widgets} />
          )}
        </div>

        {/* Chat panel (always visible in builder) */}
        <div className="w-96 border-l border-gray-100 bg-white flex flex-col">
          <div className="px-4 py-3 border-b border-gray-50">
            <h3 className="font-semibold text-sm text-[var(--color-text)]">AI 빌더</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`text-sm ${msg.role === 'user' ? 'text-right' : ''}`}>
                <span className={`inline-block px-3 py-2 rounded-lg max-w-[90%] ${
                  msg.role === 'user'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-gray-100 text-[var(--color-text)]'
                }`}>
                  {msg.content}
                </span>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <Loader2 className="w-4 h-4 animate-spin" /> 생성 중...
              </div>
            )}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="border-t border-gray-50 p-3 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="예: 팀장별 매출완료율 차트 만들어줘"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 bg-[var(--color-primary)] text-white rounded-lg disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add app/\(app\)/builder/ components/builder/ && git commit -m "feat: add AI-powered dashboard builder mode"
```

---

## Task 15: Design System Tokens + Polish

**Files:**
- Modify: `tailwind.config.ts` (add design tokens)
- Modify: `app/globals.css` (refine)

**Step 1: Update Tailwind config with design tokens**

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E40AF',
        secondary: '#3B82F6',
        accent: '#F59E0B',
        surface: '#FFFFFF',
        background: '#F8FAFC',
        'text-primary': '#1E3A8A',
        'text-muted': '#475569',
      },
      fontFamily: {
        sans: ['var(--font-fira-sans)', 'sans-serif'],
        mono: ['var(--font-fira-code)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
```

**Step 2: Commit**

```bash
git add tailwind.config.ts app/globals.css && git commit -m "feat: add design system tokens to Tailwind config"
```

---

## Task 16: Vercel Deployment Config

**Files:**
- Create: `vercel.json`
- Modify: `next.config.ts`

**Step 1: Create vercel.json**

```json
{
  "framework": "nextjs",
  "regions": ["icn1"],
  "env": {
    "ANTHROPIC_API_KEY": "@anthropic-api-key",
    "GCP_PROJECT_ID": "@gcp-project-id",
    "GCP_SERVICE_ACCOUNT_KEY": "@gcp-service-account-key",
    "AUTH_PIN": "@auth-pin",
    "AUTH_SECRET": "@auth-secret"
  }
}
```

Note: `icn1` = Seoul region for lowest latency for Korean users.

**Step 2: Set up Vercel integrations**

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Add Neon Postgres integration from Vercel dashboard
# Add Upstash Redis integration from Vercel dashboard
# These auto-inject DATABASE_URL and UPSTASH_REDIS_* env vars

# Set remaining secrets
vercel env add ANTHROPIC_API_KEY
vercel env add GCP_PROJECT_ID
vercel env add GCP_SERVICE_ACCOUNT_KEY
vercel env add AUTH_PIN
vercel env add AUTH_SECRET
```

**Step 3: Run the database migration**

Connect to Neon console and run the SQL from `lib/db-schema.sql`.

**Step 4: Deploy**

```bash
vercel --prod
```

**Step 5: Commit**

```bash
git add vercel.json && git commit -m "feat: add Vercel deployment config with Seoul region"
```

---

## Post-Deployment: Update BigQuery Table Schemas

After deploying, update `app/api/chat/route.ts` with your actual BigQuery table schemas so Claude can generate accurate SQL queries. Replace the `TABLE_SCHEMAS` constant with your real schema information.
