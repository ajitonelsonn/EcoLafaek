import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

class LoadingWidget extends StatelessWidget {
  final String message;
  final bool showLottie;

  const LoadingWidget({
    super.key,
    this.message = 'Loading...',
    this.showLottie = true,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (showLottie)
            SizedBox(
              width: 120,
              height: 120,
              child: Lottie.asset(
                'assets/animations/loading.json',
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) {
                  return const CircularProgressIndicator();
                },
              ),
            )
          else
            const CircularProgressIndicator(),
          
          const SizedBox(height: 24),
          
          Text(
            message,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }
}

class LoadingOverlay extends StatelessWidget {
  final Widget child;
  final bool isLoading;
  final String message;

  const LoadingOverlay({
    super.key,
    required this.child,
    required this.isLoading,
    this.message = 'Loading...',
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child,
        if (isLoading)
          Container(
            color: Colors.black.withOpacity(0.3),
            child: LoadingWidget(message: message),
          ),
      ],
    );
  }
}