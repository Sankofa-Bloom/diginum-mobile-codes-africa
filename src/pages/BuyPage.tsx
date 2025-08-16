import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Phone, MessageSquare, CheckCircle, Clock, AlertTriangle, DollarSign, RefreshCw, Search } from "lucide-react";
import { getCurrentUser } from '@/lib/auth';
import apiClient from '@/lib/apiClient';
import CountdownTimer from '@/components/CountdownTimer';


interface Country {
  id: string;
  name: string;
  code: string;
}

interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  countryId: string;
  available: boolean;
}

interface OrderResult {
  orderId: string;
  phoneNumber: string;
  expiresAt: string;
  timeRemaining: number;
  amountPaid: number;
  newBalance: number;
  message: string;
}

interface VerificationResult {
  orderId: string;
  phoneNumber: string;
  verificationCode: string;
  message: string;
}

const BuyPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Flow states
  const [step, setStep] = useState<'countries' | 'services' | 'number' | 'verification'>('countries');
  const [countries, setCountries] = useState<Country[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  
  // Account balance
  const [accountBalance, setAccountBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(false);
  
  // Loading states
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingNumber, setLoadingNumber] = useState(false);
  const [loadingVerification, setLoadingVerification] = useState(false);
  const [loadingExtend, setLoadingExtend] = useState(false);
  const [loadingAnotherCode, setLoadingAnotherCode] = useState(false);
  
  // Search states
  const [countrySearch, setCountrySearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  
  // Filtered data
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) {
      return countries.sort((a, b) => a.name.localeCompare(b.name));
    }
    return countries
      .filter(country => 
        country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
        country.code.toLowerCase().includes(countrySearch.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [countries, countrySearch]);
  
  const filteredServices = useMemo(() => {
    if (!serviceSearch.trim()) {
      return services.sort((a, b) => a.name.localeCompare(b.name));
    }
    return services
      .filter(service => 
        service.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        service.description.toLowerCase().includes(serviceSearch.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [services, serviceSearch]);
  
  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        setIsAuthenticated(!!user);
        
        // Always load countries (no authentication required)
        loadCountries();
        
        // Only load account balance if authenticated
        if (user) {
          loadAccountBalance();
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        // Still load countries even if auth check fails
        loadCountries();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  // Simple effect to refresh balance when component mounts or user returns to page
  useEffect(() => {
    if (isAuthenticated) {
      // Refresh balance from database whenever user returns to this page
      loadAccountBalance();
    }
  }, [isAuthenticated]);

  const loadAccountBalance = async () => {
    setLoadingBalance(true);
    try {
      if (import.meta.env.DEV) {
        console.log('Loading account balance...');
      }
      const response = await apiClient.get('/account-balance');
      if (import.meta.env.DEV) {
        console.log('Balance API response:', response);
        console.log('Full response object:', JSON.stringify(response, null, 2));
      }
      
      // Handle multiple response formats
      let balance = 0;
      if (response.data?.balance !== undefined) {
        balance = response.data.balance;
        if (import.meta.env.DEV) {
          console.log('Found balance in response.data.balance:', balance);
        }
      } else if (response.balance !== undefined) {
        balance = response.balance;
        if (import.meta.env.DEV) {
          console.log('Found balance in response.balance:', balance);
        }
      } else if (typeof response === 'object' && response.balance !== undefined) {
        balance = response.balance;
        if (import.meta.env.DEV) {
          console.log('Found balance in direct response:', balance);
        }
      }
      if (import.meta.env.DEV) {
        console.log('Final parsed balance:', balance);
      }
      
      const finalBalance = parseFloat(balance) || 0;
      setAccountBalance(finalBalance);
      
      if (import.meta.env.DEV) {
        console.log('Account balance loaded and set:', finalBalance);
      }
      
      if (finalBalance > 0) {
        if (import.meta.env.DEV) {
          console.log('✅ Balance loaded successfully: $' + finalBalance);
        }
      } else {
        if (import.meta.env.DEV) {
          console.warn('⚠️ Balance is $0 - check database setup');
        }
      }
    } catch (error: any) {
      console.error('❌ Error loading account balance:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      toast.error('Failed to load account balance: ' + (error.response?.data?.error || error.message));
      setAccountBalance(0); // Default to $0 on error
    } finally {
      setLoadingBalance(false);
    }
  };

  const loadCountries = async () => {
    setLoadingCountries(true);
    try {
      const response = await apiClient.get('/countries');
      setCountries(response);
      setStep('countries');
    } catch (error: any) {
      console.error('Error loading countries:', error);
      toast.error('Failed to load countries. Please try again.');
    } finally {
      setLoadingCountries(false);
    }
  };

  const loadServices = async (countryId: string) => {
    setLoadingServices(true);
    try {
      const response = await apiClient.get(`/services/${countryId}`);
      setServices(response);
      setStep('services');
    } catch (error: any) {
      console.error('Error loading services:', error);
      toast.error('Failed to load services. Please try again.');
    } finally {
      setLoadingServices(false);
    }
  };

  const handleCountrySelect = (countryId: string) => {
    const country = countries.find(c => c.id === countryId);
    if (country) {
      if (!isAuthenticated) {
        toast.error('Please log in to continue with your purchase.');
        navigate('/login', { state: { from: '/buy' } });
        return;
      }
      setSelectedCountry(country);
      loadServices(countryId);
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    const service = services.find(s => s.id === parseInt(serviceId));
    if (service) {
      setSelectedService(service);
      generateNumber(service);
    }
  };

  const generateNumber = async (service: Service) => {
    setLoadingNumber(true);
    try {
      const response = await apiClient.post('/generate-number', {
        serviceId: service.id,
        countryId: selectedCountry?.id
      });
      
      setOrderResult(response);
      setAccountBalance(response.newBalance);
      setStep('number');
      toast.success('Phone number generated successfully!');
    } catch (error: any) {
      console.error('Error generating number:', error);
      
      // Handle insufficient balance
      if (error.response?.status === 402) {
        const errorData = error.response.data;
        toast.error(`Insufficient balance. You need $${errorData.requiredAmount.toFixed(2)} but have $${errorData.currentBalance.toFixed(2)}`);
        // Stay on services step to allow user to add funds
        return;
      }
      
      toast.error('Failed to generate phone number. Please try again.');
    } finally {
      setLoadingNumber(false);
    }
  };

  const extendNumber = async () => {
    if (!orderResult) return;
    
    setLoadingExtend(true);
    try {
      const response = await apiClient.post(`/extend-number/${orderResult.orderId}`);
      setOrderResult({
        ...orderResult,
        expiresAt: response.expiresAt,
        timeRemaining: response.timeRemaining
      });
      toast.success('Number extended by 10 minutes!');
    } catch (error: any) {
      console.error('Error extending number:', error);
      toast.error('Failed to extend number. Please try again.');
    } finally {
      setLoadingExtend(false);
    }
  };

  const getVerificationCode = async () => {
    if (!orderResult) return;
    
    setLoadingVerification(true);
    try {
      const response = await apiClient.get(`/verification-code/${orderResult.orderId}`);
      setVerificationResult(response);
      setStep('verification');
      toast.success('Verification code sent!');
    } catch (error: any) {
      console.error('Error getting verification code:', error);
      toast.error('Failed to get verification code. Please try again.');
    } finally {
      setLoadingVerification(false);
    }
  };

  const requestAnotherCode = async () => {
    if (!orderResult) return;
    
    setLoadingAnotherCode(true);
    try {
      const response = await apiClient.post(`/request-another-code/${orderResult.orderId}`);
      setVerificationResult(response);
      toast.success('New verification code sent!');
    } catch (error: any) {
      console.error('Error requesting another code:', error);
      toast.error('Failed to request another code. Please try again.');
    } finally {
      setLoadingAnotherCode(false);
    }
  };

  const handleNumberExpired = () => {
    toast.error('Your phone number has expired! Please generate a new one.');
    setStep('countries');
    setOrderResult(null);
  };

  const resetFlow = () => {
    setStep('countries');
    setSelectedCountry(null);
    setSelectedService(null);
    setOrderResult(null);
    setVerificationResult(null);
    setCountrySearch('');
    setServiceSearch('');
    loadCountries();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show login prompt for unauthenticated users but still show the page
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Buy Phone Number</h1>
          <p className="text-muted-foreground">Select a country and service to get a verification number</p>
          
          {/* Login Prompt */}
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="font-semibold text-yellow-800">Login Required</span>
              </div>
              <Button onClick={() => navigate('/login', { state: { from: '/buy' } })}>
                Login to Continue
              </Button>
            </div>
            <p className="text-sm text-yellow-700 mt-2">
              You need to be logged in to purchase a phone number. Please log in to continue.
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-primary">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-white">
                1
              </div>
              <span className="ml-2">Country</span>
            </div>
            <div className="w-8 h-1 bg-muted"></div>
            <div className="flex items-center text-muted-foreground">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted">
                2
              </div>
              <span className="ml-2">Service</span>
            </div>
            <div className="w-8 h-1 bg-muted"></div>
            <div className="flex items-center text-muted-foreground">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted">
                3
              </div>
              <span className="ml-2">Number</span>
            </div>
            <div className="w-8 h-1 bg-muted"></div>
            <div className="flex items-center text-muted-foreground">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted">
                4
              </div>
              <span className="ml-2">Code</span>
            </div>
          </div>
        </div>

        {/* Step 1: Country Selection */}
        {step === 'countries' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="mr-2 h-5 w-5" />
                Select Country
              </CardTitle>
              <CardDescription>Choose a country to get a phone number from</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search Input */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search countries by name or code..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {loadingCountries ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading countries...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCountries.map((country) => (
                    <Card 
                      key={country.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleCountrySelect(country.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{country.name}</h3>
                            <p className="text-sm text-muted-foreground">{country.code}</p>
                          </div>
                          <Badge variant="outline">{country.code}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              
              {!loadingCountries && filteredCountries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {countrySearch ? 'No countries found matching your search.' : 'No countries available.'}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Buy Phone Number</h1>
        <p className="text-muted-foreground">Select a country and service to get a verification number</p>
        
        {/* Account Balance Display */}
        <div className="mt-4 flex items-center justify-between bg-primary/5 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <span className="font-semibold">Account Balance:</span>
            {loadingBalance ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">${accountBalance.toFixed(2)}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={loadAccountBalance}
                  className="h-6 w-6 p-0"
                  disabled={loadingBalance}
                  title="Refresh balance"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => navigate('/add-funds')}
          >
            <DollarSign className="h-4 w-4" />
            Add Funds
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center ${step === 'countries' || step === 'services' || step === 'number' || step === 'verification' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'countries' || step === 'services' || step === 'number' || step === 'verification' ? 'bg-primary text-white' : 'bg-muted'}`}>
              1
            </div>
            <span className="ml-2">Country</span>
          </div>
          <div className="w-8 h-1 bg-muted"></div>
          <div className={`flex items-center ${step === 'services' || step === 'number' || step === 'verification' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'services' || step === 'number' || step === 'verification' ? 'bg-primary text-white' : 'bg-muted'}`}>
              2
            </div>
            <span className="ml-2">Service</span>
          </div>
          <div className="w-8 h-1 bg-muted"></div>
          <div className={`flex items-center ${step === 'number' || step === 'verification' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'number' || step === 'verification' ? 'bg-primary text-white' : 'bg-muted'}`}>
              3
            </div>
            <span className="ml-2">Number</span>
          </div>
          <div className="w-8 h-1 bg-muted"></div>
          <div className={`flex items-center ${step === 'verification' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'verification' ? 'bg-primary text-white' : 'bg-muted'}`}>
              4
            </div>
            <span className="ml-2">Code</span>
          </div>
        </div>
      </div>

      {/* Step 1: Country Selection */}
      {step === 'countries' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Phone className="mr-2 h-5 w-5" />
              Select Country
            </CardTitle>
            <CardDescription>Choose a country to get a phone number from</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search Input */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search countries by name or code..."
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {loadingCountries ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading countries...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCountries.map((country) => (
                  <Card 
                    key={country.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleCountrySelect(country.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{country.name}</h3>
                          <p className="text-sm text-muted-foreground">{country.code}</p>
                        </div>
                        <Badge variant="outline">{country.code}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {!loadingCountries && filteredCountries.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {countrySearch ? 'No countries found matching your search.' : 'No countries available.'}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Service Selection */}
      {step === 'services' && selectedCountry && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="mr-2 h-5 w-5" />
              Select Service
            </CardTitle>
            <CardDescription>
              Choose a service for {selectedCountry.name} ({selectedCountry.code})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search Input */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search services by name or description..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {loadingServices ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading services...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredServices.map((service) => (
                  <Card 
                    key={service.id} 
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      accountBalance < service.price ? 'opacity-50' : ''
                    }`}
                    onClick={() => accountBalance >= service.price && handleServiceSelect(service.id.toString())}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{service.name}</h3>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">${service.price}</p>
                          {accountBalance < service.price ? (
                            <Badge variant="destructive">Insufficient Balance</Badge>
                          ) : (
                            <Badge variant="secondary">Available</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {!loadingServices && filteredServices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {serviceSearch ? 'No services found matching your search.' : 'No services available for this country.'}
              </div>
            )}
            
            <div className="mt-4 flex justify-between">
              <Button variant="outline" onClick={resetFlow}>
                Back to Countries
              </Button>
              {services.length > 0 && accountBalance < Math.min(...services.map(s => s.price)) && (
                <Button 
                  variant="outline"
                  onClick={() => navigate('/add-funds')}
                  className="gap-2"
                >
                  <DollarSign className="h-4 w-4" />
                  Add Funds
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Number Generation */}
      {step === 'number' && orderResult && selectedService && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5" />
              Your Phone Number
            </CardTitle>
            <CardDescription>
              Your {selectedService.name} number has been generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              {/* Countdown Timer */}
              <div className="mb-6">
                <CountdownTimer 
                  expiresAt={orderResult.expiresAt}
                  onExpired={handleNumberExpired}
                  showWarning={true}
                  className="justify-center"
                />
              </div>

              <div className="bg-primary/10 rounded-lg p-6 mb-6">
                <h3 className="text-2xl font-bold text-primary mb-2">{orderResult.phoneNumber}</h3>
                <p className="text-muted-foreground">Service: {selectedService.name}</p>
                <p className="text-muted-foreground">Amount Paid: ${orderResult.amountPaid}</p>
                <p className="text-muted-foreground">New Balance: ${orderResult.newBalance}</p>
              </div>
              
              <div className="space-y-4">
                <Button 
                  onClick={getVerificationCode}
                  disabled={loadingVerification}
                  className="w-full"
                >
                  {loadingVerification ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Getting Verification Code...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Get Verification Code
                    </>
                  )}
                </Button>

                <Button 
                  onClick={extendNumber}
                  disabled={loadingExtend}
                  variant="outline"
                  className="w-full"
                >
                  {loadingExtend ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Extending...
                    </>
                  ) : (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      Extend by 10 Minutes
                    </>
                  )}
                </Button>
                
                <Button variant="outline" onClick={resetFlow} className="w-full">
                  Start Over
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Verification Code */}
      {step === 'verification' && verificationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="mr-2 h-5 w-5" />
              Verification Code
            </CardTitle>
            <CardDescription>
              Your verification code has been sent to {verificationResult.phoneNumber}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h3 className="text-3xl font-bold text-green-600 mb-2">{verificationResult.verificationCode}</h3>
                <p className="text-green-700">Use this code to verify your account</p>
              </div>
              
              <div className="space-y-4">
                <Button 
                  onClick={requestAnotherCode}
                  disabled={loadingAnotherCode}
                  variant="outline"
                  className="w-full"
                >
                  {loadingAnotherCode ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Request Another Code
                    </>
                  )}
                </Button>

                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
                
                <Button variant="outline" onClick={resetFlow} className="w-full">
                  Buy Another Number
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BuyPage;
