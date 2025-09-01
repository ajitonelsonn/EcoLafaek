import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// Mixin to handle exit confirmation on the home screen
mixin ConfirmExitMixin<T extends StatefulWidget> on State<T> {
  Future<bool> onWillPop() async {
  return await showDialog(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Exit App'),
      content: const Text('Are you sure you want to exit the app?'),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('No'),
        ),
        TextButton(
          onPressed: () {
            Navigator.of(context).pop(true);
            // Add this to actually exit the app
            SystemNavigator.pop();
          },
          child: const Text('Yes'),
        ),
      ],
    ),
  ) ?? false;
}
}

// A class to help with managing navigation and routes throughout the app
class NavigationUtils {
  // Go to a screen and remove all previous screens from the stack
  static void goToScreenAndRemoveAll(BuildContext context, String routeName) {
    Navigator.of(context).pushNamedAndRemoveUntil(
      routeName,
      (route) => false,
    );
  }
  
  // Go to a screen and remove all until a specific route
  static void goToScreenAndRemoveUntil(BuildContext context, String routeName, String untilRoute) {
    Navigator.of(context).pushNamedAndRemoveUntil(
      routeName,
      (route) => route.settings.name == untilRoute,
    );
  }
  
  // Go back to a specific route
  static void popUntil(BuildContext context, String routeName) {
    Navigator.of(context).popUntil(
      (route) => route.settings.name == routeName,
    );
  }
  
  // Go back to home screen
  static void goToHomeScreen(BuildContext context) {
    popUntil(context, '/home');
  }
}