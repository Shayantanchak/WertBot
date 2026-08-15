import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '0.75rem', padding: '2.5rem 1.5rem',
      textAlign: 'center', minHeight: 180,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.5rem',
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{title}</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 280, lineHeight: '1.5', margin: 0 }}>{description}</p>
      </div>
      {action && (
        <button className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', marginTop: '0.25rem' }} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
