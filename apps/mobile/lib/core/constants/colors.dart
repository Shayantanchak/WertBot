import 'package:flutter/material.dart';

class AppColors {
  // Brand Colors
  static const Color primary = Color(0xFF3B82F6);
  static const Color primaryDark = Color(0xFF1D4ED8);
  static const Color primaryLight = Color(0xFF93C5FD);
  static const Color accent = Color(0xFF10B981);
  static const Color accentDark = Color(0xFF047857);
  static const Color danger = Color(0xFFEF4444);
  static const Color warning = Color(0xFFF59E0B);
  static const Color gold = Color(0xFFEAB308);

  // Dark Background System
  static const Color bgVoid = Color(0xFF07090E);
  static const Color bgBase = Color(0xFF0B0F19);
  static const Color bgSurface = Color(0xFF161C2C);
  static const Color bgElevated = Color(0xFF222B43);
  static const Color bgOverlay = Color(0xFF2E3B5E);
  static const Color bgBorder = Color(0xFF3B4A75);

  // Text Colors
  static const Color textPrimary = Color(0xFFF1F5F9);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B);

  // Glassmorphism
  static const Color glassBg = Color(0xB3161C2C);
  static const Color glassBorder = Color(0x14F1F5F9);

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, Color(0xFF8B5CF6)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient accentGradient = LinearGradient(
    colors: [accent, Color(0xFF14B8A6)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient goldGradient = LinearGradient(
    colors: [gold, Color(0xFFF97316)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient dangerGradient = LinearGradient(
    colors: [danger, Color(0xFFEC4899)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient surfaceGradient = LinearGradient(
    colors: [Color(0xFF131826), Color(0xFF0F131E)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
