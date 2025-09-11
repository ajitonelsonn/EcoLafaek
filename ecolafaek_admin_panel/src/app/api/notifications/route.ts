import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

interface AdminNotification {
  id: number
  title: string
  message: string
  type: string
  created_at: string
  is_read: boolean
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

    // Get notifications for admin users
    const notificationsQuery = `
      SELECT 
        notification_id as id,
        title,
        message,
        type,
        created_at,
        read_status as is_read
      FROM admin_notifications 
      WHERE admin_id = ? OR admin_id IS NULL
      ORDER BY created_at DESC
      LIMIT 50
    `
    
    const notifications = await executeQuery<AdminNotification[]>(notificationsQuery, [authResult.payload.admin_id])

    return NextResponse.json({
      notifications
    })
  } catch (error) {
    console.error('Notifications fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
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

    const { title, message, type, admin_id } = await request.json()
    
    if (!title || !message || !type) {
      return NextResponse.json(
        { error: 'Title, message, and type are required' },
        { status: 400 }
      )
    }
    
    // Create notification
    const insertQuery = `
      INSERT INTO admin_notifications (admin_id, title, message, type, read_status, created_at)
      VALUES (?, ?, ?, ?, 0, NOW())
    `
    
    const result = await executeQuery(insertQuery, [
      admin_id || null, // null means notification for all admins
      title,
      message,
      type
    ])
    
    return NextResponse.json({
      message: 'Notification created successfully',
      notification_id: (result as QueryResult).insertId
    })
  } catch (error) {
    console.error('Notification creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}