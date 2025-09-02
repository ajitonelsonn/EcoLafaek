import 'package:flutter/material.dart';
import '../models/report.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class VectorSearchProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  AuthProvider? _authProvider;

  // Loading states
  bool _isSemanticSearchLoading = false;
  bool _isSimilarReportsLoading = false;
  bool _isLocationPatternsLoading = false;
  bool _isNearbySearchLoading = false;

  // Search results
  List<Report> _semanticSearchResults = [];
  List<Report> _similarReports = [];
  List<Report> _locationPatterns = [];
  List<Report> _nearbySearchResults = [];

  // Error messages
  String? _errorMessage;

  // Last search query
  String _lastSemanticQuery = '';
  int? _lastSimilarReportId;

  // Getters
  bool get isSemanticSearchLoading => _isSemanticSearchLoading;
  bool get isSimilarReportsLoading => _isSimilarReportsLoading;
  bool get isLocationPatternsLoading => _isLocationPatternsLoading;
  bool get isNearbySearchLoading => _isNearbySearchLoading;
  bool get isLoading => _isSemanticSearchLoading || _isSimilarReportsLoading || 
                       _isLocationPatternsLoading || _isNearbySearchLoading;

  List<Report> get semanticSearchResults => _semanticSearchResults;
  List<Report> get similarReports => _similarReports;
  List<Report> get locationPatterns => _locationPatterns;
  List<Report> get nearbySearchResults => _nearbySearchResults;

  String? get errorMessage => _errorMessage;
  String get lastSemanticQuery => _lastSemanticQuery;
  int? get lastSimilarReportId => _lastSimilarReportId;

  // Update auth provider
  void updateAuth(AuthProvider authProvider) {
    _authProvider = authProvider;
  }

  // Clear error message
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  // Semantic search for reports using natural language
  Future<void> semanticSearchReports(String query, {int limit = 10}) async {
    if (query.trim().isEmpty) {
      _semanticSearchResults = [];
      _lastSemanticQuery = '';
      notifyListeners();
      return;
    }

    _isSemanticSearchLoading = true;
    _errorMessage = null;
    _lastSemanticQuery = query;
    notifyListeners();

    try {
      final token = _authProvider?.token;
      if (token == null) {
        throw Exception('Not authenticated');
      }

      final response = await _apiService.semanticSearchReports(
        query: query,
        token: token,
        limit: limit,
      );

      if (response['success'] == true) {
        final List<dynamic> results = response['results'] ?? [];
        _semanticSearchResults = results.map((item) => Report.fromJson(item)).toList();
        _errorMessage = null;
      } else {
        _errorMessage = response['message'] ?? 'Failed to perform semantic search';
        _semanticSearchResults = [];
      }
    } catch (e) {
      _errorMessage = 'Error performing semantic search: ${e.toString()}';
      _semanticSearchResults = [];
    } finally {
      _isSemanticSearchLoading = false;
      notifyListeners();
    }
  }

  // Find similar reports
  Future<void> findSimilarReports(int reportId, {int limit = 5}) async {
    _isSimilarReportsLoading = true;
    _errorMessage = null;
    _lastSimilarReportId = reportId;
    notifyListeners();

    try {
      final token = _authProvider?.token;
      if (token == null) {
        throw Exception('Not authenticated');
      }

      final response = await _apiService.findSimilarReports(
        reportId: reportId,
        token: token,
        limit: limit,
      );

      if (response['success'] == true) {
        final List<dynamic> results = response['similar_reports'] ?? [];
        _similarReports = results.map((item) => Report.fromJson(item)).toList();
        _errorMessage = null;
      } else {
        _errorMessage = response['message'] ?? 'Failed to find similar reports';
        _similarReports = [];
      }
    } catch (e) {
      _errorMessage = 'Error finding similar reports: ${e.toString()}';
      _similarReports = [];
    } finally {
      _isSimilarReportsLoading = false;
      notifyListeners();
    }
  }

  // Get location-based patterns
  Future<void> getLocationPatterns(double latitude, double longitude, 
      {double radius = 1000.0, int limit = 10}) async {
    _isLocationPatternsLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = _authProvider?.token;
      if (token == null) {
        throw Exception('Not authenticated');
      }

      final response = await _apiService.getLocationPatterns(
        latitude: latitude,
        longitude: longitude,
        token: token,
        radius: radius,
        limit: limit,
      );

      if (response['success'] == true) {
        final List<dynamic> results = response['patterns'] ?? [];
        _locationPatterns = results.map((item) => Report.fromJson(item)).toList();
        _errorMessage = null;
      } else {
        _errorMessage = response['message'] ?? 'Failed to get location patterns';
        _locationPatterns = [];
      }
    } catch (e) {
      _errorMessage = 'Error getting location patterns: ${e.toString()}';
      _locationPatterns = [];
    } finally {
      _isLocationPatternsLoading = false;
      notifyListeners();
    }
  }

  // Search nearby similar reports
  Future<void> searchNearbySimilar(double latitude, double longitude, String wasteType,
      {double radius = 2000.0, int limit = 10}) async {
    _isNearbySearchLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = _authProvider?.token;
      if (token == null) {
        throw Exception('Not authenticated');
      }

      final response = await _apiService.searchNearbySimilar(
        latitude: latitude,
        longitude: longitude,
        wasteType: wasteType,
        token: token,
        radius: radius,
        limit: limit,
      );

      if (response['success'] == true) {
        final List<dynamic> results = response['nearby_reports'] ?? [];
        _nearbySearchResults = results.map((item) => Report.fromJson(item)).toList();
        _errorMessage = null;
      } else {
        _errorMessage = response['message'] ?? 'Failed to search nearby similar reports';
        _nearbySearchResults = [];
      }
    } catch (e) {
      _errorMessage = 'Error searching nearby similar reports: ${e.toString()}';
      _nearbySearchResults = [];
    } finally {
      _isNearbySearchLoading = false;
      notifyListeners();
    }
  }

  // Clear specific search results
  void clearSemanticSearch() {
    _semanticSearchResults = [];
    _lastSemanticQuery = '';
    notifyListeners();
  }

  void clearSimilarReports() {
    _similarReports = [];
    _lastSimilarReportId = null;
    notifyListeners();
  }

  void clearLocationPatterns() {
    _locationPatterns = [];
    notifyListeners();
  }

  void clearNearbySearch() {
    _nearbySearchResults = [];
    notifyListeners();
  }

  // Clear all search results
  void clearAllSearches() {
    _semanticSearchResults = [];
    _similarReports = [];
    _locationPatterns = [];
    _nearbySearchResults = [];
    _lastSemanticQuery = '';
    _lastSimilarReportId = null;
    _errorMessage = null;
    notifyListeners();
  }

  // Check if any search has results
  bool get hasAnyResults => _semanticSearchResults.isNotEmpty || 
                           _similarReports.isNotEmpty || 
                           _locationPatterns.isNotEmpty ||
                           _nearbySearchResults.isNotEmpty;

  // Get total results count
  int get totalResultsCount => _semanticSearchResults.length + 
                              _similarReports.length + 
                              _locationPatterns.length +
                              _nearbySearchResults.length;
}