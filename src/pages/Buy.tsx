import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getCurrentUser } from '@/lib/auth';

type BuyButtonProps = {
  serviceId: number;
  serviceTitle: string;
  price: number;
  sellerId: string;
};

function BuyButton({
  serviceId,
  serviceTitle,
  price,
  sellerId
}: BuyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleBuy = async () => {
    setLoading(true);

    try {
      // Get current user to verify authentication
      const user = await getCurrentUser();
      if (!user) {
        toast.error("Please log in to purchase a service.");
        navigate('/login', { state: { from: window.location.pathname } });
        return;
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          serviceId,
          buyerId: user.id,
          sellerId,
          price,
          status: "pending",
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to create order');
      }

      const order = await response.json();
      toast.success('Order created successfully!');
      navigate(`/payment?orderId=${order.id}`);
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Failed to create order');
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          Buy Now
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Purchase</DialogTitle>
          <DialogDescription className="mt-2">
            {price === undefined || isNaN(price) ? (
              <span className="text-red-500">Error: Invalid price</span>
            ) : (
              <>
                You are about to purchase <span className="font-semibold">{serviceTitle}</span> for 
                <span className="font-semibold"> ${price.toFixed(2)}</span>.
                <p className="mt-2">Are you sure you want to continue?</p>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-4 mt-6">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleBuy} 
            disabled={loading}
            className="min-w-[100px]"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BuyButton;
