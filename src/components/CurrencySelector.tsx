import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Globe, RefreshCw } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { CurrencyService } from '@/lib/currency';
import { toast } from 'sonner';

const CurrencySelector: React.FC = () => {
  const { userCurrency, setUserCurrency, exchangeRates, loading, getUserLocation, userLocation } = useCurrency();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const popularCurrencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵' }
  ];

  const handleCurrencyChange = (currency: string) => {
    setUserCurrency(currency);
    toast.success(`Currency changed to ${currency}`);
  };

  const handleRefreshLocation = async () => {
    setIsRefreshing(true);
    try {
      await getUserLocation();
      toast.success('Location refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh location');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getCurrencyName = (code: string) => {
    const currency = popularCurrencies.find(c => c.code === code);
    return currency ? `${currency.name} (${currency.symbol})` : code;
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      
      <Select value={userCurrency} onValueChange={handleCurrencyChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent>
          {popularCurrencies.map((currency) => (
            <SelectItem key={currency.code} value={currency.code}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{currency.symbol}</span>
                <span>{currency.name}</span>
                <span className="text-muted-foreground">({currency.code})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {userLocation && (
        <div className="text-xs text-muted-foreground">
          Detected: {userLocation.country}
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={handleRefreshLocation}
        disabled={isRefreshing}
        className="h-8 w-8 p-0"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
};

export default CurrencySelector; 