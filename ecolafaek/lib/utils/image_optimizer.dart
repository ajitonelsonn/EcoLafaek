import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;
import 'package:image/image.dart' as img;

class ImageOptimizer {
  /// Optimizes an image for upload by:
  /// 1. Resizing to max dimensions (771x1024)
  /// 2. Compressing to max file size (500KB)
  /// Returns the optimized file and its size in KB
  static Future<Map<String, dynamic>> optimizeImage(File imageFile) async {
    // Get temporary directory for storing processed image
    final tempDir = await getTemporaryDirectory();
    final targetPath = path.join(tempDir.path, 'optimized_${DateTime.now().millisecondsSinceEpoch}.jpg');
    
    // Check original image size
    final originalSizeInBytes = await imageFile.length();
    final originalSizeInKB = originalSizeInBytes / 1024;
    
    print('Original image size: ${originalSizeInKB.toStringAsFixed(2)} KB');
    
    // Resize image if necessary
    File resizedFile = await _resizeImage(imageFile, targetPath);
    
    // Check if we need to compress further to meet size requirements
    final resizedSizeInBytes = await resizedFile.length();
    final resizedSizeInKB = resizedSizeInBytes / 1024;
    
    print('After resize: ${resizedSizeInKB.toStringAsFixed(2)} KB');
    
    // If still over 500KB, compress further
    if (resizedSizeInKB > 500) {
      resizedFile = await _compressToTargetSize(resizedFile, 500 * 1024); // 500KB in bytes
    }
    
    // Final size check
    final finalSizeInBytes = await resizedFile.length();
    final finalSizeInKB = finalSizeInBytes / 1024;
    
    print('Final image size: ${finalSizeInKB.toStringAsFixed(2)} KB');
    
    return {
      'file': resizedFile,
      'sizeInKB': finalSizeInKB,
    };
  }
  
  /// Resizes the image to fit within max dimensions of 771x1024
  /// while maintaining aspect ratio
  static Future<File> _resizeImage(File imageFile, String targetPath) async {
    // Decode image to get dimensions
    final bytes = await imageFile.readAsBytes();
    final image = img.decodeImage(bytes);
    
    if (image == null) {
      throw Exception('Failed to decode image');
    }
    
    // Check if resize is needed
    if (image.width <= 771 && image.height <= 1024) {
      // No need to resize, just return the original
      return imageFile;
    }
    
    // Calculate new dimensions while maintaining aspect ratio
    int newWidth, newHeight;
    final aspectRatio = image.width / image.height;
    
    if (aspectRatio > 771/1024) {
      // Width is the constraining factor
      newWidth = 771;
      newHeight = (771 / aspectRatio).round();
    } else {
      // Height is the constraining factor
      newHeight = 1024;
      newWidth = (1024 * aspectRatio).round();
    }
    
    // Resize using flutter_image_compress
    final result = await FlutterImageCompress.compressAndGetFile(
      imageFile.absolute.path,
      targetPath,
      minWidth: newWidth,
      minHeight: newHeight,
      quality: 90, // Start with high quality
    );
    
    if (result == null) {
      throw Exception('Image compression failed');
    }
    
    return File(result.path);
  }
  
  /// Compress image to target size in bytes by reducing quality incrementally
  static Future<File> _compressToTargetSize(File imageFile, int targetSizeInBytes) async {
    final tempDir = await getTemporaryDirectory();
    int quality = 80; // Start with 80% quality
    File resultFile = imageFile;
    
    while (quality > 20) { // Don't go below 20% quality
      final targetPath = path.join(tempDir.path, 'compressed_${quality}_${DateTime.now().millisecondsSinceEpoch}.jpg');
      
      final result = await FlutterImageCompress.compressAndGetFile(
        imageFile.absolute.path,
        targetPath,
        quality: quality,
      );
      
      if (result == null) {
        break;
      }
      
      resultFile = File(result.path);
      final fileSize = await resultFile.length();
      
      print('Compressed to quality $quality: ${(fileSize / 1024).toStringAsFixed(2)} KB');
      
      if (fileSize <= targetSizeInBytes) {
        break;
      }
      
      quality -= 10; // Reduce quality and try again
    }
    
    return resultFile;
  }
}

// Widget to show image optimization progress
class ImageOptimizationProgressDialog extends StatelessWidget {
  final ValueNotifier<double> progress;

  const ImageOptimizationProgressDialog({
    Key? key,
    required this.progress,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Optimizing Image',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            ValueListenableBuilder<double>(
              valueListenable: progress,
              builder: (context, value, child) {
                return Column(
                  children: [
                    LinearProgressIndicator(
                      value: value,
                      backgroundColor: Colors.grey.shade200,
                      valueColor: AlwaysStoppedAnimation<Color>(Theme.of(context).primaryColor),
                      borderRadius: BorderRadius.circular(10),
                      minHeight: 8,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      '${(value * 100).toInt()}%',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 15),
            const Text(
              'Resizing and compressing image to 771x1024px and maximum 500KB',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }
}