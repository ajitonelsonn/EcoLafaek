// pages/api/hotspots/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { Hotspot } from "@/types";
import executeQuery from "@/lib/db";
import { formatDate } from "@/lib/utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Hotspot[] | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // OPTIMIZED: Use LEFT JOIN instead of correlated subquery
    // Uses idx_hotspots_status and idx_hotspot_reports_hotspot indexes
    const query = `
      SELECT h.*,
             COUNT(DISTINCT hr.report_id) as report_count
      FROM hotspots h
      LEFT JOIN hotspot_reports hr ON h.hotspot_id = hr.hotspot_id
      WHERE h.status = 'active'
      GROUP BY h.hotspot_id
      ORDER BY h.total_reports DESC
    `;

    const hotspotsResult = await executeQuery<any[]>({ query });

    // Convert datetime objects to strings
    const hotspots = hotspotsResult.map((hotspot) => ({
      ...hotspot,
      first_reported:
        hotspot.first_reported instanceof Date
          ? formatDate(hotspot.first_reported)
          : hotspot.first_reported,
      last_reported:
        hotspot.last_reported instanceof Date
          ? formatDate(hotspot.last_reported)
          : hotspot.last_reported,
    }));

    res.status(200).json(hotspots);
  } catch (error) {
    console.error("Error getting hotspots:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
