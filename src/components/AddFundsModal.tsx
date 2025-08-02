import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, DollarSign, CreditCard, Globe, Calculator, Phone } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

interface ExchangeRate {
  currency: string;
  rate: number;
  markup: number;
  updated_at: string;
}

interface AddFundsModalProps {
  currentBalance: number;
  onFundsAdded: (newBalance: number) => void;
  trigger?: React.ReactNode;
}

const AddFundsModal: React.FC<AddFundsModalProps> = ({ 
  currentBalance, 
  onFundsAdded, 
  trigger 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<ExchangeRate | null>(null);
  const [usdAmount, setUsdAmount] = useState(0);
  const [paymentReference, setPaymentReference] = useState('');

  const presetAmounts = [5, 10, 20, 50, 100];

  // Fetch exchange rates on component mount
  useEffect(() => {
    fetchExchangeRates();
  }, []);

        // Calculate USD amount when amount or currency changes
      useEffect(() => {
        if (amount && selectedRate) {
          const numAmount = parseFloat(amount);
          const markup = selectedRate.markup || 10.0;
          // Convert to USD: amount / rate (e.g., 100 EUR / 0.85 = 117.65 USD)
          const baseUsdAmount = numAmount / selectedRate.rate;
          // Add markup: base amount * (1 + markup/100)
          const calculatedUsdAmount = baseUsdAmount * (1 + markup / 100);
          setUsdAmount(calculatedUsdAmount);
        } else {
          setUsdAmount(0);
        }
      }, [amount, selectedRate]);

  // Update selected rate when currency changes
  useEffect(() => {
    const rate = exchangeRates.find(r => r.currency === currency);
    setSelectedRate(rate || null);
  }, [currency, exchangeRates]);

  const fetchExchangeRates = async () => {
    try {
      const response = await apiClient.get('/exchange-rates');
      setExchangeRates(response);
      
      // Set default currency to USD
      const usdRate = response.find((r: ExchangeRate) => r.currency === 'USD');
      if (usdRate) {
        setSelectedRate(usdRate);
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      toast.error('Failed to load exchange rates');
    }
  };

  const handleAddFunds = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!phoneNumber.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post('/add-funds/campay', {
        amount: numAmount,
        currency: currency,
        phoneNumber: phoneNumber.trim()
      });

      if (response.success) {
        setPaymentReference(response.reference);
        setIsProcessingPayment(true);
        
        toast.success('Payment initiated! Please complete the payment on your mobile money app.');
        
        // Start polling for payment status
        pollPaymentStatus(response.reference);
      } else {
        toast.error('Failed to initiate payment');
      }
    } catch (error: any) {
      console.error('Error adding funds:', error);
      toast.error(error.message || 'Failed to add funds');
    } finally {
      setIsLoading(false);
    }
  };

  const pollPaymentStatus = async (reference: string) => {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await apiClient.get(`/add-funds/status/${reference}`);
        
        if (response.status === 'completed') {
          toast.success('Payment completed! Funds added to your account.');
          onFundsAdded(response.amount_usd);
          setIsOpen(false);
          resetForm();
          return;
        } else if (response.status === 'failed') {
          toast.error('Payment failed or was cancelled');
          setIsProcessingPayment(false);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000); // Check every 5 seconds
        } else {
          toast.error('Payment timeout. Please check your payment status.');
          setIsProcessingPayment(false);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000);
        } else {
          toast.error('Failed to check payment status');
          setIsProcessingPayment(false);
        }
      }
    };

    checkStatus();
  };

  const handlePresetAmount = (presetAmount: number) => {
    setAmount(presetAmount.toString());
  };

  const resetForm = () => {
    setAmount('');
    setCurrency('USD');
    setPhoneNumber('');
    setPaymentReference('');
    setIsProcessingPayment(false);
  };

  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Add Funds
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Add Funds to Account
          </DialogTitle>
          <DialogDescription>
            Add funds to your account balance using mobile money. Current balance: ${currentBalance.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Currency Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="currency" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Currency
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchExchangeRates}
                disabled={isLoading}
                className="text-xs"
              >
                <Loader2 className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Rates
              </Button>
            </div>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {exchangeRates.map((rate) => (
                  <SelectItem key={rate.currency} value={rate.currency}>
                    {rate.currency} - {rate.currency === 'USD' ? 'US Dollar' : 
                      rate.currency === 'EUR' ? 'Euro' :
                      rate.currency === 'GBP' ? 'British Pound' :
                      rate.currency === 'JPY' ? 'Japanese Yen' :
                      rate.currency === 'CAD' ? 'Canadian Dollar' :
                      rate.currency === 'AUD' ? 'Australian Dollar' :
                      rate.currency === 'CHF' ? 'Swiss Franc' :
                      rate.currency === 'CNY' ? 'Chinese Yuan' :
                      rate.currency === 'INR' ? 'Indian Rupee' :
                      rate.currency === 'BRL' ? 'Brazilian Real' :
                      rate.currency === 'MXN' ? 'Mexican Peso' :
                      rate.currency === 'SGD' ? 'Singapore Dollar' :
                      rate.currency === 'HKD' ? 'Hong Kong Dollar' :
                      rate.currency === 'SEK' ? 'Swedish Krona' :
                      rate.currency === 'NOK' ? 'Norwegian Krone' :
                      rate.currency === 'DKK' ? 'Danish Krone' :
                      rate.currency === 'PLN' ? 'Polish Złoty' :
                      rate.currency === 'CZK' ? 'Czech Koruna' :
                      rate.currency === 'HUF' ? 'Hungarian Forint' :
                      rate.currency === 'RUB' ? 'Russian Ruble' :
                      rate.currency === 'TRY' ? 'Turkish Lira' :
                      rate.currency === 'ZAR' ? 'South African Rand' :
                      rate.currency === 'KRW' ? 'South Korean Won' :
                      rate.currency === 'THB' ? 'Thai Baht' :
                      rate.currency === 'MYR' ? 'Malaysian Ringgit' :
                      rate.currency === 'IDR' ? 'Indonesian Rupiah' :
                      rate.currency === 'PHP' ? 'Philippine Peso' :
                      rate.currency === 'VND' ? 'Vietnamese Dong' :
                      rate.currency === 'NGN' ? 'Nigerian Naira' :
                      rate.currency === 'EGP' ? 'Egyptian Pound' :
                      rate.currency === 'KES' ? 'Kenyan Shilling' :
                      rate.currency === 'GHS' ? 'Ghanaian Cedi' :
                      rate.currency === 'UGX' ? 'Ugandan Shilling' :
                      rate.currency === 'TZS' ? 'Tanzanian Shilling' :
                      rate.currency === 'XAF' ? 'Central African CFA Franc' :
                      rate.currency === 'XOF' ? 'West African CFA Franc' :
                      rate.currency === 'MAD' ? 'Moroccan Dirham' :
                      rate.currency === 'TND' ? 'Tunisian Dinar' :
                      rate.currency === 'DZD' ? 'Algerian Dinar' :
                      rate.currency === 'LYD' ? 'Libyan Dinar' :
                      rate.currency === 'SDG' ? 'Sudanese Pound' :
                      rate.currency === 'ETB' ? 'Ethiopian Birr' :
                      rate.currency === 'SOS' ? 'Somali Shilling' :
                      rate.currency === 'DJF' ? 'Djiboutian Franc' :
                      rate.currency === 'KMF' ? 'Comorian Franc' :
                      rate.currency === 'MUR' ? 'Mauritian Rupee' :
                      rate.currency === 'SCR' ? 'Seychellois Rupee' :
                      rate.currency === 'CVE' ? 'Cape Verdean Escudo' :
                      rate.currency === 'STD' ? 'São Tomé and Príncipe Dobra' :
                      rate.currency === 'GMD' ? 'Gambian Dalasi' :
                      rate.currency === 'GNF' ? 'Guinean Franc' :
                      rate.currency === 'SLL' ? 'Sierra Leonean Leone' :
                      rate.currency === 'LRD' ? 'Liberian Dollar' :
                      rate.currency === 'CDF' ? 'Congolese Franc' :
                      rate.currency === 'RWF' ? 'Rwandan Franc' :
                      rate.currency === 'BIF' ? 'Burundian Franc' :
                      rate.currency === 'MWK' ? 'Malawian Kwacha' :
                      rate.currency === 'ZMW' ? 'Zambian Kwacha' :
                      rate.currency === 'ZWL' ? 'Zimbabwean Dollar' :
                      rate.currency === 'NAD' ? 'Namibian Dollar' :
                      rate.currency === 'BWP' ? 'Botswana Pula' :
                      rate.currency === 'SZL' ? 'Eswatini Lilangeni' :
                      rate.currency === 'LSL' ? 'Lesotho Loti' :
                      rate.currency === 'MZN' ? 'Mozambican Metical' :
                      rate.currency === 'AOA' ? 'Angolan Kwanza' :
                      rate.currency === 'STN' ? 'São Tomé and Príncipe Dobra' : rate.currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Input */}
          <div>
            <Label htmlFor="amount">Amount ({currency})</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              step="0.01"
              className="mt-1"
              disabled={isProcessingPayment}
            />
          </div>

          {/* Exchange Rate Display */}
          {selectedRate && amount && (
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Calculator className="h-4 w-4" />
                Exchange Rate & Fees
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Exchange Rate:</span>
                  <span>1 USD = {selectedRate.rate.toFixed(6)} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>Markup ({selectedRate.markup}%):</span>
                  <span>+{selectedRate.markup}%</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Total in USD:</span>
                  <span>${usdAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Phone Number Input */}
          <div>
            <Label htmlFor="phoneNumber" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Mobile Money Phone Number
            </Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="Enter your phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="mt-1"
              disabled={isProcessingPayment}
            />
            <p className="text-xs text-muted-foreground mt-1">
              We'll send a payment request to this number via mobile money
            </p>
          </div>

          {/* Quick Amounts */}
          <div>
            <Label className="text-sm text-muted-foreground">Quick Amounts</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {presetAmounts.map((presetAmount) => (
                <Button
                  key={presetAmount}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetAmount(presetAmount)}
                  className="text-xs"
                  disabled={isProcessingPayment}
                >
                  {formatCurrency(presetAmount, currency)}
                </Button>
              ))}
            </div>
          </div>

          {/* Payment Status */}
          {isProcessingPayment && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing Payment...
              </div>
              <p className="text-sm text-blue-600 mt-1">
                Please complete the payment on your mobile money app. We'll notify you when it's confirmed.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                resetForm();
              }}
              disabled={isLoading || isProcessingPayment}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddFunds}
              disabled={isLoading || !amount || !phoneNumber || isProcessingPayment}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Initiating...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Pay with Mobile Money
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddFundsModal; 