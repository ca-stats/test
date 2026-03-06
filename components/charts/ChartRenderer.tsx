'use client';

import dynamic from 'next/dynamic';
import type { ChartWidget } from '@/lib/types/chart';

const BarChartWidget = dynamic(() => import('./BarChartWidget').then(m => ({ default: m.BarChartWidget })), { ssr: false });
const LineChartWidget = dynamic(() => import('./LineChartWidget').then(m => ({ default: m.LineChartWidget })), { ssr: false });
const ComboChartWidget = dynamic(() => import('./ComboChartWidget').then(m => ({ default: m.ComboChartWidget })), { ssr: false });
const PieChartWidget = dynamic(() => import('./PieChartWidget').then(m => ({ default: m.PieChartWidget })), { ssr: false });
const AreaChartWidget = dynamic(() => import('./AreaChartWidget').then(m => ({ default: m.AreaChartWidget })), { ssr: false });
const DataTableWidget = dynamic(() => import('./DataTableWidget').then(m => ({ default: m.DataTableWidget })), { ssr: false });
const KpiCardWidget = dynamic(() => import('./KpiCardWidget').then(m => ({ default: m.KpiCardWidget })), { ssr: false });

interface Props {
  widget: ChartWidget;
  data: Record<string, unknown>[];
  onUpdate?: (widget: ChartWidget) => void;
}

export function ChartRenderer({ widget, data, onUpdate }: Props) {
  switch (widget.type) {
    case 'bar':
      return <BarChartWidget widget={widget} data={data} />;
    case 'line':
      return <LineChartWidget widget={widget} data={data} />;
    case 'combo':
      return <ComboChartWidget widget={widget} data={data} />;
    case 'pie':
    case 'donut':
      return <PieChartWidget widget={widget} data={data} />;
    case 'area':
      return <AreaChartWidget widget={widget} data={data} />;
    case 'table':
      return <DataTableWidget widget={widget} data={data} onUpdate={onUpdate} />;
    case 'kpi':
      return <KpiCardWidget widget={widget} data={data} />;
    default:
      return <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">Unsupported chart type</div>;
  }
}
