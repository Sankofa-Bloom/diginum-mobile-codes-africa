import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { getCurrentUser } from '@/lib/auth';
import BuyButton from './Buy';

const BuyPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        setIsAuthenticated(!!user);
        if (!user) {
          toast.error('Please log in to purchase a service.');
          navigate('/login', { state: { from: '/buy' } });
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        toast.error('An error occurred while checking your authentication status.');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="mb-4">You need to be logged in to access this page.</p>
          <Button onClick={() => navigate('/login', { state: { from: '/buy' } })}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Example service data - replace with actual data fetching logic
  const serviceData = {
    id: 1,
    title: 'Example Service',
    price: 9.99,
    sellerId: 'seller-123'
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Complete Your Purchase</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">{serviceData.title}</h2>
        <p className="text-gray-700 mb-4">Price: ${serviceData.price.toFixed(2)}</p>
        
        <BuyButton 
          serviceId={serviceData.id}
          serviceTitle={serviceData.title}
          price={serviceData.price}
          sellerId={serviceData.sellerId}
        />
      </div>
    </div>
  );
};

export default BuyPage;
