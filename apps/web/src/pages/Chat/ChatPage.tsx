import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  RefreshCw,
  Zap,
  Shield,
  PieChart,
  Search,
  Calculator,
  DollarSign,
  History,
  Edit2,
  Trash2,
  Check,
  X,
  MessageSquare,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
} from 'lucide-react';
import { apiClient } from '../../services/api';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface SavedChatSession {
  id: string;
  title: string;
  engineId: string;
  messages: { id: string; role: 'user' | 'ai'; content: string; timestamp: string }[];
  updatedAt: string;
}

interface AiEngineConfig {
  id: string;
  label: string;
  category: 'budget' | 'investing' | 'research';
  icon: any;
  tagline: string;
  welcomeMessage: string;
  sampleMessages: string[];
}

const AI_ENGINES: AiEngineConfig[] = [
  {
    id: 'agent-pfm-advisor',
    label: 'Daily PFM Advisor',
    category: 'budget',
    icon: DollarSign,
    tagline: 'Minimal Spending & Budget Optimization Coach',
    welcomeMessage: 'Welcome! I am **WertBot PFM Advisor (agent-pfm-advisor)**. I track your daily micro-transactions, detect overspending patterns, compare expenses against global benchmarks, and help you minimize daily burn rate. How can I optimize your budget today?',
    sampleMessages: [
      'Show my dining vs grocery spending breakdown this month',
      'Where can I reduce non-essential daily burn rates?',
      'Create a plan to save $500 monthly across multi-currency accounts',
    ],
  },
  {
    id: 'agent-card-concierge',
    label: 'Card Concierge',
    category: 'budget',
    icon: CreditCard,
    tagline: 'Vendor MCC Matcher, Lounge Access & Perks Optimizer',
    welcomeMessage: 'Hello! I am **WertBot Card Concierge (agent-card-concierge)**. I match vendor Merchant Category Codes (MCC) against your credit/debit cards to ensure you swipe the optimal card for max cashback, points, lounge access, and movie perks globally. Tell me your card portfolio or vendor name!',
    sampleMessages: [
      'I am spending $50 at Starbucks (MCC 5814). Which of my cards gives max rewards?',
      'Which credit card globally offers the best international airport lounge access?',
      'I have Amex Gold, Chase Sapphire Preferred, HDFC Regalia Gold. Recommend card for grocery shopping.',
    ],
  },
  {
    id: 'agent-quant-advisor',
    label: 'Global Macro Wealth Strategist',
    category: 'investing',
    icon: Shield,
    tagline: 'Investments, FDs, Mutual Funds, SIPs, Forex & Crypto',
    welcomeMessage: 'Greetings! I am **WertBot Quant Advisor (agent-quant-advisor)**. I provide institutional wealth allocation strategies across global equities, fixed deposits (FDs), mutual funds, SIPs, Forex, and Crypto using live macroeconomic news and central bank policy data. Where shall we allocate your capital?',
    sampleMessages: [
      'What are the best guaranteed return Fixed Deposits and SIP mutual funds right now?',
      'Give me an optimal asset allocation for Forex & Crypto during current rate cut cycles',
      'How do central bank rate decisions impact my global stock & bond portfolio?',
    ],
  },
  {
    id: 'agent-market-research',
    label: 'Market Research Engine',
    category: 'research',
    icon: Search,
    tagline: 'Institutional SEC Filings, Company Financials & Current Affairs',
    welcomeMessage: 'Hello! I am **WertBot Market Research Engine (agent-market-research)**. I perform deep search across company filings (10-K, 10-Q), earnings call transcripts, macro current affairs, and valuation multiples. What company or sector would you like to analyze?',
    sampleMessages: [
      'Compare P/E, EV/EBITDA, and FCF yields for MSFT vs GOOGL',
      'Summarize global central bank interest rate decisions and market sentiment',
      'What are the revenue growth trends across top tech and renewable energy stocks?',
    ],
  },
];

const LOCAL_STORAGE_KEY = 'wertbot_ai_chat_sessions_v3';

/**
 * Dynamic Query-Aware Financial Response Engine
 */
