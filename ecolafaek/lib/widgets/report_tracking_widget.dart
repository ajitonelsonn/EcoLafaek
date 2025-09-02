import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:animate_do/animate_do.dart';
import 'dart:math' as math;

import '../providers/report_provider.dart';
import '../models/report.dart';

class ReportTrackingWidget extends StatelessWidget {
  const ReportTrackingWidget({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reportProvider = Provider.of<ReportProvider>(context);
    
    final totalReports = reportProvider.totalReportsCount;
    final submittedCount = reportProvider.countReportsByStatus('submitted');
    final analyzingCount = reportProvider.countReportsByStatus('analyzing');
    final analyzedCount = reportProvider.countReportsByStatus('analyzed');
    
    // Calculate progress percentage
    final double progressPercentage = totalReports > 0 ? (analyzedCount / totalReports) * 100 : 0;
    
    return FadeInUp(
      duration: const Duration(milliseconds: 800),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.white,
              theme.primaryColor.withOpacity(0.03),
            ],
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: theme.primaryColor.withOpacity(0.08),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with impact indicator
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: theme.primaryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.eco,
                      color: theme.primaryColor,
                      size: 24,
                    ),
                  ),
                  
                  const SizedBox(width: 12),
                  
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Environmental Impact',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[800],
                          ),
                        ),
                        Text(
                          'Making Timor-Leste cleaner',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  // Total reports badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: theme.primaryColor,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '$totalReports Reports',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 20),
              
              // Ultra modern progress visualization
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      theme.primaryColor.withOpacity(0.05),
                      Colors.white,
                      theme.primaryColor.withOpacity(0.02),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: theme.primaryColor.withOpacity(0.1),
                    width: 1,
                  ),
                ),
                child: Column(
                  children: [
                    // Progress header with total count
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Progress Overview',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Colors.grey[800],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [theme.primaryColor, theme.primaryColor.withOpacity(0.8)],
                            ),
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: theme.primaryColor.withOpacity(0.3),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.assessment,
                                size: 16,
                                color: Colors.white,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Total: $totalReports',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    
                    const SizedBox(height: 20),
                    
                    // Enhanced progress bar with segments
                    Container(
                      height: 12,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(6),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: Row(
                          children: [
                            // Submitted section with animation
                            if (submittedCount > 0)
                              Expanded(
                                flex: submittedCount,
                                child: TweenAnimationBuilder<double>(
                                  tween: Tween<double>(begin: 0, end: 1),
                                  duration: Duration(milliseconds: 800 + (submittedCount * 100)),
                                  curve: Curves.easeOutCubic,
                                  builder: (context, value, child) {
                                    return Container(
                                      height: 12,
                                      decoration: BoxDecoration(
                                        gradient: LinearGradient(
                                          colors: [
                                            theme.primaryColor.withOpacity(value),
                                            theme.primaryColor.withOpacity(value * 0.8),
                                          ],
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                            // Analyzing section with animation
                            if (analyzingCount > 0)
                              Expanded(
                                flex: analyzingCount,
                                child: TweenAnimationBuilder<double>(
                                  tween: Tween<double>(begin: 0, end: 1),
                                  duration: Duration(milliseconds: 1000 + (analyzingCount * 100)),
                                  curve: Curves.easeOutCubic,
                                  builder: (context, value, child) {
                                    return Container(
                                      height: 12,
                                      decoration: BoxDecoration(
                                        gradient: LinearGradient(
                                          colors: [
                                            Colors.orange.withOpacity(value),
                                            Colors.orange.withOpacity(value * 0.8),
                                          ],
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                            // Analyzed section with animation
                            if (analyzedCount > 0)
                              Expanded(
                                flex: analyzedCount,
                                child: TweenAnimationBuilder<double>(
                                  tween: Tween<double>(begin: 0, end: 1),
                                  duration: Duration(milliseconds: 1200 + (analyzedCount * 100)),
                                  curve: Curves.easeOutCubic,
                                  builder: (context, value, child) {
                                    return Container(
                                      height: 12,
                                      decoration: BoxDecoration(
                                        gradient: LinearGradient(
                                          colors: [
                                            Colors.green.withOpacity(value),
                                            Colors.green.withOpacity(value * 0.8),
                                          ],
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                    
                    const SizedBox(height: 20),
                    
                    // Modern status indicators with glassmorphism effect
                    Row(
                      children: [
                        Expanded(
                          child: _buildGlassmorphicStatusCard(
                            context,
                            'Submitted',
                            submittedCount,
                            theme.primaryColor,
                            Icons.cloud_upload_rounded,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildGlassmorphicStatusCard(
                            context,
                            'Analyzing',
                            analyzingCount,
                            Colors.orange,
                            Icons.psychology_rounded,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildGlassmorphicStatusCard(
                            context,
                            'Completed',
                            analyzedCount,
                            Colors.green,
                            Icons.task_alt_rounded,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildGlassmorphicStatusCard(
    BuildContext context,
    String label,
    int count,
    Color color,
    IconData icon,
  ) {
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: 1),
      duration: const Duration(milliseconds: 1000),
      curve: Curves.easeOutBack,
      builder: (context, value, child) {
        return Transform.scale(
          scale: 0.8 + (0.2 * value),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  color.withOpacity(0.1 * value),
                  Colors.white.withOpacity(0.9 * value),
                  color.withOpacity(0.05 * value),
                ],
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: color.withOpacity(0.3 * value),
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: color.withOpacity(0.15 * value),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
                BoxShadow(
                  color: Colors.white.withOpacity(0.8 * value),
                  blurRadius: 8,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: Column(
              children: [
                // Floating icon with pulse effect
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [
                        color.withOpacity(0.2 * value),
                        color.withOpacity(0.1 * value),
                        Colors.transparent,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(25),
                  ),
                  child: Container(
                    margin: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          color.withOpacity(0.8 * value),
                          color.withOpacity(0.6 * value),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(17),
                      boxShadow: [
                        BoxShadow(
                          color: color.withOpacity(0.3 * value),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Icon(
                      icon,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ),
                
                const SizedBox(height: 8),
                
                // Animated count
                TweenAnimationBuilder<int>(
                  tween: IntTween(begin: 0, end: count),
                  duration: const Duration(milliseconds: 1500),
                  curve: Curves.easeOutCubic,
                  builder: (context, animatedCount, child) {
                    return Text(
                      animatedCount.toString(),
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 22,
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
                
                // Label with better typography
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.grey.shade700,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}