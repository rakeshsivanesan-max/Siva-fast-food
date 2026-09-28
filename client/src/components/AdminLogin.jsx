import React, { useState } from 'react';
import { Lock, ArrowLeft, ShieldCheck, Flame, Eye, EyeOff } from 'lucide-react';

export default function AdminLogin({ onLoginSuccess, onBackToMenu, shopInfo }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('siva123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed. Please check credentials.');
      }

      // Save token in localStorage
      localStorage.setItem('siva_admin_token', data.token);
      localStorage.setItem('siva_admin_user', JSON.stringify(data.user));

      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Return to Customer Menu */}
      <div className="w-full max-w-sm mb-6">
        <button
          onClick={onBackToMenu}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Customer Menu
        </button>
      </div>

      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-3xl p-7 shadow-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-600/20 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3 text-red-500">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center justify-center gap-1.5">
            <span>OWNER LOGIN</span>
            <Flame className="w-5 h-5 text-red-500 fill-red-500" />
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {shopInfo?.shopName || "SIVA'S FAST FOOD"} • Management Portal
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-red-500 focus:outline-hidden transition"
              placeholder="e.g. admin"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-red-500 focus:outline-hidden transition pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Demo Hint */}
          <div className="bg-gray-950/90 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 flex items-center justify-between">
            <div>
              Default login: <strong className="text-gray-200">admin</strong> / <strong className="text-gray-200">siva123</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                setUsername('admin');
                setPassword('siva123');
              }}
              className="text-red-400 hover:text-red-300 font-bold ml-2 underline text-[10px]"
            >
              Fill Demo
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Logging In...
              </span>
            ) : (
              <span>ENTER OWNER DASHBOARD</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
