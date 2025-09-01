import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:animate_do/animate_do.dart';
import 'package:flutter/services.dart';
import 'package:lottie/lottie.dart';

import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../utils/error_handler.dart';
import 'home_screen.dart';

class OtpVerificationScreen extends StatefulWidget {
  static const routeName = '/otp-verification';
  
  final String email;
  final String username;
  final bool isRegistration; // Flag to determine if this is for registration or regular verification

  const OtpVerificationScreen({
    Key? key,
    required this.email,
    required this.username,
    this.isRegistration = true, // Default to registration flow
  }) : super(key: key);

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  late List<TextEditingController> _controllers;
  late List<FocusNode> _focusNodes;
  bool _isVerifying = false;
  bool _isResending = false;
  String? _errorMessage;
  int _resendCount = 0;
  int _remainingSeconds = 60;
  Timer? _resendTimer;
  int _attemptsLeft = 3;
  final ApiService _apiService = ApiService();
  
  late AnimationController _animationController;
  bool _isVerified = false;

  @override
  void initState() {
    super.initState();
    
    // Initialize animation controller
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    
    // Initialize controllers and focus nodes for each digit
    _controllers = List.generate(6, (_) => TextEditingController());
    _focusNodes = List.generate(6, (_) => FocusNode());
    
    // Start the resend timer
    _startResendTimer();
  }

  @override
  void dispose() {
    // Clean up controllers and focus nodes
    for (var controller in _controllers) {
      controller.dispose();
    }
    for (var node in _focusNodes) {
      node.dispose();
    }
    
    // Cancel timer
    _resendTimer?.cancel();
    
    // Dispose animation controller
    _animationController.dispose();
    
    super.dispose();
  }
  
