import React, { useState } from 'react';
import { signup, login, getCurrentUser, logout } from '@/lib/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TestAuthPage() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    setIsLoading(true);
    try {
      const result = await signup(email, password);
      toast.success('Signup successful!');
      console.log('Signup result:', result);
    } catch (error: any) {
      toast.error(`Signup failed: ${error.message}`);
      console.error('Signup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await login(email, password);
      toast.success('Login successful!');
      console.log('Login result:', result);
      await checkCurrentUser();
    } catch (error: any) {
      toast.error(`Login failed: ${error.message}`);
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      if (user) {
        toast.success(`Current user: ${user.email}`);
      } else {
        toast.info('No current user');
      }
    } catch (error: any) {
      toast.error(`Error getting current user: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logout successful!');
      setCurrentUser(null);
    } catch (error: any) {
      toast.error(`Logout failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <div className="w-full max-w-md bg-white/90 rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Authentication Test</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password123"
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleSignup} 
              disabled={isLoading}
              className="flex-1"
            >
              Signup
            </Button>
            <Button 
              onClick={handleLogin} 
              disabled={isLoading}
              className="flex-1"
            >
              Login
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={checkCurrentUser} 
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              Check User
            </Button>
            <Button 
              onClick={handleLogout} 
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              Logout
            </Button>
          </div>
        </div>
        
        {currentUser && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h3 className="font-medium text-green-800">Current User:</h3>
            <p className="text-sm text-green-700">Email: {currentUser.email}</p>
            <p className="text-sm text-green-700">ID: {currentUser.id}</p>
          </div>
        )}
        
        <div className="mt-6 text-center">
          <a href="/login" className="text-blue-600 hover:underline">
            Go to Login Page
          </a>
        </div>
      </div>
    </div>
  );
} 