import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CreditCard, Smartphone, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import LanguageToggle from '@/components/LanguageToggle';

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPayment, setSelectedPayment] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [phoneNumber, setPhoneNumber] = React.useState('');

  const orderData = location.state;

  React.useEffect(() => {
    if (!orderData) {
      navigate('/buy');
    }
  }, [orderData, navigate]);

  if (!orderData) {
    return null;
  }

  const paymentMethods = [
    {
      id: 'mtn',
      name: 'MTN Mobile Money',
      icon: '📱',
      color: 'bg-yellow-400',
      textColor: 'text-gray-900',
      description: 'Payez avec votre compte MTN MoMo',
      prefix: '+237 6',
    },
    {
      id: 'orange',
      name: 'Orange Money',
      icon: '📳',
      color: 'bg-orange-500',
      textColor: 'text-white',
      description: 'Payez avec votre compte Orange Money',
      prefix: '+237 6',
    },
  ];

  const handlePayment = async () => {
    if (!selectedPayment || !phoneNumber) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un mode de paiement et saisir votre numéro.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simulate successful payment
      toast({
        title: 'Paiement réussi!',
        description: 'Votre numéro virtuel est en cours de génération...',
      });

      // Navigate to dashboard with new order
      setTimeout(() => {
        navigate('/dashboard', {
          state: {
            newOrder: {
              id: Date.now().toString(),
              phoneNumber: '+1234567890', // Mock number
              service: orderData.service.name,
              country: orderData.country.name,
              status: 'active',
              expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(), // 20 minutes
              createdAt: new Date().toISOString(),
              price: orderData.totalPrice,
            }
          }
        });
      }, 2000);

    } catch (error) {
      toast({
        title: 'Erreur de paiement',
        description: 'Une erreur est survenue. Veuillez réessayer.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    // Format as XXX XXX XXX
    const formatted = digits.replace(/(\d{2})(\d{3})(\d{3})/, '$1 $2 $3');
    return formatted;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container-mobile py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/buy')}
                className="gap-2"
                disabled={isProcessing}
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
              <h1 className="text-xl font-bold">Paiement</h1>
            </div>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <div className="container-mobile py-6 space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-success text-white rounded-full flex items-center justify-center text-xs">
              <CheckCircle className="h-3 w-3" />
            </div>
            <span>Sélection</span>
          </div>
          <div className="w-8 h-px bg-border"></div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
              2
            </div>
            <span>Paiement</span>
          </div>
          <div className="w-8 h-px bg-border"></div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-xs font-bold">
              3
            </div>
            <span>Réception</span>
          </div>
        </div>

        {/* Order Summary */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Récapitulatif de commande</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl">{orderData.service.icon}</div>
              <div className="flex-1">
                <div className="font-semibold">{orderData.service.name}</div>
                <div className="text-sm text-muted-foreground">
                  {orderData.country.flag} {orderData.country.name}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-primary">
                  ₣{orderData.totalPrice.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">XAF</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Choisissez votre mode de paiement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedPayment === method.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedPayment(method.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${method.color} ${method.textColor} rounded-lg flex items-center justify-center text-xl`}>
                    {method.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{method.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {method.description}
                    </div>
                  </div>
                  <div className={`w-5 h-5 border-2 rounded-full ${
                    selectedPayment === method.id
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground'
                  }`}>
                    {selectedPayment === method.id && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Phone Number Input */}
        {selectedPayment && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Numéro de téléphone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex">
                  <div className="px-3 py-2 bg-muted border border-r-0 rounded-l-md text-sm">
                    +237 6
                  </div>
                  <input
                    type="tel"
                    placeholder="XX XXX XXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                    className="flex-1 px-3 py-2 border rounded-r-md focus:outline-none focus:ring-2 focus:ring-primary"
                    maxLength={9}
                    disabled={isProcessing}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Saisissez votre numéro {paymentMethods.find(m => m.id === selectedPayment)?.name} pour recevoir la demande de paiement
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Button */}
        {selectedPayment && phoneNumber && (
          <Card className="border-success/20 bg-success/5">
            <CardContent className="p-6">
              <Alert className="mb-4">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Vous avez 5 minutes pour confirmer le paiement sur votre téléphone après avoir cliqué sur "Payer"
                </AlertDescription>
              </Alert>

              <Button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full btn-success h-12 text-lg"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Traitement en cours...
                  </div>
                ) : (
                  `Payer ₣${orderData.totalPrice.toLocaleString()} avec ${paymentMethods.find(m => m.id === selectedPayment)?.name}`
                )}
              </Button>

              {isProcessing && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <div className="animate-pulse">📱</div>
                    <span className="font-medium">Vérifiez votre téléphone</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    Une notification de paiement a été envoyée à votre numéro +237 6{phoneNumber}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Payment;