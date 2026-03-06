'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, GripVertical, Trash2, Settings, X, Filter, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { ChartRenderer } from '@/components/charts/ChartRenderer';
import { useWidgetData } from '@/hooks/useWidgetData';
import type { ChartWidget, ChartStyle, ChartMapping, TableMapping, SeriesConfig, ValueFormat, DataLabelPosition } from '@/lib/types/chart';
import type { WidgetFixEvent } from '@/lib/types/api';

const DEFAULT_STYLE: ChartStyle = {
  fontSize: { title: 14, axis: 12, label: 11 },
  legend: { position: 'bottom', visible: true },
  dataLabels: { visible: false, position: 'top', offset: 5, hideZero: true },
  gridLines: true,
  backgroundColor: '#FFFFFF',
  borderRadius: 8,
};

function mergeStyle(style?: Partial<ChartStyle>): ChartStyle {
  if (!style) return DEFAULT_STYLE;
  return {
    ...DEFAULT_STYLE,
    ...style,
    fontSize: { ...DEFAULT_STYLE.fontSize, ...style.fontSize },
    legend: { ...DEFAULT_STYLE.legend, ...style.legend },
    dataLabels: { ...DEFAULT_STYLE.dataLabels, ...style.dataLabels },
  };
}

function hasSeriesMapping(mapping: ChartWidget['mapping']): mapping is ChartMapping {
  return 'series' in mapping && Array.isArray((mapping as ChartMapping).series);
}

function hasTableMapping(mapping: ChartWidget['mapping']): mapping is TableMapping {
  return 'columns' in mapping && Array.isArray((mapping as TableMapping).columns);
}

const PIE_DEFAULT_COLORS = ['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#F59E0B', '#FBBF24', '#34D399', '#F87171'];

const UNIT_PRESETS = [
  { label: '자동', valueDivisor: undefined, unit: undefined },
  { label: '원', valueDivisor: 1, unit: '원' },
  { label: '만원', valueDivisor: 10000, unit: '만원' },
  { label: '억원', valueDivisor: 100000000, unit: '억원' },
] as const;

interface Props {
  widget: ChartWidget;
  onDelete?: () => void;
  onUpdate?: (widget: ChartWidget) => void;
  onFixEvent?: (event: WidgetFixEvent) => void;
}

