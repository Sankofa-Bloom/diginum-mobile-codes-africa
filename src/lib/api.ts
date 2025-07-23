// src/lib/api.ts
// Centralized API functions for real backend integration

import { getCurrentUser } from '@/lib/auth';
import { SMSProvider, NumberRequest } from '@/lib/smsProvider';
import { supabase } from '@/lib/supabaseClient';

// Initialize SMS provider with config from environment
const smsProvider = new SMSProvider({
  apiKey: import.meta.env.VITE_SMS_PROVIDER_API_KEY,
  baseUrl: 'https://sms-verification-number.com/stubs/handler_api'
});

// Export the API object with all functions
export const api = {
  fetchDashboardOrders,
  fetchAdminTransactions,
  fetchBuyData,
  buyNumber,
  checkSMS,
  getPrices: async (service: string, country: string) => {
    return smsProvider.getPrices(service, country);
  },
  rentNumber: async (request: NumberRequest) => {
    return smsProvider.rentNumber(request);
  }
};

export async function fetchDashboardOrders() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    // Get orders from Supabase
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      throw new Error('Failed to fetch orders');
    }

    // Update status for active numbers
    const updatedOrders = await Promise.all(
      orders.map(async (order) => {
        if (order.status === 'active') {
          try {
            const status = await smsProvider.getNumberStatus(order.number_id);
            return { ...order, status: status.status };
          } catch (error) {
            console.error('Error checking number status:', error);
            return order;
          }
        }
        return order;
      })
    );

    return updatedOrders;
  } catch (error) {
    console.error('Error fetching dashboard orders:', error);
    throw new Error('Failed to fetch dashboard data');
  }
}

export async function fetchAdminTransactions() {
  const user = await getCurrentUser();
  const token = user?.access_token || user?.session?.access_token;
  const response = await fetch('/api/admin', {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error('Failed to fetch admin data');
  }
  return response.json();
}

export async function fetchBuyData() {
  try {
    // Get available services from SMS provider
    const services = await smsProvider.getServices();
    
    // Get countries and prices for each service
    const serviceData = await Promise.all(
      services.map(async (service) => {
        const countries = await smsProvider.getCountries(service);
        const countryData = await Promise.all(
          countries.map(async (country) => {
            const price = await smsProvider.getPrices(service, country);
            return {
              name: country,
              price,
              service,
            };
          })
        );
        return {
          name: service,
          countries: countryData,
        };
      })
    );

    return {
      services: serviceData,
    };
  } catch (error) {
    console.error('Error fetching buy data:', error);
    throw new Error('Failed to fetch countries/services');
  }
}

export async function buyNumber(country: string, service: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    // Rent number from SMS provider
    const numberRequest: NumberRequest = {
      service,
      country,
      duration: 30, // 30 minutes default duration
    };

    const numberResponse = await smsProvider.rentNumber(numberRequest);

    // Save order in Supabase
    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        number_id: numberResponse.id,
        phone_number: numberResponse.phoneNumber,
        country: numberResponse.country,
        service: numberResponse.service,
        price: numberResponse.price,
        status: 'active',
        expires_at: new Date(numberResponse.expiresAt),
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving order:', error);
      throw new Error('Failed to save order');
    }

    return {
      order: data,
      number: numberResponse,
    };
  } catch (error) {
    console.error('Error buying number:', error);
    throw new Error('Failed to complete purchase');
  }
}

export async function checkSMS(orderId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) {
      throw new Error('Order not found');
    }

    const sms = await smsProvider.checkSMS(order.number_id);
    if (sms) {
      // Update order with SMS code
      await supabase
        .from('orders')
        .update({ 
          sms_code: sms.code,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', orderId);
    }

    return sms;
  } catch (error) {
    console.error('Error checking SMS:', error);
    throw new Error('Failed to check SMS');
  }
}
