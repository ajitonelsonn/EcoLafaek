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

      if (!Array.isArray(allReports) || allReports.length < parseInt(minClusterSize.toString())) {
        return res.status(200).json({
          success: true,
          clusters: [],
          stats: {
            total_reports: allReports?.length || 0,
            clusters_found: 0,
            message: 'Insufficient reports for clustering analysis'
          }
        });
      }

      // Perform clustering analysis using vector similarity
      const clusters: ClusterResult[] = [];
      const processedReports = new Set<number>();
      const threshold = parseFloat(similarityThreshold.toString());

      for (let i = 0; i < allReports.length && clusters.length < parseInt(maxClusters.toString()); i++) {
        const seedReport = allReports[i];
        
        if (processedReports.has(seedReport.report_id)) continue;

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
            ar.full_description,
            ar.confidence_score,
            ar.severity_score,
            wt.name as waste_type,
            u.username,
            VEC_COSINE_DISTANCE(ar.image_embedding, ?) as similarity_score
          FROM reports r
          JOIN analysis_results ar ON r.report_id = ar.report_id
          LEFT JOIN waste_types wt ON ar.waste_type_id = wt.waste_type_id
          LEFT JOIN users u ON r.user_id = u.user_id
          WHERE r.report_id != ?
            AND ar.image_embedding IS NOT NULL
            AND r.report_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            AND VEC_COSINE_DISTANCE(ar.image_embedding, ?) >= ?
          ORDER BY similarity_score DESC
          LIMIT 20
        `, [
          seedReport.image_embedding,
          seedReport.report_id,
          parseInt(days.toString()),
          seedReport.image_embedding,
          threshold
        ]);

        const clusterReports = [seedReport, ...(Array.isArray(similarReports) ? similarReports : [])];
        
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
              waste_type: r.waste_type,
              username: r.username,
              confidence_score: r.confidence_score,
              severity_score: r.severity_score,
              similarity_score: r.similarity_score || 1
            })),
            centroid_description: generateClusterDescription(clusterReports, wasteTypes),
            avg_similarity: parseFloat(avgSimilarity.toFixed(3)),
            geographic_spread: parseFloat(maxDistance.toFixed(2)),
            waste_types: wasteTypes
          });

          // Mark all reports in this cluster as processed
          clusterReports.forEach(r => processedReports.add(r.report_id));
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

      res.status(200).json({
        success: true,
        clusters,
        stats: {
          total_reports: allReports.length,
          processed_reports: processedReports.size,
          clusters_found: clusters.length,
          similarity_threshold: threshold,
          time_period_days: parseInt(days.toString()),
          clustering_algorithm: 'Vector similarity with TiDB cosine distance'
        }
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Clustering error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

  return `${primaryType} cluster with ${reports.length} reports near ${commonLocation} (avg severity: ${avgSeverity.toFixed(1)})`;
}