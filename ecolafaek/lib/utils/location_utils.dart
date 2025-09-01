import 'dart:math' as math;
import 'package:latlong2/latlong.dart'; // Replace google_maps_flutter import
import 'package:geocoding/geocoding.dart';

class LocationUtils {
  // Format address from placemark
  static String formatAddress(Placemark placemark) {
    return [
      placemark.street,
      placemark.subLocality,
      placemark.locality,
      placemark.administrativeArea,
      placemark.country,
    ].where((e) => e != null && e.isNotEmpty).join(', ');
  }

  // Format short address from placemark
  static String formatShortAddress(Placemark placemark) {
    return [
      placemark.street,
      placemark.subLocality,
      placemark.locality,
    ].where((e) => e != null && e.isNotEmpty).join(', ');
  }

  // Format coordinates as string
  static String formatCoordinates(double latitude, double longitude) {
    return '${latitude.toStringAsFixed(6)}, ${longitude.toStringAsFixed(6)}';
  }

  // Check if coordinates are valid
  static bool isValidCoordinate(double? latitude, double? longitude) {
    if (latitude == null || longitude == null) {
      return false;
    }
    
    return latitude >= -90 && latitude <= 90 && 
           longitude >= -180 && longitude <= 180;
  }

  // Calculate distance between two points in kilometers
  static double calculateDistance(LatLng point1, LatLng point2) {
    const int earthRadius = 6371; // Earth's radius in kilometers
    
    // Convert latitude and longitude from degrees to radians
    final lat1 = _degreesToRadians(point1.latitude);
    final lon1 = _degreesToRadians(point1.longitude);
    final lat2 = _degreesToRadians(point2.latitude);
    final lon2 = _degreesToRadians(point2.longitude);
    
    // Haversine formula
    final dLat = lat2 - lat1;
    final dLon = lon2 - lon1;
    
    final a = _square(sin(dLat / 2)) + 
              cos(lat1) * cos(lat2) * 
              _square(sin(dLon / 2));
    
    final c = 2 * asin(sqrt(a));
    
    return earthRadius * c;
  }

  // Convert degrees to radians
  static double _degreesToRadians(double degrees) {
    return degrees * (3.141592653589793 / 180);
  }

  // Square helper function
  static double _square(double value) {
    return value * value;
  }

  // Sin helper function
  static double sin(double value) {
    return math.sin(value);
  }

  // Cos helper function
  static double cos(double value) {
    return math.cos(value);
  }

  // Asin helper function
  static double asin(double value) {
    return math.asin(value);
  }

  // Sqrt helper function
  static double sqrt(double value) {
    return math.sqrt(value);
  }

  // Calculate center point for multiple coordinates
  static LatLng calculateCenter(List<LatLng> points) {
    if (points.isEmpty) {
      // Default to Dili, Timor-Leste
      return const LatLng(-8.556856, 125.560314);
    }
    
    if (points.length == 1) {
      return points.first;
    }
    
    double totalLat = 0;
    double totalLng = 0;
    
    for (final point in points) {
      totalLat += point.latitude;
      totalLng += point.longitude;
    }
    
    return LatLng(
      totalLat / points.length,
      totalLng / points.length,
    );
  }

  // Get bounds for a list of points
  static LatLngBounds getBounds(List<LatLng> points) {
    if (points.isEmpty) {
      // Default to Dili, Timor-Leste with small bounds
      return LatLngBounds(
        southwest: const LatLng(-8.570, 125.550),
        northeast: const LatLng(-8.540, 125.590),
      );
    }
    
    double? minLat, maxLat, minLng, maxLng;
    
    for (final point in points) {
      // Initialize with first point
      if (minLat == null) {
        minLat = maxLat = point.latitude;
        minLng = maxLng = point.longitude;
        continue;
      }
      
      // Update min/max values
      if (point.latitude < minLat) minLat = point.latitude;
      if (point.latitude > maxLat!) maxLat = point.latitude;
      if (point.longitude < minLng!) minLng = point.longitude;
      if (point.longitude > maxLng!) maxLng = point.longitude;
    }
    
    // Add padding (5%)
    final latPadding = (maxLat! - minLat!) * 0.05;
    final lngPadding = (maxLng! - minLng!) * 0.05;
    
    return LatLngBounds(
      southwest: LatLng(minLat! - latPadding, minLng! - lngPadding),
      northeast: LatLng(maxLat! + latPadding, maxLng! + lngPadding),
    );
  }

  // Format distance
  static String formatDistance(double distanceInKm) {
    if (distanceInKm < 1) {
      // Convert to meters
      final meters = (distanceInKm * 1000).round();
      return '$meters m';
    } else if (distanceInKm < 10) {
      // Show one decimal place for short distances
      return '${distanceInKm.toStringAsFixed(1)} km';
    } else {
      // Round to integer for longer distances
      return '${distanceInKm.round()} km';
    }
  }

  // Get appropriate zoom level based on distance
  static double getZoomLevel(double distanceInKm) {
    if (distanceInKm < 0.5) return 16; // Very close
    if (distanceInKm < 1) return 15;   // Within 1 km
    if (distanceInKm < 5) return 13;   // Within 5 km
    if (distanceInKm < 10) return 12;  // Within 10 km
    if (distanceInKm < 50) return 10;  // Regional
    return 8;                          // Long distance
  }
}

// Custom LatLngBounds class for OpenStreetMap
class LatLngBounds {
  final LatLng southwest;
  final LatLng northeast;

  const LatLngBounds({
    required this.southwest,
    required this.northeast,
  });
}