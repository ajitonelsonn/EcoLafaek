import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:animate_do/animate_do.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/services.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../providers/report_provider.dart';
import '../providers/auth_provider.dart';
import '../models/report.dart';
import '../widgets/report_card.dart';
import '../widgets/loading_indicator.dart';
import '../widgets/report_tracking_widget.dart';
import 'report_screen.dart';
import 'map_screen.dart';
import 'profile_screen.dart';
import 'report_detail_screen.dart';
import '../utils/navigation_utils.dart';
import 'stats_screen.dart';
import 'login_screen.dart';

class HomeScreen extends StatefulWidget {
  static const routeName = '/home';

  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin, ConfirmExitMixin, AutomaticKeepAliveClientMixin {
  int _currentIndex = 0;
  bool _isInit = false;
  bool _isRefreshing = false;
  bool _isOnline = true;
  
  final ScrollController _scrollController = ScrollController();
  
  // Add PageController to preserve widget state
  late PageController _pageController;
  
  @override
  bool get wantKeepAlive => true; // Keep state alive
  
  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _scrollController.addListener(_scrollListener);
  }
  
  @override
  void dispose() {
    _scrollController.removeListener(_scrollListener);
    _scrollController.dispose();
    _pageController.dispose();
    super.dispose();
  }
  
