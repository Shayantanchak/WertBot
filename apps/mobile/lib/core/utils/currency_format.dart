import 'package:intl/intl.dart';

// --- Locale-aware currency formatter -----------------------------------------
// Usage: CurrencyFormat.format(1234.56, 'INR') ? '?1,234.56'
//        CurrencyFormat.format(1234.56, 'USD') ? '$1,234.56'
class CurrencyFormat {
  static const Map<String, String> _symbols = {
    'USD': '\$', 'EUR': '€', 'GBP': '£', 'INR': '?',
    'JPY': '¥', 'CAD': 'CA\$', 'AUD': 'A\$', 'SGD': 'S\$',
    'AED': 'AED', 'BTC': '?', 'ETH': '?',
  };

  static const Map<String, String> _locales = {
    'USD': 'en_US', 'EUR': 'de_DE', 'GBP': 'en_GB', 'INR': 'en_IN',
    'JPY': 'ja_JP', 'CAD': 'en_CA', 'AUD': 'en_AU', 'SGD': 'en_SG',
  };

  // Formats a major-unit amount (e.g., 1234.56)
  static String format(double amount, String currency, {int decimalDigits = 2}) {
    final symbol = _symbols[currency.toUpperCase()] ?? currency;
    final locale = _locales[currency.toUpperCase()] ?? 'en_US';
    final int decimals = (currency == 'JPY' || currency == 'BTC') ? 0 : decimalDigits;
    final formatted = NumberFormat.currency(
      locale: locale, symbol: symbol, decimalDigits: decimals,
    ).format(amount);
    return formatted;
  }

  // Formats from minor units (cents/paise) to major unit display
  static String fromMinor(int amountMinor, String currency) {
    final divisor = (currency == 'JPY') ? 1 : 100;
    return format(amountMinor / divisor, currency);
  }

  // Compact format for large numbers: ?1.2M, $45K
  static String compact(double amount, String currency) {
    final symbol = _symbols[currency.toUpperCase()] ?? currency;
    final abs = amount.abs();
    String suffix = '';
    double val = amount;
    if (abs >= 1e9) { val = amount / 1e9; suffix = 'B'; }
    else if (abs >= 1e6) { val = amount / 1e6; suffix = 'M'; }
    else if (abs >= 1e3) { val = amount / 1e3; suffix = 'K'; }
    return '$symbol${val.toStringAsFixed(val == val.truncateToDouble() ? 0 : 1)}$suffix';
  }
}
