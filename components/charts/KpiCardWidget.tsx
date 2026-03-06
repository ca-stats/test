'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ChartWidget, KpiMapping } from '@/lib/types/chart';
import { formatValue } from '@/lib/format';

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

  const fmt = mapping.format === 'currency' ? 'currency'
    : mapping.format === 'percent' ? 'percent'
    : 'number';

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
        {formatValue(value, fmt)}
      </span>
      {comparison !== null && TrendIcon && (
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          <span className="text-sm font-medium">
            {comparison > 0 ? '+' : ''}{formatValue(comparison, fmt)}
          </span>
          {mapping.comparisonLabel && (
            <span className="text-xs text-[var(--color-text-muted)]">{mapping.comparisonLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
