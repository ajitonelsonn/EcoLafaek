import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';

import '../models/user.dart';

class AuthService {
  final String baseUrl;
  
  AuthService({String? customBaseUrl}) 
      : baseUrl = customBaseUrl ?? dotenv.env['API_BASE_URL'] ?? 'http://localhost:8000';

  // Configure headers with optional token
  Map<String, String> _getHeaders({String? token}) {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    
    return headers;
  }

  // Login user
  Future<Map<String, dynamic>> login(String username, String password) async {
    try {
      final url = Uri.parse('$baseUrl/api/auth/login');
      final response = await http.post(
        url,
        headers: _getHeaders(),
        body: jsonEncode({
          'username': username,
          'password': password,
        }),
      );
      
      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200) {
        return {
          'success': true,
          'token': data['token'],
          'user': data['user'],
          'message': data['message'] ?? 'Login successful',
        };
      } else {
        return {
          'success': false,
          'message': data['detail'] ?? data['message'] ?? 'Login failed',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  // Register user
  Future<Map<String, dynamic>> register(
    String username, 
    String email, 
    String password,
    {String? phoneNumber}
  ) async {
    try {
      final url = Uri.parse('$baseUrl/api/auth/register');
      
      final body = {
        'username': username,
        'email': email,
        'password': password,
      };
      
      if (phoneNumber != null) {
        body['phone_number'] = phoneNumber;
      }
      
      final response = await http.post(
        url,
        headers: _getHeaders(),
        body: jsonEncode(body),
      );
      
      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200 || response.statusCode == 201) {
        return {
          'success': true,
          'email': data['email'],
          'username': data['username'],
          'expires_at': data['expires_at'],
          'message': data['message'] ?? 'Registration initiated. Please verify your email.',
          // For development only
          'otp': data['otp'],
        };
      } else {
        return {
          'success': false,
          'message': data['detail'] ?? data['message'] ?? 'Registration failed',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  // Verify registration with OTP
  Future<Map<String, dynamic>> verifyRegistration(String email, String otp) async {
    try {
      final url = Uri.parse('$baseUrl/api/auth/verify-registration');
      final response = await http.post(
        url,
        headers: _getHeaders(),
        body: jsonEncode({
          'email': email,
          'otp': otp,
        }),
      );
      
      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200) {
        return {
          'success': true,
          'token': data['token'],
          'user': data['user'],
          'message': data['message'] ?? 'Registration completed successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['detail'] ?? data['message'] ?? 'Verification failed',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  // Update user profile
  Future<Map<String, dynamic>> updateProfile({
    required int userId,
    required String token,
    String? email,
    String? phoneNumber,
    String? profileImageUrl,
  }) async {
    try {
      final url = Uri.parse('$baseUrl/api/users/$userId');
      
      final body = <String, dynamic>{};
      if (email != null) body['email'] = email;
      if (phoneNumber != null) body['phone_number'] = phoneNumber;
      if (profileImageUrl != null) body['profile_image_url'] = profileImageUrl;
      
      final response = await http.patch(
        url,
        headers: _getHeaders(token: token),
        body: jsonEncode(body),
      );
      
      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200) {
        return {
          'success': true,
          'user': data['user'],
          'message': data['message'] ?? 'Profile updated successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['detail'] ?? data['message'] ?? 'Profile update failed',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  // Change password
  Future<Map<String, dynamic>> changePassword({
    required String token,
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      final url = Uri.parse('$baseUrl/api/auth/change-password');
      final response = await http.post(
        url,
        headers: _getHeaders(token: token),
        body: jsonEncode({
          'current_password': currentPassword,
          'new_password': newPassword,
        }),
      );
      
      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': data['message'] ?? 'Password changed successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['detail'] ?? data['message'] ?? 'Password change failed',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  // Send OTP for verification
  Future<Map<String, dynamic>> sendOTP(String email, String username) async {
    try {
      final url = Uri.parse('$baseUrl/api/auth/send-otp');
      final response = await http.post(
        url,
        headers: _getHeaders(),
        body: jsonEncode({
          'email': email,
          'username': username,
        }),
      );
      
      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200) {
        return {
          'success': true,
          'expires_at': data['expires_at'],
          'message': data['message'] ?? 'OTP sent successfully',
          // For development only
          'otp': data['otp'],
        };
      } else {
        return {
          'success': false,
          'message': data['detail'] ?? data['message'] ?? 'Failed to send OTP',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  // Verify OTP
  Future<Map<String, dynamic>> verifyOTP(String email, String otp) async {
    try {
      final url = Uri.parse('$baseUrl/api/auth/verify-otp');
      final response = await http.post(
        url,
        headers: _getHeaders(),
        body: jsonEncode({
          'email': email,
          'otp': otp,
        }),
      );
      
      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200) {
        return {
          'success': true,
          'token': data['token'],
          'user': data['user'],
          'message': data['message'] ?? 'Email verified successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['detail'] ?? data['message'] ?? 'OTP verification failed',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  // Resend OTP for registration
  Future<Map<String, dynamic>> resendOTP(String email) async {
    try {
      final url = Uri.parse('$baseUrl/api/auth/resend-otp');
      final response = await http.post(
        url,
        headers: _getHeaders(),
        body: jsonEncode({
          'email': email,
        }),
      );
      
      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200) {
        return {
          'success': true,
          'expires_at': data['expires_at'],
          'message': data['message'] ?? 'New OTP sent successfully',
          // For development only
          'otp': data['otp'],
        };
      } else {
        return {
          'success': false,
          'message': data['detail'] ?? data['message'] ?? 'Failed to resend OTP',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Connection error: ${e.toString()}',
      };
    }
  }

  // Verify token validity
  Future<bool> verifyToken(String token) async {
    try {
      final url = Uri.parse('$baseUrl/health');
      final response = await http.get(
        url,
        headers: _getHeaders(token: token),
      );
      
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
}