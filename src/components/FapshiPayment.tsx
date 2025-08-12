import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Smartphone, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { fapshiAPI, formatFapshiAmount, isFapshiSupported } from '@/lib/fapshi';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/lib/supabaseClient';

interface FapshiPaymentProps {
  amount: number;
  currency: string;
  onSuccess?: (paymentData: any) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  description?: string;
}

export default function FapshiPayment({
  amount,
  currency,
  onSuccess,
  onError,
  onCancel,
  description = 'DigiNum SMS Service Payment'
}: FapshiPaymentProps) {
  const { user } = useCurrentUser();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    phone: '',
  });

  // Check if user is logged in
  if (!user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Authentication Required
          </CardTitle>
          <CardDescription>
            Please log in to your account to make a payment.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Check if Fapshi supports the currency
  if (!isFapshiSupported(currency)) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Currency Not Supported
          </CardTitle>
          <CardDescription>
            Fapshi only supports XAF (Central African CFA Franc) payments.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!user?.email) {
      toast.error('Please log in to make a payment');
      return false;
    }

    return true;
  };

  const handlePayment = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setPaymentStatus('processing');

    try {
      const paymentData = {
        amount: amount,
        currency: currency as 'XAF',
        email: user.email,
        name: user.user_metadata?.full_name || user.email.split('@')[0], // Use user's name or email prefix
        phone: formData.phone,
        description: description,
        redirect_url: `${window.location.origin}/payment/success`,
      };

      const response = await fapshiAPI.initiatePayment(paymentData);

      if (response.success && response.data) {
        // Redirect to Fapshi payment page
        if (response.data.payment_url) {
          // Extract reference from payment URL
          const urlParams = new URLSearchParams(response.data.payment_url.split('?')[1]);
          const reference = urlParams.get('ref');
          
          if (reference) {
            // Start polling for payment status
            pollPaymentStatus(reference);
          } else {
            window.location.href = response.data.payment_url;
          }
        } else {
          setPaymentStatus('success');
          toast.success('Payment initiated successfully!');
          onSuccess?.(response.data);
        }
      } else {
        setPaymentStatus('error');
        const errorMessage = response.error || 'Payment initiation failed';
        toast.error(errorMessage);
        onError?.(errorMessage);
      }
    } catch (error) {
      setPaymentStatus('error');
      const errorMessage = 'An unexpected error occurred during payment';
      toast.error(errorMessage);
      onError?.(errorMessage);
      console.error('Fapshi payment error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pollPaymentStatus = async (reference: string) => {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const checkStatus = async () => {
      try {
        // First check if payment is completed
        const statusResponse = await fetch(`/.netlify/functions/api/fapshi/payments/status?ref=${reference}`);
        const statusResult = await statusResponse.json();
        
        if (statusResult.status === 'completed') {
          // Payment is completed, now actually credit the user's balance
          if (user?.id) {
            try {
              console.log('Payment completed, attempting to credit balance for user:', user.id);
              
              // Get the current session token
              const { data: sessionData } = await supabase.auth.getSession();
              const accessToken = sessionData.session?.access_token;
              
              if (!accessToken) {
                console.error('No access token found');
                setPaymentStatus('error');
                toast.error('Authentication token expired. Please log in again.');
                onError?.('Authentication token expired');
                return;
              }
              
              console.log('Making balance update request with token:', accessToken.substring(0, 20) + '...');
              
              const completeResponse = await fetch('/.netlify/functions/api/fapshi/payments/complete', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                  reference: reference,
                  userId: user.id
                })
              });
              
              console.log('Balance update response status:', completeResponse.status);
              
              if (!completeResponse.ok) {
                const errorText = await completeResponse.text();
                console.error('Balance update failed with status:', completeResponse.status, 'Error:', errorText);
                throw new Error(`HTTP ${completeResponse.status}: ${errorText}`);
              }
              
              const completeResult = await completeResponse.json();
              console.log('Balance update result:', completeResult);
              
              if (completeResult.success) {
                setPaymentStatus('success');
                toast.success(completeResult.message || 'Payment completed and balance updated successfully!');
                onSuccess?.(completeResult);
                return;
              } else {
                setPaymentStatus('error');
                toast.error(completeResult.message || 'Payment completed but failed to update balance');
                onError?.('Balance update failed');
                return;
              }
            } catch (completeError) {
              console.error('Payment completion error:', completeError);
              setPaymentStatus('error');
              toast.error('Payment completed but failed to update balance. Please contact support.');
              onError?.('Balance update failed');
              return;
            }
          } else {
            setPaymentStatus('error');
            toast.error('User not authenticated. Please log in again.');
            onError?.('Authentication error');
            return;
          }
        } else if (statusResult.status === 'failed') {
          setPaymentStatus('error');
          toast.error('Payment failed or was cancelled');
          onError?.('Payment failed');
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000); // Check every 5 seconds
        } else {
          toast.error('Payment timeout. Please check your payment status.');
          setPaymentStatus('error');
        }
      } catch (error) {
        console.error('Payment status check error:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000);
        } else {
          toast.error('Failed to check payment status');
          setPaymentStatus('error');
        }
      }
    };

    checkStatus();
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-CM', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-blue-600" />
          Fapshi Payment
        </CardTitle>
        <CardDescription>
          Pay securely with MTN Mobile Money or Orange Money
        </CardDescription>
        <div className="flex gap-2 mt-2">
          <Badge variant="secondary">MTN MoMo</Badge>
          <Badge variant="secondary">Orange Money</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Payment Amount */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Amount to pay:</span>
            <span className="text-xl font-bold text-blue-600">
              {formatCurrency(amount, currency)}
            </span>
          </div>
        </div>

        {/* Payment Form */}
        <div className="space-y-3">
          {/* User Info Display */}
          {user && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-blue-800">
                <div className="font-medium">Payment Details</div>
                <div className="text-xs text-blue-600 mt-1">
                  Email: {user.email}
                  {user.user_metadata?.full_name && ` • Name: ${user.user_metadata.full_name}`}
                </div>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="phone">Mobile Money Number *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+237 6XX XXX XXX"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              disabled={isLoading}
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              Enter your MTN Mobile Money or Orange Money number
            </div>
          </div>
        </div>

        {/* Payment Status */}
        {paymentStatus === 'success' && (
          <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Payment initiated successfully!</span>
          </div>
        )}

        {paymentStatus === 'error' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">Payment failed. Please try again.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            onClick={handlePayment}
            disabled={isLoading || paymentStatus === 'success' || !user}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : !user ? (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Login Required
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay {formatCurrency(amount, currency)}
              </>
            )}
          </Button>

          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="w-full"
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Security Info */}
        <div className="text-xs text-gray-500 text-center">
          <p>🔒 Secured by Fapshi</p>
          <p>Your payment information is protected with bank-level security</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Export types for use in other components
export type { FapshiPaymentProps };