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
import { ArrowLeft, CreditCard, AlertCircle, Smartphone, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import CountrySelect from '@/components/CountrySelect';
import ServiceSelect from '@/components/ServiceSelect';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { apiMock } from '@/lib/apiMock';
import { fetchBuyData } from '@/lib/api';
import { useCurrencyConversion } from '@/hooks/useCurrency';
import { Elements, useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const Buy = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLIC_KEY || '');
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
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const { data: session } = useSession();
  const { convertCurrency } = useCurrencyConversion();

  React.useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          toast({
            title: t('error.title'),
            description: t('buy.requireLogin'),
            variant: 'destructive',
          });
          navigate('/login', { replace: true });
          return;
        }

        // Check if user's session is still valid
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          toast({
            title: t('error.title'),
            description: t('error.sessionExpired'),
            variant: 'destructive',
          });
          supabase.auth.signOut();
          navigate('/login', { replace: true });
          return;
        }

        setUser(user);

        // Fetch buy data with currency conversion
        try {
          setLoading(true);
          const data = await fetchBuyData();
          
          if (!data || !data.services || data.services.length === 0) {
            throw new Error('No services available');
          }

          setServices(data.services);
          setCountries([]); // Reset countries when services load
          setLoading(false);

        } catch (error) {
          logger.error('Error fetching buy data:', error);
          toast({
            title: t('error.title'),
            description: t('error.dataLoad'),
            variant: 'destructive',
          });
          setLoading(false);
        }

      } catch (error) {
        logger.error('Error in Buy page auth check:', error);
        toast({
          title: t('error.title'),
          description: t('error.dataLoad'),
          variant: 'destructive',
        });
        setLoading(false);
      }
    };

    // Check auth immediately
    checkAuth();

    // Check auth periodically to handle token expiration
    const interval = setInterval(checkAuth, 300000); // Check every 5 minutes

    return () => {
      clearInterval(interval);
      // Cleanup any pending requests
      if (pendingRequests.current) {
        pendingRequests.current.forEach(req => req.abort());
      }
    };
  }, [navigate, toast, t, supabase]);

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

  const handleServiceChange = async (service: string) => {
    setSelectedService(service);
    setSelectedCountry('');
    setPrice(null);
    setCountries([]);
    setStep(1);
    setServiceError('');
    setCountryError('');
    setPriceError('');
    toast.dismiss(); // Clear any existing toast

    try {
      setLoading(true);
      const response = await api.get(`/services/${service}/countries`);
      if (response.data && Array.isArray(response.data.countries)) {
        setCountries(response.data.countries);
        setLoading(false);
      } else {
        throw new Error('No countries available for this service');
      }
    } catch (error) {
      logger.error('Error fetching countries for service:', error);
      toast({
        title: t('error.title'),
        description: t('error.dataLoad'),
        variant: 'destructive',
      });
      setCountries([]);
      setLoading(false);
    }
  };

  const handleCountryChange = async (country: string) => {
    setSelectedCountry(country);
    setPrice(null);
    setStep(1);
    setCountryError('');
    setPriceError('');
    toast.dismiss(); // Clear any existing toast

    try {
      setLoading(true);
      const service = services.find(s => s.id === selectedService);
      if (!service) {
        throw new Error('Service not found');
      }

      const response = await api.get(`/services/${service.id}/prices`);
      if (response.data && typeof response.data.price === 'number') {
        setPrice(response.data.price);
        setLoading(false);
      } else {
        throw new Error('No price available for this country');
      }
    } catch (error) {
      logger.error('Error fetching price for country:', error);
      toast({
        title: t('error.title'),
        description: t('error.dataLoad'),
        variant: 'destructive',
      });
      setPrice(null);
      setLoading(false);
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
        'XAF', // Base currency from SMS provider
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

  const handleMomoPayment = async () => {
    if (!user) {
      toast({
        title: t('error.title'),
        description: t('buy.requireLogin'),
        variant: 'destructive',
      });
      navigate('/login', { replace: true });
      return;
    }

    // Check session validity
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      toast({
        title: t('error.title'),
        description: t('error.sessionExpired'),
        variant: 'destructive',
      });
      supabase.auth.signOut();
      navigate('/login', { replace: true });
      return;
    }

    if (!phoneNumber) {
      toast({
        title: t('error.title'),
        description: t('error.momo.invalidNumber'),
        variant: 'destructive',
      });
      return;
    }

    if (!selectedService || !selectedCountry) {
      toast({
        title: t('error.title'),
        description: t('buy.requireServiceAndCountry'),
        variant: 'destructive',
      });
      return;
    }

    // Validate phone number format again before submission
    if (!/^\+?[0-9]{10,15}$/.test(phoneNumber)) {
      toast({
        title: t('error.title'),
        description: t('error.momo.invalidPhone'),
        variant: 'destructive',
      });
      return;
    }

    // Validate phone number length
    if (phoneNumber.length < 10) {
      toast({
        title: t('error.title'),
        description: t('error.momo.tooShort'),
        variant: 'destructive',
      });
      return;
    }

    if (!price) {
      toast({
        title: t('error.title'),
        description: t('buy.requirePrice'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setPaymentProcessing(true);
    try {
      // Log payment attempt
      logger.info('MoMo payment attempt', {
        userId: user.id,
        service: selectedService,
        country: selectedCountry,
        phoneNumber: phoneNumber,
        amount: price
      });

      const response = await api.post('/payment/momo', {
        amount: price,
        currency: 'usd',
        service: selectedService,
        country: selectedCountry,
        phoneNumber,
        userId: user.id,
      });

      if (response.data.success) {
        setPaymentSuccess(true);
        setStep(3);
        toast({
          title: t('success.title'),
          description: t('success.paymentSuccess'),
          variant: 'default',
        });
        logger.info('MoMo payment successful', {
          userId: user.id,
          service: selectedService,
          country: selectedCountry,
          phoneNumber: phoneNumber,
          amount: price
        });
      } else {
        throw new Error(response.data.message || 'Payment failed');
      }
    } catch (error) {
      logger.error('MoMo payment error:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Payment failed';
      
      // Extract specific error codes from MoMo response
      const momoError = errorMessage.includes('invalid_phone')
        ? t('error.momo.invalidPhone')
        : errorMessage.includes('insufficient_balance')
          ? t('error.momo.insufficientBalance')
          : errorMessage.includes('processing_error')
            ? t('error.momo.processingError')
            : errorMessage.includes('country_not_supported')
              ? t('error.momo.countryNotSupported')
              : errorMessage;

      toast({
        title: t('error.title'),
        description: momoError,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setPaymentProcessing(false);
    }
  };

  const handleStripePayment = async () => {
    if (!user) {
      toast({
        title: t('error.title'),
        description: t('buy.requireLogin'),
        variant: 'destructive',
      });
      navigate('/login', { replace: true });
      return;
    }

    // Check session validity
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      toast({
        title: t('error.title'),
        description: t('error.sessionExpired'),
        variant: 'destructive',
      });
      supabase.auth.signOut();
      navigate('/login', { replace: true });
      return;
    }

    setIsLoading(true);
    setPaymentProcessing(true);
    try {
      // Log payment attempt
      logger.info('Stripe payment attempt', {
        userId: user.id,
        service: selectedService,
        country: selectedCountry,
        amount: price
      });

      const response = await api.post('/payment/stripe', {
        amount: price,
        currency: 'usd',
        service: selectedService,
        country: selectedCountry,
        userId: user.id,
      });

      if (response.data.success) {
        setPaymentSuccess(true);
        setStep(3);
        toast({
          title: t('success.title'),
          description: t('success.paymentSuccess'),
          variant: 'default',
        });
        logger.info('Stripe payment successful', {
          userId: user.id,
          service: selectedService,
          country: selectedCountry,
          amount: price
        });
      } else {
        throw new Error(response.data.message || 'Payment failed');
      }
    } catch (error) {
      logger.error('Stripe payment error:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Payment failed';
      
      // Extract specific error codes from Stripe response
      const stripeError = errorMessage.includes('card_declined')
      toast({
        title: t('success.title'),
        description: t('success.paymentSuccess'),
        variant: 'default',
      });
      logger.info('Stripe payment successful', {
        userId: user.id,
        service: selectedService,
        country: selectedCountry,
        amount: price
      });
    } else {
      throw new Error(response.data.message || 'Payment failed');
    }
  } catch (error) {
    logger.error('Stripe payment error:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Payment failed';
    
    // Extract specific error codes from Stripe response
    const stripeError = errorMessage.includes('card_declined')
      ? t('error.stripe.cardDeclined')
      : errorMessage.includes('insufficient_funds')
        ? t('error.stripe.insufficientFunds')
        : errorMessage.includes('processing_error')
          ? t('error.stripe.processingError')
          : errorMessage.includes('no_stripe')
            ? t('error.stripe.noStripe')
            : errorMessage;

    toast({
      title: t('error.title'),
      description: stripeError,
      variant: 'destructive',
    });
  } finally {
    setIsLoading(false);
    setPaymentProcessing(false);
      return;
    }

    setPhoneNumber(value);
    // Clear any existing errors
    setStripeError(null);
    // Reset step to 2 when phone number changes
    if (step > 2) setStep(2);
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
            </div>
          </div>
        ) : (
          <>
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">{t('buy.step1.title')}</h2>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('buy.step1.service')}
                  </label>
                  <select
                    value={selectedService}
                    onChange={(e) => handleServiceChange(e.target.value)}
                    className={`w-full p-2 border rounded-md ${
                      serviceError ? 'border-red-500' : ''
                    }`}
                  >
                    <option value="">{t('buy.step1.chooseService')}</option>
                    {selectedServiceData?.services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                  {serviceError && (
                    <p className="text-sm text-red-500">{serviceError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('buy.step1.country')}
                  </label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className={`w-full p-2 border rounded-md ${
                      serviceError ? 'border-red-500' : ''
                    }`}
                  >
                    <option value="">{t('buy.step1.chooseCountry')}</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  {serviceError && (
                    <p className="text-sm text-red-500">{serviceError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('buy.step1.price')}
                  </label>
                  <div className="text-lg font-semibold">
                    ${price?.toFixed(2) || '0.00'}
                  </div>
                  {serviceError && (
                    <p className="text-sm text-red-500">{serviceError}</p>
                  )}
                </div>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedService || !selectedCountry || !price}
                  className={`w-full ${
                    !selectedService || !selectedCountry || !price
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  {t('buy.step1.continue')}
                </Button>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">{t('buy.step2.title')}</h2>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('buy.step2.paymentMethod')}
                  </label>
                  <select
                    value={selectedPayment}
                    onChange={(e) => handlePaymentMethodChange(e.target.value)}
                    className={`w-full p-2 border rounded-md ${
                      stripeError ? 'border-red-500' : ''
                    }`}
                  >
                    <option value="">{t('buy.step2.choosePayment')}</option>
                    <option value="stripe">{t('buy.step2.stripe')}</option>
                    <option value="momo">{t('buy.step2.momo')}</option>
                  </select>
                  {stripeError && (
                    <p className="text-sm text-red-500">{stripeError}</p>
                  )}
                </div>
                {selectedPayment === 'momo' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {t('buy.step2.phonePlaceholder')}
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={handlePhoneNumberChange}
                      className={`w-full p-2 border rounded-md ${
                        phoneNumberError ? 'border-red-500' : ''
                      }`}
                      placeholder="Enter your phone number"
                    />
                    {phoneNumberError && (
                      <p className="text-sm text-red-500">{phoneNumberError}</p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('buy.step2.total')}
                  </label>
                  <div className="text-lg font-semibold">
                    ${price?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <Button
                  onClick={selectedPayment === 'stripe' ? handleStripePayment : handleMomoPayment}
                  disabled={paymentProcessing || (!phoneNumber && selectedPayment === 'momo')}
                  className={`w-full ${
                    paymentProcessing || (!phoneNumber && selectedPayment === 'momo')
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  {paymentProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('buy.step2.processing')}
                    </>
                  ) : (
                    t('buy.step2.payNow')
                  )}
                </Button>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">{t('buy.success.title')}</h2>
                <div className="text-lg">
                  {t('buy.success.description')}
                </div>
                <Button onClick={() => navigate('/dashboard')}>
                  {t('buy.success.goToDashboard')}
                </Button>
              </div>
            )}
          </>
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
};