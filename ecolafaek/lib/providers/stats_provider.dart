import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import '../models/waste_type.dart';
import 'auth_provider.dart';

// Summary statistics model
class SummaryStats {
  final int totalReports;
  final int resolvedReports;
  final int inProgressReports;
  final int reportsThisMonth;
  final int? userRank;
  final int totalUsers;

  SummaryStats({
    required this.totalReports,
    required this.resolvedReports,
    required this.inProgressReports,
    required this.reportsThisMonth,
    this.userRank,
    required this.totalUsers,
  });

  factory SummaryStats.empty() {
    return SummaryStats(
      totalReports: 0,
      resolvedReports: 0,
      inProgressReports: 0,
      reportsThisMonth: 0,
      totalUsers: 0,
    );
  }
}

// Recycling statistics model
class RecyclingStats {
  final int recyclable;
  final int nonRecyclable;

  RecyclingStats({
    required this.recyclable,
    required this.nonRecyclable,
  });
}

class StatsProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  final AuthProvider _authProvider;
  
  // Data
  SummaryStats _summaryStats = SummaryStats.empty();
  Map<String, int> _statusStats = {};
  Map<String, int> _wasteTypeStats = {};
  RecyclingStats? _recyclingStats;
  Map<String, int> _monthlyStats = {};
  List<String> _trendsInsights = [];
  
  // State
  bool _isLoading = false;
  bool _hasError = false;
  String _errorMessage = '';
  bool _hasStatistics = false;
  
  // Constructor
  StatsProvider({required AuthProvider authProvider}) 
      : _authProvider = authProvider;
  
  // Getters
  SummaryStats get summaryStats => _summaryStats;
  Map<String, int> get statusStats => _statusStats;
  Map<String, int> get wasteTypeStats => _wasteTypeStats;
  RecyclingStats? get recyclingStats => _recyclingStats;
  Map<String, int> get monthlyStats => _monthlyStats;
  List<String> get trendsInsights => _trendsInsights;
  
  bool get isLoading => _isLoading;
  bool get hasError => _hasError;
  String get errorMessage => _errorMessage;
  bool get hasStatistics => _hasStatistics;
  
  // Check if response indicates token expiration and handle it
  bool _handleTokenExpiration(Map<String, dynamic> response) {
    if (response['isTokenExpired'] == true) {
      // Token has expired, the API service callback will handle the logout
      // Just clear our error state since the user will be redirected to login
      _clearError();
      return true;
    }
    return false;
  }
  
  // Helper method to safely parse integers
  int _parseInt(dynamic value) {
    if (value == null) return 0;
    
    if (value is int) return value;
    
    if (value is String) {
      try {
        return int.parse(value);
      } catch (e) {
        debugPrint('Error parsing integer from string: $e');
        return 0;
      }
    }
    
    try {
      return value.toInt();
    } catch (e) {
      debugPrint('Error converting to integer: $e');
      return 0;
    }
  }
  
  // Helper method to safely parse doubles
  double _parseDouble(dynamic value) {
    if (value == null) return 0.0;
    
    if (value is double) return value;
    
    if (value is int) return value.toDouble();
    
    if (value is String) {
      try {
        return double.parse(value);
      } catch (e) {
        debugPrint('Error parsing double from string: $e');
        return 0.0;
      }
    }
    
    try {
      return value.toDouble();
    } catch (e) {
      debugPrint('Error converting to double: $e');
      return 0.0;
    }
  }
  
  // Load statistics from API
  Future<bool> loadStatistics() async {
    if (_authProvider.token == null) {
      _setError('Not authenticated');
      return false;
    }
    
    _setLoading(true);
    
    try {
      final response = await _apiService.getDashboardStatistics(
        token: _authProvider.token!,
      );
      
      // Check for token expiration
      if (_handleTokenExpiration(response)) {
        return false;
      }
      
      if (response['success'] == true || response['status'] == 'success') {
        // Get the data from the response
        final data = response;
        
        // Process user stats for summary cards
        final userStats = data['user_stats'] ?? {};
        
        // Calculate reports this month from monthly_reports
        int reportsThisMonth = 0;
        final monthlyReports = data['monthly_reports'] ?? [];
        if (monthlyReports.isNotEmpty) {
          // Get the last month's data
          final lastMonthData = monthlyReports.last;
          if (lastMonthData != null && lastMonthData['count'] != null) {
            reportsThisMonth = _parseInt(lastMonthData['count']);
          }
        }
        
        _summaryStats = SummaryStats(
          totalReports: _parseInt(userStats['total_reports']),
          resolvedReports: _parseInt(userStats['resolved_reports']),
          inProgressReports: _parseInt(userStats['pending_reports']),
          reportsThisMonth: reportsThisMonth,
          userRank: 1, // Just set a default rank if available
          totalUsers: data['community_stats'] != null ? 
                    _parseInt(data['community_stats']['total_contributors']) : 10,
        );
        
        // Process status breakdown
        _statusStats.clear();
        
        // Use priority_distribution to populate status stats if available
        final priorityDistribution = data['priority_distribution'] ?? [];
        if (priorityDistribution.isNotEmpty) {
          for (var item in priorityDistribution) {
            if (item['priority_level'] != null && item['count'] != null) {
              _statusStats[item['priority_level']] = _parseInt(item['count']);
            }
          }
        } else {
          // Fallback to user_stats
          _statusStats = {
            'submitted': _parseInt(userStats['pending_reports']),
            'analyzed': _parseInt(userStats['analyzed_reports']),
            'resolved': _parseInt(userStats['resolved_reports']),
          };
          
          // Remove entries with zero values
          _statusStats.removeWhere((key, value) => value <= 0);
        }
        
        // If statusStats is empty, add some zeros to show the categories
        if (_statusStats.isEmpty) {
          _statusStats = {
            'high': 0,
            'medium': 0,
            'low': 0,
          };
        }
        
        // Process waste type distribution
        _wasteTypeStats.clear();
        final wasteDistribution = data['waste_distribution'] ?? [];
        for (var item in wasteDistribution) {
          if (item['name'] != null && item['count'] != null) {
            _wasteTypeStats[item['name']] = _parseInt(item['count']);
          }
        }
        
        // If wasteTypeStats is empty, add some predefined waste types with zero count
        if (_wasteTypeStats.isEmpty) {
          final commonWasteTypes = WasteTypes.getCommonWasteTypes();
          for (var wasteType in commonWasteTypes) {
            _wasteTypeStats[wasteType.name] = 0;
          }
        }
        
        // Create recycling stats based on waste types
        int recyclableCount = 0;
        int nonRecyclableCount = 0;
        
        // Determine recyclable status based on known waste types
        _wasteTypeStats.forEach((name, count) {
          // Check if the name contains these keywords to determine if recyclable
          if (name.toLowerCase().contains('plastic') || 
              name.toLowerCase().contains('paper') || 
              name.toLowerCase().contains('metal') || 
              name.toLowerCase().contains('glass')) {
            recyclableCount += count;
          } else {
            nonRecyclableCount += count;
          }
        });
        
        _recyclingStats = RecyclingStats(
          recyclable: recyclableCount,
          nonRecyclable: nonRecyclableCount,
        );
        
        // Process monthly data
        _monthlyStats.clear();
        final monthlyData = data['monthly_reports'] ?? [];
        for (var item in monthlyData) {
          if (item['month'] != null && item['count'] != null) {
            _monthlyStats[item['month']] = _parseInt(item['count']);
          }
        }
        
        // Generate insights based on data
        _trendsInsights = [];
        
        // Add insights about severity and priority
        final severityDistribution = data['severity_distribution'] ?? [];
        if (severityDistribution.isNotEmpty) {
          int highSeverityCount = 0;
          
          for (var item in severityDistribution) {
            if (item['severity_score'] != null && _parseInt(item['severity_score']) >= 7) {
              highSeverityCount += _parseInt(item['count']);
            }
          }
          
          if (highSeverityCount > 0) {
            _trendsInsights.add('$highSeverityCount reports have high severity scores, indicating significant waste issues that need attention.');
          }
        }
        
        // Add monthly trend insight
        if (_monthlyStats.length >= 2) {
          final months = _monthlyStats.keys.toList()..sort();
          final firstMonth = months.first;
          final lastMonth = months.last;
          
          final firstCount = _monthlyStats[firstMonth] ?? 0;
          final lastCount = _monthlyStats[lastMonth] ?? 0;
          
          if (lastCount > firstCount) {
            _trendsInsights.add('Your reporting activity has increased from $firstMonth to $lastMonth, showing growing engagement.');
          } else if (lastCount < firstCount) {
            _trendsInsights.add('Your reporting activity has decreased from $firstMonth to $lastMonth.');
          } else {
            _trendsInsights.add('Your reporting activity has remained consistent over the past months.');
          }
        }
        
        // Add general insights
        if (_monthlyStats.isNotEmpty) {
          _trendsInsights.add('Your reporting activity helps us identify waste hotspots and trends in Timor-Leste.');
        }
        
        _hasStatistics = _parseInt(userStats['total_reports']) > 0;
        _clearError();
        return true;
      } else {
        _setError(response['message'] ?? 'Failed to load statistics');
        return false;
      }
    } catch (e) {
      _setError('Error loading statistics: ${e.toString()}');
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
  
  void _setError(String message) {
    _hasError = true;
    _errorMessage = message;
    notifyListeners();
  }
  
  void _clearError() {
    _hasError = false;
    _errorMessage = '';
    notifyListeners();
  }
}