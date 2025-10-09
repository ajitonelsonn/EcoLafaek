import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:animate_do/animate_do.dart';
import 'package:lottie/lottie.dart' hide Marker;
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;

import '../providers/report_provider.dart';
import '../providers/location_provider.dart';
import '../widgets/custom_button.dart';
import '../widgets/loading_indicator.dart';
import '../utils/validators.dart';
import '../models/report.dart';
import '../utils/image_utils.dart';

// Move enum outside the class to the top level
enum SubmissionStage {
  uploading,
  processing,
  success,
}

class ReportScreen extends StatefulWidget {
  static const routeName = '/report';

  const ReportScreen({Key? key}) : super(key: key);

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  
  // Animation controller for submission stages
  late AnimationController _animationController;
  late Animation<double> _uploadProgressAnimation;
  late Animation<double> _processingAnimation;
  
  // Page controller for stepper
  final PageController _pageController = PageController();
  int _currentStep = 0;
  
  // Submission stage
  SubmissionStage _currentStage = SubmissionStage.uploading;
  
  File? _imageFile;
  File? _optimizedImageFile;
  bool _isSubmitting = false;
  bool _isSuccessful = false;
  bool _isLocating = false;
  bool _isOptimizingImage = false;
  String? _errorMessage;
  Report? _submittedReport;
  
  // Image info
  double? _imageSizeKB;
  
  // Location data
  double? _latitude;
  double? _longitude;
  String? _locationName;
  double? _locationAccuracy;
  int _locationAttempts = 0;
  static const int maxLocationAttempts = 3;
  
  // Current device location (blue dot)
  double? _currentLatitude;
  double? _currentLongitude;
  
  
  // Map controller
  final MapController _mapController = MapController();
  
  @override
  void initState() {
    super.initState();
    // Animation controller for submission progress
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    );
    
