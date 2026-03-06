# CAHW AI Dashboard - Parallel Agent Prompts

Run all prompts within a phase **simultaneously** in separate terminals. Wait for a phase to complete before starting the next.

## Cheat Sheet

| Phase | Terminals | Wait For | What Gets Built |
|-------|-----------|----------|-----------------|
| 1 | 1 | Nothing | Next.js scaffolding + all dependencies |
| 2 | 4 | Phase 1 | Types, Auth, BigQuery client, Postgres CRUD |
| 3 | 4 | Phase 2 | Redis cache, Chart widgets, Table, KPI card |
| 4 | 2 | Phase 3 | Dashboard grid + Claude AI chat |
| 5 | 2 | Phase 4 | Dashboard pages + Sidebar nav |
| 6 | 1 | Phase 5 | Builder mode |
| 7 | 2 | Phase 6 | Design tokens + Vercel deploy |

---

## Phase 1 (1 terminal)

### Terminal 1: Project Scaffolding

```
cd /Users/heeyounglee/Documents/dashboard_CAHW

Read the implementation plan at docs/plans/2026-03-04-cahw-implementation-plan.md. Execute Task 1: Project Scaffolding. This sets up the Next.js project, installs all dependencies, creates globals.css with design tokens, root layout with Fira Sans/Code fonts, and next.config.ts. Follow every step exactly. After completing, run `npm run dev` to verify it starts, then commit.
```

---

## Phase 2 (4 terminals, after Phase 1 completes)

### Terminal 1: TypeScript Types

```
cd /Users/heeyounglee/Documents/dashboard_CAHW

Read the implementation plan at docs/plans/2026-03-04-cahw-implementation-plan.md. Execute Task 2: TypeScript Types & Chart Config Schema. Create lib/types/chart.ts, lib/types/dashboard.ts, and lib/types/api.ts with all the type definitions specified in the plan. Follow every step exactly and commit when done.
```

### Terminal 2: PIN Auth System

```
cd /Users/heeyounglee/Documents/dashboard_CAHW

Read the implementation plan at docs/plans/2026-03-04-cahw-implementation-plan.md. Execute Task 3: PIN Auth System. Create middleware.ts at project root, app/api/auth/route.ts, and app/(auth)/login/page.tsx. The middleware protects /dashboard and /builder routes by checking an auth_token cookie against AUTH_SECRET env var. The login page has a PIN input in Korean. Follow every step exactly and commit when done.
```

### Terminal 3: BigQuery Client

```
cd /Users/heeyounglee/Documents/dashboard_CAHW

Read the implementation plan at docs/plans/2026-03-04-cahw-implementation-plan.md. Execute Task 4: BigQuery Client + Query API. Create lib/bigquery.ts (singleton client using base64-decoded GCP_SERVICE_ACCOUNT_KEY) and app/api/query/route.ts (POST route that validates SQL is SELECT-only, runs query, returns results). Follow every step exactly and commit when done.
```

### Terminal 4: Neon Postgres + Dashboard CRUD

```
cd /Users/heeyounglee/Documents/dashboard_CAHW

Read the implementation plan at docs/plans/2026-03-04-cahw-implementation-plan.md. Execute Task 5: Neon Postgres Setup + Dashboard CRUD API. Create lib/db.ts (neon client), lib/db-schema.sql (folders + dashboards tables), app/api/dashboard/route.ts (GET list + POST create), and app/api/dashboard/[id]/route.ts (GET one + PUT update + DELETE). Follow every step exactly and commit when done.
```

---

## Phase 3 (4 terminals, after Phase 2 completes)

### Terminal 1: Redis Cache Layer

