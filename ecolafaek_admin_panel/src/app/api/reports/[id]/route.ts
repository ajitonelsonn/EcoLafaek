import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyToken(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: reportId } = await params
    
    // Get detailed report information
    const reportQuery = `
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
        r.device_info,
        u.username,
        u.email,
        u.phone_number,
        u.registration_date,
        ar.analysis_id,
        ar.analyzed_date,
        ar.waste_type_id,
        ar.confidence_score,
        ar.estimated_volume,
        ar.severity_score,
        ar.priority_level,
        ar.analysis_notes,
        ar.full_description,
        wt.name as waste_type_name,
        wt.description as waste_type_description,
        wt.hazard_level,
        wt.recyclable,
        wt.icon_url
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.user_id
      LEFT JOIN analysis_results ar ON r.report_id = ar.report_id
      LEFT JOIN waste_types wt ON ar.waste_type_id = wt.waste_type_id
      WHERE r.report_id = ?
    `
    
    const reports = await executeQuery<any[]>(reportQuery, [reportId])
    
    if (reports.length === 0) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }
    
    const report = reports[0]
    
    // Get associated hotspots
    const hotspotsQuery = `
      SELECT 
        h.hotspot_id,
        h.name,
        h.center_latitude,
        h.center_longitude,
        h.radius_meters,
        h.total_reports,
        h.average_severity,
        h.status
      FROM hotspots h
      INNER JOIN hotspot_reports hr ON h.hotspot_id = hr.hotspot_id
      WHERE hr.report_id = ?
    `
    
    const hotspots = await executeQuery<any[]>(hotspotsQuery, [reportId])
    
    // Get related reports in the same area (within 1km)
    const nearbyReportsQuery = `
      SELECT 
        r.report_id,
        r.latitude,
        r.longitude,
        r.report_date,
        r.status,
        r.description,
        u.username,
        ar.waste_type_id,
        ar.severity_score,
        wt.name as waste_type_name,
        (
          6371 * acos(
            cos(radians(?)) * cos(radians(r.latitude)) *
            cos(radians(r.longitude) - radians(?)) + 
            sin(radians(?)) * sin(radians(r.latitude))
          )
        ) AS distance
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.user_id
      LEFT JOIN analysis_results ar ON r.report_id = ar.report_id
      LEFT JOIN waste_types wt ON ar.waste_type_id = wt.waste_type_id
      WHERE r.report_id != ?
      HAVING distance <= 1
      ORDER BY distance
      LIMIT 10
    `
    
    const nearbyReports = await executeQuery<any[]>(
      nearbyReportsQuery, 
      [report.latitude, report.longitude, report.latitude, reportId]
    )
    
    // Get system logs for this report
    const logsQuery = `
      SELECT 
        log_id,
        timestamp,
        agent,
        action,
        details,
        log_level
      FROM system_logs
      WHERE related_table = 'reports' AND related_id = ?
      ORDER BY timestamp DESC
      LIMIT 20
    `
    
    const logs = await executeQuery<any[]>(logsQuery, [reportId])
    
    return NextResponse.json({
      report,
      hotspots,
      nearby_reports: nearbyReports,
      activity_logs: logs
    })
  } catch (error) {
    console.error('Report details fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report details' },
      { status: 500 }
    )
  }
}