    // Animation for upload progress (0% - 60%)
    _uploadProgressAnimation = Tween<double>(begin: 0.0, end: 0.6).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOut),
      ),
    );
    
    // Animation for processing progress (60% - 100%)
    _processingAnimation = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.6, 1.0, curve: Curves.easeIn),
      ),
    );
    
    // Request location permission and get current location
    _getCurrentLocation();
  }
  
  @override
  void dispose() {
    _descriptionController.dispose();
    _animationController.dispose();
    _pageController.dispose();
    super.dispose();
  }

  // Get current location with improved accuracy
  Future<void> _getCurrentLocation() async {
    setState(() {
      _isLocating = true;
      _errorMessage = null;
      _locationAttempts = 0;
    });
    
    try {
      // Check if location services are enabled
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _isLocating = false;
          _errorMessage = 'Location services are disabled. Please enable them in settings.';
        });
        
        // Show dialog prompting user to enable location services
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Location Services Disabled'),
            content: const Text('Please enable location services to submit a report.'),
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
            _errorMessage = 'Location permissions are denied. Please enable them to submit a report.';
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
            content: const Text('Please grant location permission in app settings to submit reports.'),
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

      // Try enhanced location acquisition with fallback strategies
      Position? bestPosition = await _getLocationWithFallbacks();
      
      if (bestPosition != null) {
        // Get address from coordinates
        List<Placemark> placemarks = await placemarkFromCoordinates(
          bestPosition.latitude,
          bestPosition.longitude,
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
          _latitude = bestPosition.latitude;
          _longitude = bestPosition.longitude;
          _locationName = address;
          _locationAccuracy = bestPosition.accuracy;
          _currentLatitude = bestPosition.latitude;
          _currentLongitude = bestPosition.longitude;
          _isLocating = false;
        });
        
        // If map controller is available, move to current location
        if (_mapController != null && _currentStep == 1) {
          _mapController.move(LatLng(_latitude!, _longitude!), 15);
        }
      } else {
        setState(() {
          _isLocating = false;
          _errorMessage = 'Unable to get location. Please ensure GPS is enabled and you are in an open area with good signal.';
        });
      }
      
    } catch (e) {
      print("Location error: $e");
      setState(() {
        _isLocating = false;
        _errorMessage = 'Failed to get your location. Please check your device settings or try again later.';
      });
    }
  }

  // Try multiple location acquisition attempts with different accuracy levels
  Future<Position?> _getBestLocationWithMultipleAttempts() async {
    Position? bestPosition;
    double bestAccuracy = double.infinity;
    
    // List of location accuracy settings to try (from most to least accurate)
    final accuracyLevels = [
      LocationAccuracy.best,
      LocationAccuracy.high,
      LocationAccuracy.medium,
      LocationAccuracy.low,
    ];
    
    for (int attempt = 0; attempt < maxLocationAttempts && attempt < accuracyLevels.length; attempt++) {
      setState(() {
        _locationAttempts = attempt + 1;
      });
      
      try {
        print('Location attempt ${attempt + 1} with accuracy: ${accuracyLevels[attempt]}');
        
        // Get position with current accuracy level and timeout
        final position = await Geolocator.getCurrentPosition(
          desiredAccuracy: accuracyLevels[attempt],
          timeLimit: Duration(seconds: attempt == 0 ? 20 : 15), // More time for first attempt
        );
        
        print('Got position: lat=${position.latitude}, lng=${position.longitude}, accuracy=${position.accuracy}m');
        
        // Check if this position is better than previous ones
        if (position.accuracy < bestAccuracy) {
          bestPosition = position;
          bestAccuracy = position.accuracy;
          
          // If accuracy is good enough (< 20 meters), use this position
          if (position.accuracy < 20.0) {
            print('Good accuracy achieved: ${position.accuracy}m');
            break;
          }
        }
        
        // Wait a bit between attempts for GPS to stabilize
        if (attempt < maxLocationAttempts - 1 && attempt < accuracyLevels.length - 1) {
          await Future.delayed(const Duration(seconds: 3));
        }
        
      } catch (e) {
        print('Location attempt ${attempt + 1} failed: $e');
        
        // For timeout errors, try the next accuracy level
        if (e.toString().contains('timeout') || e.toString().contains('time')) {
          continue;
        }
        
        // For other errors on first attempt, rethrow
        if (attempt == 0) {
          rethrow;
        }
      }
    }
    
    return bestPosition;
  }

  // Validate location accuracy and provide feedback
  String _getLocationAccuracyStatus() {
    if (_locationAccuracy == null) {
      return 'Location accuracy unknown';
    }
    
    if (_locationAccuracy! <= 5.0) {
      return 'Excellent accuracy (±${_locationAccuracy!.toStringAsFixed(1)}m)';
    } else if (_locationAccuracy! <= 15.0) {
      return 'Good accuracy (±${_locationAccuracy!.toStringAsFixed(1)}m)';
    } else if (_locationAccuracy! <= 50.0) {
      return 'Fair accuracy (±${_locationAccuracy!.toStringAsFixed(1)}m)';
    } else {
      return 'Poor accuracy (±${_locationAccuracy!.toStringAsFixed(1)}m)';
    }
  }
  
  // Get accuracy color indicator
  Color _getLocationAccuracyColor() {
    if (_locationAccuracy == null) {
      return Colors.grey;
    }
    
    if (_locationAccuracy! <= 5.0) {
      return Colors.green;
    } else if (_locationAccuracy! <= 15.0) {
      return Colors.lightGreen;
    } else if (_locationAccuracy! <= 50.0) {
      return Colors.orange;
    } else {
      return Colors.red;
    }
  }
  
  // Check if location is acceptable for reporting
  bool _isLocationAcceptable() {
    return _locationAccuracy != null && _locationAccuracy! <= 100.0; // Accept up to 100m accuracy
  }
  
  // Fallback location method using last known position
  Future<Position?> _getLastKnownPosition() async {
    try {
      final lastPosition = await Geolocator.getLastKnownPosition();
      if (lastPosition != null) {
        // Check if the last known position is recent (within 1 hour)
        final now = DateTime.now();
        final positionTime = lastPosition.timestamp ?? now;
        final timeDifference = now.difference(positionTime);
        
        if (timeDifference.inHours < 1) {
          print('Using last known position from ${timeDifference.inMinutes} minutes ago');
          return lastPosition;
        }
      }
    } catch (e) {
      print('Failed to get last known position: $e');
    }
    return null;
  }
  
  // Enhanced location acquisition with fallback strategies
  Future<Position?> _getLocationWithFallbacks() async {
    // Strategy 1: Try multiple attempts with different accuracy levels
    Position? position = await _getBestLocationWithMultipleAttempts();
    
    if (position != null && position.accuracy <= 100.0) {
      return position;
    }
    
    // Strategy 2: If no good position, try last known position
    if (position == null) {
      print('No current position available, trying last known position...');
      position = await _getLastKnownPosition();
    }
    
    // Strategy 3: If still no position, try with reduced accuracy and longer timeout
    if (position == null) {
      print('Trying fallback location with reduced accuracy...');
      try {
        position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.lowest,
          timeLimit: const Duration(seconds: 30),
        );
      } catch (e) {
        print('Fallback location failed: $e');
      }
    }
    
    return position;
  }
  
  // Show dialog for location accuracy confirmation
  Future<bool> _showLocationAccuracyDialog() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Location Accuracy Warning'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Your current location accuracy is ${_getLocationAccuracyStatus().toLowerCase()}.',
            ),
            const SizedBox(height: 12),
            const Text(
              'For best results, we recommend:',
              style: TextStyle(fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 8),
            const Text(
              '• Moving to an open area\n• Ensuring GPS is enabled\n• Trying to refresh your location',
              style: TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 12),
            const Text(
              'Do you want to proceed with the current location or try to improve it?',
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Improve Location'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Proceed Anyway'),
          ),
        ],
      ),
    );
    
    return result ?? false;
  }
  

  // Refresh location with enhanced accuracy
  Future<void> _refreshLocationWithDelay() async {
    setState(() {
      _isLocating = true;
      _errorMessage = null;
    });

    try {
      // Wait 3 seconds for GPS to warm up
      await Future.delayed(const Duration(seconds: 3));
      
      // Get current location with enhanced accuracy
      await _getCurrentLocation();
    } catch (e) {
      setState(() {
        _isLocating = false;
        _errorMessage = 'Failed to refresh location. Please try again.';
      });
    }
  }
  
  // Pick image from camera only
  Future<void> _takePhoto() async {
    try {
      final pickedFile = await ImagePicker().pickImage(
        source: ImageSource.camera,
        imageQuality: 85, // High quality, but will optimize later
        maxWidth: 1920,
        maxHeight: 1080,
      );
      
      if (pickedFile != null) {
        setState(() {
          _imageFile = File(pickedFile.path);
          _optimizedImageFile = null;
          _imageSizeKB = _imageFile!.lengthSync() / 1024; // Convert to KB
        });
        
        // Optimize image in background
        _optimizeImage();
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to capture image: ${e.toString()}';
      });
    }
  }
  
  // Optimize image to reduce size
  Future<void> _optimizeImage() async {
    if (_imageFile == null) return;

    setState(() {
      _isOptimizingImage = true;
    });

    try {
      // Create a temporary file path
      final dir = await getTemporaryDirectory();
      final fileName = 'optimized_${path.basename(_imageFile!.path)}';
      final targetPath = path.join(dir.path, fileName);

      // Use ImageUtils to compress the image
      final compressedImage = await ImageUtils.compressImage(_imageFile!);

      setState(() {
        _optimizedImageFile = compressedImage;
        // Fixed: Corrected boolean expression with proper null check and condition
        _imageSizeKB = _optimizedImageFile != null
            ? _optimizedImageFile!.lengthSync() / 1024
            : null;
        _isOptimizingImage = false;
      });
    } catch (e) {
      print('Image optimization error: $e');
      setState(() {
        _optimizedImageFile = null;
        _isOptimizingImage = false;
      });
    }
  }
  
  // Navigate to next step
  void _nextStep() async {
    // Validate current step
    if (_currentStep == 0 && _imageFile == null) {
      setState(() {
        _errorMessage = 'Please take a photo of the waste';
      });
      return;
    }
    
    if (_currentStep == 1 && (_latitude == null || _longitude == null)) {
      setState(() {
        _errorMessage = 'Location information is required';
      });
      return;
    }
    
    // Check location accuracy before proceeding from location step
    if (_currentStep == 1 && !_isLocationAcceptable()) {
      // Show dialog asking user if they want to proceed with poor accuracy
      final shouldProceed = await _showLocationAccuracyDialog();
      if (!shouldProceed) {
        return;
      }
    }
    
    // For step 2 (details), description is now optional so no validation needed
    
    // Move to next step
    if (_currentStep < 2) {
      setState(() {
        _currentStep++;
        _errorMessage = null;
      });
      
      _pageController.animateToPage(
        _currentStep,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
      
      // If moving to location step, refresh location with 5-second delay for better accuracy
      if (_currentStep == 1) {
        // Wait 5 seconds for better location accuracy
        await Future.delayed(const Duration(seconds: 5));
        
        // Refresh current location to get more accurate coordinates
        await _getCurrentLocation();
        
        // Center map on the refreshed location
        if (_latitude != null && _longitude != null) {
          _mapController.move(LatLng(_latitude!, _longitude!), 15);
        }
      }
    } else {
      // Final step, submit report
      _submitReport();
    }
  }
  
  // Navigate to previous step
  void _previousStep() {
    if (_currentStep > 0) {
      setState(() {
        _currentStep--;
        _errorMessage = null;
      });
      
      _pageController.animateToPage(
        _currentStep,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    }
  }
  
  // Submit the report
  Future<void> _submitReport() async {
    if (_imageFile == null || _latitude == null || _longitude == null) {
      setState(() {
        _errorMessage = 'Please take a photo and allow location access';
      });
      return;
    }
    
    // Final location accuracy check before submission
    if (!_isLocationAcceptable()) {
      final shouldProceed = await _showLocationAccuracyDialog();
      if (!shouldProceed) {
        return;
      }
    }
    
    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });
    
    // Start animation
    _animationController.forward();
    
    try {
      // Use the final image file (optimized if available, original otherwise)
      final finalImageFile = _optimizedImageFile ?? _imageFile!;
      
      // Get device info
      final deviceInfo = {
        'platform': 'Flutter Mobile',
        'model': 'EcoLafaek App',
        'timestamp': DateTime.now().toIso8601String(),
      };
      
      // Submit report
      final reportProvider = Provider.of<ReportProvider>(context, listen: false);
      final report = await reportProvider.submitReportInitial(
        latitude: _latitude!,
        longitude: _longitude!,
        description: _descriptionController.text.trim(), // Description is optional
        image: finalImageFile,
        deviceInfo: deviceInfo,
      );
      
      if (report != null) {
        setState(() {
          _submittedReport = report;
          _isSuccessful = true;
          _isSubmitting = false;
        });
        
        // Start polling for status updates every 5 seconds
        _pollReportStatus(report.id!);
      } else {
        setState(() {
          _errorMessage = reportProvider.errorMessage;
          _isSubmitting = false;
        });
        _animationController.reset();
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to submit report: ${e.toString()}';
        _isSubmitting = false;
      });
      _animationController.reset();
    }
  }
  
  // Poll for report status updates
  Future<void> _pollReportStatus(int reportId) async {
    final reportProvider = Provider.of<ReportProvider>(context, listen: false);
    
    // Poll for max 2 minutes (24 attempts, 5 seconds apart)
    for (var i = 0; i < 24; i++) {
      // Wait 5 seconds between polls
      await Future.delayed(const Duration(seconds: 5));
      
      if (!mounted) return; // Check if widget is still mounted
      
      try {
        // Get updated report
        final updatedReport = await reportProvider.getReportById(reportId);
        
        if (updatedReport == null) continue;
        
        // Update local report
        setState(() {
          _submittedReport = updatedReport;
        });
        
        // If report is no longer in submitted/analyzing state, stop polling
        if (updatedReport.status.toLowerCase() != 'submitted' &&
            updatedReport.status.toLowerCase() != 'analyzing') {
          break;
        }
      } catch (e) {
        print('Error polling report status: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.primaryColor;
    
    // Full-screen loading overlay when submitting
    if (_isSubmitting) {
      return _buildSubmissionOverlay(primaryColor);
    }
    
    // Success screen after submission
    if (_isSuccessful) {
      return _buildSuccessScreen(primaryColor);
    }
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Report Waste'),
        backgroundColor: primaryColor,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Column(
        children: [
          // Progress indicator
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Row(
              children: List.generate(3, (index) {
                final isCompleted = index < _currentStep;
                final isCurrent = index == _currentStep;
                
                return Expanded(
                  child: Row(
                    children: [
                      // Step circle
                      Container(
                        width: 30,
                        height: 30,
                        decoration: BoxDecoration(
                          color: isCompleted ? primaryColor : 
                                 isCurrent ? primaryColor.withOpacity(0.7) : 
                                 Colors.grey.shade300,
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: isCompleted
                            ? const Icon(Icons.check, color: Colors.white, size: 16)
                            : Text(
                                '${index + 1}',
                                style: TextStyle(
                                  color: isCurrent ? Colors.white : Colors.grey.shade600,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                        ),
                      ),
                      
                      // Connector line (except for last item)
                      if (index < 2)
                        Expanded(
                          child: Container(
                            height: 3,
                            color: index < _currentStep 
                                ? primaryColor 
                                : Colors.grey.shade300,
                          ),
                        ),
                    ],
                  ),
                );
              }),
            ),
          ),
          
          // Step titles
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Photo',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: _currentStep == 0 ? FontWeight.bold : FontWeight.normal,
                    color: _currentStep == 0 ? primaryColor : Colors.grey.shade600,
                  ),
                ),
                Text(
                  'Location',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: _currentStep == 1 ? FontWeight.bold : FontWeight.normal,
                    color: _currentStep == 1 ? primaryColor : Colors.grey.shade600,
                  ),
                ),
                Text(
                  'Details',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: _currentStep == 2 ? FontWeight.bold : FontWeight.normal,
                    color: _currentStep == 2 ? primaryColor : Colors.grey.shade600,
                  ),
                ),
              ],
            ),
          ),
          
          // Error message
          if (_errorMessage != null)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red.shade100),
              ),
              child: Row(
                children: [
                  Icon(Icons.error_outline, color: Colors.red.shade700, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: TextStyle(color: Colors.red.shade700, fontSize: 14),
                    ),
                  ),
                ],
              ),
            ),
          
          // Main content
          Expanded(
            child: PageView(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                // Step 1: Photo
                _buildPhotoStep(),
                
                // Step 2: Location (view only)
                _buildLocationViewStep(primaryColor),
                
                // Step 3: Details (optional description)
                _buildDetailsStep(),
              ],
            ),
          ),
          
          // Bottom navigation buttons
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 5,
                  offset: const Offset(0, -3),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Back button
                if (_currentStep > 0)
                  OutlinedButton(
                    onPressed: _previousStep,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      side: BorderSide(color: primaryColor),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.arrow_back_ios, size: 16, color: primaryColor),
                        const SizedBox(width: 8),
                        Text(
                          'Back',
                          style: TextStyle(color: primaryColor, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  )
                else
                  const SizedBox(width: 100),  // Empty space to maintain layout
                
                // Next/Submit button
                ElevatedButton(
                  onPressed: _nextStep,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryColor,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _currentStep < 2 ? 'Next' : 'Submit',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Icon(
                        _currentStep < 2 ? Icons.arrow_forward_ios : Icons.send,
                        size: 16,
                        color: Colors.white,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
  
  // Step 1: Photo selection (camera only)
  Widget _buildPhotoStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Step title
          Text(
            'Take a photo of the waste',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.grey[800],
            ),
          ),
          
          const SizedBox(height: 8),
          
          // Step description
          Text(
            'Please take a clear photo of the waste you want to report. This helps our team understand the situation better.',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[600],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Image preview or placeholder
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Container(
              height: 250,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey[300]!),
              ),
              child: _imageFile != null
                ? Stack(
                    fit: StackFit.expand,
                    children: [
                      // Image preview
                      Image.file(
                        _imageFile!,
                        fit: BoxFit.cover,
                      ),
                      
                      // Image optimization indicator
                      if (_isOptimizingImage)
                        Container(
                          color: Colors.black.withOpacity(0.5),
                          child: const Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                                SizedBox(height: 12),
                                Text(
                                  'Optimizing image...',
                                  style: TextStyle(color: Colors.white),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  )
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.camera_alt,
                        size: 64,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No photo selected',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
            ),
          ),
          
          // Image info
          if (_imageFile != null && _imageSizeKB != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Image size: ${(_imageSizeKB! / 1024).toStringAsFixed(2)} MB',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                  
                  // Delete image button
                  TextButton.icon(
                    onPressed: () {
                      setState(() {
                        _imageFile = null;
                        _optimizedImageFile = null;
                        _imageSizeKB = null;
                      });
                    },
                    icon: const Icon(Icons.delete_outline, color: Colors.red, size: 16),
                    label: const Text(
                      'Remove',
                      style: TextStyle(color: Colors.red, fontSize: 12),
                    ),
                    style: TextButton.styleFrom(
                      padding: EdgeInsets.zero,
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ),
                ],
              ),
            ),
          
          const SizedBox(height: 24),
          
          // Camera button (only camera - no gallery option)
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _takePhoto,
              icon: const Icon(Icons.camera_alt),
              label: Text(_imageFile == null ? 'Take Photo' : 'Retake Photo'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green[600],
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Photo tips
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.blue[50],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.blue[200]!),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.tips_and_updates, color: Colors.blue[700], size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Photo Tips',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.blue[700],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                _buildTipItem('Ensure good lighting for clear visibility'),
                _buildTipItem('Capture the full extent of the waste'),
                _buildTipItem('Include surroundings for better context'),
                _buildTipItem('Avoid including identifiable people in the photo'),
              ],
            ),
          ),
        ],
      ),
    );
  }
  
  // Step 2: Location viewing (not editable)
  Widget _buildLocationViewStep(Color primaryColor) {
    return Column(
      children: [
        // Map container (read-only view)
        Expanded(
          child: Stack(
            children: [
              // Map
              _latitude != null && _longitude != null
                ? FlutterMap(
                    mapController: _mapController,
                    options: MapOptions(
                      initialCenter: LatLng(_latitude!, _longitude!),
                      initialZoom: 15.0,
                      interactionOptions: const InteractionOptions(
                        flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                      ),
                    ),
                    children: [
                      TileLayer(
                        urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: 'com.example.eco_lafaek',
                      ),
                      MarkerLayer(
                        markers: [
                          // Report location marker (red pin)
                          Marker(
                            width: 40.0,
                            height: 40.0,
                            point: LatLng(_latitude!, _longitude!),
                            child: const Icon(
                              Icons.location_pin,
                              color: Colors.red,
                              size: 40,
                            ),
                          ),
                          
                          // Current location marker (blue dot)
                          if (_currentLatitude != null && _currentLongitude != null)
                            Marker(
                              width: 24.0,
                              height: 24.0,
                              point: LatLng(_currentLatitude!, _currentLongitude!),
                              child: Container(
                                decoration: BoxDecoration(
                                  color: Colors.blue,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: Colors.white,
                                    width: 3,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.blue.withOpacity(0.3),
                                      blurRadius: 6,
                                      spreadRadius: 2,
                                    ),
                                  ],
                                ),
                                child: const Icon(
                                  Icons.my_location,
                                  color: Colors.white,
                                  size: 14,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                  )
                : Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const CircularProgressIndicator(),
                        const SizedBox(height: 16),
                        Text(
                          _isLocating
                              ? 'Getting your location...'
                              : 'Failed to load map. Please check your location settings.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey[700]),
                        ),
                      ],
                    ),
                  ),
              
              // Location info overlay
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(16),
                      topRight: Radius.circular(16),
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
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Your Current Location',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[800],
                        ),
                      ),
                      
                      const SizedBox(height: 8),
                      
                      // Location name
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.location_on, color: primaryColor, size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _locationName != null
                              ? Text(
                                  _locationName!,
                                  style: TextStyle(
                                    color: Colors.grey[800],
                                    fontSize: 14,
                                  ),
                                )
                              : _isLocating
                                ? Row(
                                    children: [
                                      SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: primaryColor,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Getting address...',
                                        style: TextStyle(
                                          color: Colors.grey[600],
                                          fontSize: 14,
                                          fontStyle: FontStyle.italic,
                                        ),
                                      ),
                                    ],
                                  )
                                : Text(
                                    'No address found',
                                    style: TextStyle(
                                      color: Colors.grey[600],
                                      fontSize: 14,
                                      fontStyle: FontStyle.italic,
                                    ),
                                  ),
                          ),
                        ],
                      ),
                      
                      const SizedBox(height: 8),
                      
                      // Coordinates
                      if (_latitude != null && _longitude != null)
                        Row(
                          children: [
                            Icon(Icons.my_location, color: Colors.grey[600], size: 18),
                            const SizedBox(width: 8),
                            Text(
                              'Lat: ${_latitude!.toStringAsFixed(6)}, Lng: ${_longitude!.toStringAsFixed(6)}',
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      
                      // Location accuracy indicator
                      if (_locationAccuracy != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Row(
                            children: [
                              Icon(
                                Icons.gps_fixed,
                                color: _getLocationAccuracyColor(),
                                size: 18,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                _getLocationAccuracyStatus(),
                                style: TextStyle(
                                  color: _getLocationAccuracyColor(),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      
                      
                      
                      const SizedBox(height: 16),
                      
                      // Refresh location button
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: _isLocating ? null : _refreshLocationWithDelay,
                          icon: _isLocating 
                            ? SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: primaryColor,
                                ),
                              )
                            : const Icon(Icons.my_location),
                          label: Text(_isLocating ? 'Getting Current Location...' : 'Refresh Location'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: primaryColor,
                            side: BorderSide(color: primaryColor),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ),
                      
                      
                      
                      // Quick location tips for poor accuracy
                      if (_locationAccuracy != null && _locationAccuracy! > 30.0)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.blue.shade50,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: Colors.blue.shade200),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(Icons.tips_and_updates, color: Colors.blue.shade700, size: 16),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Tips for better location accuracy:',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                        color: Colors.blue.shade700,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '• Move to an open area away from buildings\n• Make sure GPS/Location is enabled\n• Wait a moment for GPS to stabilize\n• Try refreshing your location',
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: Colors.blue.shade700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      
                      const SizedBox(height: 8),
                      
                      // Warning for poor accuracy
                      if (_locationAccuracy != null && _locationAccuracy! > 50.0)
                        Container(
                          margin: const EdgeInsets.only(top: 8),
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.orange.shade50,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: Colors.orange.shade200),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.warning_amber, color: Colors.orange.shade700, size: 16),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  'Location accuracy is low. Consider moving to an open area for better GPS signal.',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.orange.shade700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      
                      const SizedBox(height: 8),
                      
                      // Map legend\n                      if (_currentLatitude != null && _currentLongitude != null)\n                        Container(\n                          padding: const EdgeInsets.all(8),\n                          decoration: BoxDecoration(\n                            color: Colors.blue.shade50,\n                            borderRadius: BorderRadius.circular(6),\n                            border: Border.all(color: Colors.blue.shade200),\n                          ),\n                          child: Row(\n                            mainAxisSize: MainAxisSize.min,\n                            children: [\n                              Container(\n                                width: 16,\n                                height: 16,\n                                decoration: BoxDecoration(\n                                  color: Colors.blue,\n                                  shape: BoxShape.circle,\n                                  border: Border.all(\n                                    color: Colors.white,\n                                    width: 2,\n                                  ),\n                                ),\n                                child: const Icon(\n                                  Icons.my_location,\n                                  color: Colors.white,\n                                  size: 8,\n                                ),\n                              ),\n                              const SizedBox(width: 6),\n                              Text(\n                                'Blue dot = Your current position',\n                                style: TextStyle(\n                                  fontSize: 11,\n                                  color: Colors.blue.shade700,\n                                  fontWeight: FontWeight.w500,\n                                ),\n                              ),\n                            ],\n                          ),\n                        ),\n                      \n                      const SizedBox(height: 8),\n                      \n                      // Note text
                      Text(
                        'Note: Red pin shows where the waste report will be submitted',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          fontStyle: FontStyle.italic,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
  
  // Step 3: Details input (optional description)
  Widget _buildDetailsStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Step title
            Text(
              'Describe the waste (Optional)',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.grey[800],
              ),
            ),
            
            const SizedBox(height: 8),
            
            // Step description
            Text(
              'You can provide additional details about the waste you are reporting. This will help our team categorize and prioritize the issue.',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Description field (optional)
            TextFormField(
              controller: _descriptionController,
              maxLines: 5,
              decoration: InputDecoration(
                labelText: 'Description (Optional)',
                hintText: 'Describe the waste (e.g., type, amount, potential hazards)',
                alignLabelWithHint: true,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Theme.of(context).primaryColor, width: 2),
                ),
              ),
              // No validator since this field is optional
            ),
            
            const SizedBox(height: 24),
            
            // Report summary
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey[300]!),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Report Summary',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey[800],
                    ),
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Photo preview
                  if (_imageFile != null)
                    Row(
                      children: [
                        Container(
                          width: 60,
                          height: 60,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(8),
                            image: DecorationImage(
                              image: FileImage(_imageFile!),
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Photo attached',
                                style: TextStyle(
                                  fontWeight: FontWeight.w500,
                                  color: Colors.grey[800],
                                ),
                              ),
                              Text(
                                'Size: ${(_imageSizeKB! / 1024).toStringAsFixed(2)} MB',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey[600],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  
                  const SizedBox(height: 12),
                  const Divider(),
                  const SizedBox(height: 12),
                  
                  // Location
                  if (_locationName != null)
                    _buildSummaryItem(
                      icon: Icons.location_on,
                      title: 'Location',
                      value: _locationName!,
                    ),
                  
                  const SizedBox(height: 12),
                  
                  // Current date
                  _buildSummaryItem(
                    icon: Icons.calendar_today,
                    title: 'Date',
                    value: DateTime.now().toString().substring(0, 16),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Terms and privacy info
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue[200]!),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.info_outline, color: Colors.blue[700], size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'Important Information',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.blue[700],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'By submitting this report, you agree to our Terms of Service and Privacy Policy. Your report will be reviewed by our team and may be shared with local authorities responsible for waste management.',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.blue[700],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  // Helper for tip items
  Widget _buildTipItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('• ', style: TextStyle(color: Colors.blue[700])),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 12,
                color: Colors.blue[700],
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  // Helper for summary items
  Widget _buildSummaryItem({
    required IconData icon,
    required String title,
    required String value,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: Colors.grey[600], size: 18),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                ),
              ),
              Text(
                value,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[800],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
  
  // Submission overlay UI
  Widget _buildSubmissionOverlay(Color primaryColor) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: FadeIn(
            duration: const Duration(milliseconds: 500),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Progress animation
                  AnimatedBuilder(
                    animation: _animationController,
                    builder: (context, child) {
                      final progress = _currentStage == SubmissionStage.uploading
                          ? _uploadProgressAnimation.value
                          : _processingAnimation.value;
                      
                      return Column(
                        children: [
                          SizedBox(
                            width: 120,
                            height: 120,
                            child: Stack(
                              children: [
                                SizedBox(
                                  width: 120,
                                  height: 120,
                                  child: CircularProgressIndicator(
                                    value: progress,
                                    strokeWidth: 8,
                                    backgroundColor: Colors.grey[200],
                                    valueColor: AlwaysStoppedAnimation<Color>(primaryColor),
                                  ),
                                ),
                                Center(
                                  child: Text(
                                    '${(progress * 100).toInt()}%',
                                    style: TextStyle(
                                      fontSize: 24,
                                      fontWeight: FontWeight.bold,
                                      color: primaryColor,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          
                          const SizedBox(height: 32),
                          
                          // Status text
                          Text(
                            _currentStage == SubmissionStage.uploading
                                ? 'Uploading Your Report...'
                                : 'Processing Your Report...',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.grey[800],
                            ),
                          ),
                          
                          const SizedBox(height: 16),
                          
                          // Status description
                          Text(
                            _currentStage == SubmissionStage.uploading
                                ? 'We\'re uploading your report to our server. This may take a moment depending on your internet connection.'
                                : 'Our system is analyzing your report. This includes processing the image and categorizing the waste type.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                  
                  const SizedBox(height: 40),
                  
                  // Cancel button
                  OutlinedButton(
                    onPressed: () {
                      // Show confirmation dialog
                      showDialog(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('Cancel Submission?'),
                          content: const Text(
                            'Are you sure you want to cancel this report submission? Your data will be lost.',
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.of(ctx).pop(),
                              child: const Text('Continue Uploading'),
                            ),
                            TextButton(
                              onPressed: () {
                                // Close dialog and go back
                                Navigator.of(ctx).pop();
                                Navigator.of(context).pop();
                              },
                              child: const Text(
                                'Cancel Submission',
                                style: TextStyle(color: Colors.red),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.grey[700],
                      side: BorderSide(color: Colors.grey[400]!),
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text('Cancel'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
  
  // Success screen UI
  Widget _buildSuccessScreen(Color primaryColor) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: FadeIn(
            duration: const Duration(milliseconds: 600),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Success animation
                  Lottie.asset(
                    'assets/animations/success.json',
                    width: 200,
                    height: 200,
                    repeat: false,
                  ),
                  
                  const SizedBox(height: 32),
                  
                  // Success message
                  Text(
                    'Report Submitted!',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: primaryColor,
                    ),
                  ),
                  
                  const SizedBox(height: 16),
                  
                  Text(
                    'Thank you for contributing to a cleaner Timor-Leste. Your report has been submitted successfully.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.grey[700],
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Status info
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey[300]!),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 50,
                          height: 50,
                          decoration: BoxDecoration(
                            color: primaryColor.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.check_circle,
                            color: primaryColor,
                            size: 30,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Status: ${_submittedReport?.status ?? 'Submitted'}',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.grey[800],
                                ),
                              ),
                              if (_submittedReport?.id != null)
                                Text(
                                  'Report ID: #${_submittedReport!.id}',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.grey[700],
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 32),
                  
                  // Back to home button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text(
                        'Back to Home',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}