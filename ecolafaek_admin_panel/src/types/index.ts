export interface User {
  user_id: number
  username: string
  email: string
  phone_number?: string
  registration_date: string
  last_login?: string
  account_status: 'active' | 'inactive' | 'suspended'
  profile_image_url?: string
  verification_status: boolean
}

export interface Report {
  report_id: number
  user_id: number
  username?: string
  latitude: number
  longitude: number
  location_id?: number
  report_date: string
  description?: string
  status: 'submitted' | 'analyzing' | 'analyzed' | 'resolved' | 'rejected'
  image_url?: string
  device_info?: any
  address_text?: string
}

export interface AnalysisResult {
  analysis_id: number
  report_id: number
  analyzed_date: string
  waste_type_id?: number
  confidence_score?: number
  estimated_volume?: number
  severity_score?: number
  priority_level: 'low' | 'medium' | 'high' | 'critical'
  analysis_notes?: string
  full_description?: string
  processed_by?: string
  waste_type_name?: string
}

export interface Hotspot {
  hotspot_id: number
  name?: string
  center_latitude: number
  center_longitude: number
  radius_meters?: number
  location_id?: number
  first_reported: string
  last_reported: string
  total_reports: number
  average_severity?: number
  status: 'active' | 'monitoring' | 'resolved'
  notes?: string
}

export interface WasteType {
  waste_type_id: number
  name: string
  description?: string
  hazard_level: 'low' | 'medium' | 'high'
  recyclable: boolean
  icon_url?: string
}

export interface DashboardStats {
  total_users: number
  total_reports: number
  reports_today: number
  reports_this_week: number
  reports_this_month: number
  active_hotspots: number
  resolved_reports: number
  pending_reports: number
  average_severity: number
  top_waste_types: Array<{
    name: string
    count: number
  }>
}

export interface SystemLog {
  log_id: number
  timestamp: string
  agent: string
  action: string
  details?: string
  log_level: 'info' | 'warning' | 'error' | 'critical'
  related_id?: number
  related_table?: string
}