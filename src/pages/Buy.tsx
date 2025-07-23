import React, { useEffect, useState } from 'react';
import type { NumberOrder } from '@/lib/apiMock';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { getCurrentUser } from '@/lib/auth';
import { useSession } from '@/lib/supabaseClient';
import { ArrowLeft, CreditCard, AlertCircle, Smartphone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import CountrySelect from '@/components/CountrySelect';
import ServiceSelect from '@/components/ServiceSelect';
import LanguageToggle from '@/components/LanguageToggle';
import { apiMock } from '@/lib/apiMock';
import { fetchBuyData } from '@/lib/api';
import { useCurrencyConversion } from '@/hooks/useCurrency';

const Buy = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [price, setPrice] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [orderData, setOrderData] = useState({ order: null, number: null });
  const [step, setStep] = React.useState(1);
  const [user, setUser] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [order, setOrder] = React.useState<NumberOrder | null>(null);
  const [paymentSuccess, setPaymentSuccess] = React.useState(false);
  const { data: session } = useSession();

  React.useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }
      
      try {
        // Get services and countries from SMS provider
        const servicesData = await smsProvider.getServices();
        const countriesData = await Promise.all(
          servicesData.map(async (service) => {
            const countries = await smsProvider.getCountries(service);
            const countryPrices = await Promise.all(
              countries.map(async (c) => {
                const price = await smsProvider.getPrices(service, c.code);
                return {
                  name: c.name,
                  code: c.code,
                  price
                };
              })
            );
            return {
              name: service,
              countries: countryPrices
            };
          })
        );
        
        setServices(servicesData);
        setCountries(countriesData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load services and countries. Please try again.',
          variant: 'destructive',
        });
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate, toast]);

  useEffect(() => {
    if (selectedService) {
      const selectedCountries = countries.filter(c => c.service === selectedService);
      setCountries(selectedCountries);
    }
  }, [selectedService]);

  useEffect(() => {
    if (selectedCountry) {
      const selectedCountryData = countries.find(c => c.name === selectedCountry);
      setPrice(selectedCountryData?.price || 0);
    }
  }, [selectedCountry]);

  const handleBuy = async () => {
    if (!selectedCountry || !selectedService) {
      toast({
        title: 'Error',
        description: 'Please select a country and service.',
        variant: 'destructive',
      });
      return;
    }

    if (!session?.user) {
      navigate('/login', { replace: true });
      return;
    }

    try {
      const result = await api.buyNumber(selectedCountry, selectedService);
      setOrderData(result);
      navigate('/payment', {
        state: {
          order: result.order,
          number: result.number,
        },
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to purchase number. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleProceedToPayment = async () => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!selectedCountry || !selectedService) return;
    setIsLoading(true);
    try {
      // Get price directly from SMS provider
      const basePrice = await smsProvider.getPrices(selectedService, selectedCountry);
      
      // Convert price to USD with adjustments
      const { priceInUSD, loading, error } = useCurrencyConversion(
        basePrice,
        'USD', // Base currency
        selectedService,
        selectedCountry
      );

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to calculate price. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      // Buy number from SMS provider
      const result = await smsProvider.rentNumber({
        service: selectedService,
        country: selectedCountry,
        maxPrice: priceInUSD
      });

      // Save order in Supabase
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          number_id: result.id,
          phone_number: result.phoneNumber,
          country: selectedCountry,
          service: selectedService,
          price: priceInUSD,
          status: 'active',
          expires_at: result.expiresAt,
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error saving order:', orderError);
        toast({
          title: 'Error',
          description: 'Failed to save order. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      navigate('/payment', {
        state: {
          order,
          country: selectedCountry,
          service: selectedService,
          totalPrice: priceInUSD,
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Block steps 3-5 if not authenticated
  const isProtectedStep = step >= 3;
  if (isProtectedStep && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Login Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">You must be logged in to continue purchasing a number.</p>
            <Button className="btn-primary w-full" onClick={() => navigate('/login', { state: { from: '/buy' } })}>
              Login or Signup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg text-muted-foreground">Loading countries and services...</div>
      </div>
    );
  }

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
                onClick={() => step === 1 ? navigate('/') : setStep(step - 1)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {step === 1 ? 'Back' : 'Previous'}
              </Button>
              <h1 className="text-xl font-bold">Buy a Number</h1>
            </div>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <div className="container-mobile py-6 space-y-6">
        {/* Stepper */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {[1,2,3,4,5].map((s, idx) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 ${step === s ? 'font-bold text-primary' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>{s}</div>
                <span>{[
                  'Select Country',
                  'Select Service',
                  'Review Order',
                  'Payment',
                  'Confirmation',
                ][s-1]}</span>
              </div>
              {s < 5 && <div className="w-8 h-px bg-border"></div>}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Select Country */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🌍
                1. Select a country
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CountrySelect
                value={selectedCountry}
                onValueChange={val => setSelectedCountry(val)}
                countries={countries}
              />
              <div className="flex justify-end mt-6">
                <Button
                  className="btn-primary"
                  disabled={!selectedCountry}
                  onClick={() => setStep(2)}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Service */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                2. Choose your service
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ServiceSelect
                services={services}
                selectedService={selectedService}
                onServiceSelect={setSelectedService}
              />
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button
                  className="btn-primary"
                  disabled={!selectedService}
                  onClick={() => setStep(3)}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review Order */}
        {step === 3 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                3. Review your order
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Service: {selectedService}</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Country: {selectedCountry}</span>
                  <span>$0.00</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total Price</span>
                    <span className="text-primary">${price.toFixed(2)} USD</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button
                  className="btn-primary"
                  onClick={() => setStep(4)}
                  disabled={!selectedCountry || !selectedService}
                >
                  Proceed to Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Payment */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                4. Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span>Service:</span>
                  <span>{selectedServiceData?.name}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Country:</span>
                  <span>{selectedCountryData?.name}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Total:</span>
                  <span className="font-bold text-primary">₣{totalPrice.toLocaleString()} XAF</span>
                </div>
              </div>
              <Button
                className="btn-primary w-full h-12 text-lg"
                disabled={isLoading}
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    const orderResult = await apiMock.buyNumber(selectedCountryData?.name || '', selectedServiceData?.name || '');
                    setOrder(orderResult);
                    setPaymentSuccess(true);
                    setStep(5);
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                {isLoading ? 'Processing...' : 'Pay Now'}
              </Button>
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Confirmation */}
        {step === 5 && paymentSuccess && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ✅
                5. Confirmation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl mb-2">🎉</div>
                <h2 className="text-xl font-bold mb-2">Your order is confirmed!</h2>
                <p className="mb-2">Your virtual number is being prepared and will be ready shortly.</p>
                <div className="mb-2">Order ID: <span className="font-mono">{order?.id}</span></div>
                <div className="mb-2">Number: <span className="font-mono">{order?.phoneNumber || '...'}</span></div>
                <div className="mb-2">Service: {order?.service}</div>
                <div className="mb-2">Country: {order?.country}</div>
                <div className="mb-2">Expires At: {order?.expiresAt ? new Date(order.expiresAt).toLocaleTimeString() : '...'}</div>
              </div>
              <div className="flex justify-center mt-6">
                <Button className="btn-primary" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

import PrivateRoute from '@/components/PrivateRoute';

export default () => (
  <PrivateRoute>
    <Buy />
  </PrivateRoute>
);