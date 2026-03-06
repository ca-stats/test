'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { ChartWidget, TableMapping } from '@/lib/types/chart';
import { formatValue } from '@/lib/format';

interface Props {
  widget: ChartWidget;
  data: Record<string, unknown>[];
  onUpdate?: (widget: ChartWidget) => void;
}

export function DataTableWidget({ widget, data, onUpdate }: Props) {
  const mapping = widget.mapping as TableMapping;
  const { style } = widget;
  const [sortField, setSortField] = useState(mapping.sortBy || '');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(mapping.sortOrder || 'asc');
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const widths: Record<string, number> = {};
    mapping.columns.forEach((col) => {
      widths[col.field] = col.width || 120;
    });
    return widths;
  });

  const resizingRef = useRef<{ field: string; startX: number; startW: number } | null>(null);

  const handleResizeStart = useCallback(
    (field: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = colWidths[field] || 120;
      resizingRef.current = { field, startX, startW };

      const onMouseMove = (ev: MouseEvent) => {
        if (!resizingRef.current) return;
        const diff = ev.clientX - resizingRef.current.startX;
        const newWidth = Math.max(50, resizingRef.current.startW + diff);
        setColWidths((prev) => ({ ...prev, [resizingRef.current!.field]: newWidth }));
      };

      const onMouseUp = () => {
        // Persist widths back to widget config
        if (onUpdate) {
          setColWidths((current) => {
            const updatedCols = mapping.columns.map((col) => ({
              ...col,
              width: current[col.field] || col.width || 120,
            }));
            onUpdate({ ...widget, mapping: { ...mapping, columns: updatedCols } });
            return current;
          });
        }
        resizingRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [colWidths]
  );

  const sortedData = useMemo(() => {
    if (!sortField) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      // Numeric comparison — handles both actual numbers and numeric strings from BigQuery
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!isNaN(aNum) && !isNaN(bNum) && aVal !== '' && aVal != null && bVal !== '' && bVal != null) {
        return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
      }
      return sortOrder === 'asc'
        ? String(aVal ?? '').localeCompare(String(bVal ?? ''))
        : String(bVal ?? '').localeCompare(String(aVal ?? ''));
    });
  }, [data, sortField, sortOrder]);

  function handleSort(field: string) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }

  function fmtCell(value: unknown, col: (typeof mapping.columns)[0]): string {
    if (value == null) return '-';
    if (col.format === 'text') return String(value);
    const fmt = col.format === 'currency' ? 'currency'
      : col.format === 'percent' ? 'percent'
      : col.format === 'number' ? 'number'
      : undefined;
    return formatValue(Number(value), fmt, col.unit, col.decimalPlaces, col.valueDivisor);
  }

  function getCellColor(value: unknown, col: (typeof mapping.columns)[0]): string | undefined {
    if (!col.conditionalColor) return undefined;
    const num = Number(value);
    if (isNaN(num)) return undefined;
    for (const range of col.conditionalColor.ranges) {
      if (num >= range.min && num <= range.max) return range.color;
    }
    return undefined;
  }

  return (
    <div className="overflow-auto h-full" style={{ position: 'relative' }}>
      {/* Resize overlay handles — rendered outside the table so they are never clipped */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 2 }}>
        {(() => {
          let offset = mapping.showRowNumbers ? 48 : 0;
          return mapping.columns.map((col) => {
            offset += colWidths[col.field] || 120;
            return (
              <div
                key={col.field}
                onMouseDown={(e) => handleResizeStart(col.field, e)}
                style={{
                  position: 'absolute',
                  left: offset - 3,
                  top: 0,
                  bottom: 0,
                  width: 6,
                  cursor: 'col-resize',
                  pointerEvents: 'auto',
                }}
                className="hover:bg-blue-400/60 active:bg-blue-500/80 transition-colors"
              />
            );
          });
        })()}
      </div>

      <table style={{ fontSize: style.fontSize.axis, tableLayout: 'fixed', width: 'max-content', minWidth: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {mapping.showRowNumbers && (
              <th
                className="text-left text-[var(--color-text-muted)] font-medium bg-gray-50"
                style={{ width: 48, padding: '8px 12px', borderRight: '1px solid #E2E8F0', borderBottom: '2px solid #CBD5E1' }}
              >
                #
              </th>
            )}
            {mapping.columns.map((col, idx) => (
              <th
                key={col.field}
                className="text-left text-[var(--color-text-muted)] font-medium bg-gray-50"
                style={{
                  width: colWidths[col.field] || 120,
                  padding: '8px 12px',
                  borderRight: '1px solid #E2E8F0',
                  borderBottom: '2px solid #CBD5E1',
                }}
              >
                <button
                  onClick={() => col.sortable !== false && handleSort(col.field)}
                  className="flex items-center gap-1 cursor-pointer hover:text-[var(--color-text)]"
                  disabled={col.sortable === false}
                >
                  {col.label}
                  {col.sortable !== false && (
                    sortField === col.field
                      ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
                      : <ArrowUpDown className="w-3 h-3 opacity-30" />
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, i) => (
            <tr key={i} className="hover:bg-blue-50/40 transition-colors">
              {mapping.showRowNumbers && (
                <td
                  className="text-[var(--color-text-muted)]"
                  style={{ padding: '6px 12px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #F1F5F9' }}
                >
                  {i + 1}.
                </td>
              )}
              {mapping.columns.map((col) => (
                <td
                  key={col.field}
                  className="truncate"
                  style={{
                    padding: '6px 12px',
                    borderRight: '1px solid #E2E8F0',
                    borderBottom: '1px solid #F1F5F9',
                    backgroundColor: getCellColor(row[col.field], col),
                  }}
                >
                  <span className="font-mono">{fmtCell(row[col.field], col)}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
