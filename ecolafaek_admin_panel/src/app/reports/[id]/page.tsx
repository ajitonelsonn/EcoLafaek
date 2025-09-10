'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  FileText, 
  User, 
  MapPin, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Camera,
  Activity,
  TrendingUp,
  Zap
} from 'lucide-react'

interface ReportDetails {
  report_id: number
  user_id: number
  username: string
  email: string
  phone_number?: string
  latitude: number
  longitude: number
  report_date: string
  description?: string
  status: string
  image_url?: string
  address_text?: string
  device_info?: any
  analysis_id?: number
  analyzed_date?: string
  waste_type_name?: string
  confidence_score?: number
  estimated_volume?: number
  severity_score?: number
  priority_level?: string
  analysis_notes?: string
  full_description?: string
  environmental_impact?: string
  hazard_level?: string
  recyclable?: boolean
}

interface Hotspot {
  hotspot_id: number
  name?: string
  center_latitude: number
  center_longitude: number
  radius_meters?: number
  total_reports: number
  average_severity?: number
  status: string
}

interface NearbyReport {
  report_id: number
  latitude: number
  longitude: number
  report_date: string
  status: string
  description?: string
  username: string
  waste_type_name?: string
  severity_score?: number
  distance: number
}

interface ActivityLog {
  log_id: number
  timestamp: string
  agent: string
  action: string
  details: string
  log_level: string
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.id as string
  
  const [report, setReport] = useState<ReportDetails | null>(null)
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [nearbyReports, setNearbyReports] = useState<NearbyReport[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReportDetails = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/reports/${reportId}`)
        if (response.ok) {
          const data = await response.json()
          setReport(data.report)
          setHotspots(data.hotspots)
          setNearbyReports(data.nearby_reports)
          setActivityLogs(data.activity_logs)
        }
      } catch (error) {
        console.error('Failed to fetch report details:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReportDetails()
  }, [reportId])

  const getStatusBadge = (status: string) => {
    const variants = {
      submitted: { variant: 'outline' as const, color: 'text-blue-600', icon: Clock },
      analyzing: { variant: 'secondary' as const, color: 'text-yellow-600', icon: Clock },
      analyzed: { variant: 'default' as const, color: 'text-green-600', icon: CheckCircle },
      resolved: { variant: 'secondary' as const, color: 'text-green-700', icon: CheckCircle },
      rejected: { variant: 'destructive' as const, color: 'text-red-600', icon: XCircle }
    }
    
    const config = variants[status as keyof typeof variants] || variants.submitted
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className={`inline-flex items-center gap-1 ${config.color}`}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64 bg-gray-200 rounded"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-medium text-gray-900 mb-2">Report not found</h2>
              <p className="text-gray-500">The requested report could not be found.</p>
              <Button 
                className="mt-4" 
                onClick={() => window.history.back()}
              >
                Go Back
              </Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <Button 
                variant="ghost" 
                className="mb-4"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Reports
              </Button>
              
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Report #{report.report_id}
                  </h1>
                  <p className="text-gray-600">
                    Submitted by {report.username} on {new Date(report.report_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {getStatusBadge(report.status)}
                  {report.priority_level && (
                    <Badge variant={
                      report.priority_level === 'critical' ? 'destructive' :
                      report.priority_level === 'high' ? 'destructive' :
                      report.priority_level === 'medium' ? 'secondary' : 'outline'
                    }>
                      {report.priority_level} priority
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Report Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Report Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Description</label>
                        <p className="mt-1 text-gray-900">
                          {report.description || 'No description provided'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Location</label>
                        <div className="mt-1 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900">
                            {report.address_text || `${report.latitude}, ${report.longitude}`}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Report Date</label>
                        <div className="mt-1 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900">
                            {new Date(report.report_date).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <div className="mt-1">
                          {getStatusBadge(report.status)}
                        </div>
                      </div>
                    </div>

                    {report.image_url && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Image</label>
                        <div className="mt-1">
                          <img 
                            src={report.image_url} 
                            alt="Report"
                            className="max-w-md rounded-lg border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Analysis Results */}
                {report.analysis_id && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        AI Analysis Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Waste Type</label>
                          <p className="mt-1 font-medium text-gray-900">
                            {report.waste_type_name || 'Unknown'}
                          </p>
                          {report.confidence_score && (
                            <p className="text-sm text-gray-500">
                              {Math.round(report.confidence_score)}% confidence
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Severity Score</label>
                          <p className="mt-1 font-medium text-gray-900">
                            {report.severity_score ? `${report.severity_score}/10` : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Estimated Volume</label>
                          <p className="mt-1 font-medium text-gray-900">
                            {report.estimated_volume ? `${report.estimated_volume} m³` : 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      {report.environmental_impact && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Environmental Impact</label>
                          <p className="mt-1 text-gray-900">{report.environmental_impact}</p>
                        </div>
                      )}
                      
                      {report.analysis_notes && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Analysis Notes</label>
                          <p className="mt-1 text-gray-900 whitespace-pre-line">{report.analysis_notes}</p>
                        </div>
                      )}
                      
                      {report.analyzed_date && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Analyzed Date</label>
                          <p className="mt-1 text-gray-900">
                            {new Date(report.analyzed_date).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Nearby Reports */}
                {nearbyReports.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Nearby Reports ({nearbyReports.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {nearbyReports.slice(0, 5).map((nearby) => (
                          <div key={nearby.report_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">
                                Report #{nearby.report_id}
                              </p>
                              <p className="text-sm text-gray-600">
                                by {nearby.username} • {nearby.waste_type_name || 'Unknown type'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(nearby.distance * 1000).toFixed(0)}m away
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(nearby.status)}
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => router.push(`/reports/${nearby.report_id}`)}
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* User Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Reporter Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Username</label>
                      <p className="mt-1 font-medium text-gray-900">{report.username}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="mt-1 text-gray-900">{report.email}</p>
                    </div>
                    {report.phone_number && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <p className="mt-1 text-gray-900">{report.phone_number}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Associated Hotspots */}
                {hotspots.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Associated Hotspots
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {hotspots.map((hotspot) => (
                          <div key={hotspot.hotspot_id} className="p-3 bg-orange-50 rounded-lg">
                            <p className="font-medium text-gray-900">
                              {hotspot.name || `Hotspot #${hotspot.hotspot_id}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              {hotspot.total_reports} total reports
                            </p>
                            {hotspot.average_severity && (
                              <p className="text-sm text-gray-600">
                                Avg severity: {Number(hotspot.average_severity).toFixed(1)}/10
                              </p>
                            )}
                            <Badge 
                              variant={hotspot.status === 'active' ? 'destructive' : 'outline'}
                              className="mt-2"
                            >
                              {hotspot.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Activity Log */}
                {activityLogs.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Activity Log
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {activityLogs.slice(0, 10).map((log) => (
                          <div key={log.log_id} className="text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">{log.action}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(log.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-gray-600 text-xs mt-1">{log.details}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}