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
    const query = `
      SELECT h.*, 
            (SELECT COUNT(*) FROM hotspot_reports hr WHERE hr.hotspot_id = h.hotspot_id) as report_count
      FROM hotspots h
      WHERE h.status = 'active'
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
