// components/HotspotCard.js
export default function HotspotCard({ hotspot, isSelected, onClick }) {
  // Helper function to safely format numeric values
  const formatNumber = (value, decimals = 1) => {
    // Convert to number if it's a string
    const num = typeof value === "string" ? parseFloat(value) : value;
    // Check if it's a valid number
    return !isNaN(num) ? num.toFixed(decimals) : "N/A";
  };

  return (
    <div
      className={`border rounded-lg p-4 transition-colors duration-200 cursor-pointer
        ${
          isSelected
            ? "bg-red-100 border-red-400"
            : "bg-white border-gray-200 hover:bg-red-50"
        }`}
      onClick={onClick}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0 h-10 w-10 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
          {hotspot.total_reports}
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-medium text-red-800 truncate">
            {hotspot.name}
          </h3>
          <div className="text-sm text-red-600">
            Active since {hotspot.first_reported}
          </div>
        </div>
      </div>
      <div className="mt-2 text-sm text-red-700">
        {hotspot.average_severity && (
          <div>
            Average severity: {formatNumber(hotspot.average_severity)}/10
          </div>
        )}
        <div>Radius: {formatNumber(hotspot.radius_meters / 1000)}km</div>
      </div>
    </div>
  );
}
