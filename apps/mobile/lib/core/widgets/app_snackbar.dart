import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants/colors.dart';

enum SnackbarType { success, error, warning, info }

class AppSnackbar {
  static void show(
    BuildContext context,
    String message, {
    SnackbarType type = SnackbarType.info,
    Duration duration = const Duration(seconds: 3),
  }) {
    final (Color bg, Color icon, IconData iconData) = switch (type) {
      SnackbarType.success => (AppColors.accent.withOpacity(0.12), AppColors.accent, Icons.check_circle_rounded),
      SnackbarType.error   => (AppColors.danger.withOpacity(0.12), AppColors.danger, Icons.error_rounded),
      SnackbarType.warning => (AppColors.warning.withOpacity(0.12), AppColors.warning, Icons.warning_rounded),
      SnackbarType.info    => (AppColors.primary.withOpacity(0.12), AppColors.primary, Icons.info_rounded),
    };

    // Haptic feedback
    switch (type) {
      case SnackbarType.success: HapticFeedback.lightImpact();
      case SnackbarType.error:   HapticFeedback.mediumImpact();
      default:                   HapticFeedback.selectionClick();
    }

    // Clean the message: strip "Exception: " prefix
    final cleanMsg = message
        .replaceAll('Exception: ', '')
        .replaceAll('FormatException: ', '')
        .replaceAll('SocketException: ', '');

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          behavior:          SnackBarBehavior.floating,
          duration:          duration,
          backgroundColor:   AppColors.bgSurface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: icon.withOpacity(0.4), width: 1),
          ),
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          content: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
                child: Icon(iconData, color: icon, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  cleanMsg,
                  style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w500, color: Color(0xFFE2E8F0)),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      );
  }

  // Convenience shortcuts
  static void success(BuildContext ctx, String msg) => show(ctx, msg, type: SnackbarType.success);
  static void error(BuildContext ctx, String msg)   => show(ctx, msg, type: SnackbarType.error);
  static void warning(BuildContext ctx, String msg) => show(ctx, msg, type: SnackbarType.warning);
  static void info(BuildContext ctx, String msg)    => show(ctx, msg, type: SnackbarType.info);
}

// --- Friendly HTTP error messages --------------------------------------------
String friendlyApiError(dynamic error) {
  final msg = error.toString();
  if (msg.contains('SocketException') || msg.contains('Connection refused') || msg.contains('Network')) {
    return "Can't connect to WertBot. Check your internet connection.";
  }
  if (msg.contains('401') || msg.contains('Unauthorized')) return 'Your session has expired. Please log in again.';
  if (msg.contains('403') || msg.contains('Forbidden'))    return "You don't have permission to do that.";
  if (msg.contains('404') || msg.contains('Not Found'))    return 'The requested resource was not found.';
  if (msg.contains('409') || msg.contains('Conflict'))     return 'An account with this email already exists.';
  if (msg.contains('429') || msg.contains('Too Many'))     return 'Too many attempts. Please wait and try again.';
  if (msg.contains('500') || msg.contains('Internal'))     return 'Something went wrong on our end. Please try again.';
  if (msg.contains('TimeoutException') || msg.contains('timed out')) return 'The request timed out. Please try again.';
  // Last resort: strip "Exception: " and return
  return msg.replaceAll('Exception: ', '').replaceAll('FormatException: ', '');
}
