import 'package:flutter/material.dart';
import 'dart:math' as math;

class LoadingIndicator extends StatefulWidget {
  final String? message;
  final double size;
  final Color? color;
  final bool showShimmer;
  final bool useEcoTheme;
  
  const LoadingIndicator({
    Key? key,
    this.message,
    this.size = 48.0,
    this.color,
    this.showShimmer = true,
    this.useEcoTheme = true,
  }) : super(key: key);

  @override
  State<LoadingIndicator> createState() => _LoadingIndicatorState();
}

class _LoadingIndicatorState extends State<LoadingIndicator> with TickerProviderStateMixin {
  late AnimationController _animationController;
  late AnimationController _pulseController;
  late AnimationController _leafController;
  late Animation<double> _pulseAnimation;
  late Animation<double> _leafAnimation;
  
  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();
    
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    
    _leafController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);
    
    _pulseAnimation = Tween<double>(begin: 0.8, end: 1.2).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    
    _leafAnimation = Tween<double>(begin: -0.15, end: 0.15).animate(
      CurvedAnimation(parent: _leafController, curve: Curves.easeInOut),
    );
  }
  
  @override
  void dispose() {
    _animationController.dispose();
    _pulseController.dispose();
    _leafController.dispose();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final indicatorColor = widget.color ?? const Color(0xFF4CAF50);
    
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          // EcoLafaek themed loading indicator
          if (widget.useEcoTheme)
            AnimatedBuilder(
              animation: Listenable.merge([
                _animationController,
                _pulseAnimation,
                _leafAnimation,
              ]),
              builder: (context, child) {
                return Transform.scale(
                  scale: _pulseAnimation.value,
                  child: SizedBox(
                    width: widget.size,
                    height: widget.size,
                    child: CustomPaint(
                      painter: CompactEcoCrocodilePainter(
                        rotationValue: _animationController.value * 2 * math.pi,
                        leafRotation: _leafAnimation.value,
                      ),
                    ),
                  ),
                );
              },
            )
          else
            // Fallback to original design
            AnimatedBuilder(
              animation: _animationController,
              builder: (context, child) {
                final secondaryColor = indicatorColor.withOpacity(0.3);
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
                        angle: _animationController.value,
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

// Compact version of EcoLafaek crocodile for smaller loading indicators
class CompactEcoCrocodilePainter extends CustomPainter {
  final double rotationValue;
  final double leafRotation;
  
  CompactEcoCrocodilePainter({
    this.rotationValue = 0,
    this.leafRotation = 0,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width * 0.4;
    
    // Background circle with eco gradient
    final backgroundPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          const Color(0xFFE8F5E8),
          const Color(0xFFB2DFDB),
        ],
      ).createShader(Rect.fromCircle(center: center, radius: radius));
    
    canvas.drawCircle(center, radius, backgroundPaint);
    
    // Rotating loading ring
    if (rotationValue > 0) {
      final ringPaint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..strokeCap = StrokeCap.round
        ..shader = SweepGradient(
          colors: [
            Colors.transparent,
            const Color(0xFF4CAF50),
            const Color(0xFF8BC34A),
            Colors.transparent,
          ],
          stops: [0.0, 0.3, 0.7, 1.0],
          transform: GradientRotation(rotationValue),
        ).createShader(Rect.fromCircle(center: center, radius: radius + 3));
      
      canvas.drawCircle(center, radius + 3, ringPaint);
    }
    
    // Compact crocodile
    canvas.save();
    canvas.translate(center.dx, center.dy);
    
    // Simplified crocodile body
    final bodyPaint = Paint()
      ..color = const Color(0xFF4CAF50);
    
    // Main body (smaller ellipse)
    canvas.drawOval(
      Rect.fromCenter(center: Offset.zero, width: size.width * 0.3, height: size.width * 0.2),
      bodyPaint,
    );
    
    // Head
    canvas.drawOval(
      Rect.fromCenter(center: Offset(-size.width * 0.08, -size.width * 0.05), 
                     width: size.width * 0.18, height: size.width * 0.12),
      bodyPaint,
    );
    
    // Eye
    final eyePaint = Paint()..color = const Color(0xFF2E7D32);
    canvas.drawCircle(Offset(-size.width * 0.1, -size.width * 0.08), size.width * 0.02, eyePaint);
    
    // Mini animated leaf
    canvas.save();
    canvas.translate(size.width * 0.12, size.width * 0.02);
    canvas.rotate(leafRotation);
    canvas.scale(0.6); // Smaller leaf for compact version
    
    final leafPaint = Paint()
      ..color = const Color(0xFF8BC34A);
    
    // Simple leaf shape
    final leafPath = Path()
      ..moveTo(0, -size.width * 0.06)
      ..quadraticBezierTo(size.width * 0.03, -size.width * 0.03, size.width * 0.04, 0)
      ..quadraticBezierTo(size.width * 0.03, size.width * 0.03, 0, size.width * 0.06)
      ..quadraticBezierTo(-size.width * 0.03, size.width * 0.03, -size.width * 0.04, 0)
      ..quadraticBezierTo(-size.width * 0.03, -size.width * 0.03, 0, -size.width * 0.06);
    
    canvas.drawPath(leafPath, leafPaint);
    
    canvas.restore();
    canvas.restore();
  }

  @override
  bool shouldRepaint(CompactEcoCrocodilePainter oldDelegate) =>
      rotationValue != oldDelegate.rotationValue ||
      leafRotation != oldDelegate.leafRotation;
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