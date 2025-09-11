import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

interface AdminCredentials {
  admin_id: number
  password_hash: string
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyToken(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { current_password, new_password } = await request.json()
    
    if (!current_password || !new_password) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Get current admin user
    const adminQuery = 'SELECT admin_id, password_hash FROM admin_users WHERE admin_id = ?'
    const adminResult = await executeQuery<AdminCredentials[]>(adminQuery, [authResult.payload.admin_id])
    
    if (adminResult.length === 0) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 })
    }

    const admin = adminResult[0]

    // Verify current password
    const passwordMatch = await bcrypt.compare(current_password, admin.password_hash)
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    // Hash new password
    const saltRounds = 12
    const hashedNewPassword = await bcrypt.hash(new_password, saltRounds)

    // Update password
    const updateQuery = `
      UPDATE admin_users 
      SET password_hash = ?
      WHERE admin_id = ?
    `
    
    await executeQuery(updateQuery, [hashedNewPassword, authResult.payload.admin_id])

    // Log the password change
    try {
      await executeQuery(
        'INSERT INTO system_logs (agent, action, details, log_level, related_id, related_table) VALUES (?, ?, ?, ?, ?, ?)',
        [
          'admin_auth', 
          'password_change', 
          `Admin ${authResult.payload.username} changed their password`, 
          'info', 
          authResult.payload.admin_id,
          'admin_users'
        ]
      )
    } catch (logError) {
      console.error('Failed to log password change:', logError)
    }
    
    return NextResponse.json({
      message: 'Password updated successfully'
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    )
  }
}