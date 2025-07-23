import React, { useState } from 'react';
import { forgotPassword } from '@/lib/auth';


export default function ForgotPasswordPage() {

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error resetting password');
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
            <h2 className="text-3xl font-extrabold text-primary mb-1 tracking-tight">Forgot Password</h2>
            <p className="text-muted-foreground text-sm mb-4">Enter your email address to receive a password reset link.</p>
          </div>
          
          {success ? (
            <div className="text-center">
              <p className="text-green-600 mb-4">Password reset email sent</p>
              <button
                onClick={() => window.location.href = '/login'}
                className="btn-primary"
              >
                Back to Login
              </button>
            </div>
          ) : (
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
              {error && <div className="text-destructive text-sm mb-2 text-center">{error}</div>}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full h-11 rounded-lg font-semibold text-lg shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="animate-spin mr-2 h-5 w-5 border-2 border-t-transparent border-white rounded-full"></span>
                    Sending reset link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}
          <div className="mt-4 text-center">
            <a href="/login" className="text-primary text-sm hover:underline">Back to Login</a>
          </div>
        </div>
        <div className="mt-8 text-center text-xs text-muted-foreground">&copy; {new Date().getFullYear()} DigiNum. All rights reserved.</div>
      </div>
    </div>
  );
}
