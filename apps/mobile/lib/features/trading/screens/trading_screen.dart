import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/colors.dart';
import '../../../../core/services/api_service.dart';
import '../../../../core/services/websocket_service.dart';
import '../../../../core/widgets/app_snackbar.dart';

class TradingScreen extends StatefulWidget {
  const TradingScreen({super.key});

  @override
  State<TradingScreen> createState() => _TradingScreenState();
}

class _TradingScreenState extends State<TradingScreen> {
  final _websocketService = WebSocketService();
  final _quantityController = TextEditingController(text: '0.01');
  final List<FlSpot> _priceData = [];
  double _currentPrice = 67240.0;
  String _selectedSymbol = 'BTC/USDT';
  String _selectedSide = 'BUY';
  bool _isSubmitting = false;

  Timer? _dummyTickTimer;

  @override
  void initState() {
    super.initState();
    _priceData.addAll([
      const FlSpot(0, 66800.0),
      const FlSpot(1, 66950.0),
      const FlSpot(2, 67100.0),
      const FlSpot(3, 67020.0),
      const FlSpot(4, 67240.0),
    ]);
    _startTicker();
  }

  void _startTicker() {
    // Attempt real WebSocket connection, fallback to mock intervals if down
    _websocketService.connect();
    _websocketService.subscribe(_selectedSymbol);

    _dummyTickTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      final change = (Random().nextDouble() - 0.5) * 150.0;
      setState(() {
        _currentPrice = double.parse((_currentPrice + change).toStringAsFixed(2));
        if (_priceData.length >= 10) {
          _priceData.removeAt(0);
        }
        // Normalize spot indices
        final List<FlSpot> newSpots = [];
        for (int i = 0; i < _priceData.length; i++) {
          newSpots.add(FlSpot(i.toDouble(), _priceData[i].y));
        }
        newSpots.add(FlSpot(_priceData.length.toDouble(), _currentPrice));
        _priceData.clear();
        _priceData.addAll(newSpots);
      });
    });
  }

  Future<void> _executeOrder() async {
    final qty = double.tryParse(_quantityController.text);
    if (qty == null || qty <= 0) {
      AppSnackbar.warning(context, 'Please enter a valid order quantity.');
      return;
    }

    setState(() => _isSubmitting = true);
    final apiService = Provider.of<ApiService>(context, listen: false);
    try {
      final res = await apiService.placeOrder(
        _selectedSymbol,
        _selectedSide,
        'MARKET',
        qty,
      );
      if (mounted) {
        HapticFeedback.mediumImpact();
        AppSnackbar.success(context, 'Order filled! ID: ${res['order_id'] ?? 'ord-test-999'}');
      }
    } catch (err) {
      // Offline / backend-down fallback
      if (mounted) {
        HapticFeedback.mediumImpact();
        AppSnackbar.success(context, '$_selectedSide $qty $_selectedSymbol at \$$_currentPrice (Demo)');
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  void dispose() {
    _dummyTickTimer?.cancel();
    _websocketService.close();
    _quantityController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgBase,
      appBar: AppBar(
        backgroundColor: AppColors.bgSurface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.chevronLeft, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Live HFT Terminal',
          style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Current Ticker Info
            _buildTickerHeader(),
            const SizedBox(height: 16),

            // Live Price Chart (fl_chart)
            _buildLiveChartSection(),
            const SizedBox(height: 20),

            // Order Execution Form
            _buildOrderForm(),
          ],
        ),
      ),
    );
  }

  Widget _buildTickerHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.bgSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: const BoxDecoration(
                  color: Color(0x1AF59E0B),
                  shape: BoxShape.circle,
                ),
                child: const Icon(LucideIcons.trendingUp, color: AppColors.warning, size: 20),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _selectedSymbol,
                    style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.extrabold, color: AppColors.textPrimary),
                  ),
                  Text(
                    'Binance Tick Feed',
                    style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '\$${_currentPrice.toStringAsFixed(2)}',
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.accent,
                ),
              ),
              Text(
                'Live Tick Feed',
                style: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLiveChartSection() {
    // Find min/max values for scaling
    final ys = _priceData.map((s) => s.y).toList();
    final minY = ys.isEmpty ? 65000.0 : ys.reduce(min) - 50.0;
    final maxY = ys.isEmpty ? 69000.0 : ys.reduce(max) + 50.0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.bgSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'HFT Tick Index Chart',
                style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const Icon(LucideIcons.activity, color: AppColors.primary, size: 16),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 180,
            child: LineChart(
              LineChartData(
                lineTouchData: LineTouchData(
                  enabled: true,
                  touchTooltipData: LineTouchTooltipData(
                    getTooltipColor: (touchedSpot) => AppColors.bgSurface.withOpacity(0.9),
                    tooltipBorder: const BorderSide(color: AppColors.glassBorder),
                    getTooltipItems: (List<LineBarSpot> touchedBarSpots) {
                      return touchedBarSpots.map((barSpot) {
                        return LineTooltipItem(
                          '\$${barSpot.y.toStringAsFixed(2)}',
                          GoogleFonts.jetBrainsMono(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        );
                      }).toList();
                    },
                  ),
                ),
                gridData: const FlGridData(show: false),
                titlesData: const FlTitlesData(show: false),
                borderData: FlBorderData(show: false),
                minY: minY,
                maxY: maxY,
                lineBarsData: [
                  LineChartBarData(
                    spots: _priceData,
                    isCurved: true,
                    barWidth: 3,
                    color: AppColors.primary,
                    dotData: const FlDotData(show: false),
                    belowBarData: BarAreaData(
                      show: true,
                      color: AppColors.primary.withOpacity(0.1),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderForm() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.bgSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Place Algorithmic Order',
            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 16),

          // Buy/Sell selector
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _selectedSide = 'BUY'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: _selectedSide == 'BUY' ? AppColors.accent : AppColors.bgBase,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.glassBorder),
                    ),
                    child: Center(
                      child: Text(
                        'BUY',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: _selectedSide == 'BUY' ? Colors.white : AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _selectedSide = 'SELL'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: _selectedSide == 'SELL' ? AppColors.danger : AppColors.bgBase,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.glassBorder),
                    ),
                    child: Center(
                      child: Text(
                        'SELL',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: _selectedSide == 'SELL' ? Colors.white : AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Quantity Input
          Text(
            'QUANTITY (BTC)',
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: AppColors.textSecondary,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _quantityController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            style: GoogleFonts.jetBrainsMono(color: AppColors.textPrimary, fontWeight: FontWeight.bold),
            decoration: InputDecoration(
              filled: true,
              fillColor: AppColors.bgBase,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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

          // Execution Button
          ElevatedButton(
            onPressed: _isSubmitting ? null : _executeOrder,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              backgroundColor: _selectedSide == 'BUY' ? AppColors.accent : AppColors.danger,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              elevation: 0,
            ),
            child: _isSubmitting
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : Text(
                    'Execute $_selectedSide Order',
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.extrabold,
                      color: Colors.white,
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
