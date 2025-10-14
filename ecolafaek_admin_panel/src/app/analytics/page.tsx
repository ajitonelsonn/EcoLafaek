'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts'
import {
  TrendingUp,
  Users,
  AlertTriangle,
  Target,
  Activity,
  Loader2,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  FileDown,
  Printer,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { exportToCSV, exportToJSON } from '@/lib/export'

interface AnalyticsData {
  overview: {
    total_users: number
    total_reports: number
    total_hotspots: number
    active_hotspots: number
    reports_today: number
    users_this_month: number
  }
  reports_by_month: Array<{
    month: string
    count: number
  }>
  reports_by_status: Array<{
    status: string
    count: number
    percentage: number
  }>
  reports_by_waste_type: Array<{
    waste_type: string
    count: number
  }>
  hotspots_by_status: Array<{
    status: string
    count: number
  }>
  user_registration_trend: Array<{
    month: string
    count: number
  }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('6months')

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics?range=${timeRange}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
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
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                    Analytics & Statistics
                  </h1>
                  <p className="text-gray-600">
                    Comprehensive analytics and insights for the EcoLafaek platform
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchAnalytics}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => data && exportToCSV([data.overview], 'analytics_overview')}
                    disabled={!data}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => data && exportToJSON(data, 'analytics_full_report')}
                    disabled={!data}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3months">Last 3 months</SelectItem>
                      <SelectItem value="6months">Last 6 months</SelectItem>
                      <SelectItem value="12months">Last 12 months</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Overview Cards */}
            {data?.overview && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-blue-900">Total Users</CardTitle>
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-900">{data.overview.total_users.toLocaleString()}</div>
                    <p className="text-xs text-blue-600 mt-1">Registered citizens</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-green-100">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-green-900">Total Reports</CardTitle>
                    <div className="p-2 bg-green-500 rounded-lg">
                      <BarChart3 className="h-4 w-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-900">{data.overview.total_reports.toLocaleString()}</div>
                    <p className="text-xs text-green-600 mt-1">All submissions</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-purple-900">Total Hotspots</CardTitle>
                    <div className="p-2 bg-purple-500 rounded-lg">
                      <Target className="h-4 w-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-900">{data.overview.total_hotspots}</div>
                    <p className="text-xs text-purple-600 mt-1">Identified areas</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-red-50 to-red-100">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-red-900">Active Hotspots</CardTitle>
                    <div className="p-2 bg-red-500 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-900">{data.overview.active_hotspots}</div>
                    <p className="text-xs text-red-600 mt-1">Needs attention</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-emerald-50 to-emerald-100">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-emerald-900">Reports Today</CardTitle>
                    <div className="p-2 bg-emerald-500 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-900">{data.overview.reports_today}</div>
                    <p className="text-xs text-emerald-600 mt-1">New today</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-indigo-50 to-indigo-100">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-indigo-900">New Users</CardTitle>
                    <div className="p-2 bg-indigo-500 rounded-lg">
                      <Activity className="h-4 w-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-indigo-900">{data.overview.users_this_month}</div>
                    <p className="text-xs text-indigo-600 mt-1">This month</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Reports by Month */}
              {data?.reports_by_month && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className="p-2 bg-blue-500 rounded-lg">
                          <BarChart3 className="h-5 w-5 text-white" />
                        </div>
                        Reports Trend
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => exportToCSV(data.reports_by_month, 'reports_by_month')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Monthly report submissions over time</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={data.reports_by_month}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="month"
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          tickLine={{ stroke: '#e5e7eb' }}
                        />
                        <YAxis
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          tickLine={{ stroke: '#e5e7eb' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          name="Reports"
                          dot={{ fill: '#3b82f6', r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Reports by Status */}
              {data?.reports_by_status && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className="p-2 bg-green-500 rounded-lg">
                          <PieChartIcon className="h-5 w-5 text-white" />
                        </div>
                        Reports by Status
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => exportToCSV(data.reports_by_status, 'reports_by_status')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Distribution of report statuses</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={data.reports_by_status}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(props: any) => `${props.status} (${Number(props.percentage || 0).toFixed(1)}%)`}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {data.reports_by_status.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Reports by Waste Type */}
              {data?.reports_by_waste_type && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className="p-2 bg-amber-500 rounded-lg">
                          <BarChart3 className="h-5 w-5 text-white" />
                        </div>
                        Reports by Waste Type
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => exportToCSV(data.reports_by_waste_type, 'reports_by_waste_type')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Top waste categories reported</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.reports_by_waste_type}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="waste_type"
                          tick={{ fill: '#6b7280', fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Legend />
                        <Bar dataKey="count" fill="#10b981" name="Reports" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* User Registration Trend */}
              {data?.user_registration_trend && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className="p-2 bg-purple-500 rounded-lg">
                          <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        User Registration Trend
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => exportToCSV(data.user_registration_trend, 'user_registration_trend')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">New user sign-ups over time</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={data.user_registration_trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="month"
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                        />
                        <YAxis
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#8b5cf6"
                          strokeWidth={3}
                          name="New Users"
                          dot={{ fill: '#8b5cf6', r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Hotspots Status Distribution */}
            {data?.hotspots_by_status && (
              <Card className="mb-6 border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <div className="p-2 bg-red-500 rounded-lg">
                        <Target className="h-5 w-5 text-white" />
                      </div>
                      Hotspots Status Distribution
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => exportToCSV(data.hotspots_by_status, 'hotspots_by_status')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Current status of identified hotspot areas</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {data.hotspots_by_status.map((item, index) => (
                      <div
                        key={item.status}
                        className="p-6 rounded-xl border-0 shadow-md hover:shadow-lg transition-all duration-300"
                        style={{
                          background: `linear-gradient(135deg, ${COLORS[index % COLORS.length]}15, ${COLORS[index % COLORS.length]}05)`
                        }}
                      >
                        <div className="text-center">
                          <div
                            className="text-4xl font-bold mb-2"
                            style={{ color: COLORS[index % COLORS.length] }}
                          >
                            {item.count}
                          </div>
                          <div className="text-sm font-medium text-gray-700 capitalize">
                            {item.status} Hotspots
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}