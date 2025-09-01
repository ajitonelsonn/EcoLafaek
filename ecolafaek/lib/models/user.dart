import 'package:intl/intl.dart';

class User {
  final int id;
  final String username;
  final String? email;
  final String? phoneNumber;
  final DateTime registrationDate;
  final DateTime? lastLogin;
  final String accountStatus;
  final String? profileImageUrl;
  final bool isVerified;

  User({
    required this.id,
    required this.username,
    this.email,
    this.phoneNumber,
    required this.registrationDate,
    this.lastLogin,
    required this.accountStatus,
    this.profileImageUrl,
    required this.isVerified,
  });

  // Create from JSON (from API)
  factory User.fromJson(Map<String, dynamic> json) {
    print("User.fromJson raw data: $json");
    try {
      // Parse date strings like "Sat, 15 Mar 2025 11:08:20 GMT"
      DateTime? parseApiDate(String? dateString) {
        if (dateString == null) return null;
        
        try {
          // First try standard ISO format
          return DateTime.parse(dateString);
        } catch (e) {
          try {
            // Try RFC 1123 format (which is what your API is using)
            return DateFormat('EEE, dd MMM yyyy HH:mm:ss', 'en_US').parse(dateString.replaceAll(' GMT', ''));
          } catch (e) {
            print("Date parsing error for: $dateString");
            print("Error details: $e");
            return null;
          }
        }
      }

      return User(
        id: json['user_id'],
        username: json['username'],
        email: json['email'],
        phoneNumber: json['phone_number'],
        registrationDate: json['registration_date'] != null 
            ? parseApiDate(json['registration_date']) ?? DateTime.now()
            : DateTime.now(),
        lastLogin: json['last_login'] != null 
            ? parseApiDate(json['last_login'])
            : null,
        accountStatus: json['account_status'] ?? 'active',
        profileImageUrl: json['profile_image_url'],
        isVerified: json['verification_status'] == 1 || json['verification_status'] == true,
      );
    } catch (e) {
      print("Error in User.fromJson: $e");
      rethrow;
    }
  }

  // Convert to JSON for API
  Map<String, dynamic> toJson() {
    return {
      'user_id': id,
      'username': username,
      if (email != null) 'email': email,
      if (phoneNumber != null) 'phone_number': phoneNumber,
      'registration_date': registrationDate.toIso8601String(),
      if (lastLogin != null) 'last_login': lastLogin!.toIso8601String(),
      'account_status': accountStatus,
      if (profileImageUrl != null) 'profile_image_url': profileImageUrl,
      'verification_status': isVerified ? 1 : 0,
    };
  }

  // Create a copy with updated values
  User copyWith({
    int? id,
    String? username,
    String? email,
    String? phoneNumber,
    DateTime? registrationDate,
    DateTime? lastLogin,
    String? accountStatus,
    String? profileImageUrl,
    bool? isVerified,
  }) {
    return User(
      id: id ?? this.id,
      username: username ?? this.username,
      email: email ?? this.email,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      registrationDate: registrationDate ?? this.registrationDate,
      lastLogin: lastLogin ?? this.lastLogin,
      accountStatus: accountStatus ?? this.accountStatus,
      profileImageUrl: profileImageUrl ?? this.profileImageUrl,
      isVerified: isVerified ?? this.isVerified,
    );
  }
}