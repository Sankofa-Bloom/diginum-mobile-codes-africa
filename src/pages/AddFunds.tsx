import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import apiClient from '@/lib/apiClient';
import { supabase } from '@/lib/supabaseClient';
import LanguageToggle from '@/components/LanguageToggle';

interface AddFundsProps {
  onFundsAdded?: (newBalance: number) => void;
  currentBalance?: number;
}

export default function AddFunds({ onFundsAdded, currentBalance = 0 }: AddFundsProps) {
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUserBalance, setCurrentUserBalance] = useState<number | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
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
      // apiClient interceptor returns response.data directly, so response is already the data
      let balance = 0;
      if ((response as any).balance !== undefined) {
        balance = (response as any).balance;
        if (import.meta.env.DEV) {
          console.log('Found balance in response.balance:', balance);
        }
      } else if ((response as any).data?.balance !== undefined) {
        balance = (response as any).data.balance;
        if (import.meta.env.DEV) {
          console.log('Found balance in response.data.balance:', balance);
        }
      } else if (typeof response === 'object' && (response as any).balance !== undefined) {
        balance = (response as any).balance;
        if (import.meta.env.DEV) {
          console.log('Found balance in direct response:', balance);
        }
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
          currency: 'USD',
          payment_method: 'swychr',
          status: 'pending',
          description: isOrderPayment 
            ? `Payment for ${orderData.serviceTitle} - $${numAmount} USD`
            : `Add funds to DigiNum account - $${numAmount} USD`
        });

        if (!(paymentResponse as any).success) {
          throw new Error('Failed to create payment record');
        }
      } catch (error: any) {
        throw new Error(`Failed to create payment record: ${error.message}`);
      }

      // Create Swychr payment link
      const paymentResponse = await fetch('/.netlify/functions/swychr-create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          country_code: 'US', // Default to US, can be made configurable
          name: user.full_name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          mobile: user.phone || '',
          amount: numAmount,
          transaction_id: reference,
          description: isOrderPayment 
            ? `Payment for ${orderData.serviceTitle}`
            : 'Add funds to DigiNum account',
          pass_digital_charge: false, // Set to true if you want to pass digital charges to user
        }),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.message || 'Failed to create payment link');
      }

      const paymentData = await paymentResponse.json();

      if (!paymentData.success) {
        throw new Error(paymentData.message || 'Failed to create payment link');
      }

      // Store transaction ID and payment link
      setTransactionId(reference);
      setPaymentLink(paymentData.data.payment_url);

      toast({
        title: "Payment Link Created",
        description: "Click the payment link below to complete your payment.",
      });

    } catch (error) {
      console.error('Add funds error:', error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to create payment link",
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
      
      // Use the Netlify function to credit balance
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

  const handleCheckPayment = async () => {
    if (!user) return;

    try {
      // Check for recent pending payments in payment_transactions table
      const { data: payments, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching payments:', error);
        return;
      }

      if (!payments || payments.length === 0) {
        toast({
          title: "No Pending Payments",
          description: "You have no pending payments to check.",
        });
        return;
      }

      const payment = payments[0];
      
      // Check if payment is still pending (in real app, this would check with payment gateway)
      if (payment.status === 'pending') {
        toast({
          title: "Payment Status",
          description: `Payment ${payment.reference} is still being processed. Amount: $${payment.amount} USD`,
        });
      } else if (payment.status === 'completed') {
        toast({
          title: "Payment Completed",
          description: `Payment ${payment.reference} has been completed. Amount: $${payment.amount} USD`,
        });
      }

    } catch (error) {
      console.error('Payment check error:', error);
      toast({
        title: "Error",
        description: "Failed to check payment status.",
        variant: "destructive",
      });
    }
  };

  // Check Swychr payment status
  const checkPaymentStatus = async () => {
    if (!transactionId) return;

    setIsCheckingStatus(true);

    try {
      const response = await fetch('/.netlify/functions/swychr-check-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transaction_id: transactionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to check payment status');
      }

      const statusData = await response.json();

      if (!statusData.success) {
        throw new Error(statusData.message || 'Failed to check payment status');
      }

      const paymentStatus = statusData.data.status;

      if (paymentStatus === 'completed' || paymentStatus === 'success') {
        // Payment successful, update database and credit user
        await handlePaymentSuccess();
      } else if (paymentStatus === 'pending' || paymentStatus === 'processing') {
        toast({
          title: "Payment Status",
          description: "Payment is still being processed. Please wait...",
        });
      } else if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
        toast({
          title: "Payment Status",
          description: "Payment was not successful. Please try again.",
          variant: "destructive",
        });
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
    if (!transactionId || !user) return;

    try {
      // Update payment status to completed using Netlify function
      try {
        const updateResponse = await apiClient.post('/update-payment-status', {
          reference: transactionId,
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

      // Get the payment amount using Netlify function
      try {
        const paymentResponse = await apiClient.get(`/payment-details?reference=${transactionId}`);
        
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

          // Clear the payment link and transaction ID
          setPaymentLink(null);
          setTransactionId(null);
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
              onClick={() => {
                        // Navigate back to previous page
        navigate(-1);
              }}
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
              <CreditCard className="h-5 w-5" />
              <span>{isOrderPayment ? 'Order Payment' : 'Add Funds'}</span>
            </CardTitle>
            <CardDescription>
              {isOrderPayment 
                ? `Pay $${orderData.amount} for ${orderData.serviceTitle}`
                : 'Add funds to your DigiNum account'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                step="0.01"
                disabled={isOrderPayment}
              />
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

            {!paymentLink ? (
              <div className="flex space-x-2">
                <Button 
                  onClick={handleAddFunds} 
                  disabled={isProcessing || !amount}
                  className="flex-1"
                >
                  {isProcessing ? 'Processing...' : (isOrderPayment ? 'Pay Now' : 'Add Funds')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Payment Link */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Payment Link Created</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Click the button below to complete your payment securely through Swychr.
                  </p>
                  <Button
                    onClick={() => window.open(paymentLink, '_blank')}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Complete Payment
                  </Button>
                </div>

                {/* Status Check */}
                <div className="flex space-x-2">
                  <Button 
                    onClick={checkPaymentStatus} 
                    variant="outline"
                    disabled={isCheckingStatus}
                    className="flex-1"
                  >
                    {isCheckingStatus ? 'Checking...' : 'Check Payment Status'}
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      setPaymentLink(null);
                      setTransactionId(null);
                    }} 
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground text-center">
                  After completing payment, click "Check Payment Status" to verify and credit your account.
                </div>
              </div>
            )}

            {isOrderPayment && !paymentLink && (
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
