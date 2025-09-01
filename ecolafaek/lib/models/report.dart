import 'dart:convert';
import 'package:intl/intl.dart'; // Add this import for DateFormat

class Report {
  final int? id;
  final int userId;
  final double latitude;
  final double longitude;
  final String description;
  final String? imageUrl;
  final String status;
  final String? wasteType;
  final int? severityScore;
  final String? priorityLevel;
  final DateTime reportDate;
  final String? locationName;
  final Map<String, dynamic>? deviceInfo;
  final bool isUploaded;
  final String? fullDescription; // Added field for full analysis description

  Report({
    this.id,
    required this.userId,
    required this.latitude,
    required this.longitude,
    required this.description,
    this.imageUrl,
    required this.status,
    this.wasteType,
    this.severityScore,
    this.priorityLevel,
    required this.reportDate,
    this.locationName,
    this.deviceInfo,
    this.isUploaded = true,
    this.fullDescription, // Add to constructor
  });

  // Create from JSON (from API)
  factory Report.fromJson(Map<String, dynamic> json) {
    // Parse device_info which might be a JSON string
    Map<String, dynamic>? deviceInfo;
    if (json['device_info'] != null) {
      if (json['device_info'] is String) {
        try {
          // Parse the JSON string to a Map
          deviceInfo = Map<String, dynamic>.from(
            jsonDecode(json['device_info'] as String)
          );
        } catch (e) {
          print("Error parsing device info JSON: $e");
          deviceInfo = {'error': 'Failed to parse device info'};
        }
      } else if (json['device_info'] is Map) {
        deviceInfo = Map<String, dynamic>.from(json['device_info'] as Map);
      }
    }

    // Parse report date
    DateTime parsedDate;
    if (json['report_date'] != null) {
      try {
        // First try parsing as ISO format
        parsedDate = DateTime.parse(json['report_date']);
      } catch (e) {
        try {
          // Then try RFC 1123 format (e.g., "Sat, 15 Mar 2025 03:31:42 GMT")
          parsedDate = DateFormat("EEE, dd MMM yyyy HH:mm:ss 'GMT'").parse(json['report_date']);
        } catch (error) {
          print("Error parsing date '${json['report_date']}': $error");
          parsedDate = DateTime.now(); // Fallback to current time
        }
      }
    } else {
      parsedDate = DateTime.now();
    }

    return Report(
      id: json['report_id'],
      userId: json['user_id'],
      latitude: json['latitude'] is String 
          ? double.parse(json['latitude']) 
          : json['latitude'].toDouble(),
      longitude: json['longitude'] is String 
          ? double.parse(json['longitude']) 
          : json['longitude'].toDouble(),
      description: json['description'] ?? '',
      imageUrl: json['image_url'],
      status: json['status'] ?? 'submitted',
      wasteType: json['waste_type'],
      severityScore: json['severity_score'],
      priorityLevel: json['priority_level'],
      reportDate: parsedDate,
      locationName: json['address_text'],
      deviceInfo: deviceInfo,
      isUploaded: true,
      fullDescription: json['full_description'], // Add this line to parse the field
    );
  }

  // Create from local database
  factory Report.fromLocalDb(Map<String, dynamic> map) {
    return Report(
      id: map['local_id'],
      userId: map['user_id'],
      latitude: map['latitude'],
      longitude: map['longitude'],
      description: map['description'],
      imageUrl: map['image_path'], // Local file path for pending uploads
      status: map['status'],
      reportDate: DateTime.fromMillisecondsSinceEpoch(map['timestamp']),
      deviceInfo: map['device_info'] != null 
          ? Map<String, dynamic>.from(map['device_info']) 
          : null,
      isUploaded: map['is_uploaded'] == 1,
      fullDescription: map['full_description'], // Add this line
    );
  }

  // Convert to JSON for API submission
  Map<String, dynamic> toJson() {
    final data = {
      'user_id': userId,
      'latitude': latitude,
      'longitude': longitude,
      'description': description,
      'device_info': deviceInfo,
    };

    // For reports that already exist in the backend
    if (id != null) {
      data['report_id'] = id;
    }

    return data;
  }

  // Convert to map for local storage
  Map<String, dynamic> toLocalDbMap() {
    return {
      if (id != null) 'local_id': id,
      'user_id': userId,
      'latitude': latitude,
      'longitude': longitude,
      'description': description,
      'image_path': imageUrl,
      'status': status,
      'timestamp': reportDate.millisecondsSinceEpoch,
      'device_info': deviceInfo,
      'is_uploaded': isUploaded ? 1 : 0,
      'full_description': fullDescription, // Add this line
    };
  }

  // Create a copy with updated values
  Report copyWith({
    int? id,
    int? userId,
    double? latitude,
    double? longitude,
    String? description,
    String? imageUrl,
    String? status,
    String? wasteType,
    int? severityScore,
    String? priorityLevel,
    DateTime? reportDate,
    String? locationName,
    Map<String, dynamic>? deviceInfo,
    bool? isUploaded,
    String? fullDescription, // Add this line
  }) {
    return Report(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      description: description ?? this.description,
      imageUrl: imageUrl ?? this.imageUrl,
      status: status ?? this.status,
      wasteType: wasteType ?? this.wasteType,
      severityScore: severityScore ?? this.severityScore,
      priorityLevel: priorityLevel ?? this.priorityLevel,
      reportDate: reportDate ?? this.reportDate,
      locationName: locationName ?? this.locationName,
      deviceInfo: deviceInfo ?? this.deviceInfo,
      isUploaded: isUploaded ?? this.isUploaded,
      fullDescription: fullDescription ?? this.fullDescription, // Add this line
    );
  }
}