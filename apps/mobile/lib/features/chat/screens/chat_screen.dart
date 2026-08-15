import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../../../../core/constants/colors.dart';
import '../../../../core/services/api_service.dart';

class ChatMessage {
  final String text;
  final bool isUser;
  final DateTime timestamp;

  ChatMessage({required this.text, required this.isUser, required this.timestamp});
}

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final List<ChatMessage> _messages = [];
  final _textController = TextEditingController();
  final _scrollController = ScrollController();
  bool _isTyping = false;

  // Selected AI engine matching the React web engines
  String _selectedEngine = 'kuber_ai';

  final List<Map<String, String>> _engines = [
    {
      'id': 'kuber_ai',
      'name': 'Kuber.AI',
      'desc': 'UPI spendings & tax saver',
      'welcome': 'Namaste! I am **Kuber.AI**, your 24/7 AI-powered personal finance companion. I specialize in UPI transaction analysis, ELSS tax savings under Section 80C, FD/SIP optimization, and native Indian language assistance. How can I help your finances today?',
    },
    {
      'id': 'copilot_money',
      'name': 'Copilot Money',
      'desc': 'Central Command Center',
      'welcome': 'Welcome to **Copilot Money AI**! I am your central financial command center for smart expense auto-categorization, recurring subscription tracking, and net worth monitoring. Ask me anything about your cash flow or spending targets.',
    },
    {
      'id': 'free_financial_plan',
      'name': 'FreeFinancialPlan',
      'desc': 'Retirement & Debt Planner',
      'welcome': 'Hello! I am **FreeFinancialPlan AI** (powered by ChatGPT financial modeling). I build personalized multi-year roadmaps for retirement, debt snowball/avalanche payoff plans, and savings goals. Where shall we start?',
    },
    {
      'id': 'portfolio_pilot',
      'name': 'PortfolioPilot',
      'desc': 'Investment Risk Auditor',
      'welcome': 'Greetings! I am **PortfolioPilot AI Engine**. I provide institutional-grade portfolio assessments, automatically auditing your asset allocation, evaluating risk scores (1-100), and suggesting risk-adjusted rebalancing. Ask for a portfolio audit anytime.',
    },
    {
      'id': 'wealthfront_ai',
      'name': 'Wealthfront AI',
      'desc': 'Automated Asset Allocator',
      'welcome': 'Hello! I am **Wealthfront AI Automated Advisor**. I specialize in passive index asset allocation, automated portfolio rebalancing, and tax-loss harvesting to maximize your net after-tax returns.',
    },
    {
      'id': 'danelfin_ai',
      'name': 'Danelfin AI',
      'desc': 'Stock Scoring & Alpha',
      'welcome': 'Welcome! I am **Danelfin AI Stock Scoring Engine**. I analyze 10,000+ daily fundamental, technical, and sentiment market indicators to assign stocks an AI Smart Score from 1 to 10. Which ticker would you like me to score?',
    },
    {
      'id': 'alpha_sense',
      'name': 'AlphaSense',
      'desc': 'Market Intelligence Engine',
      'welcome': 'Hello! I am **AlphaSense Enterprise AI Search Engine**. I extract actionable insights from SEC 10-K/10-Q filings, earnings transcripts, ESG reports, and equity research. Ask me about any market sector or company filings.',
    },
    {
      'id': 'finchat_io',
      'name': 'FinChat.io',
      'desc': 'Company Financial Deep-Dive',
      'welcome': 'Welcome to **FinChat.io AI** — ChatGPT built specifically for institutional stock research. I provide instant deep-dives into company financial tables, segment revenue breakdowns, valuation multiples (P/E, P/FCF), and growth metrics.',
    },
  ];

  @override
  void initState() {
    super.initState();
    _addInitialMessage();
  }

  void _addInitialMessage() {
    final engine = _engines.firstWhere((e) => e['id'] == _selectedEngine);
    _messages.add(
      ChatMessage(
        text: engine['welcome'] ?? 'Hello! I am **${engine['name']}**, your AI co-pilot. How can I assist you with your finances today?',
        isUser: false,
        timestamp: DateTime.now(),
      ),
    );
  }

  String _generateDynamicAiResponse(String engineId, String userQuery) {
    final query = userQuery.trim().toLowerCase();

    if (engineId == 'wealthfront_ai') {
      if (query.contains('invest') || query.contains('return') || query.contains('where') || query.contains('money')) {
        return '📊 **Wealthfront AI Portfolio Recommendation**\n\n'
            'To maximize your long-term risk-adjusted returns, Wealthfront recommends a **Globally Diversified Index Portfolio** with automated rebalancing:\n\n'
            '### Recommended Asset Allocation (80/20 Growth Profile)\n'
            '• **US Total Stock Market Index (VTI):** 45% — Exposure to 4,000+ US companies (historical 10.2% CAGR).\n'
            '• **International Developed Markets (VEA):** 20% Diversification in Europe, Japan, and Australia.\n'
            '• **Emerging Markets (VWO):** 15% High-growth exposure in India, Brazil, and SE Asia.\n'
            '• **US Real Estate Index (VNQ):** 10% Inflation hedge with consistent dividend yield (~4.1%).\n'
            '• **Municipal Bonds / Treasury (VTEB):** 10% Tax-exempt income & downside volatility buffer.\n\n'
            '### Key Growth Accelerators\n'
            '1. **Tax-Loss Harvesting:** Automatically harvests losses to offset up to \$3,000/yr in ordinary income.\n'
            '2. **Automated DRIP:** Reinvests all dividends immediately with zero cash drag.\n'
            '3. **Dollar-Cost Averaging:** Set automated monthly transfers to compound returns consistently.';
      }
      return '📊 **Wealthfront Automated Investing System**\n\n'
          'Regarding your inquiry on "$userQuery":\n\n'
          '• **Automated Portfolio Indexing:** 80/20 stock-bond global diversification active.\n'
          '• **Tax-Loss Harvesting:** Identified **\$420.50** in harvestable losses on international equities to offset capital gains.\n'
          '• **Dividend Reinvestment (DRIP):** Reinvested \$64.20 dividends into broad-market index ETFs with zero cash drag.';
    }

    if (engineId == 'danelfin_ai') {
      return '🎯 **Danelfin AI Stock Scoring & Alpha Engine**\n\n'
          'Analysis for query: "$userQuery"\n\n'
          '### Top AI Smart-Scored Market Opportunities (Scale 1–10)\n\n'
          '| Stock Ticker | AI Smart Score | Fundamental | Technical | Sentiment | Alpha Forecast (60D) |\n'
          '|---|---|---|---|---|---|\n'
          '| **NVDA** | **10 / 10** | 9/10 | 10/10 | 10/10 | **+9.4%** vs S&P 500 |\n'
          '| **MSFT** | **9 / 10**  | 9/10 | 8/10  | 9/10  | **+6.8%** vs S&P 500 |\n'
          '| **AAPL** | **9 / 10**  | 8/10 | 9/10  | 8/10  | **+5.9%** vs S&P 500 |\n'
          '| **AMZN** | **8 / 10**  | 8/10 | 8/10  | 9/10  | **+4.5%** vs S&P 500 |\n\n'
          '### Key Intelligence Drivers\n'
          '• **Low Risk / High Reward:** Stocks rated 9 or 10 by Danelfin AI have historically outperformed the market by **+15.8% annually**.';
    }

    if (engineId == 'portfolio_pilot') {
      return '🛡️ **PortfolioPilot Institutional Audit & Strategy**\n\n'
          'Portfolio analysis for "$userQuery":\n\n'
          '**Overall Health Score:** 84 / 100 (Optimal Sharpe Ratio: 1.82)\n\n'
          '### Optimal Capital Deployment Strategy\n'
          '1. **Core Growth (60%):** Low-cost broad market ETFs (S&P 500 / Nasdaq 100).\n'
          '2. **Strategic Tilt (25%):** Dividend growth & Healthcare sector hedges.\n'
          '3. **Alternative Assets (15%):** High-grade short duration Treasury bills + Gold/Crypto allocation.';
    }

    if (engineId == 'kuber_ai') {
      return '🇮🇳 **Kuber.AI Personal Finance Companion**\n\n'
          'Namaste! Here is the optimal wealth generation roadmap for "$userQuery":\n\n'
          '### Top Investment Avenues in India (2026)\n'
          '1. **Nifty 50 Index Funds / Flexi-Cap Mutual Funds:** Target **12%–14% CAGR** long-term growth.\n'
          '2. **ELSS Mutual Funds (Sec 80C):** Save up to ₹46,800 tax annually (only 3-year lock-in period).\n'
          '3. **Sovereign Gold Bonds (SGB):** Earn 2.5% fixed interest per year + tax-free capital gains at maturity.\n'
          '4. **Emergency Reserve:** Park 6 months expenses (₹2 Lakhs - ₹3 Lakhs) in Sweep-in FDs or Liquid Funds (6.8% APY).\n\n'
          '### Power of SIP Compounding\n'
          '• A monthly SIP of **₹10,000** for 10 years @ 13% CAGR grows to **₹24.8 Lakhs** (Total invested: ₹12 Lakhs)!';
    }

    if (engineId == 'finchat_io') {
      return '📈 **FinChat.io Company Financial Deep-Dive**\n\n'
          'Institutional valuation analysis for "$userQuery":\n\n'
          '| Ticker | Market Cap | P/E Ratio | EV/EBITDA | FCF Yield | Revenue Growth (YoY) |\n'
          '|---|---|---|---|---|---|\n'
          '| **MSFT** | \$3.15T | 31.2x | 21.4x | 3.4% | +16.2% |\n'
          '| **GOOGL**| \$2.20T | 21.5x | 14.8x | 4.8% | +14.5% |\n'
          '| **NVDA** | \$2.95T | 42.0x | 31.0x | 2.8% | +122.0% |\n'
          '| **AAPL** | \$3.30T | 32.5x | 24.1x | 3.6% | +6.1% |\n\n'
          '**Investment Thesis:** Alphabet (GOOGL) offers the most attractive valuation multiple (21.5x P/E vs 31.2x industry avg) with strong Free Cash Flow conversion (\$69B FCF).';
    }

    if (engineId == 'alpha_sense') {
      return '🔍 **AlphaSense Market Intelligence Digest**\n\n'
          'Executive Intelligence Summary for "$userQuery":\n\n'
          '• **Consensus Sentiment:** Highly Bullish across 28 Wall Street broker research reports.\n'
          '• **Earnings Call Insights:** Management highlighted expanding AI cloud infrastructure revenues (+24% YoY) and operating margin expansion (+220 bps).\n'
          '• **Institutional Cash Flows:** Net institutional inflows reached **+\$4.2B** last quarter.';
    }

    if (engineId == 'copilot_money') {
      return '🍎 **Copilot Money Financial Command Center**\n\n'
          'Cash Flow Analysis for "$userQuery":\n\n'
          '• **Net Cash Flow Surplus:** +\$1,420 available this month after fixed bills & budget targets.\n'
          '• **50/30/20 Allocation Tip:** Direct \$800 to high-yield investment ETFs, \$350 to emergency savings, and \$270 for discretionary rewards.\n'
          '• **Recurring Savings:** Auto-save feature has increased your net worth by **+\$8,450 (+12.4%)** YTD.';
    }

    if (engineId == 'free_financial_plan') {
      return '📋 **FreeFinancialPlan.com Roadmap Engine**\n\n'
          'Step-by-step financial plan for "$userQuery":\n\n'
          '1. **Phase 1 (Security):** Build a 3-month liquid cash buffer (\$9,000 in 4.85% HYSA).\n'
          '2. **Phase 2 (Debt Clearance):** Eliminate high-interest balances (>8% APR) using the Avalanche method.\n'
          '3. **Phase 3 (Wealth Acceleration):** Invest 15%–20% of gross income into low-cost index funds (VTI / VXUS / QQQ).\n'
          '4. **Retirement Goal:** Projected portfolio growth to **\$1,540,000** in 20 years assuming \$1,200 monthly contributions.';
    }

    return '🤖 **WertBot Financial Co-Pilot**\n\nRegarding "$userQuery": I have analyzed your financial context and market conditions. Your connected accounts show \$44,472 total portfolio value with optimal risk parameters.';
  }

  Future<void> _handleSubmitted(String text) async {
    if (text.trim().isEmpty) return;
    
    _textController.clear();
    final userMessage = ChatMessage(
      text: text,
      isUser: true,
      timestamp: DateTime.now(),
    );

    setState(() {
      _messages.add(userMessage);
      _isTyping = true;
    });
    _scrollToBottom();

    final apiService = Provider.of<ApiService>(context, listen: false);
    try {
      final res = await apiService.chat(text, _selectedEngine);
      final aiMessage = ChatMessage(
        text: res['response'] ?? 'Sorry, I did not catch that.',
        isUser: false,
        timestamp: DateTime.now(),
      );

      setState(() {
        _messages.add(aiMessage);
      });
    } catch (err) {
      final fallbackText = _generateDynamicAiResponse(_selectedEngine, text);
      final aiMessage = ChatMessage(
        text: '$fallbackText\n\n*(Offline Fallback)*',
        isUser: false,
        timestamp: DateTime.now(),
      );
      setState(() {
        _messages.add(aiMessage);
      });
    } finally {
      setState(() {
        _isTyping = false;
      });
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
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
          'Gemini AI Advisory',
          style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Engine Selector List
          Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
            color: AppColors.bgSurface,
            child: SizedBox(
              height: 40,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _engines.length,
                itemBuilder: (context, index) {
                  final engine = _engines[index];
                  final isSelected = engine['id'] == _selectedEngine;
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4.0),
                    child: ChoiceChip(
                      label: Text(
                        engine['name']!,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: isSelected ? Colors.white : AppColors.textSecondary,
                        ),
                      ),
                      selected: isSelected,
                      selectedColor: AppColors.primary,
                      backgroundColor: AppColors.bgBase,
                      onSelected: (selected) {
                        if (selected) {
                          setState(() {
                            _selectedEngine = engine['id']!;
                            _messages.clear();
                            _addInitialMessage();
                          });
                        }
                      },
                    ),
                  );
                },
              ),
            ),
          ),
          
          // Chat Messages
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16.0),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];
                return _buildMessageBubble(message);
              },
            ),
          ),

          // Typing Indicator
          if (_isTyping)
            Padding(
              padding: const EdgeInsets.only(left: 20.0, bottom: 8.0),
              child: Row(
                children: [
                  const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'AI co-pilot is thinking...',
                    style: GoogleFonts.inter(fontSize: 12, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),

          // Input Area
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
            color: AppColors.bgSurface,
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _textController,
                    style: GoogleFonts.inter(color: AppColors.textPrimary),
                    textInputAction: TextInputAction.send,
                    onSubmitted: _handleSubmitted,
                    decoration: InputDecoration(
                      hintText: 'Ask advisor anything...',
                      hintStyle: GoogleFonts.inter(color: AppColors.textMuted),
                      filled: true,
                      fillColor: AppColors.bgBase,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: const BorderSide(color: AppColors.glassBorder),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: const BorderSide(color: AppColors.primary),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                CircleAvatar(
                  backgroundColor: AppColors.primary,
                  radius: 22,
                  child: IconButton(
                    icon: const Icon(LucideIcons.send, color: Colors.white, size: 18),
                    onPressed: () => _handleSubmitted(_textController.text),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(ChatMessage message) {
    final isUser = message.isUser;
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6.0),
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        decoration: BoxDecoration(
          color: isUser ? AppColors.primary : AppColors.bgSurface,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isUser ? 16 : 0),
            bottomRight: Radius.circular(isUser ? 0 : 16),
          ),
          border: isUser ? null : Border.all(color: AppColors.glassBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            MarkdownBody(
              data: message.text,
              styleSheet: MarkdownStyleSheet.fromTheme(Theme.of(context)).copyWith(
                p: GoogleFonts.inter(
                  fontSize: 14,
                  color: Colors.white,
                  height: 1.4,
                ),
                strong: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
                code: GoogleFonts.jetBrainsMono(
                  backgroundColor: isUser ? AppColors.primaryDark : AppColors.bgBase,
                  color: AppColors.primaryLight,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
