// components/SkeletonCard.js
import React from "react";

export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 rounded-lg bg-green-50 h-10 w-10"></div>
        <div className="h-6 bg-gray-200 rounded w-16"></div>
      </div>
      <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    </div>
  );
}
