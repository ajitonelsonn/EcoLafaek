'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Search,
  Filter,
  Calendar,
  Activity,
  AlertCircle,
  Info,
  AlertTriangle,
  Zap,
  Loader2,
  RefreshCw,
  Download
} from 'lucide-react'

interface SystemLog {
  log_id: number
  agent: string
  action: string
  details: string
  log_level: string
  timestamp: string
  related_id?: number
  related_table?: string
}

interface LogsData {
  logs: SystemLog[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  statistics: {
    total_logs: number
    error_logs: number
    warning_logs: number
    info_logs: number
  }
}

export default function SystemLogsPage() {
  const [data, setData] = useState<LogsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    level: 'all',
    agent: 'all',
    page: 1,
    limit: 25
  })

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        search: filters.search,
        level: filters.level,
        agent: filters.agent
      })
      
      const response = await fetch(`/api/logs?${params}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshLogs = async () => {
    setRefreshing(true)
    await fetchLogs()
    setRefreshing(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [filters])

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      ...(key !== 'page' ? { page: 1 } : {})
    }))
  }

  const getLogLevelBadge = (level: string) => {
    const variants = {
      error: { variant: 'destructive' as const, icon: AlertCircle, color: 'text-red-600' },
      warning: { variant: 'secondary' as const, icon: AlertTriangle, color: 'text-yellow-600' },
      info: { variant: 'default' as const, icon: Info, color: 'text-blue-600' },
      debug: { variant: 'outline' as const, icon: Zap, color: 'text-gray-600' }
    }
    
    const config = variants[level as keyof typeof variants] || variants.info
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className={`inline-flex items-center gap-1 ${config.color}`}>
        <Icon className="h-3 w-3" />
        {level.toUpperCase()}
      </Badge>
    )
  }

  const getAgentColor = (agent: string) => {
    const colors = {
      admin_panel: 'bg-blue-100 text-blue-800',
      mobile_app: 'bg-green-100 text-green-800',
      public_dashboard: 'bg-purple-100 text-purple-800',
      system: 'bg-gray-100 text-gray-800',
      api: 'bg-orange-100 text-orange-800'
    }
    
    return colors[agent as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams({
        search: filters.search,
        level: filters.level,
        agent: filters.agent,
        export: 'csv'
      })
      
      const response = await fetch(`/api/logs?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `system_logs_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export logs:', error)
    }
  }

  if (loading && !data) {
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
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">System Logs</h1>
                  <p className="text-gray-600">
                    Monitor system activity and application events
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={exportLogs}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={refreshLogs}
                    disabled={refreshing}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>

            {/* Statistics */}
            {data?.statistics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.statistics.total_logs.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Error Logs</CardTitle>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{data.statistics.error_logs}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Warning Logs</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{data.statistics.warning_logs}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Info Logs</CardTitle>
                    <Info className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{data.statistics.info_logs}</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search logs..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={filters.level} onValueChange={(value) => handleFilterChange('level', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Log level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="debug">Debug</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filters.agent} onValueChange={(value) => handleFilterChange('agent', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      <SelectItem value="admin_panel">Admin Panel</SelectItem>
                      <SelectItem value="mobile_app">Mobile App</SelectItem>
                      <SelectItem value="public_dashboard">Public Dashboard</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                    </SelectContent>
                  </Select>

                  <div></div>

                  <Select value={filters.limit.toString()} onValueChange={(value) => handleFilterChange('limit', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    System Logs ({data?.pagination?.total || 0} total)
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    Showing {((data?.pagination?.page || 1) - 1) * (data?.pagination?.limit || 25) + 1} to{' '}
                    {Math.min((data?.pagination?.page || 1) * (data?.pagination?.limit || 25), data?.pagination?.total || 0)} of{' '}
                    {data?.pagination?.total || 0} entries
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Related</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.logs?.map((log) => (
                        <TableRow key={log.log_id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <div className="text-sm">
                                <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                                <div className="text-gray-500">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getLogLevelBadge(log.log_level)}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getAgentColor(log.agent)} border-0`}>
                              {log.agent.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{log.action}</span>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-md truncate" title={log.details}>
                              {log.details}
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.related_table && log.related_id && (
                              <div className="text-sm text-gray-500">
                                {log.related_table} #{log.related_id}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {data?.pagination && data.pagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={data.pagination.page === 1}
                        onClick={() => handleFilterChange('page', data.pagination.page - 1)}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-500">
                        Page {data.pagination.page} of {data.pagination.pages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={data.pagination.page === data.pagination.pages}
                        onClick={() => handleFilterChange('page', data.pagination.page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}