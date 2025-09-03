// lib/utils.ts
import { NextApiRequest } from "next";

export function formatDate(date: Date | string): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toISOString().split("T")[0];
}

export function formatDateTime(date: Date | string): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toISOString().replace("T", " ").substring(0, 19);
}

export function parseRequestQuery(
  req: NextApiRequest,
  field: string,
  defaultValue: any = undefined
): any {
  const value = req.query[field];
  if (value === undefined) return defaultValue;

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function parseIntParam(
  req: NextApiRequest,
  field: string,
  defaultValue: number
): number {
  const value = parseRequestQuery(req, field, defaultValue.toString());
  const parsed = parseInt(value as string, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function buildDateRangeCondition(days: number): {
  condition: string;
  date: Date;
} {
  if (days <= 0) {
    return { condition: "", date: new Date() };
  }

  const date = new Date();
  date.setDate(date.getDate() - days);
  return {
    condition: "r.report_date >= ?",
    date,
  };
}

export function getPaginationParams(req: NextApiRequest): {
  page: number;
  perPage: number;
  offset: number;
} {
  const page = parseIntParam(req, "page", 1);
  const perPage = parseIntParam(req, "per_page", 10);
  const offset = (page - 1) * perPage;

  return { page, perPage, offset };
}

export function getFilterConditions(req: NextApiRequest): {
  conditions: string[];
  params: any[];
} {
  const conditions: string[] = [];
  const params: any[] = [];

  const status = parseRequestQuery(req, "status");
  const wasteType = parseRequestQuery(req, "waste_type");
  const priority = parseRequestQuery(req, "priority");
  const severity = parseRequestQuery(req, "severity");

  if (status) {
    conditions.push("r.status = ?");
    params.push(status);
  }

  if (wasteType) {
    conditions.push("w.name = ?");
    params.push(wasteType);
  }

  if (priority) {
    conditions.push("a.priority_level = ?");
    params.push(priority);
  }

  if (severity) {
    if (severity === "high") {
      conditions.push("a.severity_score >= 7");
    } else if (severity === "medium") {
      conditions.push("a.severity_score >= 4 AND a.severity_score < 7");
    } else if (severity === "low") {
      conditions.push("a.severity_score < 4");
    }
  }

  return { conditions, params };
}

export function buildCaseInsensitiveSearchCondition(
  field: string,
  term: string
): string {
  return `LOWER(${field}) LIKE LOWER(?)`;
}