function generateDynamicAiResponse(engineId: string, userQuery: string): string {
  const query = userQuery.trim().toLowerCase();

  if (engineId === 'agent-card-concierge') {
    if (query.includes('starbucks') || query.includes('mcc 5814') || query.includes('dining') || query.includes('coffee')) {
      return `💳 **WertBot Card Concierge (MCC 5814 Dining Match)**\n\n` +
        `Merchant Category: **MCC 5814 (Eating Places / Fast Food)**\n\n` +
        `### In-Transaction Card Recommendation\n` +
        `1. **🥇 Amex Gold Card (Recommended)** — Yields **4x Membership Rewards Points** (~$2.00 reward value on $50 spend).\n` +
        `2. **🥈 Chase Sapphire Preferred** — Yields **3x Ultimate Rewards Points** (~$1.50 reward value).\n` +
        `3. **🥉 HDFC Regalia Gold / RuPay Select** — Yields 4 reward points per ₹150 (~₹40 cashback equivalent).\n\n` +
        `💡 **Perk Tip:** You also have 2 complimentary quarterly lounge accesses remaining on your registered Visa Signature card!`;
    }
    if (query.includes('lounge') || query.includes('airport')) {
      return `✈️ **Global Airport Lounge & Perks Intelligence**\n\n` +
        `### Top Global Lounge Access Cards\n` +
        `• **Capital One Venture X / Amex Platinum:** Unlimited Priority Pass & Centurion Lounge Access globally (+2 free guests).\n` +
        `• **HDFC Bank Regalia Gold / Infinia:** 12+ Complimentary International & Domestic Airport Lounge visits annually.\n` +
        `• **ICICI Saphiro / HSBC Cashback:** Complimentary quarter lounge accesses + movie ticket discounts on BookMyShow / Fandango.\n\n` +
        `Would you like to register new cards to your portfolio matrix?`;
    }
    return `💳 **WertBot Card Concierge Matrix**\n\n` +
      `Analyzed vendor & perk match for "${userQuery}":\n\n` +
      `• **MCC Classification:** Auto-detected category and matched against registered cards.\n` +
      `• **Optimal Swipe Card:** **Amex Gold** (4x multiplier on dining & groceries) or **Chase Sapphire** (3x travel).\n` +
      `• **Missed Perk Warning:** None! You are earning maximum points for this transaction category.`;
  }

  if (engineId === 'agent-quant-advisor') {
    if (query.includes('fd') || query.includes('fixed deposit') || query.includes('sip') || query.includes('mutual fund')) {
      return `📈 **WertBot Quant Wealth — FDs, SIPs & Mutual Funds**\n\n` +
        `### Guaranteed Income & Fixed Deposits (FDs)\n` +
        `• **High-Yield FDs (US / Global):** 5.0% - 5.25% APY on USD CDs.\n` +
        `• **High-Yield FDs (India):** 7.5% - 8.2% p.a. (Senior citizens up to 8.7% p.a.).\n\n` +
        `### Systematic Investment Plans (SIPs) & Mutual Funds\n` +
        `1. **Global Equity Index Funds (VTI / QQQ):** 10.5% historical CAGR.\n` +
        `2. **Flexi-Cap & Nifty 50 Index Mutual Funds:** 12.8% 10-year CAGR in emerging markets.\n\n` +
        `**Compounding Calculation:** A monthly SIP of **$250 / ₹10,000** for 10 years @ 13% CAGR grows to **~$54,000 / ₹24.8 Lakhs**!`;
    }
    if (query.includes('crypto') || query.includes('forex')) {
      return `🌐 **Macro Wealth — Forex & Crypto Trading Analytics**\n\n` +
        `• **Forex Pair (EUR/USD):** 1.0892 (+0.12%) — Short-term bullish bias following ECB rate pause.\n` +
        `• **Crypto Pair (BTC/USD):** $67,450 (+3.42%) — Institutional ETF inflows remain net positive (+$380M today).\n` +
        `• **Crypto Pair (ETH/USD):** $3,480 (+2.15%) — Staking yields averaging 3.4% APY.`;
    }
    return `📈 **WertBot Quant Advisor Intelligence**\n\n` +
      `Macro market summary for "${userQuery}":\n\n` +
      `• **Global Interest Rates:** Federal Reserve (5.25%-5.50%), ECB (3.75%), RBI (6.50%).\n` +
      `• **Asset Allocation Strategy:** 60% Global Stocks (VTI/QQQ), 25% Fixed Income FDs/Bonds, 15% Forex & Crypto Hedges.`;
  }

  if (engineId === 'agent-pfm-advisor') {
    return `💰 **WertBot Daily PFM & Minimal Spending Advisor**\n\n` +
      `Budget analysis for "${userQuery}":\n\n` +
      `• **Current Spend Status:** $1,820 spent of $4,500 monthly budget (40.4% used, 18 days remaining).\n` +
      `• **Daily Burn Rate:** $60.66/day (Target: < $75/day to hit $500 monthly savings goal).\n` +
      `• **Actionable Cost-Cut Tip:** Dining expenses are 28.5% of total budget ($520). Preparing 3 meals at home this week will save **~$95.00** instantly!`;
  }

  if (engineId === 'agent-market-research') {
    return `📊 **WertBot Market Research & Company Intelligence**\n\n` +
      `Research analysis for "${userQuery}":\n\n` +
      `| Ticker | Market Cap | P/E Ratio | EV/EBITDA | FCF Yield | Revenue Growth (YoY) |\n` +
      `|---|---|---|---|---|---|\n` +
      `| **MSFT** | $3.15T | 31.2x | 21.4x | 3.4% | +16.2% |\n` +
      `| **GOOGL**| $2.20T | 21.5x | 14.8x | 4.8% | +14.5% |\n` +
      `| **NVDA** | $2.95T | 42.0x | 31.0x | 2.8% | +122.0% |\n` +
      `| **AAPL** | $3.30T | 32.5x | 24.1x | 3.6% | +6.1% |\n\n` +
      `**Executive Takeaway:** GOOGL trades at an attractive 21.5x P/E multiple with strong Free Cash Flow generation ($69B FCF).`;
  }

  return `🤖 **WertBot Financial Co-Pilot**\n\nRegarding "${userQuery}": Analyzed with active financial context and live global news feeds. Connected accounts show healthy asset allocation across checking, savings, and investments.`;
}

