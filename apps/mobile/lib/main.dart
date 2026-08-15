import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'core/constants/colors.dart';
import 'core/services/api_service.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/dashboard/screens/dashboard_screen.dart';
import 'features/chat/screens/chat_screen.dart';
import 'features/trading/screens/trading_screen.dart';
import 'features/wallet/screens/wallet_screen.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        Provider<ApiService>(
          create: (_) => ApiService(),
        ),
      ],
      child: const WertBotApp(),
    ),
  );
}

class WertBotApp extends StatelessWidget {
  const WertBotApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'WertBot',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppColors.bgBase,
        primaryColor: AppColors.primary,
        cardColor: AppColors.bgSurface,
        textTheme: GoogleFonts.interTextTheme(
          ThemeData.dark().textTheme,
        ).apply(
          bodyColor: AppColors.textPrimary,
          displayColor: AppColors.textPrimary,
        ),
        colorScheme: const ColorScheme.dark(
          primary: AppColors.primary,
          secondary: AppColors.accent,
          surface: AppColors.bgSurface,
          error: AppColors.danger,
        ),
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => const WertBotInitializer(),
        '/login': (context) => const LoginScreen(),
        '/dashboard': (context) => const DashboardScreen(),
        '/chat': (context) => const ChatScreen(),
        '/trading': (context) => const TradingScreen(),
        '/wallet': (context) => const WalletScreen(),
      },
    );
  }
}

class WertBotInitializer extends StatefulWidget {
  const WertBotInitializer({super.key});

  @override
  State<WertBotInitializer> createState() => _WertBotInitializerState();
}

class _WertBotInitializerState extends State<WertBotInitializer> {
  final _storage = const FlutterSecureStorage();

  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    final apiService = Provider.of<ApiService>(context, listen: false);
    // Let the splash screen linger briefly for premium branding experience
    await Future.delayed(const Duration(milliseconds: 1500));

    // Try to restore the previous session (validates token, attempts refresh)
    final hadSession = await _storage.read(key: 'wertbot_access_token') != null;
    final isLoggedIn = await apiService.tryAutoLogin();

    if (!mounted) return;

    if (isLoggedIn) {
      Navigator.pushReplacementNamed(context, '/dashboard');
    } else {
      Navigator.pushReplacementNamed(context, '/login');
      // If the user previously had a session that expired, show a friendly message
      if (hadSession) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Your session has expired. Please sign in again.'),
                backgroundColor: Color(0xFF334155),
                behavior: SnackBarBehavior.floating,
                duration: Duration(seconds: 4),
              ),
            );
          }
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgVoid,
      body: Container(
        decoration: const BoxDecoration(
          radialGradient: RadialGradient(
            center: Alignment(0, -0.5),
            radius: 1.2,
            colors: [Color(0x1F3B82F6), Colors.transparent],
          ),
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: const BoxDecoration(
                  color: Color(0x1A3B82F6),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.sparkles,
                  color: AppColors.primary,
                  size: 56,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'WertBot',
                style: GoogleFonts.inter(
                  fontSize: 36,
                  fontWeight: FontWeight.extrabold,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Connecting to gateway secure tunnel...',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 48),
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
