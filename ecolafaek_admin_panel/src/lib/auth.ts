import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { SignJWT, jwtVerify } from 'jose'
import { executeQuery } from './db'

export interface AdminUser {
  admin_id: number
  username: string
  email: string
  role: 'super_admin' | 'admin' | 'moderator'
  created_at: string
  last_login?: string
}

export interface AdminUserWithPassword extends AdminUser {
  password_hash: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function generateToken(adminUser: AdminUser): Promise<string> {
  const payload = {
    admin_id: adminUser.admin_id,
    username: adminUser.username,
    email: adminUser.email,
    role: adminUser.role,
  }
  
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
  
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)
}

export async function verifyToken(request: { cookies?: { get: (name: string) => { value?: string } | undefined } }) {
  try {
    const token = request.cookies?.get('admin-token')?.value
    
    if (!token) {
      return { valid: false, payload: null }
    }
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    return { valid: true, payload }
  } catch {
    console.error('Token verification error')
    return { valid: false, payload: null }
  }
}

export async function verifyTokenFromString(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch {
    return null
  }
}

// Keep the old JWT function for server-side only operations (like login API)
export function generateTokenSync(adminUser: AdminUser): string {
  const payload = {
    admin_id: adminUser.admin_id,
    username: adminUser.username,
    email: adminUser.email,
    role: adminUser.role,
  }
  
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '24h' })
}

export async function authenticateAdmin(credentials: LoginCredentials): Promise<AdminUser | null> {
  try {
    const admins = await executeQuery<AdminUserWithPassword[]>(
      'SELECT * FROM admin_users WHERE username = ?',
      [credentials.username]
    )
    
    if (admins.length === 0) {
      return null
    }
    
    const admin = admins[0]
    const isPasswordValid = await verifyPassword(credentials.password, admin.password_hash)
    
    if (!isPasswordValid) {
      return null
    }
    
    // Update last login
    await executeQuery(
      'UPDATE admin_users SET last_login = NOW() WHERE admin_id = ?',
      [admin.admin_id]
    )
    
    return {
      admin_id: admin.admin_id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      created_at: admin.created_at,
      last_login: admin.last_login,
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}