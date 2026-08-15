import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/colors.dart';
import '../../../../core/services/api_service.dart';
import '../../../../core/widgets/app_snackbar.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  List<dynamic> _wallets = [];
  List<dynamic> _transfers = [];
  bool _isLoading = false;

  final _recipientController = TextEditingController();
  final _amountController = TextEditingController();
  String _selectedCurrency = 'USD';

  // For currency conversion
  String _convertFrom = 'USD';
  String _convertTo = 'EUR';
  final _convertAmountController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchBalances();
  }

  Future<void> _fetchBalances() async {
    setState(() => _isLoading = true);
    final apiService = Provider.of<ApiService>(context, listen: false);
    try {
      final res = await apiService.getWalletBalances();
      if (res['success'] == true) {
        setState(() {
          _wallets   = res['data']['balances'] ?? [];
          _transfers = res['data']['transfers'] ?? [];
        });
      }
    } catch (err) {
      if (mounted) AppSnackbar.error(context, friendlyApiError(err));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleDeposit() async {
    final amt = double.tryParse(_amountController.text);
    if (amt == null || amt <= 0) { AppSnackbar.warning(context, 'Enter a valid amount.'); return; }
    final apiService = Provider.of<ApiService>(context, listen: false);
    try {
      final res = await apiService.deposit(_selectedCurrency, amt);
      if (res['success'] == true && mounted) {
        Navigator.pop(context);
        _amountController.clear();
        HapticFeedback.mediumImpact();
        AppSnackbar.success(context, 'Deposited ${_selectedCurrency} ${amt.toStringAsFixed(2)} successfully!');
        _fetchBalances();
      }
    } catch (err) {
      if (mounted) AppSnackbar.error(context, friendlyApiError(err));
    }
  }

  Future<void> _handleTransfer() async {
    final amt       = double.tryParse(_amountController.text);
    final recipient = _recipientController.text.trim();
    if (amt == null || amt <= 0 || recipient.isEmpty) {
      AppSnackbar.warning(context, 'Enter a valid amount and recipient.');
      return;
    }
    final apiService = Provider.of<ApiService>(context, listen: false);
    try {
      final res = await apiService.transfer(recipient, amt, _selectedCurrency);
      if (res['success'] == true && mounted) {
        Navigator.pop(context);
        _amountController.clear(); _recipientController.clear();
        HapticFeedback.mediumImpact();
        AppSnackbar.success(context, 'Transferred ${_selectedCurrency} ${amt.toStringAsFixed(2)} to $recipient!');
        _fetchBalances();
      }
    } catch (err) {
      if (mounted) AppSnackbar.error(context, friendlyApiError(err));
    }
  }

  Future<void> _handleConvert() async {
    final amt = double.tryParse(_convertAmountController.text);
    if (amt == null || amt <= 0) { AppSnackbar.warning(context, 'Enter a valid amount to convert.'); return; }
    final apiService = Provider.of<ApiService>(context, listen: false);
    try {
      final res = await apiService.convertCurrency(_convertFrom, _convertTo, amt);
      if (res['success'] == true && mounted) {
        Navigator.pop(context);
        _convertAmountController.clear();
        HapticFeedback.lightImpact();
        AppSnackbar.success(context, 'Converted $amt $_convertFrom to $_convertTo!');
        _fetchBalances();
      }
    } catch (err) {
      if (mounted) AppSnackbar.error(context, friendlyApiError(err));
    }
  }

  @override
  void dispose() {
    _recipientController.dispose();
    _amountController.dispose();
    _convertAmountController.dispose();
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
          'Virtual Wallets',
          style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, color: AppColors.textSecondary, size: 18),
            onPressed: _fetchBalances,
          ),
        ],
      ),
      body: _isLoading && _wallets.isEmpty
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Wallet Cards Slider (horizontal)
                  _buildWalletsSection(),
                  const SizedBox(height: 24),

                  // Operations Actions Buttons
                  _buildOperationsRow(context),
                  const SizedBox(height: 28),

                  // Transaction History Log
                  _buildTransactionHistory(),
                ],
              ),
            ),
    );
  }

  Widget _buildWalletsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Your Balances',
          style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 150,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: _wallets.length,
            itemBuilder: (context, index) {
              final w = _wallets[index];
              final balance = double.parse((w['balance'] ?? 0.0).toString());
              final isUSD = w['currency'] == 'USD';

              return Container(
                width: 240,
                margin: const EdgeInsets.only(right: 12),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: isUSD ? AppColors.primaryGradient : AppColors.surfaceGradient,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.glassBorder),
                  boxShadow: const [
                    BoxShadow(color: Color(0x29000000), blurRadius: 10, offset: Offset(0, 4)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          w['flag'] ?? '🌐',
                          style: const TextStyle(fontSize: 24),
                        ),
                        Text(
                          w['currency'] ?? '',
                          style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.extrabold, color: Colors.white),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'BALANCE',
                          style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: Colors.white70, letterSpacing: 1.0),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${w['currency'] == 'BTC' || w['currency'] == 'ETH' ? '' : '\$'}${balance.toStringAsFixed(w['currency'] == 'BTC' || w['currency'] == 'ETH' ? 4 : 2)}',
                          style: GoogleFonts.jetBrainsMono(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildOperationsRow(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        _buildOpButton(context, LucideIcons.plus, 'Deposit', _showDepositSheet),
        const SizedBox(width: 8),
        _buildOpButton(context, LucideIcons.send, 'Send Money', _showTransferSheet),
        const SizedBox(width: 8),
        _buildOpButton(context, LucideIcons.refreshCw, 'Convert FX', _showConvertSheet),
      ],
    );
  }

  Widget _buildOpButton(BuildContext context, IconData icon, String label, VoidCallback onTap) {
    return Expanded(
      child: ElevatedButton.icon(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 14),
          backgroundColor: AppColors.bgSurface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          side: const BorderSide(color: AppColors.glassBorder),
          elevation: 0,
        ),
        icon: Icon(icon, color: AppColors.primary, size: 16),
        label: Text(
          label,
          style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
      ),
    );
  }

  Widget _buildTransactionHistory() {
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
            'Transfer Logs',
            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 16),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _transfers.length,
            separatorBuilder: (context, index) => Divider(color: AppColors.glassBorder, height: 16),
            itemBuilder: (context, index) {
              final tx = _transfers[index];
              final amount = double.parse((tx['amount'] ?? 0.0).toString());
              final isDebit = tx['type'] == 'sent' || tx['type'] == 'convert';

              return Row(
                children: [
                  Text(
                    tx['flag'] ?? '🌐',
                    style: const TextStyle(fontSize: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          tx['name'] ?? '',
                          style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          tx['date'] ?? 'Just now',
                          style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    '${isDebit ? '-' : '+'}\$${amount.toStringAsFixed(2)}',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.extrabold,
                      color: isDebit ? AppColors.danger : AppColors.accent,
                    ),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  void _showDepositSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.bgSurface,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          top: 24,
          left: 24,
          right: 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Deposit Funds',
              style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              style: GoogleFonts.inter(color: AppColors.textPrimary),
              decoration: InputDecoration(
                hintText: 'Enter amount (e.g. 50.00)',
                hintStyle: GoogleFonts.inter(color: AppColors.textMuted),
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
            ElevatedButton(
              onPressed: _handleDeposit,
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16), backgroundColor: AppColors.primary),
              child: Text('Confirm Deposit', style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.white)),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  void _showTransferSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.bgSurface,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          top: 24,
          left: 24,
          right: 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Send Peer Transfer',
              style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _recipientController,
              style: GoogleFonts.inter(color: AppColors.textPrimary),
              decoration: InputDecoration(
                hintText: "Recipient's Name (e.g., Alice)",
                hintStyle: GoogleFonts.inter(color: AppColors.textMuted),
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
            const SizedBox(height: 16),
            TextField(
              controller: _amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              style: GoogleFonts.inter(color: AppColors.textPrimary),
              decoration: InputDecoration(
                hintText: 'Enter amount to transfer',
                hintStyle: GoogleFonts.inter(color: AppColors.textMuted),
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
            ElevatedButton(
              onPressed: _handleTransfer,
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16), backgroundColor: AppColors.primary),
              child: Text('Confirm Transfer', style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.white)),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  void _showConvertSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.bgSurface,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            top: 24,
            left: 24,
            right: 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Convert FX Currency',
                style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  DropdownButton<String>(
                    value: _convertFrom,
                    dropdownColor: AppColors.bgSurface,
                    style: GoogleFonts.inter(color: AppColors.textPrimary, fontWeight: FontWeight.bold),
                    items: ['USD', 'EUR', 'GBP', 'INR', 'BTC', 'ETH']
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setModalState(() {
                          _convertFrom = val;
                        });
                      }
                    },
                  ),
                  const Icon(LucideIcons.arrowRight, color: AppColors.textSecondary),
                  DropdownButton<String>(
                    value: _convertTo,
                    dropdownColor: AppColors.bgSurface,
                    style: GoogleFonts.inter(color: AppColors.textPrimary, fontWeight: FontWeight.bold),
                    items: ['USD', 'EUR', 'GBP', 'INR', 'BTC', 'ETH']
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setModalState(() {
                          _convertTo = val;
                        });
                      }
                    },
                  ),
                ],
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _convertAmountController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                style: GoogleFonts.inter(color: AppColors.textPrimary),
                decoration: InputDecoration(
                  hintText: 'Enter amount to convert',
                  hintStyle: GoogleFonts.inter(color: AppColors.textMuted),
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
              ElevatedButton(
                onPressed: _handleConvert,
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16), backgroundColor: AppColors.primary),
                child: Text('Confirm FX Conversion', style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.white)),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
