// src/lib/api.ts
// Centralized API functions for real backend integration

import { getCurrentUser } from '@/lib/auth';
import { SMSProvider, NumberRequest } from '@/lib/smsProvider';
import { supabase } from '@/lib/supabaseClient';

// Export the API object with all functions
export const api = {
  fetchDashboardOrders,
  fetchAdminTransactions,
  fetchBuyData,
  buyNumber,
  checkSMS
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
  const response = await fetch('/api/buy-data');
  if (!response.ok) {
    throw new Error('Failed to fetch buy data');
  }
  return response.json();
}

export async function buyNumber(country: string, service: string) {
  const user = await api.getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const response = await fetch('/api/buy-number', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(user?.access_token ? { Authorization: `Bearer ${user.access_token}` } : {})
    },
    body: JSON.stringify({ country, service })
  });

  if (!response.ok) {
    throw new Error('Failed to buy number');
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

// Admin API functions
export const fetchAdminDashboardStats = async () => {
  const response = await apiClient.get('/admin/dashboard-stats');
  return response;
};

export const fetchAdminSystemSettings = async () => {
  const response = await apiClient.get('/admin/system-settings');
  return response;
};

export const updateAdminSystemSettings = async (settings: {
  smsApiKey?: string;
  defaultMarkup?: number;
}) => {
  const response = await apiClient.post('/admin/system-settings', settings);
  return response;
};

export const updateExchangeRate = async (currency: string, data: {
  rate: number;
  markup?: number;
}) => {
  const response = await apiClient.put(`/admin/exchange-rates/${currency}`, data);
  return response;
};

export const updatePriceAdjustment = async (id: string, data: {
  markup: number;
}) => {
  const response = await apiClient.put(`/admin/price-adjustments/${id}`, data);
  return response;
};

export const fetchAdminRecentTransactions = async (limit: number = 50) => {
  const response = await apiClient.get(`/admin/recent-transactions?limit=${limit}`);
  return response;
};

export const fetchAdminExchangeRates = async () => {
  const response = await apiClient.get('/admin/exchange-rates');
  return response;
};

export const fetchAdminPriceAdjustments = async () => {
  const response = await apiClient.get('/admin/price-adjustments');
  return response;
};
