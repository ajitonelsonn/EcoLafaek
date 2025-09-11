import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenFromString } from '@/lib/auth'
import { executeQuery } from '@/lib/db'

interface TokenPayload {
  admin_id: number
  username: string
  role: string
}

interface AdminUser {
  admin_id: number
  username: string
  email: string
  role: string
  created_at: string
  last_login: string | null
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin-token')?.value
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const decoded = await verifyTokenFromString(token) as TokenPayload | null
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }
    
    // Fetch fresh admin data
    const admins = await executeQuery<AdminUser[]>(
      'SELECT admin_id, username, email, role, created_at, last_login FROM admin_users WHERE admin_id = ?',
      [decoded.admin_id]
    )
    
    if (admins.length === 0) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      user: admins[0],
    })
  } catch (error) {
    console.error('Auth verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}