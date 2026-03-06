import { ChartWidget } from './chart';

export interface DashboardFolder {
  id: string;
  name: string;
  order: number;
}

export interface Dashboard {
  id: string;
  title: string;
  folderId: string | null;
  widgets: ChartWidget[];
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
}

export interface DashboardListItem {
  id: string;
  title: string;
  folderId: string | null;
  isFavorite: boolean;
  updatedAt: string;
}
