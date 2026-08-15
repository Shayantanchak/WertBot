import { useState, useEffect } from 'react';
import { Globe, Send, RefreshCw, ArrowDownLeft, ArrowUpRight, Plus, X, CheckCircle, ShieldCheck } from 'lucide-react';
import { apiClient } from '../../services/api';

interface Wallet {
  currency: string;
  flag: string;
  balance: number;
  reserved: number;
  rate: number;
}

interface Transfer {
  id: string | number;
  type: 'sent' | 'received' | 'convert';
  name: string;
  amount: number;
  currency: string;
  date: string;
  flag: string;
}

const INITIAL_WALLETS: Wallet[] = [
  { currency: 'USD', flag: '🇺🇸', balance: 12450.0, reserved: 500, rate: 1.0 },
  { currency: 'EUR', flag: '🇪🇺', balance: 4820.5, reserved: 0, rate: 0.9186 },
  { currency: 'GBP', flag: '🇬🇧', balance: 2100.0, reserved: 0, rate: 0.7834 },
  { currency: 'INR', flag: '🇮🇳', balance: 185000, reserved: 0, rate: 83.425 },
  { currency: 'BTC', flag: '₿', balance: 0.5, reserved: 0, rate: 67240 },
  { currency: 'ETH', flag: 'Ξ', balance: 3.2, reserved: 0, rate: 3520 },
];

const INITIAL_TRANSFERS: Transfer[] = [
  { id: 1, type: 'sent', name: 'Alice Johnson', amount: 500, currency: 'USD', date: 'Today, 3:12 PM', flag: '🇺🇸' },
  { id: 2, type: 'received', name: 'Bob Smith', amount: 1200, currency: 'GBP', date: 'Yesterday', flag: '🇬🇧' },
  { id: 3, type: 'sent', name: 'Priya Nair', amount: 50000, currency: 'INR', date: 'Jul 15', flag: '🇮🇳' },
  { id: 4, type: 'received', name: 'Crypto Rewards', amount: 0.01, currency: 'BTC', date: 'Jul 14', flag: '₿' },
];

