import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

interface SystemLog {
  log_id: number
  agent: string
  action: string
  details: string
  log_level: string
  timestamp: string
  related_id: number | null
  related_table: string | null
}

interface CountResult {
  total: number
}

interface LogStats {
  total_logs: number
  error_logs: number
  warning_logs: number
  info_logs: number
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    const search = searchParams.get('search') || ''
    const level = searchParams.get('level') || 'all'
    const agent = searchParams.get('agent') || 'all'
    const exportCsv = searchParams.get('export') === 'csv'
    
    const offset = (page - 1) * limit

    // Build query conditions
    const whereConditions = []
    const queryParams = []
    
    if (search) {
      whereConditions.push('(action LIKE ? OR details LIKE ?)')
      queryParams.push(`%${search}%`, `%${search}%`)
    }
    
    if (level !== 'all') {
      whereConditions.push('log_level = ?')
      queryParams.push(level)
    }
    
    if (agent !== 'all') {
      whereConditions.push('agent = ?')
      queryParams.push(agent)
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
    
    if (exportCsv) {
      // Export all matching records as CSV
      const exportQuery = `
        SELECT 
          log_id,
          agent,
          action,
          details,
          log_level,
          timestamp,
          related_id,
          related_table
        FROM system_logs
        ${whereClause}
        ORDER BY timestamp DESC
      `
      
      const logs = await executeQuery<SystemLog[]>(exportQuery, queryParams)
      
      // Create CSV content
      const headers = ['Log ID', 'Agent', 'Action', 'Details', 'Level', 'Timestamp', 'Related ID', 'Related Table']
      const csvContent = [
        headers.join(','),
        ...logs.map(log => [
          log.log_id,
          `"${log.agent}"`,
          `"${log.action}"`,
          `"${log.details.replace(/"/g, '""')}"`,
          log.log_level,
          log.timestamp,
          log.related_id || '',
          log.related_table || ''
        ].join(','))
      ].join('\n')
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="system_logs_${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }
    
    // Get logs with pagination
    const logsQuery = `
      SELECT 
        log_id,
        agent,
        action,
        details,
        log_level,
        timestamp,
        related_id,
        related_table
      FROM system_logs
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    
    const logs = await executeQuery<SystemLog[]>(logsQuery, queryParams)
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM system_logs
      ${whereClause}
    `
    
    const countResult = await executeQuery<CountResult[]>(countQuery, queryParams)
    const total = countResult[0]?.total || 0
    
    // Get statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_logs,
        SUM(CASE WHEN log_level = 'error' THEN 1 ELSE 0 END) as error_logs,
        SUM(CASE WHEN log_level = 'warning' THEN 1 ELSE 0 END) as warning_logs,
        SUM(CASE WHEN log_level = 'info' THEN 1 ELSE 0 END) as info_logs
      FROM system_logs
      ${whereClause}
    `
    
    const stats = await executeQuery<LogStats[]>(statsQuery, queryParams)

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      statistics: stats[0] || {}
    })
  } catch (error) {
    console.error('System logs fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system logs' },
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

    const { agent, action, details, log_level, related_id, related_table } = await request.json()
    
    if (!agent || !action || !details || !log_level) {
      return NextResponse.json(
        { error: 'Agent, action, details, and log_level are required' },
        { status: 400 }
      )
    }
    
    // Insert new log entry
    const insertQuery = `
      INSERT INTO system_logs (agent, action, details, log_level, related_id, related_table)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    
    const result = await executeQuery(insertQuery, [
      agent, action, details, log_level, related_id || null, related_table || null
    ])
    
    return NextResponse.json({
      message: 'Log entry created successfully',
      log_id: (result as QueryResult).insertId
    })
  } catch (error) {
    console.error('Log creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create log entry' },
      { status: 500 }
    )
  }
}