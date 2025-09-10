import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyToken(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super_admin can view all admin users
    if (authResult.payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const query = `
      SELECT admin_id, username, email, role, created_at, last_login, active
      FROM admin_users 
      ORDER BY created_at DESC
    `
    
    const adminUsers = await executeQuery<any[]>(query, [])

    return NextResponse.json({
      adminUsers
    })
  } catch (error) {
    console.error('Admin users fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin users' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyToken(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super_admin can create admin users
    if (authResult.payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { username, email, password, role } = await request.json()
    
    if (!username || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Username, email, password, and role are required' },
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

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
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

    // Check if username or email already exists
    const existingQuery = `
      SELECT admin_id FROM admin_users 
      WHERE username = ? OR email = ?
    `
    const existingResult = await executeQuery<any[]>(existingQuery, [username, email])
    
    if (existingResult.length > 0) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create admin user
    const insertQuery = `
      INSERT INTO admin_users (username, email, password_hash, role, created_at, active)
      VALUES (?, ?, ?, ?, NOW(), TRUE)
    `
    
    const result = await executeQuery(insertQuery, [username, email, hashedPassword, role])

    // Log the creation
    try {
      await executeQuery(
        'INSERT INTO system_logs (agent, action, details, log_level, related_id, related_table) VALUES (?, ?, ?, ?, ?, ?)',
        [
          'admin_management', 
          'admin_user_created', 
          `New admin user created: ${username} (${email}) with role ${role}`, 
          'info', 
          (result as any).insertId,
          'admin_users'
        ]
      )
    } catch (logError) {
      console.error('Failed to log admin creation:', logError)
    }

    return NextResponse.json({
      message: 'Admin user created successfully',
      admin_id: (result as any).insertId
    })
  } catch (error) {
    console.error('Admin user creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create admin user' },
      { status: 500 }
    )
  }
}