// DigiNum Frontend Configuration
// Only safe, public configurations that can be exposed to the browser

// API configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD ? '/.netlify/functions/api' : 'http://localhost:4000/api');

// Supabase configuration (public keys only)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Stripe configuration (public key only)
export const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

// Note: All sensitive credentials are handled by the backend API
// Do not expose any secret keys, service role keys, or API secrets here
