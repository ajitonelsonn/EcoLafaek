import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'

interface CountResult {
  count: number
}

interface AvgSeverityResult {
  avg_severity: number | null
}

interface WasteTypeCount {
  name: string
  count: number
}

interface RecentReport {
  report_id: number
  report_date: string
  status: string
  username: string | null
  waste_type_id: number | null
  waste_type_name: string | null
}

interface ReportStatusCount {
  status: string
  count: number
}

export async function GET() {
  try {
    // Get total users
    const totalUsersResult = await executeQuery<CountResult[]>(
      'SELECT COUNT(*) as count FROM users WHERE account_status = "active"'
    )
    const totalUsers = totalUsersResult[0]?.count || 0

    // Get total reports
    const totalReportsResult = await executeQuery<CountResult[]>(
      'SELECT COUNT(*) as count FROM reports'
    )
    const totalReports = totalReportsResult[0]?.count || 0

    // Get reports today
    const reportsToday = await executeQuery<CountResult[]>(
      'SELECT COUNT(*) as count FROM reports WHERE DATE(report_date) = CURDATE()'
    )
    const todayCount = reportsToday[0]?.count || 0

    // Get reports this week
    const reportsThisWeek = await executeQuery<CountResult[]>(
      'SELECT COUNT(*) as count FROM reports WHERE report_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    )
    const weekCount = reportsThisWeek[0]?.count || 0

    // Get reports this month
    const reportsThisMonth = await executeQuery<CountResult[]>(
      'SELECT COUNT(*) as count FROM reports WHERE report_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
    )
    const monthCount = reportsThisMonth[0]?.count || 0

    // Get active hotspots
    const activeHotspots = await executeQuery<CountResult[]>(
      'SELECT COUNT(*) as count FROM hotspots WHERE status = "active"'
    )
    const hotspotsCount = activeHotspots[0]?.count || 0

    // Get resolved reports
    const resolvedReports = await executeQuery<CountResult[]>(
      'SELECT COUNT(*) as count FROM reports WHERE status = "resolved"'
    )
    const resolvedCount = resolvedReports[0]?.count || 0

    // Get pending reports
    const pendingReports = await executeQuery<CountResult[]>(
      'SELECT COUNT(*) as count FROM reports WHERE status IN ("submitted", "analyzing", "analyzed")'
    )
    const pendingCount = pendingReports[0]?.count || 0

    // Get average severity
    const avgSeverity = await executeQuery<AvgSeverityResult[]>(
      'SELECT AVG(severity_score) as avg_severity FROM analysis_results WHERE severity_score IS NOT NULL'
    )
    const averageSeverity = avgSeverity[0]?.avg_severity || 0

    // Get top waste types
    const topWasteTypes = await executeQuery<WasteTypeCount[]>(
      `SELECT wt.name, COUNT(*) as count 
       FROM analysis_results ar 
       JOIN waste_types wt ON ar.waste_type_id = wt.waste_type_id 
       GROUP BY ar.waste_type_id, wt.name 
       ORDER BY count DESC 
       LIMIT 5`
    )

    // Get recent reports for timeline
    const recentReports = await executeQuery<RecentReport[]>(
      `SELECT r.report_id, r.report_date, r.status, u.username, ar.waste_type_id, wt.name as waste_type_name
       FROM reports r
       LEFT JOIN users u ON r.user_id = u.user_id
       LEFT JOIN analysis_results ar ON r.report_id = ar.report_id
       LEFT JOIN waste_types wt ON ar.waste_type_id = wt.waste_type_id
       ORDER BY r.report_date DESC
       LIMIT 10`
    )

    // Get reports by status
    const reportsByStatus = await executeQuery<ReportStatusCount[]>(
      `SELECT status, COUNT(*) as count
       FROM reports
       GROUP BY status`
    )

    return NextResponse.json({
      stats: {
        total_users: totalUsers,
        total_reports: totalReports,
        reports_today: todayCount,
        reports_this_week: weekCount,
        reports_this_month: monthCount,
        active_hotspots: hotspotsCount,
        resolved_reports: resolvedCount,
        pending_reports: pendingCount,
        average_severity: Math.round(averageSeverity * 10) / 10,
        top_waste_types: topWasteTypes,
      },
      recent_reports: recentReports,
      reports_by_status: reportsByStatus
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
}