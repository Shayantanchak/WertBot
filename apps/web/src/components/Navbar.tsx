import React, { useState } from 'react';
import { Search, Zap, PlusCircle, ArrowUpRight, Bell, User, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  return (
    <header style={{
      height: '56px',
      background: '#0e1116',
      borderBottom: '1px solid var(--bg-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.25rem',
      position: 'sticky',
      top: 0,
      zIndex: 500,
    }}>
      {/* ── Left: Brand Identity ──────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
          <div style={{
            width: 32, height: 32, borderRadius: '4px',
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={18} color="#ffffff" fill="#ffffff" />
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
              Wert<span style={{ color: 'var(--color-primary)' }}>Bot</span>
            </span>
            <span className="badge badge-success" style={{ marginLeft: '0.5rem', fontSize: '0.65rem', padding: '1px 6px' }}>
              PRO
            </span>
          </div>
        </div>

        <div style={{
          height: '18px', width: '1px', background: 'var(--bg-border)', margin: '0 0.25rem'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
          <span className="live-dot" />
          <span>GLOBAL MARKETS LIVE</span>
        </div>
      </div>

      {/* ── Center: Universal Search / Command Bar ─────────────── */}
      <div style={{ flex: 1, maxWidth: '480px', margin: '0 1.5rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: '#14171d',
          border: '1px solid var(--bg-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.35rem 0.75rem',
          transition: 'border-color 0.15s',
        }}>
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search stocks, crypto, funds, or ask AI (Ctrl+K)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              width: '100%',
              fontFamily: 'var(--font-sans)',
            }}
          />
          <span style={{
            fontSize: '0.65rem',
            background: '#1e2329',
            color: 'var(--text-muted)',
            padding: '2px 5px',
            borderRadius: '3px',
            fontFamily: 'var(--font-mono)',
            flexShrink: 0
          }}>
            ⌘K
          </span>
        </div>
      </div>

      {/* ── Right: Quick Actions & Profile ────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/wallet')}
          style={{ gap: '0.35rem', color: 'var(--color-accent)', borderColor: 'rgba(0, 208, 156, 0.25)' }}
        >
          <PlusCircle size={14} />
          <span>+ Deposit</span>
        </button>

        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate('/trading')}
          style={{ gap: '0.35rem' }}
        >
          <ArrowUpRight size={14} />
          <span>Trade</span>
        </button>

        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/chat')}
          title="AI Co-Pilot Advisor"
        >
          <MessageSquare size={14} color="var(--color-primary)" />
          <span>AI Assistant</span>
        </button>

        <div style={{ height: '18px', width: '1px', background: 'var(--bg-border)', margin: '0 0.2rem' }} />

        <button className="btn btn-ghost btn-sm" style={{ padding: '6px' }}>
          <Bell size={15} color="var(--text-secondary)" />
        </button>

        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: '#1e2329', border: '1px solid var(--bg-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', marginLeft: '0.2rem'
        }}>
          <User size={15} color="var(--text-primary)" />
        </div>
      </div>
    </header>
  );
}
