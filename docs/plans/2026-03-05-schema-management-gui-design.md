# Schema Management GUI - Design Document

**Date:** 2026-03-05
**Status:** Approved

## Problem

Table schemas for the AI chat system are hardcoded in `app/api/chat/route.ts` as a ~130-line string constant. Adding new databases (e.g., MariaDB) or modifying schemas requires code changes and redeployment. We need a GUI to manage data source schemas dynamically.

## Solution

A settings page where users can:
1. Add data source connections (BigQuery, MariaDB)
2. Auto-introspect table/column schemas from live databases
3. Add custom annotations (notes) per table and per column on top of DB-introspected info
4. Toggle which sources/tables are active in the AI system prompt
5. All schema data stored in Neon PostgreSQL

## Data Model

### `data_sources` table (Neon PostgreSQL)

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | |
| name | TEXT NOT NULL | Display name |
| type | TEXT NOT NULL | `bigquery` or `mariadb` |
| config | JSONB NOT NULL | Connection details |
| is_active | BOOLEAN DEFAULT true | Include in AI prompt |
| description | TEXT | User notes about this source |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ DEFAULT NOW() | |

**config JSONB structure:**
- BigQuery: `{ "project": "planning-ops", "datasets": ["mart", "staging"] }`
- MariaDB: `{ "host": "...", "port": 3306, "database": "...", "user": "..." }`
  - Password stored in env var, referenced by name: `{ "passwordEnvVar": "MARIADB_PASSWORD" }`

### `table_schemas` table (Neon PostgreSQL)

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | |
| data_source_id | INT NOT NULL FK | References data_sources(id) ON DELETE CASCADE |
| table_name | TEXT NOT NULL | Fully qualified name |
| columns | JSONB NOT NULL | Array of column definitions |
| table_note | TEXT | User's custom annotation for the table |
| is_active | BOOLEAN DEFAULT true | Include in AI prompt |
| synced_at | TIMESTAMPTZ | Last introspection time |

**columns JSONB structure:**
```json
[
  {
    "name": "date",
    "type": "DATE",
    "description": "날짜",
    "user_note": "Always use backtick-quotes in SQL"
  }
]
```
- `description`: auto-populated from DB column comments during introspection
- `user_note`: user-editable custom annotation, preserved across re-syncs

## UI Design

### Sidebar Addition
- Settings icon (gear) at bottom of sidebar, above logout
- Links to `/settings/data-sources`

### Data Sources List Page (`/settings/data-sources`)
- Header with "Data Sources" title and "+ Add" button
- Cards for each data source showing: name, type, table count, last synced, note
- Each card has: "Sync Schema" button, "Edit" link, active toggle
- Card hover: row highlighting with smooth transition

### Data Source Editor (inline or separate view)
- Back navigation, save button
- Fields: name, source note, active toggle
- Connection config fields (varies by type)
- Collapsible table list with:
  - Table note (editable text field)
  - Active toggle per table
  - Column table: name (read-only), type (read-only), description (read-only from DB), user note (editable)
- Tables wrapped in overflow-x-auto for mobile
- Loading/success feedback on sync and save actions

### Add Data Source Flow
- Select type (BigQuery or MariaDB)
- Enter connection details
- Test connection
- Save, then sync schema

## API Routes

### `GET/POST /api/data-sources`
- GET: List all data sources (without sensitive config)
- POST: Create new data source

### `GET/PUT/DELETE /api/data-sources/[id]`
- Standard CRUD for a single data source

### `POST /api/data-sources/[id]/sync`
- Introspect schema from live database
- BigQuery: query INFORMATION_SCHEMA.COLUMNS for each dataset
- MariaDB: query INFORMATION_SCHEMA.COLUMNS + COLUMN_COMMENT
- Merge with existing user_notes (preserve annotations across re-syncs)
- Upsert into table_schemas

## Chat Integration

### Dynamic Schema Builder (`lib/schema-builder.ts`)
- Reads all active data_sources + table_schemas from Neon
- Builds the TABLE_SCHEMAS string dynamically
- Format per table:
  ```
  Table: planning-ops.mart.hw_consult_contract_cnt
  Note: 월별 상담/계약 집계 테이블
    date (DATE) -- 날짜 [Always use backtick-quotes in SQL]
    contract_amount (INT64) -- 계약금액 [KRW, 만원 단위]
  ```
- User notes appended in `[brackets]` after DB description

### Modified Chat Route (`app/api/chat/route.ts`)
- Replace hardcoded TABLE_SCHEMAS with call to schema-builder
- Everything else unchanged

## New Files

| File | Purpose |
|------|---------|
| `app/(app)/settings/data-sources/page.tsx` | Settings page (server component) |
| `components/settings/DataSourceList.tsx` | Data source cards list |
| `components/settings/DataSourceEditor.tsx` | Edit form with table/column management |
| `components/settings/AddDataSourceModal.tsx` | New data source creation |
| `app/api/data-sources/route.ts` | List/create data sources |
| `app/api/data-sources/[id]/route.ts` | Get/update/delete data source |
| `app/api/data-sources/[id]/sync/route.ts` | Schema introspection |
| `lib/mariadb.ts` | MariaDB connection client |
| `lib/schema-builder.ts` | Dynamic TABLE_SCHEMAS builder |

## Modified Files

| File | Change |
|------|--------|
| `app/api/chat/route.ts` | Replace hardcoded TABLE_SCHEMAS with dynamic fetch |
| `components/navigation/Sidebar.tsx` | Add Settings link |
| `package.json` | Add `mysql2` dependency |

## UX Guidelines Applied

- Tables: `overflow-x-auto` wrapper for mobile responsiveness
- Save/Sync: loading spinner then success/error toast feedback
- Row hover: highlight with `transition-colors duration-200`
- All clickable elements: `cursor-pointer`
- Form submission: disable button during async operations
- Keyboard navigation: visible focus states
