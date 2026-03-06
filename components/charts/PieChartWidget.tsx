'use client';

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { ChartWidget, ChartMapping } from '@/lib/types/chart';

const DEFAULT_COLORS = ['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#F59E0B', '#FBBF24', '#34D399', '#F87171'];

interface Props {
  widget: ChartWidget;
  data: Record<string, unknown>[];
}

export function PieChartWidget({ widget, data }: Props) {
  const mapping = widget.mapping as ChartMapping;
  const { style } = widget;
  const series = mapping.series[0];

  const pos = style.dataLabels.position;
  const pieLabelPos = (pos === 'inside' || pos === 'center' || pos === 'insideTop' || pos === 'insideBottom')
    ? 'inside'
    : 'outside';

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={0}>
      <PieChart>
        <Pie
          data={data}
          dataKey={series.field}
          nameKey={mapping.xAxis}
          cx="50%"
          cy="50%"
          outerRadius="70%"
          innerRadius={widget.type === 'donut' ? '40%' : 0}
          label={style.dataLabels.visible
            ? {
                fontSize: style.fontSize.label,
                fill: '#1E3A8A',
                position: pieLabelPos,
                offset: style.dataLabels.offset ?? 5,
              }
            : false
          }
        >
          {data.map((_, index) => (
            <Cell key={index} fill={mapping.colors?.[index] ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        {style.legend.visible && <Legend verticalAlign={style.legend.position === 'bottom' ? 'bottom' : 'top'} wrapperStyle={{ fontSize: style.fontSize.label }} />}
      </PieChart>
    </ResponsiveContainer>
  );
}
