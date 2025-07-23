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

  static formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  }

  static async convertPrice(
    price: number
  ): Promise<number> {
    try {
      // Return price with markup for USD
      const rate = await this.getExchangeRate('USD');
      if (!rate) {
        throw new Error('Exchange rate not found for USD');
      }

      const finalPrice = price * (1 + rate.markup);

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

  static async convertCurrency(amount: number, isStripePayment = false): Promise<number> {
    try {
      // For Stripe payments, add processing fees
      if (isStripePayment) {
        // Stripe typically charges 2.9% + $0.30 per transaction
        const stripeFee = amount * 0.029 + 0.3;
        return amount + stripeFee;
      }

      // For non-Stripe payments, just return the amount
      return amount;
    } catch (error) {
      console.error('Error converting currency:', error);
      throw error;
    }
  }
}
