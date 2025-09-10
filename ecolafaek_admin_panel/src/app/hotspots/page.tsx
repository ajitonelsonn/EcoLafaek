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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Plus,
  MapPin,
  Calendar,
  AlertTriangle,
  Activity,
  TrendingUp,
  Loader2,
  Target
} from 'lucide-react'

interface Hotspot {
  hotspot_id: number
  name: string
  center_latitude: number
  center_longitude: number
  radius_meters: number
  total_reports: number
  average_severity: number
  status: string
  first_reported: string
  last_reported: string
  notes?: string
  active_reports: number
  latest_report_date?: string
}

interface HotspotsData {
  hotspots: Hotspot[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  statistics: {
    total_hotspots: number
    active_hotspots: number
    monitored_hotspots: number
    resolved_hotspots: number
    avg_reports_per_hotspot: number
    avg_severity_score: number
  }
}

export default function HotspotsPage() {
  const [data, setData] = useState<HotspotsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [updating, setUpdating] = useState(false)
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    status: '',
    radius_meters: 0
  })
  
  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    center_latitude: 0,
    center_longitude: 0,
    radius_meters: 500,
    description: ''
  })
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    page: 1,
    limit: 10
  })

  const fetchHotspots = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        search: filters.search,
        status: filters.status
      })
      
      const response = await fetch(`/api/hotspots?${params}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch hotspots:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHotspots()
  }, [filters])

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      ...(key !== 'page' ? { page: 1 } : {})
    }))
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: 'destructive' as const, color: 'text-red-600' },
      monitored: { variant: 'secondary' as const, color: 'text-yellow-600' },
      resolved: { variant: 'default' as const, color: 'text-green-600' },
      inactive: { variant: 'outline' as const, color: 'text-gray-600' }
    }
    
    const config = variants[status as keyof typeof variants] || variants.active
    
    return (
      <Badge variant={config.variant} className={`inline-flex items-center gap-1 ${config.color}`}>
        <Target className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  const handleEditHotspot = (hotspot: Hotspot) => {
    setSelectedHotspot(hotspot)
    setEditForm({
      name: hotspot.name,
      description: hotspot.notes || '',
      status: hotspot.status,
      radius_meters: hotspot.radius_meters
    })
    setShowEditDialog(true)
  }

  const handleUpdateHotspot = async () => {
    if (!selectedHotspot) return
    
    try {
      setUpdating(true)
      const response = await fetch('/api/hotspots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotspot_id: selectedHotspot.hotspot_id,
          ...editForm
        })
      })
      
      if (response.ok) {
        setShowEditDialog(false)
        fetchHotspots()
      }
    } catch (error) {
      console.error('Failed to update hotspot:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handleCreateHotspot = async () => {
    try {
      setUpdating(true)
      const response = await fetch('/api/hotspots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      })
      
      if (response.ok) {
        setShowCreateDialog(false)
        setCreateForm({
          name: '',
          center_latitude: 0,
          center_longitude: 0,
          radius_meters: 500,
          description: ''
        })
        fetchHotspots()
      }
    } catch (error) {
      console.error('Failed to create hotspot:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteHotspot = async (hotspotId: number) => {
    if (!confirm('Are you sure you want to delete this hotspot? This action cannot be undone.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/hotspots?hotspot_id=${hotspotId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        fetchHotspots()
      }
    } catch (error) {
      console.error('Failed to delete hotspot:', error)
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
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Hotspot Management</h1>
                  <p className="text-gray-600">
                    Monitor and manage environmental waste hotspots
                  </p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Hotspot
                </Button>
              </div>
            </div>

            {/* Statistics */}
            {data?.statistics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Hotspots</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.statistics.total_hotspots}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Hotspots</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{data.statistics.active_hotspots}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Reports</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Number(data.statistics.avg_reports_per_hotspot || 0).toFixed(1)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Severity</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Number(data.statistics.avg_severity_score || 0).toFixed(1)}/10
                    </div>
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search hotspots..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="monitored">Monitored</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>

                  <div></div>

                  <Select value={filters.limit.toString()} onValueChange={(value) => handleFilterChange('limit', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 per page</SelectItem>
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
                    Hotspots ({data?.pagination?.total || 0} total)
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    Showing {((data?.pagination?.page || 1) - 1) * (data?.pagination?.limit || 10) + 1} to{' '}
                    {Math.min((data?.pagination?.page || 1) * (data?.pagination?.limit || 10), data?.pagination?.total || 0)} of{' '}
                    {data?.pagination?.total || 0} entries
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Radius</TableHead>
                        <TableHead>Reports</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.hotspots?.map((hotspot) => (
                        <TableRow key={hotspot.hotspot_id}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="font-medium">{hotspot.name}</div>
                              {hotspot.notes && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {hotspot.notes}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">
                                {Number(hotspot.center_latitude).toFixed(4)}, {Number(hotspot.center_longitude).toFixed(4)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{hotspot.radius_meters}m</span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{hotspot.total_reports} total</div>
                              <div className="text-sm text-gray-500">{hotspot.active_reports} active</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {Number(hotspot.average_severity || 0).toFixed(1)}/10
                            </span>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(hotspot.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">
                                {new Date(hotspot.last_reported).toLocaleDateString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditHotspot(hotspot)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteHotspot(hotspot.hotspot_id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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

          {/* Create Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Hotspot</DialogTitle>
                <DialogDescription>
                  Create a new environmental waste hotspot for monitoring.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="create-name">Name</Label>
                  <Input
                    id="create-name"
                    placeholder="Hotspot name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="create-lat">Latitude</Label>
                    <Input
                      id="create-lat"
                      type="number"
                      step="0.000001"
                      placeholder="0.000000"
                      value={createForm.center_latitude}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, center_latitude: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="create-lng">Longitude</Label>
                    <Input
                      id="create-lng"
                      type="number"
                      step="0.000001"
                      placeholder="0.000000"
                      value={createForm.center_longitude}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, center_longitude: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="create-radius">Radius (meters)</Label>
                  <Input
                    id="create-radius"
                    type="number"
                    placeholder="500"
                    value={createForm.radius_meters}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, radius_meters: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="create-description">Description</Label>
                  <Textarea
                    id="create-description"
                    placeholder="Optional description..."
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateHotspot} disabled={updating}>
                  {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Hotspot
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Hotspot</DialogTitle>
                <DialogDescription>
                  Update hotspot information and status.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={editForm.status} onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="monitored">Monitored</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-radius">Radius (meters)</Label>
                  <Input
                    id="edit-radius"
                    type="number"
                    value={editForm.radius_meters}
                    onChange={(e) => setEditForm(prev => ({ ...prev, radius_meters: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateHotspot} disabled={updating}>
                  {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Update Hotspot
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}