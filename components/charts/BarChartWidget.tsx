'use client';

import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts';
import type { ChartWidget, ChartMapping } from '@/lib/types/chart';
import { formatValue, formatAxisValue } from '@/lib/format';

interface Props {
  widget: ChartWidget;
  data: Record<string, unknown>[];
}

export function BarChartWidget({ widget, data }: Props) {
  const mapping = widget.mapping as ChartMapping;
  const { style } = widget;
  const primary = mapping.series[0];
  const primaryFormat = primary?.valueFormat;
  const primaryUnit = primary?.unit;
  const labelPos = style.dataLabels.position ?? 'top';
  const labelOffset = style.dataLabels.offset ?? 5;
  const hideZero = style.dataLabels.hideZero !== false;

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={0}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 50, bottom: 20 }}>
        {style.gridLines && <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />}
        <XAxis dataKey={mapping.xAxis} tick={{ fontSize: style.fontSize.axis, fill: '#1E3A8A' }} />
        <YAxis
          tick={{ fontSize: style.fontSize.axis, fill: '#1E3A8A' }}
          tickFormatter={(v: number) => formatAxisValue(v, primaryFormat, primaryUnit, primary?.decimalPlaces, primary?.valueDivisor)}
        />
        <Tooltip
          formatter={(value: number | undefined, name: string | undefined) => {
            if (value == null) return '';
            const series = mapping.series.find((s) => s.label === name || s.field === name);
            return formatValue(Number(value), series?.valueFormat, series?.unit, series?.decimalPlaces, series?.valueDivisor);
          }}
        />
        {style.legend.visible && <Legend verticalAlign={style.legend.position === 'bottom' ? 'bottom' : 'top'} wrapperStyle={{ fontSize: style.fontSize.label }} />}
        {mapping.series.map((s) => (
          <Bar
            key={s.field}
            dataKey={s.field}
            name={s.label}
            fill={s.color}
            radius={[4, 4, 0, 0]}
          >
            {style.dataLabels.visible && (
              <LabelList
                dataKey={s.field}
                position={labelPos}
                offset={labelOffset}
                fontSize={style.fontSize.label}
                fill="#1E3A8A"
                fontWeight={600}
                formatter={(value) => {
                  if (hideZero && (value == null || Number(value) === 0)) return '';
                  return formatValue(Number(value), s.valueFormat, s.unit, s.decimalPlaces, s.valueDivisor);
                }}
              />
            )}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
