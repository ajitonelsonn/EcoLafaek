import 'dart:io';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;
import 'package:uuid/uuid.dart';
import 'package:http/http.dart' as http;
import 'package:flutter/services.dart' show rootBundle;

class ImageUtils {
  // Convert image file to base64 string
  static Future<String> imageToBase64(File file) async {
    try {
      final bytes = await file.readAsBytes();
      return base64Encode(bytes);
    } catch (e) {
      debugPrint('Error converting image to base64: ${e.toString()}');
      return '';
    }
  }

  // Convert base64 string to image file
  static Future<File?> base64ToImage(String base64String) async {
    try {
      final bytes = base64Decode(base64String);
      final dir = await getTemporaryDirectory();
      final file = File(path.join(dir.path, '${const Uuid().v4()}.jpg'));
      await file.writeAsBytes(bytes);
      return file;
    } catch (e) {
      debugPrint('Error converting base64 to image: ${e.toString()}');
      return null;
    }
  }

  // Compress image file
  static Future<File?> compressImage(
    File file, {
    int quality = 80,
    int minWidth = 1200,
    int minHeight = 0,
  }) async {
    try {
      final dir = await getTemporaryDirectory();
      final targetPath = path.join(dir.path, '${const Uuid().v4()}.jpg');
      
      var result = await FlutterImageCompress.compressAndGetFile(
        file.absolute.path,
        targetPath,
        quality: quality,
        minWidth: minWidth,
        minHeight: minHeight,
      );
      
      return result != null ? File(result.path) : null;
    } catch (e) {
      debugPrint('Error compressing image: ${e.toString()}');
      return null;
    }
  }

  // Download image from URL
  static Future<File?> downloadImage(String imageUrl) async {
    try {
      final response = await http.get(Uri.parse(imageUrl));
      
      if (response.statusCode == 200) {
        final bytes = response.bodyBytes;
        final dir = await getTemporaryDirectory();
        final file = File(path.join(dir.path, '${const Uuid().v4()}.jpg'));
        await file.writeAsBytes(bytes);
        return file;
      }
      return null;
    } catch (e) {
      debugPrint('Error downloading image: ${e.toString()}');
      return null;
    }
  }

  // Save image to local storage
  static Future<String?> saveImageToLocal(File imageFile, String folderName) async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final folderDir = Directory('${dir.path}/$folderName');
      
      if (!await folderDir.exists()) {
        await folderDir.create(recursive: true);
      }
      
      final fileName = '${DateTime.now().millisecondsSinceEpoch}.jpg';
      final localFile = File('${folderDir.path}/$fileName');
      
      await imageFile.copy(localFile.path);
      return localFile.path;
    } catch (e) {
      debugPrint('Error saving image locally: ${e.toString()}');
      return null;
    }
  }

  // Get image dimensions
  static Future<Map<String, int>> getImageDimensions(File imageFile) async {
    try {
      final bytes = await imageFile.readAsBytes();
      final image = await decodeImageFromList(bytes);
      
      return {
        'width': image.width,
        'height': image.height,
      };
    } catch (e) {
      debugPrint('Error getting image dimensions: ${e.toString()}');
      return {
        'width': 0,
        'height': 0,
      };
    }
  }

  // Convert asset image to local file
  static Future<File?> assetToFile(String assetPath) async {
    try {
      final byteData = await rootBundle.load(assetPath);
      final buffer = byteData.buffer;
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/${path.basename(assetPath)}');
      
      await file.writeAsBytes(
        buffer.asUint8List(byteData.offsetInBytes, byteData.lengthInBytes),
      );
      
      return file;
    } catch (e) {
      debugPrint('Error converting asset to file: ${e.toString()}');
      return null;
    }
  }

  // Get image file size in MB
  static Future<double> getFileSizeInMB(File file) async {
    try {
      final bytes = await file.length();
      return bytes / (1024 * 1024); // Convert bytes to MB
    } catch (e) {
      debugPrint('Error getting file size: ${e.toString()}');
      return 0;
    }
  }

  // Check if image size is within limits
  static Future<bool> isImageSizeValid(File file, double maxSizeMB) async {
    final fileSize = await getFileSizeInMB(file);
    return fileSize <= maxSizeMB;
  }

  // Create a placeholder image based on text
  static Widget createPlaceholderImage({
    required String text,
    double width = 100,
    double height = 100,
    Color backgroundColor = Colors.grey,
    Color textColor = Colors.white,
  }) {
    return Container(
      width: width,
      height: height,
      color: backgroundColor,
      child: Center(
        child: Text(
          text.isNotEmpty ? text[0].toUpperCase() : '?',
          style: TextStyle(
            color: textColor,
            fontSize: width * 0.4,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}