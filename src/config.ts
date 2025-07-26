// API configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD ? 'https://diginum.vercel.app/api' : 'http://localhost:3000/api');

// Campay configuration
export const SMS_PROVIDER_BASE_URL = import.meta.env.VITE_SMS_PROVIDER_BASE_URL || 'https://sms-verification-number.com/stubs/handler_api';

// SMS Provider configuration
export const VITE_SMS_PROVIDER_API_KEY = import.meta.env.VITE_SMS_PROVIDER_API_KEY;
