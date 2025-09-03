// pages/api/hotspots/[id]/reports.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { HotspotReportsResponse, Report, Hotspot } from "@/types";
import executeQuery from "@/lib/db";
import { formatDateTime, formatDate } from "@/lib/utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HotspotReportsResponse | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "Invalid hotspot ID" });
    }

    const hotspotId = parseInt(id, 10);

    // Get reports for the hotspot
    const reportsQuery = `
      SELECT r.report_id, r.latitude, r.longitude, r.description,
             r.status, r.image_url, r.report_date,
             a.severity_score, a.priority_level, w.name as waste_type
      FROM hotspot_reports hr
      JOIN reports r ON hr.report_id = r.report_id
      LEFT JOIN analysis_results a ON r.report_id = a.report_id
      LEFT JOIN waste_types w ON a.waste_type_id = w.waste_type_id
      WHERE hr.hotspot_id = ?
      ORDER BY r.report_date DESC
    `;

    const reportsResult = await executeQuery<Report[]>({
      query: reportsQuery,
      values: [hotspotId],
    });

    // Convert datetime objects to strings
    const reports = reportsResult.map((report) => {
      const formattedReport = { ...report };
      if (report.report_date) {
        formattedReport.report_date = formatDateTime(report.report_date);
      }
      return formattedReport;
    });

    // Get hotspot details
    const hotspotQuery = `
      SELECT h.*
      FROM hotspots h
      WHERE h.hotspot_id = ?
    `;

    const hotspotResult = await executeQuery<Hotspot[]>({
      query: hotspotQuery,
      values: [hotspotId],
    });

    if (hotspotResult.length === 0) {
      return res.status(404).json({ error: "Hotspot not found" });
    }

    // Convert datetime objects to strings
    const hotspot = { ...hotspotResult[0] };
    if (hotspot.first_reported) {
      hotspot.first_reported = formatDate(hotspot.first_reported);
    }
    if (hotspot.last_reported) {
      hotspot.last_reported = formatDate(hotspot.last_reported);
    }

    res.status(200).json({
      hotspot,
      reports,
    });
  } catch (error) {
    console.error("Error getting hotspot reports:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
