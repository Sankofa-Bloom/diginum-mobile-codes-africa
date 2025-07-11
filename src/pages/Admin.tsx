import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  CreditCard, 
  Phone, 
  TrendingUp, 
  Filter,
  Download,
  RefreshCw,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import LanguageToggle from '@/components/LanguageToggle';
import { toast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  userId: string;
  userPhone: string;
  service: string;
  country: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  paymentMethod: 'mtn' | 'orange';
  phoneNumber?: string;
  smsCode?: string;
  createdAt: string;
  completedAt?: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Mock data - In real app, this would come from API
  const [transactions, setTransactions] = React.useState<Transaction[]>([
    {
      id: 'TXN001',
      userId: 'USR001',
      userPhone: '+237675123456',
      service: 'WhatsApp',
      country: 'États-Unis',
      amount: 950,
      status: 'completed',
      paymentMethod: 'mtn',
      phoneNumber: '+1234567890',
      smsCode: '123456',
      createdAt: '2024-01-15T10:30:00Z',
      completedAt: '2024-01-15T10:32:00Z',
    },
    {
      id: 'TXN002',
      userId: 'USR002',
      userPhone: '+237670987654',
      service: 'Telegram',
      country: 'Royaume-Uni',
      amount: 750,
      status: 'pending',
      paymentMethod: 'orange',
      phoneNumber: '+4476543210',
      createdAt: '2024-01-15T11:15:00Z',
    },
    {
      id: 'TXN003',
      userId: 'USR001',
      userPhone: '+237675123456',
      service: 'Facebook',
      country: 'France',
      amount: 800,
      status: 'failed',
      paymentMethod: 'mtn',
      createdAt: '2024-01-15T09:45:00Z',
    },
    {
      id: 'TXN004',
      userId: 'USR003',
      userPhone: '+237691234567',
      service: 'Instagram',
      country: 'Allemagne',
      amount: 850,
      status: 'completed',
      paymentMethod: 'orange',
      phoneNumber: '+49123456789',
      smsCode: '789012',
      createdAt: '2024-01-15T08:20:00Z',
      completedAt: '2024-01-15T08:22:00Z',
    },
  ]);

  const stats = {
    totalTransactions: transactions.length,
    totalRevenue: transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0),
    successRate: Math.round(
      (transactions.filter(t => t.status === 'completed').length / transactions.length) * 100
    ),
    activeOrders: transactions.filter(t => t.status === 'pending').length,
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.userPhone.includes(searchTerm) ||
                         transaction.service.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="status-active bg-success/10 text-success border-success/20">Terminé</Badge>;
      case 'pending':
        return <Badge className="status-pending">En attente</Badge>;
      case 'failed':
        return <Badge className="status-expired">Échoué</Badge>;
      case 'refunded':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Remboursé</Badge>;
      default:
        return null;
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'mtn':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">MTN MoMo</Badge>;
      case 'orange':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Orange Money</Badge>;
      default:
        return null;
    }
  };

  const handleRefund = (transactionId: string) => {
    setTransactions(prev => prev.map(t => 
      t.id === transactionId 
        ? { ...t, status: 'refunded' as const }
        : t
    ));
    toast({
      title: 'Remboursement effectué',
      description: `Transaction ${transactionId} remboursée avec succès.`,
    });
  };

  const handleForceComplete = (transactionId: string) => {
    setTransactions(prev => prev.map(t => 
      t.id === transactionId 
        ? { 
            ...t, 
            status: 'completed' as const,
            phoneNumber: '+1987654321',
            smsCode: '654321',
            completedAt: new Date().toISOString()
          }
        : t
    ));
    toast({
      title: 'Commande forcée',
      description: `Transaction ${transactionId} marquée comme terminée.`,
    });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: 'Données mises à jour',
        description: 'Les dernières transactions ont été récupérées.',
      });
    }, 1500);
  };

  const exportData = () => {
    const csvContent = [
      ['ID', 'Utilisateur', 'Service', 'Pays', 'Montant', 'Status', 'Paiement', 'Date'].join(','),
      ...filteredTransactions.map(t => [
        t.id,
        t.userPhone,
        t.service,
        t.country,
        t.amount,
        t.status,
        t.paymentMethod,
        new Date(t.createdAt).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diginum-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container-mobile py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
              <h1 className="text-xl font-bold">Administration DigiNum</h1>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container-mobile py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalTransactions}</div>
              <div className="text-sm text-muted-foreground">Transactions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-success">₣{stats.totalRevenue.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Revenus</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-charcoal">{stats.successRate}%</div>
              <div className="text-sm text-muted-foreground">Taux succès</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-warning">{stats.activeOrders}</div>
              <div className="text-sm text-muted-foreground">En attente</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Filtres et Recherche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Rechercher par ID, téléphone, service..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="failed">Échoué</SelectItem>
                  <SelectItem value="refunded">Remboursé</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={exportData}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Exporter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Transactions ({filteredTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Pays</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-sm">{transaction.id}</TableCell>
                      <TableCell>{transaction.userPhone}</TableCell>
                      <TableCell>{transaction.service}</TableCell>
                      <TableCell>{transaction.country}</TableCell>
                      <TableCell className="font-semibold">₣{transaction.amount.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell>{getPaymentMethodBadge(transaction.paymentMethod)}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(transaction.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {transaction.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-success"
                              onClick={() => handleForceComplete(transaction.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {(transaction.status === 'completed' || transaction.status === 'pending') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive"
                              onClick={() => handleRefund(transaction.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredTransactions.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold mb-2">Aucune transaction trouvée</h3>
                <p className="text-muted-foreground">
                  Aucune transaction ne correspond à vos critères de recherche.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">📊</div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2 text-blue-900">Rapports détaillés</h3>
                  <p className="text-blue-800 text-sm mb-4">
                    Générez des rapports complets sur les ventes, les utilisateurs et les performances.
                  </p>
                  <Button variant="outline" size="sm" className="border-blue-300 text-blue-700">
                    Générer rapport
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">⚙️</div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2 text-green-900">Configuration système</h3>
                  <p className="text-green-800 text-sm mb-4">
                    Gérez les prix, les fournisseurs d'API et les paramètres de paiement.
                  </p>
                  <Button variant="outline" size="sm" className="border-green-300 text-green-700">
                    Configurer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;