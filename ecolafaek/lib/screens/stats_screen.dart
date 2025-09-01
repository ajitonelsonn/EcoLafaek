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
    
    // Add listener to update state when tab changes
    _tabController.addListener(() {
      if (_tabController.indexIsChanging) {
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
      height: 72, // Fixed height to prevent overflow
      child: Padding(
        padding: const EdgeInsets.only(bottom: 1), // Small padding adjustment
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _buildTabItem(
              context: context,
              icon: Icons.dashboard_outlined,
              text: 'General',
              isActive: _tabController.index == 0,
              onTap: () => _tabController.animateTo(0),
            ),
            _buildTabItem(
              context: context,
              icon: Icons.pie_chart_outline,
              text: 'Status',
              isActive: _tabController.index == 1,
              onTap: () => _tabController.animateTo(1),
            ),
            _buildTabItem(
              context: context,
              icon: Icons.delete_outline,
              text: 'Waste',
              isActive: _tabController.index == 2,
              onTap: () => _tabController.animateTo(2),
            ),
            _buildTabItem(
              context: context,
              icon: Icons.trending_up,
              text: 'Trends',
              isActive: _tabController.index == 3,
              onTap: () => _tabController.animateTo(3),
            ),
          ],
        ),
      ),
    );
  }

  // Individual tab item
  Widget _buildTabItem({
    required BuildContext context,
    required IconData icon,
    required String text,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);
    final color = isActive ? theme.colorScheme.primary : Colors.grey;
    
    return InkWell(
      onTap: onTap,
      child: SizedBox(
        width: MediaQuery.of(context).size.width / 4 - 4, // Evenly distribute with small margins
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              color: color,
              size: isActive ? 24 : 22,
            ),
            const SizedBox(height: 4),
            Text(
              text,
              style: TextStyle(
                fontSize: isActive ? 13 : 12,
                fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                color: color,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            // Indicator dot
            Container(
              margin: const EdgeInsets.only(top: 4),
              width: isActive ? 6 : 0,
              height: isActive ? 6 : 0,
              decoration: BoxDecoration(
                color: theme.colorScheme.primary,
                shape: BoxShape.circle,
              ),
            ),
          ],
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
              
              // Tab view content
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  physics: const NeverScrollableScrollPhysics(), // Prevent swipe to change tabs
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
          const SizedBox(height: 16),
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
          const SizedBox(height: 24),
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
    
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSummaryGrid(summaryStats),
            const SizedBox(height: 24),
            _buildContributionRank(summaryStats),
            const SizedBox(height: 24),
            _buildReportSummary(statsProvider),
            // Add padding at the bottom to prevent overflow
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryGrid(SummaryStats stats) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      children: [
        _buildStatCard(
          title: 'Total Reports',
          value: stats.totalReports.toString(),
          icon: Icons.description_outlined,
          color: Colors.blue,
        ),
        _buildStatCard(
          title: 'Resolved',
          value: stats.resolvedReports.toString(),
          icon: Icons.check_circle_outlined,
          color: Colors.green,
        ),
        _buildStatCard(
          title: 'In Progress',
          value: stats.inProgressReports.toString(),
          icon: Icons.pending_outlined,
          color: Colors.orange,
        ),
        _buildStatCard(
          title: 'This Month',
          value: stats.reportsThisMonth.toString(),
          icon: Icons.calendar_today_outlined,
          color: Colors.purple,
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            spreadRadius: 0,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: color,
              size: 28,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContributionRank(SummaryStats stats) {
    if (stats.userRank == null || stats.totalUsers == 0) return const SizedBox.shrink();
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.amber.shade200,
            Colors.amber.shade100,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.amber.withOpacity(0.3),
            blurRadius: 10,
            spreadRadius: 0,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.amber.shade600,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.emoji_events,
              color: Colors.white,
              size: 32,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Your Contribution Rank',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 4),
                RichText(
                  text: TextSpan(
                    style: const TextStyle(
                      fontSize: 15,
                      color: Colors.black87,
                    ),
                    children: [
                      const TextSpan(text: 'You are ranked '),
                      TextSpan(
                        text: '#${stats.userRank}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.amber,
                          fontSize: 18,
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

  Widget _buildReportSummary(StatsProvider statsProvider) {
    final recyclingStats = statsProvider.recyclingStats;
    if (recyclingStats == null) return const SizedBox.shrink();
    
    final totalReports = recyclingStats.recyclable + recyclingStats.nonRecyclable;
    final recyclePercent = totalReports > 0 
        ? (recyclingStats.recyclable / totalReports * 100).toStringAsFixed(1) 
        : "0";
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            spreadRadius: 0,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.recycling,
                  color: Colors.green,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              const Text(
                'Recycling Overview',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildRecyclingStatistic(
                  'Recyclable',
                  recyclingStats.recyclable.toString(),
                  Colors.green,
                ),
              ),
              Expanded(
                child: _buildRecyclingStatistic(
                  'Non-Recyclable',
                  recyclingStats.nonRecyclable.toString(),
                  Colors.red,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: recyclingStats.recyclable / (totalReports > 0 ? totalReports : 1),
              minHeight: 10,
              backgroundColor: Colors.red.shade100,
              valueColor: AlwaysStoppedAnimation<Color>(Colors.green),
            ),
          ),
          const SizedBox(height: 8),
          Center(
            child: Text(
              '$recyclePercent% of your reports are recyclable waste',
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey[600],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecyclingStatistic(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(8),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              color: Colors.black87,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
  // ==================== STATUS TAB ====================
  Widget _buildStatusTab(StatsProvider statsProvider) {
    final statusStats = statsProvider.statusStats;
    
    // Calculate total for percentages
    final total = statusStats.values.fold(0, (sum, count) => sum + count);
    
    // Generate pie chart data
    final pieChartSections = <PieChartSectionData>[];
    
    // Colors for status types - using priority levels now
    final statusColors = {
      'submitted': Colors.blue,
      'analyzing': Colors.orange,
      'analyzed': Colors.purple,
      'resolved': Colors.green,
      'rejected': Colors.red,
      // Add priority levels
      'high': Colors.red,
      'medium': Colors.orange,
      'low': Colors.green,
    };
    
    // Default color for unknown status
    const defaultColor = Colors.grey;
    
    // Process data
    statusStats.forEach((status, count) {
      if (count > 0) { // Only add non-zero sections
        final percentage = total > 0 ? (count / total * 100) : 0;
        final color = statusColors[status.toLowerCase()] ?? defaultColor;
        
        pieChartSections.add(
          PieChartSectionData(
            value: count.toDouble(),
            title: '${percentage.round()}%',
            titleStyle: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
            radius: 100,
            color: color,
          ),
        );
      }
    });
    
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Status Distribution',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Overview of reports by current status',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 16),
            // Pie chart
            Container(
              height: 280,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                    spreadRadius: 0,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: pieChartSections.isNotEmpty
                  ? PieChart(
                      PieChartData(
                        sections: pieChartSections,
                        centerSpaceRadius: 40,
                        sectionsSpace: 2,
                        pieTouchData: PieTouchData(
                          enabled: true,
                          touchCallback: (FlTouchEvent event, PieTouchResponse? response) {},
                        ),
                      ),
                    )
                  : Center(
                      child: Text(
                        'No status data available',
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 16,
                        ),
                      ),
                    ),
            ),
            
            const SizedBox(height: 24),
            
            // Legend
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                    spreadRadius: 0,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Status Details',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ...statusStats.entries.map((entry) {
                    final status = entry.key;
                    final count = entry.value;
                    final color = statusColors[status.toLowerCase()] ?? defaultColor;
                    final percentage = total > 0 ? (count / total * 100) : 0;
                    
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12.0),
                      child: Row(
                        children: [
                          Container(
                            width: 16,
                            height: 16,
                            decoration: BoxDecoration(
                              color: color,
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _capitalizeFirst(status),
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                          Text(
                            '$count (${percentage.toStringAsFixed(1)}%)',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Colors.grey[700],
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ],
              ),
            ),
            // Add padding at bottom to prevent overflow
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  // ==================== WASTE TYPES TAB ====================
  Widget _buildWasteTypesTab(StatsProvider statsProvider) {
    final wasteTypeStats = statsProvider.wasteTypeStats;
    
    // Calculate total for percentages
    final total = wasteTypeStats.values.fold(0, (sum, count) => sum + count);
    
    // Sort waste types by count (descending)
    final sortedEntries = wasteTypeStats.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Waste Type Distribution',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Breakdown of reported waste by type',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 16),
            ...sortedEntries.map((entry) {
              final wasteType = entry.key;
              final count = entry.value;
              
              // Find waste type info if available
              final wasteTypeInfo = WasteTypes.findByName(wasteType);
              
              // Determine color based on waste type name if info not available
              Color wasteTypeColor;
              if (wasteTypeInfo != null) {
                wasteTypeColor = Color(wasteTypeInfo.getHazardColor());
              } else if (wasteType.toLowerCase().contains('plastic')) {
                wasteTypeColor = Colors.blue;
              } else if (wasteType.toLowerCase().contains('paper')) {
                wasteTypeColor = Colors.brown;
              } else if (wasteType.toLowerCase().contains('organic')) {
                wasteTypeColor = Colors.green;
              } else if (wasteType.toLowerCase().contains('metal')) {
                wasteTypeColor = Colors.grey;
              } else if (wasteType.toLowerCase().contains('glass')) {
                wasteTypeColor = Colors.lightBlue;
              } else if (wasteType.toLowerCase().contains('electronic')) {
                wasteTypeColor = Colors.purple;
              } else if (wasteType.toLowerCase().contains('mixed')) {
                wasteTypeColor = Colors.amber;
              } else {
                wasteTypeColor = Colors.grey;
              }
              
              // Calculate percentage
              final percentage = total > 0 ? (count / total * 100) : 0;
              
              return Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      spreadRadius: 0,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Waste type icon
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: wasteTypeColor.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            Icons.delete_outline,
                            color: wasteTypeColor,
                            size: 18,
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Waste type name and description
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                wasteType,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (wasteTypeInfo?.description != null)
                                Text(
                                  wasteTypeInfo!.description!,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey[600],
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Percentage indicator
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: wasteTypeColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '$count (${percentage.toStringAsFixed(1)}%)',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: wasteTypeColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    // Progress bar showing percentage
                    LinearProgressIndicator(
                      value: percentage / 100,
                      backgroundColor: Colors.grey[200],
                      valueColor: AlwaysStoppedAnimation<Color>(wasteTypeColor),
                      minHeight: 8,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ],
                ),
              );
            }).toList(),
            
            // Recycling stats card
            const SizedBox(height: 16),
            if (statsProvider.recyclingStats != null)
                Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      spreadRadius: 0,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.green.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(
                            Icons.recycling,
                            color: Colors.green,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: const Text(
                            'Recyclable vs. Non-Recyclable',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    // Numbers display
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        Expanded(
                          child: _buildRecyclingStatistic(
                            'Recyclable',
                            statsProvider.recyclingStats!.recyclable.toString(),
                            Colors.green,
                          ),
                        ),
                        Expanded(
                          child: _buildRecyclingStatistic(
                            'Non-Recyclable',
                            statsProvider.recyclingStats!.nonRecyclable.toString(),
                            Colors.red,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    // Visualization of recyclable ratio - ensuring fixed height and proper spacing
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final recyclableFlex = statsProvider.recyclingStats!.recyclable;
                        final nonRecyclableFlex = statsProvider.recyclingStats!.nonRecyclable;
                        final totalFlex = recyclableFlex + nonRecyclableFlex;
                        
                        // Calculate percentages to prevent flex overflow issues
                        final recyclableWidth = totalFlex > 0 
                            ? constraints.maxWidth * (recyclableFlex / totalFlex)
                            : constraints.maxWidth * 0.5;
                        final nonRecyclableWidth = totalFlex > 0
                            ? constraints.maxWidth * (nonRecyclableFlex / totalFlex)
                            : constraints.maxWidth * 0.5;
                            
                        return Row(
                          children: [
                            Container(
                              width: recyclableWidth,
                              height: 20,
                              decoration: const BoxDecoration(
                                color: Colors.green,
                                borderRadius: BorderRadius.only(
                                  topLeft: Radius.circular(10),
                                  bottomLeft: Radius.circular(10),
                                ),
                              ),
                            ),
                            Container(
                              width: nonRecyclableWidth,
                              height: 20,
                              decoration: const BoxDecoration(
                                color: Colors.red,
                                borderRadius: BorderRadius.only(
                                  topRight: Radius.circular(10),
                                  bottomRight: Radius.circular(10),
                                ),
                              ),
                            ),
                          ],
                        );
                      }
                    ),
                    const SizedBox(height: 8),
                    // Labels
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Recyclable',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                        Text(
                          'Non-Recyclable',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            // Add bottom padding to prevent overflow
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  // ==================== TRENDS TAB ====================
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
        
        // Create date to format month name
        try {
          final date = DateTime(int.parse(year), int.parse(month), 1);
          months.add(DateFormat('MMM').format(date));
        } catch (e) {
          // Fallback if date parsing fails
          months.add(entry.key);
        }
      } else {
        months.add(entry.key);
      }
    }

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Monthly Report Trends',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'How your reporting activity has changed over time',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 16),
            // Line chart
            Container(
              height: 280,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                    spreadRadius: 0,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: spots.isEmpty
                ? Center(
                    child: Text(
                      'No monthly data available',
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 16,
                      ),
                    ),
                  )
                : LineChart(
                    LineChartData(
                      gridData: FlGridData(
                        show: true,
                        drawVerticalLine: false,
                        horizontalInterval: maxY > 10 ? maxY / 5 : 1,
                        getDrawingHorizontalLine: (value) {
                          return FlLine(
                            color: Colors.grey[300] ?? Colors.grey,
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
                            reservedSize: 30,
                            interval: 1,
                            getTitlesWidget: (value, meta) {
                              if (value.toInt() >= 0 && value.toInt() < months.length) {
                                return Padding(
                                  padding: const EdgeInsets.only(top: 8.0),
                                  child: Text(
                                    months[value.toInt()],
                                    style: TextStyle(
                                      color: Colors.grey[700],
                                      fontWeight: FontWeight.w500,
                                      fontSize: 12,
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
                            reservedSize: 40,
                            getTitlesWidget: (value, meta) {
                              if (value == value.roundToDouble()) {
                                return Text(
                                  value.toInt().toString(),
                                  style: TextStyle(
                                    color: Colors.grey[700],
                                    fontWeight: FontWeight.w500,
                                    fontSize: 12,
                                  ),
                                );
                              }
                              return const SizedBox.shrink();
                            },
                          ),
                        ),
                      ),
                      borderData: FlBorderData(
                        show: false,
                      ),
                      minX: 0,
                      maxX: spots.length - 1.0,
                      minY: minY,
                      maxY: maxY,
                      lineBarsData: [
                        LineChartBarData(
                          spots: spots,
                          isCurved: true,
                          color: Theme.of(context).primaryColor,
                          barWidth: 4,
                          isStrokeCapRound: true,
                          dotData: FlDotData(
                            show: true,
                            getDotPainter: (spot, percent, barData, index) {
                              return FlDotCirclePainter(
                                radius: 6,
                                color: Theme.of(context).primaryColor,
                                strokeWidth: 2,
                                strokeColor: Colors.white,
                              );
                            },
                          ),
                          belowBarData: BarAreaData(
                            show: true,
                            color: Theme.of(context).primaryColor.withOpacity(0.2),
                          ),
                        ),
                      ],
                    ),
                  ),
            ),
            
            const SizedBox(height: 24),
            
            // Monthly data in card format
            if (sortedEntries.isNotEmpty)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      spreadRadius: 0,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Monthly Report Counts',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    ...sortedEntries.map((entry) {
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
                      
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                displayMonth,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: Theme.of(context).primaryColor.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '${entry.value} reports',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Theme.of(context).primaryColor,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ],
                ),
              ),
              
            // Insights card
            if (statsProvider.trendsInsights.isNotEmpty) 
              Padding(
                padding: const EdgeInsets.only(top: 24),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    gradient: LinearGradient(
                      colors: [
                        Colors.blue.shade50,
                        Colors.blue.shade100,
                      ],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 10,
                        spreadRadius: 0,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.blue.shade600,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(
                              Icons.lightbulb_outline,
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 12),
                          const Text(
                            'Insights',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      ...statsProvider.trendsInsights.map((insight) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                margin: const EdgeInsets.only(top: 2),
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: Colors.blue.shade700,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  insight,
                                  style: TextStyle(
                                    color: Colors.blue.shade900,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ],
                  ),
                ),
              ),
            // Add bottom padding to prevent overflow
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
  
  String _capitalizeFirst(String text) {
    if (text.isEmpty) return text;
    return text[0].toUpperCase() + text.substring(1).toLowerCase();
  }
}