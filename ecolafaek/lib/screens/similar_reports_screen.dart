import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:animate_do/animate_do.dart';

import '../providers/vector_search_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/location_provider.dart';
import '../models/report.dart';
import '../widgets/report_card.dart';
import '../widgets/loading_widget.dart';
import '../widgets/empty_state_widget.dart';
import '../screens/report_detail_screen.dart';

class SimilarReportsScreen extends StatefulWidget {
  static const routeName = '/similar-reports';

  final int? sourceReportId;

  const SimilarReportsScreen({
    super.key,
    this.sourceReportId,
  });

  @override
  State<SimilarReportsScreen> createState() => _SimilarReportsScreenState();
}

class _SimilarReportsScreenState extends State<SimilarReportsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  TextEditingController _searchController = TextEditingController();
  bool _hasInitialized = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_hasInitialized) {
      _initializeData();
    }
  }

  void _initializeData() {
    if (_hasInitialized) return;
    _hasInitialized = true;

    // Check for navigation arguments
    final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    final sourceReportId = args?['sourceReportId'] as int? ?? widget.sourceReportId;

    final vectorProvider = Provider.of<VectorSearchProvider>(context, listen: false);
    
    // If we have a source report ID, find similar reports
    if (sourceReportId != null) {
      vectorProvider.findSimilarReports(sourceReportId);
      _tabController.animateTo(1); // Switch to Similar Reports tab
    }

    // Get user's current location for location patterns
    final locationProvider = Provider.of<LocationProvider>(context, listen: false);
    if (locationProvider.position != null) {
      vectorProvider.getLocationPatterns(
        locationProvider.position!.latitude,
        locationProvider.position!.longitude,
      );
    } else {
      locationProvider.getCurrentLocation();
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _performSemanticSearch() {
    if (_searchController.text.trim().isEmpty) return;

    final vectorProvider = Provider.of<VectorSearchProvider>(context, listen: false);
    vectorProvider.semanticSearchReports(_searchController.text.trim());
    _tabController.animateTo(0); // Switch to Search tab
  }

  void _clearSearch() {
    _searchController.clear();
    final vectorProvider = Provider.of<VectorSearchProvider>(context, listen: false);
    vectorProvider.clearSemanticSearch();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Smart Search',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(
              icon: Icon(Icons.search),
              text: 'Semantic',
            ),
            Tab(
              icon: Icon(Icons.compare_arrows),
              text: 'Similar',
            ),
            Tab(
              icon: Icon(Icons.location_on),
              text: 'Patterns',
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Search bar
          Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search for waste patterns... (e.g., "plastic bottles near water")',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear),
                              onPressed: _clearSearch,
                            )
                          : null,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onSubmitted: (_) => _performSemanticSearch(),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _performSemanticSearch,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Search'),
                ),
              ],
            ),
          ),
          
          // Content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildSemanticSearchTab(),
                _buildSimilarReportsTab(),
                _buildLocationPatternsTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSemanticSearchTab() {
    return Consumer<VectorSearchProvider>(
      builder: (context, vectorProvider, child) {
        if (vectorProvider.isSemanticSearchLoading) {
          return const LoadingWidget(message: 'Searching with AI...');
        }

        if (vectorProvider.errorMessage != null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 16),
                Text(
                  vectorProvider.errorMessage!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 16),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => vectorProvider.clearError(),
                  child: const Text('Try Again'),
                ),
              ],
            ),
          );
        }

        if (vectorProvider.semanticSearchResults.isEmpty) {
          if (vectorProvider.lastSemanticQuery.isNotEmpty) {
            return EmptyStateWidget(
              icon: Icons.search_off,
              title: 'No Results Found',
              message: 'No reports match your search: "${vectorProvider.lastSemanticQuery}"',
              actionText: 'Clear Search',
              onAction: _clearSearch,
            );
          }

          return const EmptyStateWidget(
            icon: Icons.psychology,
            title: 'AI-Powered Search',
            message: 'Use natural language to find waste patterns.\n\nTry: "plastic bottles on beach" or "metal cans in urban area"',
          );
        }

        return FadeIn(
          child: Column(
            children: [
              // Results header
              Container(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const Icon(Icons.psychology, color: Colors.blue),
                    const SizedBox(width: 8),
                    Text(
                      '${vectorProvider.semanticSearchResults.length} AI-matched results',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const Spacer(),
                    TextButton(
                      onPressed: _clearSearch,
                      child: const Text('Clear'),
                    ),
                  ],
                ),
              ),
              
              // Results list
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: vectorProvider.semanticSearchResults.length,
                  itemBuilder: (context, index) {
                    final report = vectorProvider.semanticSearchResults[index];
                    return SlideInUp(
                      delay: Duration(milliseconds: index * 100),
                      child: ReportCard(
                        report: report,
                        onTap: () => _navigateToReportDetail(report),
                        showSimilarityBadge: true,
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSimilarReportsTab() {
    return Consumer<VectorSearchProvider>(
      builder: (context, vectorProvider, child) {
        if (vectorProvider.isSimilarReportsLoading) {
          return const LoadingWidget(message: 'Finding similar reports...');
        }

        if (vectorProvider.errorMessage != null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 16),
                Text(
                  vectorProvider.errorMessage!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 16),
                ),
              ],
            ),
          );
        }

        if (vectorProvider.similarReports.isEmpty) {
          return const EmptyStateWidget(
            icon: Icons.compare_arrows,
            title: 'No Similar Reports',
            message: 'Open a report and tap "Find Similar" to discover related waste patterns.',
          );
        }

        return FadeIn(
          child: Column(
            children: [
              // Results header
              Container(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const Icon(Icons.compare_arrows, color: Colors.green),
                    const SizedBox(width: 8),
                    Text(
                      '${vectorProvider.similarReports.length} similar reports',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const Spacer(),
                    if (vectorProvider.lastSimilarReportId != null)
                      TextButton(
                        onPressed: () => vectorProvider.clearSimilarReports(),
                        child: const Text('Clear'),
                      ),
                  ],
                ),
              ),
              
              // Results list
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: vectorProvider.similarReports.length,
                  itemBuilder: (context, index) {
                    final report = vectorProvider.similarReports[index];
                    return SlideInUp(
                      delay: Duration(milliseconds: index * 100),
                      child: ReportCard(
                        report: report,
                        onTap: () => _navigateToReportDetail(report),
                        showSimilarityBadge: true,
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildLocationPatternsTab() {
    return Consumer<VectorSearchProvider>(
      builder: (context, vectorProvider, child) {
        if (vectorProvider.isLocationPatternsLoading) {
          return const LoadingWidget(message: 'Analyzing location patterns...');
        }

        if (vectorProvider.errorMessage != null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 16),
                Text(
                  vectorProvider.errorMessage!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 16),
                ),
              ],
            ),
          );
        }

        if (vectorProvider.locationPatterns.isEmpty) {
          return const EmptyStateWidget(
            icon: Icons.location_on,
            title: 'No Location Patterns',
            message: 'Enable location services to discover waste patterns in your area.',
          );
        }

        return FadeIn(
          child: Column(
            children: [
              // Results header
              Container(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const Icon(Icons.location_on, color: Colors.orange),
                    const SizedBox(width: 8),
                    Text(
                      '${vectorProvider.locationPatterns.length} patterns nearby',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const Spacer(),
                    TextButton(
                      onPressed: () => vectorProvider.clearLocationPatterns(),
                      child: const Text('Clear'),
                    ),
                  ],
                ),
              ),
              
              // Results list
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: vectorProvider.locationPatterns.length,
                  itemBuilder: (context, index) {
                    final report = vectorProvider.locationPatterns[index];
                    return SlideInUp(
                      delay: Duration(milliseconds: index * 100),
                      child: ReportCard(
                        report: report,
                        onTap: () => _navigateToReportDetail(report),
                        showDistance: true,
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _navigateToReportDetail(Report report) {
    Navigator.of(context).pushNamed(
      ReportDetailScreen.routeName,
      arguments: report.id,
    );
  }
}