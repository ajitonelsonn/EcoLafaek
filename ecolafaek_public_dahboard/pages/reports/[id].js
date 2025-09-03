// pages/reports/[id].js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import ModernLayout from "../../components/Layout";
import { fetchAPI } from "../../lib/api";
import { ArrowLeft, MapPin, Calendar, AlertTriangle, X, Search } from "lucide-react";

export default function ReportDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSimilarModal, setShowSimilarModal] = useState(false);
  const [similarReports, setSimilarReports] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarError, setSimilarError] = useState(null);

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

  // Fetch similar reports
  const fetchSimilarReports = async () => {
    if (!id) return;
    
    setSimilarLoading(true);
    setSimilarError(null);
    
    try {
      const response = await fetch('/api/vector-search/similar-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportId: id,
          limit: 10,
          threshold: 0.6,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch similar reports");
      }

      console.log('Similar reports API response:', data);
      
      if (data.success) {
        // The API returns data in data.data.similarReports, not data.similarReports
        const reports = data.data?.similarReports || [];
        console.log('Setting similar reports:', reports.length, reports);
        setSimilarReports(reports);
        if (reports.length === 0) {
          setSimilarError("No similar reports found in database");
        }
      } else {
        console.log('API error:', data.message);
        setSimilarError(data.message || "No similar reports found");
      }
    } catch (err) {
      console.error("Similar reports error:", err);
      setSimilarError(err.message || "Failed to load similar reports");
    } finally {
      setSimilarLoading(false);
    }
  };

  // Handle find similar button click
  const handleFindSimilar = () => {
    setShowSimilarModal(true);
    fetchSimilarReports();
  };

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

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case "resolved":
        return "Resolved";
      case "analyzed":
        return "Analyzed";
      case "analyzing":
        return "Under Analysis";
      case "rejected":
        return "Rejected";
      default:
        return "Pending Review";
    }
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
        {getStatusText(status)}
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
        {/* Enhanced Back button and header */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-8 mb-8 border border-emerald-100 shadow-sm">
          <button
            onClick={() => router.back()}
            className="text-emerald-600 hover:text-emerald-800 flex items-center mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reports
          </button>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium mb-3">
                <AlertTriangle className="w-4 h-4" />
                Report Details
              </div>
              <h1 className="text-4xl font-bold text-emerald-900 mb-2">
                {loading
                  ? "Loading Report..."
                  : report
                  ? `Report #${id}`
                  : "Report Not Found"}
              </h1>
              {report && (
                <p className="text-lg text-emerald-700">
                  {report.waste_type || "Waste"} incident • {getStatusText(report.status)}
                </p>
              )}
            </div>
            
            {report && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleFindSimilar}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-emerald-600 border-2 border-emerald-200 rounded-lg hover:bg-emerald-50 font-medium shadow-sm transition-all hover:scale-105"
                >
                  <Search className="w-4 h-4" />
                  Find Similar
                </button>
                <Link
                  href={`/map?report=${id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm transition-all hover:scale-105"
                >
                  <MapPin className="w-4 h-4" />
                  View on Map
                </Link>
              </div>
            )}
          </div>
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
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            {/* Report summary header */}
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="flex items-center gap-4">
                  {getStatusBadge(report.status)}
                  <div className="text-sm text-gray-600 flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(report.report_date)}
                    </div>
                    {report.severity_score && (
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        Severity {report.severity_score}/10
                      </div>
                    )}
                  </div>
                </div>
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
        
        {/* Similar Reports Modal */}
        {showSimilarModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Similar Reports</h2>
                    <p className="text-emerald-100">
                      AI-powered similarity using image comparison and description analysis
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSimilarModal(false)}
                    className="text-white hover:text-emerald-200 transition-colors p-2"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {similarLoading && (
                  <div className="flex justify-center items-center py-12">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-100 border-t-emerald-500 mb-4"></div>
                      <p className="text-emerald-600 font-medium">
                        Analyzing images to find similar reports...
                      </p>
                    </div>
                  </div>
                )}

                {similarError && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <AlertTriangle className="w-16 h-16 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Similar Reports Found
                    </h3>
                    <p className="text-gray-600 mb-4">{similarError}</p>
                    <p className="text-sm text-gray-500">
                      This report might be unique or have no similar patterns in our database.
                    </p>
                  </div>
                )}

                {!similarLoading && !similarError && similarReports.length > 0 && (
                  <div>
                    <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg mb-6">
                      ✅ Found {similarReports.length} similar reports based on image analysis
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {similarReports.map((similarReport) => (
                        <div
                          key={similarReport.report_id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={() => {
                            setShowSimilarModal(false);
                            router.push(`/reports/${similarReport.report_id}`);
                          }}
                        >
                          <div className="flex items-start gap-3">
                            {similarReport.image_url && (
                              <div className="flex-shrink-0">
                                <img
                                  src={similarReport.image_url}
                                  alt="Similar report"
                                  className="w-16 h-16 object-cover rounded-lg"
                                  onError={(e) => {
                                    e.target.src = "https://via.placeholder.com/64x64?text=No+Image";
                                  }}
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-gray-900 truncate">
                                  Report #{similarReport.report_id}
                                </h4>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">
                                    {((1 - similarReport.similarity_score) * 100).toFixed(1)}% similar
                                  </span>
                                  {similarReport.similarity_type && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      similarReport.similarity_type === 'image_and_text' ? 'bg-green-100 text-green-600' :
                                      similarReport.similarity_type === 'image_only' ? 'bg-blue-100 text-blue-600' :
                                      similarReport.similarity_type === 'text_only' ? 'bg-purple-100 text-purple-600' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>
                                      {similarReport.similarity_type === 'image_and_text' ? '🖼️+📝' :
                                       similarReport.similarity_type === 'image_only' ? '🖼️' :
                                       similarReport.similarity_type === 'text_only' ? '📝' : '?'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 mb-2">
                                {getStatusBadge(similarReport.status)}
                                {similarReport.waste_type && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                    {similarReport.waste_type}
                                  </span>
                                )}
                              </div>

                              {similarReport.description && (
                                <p className="text-sm text-gray-600 mb-2" style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}>
                                  {similarReport.description}
                                </p>
                              )}

                              {similarReport.address_text && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  <span className="truncate">{similarReport.address_text}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ModernLayout>
  );
}
