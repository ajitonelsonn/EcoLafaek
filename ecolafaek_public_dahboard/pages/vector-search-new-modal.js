// Compact Report Details Modal - Based on reference image
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
                    : "9/1/2025"}
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
                      "The image shows various items such as bottles, a keyboard, and a mouse placed on a wooden desk within an indoor setting. All items appear to be in use or properly stored."
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

export default ReportDetailsModal;