// components/RefreshButton.js
import React from "react";

const RefreshButton = ({
  onClick,
  isRefreshing = false,
  label = "",
  className = "text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-50",
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isRefreshing}
      className={`${className} transition-colors duration-200 flex items-center ${
        isRefreshing ? "opacity-70 cursor-not-allowed" : ""
      }`}
      title="Refresh data"
    >
      {isRefreshing ? (
        <>
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          {label && <span className="ml-2">{label}...</span>}
        </>
      ) : (
        <>
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {label && <span className="ml-2">{label}</span>}
        </>
      )}
    </button>
  );
};

export default RefreshButton;
