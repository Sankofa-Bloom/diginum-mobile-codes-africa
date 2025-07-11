import React from 'react';
import { Outlet } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Layout = () => {
  const openWhatsApp = () => {
    const message = encodeURIComponent("Bonjour, j'ai besoin d'aide avec DigiNum");
    window.open(`https://wa.me/237670000000?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <Outlet />
      
      {/* WhatsApp Support Button */}
      <Button 
        onClick={openWhatsApp}
        className="whatsapp-button"
        size="lg"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default Layout;