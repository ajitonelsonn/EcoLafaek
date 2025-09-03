// pages/hotspots.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useHotspots, useHotspotReports } from "../lib/api";
import {
  RefreshCw,
  AlertTriangle,
  MapPin,
  Calendar,
  FileText,
  Layers,
  Info,
  Search,
  X,
  ChevronDown,
  Filter,
} from "lucide-react";
import ModernLayout from "../components/Layout";
// Dynamically import map component to prevent SSR issues
const DynamicHotspotMap = dynamic(() => import("../components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
    </div>
  ),
});

export default function PublicHotspotsPage() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    severity: "",
    date: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  // Use custom hooks with caching
  const {
    hotspots,
    isLoading: hotspotsLoading,
    isError: hotspotsError,
    refresh: refreshHotspots,
  } = useHotspots();

  const {
    hotspotReports: hotspotReportsData,
    isLoading: reportsLoading,
    refresh: refreshReports,
  } = useHotspotReports(selectedHotspot?.hotspot_id);

  // Filter hotspots based on search term and filters
  const filteredHotspots = hotspots
    ? hotspots.filter((hotspot) => {
        // Search filter
        const matchesSearch =
          !searchTerm ||
          hotspot.name.toLowerCase().includes(searchTerm.toLowerCase());

        // Severity filter
        const matchesSeverity =
          !filters.severity ||
          (filters.severity === "high" &&
            parseFloat(hotspot.average_severity) >= 7) ||
          (filters.severity === "medium" &&
            parseFloat(hotspot.average_severity) >= 4 &&
            parseFloat(hotspot.average_severity) < 7) ||
          (filters.severity === "low" &&
            parseFloat(hotspot.average_severity) < 4);

        // Date filter - assuming first_reported is in a format that can be compared
        const matchesDate =
          !filters.date ||
          new Date(hotspot.first_reported) >= new Date(filters.date);

        return matchesSearch && matchesSeverity && matchesDate;
      })
    : [];

  // Check for hotspot ID in URL query parameter
  useEffect(() => {
    if (router.query.id && hotspots) {
      const hotspotId = parseInt(router.query.id);
      const foundHotspot = hotspots.find((h) => h.hotspot_id === hotspotId);
      if (foundHotspot) {
        setSelectedHotspot(foundHotspot);
      }
    }
  }, [router.query, hotspots]);

  // Handle hotspot selection
  function handleHotspotSelect(hotspot) {
    setSelectedHotspot(hotspot);

    // Update URL with selected hotspot ID without page refresh
    router.push(
      {
        pathname: "/hotspots",
        query: { id: hotspot.hotspot_id },
      },
      undefined,
      { shallow: true }
    );
  }

  // Function to refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshHotspots();
      if (selectedHotspot) {
        await refreshReports();
      }
    } catch (error) {
      console.error("Error refreshing hotspot data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle search input change
  function handleSearchChange(e) {
    setSearchTerm(e.target.value);
  }

  // Clear search and filters
  function clearFilters() {
    setSearchTerm("");
    setFilters({
      severity: "",
      date: "",
    });
    setShowFilters(false);
  }

  // Handle filter changes
  function handleFilterChange(field, value) {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  // Apply filters
  function applyFilters() {
    // Already done through state
    setShowFilters(false);
  }

  // Format date for better display
  function formatDate(dateString) {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  // Get reports
  const reports = hotspotReportsData?.reports || [];

  // Get severity color class
  function getSeverityColorClass(score) {
    const numScore = parseFloat(score);
    if (numScore >= 7) return "text-red-700";
    if (numScore >= 4) return "text-amber-700";
    return "text-green-700";
  }

  // Generate status badge
  function getStatusBadge(status) {
    let bgColor, textColor, statusText;

    switch (status) {
      case "resolved":
        bgColor = "bg-green-100";
        textColor = "text-green-800";
        statusText = "Resolved";
        break;
      case "analyzed":
        bgColor = "bg-blue-100";
        textColor = "text-blue-800";
        statusText = "Analyzed";
        break;
      case "analyzing":
        bgColor = "bg-purple-100";
        textColor = "text-purple-800";
        statusText = "Analyzing";
        break;
      case "rejected":
        bgColor = "bg-red-100";
        textColor = "text-red-800";
        statusText = "Rejected";
        break;
      default:
        bgColor = "bg-gray-100";
        textColor = "text-gray-800";
        statusText = "Pending";
    }

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
      >
        {statusText}
      </span>
    );
  }

  return (
    <ModernLayout>
      <Head>
        <title>Waste Hotspots | EcoLafaek</title>
        <meta
          name="description"
          content="Public information on waste hotspots in Timor-Leste"
        />
      </Head>

      <div className="px-6 py-8 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-1">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              Waste Hotspots
            </h1>
            <p className="text-gray-600">
              High-concentration areas of waste incidents requiring public
              attention
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filter
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  showFilters ? "rotate-180" : ""
                }`}
              />
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 border border-transparent rounded-lg text-white hover:bg-red-700 transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Search and filters */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Search hotspots by name or location..."
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-5 w-5 text-gray-400 hover:text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 transition-all duration-300 ease-in-out">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Severity Filter */}
              <div>
                <label
                  htmlFor="severity"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Severity Level
                </label>
                <select
                  id="severity"
                  value={filters.severity}
                  onChange={(e) =>
                    handleFilterChange("severity", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">All Severities</option>
                  <option value="high">High (7-10)</option>
                  <option value="medium">Medium (4-7)</option>
                  <option value="low">Low (1-4)</option>
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <label
                  htmlFor="date"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Active Since
                </label>
                <div className="relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    id="date"
                    value={filters.date}
                    onChange={(e) => handleFilterChange("date", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg py-2 pl-10 pr-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-4 space-x-3">
              <button
                onClick={clearFilters}
                className="py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={applyFilters}
                className="py-2 px-4 bg-red-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Refreshing indicator */}
        {refreshing && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center shadow-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 mr-3"></div>
            <span className="text-sm text-red-700">
              Refreshing hotspot data...
            </span>
          </div>
        )}

        {/* Error state */}
        {hotspotsError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <X className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  Error loading hotspots data. Please try again.
                </p>
                <button
                  onClick={handleRefresh}
                  className="mt-2 text-sm font-medium text-red-700 hover:text-red-600 underline"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hotspots List */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm overflow-hidden h-fit">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center">
                <Layers className="w-5 h-5 text-red-500 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">
                  Active Hotspots
                </h2>
              </div>
              {filteredHotspots.length > 0 && (
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {filteredHotspots.length}
                </span>
              )}
            </div>

            {hotspotsLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
              </div>
            ) : filteredHotspots.length > 0 ? (
              <div className="space-y-0 max-h-[600px] overflow-y-auto divide-y divide-gray-100">
                {filteredHotspots.map((hotspot) => (
                  <div
                    key={hotspot.hotspot_id}
                    className={`p-4 hover:bg-red-50 transition-colors duration-200 cursor-pointer
                      ${
                        selectedHotspot?.hotspot_id === hotspot.hotspot_id
                          ? "bg-red-50 border-l-4 border-red-500 pl-3"
                          : "border-l-4 border-transparent pl-3"
                      }`}
                    onClick={() => handleHotspotSelect(hotspot)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-medium text-gray-900 mb-1 pr-6 truncate max-w-[250px]">
                          {hotspot.name}
                        </h3>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-3.5 h-3.5 mr-1" />
                          <span>
                            Active since {formatDate(hotspot.first_reported)}
                          </span>
                        </div>
                      </div>
                      <div className="h-9 w-9 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {hotspot.total_reports}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <AlertTriangle className="w-3.5 h-3.5 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-600">
                          Severity:
                          <span
                            className={`font-medium ml-1 ${getSeverityColorClass(
                              hotspot.average_severity
                            )}`}
                          >
                            {parseFloat(hotspot.average_severity).toFixed(1)}/10
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-600">
                          {(parseFloat(hotspot.radius_meters) / 1000).toFixed(
                            1
                          )}
                          km
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                <AlertTriangle className="w-12 h-12 text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No hotspots found
                </h3>
                <p className="text-gray-500 text-sm max-w-xs">
                  {searchTerm || Object.values(filters).some((f) => f)
                    ? "Try adjusting your search or filters to see more results"
                    : "There are no active waste hotspots in the system"}
                </p>
              </div>
            )}
          </div>

          {/* Map and Details */}
          <div className="lg:col-span-2">
            {/* Map Section */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
              <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-red-500 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">
                    Hotspot Location
                  </h2>
                </div>
                <Link
                  href="/map"
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  View Full Map
                </Link>
              </div>
              <div className="h-[400px]">
                <DynamicHotspotMap
                  data={{
                    hotspots: hotspots || [],
                    reports: selectedHotspot ? reports : [],
                  }}
                  simplified={false}
                  selectedHotspot={selectedHotspot}
                  onHotspotSelect={handleHotspotSelect}
                />
              </div>
            </div>

            {/* Hotspot Details Section */}
            {selectedHotspot && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                  <div className="flex items-center">
                    <Info className="w-5 h-5 text-red-500 mr-2" />
                    <h2 className="text-lg font-medium text-gray-900">
                      Hotspot Details
                    </h2>
                  </div>
                  <button
                    onClick={refreshReports}
                    disabled={reportsLoading}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${
                        reportsLoading ? "animate-spin" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* Summary stats */}
                <div className="p-4 border-b border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                      <h3 className="text-xs font-medium text-red-700 uppercase tracking-wider mb-1">
                        Total Reports
                      </h3>
                      <div className="text-2xl font-bold text-gray-900">
                        {selectedHotspot.total_reports}
                      </div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                      <h3 className="text-xs font-medium text-red-700 uppercase tracking-wider mb-1">
                        Average Severity
                      </h3>
                      <div className="text-2xl font-bold text-gray-900">
                        {parseFloat(selectedHotspot.average_severity).toFixed(
                          1
                        )}
                        /10
                      </div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                      <h3 className="text-xs font-medium text-red-700 uppercase tracking-wider mb-1">
                        Radius
                      </h3>
                      <div className="text-2xl font-bold text-gray-900">
                        {(
                          parseFloat(selectedHotspot.radius_meters) / 1000
                        ).toFixed(1)}{" "}
                        km
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reports Table */}
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Recent Reports in this Hotspot ({reports.length})
                  </h3>

                  {reportsLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                    </div>
                  ) : reports.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Waste Type
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Severity
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reports.slice(0, 5).map((report) => (
                            <tr
                              key={report.report_id}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(report.report_date)}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                                {report.waste_type || "Unknown"}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap">
                                {report.severity_score ? (
                                  <span
                                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      report.severity_score > 7
                                        ? "bg-red-100 text-red-800"
                                        : report.severity_score > 4
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-green-100 text-green-800"
                                    }`}
                                  >
                                    {report.severity_score}/10
                                  </span>
                                ) : (
                                  "N/A"
                                )}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap">
                                {getStatusBadge(report.status)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {reports.length > 5 && (
                        <div className="mt-4 text-center">
                          <Link
                            href="/reports"
                            className="text-sm text-red-600 hover:text-red-800 font-medium"
                          >
                            View all {reports.length} reports
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-center items-center h-32 flex-col">
                      <FileText className="h-10 w-10 text-gray-300 mb-2" />
                      <p className="text-gray-500">
                        No reports available for this hotspot
                      </p>
                    </div>
                  )}
                </div>

                {/* Public Information Alert */}
                <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">
                        Public Health Advisory
                      </h4>
                      <p className="mt-1 text-sm text-blue-700">
                        This hotspot may contain hazardous waste materials. If
                        you live in or visit this area, please take appropriate
                        precautions and report any new waste sightings.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state when no hotspot is selected */}
            {!selectedHotspot &&
              !hotspotsLoading &&
              hotspots &&
              hotspots.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden h-[300px] flex items-center justify-center">
                  <div className="text-center max-w-md px-6">
                    <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No hotspot selected
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Select a hotspot from the list to see its details and
                      reports.
                    </p>
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Public awareness information */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6 border-t-4 border-red-500">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Understanding Waste Hotspots
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                What is a Waste Hotspot?
              </h3>
              <p className="text-gray-600 mb-4">
                A waste hotspot is an area with a high concentration of
                improperly disposed waste reports. These areas often require
                community attention and coordinated cleanup efforts.
              </p>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                How are Hotspots Determined?
              </h3>
              <p className="text-gray-600">
                Hotspots are automatically identified based on the density,
                severity, and frequency of waste reports in a specific
                geographic area. The system continuously monitors for new
                emerging hotspots.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                What Can You Do?
              </h3>
              <ul className="list-disc pl-5 text-gray-600 space-y-2">
                <li>
                  Report waste incidents you observe using our mobile app or
                  website
                </li>
                <li>
                  Participate in community cleanup events targeting these
                  hotspots
                </li>
                <li>
                  Raise awareness about waste management in your community
                </li>
                <li>
                  Follow proper waste disposal guidelines to prevent new
                  hotspots
                </li>
              </ul>
              <div className="mt-4">
                <Link
                  href="/about"
                  className="inline-flex items-center text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Learn more about our waste monitoring program
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModernLayout>
  );
}
