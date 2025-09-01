import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:latlong2/latlong.dart'; // Replace google_maps_flutter import

class LocationProvider with ChangeNotifier {
  double? _latitude;
  double? _longitude;
  String? _address;
  String? _locationName;
  bool _isLoading = false;
  bool _hasError = false;
  String _errorMessage = '';
  
  // Getters
  double? get latitude => _latitude;
  double? get longitude => _longitude;
  String? get address => _address;
  String? get locationName => _locationName;
  bool get isLoading => _isLoading;
  bool get hasError => _hasError;
  String get errorMessage => _errorMessage;
  LatLng? get position => (_latitude != null && _longitude != null) 
      ? LatLng(_latitude!, _longitude!) 
      : null;
  
  // Check if location services are enabled
  Future<bool> checkLocationServices() async {
    try {
      return await Geolocator.isLocationServiceEnabled();
    } catch (e) {
      _setError('Failed to check location services: ${e.toString()}');
      return false;
    }
  }
  
  // Check and request location permission
  Future<LocationPermission> checkAndRequestLocationPermission() async {
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      
      return permission;
    } catch (e) {
      _setError('Failed to check/request location permission: ${e.toString()}');
      return LocationPermission.denied;
    }
  }
  
  // Get current location
  Future<bool> getCurrentLocation() async {
    _setLoading(true);
    _clearError();
    
    try {
      // Check if location services are enabled
      final isEnabled = await checkLocationServices();
      if (!isEnabled) {
        _setError('Location services are disabled. Please enable them in settings.');
        return false;
      }
      
      // Check permissions
      final permission = await checkAndRequestLocationPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        _setError('Location permission is required to determine your location.');
        return false;
      }
      
      // Get current position
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      
      _latitude = position.latitude;
      _longitude = position.longitude;
      
      // Get address from coordinates
      await getAddressFromCoordinates();
      
      notifyListeners();
      return true;
    } catch (e) {
      _setError('Failed to get current location: ${e.toString()}');
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  // Get address from current coordinates
  Future<void> getAddressFromCoordinates() async {
    if (_latitude == null || _longitude == null) {
      _setError('Coordinates not available');
      return;
    }
    
    try {
      List<Placemark> placemarks = await placemarkFromCoordinates(
        _latitude!,
        _longitude!,
      );
      
      if (placemarks.isNotEmpty) {
        final placemark = placemarks.first;
        
        // Format full address
        _address = [
          placemark.street,
          placemark.subLocality,
          placemark.locality,
          placemark.administrativeArea,
          placemark.country,
        ].where((e) => e != null && e.isNotEmpty).join(', ');
        
        // Format shorter location name
        _locationName = [
          placemark.street,
          placemark.subLocality,
          placemark.locality,
        ].where((e) => e != null && e.isNotEmpty).join(', ');
        
        notifyListeners();
      }
    } catch (e) {
      _setError('Failed to get address: ${e.toString()}');
    }
  }
  
  // Get coordinates from address
  Future<bool> getCoordinatesFromAddress(String address) async {
    _setLoading(true);
    _clearError();
    
    try {
      List<Location> locations = await locationFromAddress(address);
      
      if (locations.isNotEmpty) {
        _latitude = locations.first.latitude;
        _longitude = locations.first.longitude;
        _address = address;
        
        notifyListeners();
        return true;
      } else {
        _setError('No coordinates found for this address');
        return false;
      }
    } catch (e) {
      _setError('Failed to get coordinates: ${e.toString()}');
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  // Set location manually
  void setLocation({
    required double latitude,
    required double longitude,
    String? address,
    String? locationName,
  }) {
    _latitude = latitude;
    _longitude = longitude;
    _address = address;
    _locationName = locationName;
    
    notifyListeners();
  }
  
  // Calculate distance between two points in kilometers
  double calculateDistance(double startLatitude, double startLongitude, 
                            double endLatitude, double endLongitude) {
    return Geolocator.distanceBetween(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    ) / 1000; // Convert meters to kilometers
  }
  
  // Distance from current location
  double? distanceFromCurrentLocation(double latitude, double longitude) {
    if (_latitude == null || _longitude == null) {
      return null;
    }
    
    return calculateDistance(_latitude!, _longitude!, latitude, longitude);
  }
  
  // Utility methods for state management
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }
  
  void _setError(String message) {
    _hasError = true;
    _errorMessage = message;
    notifyListeners();
  }
  
  void _clearError() {
    _hasError = false;
    _errorMessage = '';
    notifyListeners();
  }
  
  // Clear location data
  void clearLocation() {
    _latitude = null;
    _longitude = null;
    _address = null;
    _locationName = null;
    _clearError();
    notifyListeners();
  }
}