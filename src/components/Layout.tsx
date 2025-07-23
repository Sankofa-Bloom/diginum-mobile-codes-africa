import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { MessageCircle, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentUser, logout } from '@/lib/auth';
import Footer from './Footer';
import BottomNav from './BottomNav';
import { useTranslation } from 'react-i18next';

const Layout = () => {
  const { t } = useTranslation();
  const openWhatsApp = () => {
    const message = encodeURIComponent(t('support.whatsappMessage'));
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Header */}
      <nav className="w-full flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link to="/">
            <img src="/logo.svg" alt="DigiNum Logo" className="h-8 w-8" />
          </Link>
          <Link to="/" className="text-xl font-bold text-primary tracking-tight hover:opacity-90">DigiNum</Link>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Button variant="ghost" onClick={handleLogout} className="p-1">
                <LogOut className="h-5 w-5" />
              </Button>
              <Button variant="ghost" className="p-1">
                <User className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" className="p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="16" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-primary text-white px-3 py-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                    <line x1="12" y1="3" x2="12" y2="7" />
                    <line x1="12" y1="11" x2="12" y2="17" />
                  </svg>
                </Button>
              </Link>
            </>
          )}
          <Button variant="ghost" onClick={openWhatsApp} className="p-1">
            <MessageCircle className="h-5 w-5" />
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Mobile Footer */}
      <Footer className="mt-auto" />
    </div>
  );
    </div>
  );
};

export default Layout;