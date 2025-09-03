// components/TrendChart.js
import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function TrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-gray-500">No trend data available</p>
      </div>
    );
  }

  // Format dates and ensure they're valid
  const formattedData = data.map((item) => {
    // Handle different data structures
    if (typeof item === "object") {
      let dateValue;
      let count;

      // Handle data from statsData.daily_reports
      if (
        item.date &&
        (typeof item.count === "number" || typeof item.count === "string")
      ) {
        dateValue = item.date;
        count = item.count;
      }
      // Handle data from trendData.report_trends
      else if (item.period && typeof item.report_count === "number") {
        dateValue = item.period;
        count = item.report_count;
      }
      // Default format as fallback
      else {
        const keys = Object.keys(item);
        dateValue = keys[0];
        count = item[keys[0]];
      }

      // Try to create a proper date object
      let formattedDate;
      try {
        const dateObj = new Date(dateValue);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
        } else {
          formattedDate = dateValue.toString();
        }
      } catch (error) {
        formattedDate = dateValue.toString();
      }

      return {
        date: formattedDate,
        count: parseInt(count, 10) || 0,
      };
    }
    return { date: "Unknown", count: 0 };
  });

  // Sort data by date if possible
  const sortedData = [...formattedData].sort((a, b) => {
    // Try to convert to dates for comparison
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);

    // If both are valid dates, compare them
    if (!isNaN(dateA) && !isNaN(dateB)) {
      return dateA - dateB;
    }

    // Otherwise use string comparison
    return a.date.localeCompare(b.date);
  });

  const chartData = {
    labels: sortedData.map((item) => item.date),
    datasets: [
      {
        label: "Reports",
        data: sortedData.map((item) => item.count),
        borderColor: "#16A34A", // Green-600 instead of Emerald
        backgroundColor: "rgba(22, 163, 74, 0.1)", // Green-600 with transparency
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#16A34A", // Green-600
        pointBorderColor: "#FFFFFF",
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: "#6B7280", // Gray 500
          font: {
            family: "'Inter', 'system-ui', sans-serif",
            size: 11,
          },
        },
        grid: {
          color: "rgba(243, 244, 246, 1)", // Gray 100
          drawBorder: false,
        },
      },
      x: {
        ticks: {
          color: "#6B7280", // Gray 500
          font: {
            family: "'Inter', 'system-ui', sans-serif",
            size: 11,
          },
          maxRotation: 45,
          minRotation: 45,
        },
        grid: {
          display: false,
          drawBorder: false,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
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
        displayColors: false,
        callbacks: {
          title: function (context) {
            return context[0].label;
          },
          label: function (context) {
            return `Reports: ${context.raw}`;
          },
        },
      },
    },
  };

  return (
    <div className="h-full w-full">
      <Line data={chartData} options={options} className="custom-chart" />
    </div>
  );
}
