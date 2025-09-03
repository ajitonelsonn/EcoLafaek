// pages/api/stats/by-location.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { Location } from "@/types";
import executeQuery from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Location[] | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const query = `
      SELECT l.location_id, l.name, l.district, COUNT(r.report_id) as report_count,
             AVG(a.severity_score) as avg_severity
      FROM locations l
      LEFT JOIN reports r ON l.location_id = r.location_id
      LEFT JOIN analysis_results a ON r.report_id = a.report_id
      GROUP BY l.location_id, l.name, l.district
      HAVING report_count > 0
      ORDER BY report_count DESC
    `;

    const locations = await executeQuery<Location[]>({ query });

    // Format the average severity to 2 decimal places
    const formattedLocations = locations.map((location) => ({
      ...location,
      avg_severity:
        location.avg_severity !== null
          ? parseFloat(location.avg_severity.toFixed(2))
          : null,
    }));

    res.status(200).json(formattedLocations);
  } catch (error) {
    console.error("Error getting location stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
