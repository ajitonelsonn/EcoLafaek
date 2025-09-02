import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';

import '../providers/stats_provider.dart';
import '../providers/auth_provider.dart';
import '../models/waste_type.dart';
import '../widgets/loading_indicator.dart';
import '../widgets/error_display.dart';

class StatsScreen extends StatefulWidget {
  static const routeName = '/stats';
  final bool isInTabView;

  const StatsScreen({
    Key? key,
    this.isInTabView = false,
  }) : super(key: key);

  @override
  State<StatsScreen> createState() => _StatsScreenState();
}

class _StatsScreenState extends State<StatsScreen> with TickerProviderStateMixin, AutomaticKeepAliveClientMixin {
  bool _isLoading = true;
  bool _isError = false;
  String _errorMessage = '';
  late TabController _tabController;
  
  // Track initialization to prevent repeated calls
  bool _isInitialized = false;
  
  @override
  bool get wantKeepAlive => true; // Keep state alive when switching tabs
  
  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    
    // Only load statistics once
    if (!_isInitialized) {
      _loadStatistics();
      _isInitialized = true;
    }
    
    // Add listener to update state when tab changes (both click and swipe)
    _tabController.addListener(() {
      if (mounted) {
        setState(() {});
      }
    });
  }
  
  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
  
  Future<void> _loadStatistics() async {
    if (mounted) {
      setState(() {
        _isLoading = true;
        _isError = false;
        _errorMessage = '';
      });
    }
    
    try {
      final statsProvider = Provider.of<StatsProvider>(context, listen: false);
      final success = await statsProvider.loadStatistics();
      
      if (mounted) {
        if (!success) {
          setState(() {
            _isError = true;
            _errorMessage = statsProvider.errorMessage;
            _isLoading = false;
          });
        } else {
          setState(() {
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isError = true;
          _errorMessage = 'Failed to load statistics: ${e.toString()}';
          _isLoading = false;
        });
      }
    }
  }

  // Custom tab bar widget to replace the default TabBar
  Widget _buildCustomTabBar(BuildContext context) {
    final theme = Theme.of(context);
    
    return SizedBox(
      height: 56, // Reduced height to prevent overflow
      child: Padding(
        padding: EdgeInsets.zero, // Remove padding to prevent overflow
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _buildModernTabItem(
              context: context,
              icon: Icons.dashboard_rounded,
              text: 'Overview',
              isActive: _tabController.index == 0,
              onTap: () {
                _tabController.animateTo(0);
                setState(() {});
              },
            ),
            _buildModernTabItem(
              context: context,
              icon: Icons.donut_large_rounded,
              text: 'Progress',
              isActive: _tabController.index == 1,
              onTap: () {
                _tabController.animateTo(1);
                setState(() {});
              },
            ),
            _buildModernTabItem(
              context: context,
              icon: Icons.category_rounded,
              text: 'Categories',
              isActive: _tabController.index == 2,
              onTap: () {
                _tabController.animateTo(2);
                setState(() {});
              },
            ),
            _buildModernTabItem(
              context: context,
              icon: Icons.insights_rounded,
              text: 'Analytics',
              isActive: _tabController.index == 3,
              onTap: () {
                _tabController.animateTo(3);
                setState(() {});
              },
            ),
          ],
        ),
      ),
    );
  }

  // Modern tab item with glassmorphic design
  Widget _buildModernTabItem({
    required BuildContext context,
    required IconData icon,
    required String text,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);
    
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeInOutCubic,
          margin: EdgeInsets.symmetric(
            horizontal: isActive ? 1 : 4,
            vertical: isActive ? 2 : 4,
          ),
          padding: const EdgeInsets.symmetric(vertical: 1),
          decoration: BoxDecoration(
            gradient: isActive
                ? LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      theme.primaryColor,
                      theme.primaryColor.withOpacity(0.8),
                    ],
                  )
                : null,
            color: isActive ? null : Colors.transparent,
            borderRadius: BorderRadius.circular(16),
            boxShadow: isActive
                ? [
                    BoxShadow(
                      color: theme.primaryColor.withOpacity(0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                    BoxShadow(
                      color: Colors.white.withOpacity(0.8),
                      blurRadius: 6,
                      offset: const Offset(0, -2),
                    ),
                  ]
                : null,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                padding: EdgeInsets.all(isActive ? 3 : 2),
                decoration: BoxDecoration(
                  color: isActive
                      ? Colors.white.withOpacity(0.2)
                      : Colors.grey.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  color: isActive ? Colors.white : Colors.grey[600],
                  size: isActive ? 14 : 12,
                ),
              ),
              const SizedBox(height: 1),
              Text(
                text,
                style: TextStyle(
                  fontSize: isActive ? 8 : 7,
                  fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                  color: isActive ? Colors.white : Colors.grey[600],
                  letterSpacing: 0.3,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context); // Required for AutomaticKeepAliveClientMixin
    
    final theme = Theme.of(context);
    
    // When loading
    if (_isLoading) {
      return Scaffold(
        appBar: widget.isInTabView
          ? null
          : AppBar(
              title: const Text('Statistics'),
              centerTitle: true,
            ),
        body: const Center(
          child: LoadingIndicator(message: 'Loading statistics...'),
        ),
      );
    }
    
    // When error
    if (_isError) {
      return Scaffold(
        appBar: widget.isInTabView
          ? null
          : AppBar(
              title: const Text('Statistics'),
              centerTitle: true,
            ),
        body: ErrorDisplay(
          message: _errorMessage,
          onRetry: _loadStatistics,
        ),
      );
    }
    
    return Scaffold(
      appBar: widget.isInTabView
        ? null
        : AppBar(
            title: const Text('Statistics'),
            centerTitle: true,
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: _loadStatistics,
                tooltip: 'Refresh statistics',
              ),
            ],
          ),
      body: Consumer<StatsProvider>(
        builder: (context, statsProvider, _) {
          // If no data available
          if (!statsProvider.hasStatistics) {
            return _buildNoDataAvailable();
          }
          
          // Main stats content with custom tab bar
          return Column(
            children: [
              // Custom tab bar to prevent overflow
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: _buildCustomTabBar(context),
              ),
              
              // Tab view content with proper constraints
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  physics: const BouncingScrollPhysics(), // Enable swipe to change tabs
                  children: [
                    _buildGeneralTab(statsProvider),
                    _buildStatusTab(statsProvider),
                    _buildWasteTypesTab(statsProvider),
                    _buildTrendsTab(statsProvider),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildNoDataAvailable() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.bar_chart_outlined,
            size: 64,
            color: Colors.grey,
          ),
          const SizedBox(height: 10),
          Text(
            'No statistics available yet',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.grey[700],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Start reporting waste to see statistics',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 10),
          ElevatedButton.icon(
            onPressed: _loadStatistics,
            icon: const Icon(Icons.refresh),
            label: const Text('Refresh'),
          ),
        ],
      ),
    );
  }

  // ==================== GENERAL TAB ====================
  Widget _buildGeneralTab(StatsProvider statsProvider) {
    final summaryStats = statsProvider.summaryStats;
    
    return RefreshIndicator(
      onRefresh: _loadStatistics,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Padding(
          padding: const EdgeInsets.all(8.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildModernSummaryGrid(summaryStats),
              const SizedBox(height: 12),
              _buildUltraModernContributionRank(summaryStats),
              const SizedBox(height: 12),
              _buildAdvancedReportSummary(statsProvider),
              const SizedBox(height: 10),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildModernSummaryGrid(SummaryStats stats) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.6,
      children: [
        _buildUltraModernStatCard(
          title: 'Total Reports',
          value: stats.totalReports.toString(),
          icon: Icons.assessment_rounded,
          color: const Color(0xFF4285F4), // Google Blue
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [const Color(0xFF4285F4), const Color(0xFF34A853)],
          ),
        ),
        _buildUltraModernStatCard(
          title: 'Resolved',
          value: stats.resolvedReports.toString(),
          icon: Icons.task_alt_rounded,
          color: const Color(0xFF34A853), // Google Green
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [const Color(0xFF34A853), const Color(0xFF0F9D58)],
          ),
        ),
        _buildUltraModernStatCard(
          title: 'In Progress',
          value: stats.inProgressReports.toString(),
          icon: Icons.hourglass_top_rounded,
          color: const Color(0xFFFF9800), // Orange
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [const Color(0xFFFF9800), const Color(0xFFF57C00)],
          ),
        ),
        _buildUltraModernStatCard(
          title: 'This Month',
          value: stats.reportsThisMonth.toString(),
          icon: Icons.calendar_month_rounded,
          color: const Color(0xFF9C27B0), // Purple
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [const Color(0xFF9C27B0), const Color(0xFF673AB7)],
          ),
        ),
      ],
    );
  }

  Widget _buildUltraModernStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required Gradient gradient,
  }) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white,
            color.withOpacity(0.02),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: color.withOpacity(0.1),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.15),
            blurRadius: 20,
            spreadRadius: 0,
            offset: const Offset(0, 8),
          ),
          BoxShadow(
            color: Colors.white.withOpacity(0.7),
            blurRadius: 10,
            spreadRadius: 0,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(6),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Modern icon with glassmorphic background
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  colors: [
                    color.withOpacity(0.15),
                    color.withOpacity(0.05),
                  ],
                ),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: color.withOpacity(0.2),
                  width: 1,
                ),
              ),
              child: Container(
                margin: const EdgeInsets.all(1),
                decoration: BoxDecoration(
                  gradient: gradient,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: color.withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Icon(
                  icon,
                  color: Colors.white,
                  size: 16,
                ),
              ),
            ),
            
            const Spacer(),
            
            // Large animated number
            TweenAnimationBuilder<int>(
              tween: IntTween(begin: 0, end: int.tryParse(value) ?? 0),
              duration: const Duration(milliseconds: 1200),
              curve: Curves.easeOutCubic,
              builder: (context, animatedValue, child) {
                return Text(
                  animatedValue.toString(),
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Colors.grey[800],
                    shadows: [
                      Shadow(
                        color: color.withOpacity(0.3),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                );
              },
            ),
            
            const SizedBox(height: 4),
            
            // Title with better typography
            Text(
              title,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: Colors.grey[600],
                letterSpacing: 0.3,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUltraModernContributionRank(SummaryStats stats) {
    if (stats.userRank == null || stats.totalUsers == 0) return const SizedBox.shrink();
    
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFFFFC107), // Golden yellow
            const Color(0xFFFF8F00), // Deep orange
            const Color(0xFFFF6F00), // Darker orange
          ],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFFFC107).withOpacity(0.4),
            blurRadius: 20,
            spreadRadius: 0,
            offset: const Offset(0, 10),
          ),
          BoxShadow(
            color: Colors.white.withOpacity(0.8),
            blurRadius: 6,
            spreadRadius: 0,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Animated trophy with glow effect
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              gradient: RadialGradient(
                colors: [
                  Colors.yellow.withOpacity(0.3),
                  Colors.transparent,
                ],
              ),
              shape: BoxShape.circle,
            ),
            child: Container(
              margin: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Colors.white.withOpacity(0.9),
                    Colors.white.withOpacity(0.7),
                  ],
                ),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.2),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Icon(
                Icons.emoji_events_rounded,
                color: Color(0xFFFF8F00),
                size: 32,
              ),
            ),
          ),
          
          const SizedBox(width: 10),
          
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Your Contribution Rank',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Colors.white.withOpacity(0.95),
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 6),
                RichText(
                  text: TextSpan(
                    style: TextStyle(
                      fontSize: 15,
                      color: Colors.white.withOpacity(0.9),
                      fontWeight: FontWeight.w500,
                    ),
                    children: [
                      const TextSpan(text: 'You are ranked '),
                      TextSpan(
                        text: '#${stats.userRank}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          fontSize: 16,
                          shadows: [
                            Shadow(
                              color: Colors.black26,
                              blurRadius: 2,
                              offset: Offset(0, 1),
                            ),
                          ],
                        ),
                      ),
                      TextSpan(text: ' out of ${stats.totalUsers} users'),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAdvancedReportSummary(StatsProvider statsProvider) {
    final recyclingStats = statsProvider.recyclingStats;
    if (recyclingStats == null) return const SizedBox.shrink();
    
    final totalReports = recyclingStats.recyclable + recyclingStats.nonRecyclable;
    final recyclePercent = totalReports > 0 
        ? (recyclingStats.recyclable / totalReports * 100).toStringAsFixed(1) 
        : "0";
    
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white,
            const Color(0xFF4CAF50).withOpacity(0.02),
            Colors.white,
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFF4CAF50).withOpacity(0.1),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF4CAF50).withOpacity(0.1),
            blurRadius: 20,
            spreadRadius: 0,
            offset: const Offset(0, 8),
          ),
          BoxShadow(
            color: Colors.white.withOpacity(0.8),
            blurRadius: 10,
            spreadRadius: 0,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Enhanced header with modern icon
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      const Color(0xFF4CAF50),
                      const Color(0xFF2E7D32),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF4CAF50).withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.recycling_rounded,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 10),
              const Text(
                'Recycling Overview',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1B5E20),
                  letterSpacing: 0.3,
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 12),
          
          // Modern statistics row
          Row(
            children: [
              Expanded(
                child: _buildAdvancedRecyclingStatistic(
                  'Recyclable',
                  recyclingStats.recyclable.toString(),
                  const Color(0xFF4CAF50),
                  Icons.eco_rounded,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildAdvancedRecyclingStatistic(
                  'Non-Recyclable',
                  recyclingStats.nonRecyclable.toString(),
                  const Color(0xFFF44336),
                  Icons.delete_rounded,
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 12),
          
          // Advanced progress visualization
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.grey[50],
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: Colors.grey[200]!,
                width: 1,
              ),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Recycling Rate',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey[700],
                      ),
                    ),
                    Text(
                      '$recyclePercent%',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF4CAF50),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TweenAnimationBuilder<double>(
                  tween: Tween<double>(begin: 0, end: double.parse(recyclePercent) / 100),
                  duration: const Duration(milliseconds: 1500),
                  curve: Curves.easeOutCubic,
                  builder: (context, value, child) {
                    return Container(
                      height: 12,
                      decoration: BoxDecoration(
                        color: Colors.grey[200],
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: value,
                          backgroundColor: Colors.transparent,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            LinearGradient(
                              colors: [const Color(0xFF4CAF50), const Color(0xFF2E7D32)],
                            ).colors.first,
                          ),
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 8),
                Text(
                  'Great job! ${recyclePercent}% of your reports are recyclable waste',
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey[600],
                    fontWeight: FontWeight.w500,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAdvancedRecyclingStatistic(String label, String value, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            color.withOpacity(0.05),
            Colors.white,
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: color.withOpacity(0.2),
          width: 1,
        ),
      ),
      child: Column(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              icon,
              color: color,
              size: 20,
            ),
          ),
          const SizedBox(height: 12),
          TweenAnimationBuilder<int>(
            tween: IntTween(begin: 0, end: int.tryParse(value) ?? 0),
            duration: const Duration(milliseconds: 1000),
            curve: Curves.easeOutCubic,
            builder: (context, animatedValue, child) {
              return Text(
                animatedValue.toString(),
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: color,
                  shadows: [
                    Shadow(
                      color: color.withOpacity(0.3),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey[600],
              fontWeight: FontWeight.w600,
              letterSpacing: 0.3,
            ),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
  // ==================== MODERN STATUS TAB ====================
  Widget _buildStatusTab(StatsProvider statsProvider) {
    final statusStats = statsProvider.statusStats;
    final total = statusStats.values.fold(0, (sum, count) => sum + count);
    final summaryStats = statsProvider.summaryStats;
    
    return RefreshIndicator(
      onRefresh: _loadStatistics,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Report Journey Timeline
              _buildReportJourneyCard(summaryStats),
              const SizedBox(height: 16),
              
              // Impact Metrics
              _buildImpactMetricsCard(summaryStats, total),
              const SizedBox(height: 16),
              
              // Progress Insights
              _buildProgressInsightsCard(statusStats, total),
              const SizedBox(height: 16),
              
              // Achievement Badges
              _buildAchievementBadges(summaryStats),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildReportJourneyCard(SummaryStats stats) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF667eea),
            const Color(0xFF764ba2),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF667eea).withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(Icons.timeline, color: Colors.white, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Your Report Journey',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      'Track your environmental impact',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          
          // Journey Steps
          Row(
            children: [
              _buildJourneyStep('Start', stats.totalReports, Colors.white, true),
              _buildJourneyConnector(),
              _buildJourneyStep('Progress', stats.inProgressReports, Colors.orange[300]!, stats.inProgressReports > 0),
              _buildJourneyConnector(),
              _buildJourneyStep('Resolved', stats.resolvedReports, Colors.green[300]!, stats.resolvedReports > 0),
            ],
          ),
        ],
      ),
    );
  }
  
  Widget _buildJourneyStep(String label, int count, Color color, bool isActive) {
    return Expanded(
      child: Column(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: isActive ? color : Colors.white.withOpacity(0.3),
              borderRadius: BorderRadius.circular(25),
              border: Border.all(
                color: Colors.white.withOpacity(0.5),
                width: 2,
              ),
            ),
            child: Center(
              child: Text(
                count.toString(),
                style: TextStyle(
                  color: isActive ? Colors.black87 : Colors.white70,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildJourneyConnector() {
    return Container(
      width: 30,
      height: 2,
      color: Colors.white.withOpacity(0.5),
      margin: const EdgeInsets.only(bottom: 30),
    );
  }
  
  Widget _buildImpactMetricsCard(SummaryStats stats, int totalStatus) {
    final completionRate = stats.totalReports > 0 ? (stats.resolvedReports / stats.totalReports * 100) : 0;
    final monthlyGrowth = stats.reportsThisMonth;
    
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Impact Metrics',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 20),
          
          Row(
            children: [
              Expanded(
                child: _buildMetricItem(
                  'Comp Rate',
                  '${completionRate.round()}%',
                  Icons.check_circle_outline,
                  const Color(0xFF4CAF50),
                  completionRate / 100,
                ),
              ),
              Expanded(
                child: _buildMetricItem(
                  'This Month',
                  monthlyGrowth.toString(),
                  Icons.trending_up,
                  const Color(0xFF2196F3),
                  monthlyGrowth / 10,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
  
  Widget _buildMetricItem(String title, String value, IconData icon, Color color, double progress) {
    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.only(right: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: progress.clamp(0.0, 1.0),
            backgroundColor: color.withOpacity(0.2),
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ],
      ),
    );
  }
  
  Widget _buildProgressInsightsCard(Map<String, int> statusStats, int total) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Progress Insights',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 16),
          
          ...statusStats.entries.map((entry) {
            final percentage = total > 0 ? (entry.value / total * 100) : 0;
            final color = _getStatusColor(entry.key);
            
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _capitalizeFirst(entry.key),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey[700],
                      ),
                    ),
                  ),
                  Text(
                    '${entry.value} (${percentage.round()}%)',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: color,
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ],
      ),
    );
  }
  
  Widget _buildAchievementBadges(SummaryStats stats) {
    final achievements = <Map<String, dynamic>>[];
    
    if (stats.totalReports >= 1) {
      achievements.add({
        'title': 'First Reporter',
        'description': 'Made your first report',
        'icon': Icons.flag,
        'color': const Color(0xFF4CAF50),
        'unlocked': true,
      });
    }
    
    if (stats.totalReports >= 5) {
      achievements.add({
        'title': 'Environmental Guardian',
        'description': 'Reported 5+ waste issues',
        'icon': Icons.shield,
        'color': const Color(0xFF2196F3),
        'unlocked': true,
      });
    }
    
    if (stats.resolvedReports >= 1) {
      achievements.add({
        'title': 'Problem Solver',
        'description': 'First report resolved',
        'icon': Icons.check_circle,
        'color': const Color(0xFF9C27B0),
        'unlocked': true,
      });
    }
    
    // Add locked achievements
    if (stats.totalReports < 10) {
      achievements.add({
        'title': 'Community Champion',
        'description': 'Report 10 waste issues',
        'icon': Icons.star,
        'color': Colors.grey,
        'unlocked': false,
      });
    }
    
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Achievements',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 16),
          
          ...achievements.map((achievement) {
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: achievement['unlocked'] 
                    ? achievement['color'].withOpacity(0.1)
                    : Colors.grey.withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: achievement['unlocked'] 
                      ? achievement['color'].withOpacity(0.3)
                      : Colors.grey.withOpacity(0.3),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: achievement['color'].withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      achievement['icon'],
                      color: achievement['color'],
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          achievement['title'],
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: achievement['unlocked'] 
                                ? Colors.grey[800]
                                : Colors.grey[500],
                          ),
                        ),
                        Text(
                          achievement['description'],
                          style: TextStyle(
                            fontSize: 12,
                            color: achievement['unlocked'] 
                                ? Colors.grey[600]
                                : Colors.grey[400],
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (achievement['unlocked'])
                    Icon(Icons.check_circle, color: achievement['color'], size: 20)
                  else
                    Icon(Icons.lock_outline, color: Colors.grey[400], size: 20),
                ],
              ),
            );
          }).toList(),
        ],
      ),
    );
  }
  
  Color _getStatusColor(String status) {
    const statusColors = {
      'submitted': Color(0xFF2196F3),
      'analyzing': Color(0xFFFF9800),
      'analyzed': Color(0xFF9C27B0),
      'resolved': Color(0xFF4CAF50),
      'rejected': Color(0xFFE91E63),
      'high': Color(0xFFE53E3E),
      'medium': Color(0xFFED8936),
      'low': Color(0xFF38A169),
    };
    return statusColors[status.toLowerCase()] ?? Colors.grey;
  }
  
  Widget _buildModernSectionHeader(String title, String subtitle, IconData icon, Color color) {
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [color, color.withOpacity(0.8)],
            ),
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: color.withOpacity(0.3),
                blurRadius: 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Icon(
            icon,
            color: Colors.white,
            size: 24,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1A1A1A),
                  letterSpacing: 0.3,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
  
  Widget _buildModernStatusGrid(Map<String, int> statusStats, Map<String, Color> statusColors, int total, Color defaultColor) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 2,
      mainAxisSpacing: 2,
      childAspectRatio: 6.0,
      children: statusStats.entries.map((entry) {
        final status = entry.key;
        final count = entry.value;
        final color = statusColors[status.toLowerCase()] ?? defaultColor;
        final percentage = total > 0 ? (count / total * 100) : 0;
        
        return _buildModernStatusCard(
          _capitalizeFirst(status),
          count,
          percentage.toDouble(),
          color,
          _getStatusIcon(status),
        );
      }).toList(),
    );
  }
  
  Widget _buildModernStatusCard(String status, int count, double percentage, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(1),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white,
            color.withOpacity(0.03),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: color.withOpacity(0.15),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.1),
            blurRadius: 15,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 16,
                height: 16,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [color, color.withOpacity(0.8)],
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  color: Colors.white,
                  size: 10,
                ),
              ),
              const Spacer(),
              Text(
                '${percentage.toStringAsFixed(0)}%',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: color,
                ),
              ),
            ],
          ),
          const Spacer(),
          TweenAnimationBuilder<int>(
            tween: IntTween(begin: 0, end: count),
            duration: const Duration(milliseconds: 1000),
            curve: Curves.easeOutCubic,
            builder: (context, animatedValue, child) {
              return Text(
                animatedValue.toString(),
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: Colors.grey[800],
                ),
              );
            },
          ),
          const SizedBox(height: 4),
          Text(
            status,
            style: TextStyle(
              fontSize: 8,
              fontWeight: FontWeight.w600,
              color: Colors.grey[600],
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
  
  IconData _getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'submitted':
        return Icons.upload_rounded;
      case 'analyzing':
        return Icons.psychology_rounded;
      case 'analyzed':
        return Icons.analytics_rounded;
      case 'resolved':
        return Icons.check_circle_rounded;
      case 'rejected':
        return Icons.cancel_rounded;
      default:
        return Icons.help_rounded;
    }
  }

  // ==================== MODERN WASTE TYPES TAB ====================
  Widget _buildWasteTypesTab(StatsProvider statsProvider) {
    final wasteTypeStats = statsProvider.wasteTypeStats;
    final total = wasteTypeStats.values.fold(0, (sum, count) => sum + count);
    final sortedEntries = wasteTypeStats.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    
    return RefreshIndicator(
      onRefresh: _loadStatistics,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Environmental Impact Header
              _buildEnvironmentalImpactHeader(total),
              const SizedBox(height: 20),
              
              // Recycling Analysis
              _buildRecyclingAnalysis(wasteTypeStats, total),
              const SizedBox(height: 20),
              
              // Top Categories Grid
              _buildTopCategoriesGrid(sortedEntries, total),
              const SizedBox(height: 20),
              
              // Environmental Tips
              _buildEnvironmentalTips(sortedEntries),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildEnvironmentalImpactHeader(int total) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF11998e),
            const Color(0xFF38ef7d),
          ],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF11998e).withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Icon(Icons.eco, color: Colors.white, size: 32),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Environmental Impact',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      'Your waste reporting contribution',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.recycling, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Text(
                  '$total Categories Identified',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildRecyclingAnalysis(Map<String, int> wasteTypeStats, int total) {
    int recyclableCount = 0;
    int nonRecyclableCount = 0;
    int organicCount = 0;
    
    // Categorize waste types
    wasteTypeStats.forEach((type, count) {
      final lowerType = type.toLowerCase();
      if (lowerType.contains('plastic') || lowerType.contains('paper') || 
          lowerType.contains('metal') || lowerType.contains('glass') || 
          lowerType.contains('cardboard')) {
        recyclableCount += count;
      } else if (lowerType.contains('organic') || lowerType.contains('food') || 
                 lowerType.contains('compost')) {
        organicCount += count;
      } else {
        nonRecyclableCount += count;
      }
    });
    
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.analytics, color: const Color(0xFF9C27B0), size: 24),
              const SizedBox(width: 12),
              Text(
                'Recycling Analysis',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: Colors.grey[800],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          
          Row(
            children: [
              Expanded(
                child: _buildAnalysisCard(
                  'Recyclable',
                  recyclableCount,
                  total > 0 ? (recyclableCount / total * 100) : 0,
                  Icons.recycling,
                  const Color(0xFF4CAF50),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildAnalysisCard(
                  'Organic',
                  organicCount,
                  total > 0 ? (organicCount / total * 100) : 0,
                  Icons.grass,
                  const Color(0xFF8BC34A),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildAnalysisCard(
                  'General',
                  nonRecyclableCount,
                  total > 0 ? (nonRecyclableCount / total * 100) : 0,
                  Icons.delete_outline,
                  const Color(0xFFFF9800),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
  
  Widget _buildAnalysisCard(String title, int count, double percentage, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(
            count.toString(),
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Colors.grey[600],
            ),
          ),
          Text(
            '${percentage.round()}%',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w500,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildTopCategoriesGrid(List<MapEntry<String, int>> sortedEntries, int total) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.trending_up, color: const Color(0xFF2196F3), size: 24),
              const SizedBox(width: 12),
              Text(
                'Top Categories',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: Colors.grey[800],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          ...sortedEntries.take(5).map((entry) {
            final wasteType = entry.key;
            final count = entry.value;
            final percentage = total > 0 ? (count / total * 100) : 0;
            final wasteTypeData = _getWasteTypeData(wasteType);
            
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: wasteTypeData.color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: wasteTypeData.color.withOpacity(0.2)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: wasteTypeData.color,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(wasteTypeData.icon, color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _capitalizeFirst(wasteType),
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Colors.grey[800],
                          ),
                        ),
                        Text(
                          '${count} reports • ${percentage.round()}%',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    width: 60,
                    height: 6,
                    decoration: BoxDecoration(
                      color: Colors.grey[200],
                      borderRadius: BorderRadius.circular(3),
                    ),
                    child: FractionallySizedBox(
                      widthFactor: (percentage / 100).clamp(0.0, 1.0),
                      alignment: Alignment.centerLeft,
                      child: Container(
                        decoration: BoxDecoration(
                          color: wasteTypeData.color,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ],
      ),
    );
  }
  
  Widget _buildEnvironmentalTips(List<MapEntry<String, int>> sortedEntries) {
    final tips = _getEnvironmentalTips(sortedEntries);
    
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFFffecd2),
            const Color(0xFFfcb69f),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFfcb69f).withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(Icons.lightbulb_outline, color: const Color(0xFF8D4E85), size: 24),
              ),
              const SizedBox(width: 16),
              Text(
                'Smart Tips',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF8D4E85),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          ...tips.map((tip) => Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.7),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: const Color(0xFF8D4E85),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.eco, color: Colors.white, size: 12),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    tip,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF8D4E85),
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          )).toList(),
        ],
      ),
    );
  }
  
  List<String> _getEnvironmentalTips(List<MapEntry<String, int>> entries) {
    final tips = <String>[];
    
    if (entries.isNotEmpty) {
      final topType = entries.first.key.toLowerCase();
      
      if (topType.contains('plastic')) {
        tips.add('Consider using reusable bags and containers to reduce plastic waste');
        tips.add('Look for products with minimal plastic packaging');
      } else if (topType.contains('organic') || topType.contains('food')) {
        tips.add('Start a compost bin to turn organic waste into nutrient-rich soil');
        tips.add('Plan meals better to reduce food waste');
      } else if (topType.contains('paper')) {
        tips.add('Go digital when possible to reduce paper consumption');
        tips.add('Use both sides of paper before recycling');
      }
    }
    
    // Add general tips
    tips.add('Separate waste properly to improve recycling rates');
    tips.add('Choose products made from recycled materials when shopping');
    
    return tips.take(3).toList();
  }
  
  WasteTypeData _getWasteTypeData(String wasteType) {
    final lowerType = wasteType.toLowerCase();
    
    if (lowerType.contains('plastic')) {
      return WasteTypeData(
        color: const Color(0xFF2196F3),
        icon: Icons.local_drink_rounded,
        description: 'Bottles, containers, packaging materials',
      );
    } else if (lowerType.contains('paper')) {
      return WasteTypeData(
        color: const Color(0xFF8D6E63),
        icon: Icons.description_rounded,
        description: 'Documents, cardboard, newspapers',
      );
    } else if (lowerType.contains('organic')) {
      return WasteTypeData(
        color: const Color(0xFF4CAF50),
        icon: Icons.eco_rounded,
        description: 'Food scraps, biodegradable waste',
      );
    } else if (lowerType.contains('metal')) {
      return WasteTypeData(
        color: const Color(0xFF607D8B),
        icon: Icons.build_rounded,
        description: 'Cans, aluminum, steel items',
      );
    } else if (lowerType.contains('glass')) {
      return WasteTypeData(
        color: const Color(0xFF00BCD4),
        icon: Icons.wine_bar_rounded,
        description: 'Bottles, jars, glass containers',
      );
    } else if (lowerType.contains('electronic')) {
      return WasteTypeData(
        color: const Color(0xFF9C27B0),
        icon: Icons.devices_rounded,
        description: 'Electronics, batteries, gadgets',
      );
    } else if (lowerType.contains('mixed')) {
      return WasteTypeData(
        color: const Color(0xFFFF9800),
        icon: Icons.category_rounded,
        description: 'Various mixed waste materials',
      );
    } else {
      return WasteTypeData(
        color: const Color(0xFF9E9E9E),
        icon: Icons.delete_rounded,
        description: 'Other waste materials',
      );
    }
  }
  
  Widget _buildAdvancedRecyclingOverview(RecyclingStats recyclingStats) {
    final total = recyclingStats.recyclable + recyclingStats.nonRecyclable;
    final recyclePercent = total > 0 
        ? (recyclingStats.recyclable / total * 100).toStringAsFixed(1) 
        : "0";
    
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF4CAF50).withOpacity(0.05),
            Colors.white,
            const Color(0xFF4CAF50).withOpacity(0.02),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFF4CAF50).withOpacity(0.2),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF4CAF50).withOpacity(0.1),
            blurRadius: 15,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF4CAF50), Color(0xFF2E7D32)],
                  ),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF4CAF50).withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.recycling_rounded,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Sustainability Impact',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1B5E20),
                  ),
                ),
              ),
              Text(
                '$recyclePercent%',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF4CAF50),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 12),
          
          // Stats row
          Row(
            children: [
              Expanded(
                child: _buildAdvancedRecyclingStatistic(
                  'Recyclable',
                  recyclingStats.recyclable.toString(),
                  const Color(0xFF4CAF50),
                  Icons.eco_rounded,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildAdvancedRecyclingStatistic(
                  'Non-Recyclable',
                  recyclingStats.nonRecyclable.toString(),
                  const Color(0xFFE53E3E),
                  Icons.delete_rounded,
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 10),
          
          // Impact message
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFF4CAF50).withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.eco_rounded,
                  color: Color(0xFF4CAF50),
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'You\'re making a positive environmental impact with $recyclePercent% recyclable reports!',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF2E7D32),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
  
  // ==================== MODERN ANALYTICS TAB ====================
  Widget _buildTrendsTab(StatsProvider statsProvider) {
    final monthlyStats = statsProvider.monthlyStats;
    
    // Prepare data for the chart
    final List<FlSpot> spots = [];
    final List<String> months = [];
    
    // Sort by date
    final sortedEntries = monthlyStats.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));
    
    // Get min and max values for Y axis
    double minY = 0;
    double maxY = 0;
    
    if (sortedEntries.isNotEmpty) {
      maxY = sortedEntries.map((e) => e.value.toDouble()).reduce((a, b) => a > b ? a : b);
      maxY = (maxY * 1.2).ceilToDouble(); // Add 20% padding
      if (maxY < 5) maxY = 5; // Minimum scale of 5
    }
    
    // Create spots and labels
    for (int i = 0; i < sortedEntries.length; i++) {
      final entry = sortedEntries[i];
      spots.add(FlSpot(i.toDouble(), entry.value.toDouble()));
      
      // Format month label
      final dateParts = entry.key.split('-');
      if (dateParts.length == 2) {
        final year = dateParts[0];
        final month = dateParts[1];
        
        try {
          final date = DateTime(int.parse(year), int.parse(month), 1);
          months.add(DateFormat('MMM').format(date));
        } catch (e) {
          months.add(entry.key);
        }
      } else {
        months.add(entry.key);
      }
    }

    return RefreshIndicator(
      onRefresh: _loadStatistics,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Modern header
              _buildModernSectionHeader(
                'Analytics & Trends',
                'Your reporting activity over time',
                Icons.insights_rounded,
                const Color(0xFF673AB7),
              ),
              
              const SizedBox(height: 12),
              
              // Enhanced line chart
              Container(
                height: 320,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Colors.white,
                    const Color(0xFF673AB7).withOpacity(0.02),
                  ],
                ),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: const Color(0xFF673AB7).withOpacity(0.1),
                  width: 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF673AB7).withOpacity(0.1),
                    blurRadius: 20,
                    spreadRadius: 0,
                    offset: const Offset(0, 8),
                  ),
                  BoxShadow(
                    color: Colors.white.withOpacity(0.9),
                    blurRadius: 10,
                    spreadRadius: 0,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: spots.isEmpty
                  ? _buildEmptyState('No analytics data available', Icons.insights_rounded)
                  : LineChart(
                      LineChartData(
                        gridData: FlGridData(
                          show: true,
                          drawVerticalLine: false,
                          horizontalInterval: maxY > 10 ? maxY / 5 : 1,
                          getDrawingHorizontalLine: (value) {
                            return FlLine(
                              color: Colors.grey[200] ?? Colors.grey,
                              strokeWidth: 1,
                            );
                          },
                        ),
                        titlesData: FlTitlesData(
                          show: true,
                          rightTitles: AxisTitles(
                            sideTitles: SideTitles(showTitles: false),
                          ),
                          topTitles: AxisTitles(
                            sideTitles: SideTitles(showTitles: false),
                          ),
                          bottomTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              reservedSize: 35,
                              interval: 1,
                              getTitlesWidget: (value, meta) {
                                if (value.toInt() >= 0 && value.toInt() < months.length) {
                                  return Padding(
                                    padding: const EdgeInsets.only(top: 8.0),
                                    child: Text(
                                      months[value.toInt()],
                                      style: TextStyle(
                                        color: Colors.grey[600],
                                        fontWeight: FontWeight.w600,
                                        fontSize: 11,
                                      ),
                                    ),
                                  );
                                }
                                return const SizedBox.shrink();
                              },
                            ),
                          ),
                          leftTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              interval: maxY > 10 ? maxY / 5 : 1,
                              reservedSize: 45,
                              getTitlesWidget: (value, meta) {
                                if (value == value.roundToDouble()) {
                                  return Text(
                                    value.toInt().toString(),
                                    style: TextStyle(
                                      color: Colors.grey[600],
                                      fontWeight: FontWeight.w600,
                                      fontSize: 11,
                                    ),
                                  );
                                }
                                return const SizedBox.shrink();
                              },
                            ),
                          ),
                        ),
                        borderData: FlBorderData(show: false),
                        minX: 0,
                        maxX: spots.length - 1.0,
                        minY: minY,
                        maxY: maxY,
                        lineBarsData: [
                          LineChartBarData(
                            spots: spots,
                            isCurved: true,
                            gradient: const LinearGradient(
                              colors: [Color(0xFF673AB7), Color(0xFF9C27B0)],
                            ),
                            barWidth: 4,
                            isStrokeCapRound: true,
                            dotData: FlDotData(
                              show: true,
                              getDotPainter: (spot, percent, barData, index) {
                                return FlDotCirclePainter(
                                  radius: 6,
                                  color: const Color(0xFF673AB7),
                                  strokeWidth: 3,
                                  strokeColor: Colors.white,
                                );
                              },
                            ),
                            belowBarData: BarAreaData(
                              show: true,
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  const Color(0xFF673AB7).withOpacity(0.3),
                                  const Color(0xFF673AB7).withOpacity(0.05),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
            ),
            
            const SizedBox(height: 12),
            
            // Monthly data timeline
            if (sortedEntries.isNotEmpty) ...[
              _buildModernTimelineCard(sortedEntries),
              const SizedBox(height: 12),
            ],
              
            // Enhanced insights card
            if (statsProvider.trendsInsights.isNotEmpty)
              _buildModernInsightsCard(statsProvider.trendsInsights),
            
              const SizedBox(height: 10),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildModernTimelineCard(List<MapEntry<String, int>> sortedEntries) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white,
            const Color(0xFF673AB7).withOpacity(0.02),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFF673AB7).withOpacity(0.1),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF673AB7).withOpacity(0.1),
            blurRadius: 15,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF673AB7), Color(0xFF9C27B0)],
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.timeline_rounded,
                  color: Colors.white,
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              const Text(
                'Monthly Timeline',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF4A148C),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 12),
          
          ...sortedEntries.take(5).map((entry) {
            // Format month for display
            String displayMonth = entry.key;
            final dateParts = entry.key.split('-');
            if (dateParts.length == 2) {
              try {
                final date = DateTime(
                  int.parse(dateParts[0]), 
                  int.parse(dateParts[1]), 
                  1
                );
                displayMonth = DateFormat('MMMM yyyy').format(date);
              } catch (e) {
                // Use original if parsing fails
              }
            }
            
            return Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF673AB7).withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: const Color(0xFF673AB7).withOpacity(0.1),
                  width: 1,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: Color(0xFF673AB7),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      displayMonth,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF4A148C),
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF673AB7), Color(0xFF9C27B0)],
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${entry.value}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ],
      ),
    );
  }
  
  Widget _buildModernInsightsCard(List<String> insights) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF2196F3).withOpacity(0.05),
            Colors.white,
            const Color(0xFF2196F3).withOpacity(0.02),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFF2196F3).withOpacity(0.2),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2196F3).withOpacity(0.1),
            blurRadius: 15,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF2196F3), Color(0xFF1976D2)],
                  ),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF2196F3).withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.psychology_rounded,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 10),
              const Text(
                'Smart Insights',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF0D47A1),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 12),
          
          ...insights.map((insight) {
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: const Color(0xFF2196F3).withOpacity(0.1),
                  width: 1,
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    margin: const EdgeInsets.only(top: 2),
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(
                      color: Color(0xFF2196F3),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      insight,
                      style: const TextStyle(
                        color: Color(0xFF1565C0),
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ],
      ),
    );
  }
  
    Widget _buildEmptyState(String message, IconData icon) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(
              icon,
              size: 32,
              color: Colors.grey[400],
            ),
          ),
          const SizedBox(height: 10),
          Text(
            message,
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: 16,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
  
  String _capitalizeFirst(String text) {
    if (text.isEmpty) return text;
    return text[0].toUpperCase() + text.substring(1).toLowerCase();
  }
}

class WasteTypeData {
  final Color color;
  final IconData icon;
  final String description;
  
  WasteTypeData({
    required this.color,
    required this.icon,
    required this.description,
  });
}