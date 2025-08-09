import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Smartphone, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { fapshiAPI, formatFapshiAmount, isFapshiSupported } from '@/lib/fapshi';

interface FapshiPaymentProps {
  amount: number;
  currency: string;
  onSuccess?: (paymentData: any) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  userEmail?: string;
  userName?: string;
  description?: string;
}

export default function FapshiPayment({
  amount,
  currency,
  onSuccess,
  onError,
  onCancel,
  userEmail = '',
  userName = '',
  description = 'DigiNum SMS Service Payment'
}: FapshiPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    email: userEmail,
    name: userName,
    phone: '',
  });

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
    if (!formData.email || !formData.name) {
      toast.error('Please fill in all required fields');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
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
        email: formData.email,
        name: formData.name,
        phone: formData.phone,
        description: description,
        redirectUrl: `${window.location.origin}/payment/success`,
      };

      const response = await fapshiAPI.initiatePayment(paymentData);

      if (response.success && response.data) {
        // Redirect to Fapshi payment page
        if (response.data.payment_url) {
          window.location.href = response.data.payment_url;
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
          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+237 6XX XXX XXX"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              disabled={isLoading}
            />
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
            disabled={isLoading || paymentStatus === 'success'}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
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