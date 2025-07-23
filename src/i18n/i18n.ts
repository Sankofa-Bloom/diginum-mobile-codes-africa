import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          // Common
          welcome: 'Welcome to DigiNum',
          login: 'Login',
          signup: 'Sign Up',
          logout: 'Logout',
          dashboard: 'Dashboard',
          support: 'Support',
          privacy: 'Privacy Policy',
          
          // Buy Flow
          selectCountry: 'Select Country',
          selectService: 'Select Service',
          review: 'Review',
          payment: 'Payment',
          confirmation: 'Confirmation',
          
          // Payment
          payWithMomo: 'Pay with MTN MoMo',
          payWithStripe: 'Pay with Card',
          amount: 'Amount',
          currency: 'Currency',
          
          // SMS
          smsCode: 'SMS Code',
          retrieveCode: 'Retrieve Code',
          releaseNumber: 'Release Number',
          
          // Error Messages
          error: 'Error',
          errorLoading: 'Error loading data',
          errorPayment: 'Payment failed',
          errorNetwork: 'Network error',
          
          // Success Messages
          success: 'Success',
          paymentSuccess: 'Payment successful',
          codeReceived: 'Code received',
          numberReleased: 'Number released',
          
          // Stripe Payment
          loading: 'Loading payment system...',
          processingPayment: 'Processing payment...',
          tryAgain: 'Try again',
          paymentFailed: 'Payment failed. Please try again.',
          payWithStripe: 'Pay with Card: ${{amount}}',
        },
      },
      fr: {
        translation: {
          // Common
          welcome: 'Bienvenue sur DigiNum',
          login: 'Connexion',
          signup: 'Inscription',
          logout: 'Déconnexion',
          dashboard: 'Tableau de bord',
          support: 'Support',
          privacy: 'Politique de confidentialité',
          
          // Buy Flow
          selectCountry: 'Sélectionnez le pays',
          selectService: 'Sélectionnez le service',
          review: 'Révision',
          payment: 'Paiement',
          confirmation: 'Confirmation',
          
          // Payment
          payWithMomo: 'Payer avec MTN MoMo',
          payWithStripe: 'Payer avec carte',
          amount: 'Montant',
          currency: 'Devise',
          
          // SMS
          smsCode: 'Code SMS',
          retrieveCode: 'Récupérer le code',
          releaseNumber: 'Libérer le numéro',
          
          // Error Messages
          error: 'Erreur',
          errorLoading: 'Erreur de chargement',
          errorPayment: 'Paiement échoué',
          errorNetwork: 'Erreur réseau',
          
          // Success Messages
          success: 'Succès',
          paymentSuccess: 'Paiement réussi',
          codeReceived: 'Code reçu',
          numberReleased: 'Numéro libéré',
          
          // Stripe Payment
          loading: 'Chargement du système de paiement...',
          processingPayment: 'Traitement du paiement...',
          tryAgain: 'Réessayer',
          paymentFailed: 'Paiement échoué. Veuillez réessayer.',
          payWithStripe: 'Payer avec carte: ${{amount}}',
        },
      },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
