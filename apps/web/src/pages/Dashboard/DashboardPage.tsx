import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, CreditCard, Bell, ArrowUpRight, Wallet } from 'lucide-react';
import { apiClient, friendlyError } from '../../services/api';
import { toast } from 'react-hot-toast';
import { SkeletonMetricCard, SkeletonTransactionRow, SkeletonCard } from '../../components/SkeletonCard';
import { EmptyState } from '../../components/EmptyState';

// ── Design Tokens ────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  dining: '#ff5722',
  groceries: '#00d09c',
  transport: '#ffb000',
  shopping: '#848e9c',
  health: '#00b57a',
  subscriptions: '#f6465d',
  other: '#5d6675',
};

const CATEGORY_ICONS: Record<string, string> = {
  dining: '🍜',
  groceries: '🛒',
  transport: '🚗',
  shopping: '🛍️',
  health: '🏥',
  subscriptions: '📺',
  income: '💼',
  other: '💸',
};

// NET_WORTH_HISTORY is now computed from real transactions (see netWorthHistory memo below)
// Static fallback used only when no transactions are available yet
const FALLBACK_NET_WORTH = [
  { month: 'Jan', value: 48200 },
  { month: 'Feb', value: 51000 },
  { month: 'Mar', value: 49800 },
  { month: 'Apr', value: 54300 },
  { month: 'May', value: 58900 },
  { month: 'Jun', value: 61200 },
];

