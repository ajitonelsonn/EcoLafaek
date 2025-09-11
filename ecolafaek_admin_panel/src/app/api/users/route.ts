import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

interface User {
  user_id: number
  username: string
  email: string | null
  phone_number: string | null
  registration_date: string
  last_login: string | null
  account_status: string
  verification_status: boolean
  total_reports: number
}

interface CountResult {
  total: number
}

interface ExistingUser {
  user_id: number
}

interface QueryResult {
  insertId: number
  affectedRows: number
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyToken(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const exportCsv = searchParams.get('export') === 'csv'
    
    const offset = (page - 1) * limit
    // Build query conditions
    const whereConditions = []
    const queryParams = []
    
    if (search) {
      whereConditions.push('(u.username LIKE ? OR u.email LIKE ?)')
      queryParams.push(`%${search}%`, `%${search}%`)
    }
    
    if (status !== 'all') {
      whereConditions.push('u.account_status = ?')
      queryParams.push(status)
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
    
    if (exportCsv) {
      // Export all matching users as CSV
      const exportQuery = `
        SELECT 
          u.user_id,
          u.username,
          u.email,
          u.phone_number,
          u.registration_date,
          u.last_login,
          u.account_status,
          u.verification_status,
          COUNT(r.report_id) as total_reports
        FROM users u
        LEFT JOIN reports r ON u.user_id = r.user_id
        ${whereClause}
        GROUP BY u.user_id, u.username, u.email, u.phone_number, u.registration_date, u.last_login, u.account_status, u.verification_status
        ORDER BY u.registration_date DESC
      `
      
      const users = await executeQuery<User[]>(exportQuery, queryParams)
      
      // Create CSV content
      const headers = ['User ID', 'Username', 'Email', 'Phone', 'Registration Date', 'Last Login', 'Status', 'Verified', 'Total Reports']
      const csvContent = [
        headers.join(','),
        ...users.map(user => [
          user.user_id,
          `"${user.username}"`,
          `"${user.email}"`,
          `"${user.phone_number || ''}"`,
          user.registration_date,
          user.last_login || '',
          user.account_status,
          user.verification_status ? 'Yes' : 'No',
          user.total_reports
        ].join(','))
      ].join('\n')
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="users_${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }
    
    // Get users with report counts
    const usersQuery = `
      SELECT 
        u.user_id,
        u.username,
        u.email,
        u.phone_number,
        u.registration_date,
        u.last_login,
        u.account_status,
        u.verification_status,
        COUNT(r.report_id) as total_reports
      FROM users u
      LEFT JOIN reports r ON u.user_id = r.user_id
      ${whereClause}
      GROUP BY u.user_id, u.username, u.email, u.phone_number, u.registration_date, u.last_login, u.account_status, u.verification_status
      ORDER BY u.registration_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    
    const users = await executeQuery<User[]>(usersQuery, queryParams)
    
    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT u.user_id) as total
      FROM users u
      ${whereClause}
    `
    
    const countResult = await executeQuery<CountResult[]>(countQuery, queryParams)
    const total = countResult[0]?.total || 0
    
    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Users fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyToken(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { user_id, account_status } = await request.json()
    
    if (!user_id || !account_status) {
      return NextResponse.json(
        { error: 'User ID and account status are required' },
        { status: 400 }
      )
    }
    
    if (!['active', 'inactive', 'suspended'].includes(account_status)) {
      return NextResponse.json(
        { error: 'Invalid account status' },
        { status: 400 }
      )
    }
    
    await executeQuery(
      'UPDATE users SET account_status = ? WHERE user_id = ?',
      [account_status, user_id]
    )
    
    // Log the action
    try {
      await executeQuery(
        'INSERT INTO system_logs (agent, action, details, log_level, related_id, related_table) VALUES (?, ?, ?, ?, ?, ?)',
        ['admin_panel', 'user_status_update', `User ${user_id} status changed to ${account_status}`, 'info', user_id, 'users']
      )
    } catch (logError) {
      console.error('Failed to log user status update:', logError)
    }
    
    return NextResponse.json({
      message: 'User status updated successfully'
    })
  } catch (error) {
    console.error('User update error:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
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

    const { username, email, phone_number, password } = await request.json()
    
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Please enter a valid email address' },
          { status: 400 }
        )
      }
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Check if username or email already exists
    let existingQuery = 'SELECT user_id FROM users WHERE username = ?'
    const queryParams = [username]
    
    if (email) {
      existingQuery += ' OR email = ?'
      queryParams.push(email)
    }
    
    const existingResult = await executeQuery<ExistingUser[]>(existingQuery, queryParams)
    
    if (existingResult.length > 0) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create user
    const insertQuery = `
      INSERT INTO users (username, email, phone_number, password_hash, registration_date, account_status, verification_status)
      VALUES (?, ?, ?, ?, NOW(), 'active', FALSE)
    `
    
    const result = await executeQuery(insertQuery, [
      username, 
      email || null, 
      phone_number || null, 
      hashedPassword
    ])

    // Log the creation
    try {
      await executeQuery(
        'INSERT INTO system_logs (agent, action, details, log_level, related_id, related_table) VALUES (?, ?, ?, ?, ?, ?)',
        [
          'user_management', 
          'user_created', 
          `New user created: ${username} (${email || 'no email'})`, 
          'info', 
          (result as QueryResult).insertId,
          'users'
        ]
      )
    } catch (logError) {
      console.error('Failed to log user creation:', logError)
    }

    return NextResponse.json({
      message: 'User created successfully',
      user_id: (result as QueryResult).insertId
    })
  } catch (error) {
    console.error('User creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}