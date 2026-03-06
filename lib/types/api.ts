export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  type?: 'system';
}

export interface WidgetFixEvent {
  type: 'fix_started' | 'fix_succeeded' | 'fix_failed';
  widgetId: string;
  widgetTitle: string;
  attempt: number;
  maxAttempts: number;
  explanation?: string;
  error?: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  dashboardContext?: {
    widgets: import('./chart').ChartWidget[];
  };
  mode: 'chat' | 'builder';
}

export interface ChatResponse {
  message: string;
  actions?: WidgetAction[];
}

export interface WidgetAction {
  action: 'create' | 'update' | 'delete';
  widget?: import('./chart').ChartWidget;
  widgetId?: string;
  sql?: string;
}

export interface QueryRequest {
  sql: string;
  cacheKey?: string;
  cacheTtl?: number;
}

export interface QueryResponse {
  data: Record<string, unknown>[];
  fromCache: boolean;
  cachedAt?: string;
}
