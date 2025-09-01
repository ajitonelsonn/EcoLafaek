import 'package:flutter/material.dart';

class ErrorHandler {
  /// Sanitizes error messages by removing sensitive information such as URLs,
  /// IP addresses, ports, and technical error details
  static String sanitizeErrorMessage(dynamic error) {
    if (error == null) return 'An unknown error occurred';
    
    String errorMsg = error.toString();
    
    // Check for common error patterns that might contain sensitive info
    if (_containsNetworkDetails(errorMsg)) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    
    if (_containsAuthDetails(errorMsg)) {
      return 'Authentication failed. Please check your credentials and try again.';
    }
    
    if (_containsServerDetails(errorMsg)) {
      return 'Server error occurred. Please try again later.';
    }
    
    // If it contains URLs, IPs, or technical data, provide a generic message
    if (_containsSensitiveData(errorMsg)) {
      return 'Connection error. Please try again later.';
    }
    
    // For errors we know are safe to show (like form validation errors)
    List<String> safeErrors = [
      'Please enter your username',
      'Please enter your password',
      'Username must be at least',
      'Password must be at least',
      'Invalid email format',
      'Passwords do not match',
      'Please enter a valid email',
      'Please enter a username',
      'Please confirm your password'
    ];
    
    for (var safeError in safeErrors) {
      if (errorMsg.contains(safeError)) {
        return errorMsg;
      }
    }
    
    // For other errors, provide a clean, user-friendly version
    return _getGenericErrorMessage(errorMsg);
  }
  
  /// Checks if the error message contains network-related details
  static bool _containsNetworkDetails(String error) {
    final networkPatterns = [
      'SocketException',
      'Connection',
      'timeout',
      'Network is unreachable',
      'No route to host',
      'Failed to connect',
      'Connection refused'
    ];
    
    return networkPatterns.any((pattern) => 
      error.toLowerCase().contains(pattern.toLowerCase()));
  }
  
  /// Checks if the error message contains authentication-related details
  static bool _containsAuthDetails(String error) {
    final authPatterns = [
      'auth',
      'login',
      'password',
      'credential',
      'token',
      'unauthorized',
      '401',
      '403'
    ];
    
    return authPatterns.any((pattern) => 
      error.toLowerCase().contains(pattern.toLowerCase()));
  }
  
  /// Checks if the error message contains server-related details
  static bool _containsServerDetails(String error) {
    final serverPatterns = [
      'server',
      '500',
      '502',
      '503',
      '504',
      'Internal Server Error',
      'Bad Gateway',
      'Service Unavailable'
    ];
    
    return serverPatterns.any((pattern) => 
      error.toLowerCase().contains(pattern.toLowerCase()));
  }
  
  /// Checks if the error message contains potentially sensitive data
  static bool _containsSensitiveData(String error) {
    // Check for URLs, IPs, ports, and file paths
    final sensitivePatterns = [
      RegExp(r'https?://[^\s/$.?#].[^\s]*'),  // URLs
      RegExp(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'),  // IP addresses
      RegExp(r'port\s*=\s*\d+'),  // Port numbers
      RegExp(r'address\s*='),  // Addresses
      RegExp(r'uri\s*='),  // URIs
      RegExp(r'/([a-zA-Z0-9_\-\.]+/)*(api|v1|v2|v3|auth)\b'),  // API endpoints
    ];
    
    return sensitivePatterns.any((pattern) => pattern.hasMatch(error));
  }
  
  /// Provides a generic user-friendly error message based on the original error
  static String _getGenericErrorMessage(String error) {
    // Common validation errors
    if (error.toLowerCase().contains('invalid')) {
      return 'Invalid input. Please check your information and try again.';
    }
    
    if (error.toLowerCase().contains('required')) {
      return 'Required field missing. Please fill in all required fields.';
    }
    
    if (error.toLowerCase().contains('already exists') || 
        error.toLowerCase().contains('taken') ||
        error.toLowerCase().contains('duplicate')) {
      return 'This username or email is already registered. Please try another one.';
    }
    
    // Return a completely generic message as a fallback
    return 'Something went wrong. Please try again later.';
  }
  
  /// Creates a standardized error widget for displaying in the UI
  static Widget buildErrorWidget(String errorMessage, {Color? backgroundColor, Color? borderColor}) {
    // Sanitize the message again just to be safe
    final safeMessage = sanitizeErrorMessage(errorMessage);
    
    return Container(
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: backgroundColor ?? Colors.red.shade50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: borderColor ?? Colors.red.shade300),
      ),
      child: Row(
        children: [
          Icon(
            Icons.error_outline, 
            color: Colors.red.shade700,
            size: 20,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              safeMessage,
              style: TextStyle(
                color: Colors.red.shade700,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }
}