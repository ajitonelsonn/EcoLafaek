// components/HotspotMap.js
import React, { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Default center coordinates (Dili, Timor-Leste)
const DEFAULT_CENTER = [-8.55, 125.56];

// Helper function to safely parse numeric values
const parseNumeric = (value) => {
  if (value === undefined || value === null) return NaN;
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(num) ? NaN : num;
};

// Helper function to validate coordinates
const isValidCoordinate = (lat, lng) => {
  const validLat = parseNumeric(lat);
  const validLng = parseNumeric(lng);
  return (
    !isNaN(validLat) &&
    !isNaN(validLng) &&
    validLat >= -90 &&
    validLat <= 90 &&
    validLng >= -180 &&
    validLng <= 180
  );
};

// Helper function to safely format numeric values
const formatNumber = (value, decimals = 1) => {
  const num = parseNumeric(value);
  return !isNaN(num) ? num.toFixed(decimals) : "N/A";
};

const HotspotMap = ({ hotspots = [], selectedHotspot, onHotspotSelect }) => {
  const router = useRouter();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const circlesRef = useRef({});

  // Function to create hotspot popup content
  const createHotspotPopup = (hotspot) => {
    return `
      <div class="max-w-xs">
        <div class="font-semibold text-green-700">${hotspot.name}</div>
        <div class="text-sm">
          <div>Reports: ${hotspot.total_reports}</div>
          ${
            hotspot.average_severity
              ? `<div>Avg. Severity: ${formatNumber(
                  hotspot.average_severity
                )}/10</div>`
              : ""
          }
          <div>First reported: ${hotspot.first_reported}</div>
          <div>Radius: ${formatNumber(hotspot.radius_meters / 1000)}km</div>
        </div>
        <div class="mt-3 text-center">
          <button 
            id="view-hotspot-${hotspot.hotspot_id}"
            class="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors cursor-pointer"
          >
            View Details
          </button>
        </div>
      </div>
    `;
  };

  // Initialize map
  useEffect(() => {
    // Fix for Leaflet's default icon issue
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    });

    // Initialize map if it doesn't exist
    if (!mapInstanceRef.current && mapRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView(
        DEFAULT_CENTER,
        11
      );

      // Add base tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapInstanceRef.current);
    }

    return () => {
      // Clean up map instance when component unmounts
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update hotspots on the map
  useEffect(() => {
    if (!mapInstanceRef.current || !hotspots) return;

    // Clear previous circles that are no longer in the data
    Object.keys(circlesRef.current).forEach((id) => {
      const hotspotExists = hotspots.some(
        (h) => h.hotspot_id.toString() === id
      );
      if (!hotspotExists) {
        circlesRef.current[id].remove();
        delete circlesRef.current[id];
      }
    });

    // Filter valid hotspots
    const validHotspots = hotspots.filter((hotspot) =>
      isValidCoordinate(hotspot.center_latitude, hotspot.center_longitude)
    );

    // Calculate map center
    let center = DEFAULT_CENTER;
    if (
      selectedHotspot &&
      isValidCoordinate(
        selectedHotspot.center_latitude,
        selectedHotspot.center_longitude
      )
    ) {
      center = [
        parseNumeric(selectedHotspot.center_latitude),
        parseNumeric(selectedHotspot.center_longitude),
      ];
    } else if (validHotspots.length > 0) {
      const totalLat = validHotspots.reduce(
        (sum, h) => sum + parseNumeric(h.center_latitude),
        0
      );
      const totalLng = validHotspots.reduce(
        (sum, h) => sum + parseNumeric(h.center_longitude),
        0
      );
      center = [
        totalLat / validHotspots.length,
        totalLng / validHotspots.length,
      ];
    }

    // Update or add circles for hotspots
    validHotspots.forEach((hotspot) => {
      const hotspotId = hotspot.hotspot_id.toString();
      const position = [
        parseNumeric(hotspot.center_latitude),
        parseNumeric(hotspot.center_longitude),
      ];

      const isSelected = selectedHotspot?.hotspot_id === hotspot.hotspot_id;

      // Update circle options to use green colors instead of red
      const circleOptions = {
        radius: parseNumeric(hotspot.radius_meters) || 500,
        fillColor: isSelected ? "#15803D" : "#22C55E", // Green-700 and Green-500
        fillOpacity: isSelected ? 0.4 : 0.2,
        color: isSelected ? "#166534" : "#16A34A", // Green-800 and Green-600
        weight: isSelected ? 2 : 1,
        bubblingMouseEvents: false,
      };

      // Update existing circle or create a new one
      if (circlesRef.current[hotspotId]) {
        // Update existing circle
        circlesRef.current[hotspotId].setLatLng(position);
        circlesRef.current[hotspotId].setRadius(circleOptions.radius);
        circlesRef.current[hotspotId].setStyle({
          fillColor: circleOptions.fillColor,
          fillOpacity: circleOptions.fillOpacity,
          color: circleOptions.color,
          weight: circleOptions.weight,
        });
      } else {
        // Create new circle
        const circle = L.circle(position, circleOptions).addTo(
          mapInstanceRef.current
        );

        // Create hotspot popup
        const hotspotPopupContent = createHotspotPopup(hotspot);
        const hotspotPopup = L.popup({
          className: "modern-popup",
          closeButton: true,
          maxWidth: 300,
        }).setContent(hotspotPopupContent);

        circle.bindPopup(hotspotPopup);

        // Add event listener for the button after popup opens
        circle.on("popupopen", () => {
          const button = document.getElementById(
            `view-hotspot-${hotspot.hotspot_id}`
          );
          if (button) {
            button.addEventListener("click", (e) => {
              e.stopPropagation();
              if (onHotspotSelect) {
                onHotspotSelect(hotspot);
              } else {
                router.push(`/hotspots?id=${hotspot.hotspot_id}`);
              }
            });
          }
        });

        // Store the circle reference
        circlesRef.current[hotspotId] = circle;
      }
    });

    // If a hotspot is selected, center the map on it
    if (
      selectedHotspot &&
      isValidCoordinate(
        selectedHotspot.center_latitude,
        selectedHotspot.center_longitude
      )
    ) {
      mapInstanceRef.current.setView(
        [
          parseNumeric(selectedHotspot.center_latitude),
          parseNumeric(selectedHotspot.center_longitude),
        ],
        13
      );
    } else if (validHotspots.length > 0) {
      // Create bounds from all hotspots
      const bounds = L.latLngBounds(
        validHotspots.map((h) => [
          parseNumeric(h.center_latitude),
          parseNumeric(h.center_longitude),
        ])
      );

      // Fit map to bounds
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [hotspots, selectedHotspot, onHotspotSelect, router]);

  return <div ref={mapRef} style={{ height: "100%", width: "100%" }}></div>;
};

export default HotspotMap;
