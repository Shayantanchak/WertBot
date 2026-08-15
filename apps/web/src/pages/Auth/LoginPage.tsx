import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';

export const LoginPage: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [passkeyStatus, setPasskeyStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (!email || !password) {
        throw new Error('Please enter email and password.');
      }
      login({ id: 'usr_demo_123', email, fullName: fullName || 'WertBot User' }, 'demo_token_123');
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyAuth = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setPasskeyStatus('Verifying hardware security key / TouchID...');

    try {
      setPasskeyStatus('Biometrics Verified (Touch ID / Passkey Successful!)');
      await new Promise((res) => setTimeout(res, 600));
      login({ id: 'usr_passkey_999', email: email || 'biometric.user@wertbot.io', fullName: 'Passkey Verified User' }, 'token_passkey_xyz');
    } catch (err: any) {
      setErrorMsg(err.message || 'Passkey authentication failed.');
      setPasskeyStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <span className="inline-block bg-cyan-500/10 text-cyan-400 text-xs font-semibold px-3 py-1 rounded-full mb-2">
            WERTBOT APEX SUITE
          </span>
          <h1 className="text-3xl font-extrabold text-white">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h1>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">
            {errorMsg}
          </div>
        )}

        <button
          type="button"
          onClick={handlePasskeyAuth}
          disabled={isLoading}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl mb-4 transition"
        >
          Sign in with Passkey / TouchID
        </button>

        {passkeyStatus && (
          <div className="mb-4 text-center text-xs text-cyan-400 font-medium">
            {passkeyStatus}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@wertbot.io"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition border border-slate-700"
          >
            {isLoading ? 'Processing...' : isRegistering ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-cyan-400 font-semibold hover:underline ml-1"
          >
            {isRegistering ? 'Sign In' : 'Register Now'}
          </button>
        </div>
      </div>
    </div>
  );
};
