import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate brief loading
    await new Promise((r) => setTimeout(r, 600));

    if (email === 'admin@webhookguard.com' && password === 'demo123') {
      sessionStorage.setItem('isLoggedIn', 'true');
      navigate('/dashboard');
    } else {
      setError('Invalid credentials');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-gradient min-h-screen flex items-center justify-center p-4">
      {/* Subtle radial glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-800/50 p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">WebhookGuard</h1>
            <p className="text-sm text-gray-400 mt-1">Reconciliation Engine Dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@webhookguard.com"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-10 pr-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-10 pr-10 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-950/50 border border-red-800 rounded-lg px-3 py-2 text-sm text-red-400 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-xs text-gray-500 text-center mb-2">Demo Credentials</p>
            <div className="bg-gray-800/50 rounded-lg px-3 py-2.5 text-xs text-gray-400 font-mono space-y-1">
              <p><span className="text-gray-500">email:</span> admin@webhookguard.com</p>
              <p><span className="text-gray-500">pass:</span> demo123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
