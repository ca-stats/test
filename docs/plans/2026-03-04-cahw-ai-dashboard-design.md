# CAHW AI-Powered Dashboard - Design Document

**Date**: 2026-03-04
**Status**: Approved (iterative refinement expected)

## Problem

Sales team constantly requests dashboards from BigQuery data. Current Looker Studio workflow is slow and difficult. Need a custom dashboard where an AI agent handles chart creation, styling, and layout modifications via natural language.

## Requirements

- **Data**: Sales/revenue data from BigQuery (2-5 known tables, existing SQL)
- **AI**: Claude API generates chart configs + SQL queries from natural language
- **Users**: Both dashboard builder (analyst) and sales team use the AI chat
- **Modes**: Chat mode (quick edits) + Builder mode (new dashboards from scratch)
- **Auth**: Simple shared PIN
- **Deploy**: Vercel
- **Language**: Korean-language data and UI labels

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Vercel (Frontend + API)                   │
│                                                              │
│  ┌───────────────┐    ┌────────────────────────┐             │
│  │  Next.js App  │    │  API Routes             │             │
│  │               │    │                         │             │
│  │  Dashboard    │───>│  /api/chat      (Claude)│───> Claude API
│  │  Viewer       │    │  /api/query     (BQ)    │───> BigQuery
│  │               │    │  /api/dashboard (CRUD)  │───> Vercel Postgres
│  │  AI Chat      │    │  /api/auth      (PIN)   │             │
│  │  Panel        │    │         │               │             │
│  └───────────────┘    │         v               │             │
│                       │  ┌──────────────┐       │             │
│                       │  │ Cache Layer  │       │             │
│                       │  │ (Vercel KV)  │       │             │
│                       │  │ key: hash(SQL)│      │             │
│                       │  │ TTL: 15min   │       │             │
│                       │  └──────────────┘       │             │
│                       └────────────────────────┘             │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

1. User types natural language request in chat panel
2. API sends request + table schemas to Claude
3. Claude returns SQL query + chart config JSON
4. API executes SQL against BigQuery (with cache check)
5. Chart config + data sent to frontend
6. React rendering engine draws the chart using Recharts

### Caching Strategy

- **Cache key**: SHA-256 hash of SQL query string
- **Storage**: Vercel KV (Redis-based)
- **Default TTL**: 15 minutes (configurable per dashboard)
- **Cache bypass**: Manual refresh button
- **Cache invalidation**: On SQL query modification

### Query Flow

1. Frontend requests data for a chart
2. API hashes SQL, checks Vercel KV
3. Cache hit -> return cached data (<50ms)
4. Cache miss -> query BigQuery, store in KV with TTL, return data

## Chart Config Schema

Each widget on the dashboard is a JSON config:

```json
{
  "id": "chart_001",
  "type": "combo",
  "title": "매출 완료건 및 매출 완료율",
  "position": { "x": 0, "y": 0, "w": 12, "h": 4 },
  "sql": "SELECT team_lead, completed_count, completion_rate FROM ...",
  "cache": { "ttl": 900, "enabled": true },
  "mapping": {
    "xAxis": "team_lead",
    "series": [
      { "field": "completed_count", "type": "bar", "color": "#3B82F6", "label": "매출완료 건수" },
      { "field": "completion_rate", "type": "line", "color": "#1E40AF", "yAxis": "right", "label": "매출완료율" }
    ]
  },
  "style": {
    "fontSize": { "title": 16, "axis": 12, "label": 11 },
    "legend": { "position": "top", "visible": true },
    "dataLabels": { "visible": true, "format": "{value}%" },
    "gridLines": true,
    "backgroundColor": "#FFFFFF",
    "borderRadius": 8
  }
}
```

### Supported Chart Types

| Type | Use Case |
|------|----------|
| bar | Category comparison |
| line | Trends over time |
| combo | Bar + Line overlay |
| pie / donut | Proportions |
| table | Detailed data with sorting |
| kpi | Single metric card |
| area | Volume trends |

### Layout

12-column grid system using react-grid-layout. Drag-and-drop repositioning, resizable, serializable to JSON.

## UI Layout

```
+------------------------------------------------------+
|  Header: Logo | Dashboard Title | PIN Auth | Refresh |
+--------+---------------------------------------------+
|        |                                             |
|  Side  |  Dashboard Canvas (12-col grid)             |
|  bar   |  +----------+ +----------+ +----------+    |
|        |  | KPI Card | | KPI Card | | KPI Card |    |
|  - My  |  +----------+ +----------+ +----------+    |
|  Dash  |  +-------------------+ +-------------+     |
|  boards|  |  Combo Chart      | |  Pie Chart  |     |
|        |  |  (bar + line)     | |             |     |
|  - New |  +-------------------+ +-------------+     |
|        |  +-------------------------------------+    |
|        |  |  Data Table (sortable, filterable)  |    |
|        |  +-------------------------------------+    |
+--------+---------------------------------------------+
|  AI Chat Panel (expandable drawer from right)        |
+------------------------------------------------------+
```

### Navigation

- Sidebar lists all saved dashboards grouped by category/folder
- Each dashboard has a unique URL: /dashboard/[id]
- Folders for organization (매출 현황, 계약 관리, etc.)
- Search bar, favorites (pinned), and recent dashboards
- Shareable URLs for bookmarking

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| Primary | #1E40AF | Chart lines, active states |
| Secondary | #3B82F6 | Bar fills, secondary actions |
| Accent | #F59E0B | Highlights, KPI cards |
| Background | #F8FAFC | Page background |
| Surface | #FFFFFF | Chart cards, panels |
| Text | #1E3A8A | Headings, primary text |
| Text Muted | #475569 | Axis labels, secondary |

**Typography**: Fira Sans (headings/body) + Fira Code (data values)
**Icons**: Lucide React (SVGs)
**Style**: Data-Dense Dashboard (minimal padding, grid layout, max data visibility)

## AI Interaction

### Chat Mode (Quick modifications)
- Collapsible panel on right side
- Context-aware (knows current dashboard state)
- Modifies existing chart configs in place

### Builder Mode (New dashboards)
- Full-screen overlay
- Step-by-step guided creation
- AI generates complete dashboard layout

### Claude System Prompt includes:
- BigQuery table schemas (column names, types)
- Chart config JSON schema
- Current dashboard state (chat mode)
- Instructions to output valid JSON configs

## Auth

Simple PIN-based middleware. Single shared PIN stored as environment variable. Checked on first visit, stored in session cookie.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Grid Layout | react-grid-layout |
| AI | Claude API (Anthropic SDK) |
| Data | BigQuery (read) |
| Dashboard Storage | Vercel Postgres |
| Cache | Vercel KV (Redis) |
| Auth | Simple PIN middleware |
| Icons | Lucide React |
| Deploy | Vercel |
