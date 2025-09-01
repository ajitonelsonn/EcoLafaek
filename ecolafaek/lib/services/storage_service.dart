import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  late final FlutterSecureStorage _secureStorage;
  late final SharedPreferences _preferences;
  bool _isInitialized = false;

  // Initialize storage services
  Future<void> init() async {
    if (_isInitialized) return;
    
    _secureStorage = const FlutterSecureStorage();
    _preferences = await SharedPreferences.getInstance();
    _isInitialized = true;
  }

  // Secure storage methods (for sensitive data like auth tokens)
  Future<void> write(String key, String value) async {
    await _ensureInitialized();
    await _secureStorage.write(key: key, value: value);
  }

  Future<String?> read(String key) async {
    await _ensureInitialized();
    return await _secureStorage.read(key: key);
  }

  Future<void> delete(String key) async {
    await _ensureInitialized();
    await _secureStorage.delete(key: key);
  }

  Future<void> clearSecureStorage() async {
    await _ensureInitialized();
    await _secureStorage.deleteAll();
  }

  // Shared preferences methods (for non-sensitive app settings)
  Future<void> setString(String key, String value) async {
    await _ensureInitialized();
    await _preferences.setString(key, value);
  }

  String? getString(String key) {
    _ensureInitializedSync();
    return _preferences.getString(key);
  }

  Future<void> setBool(String key, bool value) async {
    await _ensureInitialized();
    await _preferences.setBool(key, value);
  }

  bool? getBool(String key) {
    _ensureInitializedSync();
    return _preferences.getBool(key);
  }

  Future<void> setInt(String key, int value) async {
    await _ensureInitialized();
    await _preferences.setInt(key, value);
  }

  int? getInt(String key) {
    _ensureInitializedSync();
    return _preferences.getInt(key);
  }

  Future<void> remove(String key) async {
    await _ensureInitialized();
    await _preferences.remove(key);
  }

  Future<void> clearPreferences() async {
    await _ensureInitialized();
    await _preferences.clear();
  }

  // Helper methods
  Future<void> _ensureInitialized() async {
    if (!_isInitialized) {
      await init();
    }
  }

  void _ensureInitializedSync() {
    if (!_isInitialized) {
      throw Exception('StorageService not initialized. Call init() first.');
    }
  }
}