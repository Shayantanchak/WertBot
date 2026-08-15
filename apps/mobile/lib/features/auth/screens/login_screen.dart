import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:local_auth/local_auth.dart';
import '../../../../core/constants/colors.dart';
import '../../../../core/services/api_service.dart';
import '../../../../core/widgets/app_snackbar.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController(text: 'alex@example.com');
  final _passwordController = TextEditingController(text: 'SecureP@ssw0rd!');
  bool _isLoading = false;
  bool _obscurePassword = true;

  Future<void> _handleBiometricAuth() async {
    final LocalAuthentication auth = LocalAuthentication();
    try {
      final bool canCheck = await auth.canCheckBiometrics;
      final bool isSupported = await auth.isDeviceSupported();
      if (!canCheck && !isSupported) {
        throw Exception('Biometrics not supported or configured on this device.');
      }
      
      final bool didAuthenticate = await auth.authenticate(
        localizedReason: 'Please authenticate to log in to WertBot Gateway',
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
        ),
      );

      if (didAuthenticate && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Biometrics verified successfully!'),
            backgroundColor: AppColors.accent,
          ),
        );
        Navigator.pushReplacementNamed(context, '/dashboard');
      }
    } catch (err) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(err.toString().replaceAll('Exception: ', '')),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  Future<void> _handleLogin() async {
    // Basic validation
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    if (email.isEmpty || password.isEmpty) {
      AppSnackbar.warning(context, 'Please enter your email and password.');
      return;
    }

    setState(() => _isLoading = true);
    final apiService = Provider.of<ApiService>(context, listen: false);
    try {
      final res = await apiService.login(email, password);
      HapticFeedback.lightImpact();
      if (mounted) {
        AppSnackbar.success(context, 'Welcome back, ${res['user']?['fullName'] ?? 'User'}!');
        Navigator.pushReplacementNamed(context, '/dashboard');
      }
    } catch (err) {
      if (mounted) AppSnackbar.error(context, friendlyApiError(err));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgVoid,
      body: Container(
        decoration: const BoxDecoration(
          radialGradient: RadialGradient(
            center: Alignment(0, -1),
            radius: 1.2,
            colors: [Color(0x1F3B82F6), Colors.transparent],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo / Icon
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0x1A3B82F6),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: const Color(0x333B82F6),
                          width: 1.5,
                        ),
                      ),
                      child: const Icon(
                        LucideIcons.sparkles,
                        color: AppColors.primary,
                        size: 48,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // App Branding
                  Center(
                    child: Text(
                      'WertBot',
                      style: GoogleFonts.inter(
                        fontSize: 32,
                        fontWeight: FontWeight.extrabold,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Center(
                    child: Text(
                      'AI-Powered Autonomous Financial Co-Pilot',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 48),

                  // Login Form Card
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppColors.bgSurface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.glassBorder),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x40000000),
                          blurRadius: 16,
                          offset: Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Sign In',
                          style: GoogleFonts.inter(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Email Field
                        Text(
                          'EMAIL ADDRESS',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                            letterSpacing: 1.0,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          style: GoogleFonts.inter(color: AppColors.textPrimary),
                          decoration: InputDecoration(
                            hintText: 'alex@example.com',
                            hintStyle: GoogleFonts.inter(color: AppColors.textMuted),
                            prefixIcon: const Icon(LucideIcons.mail, size: 18, color: AppColors.textSecondary),
                            filled: true,
                            fillColor: AppColors.bgBase,
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(color: AppColors.glassBorder),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(color: AppColors.primary),
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Password Field
                        Text(
                          'PASSWORD',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                            letterSpacing: 1.0,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          style: GoogleFonts.inter(color: AppColors.textPrimary),
                          decoration: InputDecoration(
                            hintText: 'Enter your password',
                            hintStyle: GoogleFonts.inter(color: AppColors.textMuted),
                            prefixIcon: const Icon(LucideIcons.lock, size: 18, color: AppColors.textSecondary),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword ? LucideIcons.eyeOff : LucideIcons.eye,
                                size: 18,
                                color: AppColors.textSecondary,
                              ),
                              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                            ),
                            filled: true,
                            fillColor: AppColors.bgBase,
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(color: AppColors.glassBorder),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(color: AppColors.primary),
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Submit Button
                        ElevatedButton(
                          onPressed: _isLoading ? null : _handleLogin,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            backgroundColor: AppColors.primary,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            elevation: 0,
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : Text(
                                  'Continue to Gateway',
                                  style: GoogleFonts.inter(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Biometric Trigger Option
                  OutlinedButton.icon(
                    onPressed: _handleBiometricAuth,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      side: const BorderSide(color: AppColors.glassBorder),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    icon: const Icon(LucideIcons.fingerprint, size: 20, color: AppColors.primary),
                    label: Text(
                      'Use Biometric Passkey',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
