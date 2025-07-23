import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, RefreshCw, Clock, TrendingUp, Phone, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NumberCard from '@/components/NumberCard';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { fetchDashboardOrders } from '@/lib/api';



const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [orders, setOrders] = React.useState<any[]>([]);
const [isLoading, setIsLoading] = React.useState(true);
const [error, setError] = React.useState<string | null>(null);

const [isRefreshing, setIsRefreshing] = React.useState(false);

// Fetch orders from real API on mount
React.useEffect(() => {
  setIsLoading(true);
  fetchDashboardOrders()
    .then(data => {
      setOrders(data.orders || data); // backend may return {orders: [...]}
      setError(null);
    })
    .catch(e => {
      setError(e.message || 'Failed to load dashboard data');
      setOrders([]);
    })
    .finally(() => setIsLoading(false));
}, []);

  // Add new order from payment if it exists
  React.useEffect(() => {
    if (location.state?.newOrder) {
      setOrders(prev => [location.state.newOrder, ...prev]);
      toast({
        title: 'Number activated!',
        description: 'Your virtual number is ready to receive SMS.',
      });
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const activeOrders = orders.filter(order => order.status === 'active' || order.status === 'waiting');
  const completedOrders = orders.filter(order => order.status === 'completed');
  const expiredOrders = orders.filter(order => order.status === 'expired');

  const totalSpent = orders.reduce((sum, order) => sum + order.price, 0);
  const successRate = orders.length > 0 ? Math.round((completedOrders.length / orders.length) * 100) : 0;

  const handleRefreshOrder = async (orderId: string) => {
    setIsRefreshing(true);
    
    // Use mock API to check for SMS
    apiMock.getSmsCode(orderId).then(({ smsCode }) => {
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, smsCode, status: 'completed' as const }
          : order
      ));
      toast({
        title: 'SMS code received!',
        description: 'Your verification code has arrived.',
      });
      setIsRefreshing(false);
    }).catch(() => {
      toast({
        title: 'No SMS',
        description: 'No new message. Try again in a few seconds.',
      });
      setIsRefreshing(false);
    });
  };

  const handleCancelOrder = async (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'expired' as const }
        : order
    ));
    toast({
      title: 'Order cancelled',
      description: 'Your number has been released.',
    });
  };

  const handleRequestAnotherSMS = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Show confirmation with discounted price (50% off)
    const discountedPrice = Math.round(order.price * 0.5);
    const confirmed = window.confirm(
      `${t('dashboard.requestAnother')}?\n\nDiscounted price: ₣${discountedPrice.toLocaleString()} XAF (50% off)\n\nConfirm?`
    );

    if (confirmed) {
      // Create a new order with discounted price
      const newOrder: NumberOrder = {
        id: Date.now().toString(),
        phoneNumber: order.phoneNumber,
        service: order.service,
        country: order.country,
        status: 'active',
        expiresAt: new Date(Date.now() + 1000 * 60 * 20).toISOString(), // 20 minutes
        createdAt: new Date().toISOString(),
        price: discountedPrice,
      };

      setOrders(prev => [newOrder, ...prev]);
      toast({
        title: 'New SMS requested!',
        description: `New number activated with 50% discount (₣${discountedPrice.toLocaleString()} XAF)`,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full">
          <div className="bg-red-100 text-red-700 p-6 rounded-lg shadow text-center">
            <div className="font-bold mb-2">Error loading dashboard</div>
            <div className="mb-4">{error}</div>
            <button className="btn-primary" onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container-mobile py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold">My Numbers</h1>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container-mobile py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{orders.length}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-success">{activeOrders.length}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-charcoal">₣{totalSpent.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Spent</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-success">{successRate}%</div>
              <div className="text-sm text-muted-foreground">Success</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4">
          <Button
            onClick={() => navigate('/buy')}
            className="btn-primary flex-1 h-12"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Number
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            disabled={isRefreshing}
            className="h-12 px-6"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Orders Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Number History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="active" className="gap-2">
                  Active ({activeOrders.length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-2">
                  Completed ({completedOrders.length})
                </TabsTrigger>
                <TabsTrigger value="expired" className="gap-2">
                  Expired ({expiredOrders.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-4 mt-6">
                {activeOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📱</div>
                    <h3 className="text-lg font-semibold mb-2">No active numbers</h3>
                    <p className="text-muted-foreground mb-4">
                      Order your first virtual number to get started
                    </p>
                    <Button onClick={() => navigate('/buy')} className="btn-primary">
                      Buy now
                    </Button>
                  </div>
                ) : (
                  activeOrders.map((order) => (
                     <NumberCard
                       key={order.id}
                       order={order}
                       onRefresh={handleRefreshOrder}
                       onCancel={handleCancelOrder}
                       onRequestAnother={handleRequestAnotherSMS}
                     />
                  ))
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-4 mt-6">
                {completedOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">✅</div>
                    <h3 className="text-lg font-semibold mb-2">No completed numbers</h3>
                    <p className="text-muted-foreground">
                      Numbers with received SMS codes will appear here
                    </p>
                  </div>
                 ) : (
                   completedOrders.map((order) => (
                     <NumberCard key={order.id} order={order} onRequestAnother={handleRequestAnotherSMS} />
                   ))
                 )}
              </TabsContent>

              <TabsContent value="expired" className="space-y-4 mt-6">
                {expiredOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">⏰</div>
                    <h3 className="text-lg font-semibold mb-2">No expired numbers</h3>
                    <p className="text-muted-foreground">
                      Numbers not used in time will appear here
                    </p>
                  </div>
                 ) : (
                   expiredOrders.map((order) => (
                     <NumberCard key={order.id} order={order} onRequestAnother={handleRequestAnotherSMS} />
                   ))
                 )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Referral Section */}
        <Card className="bg-gradient-to-r from-primary/5 to-success/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🎁</div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-2">Referral Program</h3>
                <p className="text-muted-foreground mb-4">
                  Share DigiNum with your friends and earn ₣500 XAF for each new customer who makes a purchase.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm">
                    My code: DIGI2024
                  </Button>
                  <Button variant="outline" size="sm">
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="text-blue-500">💡</div>
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-900">Need help?</h3>
                <p className="text-blue-800 text-sm">
                  Our support team is available 24/7 via WhatsApp to help you with your virtual numbers.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  onClick={() => {
                    const message = encodeURIComponent("Hello, I need help with my DigiNum dashboard");
                    window.open(`https://wa.me/237670000000?text=${message}`, '_blank');
                  }}
                >
                  Contact us on Telegram @Diginum
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

import PrivateRoute from '@/components/PrivateRoute';

export default () => (
  <PrivateRoute>
    <Dashboard />
  </PrivateRoute>
);