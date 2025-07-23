import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="w-full bg-white border-t py-8 mt-10">
    <div className="container-mobile flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex flex-col items-center md:items-start">
        <div className="flex items-center gap-2 mb-2">
          <img src="/logo.svg" alt="DigiNum Logo" className="h-8 w-8" />
          <span className="text-xl font-bold text-primary">DigiNum</span>
        </div>
        <p className="text-muted-foreground text-sm max-w-xs text-center md:text-left">
          Your trusted solution for virtual numbers in Africa.
        </p>
        <div className="mt-2 text-xs text-muted-foreground">Contact: <a href="mailto:diginum237@gmail.com" className="underline">diginum237@gmail.com</a> | WhatsApp: <a href="https://wa.me/237673289043" className="underline">673289043</a></div>
      </div>
      <div className="flex flex-col items-center md:items-end gap-2">
        <Link to="/terms" className="text-sm text-foreground hover:underline">Terms of Use</Link>
        <Link to="/privacy" className="text-sm text-foreground hover:underline">Privacy Policy</Link>
        <Link to="/support" className="text-sm text-foreground hover:underline">Support</Link>
      </div>
    </div>
    <div className="text-center text-xs text-muted-foreground mt-4">&copy; {new Date().getFullYear()} DigiNum. All rights reserved.</div>
  </footer>
);

export default Footer;
