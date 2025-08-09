// DigiNum Frontend Configuration
// Only safe, public configurations that can be exposed to the browser

// API configuration - Force production URL for netlify.app domain
// This ensures we never use localhost in production, regardless of env vars
const getApiBaseUrl = () => {
  // Force production URL if we're on netlify.app domain
  if (typeof window !== 'undefined' && window.location.origin.includes('netlify.app')) {
    return '/.netlify/functions/api';
  }
  
  // Check if we're in production build
  if (import.meta.env.PROD) {
    return '/.netlify/functions/api';
  }
  
  // Development mode - use environment variable or localhost
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Debug logging for API URL determination
console.log('API Configuration:', {
  'import.meta.env.PROD': import.meta.env.PROD,
  'window.location.origin': typeof window !== 'undefined' ? window.location.origin : 'SSR',
  'VITE_API_BASE_URL': import.meta.env.VITE_API_BASE_URL,
  'Final API_BASE_URL': API_BASE_URL
});

// Supabase configuration (public keys only)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Stripe configuration (public key only)
export const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

// Note: All sensitive credentials are handled by the backend API
// Do not expose any secret keys, service role keys, or API secrets here
