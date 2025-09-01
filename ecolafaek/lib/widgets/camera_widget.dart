import 'dart:io';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;

class CameraWidget extends StatefulWidget {
  final Function(File) onImageCaptured;
  final bool showGalleryOption;
  final bool showFlashOption;

  const CameraWidget({
    Key? key,
    required this.onImageCaptured,
    this.showGalleryOption = true,
    this.showFlashOption = true,
  }) : super(key: key);

  @override
  State<CameraWidget> createState() => _CameraWidgetState();
}

class _CameraWidgetState extends State<CameraWidget> with WidgetsBindingObserver {
  CameraController? _controller;
  List<CameraDescription> _cameras = [];
  bool _isCameraInitialized = false;
  bool _isFrontCamera = false;
  bool _isFlashOn = false;
  bool _isCameraPermissionGranted = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkCameraPermission();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller?.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final CameraController? cameraController = _controller;

    // App state changed before we got the chance to initialize.
    if (cameraController == null || !cameraController.value.isInitialized) {
      return;
    }

    if (state == AppLifecycleState.inactive) {
      cameraController.dispose();
    } else if (state == AppLifecycleState.resumed) {
      _initializeCamera();
    }
  }

  // Check camera permission
  Future<void> _checkCameraPermission() async {
    final status = await Permission.camera.status;
    setState(() {
      _isCameraPermissionGranted = status.isGranted;
    });

    if (_isCameraPermissionGranted) {
      _initializeCamera();
    } else {
      _requestCameraPermission();
    }
  }

  // Request camera permission
  Future<void> _requestCameraPermission() async {
    final status = await Permission.camera.request();
    setState(() {
      _isCameraPermissionGranted = status.isGranted;
    });

    if (_isCameraPermissionGranted) {
      _initializeCamera();
    }
  }

  // Initialize camera
  Future<void> _initializeCamera() async {
    try {
      _cameras = await availableCameras();
      
      if (_cameras.isEmpty) {
        setState(() {
          _isCameraInitialized = false;
        });
        return;
      }

      final cameraIndex = _isFrontCamera ? 1 : 0;
      final cameraDescription = _cameras.length > cameraIndex 
          ? _cameras[cameraIndex] 
          : _cameras[0];

      final CameraController cameraController = CameraController(
        cameraDescription,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );

      _controller = cameraController;

      await cameraController.initialize();
      
      if (widget.showFlashOption) {
        await cameraController.setFlashMode(
          _isFlashOn ? FlashMode.torch : FlashMode.off,
        );
      }

      setState(() {
        _isCameraInitialized = true;
      });
    } catch (e) {
      debugPrint('Error initializing camera: $e');
      setState(() {
        _isCameraInitialized = false;
      });
    }
  }

  // Switch camera
  Future<void> _switchCamera() async {
    setState(() {
      _isFrontCamera = !_isFrontCamera;
      _isCameraInitialized = false;
    });

    await _controller?.dispose();
    _controller = null;

    await _initializeCamera();
  }

  // Toggle flash
  Future<void> _toggleFlash() async {
    if (_controller == null) return;

    setState(() {
      _isFlashOn = !_isFlashOn;
    });

    await _controller!.setFlashMode(
      _isFlashOn ? FlashMode.torch : FlashMode.off,
    );
  }

  // Take picture
  Future<void> _takePicture() async {
    if (_controller == null || !_isCameraInitialized) return;

    try {
      final XFile photo = await _controller!.takePicture();
      
      // Save image to temporary directory
      final directory = await getTemporaryDirectory();
      final fileName = path.basename(photo.path);
      final savedImage = File('${directory.path}/$fileName');
      
      // Copy the file to the new path
      await File(photo.path).copy(savedImage.path);
      
      // Pass the captured image back to the parent widget
      if (mounted) {
        widget.onImageCaptured(savedImage);
      }
    } catch (e) {
      debugPrint('Error taking picture: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_isCameraPermissionGranted) {
      return _buildPermissionDeniedWidget();
    }

    if (!_isCameraInitialized || _controller == null || !_controller!.value.isInitialized) {
      return _buildLoadingWidget();
    }

    return Stack(
      alignment: Alignment.center,
      children: [
        // Camera preview
        AspectRatio(
          aspectRatio: _controller!.value.aspectRatio,
          child: CameraPreview(_controller!),
        ),
        
        // Camera controls
        Positioned(
          bottom: 20,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              // Switch camera button
              if (_cameras.length > 1)
                _buildControlButton(
                  icon: _isFrontCamera 
                      ? Icons.camera_rear 
                      : Icons.camera_front,
                  onPressed: _switchCamera,
                  tooltip: 'Switch Camera',
                ),
              
              // Capture button
              GestureDetector(
                onTap: _takePicture,
                child: Container(
                  height: 70,
                  width: 70,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.5),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.white,
                      width: 3,
                    ),
                  ),
                  child: Container(
                    margin: const EdgeInsets.all(5),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ),
              
              // Flash button
              if (widget.showFlashOption)
                _buildControlButton(
                  icon: _isFlashOn ? Icons.flash_on : Icons.flash_off,
                  onPressed: _toggleFlash,
                  tooltip: 'Toggle Flash',
                ),
            ],
          ),
        ),
        
        // Camera guide overlay
        Positioned.fill(
          child: Container(
            decoration: BoxDecoration(
              border: Border.all(
                color: Colors.white.withOpacity(0.3),
                width: 1,
              ),
            ),
          ),
        ),
      ],
    );
  }

  // Widget for camera control buttons
  Widget _buildControlButton({
    required IconData icon,
    required VoidCallback onPressed,
    required String tooltip,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.4),
        shape: BoxShape.circle,
      ),
      child: IconButton(
        icon: Icon(icon, color: Colors.white),
        onPressed: onPressed,
        tooltip: tooltip,
      ),
    );
  }

  // Widget shown when camera is loading
  Widget _buildLoadingWidget() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text(
            'Initializing camera...',
            style: TextStyle(color: Colors.grey),
          ),
        ],
      ),
    );
  }

  // Widget shown when camera permission is denied
  Widget _buildPermissionDeniedWidget() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.no_photography, // Using a valid icon
            color: Colors.grey,
            size: 50,
          ),
          const SizedBox(height: 16),
          const Text(
            'Camera permission denied',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Please grant camera permission to take photos',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _requestCameraPermission,
            child: const Text('Grant Permission'),
          ),
        ],
      ),
    );
  }
}