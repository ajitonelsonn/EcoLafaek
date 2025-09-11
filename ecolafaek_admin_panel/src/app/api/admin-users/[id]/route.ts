import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

interface AdminUser {
  admin_id: number
  role: string
  username?: string
  email?: string
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await verifyToken(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super_admin can edit admin users
    if (authResult.payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: adminId } = await params
    const { username, email, role } = await request.json()
    
    if (!username || !email || !role) {
      return NextResponse.json(
        { error: 'Username, email, and role are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['admin', 'moderator'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin or moderator' },
        { status: 400 }
      )
    }

    // Check if the user exists and is not super_admin
    const userQuery = `
      SELECT admin_id, role FROM admin_users 
      WHERE admin_id = ?
    `
    const userResult = await executeQuery<AdminUser[]>(userQuery, [adminId])
    
    if (userResult.length === 0) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      )
    }

    if (userResult[0].role === 'super_admin') {
      return NextResponse.json(
        { error: 'Cannot modify super admin user' },
        { status: 403 }
      )
    }

    // Check if username or email already exists (excluding current user)
    const existingQuery = `
      SELECT admin_id FROM admin_users 
      WHERE (username = ? OR email = ?) AND admin_id != ?
    `
    const existingResult = await executeQuery<Pick<AdminUser, 'admin_id'>[]>(existingQuery, [username, email, adminId])
    
    if (existingResult.length > 0) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 400 }
      )
    }

    // Update admin user
    const updateQuery = `
      UPDATE admin_users 
      SET username = ?, email = ?, role = ?
      WHERE admin_id = ?
    `
    
    await executeQuery(updateQuery, [username, email, role, adminId])

    // Log the update
    try {
      await executeQuery(
        'INSERT INTO system_logs (agent, action, details, log_level, related_id, related_table) VALUES (?, ?, ?, ?, ?, ?)',
        [
          'admin_management', 
          'admin_user_updated', 
          `Admin user updated: ${username} (${email}) role changed to ${role}`, 
          'info', 
          adminId,
          'admin_users'
        ]
      )
    } catch (logError) {
      console.error('Failed to log admin update:', logError)
    }

    return NextResponse.json({
      message: 'Admin user updated successfully'
    })
  } catch (error) {
    console.error('Admin user update error:', error)
    return NextResponse.json(
      { error: 'Failed to update admin user' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await verifyToken(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super_admin can delete admin users
    if (authResult.payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: adminId } = await params

    // Check if the user exists and is not super_admin
    const userQuery = `
      SELECT admin_id, role, username FROM admin_users 
      WHERE admin_id = ?
    `
    const userResult = await executeQuery<AdminUser[]>(userQuery, [adminId])
    
    if (userResult.length === 0) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      )
    }

    if (userResult[0].role === 'super_admin') {
      return NextResponse.json(
        { error: 'Cannot delete super admin user' },
        { status: 403 }
      )
    }

    // Cannot delete yourself
    if (parseInt(adminId) === authResult.payload.admin_id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 403 }
      )
    }

    // Delete admin user
    const deleteQuery = `
      DELETE FROM admin_users 
      WHERE admin_id = ?
    `
    
    await executeQuery(deleteQuery, [adminId])

    // Log the deletion
    try {
      await executeQuery(
        'INSERT INTO system_logs (agent, action, details, log_level, related_id, related_table) VALUES (?, ?, ?, ?, ?, ?)',
        [
          'admin_management', 
          'admin_user_deleted', 
          `Admin user deleted: ${userResult[0].username}`, 
          'warning', 
          adminId,
          'admin_users'
        ]
      )
    } catch (logError) {
      console.error('Failed to log admin deletion:', logError)
    }

    return NextResponse.json({
      message: 'Admin user deleted successfully'
    })
  } catch (error) {
    console.error('Admin user deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete admin user' },
      { status: 500 }
    )
  }
}