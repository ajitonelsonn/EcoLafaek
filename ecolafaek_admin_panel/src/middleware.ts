import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/logout') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }
  
  // Check for admin token
  const token = request.cookies.get('admin-token')?.value
  
  if (!token) {
    console.log('No token found, redirecting to login')
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  try {
    // Verify token using jose which works with Edge Runtime
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    
    if (!payload) {
      console.log('Invalid token, redirecting to login')
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('admin-token')
      return response
    }
    
    console.log('Token valid, proceeding to', pathname)
    return NextResponse.next()
  } catch (error) {
    console.log('Token verification error:', error)
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('admin-token')
    return response
  }
}

export const config = {
  matcher: ['/((?!api/auth/login|login|_next/static|_next/image|favicon.ico).*)'],
}