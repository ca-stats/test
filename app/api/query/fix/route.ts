import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildTableSchemas } from '@/lib/schema-builder';
import { runQuery } from '@/lib/bigquery';

function extractTableNames(sql: string): string[] {
  const matches = sql.matchAll(/FROM\s+`?([^`\s,)]+)`?/gi);
  return [...matches].map((m) => m[1]);
}

export async function POST(req: NextRequest) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { originalSql, error, rowCount, widgetType, widgetTitle } = await req.json();

    if (!originalSql) {
      return NextResponse.json({ error: 'originalSql is required' }, { status: 400 });
    }

    // 1. Get table schemas for context
    const tableSchemas = await buildTableSchemas();

    // 2. For 0-row case: verify the table actually has data
    let tableCountInfo = '';
    if (rowCount === 0 && !error) {
      const tables = extractTableNames(originalSql);
      for (const table of tables) {
        try {
          const countResult = await runQuery(
            `SELECT COUNT(*) as cnt FROM \`${table}\``
          );
          const cnt = countResult[0]?.cnt ?? 'unknown';
          tableCountInfo += `\nTable \`${table}\` has ${cnt} total rows.`;
        } catch {
          tableCountInfo += `\nCould not count rows in \`${table}\`.`;
        }
      }
    }

    // 3. Build the fix prompt
    const systemPrompt = `You are a BigQuery SQL debugging assistant.
Your job is to fix SQL queries that are producing errors or returning 0 rows.
You communicate in Korean for explanations but SQL must be valid BigQuery SQL.

Available table schemas:
${tableSchemas}

Rules:
- Only return SELECT queries
- Use fully-qualified table names with backticks: \`project.dataset.table\`
- Backtick-quote reserved words used as column names (date, time, timestamp, name, order, group, status, etc.)
- String comparisons in BigQuery are case-sensitive. Check the schema notes for correct case of values.
- Do NOT use Korean characters in SQL column aliases
- Do NOT change the overall intent of the query. Only fix the broken parts.
- If a column does not exist in a table, find the correct column from the schema.

Respond with ONLY a JSON block:
\`\`\`json
{
  "fixedSql": "SELECT ...",
  "explanation": "Korean explanation of what was wrong and what you fixed"
}
\`\`\``;

    let userMessage = '';
    if (error) {
      userMessage += `The following SQL query failed with this BigQuery error:\nError: ${error}\n\n`;
    } else {
      userMessage += `The following SQL query returned 0 rows when data was expected.\n${tableCountInfo}\n\n`;
    }
    userMessage += `Original SQL:\n${originalSql}\n\n`;
    if (widgetType) userMessage += `Widget type: ${widgetType}\n`;
    if (widgetTitle) userMessage += `Widget title: ${widgetTitle}\n`;
    userMessage += `\nPlease fix this SQL query so it returns the correct data.`;

    // 4. Call GPT-4o-mini
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 2048,
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });

    const rawText = response.choices[0]?.message?.content || '';
    const jsonMatch = rawText.match(/```json\n?([\s\S]*?)\n?```/);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        // Guard: don't return identical SQL (prevents infinite retry loops)
        if (parsed.fixedSql && parsed.fixedSql.trim() !== originalSql.trim()) {
          return NextResponse.json({
            fixedSql: parsed.fixedSql,
            explanation: parsed.explanation || 'SQL이 수정되었습니다.',
          });
        }
      } catch {
        // JSON parse failed, fall through
      }
    }

    return NextResponse.json(
      { error: 'Could not generate a fix for this query' },
      { status: 422 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Fix failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
