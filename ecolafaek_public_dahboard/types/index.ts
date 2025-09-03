// types/index.ts

export interface Report {
  report_id: number;
  user_id: number;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  status: string;
  image_url: string | null;
  report_date: string;
  severity_score?: number | null;
  priority_level?: string | null;
  waste_type?: string | null;
}

export interface WasteType {
  waste_type_id: number;
  name: string;
  description: string | null;
  hazard_level: string | null;
  recyclable: boolean;
  icon_url: string | null;
}

export interface Hotspot {
  hotspot_id: number;
  name: string;
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  total_reports: number;
  average_severity: number;
  first_reported: string;
  last_reported: string;
  status: string;
  report_count?: number;
}

export interface Location {
  location_id: number;
  name: string;
  district: string;
  report_count: number;
  avg_severity: number | null;
}

export interface DailyReport {
  date: string;
  count: number;
}

export interface ReportTrend {
  period: string;
  report_count: number;
  avg_severity: number | null;
}

export interface WasteTypeTrend {
  period: string;
  waste_type: string;
  count: number;
}

export interface PriorityTrend {
  period: string;
  priority_level: string;
  count: number;
}

export interface StatsOverview {
  total_reports: number;
  status_counts: Record<string, number>;
  waste_type_counts: Record<string, number>;
  avg_severity: number;
  priority_counts: Record<string, number>;
  hotspot_count: number;
  daily_reports: DailyReport[];
}

export interface MapData {
  reports: Report[];
  hotspots: Hotspot[];
}

export interface PaginatedReportsResponse {
  reports: Report[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface HotspotReportsResponse {
  hotspot: Hotspot;
  reports: Report[];
}

export interface TrendsResponse {
  report_trends: ReportTrend[];
  waste_type_trends: WasteTypeTrend[];
  priority_trends: PriorityTrend[];
}

export interface MapProps {
  data?: MapData;
  simplified?: boolean;
  selectedHotspot?: Hotspot | null;
  onHotspotSelect?: (hotspot: Hotspot) => void;
}
