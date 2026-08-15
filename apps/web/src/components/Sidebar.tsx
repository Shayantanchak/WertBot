import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  MessageSquare,
  Wallet,
  Settings,
  LogOut,
  Bookmark,
  TrendingDown,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/trading',   icon: TrendingUp,      label: 'Terminal' },
  { to: '/chat',      icon: MessageSquare,   label: 'AI Co-Pilot' },
  { to: '/wallet',    icon: Wallet,          label: 'Funds & Wallet' },
];

const INITIAL_WATCHLIST = [
  { symbol: 'BTC/USDT', price: 67240, change: +2.4, isUp: true, exchange: 'Binance' },
  { symbol: 'ETH/USDT', price: 3520,  change: +1.8, isUp: true, exchange: 'Binance' },
  { symbol: 'NIFTY 50', price: 24380, change: +0.65, isUp: true, exchange: 'NSE' },
  { symbol: 'EUR/USD',  price: 1.0852, change: -0.12, isUp: false, exchange: 'OANDA' },
  { symbol: 'AAPL',     price: 224.50, change: +1.20, isUp: true, exchange: 'NASDAQ' },
  { symbol: 'RELIANCE', price: 2980,  change: -0.45, isUp: false, exchange: 'NSE' },
];

export function Sidebar() {
  const [watchlist, setWatchlist] = useState(INITIAL_WATCHLIST);
  const navigate = useNavigate();

  // Simulate live price tick updates
  useEffect(() => {
    const timer = setInterval(() => {
      setWatchlist((prev) =>
        prev.map((item) => {
          const delta = (Math.random() - 0.49) * (item.price * 0.0015);
          const newPrice = parseFloat((item.price + delta).toFixed(item.symbol.includes('/') ? 4 : 2));
          return {
            ...item,
            price: newPrice,
            isUp: delta >= 0,
          };
        })
      );
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  return (
    <aside className="sidebar">
      {/* ── Navigation Menu ──────────────────────────────── */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '1.25rem' }}>
        <div style={{
          fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0.5rem', marginBottom: '0.35rem'
        }}>
          Workspaces
        </div>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── Live Market Watchlist Section (Zerodha Kite Style) ───── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--bg-border)', paddingTop: '0.85rem' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 0.5rem', marginBottom: '0.5rem'
        }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Watchlist (6)
          </span>
          <Bookmark size={13} color="var(--text-muted)" />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {watchlist.map((item) => (
            <div
              key={item.symbol}
              className="watchlist-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'background 0.15s',
                position: 'relative',
              }}
              onClick={() => navigate('/trading')}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
                  {item.symbol}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {item.exchange}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{
                  fontSize: '0.82rem', fontWeight: 600,
                  color: item.isUp ? 'var(--color-accent)' : 'var(--color-danger)',
                  transition: 'color 0.3s'
                }}>
                  {item.price.toLocaleString(undefined, { minimumFractionDigits: item.symbol.includes('/') ? 4 : 2 })}
                </div>
                <div style={{
                  fontSize: '0.65rem', fontWeight: 600,
                  color: item.change >= 0 ? 'var(--color-accent)' : 'var(--color-danger)'
                }}>
                  {item.change >= 0 ? '+' : ''}{item.change}%
                </div>
              </div>

              {/* Hover Quick Buy/Sell Triggers */}
              <div className="watchlist-actions" style={{
                position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                display: 'none', gap: '4px', background: '#0e1116', padding: '2px'
              }}>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/trading'); }}
                  style={{
                    background: '#00b57a', color: '#0b0e11', border: 'none',
                    borderRadius: '2px', padding: '2px 8px', fontWeight: 700, fontSize: '0.68rem', cursor: 'pointer'
                  }}
                >
                  B
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/trading'); }}
                  style={{
                    background: '#f6465d', color: '#ffffff', border: 'none',
                    borderRadius: '2px', padding: '2px 8px', fontWeight: 700, fontSize: '0.68rem', cursor: 'pointer'
                  }}
                >
                  S
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Actions ────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', borderTop: '1px solid var(--bg-border)', paddingTop: '0.75rem' }}>
        <NavLink to="/settings" className="nav-item">
          <Settings size={16} />
          Settings
        </NavLink>
        <button
          className="nav-item"
          onClick={() => {
            localStorage.removeItem('wertbot_access_token');
            sessionStorage.removeItem('wertbot_access_token');
            window.location.href = '/login';
          }}
          style={{ border: 'none', width: '100%', textAlign: 'left', background: 'transparent' }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
