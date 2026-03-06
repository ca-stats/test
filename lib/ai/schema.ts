export const CHART_CONFIG_SCHEMA = `{
  "id": "string (unique, format: widget_<timestamp>)",
  "type": "bar | line | combo | pie | donut | area | table | kpi",
  "title": "string (Korean)",
  "position": { "x": 0-11, "y": number, "w": 1-12, "h": 1-8 },
  "sql": "SELECT ... FROM ... (valid BigQuery SQL)",
  "cache": { "ttl": 900, "enabled": true },
  "mapping": {
    "xAxis": "column_name",
    "series": [{
      "field": "column_name",
      "type": "bar|line|area",
      "color": "#hex",
      "label": "Korean label (displayed in legend and tooltips)",
      "yAxis": "left|right",
      "valueFormat": "currency|number|percent|count",
      "unit": "건|명|개|원|% (optional suffix appended to formatted values)",
      "decimalPlaces": "0-4 (optional, controls decimal precision)",
      "valueDivisor": "number (optional, divides raw value before display, e.g. 10000 for 만원, 100000000 for 억원)"
    }],
    "colors": ["#hex array (optional, per-slice colors for pie/donut charts)"]
  },
  "style": {
    "fontSize": { "title": 12-24, "axis": 10-16, "label": 9-14 },
    "legend": { "position": "top|bottom|left|right", "visible": boolean },
    "dataLabels": { "visible": boolean },
    "gridLines": boolean,
    "backgroundColor": "#FFFFFF",
    "borderRadius": 8
  }
}

IMPORTANT - valueFormat controls how numbers appear on axis, tooltips, and labels:
- "currency": formats as Korean won — by default auto-converts to 만원/억원. To show raw 원, set valueDivisor: 1, unit: "원"
- "count": formats as plain number with commas — use for counts (건수, 명수)
- "number": formats as plain number with commas
- "percent": formats as percentage with % suffix
- The "unit" field adds a suffix: e.g. unit "건" shows "1,234건", unit "명" shows "1,234명"
- If valueFormat is omitted, values show as plain numbers with commas
- "decimalPlaces": controls how many decimal places to show (e.g. 0 for "1,234", 2 for "1,234.56")
- "valueDivisor": divides the raw value before display. Use with unit to show scaled values:
  - valueDivisor: 10000, unit: "만원" → 50,000,000 displays as "5,000만원"
  - valueDivisor: 100000000, unit: "억원" → 500,000,000 displays as "5억원"
  - When valueDivisor is set with currency format, auto-conversion (만원/억원) is skipped
- "colors" array in mapping: per-slice colors for pie/donut charts. If omitted, default palette is used

For table type, mapping uses:
{
  "columns": [{ "field": "col", "label": "Korean", "format": "number|percent|currency|text", "sortable": boolean, "width": number, "unit": "optional suffix", "decimalPlaces": 0-4, "valueDivisor": "number (e.g. 10000 for 만원)" }],
  "sortBy": "column_name",
  "sortOrder": "asc|desc",
  "showRowNumbers": boolean
}
Table column formatting rules:
- format "currency" with NO valueDivisor → auto-converts to 만원/억원 based on value size
- format "currency" with valueDivisor: 1, unit: "원" → shows raw 원 values (e.g. "50,000,000원")
- format "currency" with valueDivisor: 10000, unit: "만원" → forces 만원 display
- format "number" with unit: "건" → shows "1,234건"

For kpi type, mapping uses:
{
  "valueField": "column",
  "format": "number|percent|currency",
  "comparisonField": "optional_column",
  "comparisonLabel": "전월 대비"
}`;
