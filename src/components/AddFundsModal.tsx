import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, DollarSign, CreditCard, Globe, Calculator, Phone, AlertCircle, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { useCurrency } from '@/contexts/CurrencyContext';
import { CurrencyService } from '@/lib/currency';
import FapshiPayment from '@/components/FapshiPayment';
import { isFapshiSupported } from '@/lib/fapshi';

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
  const { userCurrency, setUserCurrency, convertUSDToLocal, formatPrice } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'traditional' | 'fapshi'>('fapshi');
  const [conversion, setConversion] = useState<{
    originalAmount: number;
    convertedAmount: number;
    currency: string;
    rate: number;
    fxBuffer: number;
    finalAmount: number;
  } | null>(null);
  const [paymentReference, setPaymentReference] = useState('');

  const presetAmounts = [5, 10, 20, 50, 100];

  // Calculate conversion when amount changes
  useEffect(() => {
    const calculateConversion = async () => {
      if (amount && parseFloat(amount) > 0) {
        try {
          const numAmount = parseFloat(amount);
          const result = await convertUSDToLocal(numAmount, userCurrency);
          setConversion(result);
        } catch (error) {
          console.error('Error calculating conversion:', error);
          setConversion(null);
        }
      } else {
        setConversion(null);
      }
    };

    calculateConversion();
  }, [amount, userCurrency, convertUSDToLocal]);

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

    if (!conversion) {
      toast.error('Please wait for conversion calculation');
      return;
    }

    setIsLoading(true);
    try {
      // Try to save transaction to database (non-blocking)
      try {
        await CurrencyService.savePaymentTransaction(
          conversion.originalAmount,
          conversion.finalAmount,
          conversion.currency,
          conversion.rate,
          conversion.fxBuffer
        );
        console.log('Payment transaction saved successfully');
      } catch (dbError: any) {
        console.warn('Failed to save transaction to database (continuing with payment):', dbError);
        // Don't block payment if database save fails
      }

      console.log('Initiating payment with data:', {
        amount: conversion.finalAmount,
        currency: conversion.currency,
        phoneNumber: phoneNumber,
        originalAmountUSD: conversion.originalAmount
      });

      const response = await apiClient.post('/add-funds/campay', {
        amount: conversion.finalAmount, // Send converted amount with FX buffer
        currency: conversion.currency, // Send local currency
        phoneNumber: phoneNumber,
        originalAmountUSD: conversion.originalAmount // Include original USD amount for reference
      });

      console.log('Payment API response:', response);

      if (response?.success || response?.data?.success) {
        const reference = response.reference || response.data?.reference;
        setPaymentReference(reference);
        setIsProcessingPayment(true);
        
        toast.success('Payment initiated! Please complete the payment on your mobile money app.');
        
        // Start polling for payment status
        pollPaymentStatus(reference);
      } else {
        console.error('Payment initiation failed - invalid response:', response);
        toast.error('Failed to initiate payment - invalid response from server');
      }
    } catch (error: any) {
      console.error('Error adding funds:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      toast.error(error.response?.data?.error || error.message || 'Failed to add funds');
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
        
        if (response.data?.status === 'completed') {
          console.log('Payment completed! Response:', response.data);
          const creditedAmount = response.data.amountCredited || response.data.amount_usd || 10;
          const newBalance = response.data.newBalance;
          
          toast.success(response.data.message || 'Payment completed! Funds added to your account.');
          
          // Update the balance in parent component
          if (newBalance !== undefined && newBalance !== null) {
            onFundsAdded(newBalance); // Use the new total balance
          } else {
            // Fallback: add the credited amount to current balance
            onFundsAdded(currentBalance + creditedAmount);
          }
          
          setIsOpen(false);
          resetForm();
          return;
        } else if (response.data?.status === 'failed') {
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

  const handleFapshiSuccess = (paymentData: any) => {
    toast.success('Payment completed successfully!');
    // The amount will be in the original amount specified
    onFundsAdded(parseFloat(amount));
    setIsOpen(false);
    resetForm();
  };

  const handleFapshiError = (error: string) => {
    toast.error(`Payment failed: ${error}`);
    setIsProcessingPayment(false);
  };

  const resetForm = () => {
    setAmount('');
    setPhoneNumber('');
    setConversion(null);
    setPaymentReference('');
    setIsProcessingPayment(false);
    setPaymentMethod('traditional');
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
            Add funds to your account balance using Fapshi mobile money (MTN & Orange). Current balance: {formatPrice(currentBalance, 'USD')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Amount Input */}
          <div>
            <Label htmlFor="amount">Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount in USD"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              step="0.01"
              className="mt-1"
              disabled={isProcessingPayment}
            />
          </div>

          {/* Preset Amounts */}
          <div>
            <Label className="text-sm text-muted-foreground">Quick Select</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {presetAmounts.map((presetAmount) => (
                <Button
                  key={presetAmount}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetAmount(presetAmount)}
                  disabled={isProcessingPayment}
                  className="text-xs"
                >
                  ${presetAmount}
                </Button>
              ))}
            </div>
          </div>

          {/* Currency Conversion Display */}
          {conversion && (
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Calculator className="h-4 w-4" />
                Currency Conversion
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Original Amount (USD):</span>
                  <span>{formatPrice(conversion.originalAmount, 'USD')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Exchange Rate:</span>
                  <span>1 USD = {conversion.rate.toFixed(6)} {conversion.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>Converted Amount:</span>
                  <span>{formatPrice(conversion.convertedAmount, conversion.currency)}</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>FX Buffer (2.5%):</span>
                  <span>+{formatPrice(conversion.fxBuffer, conversion.currency)}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1 text-green-600">
                  <span>Final Amount:</span>
                  <span>{formatPrice(conversion.finalAmount, conversion.currency)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Currency Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span>Your currency: {userCurrency}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUserCurrency('USD')}
              className="h-6 px-2 text-xs"
            >
              Change
            </Button>
          </div>

          {/* Payment Method - Fapshi Only */}
          {isFapshiSupported(userCurrency) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-800">
                <Smartphone className="h-5 w-5" />
                <div>
                  <div className="font-medium text-sm">Fapshi Payment</div>
                  <div className="text-xs text-blue-600">MTN Mobile Money & Orange Money</div>
                </div>
              </div>
            </div>
          )}

          {/* Phone Number Input */}
          <div>
              <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
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
          </div>

          {/* Payment Processing Status */}
          {isProcessingPayment && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-800">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-medium">Processing Payment</span>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                Reference: {paymentReference}
              </p>
              <p className="text-xs text-blue-500 mt-1">
                Please complete the payment on your mobile money app. This may take a few minutes.
              </p>
            </div>
          )}

          {/* Fapshi Payment Component */}
          {isFapshiSupported(userCurrency) && conversion && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <FapshiPayment
                amount={conversion.convertedAmount}
                currency={userCurrency}
                onSuccess={handleFapshiSuccess}
                onError={handleFapshiError}
                onCancel={() => {
                  setIsProcessingPayment(false);
                  setPaymentReference('');
                }}
                description={`DigiNum Account Top-up - $${amount} USD`}
              />
            </div>
          )}

          {/* Payment Action Buttons for non-Fapshi currencies */}
          {!isFapshiSupported(userCurrency) && (
            <div className="flex gap-2">
              <Button
                onClick={handleAddFunds}
                disabled={isLoading || isProcessingPayment || !conversion}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Add Funds
                  </>
                )}
              </Button>
              
              {isProcessingPayment && (
                <Button
                  variant="outline"
                  onClick={() => setIsProcessingPayment(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
            </div>
          )}

          {/* Info Alert */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Important:</p>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• All amounts are calculated in USD internally</li>
                  <li>• A 2.5% FX buffer is added to protect against currency fluctuations</li>
                  <li>• Payment will be processed in your local currency: {userCurrency}</li>
                  <li>• Both original (USD) and converted amounts are saved for reporting</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddFundsModal; 