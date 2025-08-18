const fetch = require('node-fetch');

// Helper function to send CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    // Only allow POST requests for updates
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    // Check if we should update rates (every 24 hours)
    const lastUpdate = process.env.EXCHANGE_RATES_LAST_UPDATE;
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    if (lastUpdate && (now - parseInt(lastUpdate)) < twentyFourHours) {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Exchange rates are recent, no update needed',
          last_update: lastUpdate,
          next_update: new Date(parseInt(lastUpdate) + twentyFourHours).toISOString()
        })
      };
    }

    // Get Fixer API key from environment
    const fixerApiKey = process.env.FIXER_API_KEY;
    if (!fixerApiKey) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Fixer API key not configured'
        })
      };
    }

    // Fetch rates from Fixer API
    const fixerUrl = `https://api.fixer.io/v1/latest?base=USD&access_key=${fixerApiKey}`;
    const response = await fetch(fixerUrl);
    
    if (!response.ok) {
      throw new Error(`Fixer API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`Fixer API error: ${data.error?.info || 'Unknown error'}`);
    }

    // Transform rates to our format
    const rates = [
      { currency: 'USD', rate: 1.0, vat: 0, updated_at: new Date().toISOString() }
    ];

    // Add VAT rates for different currencies
    const vatRates = {
      'EUR': 5.0, 'GBP': 5.0, 'JPY': 3.0, 'CAD': 5.0, 'AUD': 5.0,
      'CHF': 3.0, 'CNY': 3.0, 'INR': 5.0, 'BRL': 5.0, 'MXN': 5.0,
      'SGD': 3.0, 'HKD': 3.0, 'NGN': 5.0, 'EGP': 5.0, 'KES': 5.0, 'GHS': 5.0,
      'XAF': 19.0 // Cameroon and Central African countries
    };

    for (const [currency, rate] of Object.entries(data.rates)) {
      if (currency !== 'USD') {
        rates.push({
          currency: currency.toUpperCase(),
          rate: rate,
          vat: vatRates[currency.toUpperCase()] || 5.0,
          updated_at: new Date().toISOString()
        });
      }
    }

    // Store rates in environment for next check
    process.env.EXCHANGE_RATES_LAST_UPDATE = now.toString();
    process.env.EXCHANGE_RATES_CACHE = JSON.stringify(rates);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Exchange rates updated successfully',
        rates: rates,
        updated_at: new Date().toISOString(),
        next_update: new Date(now + twentyFourHours).toISOString()
      })
    };

  } catch (error) {
    console.error('Exchange rates update error:', error);
    
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to update exchange rates',
        message: error.message
      })
    };
  }
};
