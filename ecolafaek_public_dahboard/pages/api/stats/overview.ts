// pages/api/stats/overview.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { StatsOverview, DailyReport } from "@/types";
import executeQuery from "@/lib/db";
import { formatDate } from "@/lib/utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatsOverview | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // OPTIMIZED: Combine multiple queries into parallel execution
    // This reduces latency by executing queries concurrently
    const [
      totalReportsResult,
      statusCountsResult,
      wasteTypeCountsResult,
      avgSeverityResult,
      priorityCountsResult,
      hotspotCountResult,
      dailyReportsResult,
    ] = await Promise.all([
      // Get total reports count (uses idx_reports_status for faster COUNT)
      executeQuery<{ total_reports: number }[]>({
        query: "SELECT COUNT(*) as total_reports FROM reports",
      }),

      // Get reports by status (uses idx_reports_status index)
      executeQuery<{ status: string; count: number }[]>({
        query: "SELECT status, COUNT(*) as count FROM reports GROUP BY status",
      }),

      // Get reports by waste type (uses idx_analysis_waste_type index)
      executeQuery<{ name: string; count: number }[]>({
        query: `
          SELECT w.name, COUNT(*) as count
          FROM analysis_results a
          JOIN waste_types w ON a.waste_type_id = w.waste_type_id
          GROUP BY w.name
        `,
      }),

      // Get average severity score (uses idx_analysis_severity index)
      executeQuery<{ avg_severity: number }[]>({
        query:
          "SELECT AVG(severity_score) as avg_severity FROM analysis_results",
      }),

      // Get priority level breakdown (uses idx_analysis_priority index)
      executeQuery<{ priority_level: string; count: number }[]>({
        query:
          "SELECT priority_level, COUNT(*) as count FROM analysis_results GROUP BY priority_level",
      }),

      // Get hotspot count (uses idx_hotspots_status index)
      executeQuery<{ hotspot_count: number }[]>({
        query:
          "SELECT COUNT(*) as hotspot_count FROM hotspots WHERE status = 'active'",
      }),

      // Get all daily report stats (uses idx_reports_report_date index)
      executeQuery<{ date: Date; count: number }[]>({
        query: `
          SELECT DATE(report_date) as date, COUNT(*) as count
          FROM reports
          GROUP BY DATE(report_date)
          ORDER BY date
        `,
      }),
    ]);

    // Process results
    const total_reports = totalReportsResult[0].total_reports;

    const status_counts: Record<string, number> = {};
    statusCountsResult.forEach((row) => {
      status_counts[row.status] = row.count;
    });

    const waste_type_counts: Record<string, number> = {};
    wasteTypeCountsResult.forEach((row) => {
      waste_type_counts[row.name] = row.count;
    });

    const avg_severity = avgSeverityResult[0].avg_severity || 0;

    const priority_counts: Record<string, number> = {};
    priorityCountsResult.forEach((row) => {
      priority_counts[row.priority_level] = row.count;
    });

    const hotspot_count = hotspotCountResult[0].hotspot_count;

    // Format daily reports (no filling in missing dates for all-time data)
    const daily_reports: DailyReport[] = dailyReportsResult.map((row) => ({
      date: formatDate(row.date),
      count: row.count,
    }));

    res.status(200).json({
      total_reports,
      status_counts,
      waste_type_counts,
      avg_severity: parseFloat(avg_severity.toFixed(2)),
      priority_counts,
      hotspot_count,
      daily_reports,
    });
  } catch (error) {
    console.error("Error getting stats overview:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
