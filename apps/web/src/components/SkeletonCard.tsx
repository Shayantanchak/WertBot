/** Animated shimmer skeleton loader that matches card shapes */
export function SkeletonLine({ width = '100%', height = 14, style = {} }: { width?: string | number; height?: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      width, height, borderRadius: 6,
      background: 'linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-surface) 50%, var(--bg-elevated) 75%)',
      backgroundSize: '400% 100%',
      animation: 'shimmer 1.4s ease-in-out infinite',
      ...style,
    }} />
  );
}

export function SkeletonCard({ lines = 3, style = {} }: { lines?: number; style?: React.CSSProperties }) {
  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === 0 ? '60%' : i === lines - 1 ? '40%' : '100%'} />
      ))}
    </div>
  );
}

export function SkeletonMetricCard() {
  return (
    <div className="metric-card" style={{ flex: 1 }}>
      <SkeletonLine width="50%" height={12} style={{ marginBottom: '0.5rem' }} />
      <SkeletonLine width="70%" height={28} style={{ marginBottom: '0.5rem' }} />
      <SkeletonLine width="40%" height={12} />
    </div>
  );
}

export function SkeletonTransactionRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-lg)', background: 'var(--bg-elevated)', animation: 'shimmer 1.4s ease-in-out infinite', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <SkeletonLine width="55%" height={12} />
        <SkeletonLine width="35%" height={10} />
      </div>
      <SkeletonLine width={60} height={14} />
    </div>
  );
}
