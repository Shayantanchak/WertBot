import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { TradingPage } from './pages/Trading/TradingPage';
import { ChatPage } from './pages/Chat/ChatPage';
import { WalletPage } from './pages/Wallet/WalletPage';
import { LoginPage } from './pages/Auth/LoginPage';

// Auth check — reads from both sessionStorage (default) and localStorage (remember me)
const isAuthenticated = () =>
  !!(sessionStorage.getItem('wertbot_access_token') || localStorage.getItem('wertbot_access_token'));

function ProtectedLayout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 56px)' }}>
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
            <Route path="/trading"   element={<ErrorBoundary><TradingPage /></ErrorBoundary>} />
            <Route path="/chat"      element={<ErrorBoundary><ChatPage /></ErrorBoundary>} />
            <Route path="/wallet"    element={<ErrorBoundary><WalletPage /></ErrorBoundary>} />
            <Route path="*"          element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  if (!isAuthenticated()) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*"      element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/*"     element={<ProtectedLayout />} />
    </Routes>
  );
}
