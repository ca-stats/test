'use client';

import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts';
import type { ChartWidget, ChartMapping } from '@/lib/types/chart';
import { formatValue, formatAxisValue } from '@/lib/format';

interface Props {
  widget: ChartWidget;
  data: Record<string, unknown>[];
}

export function ComboChartWidget({ widget, data }: Props) {
  const mapping = widget.mapping as ChartMapping;
  const { style } = widget;

  const leftSeries = mapping.series.filter((s) => (s.yAxis || 'left') === 'left');
  const rightSeries = mapping.series.filter((s) => s.yAxis === 'right');
  const left = leftSeries[0];
  const right = rightSeries[0];
  const labelPos = style.dataLabels.position ?? 'top';
  const labelOffset = style.dataLabels.offset ?? 5;
  const hideZero = style.dataLabels.hideZero !== false;

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={0}>
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 50, bottom: 20 }}>
        {style.gridLines && <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />}
        <XAxis
          dataKey={mapping.xAxis}
          tick={{ fontSize: style.fontSize.axis, fill: '#1E3A8A' }}
          tickLine={false}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: style.fontSize.axis, fill: '#1E3A8A' }}
          tickLine={false}
          tickFormatter={(v: number) => formatAxisValue(v, left?.valueFormat, left?.unit, left?.decimalPlaces, left?.valueDivisor)}
        />
        {rightSeries.length > 0 && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: style.fontSize.axis, fill: '#1E3A8A' }}
            tickLine={false}
            tickFormatter={(v: number) => formatAxisValue(v, right?.valueFormat, right?.unit, right?.decimalPlaces, right?.valueDivisor)}
          />
        )}
        <Tooltip
          formatter={(value: number | undefined, name: string | undefined) => {
            if (value == null) return '';
            const series = mapping.series.find((s) => s.label === name || s.field === name);
            return formatValue(Number(value), series?.valueFormat, series?.unit, series?.decimalPlaces, series?.valueDivisor);
          }}
        />
        {style.legend.visible && (
          <Legend
            verticalAlign={style.legend.position === 'bottom' ? 'bottom' : 'top'}
            align="center"
            wrapperStyle={{ fontSize: style.fontSize.label }}
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
            >
              {style.dataLabels.visible && (
                <LabelList
                  dataKey={s.field}
                  position={labelPos}
                  offset={labelOffset}
                  fontSize={style.fontSize.label}
                  fill="#1E3A8A"
                  formatter={(value) => {
                    if (hideZero && (value == null || Number(value) === 0)) return '';
                    return formatValue(Number(value), s.valueFormat, s.unit, s.decimalPlaces, s.valueDivisor);
                  }}
                />
              )}
            </Line>
          );
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
