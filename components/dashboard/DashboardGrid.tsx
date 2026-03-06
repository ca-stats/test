'use client';

import { useState, useCallback, useEffect } from 'react';
import ReactGridLayout from 'react-grid-layout';
import { useContainerWidth } from 'react-grid-layout';
import type { Layout, LayoutItem } from 'react-grid-layout';
import { WidgetCard } from './WidgetCard';
import type { ChartWidget } from '@/lib/types/chart';
import type { WidgetFixEvent } from '@/lib/types/api';

interface Props {
  widgets: ChartWidget[];
  onLayoutChange?: (widgets: ChartWidget[]) => void;
  onDeleteWidget?: (widgetId: string) => void;
  onUpdateWidget?: (widget: ChartWidget) => void;
  onFixEvent?: (event: WidgetFixEvent) => void;
  editable?: boolean;
}

export function DashboardGrid({ widgets, onLayoutChange, onDeleteWidget, onUpdateWidget, onFixEvent, editable = true }: Props) {
  const { width, containerRef, mounted } = useContainerWidth();
  const [currentWidgets, setCurrentWidgets] = useState(widgets);

  // Sync with parent when widgets prop changes (e.g. AI creates/updates/deletes)
  useEffect(() => {
    setCurrentWidgets(widgets);
  }, [widgets]);

  const layout: LayoutItem[] = currentWidgets.map((w) => ({
    i: w.id,
    x: w.position.x,
    y: w.position.y,
    w: w.position.w,
    h: w.position.h,
    minW: 2,
    minH: 2,
  }));

  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      const updated = currentWidgets.map((widget) => {
        const item = newLayout.find((l) => l.i === widget.id);
        if (!item) return widget;
        return {
          ...widget,
          position: { x: item.x, y: item.y, w: item.w, h: item.h },
        };
      });
      setCurrentWidgets(updated);
      onLayoutChange?.(updated);
    },
    [currentWidgets, onLayoutChange]
  );

  return (
    <div ref={containerRef} className="w-full">
      {mounted && (
        <ReactGridLayout
          layout={layout}
          width={width}
          gridConfig={{ cols: 12, rowHeight: 80, margin: [16, 16] }}
          dragConfig={{ enabled: editable }}
          resizeConfig={{ enabled: editable, handles: ['s', 'w', 'e', 'n', 'se', 'sw', 'ne', 'nw'] }}
          onLayoutChange={handleLayoutChange}
        >
          {currentWidgets.map((widget) => (
            <div key={widget.id}>
              <WidgetCard widget={widget} onDelete={onDeleteWidget ? () => onDeleteWidget(widget.id) : undefined} onUpdate={onUpdateWidget} onFixEvent={onFixEvent} />
            </div>
          ))}
        </ReactGridLayout>
      )}
    </div>
  );
}
