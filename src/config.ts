// Campay configuration
export const VITE_CAMPAY_APP_ID = import.meta.env.VITE_CAMPAY_APP_ID;
export const VITE_CAMPAY_USERNAME = import.meta.env.VITE_CAMPAY_USERNAME;
export const VITE_CAMPAY_PASSWORD = import.meta.env.VITE_CAMPAY_PASSWORD;
export const VITE_CAMPAY_ACCESS_TOKEN = import.meta.env.VITE_CAMPAY_ACCESS_TOKEN;
export const VITE_CAMPAY_WEBHOOK_KEY = import.meta.env.VITE_CAMPAY_WEBHOOK_KEY;

// SMS Provider configuration
export const VITE_SMS_PROVIDER_API_KEY = import.meta.env.VITE_SMS_PROVIDER_API_KEY;
export const VITE_SMS_PROVIDER_BASE_URL = import.meta.env.VITE_SMS_PROVIDER_BASE_URL || 'https://sms-verification-number.com/stubs/handler_api';
