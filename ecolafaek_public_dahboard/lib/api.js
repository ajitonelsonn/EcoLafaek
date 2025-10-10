// lib/api.js
import useSWR from "swr";
import axios from "axios";

// When running in development/production, api routes are available at /api
const API_BASE_URL = "/api";

// Axios instance with common configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Increase timeout to avoid hanging requests
  timeout: 60000, // Increased from 15000 to 60000 (1 minute)
});

// Global fetcher function for SWR with improved error handling
const fetcher = async (url) => {
  try {

    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {

    throw error;
  }
};

// Hook for stats overview with caching
export function useStatsOverview() {
  const { data, error, isValidating, mutate } = useSWR(
    "/stats/overview",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 3600000, // Cache for 1 hour
      refreshInterval: 3600000, // Refresh every 1 hour (increased)
      errorRetryCount: 2, // Reduced retry count to prevent excessive retries
      errorRetryInterval: 10000, // Increased retry interval
      // Ensure loading state is properly detected by SWR
      loadingTimeout: 3000, // Set a custom loading timeout (3 seconds)
      fallbackData: {
        total_reports: 0,
        status_counts: {},
        waste_type_counts: {},
        avg_severity: 0,
        priority_counts: {},
        hotspot_count: 0,
        daily_reports: [],
      },
    }
  );

  return {
    statsData: data,
    isLoading: isValidating, // Make sure this is just isValidating
    isError: error,
    refresh: () => mutate(),
  };
}

// Hook for map data with caching
export function useMapData(filters = {}) {
  // Create query string from filters
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryParams.append(key, value);
    }
  });

  const queryString = queryParams.toString();
  const url = `/map/reports${queryString ? `?${queryString}` : ""}`;

  const { data, error, isValidating, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 3600000, // Cache for 1 hour
    refreshInterval: 3600000, // Refresh every 1 hour (increased)
    errorRetryCount: 2, // Reduced retry count
    errorRetryInterval: 10000, // Increased retry interval
    loadingTimeout: 3000,
    fallbackData: { reports: [], hotspots: [] },
  });

  return {
    mapData: data,
    isLoading: isValidating,
    isError: error,
    refresh: () => mutate(),
  };
}

// Hook for reports with pagination and filtering
export function useReports(page = 1, perPage = 10, filters = {}) {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryParams.append(key, value.toString());
    }
  });

  const url = `/reports?${queryParams.toString()}`;

  const { data, error, isValidating, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 900000, // Cache for 15 minutes
    errorRetryCount: 2,
    errorRetryInterval: 10000,
    loadingTimeout: 3000,
    fallbackData: {
      reports: [],
      total: 0,
      page: page,
      per_page: perPage,
      total_pages: 1,
    },
  });

  return {
    reportsData: data,
    isLoading: isValidating,
    isError: error,
    refresh: () => mutate(),
  };
}

// Hook for waste types with long caching
export function useWasteTypes() {
  const { data, error, isValidating, mutate } = useSWR(
    "/waste-types",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 86400000, // Cache for 24 hours (waste types change very infrequently)
      errorRetryCount: 2,
      errorRetryInterval: 10000,
      loadingTimeout: 3000,
      fallbackData: [],
    }
  );

  return {
    wasteTypes: data,
    isLoading: isValidating,
    isError: error,
    refresh: () => mutate(),
  };
}

// Hook for hotspots
export function useHotspots() {
  const { data, error, isValidating, mutate } = useSWR("/hotspots", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 3600000, // Cache for 1 hour
    refreshInterval: 3600000, // Refresh every 1 hour (increased)
    errorRetryCount: 2,
    errorRetryInterval: 10000,
    loadingTimeout: 3000,
    fallbackData: [],
  });

  return {
    hotspots: data,
    isLoading: isValidating,
    isError: error,
    refresh: () => mutate(),
  };
}

// Hook for hotspot reports
export function useHotspotReports(hotspotId) {
  const { data, error, isValidating, mutate } = useSWR(
    hotspotId ? `/hotspots/${hotspotId}/reports` : null, // Only fetch if we have an ID
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 1800000, // Cache for 30 minutes
      errorRetryCount: 2,
      errorRetryInterval: 10000,
      loadingTimeout: 3000,
      fallbackData: { hotspot: null, reports: [] },
    }
  );

  return {
    hotspotReports: data,
    isLoading: isValidating,
    isError: error,
    refresh: () => mutate(),
  };
}

// Hook for trends - days is optional, omitting it fetches all-time data
export function useTrends(period = "daily", days = null) {
  const url = days
    ? `/stats/trends?period=${period}&days=${days}`
    : `/stats/trends?period=${period}`;

  const { data, error, isValidating, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 3600000, // Cache for 1 hour
    refreshInterval: 3600000, // Refresh every 1 hour
    errorRetryCount: 2,
    errorRetryInterval: 10000,
    loadingTimeout: 3000,
    fallbackData: {
      report_trends: [],
      waste_type_trends: [],
      priority_trends: [],
    },
  });

  return {
    trendData: data,
    isLoading: isValidating,
    isError: error,
    refresh: () => mutate(),
  };
}

// Hook for location stats
export function useLocationStats() {
  const { data, error, isValidating, mutate } = useSWR(
    "/stats/by-location",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 3600000, // Cache for 1 hour
      refreshInterval: 3600000, // Refresh every 1 hour
      errorRetryCount: 2,
      errorRetryInterval: 10000,
      loadingTimeout: 3000,
      fallbackData: [],
    }
  );

  return {
    locationStats: data,
    isLoading: isValidating,
    isError: error,
    refresh: () => mutate(),
  };
}
// Hook for leaderboard data with pagination and filtering
export function useLeaderboard(page = 1, perPage = 10, filters = {}) {
  const queryParams = new URLSearchParams({ page, per_page: perPage });

  // Add filter parameters
  if (filters.onlyValidReports) {
    queryParams.append("valid_only", "true");
  }

  if (filters.timeRange && filters.timeRange !== "all") {
    queryParams.append("time_range", filters.timeRange);
  }

  if (filters.searchTerm) {
    queryParams.append("search", filters.searchTerm);
  }

  const url = `/leaderboard?${queryParams.toString()}`;

  const { data, error, isValidating, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 minutes
  });

  return {
    leaderboardData: data,
    isLoading: isValidating && !data,
    isError: error,
    refresh: () => mutate(),
  };
}
// Function for direct API calls (when hooks aren't suitable)
export async function fetchAPI(endpoint, params = {}) {
  try {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value.toString());
      }
    });

    const url = `${endpoint}${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;


    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    throw error;
  }
}
