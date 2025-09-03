import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '4000'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true
  } : {
    rejectUnauthorized: false
  }
};

interface BatchAnalysisResult {
  common_patterns: any[];
  outliers: any[];
  recommendations: string[];
  similarity_matrix: number[][];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { reportIds, analysisType = 'similarity' } = req.body;

    if (!Array.isArray(reportIds) || reportIds.length < 2) {
      return res.status(400).json({ message: 'At least 2 report IDs are required for batch analysis' });
    }

    if (reportIds.length > 50) {
      return res.status(400).json({ message: 'Maximum 50 reports allowed for batch analysis' });
    }

    const connection = await mysql.createConnection(dbConfig);

    try {
      // Get all reports with their embeddings and details
      const placeholders = reportIds.map(() => '?').join(',');
      const [reports] = await connection.execute(`
        SELECT 
          r.report_id,
          r.latitude,
          r.longitude,
          r.address_text,
          r.description,
          r.report_date,
          r.status,
          r.image_url,
          ar.image_embedding,
          ar.location_embedding,
          ar.full_description,
          ar.confidence_score,
          ar.severity_score,
          ar.priority_level,
          ar.estimated_volume,
          wt.name as waste_type,
          wt.recyclable,
          wt.hazard_level,
          u.username
        FROM reports r
        JOIN analysis_results ar ON r.report_id = ar.report_id
        LEFT JOIN waste_types wt ON ar.waste_type_id = wt.waste_type_id
        LEFT JOIN users u ON r.user_id = u.user_id
        WHERE r.report_id IN (${placeholders})
          AND ar.image_embedding IS NOT NULL
        ORDER BY r.report_date DESC
      `, reportIds);

      if (!Array.isArray(reports) || reports.length < 2) {
        return res.status(404).json({ message: 'Insufficient reports found with embeddings' });
      }

      let analysisResult: BatchAnalysisResult;

      switch (analysisType) {
        case 'similarity':
          analysisResult = await performSimilarityAnalysis(connection, reports);
          break;
        case 'patterns':
          analysisResult = await performPatternAnalysis(connection, reports);
          break;
        case 'anomaly':
          analysisResult = await performAnomalyAnalysis(connection, reports);
          break;
        default:
          analysisResult = await performSimilarityAnalysis(connection, reports);
      }

      res.status(200).json({
        success: true,
        analysis_type: analysisType,
        reports_analyzed: reports.length,
        analysis_date: new Date().toISOString(),
        results: analysisResult,
        metadata: {
          total_reports: reports.length,
          date_range: {
            earliest: reports.length > 0 ? (reports[reports.length - 1] as any)?.report_date : null,
            latest: reports.length > 0 ? (reports[0] as any)?.report_date : null
          },
          waste_types: Array.from(new Set((reports as any[]).map(r => r.waste_type).filter(Boolean))),
          avg_confidence: (reports as any[]).reduce((sum, r) => sum + (r.confidence_score || 0), 0) / reports.length,
          avg_severity: (reports as any[]).reduce((sum, r) => sum + (r.severity_score || 0), 0) / reports.length
        }
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Batch analysis error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

async function performSimilarityAnalysis(connection: mysql.Connection, reports: any[]): Promise<BatchAnalysisResult> {
  const similarityMatrix: number[][] = [];
  const similarities: Array<{i: number, j: number, similarity: number, reports: [any, any]}> = [];

  // Calculate pairwise similarities
  for (let i = 0; i < reports.length; i++) {
    similarityMatrix[i] = [];
    for (let j = 0; j < reports.length; j++) {
      if (i === j) {
        similarityMatrix[i][j] = 1.0;
      } else if (i < j) {
        // Calculate similarity using TiDB vector functions
        const [result] = await connection.execute(`
          SELECT VEC_COSINE_DISTANCE(?, ?) as similarity
        `, [reports[i].image_embedding, reports[j].image_embedding]);
        
        const similarity = Array.isArray(result) && result.length > 0 ? 
          parseFloat((result[0] as any).similarity) : 0;
        
        similarityMatrix[i][j] = similarity;
        similarityMatrix[j][i] = similarity;
        
        similarities.push({
          i, j, similarity,
          reports: [reports[i], reports[j]]
        });
      }
    }
  }

  // Find common patterns (high similarity pairs)
  const commonPatterns = similarities
    .filter(s => s.similarity > 0.8)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10)
    .map(s => ({
      similarity_score: s.similarity,
      report_1: {
        report_id: s.reports[0].report_id,
        waste_type: s.reports[0].waste_type,
        description: s.reports[0].description,
        address_text: s.reports[0].address_text
      },
      report_2: {
        report_id: s.reports[1].report_id,
        waste_type: s.reports[1].waste_type,
        description: s.reports[1].description,
        address_text: s.reports[1].address_text
      },
      pattern_type: 'High similarity match'
    }));

  // Find outliers (reports with low average similarity to others)
  const outliers = reports.map((report, idx) => {
    const avgSimilarity = similarityMatrix[idx].reduce((sum, sim) => sum + sim, 0) / similarityMatrix[idx].length;
    return { report, avgSimilarity, index: idx };
  })
  .sort((a, b) => a.avgSimilarity - b.avgSimilarity)
  .slice(0, 3)
  .map(o => ({
    report_id: o.report.report_id,
    waste_type: o.report.waste_type,
    description: o.report.description,
    address_text: o.report.address_text,
    avg_similarity: o.avgSimilarity,
    anomaly_reason: 'Low similarity to other reports in batch'
  }));

  // Generate recommendations
  const recommendations = generateSimilarityRecommendations(reports, commonPatterns, outliers);

  return {
    common_patterns: commonPatterns,
    outliers,
    recommendations,
    similarity_matrix: similarityMatrix
  };
}

async function performPatternAnalysis(_connection: mysql.Connection, reports: any[]): Promise<BatchAnalysisResult> {
  // Group by waste type and analyze patterns
  const wasteTypeGroups = reports.reduce((acc: Record<string, any[]>, report) => {
    const type = report.waste_type || 'Unknown';
    if (!acc[type]) acc[type] = [];
    acc[type].push(report);
    return acc;
  }, {});

  const patterns = Object.entries(wasteTypeGroups).map(([type, typeReports]) => ({
    waste_type: type,
    count: (typeReports as any[]).length,
    avg_severity: (typeReports as any[]).reduce((sum: number, r: any) => sum + (r.severity_score || 0), 0) / (typeReports as any[]).length,
    avg_confidence: (typeReports as any[]).reduce((sum: number, r: any) => sum + (r.confidence_score || 0), 0) / (typeReports as any[]).length,
    locations: Array.from(new Set((typeReports as any[]).map((r: any) => r.address_text).filter(Boolean))),
    pattern_type: 'Waste type clustering'
  }));

  return {
    common_patterns: patterns,
    outliers: [],
    recommendations: generatePatternRecommendations(patterns, reports),
    similarity_matrix: []
  };
}

async function performAnomalyAnalysis(_connection: mysql.Connection, reports: any[]): Promise<BatchAnalysisResult> {
  // Find reports that are anomalous based on various criteria
  const avgSeverity = reports.reduce((sum, r) => sum + (r.severity_score || 0), 0) / reports.length;
  const avgConfidence = reports.reduce((sum, r) => sum + (r.confidence_score || 0), 0) / reports.length;
  const avgVolume = reports.reduce((sum, r) => sum + (r.estimated_volume || 0), 0) / reports.length;

  const anomalies = reports
    .map(report => {
      let anomalyScore = 0;
      let reasons = [];

      if (Math.abs((report.severity_score || 0) - avgSeverity) > avgSeverity * 0.5) {
        anomalyScore += 1;
        reasons.push('Unusual severity score');
      }
      
      if (Math.abs((report.confidence_score || 0) - avgConfidence) > avgConfidence * 0.3) {
        anomalyScore += 1;
        reasons.push('Unusual confidence score');
      }

      if (Math.abs((report.estimated_volume || 0) - avgVolume) > avgVolume * 0.7) {
        anomalyScore += 1;
        reasons.push('Unusual waste volume');
      }

      return { report, anomalyScore, reasons };
    })
    .filter(a => a.anomalyScore > 0)
    .sort((a, b) => b.anomalyScore - a.anomalyScore)
    .slice(0, 5)
    .map(a => ({
      report_id: a.report.report_id,
      waste_type: a.report.waste_type,
      description: a.report.description,
      address_text: a.report.address_text,
      anomaly_score: a.anomalyScore,
      anomaly_reason: a.reasons.join(', ')
    }));

  return {
    common_patterns: [],
    outliers: anomalies,
    recommendations: generateAnomalyRecommendations(anomalies, reports),
    similarity_matrix: []
  };
}

function generateSimilarityRecommendations(reports: any[], patterns: any[], outliers: any[]): string[] {
  const recommendations = [];

  if (patterns.length > 0) {
    recommendations.push(`Found ${patterns.length} highly similar report pairs - consider consolidating cleanup efforts for these locations`);
  }

  if (outliers.length > 0) {
    recommendations.push(`${outliers.length} reports show unique characteristics - may require specialized handling`);
  }

  const wasteTypes = Array.from(new Set(reports.map(r => r.waste_type).filter(Boolean)));
  if (wasteTypes.length > 3) {
    recommendations.push(`Multiple waste types detected (${wasteTypes.length}) - consider coordinated multi-type cleanup approach`);
  }

  return recommendations;
}

function generatePatternRecommendations(patterns: any[], _reports: any[]): string[] {
  const recommendations = [];
  const dominantType = patterns.sort((a, b) => b.count - a.count)[0];

  if (dominantType) {
    recommendations.push(`${dominantType.waste_type} is the dominant waste type (${dominantType.count} reports) - focus resources here`);
  }

  const highSeverityTypes = patterns.filter(p => p.avg_severity > 7);
  if (highSeverityTypes.length > 0) {
    recommendations.push(`High severity waste types detected: ${highSeverityTypes.map(p => p.waste_type).join(', ')} - prioritize immediate action`);
  }

  return recommendations;
}

function generateAnomalyRecommendations(anomalies: any[], _reports: any[]): string[] {
  const recommendations = [];

  if (anomalies.length > 0) {
    recommendations.push(`${anomalies.length} anomalous reports detected - investigate for data quality or special circumstances`);
  }

  const severityAnomalies = anomalies.filter(a => a.anomaly_reason.includes('severity'));
  if (severityAnomalies.length > 0) {
    recommendations.push(`Unusual severity patterns detected - verify assessment accuracy`);
  }

  return recommendations;
}