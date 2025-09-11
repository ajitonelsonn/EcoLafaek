import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

interface OverviewStats {
  total_users: number
  total_reports: number
  total_hotspots: number
  active_hotspots: number
  reports_today: number
  users_this_month: number
}

interface MonthlyCount {
  month: string
  count: number
}

interface ReportByStatus {
  status: string
  count: number
  percentage: number
}

interface ReportByWasteType {
  waste_type: string
  count: number
}

interface HotspotByStatus {
  status: string
  count: number
}

interface VectorAnalytics {
  total_embeddings: number
  avg_confidence: number
  with_image_embeddings: number
  with_location_embeddings: number
  avg_severity: number
  high_confidence_analyses: number
  low_confidence_analyses: number
}

interface SimilarityPattern {
  waste_type: string
  embedding_count: number
  avg_confidence: number
  high_confidence_count: number
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyToken(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '6months'
    
    // Calculate date range
    let dateFilter = ''
    
    switch (range) {
      case '3months':
        dateFilter = 'AND r.report_date >= DATE_SUB(NOW(), INTERVAL 3 MONTH)'
        break
      case '6months':
        dateFilter = 'AND r.report_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)'
        break
      case '12months':
        dateFilter = 'AND r.report_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)'
        break
      case 'all':
      default:
        dateFilter = ''
    }

    // Get overview statistics
    const overviewQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM reports) as total_reports,
        (SELECT COUNT(*) FROM hotspots) as total_hotspots,
        (SELECT COUNT(*) FROM hotspots WHERE status = 'active') as active_hotspots,
        (SELECT COUNT(*) FROM reports WHERE DATE(report_date) = CURDATE()) as reports_today,
        (SELECT COUNT(*) FROM users WHERE MONTH(registration_date) = MONTH(NOW()) AND YEAR(registration_date) = YEAR(NOW())) as users_this_month
    `
    
    const overviewResult = await executeQuery<OverviewStats[]>(overviewQuery, [])
    const overview = overviewResult[0] || {}

    // Get reports by month
    let monthsBack = 12
    if (range === '3months') monthsBack = 3
    else if (range === '6months') monthsBack = 6
    
    const reportsByMonthQuery = `
      SELECT 
        DATE_FORMAT(r.report_date, '%Y-%m') as month,
        COUNT(*) as count
      FROM reports r
      WHERE r.report_date >= DATE_SUB(NOW(), INTERVAL ${monthsBack} MONTH)
      GROUP BY DATE_FORMAT(r.report_date, '%Y-%m')
      ORDER BY month ASC
    `
    
    const reportsByMonth = await executeQuery<MonthlyCount[]>(reportsByMonthQuery, [])

    // Get reports by status
    const reportsByStatusQuery = `
      SELECT 
        r.status,
        COUNT(*) as count,
        (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM reports WHERE 1=1 ${dateFilter})) as percentage
      FROM reports r
      WHERE 1=1 ${dateFilter}
      GROUP BY r.status
      ORDER BY count DESC
    `
    
    const reportsByStatus = await executeQuery<ReportByStatus[]>(reportsByStatusQuery, [])

    // Get reports by waste type
    const reportsByWasteTypeQuery = `
      SELECT 
        wt.name as waste_type,
        COUNT(r.report_id) as count
      FROM waste_types wt
      LEFT JOIN analysis_results ar ON wt.waste_type_id = ar.waste_type_id
      LEFT JOIN reports r ON ar.report_id = r.report_id ${dateFilter}
      GROUP BY wt.waste_type_id, wt.name
      HAVING count > 0
      ORDER BY count DESC
      LIMIT 10
    `
    
    const reportsByWasteType = await executeQuery<ReportByWasteType[]>(reportsByWasteTypeQuery, [])

    // Get hotspots by status
    const hotspotsByStatusQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM hotspots
      GROUP BY status
      ORDER BY count DESC
    `
    
    const hotspotsByStatus = await executeQuery<HotspotByStatus[]>(hotspotsByStatusQuery, [])

    // Get user registration trend
    const userRegistrationQuery = `
      SELECT 
        DATE_FORMAT(u.registration_date, '%Y-%m') as month,
        COUNT(*) as count
      FROM users u
      WHERE u.registration_date >= DATE_SUB(NOW(), INTERVAL ${monthsBack} MONTH)
      GROUP BY DATE_FORMAT(u.registration_date, '%Y-%m')
      ORDER BY month ASC
    `
    
    const userRegistrationTrend = await executeQuery<MonthlyCount[]>(userRegistrationQuery, [])

    // 🏆 TiDB Vector Database Analytics Integration
    const vectorAnalyticsQuery = `
      SELECT 
        COUNT(*) as total_embeddings,
        AVG(confidence_score) as avg_confidence,
        COUNT(CASE WHEN image_embedding IS NOT NULL THEN 1 END) as with_image_embeddings,
        COUNT(CASE WHEN location_embedding IS NOT NULL THEN 1 END) as with_location_embeddings,
        AVG(severity_score) as avg_severity,
        COUNT(CASE WHEN confidence_score >= 90 THEN 1 END) as high_confidence_analyses,
        COUNT(CASE WHEN confidence_score < 70 THEN 1 END) as low_confidence_analyses
      FROM analysis_results
      WHERE analyzed_date >= DATE_SUB(NOW(), INTERVAL ${monthsBack} MONTH)
    `
    
    const vectorAnalytics = await executeQuery<VectorAnalytics[]>(vectorAnalyticsQuery, [])
    const vectorStats = vectorAnalytics[0] || {
      total_embeddings: 0,
      avg_confidence: 0,
      with_image_embeddings: 0,
      with_location_embeddings: 0,
      avg_severity: 0,
      high_confidence_analyses: 0,
      low_confidence_analyses: 0
    }

    // Vector similarity patterns - real TiDB embeddings analysis
    const similarityPatternsQuery = `
      SELECT 
        wt.name as waste_type,
        COUNT(ar.analysis_id) as embedding_count,
        AVG(ar.confidence_score) as avg_confidence,
        COUNT(CASE WHEN ar.confidence_score >= 90 THEN 1 END) as high_confidence_count
      FROM analysis_results ar
      JOIN waste_types wt ON ar.waste_type_id = wt.waste_type_id
      WHERE ar.image_embedding IS NOT NULL 
        AND ar.analyzed_date >= DATE_SUB(NOW(), INTERVAL ${monthsBack} MONTH)
      GROUP BY ar.waste_type_id, wt.name
      HAVING embedding_count > 0
      ORDER BY embedding_count DESC
      LIMIT 5
    `
    
    const similarityPatterns = await executeQuery<SimilarityPattern[]>(similarityPatternsQuery, [])

    return NextResponse.json({
      overview,
      reports_by_month: reportsByMonth,
      reports_by_status: reportsByStatus,
      reports_by_waste_type: reportsByWasteType,
      hotspots_by_status: hotspotsByStatus,
      user_registration_trend: userRegistrationTrend,
      // 🏆 TiDB Vector Database Analytics
      vector_analytics: {
        ...vectorStats,
        avg_confidence: Math.round(vectorStats.avg_confidence * 10) / 10,
        avg_severity: Math.round(vectorStats.avg_severity * 10) / 10,
        processing_accuracy: vectorStats.total_embeddings > 0 
          ? Math.round((vectorStats.high_confidence_analyses / vectorStats.total_embeddings) * 100) 
          : 0
      },
      similarity_patterns: similarityPatterns
    })
  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}