import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Phone, Wallet, User, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

const navItems = [
  { icon: <Home className="h-5 w-5" />, label: 'nav.home', path: '/' },
  { icon: <Phone className="h-5 w-5" />, label: 'nav.buy', path: '/buy' },
  { icon: <Wallet className="h-5 w-5" />, label: 'nav.payment', path: '/payment' },
  { icon: <User className="h-5 w-5" />, label: 'nav.profile', path: '/profile' },
  { icon: <Globe className="h-5 w-5" />, label: 'nav.support', path: '/support' },
];

export const BottomNav = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentPath = window.location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            className={`flex flex-col items-center space-y-1 p-0 h-full transition-all duration-200 ${
              currentPath === item.path
                ? 'text-primary border-t-2 border-primary'
                : 'text-gray-600 hover:text-primary'
            }`}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            <span className="text-xs font-medium">{t(item.label)}</span>
          </Button>
        ))}
      </div>
    </nav>
  );
};
