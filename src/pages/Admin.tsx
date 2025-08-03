import React, { useState, useEffect } from 'react';
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
  Clock,
  Settings,
  DollarSign,
  Globe,
  BarChart3,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock2,
  Edit,
  Save,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { getCurrentUser } from '@/lib/auth';
import {
  fetchAdminDashboardStats,
  fetchAdminSystemSettings,
  updateAdminSystemSettings,
  updateExchangeRate,
  updatePriceAdjustment,
  fetchAdminRecentTransactions,
  fetchAdminExchangeRates,
  fetchAdminPriceAdjustments
} from '@/lib/api';

interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  recentOrders: number;
  activeOrders: number;
  pendingPayments: number;
  successRate: number;
}

interface SystemSettings {
  smsApiKey: string;
  smsApiKeyConfigured: boolean;
  defaultMarkup: number;
  campayConfigured: boolean;
  stripeConfigured: boolean;
  serverTime: string;
  environment: string;
}

interface ExchangeRate {
  id: string;
  currency: string;
  rate: number;
  markup: number;
  updated_at: string;
}

interface PriceAdjustment {
  id: string;
  service: string;
  country: string;
  markup: number;
  updated_at: string;
}

interface Transaction {
  id: string;
  type: 'order' | 'payment';
  userId: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
  phoneNumber?: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Dashboard Stats
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [priceAdjustments, setPriceAdjustments] = useState<PriceAdjustment[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  // Settings state
  const [newSmsApiKey, setNewSmsApiKey] = useState('');
  const [newDefaultMarkup, setNewDefaultMarkup] = useState('');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // Exchange rate editing
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [editingRateValue, setEditingRateValue] = useState('');
  const [editingMarkup, setEditingMarkup] = useState('');

  // Price adjustment editing
  const [editingPriceAdjustment, setEditingPriceAdjustment] = useState<string | null>(null);
  const [editingPriceMarkup, setEditingPriceMarkup] = useState('');

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          navigate('/login', { replace: true });
          return;
        }
        setUser(currentUser);
        setIsLoading(false);
      } catch (error) {
        console.error('Auth error:', error);
        navigate('/login', { replace: true });
      }
    };
    checkAuth();
  }, [navigate]);

  // Load dashboard data
  useEffect(() => {
    if (!user) return;
    
    const loadDashboardData = async () => {
      try {
        const [statsData, settingsData, ratesData, adjustmentsData, transactionsData] = await Promise.all([
          fetchAdminDashboardStats(),
          fetchAdminSystemSettings(),
          fetchAdminExchangeRates(),
          fetchAdminPriceAdjustments(),
          fetchAdminRecentTransactions(20)
        ]);

        setStats(statsData);
        setSystemSettings(settingsData);
        setExchangeRates(ratesData);
        setPriceAdjustments(adjustmentsData);
        setRecentTransactions(transactionsData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast.error('Failed to load dashboard data');
      }
    };

    loadDashboardData();
  }, [user]);

  const handleUpdateSettings = async () => {
    setIsUpdatingSettings(true);
    try {
      const updateData: any = {};
      if (newSmsApiKey) updateData.smsApiKey = newSmsApiKey;
      if (newDefaultMarkup) updateData.defaultMarkup = parseFloat(newDefaultMarkup);

      await updateAdminSystemSettings(updateData);
      toast.success('Settings updated successfully');
      
      // Reload settings
      const settingsData = await fetchAdminSystemSettings();
      setSystemSettings(settingsData);
      
      setNewSmsApiKey('');
      setNewDefaultMarkup('');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleUpdateExchangeRate = async (currency: string) => {
    try {
      await updateExchangeRate(currency, {
        rate: parseFloat(editingRateValue),
        markup: parseFloat(editingMarkup)
      });
      
      toast.success(`Exchange rate for ${currency} updated successfully`);
      setEditingRate(null);
      setEditingRateValue('');
      setEditingMarkup('');
      
      // Reload exchange rates
      const ratesData = await fetchAdminExchangeRates();
      setExchangeRates(ratesData);
    } catch (error) {
      console.error('Error updating exchange rate:', error);
      toast.error('Failed to update exchange rate');
    }
  };

  const handleUpdatePriceAdjustment = async (id: string) => {
    try {
      await updatePriceAdjustment(id, {
        markup: parseFloat(editingPriceMarkup)
      });
      
      toast.success('Price adjustment updated successfully');
      setEditingPriceAdjustment(null);
      setEditingPriceMarkup('');
      
      // Reload price adjustments
      const adjustmentsData = await fetchAdminPriceAdjustments();
      setPriceAdjustments(adjustmentsData);
    } catch (error) {
      console.error('Error updating price adjustment:', error);
      toast.error('Failed to update price adjustment');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Failed</Badge>;
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Active</Badge>;
      case 'waiting':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Waiting</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Phone className="h-4 w-4 text-blue-600" />;
      case 'payment':
        return <CreditCard className="h-4 w-4 text-green-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

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
                Back
              </Button>
              <h1 className="text-xl font-bold">DigiNum Admin Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container-mobile py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="exchange-rates" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Exchange Rates
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{stats.totalUsers}</div>
                    <div className="text-sm text-muted-foreground">Total Users</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-success">${stats.totalRevenue.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Revenue</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.totalOrders}</div>
                    <div className="text-sm text-muted-foreground">Total Orders</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">{stats.successRate}%</div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* System Status */}
            {systemSettings && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                                             {systemSettings.smsApiKeyConfigured ? (
                         <CheckCircle2 className="h-4 w-4 text-green-600" />
                       ) : (
                         <XCircle className="h-4 w-4 text-red-600" />
                       )}
                      <span className="text-sm">SMS API</span>
                    </div>
                    <div className="flex items-center gap-2">
                                             {systemSettings.campayConfigured ? (
                         <CheckCircle2 className="h-4 w-4 text-green-600" />
                       ) : (
                         <XCircle className="h-4 w-4 text-red-600" />
                       )}
                      <span className="text-sm">Campay</span>
                    </div>
                    <div className="flex items-center gap-2">
                                             {systemSettings.stripeConfigured ? (
                         <CheckCircle2 className="h-4 w-4 text-green-600" />
                       ) : (
                         <XCircle className="h-4 w-4 text-red-600" />
                       )}
                      <span className="text-sm">Stripe</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock2 className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">{systemSettings.environment}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentTransactions.slice(0, 10).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getTransactionTypeIcon(transaction.type)}
                        <div>
                          <div className="font-medium">{transaction.description}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(transaction.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">${transaction.amount}</span>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionTypeIcon(transaction.type)}
                            <span className="capitalize">{transaction.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className="font-medium">${transaction.amount}</TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exchange Rates Tab */}
          <TabsContent value="exchange-rates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Exchange Rates Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Currency</TableHead>
                      <TableHead>Rate (1 USD = X)</TableHead>
                      <TableHead>Markup (%)</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exchangeRates.map((rate) => (
                      <TableRow key={rate.id}>
                        <TableCell className="font-medium">{rate.currency}</TableCell>
                        <TableCell>
                          {editingRate === rate.currency ? (
                            <Input
                              type="number"
                              step="0.000001"
                              value={editingRateValue}
                              onChange={(e) => setEditingRateValue(e.target.value)}
                              className="w-24"
                            />
                          ) : (
                            rate.rate.toFixed(6)
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRate === rate.currency ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editingMarkup}
                              onChange={(e) => setEditingMarkup(e.target.value)}
                              className="w-20"
                            />
                          ) : (
                            `${rate.markup}%`
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(rate.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {editingRate === rate.currency ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleUpdateExchangeRate(rate.currency)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingRate(null);
                                  setEditingRateValue('');
                                  setEditingMarkup('');
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingRate(rate.currency);
                                setEditingRateValue(rate.rate.toString());
                                setEditingMarkup(rate.markup.toString());
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Price Adjustments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Markup (%)</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceAdjustments.map((adjustment) => (
                      <TableRow key={adjustment.id}>
                        <TableCell className="font-medium capitalize">{adjustment.service}</TableCell>
                        <TableCell>{adjustment.country}</TableCell>
                        <TableCell>
                          {editingPriceAdjustment === adjustment.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editingPriceMarkup}
                              onChange={(e) => setEditingPriceMarkup(e.target.value)}
                              className="w-20"
                            />
                          ) : (
                            `${adjustment.markup}%`
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(adjustment.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {editingPriceAdjustment === adjustment.id ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleUpdatePriceAdjustment(adjustment.id)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingPriceAdjustment(null);
                                  setEditingPriceMarkup('');
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingPriceAdjustment(adjustment.id);
                                setEditingPriceMarkup(adjustment.markup.toString());
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* SMS API Key */}
                <div className="space-y-2">
                  <Label htmlFor="smsApiKey">SMS API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="smsApiKey"
                      type="password"
                      placeholder="Enter new SMS API key"
                      value={newSmsApiKey}
                      onChange={(e) => setNewSmsApiKey(e.target.value)}
                    />
                    <Button
                      onClick={handleUpdateSettings}
                      disabled={isUpdatingSettings || !newSmsApiKey}
                    >
                      {isUpdatingSettings ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {systemSettings && (
                    <p className="text-sm text-muted-foreground">
                      Current: {systemSettings.smsApiKey} 
                      {systemSettings.smsApiKeyConfigured ? (
                        <span className="text-green-600 ml-2">✓ Configured</span>
                      ) : (
                        <span className="text-red-600 ml-2">✗ Not configured</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Default Markup */}
                <div className="space-y-2">
                  <Label htmlFor="defaultMarkup">Default Markup (%)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="defaultMarkup"
                      type="number"
                      step="0.01"
                      placeholder="Enter default markup percentage"
                      value={newDefaultMarkup}
                      onChange={(e) => setNewDefaultMarkup(e.target.value)}
                    />
                    <Button
                      onClick={handleUpdateSettings}
                      disabled={isUpdatingSettings || !newDefaultMarkup}
                    >
                      {isUpdatingSettings ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {systemSettings && (
                    <p className="text-sm text-muted-foreground">
                      Current: {systemSettings.defaultMarkup}%
                    </p>
                  )}
                </div>

                {/* System Info */}
                {systemSettings && (
                  <div className="space-y-2">
                    <Label>System Information</Label>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Environment:</span> {systemSettings.environment}
                      </div>
                      <div>
                        <span className="font-medium">Server Time:</span> {new Date(systemSettings.serverTime).toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Campay:</span> 
                        {systemSettings.campayConfigured ? (
                          <span className="text-green-600 ml-2">✓ Configured</span>
                        ) : (
                          <span className="text-red-600 ml-2">✗ Not configured</span>
                        )}
                      </div>
                      <div>
                        <span className="font-medium">Stripe:</span> 
                        {systemSettings.stripeConfigured ? (
                          <span className="text-green-600 ml-2">✓ Configured</span>
                        ) : (
                          <span className="text-red-600 ml-2">✗ Not configured</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;