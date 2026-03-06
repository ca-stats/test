export type ChartType = 'bar' | 'line' | 'combo' | 'pie' | 'donut' | 'area' | 'table' | 'kpi';

export type ValueFormat = 'currency' | 'number' | 'percent' | 'count';

export type DataLabelPosition =
  | 'top' | 'bottom' | 'center' | 'left' | 'right'
  | 'inside' | 'outside' | 'insideTop' | 'insideBottom';

export interface SeriesConfig {
  field: string;
  type: 'bar' | 'line' | 'area';
  color: string;
  label: string;
  yAxis?: 'left' | 'right';
  valueFormat?: ValueFormat;
  unit?: string; // e.g. "건", "명", "개", "원"
  decimalPlaces?: number; // 0–4, controls decimal precision
  valueDivisor?: number; // e.g. 10000 for 만원, 100000000 for 억원
}

export interface ChartMapping {
  xAxis: string;
  series: SeriesConfig[];
  colors?: string[]; // per-slice colors for pie/donut charts
}

export interface TableColumn {
  field: string;
  label: string;
  format?: 'number' | 'percent' | 'currency' | 'text';
  width?: number;
  sortable?: boolean;
  unit?: string;
  decimalPlaces?: number;
  valueDivisor?: number;
  conditionalColor?: {
    ranges: { min: number; max: number; color: string }[];
  };
}

export interface TableMapping {
  columns: TableColumn[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  showRowNumbers?: boolean;
}

export interface KpiMapping {
  valueField: string;
  format: 'number' | 'percent' | 'currency';
  comparisonField?: string;
  comparisonLabel?: string;
}

export interface ChartStyle {
  fontSize: {
    title: number;
    axis: number;
    label: number;
  };
  legend: {
    position: 'top' | 'bottom' | 'left' | 'right';
    visible: boolean;
  };
  dataLabels: {
    visible: boolean;
    format?: string;
    position?: DataLabelPosition;
    offset?: number;
    hideZero?: boolean;
  };
  gridLines: boolean;
  backgroundColor: string;
  borderRadius: number;
}

export interface ChartPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CacheConfig {
  ttl: number;
  enabled: boolean;
}

export interface ChartWidget {
  id: string;
  type: ChartType;
  title: string;
  position: ChartPosition;
  sql: string;
  cache: CacheConfig;
  mapping: ChartMapping | TableMapping | KpiMapping;
  style: ChartStyle;
}
