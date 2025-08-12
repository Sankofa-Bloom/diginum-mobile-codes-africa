import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/lib/supabaseClient';

interface AddFundsProps {
  onFundsAdded?: (newBalance: number) => void;
  currentBalance?: number;
}

export default function AddFunds({ onFundsAdded, currentBalance = 0 }: AddFundsProps) {
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { user } = useCurrentUser();

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
      const fapshiResponse = await fetch('/.netlify/functions/api/fapshi/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: numAmount,
          currency: 'USD',
          reference: reference,
          description: `Add funds to DigiNum account - $${numAmount} USD`
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
      const statusResponse = await fetch(`/.netlify/functions/api/fapshi/status?reference=${payment.reference}`);
      
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
        }
      }
    } catch (error) {
      console.error('Check payment error:', error);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Add Funds</CardTitle>
        <CardDescription>
          Add funds to your DigiNum account using Fapshi
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
          />
        </div>
        
        <div className="text-sm text-muted-foreground">
          Current Balance: ${currentBalance.toFixed(2)}
        </div>

        <div className="flex space-x-2">
          <Button 
            onClick={handleAddFunds} 
            disabled={isProcessing || !amount}
            className="flex-1"
          >
            {isProcessing ? 'Processing...' : 'Add Funds'}
          </Button>
          
          <Button 
            onClick={handleCheckPayment} 
            variant="outline"
            disabled={isProcessing}
          >
            Check Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
