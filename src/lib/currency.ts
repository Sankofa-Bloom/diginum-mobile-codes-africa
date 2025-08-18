import { supabase } from '@/lib/supabaseClient';
import apiClient from '@/lib/apiClient';

export interface ExchangeRate {
  currency: string;
  rate: number;
  vat: number;
  updated_at: string;
}

export interface CurrencyConversion {
  originalAmount: number; // USD amount
  convertedAmount: number; // Local currency amount
  currency: string;
  rate: number;
  fxBuffer: number;
  finalAmount: number; // Amount with FX buffer
}

export interface UserLocation {
  country: string;
  currency: string;
  ip: string;
}

export class CurrencyService {
  private static readonly FX_BUFFER = 0.025; // 2.5% buffer for FX volatility
  private static readonly FIXER_API_KEY = process.env.VITE_FIXER_API_KEY || 'YOUR_FIXER_API_KEY'; // Replace with actual Fixer API key
  private static readonly FIXER_API_URL = 'https://api.fixer.io/v1/latest?base=USD';
  private static readonly CURRENCY_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD'; // Fallback

  // Get user's location and currency based on IP
  static async getUserLocation(): Promise<UserLocation> {
    try {
      // First try to get from IP geolocation
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      return {
        country: data.country_name || 'United States',
        currency: data.currency || 'USD',
        ip: data.ip || 'unknown'
      };
    } catch (error) {
      console.error('Error getting user location:', error);
      // Fallback to USD
      return {
        country: 'United States',
        currency: 'USD',
        ip: 'unknown'
      };
    }
  }

  // Fetch live exchange rates from Fixer API (primary)
  static async fetchLiveRates(): Promise<Record<string, number>> {
    try {
      // Try Fixer API first
      if (this.FIXER_API_KEY && this.FIXER_API_KEY !== 'YOUR_FIXER_API_KEY') {
        const fixerUrl = `${this.FIXER_API_URL}&access_key=${this.FIXER_API_KEY}`;
        const response = await fetch(fixerUrl);
        const data = await response.json();
        
        if (data.success && data.rates) {
          console.log('Successfully fetched rates from Fixer API');
          return data.rates;
        }
      }
      
      // Fallback to exchange rate API
      const response = await fetch(this.CURRENCY_API_URL);
      const data = await response.json();
      return data.rates || {};
    } catch (error) {
      console.error('Error fetching live rates:', error);
      throw new Error('Failed to fetch live exchange rates');
    }
  }

  // Get exchange rates with smart caching and updates
  static async getExchangeRates(): Promise<ExchangeRate[]> {
    try {
      // First try to get from backend
      const response = await apiClient.get('/exchange-rates');
      const ratesData = response.rates || response;
      
      if (ratesData && ratesData.length > 0) {
        // Transform API response to match ExchangeRate interface
        const rates = ratesData.map((rate: any) => ({
          currency: rate.code || rate.currency,
          rate: rate.rate,
          vat: rate.vat || 0,
          updated_at: rate.updated_at || new Date().toISOString()
        }));
        
        console.log('Got exchange rates from backend');
        return rates;
      }
    } catch (error) {
      console.error('Error fetching from backend:', error);
    }

    // Try cached rates from local storage
    const cachedRates = this.getCachedRates();
    if (cachedRates && cachedRates.length > 0) {
      console.log('Using cached exchange rates');
      return cachedRates;
    }

    // Try to update rates (this will fetch from Fixer API)
    try {
      await this.updateExchangeRates();
      const updatedRates = this.getCachedRates();
      if (updatedRates) {
        return updatedRates;
      }
    } catch (error) {
      console.error('Error updating exchange rates:', error);
    }

    // Fallback to live API
    try {
      const liveRates = await this.fetchLiveRates();
      const rates: ExchangeRate[] = [
        { currency: 'USD', rate: 1.0, vat: 0, updated_at: new Date().toISOString() }
      ];

      // Convert live rates to our format
      for (const [currency, rate] of Object.entries(liveRates)) {
        if (currency !== 'USD') {
          rates.push({
            currency: currency.toUpperCase(),
            rate: rate as number,
            vat: this.getVATForCurrency(currency.toUpperCase()),
            updated_at: new Date().toISOString()
          });
        }
      }

      // Cache the rates
      localStorage.setItem('exchange_rates_cache', JSON.stringify(rates));
      localStorage.setItem('exchange_rates_last_update', Date.now().toString());

      return rates;
    } catch (error) {
      console.error('Error with live rates fallback:', error);
      // Final fallback to hardcoded rates
      return this.getFallbackRates();
    }
  }

