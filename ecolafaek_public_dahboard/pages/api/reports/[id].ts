// pages/api/reports/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import executeQuery from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "Invalid report ID" });
    }

    const query = `
      SELECT r.*, a.*, w.name as waste_type, w.hazard_level, w.recyclable,
             u.username
      FROM reports r
      LEFT JOIN analysis_results a ON r.report_id = a.report_id
      LEFT JOIN waste_types w ON a.waste_type_id = w.waste_type_id
      LEFT JOIN users u ON r.user_id = u.user_id
      WHERE r.report_id = ?
    `;

    const reportResult = await executeQuery<any[]>({
      query,
      values: [parseInt(id, 10)],
    });

    if (reportResult.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }

    // Convert datetime objects to strings
    const report = reportResult[0];
    Object.keys(report).forEach((key) => {
      if (report[key] instanceof Date) {
        report[key] = formatDateTime(report[key]);
      }
    });

    res.status(200).json(report);
  } catch (error) {
    console.error("Error getting report:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
