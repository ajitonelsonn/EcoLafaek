// pages/api/leaderboard.ts
import type { NextApiRequest, NextApiResponse } from "next";
import executeQuery from "@/lib/db";
import { parseIntParam, parseRequestQuery } from "@/lib/utils";

type LeaderboardUser = {
  user_id: number;
  username: string;
  report_count: number;
  valid_reports: number;
};

type LeaderboardResponse = {
  users: LeaderboardUser[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LeaderboardResponse | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get pagination parameters
    const page = parseIntParam(req, "page", 1);
    const perPage = parseIntParam(req, "per_page", 10);
    const offset = (page - 1) * perPage;

    // Get filter parameters
    const validOnly = parseRequestQuery(req, "valid_only", "") === "true";
    const timeRange = parseRequestQuery(req, "time_range", "all");
    const search = parseRequestQuery(req, "search", "");

    // Build query conditions and parameters
    let conditions = [];
    let params: any[] = [];
    let timeCondition = "";

    // Add time range filter if specified
    if (timeRange !== "all") {
      const now = new Date();
      let daysAgo;

      switch (timeRange) {
        case "week":
          daysAgo = 7;
          break;
        case "month":
          daysAgo = 30;
          break;
        case "quarter":
          daysAgo = 90;
          break;
        case "year":
          daysAgo = 365;
          break;
        default:
          daysAgo = 0;
      }

      if (daysAgo > 0) {
        const pastDate = new Date();
        pastDate.setDate(now.getDate() - daysAgo);
        timeCondition = "AND r.report_date >= ?";
        params.push(pastDate);
      }
    }

    // Add search filter if specified
    let searchCondition = "";
    if (search) {
      searchCondition = "AND (u.username LIKE ? OR u.user_id LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    // Base query to get total count
    let countQuery;

    if (validOnly) {
      // Only count reports that aren't marked as "Not Garbage"
      countQuery = `
        SELECT COUNT(DISTINCT u.user_id) as total
        FROM users u
        JOIN reports r ON u.user_id = r.user_id
        LEFT JOIN analysis_results ar ON r.report_id = ar.report_id
        LEFT JOIN waste_types wt ON ar.waste_type_id = wt.waste_type_id
        WHERE u.account_status = 'active'
        ${searchCondition}
        ${timeCondition}
      `;
    } else {
      // Count all reports
      countQuery = `
        SELECT COUNT(DISTINCT u.user_id) as total
        FROM users u
        JOIN reports r ON u.user_id = r.user_id
        WHERE u.account_status = 'active'
        ${searchCondition}
        ${timeCondition}
      `;
    }

    const countResult = await executeQuery<{ total: number }[]>({
      query: countQuery,
      values: params,
    });

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / perPage);

    // Query to get leaderboard data with pagination
    let leaderboardQuery;

    if (validOnly) {
      // Only count reports that aren't marked as "Not Garbage"
      leaderboardQuery = `
        SELECT 
          u.user_id,
          u.username,
          COUNT(DISTINCT r.report_id) as report_count,
          SUM(CASE 
            WHEN ar.waste_type_id IS NULL THEN 0
            WHEN wt.name = 'Not Garbage' THEN 0
            ELSE 1
          END) as valid_reports
        FROM users u
        JOIN reports r ON u.user_id = r.user_id
        LEFT JOIN analysis_results ar ON r.report_id = ar.report_id
        LEFT JOIN waste_types wt ON ar.waste_type_id = wt.waste_type_id
        WHERE u.account_status = 'active'
        ${searchCondition}
        ${timeCondition}
        GROUP BY u.user_id, u.username
        ORDER BY valid_reports DESC, report_count DESC
        LIMIT ? OFFSET ?
      `;
    } else {
      // Count all reports
      leaderboardQuery = `
        SELECT 
          u.user_id,
          u.username,
          COUNT(DISTINCT r.report_id) as report_count,
          SUM(CASE 
            WHEN ar.waste_type_id IS NULL THEN 0
            WHEN wt.name = 'Not Garbage' THEN 0
            ELSE 1
          END) as valid_reports
        FROM users u
        JOIN reports r ON u.user_id = r.user_id
        LEFT JOIN analysis_results ar ON r.report_id = ar.report_id
        LEFT JOIN waste_types wt ON ar.waste_type_id = wt.waste_type_id
        WHERE u.account_status = 'active'
        ${searchCondition}
        ${timeCondition}
        GROUP BY u.user_id, u.username
        ORDER BY report_count DESC, valid_reports DESC
        LIMIT ? OFFSET ?
      `;
    }

    const users = await executeQuery<LeaderboardUser[]>({
      query: leaderboardQuery,
      values: [...params, perPage, offset],
    });

    res.status(200).json({
      users,
      total,
      page,
      per_page: perPage,
      total_pages: totalPages,
    });
  } catch (error) {
    console.error("Error getting leaderboard data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
