// pages/hotspot-reports.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useHotspotReports } from "../lib/api";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  AlertTriangle,
  FileText,
  Loader,
  RefreshCw,
  Info,
} from "lucide-react";
import ModernLayout from "../components/Layout";

export default function HotspotReportsPage() {
  const router = useRouter();
  const { hotspot_id } = router.query;
  const [refreshing, setRefreshing] = useState(false);

  const { hotspotReports, isLoading, isError, refresh } =
    useHotspotReports(hotspot_id);

  const hotspot = hotspotReports?.hotspot;
  const reports = hotspotReports?.reports || [];

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.error("Error refreshing reports:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Format date
  function formatDate(dateString) {
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  // Get severity color class
  function getSeverityColorClass(score) {
    const numScore = parseFloat(score);
    if (numScore >= 7) return "text-red-700 bg-red-100";
    if (numScore >= 4) return "text-amber-700 bg-amber-100";
    return "text-green-700 bg-green-100";
  }

  // Get status badge
  function getStatusBadge(status) {
    const statusConfig = {
      resolved: {
        bg: "bg-green-100",
        text: "text-green-800",
        label: "Resolved",
      },
      analyzed: { bg: "bg-blue-100", text: "text-blue-800", label: "Analyzed" },
      analyzing: {
        bg: "bg-purple-100",
        text: "text-purple-800",
        label: "Analyzing",
      },
      rejected: { bg: "bg-red-100", text: "text-red-800", label: "Rejected" },
      submitted: {
        bg: "bg-gray-100",
        text: "text-gray-800",
        label: "Submitted",
      },
    };

    const config = statusConfig[status] || statusConfig.submitted;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        {config.label}
      </span>
    );
  }

  if (isLoading) {
    return (
      <ModernLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-12 h-12 animate-spin text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading hotspot reports...</p>
          </div>
        </div>
      </ModernLayout>
    );
  }

  if (isError || !hotspot) {
    return (
      <ModernLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Hotspot Not Found
            </h2>
            <p className="text-gray-600 mb-6">
              The requested hotspot could not be found or an error occurred.
            </p>
            <Link
              href="/hotspots"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Hotspots
            </Link>
          </div>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout>
      <Head>
        <title>{hotspot.name} - Reports | EcoLafaek</title>
        <meta
          name="description"
          content={`All reports for ${hotspot.name} hotspot`}
        />
      </Head>

      <div className="px-6 py-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/hotspots"
            className="inline-flex items-center gap-2 text-red-600 hover:text-red-800 font-medium mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Hotspots
          </Link>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                {hotspot.name}
              </h1>
              <p className="text-gray-600">All waste reports in this hotspot</p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Hotspot Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Hotspot Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
              <h3 className="text-xs font-medium text-red-700 uppercase tracking-wider mb-1">
                Total Reports
              </h3>
              <div className="text-2xl font-bold text-gray-900">
                {hotspot.total_reports}
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
              <h3 className="text-xs font-medium text-red-700 uppercase tracking-wider mb-1">
                Average Severity
              </h3>
              <div className="text-2xl font-bold text-gray-900">
                {parseFloat(hotspot.average_severity).toFixed(1)}/10
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
              <h3 className="text-xs font-medium text-red-700 uppercase tracking-wider mb-1">
                Radius
              </h3>
              <div className="text-2xl font-bold text-gray-900">
                {(parseFloat(hotspot.radius_meters) / 1000).toFixed(1)} km
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
              <h3 className="text-xs font-medium text-red-700 uppercase tracking-wider mb-1">
                First Reported
              </h3>
              <div className="text-lg font-bold text-gray-900">
                {new Date(hotspot.first_reported).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900">
                All Reports ({reports.length})
              </h2>
            </div>
          </div>

          {reports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Image
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Waste Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr
                      key={report.report_id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {report.image_url ? (
                          <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                            <img
                              src={report.image_url}
                              alt="Report"
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {formatDate(report.report_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                          {report.latitude.toFixed(4)},{" "}
                          {report.longitude.toFixed(4)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {report.waste_type || "Unknown"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {report.severity_score ? (
                          <span
                            className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getSeverityColorClass(
                              report.severity_score
                            )}`}
                          >
                            {report.severity_score}/10
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(report.status)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 max-w-xs truncate">
                          {report.description || "No description"}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <FileText className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Reports Found
              </h3>
              <p className="text-gray-500 text-center max-w-md">
                There are no reports associated with this hotspot yet.
              </p>
            </div>
          )}
        </div>

        {/* Information Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                About This Hotspot
              </h3>
              <p className="text-blue-800 text-sm leading-relaxed">
                This page shows all waste reports that have been identified
                within the <strong>{hotspot.name}</strong> hotspot area. Reports
                are automatically grouped into hotspots based on geographic
                proximity and severity patterns to help identify areas requiring
                immediate attention.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ModernLayout>
  );
}
