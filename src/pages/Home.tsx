import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Shield, Zap, Users, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LanguageToggle from '@/components/LanguageToggle';

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Phone className="h-8 w-8 text-primary" />,
      title: 'Numéros Temporaires',
      description: 'Obtenez instantanément des numéros de 50+ pays pour vos vérifications.',
    },
    {
      icon: <Shield className="h-8 w-8 text-success" />,
      title: 'Paiement Sécurisé',
      description: 'Payez en toute sécurité avec MTN MoMo et Orange Money.',
    },
    {
      icon: <Zap className="h-8 w-8 text-warning" />,
      title: 'Activation Rapide',
      description: 'Recevez vos codes SMS en moins de 2 minutes.',
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: 'Support 24/7',
      description: 'Notre équipe est disponible via WhatsApp à tout moment.',
    },
  ];

  const steps = [
    'Choisissez votre service (WhatsApp, Telegram, etc.)',
    'Sélectionnez le pays du numéro',
    'Payez avec MTN MoMo ou Orange Money',
    'Recevez votre numéro instantanément',
    'Utilisez le code SMS reçu',
  ];

  const popularServices = [
    { name: 'WhatsApp', icon: '💬', price: 500 },
    { name: 'Telegram', icon: '✈️', price: 300 },
    { name: 'Facebook', icon: '📘', price: 400 },
    { name: 'Instagram', icon: '📷', price: 450 },
    { name: 'Twitter/X', icon: '🐦', price: 350 },
    { name: 'TikTok', icon: '🎵', price: 400 },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container-mobile py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Phone className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-primary">DigiNum</h1>
            </div>
            <LanguageToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-hero text-white py-16">
        <div className="container-mobile text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Numéros Virtuels
            <br />
            <span className="text-yellow-300">Instantanés</span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-2xl mx-auto">
            Achetez des numéros temporaires pour vos vérifications en ligne. 
            Paiement Mobile Money accepté.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-3 h-auto"
              onClick={() => navigate('/buy')}
            >
              Acheter Maintenant
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white/10 text-lg px-8 py-3 h-auto"
              onClick={() => navigate('/dashboard')}
            >
              Mes Numéros
            </Button>
          </div>
        </div>
      </section>

      {/* Popular Services */}
      <section className="py-12 bg-gray-50">
        <div className="container-mobile">
          <h2 className="text-3xl font-bold text-center mb-8">Services Populaires</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {popularServices.map((service) => (
              <Card key={service.name} className="text-center hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="text-3xl mb-2">{service.icon}</div>
                  <h3 className="font-semibold text-sm">{service.name}</h3>
                  <p className="text-primary font-bold">₣{service.price}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16">
        <div className="container-mobile">
          <h2 className="text-3xl font-bold text-center mb-12">Comment ça marche ?</h2>
          <div className="max-w-2xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-lg">{step}</p>
                </div>
                <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-1" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="container-mobile">
          <h2 className="text-3xl font-bold text-center mb-12">Pourquoi DigiNum ?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="text-center card-elevated">
                <CardHeader>
                  <div className="mx-auto mb-4">{feature.icon}</div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Methods */}
      <section className="py-16">
        <div className="container-mobile text-center">
          <h2 className="text-3xl font-bold mb-8">Méthodes de Paiement</h2>
          <div className="flex justify-center gap-8 mb-8">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center">
                <span className="font-bold text-black">MTN</span>
              </div>
              <div>
                <div className="font-semibold">MTN Mobile Money</div>
                <div className="text-sm text-muted-foreground">Paiement sécurisé</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="font-bold text-white">OM</span>
              </div>
              <div>
                <div className="font-semibold">Orange Money</div>
                <div className="text-sm text-muted-foreground">Paiement sécurisé</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-white">
        <div className="container-mobile text-center space-y-6">
          <h2 className="text-3xl font-bold">Prêt à commencer ?</h2>
          <p className="text-xl text-blue-100">
            Obtenez votre premier numéro temporaire en moins de 2 minutes
          </p>
          <Button
            size="lg"
            className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-3 h-auto"
            onClick={() => navigate('/buy')}
          >
            Commencer Maintenant
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-charcoal text-white py-8">
        <div className="container-mobile text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <Phone className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">DigiNum</span>
          </div>
          <p className="text-gray-300 mb-4">
            Votre solution de confiance pour les numéros virtuels en Afrique
          </p>
          <div className="flex justify-center gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-white">Conditions d'utilisation</a>
            <a href="#" className="hover:text-white">Politique de confidentialité</a>
            <a href="#" className="hover:text-white">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;