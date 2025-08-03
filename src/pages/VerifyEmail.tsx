import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. Please check your email for the correct link.');
        return;
      }

      try {
        const response = await apiClient.get(`/auth/verify-email?token=${token}`);
        
        if (response.message) {
          setStatus('success');
          setMessage(response.message);
          setUser(response.user);
          
          // Show success toast
          toast.success('Email verified successfully! Welcome to DigiNum!');
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
        }
      } catch (error: any) {
        console.error('Email verification error:', error);
        setStatus('error');
        setMessage(error.response?.data?.error || 'Failed to verify email. Please try again.');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  const handleResendVerification = async () => {
    try {
      // This would need the user's email, which we don't have in this context
      // You might want to store it in localStorage during signup or pass it as a query param
      toast.error('Please use the signup page to resend verification email.');
    } catch (error) {
      console.error('Resend verification error:', error);
      toast.error('Failed to resend verification email');
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-12 w-12 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-red-500" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {status === 'loading' && (
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Please wait while we verify your email address...
              </p>
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {message}
                </AlertDescription>
              </Alert>
              
              {user && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Welcome, {user.first_name || user.email}!</h3>
                  <p className="text-blue-700 text-sm">
                    Your account is now active and ready to use.
                  </p>
                </div>
              )}
              
              <div className="space-y-3">
                <Button 
                  onClick={handleGoToDashboard}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  Go to Dashboard
                </Button>
                <p className="text-center text-sm text-gray-500">
                  You will be redirected automatically in a few seconds...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {message}
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleResendVerification}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Resend Verification Email
                </Button>
                
                <Button 
                  onClick={handleGoToLogin}
                  className="w-full"
                >
                  Go to Login
                </Button>
              </div>
              
              <div className="text-center text-sm text-gray-500">
                <p>Need help? Contact our support team.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail; 