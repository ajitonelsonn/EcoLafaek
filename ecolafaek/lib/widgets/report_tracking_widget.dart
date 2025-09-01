import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

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
    
    // Calculate step values for the progress indicator
    final double step1Value = totalReports > 0 ? submittedCount / totalReports : 0;
    final double step2Value = totalReports > 0 ? (submittedCount + analyzingCount) / totalReports : 0;
    final double step3Value = totalReports > 0 ? (submittedCount + analyzingCount + analyzedCount) / totalReports : 0;
    
    return Container(
      // Constrain width to prevent overflow
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'Report Tracking',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              
              // Use Expanded to prevent overflow
              Expanded(
                child: SizedBox(), // Empty spacer
              ),
              
              // Keep the Total text within bounds
              Text(
                'Total: $totalReports',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Monitor your waste reports progress',
            style: TextStyle(
              color: Colors.grey.shade600,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 16),
          
          // Progress bar with steps - ensure it respects width constraints
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              height: 24,
              child: Stack(
                children: [
                  // Background
                  Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                    
                    // Submitted step
                    if (step1Value > 0)
                      FractionallySizedBox(
                        widthFactor: step1Value,
                        child: Container(
                          decoration: BoxDecoration(
                            color: theme.primaryColor,
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    
                    // Analyzing step
                    if (step2Value > step1Value)
                      FractionallySizedBox(
                        widthFactor: step2Value,
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.orange,
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    
                    // Analyzed step
                    if (step3Value > step2Value)
                      FractionallySizedBox(
                        widthFactor: step3Value,
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.green,
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    
                    // Step markers
                    if (totalReports > 0)
                      Positioned.fill(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            // Padding for better visual
                            const SizedBox(width: 1),
                            
                            // Step 1 marker (submitted)
                            if (step1Value > 0)
                              Container(
                                width: 20,
                                height: 20,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: theme.primaryColor,
                                    width: 3,
                                  ),
                                ),
                                child: Center(
                                  child: Text(
                                    '1',
                                    style: TextStyle(
                                      color: theme.primaryColor,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                            
                            // Step 2 marker (analyzing)
                            if (step2Value > step1Value)
                              Container(
                                width: 20,
                                height: 20,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: Colors.orange,
                                    width: 3,
                                  ),
                                ),
                                child: const Center(
                                  child: Text(
                                    '2',
                                    style: TextStyle(
                                      color: Colors.orange,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                            
                            // Step 3 marker (analyzed)
                            if (step3Value > step2Value)
                              Container(
                                width: 20,
                                height: 20,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: Colors.green,
                                    width: 3,
                                  ),
                                ),
                                child: const Center(
                                  child: Text(
                                    '3',
                                    style: TextStyle(
                                      color: Colors.green,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                            
                            // Padding for better visual
                            const SizedBox(width: 1),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
            
          const SizedBox(height: 16),
          Row(
            // Use MainAxisAlignment.spaceEvenly to prevent overflow
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildStatusItem(
                context,
                'Submitted',
                submittedCount.toString(),
                theme.primaryColor,
              ),
              _buildStatusItem(
                context,
                'Analyzing',
                analyzingCount.toString(),
                Colors.orange,
              ),
              _buildStatusItem(
                context,
                'Analyzed',
                analyzedCount.toString(),
                Colors.green,
              ),
            ],
          ),
        ],
      ),
    );
  }
  
  Widget _buildStatusItem(BuildContext context, String label, String count, Color color) {
    return Column(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey.shade800,
          ),
        ),
        Text(
          count,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
      ],
    );
  }
}