// components/LoadingAnimation.js
import React from "react";

export default function LoadingAnimation({
  text = "Loading data...",
  size = "md",
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} border-b-2 border-green-500 mb-2`}
      ></div>
      <p className="text-green-600 font-medium">{text}</p>
    </div>
  );
}
