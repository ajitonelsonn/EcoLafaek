"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  FileText,
  MapPin,
  CheckCircle,
  TrendingUp,
  Activity,
  Calendar,
  RefreshCw,
  Download,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCSV, exportToJSON } from "@/lib/export";

interface DashboardStats {
  total_users: number;
  total_reports: number;
  reports_today: number;
  reports_this_week: number;
  reports_this_month: number;
  active_hotspots: number;
  resolved_reports: number;
  pending_reports: number;
  average_severity: number;
  top_waste_types: Array<{
    name: string;
    count: number;
  }>;
  // Real Growth Metrics
  users_growth: number; // vs last month
  reports_growth: number; // vs last month
  hotspots_growth: number; // vs last month
  reports_today_growth: number; // vs yesterday
}

interface RecentReport {
  report_id: number;
  report_date: string;
  status: string;
  username: string;
  waste_type_name?: string;
}

// Circular Progress Component
const CircularProgress = ({
  percentage,
  size = 120,
  strokeWidth = 8,
  color = "#10b981",
  backgroundColor = "#f3f4f6",
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-in-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(percentage)}%
          </div>
          <div className="text-xs text-gray-500">Complete</div>
        </div>
      </div>
    </div>
  );
};

// Modern Metric Card
const ModernMetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  gradient,
  percentage,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
  percentage?: number;
}) => (
  <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
    <div
      className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5`}
    />
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl bg-gradient-to-br ${gradient}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {percentage !== undefined && (
          <div className="text-right">
            <div className={`text-sm font-semibold ${color}`}>
              +{percentage}%
            </div>
            <div className="text-xs text-gray-500">vs last month</div>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-2xl font-bold text-gray-900">
          {typeof value === "number" ? value.toLocaleString() : value}
        </h3>
        <p className="text-gray-600 font-medium">{title}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </CardContent>
  </Card>
);

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    submitted: "bg-blue-100 text-blue-800 border-blue-200",
    analyzing: "bg-yellow-100 text-yellow-800 border-yellow-200",
    analyzed: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold border ${
        styles[status as keyof typeof styles] ||
        "bg-gray-100 text-gray-800 border-gray-200"
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRecentReports(data.recent_reports || []);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const completionRate = stats
    ? Math.round((stats.resolved_reports / stats.total_reports) * 100)
    : 0;

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="p-8">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                      Dashboard
                    </h1>
                    <p className="text-gray-600 mt-2 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Environmental waste monitoring overview
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchDashboardData}
                      disabled={loading}
                      className="shadow-sm hover:shadow-md transition-all"
                    >
                      <RefreshCw
                        className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                      />
                      Refresh
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        stats && exportToJSON({ stats, recentReports }, "dashboard_data")
                      }
                      disabled={!stats}
                      className="shadow-sm hover:shadow-md transition-all"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <div className="text-right px-4 py-2 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <div className="text-xs text-green-600 font-medium">Today</div>
                      <div className="text-sm font-bold text-green-900">
                        {new Date().toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <ModernMetricCard
                  title="Total Users"
                  value={stats?.total_users || 0}
                  subtitle="Registered users"
                  icon={Users}
                  color="text-blue-600"
                  gradient="from-blue-500 to-blue-600"
                  percentage={stats?.users_growth || 0}
                />

                <ModernMetricCard
                  title="Total Reports"
                  value={stats?.total_reports || 0}
                  subtitle="All submissions"
                  icon={FileText}
                  color="text-green-600"
                  gradient="from-green-500 to-emerald-600"
                  percentage={stats?.reports_growth || 0}
                />

                <ModernMetricCard
                  title="Active Hotspots"
                  value={stats?.active_hotspots || 0}
                  subtitle="Areas requiring attention"
                  icon={MapPin}
                  color="text-red-600"
                  gradient="from-red-500 to-pink-600"
                  percentage={stats?.hotspots_growth || 0}
                />

                <ModernMetricCard
                  title="Reports Today"
                  value={stats?.reports_today || 0}
                  subtitle="New submissions"
                  icon={TrendingUp}
                  color="text-purple-600"
                  gradient="from-purple-500 to-indigo-600"
                  percentage={stats?.reports_today_growth || 0}
                />
              </div>

              {/* Progress and Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Completion Rate */}
                <Card className="border-0 shadow-lg bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Report Resolution
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Total completion rate
                    </p>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center py-8">
                    <CircularProgress
                      percentage={completionRate}
                      color="#10b981"
                      size={140}
                      strokeWidth={10}
                    />
                  </CardContent>
                </Card>

                {/* Activity Stats */}
                <Card className="border-0 shadow-lg bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Activity Overview
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Recent activity metrics
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            This Week
                          </p>
                          <p className="text-xs text-gray-500">New reports</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-gray-900">
                        {stats?.reports_this_week || 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Resolved
                          </p>
                          <p className="text-xs text-gray-500">
                            Completed reports
                          </p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-green-600">
                        {stats?.resolved_reports || 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <Activity className="h-4 w-4 text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Pending
                          </p>
                          <p className="text-xs text-gray-500">
                            Awaiting review
                          </p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-yellow-600">
                        {stats?.pending_reports || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Insights */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-900 mb-1">
                            This Month
                          </p>
                          <p className="text-3xl font-bold text-blue-900">
                            {stats.reports_this_month || 0}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            New reports submitted
                          </p>
                        </div>
                        <div className="p-4 bg-blue-500 rounded-full">
                          <BarChart3 className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-900 mb-1">
                            Avg Severity
                          </p>
                          <p className="text-3xl font-bold text-green-900">
                            {stats.average_severity?.toFixed(1) || "0.0"}/10
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            Across all reports
                          </p>
                        </div>
                        <div className="p-4 bg-green-500 rounded-full">
                          <Activity className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-900 mb-1">
                            This Week
                          </p>
                          <p className="text-3xl font-bold text-purple-900">
                            {stats.reports_this_week || 0}
                          </p>
                          <p className="text-xs text-purple-600 mt-1">
                            Reports in last 7 days
                          </p>
                        </div>
                        <div className="p-4 bg-purple-500 rounded-full">
                          <Calendar className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Top Waste Types */}
              {stats?.top_waste_types && stats.top_waste_types.length > 0 && (
                <Card className="mb-8 border-0 shadow-lg bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Top Waste Types
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Most reported waste categories
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stats.top_waste_types.map((type, index) => {
                        const percentage =
                          stats.total_reports > 0
                            ? (type.count / stats.total_reports) * 100
                            : 0;
                        const colors = [
                          "from-blue-500 to-blue-600",
                          "from-green-500 to-emerald-600",
                          "from-yellow-500 to-orange-600",
                          "from-purple-500 to-indigo-600",
                          "from-pink-500 to-rose-600",
                        ];

                        return (
                          <div
                            key={type.name}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-4 flex-1">
                              <div
                                className={`w-3 h-3 rounded-full bg-gradient-to-r ${
                                  colors[index % colors.length]
                                }`}
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-900">
                                    {type.name}
                                  </span>
                                  <span className="text-sm font-semibold text-gray-700">
                                    {type.count} reports
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 bg-gradient-to-r ${
                                      colors[index % colors.length]
                                    } rounded-full transition-all duration-1000`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Reports */}
              {recentReports.length > 0 && (
                <Card className="border-0 shadow-lg bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Recent Reports
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Latest submissions from users
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentReports.slice(0, 5).map((report) => (
                        <div
                          key={report.report_id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {report.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                Report #{report.report_id}
                              </p>
                              <p className="text-xs text-gray-500">
                                by {report.username}
                              </p>
                              {report.waste_type_name && (
                                <p className="text-xs text-blue-600 font-medium">
                                  {report.waste_type_name}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right space-y-2">
                            <StatusBadge status={report.status} />
                            <p className="text-xs text-gray-500">
                              {new Date(
                                report.report_date
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
