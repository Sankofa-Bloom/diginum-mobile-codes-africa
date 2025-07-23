import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'fr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.buy': 'Buy Number',
    'nav.dashboard': 'Dashboard',
    'nav.admin': 'Admin',
    
    // Home page
    'home.title': 'Get International Phone Numbers Instantly',
    'home.subtitle': 'Buy temporary phone numbers for SMS verification with Mobile Money. Secure, fast, and reliable.',
    'home.cta': 'Buy Number Now',
    'home.features.instant': 'Instant Delivery',
    'home.features.secure': 'Secure Payment',
    'home.features.support': '24/7 Support',
    
    // Buy page
    'buy.title': 'Buy Phone Number',
    'buy.selectCountry': 'Select Country',
    'buy.selectService': 'Select Service',
    'buy.price': 'Price',
    'buy.buyNow': 'Buy Now',
    
    // Dashboard
    'dashboard.title': 'My Numbers',
    'dashboard.active': 'Active',
    'dashboard.waiting': 'Waiting for SMS',
    'dashboard.completed': 'Completed',
    'dashboard.expired': 'Expired',
    'dashboard.requestAnother': 'Request Another SMS',
    'dashboard.copySms': 'Copy SMS Code',
    'dashboard.noNumbers': 'No phone numbers yet',
    'dashboard.getStarted': 'Get your first number',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error occurred',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
  },
  fr: {
    // Navigation
    'nav.home': 'Accueil',
    'nav.buy': 'Acheter Numéro',
    'nav.dashboard': 'Tableau de Bord',
    'nav.admin': 'Admin',
    
    // Home page
    'home.title': 'Obtenez des Numéros de Téléphone Internationaux Instantanément',
    'home.subtitle': 'Achetez des numéros de téléphone temporaires pour la vérification SMS avec Mobile Money. Sécurisé, rapide et fiable.',
    'home.cta': 'Acheter un Numéro Maintenant',
    'home.features.instant': 'Livraison Instantanée',
    'home.features.secure': 'Paiement Sécurisé',
    'home.features.support': 'Support 24/7',
    
    // Buy page
    'buy.title': 'Acheter un Numéro de Téléphone',
    'buy.selectCountry': 'Sélectionner le Pays',
    'buy.selectService': 'Sélectionner le Service',
    'buy.price': 'Prix',
    'buy.buyNow': 'Acheter Maintenant',
    
    // Dashboard
    'dashboard.title': 'Mes Numéros',
    'dashboard.active': 'Actif',
    'dashboard.waiting': 'En Attente de SMS',
    'dashboard.completed': 'Terminé',
    'dashboard.expired': 'Expiré',
    'dashboard.requestAnother': 'Demander un Autre SMS',
    'dashboard.copySms': 'Copier le Code SMS',
    'dashboard.noNumbers': 'Aucun numéro de téléphone pour le moment',
    'dashboard.getStarted': 'Obtenez votre premier numéro',
    
    // Common
    'common.loading': 'Chargement...',
    'common.error': 'Erreur survenue',
    'common.success': 'Succès',
    'common.cancel': 'Annuler',
    'common.confirm': 'Confirmer',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en'); // Default to English

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};