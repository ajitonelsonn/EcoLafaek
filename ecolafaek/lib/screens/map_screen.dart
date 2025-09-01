import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:animate_do/animate_do.dart';
import 'package:flutter/services.dart';

import '../providers/report_provider.dart';
import '../providers/location_provider.dart';
import '../providers/auth_provider.dart';
import '../models/report.dart';
import '../widgets/loading_indicator.dart';
import 'report_detail_screen.dart';

class MapScreen extends StatefulWidget {
  static const routeName = '/map';
  final bool isInTabView;

  const MapScreen({
    Key? key,
    this.isInTabView = false,
  }) : super(key: key);

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> with TickerProviderStateMixin, AutomaticKeepAliveClientMixin {
  final MapController _mapController = MapController();
  bool _isLoading = false;
  bool _isLocationGranted = false;
  bool _isShowingList = false;
  String? _errorMessage;
  
  // Current location
  double? _currentLat;
  double? _currentLng;
  
  // List of reports to show on map
  List<Report> _reports = [];
  
  // Selected report marker
  Report? _selectedReport;
  
  // Track initialization to prevent repeated calls
  bool _isInitialized = false;
  
  @override
  bool get wantKeepAlive => true; // Keep state alive when switching tabs
  
  @override
  void initState() {
    super.initState();
    // Only initialize once
    if (!_isInitialized) {
      _initializeMap();
      _isInitialized = true;
    }
  }
  
  // Initialize map only once
  Future<void> _initializeMap() async {
    _checkLocationPermission();
    _loadReports();
  }
  
  // Check if location permission is granted
  Future<void> _checkLocationPermission() async {
    try {
      final permission = await Geolocator.checkPermission();
      setState(() {
        _isLocationGranted = permission == LocationPermission.always ||
                            permission == LocationPermission.whileInUse;
      });
      
      if (_isLocationGranted) {
        _getCurrentLocation();
      }
    } catch (e) {
      print('Error checking location permission: $e');
    }
  }
  
  // Get current location
  Future<void> _getCurrentLocation() async {
    if (!_isLocationGranted) return;
    
    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      
      setState(() {
        _currentLat = position.latitude;
        _currentLng = position.longitude;
      });
      
      // Move to current location on map
      _mapController.move(LatLng(_currentLat!, _currentLng!), 14.0);
    } catch (e) {
      print('Error getting current location: $e');
    }
  }
  
  // Request location permission
  Future<void> _requestLocationPermission() async {
    try {
      final permission = await Geolocator.requestPermission();
      setState(() {
        _isLocationGranted = permission == LocationPermission.always ||
                            permission == LocationPermission.whileInUse;
      });
      
      if (_isLocationGranted) {
        _getCurrentLocation();
      }
    } catch (e) {
      print('Error requesting location permission: $e');
    }
  }
  
