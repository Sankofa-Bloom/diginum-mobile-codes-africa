import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, AlertCircle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import CountrySelect from '@/components/CountrySelect';
import ServiceSelect from '@/components/ServiceSelect';
import LanguageToggle from '@/components/LanguageToggle';

const Buy = () => {
  const navigate = useNavigate();
  const [selectedCountry, setSelectedCountry] = React.useState('');
  const [selectedService, setSelectedService] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  // Mock data - In real app, this would come from API
  const countries = [
    { code: 'us', name: 'États-Unis', flag: '🇺🇸', price: 500 },
    { code: 'uk', name: 'Royaume-Uni', flag: '🇬🇧', price: 450 },
    { code: 'fr', name: 'France', flag: '🇫🇷', price: 400 },
    { code: 'de', name: 'Allemagne', flag: '🇩🇪', price: 400 },
    { code: 'ca', name: 'Canada', flag: '🇨🇦', price: 480 },
    { code: 'au', name: 'Australie', flag: '🇦🇺', price: 520 },
    { code: 'nl', name: 'Pays-Bas', flag: '🇳🇱', price: 380 },
    { code: 'se', name: 'Suède', flag: '🇸🇪', price: 420 },
  ];

  const services = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: '💬',
      description: 'Vérification WhatsApp Business & Personnel',
      price: 500,
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: '✈️',
      description: 'Création de compte Telegram',
      price: 300,
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: '📘',
      description: 'Inscription Facebook & Messenger',
      price: 400,
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: '📷',
      description: 'Nouveau compte Instagram',
      price: 450,
    },
    {
      id: 'twitter',
      name: 'Twitter/X',
      icon: '🐦',
      description: 'Vérification compte X (Twitter)',
      price: 350,
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: '🎵',
      description: 'Inscription TikTok',
      price: 400,
    },
    {
      id: 'google',
      name: 'Google',
      icon: '🔍',
      description: 'Compte Google & Gmail',
      price: 380,
    },
    {
      id: 'discord',
      name: 'Discord',
      icon: '🎮',
      description: 'Serveur Discord',
      price: 250,
    },
    {
      id: 'uber',
      name: 'Uber',
      icon: '🚗',
      description: 'Inscription Uber & Uber Eats',
      price: 600,
    },
    {
      id: 'netflix',
      name: 'Netflix',
      icon: '🎬',
      description: 'Essai gratuit Netflix',
      price: 800,
    },
  ];

  const selectedServiceData = services.find(s => s.id === selectedService);
  const selectedCountryData = countries.find(c => c.code === selectedCountry);
  
  const totalPrice = selectedServiceData && selectedCountryData 
    ? selectedServiceData.price + selectedCountryData.price 
    : 0;

  const handleProceedToPayment = () => {
    if (!selectedCountry || !selectedService) return;
    
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      navigate('/payment', {
        state: {
          country: selectedCountryData,
          service: selectedServiceData,
          totalPrice,
        }
      });
      setIsLoading(false);
    }, 1000);
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
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
              <h1 className="text-xl font-bold">Acheter un Numéro</h1>
            </div>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <div className="container-mobile py-6 space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
              1
            </div>
            <span>Sélection</span>
          </div>
          <div className="w-8 h-px bg-border"></div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-xs font-bold">
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

        {/* Service Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              1. Choisissez votre service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceSelect
              services={services}
              selectedService={selectedService}
              onServiceSelect={setSelectedService}
            />
          </CardContent>
        </Card>

        {/* Country Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🌍
              2. Sélectionnez le pays
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CountrySelect
              value={selectedCountry}
              onValueChange={setSelectedCountry}
              countries={countries}
            />
          </CardContent>
        </Card>

        {/* Price Summary */}
        {selectedService && selectedCountry && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Résumé de commande
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Service: {selectedServiceData?.name}</span>
                  <span>₣{selectedServiceData?.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pays: {selectedCountryData?.name}</span>
                  <span>₣{selectedCountryData?.price.toLocaleString()}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">₣{totalPrice.toLocaleString()} XAF</span>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Le numéro sera valide pendant 20 minutes. Vous recevrez le code SMS instantanément.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleProceedToPayment}
                className="w-full btn-primary h-12 text-lg"
                disabled={isLoading}
              >
                {isLoading ? 'Préparation...' : `Procéder au paiement - ₣${totalPrice.toLocaleString()}`}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="text-blue-500">💡</div>
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-900">Première fois ?</h3>
                <p className="text-blue-800 text-sm">
                  Un numéro virtuel vous permet de recevoir des codes SMS sans utiliser votre numéro personnel. 
                  Parfait pour créer des comptes ou vérifier vos services en ligne de manière anonyme.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Buy;