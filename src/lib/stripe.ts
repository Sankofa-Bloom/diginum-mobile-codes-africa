import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useSession } from '@/lib/supabaseClient';
import { api } from '@/lib/api';

// Load Stripe client
const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLIC_KEY || '');

export const StripeProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  
  if (!session) {
    return <div className="flex items-center justify-center h-screen">Please log in to continue</div>;
  }

  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
};

export const StripePaymentForm = ({ amount, currency, onPaymentSuccess }: {
  amount: number;
  currency: string;
  onPaymentSuccess: () => void;
}) => {
  const [clientSecret, setClientSecret] = React.useState<string | undefined>();
  const [error, setError] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [paymentStatus, setPaymentStatus] = React.useState<string | undefined>();
  const { t } = useTranslation();

  React.useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setLoading(true);
        setError(undefined);
        setPaymentStatus(undefined);
        
        const response = await api.post('/api/payment/stripe', {
          amount,
          currency
        });
        setClientSecret(response.data.clientSecret);
      } catch (err: any) {
        setError(t('errorPayment'));
        console.error('Error creating payment intent:', err);
        setPaymentStatus('error');
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [amount, currency, t]);

  if (!clientSecret) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin inline-block w-6 h-6 border-4 border-t-transparent border-primary rounded-full mr-2"></div>
        <span>{t('loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center text-lg font-semibold">
        {t('payWithStripe', { amount: amount.toFixed(2) })}
      </div>
      <div className="rounded-lg border p-4">
        <StripeCardElement 
          clientSecret={clientSecret}
          onPaymentSuccess={() => {
            setSuccess(true);
            setPaymentStatus('success');
            onPaymentSuccess();
          }}
          onError={(error) => {
            setError(error);
            setPaymentStatus('error');
          }}
          onLoadingChange={setLoading}
        />
      </div>
      
      {loading && (
        <div className="text-center py-2">
          <div className="animate-spin inline-block w-6 h-6 border-4 border-t-transparent border-primary rounded-full mr-2"></div>
          <span>{t('processingPayment')}</span>
        </div>
      )}

      {error && (
        <div className="text-red-500 text-center py-2">
          {error}
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              setError(undefined);
              setPaymentStatus(undefined);
              setClientSecret(undefined);
              createPaymentIntent();
            }}
          >
            {t('tryAgain')}
          </Button>
        </div>
      )}

      {success && (
        <div className="text-green-500 text-center py-2">
          <CheckCircle className="inline-block w-6 h-6 mr-2" />
          {t('paymentSuccess')}
        </div>
      )}

      {paymentStatus === 'error' && (
        <div className="text-red-500 text-center py-2">
          <XCircle className="inline-block w-6 h-6 mr-2" />
          {t('paymentFailed')}
        </div>
      )}
    </div>
  );
};

const StripeCardElement = ({ 
  clientSecret,
  onPaymentSuccess,
  onError,
  onLoadingChange 
}: {
  clientSecret: string;
  onPaymentSuccess: () => void;
  onError: (error: string) => void;
  onLoadingChange: (loading: boolean) => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    onLoadingChange(true);

    try {
      if (!stripe || !elements) {
        throw new Error('Stripe is not loaded');
      }

      const card = elements.getElement(CardElement);
      if (!card) {
        throw new Error('Card element is not available');
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card,
            billing_details: {
              name: 'Customer Name', // TODO: Get from user profile
            },
          },
        }
      );

      if (confirmError) {
        onError(confirmError.message || 'Payment failed');
        setLoading(false);
        onLoadingChange(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        onPaymentSuccess();
      }
    } catch (err) {
      onError('Payment failed. Please try again.');
    } finally {
      setLoading(false);
      onLoadingChange(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CardElement 
        options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
            invalid: {
              color: '#9e2146',
            },
          },
        }}
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
};
