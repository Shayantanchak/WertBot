import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';

class WebSocketService {
  final String url;
  WebSocketChannel? _channel;
  final StreamController<dynamic> _streamController = StreamController<dynamic>.broadcast();
  
  bool _isConnected = false;
  final List<String> _activeSubscriptions = [];
  Timer? _reconnectTimer;
  int _retryCount = 0;

  WebSocketService({this.url = 'ws://localhost:3000/ws/trading'});

  Stream<dynamic> get stream => _streamController.stream;
  bool get isConnected => _isConnected;

  void connect() {
    if (_isConnected) return;

    _reconnectTimer?.cancel();
    try {
      _channel = WebSocketChannel.connect(Uri.parse(url));
      _isConnected = true;
      _retryCount = 0;

      // Resubscribe to existing subscriptions
      for (final symbol in _activeSubscriptions) {
        _sendSubscription(symbol, 'subscribe');
      }

      _channel!.stream.listen(
        (data) {
          _streamController.add(data);
        },
        onError: (err) {
          _handleDisconnect();
        },
        onDone: () {
          _handleDisconnect();
        },
      );
    } catch (_) {
      _handleDisconnect();
    }
  }

  void _handleDisconnect() {
    _isConnected = false;
    _channel = null;
    
    // Exponential backoff reconnect
    final delay = Duration(seconds: (1 << _retryCount).clamp(2, 30));
    _retryCount++;

    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(delay, () {
      connect();
    });
  }

  void subscribe(String symbol) {
    if (!_activeSubscriptions.contains(symbol)) {
      _activeSubscriptions.add(symbol);
    }
    _sendSubscription(symbol, 'subscribe');
  }

  void unsubscribe(String symbol) {
    _activeSubscriptions.remove(symbol);
    _sendSubscription(symbol, 'unsubscribe');
  }

  void _sendSubscription(String symbol, String action) {
    if (_channel != null && _isConnected) {
      try {
        _channel!.sink.add(jsonEncode({
          'action': action,
          'symbol': symbol,
        }));
      } catch (_) {
        // Ignored, will resubscribe on reconnect
      }
    }
  }

  void close() {
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    _isConnected = false;
    _activeSubscriptions.clear();
  }
}
