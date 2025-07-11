import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, RefreshCw, Clock, TrendingUp, Phone, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NumberCard from '@/components/NumberCard';
import LanguageToggle from '@/components/LanguageToggle';
import { toast } from '@/hooks/use-toast';

interface NumberOrder {
  id: string;
  phoneNumber: string;
  service: string;
  country: string;
  status: 'active' | 'completed' | 'expired' | 'pending';
  smsCode?: string;
  expiresAt: string;
  createdAt: string;
  price: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = React.useState<NumberOrder[]>([
    {
      id: '1',
      phoneNumber: '+1234567890',
      service: 'WhatsApp',
      country: 'États-Unis',
      status: 'completed',
      smsCode: '123456',
      expiresAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
      price: 950,
    },
    {
      id: '2',
      phoneNumber: '+4476543210',
      service: 'Telegram',
      country: 'Royaume-Uni',
      status: 'active',
      expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString(), // 15 minutes from now
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
      price: 750,
    },
  ]);

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Add new order from payment if it exists
  React.useEffect(() => {
    if (location.state?.newOrder) {
      setOrders(prev => [location.state.newOrder, ...prev]);
      toast({
        title: 'Numéro activé!',
        description: 'Votre numéro virtuel est prêt à recevoir des SMS.',
      });
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const activeOrders = orders.filter(order => order.status === 'active');
  const completedOrders = orders.filter(order => order.status === 'completed');
  const expiredOrders = orders.filter(order => order.status === 'expired');

  const totalSpent = orders.reduce((sum, order) => sum + order.price, 0);
  const successRate = orders.length > 0 ? Math.round((completedOrders.length / orders.length) * 100) : 0;

  const handleRefreshOrder = async (orderId: string) => {
    setIsRefreshing(true);
    
    // Simulate API call to check for SMS
    setTimeout(() => {
      // Simulate receiving SMS for demo
      if (Math.random() > 0.5) {
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, smsCode: '987654', status: 'completed' as const }
            : order
        ));
        toast({
          title: 'Code SMS reçu!',
          description: 'Votre code de vérification est arrivé.',
        });
      } else {
        toast({
          title: 'Aucun SMS',
          description: 'Aucun nouveau message. Réessayez dans quelques secondes.',
        });
      }
      setIsRefreshing(false);
    }, 1500);
  };

  const handleCancelOrder = async (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'expired' as const }
        : order
    ));
    toast({
      title: 'Commande annulée',
      description: 'Votre numéro a été libéré.',
    });
  };

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
              <h1 className="text-xl font-bold">Mes Numéros</h1>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profil</span>
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
              <div className="text-sm text-muted-foreground">Actifs</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-charcoal">₣{totalSpent.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Dépensé</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-success">{successRate}%</div>
              <div className="text-sm text-muted-foreground">Succès</div>
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
            Nouveau Numéro
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
              Historique des numéros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="active" className="gap-2">
                  Actifs ({activeOrders.length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-2">
                  Terminés ({completedOrders.length})
                </TabsTrigger>
                <TabsTrigger value="expired" className="gap-2">
                  Expirés ({expiredOrders.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-4 mt-6">
                {activeOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📱</div>
                    <h3 className="text-lg font-semibold mb-2">Aucun numéro actif</h3>
                    <p className="text-muted-foreground mb-4">
                      Commandez votre premier numéro virtuel pour commencer
                    </p>
                    <Button onClick={() => navigate('/buy')} className="btn-primary">
                      Acheter maintenant
                    </Button>
                  </div>
                ) : (
                  activeOrders.map((order) => (
                    <NumberCard
                      key={order.id}
                      order={order}
                      onRefresh={handleRefreshOrder}
                      onCancel={handleCancelOrder}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-4 mt-6">
                {completedOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">✅</div>
                    <h3 className="text-lg font-semibold mb-2">Aucun numéro terminé</h3>
                    <p className="text-muted-foreground">
                      Les numéros avec codes SMS reçus apparaîtront ici
                    </p>
                  </div>
                ) : (
                  completedOrders.map((order) => (
                    <NumberCard key={order.id} order={order} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="expired" className="space-y-4 mt-6">
                {expiredOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">⏰</div>
                    <h3 className="text-lg font-semibold mb-2">Aucun numéro expiré</h3>
                    <p className="text-muted-foreground">
                      Les numéros non utilisés dans les temps apparaîtront ici
                    </p>
                  </div>
                ) : (
                  expiredOrders.map((order) => (
                    <NumberCard key={order.id} order={order} />
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
                <h3 className="font-bold text-lg mb-2">Programme de parrainage</h3>
                <p className="text-muted-foreground mb-4">
                  Partagez DigiNum avec vos amis et gagnez ₣500 XAF pour chaque nouveau client qui effectue un achat.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm">
                    Mon code: DIGI2024
                  </Button>
                  <Button variant="outline" size="sm">
                    Partager
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
                <h3 className="font-semibold text-blue-900">Besoin d'aide ?</h3>
                <p className="text-blue-800 text-sm">
                  Notre équipe support est disponible 24/7 via WhatsApp pour vous aider avec vos numéros virtuels.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  onClick={() => {
                    const message = encodeURIComponent("Bonjour, j'ai besoin d'aide avec mon tableau de bord DigiNum");
                    window.open(`https://wa.me/237670000000?text=${message}`, '_blank');
                  }}
                >
                  Contacter le support
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;