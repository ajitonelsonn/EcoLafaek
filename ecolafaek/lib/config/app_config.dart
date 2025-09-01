import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  // App information
  static const String appName = 'EcoLafaek';
  static const String appVersion = '1.0.0';
  static const String buildNumber = '1';
  
  // Default environment
  static const String defaultEnvironment = 'development';
  
  // API configuration
  static String get apiBaseUrl {
    return dotenv.env['API_BASE_URL'] ?? 'http://192.168.31.105:8000';
  }
  
  // Feature flags
  static bool get enableOfflineMode {
    return dotenv.env['ENABLE_OFFLINE_MODE']?.toLowerCase() == 'true';
  }
  
  static bool get enableMapView {
    return dotenv.env['ENABLE_MAP_VIEW']?.toLowerCase() == 'true';
  }
  
  static bool get enablePushNotifications {
    return dotenv.env['ENABLE_PUSH_NOTIFICATIONS']?.toLowerCase() == 'true';
  }
  
  // Location defaults
  static double get defaultLatitude {
    return double.tryParse(dotenv.env['DEFAULT_LATITUDE'] ?? '') ?? -8.556856;
  }
  
  static double get defaultLongitude {
    return double.tryParse(dotenv.env['DEFAULT_LONGITUDE'] ?? '') ?? 125.560314;
  }
  
  static String get defaultLocationName {
    return dotenv.env['DEFAULT_LOCATION_NAME'] ?? 'Dili, Timor-Leste';
  }
  
  // Default map zoom level
  static double get defaultMapZoom {
    return double.tryParse(dotenv.env['DEFAULT_MAP_ZOOM'] ?? '') ?? 12.0;
  }
  
  // Image quality settings
  static int get imageCompressionQuality {
    return int.tryParse(dotenv.env['IMAGE_COMPRESSION_QUALITY'] ?? '') ?? 80;
  }
  
  static int get maxImageWidth {
    return int.tryParse(dotenv.env['MAX_IMAGE_WIDTH'] ?? '') ?? 1200;
  }
  
  // Sync intervals (in minutes)
  static int get syncInterval {
    return int.tryParse(dotenv.env['SYNC_INTERVAL_MINUTES'] ?? '') ?? 15;
  }
  
  // API request timeout (in seconds)
  static int get apiTimeout {
    return int.tryParse(dotenv.env['API_TIMEOUT_SECONDS'] ?? '') ?? 30;
  }
  
  // Default language
  static String get defaultLanguage {
    return dotenv.env['DEFAULT_LANGUAGE'] ?? 'en';
  }
  
  // Debug mode
  static bool get isDebugMode {
    return kDebugMode;
  }
  
  // Function to load environment-specific configuration
  static Future<void> loadEnvConfig({String env = defaultEnvironment}) async {
    String fileName;
    
    switch (env) {
      case 'production':
        fileName = '.env.production';
        break;
      case 'staging':
        fileName = '.env.staging';
        break;
      case 'development':
      default:
        fileName = '.env.development';
        break;
    }
    
    try {
      await dotenv.load(fileName: fileName);
    } catch (e) {
      // Fallback to default .env file if specific environment file not found
      await dotenv.load(fileName: '.env');
    }
  }
}