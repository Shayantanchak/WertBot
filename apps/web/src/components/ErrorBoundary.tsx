import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[WertBot ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div style={{
        minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: '1rem', padding: '2rem', textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'hsla(0, 80%, 60%, 0.1)', border: '1px solid hsla(0, 80%, 60%, 0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={28} color="var(--color-danger)" />
        </div>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0 }}>Something went wrong</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 360, margin: 0, lineHeight: '1.6' }}>
          An unexpected error occurred. Your data is safe. Try refreshing the page.
        </p>
        <button
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.4rem' }}
          onClick={() => window.location.reload()}
        >
          <RefreshCw size={16} /> Refresh Page
        </button>
      </div>
    );
  }
}
