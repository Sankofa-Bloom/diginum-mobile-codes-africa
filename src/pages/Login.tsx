import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { login } from '@/lib/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      setIsMounted(false);
    };
  }, []);

  const validateForm = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    
    if (!password) {
      setError('Password is required');
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setError(null);
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (import.meta.env.DEV) {
      console.log('Submitting login form for:', email);
    }
      await login(email.trim(), password);
      
      if (!isMounted) return;
      
      toast.success('Login successful!');
      navigate(redirectTo, { replace: true });
      
    } catch (err: any) {
      if (!isMounted) return;
      
      console.error('Login error:', err);
      
      let errorMessage = 'An error occurred during login. Please try again.';
      
      if (err.message) {
        if (err.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (err.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account before logging in.';
        } else if (err.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a moment before trying again.';
        } else if (err.message.includes('Network')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    // Clear error when user starts typing
    if (error) setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
      <div className="w-full max-w-md p-6">
        <div className="bg-white/90 rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="mb-3">
              <img src="/logo.svg" alt="DigiNum Logo" className="h-12 w-12 drop-shadow-lg" />
            </div>
            <h2 className="text-3xl font-extrabold text-primary mb-1 tracking-tight">Welcome Back</h2>
            <p className="text-muted-foreground text-sm">Sign in to your DigiNum account</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={handleEmailChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none transition"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2 pr-10 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none transition"
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
            {error && (
              <div className="text-destructive text-sm mb-2 text-center p-3 bg-destructive/10 rounded-md border border-destructive/20">
                {error}
              </div>
            )}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 h-11 text-base font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  OR
                </span>
              </div>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <a 
                href={`/signup${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
                className="text-primary hover:underline font-medium transition-colors"
              >
                Create an account
              </a>
            </div>
            
            <div className="text-center text-sm text-muted-foreground mt-2">
              <a 
                href="/forgot-password"
                className="text-primary hover:underline font-medium transition-colors"
              >
                Forgot password?
              </a>
            </div>
          </form>
        </div>
        <div className="mt-8 text-center text-xs text-muted-foreground">&copy; {new Date().getFullYear()} DigiNum. All rights reserved.</div>
      </div>
    </div>
  );
}
