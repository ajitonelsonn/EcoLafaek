import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:share_plus/share_plus.dart';
import 'package:animate_do/animate_do.dart';
import 'package:intl/intl.dart';

import '../providers/report_provider.dart';
import '../models/report.dart';
import '../widgets/loading_indicator.dart';
import '../widgets/custom_button.dart';
import '../utils/date_utils.dart' as date_utils;

class ReportDetailScreen extends StatefulWidget {
  static const routeName = '/report-detail';

  final int reportId;

  const ReportDetailScreen({
    Key? key,
    required this.reportId,
  }) : super(key: key);

  @override
  State<ReportDetailScreen> createState() => _ReportDetailScreenState();
}

class _ReportDetailScreenState extends State<ReportDetailScreen> {
  bool _isLoading = true;
  bool _isDeleting = false;
  String? _errorMessage;
  Report? _report;

  final MapController _mapController = MapController();
  
  @override
  void initState() {
    super.initState();
    // Load report details
    _loadReportDetails();
  }
  
  // Load report details from provider
  Future<void> _loadReportDetails() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    
    try {
      final reportProvider = Provider.of<ReportProvider>(context, listen: false);
      final report = await reportProvider.getReportById(widget.reportId);
      
      setState(() {
        _report = report;
        _isLoading = false;
      });
      
      if (report == null) {
        setState(() {
          _errorMessage = 'Report not found or could not be loaded';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Error loading report: ${e.toString()}';
        _isLoading = false;
      });
    }
  }
  
  // Delete report
  Future<void> _deleteReport() async {
    // Show confirmation dialog
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Report'),
        content: const Text(
          'Are you sure you want to delete this report? This action cannot be undone.'
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('CANCEL'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text(
              'DELETE',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
    
    if (confirm != true) return;
    
    setState(() {
      _isDeleting = true;
    });
    
    try {
      final reportProvider = Provider.of<ReportProvider>(context, listen: false);
      final success = await reportProvider.deleteReport(widget.reportId);
      
      if (success) {
        // Navigate back after successful deletion
        if (mounted) {
          Navigator.of(context).pop();
          
          // Show success message
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Report deleted successfully'),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        setState(() {
          _isDeleting = false;
          _errorMessage = reportProvider.errorMessage;
        });
      }
    } catch (e) {
      setState(() {
        _isDeleting = false;
        _errorMessage = 'Failed to delete report: ${e.toString()}';
      });
    }
  }
  
  // Share report

  void _shareReport() {
    if (_report == null) return;
    
    final message = '''
I've reported waste using EcoLafaek!

Location: ${_report!.locationName ?? 'Unknown location'}
Status: ${_report!.status}
Date: ${DateFormat('MMM d, yyyy').format(_report!.reportDate)}

Join the community and help keep Timor-Leste clean. Download EcoLafaek today!
''';
    
    Share.share(message, subject: 'EcoLafaek Waste Report');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.primaryColor;
    
    // When loading
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Report Details'),
          backgroundColor: primaryColor,
          centerTitle: true,
        ),
        body: const Center(
          child: LoadingIndicator(message: 'Loading report details...'),
        ),
      );
    }
    
