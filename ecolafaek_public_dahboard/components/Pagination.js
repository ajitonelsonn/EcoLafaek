// components/Pagination.js
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  // Don't render pagination if there's only one page
  if (totalPages <= 1) {
    return null;
  }

  // Calculate range of pages to display
  const range = [];
  const maxVisiblePages = 5;
  let startPage, endPage;

  if (totalPages <= maxVisiblePages) {
    // If there are fewer pages than maxVisiblePages, show all
    startPage = 1;
    endPage = totalPages;
  } else {
    // Put current page in the middle if possible
    const middlePosition = Math.floor(maxVisiblePages / 2);

    if (currentPage <= middlePosition + 1) {
      // Current page is near the start
      startPage = 1;
      endPage = maxVisiblePages;
    } else if (currentPage >= totalPages - middlePosition) {
      // Current page is near the end
      startPage = totalPages - maxVisiblePages + 1;
      endPage = totalPages;
    } else {
      // Current page is in the middle
      startPage = currentPage - middlePosition;
      endPage = currentPage + middlePosition;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    range.push(i);
  }

  return (
    <nav className="flex justify-center">
      <ul className="flex items-center space-x-1">
        {/* Previous button */}
        <li>
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-2 py-2 rounded-md text-sm font-medium ${
              currentPage === 1
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-100 focus:z-10 focus:outline-none focus:ring-2 focus:ring-green-500"
            }`}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </li>

        {/* First page if not visible */}
        {startPage > 1 && (
          <>
            <li>
              <button
                onClick={() => onPageChange(1)}
                className="relative inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 focus:z-10 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                1
              </button>
            </li>
            {startPage > 2 && (
              <li>
                <span className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500">
                  ...
                </span>
              </li>
            )}
          </>
        )}

        {/* Page numbers */}
        {range.map((page) => (
          <li key={page}>
            <button
              onClick={() => onPageChange(page)}
              className={`relative inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                currentPage === page
                  ? "z-10 bg-green-600 text-white"
                  : "text-gray-700 hover:bg-gray-100 focus:z-10 focus:outline-none focus:ring-2 focus:ring-green-500"
              }`}
            >
              {page}
            </button>
          </li>
        ))}

        {/* Last page if not visible */}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <li>
                <span className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500">
                  ...
                </span>
              </li>
            )}
            <li>
              <button
                onClick={() => onPageChange(totalPages)}
                className="relative inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 focus:z-10 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {totalPages}
              </button>
            </li>
          </>
        )}

        {/* Next button */}
        <li>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={`relative inline-flex items-center px-2 py-2 rounded-md text-sm font-medium ${
              currentPage === totalPages
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-100 focus:z-10 focus:outline-none focus:ring-2 focus:ring-green-500"
            }`}
            aria-label="Next page"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </li>
      </ul>
    </nav>
  );
}
