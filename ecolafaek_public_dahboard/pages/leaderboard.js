// pages/leaderboard.js
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import ModernLayout from "../components/Layout";
import { useLeaderboard } from "../lib/api";
import {
  Trophy,
  Users,
  Filter,
  RefreshCw,
  Search,
  ChevronDown,
  X,
  Medal,
  User,
  Calendar,
  BarChart2,
  FileText,
} from "lucide-react";
import ModernPagination from "../components/Pagination";

export default function LeaderboardPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    onlyValidReports: false,
    timeRange: "all",
    searchTerm: "",
  });

  // Use our API hook to fetch data
  const {
    leaderboardData,
    isLoading,
    isError,
    refresh: refreshLeaderboard,
  } = useLeaderboard(page, perPage, filters);

  // Apply query params from URL
  useEffect(() => {
    if (router.isReady) {
      const { query } = router;
      const initialFilters = { ...filters };
      let hasInitialFilters = false;

      if (query.valid === "true") {
        initialFilters.onlyValidReports = true;
        hasInitialFilters = true;
      }
      if (query.time) {
        initialFilters.timeRange = query.time;
        hasInitialFilters = true;
      }
      if (query.search) {
        initialFilters.searchTerm = query.search;
        hasInitialFilters = true;
      }
      if (query.page && !isNaN(parseInt(query.page))) {
        setPage(parseInt(query.page));
      }
      if (query.per_page && !isNaN(parseInt(query.per_page))) {
        setPerPage(parseInt(query.per_page));
      }

      if (hasInitialFilters) {
        setFilters(initialFilters);
        setShowFilters(true);
      }
    }
  }, [router.isReady]);

  // Update URL when filters or pagination changes
  useEffect(() => {
    if (router.isReady) {
      const queryParams = new URLSearchParams();

      if (filters.onlyValidReports) queryParams.set("valid", "true");
      if (filters.timeRange !== "all")
        queryParams.set("time", filters.timeRange);
      if (filters.searchTerm) queryParams.set("search", filters.searchTerm);

      queryParams.set("page", page.toString());
      queryParams.set("per_page", perPage.toString());

      router.push(
        {
          pathname: router.pathname,
          query: queryParams.toString() ? queryParams : undefined,
        },
        undefined,
        { shallow: true }
      );
    }
  }, [filters, page, perPage, router.isReady]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshLeaderboard();
    } catch (error) {
      console.error("Error refreshing leaderboard:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      onlyValidReports: false,
      timeRange: "all",
      searchTerm: "",
    });
    setShowFilters(false);
  };

  const applyFilters = () => {
    setShowFilters(false);
    setPage(1); // Reset to first page when applying new filters
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    // Scroll to top when changing pages
    window.scrollTo(0, 0);
  };

  // Get medal emoji based on position
  const getMedal = (position) => {
    const baseIndex = (page - 1) * perPage;
    const rank = baseIndex + position + 1;

    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  // Extract data from the API response
  const users = leaderboardData?.users || [];
  const total = leaderboardData?.total || 0;
  const totalPages = leaderboardData?.total_pages || 1;

  // Custom Loading Row component
  const LoadingRow = ({ index }) => (
    <tr className="animate-pulse">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="h-6 w-6 bg-gray-200 rounded-full mr-2"></div>
          <div className="h-4 bg-gray-200 rounded w-8"></div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-12"></div>
      </td>
      {filters.onlyValidReports && (
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 rounded w-12"></div>
        </td>
      )}
    </tr>
  );

  return (
    <ModernLayout>
      <Head>
        <title>Contributor Leaderboard | EcoLafaek</title>
        <meta
          name="description"
          content="Leaderboard of waste report contributors in Timor-Leste"
        />
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center">
              <Trophy className="w-8 h-8 text-amber-500 mr-2" />
              Contributor Leaderboard
            </h1>
            <p className="text-gray-600">
              Recognizing the most active waste reporters in our community
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  showFilters ? "rotate-180" : ""
                }`}
              />
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 border border-transparent rounded-lg text-white hover:bg-emerald-700 transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Search box */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Search by username..."
            />
            {filters.searchTerm && (
              <button
                onClick={() => handleFilterChange("searchTerm", "")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-5 w-5 text-gray-400 hover:text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 transition-all duration-300 ease-in-out">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Report Type Filter */}
              <div>
                <label
                  htmlFor="reportType"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Report Type
                </label>
                <div className="relative rounded-lg">
                  <select
                    id="reportType"
                    value={filters.onlyValidReports ? "valid" : "all"}
                    onChange={(e) =>
                      handleFilterChange(
                        "onlyValidReports",
                        e.target.value === "valid"
                      )
                    }
                    className="w-full border border-gray-300 rounded-lg py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="all">All Reports</option>
                    <option value="valid">
                      Only Valid Reports (Excluding "Not Garbage")
                    </option>
                  </select>
                </div>
              </div>

              {/* Time Range Filter */}
              <div>
                <label
                  htmlFor="timeRange"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Time Range
                </label>
                <div className="relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="timeRange"
                    value={filters.timeRange}
                    onChange={(e) =>
                      handleFilterChange("timeRange", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg py-2 pl-10 pr-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="all">All Time</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="quarter">Last 90 Days</option>
                    <option value="year">Last Year</option>
                  </select>
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
                className="py-2 px-4 bg-emerald-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Refreshing indicator */}
        {refreshing && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 flex items-center shadow-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500 mr-3"></div>
            <span className="text-sm text-emerald-700">
              Refreshing leaderboard data...
            </span>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <X className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  Error loading leaderboard data. Please try again.
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

        {/* User count and pagination controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <div className="text-sm text-gray-600 mb-3 sm:mb-0 flex items-center">
            <Users className="w-4 h-4 mr-1 text-gray-500" />
            <span>
              Showing <span className="font-medium">{users.length}</span> of{" "}
              <span className="font-medium">{total}</span> contributors
            </span>
            {Object.values(filters).some(
              (f) => f !== false && f !== "" && f !== "all"
            ) && (
              <button
                onClick={clearFilters}
                className="ml-2 text-emerald-600 hover:text-emerald-800 underline text-xs"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="border border-gray-300 rounded-lg py-1.5 px-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>

        {/* Leaderboard table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          {isLoading ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reports
                    </th>
                    {filters.onlyValidReports && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valid Reports
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...Array(perPage)].map((_, i) => (
                    <LoadingRow key={i} index={i} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reports
                    </th>
                    {filters.onlyValidReports && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valid Reports
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user, index) => (
                    <tr
                      key={user.user_id}
                      className={`hover:bg-gray-50 transition-colors ${
                        index < 3 ? "bg-amber-50" : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center">
                          <span
                            className={`text-lg mr-2 ${
                              index < 3
                                ? "text-amber-500 font-bold"
                                : "text-gray-500"
                            }`}
                          >
                            {getMedal(index)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-emerald-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">
                            <User className="w-4 h-4 text-emerald-700" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {user.username}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-sm font-medium rounded-full">
                          {user.report_count}
                        </span>
                      </td>
                      {filters.onlyValidReports && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                            {user.valid_reports}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-amber-500 mb-4">
                <Trophy className="w-16 h-16 opacity-20" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No contributors found
              </h3>
              <p className="text-gray-500 mb-6">
                {Object.values(filters).some(
                  (f) => f !== false && f !== "" && f !== "all"
                )
                  ? "Try adjusting your filters to see more results"
                  : "There are no waste report contributors in the system yet"}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6">
            <ModernPagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}

        {/* Leaderboard Insights */}
        {users.length > 0 && (
          <div className="mt-10 bg-white rounded-xl shadow-sm overflow-hidden">
            <div
              className="px-6 py-4 border-b border-gray-
            200"
            >
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <BarChart2 className="w-5 h-5 text-amber-500 mr-2" />
                Contributor Insights
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Summary of community waste reporting activity
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                <h3 className="text-sm font-medium text-amber-800 mb-1 flex items-center">
                  <Trophy className="w-4 h-4 mr-1" />
                  Top Contributors
                </h3>
                <div className="mt-3">
                  <div className="text-3xl font-bold text-gray-900">
                    {users.length > 0 ? users[0]?.username : "N/A"}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    With {users.length > 0 ? users[0]?.report_count : 0} total
                    reports
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                <h3 className="text-sm font-medium text-emerald-800 mb-1 flex items-center">
                  <FileText className="w-4 h-4 mr-1" />
                  Total Reports
                </h3>
                <div className="mt-3">
                  <div className="text-3xl font-bold text-gray-900">
                    {users.reduce((sum, user) => sum + user.report_count, 0)}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    From {total} active contributors
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <h3 className="text-sm font-medium text-blue-800 mb-1 flex items-center">
                  <Medal className="w-4 h-4 mr-1" />
                  Achievement Rates
                </h3>
                <div className="mt-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">10+ Reports</span>
                      <span className="text-sm font-medium text-gray-900">
                        {users.filter((u) => u.report_count >= 10).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">25+ Reports</span>
                      <span className="text-sm font-medium text-gray-900">
                        {users.filter((u) => u.report_count >= 25).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">50+ Reports</span>
                      <span className="text-sm font-medium text-gray-900">
                        {users.filter((u) => u.report_count >= 50).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Public Information Section */}
        <div className="mt-10 bg-white rounded-xl shadow-sm p-6 border-t-4 border-amber-500">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Trophy className="w-5 h-5 text-amber-600 mr-2" />
            About the Leaderboard
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Understanding the Leaderboard
              </h3>
              <p className="text-gray-600 mb-4">
                The EcoLafaek Leaderboard recognizes community members who
                actively contribute to keeping Timor-Leste clean through
                reporting waste incidents. Contributors are ranked based on the
                number of reports they have submitted.
              </p>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Leaderboard Filters
              </h3>
              <ul className="list-disc pl-5 text-gray-600 space-y-1">
                <li>
                  <span className="font-medium">All Reports</span>: Includes all
                  submitted reports regardless of validation status
                </li>
                <li>
                  <span className="font-medium">Valid Reports Only</span>:
                  Counts only reports that have been confirmed as actual waste
                  (excludes reports marked as "Not Garbage")
                </li>
                <li>
                  <span className="font-medium">Time Range</span>: Filter
                  reports by specific time periods to see recent activity
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                How to Improve Your Ranking
              </h3>
              <ul className="list-disc pl-5 text-gray-600 space-y-2">
                <li>Submit regular reports of waste incidents in your area</li>
                <li>
                  Ensure your reports are accurate and contain valid waste
                  sightings
                </li>
                <li>
                  Provide clear photos and precise locations for better
                  validation
                </li>
                <li>
                  Focus on areas with significant waste problems that need
                  attention
                </li>
                <li>
                  Participate in community cleanup events and report
                  before/after results
                </li>
              </ul>
              <div className="mt-6 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/download"
                  className="inline-flex items-center justify-center py-2.5 px-4 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                >
                  Download the App
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center justify-center py-2.5 px-4 bg-white border border-amber-200 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors text-sm font-medium"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModernLayout>
  );
}
