import React, { useState } from 'react';
import { signup } from '@/lib/auth';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await signup(email, password);
      setSuccess(true);
      // Optionally redirect or show a message
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
      <div className="w-full max-w-md p-6">
        <div className="bg-white/90 rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="mb-3">
              <img src="/logo.svg" alt="DigiNum Logo" className="h-12 w-12 drop-shadow-lg" />
            </div>
            <h2 className="text-3xl font-extrabold text-primary mb-1 tracking-tight">Create Account</h2>
            <p className="text-muted-foreground text-sm">Sign up for DigiNum and get started</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none transition"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none transition"
                required
              />
            </div>
            {error && <div className="text-destructive text-sm mb-2 text-center">{error}</div>}
            {success && <div className="text-success text-sm mb-2 text-center">Signup successful! Check your email to confirm your account.</div>}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-11 rounded-lg font-semibold text-lg shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <span className="animate-spin mr-2 h-5 w-5 border-2 border-t-transparent border-white rounded-full"></span> : null}
              {loading ? 'Signing up...' : 'Sign Up'}
            </button>
            <div className="flex justify-between items-center mt-2">
              <a href="/login" className="text-primary text-sm hover:underline">Already have an account?</a>
            </div>
          </form>
        </div>
        <div className="mt-8 text-center text-xs text-muted-foreground">&copy; {new Date().getFullYear()} DigiNum. All rights reserved.</div>
      </div>
    </div>
  );
}