  void _scrollListener() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      _loadMoreReports();
    }
  }
  
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    
    if (!_isInit) {
      _loadReports();
      _setupConnectivityListener();
      _isInit = true;
    }
  }
  
  void _setupConnectivityListener() {
    Connectivity().onConnectivityChanged.listen((ConnectivityResult result) {
      final isOnline = result != ConnectivityResult.none;
      
      if (isOnline && !_isOnline) {
        _refreshReports();
      }
      
      if (mounted) {
        setState(() {
          _isOnline = isOnline;
        });
      }
    });
    
    Connectivity().checkConnectivity().then((result) {
      if (mounted) {
        setState(() {
          _isOnline = result != ConnectivityResult.none;
        });
      }
    });
  }
  
  Future<void> _loadReports() async {
    final reportProvider = Provider.of<ReportProvider>(context, listen: false);
    await reportProvider.loadUserReports();
  }
  
  Future<void> _loadMoreReports() async {
    final reportProvider = Provider.of<ReportProvider>(context, listen: false);
    
    if (reportProvider.hasMoreReports && !reportProvider.isLoadingMore && !reportProvider.isLoading) {
      await reportProvider.loadMoreReports();
    }
  }
  
  Future<void> _refreshReports() async {
    if (mounted) {
      setState(() {
        _isRefreshing = true;
      });
    }
    
    try {
      final reportProvider = Provider.of<ReportProvider>(context, listen: false);
      await reportProvider.loadUserReports();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to refresh reports: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isRefreshing = false;
        });
      }
    }
  }
  
  void _navigateToReportScreen() {
    if (!_isOnline) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('You need to be online to submit reports'),
          backgroundColor: Colors.red,
          duration: Duration(seconds: 3),
        ),
      );
      return;
    }
    
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const ReportScreen()),
    ).then((_) {
      _refreshReports();
    });
  }

  @override
  Widget build(BuildContext context) {
    super.build(context); // Required for AutomaticKeepAliveClientMixin
    
    final theme = Theme.of(context);
    final primaryColor = theme.primaryColor;
    
    return WillPopScope(
      onWillPop: onWillPop,
      child: Scaffold(
        body: _buildCurrentScreen(),
        bottomNavigationBar: _buildBottomNavigationBar(),
        floatingActionButton: FloatingActionButton(
          onPressed: _navigateToReportScreen,
          backgroundColor: primaryColor,
          child: const Icon(Icons.add_a_photo),
        ),
        floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      ),
    );
  }

  Widget _buildCurrentScreen() {
    // Use IndexedStack to preserve state instead of PageView
    return IndexedStack(
      index: _currentIndex,
      children: [
        _buildHomeContent(),
        const MapScreen(isInTabView: true),
        const ProfileScreen(isInTabView: true),
        const StatsScreen(isInTabView: true),
      ],
    );
  }
  
  Widget _buildHomeContent() {
    return Scaffold(
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(100),
        child: _buildCustomAppBar(),
      ),
      body: _buildMyReportsTab(),
    );
  }
  
  Widget _buildCustomAppBar() {
    final theme = Theme.of(context);
    final user = Provider.of<AuthProvider>(context).currentUser;
    
    return Container(
      decoration: BoxDecoration(
        color: theme.primaryColor,
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(30),
          bottomRight: Radius.circular(30),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.asset(
                    'assets/images/empty_reports.png',
                    fit: BoxFit.contain,
                  ),
                ),
              ),
              
              const SizedBox(width: 12),
              
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'EcoLafaek',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    user?.username ?? 'User',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
              
              const Spacer(),
              
              CircleAvatar(
                radius: 18,
                backgroundColor: Colors.white,
                child: user?.profileImageUrl != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(18),
                      child: CachedNetworkImage(
                        imageUrl: user!.profileImageUrl!,
                        placeholder: (context, url) => CircularProgressIndicator(
                          strokeWidth: 2,
                          color: theme.primaryColor,
                        ),
                        errorWidget: (context, url, error) => Text(
                          user.username.substring(0, 1).toUpperCase(),
                          style: TextStyle(
                            color: theme.primaryColor,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    )
                  : Text(
                      user?.username.substring(0, 1).toUpperCase() ?? 'U',
                      style: TextStyle(
                        color: theme.primaryColor,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildMyReportsTab() {
    return SafeArea(
      child: Column(
        children: [
          if (!_isOnline)
            FadeInDown(
              duration: const Duration(milliseconds: 400),
              child: Container(
                color: Colors.red.shade700,
                padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
                width: double.infinity,
                child: const Row(
                  children: [
                    Icon(Icons.wifi_off, color: Colors.white, size: 18),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'No internet connection. You need to be online to submit reports.',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          
          const SizedBox(height: 16),
          const ReportTrackingWidget(),
          const SizedBox(height: 16),
          
          Expanded(
            child: Consumer<ReportProvider>(
              builder: (ctx, reportProvider, _) {
                final reports = reportProvider.reports;
                final isLoading = reportProvider.isLoading;
                final isLoadingMore = reportProvider.isLoadingMore;
                final hasError = reportProvider.hasError;
                
                if (isLoading && reports.isEmpty) {
                  return const Center(
                    child: LoadingIndicator(message: 'Loading reports...'),
                  );
                }
                
                if (hasError && reports.isEmpty) {
                  // Check if the error is related to token expiration
                  final isTokenExpired = reportProvider.errorMessage.toLowerCase().contains('token') && 
                                        (reportProvider.errorMessage.toLowerCase().contains('expired') || 
                                         reportProvider.errorMessage.toLowerCase().contains('invalid'));
                  
                  return _buildAuthErrorWidget(
                    message: reportProvider.errorMessage,
                    onRetry: isTokenExpired ? null : _refreshReports,
                    isTokenExpired: isTokenExpired,
                  );
                }
                
                if (reports.isEmpty) {
                  return _buildEmptyReportsView();
                }
                
                final sortedReports = List<Report>.from(reports);
                sortedReports.sort((a, b) => b.reportDate.compareTo(a.reportDate));
                
                return RefreshIndicator(
                  onRefresh: _refreshReports,
                  child: ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: sortedReports.length + (isLoadingMore ? 1 : 0),
                    itemBuilder: (ctx, index) {
                      if (index == sortedReports.length) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 16.0),
                          child: Center(
                            child: CircularProgressIndicator(),
                          ),
                        );
                      }
                      
                      final report = sortedReports[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 16.0),
                        child: ReportCard(
                          report: report,
                          onTap: () {
                            Navigator.of(context).pushNamed(
                              ReportDetailScreen.routeName,
                              arguments: report.id,
                            ).then((_) {
                              _refreshReports();
                            });
                          },
                          onDeleted: () {
                            _refreshReports();
                          },
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
  
  // Auth error widget for token expiration handling
  Widget _buildAuthErrorWidget({
    required String message,
    VoidCallback? onRetry,
    bool isTokenExpired = false,
  }) {
    final theme = Theme.of(context);
    
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Error icon
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: isTokenExpired ? Colors.orange.withOpacity(0.1) : Colors.red.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                isTokenExpired ? Icons.access_time : Icons.error_outline,
                size: 40,
                color: isTokenExpired ? Colors.orange : Colors.red,
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Title
            Text(
              isTokenExpired ? 'Session Expired' : 'Something went wrong',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: isTokenExpired ? Colors.orange[700] : Colors.red[700],
              ),
              textAlign: TextAlign.center,
            ),
            
            const SizedBox(height: 12),
            
            // Message
            Text(
              isTokenExpired 
                ? 'Your session has expired. Please login again to continue.'
                : message,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: Colors.grey[700],
              ),
              textAlign: TextAlign.center,
            ),
            
            const SizedBox(height: 32),
            
            // Action buttons
            if (isTokenExpired)
              // For token expiration, show login button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    // Sign out and navigate to login
                    final authProvider = Provider.of<AuthProvider>(context, listen: false);
                    await authProvider.signOut();
                    
                    if (context.mounted) {
                      Navigator.of(context).pushNamedAndRemoveUntil(
                        LoginScreen.routeName,
                        (route) => false,
                      );
                    }
                  },
                  icon: const Icon(Icons.login),
                  label: const Text('Login Again'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.orange,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              )
            else if (onRetry != null)
              // For other errors, show retry button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Try Again'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildEmptyReportsView() {
    final theme = Theme.of(context);
    
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset(
              'assets/images/empty_reports.png',
              width: 200,
              height: 200,
            ),
            
            const SizedBox(height: 24),
            
            Text(
              'No Reports Yet',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: theme.primaryColor,
              ),
            ),
            
            const SizedBox(height: 16),
            
            Text(
              'Start reporting waste issues in your area to help keep Timor-Leste clean and beautiful.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[700],
              ),
            ),
            
            const SizedBox(height: 32),
            
            ElevatedButton.icon(
              onPressed: _isOnline ? _navigateToReportScreen : null,
              icon: const Icon(Icons.add_a_photo_rounded),
              label: const Text(
                'Create Your First Report',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomNavigationBar() {
    final theme = Theme.of(context);
    final primaryColor = theme.primaryColor;
    
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, -3),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildNavItem(Icons.home_rounded, 'Home', 0),
            _buildNavItem(Icons.map_rounded, 'Map', 1),
            const SizedBox(width: 40), // Space for FAB
            _buildNavItem(Icons.person_rounded, 'Profile', 2),
            _buildNavItem(Icons.insights_rounded, 'Stats', 3),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, int index) {
    final theme = Theme.of(context);
    final isSelected = _currentIndex == index;
    final color = isSelected ? theme.primaryColor : Colors.grey;

    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _currentIndex = index),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}