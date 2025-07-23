import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Shield, Zap, Users, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Phone className="h-8 w-8 text-primary" />,
      title: 'Global Numbers',
      description: 'Get virtual numbers from any country.',
    },
    {
      icon: <Shield className="h-8 w-8 text-success" />,
      title: 'Secure Payment',
      description: 'Safe and reliable payment processing.',
    },
    {
      icon: <Zap className="h-8 w-8 text-warning" />,
      title: 'Instant Activation',
      description: 'Numbers ready in minutes.',
    },
  ];

  const steps = [
    'Select your service',
    'Choose a country',
    'Complete payment',
    'Get your number',
    'Verify your account',
  ];

  const popularServices = [
    { name: 'WhatsApp', icon: '💬', price: 2.99 },
    { name: 'Telegram', icon: '✈️', price: 1.99 },
    { name: 'Facebook', icon: '📘', price: 2.49 },
    { name: 'Instagram', icon: '📷', price: 2.75 },
    { name: 'Twitter/X', icon: '🐦', price: 2.25 },
    { name: 'TikTok', icon: '🎵', price: 2.49 },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-hero text-white py-16">
        <div className="container-mobile text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Global Virtual Numbers
            <br />
            <span className="text-yellow-300">Instant</span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-2xl mx-auto">
            Get virtual numbers for any country, instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-3 h-auto"
              onClick={() => navigate('/buy')}
            >
              Buy Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-primary text-primary hover:bg-primary/10 text-lg px-8 py-3 h-auto"
              onClick={() => navigate('/dashboard')}
            >
              My Numbers
            </Button>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-12">
        <div className="container-mobile">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {popularServices.map((service) => (
              <div key={service.name} className="p-4 text-center hover:bg-gray-50 rounded-lg transition-colors">
                <div className="text-3xl mb-2">{service.icon}</div>
                <h3 className="font-semibold text-sm">{service.name}</h3>
                <p className="text-primary font-bold">${service.price.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-12">
        <div className="container-mobile">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </span>
                <p className="text-lg">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-gray-50">
        <div className="container-mobile">
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="p-4 text-center">
                {feature.icon}
                <h3 className="font-semibold mt-2">{feature.title}</h3>
                <p className="text-muted-foreground mt-2">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* CTA */}
      <section className="py-12 bg-primary text-white">
        <div className="container-mobile text-center space-y-4">
          <h2 className="text-3xl font-bold">Get Started</h2>
          <Button
            size="lg"
            className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-3 h-auto"
            onClick={() => navigate('/buy')}
          >
            Buy Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>


    </div>
  );
};

export default Home;