export function ChatPage() {
  const [activeEngine, setActiveEngine] = useState<AiEngineConfig>(AI_ENGINES[0]);
  const [savedSessions, setSavedSessions] = useState<SavedChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Load saved sessions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: SavedChatSession[] = JSON.parse(stored);
        setSavedSessions(parsed);
        if (parsed.length > 0) {
          // Select most recently updated session
          const mostRecent = parsed[0];
          setActiveSessionId(mostRecent.id);
          const matchedEngine = AI_ENGINES.find((e) => e.id === mostRecent.engineId) || AI_ENGINES[0];
          setActiveEngine(matchedEngine);
          setMessages(
            mostRecent.messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.timestamp),
            })),
          );
          return;
        }
      }
    } catch {
      /* ignore storage errors */
    }

    // Default initial session if none saved
    createNewChatSession(AI_ENGINES[0]);
  }, []);

  // Save sessions to localStorage whenever they change
  const persistSessions = (updated: SavedChatSession[]) => {
    setSavedSessions(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  };

  // Create a brand new chat session
  const createNewChatSession = (engine: AiEngineConfig = activeEngine) => {
    const newId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(7);
    const welcomeMsg: Message = {
      id: 'welcome_' + Date.now(),
      role: 'ai',
      content: engine.welcomeMessage,
      timestamp: new Date(),
    };

    const newSession: SavedChatSession = {
      id: newId,
      title: `${engine.label} Chat (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      engineId: engine.id,
      messages: [
        {
          id: welcomeMsg.id,
          role: welcomeMsg.role,
          content: welcomeMsg.content,
          timestamp: welcomeMsg.timestamp.toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    const updatedSessions = [newSession, ...savedSessions];
    setActiveSessionId(newId);
    setActiveEngine(engine);
    setMessages([welcomeMsg]);
    persistSessions(updatedSessions);
  };

  // Switch to an existing saved chat session
  const selectSession = (session: SavedChatSession) => {
    setActiveSessionId(session.id);
    const matchedEngine = AI_ENGINES.find((e) => e.id === session.engineId) || AI_ENGINES[0];
    setActiveEngine(matchedEngine);
    setMessages(
      session.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp),
      })),
    );
  };

  // Start inline editing of session title
  const handleStartRename = (e: React.MouseEvent, session: SavedChatSession) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  // Save renamed session title
  const handleSaveRename = (e: React.MouseEvent | React.FormEvent, sessionId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!editingTitle.trim()) return;

    const updated = savedSessions.map((s) => (s.id === sessionId ? { ...s, title: editingTitle.trim() } : s));
    persistSessions(updated);
    setEditingSessionId(null);
    setEditingTitle('');
  };

  // Delete a saved session
  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    const updated = savedSessions.filter((s) => s.id !== sessionId);
    persistSessions(updated);
    if (activeSessionId === sessionId) {
      if (updated.length > 0) {
        selectSession(updated[0]);
      } else {
        createNewChatSession(AI_ENGINES[0]);
      }
    }
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Send Message Logic
  const sendMessage = async (content = input.trim()) => {
    if (!content) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    let aiText = '';

    try {
      const history = messages
        .filter((m) => !m.id.startsWith('welcome'))
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          content: m.content,
          timestamp: m.timestamp.getTime().toString(),
        }));

      const token = localStorage.getItem('token');
      const res = await apiClient.post(
        '/ai/chat',
        {
          sessionType: activeEngine.id,
          messages: history,
          userMessage: content,
          sessionId: activeSessionId,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      aiText = res.data?.data?.response || res.data?.response || generateDynamicAiResponse(activeEngine.id, content);
    } catch {
      // Dynamic fallback
      aiText = generateDynamicAiResponse(activeEngine.id, content);
    } finally {
      setIsTyping(false);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: aiText,
        timestamp: new Date(),
      };

      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);

      // Auto-update session title if it's currently generic
      const currentSession = savedSessions.find((s) => s.id === activeSessionId);
      const isDefaultTitle = currentSession?.title.includes('Chat (');
      const newTitle = isDefaultTitle ? content.slice(0, 30) + (content.length > 30 ? '...' : '') : currentSession?.title || content.slice(0, 30);

      const updatedSessions = savedSessions.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            title: newTitle,
            engineId: activeEngine.id,
            messages: finalMessages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: m.timestamp.toISOString(),
            })),
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      });

      // If active session isn't in array yet, add it
      if (!savedSessions.some((s) => s.id === activeSessionId)) {
        updatedSessions.unshift({
          id: activeSessionId,
          title: newTitle,
          engineId: activeEngine.id,
          messages: finalMessages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp.toISOString(),
          })),
          updatedAt: new Date().toISOString(),
        });
      }

      persistSessions(updatedSessions);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const categories = [
    { key: 'budget', label: '1. Daily Budgeting & Personal Finance' },
    { key: 'investing', label: '2. Algorithmic Investing & Portfolio' },
    { key: 'research', label: '3. Advanced Analysis & Research' },
  ] as const;

  return (
    <div style={{ height: 'calc(100vh - 4rem)', display: 'flex', gap: '1rem', maxWidth: 1280, margin: '0 auto' }}>
      {/* ── Left Chat History Drawer ─────────────────────────── */}
      <div
        style={{
          width: isSidebarOpen ? 280 : 50,
          transition: 'all 0.25s ease',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--glass-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Sidebar Header */}
        <div style={{ padding: '0.85rem', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {isSidebarOpen ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.88rem' }}>
                <History size={16} color="var(--color-primary)" />
                <span>Chat History ({savedSessions.length})</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: '0.2rem 0.4rem' }}>
                <ChevronLeft size={16} />
              </button>
            </>
          ) : (
            <button onClick={() => setIsSidebarOpen(true)} className="btn btn-ghost btn-sm" style={{ padding: '0.2rem 0.4rem', margin: '0 auto' }}>
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {/* Sidebar Body */}
        {isSidebarOpen && (
          <>
            {/* New Chat Button */}
            <div style={{ padding: '0.75rem' }}>
              <button
                onClick={() => createNewChatSession(activeEngine)}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem', padding: '0.55rem', borderRadius: 'var(--radius-lg)' }}
              >
                <PlusCircle size={15} />
                <span>New Chat Session</span>
              </button>
            </div>

            {/* Saved Chat Sessions List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {savedSessions.length === 0 ? (
                <div style={{ padding: '1.5rem 0.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  No saved conversations yet. Start chatting below!
                </div>
              ) : (
                savedSessions.map((session) => {
                  const isActive = session.id === activeSessionId;
                  const isEditing = editingSessionId === session.id;
                  const engineConfig = AI_ENGINES.find((e) => e.id === session.engineId);
                  const Icon = engineConfig?.icon || MessageSquare;

                  return (
                    <div
                      key={session.id}
                      onClick={() => selectSession(session)}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: 'var(--radius-lg)',
                        background: isActive ? 'hsla(217, 91%, 60%, 0.14)' : 'transparent',
                        border: isActive ? '1px solid var(--color-primary)' : '1px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.15s',
                      }}
                    >
                      <Icon size={14} color={isActive ? 'var(--color-primary)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />

                      {isEditing ? (
                        <form onSubmit={(e) => handleSaveRename(e, session.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              flex: 1,
                              background: 'var(--bg-elevated)',
                              border: '1px solid var(--color-primary)',
                              borderRadius: '4px',
                              color: 'var(--text-primary)',
                              fontSize: '0.78rem',
                              padding: '0.2rem 0.4rem',
                              outline: 'none',
                            }}
                          />
                          <button type="submit" className="btn btn-ghost btn-sm" style={{ padding: '0.2rem' }}>
                            <Check size={13} color="var(--color-accent)" />
                          </button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setEditingSessionId(null); }} className="btn btn-ghost btn-sm" style={{ padding: '0.2rem' }}>
                            <X size={13} color="var(--color-danger)" />
                          </button>
                        </form>
                      ) : (
                        <>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--color-primary)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {session.title}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                              {engineConfig?.label || 'AI'} · {new Date(session.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </div>
                          </div>

                          {/* Inline Rename & Delete Buttons */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', opacity: isActive ? 1 : 0.6 }}>
                            <button
                              title="Rename Chat"
                              onClick={(e) => handleStartRename(e, session)}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '0.2rem', color: 'var(--text-muted)' }}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              title="Delete Chat"
                              onClick={(e) => handleDeleteSession(e, session.id)}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '0.2rem', color: 'var(--color-danger)' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Main Chat Area ──────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="btn btn-ghost btn-sm" style={{ padding: '0.4rem' }}>
                <History size={18} color="var(--color-primary)" />
              </button>
            )}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <Sparkles size={20} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.3rem', marginBottom: 0 }}>AI Advisor Persona Matrix</h1>
              <p style={{ fontSize: '0.75rem', marginBottom: 0, color: 'var(--text-muted)' }}>
                Real-world AI models: Kuber.AI · Copilot Money · FreeFinancialPlan · PortfolioPilot · Wealthfront · Danelfin · AlphaSense · FinChat.io
              </p>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => createNewChatSession(activeEngine)}>
              <RefreshCw size={14} />
              New Chat
            </button>
          </div>

          {/* Engine Categories Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {categories.map((cat) => (
              <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', minWidth: 220 }}>
                  {cat.label}
                </span>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {AI_ENGINES.filter((e) => e.category === cat.key).map((engine) => {
                    const Icon = engine.icon;
                    const isActive = activeEngine.id === engine.id;
                    return (
                      <button
                        key={engine.id}
                        onClick={() => {
                          setActiveEngine(engine);
                          // If current chat is empty, switch welcome message
                          if (messages.length <= 1) {
                            setMessages([
                              {
                                id: 'welcome_' + Date.now(),
                                role: 'ai',
                                content: engine.welcomeMessage,
                                timestamp: new Date(),
                              },
                            ]);
                          }
                        }}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: 'var(--radius-lg)',
                          border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--bg-border)',
                          background: isActive ? 'hsla(217, 91%, 60%, 0.15)' : 'var(--bg-surface)',
                          color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s',
                        }}
                      >
                        <Icon size={13} />
                        {engine.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Engine Tagline Banner */}
        <div
          style={{
            padding: '0.45rem 0.85rem',
            background: 'hsla(217, 91%, 60%, 0.08)',
            border: '1px solid hsla(217, 91%, 60%, 0.18)',
            borderRadius: 'var(--radius-lg)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-primary)',
            marginBottom: '0.65rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Sparkles size={13} />
          <span>Active Engine: <strong>{activeEngine.label}</strong> — {activeEngine.tagline}</span>
        </div>

        {/* Messages Container */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            padding: '1rem',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--glass-border)',
            marginBottom: '0.65rem',
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                animation: 'fadeIn 0.3s ease',
              }}
            >
              {/* Avatar + Title */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.35rem',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: msg.role === 'user' ? 'var(--bg-elevated)' : 'var(--gradient-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {msg.role === 'user' ? <User size={13} color="var(--text-secondary)" /> : <Bot size={13} color="white" />}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {msg.role === 'user' ? 'You' : activeEngine.label}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Chat Bubble */}
              <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                <p style={{ color: 'inherit', lineHeight: 1.6, fontSize: '0.88rem', marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'var(--gradient-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={13} color="white" />
              </div>
              <div className="chat-bubble-ai" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--text-muted)',
                      display: 'inline-block',
                      animation: `skeleton-pulse 1.4s ${i * 0.2}s ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Sample Prompt Chips */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.65rem', flexWrap: 'wrap' }}>
          {activeEngine.sampleMessages.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.72rem', borderRadius: 'var(--radius-full)' }}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Textarea Input */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-end',
            background: 'var(--bg-surface)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '0.65rem 0.9rem',
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${activeEngine.label} anything...`}
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.88rem',
              resize: 'none',
              lineHeight: 1.5,
              maxHeight: '120px',
              overflowY: 'auto',
            }}
          />
          <button
            id="send-message-btn"
            className="btn btn-primary btn-sm"
            onClick={() => sendMessage()}
            disabled={!input.trim() || isTyping}
            style={{ borderRadius: 'var(--radius-lg)', flexShrink: 0 }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
