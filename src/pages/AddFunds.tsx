import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/lib/supabaseClient';
import LanguageToggle from '@/components/LanguageToggle';

interface AddFundsProps {
  onFundsAdded?: (newBalance: number) => void;
  currentBalance?: number;
}

export default function AddFunds({ onFundsAdded, currentBalance = 0 }: AddFundsProps) {
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
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
      // Create payment record
      const reference = `FAPSHI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { error: paymentError } = await supabase
        .from('fapshi_payments')
        .insert([{
          user_id: user.id,
          reference: reference,
          amount: numAmount,
          currency: 'USD',
          status: 'pending'
        }]);

      if (paymentError) {
        throw new Error(`Failed to create payment record: ${paymentError.message}`);
      }

      // Initialize Fapshi payment
      const fapshiResponse = await fetch('/.netlify/functions/fapshi-initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: numAmount,
          currency: 'USD',
          reference: reference,
          description: isOrderPayment 
            ? `Payment for ${orderData.serviceTitle} - $${numAmount} USD`
            : `Add funds to DigiNum account - $${numAmount} USD`
        }),
      });

      if (!fapshiResponse.ok) {
        throw new Error('Failed to initialize Fapshi payment');
      }

      const fapshiData = await fapshiResponse.json();
      
      if (fapshiData.success && fapshiData.paymentUrl) {
        // Redirect to Fapshi payment page
        window.location.href = fapshiData.paymentUrl;
      } else {
        throw new Error(fapshiData.message || 'Failed to get payment URL');
      }

    } catch (error) {
      console.error('Add funds error:', error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckPayment = async () => {
    if (!user) return;

    try {
      // Check for recent pending payments
      const { data: payments, error } = await supabase
        .from('fapshi_payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !payments || payments.length === 0) {
        return;
      }

      const payment = payments[0];
      
      // Check payment status with Fapshi
      const statusResponse = await fetch(`/.netlify/functions/fapshi-status?reference=${payment.reference}`);
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        
        if (statusData.status === 'completed') {
          // Update payment status
          await supabase
            .from('fapshi_payments')
            .update({ 
              status: 'completed',
              fapshi_transaction_id: statusData.transaction_id,
              updated_at: new Date().toISOString()
            })
            .eq('id', payment.id);

          // Credit user balance
          const { data: balanceData, error: balanceError } = await supabase
            .from('user_balances')
            .select('balance')
            .eq('user_id', user.id)
            .eq('currency', 'USD')
            .single();

          if (balanceError && balanceError.code === 'PGRST116') {
            // Create new balance record
            await supabase
              .from('user_balances')
              .insert([{
                user_id: user.id,
                balance: payment.amount,
                currency: 'USD'
              }]);
            
            onFundsAdded?.(payment.amount);
          } else if (!balanceError) {
            // Update existing balance
            const currentBalance = balanceData.balance || 0;
            const newBalance = currentBalance + payment.amount;
            
            await supabase
              .from('user_balances')
              .update({ 
                balance: newBalance,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id)
              .eq('currency', 'USD');
            
            onFundsAdded?.(newBalance);
          }

          toast({
            title: "Payment Successful!",
            description: `$${payment.amount} has been added to your account.`,
          });

          // If this was an order payment, redirect to dashboard
          if (isOrderPayment) {
            navigate('/dashboard', { 
              state: { 
                message: `Payment successful! Your order for ${orderData.serviceTitle} is being processed.` 
              } 
            });
          }
        }
      }
    } catch (error) {
      console.error('Check payment error:', error);
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
                  : 'Add funds to your DigiNum account using Fapshi'
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
                : 'Add funds to your DigiNum account using Fapshi'
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
              <div className="text-sm text-muted-foreground">
                Current Balance: ${currentBalance.toFixed(2)}
              </div>
            )}

            <div className="flex space-x-2">
              <Button 
                onClick={handleAddFunds} 
                disabled={isProcessing || !amount}
                className="flex-1"
              >
                {isProcessing ? 'Processing...' : (isOrderPayment ? 'Pay Now' : 'Add Funds')}
              </Button>
              
              <Button 
                onClick={handleCheckPayment} 
                variant="outline"
                disabled={isProcessing}
              >
                Check Status
              </Button>
            </div>

            {isOrderPayment && (
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
