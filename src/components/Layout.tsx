import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentUser, logout } from '@/lib/auth';
import Footer from './Footer';

const Layout = () => {
  const openWhatsApp = () => {
    const message = encodeURIComponent("Bonjour, j'ai besoin d'aide avec DigiNum");
    window.open(`https://wa.me/237673289043?text=${message}`, '_blank');
  };

  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
    // Optionally, subscribe to auth events for real-time updates
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Unified Main Navigation Bar */}
      <nav className="w-full flex items-center justify-between px-6 py-3 bg-white shadow-sm sticky top-0 z-50">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <Link to="/">
            <img src="/logo.svg" alt="DigiNum Logo" className="h-9 w-9" />
          </Link>
          <Link to="/" className="text-2xl font-bold text-primary tracking-tight hover:opacity-90">DigiNum</Link>
        </div>
        {/* Main Menu Links */}
        <div className="flex items-center gap-6">
          <Link to="/" className="text-base font-medium text-foreground hover:text-primary transition">Home</Link>
          <Link to="/buy" className="text-base font-medium text-foreground hover:text-primary transition">Buy</Link>
          {user && (
            <Link to="/dashboard" className="text-base font-medium text-foreground hover:text-primary transition">Dashboard</Link>
          )}
        </div>
        {/* Auth/User Actions */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-gray-700 text-sm font-medium">{user.email}</span>
              <Button onClick={handleLogout} size="sm" variant="outline">Logout</Button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-primary px-4 py-2 rounded-lg font-semibold text-white shadow hover:opacity-90 transition">Login</Link>
              <Link to="/signup" className="px-4 py-2 rounded-lg font-semibold text-primary border border-primary shadow hover:bg-primary hover:text-white transition">Sign Up</Link>
            </>
          )}
        </div>
      </nav>
      <Outlet />
      {/* WhatsApp Support Button - floating bottom right */}
      <Button 
        onClick={openWhatsApp}
        className="whatsapp-button fixed bottom-6 right-6 rounded-full shadow-lg bg-green-500 hover:bg-green-600 text-white p-0 h-14 w-14 flex items-center justify-center z-50"
        size="lg"
        style={{ boxShadow: '0 4px 24px rgba(34,197,94,0.25)' }}
      >
        <MessageCircle className="h-7 w-7" />
      </Button>
      <Footer />
    </div>
  );
};

export default Layout;