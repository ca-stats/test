'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChartWidget } from '@/lib/types/chart';
import type { WidgetFixEvent } from '@/lib/types/api';

const MAX_FIX_ATTEMPTS = 2;

/** Errors that should NOT trigger a fix attempt (non-SQL issues) */
function isRetryableError(error: string): boolean {
  const nonRetryable = [
    'SQL query is required',
    'Only SELECT queries are allowed',
    'fetch failed',
    'Failed to fetch',
    'NetworkError',
    'AbortError',
    'Load failed',
  ];
  return !nonRetryable.some((msg) => error.includes(msg));
}

interface WidgetDataState {
  data: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
  fromCache: boolean;
  fixing: boolean;
  fixAttempt: number;
  fixExplanation: string | null;
}

interface UseWidgetDataOptions {
  onSqlFixed?: (widgetId: string, newSql: string) => void;
  onFixEvent?: (event: WidgetFixEvent) => void;
}

export function useWidgetData(widget: ChartWidget, options?: UseWidgetDataOptions) {
  const [state, setState] = useState<WidgetDataState>({
    data: [],
    loading: true,
    error: null,
    fromCache: false,
    fixing: false,
    fixAttempt: 0,
    fixExplanation: null,
  });

  const fixAttemptRef = useRef(0);
  const onSqlFixedRef = useRef(options?.onSqlFixed);
  onSqlFixedRef.current = options?.onSqlFixed;
  const onFixEventRef = useRef(options?.onFixEvent);
  onFixEventRef.current = options?.onFixEvent;

  const widgetSqlRef = useRef(widget.sql);
  widgetSqlRef.current = widget.sql;

  const cacheEnabled = widget.cache?.enabled ?? false;
  const cacheTtl = widget.cache?.ttl ?? 0;

  const attemptFix = useCallback(
    async (
      failedSql: string,
      errorMessage: string | null,
      rowCount: number
    ): Promise<{ fixedSql: string; explanation: string } | null> => {
      try {
        const res = await fetch('/api/query/fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalSql: failedSql,
            error: errorMessage,
            rowCount,
            widgetType: widget.type,
            widgetTitle: widget.title,
          }),
        });

        if (!res.ok) return null;

        const result = await res.json();
        return result.fixedSql ? result : null;
      } catch {
        return null;
      }
    },
    [widget.type, widget.title]
  );

  const fetchData = useCallback(
    async (forceRefresh = false, sqlOverride?: string) => {
      const sql = sqlOverride || widget.sql;
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const res = await fetch('/api/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(forceRefresh ? { 'x-force-refresh': 'true' } : {}),
          },
          body: JSON.stringify({
            sql,
            cacheTtl: cacheEnabled ? cacheTtl : 0,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          const errorMessage = err.error || 'Query failed';

          // Attempt auto-fix for retryable BigQuery errors
          if (isRetryableError(errorMessage) && fixAttemptRef.current < MAX_FIX_ATTEMPTS) {
            fixAttemptRef.current += 1;
            setState((prev) => ({
              ...prev,
              fixing: true,
              fixAttempt: fixAttemptRef.current,
            }));
            onFixEventRef.current?.({
              type: 'fix_started',
              widgetId: widget.id,
              widgetTitle: widget.title,
              attempt: fixAttemptRef.current,
              maxAttempts: MAX_FIX_ATTEMPTS,
            });

            const fix = await attemptFix(sql, errorMessage, -1);
            if (fix) {
              return fetchData(forceRefresh, fix.fixedSql);
            }
          }

          throw new Error(errorMessage);
        }

        const result = await res.json();

        // Check for 0-row case — table might have data but query is wrong
        if (result.data.length === 0 && fixAttemptRef.current < MAX_FIX_ATTEMPTS) {
          fixAttemptRef.current += 1;
          setState((prev) => ({
            ...prev,
            fixing: true,
            fixAttempt: fixAttemptRef.current,
          }));
          onFixEventRef.current?.({
            type: 'fix_started',
            widgetId: widget.id,
            widgetTitle: widget.title,
            attempt: fixAttemptRef.current,
            maxAttempts: MAX_FIX_ATTEMPTS,
          });

          const fix = await attemptFix(sql, null, 0);
          if (fix) {
            return fetchData(forceRefresh, fix.fixedSql);
          }
        }

        // Success — check if SQL was fixed during this fetch cycle
        const wasFixed = sql !== widgetSqlRef.current;
        setState({
          data: result.data,
          loading: false,
          error: null,
          fromCache: result.fromCache,
          fixing: false,
          fixAttempt: fixAttemptRef.current,
          fixExplanation: wasFixed
            ? `쿼리가 자동 수정되었습니다 (${fixAttemptRef.current}회 시도)`
            : null,
        });

        // Persist the corrected SQL back to the dashboard
        if (wasFixed) {
          onSqlFixedRef.current?.(widget.id, sql);
          onFixEventRef.current?.({
            type: 'fix_succeeded',
            widgetId: widget.id,
            widgetTitle: widget.title,
            attempt: fixAttemptRef.current,
            maxAttempts: MAX_FIX_ATTEMPTS,
            explanation: `쿼리가 자동 수정되었습니다 (${fixAttemptRef.current}회 시도)`,
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setState((prev) => ({
          ...prev,
          loading: false,
          fixing: false,
          error: errorMsg,
        }));
        if (fixAttemptRef.current > 0) {
          onFixEventRef.current?.({
            type: 'fix_failed',
            widgetId: widget.id,
            widgetTitle: widget.title,
            attempt: fixAttemptRef.current,
            maxAttempts: MAX_FIX_ATTEMPTS,
            error: errorMsg,
          });
        }
      }
    },
    [widget.sql, widget.id, cacheEnabled, cacheTtl, attemptFix]
  );

  useEffect(() => {
    fixAttemptRef.current = 0;
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refresh: () => {
      fixAttemptRef.current = 0;
      fetchData(true);
    },
  };
}