const MetricCard = ({
  title, value, change, icon: Icon, gradient, prefix = '$',
}: {
  title: string; value: string | number; change?: number;
  icon: React.ElementType; gradient: string; prefix?: string;
}) => (
  <div className="metric-card" style={{ flex: 1 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          {title}
        </p>
        <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          {prefix}{typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : value}
        </div>
        {change !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.4rem' }}>
            {change >= 0
              ? <TrendingUp size={14} color="var(--color-accent)" />
              : <TrendingDown size={14} color="var(--color-danger)" />
            }
            <span className={change >= 0 ? 'value-positive' : 'value-negative'} style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              {change >= 0 ? '+' : ''}{change}% this month
            </span>
          </div>
        )}
      </div>
      <div style={{
        width: 44, height: 44, borderRadius: 'var(--radius-lg)',
        background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={20} color="white" />
      </div>
    </div>
  </div>
);

export function DashboardPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [cardRecs, setCardRecs] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        // 1. Fetch transactions
        const txRes = await apiClient.get('/transactions');
        const txList = txRes.data.data.transactions || [];
        setTransactions(txList);

        // 2. Fetch budgets for top categories
        const categories = ['dining', 'shopping', 'transport'];
        const budgetList = await Promise.all(
          categories.map(async (cat) => {
            try {
              const res = await apiClient.get(`/transactions/budget-status?category=${cat}`);
              const status = res.data.data;
              return {
                category: cat.charAt(0).toUpperCase() + cat.slice(1),
                spent: Number(status.spentMinor) / 100,
                budget: Number(status.limitMinor) / 100,
                percent: Math.round(status.spentPercent),
                aiSuggestion: status.aiSuggestion,
              };
            } catch {
              return {
                category: cat.charAt(0).toUpperCase() + cat.slice(1),
                spent: 0,
                budget: 0,
                percent: 0,
                aiSuggestion: 'No budget configured.',
              };
            }
          })
        );
        setBudgets(budgetList);

        // 3. Fetch card recommendations for top transactions with MCC
        const recs: Record<string, string> = {};
        for (const tx of txList.slice(0, 5)) {
          if (tx.merchantMcc && !recs[tx.merchantMcc]) {
            try {
              const recRes = await apiClient.get(
                `/transactions/card-recommendation?merchantMcc=${tx.merchantMcc}&amountMinor=${tx.amountMinor}&currency=${tx.currency}`
              );
              recs[tx.merchantMcc] = recRes.data.data.cardName;
            } catch {
              // Ignore failure and use static recommendations
            }
          }
        }
        setCardRecs(recs);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        toast.error(friendlyError(err));
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // ── Live net worth history from real transactions ────────────────────────────
  const netWorthHistory = useMemo(() => {
    if (transactions.length === 0) return FALLBACK_NET_WORTH;
    const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    // Group net flow (credits - debits) by month
    const monthMap: Record<string, number> = {};
    transactions.forEach((tx: any) => {
      const d = new Date(Number(tx.transactionDate));
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
      const amount = Number(tx.amountMinor) / 100;
      const delta = tx.type.toLowerCase() === 'credit' ? amount : -amount;
      monthMap[key] = (monthMap[key] || 0) + delta;
    });
    // Sort months and build cumulative net worth (start from a base)
    const sorted = Object.keys(monthMap).sort();
    let running = 40000; // base starting value
    return sorted.slice(-6).map((key) => {
      const [year, monthIdx] = key.split('-');
      running += monthMap[key];
      return { month: MONTH_LABELS[parseInt(monthIdx)], value: Math.max(0, Math.round(running)) };
    });
  }, [transactions]);

  // ── Aggregation Logic ──────────────────────────────────────────────────────
  let monthlySpending = 0;
  let monthlyIncome = 0;
  const categoryMap: Record<string, number> = {};

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  transactions.forEach((tx) => {
    const txDate = new Date(Number(tx.transactionDate));
    const amount = Number(tx.amountMinor) / 100;

    // Aggregate values for the current month
    if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
      if (tx.type.toLowerCase() === 'debit') {
        monthlySpending += amount;
      } else if (tx.type.toLowerCase() === 'credit') {
        monthlyIncome += amount;
      }
    }

    // Category breakdown for debits
    if (tx.type.toLowerCase() === 'debit') {
      const cat = (tx.category || 'other').toLowerCase();
      categoryMap[cat] = (categoryMap[cat] || 0) + amount;
    }
  });

  const pieData = Object.entries(categoryMap).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: Math.round(value),
    color: CATEGORY_COLORS[name] || CATEGORY_COLORS.other,
  }));

  const displayPieData = pieData.length > 0 ? pieData : [
    { name: 'No Expenses', value: 1, color: 'var(--bg-border)' }
  ];

  // Dynamic Net Worth calculation using $64,750 baseline
  const computedNetWorth = 64750 + (monthlyIncome - monthlySpending);

  // Generate Net Worth history chart — live from real transactions + current month
  const chartData = [
    ...netWorthHistory,
    { month: today.toLocaleString('en-US', { month: 'short' }), value: Math.round(computedNetWorth) }
  ];


  // AI Tip suggestion based on budgets
  const activeBudgetAlert = budgets.find((b) => b.percent >= 80);
  const aiSuggestionTip = activeBudgetAlert
    ? `💡 AI Suggestion: ${activeBudgetAlert.aiSuggestion}`
    : "💡 AI Tip: Use your Amex Gold card at groceries for 4x points to optimize cash back.";

  return (
    <div className="animate-fade-in">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Financial Dashboard</h1>
          <p style={{ fontSize: '0.875rem', marginBottom: 0 }}>
            Welcome back! Here's your financial snapshot as of {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost btn-sm" id="notifications-btn">
            <Bell size={16} />
            <span className="badge badge-danger" style={{ padding: '1px 5px' }}>{budgets.filter(b => b.percent >= 80).length}</span>
          </button>
          <button className="btn btn-primary btn-sm" id="connect-bank-btn">
            + Connect Bank
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-fadeInUp">
          {/* Skeleton metric cards */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <SkeletonMetricCard /><SkeletonMetricCard /><SkeletonMetricCard /><SkeletonMetricCard />
          </div>
          {/* Skeleton chart area */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <SkeletonCard lines={6} style={{ height: 280 }} />
            <SkeletonCard lines={5} style={{ height: 280 }} />
          </div>
          {/* Skeleton bottom row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Array.from({length:5}).map((_,i) => <SkeletonTransactionRow key={i} />)}
            </div>
            <SkeletonCard lines={6} />
          </div>
        </div>
      ) : (
        <>
          {/* ── Metric Cards ────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <MetricCard title="Net Worth"         value={computedNetWorth}   change={+4.8} icon={TrendingUp} gradient="var(--gradient-primary)" />
            <MetricCard title="Monthly Spending"  value={monthlySpending}    change={-1.2} icon={Wallet}     gradient="var(--gradient-accent)" />
            <MetricCard title="Monthly Income"    value={monthlyIncome}    icon={ArrowUpRight} gradient="var(--gradient-gold)" />
            <MetricCard title="Cards Saved"       value="$247"    icon={CreditCard}   gradient="linear-gradient(135deg, hsl(258, 80%, 65%), hsl(217, 91%, 60%))" prefix="" />
          </div>

          {/* ── Charts Row ──────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Net Worth Chart */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Net Worth</h3>
                  <p style={{ fontSize: '0.8rem', marginBottom: 0 }}>7-month history</p>
                </div>
                <span className="badge badge-success">+34.3% YTD</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00d09c" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00d09c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#212630" />
                  <XAxis dataKey="month" tick={{ fill: '#848e9c', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#848e9c', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: any) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: '#181c23', border: '1px solid #212630', borderRadius: 4, color: '#f0f3f8' }}
                    formatter={(v: number) => [`$${v.toLocaleString()}`, 'Net Worth']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#00d09c" strokeWidth={2} fill="url(#netWorthGradient)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Spending by Category */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>Spending Breakdown</h3>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={displayPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" strokeWidth={0}>
                    {displayPieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} opacity={hoveredCategory === null || hoveredCategory === entry.name ? 1 : 0.4} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#181c23', border: '1px solid #212630', borderRadius: 4, color: '#f0f3f8' }} formatter={(v: number) => [`$${v}`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                {pieData.map((cat) => (
                  <div key={cat.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{cat.name}</span>
                    </div>
                    <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>${cat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Bottom Row ──────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Recent Transactions */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem' }}>Recent Transactions</h3>
                <button className="btn btn-ghost btn-sm">View All</button>
              </div>
              {transactions.length === 0 ? (
                <EmptyState
                  icon="🏦"
                  title="No transactions yet"
                  description="Connect your bank account to see your spending, income, and AI-powered insights here."
                  action={{ label: '+ Connect Bank', onClick: () => toast.success('Bank linking coming soon!') }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {transactions.slice(0, 5).map((txn) => {
                    const cardRecommendation = cardRecs[txn.merchantMcc] || txn.aiMetadata?.card_recommendation;
                    const categoryLower = (txn.category || 'other').toLowerCase();
                    const icon = CATEGORY_ICONS[categoryLower] || CATEGORY_ICONS.other;
                    const txDate = new Date(Number(txn.transactionDate));
                    const now = new Date();
                    const diffMs = now.getTime() - txDate.getTime();
                    const diffHrs = diffMs / 36e5;
                    const dateString = diffHrs < 24
                      ? `${Math.round(diffHrs)}h ago`
                      : diffHrs < 48
                        ? 'Yesterday'
                        : txDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                    return (
                      <div key={txn.transactionId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-lg)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                          {icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {txn.merchantName || 'External Transaction'}
                            </span>
                            <span className={`mono ${txn.type.toLowerCase() === 'credit' ? 'value-positive' : 'value-neutral'}`} style={{ fontSize: '0.85rem', fontWeight: 700, flexShrink: 0, marginLeft: '0.5rem' }}>
                              {txn.type.toLowerCase() === 'credit' ? '+' : '-'}${Math.abs(Number(txn.amountMinor) / 100).toFixed(2)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.15rem' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{dateString}</span>
                            {cardRecommendation && (
                              <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>💳 {cardRecommendation}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>


            {/* Budget Status */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem' }}>Budget Status</h3>
                <button className="btn btn-ghost btn-sm">Manage</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {budgets.map((b) => (
                  <div key={b.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{b.category}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>${b.spent.toFixed(2)} / ${b.budget}</span>
                        <span className={`badge ${b.percent >= 90 ? 'badge-danger' : b.percent >= 75 ? 'badge-warning' : 'badge-success'}`}>
                          {b.percent}%
                        </span>
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`progress-fill${b.percent >= 90 ? ' danger' : b.percent >= 75 ? ' warning' : ''}`}
                        style={{ width: `${Math.min(b.percent, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: '1.5rem', padding: '0.75rem 1rem',
                background: 'hsla(142, 76%, 51%, 0.08)',
                border: '1px solid hsla(142, 76%, 51%, 0.15)',
                borderRadius: 'var(--radius-lg)',
              }}>
                <p style={{ fontSize: '0.78rem', marginBottom: 0, color: 'var(--color-accent)', fontWeight: 500 }}>
                  {aiSuggestionTip}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
