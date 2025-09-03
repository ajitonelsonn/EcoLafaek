// pages/index.js
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import Layout from "../components/Layout";
import {
  useStatsOverview,
  useMapData,
  useReports,
  useTrends,
} from "../lib/api";
import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  Calendar,
  MapPin,
  AlertTriangle,
  RefreshCw,
  Filter,
  Layers,
  BarChart2,
} from "lucide-react";

// Import the custom components we created
import ModernTrendChart from "../components/TrendChart";
import ModernWasteTypeDistribution from "../components/WasteTypeDistribution";

// Loading components
const LoadingAnimation = ({ text = "Loading data...", size = "md" }) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} border-b-2 border-emerald-500 mb-2`}
      ></div>
      <p className="text-emerald-600 font-medium">{text}</p>
    </div>
  );
};

const SkeletonCard = () => (
  <div className="bg-white rounded-xl p-5 shadow-sm animate-pulse">
    <div className="flex justify-between items-start">
      <div className="p-2 rounded-lg bg-gray-100 h-10 w-10"></div>
      <div className="h-6 bg-gray-100 rounded w-16"></div>
    </div>
    <div className="mt-4">
      <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-gray-100 rounded w-3/4"></div>
    </div>
  </div>
);

const SkeletonHotspot = () => (
  <div className="border border-red-100 rounded-lg p-4 bg-red-50 animate-pulse">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center">
        <div className="h-10 w-10 bg-red-200 rounded-full"></div>
        <div className="ml-3">
          <div className="h-5 bg-red-200 rounded w-32"></div>
          <div className="h-4 bg-red-200 rounded w-24 mt-1"></div>
        </div>
      </div>
    </div>
    <div className="mt-2 flex justify-between">
      <div className="h-4 bg-red-200 rounded w-20"></div>
      <div className="h-4 bg-red-200 rounded w-16"></div>
    </div>
  </div>
);

// Dynamically import map component to prevent SSR issues
const DynamicMap = dynamic(() => import("../components/Map"), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

// Placeholder for map when loading
const MapPlaceholder = () => (
  <div className="bg-gray-50 rounded-xl h-full w-full flex items-center justify-center">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
      <p className="text-emerald-600 font-medium text-lg">
        Loading map data...
      </p>
      <p className="text-gray-500 mt-2">
        Please wait while we prepare the data
      </p>
    </div>
  </div>
);

export default function ModernDashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState("daily");
  const [activeSummary, setActiveSummary] = useState("reports");
  const [initialLoad, setInitialLoad] = useState(true);

  // Use custom hooks with caching
  const {
    statsData,
    isLoading: statsLoading,
    refresh: refreshStats,
  } = useStatsOverview();
  const { mapData, isLoading: mapLoading, refresh: refreshMap } = useMapData();
  const {
    reportsData,
    isLoading: reportsLoading,
    refresh: refreshReports,
  } = useReports(1, 5);
  const {
    trendData,
    isLoading: trendLoading,
    refresh: refreshTrends,
  } = useTrends(selectedTrend, 30);

  // Log loading states for debugging
  useEffect(() => {
    console.log("Loading states:", {
      statsLoading,
      mapLoading,
      reportsLoading,
      trendLoading,
    });
  }, [statsLoading, mapLoading, reportsLoading, trendLoading]);

  // Mark as loaded after initial data fetch
  useEffect(() => {
    if (statsData && mapData && reportsData && trendData && initialLoad) {
      setInitialLoad(false);
    }
  }, [statsData, mapData, reportsData, trendData, initialLoad]);

  // Combined loading state
  const isLoading =
    statsLoading || mapLoading || reportsLoading || trendLoading;

  // Function to refresh all data
  const refreshAllData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshStats(),
        refreshMap(),
        refreshReports(),
        refreshTrends(),
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Format date for better display
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Extract data for easier access
  const summaryStats = statsData
    ? {
        reports: {
          count: statsData.total_reports || 0,
          label: "Total Reports",
          icon: <Layers className="w-6 h-6 text-blue-500" />,
          color: "blue",
        },
        hotspots: {
          count: statsData.hotspot_count || 0,
          label: "Active Hotspots",
          icon: <MapPin className="w-6 h-6 text-green-500" />, // Changed from red to green
          color: "green", // Changed from red to green
        },
        severity: {
          count: statsData.avg_severity
            ? statsData.avg_severity.toFixed(1) + "/10"
            : "N/A",
          label: "Avg. Severity",
          icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
          color: "amber",
        },
        types: {
          count: Object.keys(statsData.waste_type_counts || {}).length,
          label: "Waste Types",
          icon: <BarChart2 className="w-6 h-6 text-green-500" />, // Changed from emerald to green
          color: "green", // Changed from emerald to green
        },
      }
    : null;

  const recentReports = reportsData?.reports || [];
  const wasteTypeData = statsData?.waste_type_counts || {};
  const hotspots = mapData?.hotspots || [];
  const trendingData =
    trendData?.report_trends || statsData?.daily_reports || [];

  // Show full-page loading state on initial load
  if (initialLoad && isLoading) {
    return (
      <Layout>
        <div className="fixed inset-0 bg-white bg-opacity-90 z-50 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent mb-6"></div>
          <h2 className="text-2xl font-bold text-emerald-700 mb-2">
            Loading Dashboard
          </h2>
          <p className="text-gray-600">
            Please wait while we fetch the latest data...
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>EcoLafaek | Modern Dashboard</title>
        <meta
          name="description"
          content="Digital Waste Monitoring Network for Timor-Leste"
        />
      </Head>

      <div className="px-6 py-8 max-w-7xl mx-auto">
        {/* Dashboard Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-emerald-700 mb-1">
              Waste Monitoring Dashboard
            </h1>
            <p className="text-gray-600">
              Real-time waste management data for Timor-Leste
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg font-medium border border-emerald-200 shadow-sm">
              <span className="hidden md:inline">Public</span> Dashboard
            </div>
            <button
              onClick={refreshAllData}
              disabled={refreshing || isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm transition-colors"
            >
              {refreshing || isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
        </div>

        {/* Refreshing indicator */}
        {(refreshing || isLoading) && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-6 flex items-center shadow-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500 mr-3"></div>
            <span className="text-sm text-emerald-700">
              {refreshing
                ? "Refreshing dashboard data..."
                : "Loading dashboard data..."}
            </span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {statsLoading
            ? // Skeleton loaders for stats
              [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
            : // Actual stats cards
              summaryStats &&
              Object.entries(summaryStats).map(([key, stat]) => {
                // Handle color classes separately to avoid Tailwind purge issues
                const ringClass = `ring-${stat.color}-400`;
                const bgClass = `bg-${stat.color}-100`;
                const textClass = `text-${stat.color}-800`;

                return (
                  <div
                    key={key}
                    className={`bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                      activeSummary === key ? `ring-2 ${ringClass}` : ""
                    }`}
                    onClick={() => setActiveSummary(key)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="p-2 rounded-lg bg-gray-50">
                        {stat.icon}
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgClass} ${textClass}`}
                      >
                        {key === "reports" ? "Last 30 days" : ""}
                        {key === "hotspots" ? "Active" : ""}
                        {key === "severity" ? "Scale 1-10" : ""}
                        {key === "types" ? "Categories" : ""}
                      </span>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-3xl font-bold text-gray-900">
                        {stat.count}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
                    </div>
                  </div>
                );
              })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Map Section - Takes 2/3 of the width */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Waste Distribution Map
                </h2>
              </div>
              <Link
                href="/map"
                className="text-sm text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
              >
                View Full Map <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            {/* Increased height with min-height for better display */}
            <div className="h-[550px] min-h-[500px] w-full">
              {mapLoading ? (
                <MapPlaceholder />
              ) : (
                <DynamicMap data={mapData} simplified={true} />
              )}
            </div>
          </div>

          {/* Recent Reports - Takes 1/3 of the width */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Recent Reports
              </h2>
              <Link
                href="/reports"
                className="text-sm text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
              >
                View All <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="overflow-hidden">
              {reportsLoading ? (
                <div className="animate-pulse">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="p-4 border-b border-gray-100">
                      <div className="flex justify-between mb-2">
                        <div className="h-5 bg-gray-200 rounded w-16"></div>
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="h-5 bg-gray-200 rounded-full w-16"></div>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="h-3 bg-gray-200 rounded w-12"></div>
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5"></div>
                          <div className="h-3 bg-gray-200 rounded w-8"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentReports.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {recentReports.map((report) => (
                    <div
                      key={report.report_id}
                      className="p-4 hover:bg-gray-50"
                    >
                      <div className="flex justify-between">
                        <Link
                          href={`/reports/${report.report_id}`}
                          className="text-emerald-600 hover:text-emerald-800 font-medium"
                        >
                          #{report.report_id}
                        </Link>
                        <span className="text-xs text-gray-500">
                          {formatDate(report.report_date)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm text-gray-600 truncate max-w-[60%]">
                          {report.waste_type || "Unknown waste type"}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${
                            report.status === "resolved"
                              ? "bg-green-100 text-green-800"
                              : report.status === "analyzed"
                              ? "bg-blue-100 text-blue-800"
                              : report.status === "analyzing"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>
                      {report.severity_score && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              Severity:
                            </span>
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${
                                  report.severity_score > 7
                                    ? "bg-red-500"
                                    : report.severity_score > 4
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                }`}
                                style={{
                                  width: `${report.severity_score * 10}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium">
                              {report.severity_score}/10
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <p className="text-gray-500">No recent reports available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Second Content Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Trends Section */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-emerald-600" />
                  Report Trends
                </h2>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setSelectedTrend("daily")}
                    className={`px-3 py-1 text-xs rounded-lg ${
                      selectedTrend === "daily"
                        ? "bg-emerald-100 text-emerald-800 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setSelectedTrend("weekly")}
                    className={`px-3 py-1 text-xs rounded-lg ${
                      selectedTrend === "weekly"
                        ? "bg-emerald-100 text-emerald-800 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setSelectedTrend("monthly")}
                    className={`px-3 py-1 text-xs rounded-lg ${
                      selectedTrend === "monthly"
                        ? "bg-emerald-100 text-emerald-800 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4">
              {trendLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <LoadingAnimation text="Generating trend chart..." />
                </div>
              ) : trendingData && trendingData.length > 0 ? (
                <div className="h-64">
                  <ModernTrendChart data={trendingData} />
                </div>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <p className="text-gray-500">No trend data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Waste Types Distribution */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-emerald-600" />
                  Waste Type Distribution
                </h2>
              </div>
            </div>
            <div className="p-4">
              {statsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <LoadingAnimation text="Generating distribution chart..." />
                </div>
              ) : Object.keys(wasteTypeData).length > 0 ? (
                <div className="h-64">
                  <ModernWasteTypeDistribution data={wasteTypeData} />
                </div>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <p className="text-gray-500">No waste type data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hotspots Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-semibold text-gray-800">
                Active Waste Hotspots
              </h2>
            </div>
            <Link
              href="/hotspots"
              className="text-sm text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
            >
              View All Hotspots <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-4">
            {mapLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <SkeletonHotspot key={i} />
                ))}
              </div>
            ) : hotspots.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hotspots.slice(0, 6).map((hotspot) => (
                  <Link
                    key={hotspot.hotspot_id}
                    href={`/hotspots?id=${hotspot.hotspot_id}`}
                    className="block"
                  >
                    <div className="border border-red-100 rounded-lg p-4 bg-red-50 hover:bg-red-100 transition-colors duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                            {hotspot.total_reports}
                          </div>
                          <div className="ml-3">
                            <h3 className="text-lg font-medium text-red-800 truncate max-w-[200px]">
                              {hotspot.name}
                            </h3>
                            <div className="text-sm text-red-600">
                              Active since {formatDate(hotspot.first_reported)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between">
                        <div className="text-sm text-red-700">
                          {hotspot.average_severity && (
                            <span>
                              Severity:{" "}
                              {parseFloat(hotspot.average_severity).toFixed(1)}
                              /10
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-red-700">
                          Radius:{" "}
                          {(parseFloat(hotspot.radius_meters) / 1000).toFixed(
                            1
                          )}
                          km
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                No active hotspots found
              </div>
            )}
          </div>
        </div>

        {/* Footer Banner */}
        <div className="mt-8 bg-green-50 rounded-xl p-6 shadow-sm border border-green-100">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-green-800 mb-2">
                Help Keep Timor-Leste Clean
              </h3>
              <p className="text-green-700">
                Report waste incidents and help track environmental impact in
                your community
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/download"
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm transition-colors text-center"
              >
                Submit a Report
              </Link>
              <Link
                href="/about"
                className="px-5 py-2.5 bg-white text-green-600 border border-green-200 rounded-lg hover:bg-green-50 font-medium shadow-sm transition-colors text-center"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