  // Load reports from provider
  Future<void> _loadReports() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    
    try {
      // Get reports from provider
      final reportProvider = Provider.of<ReportProvider>(context, listen: false);
      
      // Only load if reports are empty (first time) or if explicitly refreshing
      if (reportProvider.reports.isEmpty) {
        await reportProvider.loadUserReports();
      }
      
      // Filter for only the user's reports
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final userId = authProvider.currentUser?.id;
      
      final allReports = reportProvider.reports;
      final myReports = allReports.where((report) => report.userId == userId).toList();
      
      setState(() {
        _reports = myReports;
        _isLoading = false;
      });
      
      // Zoom map to fit all markers if we have reports
      if (_reports.isNotEmpty) {
        _zoomToFitAllMarkers();
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load reports: ${e.toString()}';
        _isLoading = false;
      });
    }
  }
  
  // Refresh reports
  Future<void> _refreshReports() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    
    try {
      // Force reload from API
      final reportProvider = Provider.of<ReportProvider>(context, listen: false);
      await reportProvider.loadUserReports();
      
      // Update local reports list
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final userId = authProvider.currentUser?.id;
      
      final allReports = reportProvider.reports;
      final myReports = allReports.where((report) => report.userId == userId).toList();
      
      setState(() {
        _reports = myReports;
        _isLoading = false;
      });
      
      // Zoom map to fit all markers if we have reports
      if (_reports.isNotEmpty) {
        _zoomToFitAllMarkers();
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to refresh reports: ${e.toString()}';
        _isLoading = false;
      });
    }
  }
  
  // Zoom map to fit all markers
  void _zoomToFitAllMarkers() {
    if (_reports.isEmpty) return;
    
    // Get bounds of all markers
    double minLat = 90;
    double maxLat = -90;
    double minLng = 180;
    double maxLng = -180;
    
    for (final report in _reports) {
      if (report.latitude < minLat) minLat = report.latitude;
      if (report.latitude > maxLat) maxLat = report.latitude;
      if (report.longitude < minLng) minLng = report.longitude;
      if (report.longitude > maxLng) maxLng = report.longitude;
    }
    
    // Add padding to bounds
    minLat -= 0.05;
    maxLat += 0.05;
    minLng -= 0.05;
    maxLng += 0.05;
    
    // Create bounds from min/max values
    final bounds = LatLngBounds(
      LatLng(minLat, minLng),
      LatLng(maxLat, maxLng),
    );
    
    // Zoom map to fit bounds
    try {
      final centerZoom = _mapController.centerZoomFitBounds(bounds);
      _mapController.move(centerZoom.center, centerZoom.zoom);
    } catch (e) {
      print('Error zooming to fit markers: $e');
      
      // Fallback to current location or default
      if (_currentLat != null && _currentLng != null) {
        _mapController.move(LatLng(_currentLat!, _currentLng!), 14.0);
      } else if (_reports.isNotEmpty) {
        // If no current location, use first report
        final firstReport = _reports.first;
        _mapController.move(LatLng(firstReport.latitude, firstReport.longitude), 14.0);
      }
    }
  }
  
  // Handle marker tap
  void _onMarkerTap(Report report) {
    setState(() {
      _selectedReport = report;
    });
    
    // Center map on selected marker
    _mapController.move(LatLng(report.latitude, report.longitude), 15.0);
    
    // Show bottom sheet with report info
    _showReportBottomSheet(report);
  }
  
  // Show report details in bottom sheet
  void _showReportBottomSheet(Report report) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Report status
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: _getStatusColor(report.status).withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: _getStatusColor(report.status)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    _getStatusIcon(report.status),
                    size: 14,
                    color: _getStatusColor(report.status),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    report.status,
                    style: TextStyle(
                      color: _getStatusColor(report.status),
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Report description
            Text(
              'Description',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: Colors.grey[800],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              report.description,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[700],
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Location
            if (report.locationName != null)
              Row(
                children: [
                  Icon(Icons.location_on, color: Colors.grey[600], size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      report.locationName!,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                      ),
                    ),
                  ),
                ],
              ),
            
            const SizedBox(height: 24),
            
            // View details button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(ctx).pop(); // Close bottom sheet
                  Navigator.of(context).pushNamed(
                    ReportDetailScreen.routeName,
                    arguments: report.id,
                  ).then((_) {
                    _refreshReports(); // Refresh reports after viewing details
                  });
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).primaryColor,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'View Full Details',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  // Get color based on status
  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'submitted':
        return Colors.blue;
      case 'analyzing':
        return Colors.orange;
      case 'analyzed':
        return Colors.purple;
      case 'resolved':
        return Colors.green;
      case 'rejected':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
  
  // Get icon based on status
  IconData _getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'submitted':
        return Icons.send;
      case 'analyzing':
        return Icons.analytics;
      case 'analyzed':
        return Icons.done_all;
      case 'resolved':
        return Icons.check_circle;
      case 'rejected':
        return Icons.cancel;
      default:
        return Icons.help_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context); // Required for AutomaticKeepAliveClientMixin
    
    final theme = Theme.of(context);
    final primaryColor = theme.primaryColor;
    
    return Scaffold(
      appBar: widget.isInTabView
          ? null
          : AppBar(
              title: const Text('My Reports Map'),
              backgroundColor: primaryColor,
              centerTitle: true,
              actions: [
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: _refreshReports,
                  tooltip: 'Refresh reports',
                ),
              ],
            ),
      body: Stack(
        children: [
          // Map view
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _currentLat != null && _currentLng != null
                  ? LatLng(_currentLat!, _currentLng!)
                  : const LatLng(-8.556856, 125.560314), // Default to Dili, Timor-Leste
              initialZoom: 13.0,
              onTap: (_, __) {
                // Clear selected report when tapping on map
                setState(() {
                  _selectedReport = null;
                });
              },
            ),
            children: [
              // Base map layer
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.example.eco_lafaek',
              ),
              
              // Report markers
              MarkerLayer(
                markers: _reports.map((report) {
                  final isSelected = _selectedReport?.id == report.id;
                  final statusColor = _getStatusColor(report.status);
                  
                  return Marker(
                    width: isSelected ? 50 : 40,
                    height: isSelected ? 50 : 40,
                    point: LatLng(report.latitude, report.longitude),
                    child: GestureDetector(
                      onTap: () => _onMarkerTap(report),
                      child: TweenAnimationBuilder(
                        tween: Tween<double>(begin: 0.8, end: isSelected ? 1.2 : 1.0),
                        duration: const Duration(milliseconds: 300),
                        builder: (context, value, child) {
                          return Transform.scale(
                            scale: value,
                            child: Stack(
                              children: [
                                // Shadow
                                Positioned.fill(
                                  child: Icon(
                                    Icons.location_on,
                                    color: Colors.black.withOpacity(0.3),
                                    size: isSelected ? 50 : 40,
                                  ),
                                ),
                                // Marker
                                Icon(
                                  Icons.location_on,
                                  color: statusColor,
                                  size: isSelected ? 48 : 38,
                                ),
                                // Status indicator
                                Positioned(
                                  top: isSelected ? 8 : 6,
                                  left: isSelected ? 14 : 11,
                                  child: Container(
                                    width: isSelected ? 20 : 16,
                                    height: isSelected ? 20 : 16,
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      shape: BoxShape.circle,
                                      border: Border.all(color: statusColor, width: 2),
                                    ),
                                    child: Center(
                                      child: Icon(
                                        _getStatusIcon(report.status),
                                        color: statusColor,
                                        size: isSelected ? 12 : 10,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  );
                }).toList(),
              ),
              
              // Current location marker
              if (_currentLat != null && _currentLng != null)
                MarkerLayer(
                  markers: [
                    Marker(
                      width: 30,
                      height: 30,
                      point: LatLng(_currentLat!, _currentLng!),
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.blue[600],
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.2),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.my_location,
                          color: Colors.white,
                          size: 16,
                        ),
                      ),
                    ),
                  ],
                ),
            ],
          ),
          
          // No reports message (if needed)
          if (_reports.isEmpty && !_isLoading)
            Center(
              child: Container(
                padding: const EdgeInsets.all(16),
                margin: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.map_outlined,
                      size: 64,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No reports to display',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey[800],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Your reports will appear here on the map once you submit them.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          
          // Action buttons (right)
          Positioned(
            top: 16,
            right: 16,
            child: FadeInRight(
              duration: const Duration(milliseconds: 400),
              child: Column(
                children: [
                  // My location button
                  FloatingActionButton(
                    heroTag: 'btn_my_location',
                    mini: true,
                    onPressed: _isLocationGranted
                        ? _getCurrentLocation
                        : _requestLocationPermission,
                    backgroundColor: Colors.white,
                    foregroundColor: primaryColor,
                    elevation: 3,
                    child: Icon(
                      _isLocationGranted
                          ? Icons.my_location
                          : Icons.location_disabled,
                    ),
                  ),
                  const SizedBox(height: 12),
                  
                  // Zoom in button
                  FloatingActionButton(
                    heroTag: 'btn_zoom_in',
                    mini: true,
                    onPressed: () {
                      _mapController.move(
                        _mapController.camera.center,
                        _mapController.camera.zoom + 1,
                      );
                    },
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.grey[700],
                    elevation: 3,
                    child: const Icon(Icons.add),
                  ),
                  const SizedBox(height: 12),
                  
                  // Zoom out button
                  FloatingActionButton(
                    heroTag: 'btn_zoom_out',
                    mini: true,
                    onPressed: () {
                      _mapController.move(
                        _mapController.camera.center,
                        _mapController.camera.zoom - 1,
                      );
                    },
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.grey[700],
                    elevation: 3,
                    child: const Icon(Icons.remove),
                  ),
                  const SizedBox(height: 12),
                  
                  // Fit all markers button
                  FloatingActionButton(
                    heroTag: 'btn_fit_bounds',
                    mini: true,
                    onPressed: _reports.isNotEmpty ? _zoomToFitAllMarkers : null,
                    backgroundColor: Colors.white,
                    foregroundColor: _reports.isNotEmpty ? primaryColor : Colors.grey[400],
                    elevation: 3,
                    child: const Icon(Icons.fit_screen),
                  ),
                ],
              ),
            ),
          ),
          
          // Toggle list view button (bottom right)
          Positioned(
            right: 16,
            bottom: 16,
            child: FadeInUp(
              duration: const Duration(milliseconds: 400),
              child: FloatingActionButton(
                heroTag: 'btn_toggle_view',
                onPressed: () {
                  setState(() {
                    _isShowingList = !_isShowingList;
                  });
                  
                  // Dismiss selected report when toggling view
                  setState(() {
                    _selectedReport = null;
                  });
                },
                backgroundColor: primaryColor,
                foregroundColor: Colors.white,
                elevation: 4,
                child: Icon(_isShowingList ? Icons.map : Icons.list),
              ),
            ),
          ),
          
          // List view of reports (when toggled)
          if (_isShowingList)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: FadeInUp(
                duration: const Duration(milliseconds: 300),
                child: Container(
                  height: MediaQuery.of(context).size.height * 0.5,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(20),
                      topRight: Radius.circular(20),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 10,
                        offset: const Offset(0, -3),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      // Drag handle
                      Container(
                        margin: const EdgeInsets.only(top: 8),
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.grey[300],
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            Text(
                              'My Reports',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey[800],
                              ),
                            ),
                            const Spacer(),
                            Text(
                              '${_reports.length} found',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      ),
                      
                      const Divider(height: 1),
                      
                      // List of reports
                      Expanded(
                        child: _isLoading
                            ? const Center(child: CircularProgressIndicator())
                            : _reports.isEmpty
                                ? Center(
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(
                                          Icons.map_outlined,
                                          size: 60,
                                          color: Colors.grey[400],
                                        ),
                                        const SizedBox(height: 16),
                                        Text(
                                          'No reports found',
                                          style: TextStyle(
                                            fontSize: 16,
                                            color: Colors.grey[600],
                                          ),
                                        ),
                                      ],
                                    ),
                                  )
                                : ListView.separated(
                                    itemCount: _reports.length,
                                    separatorBuilder: (context, index) => const Divider(height: 1),
                                    itemBuilder: (context, index) {
                                      final report = _reports[index];
                                      return ListTile(
                                        title: Text(
                                          report.description.length > 50
                                              ? '${report.description.substring(0, 50)}...'
                                              : report.description,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                        subtitle: Text(
                                          report.locationName ?? 'Unknown location',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        leading: CircleAvatar(
                                          backgroundColor: _getStatusColor(report.status).withOpacity(0.2),
                                          child: Icon(
                                            _getStatusIcon(report.status),
                                            color: _getStatusColor(report.status),
                                            size: 20,
                                          ),
                                        ),
                                        trailing: const Icon(Icons.chevron_right),
                                        onTap: () {
                                          // Close list view
                                          setState(() {
                                            _isShowingList = false;
                                          });
                                          
                                          // Zoom to marker and select it
                                          _mapController.move(
                                            LatLng(report.latitude, report.longitude),
                                            15.0,
                                          );
                                          
                                          // Short delay before showing bottom sheet
                                          Future.delayed(const Duration(milliseconds: 300), () {
                                            if (mounted) {
                                              _onMarkerTap(report);
                                            }
                                          });
                                        },
                                      );
                                    },
                                  ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          
          // Loading indicator
          if (_isLoading)
            Container(
              color: Colors.black.withOpacity(0.3),
              child: const Center(
                child: LoadingIndicator(
                  message: 'Loading map data...',
                  color: Colors.white,
                ),
              ),
            ),
          
          // Error message
          if (_errorMessage != null)
            Positioned(
              top: 16,
              left: 16,
              right: 80, // Leave space for the action buttons
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red[50],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.red[300]!),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 5,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Icon(Icons.error_outline, color: Colors.red[700], size: 24),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Error loading map data',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.red[700],
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _errorMessage!,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.red[700],
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      color: Colors.red[700],
                      onPressed: () {
                        setState(() {
                          _errorMessage = null;
                        });
                      },
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}