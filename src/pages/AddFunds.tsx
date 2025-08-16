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
  const [currentUserBalance, setCurrentUserBalance] = useState<number | null>(null);
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

  const fetchCurrentBalance = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', user.id)
        .eq('currency', 'USD')
        .single();
        
      if (error && error.code === 'PGRST116') {
        // No balance record exists yet
        setCurrentUserBalance(0);
      } else if (!error && data) {
        setCurrentUserBalance(data.balance || 0);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
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
      
      const { error: paymentError } = await supabase
        .from('payment_transactions')
        .insert([{
          user_id: user.id,
          reference: reference,
          amount: numAmount,
          currency: 'USD',
          payment_method: 'manual',
          status: 'pending',
          description: isOrderPayment 
            ? `Payment for ${orderData.serviceTitle} - $${numAmount} USD`
            : `Add funds to DigiNum account - $${numAmount} USD`
        }]);

      if (paymentError) {
        throw new Error(`Failed to create payment record: ${paymentError.message}`);
      }

      // Simulate payment processing (in real app, this would redirect to payment gateway)
      toast({
        title: "Payment Initiated",
        description: `Payment of $${numAmount} USD has been initiated. Reference: ${reference}`,
      });

      // For demo purposes, simulate successful payment after 2 seconds
      setTimeout(async () => {
        try {
          // Update payment status to completed
          const { error: updateError } = await supabase
            .from('payment_transactions')
            .update({ status: 'completed' })
            .eq('reference', reference);

          if (updateError) {
            console.error('Failed to update payment status:', updateError);
            return;
          }

          // Credit user balance
          await creditUserBalance(user.id, numAmount);

          toast({
            title: "Payment Successful!",
            description: `$${numAmount} has been added to your account.`,
          });

          // Call the callback to update parent component
          onFundsAdded?.(numAmount);

          // Update local balance state
          if (currentUserBalance !== null) {
            setCurrentUserBalance(currentUserBalance + numAmount);
          }

          // Redirect to dashboard for all successful payments
          if (isOrderPayment) {
            navigate('/dashboard', { 
              state: { 
                message: `Payment successful! Your order for ${orderData.serviceTitle} is being processed.` 
              } 
            });
          } else {
            // For regular add funds, redirect to dashboard with success message
            navigate('/dashboard', { 
              state: { 
                message: `$${numAmount} has been successfully added to your account!` 
            } 
            });
          }

        } catch (error) {
          console.error('Payment completion error:', error);
        }
      }, 2000);

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

  // Helper function to credit user balance
  const creditUserBalance = async (userId: string, amount: number) => {
    try {
      console.log(`Attempting to credit user ${userId} with amount ${amount}`);
      
      // Check if user has existing balance
      const { data: existingBalance, error: balanceError } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', userId)
        .eq('currency', 'USD')
        .single();

      if (balanceError && balanceError.code === 'PGRST116') {
        // Create new balance record
        console.log('Creating new balance record');
        const { error: insertError } = await supabase
          .from('user_balances')
          .insert([{
            user_id: userId,
            balance: amount,
            currency: 'USD',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
          
        if (insertError) {
          console.error('Failed to create balance record:', insertError);
          throw new Error(`Failed to create balance record: ${insertError.message}`);
        }
        
        console.log('Balance record created successfully');
      } else if (!balanceError) {
        // Update existing balance
        const currentBalance = existingBalance.balance || 0;
        const newBalance = currentBalance + amount;
        
        console.log(`Updating existing balance from ${currentBalance} to ${newBalance}`);
        
        const { error: updateError } = await supabase
          .from('user_balances')
          .update({ 
            balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('currency', 'USD');
          
        if (updateError) {
          console.error('Failed to update balance:', updateError);
          throw new Error(`Failed to update balance: ${updateError.message}`);
        }
        
        console.log('Balance updated successfully');
      } else {
        // Some other error occurred
        console.error('Error checking balance:', balanceError);
        throw new Error(`Failed to check balance: ${balanceError.message}`);
      }
      
      // Verify the balance was updated
      const { data: verifyBalance, error: verifyError } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', userId)
        .eq('currency', 'USD')
        .single();
        
      if (verifyError) {
        console.error('Failed to verify balance update:', verifyError);
      } else {
        console.log(`Balance verification: ${verifyBalance.balance}`);
      }
      
    } catch (error) {
      console.error('Failed to credit user balance:', error);
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
