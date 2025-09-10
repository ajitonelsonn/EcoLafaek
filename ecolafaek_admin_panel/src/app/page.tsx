'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { StatsCard } from '@/components/dashboard/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  FileText, 
  MapPin, 
  CheckCircle, 
  AlertCircle,
  TrendingUp
} from 'lucide-react'

interface DashboardStats {
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

interface RecentReport {
  report_id: number
  report_date: string
  status: string
  username: string
  waste_type_name?: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentReports, setRecentReports] = useState<RecentReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data.stats)
          setRecentReports(data.recent_reports)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
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
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
              <p className="text-gray-600">Welcome to EcoLafaek Admin Panel</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatsCard
                title="Total Users"
                value={stats?.total_users || 0}
                icon={Users}
                change={`+${stats?.reports_this_week || 0} this week`}
                changeType="increase"
              />
              <StatsCard
                title="Total Reports"
                value={stats?.total_reports || 0}
                icon={FileText}
                change={`${stats?.reports_today || 0} today`}
                changeType="neutral"
              />
              <StatsCard
                title="Active Hotspots"
                value={stats?.active_hotspots || 0}
                icon={MapPin}
                change="Critical areas"
                changeType="decrease"
              />
              <StatsCard
                title="Resolved Reports"
                value={stats?.resolved_reports || 0}
                icon={CheckCircle}
                change={`${Math.round(((stats?.resolved_reports || 0) / (stats?.total_reports || 1)) * 100)}% completion rate`}
                changeType="increase"
              />
            </div>

            {/* Charts and Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Top Waste Types */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Top Waste Types
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats?.top_waste_types?.map((wasteType, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-green-600">
                              {index + 1}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">
                            {wasteType.name || 'Mixed'}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {wasteType.count} reports
                        </span>
                      </div>
                    )) || (
                      <p className="text-gray-500 text-sm">No data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Reports */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    Recent Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentReports.slice(0, 5).map((report) => (
                      <div key={report.report_id} className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            Report #{report.report_id}
                          </p>
                          <p className="text-sm text-gray-600">
                            by {report.username} • {report.waste_type_name || 'Analyzing'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(report.report_date).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          report.status === 'resolved' 
                            ? 'bg-green-100 text-green-800' 
                            : report.status === 'analyzed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {report.status}
                        </span>
                      </div>
                    ))}
                    {recentReports.length === 0 && (
                      <p className="text-gray-500 text-sm">No recent reports</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {stats?.average_severity || 0}
                    </div>
                    <p className="text-sm text-gray-600">Average Severity Score</p>
                    <p className="text-xs text-gray-500 mt-1">Out of 10</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {stats?.pending_reports || 0}
                    </div>
                    <p className="text-sm text-gray-600">Pending Reports</p>
                    <p className="text-xs text-gray-500 mt-1">Awaiting action</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {stats?.reports_this_month || 0}
                    </div>
                    <p className="text-sm text-gray-600">This Month</p>
                    <p className="text-xs text-gray-500 mt-1">Total reports</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
