import { useState, useEffect } from 'react';
import { CurrencyService } from '@/lib/currency';

interface UseCurrencyResult {
  priceInUSD: number;
  loading: boolean;
  error: Error | null;
}

export function useCurrencyConversion(
  price: number,
  fromCurrency: string,
  service: string,
  country: string
): UseCurrencyResult {
  const [priceInUSD, setPriceInUSD] = useState<number>(price);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const convertPrice = async () => {
      try {
        setLoading(true);
        setError(null);

        // Convert to USD using exchange rate
        const usdPrice = await CurrencyService.convertPrice(price, fromCurrency);

        // Apply price adjustment
        const finalPrice = await CurrencyService.applyPriceAdjustment(
          usdPrice,
          service,
          country
        );

        setPriceInUSD(finalPrice);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to convert price'));
      } finally {
        setLoading(false);
      }
    };

    convertPrice();
  }, [price, fromCurrency, service, country]);

  return { priceInUSD, loading, error };
}
