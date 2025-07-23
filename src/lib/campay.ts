import axios from 'axios';
import { 
  VITE_CAMPAY_APP_ID, 
  VITE_CAMPAY_USERNAME, 
  VITE_CAMPAY_PASSWORD, 
  VITE_CAMPAY_ACCESS_TOKEN, 
  VITE_CAMPAY_WEBHOOK_KEY 
} from '@/config';

const CAMPAY_API_URL = 'https://api.campay.net/v1';

interface CampayAuth {
  appId: string;
  username: string;
  password: string;
  accessToken: string;
  webhookKey: string;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  phoneNumber: string;
  reference: string;
  description: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  message: string;
}

export interface WebhookNotification {
  transactionId: string;
  status: string;
  amount: number;
  currency: string;
  phoneNumber: string;
  reference: string;
  timestamp: string;
}

const getAuthConfig = (): CampayAuth => ({
  appId: VITE_CAMPAY_APP_ID,
  username: VITE_CAMPAY_USERNAME,
  password: VITE_CAMPAY_PASSWORD,
  accessToken: VITE_CAMPAY_ACCESS_TOKEN,
  webhookKey: VITE_CAMPAY_WEBHOOK_KEY
});

const getHeaders = () => ({
  'Authorization': `Bearer ${getAuthConfig().accessToken}`,
  'Content-Type': 'application/json',
  'X-App-Id': getAuthConfig().appId,
  'X-Webhook-Key': getAuthConfig().webhookKey
});

export const createPayment = async (request: PaymentRequest): Promise<PaymentResponse> => {
  try {
    const response = await axios.post(
      `${CAMPAY_API_URL}/payments/initiate`,
      request,
      { headers: getHeaders() }
    );

    return {
      success: true,
      transactionId: response.data.transactionId,
      message: 'Payment initiated successfully',
    };
  } catch (error) {
    console.error('Campay payment error:', error);
    throw new Error('Failed to initiate payment');
  }
};

export const verifyPayment = async (transactionId: string): Promise<boolean> => {
  try {
    const response = await axios.get(
      `${CAMPAY_API_URL}/payments/verify/${transactionId}`,
      { headers: getHeaders() }
    );

    return response.data.status === 'completed';
  } catch (error) {
    console.error('Campay verification error:', error);
    throw new Error('Failed to verify payment');
  }
};
