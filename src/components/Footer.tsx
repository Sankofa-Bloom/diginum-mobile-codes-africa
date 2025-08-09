import React from 'react';
import { Link } from 'react-router-dom';
import VersionInfo from './VersionInfo';

const Footer = () => (
  <footer className="w-full bg-white border-t py-6 mt-8">
    <div className="container-mobile flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex flex-col items-center md:items-start">
        <div className="flex items-center gap-2 mb-1">
          <img src="/logo.svg" alt="DigiNum Logo" className="h-8 w-8" />
          <span className="text-xl font-bold text-primary">DigiNum</span>
        </div>
        <p className="text-muted-foreground text-sm max-w-xs text-center md:text-left">
          Your trusted solution for virtual numbers worldwide.
        </p>
        <div className="mt-2 text-xs text-muted-foreground">Contact us on Telegram: <a href="https://t.me/Diginum" className="underline">@Diginum</a></div>
      </div>
      <div className="flex flex-col items-center md:items-end gap-2">
        <Link to="/terms" className="text-sm text-foreground hover:underline">Terms of Use</Link>
        <Link to="/privacy" className="text-sm text-foreground hover:underline">Privacy Policy</Link>
        <Link to="/support" className="text-sm text-foreground hover:underline">Support</Link>
      </div>
    </div>
    <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-2 mt-4 pt-4 border-t">
      <div className="text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} DigiNum. All rights reserved.
      </div>
      <VersionInfo variant="footer" />
    </div>
  </footer>
);

export default Footer;