    // When error occurred
    if (_errorMessage != null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Report Details'),
          backgroundColor: primaryColor,
          centerTitle: true,
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.error_outline,
                size: 70,
                color: Colors.red,
              ),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Text(
                  _errorMessage!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.red),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _loadReportDetails,
                icon: const Icon(Icons.refresh),
                label: const Text('Try Again'),
              ),
            ],
          ),
        ),
      );
    }
    
    // When report is null (shouldn't happen, but just in case)
    if (_report == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Report Details'),
          backgroundColor: primaryColor,
          centerTitle: true,
        ),
        body: const Center(
          child: Text('Report not found'),
        ),
      );
    }
    
    // Successful load with report data
    final report = _report!;
    
    // Format date and time
    final formattedDate = date_utils.formatReportDate(report.reportDate);
    
    // Determine status color and icon
    Color statusColor;
    IconData statusIcon;
    String statusText = report.status;
    
    switch (report.status.toLowerCase()) {
      case 'submitted':
        statusColor = Colors.blue;
        statusIcon = Icons.send;
        statusText = 'Submitted';
        break;
      case 'analyzing':
        statusColor = Colors.orange;
        statusIcon = Icons.analytics;
        statusText = 'Analyzing';
        break;
      case 'analyzed':
        statusColor = Colors.purple;
        statusIcon = Icons.done_all;
        statusText = 'Analyzed';
        break;
      case 'resolved':
        statusColor = Colors.green;
        statusIcon = Icons.check_circle;
        statusText = 'Resolved';
        break;
      case 'rejected':
        statusColor = Colors.red;
        statusIcon = Icons.cancel;
        statusText = 'Rejected';
        break;
      default:
        statusColor = Colors.grey;
        statusIcon = Icons.help_outline;
        statusText = report.status;
    }
    
    return Scaffold(
      body: Stack(
        children: [
          // Main content using CustomScrollView with Sliver widgets for better scrolling
          CustomScrollView(
            slivers: [
              // App bar with image as background
              SliverAppBar(
                expandedHeight: 250.0,
                pinned: true,
                backgroundColor: primaryColor,
                actions: [
                  // Share button
                  IconButton(
                    icon: const Icon(Icons.share),
                    onPressed: _shareReport,
                    tooltip: 'Share',
                  ),
                  
                  // Delete button
                  IconButton(
                    icon: const Icon(Icons.delete_outline),
                    onPressed: _isDeleting ? null : _deleteReport,
                    tooltip: 'Delete',
                  ),
                ],
                flexibleSpace: FlexibleSpaceBar(
                  background: Stack(
                    fit: StackFit.expand,
                    children: [
                      // Image
                      report.imageUrl != null
                        ? CachedNetworkImage(
                            imageUrl: report.imageUrl!,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => Container(
                              color: Colors.grey.shade200,
                              child: const Center(
                                child: CircularProgressIndicator(),
                              ),
                            ),
                            errorWidget: (ctx, url, error) => Container(
                              color: Colors.grey.shade200,
                              child: Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(
                                      Icons.broken_image,
                                      color: Colors.grey,
                                      size: 40,
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      'Image not available',
                                      style: TextStyle(color: Colors.grey.shade700),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          )
                        : Container(
                            color: Colors.grey.shade200,
                            child: Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(
                                    Icons.image_not_supported,
                                    color: Colors.grey,
                                    size: 40,
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'No image available',
                                    style: TextStyle(color: Colors.grey.shade700),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      
                      // Gradient overlay for better text visibility
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.black.withOpacity(0.6),
                              Colors.transparent,
                              Colors.black.withOpacity(0.6),
                            ],
                            stops: const [0.0, 0.5, 1.0],
                          ),
                        ),
                      ),
                      
                      // Status badge
                      Positioned(
                        top: 16,
                        right: 16,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: statusColor.withOpacity(0.9),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                statusIcon,
                                size: 14,
                                color: Colors.white,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                statusText,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      
                      // Date on bottom
                      Positioned(
                        bottom: 16,
                        left: 16,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.7),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.calendar_today,
                                size: 14,
                                color: Colors.white,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                formattedDate,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w500,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              
              // Main content
              SliverToBoxAdapter(
                child: Container(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Description section
                      FadeInUp(
                        duration: const Duration(milliseconds: 400),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Description',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey[800],
                              ),
                            ),
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.grey[300]!),
                              ),
                              child: Text(
                                report.description,
                                style: TextStyle(
                                  fontSize: 16,
                                  color: Colors.grey[800],
                                  height: 1.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      
                      const SizedBox(height: 24),
                      
                      // Full description (analysis) if available
                      if (report.fullDescription != null && report.fullDescription!.isNotEmpty)
                        FadeInUp(
                          duration: const Duration(milliseconds: 500),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Analysis Results',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.grey[800],
                                ),
                              ),
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: Colors.blue[50],
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.blue[200]!),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Icon(Icons.analytics, color: Colors.blue[700], size: 18),
                                        const SizedBox(width: 8),
                                        Text(
                                          'AI-Powered Analysis',
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            color: Colors.blue[700],
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      report.fullDescription!,
                                      style: TextStyle(
                                        fontSize: 14,
                                        color: Colors.blue[900],
                                        height: 1.5,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      
                      if (report.fullDescription != null && report.fullDescription!.isNotEmpty)
                        const SizedBox(height: 24),
                      
                      // Location section
                      FadeInUp(
                        duration: const Duration(milliseconds: 600),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Location',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey[800],
                              ),
                            ),
                            const SizedBox(height: 12),
                            Container(
                              height: 200,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.grey[300]!),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: FlutterMap(
                                  mapController: _mapController,
                                  options: MapOptions(
                                    initialCenter: LatLng(report.latitude, report.longitude),
                                    initialZoom: 15.0,
                                  ),
                                  children: [
                                    TileLayer(
                                      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                                      userAgentPackageName: 'com.example.eco_lafaek',
                                    ),
                                    MarkerLayer(
                                      markers: [
                                        Marker(
                                          width: 40.0,
                                          height: 40.0,
                                          point: LatLng(report.latitude, report.longitude),
                                          child: const Icon(
                                            Icons.location_pin,
                                            color: Colors.red,
                                            size: 40,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            if (report.locationName != null)
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(
                                    Icons.location_on,
                                    color: primaryColor,
                                    size: 18,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      report.locationName!,
                                      style: TextStyle(
                                        fontSize: 14,
                                        color: Colors.grey[800],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                          ],
                        ),
                      ),
                      
                      const SizedBox(height: 24),
                      
                      // Technical Info section
                      FadeInUp(
                        duration: const Duration(milliseconds: 700),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.grey[100],
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey[300]!),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Technical Information',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.grey[800],
                                ),
                              ),
                              const SizedBox(height: 12),
                              const Divider(),
                              const SizedBox(height: 12),
                              _buildInfoRow('Report ID', '#${report.id}'),
                              _buildInfoRow('Status', statusText),
                              _buildInfoRow('Submission Date', formattedDate),
                              if (report.wasteType != null)
                                _buildInfoRow('Waste Type', report.wasteType!),
                              if (report.priorityLevel != null)
                                _buildInfoRow('Priority', report.priorityLevel!),
                              if (report.severityScore != null)
                                _buildInfoRow('Severity Score', '${report.severityScore}/10'),
                              _buildInfoRow('Coordinates', '${report.latitude.toStringAsFixed(6)}, ${report.longitude.toStringAsFixed(6)}'),
                            ],
                          ),
                        ),
                      ),
                      
                      const SizedBox(height: 48),
                    ],
                  ),
                ),
              ),
            ],
          ),
          
          // Loading overlay when deleting
          if (_isDeleting)
            Container(
              color: Colors.black.withOpacity(0.4),
              child: const Center(
                child: LoadingIndicator(
                  message: 'Deleting report...',
                  color: Colors.white,
                ),
              ),
            ),
        ],
      ),
    );
  }
  
  // Helper for technical info rows
  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Colors.grey[700],
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[900],
              ),
            ),
          ),
        ],
      ),
    );
  }
}