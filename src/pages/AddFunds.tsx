import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, ExternalLink, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import apiClient from '@/lib/apiClient';
import { supabase } from '@/lib/supabaseClient';
import LanguageToggle from '@/components/LanguageToggle';
import DualCurrencyDisplay from '@/components/DualCurrencyDisplay';
import { formatPhoneNumber, isValidMTNNumber, formatPhoneNumberForDisplay } from '@/lib/phoneUtils';

interface AddFundsProps {
  onFundsAdded?: (newBalance: number) => void;
  currentBalance?: number;
}

export default function AddFunds({ onFundsAdded, currentBalance = 0 }: AddFundsProps) {
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('XAF');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUserBalance, setCurrentUserBalance] = useState<number | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();

  // Check if this is an order-based payment
  const orderData = location.state;
  const isOrderPayment = orderData?.orderId;

  useEffect(() => {
    if (isOrderPayment && orderData?.amount) {
      setAmount(orderData.amount.toString());
    }
  }, [isOrderPayment, orderData]);

  // Fetch current user balance
  useEffect(() => {
    if (user) {
      fetchCurrentBalance();
    }
  }, [user]);

  // Debug effect to log balance changes
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔄 AddFunds - currentUserBalance state changed to:', currentUserBalance);
    }
  }, [currentUserBalance]);

  const fetchCurrentBalance = async () => {
    if (!user) return;
    
    try {
      const response = await apiClient.get('/account-balance');
      
      if (import.meta.env.DEV) {
        console.log('AddFunds - Balance API response:', response);
        console.log('Response type:', typeof response);
        console.log('Response keys:', Object.keys(response || {}));
      }
      
      // Handle response format from Netlify function
      let balance = 0;
      if ((response as any).balance !== undefined) {
        balance = (response as any).balance;
      } else if ((response as any).data?.balance !== undefined) {
        balance = (response as any).data.balance;
      } else if (typeof response === 'object' && (response as any).balance !== undefined) {
        balance = (response as any).balance;
      }
      
      const finalBalance = parseFloat(balance.toString()) || 0;
      setCurrentUserBalance(finalBalance);
      
      if (import.meta.env.DEV) {
        console.log('AddFunds - Balance loaded and set:', finalBalance);
      }
    } catch (error: any) {
      console.error('Failed to fetch balance:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      setCurrentUserBalance(0);
    }
  };

  const handleAddFunds = async () => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "Please log in to add funds.",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber || !isValidMTNNumber(phoneNumber)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid MTN Mobile Money number (e.g., 67XXXXXXX).",
        variant: "destructive",
      });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment record in payment_transactions table
      const reference = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        const paymentResponse = await apiClient.post('/payment-transactions', {
          reference: reference,
          amount: numAmount,
          currency: selectedCurrency,
          payment_method: 'mtn_momo',
          status: 'pending',
          description: isOrderPayment 
            ? `Payment for ${orderData.serviceTitle} - ${numAmount} ${selectedCurrency}`
            : `Add funds to DigiNum account - ${numAmount} ${selectedCurrency}`
        });

        if (!(paymentResponse as any).success) {
          throw new Error('Failed to create payment record');
        }
      } catch (error: any) {
        throw new Error(`Failed to create payment record: ${error.message}`);
      }

      // Create MTN MoMo payment request
      const paymentResponse = await fetch('/.netlify/functions/momo-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: numAmount,
          currency: selectedCurrency,
          phone_number: formatPhoneNumber(phoneNumber),
          transaction_id: reference,
          description: isOrderPayment 
            ? `Payment for ${orderData.serviceTitle}`
            : 'Add funds to DigiNum account'
        }),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.message || 'Failed to initiate payment');
      }

      const paymentData = await paymentResponse.json();

      if (paymentData.status !== 0) {
        throw new Error(paymentData.message || 'Failed to initiate payment');
      }

      // Store reference ID for status checks
      setReferenceId(paymentData.data.reference_id);

      toast({
        title: "Payment Initiated",
        description: "Please check your phone for the MTN MoMo prompt and complete the payment.",
      });

    } catch (error) {
      console.error('Add funds error:', error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to initiate payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to credit user balance
  const creditUserBalance = async (userId: string, amount: number) => {
    try {
      console.log(`Attempting to credit user ${userId} with amount ${amount}`);
      
      const response = await apiClient.post('/credit-balance', {
        amount: amount,
        currency: 'USD'
      });

      if ((response as any).success) {
        console.log('Balance credited successfully:', (response as any).new_balance);
        return (response as any).new_balance;
      } else {
        throw new Error('Failed to credit balance');
      }
    } catch (error) {
      console.error('Error crediting balance:', error);
      throw error;
    }
  };

  // Check MTN MoMo payment status
  const checkPaymentStatus = async () => {
    if (!referenceId) return;

    setIsCheckingStatus(true);

    try {
      const response = await fetch(`/.netlify/functions/momo-status?reference_id=${referenceId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to check payment status');
      }

      const statusData = await response.json();

      if (statusData.status !== 0) {
        throw new Error(statusData.message || 'Failed to check payment status');
      }

      const paymentStatus = statusData.data.status;

      if (paymentStatus === 'SUCCESSFUL') {
        // Payment successful, update database and credit user
        await handlePaymentSuccess();
      } else if (paymentStatus === 'PENDING') {
        toast({
          title: "Payment Status",
          description: "Payment is still being processed. Please wait...",
        });
      } else if (paymentStatus === 'FAILED') {
        toast({
          title: "Payment Failed",
          description: "The payment was not successful. Please try again.",
          variant: "destructive",
        });
        setReferenceId(null);
      } else {
        toast({
          title: "Payment Status",
          description: `Payment status: ${paymentStatus}`,
        });
      }

    } catch (error) {
      console.error('Payment status check error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to check payment status",
        variant: "destructive",
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Handle successful payment
  const handlePaymentSuccess = async () => {
    if (!referenceId || !user) return;

    try {
      // Update payment status to completed
      try {
        const updateResponse = await apiClient.post('/update-payment-status', {
          reference: referenceId,
          status: 'completed'
        });

        if (!(updateResponse as any).success) {
          console.error('Failed to update payment status');
          return;
        }
      } catch (error: any) {
        console.error('Failed to update payment status:', error);
        return;
      }

      // Get the payment amount
      try {
        const paymentResponse = await apiClient.get(`/payment-details?reference=${referenceId}`);
        
        if ((paymentResponse as any).success && (paymentResponse as any).transaction) {
          const paymentAmount = (paymentResponse as any).transaction.amount;
          
          // Credit user balance
          await creditUserBalance(user.id, paymentAmount);

          // Store the payment time for balance refresh detection
          localStorage.setItem('lastPaymentTime', Date.now().toString());

          toast({
            title: "Payment Successful!",
            description: `$${paymentAmount} has been added to your account.`,
          });

          // Call the callback to update parent component
          onFundsAdded?.(paymentAmount);

          // Refresh the current balance display
          fetchCurrentBalance();

          // Clear the reference ID
          setReferenceId(null);
        } else {
          throw new Error('Failed to get payment details');
        }
      } catch (error: any) {
        console.error('Failed to get payment details:', error);
        toast({
          title: "Error",
          description: "Payment was successful but we couldn't retrieve the details. Please contact support.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error handling payment success:', error);
      toast({
        title: "Error",
        description: "There was an error processing your payment. Please contact support.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isOrderPayment ? 'Complete Payment' : 'Add Funds'}
              </h1>
              <p className="text-gray-600">
                {isOrderPayment 
                  ? `Complete your payment for ${orderData.serviceTitle}`
                  : 'Add funds to your DigiNum account'
                }
              </p>
            </div>
          </div>
          <LanguageToggle />
        </div>

        {/* Payment Card */}
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Phone className="h-5 w-5" />
              <span>MTN Mobile Money Payment</span>
            </CardTitle>
            <CardDescription>
              {isOrderPayment 
                ? `Pay ${orderData.amount} ${selectedCurrency} for ${orderData.serviceTitle}`
                : 'Add funds using MTN Mobile Money'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="flex space-x-2">
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  step="0.01"
                  disabled={isOrderPayment}
                  className="flex-1"
                />
                <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="XAF">XAF</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Dual Currency Display */}
              {amount && parseFloat(amount) > 0 && (
                <div className="text-sm text-muted-foreground">
                  <DualCurrencyDisplay 
                    amount={parseFloat(amount)} 
                    currency={selectedCurrency}
                    size="sm"
                  />
                </div>
              )}
            </div>

            {/* Phone Number Input */}
            <div className="space-y-2">
              <Label htmlFor="phone">MTN Mobile Money Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter MTN number (e.g., 677123456)"
                value={formatPhoneNumberForDisplay(phoneNumber)}
                onChange={(e) => {
                  // Store raw number internally
                  setPhoneNumber(e.target.value.replace(/[^\d+]/g, ''));
                }}
                className="flex-1"
              />
              <p className="text-xs text-muted-foreground">
                Enter your MTN number without country code - we'll add +237 automatically
              </p>
            </div>
            
            {!isOrderPayment && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Current Balance: ${currentUserBalance !== null ? currentUserBalance.toFixed(2) : 'Loading...'}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchCurrentBalance}
                  className="h-6 w-6 p-0"
                >
                  ↻
                </Button>
              </div>
            )}

            {!referenceId ? (
              <Button 
                onClick={handleAddFunds} 
                disabled={isProcessing || !amount || !phoneNumber}
                className="w-full"
              >
                {isProcessing ? 'Processing...' : (isOrderPayment ? 'Pay Now' : 'Add Funds')}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">Payment Initiated</h4>
                  <p className="text-sm text-yellow-700 mb-3">
                    Please check your phone for the MTN Mobile Money prompt and complete the payment.
                  </p>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={checkPaymentStatus} 
                      disabled={isCheckingStatus}
                      className="flex-1"
                    >
                      {isCheckingStatus ? 'Checking...' : 'Check Payment Status'}
                    </Button>
                    
                    <Button 
                      onClick={() => setReferenceId(null)} 
                      variant="ghost"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground text-center">
                  After completing payment on your phone, click "Check Payment Status" to verify and credit your account.
                </div>
              </div>
            )}

            {isOrderPayment && !referenceId && (
              <div className="text-xs text-muted-foreground text-center">
                After payment, your order will be automatically processed.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}