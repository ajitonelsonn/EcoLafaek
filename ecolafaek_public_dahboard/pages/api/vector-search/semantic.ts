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

// Amazon Titan Embed configuration - using Image model for text (multimodal)
const BEDROCK_ENDPOINT = process.env.BEDROCK_ENDPOINT || 'https://bedrock-runtime.us-east-1.amazonaws.com';
const BEDROCK_MODEL_ID = 'amazon.titan-embed-image-v1';
const BEDROCK_TOKEN = process.env.AWS_BEARER_TOKEN_BEDROCK;

async function createTextEmbedding(text: string): Promise<number[] | null> {
  if (!BEDROCK_TOKEN || !text) return null;

  try {
    const payload = {
      inputText: text,
      embeddingConfig: {
        outputEmbeddingLength: 1024
      }
    };

    const response = await fetch(`${BEDROCK_ENDPOINT}/model/${BEDROCK_MODEL_ID}/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BEDROCK_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000) // 30 second timeout like mobile backend
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bedrock API error:', response.status, response.statusText);
      console.error('Response text:', errorText);
      return null;
    }

    const result = await response.json();
    return result.embedding || null;
  } catch (error) {
    console.error('Error creating text embedding:', error);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { query, limit = 10, threshold = 0.7 } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: 'Query text is required' });
    }

    // Validate and parse limit
    const searchLimit = Math.max(1, Math.min(50, parseInt(String(limit)) || 10));

    // Generate embedding for the search query
    const queryEmbedding = await createTextEmbedding(query);
    
    if (!queryEmbedding) {
      return res.status(500).json({ message: 'Failed to generate query embedding' });
    }

    // Connect to database
    const connection = await mysql.createConnection(dbConfig);

    try {
      // Semantic search using TiDB vector similarity - with proper joins
      const [rows] = await connection.execute(`
        SELECT 
          r.report_id,
          r.latitude,
          r.longitude,
          r.description,
          r.report_date,
          r.image_url,
          w.name as waste_type,
          a.severity_score,
          a.priority_level,
          a.analysis_notes,
          a.full_description,
          VEC_COSINE_DISTANCE(a.image_embedding, ?) as semantic_similarity
        FROM reports r 
        JOIN analysis_results a ON r.report_id = a.report_id
        LEFT JOIN waste_types w ON a.waste_type_id = w.waste_type_id
        WHERE a.image_embedding IS NOT NULL
        ORDER BY semantic_similarity ASC
        LIMIT ${searchLimit}
      `, [JSON.stringify(queryEmbedding)]);

      // Get search statistics
      const [statsRows] = await connection.execute(`
        SELECT 
          COUNT(*) as total_searchable_reports,
          COUNT(DISTINCT a.waste_type_id) as waste_types_available,
          AVG(a.confidence_score) as avg_confidence
        FROM analysis_results a
        WHERE a.image_embedding IS NOT NULL
      `);

      const results = Array.isArray(rows) ? rows : [];
      const stats = Array.isArray(statsRows) && statsRows.length > 0 ? statsRows[0] as any : {
        total_searchable_reports: 0,
        waste_types_available: 0,
        avg_confidence: 0
      };

      res.status(200).json({
        success: true,
        query,
        results,
        stats: {
          query_results: results.length,
          total_searchable_reports: stats.total_searchable_reports || 0,
          waste_types_available: stats.waste_types_available || 0,
          avg_confidence: parseFloat(stats.avg_confidence || 0).toFixed(2),
          similarity_threshold: threshold
        }
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}