  // Start the timer for resend cooldown
  void _startResendTimer() {
    _remainingSeconds = 60;
    _resendTimer?.cancel();
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        if (_remainingSeconds > 0) {
          _remainingSeconds--;
        } else {
          timer.cancel();
        }
      });
    });
  }

  // Get the entered OTP
  String _getEnteredOTP() {
    return _controllers.map((controller) => controller.text).join();
  }

  // Verify OTP
  Future<void> _verifyOTP() async {
    if (_isVerifying) return;
  
    final enteredOTP = _getEnteredOTP();
  
    if (enteredOTP.length != 6) {
      setState(() {
        _errorMessage = 'Please enter all 6 digits';
      });
      return;
    }
  
    setState(() {
      _isVerifying = true;
      _errorMessage = null;
    });
  
    try {
      // Use the appropriate verification endpoint based on isRegistration flag
      Map<String, dynamic> response;
      
      if (widget.isRegistration) {
        // Registration verification
        response = await _apiService.verifyRegistration(
          email: widget.email,
          otp: enteredOTP,
        );
      } else {
        // Regular account verification
        response = await _apiService.verifyOtp(
          email: widget.email,
          otp: enteredOTP,
        );
      }
      
      if (response['success']) {
        // Save the token and user data
        final authProvider = Provider.of<AuthProvider>(context, listen: false);
        
        // Save auth data from response
        await authProvider.saveAuthDataFromResponse(response);

        // Show success animation
        setState(() {
          _isVerified = true;
          _isVerifying = false;
        });
        
        // Play success animation
        _animationController.forward();

        // Navigate to home screen after a delay
        Future.delayed(const Duration(milliseconds: 1800), () {
          if (mounted) {
            Navigator.of(context).pushReplacementNamed(HomeScreen.routeName);
          }
        });
      } else {
        if (response.containsKey('attempts_left')) {
          setState(() {
            _attemptsLeft = response['attempts_left'];
            _errorMessage = response['message'] ?? 'Verification failed';
            _isVerifying = false;
          });
        } else {
          setState(() {
            _errorMessage = response['message'] ?? 'Verification failed';
            _isVerifying = false;
          });
        }
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to connect to server. Please check your internet connection.';
        _isVerifying = false;
      });
    }
  }

  // Resend OTP
  Future<void> _resendOTP() async {
    if (_isResending || _remainingSeconds > 0) return;
    
    setState(() {
      _isResending = true;
      _errorMessage = null;
    });
    
    try {
      // Call appropriate resend/send OTP endpoint
      Map<String, dynamic> response;
      
      if (widget.isRegistration) {
        // Resend OTP for registration
        response = await _apiService.resendRegistrationOtp(
          email: widget.email,
        );
      } else {
        // Send OTP for existing account
        response = await _apiService.sendOtp(
          email: widget.email,
          username: widget.username,
        );
      }
      
      if (response['success']) {
        // Reset controllers
        for (var controller in _controllers) {
          controller.clear();
        }
        
        setState(() {
          _resendCount++;
          _isResending = false;
        });
        
        // Set focus to first field
        _focusNodes[0].requestFocus();
        
        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('New verification code sent to ${widget.email}'),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
        
        // Restart the timer
        _startResendTimer();
      } else {
        setState(() {
          _errorMessage = response['message'] ?? 'Failed to send new OTP';
          _isResending = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Error resending OTP. Please try again later.';
        _isResending = false;
      });
    }
  }
  
  // Move to next field
  void _onTextChanged(String value, int index) {
    if (value.isNotEmpty) {
      if (index < 5) {
        // Move to next field
        _focusNodes[index + 1].requestFocus();
      } else {
        // All fields are filled, trigger verification
        _verifyOTP();
      }
    }
  }
  
  // Handle backspace key
  void _onKeyPressed(RawKeyEvent event, int index) {
    if (event is RawKeyDownEvent) {
      if (event.logicalKey == LogicalKeyboardKey.backspace) {
        if (_controllers[index].text.isEmpty && index > 0) {
          // Move to previous field on backspace
          _focusNodes[index - 1].requestFocus();
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final size = MediaQuery.of(context).size;
    final primaryColor = theme.primaryColor;
    
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios,
            color: Colors.black87,
          ),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Verify Email',
          style: TextStyle(color: Colors.black87),
        ),
        centerTitle: true,
      ),
      body: _isVerified ? _buildSuccessView() : _buildVerificationView(primaryColor, size),
    );
  }
  
  // Main verification view
  Widget _buildVerificationView(Color primaryColor, Size size) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Header illustration
              FadeInDown(
                duration: const Duration(milliseconds: 700),
                child: Container(
                  width: 150,
                  height: 150,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(75),
                  ),
                  child: Image.asset(
                    'assets/images/empty_reports.png',
                    fit: BoxFit.contain,
                  ),
                ),
              ),
              
              const SizedBox(height: 24),
              
              // Title
              FadeInDown(
                delay: const Duration(milliseconds: 200),
                duration: const Duration(milliseconds: 700),
                child: Text(
                  'OTP Verification',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ),
              
              const SizedBox(height: 12),
              
              // Description
              FadeInDown(
                delay: const Duration(milliseconds: 400),
                duration: const Duration(milliseconds: 700),
                child: Text(
                  'We\'ve sent a 6-digit verification code to',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 15,
                    color: Colors.grey[600],
                  ),
                ),
              ),
              
              FadeInDown(
                delay: const Duration(milliseconds: 500),
                duration: const Duration(milliseconds: 700),
                child: Text(
                  widget.email,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: primaryColor,
                  ),
                ),
              ),
              
              const SizedBox(height: 40),
              
              // OTP input fields
              FadeInDown(
                delay: const Duration(milliseconds: 600),
                duration: const Duration(milliseconds: 800),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: List.generate(
                    6,
                    (index) => SizedBox(
                      width: 45,
                      child: RawKeyboardListener(
                        focusNode: FocusNode(),
                        onKey: (event) => _onKeyPressed(event, index),
                        child: TextFormField(
                          controller: _controllers[index],
                          focusNode: _focusNodes[index],
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.center,
                          maxLength: 1,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                          decoration: InputDecoration(
                            counterText: '',
                            contentPadding: EdgeInsets.zero,
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: Colors.grey.shade300),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: primaryColor, width: 2),
                            ),
                            errorBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: Colors.red),
                            ),
                            filled: true,
                            fillColor: Colors.grey.shade50,
                          ),
                          onChanged: (value) => _onTextChanged(value, index),
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              
              const SizedBox(height: 24),
              
              // Error message
              if (_errorMessage != null)
                FadeInUp(
                  duration: const Duration(milliseconds: 400),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.red.shade100),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.error_outline, color: Colors.red.shade700, size: 20),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _errorMessage!,
                                style: TextStyle(color: Colors.red.shade700, fontSize: 14),
                              ),
                              if (_attemptsLeft < 3)
                                Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Text(
                                    'Attempts left: $_attemptsLeft',
                                    style: TextStyle(
                                      color: Colors.red.shade700,
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              
              const SizedBox(height: 24),
              
              // Verify button
              FadeInUp(
                delay: const Duration(milliseconds: 700),
                duration: const Duration(milliseconds: 700),
                child: SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _isVerifying ? null : _verifyOTP,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryColor,
                      foregroundColor: Colors.white,
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: _isVerifying
                      ? SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text(
                          'VERIFY CODE',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                  ),
                ),
              ),
              
              const SizedBox(height: 24),
              
              // Didn't receive code
              FadeInUp(
                delay: const Duration(milliseconds: 800),
                duration: const Duration(milliseconds: 700),
                child: Column(
                  children: [
                    Text(
                      "Didn't receive the code?",
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[700],
                      ),
                    ),
                    TextButton(
                      onPressed: _remainingSeconds == 0 && !_isResending
                          ? _resendOTP
                          : null,
                      child: _isResending
                          ? SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: primaryColor,
                              ),
                            )
                          : Text(
                              _remainingSeconds > 0
                                  ? 'Resend code in ${_remainingSeconds}s'
                                  : 'Resend Code',
                              style: TextStyle(
                                color: primaryColor,
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                            ),
                    ),
                    
                    if (_resendCount > 0)
                      Padding(
                        padding: const EdgeInsets.only(top: 8.0),
                        child: Text(
                          'Code resent $_resendCount ${_resendCount == 1 ? 'time' : 'times'}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              
              const SizedBox(height: 24),
              
              // Email check message
              FadeInUp(
                delay: const Duration(milliseconds: 900),
                duration: const Duration(milliseconds: 700),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.blue.shade100),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.info_outline,
                        color: Colors.blue.shade700,
                        size: 20,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Please check your spam folder if you don\'t see the email in your inbox.',
                          style: TextStyle(
                            color: Colors.blue.shade700,
                            fontSize: 13,
                          ),
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
    );
  }
  
  // Success view after verification
  Widget _buildSuccessView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Success animation
          Lottie.asset(
            'assets/animations/success.json',
            width: 200,
            height: 200,
            controller: _animationController,
            onLoaded: (composition) {
              _animationController.duration = composition.duration;
              _animationController.forward();
            },
          ),
          
          const SizedBox(height: 20),
          
          // Success message
          FadeIn(
            duration: const Duration(milliseconds: 500),
            delay: const Duration(milliseconds: 500),
            child: Text(
              'Verification Successful!',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).primaryColor,
              ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          FadeIn(
            duration: const Duration(milliseconds: 500),
            delay: const Duration(milliseconds: 700),
            child: Text(
              'Redirecting to home screen...',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
              ),
            ),
          ),
        ],
      ),
    );
  }
}