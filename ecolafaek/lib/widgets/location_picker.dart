import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';

import '../providers/location_provider.dart';
import '../utils/location_utils.dart';
import '../config/app_config.dart';

class LocationPicker extends StatefulWidget {
  final double? initialLatitude;
  final double? initialLongitude;
  final Function(double latitude, double longitude, String? address) onLocationSelected;
  final bool showConfirmButton;
  final bool showCurrentLocationButton;
  final bool allowDragging;
  final double height;

  const LocationPicker({
    Key? key,
    this.initialLatitude,
    this.initialLongitude,
    required this.onLocationSelected,
    this.showConfirmButton = true,
    this.showCurrentLocationButton = true,
    this.allowDragging = true,
    this.height = 300,
  }) : super(key: key);

  @override
  State<LocationPicker> createState() => _LocationPickerState();
}

class _LocationPickerState extends State<LocationPicker> {
  final MapController _mapController = MapController();
  LatLng? _selectedLocation;
  String? _selectedAddress;
  bool _isLoading = true;
  bool _isAddressLoading = false;
  bool _isLocating = false;
  String? _errorMessage;
  List<Marker> _markers = [];
  
  @override
  void initState() {
    super.initState();
    _initializeMap();
  }
  
  // Initialize map with initial or current location
  Future<void> _initializeMap() async {
    setState(() {
      _isLoading = true;
    });
    
    try {
      // If initial coordinates are provided, use them
      if (widget.initialLatitude != null && widget.initialLongitude != null) {
        _selectedLocation = LatLng(widget.initialLatitude!, widget.initialLongitude!);
        _updateMarker();
        _fetchAddressFromCoordinates();
      } else {
        // Otherwise try to get current location
        await _getCurrentLocation();
      }
    } catch (e) {
      print('Error initializing map: $e');
      // Use default location (Dili, Timor-Leste)
      _selectedLocation = LatLng(
        AppConfig.defaultLatitude,
        AppConfig.defaultLongitude,
      );
      _updateMarker();
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }
  
  // Get current location
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
        _selectedLocation = LatLng(position.latitude, position.longitude);
        _selectedAddress = address;
        _isLocating = false;
      });
      
      _updateMarker();
      
      // Move map to the location
      _mapController.move(_selectedLocation!, 15);
      
    } catch (e) {
      print("Location error: $e");
      setState(() {
        _isLocating = false;
        _errorMessage = 'Failed to get your location. Please check your device settings or try again later.';
      });
    }
  }
  
  // Update marker on map
  void _updateMarker() {
    if (_selectedLocation == null) return;
    
    setState(() {
      _markers = [
        Marker(
          width: 40.0,
          height: 40.0,
          point: _selectedLocation!,
          child: const Icon(
            Icons.location_pin,
            color: Colors.red,
            size: 40,
          ),
        ),
      ];
    });
  }
  
  // Get address from selected coordinates
  Future<void> _fetchAddressFromCoordinates() async {
    if (_selectedLocation == null) return;
    
    setState(() {
      _isAddressLoading = true;
    });
    
    try {
      List<Placemark> placemarks = await placemarkFromCoordinates(
        _selectedLocation!.latitude,
        _selectedLocation!.longitude,
      );
      
      if (placemarks.isNotEmpty) {
        final placemark = placemarks.first;
        _selectedAddress = [
          placemark.street,
          placemark.subLocality,
          placemark.locality,
          placemark.administrativeArea,
        ].where((element) => element != null && element.isNotEmpty).join(', ');
      }
    } catch (e) {
      print('Error getting address: $e');
      _selectedAddress = 'Unknown location';
    } finally {
      setState(() {
        _isAddressLoading = false;
      });
    }
  }
  
  // Handle confirming the selected location
  void _confirmLocation() {
    if (_selectedLocation != null) {
      widget.onLocationSelected(
        _selectedLocation!.latitude,
        _selectedLocation!.longitude,
        _selectedAddress,
      );
    }
  }
  
  @override
  Widget build(BuildContext context) {
    if (_isLoading || _selectedLocation == null) {
      return SizedBox(
        height: widget.height,
        child: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Map
        SizedBox(
          height: widget.height,
          child: Stack(
            children: [
              // OpenStreetMap
              FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  initialCenter: _selectedLocation!,
                  initialZoom: 15.0,
                  onTap: widget.allowDragging 
                    ? (_, point) {
                        setState(() {
                          _selectedLocation = point;
                        });
                        _updateMarker();
                        _fetchAddressFromCoordinates();
                      }
                    : null,
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.example.tl_waste_monitoring',
                  ),
                  MarkerLayer(markers: _markers),
                ],
              ),
              
              // Current location button
              if (widget.showCurrentLocationButton)
                Positioned(
                  right: 16,
                  bottom: 16,
                  child: FloatingActionButton(
                    mini: true,
                    onPressed: _getCurrentLocation,
                    backgroundColor: Colors.white,
                    child: const Icon(
                      Icons.my_location,
                      color: Colors.blue,
                    ),
                  ),
                ),
                
              // Error message
              if (_errorMessage != null)
                Positioned(
                  top: 10,
                  left: 10,
                  right: 10,
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    color: Colors.red.withOpacity(0.8),
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                ),
            ],
          ),
        ),
        
        // Address display
        Container(
          padding: const EdgeInsets.all(12),
          color: Colors.white,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Selected Location',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 4),
              
              if (_isAddressLoading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: SizedBox(
                    height: 15,
                    width: 15,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                    ),
                  ),
                )
              else
                Text(
                  _selectedAddress ?? 'Unknown location',
                  style: TextStyle(
                    color: Colors.grey[600],
                  ),
                ),
              
              if (_selectedLocation != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    '${_selectedLocation!.latitude.toStringAsFixed(6)}, ${_selectedLocation!.longitude.toStringAsFixed(6)}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[500],
                    ),
                  ),
                ),
              
              // Confirm button
              if (widget.showConfirmButton)
                Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: ElevatedButton(
                    onPressed: _confirmLocation,
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size.fromHeight(45),
                    ),
                    child: const Text('Confirm Location'),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}