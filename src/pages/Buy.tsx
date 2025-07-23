import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type BuyButtonProps = {
  serviceId: number;
  serviceTitle: string;
  price: number;
  sellerId: string;
};

export default function BuyButton({
  serviceId,
  serviceTitle,
  price,
  sellerId
}: BuyButtonProps) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const session = useSession();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!session && !loading) {
      toast.error("Please log in to purchase a service.");
      navigate('/login');
    }
  }, [session, navigate, loading]);

  const handleBuy = async () => {
    if (!session) {
      toast.error("Please log in to purchase a service.");
      navigate('/login');
      return;
    }

    setLoading(true);

    try {
      const buyerId = session.user.id;

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          serviceId,
          buyerId,
          sellerId,
          price,
          status: "pending",
        })
      });

      if (!response.ok) {
        throw new Error("Failed to create order");
      }

      toast.success("Order placed successfully!");
      navigate("/orders");
    } catch (error) {
      toast.error(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full" disabled={loading}>
          {loading ? "Processing..." : `Buy for $${price}`}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Purchase</DialogTitle>
          <DialogDescription>
            Are you sure you want to buy <strong>{serviceTitle}</strong> for ${price}?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => router.refresh()}>
            Cancel
          </Button>
          <Button onClick={handleBuy} disabled={loading}>
            {loading ? "Buying..." : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
