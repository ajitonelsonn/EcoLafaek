import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../models/user.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../screens/login_screen.dart';
import '../utils/error_handler.dart';

class AuthProvider with ChangeNotifier {
  User? _user;
  String? _token;
  DateTime? _tokenExpiry;
  Timer? _authTimer;
  bool _isLoading = false;
  bool _hasError = false;
  String _errorMessage = '';
  final StorageService _storageService;
  final ApiService _apiService = ApiService();
  
  // Add BuildContext as an optional parameter
  BuildContext? _context;
  
  AuthProvider({required StorageService storageService}) 
      : _storageService = storageService {
    // Initialize storage service
    _storageService.init();
    
    // Set up auto logout callback for API service
    ApiService.setTokenExpiredCallback(_handleTokenExpired);
    
    // Attempt to load user data from secure storage on initialization
    _autoLogin();
  }
  
  // Method to set context
  void setContext(BuildContext context) {
    _context = context;
  }
  
  // Handle token expiration automatically
  void _handleTokenExpired() {
    if (kDebugMode) {
      print('Token expired, performing automatic logout');
    }
    
    // Clear user data and token
    _clearAuthState();
    
    // Show a message to the user if context is available
    if (_context != null && _context!.mounted) {
      ScaffoldMessenger.of(_context!).showSnackBar(
        const SnackBar(
          content: Text('Your session has expired. Please login again.'),
          backgroundColor: Colors.orange,
          duration: Duration(seconds: 3),
        ),
      );
      
      // Navigate to login screen
      Navigator.of(_context!).pushNamedAndRemoveUntil(
        LoginScreen.routeName,
        (route) => false,
      );
    }
  }
  
  // Clear authentication state
  void _clearAuthState() {
    _user = null;
    _token = null;
    _tokenExpiry = null;
    
    if (_authTimer != null) {
      _authTimer!.cancel();
      _authTimer = null;
    }
    
    // Clear stored auth data
    _clearAuthData();
    
    notifyListeners();
  }
  
  // Getters
  User? get currentUser => _user;
  String? get token => _token;
  bool get isAuth => _token != null && _user != null;
  bool get isLoading => _isLoading;
  bool get hasError => _hasError;
  String get errorMessage => _errorMessage;
  
  // Automatically login from stored credentials
  Future<void> _autoLogin() async {
    _setLoading(true);
    
    try {
      // Load token and user data from secure storage
      final savedToken = await _storageService.read('auth_token');
      final userDataStr = await _storageService.read('user_data');
      
      if (savedToken == null || userDataStr == null) {
        _setLoading(false);
        return;
      }
      
      // Parse user data
      final userData = json.decode(userDataStr);
      _user = User.fromJson(userData);
      _token = savedToken;
      
      // Set auto-logout timer
      _autoLogout();
      
      notifyListeners();
    } catch (e) {
      // If there's an error loading credentials, clear everything
      await _clearAuthData();
      // Don't show error for auto-login failure to user
    } finally {
      _setLoading(false);
    }
  }
  