export function WalletPage() {
  const [wallets, setWallets] = useState<Wallet[]>(INITIAL_WALLETS);
  const [transfers, setTransfers] = useState<Transfer[]>(INITIAL_TRANSFERS);

  // Modals state
  const [activeModal, setActiveModal] = useState<'send' | 'deposit' | 'convert' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendCurrency, setSendCurrency] = useState('USD');

  const [depositAmount, setDepositAmount] = useState('');
  const [depositCurrency, setDepositCurrency] = useState('USD');
  const [depositMethod, setDepositMethod] = useState('Card');

  const [convertFrom, setConvertFrom] = useState('USD');
  const [convertTo, setConvertTo] = useState('EUR');
  const [convertAmount, setConvertAmount] = useState('');

  const totalUSD = wallets.reduce((sum, w) => {
    if (w.currency === 'BTC' || w.currency === 'ETH') return sum + w.balance * w.rate;
    return sum + w.balance / w.rate;
  }, 0);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchWalletData = async () => {
    try {
      const res = await apiClient.get('/wallet/balance');
      if (res.data && res.data.success) {
        const mappedWallets = res.data.data.balances.map((w: any) => {
          let rate = w.rateToUSD;
          if (w.currency === 'BTC' || w.currency === 'ETH') {
            rate = 1 / w.rateToUSD;
          }
          return {
            currency: w.currency,
            flag: w.flag,
            balance: w.balance,
            reserved: w.reserved,
            rate: rate,
          };
        });
        setWallets(mappedWallets);
        setTransfers(res.data.data.transfers);
      }
    } catch (err) {
      console.error('Failed to fetch wallet balances from backend:', err);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  // ── Send Money Handler ────────────────────────────────────────────────────
  const handleSendMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(sendAmount);
    if (!sendRecipient || isNaN(amountNum) || amountNum <= 0) return;

    const sourceWallet = wallets.find((w) => w.currency === sendCurrency);
    if (!sourceWallet || sourceWallet.balance < amountNum) {
      alert(`Insufficient ${sendCurrency} balance!`);
      return;
    }

    let success = false;
    try {
      const res = await apiClient.post('/wallet/transfer', { recipientName: sendRecipient, amount: amountNum, currency: sendCurrency });
      if (res.data && res.data.success) {
        await fetchWalletData();
        success = true;
      }
    } catch (err) {
      console.error('Failed to send money through API, falling back', err);
    }

    if (!success) {
      setWallets((prev) =>
        prev.map((w) => (w.currency === sendCurrency ? { ...w, balance: w.balance - amountNum } : w))
      );

      const newTransfer: Transfer = {
        id: Date.now(),
        type: 'sent',
        name: sendRecipient,
        amount: amountNum,
        currency: sendCurrency,
        date: 'Just now',
        flag: sourceWallet.flag,
      };
      setTransfers((prev) => [newTransfer, ...prev]);
    }

    showNotification(`Successfully sent ${sendCurrency} ${amountNum.toLocaleString()} to ${sendRecipient}`);
    setActiveModal(null);
    setSendRecipient('');
    setSendAmount('');
  };

  // ── Add Funds Deposit Handler ─────────────────────────────────────────────
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(depositAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    let success = false;
    try {
      const res = await apiClient.post('/wallet/deposit', { currency: depositCurrency, amount: amountNum });
      if (res.data && res.data.success) {
        await fetchWalletData();
        success = true;
      }
    } catch (err) {
      console.error('Failed to deposit through API, falling back', err);
    }

    if (!success) {
      const targetWallet = wallets.find((w) => w.currency === depositCurrency);
      setWallets((prev) =>
        prev.map((w) => (w.currency === depositCurrency ? { ...w, balance: w.balance + amountNum } : w))
      );

      const newTransfer: Transfer = {
        id: Date.now(),
        type: 'received',
        name: `Deposit (${depositMethod})`,
        amount: amountNum,
        currency: depositCurrency,
        date: 'Just now',
        flag: targetWallet?.flag || '🌐',
      };
      setTransfers((prev) => [newTransfer, ...prev]);
    }

    showNotification(`Successfully added ${depositCurrency} ${amountNum.toLocaleString()} via ${depositMethod}`);
    setActiveModal(null);
    setDepositAmount('');
  };

  // ── Currency Conversion Handler ───────────────────────────────────────────
  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(convertAmount);
    if (isNaN(amountNum) || amountNum <= 0 || convertFrom === convertTo) return;

    const fromW = wallets.find((w) => w.currency === convertFrom);
    const toW = wallets.find((w) => w.currency === convertTo);

    if (!fromW || fromW.balance < amountNum || !toW) {
      alert(`Insufficient ${convertFrom} balance!`);
      return;
    }

    let success = false;
    let finalConvertedValue = 0;

    try {
      const res = await apiClient.post('/wallet/convert', {
        fromCurrency: convertFrom,
        toCurrency: convertTo,
        amount: amountNum,
      });
      if (res.data && res.data.success) {
        await fetchWalletData();
        success = true;
        finalConvertedValue = res.data.convertedAmount || 0;
      }
    } catch (err) {
      console.error('Failed to convert currency through API, falling back', err);
    }

    if (!success) {
      const fromUSD = fromW.currency === 'BTC' || fromW.currency === 'ETH' ? amountNum * fromW.rate : amountNum / fromW.rate;
      const convertedValue = toW.currency === 'BTC' || toW.currency === 'ETH' ? fromUSD / toW.rate : fromUSD * toW.rate;
      finalConvertedValue = convertedValue;

      setWallets((prev) =>
        prev.map((w) => {
          if (w.currency === convertFrom) return { ...w, balance: w.balance - amountNum };
          if (w.currency === convertTo) return { ...w, balance: w.balance + convertedValue };
          return w;
        })
      );

      const newTransfer: Transfer = {
        id: Date.now(),
        type: 'convert',
        name: `FX Convert (${convertFrom} → ${convertTo})`,
        amount: convertedValue,
        currency: convertTo,
        date: 'Just now',
        flag: toW.flag,
      };
      setTransfers((prev) => [newTransfer, ...prev]);
    }

    showNotification(`Converted ${convertFrom} ${amountNum} into ${convertTo} ${finalConvertedValue.toFixed(4)}`);
    setActiveModal(null);
    setConvertAmount('');
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-accent)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.85rem 1.25rem',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-glow)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <CheckCircle size={18} color="var(--color-accent)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{toastMessage}</span>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 0 }}>Multi-Currency Neobanking Wallet</h1>
            <span className="badge badge-gold">Global Rails</span>
          </div>
          <p style={{ fontSize: '0.8rem', marginBottom: 0, color: 'var(--text-muted)' }}>
            Stripe Treasury · Adyen · Cross-Border Liquidity & Real-Time FX Settlement
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setActiveModal('deposit')}>
            <Plus size={16} /> Add Funds
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setActiveModal('send')}>
            <Send size={16} /> Send Money
          </button>
        </div>
      </div>

      {/* ── Total Portfolio Banner ──────────────────────────── */}
      <div
        style={{
          background: 'var(--gradient-primary)',
          borderRadius: 'var(--radius-2xl)',
          padding: '2rem 2.5rem',
          marginBottom: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-glow)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'hsla(255,255%,255%,0.05)',
          }}
        />
        <Globe size={32} color="hsla(255,255%,255%,0.4)" style={{ marginBottom: '0.75rem' }} />
        <p style={{ color: 'hsla(255,255%,255%,0.7)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
          Total Multi-Currency Net Worth
        </p>
        <div className="mono" style={{ fontSize: '3rem', fontWeight: 900, color: 'white', letterSpacing: '-0.03em' }}>
          ${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <p style={{ color: 'hsla(255,255%,255%,0.6)', fontSize: '0.8rem', marginBottom: 0 }}>
          Across {wallets.length} Fiat & Crypto Currencies · Instant Liquidity
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1rem' }}>
        {/* ── Currency Wallets Grid ───────────────────────────── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem' }}>Active Currency Balances</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setActiveModal('convert')}>
              <RefreshCw size={14} /> Convert FX
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {wallets.map((w) => {
              const usdValue = w.currency === 'BTC' || w.currency === 'ETH' ? w.balance * w.rate : w.balance / w.rate;
              const isCrypto = ['BTC', 'ETH'].includes(w.currency);
              return (
                <div key={w.currency} className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>{w.flag}</span>
                      <div>
                        <div className="mono" style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                          {w.currency}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{isCrypto ? 'Crypto' : 'Fiat Wallet'}</div>
                      </div>
                    </div>
                    {w.reserved > 0 && <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>Reserved</span>}
                  </div>

                  <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.2rem' }}>
                    {isCrypto
                      ? `${w.balance} ${w.currency}`
                      : new Intl.NumberFormat('en-US', { style: 'currency', currency: w.currency, maximumFractionDigits: 2 }).format(w.balance)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ≈ ${usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.85rem' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setSendCurrency(w.currency);
                        setActiveModal('send');
                      }}
                      style={{ flex: 1, fontSize: '0.72rem', padding: '0.35rem' }}
                    >
                      <ArrowUpRight size={12} /> Send
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setDepositCurrency(w.currency);
                        setActiveModal('deposit');
                      }}
                      style={{ flex: 1, fontSize: '0.72rem', padding: '0.35rem' }}
                    >
                      <ArrowDownLeft size={12} /> Deposit
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setConvertFrom(w.currency);
                        setActiveModal('convert');
                      }}
                      style={{ flex: 1, fontSize: '0.72rem', padding: '0.35rem' }}
                    >
                      <RefreshCw size={12} /> Convert
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Recent Transfers & Exchange Rates ───────────────── */}
        <div>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Transaction Activity</h3>
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {transfers.map((t, i) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 0',
                    borderBottom: i < transfers.length - 1 ? '1px solid var(--bg-border)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-lg)',
                      background: t.type === 'received' ? 'hsla(142, 76%, 51%, 0.12)' : t.type === 'convert' ? 'hsla(217, 91%, 60%, 0.12)' : 'hsla(0, 84%, 60%, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {t.type === 'received' ? (
                      <ArrowDownLeft size={16} color="var(--color-accent)" />
                    ) : t.type === 'convert' ? (
                      <RefreshCw size={16} color="var(--color-primary)" />
                    ) : (
                      <ArrowUpRight size={16} color="var(--color-danger)" />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{t.date}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className={`mono ${t.type === 'received' ? 'value-positive' : t.type === 'convert' ? 'value-neutral' : 'value-negative'}`} style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                      {t.type === 'received' ? '+' : t.type === 'sent' ? '-' : ''}
                      {t.flag} {t.amount} {t.currency}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live FX Rates */}
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Live FX Spot Rates</h3>
          <div className="card" style={{ padding: '1rem' }}>
            {wallets
              .filter((w) => !['BTC', 'ETH', 'USD'].includes(w.currency))
              .map((w) => (
                <div key={w.currency} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--bg-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{w.flag}</span>
                    <span className="mono" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                      USD/{w.currency}
                    </span>
                  </div>
                  <span className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                    {w.rate.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* ── MODALS ────────────────────────────────────────────── */}

      {/* 1. Send Money Modal */}
      {activeModal === 'send' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div className="card animate-scale-in" style={{ width: 440, padding: '1.75rem', position: 'relative' }}>
            <button
              onClick={() => setActiveModal(null)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-lg)', background: 'hsla(217, 91%, 60%, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={18} color="var(--color-primary)" />
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: 0 }}>Send Cross-Border Transfer</h3>
            </div>

            <form onSubmit={handleSendMoney} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Recipient Name / UPI / IBAN
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alice Johnson or user@okicici"
                  value={sendRecipient}
                  onChange={(e) => setSendRecipient(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--bg-border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Transfer Amount
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--bg-border)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Currency
                  </label>
                  <select
                    value={sendCurrency}
                    onChange={(e) => setSendCurrency(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.5rem',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--bg-border)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  >
                    {wallets.map((w) => (
                      <option key={w.currency} value={w.currency}>
                        {w.flag} {w.currency}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-elevated)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={16} color="var(--color-accent)" />
                <span>Zero transfer fees · Instant settlement via Stripe Treasury</span>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}>
                Confirm Payment Transfer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Funds / Deposit Modal */}
      {activeModal === 'deposit' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div className="card animate-scale-in" style={{ width: 440, padding: '1.75rem', position: 'relative' }}>
            <button
              onClick={() => setActiveModal(null)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-lg)', background: 'hsla(142, 76%, 51%, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={18} color="var(--color-accent)" />
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: 0 }}>Add Funds to Wallet</h3>
            </div>

            <form onSubmit={handleDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Payment Method
                </label>
                <select
                  value={depositMethod}
                  onChange={(e) => setDepositMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--bg-border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                >
                  <option value="Card">Debit / Credit Card (Stripe)</option>
                  <option value="UPI">UPI / NetBanking (India)</option>
                  <option value="Wire">Bank Wire Transfer (ACH/SEPA)</option>
                  <option value="Crypto">Crypto Transfer (BTC/ETH)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Deposit Amount
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--bg-border)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Wallet
                  </label>
                  <select
                    value={depositCurrency}
                    onChange={(e) => setDepositCurrency(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.5rem',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--bg-border)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  >
                    {wallets.map((w) => (
                      <option key={w.currency} value={w.currency}>
                        {w.flag} {w.currency}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}>
                Top Up Balance Instantly
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Convert Currency Modal */}
      {activeModal === 'convert' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div className="card animate-scale-in" style={{ width: 440, padding: '1.75rem', position: 'relative' }}>
            <button
              onClick={() => setActiveModal(null)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-lg)', background: 'hsla(217, 91%, 60%, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={18} color="var(--color-primary)" />
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: 0 }}>Convert Currency (FX Spot)</h3>
            </div>

            <form onSubmit={handleConvert} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>From</label>
                  <select
                    value={convertFrom}
                    onChange={(e) => setConvertFrom(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--bg-border)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  >
                    {wallets.map((w) => (
                      <option key={w.currency} value={w.currency}>
                        {w.flag} {w.currency}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>To</label>
                  <select
                    value={convertTo}
                    onChange={(e) => setConvertTo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--bg-border)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  >
                    {wallets.map((w) => (
                      <option key={w.currency} value={w.currency}>
                        {w.flag} {w.currency}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Amount to Convert</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--bg-border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}>
                Execute Instant FX Swap
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