export function WidgetCard({ widget, onDelete, onUpdate, onFixEvent }: Props) {
  const style = mergeStyle(widget.style as Partial<ChartStyle> | undefined);
  const safeWidget = { ...widget, style };

  const handleSqlFixed = useCallback((widgetId: string, newSql: string) => {
    if (onUpdate) {
      onUpdate({ ...widget, sql: newSql });
    }
  }, [onUpdate, widget]);

  const { data, loading, error, fromCache, fixing, fixAttempt, fixExplanation, refresh } = useWidgetData(widget, {
    onSqlFixed: handleSqlFixed,
    onFixEvent,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterColumn, setFilterColumn] = useState<string | null>(null);
  const [excludedValues, setExcludedValues] = useState<Record<string, Set<string>>>({});
  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    if (!showFilter) return;
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showFilter]);

  // Get column names from data
  const columns = useMemo(() => {
    if (!data.length) return [];
    return Object.keys(data[0]);
  }, [data]);

  // Get unique values for the selected filter column
  const columnValues = useMemo(() => {
    if (!filterColumn || !data.length) return [];
    const vals = new Set<string>();
    for (const row of data) {
      const v = row[filterColumn];
      vals.add(v == null ? '' : String(v));
    }
    return Array.from(vals).sort();
  }, [data, filterColumn]);

  // Apply filters to data
  const filteredData = useMemo(() => {
    const activeFilters = Object.entries(excludedValues).filter(([, set]) => set.size > 0);
    if (activeFilters.length === 0) return data;
    return data.filter((row) =>
      activeFilters.every(([col, excluded]) => {
        const v = row[col] == null ? '' : String(row[col]);
        return !excluded.has(v);
      })
    );
  }, [data, excludedValues]);

  const activeFilterCount = Object.values(excludedValues).filter((s) => s.size > 0).length;

  function toggleValue(col: string, val: string) {
    setExcludedValues((prev) => {
      const set = new Set(prev[col] || []);
      if (set.has(val)) set.delete(val);
      else set.add(val);
      return { ...prev, [col]: set };
    });
  }

  function selectAll(col: string) {
    setExcludedValues((prev) => ({ ...prev, [col]: new Set() }));
  }

  function deselectAll(col: string, values: string[]) {
    setExcludedValues((prev) => ({ ...prev, [col]: new Set(values) }));
  }

  function clearAllFilters() {
    setExcludedValues({});
    setShowFilter(false);
  }

  function updateWidget(partial: Partial<ChartWidget>) {
    if (!onUpdate) return;
    onUpdate({ ...safeWidget, ...partial });
  }

  function updateStyle(partial: Partial<ChartStyle>) {
    updateWidget({ style: { ...style, ...partial } });
  }

  function updateSeries(index: number, partial: Partial<SeriesConfig>) {
    if (!hasSeriesMapping(safeWidget.mapping)) return;
    const newSeries = safeWidget.mapping.series.map((s, i) =>
      i === index ? { ...s, ...partial } : s
    );
    updateWidget({ mapping: { ...safeWidget.mapping, series: newSeries } });
  }

  function updateSliceColor(index: number, color: string) {
    if (!hasSeriesMapping(safeWidget.mapping)) return;
    const colors = [...(safeWidget.mapping.colors ?? [])];
    // Ensure array is long enough
    while (colors.length <= index) {
      colors.push(PIE_DEFAULT_COLORS[colors.length % PIE_DEFAULT_COLORS.length]);
    }
    colors[index] = color;
    updateWidget({ mapping: { ...safeWidget.mapping, colors } });
  }

  function getUnitPresetValue(s: SeriesConfig): string {
    if (s.valueDivisor === 100000000) return '억원';
    if (s.valueDivisor === 10000) return '만원';
    if (s.valueDivisor === 1) return '원';
    return '자동';
  }

  function moveColumn(index: number, direction: -1 | 1) {
    if (!hasTableMapping(safeWidget.mapping)) return;
    const cols = [...safeWidget.mapping.columns];
    const target = index + direction;
    if (target < 0 || target >= cols.length) return;
    [cols[index], cols[target]] = [cols[target], cols[index]];
    updateWidget({ mapping: { ...safeWidget.mapping, columns: cols } });
  }

  function deleteColumn(index: number) {
    if (!hasTableMapping(safeWidget.mapping)) return;
    const cols = safeWidget.mapping.columns.filter((_, i) => i !== index);
    updateWidget({ mapping: { ...safeWidget.mapping, columns: cols } });
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
          <h3 className="font-medium text-sm text-[var(--color-text)]" style={{ fontSize: style.fontSize.title }}>
            {widget.title}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {fromCache && (
            <span className="text-xs text-[var(--color-text-muted)] mr-1">cached</span>
          )}
          <button onClick={refresh} className="p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer" title="새로고침">
            <RefreshCw className={`w-3.5 h-3.5 text-[var(--color-text-muted)] ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => { setShowFilter(!showFilter); if (!showFilter && !filterColumn && columns.length) setFilterColumn(columns[0]); }}
              className="p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer"
              title="필터"
            >
              <Filter className={`w-3.5 h-3.5 ${activeFilterCount > 0 ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[var(--color-primary)] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {showFilter && columns.length > 0 && (
              <div className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-56 text-xs">
                <div className="p-2 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-semibold text-[var(--color-text)]">필터</span>
                  {activeFilterCount > 0 && (
                    <button onClick={clearAllFilters} className="text-[var(--color-primary)] hover:underline cursor-pointer">초기화</button>
                  )}
                </div>
                <div className="p-2 border-b border-gray-100">
                  <select
                    value={filterColumn || ''}
                    onChange={(e) => setFilterColumn(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none cursor-pointer"
                  >
                    {columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                {filterColumn && (
                  <div className="max-h-48 overflow-y-auto p-1">
                    <div className="flex gap-2 px-2 py-1 border-b border-gray-50">
                      <button onClick={() => selectAll(filterColumn)} className="text-[var(--color-primary)] hover:underline cursor-pointer">전체 선택</button>
                      <button onClick={() => deselectAll(filterColumn, columnValues)} className="text-[var(--color-primary)] hover:underline cursor-pointer">전체 해제</button>
                    </div>
                    {columnValues.map((val) => {
                      const excluded = excludedValues[filterColumn]?.has(val) ?? false;
                      return (
                        <label key={val} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!excluded}
                            onChange={() => toggleValue(filterColumn, val)}
                            className="cursor-pointer"
                          />
                          <span className="truncate text-[var(--color-text)]">{val || '(빈 값)'}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          {onUpdate && (
            <button onClick={() => setShowSettings(!showSettings)} className="p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer" title="설정">
              <Settings className={`w-3.5 h-3.5 ${showSettings ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`} />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 transition-colors cursor-pointer" title="삭제">
              <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-500" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Chart area */}
        <div className={`flex-1 p-2 min-h-0 min-w-0 overflow-hidden relative ${showSettings ? 'pr-0' : ''}`}>
          {fixing ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600">쿼리 수정 중... ({fixAttempt}/2)</p>
              </div>
            </div>
          ) : loading && !data.length ? (
            <div className="h-full animate-pulse bg-gray-50 rounded" />
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-500 text-sm">
              <span>{error}</span>
              {fixAttempt > 0 && (
                <span className="text-xs text-gray-400 mt-1">({fixAttempt}회 자동 수정 시도 실패)</span>
              )}
            </div>
          ) : (
            <>
              {fixExplanation && (
                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded mb-1">{fixExplanation}</div>
              )}
              <ChartRenderer widget={safeWidget} data={filteredData} onUpdate={onUpdate ? (w) => updateWidget(w) : undefined} />
            </>
          )}
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="w-56 border-l border-gray-100 overflow-y-auto p-3 space-y-3 text-xs flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--color-text)]">위젯 설정</span>
              <button onClick={() => setShowSettings(false)} className="p-0.5 hover:bg-gray-100 rounded cursor-pointer">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>

            {/* Title */}
            <label className="block">
              <span className="text-[var(--color-text-muted)]">제목</span>
              <input
                type="text"
                defaultValue={widget.title}
                onBlur={(e) => updateWidget({ title: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                className="mt-1 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
              />
            </label>

            {/* Font sizes */}
            <div>
              <span className="text-[var(--color-text-muted)]">글꼴 크기</span>
              <div className="mt-1 space-y-1">
                {(['title', 'axis', 'label'] as const).map((key) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-gray-400">{key === 'title' ? '제목' : key === 'axis' ? '축' : '레이블'}</span>
                    <input
                      type="number"
                      min={8}
                      max={32}
                      defaultValue={style.fontSize[key]}
                      onBlur={(e) => updateStyle({ fontSize: { ...style.fontSize, [key]: Number(e.target.value) } })}
                      className="w-14 px-1.5 py-0.5 border border-gray-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-muted)]">범례</span>
                <input
                  type="checkbox"
                  checked={style.legend.visible}
                  onChange={(e) => updateStyle({ legend: { ...style.legend, visible: e.target.checked } })}
                  className="cursor-pointer"
                />
              </div>
              {style.legend.visible && (
                <select
                  value={style.legend.position}
                  onChange={(e) => updateStyle({ legend: { ...style.legend, position: e.target.value as ChartStyle['legend']['position'] } })}
                  className="mt-1 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none cursor-pointer"
                >
                  <option value="top">위</option>
                  <option value="bottom">아래</option>
                  <option value="left">왼쪽</option>
                  <option value="right">오른쪽</option>
                </select>
              )}
            </div>

            {/* Data labels */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-muted)]">데이터 레이블</span>
                <input
                  type="checkbox"
                  checked={style.dataLabels.visible}
                  onChange={(e) => updateStyle({ dataLabels: { ...style.dataLabels, visible: e.target.checked } })}
                  className="cursor-pointer"
                />
              </div>
              {style.dataLabels.visible && (
                <div className="mt-1 ml-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">위치</span>
                    <select
                      value={style.dataLabels.position ?? 'top'}
                      onChange={(e) => updateStyle({ dataLabels: { ...style.dataLabels, position: e.target.value as DataLabelPosition } })}
                      className="w-20 px-1 py-0.5 border border-gray-200 rounded text-xs focus:outline-none cursor-pointer"
                    >
                      {widget.type === 'pie' || widget.type === 'donut' ? (
                        <>
                          <option value="outside">바깥</option>
                          <option value="inside">안쪽</option>
                        </>
                      ) : (
                        <>
                          <option value="top">위</option>
                          <option value="bottom">아래</option>
                          <option value="inside">안쪽</option>
                          <option value="center">중앙</option>
                          <option value="left">왼쪽</option>
                          <option value="right">오른쪽</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">간격</span>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={style.dataLabels.offset ?? 5}
                      onChange={(e) => updateStyle({ dataLabels: { ...style.dataLabels, offset: Number(e.target.value) } })}
                      className="w-14 px-1.5 py-0.5 border border-gray-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">0 숨기기</span>
                    <input
                      type="checkbox"
                      checked={style.dataLabels.hideZero !== false}
                      onChange={(e) => updateStyle({ dataLabels: { ...style.dataLabels, hideZero: e.target.checked } })}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Grid lines */}
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">그리드 라인</span>
              <input
                type="checkbox"
                checked={style.gridLines}
                onChange={(e) => updateStyle({ gridLines: e.target.checked })}
                className="cursor-pointer"
              />
            </div>

            {/* Series settings */}
            {hasSeriesMapping(safeWidget.mapping) && safeWidget.mapping.series.length > 0 && (
              <div>
                <span className="text-[var(--color-text-muted)]">시리즈</span>
                <div className="mt-1 space-y-2">
                  {safeWidget.mapping.series.map((s, i) => (
                    <div key={i} className="space-y-1.5 p-2 bg-gray-50 rounded">
                      {/* Color & label */}
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={s.color}
                          onChange={(e) => updateSeries(i, { color: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                        />
                        <input
                          type="text"
                          defaultValue={s.label}
                          onBlur={(e) => updateSeries(i, { label: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                          className="flex-1 px-1.5 py-0.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
                        />
                      </div>
                      {/* Value format */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">값 형식</span>
                        <select
                          value={s.valueFormat ?? 'number'}
                          onChange={(e) => updateSeries(i, { valueFormat: e.target.value as ValueFormat })}
                          className="w-20 px-1 py-0.5 border border-gray-200 rounded text-xs focus:outline-none cursor-pointer"
                        >
                          <option value="number">숫자</option>
                          <option value="currency">통화</option>
                          <option value="percent">퍼센트</option>
                          <option value="count">카운트</option>
                        </select>
                      </div>
                      {/* Decimal places */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">소수점</span>
                        <input
                          type="number"
                          min={0}
                          max={4}
                          value={s.decimalPlaces ?? ''}
                          placeholder="자동"
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : Number(e.target.value);
                            updateSeries(i, { decimalPlaces: val });
                          }}
                          className="w-14 px-1.5 py-0.5 border border-gray-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
                        />
                      </div>
                      {/* Unit conversion */}
                      {(s.valueFormat === 'currency' || s.valueFormat === undefined) ? (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">단위</span>
                          <select
                            value={getUnitPresetValue(s)}
                            onChange={(e) => {
                              const preset = UNIT_PRESETS.find((p) => p.label === e.target.value);
                              if (preset) {
                                updateSeries(i, { valueDivisor: preset.valueDivisor, unit: preset.unit });
                              }
                            }}
                            className="w-20 px-1 py-0.5 border border-gray-200 rounded text-xs focus:outline-none cursor-pointer"
                          >
                            {UNIT_PRESETS.map((p) => (
                              <option key={p.label} value={p.label}>{p.label}</option>
                            ))}
                          </select>
                        </div>
                      ) : s.valueFormat !== 'percent' ? (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">단위</span>
                          <input
                            type="text"
                            defaultValue={s.unit ?? ''}
                            placeholder="예: 건, 명"
                            onBlur={(e) => updateSeries(i, { unit: e.target.value || undefined })}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="w-20 px-1.5 py-0.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pie/donut slice colors */}
            {(widget.type === 'pie' || widget.type === 'donut') && hasSeriesMapping(safeWidget.mapping) && data.length > 0 && (
              <div>
                <span className="text-[var(--color-text-muted)]">슬라이스 색상</span>
                <div className="mt-1 space-y-1">
                  {data.map((row, i) => {
                    const mapping = safeWidget.mapping as ChartMapping;
                    const sliceName = String(row[mapping.xAxis] ?? `#${i + 1}`);
                    const color = mapping.colors?.[i] ?? PIE_DEFAULT_COLORS[i % PIE_DEFAULT_COLORS.length];
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => updateSliceColor(i, e.target.value)}
                          className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                        />
                        <span className="text-gray-400 truncate">{sliceName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Table column management */}
            {widget.type === 'table' && hasTableMapping(safeWidget.mapping) && (
              <div>
                <span className="text-[var(--color-text-muted)]">컬럼 관리</span>
                <div className="mt-1 space-y-1">
                  {safeWidget.mapping.columns.map((col, i) => (
                    <div key={col.field} className="flex items-center gap-1 p-1.5 bg-gray-50 rounded">
                      <span className="flex-1 truncate text-[var(--color-text)]">{col.label}</span>
                      <button
                        onClick={() => moveColumn(i, -1)}
                        disabled={i === 0}
                        className="p-0.5 hover:bg-gray-200 rounded cursor-pointer disabled:opacity-20 disabled:cursor-default"
                        title="위로 이동"
                      >
                        <ArrowUp className="w-3 h-3 text-gray-500" />
                      </button>
                      <button
                        onClick={() => moveColumn(i, 1)}
                        disabled={i === (safeWidget.mapping as TableMapping).columns.length - 1}
                        className="p-0.5 hover:bg-gray-200 rounded cursor-pointer disabled:opacity-20 disabled:cursor-default"
                        title="아래로 이동"
                      >
                        <ArrowDown className="w-3 h-3 text-gray-500" />
                      </button>
                      <button
                        onClick={() => deleteColumn(i)}
                        className="p-0.5 hover:bg-red-50 rounded cursor-pointer"
                        title="컬럼 삭제"
                      >
                        <X className="w-3 h-3 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
