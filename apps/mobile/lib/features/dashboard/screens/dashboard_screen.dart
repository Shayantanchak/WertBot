import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/colors.dart';
import '../../../../core/services/api_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _touchedIndex = -1;
  List<dynamic> _transactions = [];
  Map<String, dynamic> _budgetDining = {};
  Map<String, dynamic> _budgetTransport = {};
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadDashboardData();
    });
  }

  Future<void> _loadDashboardData() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
    });

    final apiService = Provider.of<ApiService>(context, listen: false);
    try {
      final txRes = await apiService.getTransactions();
      if (txRes['success'] == true && txRes['data'] != null) {
        final txList = txRes['data']['transactions'] as List<dynamic>? ?? [];
        if (mounted) {
          setState(() {
            _transactions = txList;
          });
        }
      }
    } catch (_) {
      // Keep static mock fallbacks
    }

    try {
      final diningRes = await apiService.getBudgetStatus('Dining');
      if (diningRes['success'] == true && diningRes['data'] != null) {
        if (mounted) {
          setState(() {
            _budgetDining = diningRes['data'];
          });
        }
      }
    } catch (_) {}

    try {
      final transportRes = await apiService.getBudgetStatus('Transport');
      if (transportRes['success'] == true && transportRes['data'] != null) {
        if (mounted) {
          setState(() {
            _budgetTransport = transportRes['data'];
          });
        }
      }
    } catch (_) {}

    if (mounted) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgBase,
      appBar: AppBar(
        backgroundColor: AppColors.bgSurface,
        elevation: 0,
        title: Text(
          'WertBot Control',
          style: GoogleFonts.inter(
            fontWeight: FontWeight.extrabold,
            color: AppColors.textPrimary,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.bell, color: AppColors.textSecondary),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('No new alerts. Your budget looks healthy!'),
                  backgroundColor: AppColors.accent,
                ),
              );
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadDashboardData,
        color: AppColors.primary,
        backgroundColor: AppColors.bgSurface,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Net Worth Summary Card
              _buildNetWorthCard(),
              const SizedBox(height: 20),
  
              // Quick Actions Navigation
              _buildQuickActions(context),
              const SizedBox(height: 24),
  
              // Spending Categories (fl_chart)
              _buildSpendingChartSection(),
              const SizedBox(height: 24),
  
              // Budget Threshold Progress
              _buildBudgetAlertsSection(),
              const SizedBox(height: 24),
  
              // Recent Transactions
              _buildRecentTransactionsSection(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNetWorthCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x3D3B82F6),
            blurRadius: 16,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'TOTAL NET WORTH',
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Colors.white70,
                  letterSpacing: 1.2,
                ),
              ),
              const Icon(LucideIcons.shieldCheck, color: Colors.white, size: 20),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            '\$33,620.00',
            style: GoogleFonts.inter(
              fontSize: 32,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              const Icon(LucideIcons.trendingUp, color: Colors.white, size: 16),
              const SizedBox(width: 6),
              Text(
                '+4.8% this month',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        _buildActionItem(
          context,
          icon: LucideIcons.messageSquare,
          label: 'AI Chat',
          route: '/chat',
          color: AppColors.primary,
        ),
        _buildActionItem(
          context,
          icon: LucideIcons.zap,
          label: 'HFT Trading',
          route: '/trading',
          color: AppColors.warning,
        ),
        _buildActionItem(
          context,
          icon: LucideIcons.wallet,
          label: 'Wallet',
          route: '/wallet',
          color: AppColors.accent,
        ),
      ],
    );
  }

  Widget _buildActionItem(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String route,
    required Color color,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: () => Navigator.pushNamed(context, route),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 4),
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: AppColors.bgSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.glassBorder),
          ),
          child: Column(
            children: [
              Icon(icon, color: color, size: 24),
              const SizedBox(height: 8),
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSpendingChartSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.bgSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Spending Breakdown',
            style: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 140,
            child: Row(
              children: [
                Expanded(
                  flex: 2,
                  child: PieChart(
                    PieChartData(
                      pieTouchData: PieTouchData(
                        touchCallback: (FlTouchEvent event, pieTouchResponse) {
                          setState(() {
                            if (!event.isInterestedForInteractions ||
                                pieTouchResponse == null ||
                                pieTouchResponse.touchedSection == null) {
                              _touchedIndex = -1;
                              return;
                            }
                            _touchedIndex = pieTouchResponse.touchedSection!.touchedSectionIndex;
                          });
                        },
                      ),
                      sectionsSpace: 4,
                      centerSpaceRadius: 40,
                      sections: [
                        _buildPieSection(0, 40, 'Dining & Food', AppColors.primary),
                        _buildPieSection(1, 30, 'Investments', AppColors.accent),
                        _buildPieSection(2, 20, 'Utilities', AppColors.warning),
                        _buildPieSection(3, 10, 'Other', AppColors.danger),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  flex: 3,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildChartLegend(AppColors.primary, 'Dining & Food', 0),
                      const SizedBox(height: 8),
                      _buildChartLegend(AppColors.accent, 'Investments', 1),
                      const SizedBox(height: 8),
                      _buildChartLegend(AppColors.warning, 'Utilities', 2),
                      const SizedBox(height: 8),
                      _buildChartLegend(AppColors.danger, 'Other', 3),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  PieChartSectionData _buildPieSection(int index, double value, String title, Color color) {
    final isTouched = index == _touchedIndex;
    final double radius = isTouched ? 26 : 18;
    final double fontSize = isTouched ? 13 : 11;
    final fontWeight = isTouched ? FontWeight.extrabold : FontWeight.bold;

    return PieChartSectionData(
      color: color,
      value: value,
      title: '${value.toInt()}%',
      radius: radius,
      titleStyle: GoogleFonts.inter(
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: Colors.white,
      ),
    );
  }

  Widget _buildChartLegend(Color color, String label, int index) {
    final isTouched = index == _touchedIndex;
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: isTouched ? 13 : 12,
            fontWeight: isTouched ? FontWeight.extrabold : FontWeight.w500,
            color: isTouched ? Colors.white : AppColors.textSecondary,
          ),
        ),
      ],
    );
  }

  Widget _buildBudgetAlertsSection() {
    final double diningSpent = _budgetDining['spentMinor'] != null
        ? (_budgetDining['spentMinor'] as num).toDouble() / 100.0
        : 182.40;
    final double diningLimit = _budgetDining['limitMinor'] != null && (_budgetDining['limitMinor'] as num) > 0
        ? (_budgetDining['limitMinor'] as num).toDouble() / 100.0
        : 1400.00;

    final double transportSpent = _budgetTransport['spentMinor'] != null
        ? (_budgetTransport['spentMinor'] as num).toDouble() / 100.0
        : 23.50;
    final double transportLimit = _budgetTransport['limitMinor'] != null && (_budgetTransport['limitMinor'] as num) > 0
        ? (_budgetTransport['limitMinor'] as num).toDouble() / 100.0
        : 200.00;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.bgSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Budget Status',
            style: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          _buildBudgetProgress('Dining & Restaurants', current: diningSpent, limit: diningLimit, color: AppColors.accent),
          const SizedBox(height: 16),
          _buildBudgetProgress('Transport & Commute', current: transportSpent, limit: transportLimit, color: AppColors.primary),
        ],
      ),
    );
  }

  Widget _buildBudgetProgress(String category, {required double current, required double limit, required Color color}) {
    final pct = current / limit;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              category,
              style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
            ),
            Text(
              '\$${current.toStringAsFixed(2)} / \$${limit.toStringAsFixed(2)}',
              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: pct,
            backgroundColor: AppColors.bgBase,
            valueColor: AlwaysStoppedAnimation<Color>(color),
            minHeight: 6,
          ),
        ),
      ],
    );
  }

  Widget _buildRecentTransactionsSection() {
    final List<Map<String, dynamic>> displayTxs;
    if (_transactions.isNotEmpty) {
      displayTxs = _transactions.map((tx) {
        final String name = tx['merchantName'] ?? tx['source'] ?? 'Transaction';
        final String category = tx['category'] ?? 'Finance';
        final double amount = (tx['amountMinor'] is num
            ? (tx['amountMinor'] as num).toDouble()
            : double.tryParse(tx['amountMinor'].toString()) ?? 0.0) / 100.0;
        final bool isDebit = tx['transactionType'] == 'DEBIT';

        IconData icon = LucideIcons.dollarSign;
        Color color = AppColors.primary;
        if (!isDebit) {
          icon = LucideIcons.trendingUp;
          color = AppColors.accent;
        } else if (category.toLowerCase().contains('grocer') || category.toLowerCase().contains('food')) {
          icon = LucideIcons.shoppingCart;
          color = AppColors.primary;
        } else if (category.toLowerCase().contains('dining') || name.toLowerCase().contains('nobu') || name.toLowerCase().contains('restaurant')) {
          icon = LucideIcons.utensils;
          color = AppColors.accent;
        } else if (category.toLowerCase().contains('transport') || category.toLowerCase().contains('commute') || name.toLowerCase().contains('uber')) {
          icon = LucideIcons.car;
          color = AppColors.warning;
        }

        return {
          'name': name,
          'desc': category,
          'amount': isDebit ? -amount : amount,
          'icon': icon,
          'color': color,
        };
      }).toList();
    } else {
      displayTxs = [
        {'name': 'Whole Foods Market', 'desc': 'Groceries', 'amount': -84.32, 'icon': LucideIcons.shoppingCart, 'color': AppColors.primary},
        {'name': 'Uber Ride', 'desc': 'Transport', 'amount': -23.50, 'icon': LucideIcons.car, 'color': AppColors.warning},
        {'name': 'Salary — Acme Corp', 'desc': 'Income', 'amount': 8500.00, 'icon': LucideIcons.trendingUp, 'color': AppColors.accent},
        {'name': 'Nobu Restaurant', 'desc': 'Dining', 'amount': -182.40, 'icon': LucideIcons.utensils, 'color': AppColors.accent},
      ];
    }

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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Recent Transactions',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              Text(
                'See All',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: displayTxs.length,
            separatorBuilder: (context, index) => Divider(color: AppColors.glassBorder, height: 16),
            itemBuilder: (context, index) {
              final tx = displayTxs[index];
              final amount = tx['amount'] as double;
              final isDebit = amount < 0;

              return Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0x1F3B82F6),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(tx['icon'] as IconData, color: tx['color'] as Color, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          tx['name'] as String,
                          style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          tx['desc'] as String,
                          style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    '${isDebit ? '-' : '+'}\$${amount.abs().toStringAsFixed(2)}',
                    style: GoogleFonts.inter(
                      fontSize: 14,
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
}
