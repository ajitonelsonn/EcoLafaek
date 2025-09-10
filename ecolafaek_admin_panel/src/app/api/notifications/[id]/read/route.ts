import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await verifyToken(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: notificationId } = await params
    
    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      )
    }
    
    // Mark notification as read
    const updateQuery = `
      UPDATE admin_notifications 
      SET read_status = 1, updated_at = NOW()
      WHERE notification_id = ? AND (admin_id = ? OR admin_id IS NULL)
    `
    
    await executeQuery(updateQuery, [notificationId, authResult.payload.admin_id])
    
    return NextResponse.json({
      message: 'Notification marked as read'
    })
  } catch (error) {
    console.error('Mark notification read error:', error)
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    )
  }
}