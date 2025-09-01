import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:flutter/foundation.dart';

class LocationService {
  // Check if location services are enabled
  Future<bool> isLocationServiceEnabled() async {
    return await Geolocator.isLocationServiceEnabled();
  }

  // Check and request location permission
  Future<LocationPermission> checkPermission() async {
    LocationPermission permission = await Geolocator.checkPermission();
    
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    
    return permission;
  }

  // Get current position
  Future<Position?> getCurrentPosition({
    LocationAccuracy accuracy = LocationAccuracy.high,
    bool requestPermission = true,
  }) async {
    try {
      // Check if location services are enabled
      final isEnabled = await isLocationServiceEnabled();
      if (!isEnabled) {
        return null;
      }
      
      // Check permissions
      LocationPermission permission = await Geolocator.checkPermission();
      
      if (permission == LocationPermission.denied && requestPermission) {
        permission = await Geolocator.requestPermission();
      }
      
      if (permission == LocationPermission.denied || 
          permission == LocationPermission.deniedForever) {
        return null;
      }
      
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: accuracy,
      );
    } catch (e) {
      debugPrint('Error getting current position: ${e.toString()}');
      return null;
    }
  }

  // Get address from coordinates
  Future<Map<String, dynamic>> getAddressFromCoordinates(
    double latitude, 
    double longitude,
  ) async {
    try {
      List<Placemark> placemarks = await placemarkFromCoordinates(latitude, longitude);
      
      if (placemarks.isEmpty) {
        return {
          'success': false,
          'message': 'No address found for these coordinates',
        };
      }
      
      final placemark = placemarks.first;
      
      // Format full address
      final fullAddress = [
        placemark.street,
        placemark.subLocality,
        placemark.locality,
        placemark.administrativeArea,
        placemark.country,
        placemark.postalCode,
      ].where((e) => e != null && e.isNotEmpty).join(', ');
      
      // Format shorter name for display
      final locationName = [
        placemark.street,
        placemark.subLocality,
        placemark.locality,
      ].where((e) => e != null && e.isNotEmpty).join(', ');
      
      return {
        'success': true,
        'address': fullAddress,
        'locationName': locationName,
        'placemark': placemark,
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Error getting address: ${e.toString()}',
      };
    }
  }

  // Get coordinates from address
  Future<Map<String, dynamic>> getCoordinatesFromAddress(String address) async {
    try {
      List<Location> locations = await locationFromAddress(address);
      
      if (locations.isEmpty) {
        return {
          'success': false,
          'message': 'No coordinates found for this address',
        };
      }
      
      final location = locations.first;
      
      return {
        'success': true,
        'latitude': location.latitude,
        'longitude': location.longitude,
        'location': location,
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Error getting coordinates: ${e.toString()}',
      };
    }
  }

  // Calculate distance between two points in kilometers
  double calculateDistance(
    double startLatitude, 
    double startLongitude, 
    double endLatitude, 
    double endLongitude,
  ) {
    return Geolocator.distanceBetween(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    ) / 1000; // Convert meters to kilometers
  }

  // Check if coordinates are valid
  bool isValidCoordinate(double? latitude, double? longitude) {
    if (latitude == null || longitude == null) {
      return false;
    }
    
    return latitude >= -90 && latitude <= 90 && 
           longitude >= -180 && longitude <= 180;
  }

  // Get last known position
  Future<Position?> getLastKnownPosition() async {
    try {
      return await Geolocator.getLastKnownPosition();
    } catch (e) {
      debugPrint('Error getting last known position: ${e.toString()}');
      return null;
    }
  }

  // Open location settings
  Future<bool> openLocationSettings() async {
    return await Geolocator.openLocationSettings();
  }

  // Open app settings
  Future<bool> openAppSettings() async {
    return await Geolocator.openAppSettings();
  }

  Future<void> _getCurrentLocation() async {
  setState(() {
    _isLocating = true;
    _errorMessage = null;
  });
  
  try {
    // Check if location services are enabled
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      // Location services are not enabled
      setState(() {
        _isLocating = false;
        _errorMessage = 'Location services are disabled. Please enable them in settings.';
      });
      
      // Show dialog prompting user to enable location services
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Location Services Disabled'),
          content: const Text('Please enable location services to use this feature.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                Geolocator.openLocationSettings();
              },
              child: const Text('Open Settings'),
            ),
          ],
        ),
      );
      return;
    }

    // Check location permission
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        // Permissions are denied
        setState(() {
          _isLocating = false;
          _errorMessage = 'Location permissions are denied. Please enable them to use this feature.';
        });
        return;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      // Permissions are permanently denied
      setState(() {
        _isLocating = false;
        _errorMessage = 'Location permissions are permanently denied. Please enable them in app settings.';
      });
      
      // Show dialog prompting user to open app settings
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Location Permission Required'),
          content: const Text('Please grant location permission in app settings to use this feature.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                Geolocator.openAppSettings();
              },
              child: const Text('Open Settings'),
            ),
          ],
        ),
      );
      return;
    }

    // Get current position with timeout
    final position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
      timeLimit: const Duration(seconds: 15),
    );
    
    // Get address from coordinates
    List<Placemark> placemarks = await placemarkFromCoordinates(
      position.latitude,
      position.longitude,
    );
    
    // Format address
    final placemark = placemarks.first;
    final address = [
      placemark.street,
      placemark.subLocality,
      placemark.locality,
      placemark.administrativeArea,
    ].where((element) => element != null && element.isNotEmpty).join(', ');
    
    setState(() {
      _latitude = position.latitude;
      _longitude = position.longitude;
      _locationName = address;
      _isLocating = false;
    });
    
  } catch (e) {
    print("Location error: $e");
    setState(() {
      _isLocating = false;
      _errorMessage = 'Failed to get your location. Please check your device settings or try again later.';
    });
  }
}

  // Get bounds for a list of locations
  LatLngBounds getBoundsForLocations(List<LatLng> locations) {
    if (locations.isEmpty) {
      // Default to Dili, Timor-Leste
      return LatLngBounds(
        southwest: const LatLng(-8.570, 125.550),
        northeast: const LatLng(-8.540, 125.590),
      );
    }
    
    double? minLat, maxLat, minLng, maxLng;
    
    for (final latLng in locations) {
      if (minLat == null || latLng.latitude < minLat) {
        minLat = latLng.latitude;
      }
      
      if (maxLat == null || latLng.latitude > maxLat) {
        maxLat = latLng.latitude;
      }
      
      if (minLng == null || latLng.longitude < minLng) {
        minLng = latLng.longitude;
      }
      
      if (maxLng == null || latLng.longitude > maxLng) {
        maxLng = latLng.longitude;
      }
    }
    
    // Add padding
    minLat = minLat! - 0.01;
    maxLat = maxLat! + 0.01;
    minLng = minLng! - 0.01;
    maxLng = maxLng! + 0.01;
    
    return LatLngBounds(
      southwest: LatLng(minLat, minLng),
      northeast: LatLng(maxLat, maxLng),
    );
  }
}