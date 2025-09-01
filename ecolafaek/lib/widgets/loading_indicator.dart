import 'package:flutter/material.dart';
import 'dart:math' as math;

class LoadingIndicator extends StatefulWidget {
  final String? message;
  final double size;
  final Color? color;
  final bool showShimmer;
  
  const LoadingIndicator({
    Key? key,
    this.message,
    this.size = 48.0,
    this.color,
    this.showShimmer = true,
  }) : super(key: key);

  @override
  State<LoadingIndicator> createState() => _LoadingIndicatorState();
}

class _LoadingIndicatorState extends State<LoadingIndicator> with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  
  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
  }
  
  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final indicatorColor = widget.color ?? theme.colorScheme.primary;
    final secondaryColor = indicatorColor.withOpacity(0.3);
    
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Animated loading indicator
          AnimatedBuilder(
            animation: _animationController,
            builder: (context, child) {
              return SizedBox(
                width: widget.size,
                height: widget.size,
                child: Stack(
                  children: [
                    // Background circle
                    Center(
                      child: Container(
                        width: widget.size - 6,
                        height: widget.size - 6,
                        decoration: BoxDecoration(
                          color: theme.scaffoldBackgroundColor,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: indicatorColor.withOpacity(0.1),
                              blurRadius: 10,
                              spreadRadius: 1,
                            ),
                          ],
                        ),
                      ),
                    ),
                    // Rotating gradient arc
                    Transform.rotate(
                      angle: _animationController.value * 2 * math.pi,
                      child: CustomPaint(
                        size: Size(widget.size, widget.size),
                        painter: GradientArcPainter(
                          startColor: secondaryColor,
                          endColor: indicatorColor,
                          width: 4.0,
                        ),
                      ),
                    ),
                    // Center dot
                    Center(
                      child: Container(
                        width: widget.size * 0.2,
                        height: widget.size * 0.2,
                        decoration: BoxDecoration(
                          color: indicatorColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }
          ),
          
          // Loading message with shimmer effect
          if (widget.message != null) ...[
            const SizedBox(height: 24),
            widget.showShimmer ? 
              ShimmerText(
                text: widget.message!,
                baseColor: theme.textTheme.bodyMedium?.color?.withOpacity(0.7) ?? Colors.grey,
                highlightColor: theme.textTheme.bodyMedium?.color ?? Colors.black,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                  letterSpacing: 0.3,
                ),
              )
            : Text(
                widget.message!,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                  letterSpacing: 0.3,
                ),
                textAlign: TextAlign.center,
              ),
          ],
        ],
      ),
    );
  }
}

// Custom painter for gradient arc
class GradientArcPainter extends CustomPainter {
  final Color startColor;
  final Color endColor;
  final double width;
  
  GradientArcPainter({
    required this.startColor,
    required this.endColor,
    this.width = 4.0,
  });
  
  @override
  void paint(Canvas canvas, Size size) {
    final rect = Rect.fromCircle(
      center: Offset(size.width / 2, size.height / 2),
      radius: size.width / 2,
    );
    
    const startAngle = -math.pi / 2;
    const sweepAngle = 1.5 * math.pi; // 270 degrees
    
    final gradient = SweepGradient(
      startAngle: startAngle,
      endAngle: startAngle + sweepAngle,
      colors: [startColor, endColor],
      stops: const [0.0, 1.0],
    );
    
    final paint = Paint()
      ..shader = gradient.createShader(rect)
      ..style = PaintingStyle.stroke
      ..strokeWidth = width
      ..strokeCap = StrokeCap.round;
    
    canvas.drawArc(rect, startAngle, sweepAngle, false, paint);
  }
  
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

// Shimmer effect for text
class ShimmerText extends StatefulWidget {
  final String text;
  final Color baseColor;
  final Color highlightColor;
  final TextStyle? style;

  const ShimmerText({
    Key? key,
    required this.text,
    required this.baseColor,
    required this.highlightColor,
    this.style,
  }) : super(key: key);

  @override
  State<ShimmerText> createState() => _ShimmerTextState();
}

class _ShimmerTextState extends State<ShimmerText> with SingleTickerProviderStateMixin {
  late AnimationController _shimmerController;
  late Animation<double> _shimmerAnimation;

  @override
  void initState() {
    super.initState();
    _shimmerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
    
    _shimmerAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _shimmerController, 
        curve: Curves.easeInOut,
      ),
    );
  }

  @override
  void dispose() {
    _shimmerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _shimmerAnimation,
      builder: (context, child) {
        return ShaderMask(
          blendMode: BlendMode.srcIn,
          shaderCallback: (bounds) {
            return LinearGradient(
              colors: [
                widget.baseColor,
                widget.highlightColor,
                widget.baseColor,
              ],
              stops: [
                0.0,
                _shimmerAnimation.value,
                1.0,
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ).createShader(bounds);
          },
          child: Text(
            widget.text,
            style: widget.style,
            textAlign: TextAlign.center,
          ),
        );
      },
    );
  }
}