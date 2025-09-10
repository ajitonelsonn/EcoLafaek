import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const response = NextResponse.json({
    message: 'Logout successful',
  })
  
  // Clear the authentication cookie
  response.cookies.set('admin-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0, // Immediately expire the cookie
  })
  
  return response
}