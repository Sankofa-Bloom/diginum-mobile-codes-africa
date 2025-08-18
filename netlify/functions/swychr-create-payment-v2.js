const fetch = require('node-fetch');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const {
      country_code,
      name,
      email,
      mobile,
      amount,
      transaction_id,
      description,
      pass_digital_charge
    } = JSON.parse(event.body);

    if (!country_code || !name || !email || !amount || !transaction_id || pass_digital_charge === undefined) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          required: ['country_code', 'name', 'email', 'amount', 'transaction_id', 'pass_digital_charge']
        }),
      };
    }

    const isTestMode = String(process.env.TEST_MODE || '').toLowerCase() === 'true';
    if (isTestMode) {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: {
            payment_url: 'https://example.com/test-payment',
            transaction_id,
            status: 'pending'
          },
          message: 'Test payment link created successfully (TEST_MODE)',
          test_mode: true
        })
      };
    }

    const swychrEmail = process.env.SWYCHR_EMAIL;
    const swychrPassword = process.env.SWYCHR_PASSWORD;
    const swychrBaseURL = process.env.SWYCHR_BASE_URL || 'https://api.accountpe.com/api/payin';

    if (!swychrEmail || !swychrPassword) {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: {
            payment_url: 'https://example.com/test-payment',
            transaction_id,
            status: 'pending'
          },
          message: 'Test payment link created successfully (credentials not configured)',
          test_mode: true
        }),
      };
    }

    const authResponse = await fetch(`${swychrBaseURL}/admin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: swychrEmail, password: swychrPassword }),
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      throw new Error(`Swychr authentication failed: ${authResponse.status} - ${errorText}`);
    }

    const authData = await authResponse.json();
    if (authData.status !== 0) {
      throw new Error(authData.message || 'Swychr authentication failed');
    }

    const authToken = authData.data?.token || authData.token;
    if (!authToken) {
      throw new Error('Authentication token not found in response');
    }

    const paymentPayload = {
      country_code,
      name,
      email,
      mobile: mobile || '',
      amount: Math.round(amount),
      transaction_id,
      description: description || `Payment for ${name}`,
      pass_digital_charge
    };

    const paymentResponse = await fetch(`${swychrBaseURL}/create_payment_links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(paymentPayload),
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      throw new Error(`Failed to create payment link: ${paymentResponse.status} - ${errorText}`);
    }

    const paymentData = await paymentResponse.json();
    if (paymentData.status !== 0) {
      throw new Error(paymentData.message || 'Failed to create payment link');
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, data: paymentData.data || {}, message: 'Payment link created successfully', swychr_response: paymentData })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to create payment link', message: error.message })
    };
  }
};
