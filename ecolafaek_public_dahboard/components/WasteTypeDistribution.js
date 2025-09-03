// components/WasteTypeDistribution.js
import React from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

// Updated color palette with greens as primary colors
const COLORS = [
  "rgba(22, 163, 74, 0.85)", // Green-600
  "rgba(5, 150, 105, 0.85)", // Emerald-600
  "rgba(16, 185, 129, 0.85)", // Emerald-500
  "rgba(59, 130, 246, 0.85)", // Blue-500
  "rgba(245, 158, 11, 0.85)", // Amber-500
  "rgba(139, 92, 246, 0.85)", // Purple-500
  "rgba(239, 68, 68, 0.85)", // Red-500
  "rgba(6, 182, 212, 0.85)", // Cyan-500
  "rgba(75, 85, 99, 0.85)", // Gray-600
  "rgba(249, 115, 22, 0.85)", // Orange-500
];

// Border colors - slightly darker versions
const BORDER_COLORS = [
  "rgba(21, 128, 61, 1)", // Green-700
  "rgba(4, 120, 87, 1)", // Emerald-700
  "rgba(5, 150, 105, 1)", // Emerald-600
  "rgba(37, 99, 235, 1)", // Blue-600
  "rgba(217, 119, 6, 1)", // Amber-600
  "rgba(124, 58, 237, 1)", // Purple-600
  "rgba(220, 38, 38, 1)", // Red-600
  "rgba(8, 145, 178, 1)", // Cyan-600
  "rgba(55, 65, 81, 1)", // Gray-700
  "rgba(234, 88, 12, 1)", // Orange-600
];

export default function WasteTypeDistribution({ data }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-gray-500">No waste type data available</p>
      </div>
    );
  }

  // Get the data entries and sort by value (descending)
  const sortedEntries = Object.entries(data).sort((a, b) => b[1] - a[1]);

  // Take top 6 items and group the rest as "Other"
  let chartLabels = [];
  let chartValues = [];
  let otherValue = 0;

  sortedEntries.forEach((entry, index) => {
    if (index < 6) {
      chartLabels.push(entry[0]);
      chartValues.push(entry[1]);
    } else {
      otherValue += entry[1];
    }
  });

  // Add "Other" category if there are more than 6 types
  if (otherValue > 0) {
    chartLabels.push("Other");
    chartValues.push(otherValue);
  }

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        data: chartValues,
        backgroundColor: COLORS.slice(0, chartLabels.length),
        borderColor: BORDER_COLORS.slice(0, chartLabels.length),
        borderWidth: 1,
        hoverOffset: 10,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: {
          boxWidth: 12,
          padding: 15,
          usePointStyle: true,
          pointStyle: "circle",
          font: {
            family: "'Inter', 'system-ui', sans-serif",
            size: 11,
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#166534", // Green-800
        bodyColor: "#4B5563", // Gray 600
        bodyFont: {
          family: "'Inter', 'system-ui', sans-serif",
          size: 12,
        },
        titleFont: {
          family: "'Inter', 'system-ui', sans-serif",
          size: 13,
          weight: "bold",
        },
        padding: 12,
        borderColor: "rgba(229, 231, 235, 1)", // Gray 200
        borderWidth: 1,
        callbacks: {
          label: function (context) {
            const label = context.label || "";
            const value = context.formattedValue || "";
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((context.raw / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
    cutout: "30%", // Makes the pie chart have a donut hole
    radius: "90%",
  };

  return (
    <div className="h-full w-full">
      <Pie data={chartData} options={options} className="custom-chart" />
    </div>
  );
}
