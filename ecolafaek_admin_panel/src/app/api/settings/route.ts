import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

interface SystemSetting {
  setting_key: string
  setting_value: string
  data_type: string
}

interface NotificationTemplate {
  template_id: number
  name: string
  subject: string
  body: string
  type: string
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyToken(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get system settings
    const settingsQuery = `
      SELECT 
        setting_key,
        setting_value,
        data_type
      FROM system_settings
      ORDER BY setting_key
    `
    
    const settingsResult = await executeQuery<SystemSetting[]>(settingsQuery, [])
    
    // Convert to key-value object with proper types
    const settings: Record<string, unknown> = {}
    settingsResult.forEach(row => {
      let value: unknown = row.setting_value
      
      // Convert based on data type
      switch (row.data_type) {
        case 'boolean':
          value = value === 'true' || value === '1'
          break
        case 'number':
          value = parseInt(value as string)
          break
        case 'string':
        default:
          // Keep as string
          break
      }
      
      settings[row.setting_key] = value
    })
    
    // Set defaults for any missing settings
    const defaultSettings = {
      app_name: 'EcoLafaek',
      app_description: 'Environmental waste monitoring and management system',
      admin_email: 'admin@ecolafaek.com',
      max_reports_per_user: 50,
      auto_analyze_reports: true,
      maintenance_mode: false,
      allow_registration: true,
      require_email_verification: false,
      session_timeout_minutes: 60,
      max_file_size_mb: 10,
      supported_file_types: 'jpg,jpeg,png,gif,pdf,doc,docx',
      smtp_enabled: false,
      smtp_host: '',
      smtp_port: 587,
      smtp_username: '',
      smtp_password: '',
      notification_email_enabled: true,
      notification_sms_enabled: false,
      data_retention_days: 365,
      backup_frequency: 'daily',
      api_rate_limit: 100
    }
    
    // Merge defaults with existing settings
    const finalSettings = { ...defaultSettings, ...settings }
    
    // Get notification templates
    const templatesQuery = `
      SELECT 
        template_id,
        name,
        subject,
        body,
        type
      FROM notification_templates
      ORDER BY name
    `
    
    const templates = await executeQuery<NotificationTemplate[]>(templatesQuery, [])

    return NextResponse.json({
      settings: finalSettings,
      templates
    })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyToken(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await request.json()
    
    // Update or insert each setting
    for (const [key, value] of Object.entries(settings as Record<string, unknown>)) {
      let dataType = 'string'
      let settingValue = String(value)
      
      // Determine data type
      if (typeof value === 'boolean') {
        dataType = 'boolean'
        settingValue = value ? '1' : '0'
      } else if (typeof value === 'number') {
        dataType = 'number'
        settingValue = String(value)
      }
      
      // Use INSERT ... ON DUPLICATE KEY UPDATE for MySQL/TiDB
      const upsertQuery = `
        INSERT INTO system_settings (setting_key, setting_value, data_type, updated_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
          setting_value = VALUES(setting_value),
          data_type = VALUES(data_type),
          updated_at = NOW()
      `
      
      await executeQuery(upsertQuery, [key, settingValue, dataType])
    }
    
    // Log the settings update
    try {
      await executeQuery(
        'INSERT INTO system_logs (agent, action, details, log_level) VALUES (?, ?, ?, ?)',
        ['admin_panel', 'settings_update', `System settings updated by admin`, 'info']
      )
    } catch (logError) {
      console.error('Failed to log settings update:', logError)
    }

    return NextResponse.json({
      message: 'Settings updated successfully'
    })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}