import { NextRequest, NextResponse } from 'next/server'
import { authenticateAdmin, generateTokenSync } from '@/lib/auth'
import { executeQuery } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }
    
    const adminUser = await authenticateAdmin({ username, password })
    
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }
    
    const token = generateTokenSync(adminUser)
    
    // Log the login activity
    try {
      await executeQuery(
        'INSERT INTO system_logs (agent, action, details, log_level, related_id) VALUES (?, ?, ?, ?, ?)',
        ['admin_auth', 'login', `Admin ${username} logged in successfully`, 'info', adminUser.admin_id]
      )
    } catch (logError) {
      console.error('Failed to log admin login:', logError)
    }
    
    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        admin_id: adminUser.admin_id,
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role,
      },
    })
    
    // Set HTTP-only cookie for authentication
    response.cookies.set('admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
    })
    
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}