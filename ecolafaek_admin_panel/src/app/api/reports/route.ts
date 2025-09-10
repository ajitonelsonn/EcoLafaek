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
    const status = searchParams.get('status') || 'all'
    const wasteType = searchParams.get('waste_type') || 'all'
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sort_by') || 'report_date'
    const sortOrder = searchParams.get('sort_order') || 'desc'
    const exportCsv = searchParams.get('export') === 'csv'
    
    const offset = (page - 1) * limit
    // Build query conditions
    let whereConditions = []
    let queryParams = []
    
    if (search) {
      whereConditions.push('(r.description LIKE ? OR u.username LIKE ? OR r.address_text LIKE ?)')
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    
    if (status !== 'all') {
      whereConditions.push('r.status = ?')
      queryParams.push(status)
    }
    
    if (wasteType !== 'all') {
      whereConditions.push('wt.name = ?')
      queryParams.push(wasteType)
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
    
    if (exportCsv) {
      // Export all matching reports as CSV
      const exportQuery = `
        SELECT 
          r.report_id,
          r.latitude,
          r.longitude,
          r.report_date,
          r.description,
          r.status,
          r.address_text,
          u.username,
          u.email,
          wt.name as waste_type_name,
          ar.confidence_score,
          ar.estimated_volume,
          ar.severity_score
        FROM reports r
        LEFT JOIN users u ON r.user_id = u.user_id
        LEFT JOIN analysis_results ar ON r.report_id = ar.report_id
        LEFT JOIN waste_types wt ON ar.waste_type_id = wt.waste_type_id
        ${whereClause}
        ORDER BY r.report_date DESC
      `
      
      const reports = await executeQuery<any[]>(exportQuery, queryParams)
      
      // Create CSV content
      const headers = ['Report ID', 'Latitude', 'Longitude', 'Date', 'Description', 'Status', 'Address', 'Username', 'Email', 'Waste Type', 'Confidence', 'Volume', 'Severity']
      const csvContent = [
        headers.join(','),
        ...reports.map(report => [
          report.report_id,
          report.latitude,
          report.longitude,
          report.report_date,
          `"${(report.description || '').replace(/"/g, '""')}"`,
          report.status,
          `"${(report.address_text || '').replace(/"/g, '""')}"`,
          `"${report.username || ''}"`,
          `"${report.email || ''}"`,
          `"${report.waste_type_name || ''}"`,
          report.confidence_score || '',
          report.estimated_volume || '',
          report.severity_score || ''
        ].join(','))
      ].join('\n')
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="reports_${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }
    
    // Get reports with related data
    const reportsQuery = `
      SELECT 
        r.report_id,
        r.user_id,
        r.latitude,
        r.longitude,
        r.report_date,
        r.description,
        r.status,
        r.image_url,
        r.address_text,
        u.username,
        u.email,
        ar.analysis_id,
        ar.waste_type_id,
        ar.confidence_score,
        ar.estimated_volume,
        ar.severity_score,
        ar.priority_level,
        ar.analysis_notes,
        ar.full_description,
        ar.analyzed_date,
        wt.name as waste_type_name,
        wt.hazard_level,
        wt.recyclable
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.user_id
      LEFT JOIN analysis_results ar ON r.report_id = ar.report_id
      LEFT JOIN waste_types wt ON ar.waste_type_id = wt.waste_type_id
      ${whereClause}
      ORDER BY r.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT ${limit} OFFSET ${offset}
    `
    
    const reports = await executeQuery<any[]>(reportsQuery, queryParams)
    
    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT r.report_id) as total
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.user_id
      LEFT JOIN analysis_results ar ON r.report_id = ar.report_id
      LEFT JOIN waste_types wt ON ar.waste_type_id = wt.waste_type_id
      ${whereClause}
    `
    
    const countResult = await executeQuery<any[]>(countQuery, queryParams)
    const total = countResult[0]?.total || 0
    
    // Get waste types for filter
    const wasteTypes = await executeQuery<any[]>('SELECT DISTINCT name FROM waste_types ORDER BY name')
    
    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      waste_types: wasteTypes
    })
  } catch (error) {
    console.error('Reports fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
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
    const { report_id, status, notes } = await request.json()
    
    if (!report_id || !status) {
      return NextResponse.json(
        { error: 'Report ID and status are required' },
        { status: 400 }
      )
    }
    
    if (!['submitted', 'analyzing', 'analyzed', 'resolved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }
    
    // Update report status
    await executeQuery(
      'UPDATE reports SET status = ? WHERE report_id = ?',
      [status, report_id]
    )
    
    // Add admin notes if provided
    if (notes) {
      await executeQuery(
        `UPDATE analysis_results 
         SET analysis_notes = CONCAT(IFNULL(analysis_notes, ''), '\n[Admin Note]: ', ?) 
         WHERE report_id = ?`,
        [notes, report_id]
      )
    }
    
    // Log the action
    try {
      await executeQuery(
        'INSERT INTO system_logs (agent, action, details, log_level, related_id, related_table) VALUES (?, ?, ?, ?, ?, ?)',
        [
          'admin_panel', 
          'report_status_update', 
          `Report ${report_id} status changed to ${status}${notes ? ' with admin notes' : ''}`, 
          'info', 
          report_id, 
          'reports'
        ]
      )
    } catch (logError) {
      console.error('Failed to log report update:', logError)
    }
    
    return NextResponse.json({
      message: 'Report updated successfully'
    })
  } catch (error) {
    console.error('Report update error:', error)
    return NextResponse.json(
      { error: 'Failed to update report' },
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
    const reportId = searchParams.get('report_id')
    
    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      )
    }
    
    // Delete analysis results first (foreign key constraint)
    await executeQuery('DELETE FROM analysis_results WHERE report_id = ?', [reportId])
    
    // Delete hotspot associations
    await executeQuery('DELETE FROM hotspot_reports WHERE report_id = ?', [reportId])
    
    // Delete the report
    await executeQuery('DELETE FROM reports WHERE report_id = ?', [reportId])
    
    // Log the action
    try {
      await executeQuery(
        'INSERT INTO system_logs (agent, action, details, log_level, related_id, related_table) VALUES (?, ?, ?, ?, ?, ?)',
        ['admin_panel', 'report_delete', `Report ${reportId} deleted by admin`, 'warning', reportId, 'reports']
      )
    } catch (logError) {
      console.error('Failed to log report deletion:', logError)
    }
    
    return NextResponse.json({
      message: 'Report deleted successfully'
    })
  } catch (error) {
    console.error('Report deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete report' },
      { status: 500 }
    )
  }
}