import 'package:flutter/material.dart';
import 'dart:math';

class LoadingWidget extends StatefulWidget {
  final String message;
  final bool showAnimation;
  final double size;

  const LoadingWidget({
    super.key,
    this.message = 'Loading...',
    this.showAnimation = true,
    this.size = 120,
  });

  @override
  State<LoadingWidget> createState() => _LoadingWidgetState();
}

class _LoadingWidgetState extends State<LoadingWidget>
    with TickerProviderStateMixin {
  late AnimationController _rotationController;
  late AnimationController _scaleController;
  late AnimationController _leafController;
  late Animation<double> _rotationAnimation;
  late Animation<double> _scaleAnimation;
  late Animation<double> _leafAnimation;

  @override
  void initState() {
    super.initState();
    
    // Main rotation animation
    _rotationController = AnimationController(
      duration: const Duration(seconds: 3),
      vsync: this,
    );
    
    // Scale/breathing animation
    _scaleController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    
    // Leaf flutter animation
    _leafController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );
    
    _rotationAnimation = Tween<double>(
      begin: 0,
      end: 2 * pi,
    ).animate(CurvedAnimation(
      parent: _rotationController,
      curve: Curves.linear,
    ));
    
    _scaleAnimation = Tween<double>(
      begin: 0.95,
      end: 1.05,
    ).animate(CurvedAnimation(
      parent: _scaleController,
      curve: Curves.easeInOut,
    ));
    
    _leafAnimation = Tween<double>(
      begin: -0.1,
      end: 0.1,
    ).animate(CurvedAnimation(
      parent: _leafController,
      curve: Curves.easeInOut,
    ));
    
    if (widget.showAnimation) {
      _rotationController.repeat();
      _scaleController.repeat(reverse: true);
      _leafController.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _rotationController.dispose();
    _scaleController.dispose();
    _leafController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Animated EcoLafaek Logo
          if (widget.showAnimation)
            AnimatedBuilder(
              animation: Listenable.merge([
                _rotationAnimation,
                _scaleAnimation,
                _leafAnimation,
              ]),
              builder: (context, child) {
                return Transform.scale(
                  scale: _scaleAnimation.value,
                  child: SizedBox(
                    width: widget.size,
                    height: widget.size,
                    child: CustomPaint(
                      painter: EcoCrocodilePainter(
                        rotationValue: _rotationAnimation.value,
                        leafRotation: _leafAnimation.value,
                      ),
                    ),
                  ),
                );
              },
            )
          else
            // Fallback static version
            SizedBox(
              width: widget.size,
              height: widget.size,
              child: CustomPaint(
                painter: EcoCrocodilePainter(),
              ),
            ),
          
          const SizedBox(height: 24),
          
          // Loading dots animation
          if (widget.showAnimation)
            _buildLoadingDots()
          else
            const SizedBox(height: 8),
          
          const SizedBox(height: 16),
          
          Text(
            widget.message,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: const Color(0xFF4CAF50),
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildLoadingDots() {
    return AnimatedBuilder(
      animation: _rotationController,
      builder: (context, child) {
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(3, (index) {
            final delay = index * 0.3;
            final progress = (_rotationController.value + delay) % 1.0;
            final scale = 0.5 + 0.5 * sin(progress * 2 * pi);
            
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 3),
              child: Transform.scale(
                scale: scale,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [
                        const Color(0xFF4CAF50),
                        const Color(0xFF8BC34A),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}

class EcoCrocodilePainter extends CustomPainter {
  final double rotationValue;
  final double leafRotation;
  
  EcoCrocodilePainter({
    this.rotationValue = 0,
    this.leafRotation = 0,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width * 0.4;
    
    // Background circle with gradient
    final backgroundPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          const Color(0xFFB2DFDB),
          const Color(0xFF80CBC4),
        ],
      ).createShader(Rect.fromCircle(center: center, radius: radius));
    
    canvas.drawCircle(center, radius, backgroundPaint);
    
    // Rotating loading ring
    if (rotationValue > 0) {
      final ringPaint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
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
        ).createShader(Rect.fromCircle(center: center, radius: radius + 8));
      
      canvas.drawCircle(center, radius + 8, ringPaint);
    }
    
    // Save canvas state for crocodile
    canvas.save();
    canvas.translate(center.dx, center.dy);
    
    // Crocodile body (main green shape)
    final bodyPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          const Color(0xFF66BB6A),
          const Color(0xFF4CAF50),
        ],
      ).createShader(Rect.fromCenter(center: Offset.zero, width: 60, height: 40));
    
    // Crocodile head (ellipse)
    canvas.drawOval(
      Rect.fromCenter(center: const Offset(-5, -10), width: 50, height: 35),
      bodyPaint,
    );
    
    // Crocodile body
    canvas.drawOval(
      Rect.fromCenter(center: const Offset(5, 15), width: 40, height: 30),
      bodyPaint,
    );
    
    // Crocodile snout
    final snoutPaint = Paint()
      ..color = const Color(0xFF8BC34A);
    
    canvas.drawOval(
      Rect.fromCenter(center: const Offset(-20, -10), width: 25, height: 18),
      snoutPaint,
    );
    
    // Eye
    final eyePaint = Paint()
      ..color = const Color(0xFF2E7D32);
    
    canvas.drawCircle(const Offset(-8, -18), 4, eyePaint);
    
    // Eye highlight
    final eyeHighlightPaint = Paint()
      ..color = Colors.white;
    
    canvas.drawCircle(const Offset(-6, -20), 1.5, eyeHighlightPaint);
    
    // Belly (lighter green)
    final bellyPaint = Paint()
      ..color = const Color(0xFFC8E6C9);
    
    canvas.drawOval(
      Rect.fromCenter(center: const Offset(5, 15), width: 25, height: 20),
      bellyPaint,
    );
    
    // Animated leaf in crocodile's "hand"
    canvas.save();
    canvas.translate(25, 5);
    canvas.rotate(leafRotation);
    
    final leafPaint = Paint()
      ..shader = LinearGradient(
        colors: [
          const Color(0xFF8BC34A),
          const Color(0xFF4CAF50),
          const Color(0xFF2E7D32),
        ],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ).createShader(Rect.fromCenter(center: Offset.zero, width: 20, height: 25));
    
    // Leaf shape
    final leafPath = Path()
      ..moveTo(0, -12)
      ..quadraticBezierTo(8, -8, 10, 0)
      ..quadraticBezierTo(8, 8, 0, 12)
      ..quadraticBezierTo(-8, 8, -10, 0)
      ..quadraticBezierTo(-8, -8, 0, -12);
    
    canvas.drawPath(leafPath, leafPaint);
    
    // Leaf stem
    final stemPaint = Paint()
      ..color = const Color(0xFF2E7D32)
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;
    
    canvas.drawLine(const Offset(0, 12), const Offset(0, 18), stemPaint);
    
    // Leaf veins
    final veinPaint = Paint()
      ..color = const Color(0xFF2E7D32).withOpacity(0.6)
      ..strokeWidth = 1;
    
    canvas.drawLine(const Offset(0, -8), const Offset(0, 8), veinPaint);
    canvas.drawLine(const Offset(-4, -2), const Offset(4, -2), veinPaint);
    canvas.drawLine(const Offset(-3, 3), const Offset(3, 3), veinPaint);
    
    canvas.restore();
    canvas.restore();
  }

  @override
  bool shouldRepaint(EcoCrocodilePainter oldDelegate) =>
      rotationValue != oldDelegate.rotationValue ||
      leafRotation != oldDelegate.leafRotation;
}

class LoadingOverlay extends StatelessWidget {
  final Widget child;
  final bool isLoading;
  final String message;
  final double size;

  const LoadingOverlay({
    super.key,
    required this.child,
    required this.isLoading,
    this.message = 'Loading...',
    this.size = 100,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child,
        if (isLoading)
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.white.withOpacity(0.9),
                  Colors.white.withOpacity(0.95),
                ],
              ),
            ),
            child: LoadingWidget(
              message: message,
              size: size,
            ),
          ),
      ],
    );
  }
}