import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// ─── Build-flavor aware base URL ───────────────────────────────────────
// Set via:  flutter run --dart-define=APP_API_URL=https://api.yourdomain.com/api/v1
// Defaults: Android emulator → 10.0.2.2 (localhost); else → localhost
const String _defaultApiUrl = String.fromEnvironment(
  'APP_API_URL',
  defaultValue: 'http://10.0.2.2:3000/api/v1',
);

class ApiService {
  final String baseUrl;
  String? _token;
  String? _refreshToken;
  final _storage = const FlutterSecureStorage();

  bool get isAuthenticated => _token != null;
  String? get token => _token;

  ApiService({String? baseUrl}) : baseUrl = baseUrl ?? _defaultApiUrl;

  void setToken(String token) => _token = token;
  void setRefreshToken(String rt) => _refreshToken = rt;

  /// Tries to restore session from secure storage.
  /// If access token exists: validate by calling profile endpoint.
  /// If that fails with 401: attempt silent token refresh.
  /// If refresh also fails: clears state so user lands on Login with a message.
  Future<bool> tryAutoLogin() async {
    final cachedToken   = await _storage.read(key: 'wertbot_access_token');
    final cachedRefresh = await _storage.read(key: 'wertbot_refresh_token');

    if (cachedToken == null) return false;

    // Try using the existing token
    _token = cachedToken;
    _refreshToken = cachedRefresh;

    // Validate token with a lightweight endpoint
    try {
      final res = await http.get(
        Uri.parse('$baseUrl/auth/profile'),
        headers: _headers,
      ).timeout(const Duration(seconds: 8));

      if (res.statusCode == 200) return true;  // Token still valid

      // 401 → try refresh
      if (res.statusCode == 401 && cachedRefresh != null) {
        return await _silentRefresh(cachedRefresh);
      }
    } catch (_) {
      // Network unreachable — assume token valid, let next API call fail gracefully
      return cachedToken.isNotEmpty;
    }

    await logout();
    return false;
  }

  Future<bool> _silentRefresh(String refreshToken) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refreshToken}),
      ).timeout(const Duration(seconds: 10));

      if (res.statusCode == 200 || res.statusCode == 201) {
        final data = jsonDecode(res.body);
        final newAccess  = data['accessToken']  as String?;
        final newRefresh = data['refreshToken'] as String?;
        if (newAccess != null) {
          _token = newAccess;
          _refreshToken = newRefresh ?? refreshToken;
          await _storage.write(key: 'wertbot_access_token', value: _token!);
          if (newRefresh != null) await _storage.write(key: 'wertbot_refresh_token', value: newRefresh);
          return true;
        }
      }
    } catch (_) { /* fall through */ }
    await logout();
    return false;
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  Future<void> logout() async {
    _token = null;
    _refreshToken = null;
    await _storage.delete(key: 'wertbot_access_token');
    await _storage.delete(key: 'wertbot_refresh_token');
  }

  // ── Authentication ─────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    ).timeout(const Duration(seconds: 15));
    final data = jsonDecode(response.body);
    if (response.statusCode == 200 || response.statusCode == 201) {
      if (data['accessToken'] != null) {
        _token = data['accessToken'] as String;
        _refreshToken = data['refreshToken'] as String?;
        await _storage.write(key: 'wertbot_access_token', value: _token!);
        if (_refreshToken != null) await _storage.write(key: 'wertbot_refresh_token', value: _refreshToken!);
      }
      return data;
    } else {
      throw Exception(data['message'] ?? 'Invalid email or password');
    }
  }

  // ── Wallet / Neobanking ───────────────────────────────────────────────────
  Future<Map<String, dynamic>> getWalletBalances() async {
    final response = await http.get(
      Uri.parse('$baseUrl/wallet/balance'),
      headers: _headers,
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to fetch wallet balances');
    }
  }

  Future<Map<String, dynamic>> deposit(String currency, double amount) async {
    final response = await http.post(
      Uri.parse('$baseUrl/wallet/deposit'),
      headers: _headers,
      body: jsonEncode({'currency': currency, 'amount': amount}),
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to deposit funds');
    }
  }

  Future<Map<String, dynamic>> transfer(String recipientName, double amount, String currency) async {
    final response = await http.post(
      Uri.parse('$baseUrl/wallet/transfer'),
      headers: _headers,
      body: jsonEncode({
        'recipientName': recipientName,
        'amount': amount,
        'currency': currency,
      }),
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to transfer funds');
    }
  }

  Future<Map<String, dynamic>> convertCurrency(String from, String to, double amount) async {
    final response = await http.post(
      Uri.parse('$baseUrl/wallet/convert'),
      headers: _headers,
      body: jsonEncode({
        'fromCurrency': from,
        'toCurrency': to,
        'amount': amount,
      }),
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to convert currency');
    }
  }

  // ── Gemini AI Advisory ────────────────────────────────────────────────────
  Future<Map<String, dynamic>> chat(String prompt, String engineId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/ai/chat'),
      headers: _headers,
      body: jsonEncode({
        'message': prompt,
        'engineId': engineId,
      }),
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to get advisor response');
    }
  }

  // ── Trading & HFT ─────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> getPortfolio() async {
    final response = await http.get(
      Uri.parse('$baseUrl/trading/portfolio'),
      headers: _headers,
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to fetch trading portfolio');
    }
  }

  Future<Map<String, dynamic>> placeOrder(String symbol, String side, String orderType, double quantity, {double? price}) async {
    final response = await http.post(
      Uri.parse('$baseUrl/trading/order'),
      headers: _headers,
      body: jsonEncode({
        'symbol': symbol,
        'side': side,
        'orderType': orderType,
        'quantity': quantity,
        if (price != null) 'price': price,
      }),
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to place trading order');
    }
  }

  Future<Map<String, dynamic>> getPricePrediction(String symbol) async {
    final response = await http.get(
      Uri.parse('$baseUrl/trading/predict/$symbol'),
      headers: _headers,
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to get price prediction');
    }
  }

  // ── Transactions & PFM ──────────────────────────────────────────────────
  Future<Map<String, dynamic>> getTransactions() async {
    final response = await http.get(
      Uri.parse('$baseUrl/transactions'),
      headers: _headers,
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to fetch transactions');
    }
  }

  Future<Map<String, dynamic>> getBudgetStatus(String category) async {
    final response = await http.get(
      Uri.parse('$baseUrl/transactions/budget-status?category=$category'),
      headers: _headers,
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to fetch budget status');
    }
  }
}
