import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

interface WasteTypeEmbedding {
  waste_type: string
  embedding_count: number
  avg_confidence: number
  high_confidence_count: number
}

interface SeverityDistribution {
  severity_range: string
  count: number
  avg_confidence: number
}

interface VectorStatsResult {
  total_embeddings: number
  avg_confidence: number
  high_accuracy_count: number
  complete_embeddings: number
}

interface ProcessingTrend {
  month: string
  embedding_count: number
  avg_confidence: number
}

interface MonthlyComparison {
  current_month_embeddings: number
  last_month_embeddings: number
  current_month_confidence: number
  last_month_confidence: number
}

export async function GET(request: NextRequest) {
  try {
    // 🏆 TiDB Vector Database - Advanced Analytics Endpoint
    const authResult = await verifyToken(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Core vector embeddings statistics
    const vectorStatsQuery = `
      SELECT 
        COUNT(*) as total_embeddings,
        AVG(confidence_score) as avg_confidence,
        COUNT(CASE WHEN confidence_score >= 85 THEN 1 END) as high_accuracy_count,
        COUNT(CASE WHEN image_embedding IS NOT NULL AND location_embedding IS NOT NULL THEN 1 END) as complete_embeddings
      FROM analysis_results 
      WHERE image_embedding IS NOT NULL
    `
    
    const vectorStatsResult = await executeQuery<VectorStatsResult[]>(vectorStatsQuery, [])
    const vectorStats = vectorStatsResult[0] || {
      total_embeddings: 0,
      avg_confidence: 0,
      high_accuracy_count: 0,
      complete_embeddings: 0
    }

    // Vector embeddings by waste type (demonstrates TiDB's ability to handle complex joins with vector data)
    const wasteTypeEmbeddingsQuery = `
      SELECT 
        wt.name as waste_type,
        COUNT(ar.analysis_id) as embedding_count,
        AVG(ar.confidence_score) as avg_confidence,
        COUNT(CASE WHEN ar.confidence_score >= 90 THEN 1 END) as high_confidence_count
      FROM analysis_results ar
      JOIN waste_types wt ON ar.waste_type_id = wt.waste_type_id
      WHERE ar.image_embedding IS NOT NULL
      GROUP BY ar.waste_type_id, wt.name
      ORDER BY embedding_count DESC
    `
    
    const wasteTypeEmbeddings = await executeQuery<WasteTypeEmbedding[]>(wasteTypeEmbeddingsQuery, [])

    // Severity distribution with vector embeddings
    const severityDistributionQuery = `
      SELECT 
        CASE 
          WHEN severity_score BETWEEN 1 AND 3 THEN 'Low (1-3)'
          WHEN severity_score BETWEEN 4 AND 6 THEN 'Medium (4-6)'
          WHEN severity_score BETWEEN 7 AND 10 THEN 'High (7-10)'
          ELSE 'Unknown'
        END as severity_range,
        COUNT(*) as count,
        AVG(confidence_score) as avg_confidence
      FROM analysis_results
      WHERE image_embedding IS NOT NULL AND severity_score IS NOT NULL
      GROUP BY 
        CASE 
          WHEN severity_score BETWEEN 1 AND 3 THEN 'Low (1-3)'
          WHEN severity_score BETWEEN 4 AND 6 THEN 'Medium (4-6)'
          WHEN severity_score BETWEEN 7 AND 10 THEN 'High (7-10)'
          ELSE 'Unknown'
        END
      ORDER BY 
        CASE severity_range
          WHEN 'Low (1-3)' THEN 1
          WHEN 'Medium (4-6)' THEN 2
          WHEN 'High (7-10)' THEN 3
          ELSE 4
        END
    `
    
    const severityDistribution = await executeQuery<SeverityDistribution[]>(severityDistributionQuery, [])

    // Vector processing trends over time
    const processingTrendsQuery = `
      SELECT 
        DATE_FORMAT(analyzed_date, '%Y-%m') as month,
        COUNT(*) as total_analyses,
        COUNT(CASE WHEN image_embedding IS NOT NULL THEN 1 END) as with_embeddings,
        AVG(confidence_score) as avg_confidence
      FROM analysis_results
      WHERE analyzed_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(analyzed_date, '%Y-%m')
      ORDER BY month ASC
    `
    
    const processingTrends = await executeQuery<ProcessingTrend[]>(processingTrendsQuery, [])

    // Real vector insights from TiDB data
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    
    // Get current month vs last month comparison
    const monthlyComparisonQuery = `
      SELECT 
        COUNT(CASE WHEN MONTH(analyzed_date) = ? AND YEAR(analyzed_date) = ? THEN 1 END) as current_month_embeddings,
        COUNT(CASE WHEN MONTH(analyzed_date) = ? AND YEAR(analyzed_date) = ? THEN 1 END) as last_month_embeddings,
        AVG(CASE WHEN MONTH(analyzed_date) = ? AND YEAR(analyzed_date) = ? THEN confidence_score END) as current_month_confidence,
        AVG(CASE WHEN MONTH(analyzed_date) = ? AND YEAR(analyzed_date) = ? THEN confidence_score END) as last_month_confidence
      FROM analysis_results 
      WHERE image_embedding IS NOT NULL
    `
    
    const monthlyComparison = await executeQuery<MonthlyComparison[]>(monthlyComparisonQuery, [
      currentMonth, currentYear, 
      lastMonthDate.getMonth() + 1, lastMonthDate.getFullYear(),
      currentMonth, currentYear,
      lastMonthDate.getMonth() + 1, lastMonthDate.getFullYear()
    ])
    
    const comparison = monthlyComparison[0] || {
      current_month_embeddings: 0,
      last_month_embeddings: 0,
      current_month_confidence: 0,
      last_month_confidence: 0
    }

    // Calculate real performance metrics
    const vectorInsights = {
      processing_rate: vectorStats.total_embeddings > 0 
        ? Math.round((vectorStats.complete_embeddings / vectorStats.total_embeddings) * 100) 
        : 0,
      accuracy_rate: vectorStats.total_embeddings > 0
        ? Math.round((vectorStats.high_accuracy_count / vectorStats.total_embeddings) * 100)
        : 0,
      avg_confidence: Math.round(vectorStats.avg_confidence * 10) / 10,
      // Real month-over-month growth
      monthly_growth: comparison.last_month_embeddings > 0 
        ? Math.round(((comparison.current_month_embeddings - comparison.last_month_embeddings) / comparison.last_month_embeddings) * 100)
        : 0,
      confidence_improvement: comparison.last_month_confidence > 0 && comparison.current_month_confidence > 0
        ? Math.round((comparison.current_month_confidence - comparison.last_month_confidence) * 10) / 10
        : 0
    }

    return NextResponse.json({
      vector_overview: {
        total_embeddings: vectorStats.total_embeddings,
        complete_embeddings: vectorStats.complete_embeddings,
        ...vectorInsights
      },
      waste_type_embeddings: wasteTypeEmbeddings,
      severity_distribution: severityDistribution,
      processing_trends: processingTrends,
      technical_notes: {
        embedding_dimensions: 1024,
        model_used: "Amazon Titan Embed Image v1",
        storage_format: "TiDB VECTOR(1024) columns",
        similarity_function: "VEC_COSINE_DISTANCE()",
        database: "TiDB Cloud Production Instance",
        monthly_growth_rate: `${vectorInsights.monthly_growth}%`,
        confidence_improvement: `${vectorInsights.confidence_improvement}%`
      },
      monthly_comparison: {
        current_month_embeddings: comparison.current_month_embeddings,
        last_month_embeddings: comparison.last_month_embeddings,
        growth_rate: vectorInsights.monthly_growth,
        current_month_confidence: Math.round(comparison.current_month_confidence * 10) / 10,
        last_month_confidence: Math.round(comparison.last_month_confidence * 10) / 10,
        confidence_change: vectorInsights.confidence_improvement
      }
    })
    
  } catch (error) {
    console.error('Vector analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vector analytics' },
      { status: 500 }
    )
  }
}