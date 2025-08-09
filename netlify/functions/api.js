const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Helper function to send CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// Helper function to parse request body
const parseBody = (body, contentType) => {
  if (!body) return {};
  try {
    if (contentType && contentType.includes('application/json')) {
      return JSON.parse(body);
    }
    return body;
  } catch (error) {
    return {};
  }
};

// Exchange rates with VAT (current market rates as of August 2025)
const fallbackRates = [
  { code: 'USD', rate: 1.0, vat: 0.0 },
  { code: 'EUR', rate: 0.85, vat: 1.5 },
  { code: 'GBP', rate: 0.73, vat: 2.0 },
  { code: 'JPY', rate: 149.80, vat: 1.0 },
  { code: 'CAD', rate: 1.35, vat: 1.2 },
  { code: 'AUD', rate: 1.48, vat: 1.3 },
  { code: 'CHF', rate: 0.88, vat: 1.8 },
  { code: 'CNY', rate: 7.15, vat: 0.8 },
  { code: 'INR', rate: 83.25, vat: 2.5 },
  { code: 'BRL', rate: 5.45, vat: 3.5 },
  { code: 'MXN', rate: 17.85, vat: 2.8 },
  { code: 'SGD', rate: 1.32, vat: 1.1 },
  { code: 'HKD', rate: 7.82, vat: 0.9 },
  { code: 'SEK', rate: 10.45, vat: 2.2 },
  { code: 'NOK', rate: 10.85, vat: 2.4 },
  { code: 'DKK', rate: 6.34, vat: 2.1 },
  { code: 'PLN', rate: 3.98, vat: 2.7 },
  { code: 'CZK', rate: 22.15, vat: 2.3 },
  { code: 'HUF', rate: 365.80, vat: 2.9 },
  { code: 'RUB', rate: 92.50, vat: 4.0 },
  { code: 'TRY', rate: 34.15, vat: 5.2 },
  { code: 'ZAR', rate: 18.35, vat: 3.8 },
  { code: 'KRW', rate: 1342.00, vat: 1.4 },
  { code: 'THB', rate: 35.80, vat: 1.6 },
  { code: 'MYR', rate: 4.48, vat: 1.7 },
  { code: 'IDR', rate: 15485.00, vat: 2.1 },
  { code: 'PHP', rate: 56.25, vat: 2.4 },
  { code: 'NGN', rate: 1635.50, vat: 3.0 },
  { code: 'XAF', rate: 563.34, vat: 2.0 }
];

exports.handler = async (event, context) => {
  const { httpMethod, path, queryStringParameters, headers, body } = event;
  
  // Handle CORS preflight
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const requestBody = parseBody(body, headers['content-type']);
    // In Netlify Functions, path is like '/.netlify/functions/api/health'
    // We need to extract everything after the function name
    const pathAfterFunction = path.replace('/.netlify/functions/api', '') || '/';
    const pathParts = pathAfterFunction.startsWith('/') ? pathAfterFunction.substring(1).split('/') : pathAfterFunction.split('/');
    const endpoint = pathParts[0];

    console.log(`API Request: ${httpMethod} ${path}`, { pathAfterFunction, endpoint, pathParts });

    // Exchange rates endpoint
    if (endpoint === 'exchange-rates' && httpMethod === 'GET') {
      console.log('Using fallback exchange rates with VAT');
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates: fallbackRates })
      };
    }

    // Authentication endpoints
    if (pathParts[0] === 'auth') {
      const authEndpoint = pathParts[1];

      // Signup
      if (authEndpoint === 'signup' && httpMethod === 'POST') {
        const { email, password, firstName, lastName } = requestBody;

        if (!email || !password || !firstName || !lastName) {
          return {
            statusCode: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Missing required fields' })
          };
        }

        try {
          // Hash password
          const hashedPassword = await bcrypt.hash(password, 10);

          // Create user in Supabase
          const { data: user, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                first_name: firstName,
                last_name: lastName
              }
            }
          });

          if (signUpError) {
            return {
              statusCode: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              body: JSON.stringify({ error: signUpError.message })
            };
          }

          return {
            statusCode: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              message: 'User created successfully',
              user: { id: user.user?.id, email: user.user?.email }
            })
          };
        } catch (error) {
          console.error('Signup error:', error);
          return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal server error' })
          };
        }
      }

      // Login
      if (authEndpoint === 'login' && httpMethod === 'POST') {
        const { email, password } = requestBody;

        if (!email || !password) {
          return {
            statusCode: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Email and password are required' })
          };
        }

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (error) {
            return {
              statusCode: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              body: JSON.stringify({ error: error.message })
            };
          }

          return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user: data.user,
              session: data.session
            })
          };
        } catch (error) {
          console.error('Login error:', error);
          return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal server error' })
          };
        }
      }
    }

    // Health check - handle both empty path and /health
    if ((endpoint === 'health' || endpoint === '' || pathAfterFunction === '/') && httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ok', time: new Date().toISOString(), path: pathAfterFunction })
      };
    }

    // 404 for unhandled routes
    return {
      statusCode: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Route not found' })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message 
      })
    };
  }
};