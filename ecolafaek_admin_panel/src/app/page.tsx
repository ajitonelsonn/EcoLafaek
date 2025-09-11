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
  Database,
  Brain,
  Target,
} from "lucide-react";

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
  // 🏆 TiDB Vector Database Fields
  total_embeddings: number;
  avg_ai_confidence: number;
  vector_processing_rate: number;
  location_embeddings_count: number;
  // 🏆 Real Growth Metrics
  users_growth: number; // vs last month
  reports_growth: number; // vs last month
  hotspots_growth: number; // vs last month
  reports_today_growth: number; // vs yesterday
  embeddings_growth: number; // vs last month
  location_embeddings_growth: number; // vs last month
  confidence_growth: number; // vs last month
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

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
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
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      Dashboard
                    </h1>
                    <p className="text-gray-600 mt-2">
                      Environmental waste monitoring overview
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Today</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {new Date().toLocaleDateString()}
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

              {/* 🏆 TiDB Vector Database Integration Section */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Database className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">TiDB Vector Database Analytics</h2>
                    <p className="text-sm text-gray-600">AI-powered analysis with 1024-dimensional embeddings</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <ModernMetricCard
                    title="Vector Embeddings"
                    value={stats?.total_embeddings || 0}
                    subtitle="AI-generated embeddings"
                    icon={Database}
                    color="text-orange-600"
                    gradient="from-orange-500 to-red-600"
                    percentage={stats?.embeddings_growth || 0}
                  />

                  <ModernMetricCard
                    title="AI Confidence"
                    value={`${stats?.avg_ai_confidence || 0}%`}
                    subtitle="Analysis accuracy"
                    icon={Brain}
                    color="text-purple-600"
                    gradient="from-purple-500 to-indigo-600"
                    percentage={stats?.confidence_growth || 0}
                  />

                  <ModernMetricCard
                    title="Processing Rate"
                    value={`${stats?.vector_processing_rate || 0}%`}
                    subtitle="Embeddings success rate"
                    icon={Target}
                    color="text-green-600"
                    gradient="from-green-500 to-emerald-600"
                    percentage={stats?.vector_processing_rate || 0}
                  />

                  <ModernMetricCard
                    title="Location Embeddings"
                    value={stats?.location_embeddings_count || 0}
                    subtitle="Spatial AI analysis"
                    icon={MapPin}
                    color="text-blue-600"
                    gradient="from-blue-500 to-cyan-600"
                    percentage={stats?.location_embeddings_growth || 0}
                  />
                </div>
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

                {/* 🏆 TiDB Vector Analytics */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Database className="h-5 w-5 text-orange-600" />
                      Vector Analytics
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      TiDB AI embeddings insights
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4 py-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <Brain className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            AI Embeddings
                          </p>
                          <p className="text-xs text-gray-500">1024-dimensional</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-orange-600">
                        {stats?.total_embeddings || 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Target className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Confidence
                          </p>
                          <p className="text-xs text-gray-500">AI accuracy</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-purple-600">
                        {stats?.avg_ai_confidence || 0}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Processing
                          </p>
                          <p className="text-xs text-gray-500">Success rate</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-green-600">
                        {stats?.vector_processing_rate || 0}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

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
