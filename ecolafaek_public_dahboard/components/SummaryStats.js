// components/SummaryStats.js
import React from "react";

export default function SummaryStats({ data }) {
  if (!data) return null;

  const stats = [
    {
      title: "Total Reports",
      value: data.total_reports || 0,
      icon: "📊",
      color: "green",
      bg: "bg-green-100",
      border: "border-green-200",
      text: "text-green-700",
    },
    {
      title: "Active Hotspots",
      value: data.hotspot_count || 0,
      icon: "📍",
      color: "red",
      bg: "bg-red-100",
      border: "border-red-200",
      text: "text-red-700",
    },
    {
      title: "Average Severity",
      value: data.avg_severity ? data.avg_severity.toFixed(1) + "/10" : "N/A",
      icon: "⚠️",
      color: "amber",
      bg: "bg-amber-100",
      border: "border-amber-200",
      text: "text-amber-700",
    },
    {
      title: "Waste Types",
      value: Object.keys(data.waste_type_counts || {}).length,
      icon: "♻️",
      color: "green",
      bg: "bg-green-100",
      border: "border-green-200",
      text: "text-green-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className={`${stat.bg} ${stat.border} border rounded-xl p-5 shadow-sm`}
        >
          <div className="flex items-center gap-4">
            <div className="text-2xl">{stat.icon}</div>
            <div>
              <h3 className="text-gray-700 font-medium">{stat.title}</h3>
              <p className={`text-2xl font-bold ${stat.text}`}>{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
