import { NextApiResponse } from 'next';

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface ApiSuccess<T = any> {
  success: true;
  data?: T;
  stats?: any;
  metadata?: any;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  timestamp: string;
}

export function sendError(
  res: NextApiResponse,
  status: number,
  message: string,
  code?: string,
  details?: any
): void {
  const errorResponse: ApiErrorResponse = {
    success: false,
    error: {
      message,
      code,
      details: process.env.NODE_ENV === 'development' ? details : undefined
    },
    timestamp: new Date().toISOString()
  };

  res.status(status).json(errorResponse);
}

export function sendSuccess<T>(
  res: NextApiResponse,
  data?: T,
  stats?: any,
  metadata?: any
): void {
  const successResponse: ApiSuccess<T> = {
    success: true,
    ...(data && { data }),
    ...(stats && { stats }),
    ...(metadata && { metadata })
  };

  res.status(200).json(successResponse);
}

export function validateRequired(fields: Record<string, any>): string | null {
  for (const [fieldName, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === '') {
      return `${fieldName} is required`;
    }
  }
  return null;
}

export function validateReportId(reportId: any): number | null {
  const id = parseInt(String(reportId));
  return !isNaN(id) && id > 0 ? id : null;
}

export function validateLimit(limit: any, max: number = 50): number {
  const parsed = parseInt(String(limit)) || 10;
  return Math.max(1, Math.min(max, parsed));
}

export function validateThreshold(threshold: any): number {
  const parsed = parseFloat(String(threshold));
  return !isNaN(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0.7;
}