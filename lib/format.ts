import type { ValueFormat } from '@/lib/types/chart';

/**
 * Format a number in Korean currency units (만원, 억원)
 */
export function formatKRW(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 100_000_000) {
    const billions = abs / 100_000_000;
    return `${sign}${billions % 1 === 0 ? billions.toFixed(0) : billions.toFixed(1)}억원`;
  }
  if (abs >= 10_000) {
    const tenThousands = abs / 10_000;
    return `${sign}${tenThousands % 1 === 0 ? tenThousands.toFixed(0) : tenThousands.toFixed(1)}만원`;
  }
  return `${sign}${abs.toLocaleString()}원`;
}

/**
 * Format a number with commas
 */
export function formatNumber(value: number): string {
  return value.toLocaleString();
}

/**
 * Format axis tick values in Korean currency units
 */
export function formatAxisKRW(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 100_000_000) {
    return `${sign}${(abs / 100_000_000).toFixed(0)}억`;
  }
  if (abs >= 10_000) {
    return `${sign}${(abs / 10_000).toFixed(0)}만`;
  }
  return `${sign}${abs.toLocaleString()}`;
}

/**
 * Format a number with fixed decimal places and commas.
 */
function formatWithDecimals(value: number, decimalPlaces?: number): string {
  if (decimalPlaces != null) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });
  }
  return value.toLocaleString();
}

/**
 * Format a value based on the series valueFormat and unit.
 * Used by chart components for tooltips, labels, and axis ticks.
 */
export function formatValue(
  value: number,
  valueFormat?: ValueFormat,
  unit?: string,
  decimalPlaces?: number,
  valueDivisor?: number,
): string {
  if (value == null || isNaN(value)) return '-';
  const v = valueDivisor && valueDivisor !== 0 ? value / valueDivisor : value;

  switch (valueFormat) {
    case 'currency':
      // If user set a divisor, they chose the unit explicitly — skip auto-conversion
      if (valueDivisor) {
        return `${formatWithDecimals(v, decimalPlaces ?? 0)}${unit ?? '원'}`;
      }
      return formatKRW(v);
    case 'percent':
      return `${(decimalPlaces != null ? v.toFixed(decimalPlaces) : v.toFixed(1))}%`;
    case 'count':
    case 'number':
      return `${formatWithDecimals(v, decimalPlaces)}${unit ?? ''}`;
    default:
      return `${formatWithDecimals(v, decimalPlaces)}${unit ?? ''}`;
  }
}

/**
 * Format axis tick based on valueFormat.
 */
export function formatAxisValue(
  value: number,
  valueFormat?: ValueFormat,
  unit?: string,
  decimalPlaces?: number,
  valueDivisor?: number,
): string {
  if (value == null || isNaN(value)) return '';
  const v = valueDivisor && valueDivisor !== 0 ? value / valueDivisor : value;

  switch (valueFormat) {
    case 'currency':
      if (valueDivisor) {
        return `${formatWithDecimals(v, decimalPlaces ?? 0)}${unit ?? ''}`;
      }
      return formatAxisKRW(v);
    case 'percent':
      return `${(decimalPlaces != null ? v.toFixed(decimalPlaces) : v.toFixed(0))}%`;
    default:
      return `${formatWithDecimals(v, decimalPlaces)}${unit ?? ''}`;
  }
}
