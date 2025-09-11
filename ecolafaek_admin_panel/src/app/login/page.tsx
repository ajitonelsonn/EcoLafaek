'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, User, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      if (response.ok) {
        // Force a full page reload to ensure the cookie is set and middleware works
        window.location.href = '/'
      } else {
        const data = await response.json()
        setError(data.error || 'Login failed')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding & Information */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full"></div>
          <div className="absolute top-40 right-20 w-20 h-20 bg-white rounded-full"></div>
          <div className="absolute bottom-20 left-20 w-24 h-24 bg-white rounded-full"></div>
          <div className="absolute bottom-40 right-10 w-16 h-16 bg-white rounded-full"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6">
              <Image
                src="/app_logo.png"
                alt="EcoLafaek Logo"
                width={48}
                height={48}
                className="rounded-lg"
              />
            </div>
            <h1 className="text-4xl font-bold mb-4">
              Welcome to<br />
              <span className="text-green-200">EcoLafaek Admin</span>
            </h1>
            <p className="text-green-100 text-lg leading-relaxed">
              Comprehensive environmental waste monitoring and management system for Timor-Leste
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-2 h-2 bg-green-300 rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold text-green-100">Monitor Waste Reports</h3>
                <p className="text-green-200 text-sm">Track and analyze environmental waste reports from citizens</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-2 h-2 bg-green-300 rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold text-green-100">Manage Hotspots</h3>
                <p className="text-green-200 text-sm">Identify and manage environmental problem areas</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-2 h-2 bg-green-300 rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold text-green-100">Analytics Dashboard</h3>
                <p className="text-green-200 text-sm">Real-time insights and environmental data analysis</p>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-green-500/30">
            <p className="text-green-200 text-sm">
              🐊 <em>Like the sacred crocodile, EcoLafaek guards our environment</em>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Image
                src="/app_logo.png"
                alt="EcoLafaek Logo"
                width={40}
                height={40}
                className="rounded-lg"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">EcoLafaek Admin</h1>
            <p className="text-gray-600 text-sm">Environmental Management System</p>
          </div>

          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold text-center text-gray-900">
                Admin Portal
              </CardTitle>
              <CardDescription className="text-center text-gray-600">
                Sign in to access your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-11 h-12 border-gray-300 focus:border-green-500 focus:ring-green-500"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 h-12 border-gray-300 focus:border-green-500 focus:ring-green-500"
                      required
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Signing in...
                    </div>
                  ) : (
                    'Sign In to Dashboard'
                  )}
                </Button>
              </form>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="text-center text-sm text-gray-600 space-y-1">
                  <p className="font-medium">🔒 Secure Admin Access</p>
                  <p className="text-xs">Contact system administrator for account access</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}