  // Get VAT rate for a specific currency
  private static getVATForCurrency(currency: string): number {
    const vatRates: Record<string, number> = {
      'USD': 0,
      'EUR': 5.0,
      'GBP': 5.0,
      'JPY': 3.0,
      'CAD': 5.0,
      'AUD': 5.0,
      'CHF': 3.0,
      'CNY': 3.0,
      'INR': 5.0,
      'BRL': 5.0,
      'MXN': 5.0,
      'SGD': 3.0,
      'HKD': 3.0,
      'SEK': 5.0,
      'NOK': 5.0,
      'DKK': 5.0,
      'PLN': 5.0,
      'CZK': 5.0,
      'HUF': 5.0,
      'RUB': 5.0,
      'TRY': 5.0,
      'ZAR': 5.0,
      'KRW': 3.0,
      'THB': 3.0,
      'MYR': 3.0,
      'IDR': 3.0,
      'PHP': 3.0,
      'VND': 3.0,
      'NGN': 5.0,
      'EGP': 5.0,
      'KES': 5.0,
      'GHS': 5.0
    };

    return vatRates[currency] || 5.0; // Default to 5% VAT
  }

  // Fallback rates if all else fails
  private static getFallbackRates(): ExchangeRate[] {
    return [
      { currency: 'USD', rate: 1.00, vat: 0, updated_at: new Date().toISOString() },
      { currency: 'EUR', rate: 0.92, vat: 5.0, updated_at: new Date().toISOString() },
      { currency: 'GBP', rate: 0.79, vat: 5.0, updated_at: new Date().toISOString() },
      { currency: 'JPY', rate: 148.50, vat: 3.0, updated_at: new Date().toISOString() },
      { currency: 'CAD', rate: 1.35, vat: 5.0, updated_at: new Date().toISOString() },
      { currency: 'AUD', rate: 1.52, vat: 5.0, updated_at: new Date().toISOString() },
      { currency: 'CHF', rate: 0.88, vat: 3.0, updated_at: new Date().toISOString() },
      { currency: 'CNY', rate: 7.25, vat: 3.0, updated_at: new Date().toISOString() },
      { currency: 'INR', rate: 83.20, vat: 5.0, updated_at: new Date().toISOString() },
      { currency: 'BRL', rate: 4.95, vat: 5.0, updated_at: new Date().toISOString() },
      { currency: 'MXN', rate: 17.25, vat: 5.0, updated_at: new Date().toISOString() },
      { currency: 'SGD', rate: 1.34, vat: 3.0, updated_at: new Date().toISOString() },
      { currency: 'HKD', rate: 7.82, vat: 3.0, updated_at: new Date().toISOString() },
      { currency: 'NGN', rate: 920.00, vat: 5.0, updated_at: new Date().toISOString() },
      { currency: 'EGP', rate: 31.20, vat: 5.0, updated_at: new Date().toISOString() },
      { currency: 'KES', rate: 158.50, vat: 5.0, updated_at: new Date().toISOString() },
      { currency: 'GHS', rate: 12.45, vat: 5.0, updated_at: new Date().toISOString() }
    ];
  }

  // Convert USD amount to local currency with FX buffer
  static async convertUSDToLocal(
    usdAmount: number, 
    targetCurrency: string = 'USD'
  ): Promise<CurrencyConversion> {
    try {
      const rates = await this.getExchangeRates();
      const rate = rates.find(r => r.currency === targetCurrency);
      
      if (!rate) {
        throw new Error(`Exchange rate not found for ${targetCurrency}`);
      }

      // Convert USD to local currency
      const convertedAmount = usdAmount * rate.rate;
      
      // Apply FX buffer for volatility protection
      const fxBuffer = convertedAmount * this.FX_BUFFER;
      const finalAmount = convertedAmount + fxBuffer;

      return {
        originalAmount: usdAmount,
        convertedAmount: convertedAmount,
        currency: targetCurrency,
        rate: rate.rate,
        fxBuffer: fxBuffer,
        finalAmount: finalAmount
      };
    } catch (error) {
      console.error('Error converting USD to local currency:', error);
      throw error;
    }
  }

  // Convert local currency back to USD
  static async convertLocalToUSD(
    localAmount: number,
    sourceCurrency: string
  ): Promise<number> {
    try {
      const rates = await this.getExchangeRates();
      const rate = rates.find(r => r.currency === sourceCurrency);
      
      if (!rate) {
        throw new Error(`Exchange rate not found for ${sourceCurrency}`);
      }

      // Convert local currency to USD
      return localAmount / rate.rate;
    } catch (error) {
      console.error('Error converting local currency to USD:', error);
      throw error;
    }
  }