  // Sign in user
  Future<bool> signIn(String username, String password) async {
    _setLoading(true);
    _clearError();
    
    try {
      if (kDebugMode) {
        print("Attempting to sign in with username: $username");
      }
      
      final response = await _apiService.login(
        username: username,
        password: password,
      );
      
      if (kDebugMode) {
        print("Login API response success: ${response['success']}");
      }
      
      // Check if token expired during login attempt
      if (response['isTokenExpired'] == true) {
        // This shouldn't happen during login, but handle it just in case
        _setSecureError('Please try logging in again');
        return false;
      }
      
      if (response['success']) {
        // Save credentials
        _token = response['token'];
        
        try {
          _user = User.fromJson(response['user']);
          if (kDebugMode) {
            print("User parsed successfully: ${_user?.username}");
          }
        } catch (e) {
          if (kDebugMode) {
            print("Error parsing user data: $e");
          }
          _setSecureError('Error processing user information');
          return false;
        }
        
        // Save to secure storage
        try {
          await _saveAuthData();
          if (kDebugMode) {
            print("Auth data saved to secure storage");
          }
        } catch (e) {
          if (kDebugMode) {
            print("Error saving auth data: $e");
          }
          _setSecureError('Error saving login information');
          return false;
        }
        
        // Set auto-logout timer
        _autoLogout();
        
        notifyListeners();
        return true;
      } else {
        _setSecureError(response['message'] ?? 'Authentication failed');
        return false;
      }
    } catch (e) {
      if (kDebugMode) {
        print("SignIn exception: $e");
      }
      _setSecureError(e);
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  // Register new user
  Future<bool> register(String username, String email, String password, {String? phoneNumber}) async {
    _setLoading(true);
    _clearError();

    try {
      if (kDebugMode) {
        print("Attempting to register with username: $username, email: $email");
      }
      
      final response = await _apiService.register(
        username: username,
        email: email,
        password: password,
        phoneNumber: phoneNumber,
      );

      if (kDebugMode) {
        print("Registration API response: $response");
      }

      if (response['success'] || response['status'] == 'success') {
        // Don't try to save user data yet - this happens after OTP verification
        if (kDebugMode) {
          print("Registration initiated successfully");
        }
        return true;
      } else {
        _setSecureError(response['message'] ?? 'Registration failed');
        return false;
      }
    } catch (e) {
      if (kDebugMode) {
        print("Registration exception: $e");
      }
      _setSecureError(e);
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  // Save auth data from response (for OTP verification etc.)
  Future<void> saveAuthDataFromResponse(Map<String, dynamic> data) async {
    try {
      if (data['token'] != null && data['user'] != null) {
        _token = data['token'];
        _user = User.fromJson(data['user']);
        
        // Save to secure storage
        await _storageService.write('auth_token', _token!);
        await _storageService.write('user_data', json.encode(_user!.toJson()));
        
        // Set auto-logout timer
        _autoLogout();
        
        notifyListeners();
      }
    } catch (e) {
      if (kDebugMode) {
        print("Error saving auth data: $e");
      }
      _setSecureError('Error processing authentication data');
    }
  }
  
  // Sign out user and navigate to login screen
  Future<void> signOut() async {
    await _clearAuthData();

    _user = null;
    _token = null;
    _tokenExpiry = null;

    if (_authTimer != null) {
      _authTimer!.cancel();
      _authTimer = null;
    }

    notifyListeners();
    
    // Navigation if context is provided
    if (_context != null && _context!.mounted) {
      Navigator.of(_context!).pushNamedAndRemoveUntil(
        LoginScreen.routeName, 
        (route) => false
      );
    }
  }
  
  // Save authentication data to secure storage
  Future<void> _saveAuthData() async {
    if (_user != null && _token != null) {
      await _storageService.write('auth_token', _token!);
      await _storageService.write('user_data', json.encode(_user!.toJson()));
    }
  }
  
  // Clear authentication data from secure storage
  Future<void> _clearAuthData() async {
    await _storageService.delete('auth_token');
    await _storageService.delete('user_data');
  }
  
  // Set timer for automatic logout when token expires
  void _autoLogout() {
    if (_authTimer != null) {
      _authTimer!.cancel();
    }
    
    // Set logout timer to 23 hours to refresh before expiry
    _authTimer = Timer(const Duration(hours: 23), () => signOut());
  }
  
  // Update user profile
  Future<bool> updateProfile({
    String? email,
    String? phoneNumber,
    String? profileImageUrl,
  }) async {
    if (_user == null || _token == null) {
      _setSecureError('Not authenticated');
      return false;
    }
    
    _setLoading(true);
    _clearError();
    
    try {
      final response = await _apiService.updateUserProfile(
        userId: _user!.id,
        token: _token!,
        email: email,
        phoneNumber: phoneNumber,
        profileImageUrl: profileImageUrl,
      );
      
      // Check for token expiration
      if (response['isTokenExpired'] == true) {
        // Token expired, auto logout will be handled by the callback
        return false;
      }
      
      if (response['success'] || response['status'] == 'success') {
        // Check if user data is an array (as in your API response) or an object
        var userData;
        if (response['user'] is List) {
          // Handle array format - create a map from the array
          final userArray = response['user'] as List;
          if (userArray.isNotEmpty) {
            userData = {
              'user_id': userArray[0],
              'username': userArray[1],
              'email': userArray[2],
              'phone_number': userArray[3],
              'registration_date': userArray[4],
              'last_login': userArray[5],
              'account_status': userArray[6],
              'profile_image_url': userArray[7],
              'verification_status': userArray[8],
            };
          }
        } else {
          // Handle object format
          userData = response['user'];
        }
        
        if (userData != null) {
          // Update user data
          try {
            _user = User.fromJson(userData);
            
            // Update secure storage
            await _storageService.write('user_data', json.encode(_user!.toJson()));
            
            notifyListeners();
            return true;
          } catch (e) {
            if (kDebugMode) {
              print("Error parsing user data: $e");
            }
            _setSecureError('Error processing user data');
            return false;
          }
        } else {
          _setSecureError('Invalid user data in response');
          return false;
        }
      } else {
        _setSecureError(response['message'] ?? 'Profile update failed');
        return false;
      }
    } catch (e) {
      _setSecureError(e);
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  // Change password
  Future<bool> changePassword(String currentPassword, String newPassword) async {
    if (_user == null || _token == null) {
      _setSecureError('Not authenticated');
      return false;
    }
    
    _setLoading(true);
    _clearError();
    
    try {
      final response = await _apiService.changePassword(
        token: _token!,
        currentPassword: currentPassword,
        newPassword: newPassword,
      );
      
      // Check for token expiration
      if (response['isTokenExpired'] == true) {
        // Token expired, auto logout will be handled by the callback
        return false;
      }
      
      if (response['success']) {
        return true;
      } else {
        _setSecureError(response['message'] ?? 'Password change failed');
        return false;
      }
    } catch (e) {
      _setSecureError(e);
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  // Refresh user profile
  Future<bool> refreshProfile() async {
    if (_user == null || _token == null) {
      _setSecureError('Not authenticated');
      return false;
    }
    
    _setLoading(true);
    _clearError();
    
    try {
      final response = await _apiService.getUserProfile(
        userId: _user!.id,
        token: _token!,
      );
      
      // Check for token expiration
      if (response['isTokenExpired'] == true) {
        // Token expired, auto logout will be handled by the callback
        return false;
      }
      
      if (response['success']) {
        _user = User.fromJson(response['user']);
        await _storageService.write('user_data', json.encode(_user!.toJson()));
        notifyListeners();
        return true;
      } else {
        _setSecureError(response['message'] ?? 'Failed to refresh profile');
        return false;
      }
    } catch (e) {
      _setSecureError(e);
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  // Utility methods for state management
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }
  
  void _setSecureError(dynamic message) {
    _hasError = true;
    _errorMessage = ErrorHandler.sanitizeErrorMessage(message);
    notifyListeners();
  }
  
  void _clearError() {
    _hasError = false;
    _errorMessage = '';
    notifyListeners();
  }
}