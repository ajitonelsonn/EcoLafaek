'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, 
  FileText, 
  Eye, 
  Edit, 
  Trash2, 
  MapPin, 
  Calendar, 
  User, 
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'

interface Report {
  report_id: number
  user_id: number
  username: string
  email: string
  latitude: number
  longitude: number
  report_date: string
  description?: string
  status: 'submitted' | 'analyzing' | 'analyzed' | 'resolved' | 'rejected'
  image_url?: string
  address_text?: string
  analysis_id?: number
  waste_type_name?: string
  severity_score?: number
  priority_level?: 'low' | 'medium' | 'high' | 'critical'
  confidence_score?: number
  estimated_volume?: number
  hazard_level?: string
}

interface WasteType {
  name: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export default function ReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [wasteTypeFilter, setWasteTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('report_date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })

  const fetchReports = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: searchTerm,
        status: statusFilter,
        waste_type: wasteTypeFilter,
        sort_by: sortBy,
        sort_order: sortOrder
      })

      const response = await fetch(`/api/reports?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReports(data.reports)
        setPagination(data.pagination)
        setWasteTypes(data.waste_types)
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateReportStatus = async (reportId: number, status: string, notes?: string) => {
    try {
      const response = await fetch('/api/reports', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report_id: reportId,
          status,
          notes
        })
      })

      if (response.ok) {
        fetchReports()
        setIsEditModalOpen(false)
        setSelectedReport(null)
        setAdminNotes('')
      } else {
        console.error('Failed to update report status')
      }
    } catch (error) {
      console.error('Error updating report status:', error)
    }
  }

  const deleteReport = async (reportId: number) => {
    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/reports?report_id=${reportId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchReports()
      } else {
        console.error('Failed to delete report')
      }
    } catch (error) {
      console.error('Error deleting report:', error)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [pagination.page, statusFilter, wasteTypeFilter, sortBy, sortOrder])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }))
      fetchReports()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

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

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null
    
    const variants = {
      low: { variant: 'outline' as const, color: 'text-green-600' },
      medium: { variant: 'secondary' as const, color: 'text-yellow-600' },
      high: { variant: 'destructive' as const, color: 'text-orange-600' },
      critical: { variant: 'destructive' as const, color: 'text-red-600' }
    }
    
    const config = variants[priority as keyof typeof variants] || variants.low
    
    return (
      <Badge variant={config.variant} className={config.color}>
        {priority}
      </Badge>
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
              <h1 className="text-2xl font-bold text-gray-900">Report Management</h1>
              <p className="text-gray-600">Manage waste reports and their analysis status</p>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Filter Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search reports, users, or locations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="analyzing">Analyzing</SelectItem>
                        <SelectItem value="analyzed">Analyzed</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Select value={wasteTypeFilter} onValueChange={setWasteTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by waste type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {wasteTypes.map((type) => (
                          <SelectItem key={type.name} value={type.name}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Select value={`${sortBy}_${sortOrder}`} onValueChange={(value) => {
                      const [field, order] = value.split('_')
                      setSortBy(field)
                      setSortOrder(order)
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="report_date_desc">Latest First</SelectItem>
                        <SelectItem value="report_date_asc">Oldest First</SelectItem>
                        <SelectItem value="severity_score_desc">High Severity</SelectItem>
                        <SelectItem value="severity_score_asc">Low Severity</SelectItem>
                        <SelectItem value="username_asc">User A-Z</SelectItem>
                        <SelectItem value="username_desc">User Z-A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reports Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Reports ({pagination.total})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Waste Type</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                          <TableRow key={index}>
                            {Array.from({ length: 8 }).map((_, cellIndex) => (
                              <TableCell key={cellIndex}>
                                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : reports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2">
                              <FileText className="h-8 w-8 text-gray-400" />
                              <p className="text-gray-500">No reports found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        reports.map((report) => (
                          <TableRow key={report.report_id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-full">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">#{report.report_id}</p>
                                  <p className="text-sm text-gray-500 max-w-xs truncate">
                                    {report.description || 'No description'}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="font-medium text-gray-900">{report.username}</p>
                                  <p className="text-sm text-gray-500">{report.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(report.status)}
                            </TableCell>
                            <TableCell>
                              {report.waste_type_name ? (
                                <div>
                                  <p className="font-medium text-gray-900">{report.waste_type_name}</p>
                                  {report.confidence_score && (
                                    <p className="text-sm text-gray-500">
                                      {Math.round(report.confidence_score)}% confidence
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {getPriorityBadge(report.priority_level)}
                                {report.severity_score && (
                                  <span className="text-sm text-gray-500">
                                    Score: {report.severity_score}/10
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="text-sm text-gray-900">
                                    {report.address_text || `${report.latitude}, ${report.longitude}`}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-500">
                                  {new Date(report.report_date).toLocaleDateString()}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => router.push(`/reports/${report.report_id}`)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedReport(report)
                                    setNewStatus(report.status)
                                    setIsEditModalOpen(true)
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => deleteReport(report.report_id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-gray-700">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} results
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page <= 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-700">
                        Page {pagination.page} of {pagination.pages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page >= pagination.pages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Edit Modal */}
            {isEditModalOpen && selectedReport && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <Card className="w-full max-w-md mx-4">
                  <CardHeader>
                    <CardTitle>Update Report Status</CardTitle>
                    <p className="text-sm text-gray-600">Report #{selectedReport.report_id}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="analyzing">Analyzing</SelectItem>
                          <SelectItem value="analyzed">Analyzed</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Admin Notes (Optional)
                      </label>
                      <Textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add any additional notes about this status change..."
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <Button 
                        onClick={() => updateReportStatus(selectedReport.report_id, newStatus, adminNotes)}
                        className="flex-1"
                      >
                        Update Status
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsEditModalOpen(false)
                          setSelectedReport(null)
                          setAdminNotes('')
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}