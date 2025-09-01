import 'dart:io';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:uuid/uuid.dart';

class ImageService {
  final String baseUrl;
  final int quality;
  final int maxWidth;
  
  ImageService({
    String? customBaseUrl,
    this.quality = 80,
    this.maxWidth = 1200,
  }) : baseUrl = customBaseUrl ?? dotenv.env['API_BASE_URL'] ?? 'http://localhost:8000';

  // Configure headers with optional token
  Map<String, String> _getHeaders({String? token}) {
    final headers = {
      'Accept': 'application/json',
    };
    
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    
    return headers;
  }

  // Compress image file
  Future<File> compressImage(File file) async {
    final dir = await getTemporaryDirectory();
    final targetPath = path.join(dir.path, '${const Uuid().v4()}.jpg');
    
    var result = await FlutterImageCompress.compressAndGetFile(
      file.absolute.path,
      targetPath,
      quality: quality,
      minWidth: maxWidth,
    );
    
    if (result == null) {
      // If compression fails, return original file
      return file;
    }
    
    return File(result.path);
  }

  // Convert image to base64 string
  Future<String> imageToBase64(File file) async {
    final bytes = await file.readAsBytes();
    return base64Encode(bytes);
  }

  // Upload image to server
  Future<Map<String, dynamic>> uploadImage(File file, {String? token}) async {
    try {
      // First compress the image
      final compressedFile = await compressImage(file);
      
      // Convert to base64 - the FastAPI expects base64 encoded images
      final base64Image = await imageToBase64(compressedFile);
      
      // Create request
      final url = Uri.parse('$baseUrl/api/reports');
      final Map<String, dynamic> body = {
        'image_data': base64Image,
        // Adding dummy values required by the API
        'user_id': 1, // Will be replaced by the auth token's user ID
        'latitude': 0.0,
        'longitude': 0.0,
        'description': 'Image upload'
      };
      
      // Send the request
      final response = await http.post(
        url,
        headers: {
          ..._getHeaders(token: token),
          'Content-Type': 'application/json',
        },
        body: jsonEncode(body),
      );
      
      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        // Get the report_id from the response
        final reportId = data['report_id'];
        
        // Construct the image URL based on the report ID
        // Format will depend on your FastAPI implementation
        final imageUrl = '$baseUrl/api/reports/$reportId/image';
        
        return {
          'success': true,
          'url': imageUrl,
          'report_id': reportId
        };
      } else {
        return {
          'success': false,
          'message': 'Upload failed with status code: ${response.statusCode}',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error uploading image: ${e.toString()}',
      };
    }
  }

  // Convert base64 to image file
  Future<File> base64ToImage(String base64String) async {
    final bytes = base64Decode(base64String);
    final dir = await getTemporaryDirectory();
    final file = File(path.join(dir.path, '${const Uuid().v4()}.jpg'));
    await file.writeAsBytes(bytes);
    return file;
  }

  // Save an image to local documents directory
  Future<File> saveImageLocally(File imageFile, String fileName) async {
    final dir = await getApplicationDocumentsDirectory();
    final imagesDir = Directory(path.join(dir.path, 'images'));
    
    // Create directory if it doesn't exist
    if (!await imagesDir.exists()) {
      await imagesDir.create(recursive: true);
    }
    
    final localPath = path.join(imagesDir.path, fileName);
    return await imageFile.copy(localPath);
  }

  // Delete local image file
  Future<bool> deleteLocalImage(String filePath) async {
    try {
      final file = File(filePath);
      if (await file.exists()) {
        await file.delete();
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Error deleting local image: ${e.toString()}');
      return false;
    }
  }

  // Get local image directory path
  Future<String> getLocalImageDir() async {
    final dir = await getApplicationDocumentsDirectory();
    final imagesDir = path.join(dir.path, 'images');
    
    // Create directory if it doesn't exist
    final dirObj = Directory(imagesDir);
    if (!await dirObj.exists()) {
      await dirObj.create(recursive: true);
    }
    
    return imagesDir;
  }

  // Create a unique file name for an image
  String generateUniqueImageName() {
    return '${DateTime.now().millisecondsSinceEpoch}_${const Uuid().v4()}.jpg';
  }
  
  // Test Sonar API's image analysis capabilities
  Future<Map<String, dynamic>> testSonarAnalysis(File imageFile, {String? token}) async {
    try {
      // First compress and convert the image to base64
      final compressedFile = await compressImage(imageFile);
      final base64Image = await imageToBase64(compressedFile);
      
      // Upload to a temporary location - the API might need this
      final uploadResult = await uploadImage(compressedFile, token: token);
      
      if (!uploadResult['success']) {
        return uploadResult;
      }
      
      // Now test the Sonar API with the uploaded image URL
      final response = await http.get(
        Uri.parse('$baseUrl/api/test/sonar?image_url=${uploadResult['url']}'),
        headers: _getHeaders(token: token),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'analysis': data['analysis'],
        };
      } else {
        return {
          'success': false,
          'message': 'Sonar API test failed with status code: ${response.statusCode}',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error testing Sonar API: ${e.toString()}',
      };
    }
  }
}