```
cd /Users/heeyounglee/Documents/dashboard_CAHW

Read the implementation plan at docs/plans/2026-03-04-cahw-implementation-plan.md. Execute Task 6: Upstash Redis Cache Layer. Create lib/cache.ts with hashQuery, getCachedQuery, setCachedQuery, and invalidateQuery functions using @upstash/redis. Then update app/api/query/route.ts to check cache before hitting BigQuery, support x-force-refresh header for cache bypass, and store results with configurable TTL. Follow every step exactly and commit when done.
```

### Terminal 2: Chart Renderer Components

```
cd /Users/heeyounglee/Documents/dashboard_CAHW

Read the implementation plan at docs/plans/2026-03-04-cahw-implementation-plan.md. Execute Task 7: Chart Renderer Components. Create all Recharts widget components in components/charts/: BarChartWidget.tsx, LineChartWidget.tsx, ComboChartWidget.tsx (ComposedChart with bar+line+dual Y axis), PieChartWidget.tsx (supports pie and donut), AreaChartWidget.tsx, and ChartRenderer.tsx (unified dispatcher using dynamic imports with ssr:false). Each component reads from the ChartWidget type and renders using the style/mapping config. Follow every step exactly and commit when done.
```

### Terminal 3: Data Table Component

```
cd /Users/heeyounglee/Documents/dashboard_CAHW

Read the implementation plan at docs/plans/2026-03-04-cahw-implementation-plan.md. Execute Task 8: Data Table Component. Create components/charts/DataTableWidget.tsx with sortable columns (click header to sort), conditional color formatting for cells, row numbers, number/percent/currency/text formatting, and hover row highlighting. Uses the TableMapping type from lib/types/chart.ts. Follow every step exactly and commit when done.
```

### Terminal 4: KPI Card Component

```
cd /Users/heeyounglee/Documents/dashboard_CAHW

Read the implementation plan at docs/plans/2026-03-04-cahw-implementation-plan.md. Execute Task 9: KPI Card Component. Create components/charts/KpiCardWidget.tsx showing a large formatted value (number/percent/currency with Korean won symbol), a trend indicator (TrendingUp/TrendingDown/Minus icons from lucide-react) with green/red/gray colors, and an optional comparison label. Uses KpiMapping type. Follow every step exactly and commit when done.
```

---

## Phase 4 (2 terminals, after Phase 3 completes)

### Terminal 1: Dashboard Grid Layout

```
cd /Users/heeyounglee/Documents/dashboard_CAHW

Read the implementation plan at docs/plans/2026-03-04-cahw-implementation-plan.md. Execute Task 10: Dashboard Grid Layout. Create hooks/useWidgetData.ts (fetches data from /api/query for each widget, supports force refresh, tracks loading/error/cache state), components/dashboard/WidgetCard.tsx (card wrapper with title, grip handle, refresh button, skeleton loader, renders ChartRenderer), and components/dashboard/DashboardGrid.tsx (uses react-grid-layout with 12 columns, drag-and-drop, resize, serializes layout changes back to widget positions). Follow every step exactly and commit when done.
```

### Terminal 2: Claude AI Chat Integration

```
cd /Users/heeyounglee/Documents/dashboard_CAHW

Read the implementation plan at docs/plans/2026-03-04-cahw-implementation-plan.md. Execute Task 11: Claude AI Chat Integration. Create lib/ai/system-prompt.ts (builds system prompt with table schemas + chart JSON schema + current dashboard context), lib/ai/schema.ts (CHART_CONFIG_SCHEMA string), app/api/chat/route.ts (POST route using @anthropic-ai/sdk, parses JSON actions from Claude response), components/chat/ChatMessage.tsx (user/assistant bubbles with Bot/User icons), and components/chat/ChatPanel.tsx (collapsible drawer from bottom-right with message list, input, sends to /api/chat, calls onActions callback for widget changes). Follow every step exactly and commit when done.
```

---

## Phase 5 (2 terminals, after Phase 4 completes)

### Terminal 1: Dashboard Pages

