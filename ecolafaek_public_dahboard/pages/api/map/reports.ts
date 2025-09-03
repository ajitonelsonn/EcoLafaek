// pages/api/map/reports.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { MapData } from "@/types";
import executeQuery from "@/lib/db";
import {
  formatDateTime,
  formatDate,
  parseIntParam,
  getFilterConditions,
} from "@/lib/utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MapData | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get filter parameters
    const { conditions, params } = getFilterConditions(req);

    // Add condition that latitude and longitude are not null
    conditions.unshift("r.latitude IS NOT NULL AND r.longitude IS NOT NULL");

    // Get days parameter and build date condition
    const days = parseIntParam(req, "days", 30);
    if (days > 0) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);

      // Add date condition
      conditions.push("r.report_date >= ?");
      params.push(daysAgo);
    }

    // Build where clause
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get reports
    const reportsQuery = `
      SELECT r.report_id, r.latitude, r.longitude, r.status, 
             r.image_url, r.report_date, a.severity_score, 
             a.priority_level, w.name as waste_type
      FROM reports r
      LEFT JOIN analysis_results a ON r.report_id = a.report_id
      LEFT JOIN waste_types w ON a.waste_type_id = w.waste_type_id
      ${whereClause}
      ORDER BY r.report_date DESC
      LIMIT 1000
    `;

    //console.log("Reports query:", reportsQuery);
    //console.log("Params:", params);

    const reportsResult = await executeQuery<any[]>({
      query: reportsQuery,
      values: params,
    });

    // Convert datetime objects to strings
    const reports = reportsResult.map((report) => {
      const formattedReport = { ...report };
      if (report.report_date) {
        formattedReport.report_date = formatDateTime(report.report_date);
      }
      return formattedReport;
    });

    // Get hotspots
    const hotspotsQuery = `
      SELECT h.hotspot_id, h.name, h.center_latitude, h.center_longitude,
             h.radius_meters, h.total_reports, h.average_severity,
             h.first_reported, h.last_reported, h.status
      FROM hotspots h
      WHERE h.status = 'active'
    `;

    const hotspotsResult = await executeQuery<any[]>({
      query: hotspotsQuery,
    });

    // Convert datetime objects to strings
    const hotspots = hotspotsResult.map((hotspot) => {
      const formattedHotspot = { ...hotspot };
      if (hotspot.first_reported) {
        formattedHotspot.first_reported = formatDate(hotspot.first_reported);
      }
      if (hotspot.last_reported) {
        formattedHotspot.last_reported = formatDate(hotspot.last_reported);
      }
      return formattedHotspot;
    });

    res.status(200).json({
      reports,
      hotspots,
    });
  } catch (error) {
    console.error("Error getting map reports:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
