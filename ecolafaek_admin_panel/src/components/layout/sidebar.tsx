'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  MapPin, 
  BarChart3, 
  Settings, 
  LogOut,
  Leaf,
  Activity
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Hotspots', href: '/hotspots', icon: MapPin },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'System Logs', href: '/logs', icon: Activity },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 p-6 border-b border-gray-200">
        <div className="bg-green-600 p-2 rounded-lg">
          <Leaf className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">EcoLafaek</h1>
          <p className="text-xs text-gray-500">Admin Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-green-50 text-green-700 border-r-2 border-green-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className={cn(
                'h-5 w-5',
                isActive ? 'text-green-600' : 'text-gray-400'
              )} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="h-5 w-5 text-gray-400" />
          Logout
        </button>
      </div>
    </div>
  )
}