```
cd /Users/heeyounglee/Documents/dashboard_CAHW

Read the implementation plan at docs/plans/2026-03-04-cahw-implementation-plan.md. Execute Task 12: Dashboard Viewer Page. Create app/(app)/layout.tsx (flex layout with Sidebar + main content), app/(app)/dashboard/page.tsx (server component that lists all dashboards from Neon as cards with title/date/star), app/(app)/dashboard/[id]/page.tsx (server component that loads a single dashboard by ID and renders DashboardView), and components/dashboard/DashboardView.tsx (client component that manages widget state, handles AI actions for create/update/delete widgets, auto-saves to /api/dashboard/[id], renders DashboardGrid + ChatPanel). Follow every step exactly and commit when done.
```

### Terminal 2: Sidebar Navigation

```
cd /Users/heeyounglee/Documents/dashboard_CAHW

Read the implementation plan at docs/plans/2026-03-04-cahw-implementation-plan.md. Execute Task 13: Sidebar Navigation. Create components/navigation/Sidebar.tsx with: CAHW logo header, search input to filter dashboards, "새 대시보드" button linking to /builder, collapsible "즐겨찾기" section for favorited dashboards, collapsible "대시보드" section listing all dashboards, active state highlighting based on current pathname, and a logout button that calls DELETE /api/auth and redirects to /login. Follow every step exactly and commit when done.
```

---

## Phase 6 (1 terminal, after Phase 5 completes)

### Terminal 1: Builder Mode

```
cd /Users/heeyounglee/Documents/dashboard_CAHW

Read the implementation plan at docs/plans/2026-03-04-cahw-implementation-plan.md. Execute Task 14: Builder Mode. Create app/(app)/builder/page.tsx and components/builder/BuilderView.tsx. The builder is a full-screen view with the dashboard canvas on the left and an always-visible AI chat panel on the right. Users type what they want, Claude generates chart configs, they appear on the canvas. Has an editable title input and a "대시보드 저장" button that POSTs to /api/dashboard and redirects to the new dashboard. Follow every step exactly and commit when done.
```

---

## Phase 7 (2 terminals, after Phase 6 completes)

### Terminal 1: Design System Polish

```
cd /Users/heeyounglee/Documents/dashboard_CAHW

Read the implementation plan at docs/plans/2026-03-04-cahw-implementation-plan.md and the design system at design-system/cahw-dashboard/MASTER.md. Execute Task 15: Design System Tokens + Polish. Update tailwind.config.ts to add custom colors (primary #1E40AF, secondary #3B82F6, accent #F59E0B, surface #FFFFFF, background #F8FAFC, text-primary #1E3A8A, text-muted #475569) and font families (fira-sans, fira-code). Review all components for consistency with the design system. Follow every step exactly and commit when done.
```

### Terminal 2: Vercel Deployment Config

```
cd /Users/heeyounglee/Documents/dashboard_CAHW

Read the implementation plan at docs/plans/2026-03-04-cahw-implementation-plan.md. Execute Task 16: Vercel Deployment Config. Create vercel.json with framework nextjs, region icn1 (Seoul), and env variable references. Then guide me through: installing vercel CLI, linking the project, adding Neon Postgres and Upstash Redis integrations from the Vercel dashboard, setting all remaining environment variable secrets, running the db-schema.sql migration in Neon console, and deploying with vercel --prod. Do NOT run the actual deploy commands - just create the config files and print the step-by-step instructions I need to follow. Commit the config file when done.
```

---

## Post-Deployment Checklist

After all phases complete:

1. Run `npm run dev` and test the full flow
2. Login with PIN → should redirect to /dashboard
3. Create a new dashboard via builder → AI generates charts
4. View saved dashboard → charts render with live BigQuery data
5. Modify charts via chat → "이 차트 색상을 빨간색으로 변경해줘"
6. Drag and resize charts on the grid
7. Update `app/api/chat/route.ts` with your actual BigQuery table schemas
8. Deploy to Vercel with `vercel --prod`
