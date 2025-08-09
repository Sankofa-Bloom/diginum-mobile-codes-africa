import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, Menu, X, User, LogOut, Home, ShoppingCart, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { getCurrentUser, logout } from '@/lib/auth';
import Footer from './Footer';
import CurrencySelector from './CurrencySelector';

const Layout = () => {
  const openWhatsApp = () => {
    const message = encodeURIComponent("Bonjour, j'ai besoin d'aide avec DigiNum");
    window.open(`https://wa.me/237673289043?text=${message}`, '_blank');
  };

  const [user, setUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    // Close mobile menu when route changes
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    navigate('/');
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  const NavLink = ({ to, children, icon: Icon }: { to: string; children: React.ReactNode; icon?: any }) => (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
        isActiveRoute(to)
          ? 'bg-primary text-primary-foreground'
          : 'text-foreground hover:bg-muted hover:text-primary'
      }`}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </Link>
  );

  const MobileNavLink = ({ to, children, icon: Icon }: { to: string; children: React.ReactNode; icon?: any }) => (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
        isActiveRoute(to)
          ? 'bg-primary text-primary-foreground'
          : 'text-foreground hover:bg-muted'
      }`}
    >
      {Icon && <Icon className="h-5 w-5" />}
      {children}
    </Link>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Modern Responsive Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container-mobile">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="h-10 w-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                  <img src="/logo.svg" alt="DigiNum Logo" className="h-6 w-6" />
                </div>
                <span className="text-xl font-bold text-primary tracking-tight hidden sm:block">
                  DigiNum
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/" icon={Home}>Home</NavLink>
              <NavLink to="/buy" icon={ShoppingCart}>Buy</NavLink>
              {user && (
                <NavLink to="/dashboard" icon={BarChart3}>Dashboard</NavLink>
              )}
            </nav>

            {/* Desktop Auth/User Actions */}
            <div className="hidden md:flex items-center gap-3">
              <CurrencySelector />
              {user ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground max-w-[120px] truncate">
                      {user.email}
                    </span>
                  </div>
                  <Button 
                    onClick={handleLogout} 
                    size="sm" 
                    variant="outline"
                    className="gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" size="sm" className="font-medium">
                      Login
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button size="sm" className="font-medium">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                  <div className="flex flex-col h-full">
                    {/* Mobile Menu Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                          <img src="/logo.svg" alt="DigiNum Logo" className="h-5 w-5" />
                        </div>
                        <span className="text-lg font-bold text-primary">DigiNum</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Mobile Navigation */}
                    <nav className="flex flex-col gap-2 mb-6">
                      <MobileNavLink to="/" icon={Home}>Home</MobileNavLink>
                      <MobileNavLink to="/buy" icon={ShoppingCart}>Buy Numbers</MobileNavLink>
                      {user && (
                        <MobileNavLink to="/dashboard" icon={BarChart3}>Dashboard</MobileNavLink>
                      )}
                    </nav>

                    {/* Mobile Currency Selector */}
                    <div className="mb-6">
                      <CurrencySelector />
                    </div>

                    {/* Mobile Auth/User Actions */}
                    <div className="mt-auto">
                      {user ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/50">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {user.email}
                              </p>
                              <p className="text-xs text-muted-foreground">Logged in</p>
                            </div>
                          </div>
                          <Button 
                            onClick={handleLogout} 
                            variant="outline" 
                            className="w-full gap-2"
                          >
                            <LogOut className="h-4 w-4" />
                            Logout
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Link to="/login" className="block">
                            <Button variant="outline" className="w-full">
                              Login
                            </Button>
                          </Link>
                          <Link to="/signup" className="block">
                            <Button className="w-full">
                              Sign Up
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <Outlet />

      {/* WhatsApp Support Button - floating bottom right */}
      <Button 
        onClick={openWhatsApp}
        className="fixed bottom-6 right-6 rounded-full shadow-lg bg-green-500 hover:bg-green-600 text-white p-0 h-14 w-14 flex items-center justify-center z-50 transition-all duration-200 hover:scale-110"
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