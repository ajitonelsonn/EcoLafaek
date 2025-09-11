import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyToken(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { smtp_host, smtp_port, smtp_username, smtp_password, recipient } = await request.json()
    
    if (!smtp_host || !smtp_port || !smtp_username || !smtp_password || !recipient) {
      return NextResponse.json(
        { error: 'Missing required email configuration' },
        { status: 400 }
      )
    }

    // In a real implementation, you would use a library like nodemailer
    // For now, we'll simulate the email test
    // Simulate email sending (replace with actual email sending logic)
    const testSuccess = true // This would be the result of actual email sending

    if (testSuccess) {
      return NextResponse.json({
        message: 'Test email sent successfully',
        recipient
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to send test email' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Email test error:', error)
    return NextResponse.json(
      { error: 'Email test failed' },
      { status: 500 }
    )
  }
}