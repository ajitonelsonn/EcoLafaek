// pages/api/reports/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PaginatedReportsResponse, Report } from "@/types";
import executeQuery from "@/lib/db";
import {
  formatDateTime,
  getFilterConditions,
  getPaginationParams,
} from "@/lib/utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PaginatedReportsResponse | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get pagination parameters
    const { page, perPage, offset } = getPaginationParams(req);

    // Get filter conditions
    const { conditions, params } = getFilterConditions(req);

    // Build where clause
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM reports r
      LEFT JOIN analysis_results a ON r.report_id = a.report_id
      LEFT JOIN waste_types w ON a.waste_type_id = w.waste_type_id
      ${whereClause}
    `;

    const countResult = await executeQuery<{ total: number }[]>({
      query: countQuery,
      values: params,
    });

    const total = countResult[0].total;

    // Get reports with pagination
    const reportQuery = `
      SELECT r.report_id, r.user_id, r.latitude, r.longitude, 
             r.description, r.status, r.image_url, r.report_date,
             a.severity_score, a.priority_level, w.name as waste_type
      FROM reports r
      LEFT JOIN analysis_results a ON r.report_id = a.report_id
      LEFT JOIN waste_types w ON a.waste_type_id = w.waste_type_id
      ${whereClause}
      ORDER BY r.report_date DESC
      LIMIT ? OFFSET ?
    `;

    //console.log("Reports query:", reportQuery);
    //console.log("Params:", [...params, perPage, offset]);

    const reportsResult = await executeQuery<Report[]>({
      query: reportQuery,
      values: [...params, perPage, offset],
    });

    // Convert datetime objects to strings
    const reports = reportsResult.map((report) => {
      const formattedReport = { ...report };
      if (report.report_date) {
        formattedReport.report_date = formatDateTime(report.report_date);
      }
      return formattedReport;
    });

    const total_pages = Math.ceil(total / perPage);

    res.status(200).json({
      reports,
      total,
      page,
      per_page: perPage,
      total_pages,
    });
  } catch (error) {
    console.error("Error getting reports:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
