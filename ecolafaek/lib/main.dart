import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';

import 'config/theme.dart';
import 'providers/auth_provider.dart';
import 'providers/report_provider.dart';
import 'providers/location_provider.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/home_screen.dart';
import 'screens/report_screen.dart';
import 'screens/map_screen.dart';
import 'screens/profile_screen.dart';
import 'services/storage_service.dart';
import 'screens/report_detail_screen.dart';
import 'screens/otp_verification_screen.dart';
import 'screens/change_password_screen.dart';
import 'providers/stats_provider.dart';
import 'screens/stats_screen.dart';
import 'services/api_service.dart';

void main() async {
  // Ensure Flutter widgets are initialized
  WidgetsFlutterBinding.ensureInitialized();
  
  // Load environment variables
  await dotenv.load(fileName: ".env");
  
  // Initialize local storage
  final storageService = StorageService();
  await storageService.init();
  
  runApp(MyApp(storageService: storageService));
}

class MyApp extends StatelessWidget {
  final StorageService storageService;
  
  const MyApp({super.key, required this.storageService});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => AuthProvider(storageService: storageService),
        ),
        ChangeNotifierProvider(
          create: (_) => LocationProvider(),
        ),
        ChangeNotifierProxyProvider<AuthProvider, ReportProvider>(
          create: (context) => ReportProvider(
            authProvider: Provider.of<AuthProvider>(context, listen: false),
          ),
          update: (context, auth, previous) => 
            previous!..updateAuth(auth),
        ),
        ChangeNotifierProxyProvider<AuthProvider, StatsProvider>(
          create: (ctx) => StatsProvider(
            authProvider: Provider.of<AuthProvider>(ctx, listen: false),
          ),
          update: (ctx, auth, previousStats) => 
              previousStats ?? StatsProvider(authProvider: auth),
        ),
      ],
      child: MaterialApp(
        title: 'EcoLafaek',
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.system,
        debugShowCheckedModeBanner: false,
        initialRoute: SplashScreen.routeName,
        routes: {
          // Define all routes here for navigation
          SplashScreen.routeName: (context) => const SplashScreen(),
          LoginScreen.routeName: (context) => const LoginScreen(),
          RegisterScreen.routeName: (context) => const RegisterScreen(),
          HomeScreen.routeName: (context) => const HomeScreen(),
          ReportScreen.routeName: (context) => const ReportScreen(),
          MapScreen.routeName: (context) => const MapScreen(), // Will show back button
          ProfileScreen.routeName: (context) => const ProfileScreen(), // Will show back button
          ReportDetailScreen.routeName: (context) => ReportDetailScreen(
            reportId: ModalRoute.of(context)!.settings.arguments as int,),
          StatsScreen.routeName: (context) => const StatsScreen(),
          // Add the OTP verification screen route - updated to match new constructor
          OtpVerificationScreen.routeName: (context) => OtpVerificationScreen(
            email: '',
            username: '',
            isRegistration: true,
          ),
          ChangePasswordScreen.routeName: (ctx) => const ChangePasswordScreen(),
        },
        // If route not found in the routes map
        onGenerateRoute: (settings) {
          return MaterialPageRoute(
            builder: (_) => Scaffold(
              body: Center(
                child: Text('Route ${settings.name} not found!'),
              ),
            ),
          );
        },
        onUnknownRoute: (settings) {
          // Fallback for routes that don't exist - go to home screen
          return MaterialPageRoute(
            builder: (_) => const HomeScreen(),
          );
        },
        // Set up auto logout callback after MaterialApp is built
        builder: (context, child) {
          // Set context for AuthProvider after MaterialApp builds
          WidgetsBinding.instance.addPostFrameCallback((_) {
            final authProvider = Provider.of<AuthProvider>(context, listen: false);
            authProvider.setContext(context);
          });
          
          return child ?? const SizedBox();
        },
      ),
    );
  }
}