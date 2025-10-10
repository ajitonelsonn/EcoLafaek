// pages/vector-search.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "../components/Layout";
import {
  Search,
  SearchX,
  BarChart2,
  ArrowRight,
  MapPin,
  Calendar,
  Database,
  Zap,
  TrendingUp,
  Loader2,
  Brain,
  Eye,
  X,
  RefreshCw,
  ImageIcon,
} from "lucide-react";

// Result Card Component
const ResultCard = ({ report, index, onViewDetails }) => (
  <div className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow">
    <div className="flex gap-4">
      {/* Image Section */}
      <div className="flex-shrink-0">
        {report.image_url ? (
          <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={report.image_url}
              alt={`Report #${report.report_id}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextElementSibling.style.display = "flex";
              }}
            />
            <div
              className="w-full h-full flex items-center justify-center text-gray-400"
              style={{ display: "none" }}
            >
              <ImageIcon className="h-8 w-8" />
            </div>
          </div>
        ) : (
          <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-gray-400" />
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
              #{String(report.report_id || index + 1)}
            </div>
            <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
              {String(
                Math.round(
                  (report.similarity_score || report.semantic_similarity || 0) *
                    100
                )
              )}
              % match
            </div>
            {report.waste_type && (
              <div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                {String(report.waste_type)}
              </div>
            )}
          </div>
          <div className="flex items-center text-gray-500 text-sm">
            <Calendar className="h-4 w-4 mr-1" />
            {report.report_date
              ? new Date(report.report_date).toLocaleDateString()
              : "No date"}
          </div>
        </div>

        <p className="text-gray-900 mb-4 leading-relaxed line-clamp-2">
          {String(
            report.full_description ||
              report.description ||
              "No description available"
          )}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              <span className="truncate max-w-48">
                {String(report.address_text || "Location not specified")}
              </span>
            </div>
            <div
              className={`px-2 py-1 rounded text-xs font-medium ${
                report.status === "resolved"
                  ? "bg-green-100 text-green-700"
                  : report.status === "analyzing"
                  ? "bg-yellow-100 text-yellow-700"
                  : report.status === "analyzed"
                  ? "bg-blue-100 text-blue-700"
                  : report.status === "rejected"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {String(report.status || "submitted")}
            </div>
          </div>

          <button
            onClick={() => onViewDetails(report)}
            className="flex items-center space-x-1 text-green-600 hover:text-green-700 font-medium text-sm transition-colors"
          >
            <Eye className="h-4 w-4" />
            <span>View Details</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Report Details Modal Component - Compact Design
const ReportDetailsModal = ({ report, isOpen, onClose }) => {
  if (!isOpen || !report) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Report Details #{String(report.report_id)}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-120px)]">
          <div className="p-4">
            {/* Image */}
            <div className="mb-4">
              {report.image_url ? (
                <img
                  src={report.image_url}
                  alt={`Report #${report.report_id}`}
                  className="w-full h-48 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextElementSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className="w-full h-48 bg-gray-100 rounded-lg hidden items-center justify-center text-gray-400"
                style={{ display: report.image_url ? "none" : "flex" }}
              >
                <div className="text-center">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                  <span>No image available</span>
                </div>
              </div>
            </div>

            {/* Key Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Status
                </label>
                <div className="bg-gray-50 px-3 py-2 rounded-lg">
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {String(report.status || "submitted")}
                  </span>
                </div>
              </div>

              {/* Match Score */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Match Score
                </label>
                <div className="bg-blue-50 px-3 py-2 rounded-lg">
                  <span className="text-sm font-medium text-blue-700">
                    {String(
                      Math.round(
                        (report.similarity_score ||
                          report.semantic_similarity ||
                          0) * 100
                      )
                    )}% similarity
                  </span>
                </div>
              </div>

              {/* Waste Type */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Waste Type
                </label>
                <div className="bg-green-50 px-3 py-2 rounded-lg">
                  <span className="text-sm font-medium text-green-700">
                    {String(report.waste_type || "Not Garbage")}
                  </span>
                </div>
              </div>

              {/* Severity */}
              {report.severity_score && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Severity
                  </label>
                  <div className="bg-red-50 px-3 py-2 rounded-lg">
                    <span className="text-sm font-medium text-red-700">
                      Level {String(report.severity_score)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Report Date */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Report Date
              </label>
              <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  {report.report_date
                    ? new Date(report.report_date).toLocaleDateString()
                    : "No date available"}
                </span>
              </div>
            </div>

            {/* Location */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Location
              </label>
              <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  {String(report.address_text || "Location not specified")}
                </span>
              </div>
              {report.latitude && report.longitude && (
                <div className="mt-1 text-xs text-gray-500">
                  Coordinates: {String(report.latitude)}, {String(report.longitude)}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Description
              </label>
              <div className="bg-gray-50 px-3 py-2 rounded-lg">
                <p className="text-sm text-gray-700">
                  {String(
                    report.full_description ||
                      report.description ||
                      "No description available"
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default function VectorSearchPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  // Modal state
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Cache state
  const [lastSearchParams, setLastSearchParams] = useState(null);
  const [cachedResults, setCachedResults] = useState(null);

  // Semantic Search State
  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticLimit, setSemanticLimit] = useState(10);
  const [semanticThreshold, setSemanticThreshold] = useState(0.7);

  // Pattern Analysis State
  const [clusterDays, setClusterDays] = useState(30);
  const [minClusterSize, setMinClusterSize] = useState(3);
  const [clusterThreshold, setClusterThreshold] = useState(0.8);

  // Auto-search for similar reports when URL parameter is present
  useEffect(() => {
    if (router.isReady && router.query.similar) {
      const reportId = router.query.similar;
      setSelectedType("similar");
      handleSimilarReportsSearch(reportId);
    }
  }, [router.isReady, router.query.similar]);

  // Check if current search params match cached ones
  const getCurrentSearchParams = () => {
    if (selectedType === "semantic") {
      return {
        type: "semantic",
        query: semanticQuery.trim(),
        limit: semanticLimit,
        threshold: semanticThreshold,
      };
    } else if (selectedType === "patterns") {
      return {
        type: "patterns",
        days: clusterDays,
        minSize: minClusterSize,
        threshold: clusterThreshold,
      };
    } else if (selectedType === "similar") {
      return {
        type: "similar",
        reportId: router.query.similar,
        limit: 10,
      };
    }
    return null;
  };

  const isSearchCached = () => {
    const currentParams = getCurrentSearchParams();
    return (
      lastSearchParams &&
      JSON.stringify(currentParams) === JSON.stringify(lastSearchParams) &&
      cachedResults
    );
  };

  // Handle viewing report details
  const handleViewDetails = (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedReport(null);
  };

  // Start new analysis (clear cache)
  const startNewAnalysis = () => {
    setResults(null);
    setCachedResults(null);
    setLastSearchParams(null);
    setError("");
  };

  const handleSemanticSearch = async () => {
    if (!semanticQuery.trim()) {
      setError("Please enter what you want to search for");
      return;
    }

    // Check if results are cached
    if (isSearchCached()) {
      setResults(cachedResults);
      return;
    }

    setLoading(true);
    setError("");
    setResults(null);

    try {
      const response = await fetch("/api/vector-search/semantic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: semanticQuery.trim(),
          limit: semanticLimit,
          threshold: semanticThreshold,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Search failed");
      }

      if (data.success) {
        setResults(data);
        // Cache the results
        setCachedResults(data);
        setLastSearchParams(getCurrentSearchParams());
      } else {
        setError(data.message || "Search failed");
      }
    } catch (err) {
      setError(err.message || "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClusterAnalysis = async () => {

    // Check if results are cached
    if (isSearchCached()) {
      setResults(cachedResults);
      return;
    }

    setLoading(true);
    setError("");
    setResults(null);

    const apiUrl = `/api/vector-search/clusters?days=${clusterDays}&minClusterSize=${minClusterSize}&similarityThreshold=${clusterThreshold}`;

    try {
      const response = await fetch(apiUrl);


      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Analysis failed");
      }

      if (data.success) {
        
        setResults(data);
        // Cache the results
        setCachedResults(data);
        setLastSearchParams(getCurrentSearchParams());
      } else {
        setError(data.message || "Analysis failed");
      }
    } catch (err) {
      setError(err.message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimilarReportsSearch = async (reportId) => {
    if (!reportId) {
      setError("Report ID is required for similarity search");
      return;
    }

    // Check if results are cached
    if (isSearchCached()) {
      setResults(cachedResults);
      return;
    }

    setLoading(true);
    setError("");
    setResults(null);

    try {
      const response = await fetch("/api/vector-search/similar-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportId: reportId,
          limit: 10, // Maximum 10 similar reports
          threshold: 0.6, // Minimum similarity threshold
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Similar reports search failed");
      }

      if (data.success) {
        // Format the results to match expected structure
        const formattedResults = {
          success: true,
          message: `Found ${data.reports?.length || 0} similar reports to Report #${reportId}`,
          reports: data.reports || [],
          metadata: {
            ...data.metadata,
            searchType: "similar",
            originalReportId: reportId,
          },
        };
        
        setResults(formattedResults);
        // Cache the results
        setCachedResults(formattedResults);
        setLastSearchParams(getCurrentSearchParams());
      } else {
        setError(data.message || "Similar reports search failed");
      }
    } catch (err) {
      setError(err.message || "Similar reports search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetToSelection = () => {
    setSelectedType(null);
    setResults(null);
    setError("");
    // Clear URL parameters
    router.push("/vector-search", undefined, { shallow: true });
  };

  return (
    <>
      <Head>
        <title>Vector Search & Analysis - Ecolafaek Dashboard</title>
        <meta
          name="description"
          content="Find waste reports and discover patterns using AI technology"
        />
      </Head>

      <Layout>
        <div className="min-h-screen bg-gray-50">
          {/* Header Section */}
          <div className="bg-green-600 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="py-12">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Brain className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold">
                      Vector Search & Analysis
                    </h1>
                    <p className="text-green-100 text-lg mt-2">
                      Find waste reports and discover patterns using AI
                      technology
                    </p>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-green-100 text-sm">
                          Vector Dimensions
                        </div>
                        <div className="text-2xl font-bold">1024</div>
                      </div>
                      <Database className="h-8 w-8 text-green-200" />
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-green-100 text-sm">AI Models</div>
                        <div className="text-2xl font-bold">Titan</div>
                      </div>
                      <Brain className="h-8 w-8 text-green-200" />
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-green-100 text-sm">
                          Search Speed
                        </div>
                        <div className="text-2xl font-bold">&lt;500ms</div>
                      </div>
                      <Zap className="h-8 w-8 text-green-200" />
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-green-100 text-sm">Accuracy</div>
                        <div className="text-2xl font-bold">95%+</div>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-200" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Auto-search notification for similar reports */}
          {selectedType === "similar" && router.query.similar && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Brain className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <span className="font-medium">Auto-searching similar reports</span> for Report #{router.query.similar} using AI vector analysis
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {!selectedType ? (
              <>
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Choose Analysis Type
                  </h2>
                  <p className="text-gray-600 text-lg">
                    Select how you want to explore waste reports
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  {/* Semantic Search Card */}
                  <div
                    onClick={() => setSelectedType("semantic")}
                    className="bg-white rounded-lg border-2 border-gray-200 hover:border-green-500 p-8 cursor-pointer transition-all duration-200 hover:shadow-lg"
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="h-8 w-8 text-green-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">
                        Semantic Search
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        Use natural language to find waste reports - search for
                        'plastic near beach' or 'garbage in Dili' using AI.
                      </p>
                    </div>
                  </div>

                  {/* Pattern Analysis Card */}
                  <div
                    onClick={() => setSelectedType("patterns")}
                    className="bg-white rounded-lg border-2 border-green-500 p-8 cursor-pointer transition-all duration-200 shadow-lg"
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BarChart2 className="h-8 w-8 text-green-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">
                        Pattern Analysis
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        Discover waste hotspots and patterns across Timor-Leste
                        using advanced clustering analytics.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="max-w-6xl mx-auto">
                {/* Back Button */}
                <button
                  onClick={resetToSelection}
                  className="mb-6 flex items-center text-green-600 hover:text-green-700 font-medium"
                >
                  <ArrowRight className="h-5 w-5 mr-2 rotate-180" />
                  Back to Analysis Types
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Controls Panel */}
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
                      {selectedType === "semantic" && (
                        <div className="space-y-6">
                          <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <Search className="h-5 w-5 text-green-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900">
                              Find Waste Reports
                            </h3>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                              What are you looking for?
                            </label>
                            <input
                              type="text"
                              value={semanticQuery}
                              onChange={(e) => setSemanticQuery(e.target.value)}
                              placeholder="e.g., plastic bottles near beach"
                              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleSemanticSearch()
                              }
                            />
                            <p className="text-xs text-gray-500 mt-2">
                              Try: "garbage in Dili", "plastic waste", "bottles
                              near water"
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Number of Results
                              </label>
                              <select
                                value={semanticLimit}
                                onChange={(e) =>
                                  setSemanticLimit(parseInt(e.target.value))
                                }
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                              >
                                <option value={5}>5 results</option>
                                <option value={10}>10 results</option>
                                <option value={20}>20 results</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Match Quality
                              </label>
                              <select
                                value={semanticThreshold}
                                onChange={(e) =>
                                  setSemanticThreshold(
                                    parseFloat(e.target.value)
                                  )
                                }
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                              >
                                <option value={0.5}>Any match</option>
                                <option value={0.7}>Good match</option>
                                <option value={0.8}>Best match</option>
                              </select>
                            </div>
                          </div>

                          <button
                            onClick={handleSemanticSearch}
                            disabled={loading || !semanticQuery.trim()}
                            className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Searching...</span>
                              </>
                            ) : (
                              <>
                                <Search className="h-5 w-5" />
                                <span>Search Reports</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {selectedType === "patterns" && (
                        <div className="space-y-6">
                          <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <BarChart2 className="h-5 w-5 text-green-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900">
                              Analyze Patterns
                            </h3>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Time Period
                            </label>
                            <select
                              value={clusterDays}
                              onChange={(e) =>
                                setClusterDays(parseInt(e.target.value))
                              }
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            >
                              <option value={7}>Last 7 days</option>
                              <option value={30}>Last 30 days</option>
                              <option value={90}>Last 3 months</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Min Group Size
                              </label>
                              <select
                                value={minClusterSize}
                                onChange={(e) =>
                                  setMinClusterSize(parseInt(e.target.value))
                                }
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                              >
                                <option value={2}>2 reports</option>
                                <option value={3}>3 reports</option>
                                <option value={5}>5 reports</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Similarity Level
                              </label>
                              <select
                                value={clusterThreshold}
                                onChange={(e) =>
                                  setClusterThreshold(
                                    parseFloat(e.target.value)
                                  )
                                }
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                              >
                                <option value={0.7}>Similar</option>
                                <option value={0.8}>Very Similar</option>
                                <option value={0.9}>Almost Identical</option>
                              </select>
                            </div>
                          </div>

                          <button
                            onClick={handleClusterAnalysis}
                            disabled={loading}
                            className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Analyzing...</span>
                              </>
                            ) : (
                              <>
                                <BarChart2 className="h-5 w-5" />
                                <span>Find Patterns</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Results Panel */}
                  <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-96">
                      {!results && !error && !loading && (
                        <div className="flex items-center justify-center h-96">
                          <div className="text-center">
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Brain className="h-12 w-12 text-green-600" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              Advanced Vector Analysis
                            </h3>
                            <p className="text-gray-500">
                              Configure your search above and click the button
                              to start exploring waste report patterns
                            </p>
                          </div>
                        </div>
                      )}

                      {error && (
                        <div className="p-6 border-b border-red-200 bg-red-50">
                          <div className="flex items-center space-x-2">
                            <SearchX className="h-5 w-5 text-red-500" />
                            <p className="text-red-800 font-medium">{error}</p>
                          </div>
                        </div>
                      )}

                      {loading && (
                        <div className="flex items-center justify-center h-96">
                          <div className="text-center">
                            <Loader2 className="h-12 w-12 text-green-600 animate-spin mx-auto mb-4" />
                            <p className="text-gray-600">
                              Processing your request...
                            </p>
                          </div>
                        </div>
                      )}

                      {results && (
                        <div className="p-6">
                          {/* Header with New Analysis Button */}
                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <h3 className="text-xl font-semibold text-gray-900">
                                {selectedType === "similar" 
                                  ? `Similar Reports to #${router.query.similar}`
                                  : "Analysis Results"
                                }
                              </h3>
                              {selectedType === "similar" && (
                                <p className="text-sm text-gray-600 mt-1">
                                  AI-powered similarity analysis using vector embeddings
                                </p>
                              )}
                            </div>
                            <button
                              onClick={startNewAnalysis}
                              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <RefreshCw className="h-4 w-4" />
                              <span>New Analysis</span>
                            </button>
                          </div>

                          {/* Stats Summary */}
                          {results.stats && (
                            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                {selectedType === "patterns" ? (
                                  <>
                                    <div>
                                      <div className="font-medium text-green-700">
                                        Patterns Found
                                      </div>
                                      <div className="text-xl font-bold text-green-900">
                                        {results.data?.clusters?.length || 0}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="font-medium text-green-700">
                                        Total Reports
                                      </div>
                                      <div className="text-xl font-bold text-green-900">
                                        {results.reports?.length || 0}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="font-medium text-green-700">
                                        Avg Similarity
                                      </div>
                                      <div className="text-xl font-bold text-green-900">
                                        {results.data?.clusters?.length > 0 
                                          ? Math.round((1 - (results.data.clusters.reduce((sum, c) => sum + c.avg_similarity, 0) / results.data.clusters.length)) * 100) + "%"
                                          : "0%"}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="font-medium text-green-700">
                                        Time Period
                                      </div>
                                      <div className="text-xl font-bold text-green-900">
                                        {results.stats?.time_period_days || 0}d
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div>
                                      <div className="font-medium text-green-700">
                                        Found
                                      </div>
                                      <div className="text-xl font-bold text-green-900">
                                        {String(
                                          results.results?.length ||
                                            results.reports?.length ||
                                            results.stats?.query_results ||
                                            0
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="font-medium text-green-700">
                                        Total Reports
                                      </div>
                                      <div className="text-xl font-bold text-green-900">
                                        {String(
                                          results.stats.total_searchable_reports ||
                                            "N/A"
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="font-medium text-green-700">
                                        Avg Quality
                                      </div>
                                      <div className="text-xl font-bold text-green-900">
                                        {String(
                                          results.stats.avg_confidence ||
                                            results.stats.avg_similarity ||
                                            0
                                        )}
                                        %
                                      </div>
                                    </div>
                                  </>
                                )}
                                <div>
                                  <div className="font-medium text-green-700">
                                    Process Time
                                  </div>
                                  <div className="text-xl font-bold text-green-900">
                                    {String(results.stats.processing_time || 0)}
                                    s
                                  </div>
                                </div>
                              </div>
                              {isSearchCached() && (
                                <div className="mt-3 text-center"></div>
                              )}
                            </div>
                          )}

                          {/* Results List */}
                          <div className="space-y-6">
                            {/* Pattern Analysis Results */}
                            {selectedType === "patterns" && results?.data?.clusters && results.data.clusters.length > 0 ? (
                              <div className="space-y-8">
                                {results.data.clusters.map((cluster, clusterIdx) => (
                                  <div key={cluster.cluster_id} className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-100 overflow-hidden shadow-sm">
                                    {/* Cluster Header */}
                                    <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white p-6">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-3 mb-3">
                                            <div className="bg-white/20 rounded-lg p-2">
                                              <BarChart2 className="w-6 h-6" />
                                            </div>
                                            <div>
                                              <h3 className="text-xl font-bold">Pattern #{cluster.cluster_id}</h3>
                                              <div className="flex items-center gap-4 mt-1">
                                                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                                                  {cluster.pattern_type.charAt(0).toUpperCase() + cluster.pattern_type.slice(1)} Pattern
                                                </span>
                                                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                                                  {cluster.reports.length} Reports
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                          <p className="text-emerald-100 text-lg">{cluster.centroid_description}</p>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-3xl font-bold mb-1">
                                            {Math.round((1 - cluster.avg_similarity) * 100)}%
                                          </div>
                                          <div className="text-emerald-200 text-sm">Similarity</div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Cluster Insights */}
                                    <div className="p-6 border-b border-emerald-100">
                                      <h4 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Pattern Insights
                                      </h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {cluster.insights.map((insight, idx) => (
                                          <div key={idx} className="flex items-center gap-2 text-emerald-700 bg-white/60 rounded-lg px-3 py-2">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                            <span className="text-sm">{insight}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Cluster Statistics */}
                                    <div className="p-6 border-b border-emerald-100">
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        <div className="text-center">
                                          <div className="text-2xl font-bold text-emerald-900">{cluster.geographic_spread.toFixed(1)}km</div>
                                          <div className="text-sm text-emerald-600">Geographic Spread</div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-2xl font-bold text-emerald-900">{cluster.time_span.days}</div>
                                          <div className="text-sm text-emerald-600">Days Span</div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-2xl font-bold text-emerald-900">{cluster.severity_level.toFixed(1)}/10</div>
                                          <div className="text-sm text-emerald-600">Avg Severity</div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-2xl font-bold text-emerald-900">{Math.round(cluster.confidence_level)}%</div>
                                          <div className="text-sm text-emerald-600">Confidence</div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Cluster Reports */}
                                    <div className="p-6">
                                      <h4 className="font-semibold text-emerald-900 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Reports in Pattern ({cluster.reports.length})
                                      </h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {cluster.reports.map((report, idx) => (
                                          <div key={report.report_id} className="bg-white rounded-xl border border-emerald-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleViewDetails(report)}>
                                            {/* Report Image */}
                                            {report.image_url && (
                                              <div className="aspect-video bg-gray-100">
                                                <img
                                                  src={report.image_url}
                                                  alt={`Report ${report.report_id}`}
                                                  className="w-full h-full object-cover"
                                                  onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.parentNode.style.display = 'none';
                                                  }}
                                                />
                                              </div>
                                            )}
                                            
                                            <div className="p-4">
                                              <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                  <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-sm font-medium">
                                                    #{report.report_id}
                                                  </span>
                                                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                                    {Math.round((1 - (report.similarity_score || 0)) * 100)}% match
                                                  </span>
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                  {new Date(report.report_date).toLocaleDateString()}
                                                </span>
                                              </div>
                                              <div className="mb-3">
                                                <div className="font-medium text-gray-900 mb-1">{report.waste_type || 'Unknown Type'}</div>
                                                <p className="text-sm text-gray-600" style={{
                                                  display: '-webkit-box',
                                                  WebkitLineClamp: 2,
                                                  WebkitBoxOrient: 'vertical',
                                                  overflow: 'hidden'
                                                }}>
                                                  {report.description || 'No description'}
                                                </p>
                                              </div>
                                              <div className="flex items-center justify-end text-xs text-gray-500">
                                                <button className="text-emerald-600 hover:text-emerald-800 font-medium">
                                                  View Details →
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : 
                            /* Regular Results */
                            ((results.results && Array.isArray(results.results) && results.results.length > 0) || 
                              (results.reports && Array.isArray(results.reports) && results.reports.length > 0)) ? (
                              (results.results || results.reports).map((report, idx) => (
                                <ResultCard
                                  key={String(report.report_id || idx)}
                                  report={report}
                                  index={idx}
                                  onViewDetails={handleViewDetails}
                                />
                              ))
                            ) : (
                              <div className="text-center py-12">
                                <div className="max-w-md mx-auto">
                                  <div className="mb-4">
                                    <SearchX className="h-12 w-12 text-gray-400 mx-auto" />
                                  </div>
                                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    No results found
                                  </h3>
                                  <p className="text-gray-500 mb-4">
                                    {selectedType === "patterns" 
                                      ? "No patterns found with current settings. Try adjusting your configuration."
                                      : selectedType === "similar"
                                      ? `No similar reports found for Report #${router.query.similar}. The report might be unique or have no similar patterns.`
                                      : "Try different search terms or adjust your filters to find waste reports."
                                    }
                                  </p>
                                  <div className="space-y-3">
                                    {selectedType === "patterns" ? (
                                      <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                                        💡 Try extending the time period to 3 months, 
                                        reducing minimum group size to 2 reports, 
                                        or lowering the similarity level to find more patterns.
                                      </p>
                                    ) : (
                                      <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                                        💡 Try searching for "plastic waste",
                                        "garbage near beach", or adjust time
                                        periods for analysis.
                                      </p>
                                    )}
                                    {results && results.message && results.reports && results.reports.length > 0 && (
                                      <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                                        ✅ {results.message}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Report Details Modal */}
        <ReportDetailsModal
          report={selectedReport}
          isOpen={isModalOpen}
          onClose={closeModal}
        />
      </Layout>
    </>
  );
}
