// DigiNum Frontend Configuration
// Only safe, public configurations that can be exposed to the browser

// API configuration - Use direct Netlify Functions URL for production
// Check for production domain to ensure correct API endpoint
const isProduction = import.meta.env.PROD || window.location.origin.includes('netlify.app');
export const API_BASE_URL = isProduction ? '/.netlify/functions/api' : 
  (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api');

// Debug logging for API URL determination (remove in production)
if (import.meta.env.DEV) {
  console.log('Config Debug:', {
    'import.meta.env.PROD': import.meta.env.PROD,
    'window.location.origin': window.location.origin,
    isProduction,
    'VITE_API_BASE_URL': import.meta.env.VITE_API_BASE_URL,
    'Final API_BASE_URL': API_BASE_URL
  });
}

// Supabase configuration (public keys only)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Stripe configuration (public key only)
export const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

// Note: All sensitive credentials are handled by the backend API
// Do not expose any secret keys, service role keys, or API secrets here
