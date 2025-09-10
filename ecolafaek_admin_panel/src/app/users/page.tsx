'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Users as UsersIcon, UserCheck, UserX, Eye, MoreHorizontal, Download } from 'lucide-react'

interface User {
  user_id: number
  username: string
  email: string
  phone_number?: string
  registration_date: string
  last_login?: string
  account_status: 'active' | 'inactive' | 'suspended'
  verification_status: boolean
  total_reports: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: searchTerm,
        status: statusFilter
      })

      const response = await fetch(`/api/users?${params}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateUserStatus = async (userId: number, newStatus: string) => {
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          account_status: newStatus
        })
      })

      if (response.ok) {
        // Refresh the users list
        fetchUsers()
      } else {
        console.error('Failed to update user status')
      }
    } catch (error) {
      console.error('Error updating user status:', error)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [pagination.page, statusFilter])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }))
      fetchUsers()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'suspended':
        return 'bg-red-100 text-red-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <UserCheck className="h-4 w-4" />
      case 'suspended':
        return <UserX className="h-4 w-4" />
      default:
        return <UsersIcon className="h-4 w-4" />
    }
  }

  const exportUsers = async () => {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        status: statusFilter,
        export: 'csv'
      })
      
      const response = await fetch(`/api/users?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `users_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export users:', error)
    }
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
                  <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                  <p className="text-gray-600">Manage registered users and their accounts</p>
                </div>
                <Button
                  variant="outline"
                  onClick={exportUsers}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Filter Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search by username or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="w-full sm:w-48">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="h-5 w-5" />
                  Users ({pagination.total})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Reports</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                          <TableRow key={index}>
                            {Array.from({ length: 7 }).map((_, cellIndex) => (
                              <TableCell key={cellIndex}>
                                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2">
                              <UsersIcon className="h-8 w-8 text-gray-400" />
                              <p className="text-gray-500">No users found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user.user_id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="bg-green-100 p-2 rounded-full">
                                  <UsersIcon className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{user.username}</p>
                                  <p className="text-sm text-gray-500">ID: {user.user_id}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-gray-900">{user.email}</p>
                                {user.phone_number && (
                                  <p className="text-sm text-gray-500">{user.phone_number}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{user.total_reports}</span>
                                <span className="text-sm text-gray-500">reports</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.account_status)}`}>
                                  {getStatusIcon(user.account_status)}
                                  {user.account_status}
                                </span>
                                {user.verification_status && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    ✓
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-500">
                                {new Date(user.registration_date).toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-500">
                                {user.last_login 
                                  ? new Date(user.last_login).toLocaleDateString()
                                  : 'Never'
                                }
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Select
                                  value={user.account_status}
                                  onValueChange={(newStatus) => updateUserStatus(user.user_id, newStatus)}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                    <SelectItem value="suspended">Suspended</SelectItem>
                                  </SelectContent>
                                </Select>
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
          </div>
        </main>
      </div>
    </div>
  )
}