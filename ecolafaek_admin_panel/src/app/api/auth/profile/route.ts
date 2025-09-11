import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

interface AdminProfile {
  admin_id: number
  username: string
  email: string
  role: string
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyToken(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { username, email } = await request.json()
    
    if (!username || !email) {
      return NextResponse.json(
        { error: 'Username and email are required' },
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

    // Check if username or email already exists (excluding current user)
    const existingQuery = `
      SELECT admin_id FROM admin_users 
      WHERE (username = ? OR email = ?) AND admin_id != ?
    `
    const existingResult = await executeQuery<Pick<AdminProfile, 'admin_id'>[]>(existingQuery, [username, email, authResult.payload.admin_id])
    
    if (existingResult.length > 0) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 400 }
      )
    }

    // Update profile
    const updateQuery = `
      UPDATE admin_users 
      SET username = ?, email = ?
      WHERE admin_id = ?
    `
    
    await executeQuery(updateQuery, [username, email, authResult.payload.admin_id])

    // Get updated user data
    const updatedUserQuery = `
      SELECT admin_id, username, email, role 
      FROM admin_users 
      WHERE admin_id = ?
    `
    const updatedUserResult = await executeQuery<AdminProfile[]>(updatedUserQuery, [authResult.payload.admin_id])
    const updatedUser = updatedUserResult[0]

    // Log the profile update
    try {
      await executeQuery(
        'INSERT INTO system_logs (agent, action, details, log_level, related_id, related_table) VALUES (?, ?, ?, ?, ?, ?)',
        [
          'admin_auth', 
          'profile_update', 
          `Admin profile updated: ${username} (${email})`, 
          'info', 
          authResult.payload.admin_id,
          'admin_users'
        ]
      )
    } catch (logError) {
      console.error('Failed to log profile update:', logError)
    }
    
    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}