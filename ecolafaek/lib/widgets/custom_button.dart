import 'package:flutter/material.dart';

class CustomButton extends StatelessWidget {
  final String text;
  final IconData? icon;
  final VoidCallback onPressed;
  final bool isSecondary;
  final bool isLoading;
  final bool isFullWidth;
  
  const CustomButton({
    Key? key,
    required this.text,
    this.icon,
    required this.onPressed,
    this.isSecondary = false,
    this.isLoading = false,
    this.isFullWidth = true,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return SizedBox(
      width: isFullWidth ? double.infinity : null,
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: isSecondary 
              ? theme.colorScheme.surface
              : theme.colorScheme.primary,
          foregroundColor: isSecondary 
              ? theme.colorScheme.primary
              : theme.colorScheme.onPrimary,
          elevation: isSecondary ? 0 : 2,
          side: isSecondary 
              ? BorderSide(color: theme.colorScheme.primary)
              : null,
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        ),
        child: isLoading
            ? SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: isSecondary 
                      ? theme.colorScheme.primary 
                      : theme.colorScheme.onPrimary,
                ),
              )
            : Row(
                mainAxisSize: isFullWidth ? MainAxisSize.max : MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 18),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    text,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}