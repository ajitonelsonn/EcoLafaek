// pages/reports/[id].js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import ModernLayout from "../../components/Layout";
import { fetchAPI } from "../../lib/api";
import { ArrowLeft, MapPin, Calendar, AlertTriangle } from "lucide-react";

export default function ReportDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only fetch data when ID is available (after hydration)
    if (id) {
      setLoading(true);
      fetchAPI(`/reports/${id}`)
        .then((data) => {
          setReport(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching report:", err);
          setError("Failed to load report details");
          setLoading(false);
        });
    }
  }, [id]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get status badge
  const getStatusBadge = (status) => {
    let bgColor, textColor;

    switch (status) {
      case "resolved":
        bgColor = "bg-green-100";
        textColor = "text-green-800";
        break;
      case "analyzed":
        bgColor = "bg-blue-100";
        textColor = "text-blue-800";
        break;
      case "analyzing":
        bgColor = "bg-purple-100";
        textColor = "text-purple-800";
        break;
      case "rejected":
        bgColor = "bg-red-100";
        textColor = "text-red-800";
        break;
      default:
        bgColor = "bg-gray-100";
        textColor = "text-gray-800";
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
      >
        {status}
      </span>
    );
  };

  return (
    <ModernLayout>
      <Head>
        <title>
          {loading
            ? "Loading Report..."
            : report
            ? `Report #${id}`
            : "Report Not Found"}{" "}
          | EcoLafaek
        </title>
        <meta name="description" content="Detailed waste report information" />
      </Head>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Back button and header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-emerald-600 hover:text-emerald-800 flex items-center mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {loading
              ? "Loading Report..."
              : report
              ? `Report #${id}`
              : "Report Not Found"}
          </h1>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm p-8 flex justify-center">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-100 border-t-emerald-500 mb-4"></div>
              <p className="text-emerald-600 font-medium">
                Loading report details...
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="bg-red-50 rounded-lg p-6 mb-6">
            <h2 className="text-red-800 font-medium mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => router.push("/reports")}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Return to Reports List
            </button>
          </div>
        )}

        {/* Report content */}
        {report && !loading && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Report header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-bold text-gray-900">
                      Report #{id}
                    </h2>
                    {getStatusBadge(report.status)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Reported on {formatDate(report.report_date)}
                  </div>
                </div>

                <Link
                  href={`/map?report=${id}`}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 inline-flex items-center"
                >
                  <MapPin className="w-4 h-4 mr-1" />
                  View on Map
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6">
              {/* Left column - Details */}
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Report Details
                  </h3>

                  {report.description || report.full_description ? (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Description
                      </h4>
                      <p className="text-gray-600">{report.description}</p>

                      {report.full_description && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            Full Analysis Description
                          </h4>
                          <p className="text-gray-600">
                            {report.full_description}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">
                      No description provided
                    </p>
                  )}

                  {/* Location */}
                  {report.latitude && report.longitude && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Location
                      </h4>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                        <span>
                          {parseFloat(report.latitude).toFixed(6)},{" "}
                          {parseFloat(report.longitude).toFixed(6)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Image if available */}
                {report.image_url && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Report Image
                    </h3>
                    <div className="rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={report.image_url}
                        alt="Waste report"
                        className="w-full h-auto"
                        onError={(e) => {
                          e.target.src =
                            "https://via.placeholder.com/800x500?text=Image+Not+Available";
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right column - Analysis Results */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Analysis Results
                  </h3>

                  {/* Waste Type */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">
                      Waste Type
                    </h4>
                    <p className="text-gray-900 font-medium">
                      {report.waste_type || "Unknown"}
                    </p>
                  </div>

                  {/* Severity Score */}
                  {report.severity_score !== null &&
                    report.severity_score !== undefined && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">
                          Severity Score
                        </h4>
                        <div className="flex items-center gap-3">
                          <div className="text-xl font-bold text-gray-900">
                            {report.severity_score}/10
                          </div>
                          <div
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              report.severity_score > 7
                                ? "bg-red-100 text-red-800"
                                : report.severity_score > 4
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {report.severity_score > 7
                              ? "High"
                              : report.severity_score > 4
                              ? "Medium"
                              : "Low"}
                          </div>
                        </div>

                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
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
                        </div>
                      </div>
                    )}

                  {/* Priority Level */}
                  {report.priority_level && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-1">
                        Priority Level
                      </h4>
                      <div
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          report.priority_level === "high"
                            ? "bg-red-100 text-red-800"
                            : report.priority_level === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {report.priority_level.charAt(0).toUpperCase() +
                          report.priority_level.slice(1)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional info */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-blue-500 mt-0.5 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">
                        Report Information
                      </h4>
                      <p className="mt-1 text-sm text-blue-700">
                        This report has been analyzed by our AI system to
                        identify waste types and assess severity.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModernLayout>
  );
}
