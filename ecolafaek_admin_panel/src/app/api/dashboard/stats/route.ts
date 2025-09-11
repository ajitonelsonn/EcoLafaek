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

interface VectorProcessingStats {
  with_embeddings: number
  with_location_embeddings: number
  total_analyses: number
}

interface LastMonthVectorStats {
  with_embeddings: number
  with_location_embeddings: number
  avg_confidence: number
}

export async function GET() {
  try {

    // Get total users
    const totalUsersResult = await executeQuery<CountResult[]>(
      'SELECT COUNT(*) as count FROM users WHERE account_status = "active"'
    )
    const totalUsers = totalUsersResult[0]?.count || 0

    // Get users from last month for comparison
    const lastMonthUsersResult = await executeQuery<CountResult[]>(
      `SELECT COUNT(*) as count FROM users 
       WHERE account_status = "active" 
       AND DATE(registration_date) < DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')`
    )
    const lastMonthUsers = lastMonthUsersResult[0]?.count || 0

    // Get total reports
    const totalReportsResult = await executeQuery<CountResult[]>(
      'SELECT COUNT(*) as count FROM reports'
    )
    const totalReports = totalReportsResult[0]?.count || 0

    // Get reports from last month for comparison
    const lastMonthReportsResult = await executeQuery<CountResult[]>(
      `SELECT COUNT(*) as count FROM reports 
       WHERE DATE(report_date) < DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')`
    )
    const lastMonthReports = lastMonthReportsResult[0]?.count || 0

    // Get reports today
    const reportsToday = await executeQuery<CountResult[]>(
      'SELECT COUNT(*) as count FROM reports WHERE DATE(report_date) = CURDATE()'
    )
    const todayCount = reportsToday[0]?.count || 0

    // Get reports yesterday for comparison
    const reportsYesterday = await executeQuery<CountResult[]>(
      'SELECT COUNT(*) as count FROM reports WHERE DATE(report_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)'
    )
    const yesterdayCount = reportsYesterday[0]?.count || 0

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

    // Get active hotspots from last month for comparison
    const lastMonthHotspots = await executeQuery<CountResult[]>(
      `SELECT COUNT(*) as count FROM hotspots 
       WHERE status = "active" 
       AND DATE(first_reported) < DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')`
    )
    const lastMonthHotspotsCount = lastMonthHotspots[0]?.count || 0

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

    // 🏆 TiDB Vector Database Integration - Get vector embeddings stats
    const vectorEmbeddingsCount = await executeQuery<CountResult[]>(
      'SELECT COUNT(*) as count FROM analysis_results WHERE image_embedding IS NOT NULL'
    )
    const totalEmbeddings = vectorEmbeddingsCount[0]?.count || 0

    // Get average confidence of AI analysis
    const avgConfidenceResult = await executeQuery<AvgSeverityResult[]>(
      'SELECT AVG(confidence_score) as avg_severity FROM analysis_results WHERE image_embedding IS NOT NULL'
    )
    const avgConfidence = avgConfidenceResult[0]?.avg_severity || 0

    // Get vector similarity processing stats
    const vectorProcessingStats = await executeQuery<VectorProcessingStats[]>(
      `SELECT 
        COUNT(CASE WHEN image_embedding IS NOT NULL THEN 1 END) as with_embeddings,
        COUNT(CASE WHEN location_embedding IS NOT NULL THEN 1 END) as with_location_embeddings,
        COUNT(*) as total_analyses
       FROM analysis_results`
    )
    const vectorStats = vectorProcessingStats[0] || { with_embeddings: 0, with_location_embeddings: 0, total_analyses: 0 }

    // Get last month vector stats for comparison
    const lastMonthVectorStats = await executeQuery<LastMonthVectorStats[]>(
      `SELECT 
        COUNT(CASE WHEN image_embedding IS NOT NULL THEN 1 END) as with_embeddings,
        COUNT(CASE WHEN location_embedding IS NOT NULL THEN 1 END) as with_location_embeddings,
        AVG(confidence_score) as avg_confidence
       FROM analysis_results 
       WHERE DATE(analyzed_date) < DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')`
    )
    const lastMonthVector = lastMonthVectorStats[0] || { with_embeddings: 0, with_location_embeddings: 0, avg_confidence: 0 }

    // Calculate growth percentages
    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const growthMetrics = {
      users_growth: calculateGrowth(totalUsers, lastMonthUsers),
      reports_growth: calculateGrowth(totalReports, lastMonthReports),
      hotspots_growth: calculateGrowth(hotspotsCount, lastMonthHotspotsCount),
      reports_today_growth: calculateGrowth(todayCount, yesterdayCount),
      embeddings_growth: calculateGrowth(vectorStats.with_embeddings, lastMonthVector.with_embeddings),
      location_embeddings_growth: calculateGrowth(vectorStats.with_location_embeddings, lastMonthVector.with_location_embeddings),
      confidence_growth: lastMonthVector.avg_confidence > 0 
        ? Math.round((avgConfidence - lastMonthVector.avg_confidence) * 10) / 10
        : 0
    };

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
        // 🏆 TiDB Vector Database Stats
        total_embeddings: totalEmbeddings,
        avg_ai_confidence: Math.round(avgConfidence * 10) / 10,
        vector_processing_rate: vectorStats.total_analyses > 0 ? Math.round((vectorStats.with_embeddings / vectorStats.total_analyses) * 100) : 0,
        location_embeddings_count: vectorStats.with_location_embeddings,
        // 🏆 Real Growth Metrics
        users_growth: growthMetrics.users_growth, // vs last month
        reports_growth: growthMetrics.reports_growth, // vs last month
        hotspots_growth: growthMetrics.hotspots_growth, // vs last month
        reports_today_growth: growthMetrics.reports_today_growth, // vs yesterday
        embeddings_growth: growthMetrics.embeddings_growth, // vs last month
        location_embeddings_growth: growthMetrics.location_embeddings_growth, // vs last month
        confidence_growth: growthMetrics.confidence_growth, // vs last month
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