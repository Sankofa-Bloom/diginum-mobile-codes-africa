const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { amount, currency, reference, description } = JSON.parse(event.body);

    if (!amount || !reference) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Amount and reference are required' })
      };
    }

    // Initialize Fapshi payment
    const fapshiResponse = await fetch(`${process.env.FAPSHI_BASE_URL}/payments/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FAPSHI_SECRET_KEY}`,
        'X-Public-Key': process.env.FAPSHI_PUBLIC_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to centimes
        currency: currency || 'USD',
        reference: reference,
        description: description || 'DigiNum Add Funds',
        callback_url: `${process.env.FRONTEND_URL}/.netlify/functions/fapshi-webhook`,
        return_url: `${process.env.FRONTEND_URL}/payment/success`
      }),
    });

    if (!fapshiResponse.ok) {
      const errorData = await fapshiResponse.json();
      throw new Error(errorData.message || 'Failed to initialize Fapshi payment');
    }

    const fapshiData = await fapshiResponse.json();

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        paymentUrl: fapshiData.data.payment_url,
        reference: reference,
        message: 'Payment initialized successfully'
      })
    };

  } catch (error) {
    console.error('Fapshi initialization error:', error);
    
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      })
    };
  }
};
