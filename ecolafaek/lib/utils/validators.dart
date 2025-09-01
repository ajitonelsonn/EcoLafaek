// A collection of form validators

class Validators {
  // Required field validation
  static String? required(String? value, [String? message]) {
    if (value == null || value.trim().isEmpty) {
      return message ?? 'This field is required';
    }
    return null;
  }
  
  // Email validation
  static String? email(String? value, [String? message]) {
    if (value == null || value.trim().isEmpty) {
      return null; // Skip validation if field is empty
    }
    
    final emailRegExp = RegExp(
    r'^[a-zA-Z0-9.!#$%&*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$',
    );
    
    if (!emailRegExp.hasMatch(value)) {
      return message ?? 'Please enter a valid email address';
    }
    return null;
  }
  
  // Phone number validation
  static String? phone(String? value, [String? message]) {
    if (value == null || value.trim().isEmpty) {
      return null; // Skip validation if field is empty
    }
    
    // Basic phone validation - can be adjusted for specific country formats
    final phoneRegExp = RegExp(r'^\+?[0-9]{8,15}$');
    
    if (!phoneRegExp.hasMatch(value.replaceAll(RegExp(r'\s|-|\(|\)'), ''))) {
      return message ?? 'Please enter a valid phone number';
    }
    return null;
  }
  
  // Minimum length validation
  static String? minLength(String? value, int minLength, [String? message]) {
    if (value == null || value.trim().isEmpty) {
      return null; // Skip validation if field is empty
    }
    
    if (value.length < minLength) {
      return message ?? 'Must be at least $minLength characters';
    }
    return null;
  }
  
  // Maximum length validation
  static String? maxLength(String? value, int maxLength, [String? message]) {
    if (value == null || value.trim().isEmpty) {
      return null; // Skip validation if field is empty
    }
    
    if (value.length > maxLength) {
      return message ?? 'Must be at most $maxLength characters';
    }
    return null;
  }
  
  // Combined validators
  static String? combine(String? value, List<String? Function(String?)> validators) {
    if (validators.isEmpty) return null;
    
    for (final validator in validators) {
      final error = validator(value);
      if (error != null) return error;
    }
    
    return null;
  }
  
  // Password validation
  static String? password(String? value, [String? message]) {
    if (value == null || value.trim().isEmpty) {
      return null; // Skip validation if field is empty
    }
    
    // Password must contain at least 8 characters, 1 uppercase, 1 lowercase, and 1 number
    final passwordRegExp = RegExp(
      r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$',
    );
    
    if (!passwordRegExp.hasMatch(value)) {
      return message ?? 'Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, and 1 number';
    }
    return null;
  }
  
  // Password match validation
  static String? Function(String?) passwordMatch(String? Function() getCompareValue, [String? message]) {
    return (String? value) {
      if (value == null || value.isEmpty) {
        return null; // Skip validation if field is empty
      }
      
      final compareValue = getCompareValue();
      if (compareValue != value) {
        return message ?? 'Passwords do not match';
      }
      return null;
    };
  }
  
  // Numeric validation
  static String? numeric(String? value, [String? message]) {
    if (value == null || value.isEmpty) {
      return null; // Skip validation if field is empty
    }
    
    if (double.tryParse(value) == null) {
      return message ?? 'Please enter a valid number';
    }
    return null;
  }
  
  // Integer validation
  static String? integer(String? value, [String? message]) {
    if (value == null || value.isEmpty) {
      return null; // Skip validation if field is empty
    }
    
    if (int.tryParse(value) == null) {
      return message ?? 'Please enter a valid whole number';
    }
    return null;
  }
}