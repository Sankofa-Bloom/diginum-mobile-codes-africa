import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Shield, Zap, Users, ArrowRight, CheckCircle, Globe, CreditCard, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { motion, useAnimationControls } from 'framer-motion';


const Home = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showFeatures, setShowFeatures] = useState(false);

  const features = [
    {
      icon: <Phone className="h-8 w-8 text-primary" />,
      title: t('features.phone.title'),
      description: t('features.phone.description'),
    },
    {
      icon: <Shield className="h-8 w-8 text-success" />,
      title: t('features.security.title'),
      description: t('features.security.description'),
    },
    {
      icon: <Zap className="h-8 w-8 text-warning" />,
      title: t('features.speed.title'),
      description: t('features.speed.description'),
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: t('features.support.title'),
      description: t('features.support.description'),
    },
  ];

  const popularServices = [
    { name: 'WhatsApp', icon: '💬', price: 500, description: t('services.whatsapp') },
    { name: 'Telegram', icon: '✈️', price: 300, description: t('services.telegram') },
    { name: 'Facebook', icon: '📘', price: 400, description: t('services.facebook') },
    { name: 'Instagram', icon: '📷', price: 450, description: t('services.instagram') },
    { name: 'Twitter/X', icon: '🐦', price: 350, description: t('services.twitter') },
    { name: 'TikTok', icon: '🎵', price: 400, description: t('services.tiktok') },
  ];

  const controls = useAnimationControls();

  const handleHover = (index: number) => {
    controls.start({
      scale: 1.05,
      transition: { duration: 0.2 }
    });
  };

  const handleLeave = () => {
    controls.start({
      scale: 1,
      transition: { duration: 0.2 }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary/5 to-primary/10 py-16">
        <div className="container-mobile mx-auto px-4">
          <div className="flex flex-col items-center space-y-6">
            {/* Language Switcher */}
            <div className="absolute right-4 top-4">
              <LanguageSwitcher />
            </div>
            
            {/* Hero Content */}
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-primary">
                {t('hero.title')}
                <br />
                <span className="text-yellow-500">{t('hero.highlight')}</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mt-4">
                {t('hero.description')}
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <motion.button
                  size="lg"
                  className="bg-primary text-white hover:bg-primary/90 text-lg px-6 py-3 w-full sm:w-auto"
                  onClick={() => navigate('/buy')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('cta.buyNow')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </motion.button>
                <motion.button
                  variant="outline"
                  size="lg"
                  className="border-primary text-primary hover:bg-primary/10 text-lg px-6 py-3 w-full sm:w-auto"
                  onClick={() => navigate('/dashboard')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('cta.myNumbers')}
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12">
        <div className="container-mobile mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            {t('features.title')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2, duration: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    <p className="text-gray-600 mt-1">{feature.description}</p>
                  </div>
                </div>
                <span className="font-bold text-black">MTN</span>
              </motion.div>
              <div>
                <div className="font-semibold">MTN Mobile Money</div>
                <div className="text-sm text-muted-foreground">Secure payment accepted</div>
              </div>
            ))}
            {popularServices.map((service, index) => (
              <motion.div
                key={service.name}
                className="text-center hover:shadow-md transition-shadow cursor-pointer"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-4 p-6 bg-white rounded-lg shadow-sm">
                  <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                    <span className="font-bold text-white">{service.icon}</span>
                  </div>
                  <div>
                    <div className="font-semibold">{service.name}</div>
                    <div className="text-sm text-muted-foreground">{service.description}</div>
                  </div>
                </div>
              </motion.div>
            ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-white">
        <div className="container-mobile text-center space-y-6">
          <h2 className="text-3xl font-bold">Get Started Today!</h2>
          <p className="text-xl text-blue-100">Buy temporary numbers for your online verifications.</p>
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