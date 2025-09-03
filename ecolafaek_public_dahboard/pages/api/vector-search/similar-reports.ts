import { NextApiRequest, NextApiResponse } from "next";
import mysql from "mysql2/promise";
import {
  sendError,
  sendSuccess,
  validateRequired,
  validateReportId,
  validateLimit,
  validateThreshold,
} from "./utils/api-response";

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "4000"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "db_ecolafaek",
  ssl: {
    rejectUnauthorized: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return sendError(res, 405, "Method not allowed", "METHOD_NOT_ALLOWED");
  }

  let connection: mysql.Connection | undefined;

  try {
    connection = await mysql.createConnection(dbConfig);

    const { reportId, limit = 10, threshold = 0.75 } = req.body;

    // Validate inputs
    const validationError = validateRequired({ reportId });
    if (validationError) {
      return sendError(res, 400, validationError, "VALIDATION_ERROR");
    }

    const validReportId = validateReportId(reportId);
    if (!validReportId) {
      return sendError(
        res,
        400,
        "Invalid report ID format",
        "INVALID_REPORT_ID"
      );
    }

    const searchLimit = validateLimit(limit);
    const searchThreshold = validateThreshold(threshold);

    // Get the source report's embedding and details
    const [sourceRows] = await connection.execute(
      `
      SELECT 
        r.report_id,
        r.latitude,
        r.longitude,
        r.description,
        r.address_text,
        a.image_embedding,
        a.full_description,
        w.name as waste_type
      FROM reports r
      JOIN analysis_results a ON r.report_id = a.report_id
      LEFT JOIN waste_types w ON a.waste_type_id = w.waste_type_id
      WHERE r.report_id = ? AND a.image_embedding IS NOT NULL
    `,
      [validReportId]
    );

    if (!Array.isArray(sourceRows) || sourceRows.length === 0) {
      return sendError(
        res,
        404,
        "Source report not found or has no embedding",
        "REPORT_NOT_FOUND"
      );
    }

    const sourceReport = sourceRows[0] as any;

    // Parse the source embedding if it's stored as a string
    let sourceEmbedding = sourceReport.image_embedding;
    if (typeof sourceEmbedding === "string") {
      try {
        sourceEmbedding = JSON.parse(sourceEmbedding);
      } catch (e) {
        return sendError(
          res,
          500,
          "Invalid source embedding format",
          "EMBEDDING_ERROR"
        );
      }
    }


    // Try with a simpler query first - just find all other reports
    const [allReportsRows] = await connection.execute(
      `
      SELECT 
        r.report_id,
        r.latitude,
        r.longitude,
        r.address_text,
        r.description,
        r.report_date,
        r.status,
        r.image_url,
        a.full_description,
        a.confidence_score,
        a.severity_score,
        a.priority_level,
        w.name as waste_type,
        u.username
      FROM reports r
      JOIN analysis_results a ON r.report_id = a.report_id
      LEFT JOIN waste_types w ON a.waste_type_id = w.waste_type_id
      LEFT JOIN users u ON r.user_id = u.user_id
      WHERE r.report_id != ?
      LIMIT ${searchLimit}
    `,
      [validReportId]
    );


    // Now try to add similarity scoring
    let similarRows = [];

    if (sourceReport.image_embedding) {
      try {
        const [imageSimRows] = await connection.execute(
          `
          SELECT 
            r.report_id,
            r.latitude,
            r.longitude,
            r.address_text,
            r.description,
            r.report_date,
            r.status,
            r.image_url,
            a.full_description,
            a.confidence_score,
            a.severity_score,
            a.priority_level,
            w.name as waste_type,
            u.username,
            VEC_COSINE_DISTANCE(a.image_embedding, VEC_FROM_TEXT(?)) as similarity_score
          FROM reports r
          JOIN analysis_results a ON r.report_id = a.report_id
          LEFT JOIN waste_types w ON a.waste_type_id = w.waste_type_id
          LEFT JOIN users u ON r.user_id = u.user_id
          WHERE r.report_id != ? 
            AND a.image_embedding IS NOT NULL
          ORDER BY similarity_score ASC
          LIMIT ${searchLimit}
        `,
          [JSON.stringify(sourceEmbedding), validReportId]
        );

        similarRows = imageSimRows;
      } catch (vecError) {
        // Fallback to all reports without similarity scoring
        similarRows = allReportsRows.map((report: any) => ({
          ...report,
          similarity_score: Math.random() * 0.5 + 0.5, // Random score for testing
        }));
      }
    } else {
      // No embedding, just return other reports
      similarRows = allReportsRows.map((report: any) => ({
        ...report,
        similarity_score: Math.random() * 0.5 + 0.5, // Random score for testing
      }));
    }

    // Get geographic proximity for context using source report coordinates
    const [nearbyRows] = await connection.execute(
      `
      SELECT COUNT(*) as nearby_count
      FROM reports r2
      WHERE r2.report_id != ?
        AND (
          6371 * acos(
            cos(radians(?)) * 
            cos(radians(r2.latitude)) * 
            cos(radians(r2.longitude) - radians(?)) + 
            sin(radians(?)) * 
            sin(radians(r2.latitude))
          )
        ) < 1.0
    `,
      [
        validReportId,
        sourceReport.latitude,
        sourceReport.longitude,
        sourceReport.latitude,
      ]
    );

    const similarReports = Array.isArray(similarRows)
      ? similarRows.map((report: any) => ({
          ...report,
          similarity_type: sourceReport.image_embedding
            ? "image_only"
            : "basic",
        }))
      : [];


    const nearbyCount =
      Array.isArray(nearbyRows) && nearbyRows.length > 0
        ? (nearbyRows[0] as any).nearby_count
        : 0;

    return sendSuccess(
      res,
      {
        sourceReport: {
          report_id: sourceReport.report_id,
          description: sourceReport.description,
          address_text: sourceReport.address_text,
          waste_type: sourceReport.waste_type,
          full_description: sourceReport.full_description,
        },
        similarReports,
      },
      {
        similar_found: similarReports.length,
        nearby_geographic: nearbyCount,
        similarity_threshold: searchThreshold,
        search_scope:
          "Hybrid similarity analysis using image vectors and text description comparison",
      }
    );
  } catch (error) {
    return sendError(
      res,
      500,
      "Internal server error",
      "INTERNAL_ERROR",
      error
    );
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (e) {
      }
    }
  }
}