  // Format price with currency symbol
  static formatPrice(amount: number, currency: string = 'USD'): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  // Get currency symbol
  static getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CAD': 'C$',
      'AUD': 'A$',
      'CHF': 'CHF',
      'CNY': '¥',
      'INR': '₹',
      'BRL': 'R$',
      'MXN': '$',
      'SGD': 'S$',
      'HKD': 'HK$',
      'NGN': '₦',
      'EGP': 'E£',
      'KES': 'KSh',
      'GHS': 'GH₵'
    };

    return symbols[currency] || currency;
  }

  // Save exchange rates to database
  static async saveExchangeRates(rates: ExchangeRate[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('exchange_rates')
        .upsert(
          rates.map(rate => ({
            currency: rate.currency,
            rate: rate.rate,
            vat: rate.vat,
            updated_at: rate.updated_at
          })),
          { onConflict: 'currency' }
        );

      if (error) {
        console.error('Error saving exchange rates:', error);
        throw new Error(`Database error: ${error.message || 'Failed to save rates'}`);
      }
      
      console.log('Exchange rates saved to database');
    } catch (error) {
      console.error('Error saving exchange rates:', error);
      throw error;
    }
  }

  // Save payment transaction to database
  static async savePaymentTransaction(
    originalAmount: number,
    convertedAmount: number,
    currency: string,
    rate: number,
    fxBuffer: number,
    userId?: string
  ): Promise<void> {
    try {
      // Get current user if userId not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        currentUserId = user?.id;
      }

      const { error } = await supabase
        .from('payment_transactions')
        .insert([
          {
            user_id: currentUserId,
            original_amount_usd: originalAmount,
            converted_amount: convertedAmount,
            currency: currency,
            exchange_rate: rate,
            fx_buffer: fxBuffer
          }
        ]);

      if (error) {
        console.error('Error saving payment transaction:', error);
        throw new Error(`Database error: ${error.message || 'Failed to save transaction'}`);
      }
    } catch (error) {
      console.error('Error saving payment transaction:', error);
      throw error;
    }
  }

  // Get user's preferred currency (from IP or stored preference)
  static async getUserCurrency(): Promise<string> {
    try {
      // Check if user has stored preference
      const storedCurrency = localStorage.getItem('user_currency');
      if (storedCurrency) {
        return storedCurrency;
      }

      // Get from IP location
      const location = await this.getUserLocation();
      return location.currency;
    } catch (error) {
      console.error('Error getting user currency:', error);
      return 'USD';
    }
  }

  // Set user's preferred currency
  static setUserCurrency(currency: string): void {
    localStorage.setItem('user_currency', currency);
  }

  // Update exchange rates (should be called every 24 hours)
  static async updateExchangeRates(): Promise<void> {
    try {
      console.log('Updating exchange rates...');
      
      // Check if rates were updated recently (within 24 hours)
      const lastUpdate = localStorage.getItem('exchange_rates_last_update');
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      
      if (lastUpdate && (now - parseInt(lastUpdate)) < twentyFourHours) {
        console.log('Exchange rates are recent, skipping update');
        return;
      }
      
      // Fetch new rates
      const liveRates = await this.fetchLiveRates();
      const rates: ExchangeRate[] = [
        { currency: 'USD', rate: 1.0, vat: 0, updated_at: new Date().toISOString() }
      ];

      // Convert live rates to our format
      for (const [currency, rate] of Object.entries(liveRates)) {
        if (currency !== 'USD') {
          rates.push({
            currency: currency.toUpperCase(),
            rate: rate as number,
            vat: this.getVATForCurrency(currency.toUpperCase()),
            updated_at: new Date().toISOString()
          });
        }
      }

      // Save to database
      await this.saveExchangeRates(rates);
      
      // Update local storage timestamp
      localStorage.setItem('exchange_rates_last_update', now.toString());
      localStorage.setItem('exchange_rates_cache', JSON.stringify(rates));
      
      console.log('Exchange rates updated successfully');
    } catch (error) {
      console.error('Error updating exchange rates:', error);
      throw error;
    }
  }

  // Get cached exchange rates from local storage
  static getCachedRates(): ExchangeRate[] | null {
    try {
      const cached = localStorage.getItem('exchange_rates_cache');
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached rates:', error);
      return null;
    }
  }
}
