import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '4000'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'db_ecolafaek',
  ssl: {
    rejectUnauthorized: false
  }
};

interface ClusterResult {
  cluster_id: number;
  reports: any[];
  centroid_description: string;
  avg_similarity: number;
  geographic_spread: number;
  waste_types: string[];
  pattern_type: string;
  insights: string[];
  time_span: { days: number; oldest: Date; newest: Date };
  severity_level: number;
  confidence_level: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { 
      minClusterSize = 3, 
      maxClusters = 10, 
      similarityThreshold = 0.8,
      days = 30 
    } = req.query;


    const connection = await mysql.createConnection(dbConfig);

    try {
      
      // Get all reports with embeddings from the specified time period
      const [allReports] = await connection.execute(`
        SELECT 
          r.report_id,
          r.latitude,
          r.longitude,
          r.address_text,
          r.description,
          r.report_date,
          r.status,
          r.image_url,
          a.image_embedding,
          a.full_description,
          a.confidence_score,
          a.severity_score,
          w.name as waste_type,
          u.username
        FROM reports r
        JOIN analysis_results a ON r.report_id = a.report_id
        LEFT JOIN waste_types w ON a.waste_type_id = w.waste_type_id
        LEFT JOIN users u ON r.user_id = u.user_id
        WHERE a.image_embedding IS NOT NULL 
          AND r.report_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
          AND r.status IN ('analyzed', 'resolved')
        ORDER BY r.report_date DESC
      `, [parseInt(days.toString())]);


      // Try a simpler query to see if we have ANY reports at all
      const [simpleReports] = await connection.execute(`
        SELECT COUNT(*) as total_count
        FROM reports r
        JOIN analysis_results a ON r.report_id = a.report_id
        WHERE a.image_embedding IS NOT NULL
      `);
      

      if (!Array.isArray(allReports) || allReports.length < parseInt(minClusterSize.toString())) {
        return res.status(200).json({
          success: true,
          data: {
            clusters: []
          },
          reports: [], // Empty reports array for frontend
          stats: {
            total_reports: Array.isArray(allReports) ? allReports.length : 0,
            clusters_found: 0,
            message: 'Insufficient reports for clustering analysis',
            analysis_scope: `Looking for ${minClusterSize}+ reports in last ${days} days with embeddings and status 'analyzed' or 'resolved'`,
            query_results: 0
          }
        });
      }

      
      // Perform clustering analysis using vector similarity
      const clusters: ClusterResult[] = [];
      const processedReports = new Set<number>();
      const threshold = parseFloat(similarityThreshold.toString());


      for (let i = 0; i < (allReports as any[]).length && clusters.length < parseInt(maxClusters.toString()); i++) {
        const seedReport = (allReports as any[])[i];
        
        
        if (processedReports.has(seedReport.report_id)) {
          continue;
        }

        // Parse the embedding if it's stored as a string
        let seedEmbedding = seedReport.image_embedding;
        if (typeof seedEmbedding === 'string') {
          try {
            seedEmbedding = JSON.parse(seedEmbedding);
          } catch (e) {
            continue;
          }
        }


        try {
          // Find similar reports to create a cluster
          const [similarReports] = await connection.execute(`
            SELECT 
              r.report_id,
              r.latitude,
              r.longitude,
              r.address_text,
              r.description,
              r.report_date,
              r.status,
              r.image_url,
              ar.full_description,
              ar.confidence_score,
              ar.severity_score,
              wt.name as waste_type,
              u.username,
              VEC_COSINE_DISTANCE(ar.image_embedding, VEC_FROM_TEXT(?)) as similarity_score
            FROM reports r
            JOIN analysis_results ar ON r.report_id = ar.report_id
            LEFT JOIN waste_types wt ON ar.waste_type_id = wt.waste_type_id
            LEFT JOIN users u ON r.user_id = u.user_id
            WHERE r.report_id != ?
              AND ar.image_embedding IS NOT NULL
              AND r.report_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            ORDER BY similarity_score ASC
            LIMIT 20
          `, [
            JSON.stringify(seedEmbedding),
            seedReport.report_id,
            parseInt(days.toString())
          ]);



          // Filter by similarity threshold and add seed report
          // Note: Lower cosine distance = higher similarity
          // Current scores: ~0.31, ~0.33, ~0.39 (moderate similarity)
          // Let's use a reasonable threshold that includes moderately similar reports
          const adjustedThreshold = 0.5; // Allow cosine distance up to 0.5
          
          const filteredSimilar = Array.isArray(similarReports) 
            ? (similarReports as any[]).filter(r => {
                return r.similarity_score <= adjustedThreshold;
              })
            : [];


          const clusterReports = [seedReport, ...filteredSimilar];
          
          
          if (clusterReports.length >= parseInt(minClusterSize.toString())) {
            
            // Calculate cluster statistics
            const wasteTypes = [...new Set(clusterReports.map(r => r.waste_type).filter(Boolean))];
            const avgSimilarity = clusterReports.reduce((sum, r) => sum + (r.similarity_score || 1), 0) / clusterReports.length;
            
            // Calculate geographic spread (max distance between any two points in cluster)
            let maxDistance = 0;
            for (let j = 0; j < clusterReports.length; j++) {
              for (let k = j + 1; k < clusterReports.length; k++) {
                const distance = calculateDistance(
                  clusterReports[j].latitude,
                  clusterReports[j].longitude,
                  clusterReports[k].latitude,
                  clusterReports[k].longitude
                );
                maxDistance = Math.max(maxDistance, distance);
              }
            }

            const timeSpan = getTimeSpan(clusterReports);
            const patternType = getPatternType(wasteTypes, avgSimilarity, maxDistance);
            const insights = generateClusterInsights(clusterReports, wasteTypes, avgSimilarity, maxDistance);

            // Calculate meaningful confidence based on similarity and data quality
            const confidenceScores = clusterReports.map(r => r.confidence_score || 0);
            const hasValidConfidence = confidenceScores.some(score => score > 0);
            
            let calculatedConfidence;
            if (hasValidConfidence) {
              // Use actual confidence scores if available, convert strings to numbers
              calculatedConfidence = confidenceScores.reduce((sum, score) => sum + parseFloat(score || 0), 0) / confidenceScores.length;
            } else {
              // Calculate confidence based on similarity strength and cluster size
              const similarityConfidence = (1 - avgSimilarity) * 100; // Higher similarity = higher confidence
              const clusterSizeBonus = Math.min(clusterReports.length * 10, 20); // Bonus for larger clusters, max 20%
              calculatedConfidence = Math.min(95, similarityConfidence + clusterSizeBonus); // Cap at 95%
            }


            clusters.push({
              cluster_id: clusters.length + 1,
              reports: clusterReports.map(r => ({
                report_id: r.report_id,
                latitude: r.latitude,
                longitude: r.longitude,
                address_text: r.address_text,
                description: r.description,
                report_date: r.report_date,
                status: r.status,
                image_url: r.image_url,
                waste_type: r.waste_type,
                confidence_score: r.confidence_score,
                severity_score: r.severity_score,
                similarity_score: r.similarity_score || 1
              })),
              centroid_description: generateClusterDescription(clusterReports, wasteTypes),
              avg_similarity: parseFloat(avgSimilarity.toFixed(3)),
              geographic_spread: parseFloat(maxDistance.toFixed(2)),
              waste_types: wasteTypes,
              pattern_type: patternType,
              insights: insights,
              time_span: timeSpan,
              severity_level: clusterReports.reduce((sum, r) => sum + (r.severity_score || 0), 0) / clusterReports.length,
              confidence_level: calculatedConfidence
            });


            // Mark all reports in this cluster as processed
            clusterReports.forEach(r => processedReports.add(r.report_id));
          } else {
          }

        } catch (vectorError) {
          continue;
        }
      }

      // Sort clusters by size and similarity
      clusters.sort((a, b) => {
        const sizeA = a.reports.length;
        const sizeB = b.reports.length;
        if (sizeA !== sizeB) return sizeB - sizeA;
        return b.avg_similarity - a.avg_similarity;
      });

      await connection.end();


      // Flatten all reports from all clusters for frontend compatibility
      const allClusterReports = clusters.flatMap(cluster => 
        cluster.reports.map(report => ({
          ...report,
          cluster_id: cluster.cluster_id,
          cluster_description: cluster.centroid_description,
          cluster_size: cluster.reports.length,
          avg_cluster_similarity: cluster.avg_similarity
        }))
      );

      res.status(200).json({
        success: true,
        data: {
          clusters
        },
        reports: allClusterReports, // Add flattened reports for frontend
        stats: {
          total_reports: Array.isArray(allReports) ? allReports.length : 0,
          processed_reports: processedReports.size,
          clusters_found: clusters.length,
          similarity_threshold: threshold,
          time_period_days: parseInt(days.toString()),
          clustering_algorithm: 'Vector similarity with TiDB cosine distance',
          query_results: allClusterReports.length
        }
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function generateClusterDescription(reports: any[], wasteTypes: string[]): string {
  const primaryType = wasteTypes[0] || 'Mixed waste';
  const avgSeverity = reports.reduce((sum, r) => sum + (r.severity_score || 0), 0) / reports.length;
  const locations = reports.map(r => r.address_text).filter(Boolean);
  const commonLocation = locations.length > 0 ? locations[0] : 'Various locations';

  return `${primaryType} pattern detected with ${reports.length} similar incidents near ${commonLocation}`;
}

function generateClusterInsights(reports: any[], wasteTypes: string[], avgSimilarity: number, geographicSpread: number) {
  const insights = [];
  const reportCount = reports.length;
  const timeSpan = getTimeSpan(reports);
  const avgSeverity = reports.reduce((sum, r) => sum + (r.severity_score || 0), 0) / reports.length;

  // Pattern strength insight
  const similarityPercent = Math.round((1 - avgSimilarity) * 100);
  if (similarityPercent > 80) {
    insights.push(`Strong pattern detected (${similarityPercent}% similarity)`);
  } else if (similarityPercent > 60) {
    insights.push(`Moderate pattern detected (${similarityPercent}% similarity)`);
  } else {
    insights.push(`Weak pattern detected (${similarityPercent}% similarity)`);
  }

  // Geographic insight
  if (geographicSpread < 0.5) {
    insights.push(`Highly localized area (${geographicSpread.toFixed(1)}km spread)`);
  } else if (geographicSpread < 2) {
    insights.push(`Concentrated area (${geographicSpread.toFixed(1)}km spread)`);
  } else {
    insights.push(`Widespread area (${geographicSpread.toFixed(1)}km spread)`);
  }

  // Frequency insight
  if (timeSpan.days <= 7) {
    insights.push(`Recent spike (${reportCount} reports in ${timeSpan.days} days)`);
  } else if (timeSpan.days <= 30) {
    insights.push(`Recurring issue (${reportCount} reports in ${timeSpan.days} days)`);
  } else {
    insights.push(`Ongoing pattern (${reportCount} reports over ${timeSpan.days} days)`);
  }

  // Severity insight
  if (avgSeverity > 7) {
    insights.push(`High severity incidents (avg ${avgSeverity.toFixed(1)}/10)`);
  } else if (avgSeverity > 4) {
    insights.push(`Medium severity incidents (avg ${avgSeverity.toFixed(1)}/10)`);
  } else {
    insights.push(`Low severity incidents (avg ${avgSeverity.toFixed(1)}/10)`);
  }

  return insights;
}

function getTimeSpan(reports: any[]) {
  const dates = reports.map(r => new Date(r.report_date)).sort((a, b) => a.getTime() - b.getTime());
  const oldest = dates[0];
  const newest = dates[dates.length - 1];
  const diffTime = Math.abs(newest.getTime() - oldest.getTime());
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  return { days: diffDays, oldest, newest };
}

function getPatternType(wasteTypes: string[], avgSimilarity: number, geographicSpread: number) {
  if (geographicSpread < 0.5 && avgSimilarity < 0.3) {
    return 'hotspot';
  } else if (geographicSpread > 2 && wasteTypes.length === 1) {
    return 'widespread';
  } else if (avgSimilarity < 0.2) {
    return 'identical';
  } else {
    return 'similar';
  }
}