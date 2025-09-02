import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

class EmptyStateWidget extends StatelessWidget {
  final IconData? icon;
  final String title;
  final String message;
  final String? actionText;
  final VoidCallback? onAction;
  final String? lottieAsset;
  final Color? iconColor;

  const EmptyStateWidget({
    super.key,
    this.icon,
    required this.title,
    required this.message,
    this.actionText,
    this.onAction,
    this.lottieAsset,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Animation or Icon
            if (lottieAsset != null)
              SizedBox(
                width: 150,
                height: 150,
                child: Lottie.asset(
                  lottieAsset!,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) {
                    return Icon(
                      icon ?? Icons.inbox,
                      size: 80,
                      color: iconColor ?? Colors.grey[400],
                    );
                  },
                ),
              )
            else if (icon != null)
              Icon(
                icon,
                size: 80,
                color: iconColor ?? Colors.grey[400],
              ),

            const SizedBox(height: 24),

            // Title
            Text(
              title,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: Colors.grey[700],
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 12),

            // Message
            Text(
              message,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: Colors.grey[600],
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),

            // Action button
            if (actionText != null && onAction != null) ...[
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: onAction,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: Text(actionText!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// Specialized empty states
class NoReportsEmptyState extends StatelessWidget {
  final VoidCallback? onCreateReport;

  const NoReportsEmptyState({
    super.key,
    this.onCreateReport,
  });

  @override
  Widget build(BuildContext context) {
    return EmptyStateWidget(
      icon: Icons.report_off,
      title: 'No Reports Yet',
      message: 'Start making a difference by reporting waste in your community.',
      actionText: onCreateReport != null ? 'Create Report' : null,
      onAction: onCreateReport,
    );
  }
}

class NoSearchResultsEmptyState extends StatelessWidget {
  final String query;
  final VoidCallback? onClearSearch;

  const NoSearchResultsEmptyState({
    super.key,
    required this.query,
    this.onClearSearch,
  });

  @override
  Widget build(BuildContext context) {
    return EmptyStateWidget(
      icon: Icons.search_off,
      title: 'No Results Found',
      message: 'No reports match your search for "$query".\nTry different keywords or filters.',
      actionText: onClearSearch != null ? 'Clear Search' : null,
      onAction: onClearSearch,
    );
  }
}

class OfflineEmptyState extends StatelessWidget {
  final VoidCallback? onRetry;

  const OfflineEmptyState({
    super.key,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return EmptyStateWidget(
      icon: Icons.wifi_off,
      title: 'You\'re Offline',
      message: 'Please check your internet connection and try again.',
      actionText: onRetry != null ? 'Retry' : null,
      onAction: onRetry,
      iconColor: Colors.orange,
    );
  }
}