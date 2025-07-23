import { supabase } from '@/lib/supabaseClient';

export interface ExchangeRate {
  id: string;
  currency: string;
  rate: number;
  markup: number;
  updatedAt: string;
}

export interface PriceAdjustment {
  id: string;
  service: string;
  country: string;
  markup: number;
  updatedAt: string;
}

export class CurrencyService {
  static async getExchangeRates(): Promise<ExchangeRate[]> {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .order('updatedAt', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async getExchangeRate(currency: string): Promise<ExchangeRate | null> {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('currency', currency)
      .order('updatedAt', { ascending: false })
      .single();
    
    if (error) throw error;
    return data;
  }

  static async updateExchangeRate(currency: string, rate: number, markup: number): Promise<void> {
    const { error } = await supabase
      .from('exchange_rates')
      .insert([
        {
          currency,
          rate,
          markup,
          updatedAt: new Date().toISOString(),
        }
      ]);
    
    if (error) throw error;
  }

  static async getPriceAdjustments(): Promise<PriceAdjustment[]> {
    const { data, error } = await supabase
      .from('price_adjustments')
      .select('*')
      .order('updatedAt', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async getPriceAdjustment(service: string, country: string): Promise<PriceAdjustment | null> {
    const { data, error } = await supabase
      .from('price_adjustments')
      .select('*')
      .eq('service', service)
      .eq('country', country)
      .order('updatedAt', { ascending: false })
      .single();
    
    if (error) throw error;
    return data;
  }

  static async updatePriceAdjustment(service: string, country: string, markup: number): Promise<void> {
    const { error } = await supabase
      .from('price_adjustments')
      .insert([
        {
          service,
          country,
          markup,
          updatedAt: new Date().toISOString(),
        }
      ]);
    
    if (error) throw error;
  }

  static formatPrice(price: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  }

  static async convertPrice(
    price: number,
    fromCurrency: string,
    toCurrency: string = 'USD'
  ): Promise<number> {
    try {
      // Get exchange rates for both currencies
      const fromRate = await this.getExchangeRate(fromCurrency);
      const toRate = await this.getExchangeRate(toCurrency);

      if (!fromRate || !toRate) {
        throw new Error(`Exchange rate not found for ${fromCurrency} or ${toCurrency}`);
      }

      // Convert price using exchange rates and markups
      const convertedPrice = (price / fromRate.rate) * toRate.rate;
      
      // Apply markup from both rates
      const finalPrice = convertedPrice * 
        (1 + fromRate.markup) * 
        (1 + toRate.markup);

      return parseFloat(finalPrice.toFixed(2));
    } catch (error) {
      console.error('Error converting price:', error);
      throw error;
    }
  }

  static async applyPriceAdjustment(
    price: number,
    service: string,
    country: string
  ): Promise<number> {
    try {
      const adjustment = await this.getPriceAdjustment(service, country);
      if (adjustment) {
        return price * (1 + adjustment.markup);
      }
      return price;
    } catch (error) {
      console.error('Error applying price adjustment:', error);
      throw error;
    }
  }

  static async convertCurrency(amount: number, fromCurrency: string, toCurrency: string, isStripePayment = false): Promise<number> {
    try {
      // For Stripe payments, always convert to USD first
      if (isStripePayment && fromCurrency !== 'USD') {
        const usdAmount = await this.convertPrice(amount, fromCurrency, 'USD');
        
        // For Stripe, we need to account for processing fees
        // Stripe typically charges 2.9% + $0.30 per transaction
        // We'll add this to the amount to ensure we cover fees
        const stripeFee = usdAmount * 0.029 + 0.3;
        const totalAmount = usdAmount + stripeFee;
        
        // If converting to another currency, convert from USD to target currency
        if (toCurrency !== 'USD') {
          const finalAmount = await this.convertPrice(totalAmount, 'USD', toCurrency);
          return finalAmount;
        }
        
        return totalAmount;
      }

      // For non-Stripe payments, use regular conversion
      const response = await this.convertPrice(amount, fromCurrency, toCurrency);
      return response;
    } catch (error) {
      console.error('Error converting currency:', error);
      throw error;
    }
  }
}
