import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CurrencyService, ExchangeRate, CurrencyConversion } from '@/lib/currency';

interface CurrencyContextType {
  userCurrency: string;
  setUserCurrency: (currency: string) => void;
  exchangeRates: ExchangeRate[];
  loading: boolean;
  convertUSDToLocal: (usdAmount: number, currency?: string) => Promise<CurrencyConversion>;
  formatPrice: (amount: number, currency?: string) => string;
  getUserLocation: () => Promise<void>;
  userLocation: {
    country: string;
    currency: string;
    ip: string;
  } | null;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const [userCurrency, setUserCurrencyState] = useState<string>('USD');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    country: string;
    currency: string;
    ip: string;
  } | null>(null);

  // Load exchange rates
  const loadExchangeRates = async () => {
    try {
      setLoading(true);
      const rates = await CurrencyService.getExchangeRates();
      setExchangeRates(rates);
    } catch (error) {
      console.error('Error loading exchange rates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get user location and set initial currency
  const getUserLocation = async () => {
    try {
      const location = await CurrencyService.getUserLocation();
      setUserLocation(location);
      
      // Set user currency if not already set
      if (!localStorage.getItem('user_currency')) {
        setUserCurrencyState(location.currency);
        CurrencyService.setUserCurrency(location.currency);
      }
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  // Set user currency
  const setUserCurrency = (currency: string) => {
    setUserCurrencyState(currency);
    CurrencyService.setUserCurrency(currency);
  };

  // Convert USD to local currency
  const convertUSDToLocal = async (usdAmount: number, currency?: string): Promise<CurrencyConversion> => {
    const targetCurrency = currency || userCurrency;
    return await CurrencyService.convertUSDToLocal(usdAmount, targetCurrency);
  };

  // Format price
  const formatPrice = (amount: number, currency?: string): string => {
    const targetCurrency = currency || userCurrency;
    return CurrencyService.formatPrice(amount, targetCurrency);
  };

  // Initialize on mount
  useEffect(() => {
    const initializeCurrency = async () => {
      // Get stored currency preference
      const storedCurrency = localStorage.getItem('user_currency');
      if (storedCurrency) {
        setUserCurrencyState(storedCurrency);
      }

      // Load exchange rates
      await loadExchangeRates();

      // Get user location if no stored preference
      if (!storedCurrency) {
        await getUserLocation();
      }
    };

    initializeCurrency();
  }, []);

  const value: CurrencyContextType = {
    userCurrency,
    setUserCurrency,
    exchangeRates,
    loading,
    convertUSDToLocal,
    formatPrice,
    getUserLocation,
    userLocation
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}; 