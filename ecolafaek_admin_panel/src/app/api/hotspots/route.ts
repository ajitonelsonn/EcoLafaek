import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyToken(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const exportCsv = searchParams.get('export') === 'csv'
    
    const offset = (page - 1) * limit

    // Build query conditions
    let whereConditions = []
    let queryParams = []
    
    if (search) {
      whereConditions.push('(h.name LIKE ? OR h.description LIKE ?)')
      queryParams.push(`%${search}%`, `%${search}%`)
    }
    
    if (status !== 'all') {
      whereConditions.push('h.status = ?')
      queryParams.push(status)
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
    
    if (exportCsv) {
      // Export all matching hotspots as CSV
      const exportQuery = `
        SELECT 
          h.hotspot_id,
          h.name,
          h.center_latitude,
          h.center_longitude,
          h.radius_meters,
          h.total_reports,
          h.average_severity,
          h.status,
          h.first_reported,
          h.last_reported,
          h.notes,
          COUNT(hr.report_id) as active_reports
        FROM hotspots h
        LEFT JOIN hotspot_reports hr ON h.hotspot_id = hr.hotspot_id
        LEFT JOIN reports r ON hr.report_id = r.report_id AND r.status IN ('submitted', 'analyzing', 'analyzed')
        ${whereClause}
        GROUP BY h.hotspot_id, h.name, h.center_latitude, h.center_longitude, h.radius_meters, h.total_reports, h.average_severity, h.status, h.first_reported, h.last_reported, h.notes
        ORDER BY h.last_reported DESC
      `
      
      const hotspots = await executeQuery<any[]>(exportQuery, queryParams)
      
      // Create CSV content
      const headers = ['Hotspot ID', 'Name', 'Latitude', 'Longitude', 'Radius (m)', 'Total Reports', 'Avg Severity', 'Status', 'First Reported', 'Last Reported', 'Notes', 'Active Reports']
      const csvContent = [
        headers.join(','),
        ...hotspots.map(hotspot => [
          hotspot.hotspot_id,
          `"${hotspot.name}"`,
          hotspot.center_latitude,
          hotspot.center_longitude,
          hotspot.radius_meters,
          hotspot.total_reports,
          Number(hotspot.average_severity || 0).toFixed(1),
          hotspot.status,
          hotspot.first_reported,
          hotspot.last_reported,
          `"${(hotspot.notes || '').replace(/"/g, '""')}"`,
          hotspot.active_reports
        ].join(','))
      ].join('\n')
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="hotspots_${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }
    
    // Get hotspots with report counts and latest activity
    const hotspotsQuery = `
      SELECT 
        h.hotspot_id,
        h.name,
        h.center_latitude,
        h.center_longitude,
        h.radius_meters,
        h.total_reports,
        h.average_severity,
        h.status,
        h.first_reported,
        h.last_reported,
        h.notes,
        COUNT(hr.report_id) as active_reports,
        MAX(r.report_date) as latest_report_date
      FROM hotspots h
      LEFT JOIN hotspot_reports hr ON h.hotspot_id = hr.hotspot_id
      LEFT JOIN reports r ON hr.report_id = r.report_id AND r.status IN ('submitted', 'analyzing', 'analyzed')
      ${whereClause}
      GROUP BY h.hotspot_id, h.name, h.center_latitude, h.center_longitude, h.radius_meters, h.total_reports, h.average_severity, h.status, h.first_reported, h.last_reported, h.notes
      ORDER BY h.last_reported DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    
    const hotspots = await executeQuery<any[]>(hotspotsQuery, queryParams)
    
    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT h.hotspot_id) as total
      FROM hotspots h
      ${whereClause}
    `
    
    const countResult = await executeQuery<any[]>(countQuery, queryParams)
    const total = countResult[0]?.total || 0
    
    // Get statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_hotspots,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_hotspots,
        SUM(CASE WHEN status = 'monitored' THEN 1 ELSE 0 END) as monitored_hotspots,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_hotspots,
        AVG(total_reports) as avg_reports_per_hotspot,
        AVG(average_severity) as avg_severity_score
      FROM hotspots
    `
    
    const stats = await executeQuery<any[]>(statsQuery, [])

    return NextResponse.json({
      hotspots,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      statistics: stats[0] || {}
    })
  } catch (error) {
    console.error('Hotspots fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hotspots' },
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

    const { name, center_latitude, center_longitude, radius_meters, description } = await request.json()
    
    if (!name || !center_latitude || !center_longitude || !radius_meters) {
      return NextResponse.json(
        { error: 'Name, coordinates, and radius are required' },
        { status: 400 }
      )
    }
    
    // Create new hotspot
    const insertQuery = `
      INSERT INTO hotspots (name, center_latitude, center_longitude, radius_meters, notes, status, total_reports, average_severity, first_reported, last_reported)
      VALUES (?, ?, ?, ?, ?, 'active', 0, 0, NOW(), NOW())
    `
    
    const result = await executeQuery(insertQuery, [
      name, center_latitude, center_longitude, radius_meters, description || null
    ])
    
    // Log the action
    try {
      await executeQuery(
        'INSERT INTO system_logs (agent, action, details, log_level, related_id, related_table) VALUES (?, ?, ?, ?, ?, ?)',
        ['admin_panel', 'hotspot_create', `New hotspot created: ${name}`, 'info', (result as any).insertId, 'hotspots']
      )
    } catch (logError) {
      console.error('Failed to log hotspot creation:', logError)
    }
    
    return NextResponse.json({
      message: 'Hotspot created successfully',
      hotspot_id: (result as any).insertId
    })
  } catch (error) {
    console.error('Hotspot creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create hotspot' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyToken(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { hotspot_id, name, description, status, radius_meters } = await request.json()
    
    if (!hotspot_id) {
      return NextResponse.json(
        { error: 'Hotspot ID is required' },
        { status: 400 }
      )
    }
    
    if (status && !['active', 'monitored', 'resolved', 'inactive'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }
    
    // Build update query dynamically
    let updateFields = []
    let updateParams = []
    
    if (name !== undefined) {
      updateFields.push('name = ?')
      updateParams.push(name)
    }
    
    if (description !== undefined) {
      updateFields.push('description = ?')
      updateParams.push(description)
    }
    
    if (status !== undefined) {
      updateFields.push('status = ?')
      updateParams.push(status)
    }
    
    if (radius_meters !== undefined) {
      updateFields.push('radius_meters = ?')
      updateParams.push(radius_meters)
    }
    
    updateFields.push('last_reported = NOW()')
    updateParams.push(hotspot_id)
    
    const updateQuery = `
      UPDATE hotspots 
      SET ${updateFields.join(', ')}
      WHERE hotspot_id = ?
    `
    
    await executeQuery(updateQuery, updateParams)
    
    // Log the action
    try {
      await executeQuery(
        'INSERT INTO system_logs (agent, action, details, log_level, related_id, related_table) VALUES (?, ?, ?, ?, ?, ?)',
        ['admin_panel', 'hotspot_update', `Hotspot ${hotspot_id} updated`, 'info', hotspot_id, 'hotspots']
      )
    } catch (logError) {
      console.error('Failed to log hotspot update:', logError)
    }
    
    return NextResponse.json({
      message: 'Hotspot updated successfully'
    })
  } catch (error) {
    console.error('Hotspot update error:', error)
    return NextResponse.json(
      { error: 'Failed to update hotspot' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyToken(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const hotspotId = searchParams.get('hotspot_id')
    
    if (!hotspotId) {
      return NextResponse.json(
        { error: 'Hotspot ID is required' },
        { status: 400 }
      )
    }
    
    // Delete associated hotspot_reports first
    await executeQuery('DELETE FROM hotspot_reports WHERE hotspot_id = ?', [hotspotId])
    
    // Delete the hotspot
    await executeQuery('DELETE FROM hotspots WHERE hotspot_id = ?', [hotspotId])
    
    // Log the action
    try {
      await executeQuery(
        'INSERT INTO system_logs (agent, action, details, log_level, related_id, related_table) VALUES (?, ?, ?, ?, ?, ?)',
        ['admin_panel', 'hotspot_delete', `Hotspot ${hotspotId} deleted`, 'warning', hotspotId, 'hotspots']
      )
    } catch (logError) {
      console.error('Failed to log hotspot deletion:', logError)
    }
    
    return NextResponse.json({
      message: 'Hotspot deleted successfully'
    })
  } catch (error) {
    console.error('Hotspot deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete hotspot' },
      { status: 500 }
    )
  }
}