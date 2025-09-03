// pages/api/stats/trends.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { TrendsResponse } from "@/types";
import executeQuery from "@/lib/db";
import { parseRequestQuery, parseIntParam } from "@/lib/utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TrendsResponse | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get parameters
    const period = parseRequestQuery(req, "period", "daily");
    const days = parseIntParam(req, "days", 30);

    // Build date format and group by clause based on period
    let groupBy: string;

    if (period === "weekly") {
      groupBy = "CONCAT(YEAR(r.report_date), '-', WEEK(r.report_date))";
    } else if (period === "monthly") {
      groupBy = "DATE_FORMAT(r.report_date, '%Y-%m')";
    } else {
      // Default daily
      groupBy = "DATE(r.report_date)";
    }

    // Calculate the date from X days ago
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    // Get report counts by period
    const reportTrendsQuery = `
      SELECT 
          ${groupBy} as period,
          COUNT(r.report_id) as report_count,
          AVG(a.severity_score) as avg_severity
      FROM reports r
      LEFT JOIN analysis_results a ON r.report_id = a.report_id
      WHERE r.report_date >= ?
      GROUP BY period
      ORDER BY period
    `;

    const reportTrends = await executeQuery<any[]>({
      query: reportTrendsQuery,
      values: [daysAgo],
    });

    // Get waste type trends
    const wasteTypeTrendsQuery = `
      SELECT 
          ${groupBy} as period,
          w.name as waste_type,
          COUNT(r.report_id) as count
      FROM reports r
      JOIN analysis_results a ON r.report_id = a.report_id
      JOIN waste_types w ON a.waste_type_id = w.waste_type_id
      WHERE r.report_date >= ?
      GROUP BY period, waste_type
      ORDER BY period, count DESC
    `;

    const wasteTypeTrends = await executeQuery<any[]>({
      query: wasteTypeTrendsQuery,
      values: [daysAgo],
    });

    // Get priority level trends
    const priorityTrendsQuery = `
      SELECT 
          ${groupBy} as period,
          a.priority_level,
          COUNT(r.report_id) as count
      FROM reports r
      JOIN analysis_results a ON r.report_id = a.report_id
      WHERE r.report_date >= ?
      GROUP BY period, a.priority_level
      ORDER BY period, count DESC
    `;

    const priorityTrends = await executeQuery<any[]>({
      query: priorityTrendsQuery,
      values: [daysAgo],
    });

    // Format the average severity to 2 decimal places where applicable
    const formattedReportTrends = reportTrends.map((trend) => {
      const formattedTrend = { ...trend };
      if (
        formattedTrend.avg_severity !== null &&
        formattedTrend.avg_severity !== undefined
      ) {
        formattedTrend.avg_severity = parseFloat(
          Number(formattedTrend.avg_severity).toFixed(2)
        );
      }
      return formattedTrend;
    });

    res.status(200).json({
      report_trends: formattedReportTrends,
      waste_type_trends: wasteTypeTrends,
      priority_trends: priorityTrends,
    });
  } catch (error) {
    console.error("Error getting trends:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
