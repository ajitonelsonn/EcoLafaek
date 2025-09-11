'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { 
  Settings as SettingsIcon,
  Save,
  Database,
  Mail,
  Shield,
  Bell,
  Globe,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface SystemSettings {
  app_name: string
  app_description: string
  admin_email: string
  max_reports_per_user: number
  auto_analyze_reports: boolean
  maintenance_mode: boolean
  allow_registration: boolean
  require_email_verification: boolean
  session_timeout_minutes: number
  max_file_size_mb: number
  supported_file_types: string
  smtp_enabled: boolean
  smtp_host: string
  smtp_port: number
  smtp_username: string
  smtp_password: string
  notification_email_enabled: boolean
  notification_sms_enabled: boolean
  data_retention_days: number
  backup_frequency: string
  api_rate_limit: number
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [activeTab, setActiveTab] = useState('general')

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return
    
    try {
      setSaving(true)
      setSaveStatus('idle')
      
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (response.ok) {
        setSaveStatus('success')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('error')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: keyof SystemSettings, value: unknown) => {
    if (!settings) return
    setSettings(prev => prev ? { ...prev, [key]: value } : null)
  }

  const testEmailSettings = async () => {
    try {
      const response = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp_host: settings?.smtp_host,
          smtp_port: settings?.smtp_port,
          smtp_username: settings?.smtp_username,
          smtp_password: settings?.smtp_password,
          recipient: settings?.admin_email
        })
      })
      
      if (response.ok) {
        alert('Test email sent successfully!')
      } else {
        alert('Failed to send test email')
      }
    } catch (error) {
      console.error('Email test failed:', error)
      alert('Email test failed')
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings & Configuration</h1>
                  <p className="text-gray-600">
                    Manage system settings, notifications, and application configuration
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {saveStatus === 'success' && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Settings saved!</span>
                    </div>
                  )}
                  {saveStatus === 'error' && (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Save failed</span>
                    </div>
                  )}
                  <Button
                    onClick={saveSettings}
                    disabled={saving}
                    className="flex items-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="general" className="flex items-center gap-2">
                  <SettingsIcon className="h-4 w-4" />
                  General
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="system" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  System
                </TabsTrigger>
              </TabsList>

              {/* General Settings */}
              <TabsContent value="general" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Application Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="app_name">Application Name</Label>
                        <Input
                          id="app_name"
                          value={settings?.app_name || ''}
                          onChange={(e) => updateSetting('app_name', e.target.value)}
                          placeholder="EcoLafaek"
                        />
                      </div>
                      <div>
                        <Label htmlFor="admin_email">Admin Email</Label>
                        <Input
                          id="admin_email"
                          type="email"
                          value={settings?.admin_email || ''}
                          onChange={(e) => updateSetting('admin_email', e.target.value)}
                          placeholder="admin@ecolafaek.com"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="app_description">Application Description</Label>
                      <Textarea
                        id="app_description"
                        value={settings?.app_description || ''}
                        onChange={(e) => updateSetting('app_description', e.target.value)}
                        placeholder="Environmental waste monitoring and management system"
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      User Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="max_reports">Max Reports Per User</Label>
                        <Input
                          id="max_reports"
                          type="number"
                          value={settings?.max_reports_per_user || 0}
                          onChange={(e) => updateSetting('max_reports_per_user', parseInt(e.target.value))}
                          min="1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="session_timeout">Session Timeout (minutes)</Label>
                        <Input
                          id="session_timeout"
                          type="number"
                          value={settings?.session_timeout_minutes || 0}
                          onChange={(e) => updateSetting('session_timeout_minutes', parseInt(e.target.value))}
                          min="5"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="allow_registration">Allow User Registration</Label>
                        <p className="text-sm text-gray-500">Allow new users to register accounts</p>
                      </div>
                      <Switch
                        id="allow_registration"
                        checked={settings?.allow_registration || false}
                        onCheckedChange={(checked) => updateSetting('allow_registration', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Settings */}
              <TabsContent value="security" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Security Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email_verification">Require Email Verification</Label>
                        <p className="text-sm text-gray-500">Users must verify their email before accessing the system</p>
                      </div>
                      <Switch
                        id="email_verification"
                        checked={settings?.require_email_verification || false}
                        onCheckedChange={(checked) => updateSetting('require_email_verification', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="maintenance_mode">Maintenance Mode</Label>
                        <p className="text-sm text-gray-500">Temporarily disable public access to the application</p>
                      </div>
                      <Switch
                        id="maintenance_mode"
                        checked={settings?.maintenance_mode || false}
                        onCheckedChange={(checked) => updateSetting('maintenance_mode', checked)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="api_rate_limit">API Rate Limit (requests per minute)</Label>
                      <Input
                        id="api_rate_limit"
                        type="number"
                        value={settings?.api_rate_limit || 0}
                        onChange={(e) => updateSetting('api_rate_limit', parseInt(e.target.value))}
                        min="10"
                        max="1000"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Email Settings */}
              <TabsContent value="email" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      SMTP Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Label htmlFor="smtp_enabled">Enable SMTP</Label>
                        <p className="text-sm text-gray-500">Enable email sending functionality</p>
                      </div>
                      <Switch
                        id="smtp_enabled"
                        checked={settings?.smtp_enabled || false}
                        onCheckedChange={(checked) => updateSetting('smtp_enabled', checked)}
                      />
                    </div>
                    
                    {settings?.smtp_enabled && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="smtp_host">SMTP Host</Label>
                            <Input
                              id="smtp_host"
                              value={settings?.smtp_host || ''}
                              onChange={(e) => updateSetting('smtp_host', e.target.value)}
                              placeholder="smtp.gmail.com"
                            />
                          </div>
                          <div>
                            <Label htmlFor="smtp_port">SMTP Port</Label>
                            <Input
                              id="smtp_port"
                              type="number"
                              value={settings?.smtp_port || 0}
                              onChange={(e) => updateSetting('smtp_port', parseInt(e.target.value))}
                              placeholder="587"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="smtp_username">SMTP Username</Label>
                            <Input
                              id="smtp_username"
                              value={settings?.smtp_username || ''}
                              onChange={(e) => updateSetting('smtp_username', e.target.value)}
                              placeholder="your-email@gmail.com"
                            />
                          </div>
                          <div>
                            <Label htmlFor="smtp_password">SMTP Password</Label>
                            <Input
                              id="smtp_password"
                              type="password"
                              value={settings?.smtp_password || ''}
                              onChange={(e) => updateSetting('smtp_password', e.target.value)}
                              placeholder="••••••••••••"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button onClick={testEmailSettings} variant="outline">
                            Test Email Configuration
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notification Settings */}
              <TabsContent value="notifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notification Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email_notifications">Email Notifications</Label>
                        <p className="text-sm text-gray-500">Send notifications via email</p>
                      </div>
                      <Switch
                        id="email_notifications"
                        checked={settings?.notification_email_enabled || false}
                        onCheckedChange={(checked) => updateSetting('notification_email_enabled', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="sms_notifications">SMS Notifications</Label>
                        <p className="text-sm text-gray-500">Send notifications via SMS</p>
                      </div>
                      <Switch
                        id="sms_notifications"
                        checked={settings?.notification_sms_enabled || false}
                        onCheckedChange={(checked) => updateSetting('notification_sms_enabled', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="auto_analyze">Auto-Analyze Reports</Label>
                        <p className="text-sm text-gray-500">Automatically analyze new reports</p>
                      </div>
                      <Switch
                        id="auto_analyze"
                        checked={settings?.auto_analyze_reports || false}
                        onCheckedChange={(checked) => updateSetting('auto_analyze_reports', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* System Settings */}
              <TabsContent value="system" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      System Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="max_file_size">Max File Size (MB)</Label>
                        <Input
                          id="max_file_size"
                          type="number"
                          value={settings?.max_file_size_mb || 0}
                          onChange={(e) => updateSetting('max_file_size_mb', parseInt(e.target.value))}
                          min="1"
                          max="100"
                        />
                      </div>
                      <div>
                        <Label htmlFor="data_retention">Data Retention (days)</Label>
                        <Input
                          id="data_retention"
                          type="number"
                          value={settings?.data_retention_days || 0}
                          onChange={(e) => updateSetting('data_retention_days', parseInt(e.target.value))}
                          min="30"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="file_types">Supported File Types</Label>
                      <Input
                        id="file_types"
                        value={settings?.supported_file_types || ''}
                        onChange={(e) => updateSetting('supported_file_types', e.target.value)}
                        placeholder="jpg,jpeg,png,pdf,doc,docx"
                      />
                      <p className="text-sm text-gray-500 mt-1">Comma-separated list of allowed file extensions</p>
                    </div>
                    <div>
                      <Label htmlFor="backup_frequency">Backup Frequency</Label>
                      <Select 
                        value={settings?.backup_frequency || 'daily'} 
                        onValueChange={(value) => updateSetting('backup_frequency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}