import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/bigquery';
import { getCachedQuery, setCachedQuery, invalidateQuery } from '@/lib/cache';
import type { QueryRequest, QueryResponse } from '@/lib/types/api';

/**
 * Auto-quote BigQuery reserved words (date, time, timestamp) when used as column names.
 * Skips: already backtick-quoted, type casts (AS DATE), function calls (DATE()),
 * and compound names (FORMAT_DATE).
 */
function quoteReservedColumns(sql: string): string {
  return sql.replace(/\b(date|time|timestamp)\b/gi, (match, word, offset) => {
    // Already backtick-quoted
    if (offset > 0 && sql[offset - 1] === '`') return match;
    if (offset + word.length < sql.length && sql[offset + word.length] === '`') return match;

    // Part of a compound identifier like FORMAT_DATE or DATE_DIFF
    if (offset > 0 && /[A-Za-z_]/.test(sql[offset - 1])) return match;
    if (offset + word.length < sql.length && /[A-Za-z_]/.test(sql[offset + word.length])) return match;

    // Type cast: AS DATE, AS TIMESTAMP
    const before = sql.substring(Math.max(0, offset - 10), offset).trimEnd().toUpperCase();
    if (before.endsWith('AS')) return match;

    // Function call: DATE(...), TIMESTAMP(...)
    const after = sql.substring(offset + word.length).trimStart();
    if (after.startsWith('(')) return match;

    return '`' + word + '`';
  });
}

export async function POST(req: NextRequest) {
  try {
    const { sql: rawSql, cacheTtl } = (await req.json()) as QueryRequest;
    const forceRefresh = req.headers.get('x-force-refresh') === 'true';

    if (!rawSql || typeof rawSql !== 'string') {
      return NextResponse.json({ error: 'SQL query is required' }, { status: 400 });
    }

    const forbidden = /\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE|EXEC)\b/i;
    if (forbidden.test(rawSql)) {
      return NextResponse.json({ error: 'Only SELECT queries are allowed' }, { status: 403 });
    }

    // Auto-fix unquoted reserved column names and unquoted table references
    let sql = quoteReservedColumns(rawSql);
    // Auto-quote unquoted fully-qualified table names with hyphens (e.g. planning-ops.dataset.table)
    sql = sql.replace(/(?<!`)(\bplanning-ops\.\w+\.\w+)\b(?!`)/g, '`$1`');

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
    const rawData = await runQuery(sql);

    // Normalize BigQuery types:
    // - DATE/TIMESTAMP objects: {value: "2025-01-01"} → "2025-01-01"
    // - BigQueryInt objects: {value: "123"} → 123
    // - NUMERIC strings: "123456.78" → 123456.78 (BigQuery returns NUMERIC as strings)
    const data = rawData.map((row) => {
      const normalized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(row)) {
        if (val === null || val === undefined) {
          normalized[key] = val;
        } else if (typeof val === 'object' && !Array.isArray(val) && 'value' in (val as Record<string, unknown>)) {
          // Unwrap BigQuery wrapper objects (Date, BigQueryInt, etc.)
          const inner = (val as Record<string, unknown>).value;
          // If the inner value is a numeric string, convert to number
          if (typeof inner === 'string' && inner !== '' && !isNaN(Number(inner)) && !/^\d{4}-\d{2}/.test(inner)) {
            normalized[key] = Number(inner);
          } else {
            normalized[key] = inner;
          }
        } else if (typeof val === 'string' && val !== '' && !isNaN(Number(val)) && !/^\d{4}-\d{2}/.test(val) && !/[a-zA-Z가-힣]/.test(val)) {
          // Convert pure numeric strings to numbers (BigQuery NUMERIC type)
          normalized[key] = Number(val);
        } else {
          normalized[key] = val;
        }
      }
      return normalized;
    });

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
