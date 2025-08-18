const fetch = require('node-fetch');

// Helper function to send CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

exports.handler = async (event, context) => {
  const FUNCTION_VERSION = 'v4';
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'X-Function-Version': FUNCTION_VERSION },
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'X-Function-Version': FUNCTION_VERSION },
      body: JSON.stringify({ functionVersion: FUNCTION_VERSION, error: 'Method not allowed' }),
    };
  }

  try {
    console.log('=== SWYCHR CREATE PAYMENT FUNCTION START ===');
    console.log('Environment variables:', {
      NODE_ENV: process.env.NODE_ENV,
      TEST_MODE: process.env.TEST_MODE,
      SWYCHR_EMAIL: process.env.SWYCHR_EMAIL ? 'SET' : 'NOT_SET',
      SWYCHR_PASSWORD: process.env.SWYCHR_PASSWORD ? 'SET' : 'NOT_SET',
      SWYCHR_BASE_URL: process.env.SWYCHR_BASE_URL
    });
    
    console.log('Swychr create payment function called with body:', event.body);
    
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

    console.log('Parsed request data:', {
      country_code,
      name,
      email,
      mobile,
      amount,
      transaction_id,
      description,
      pass_digital_charge
    });

    // Validate required fields
    if (!country_code || !name || !email || !amount || !transaction_id || pass_digital_charge === undefined) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'X-Function-Version': FUNCTION_VERSION },
        body: JSON.stringify({ functionVersion: FUNCTION_VERSION, 
          error: 'Missing required fields',
          required: ['country_code', 'name', 'email', 'amount', 'transaction_id', 'pass_digital_charge']
        }),
      };
    }

    // Global TEST_MODE override: short-circuit to mock success when enabled
    const isTestMode = String(process.env.TEST_MODE || '').toLowerCase() === 'true';
    if (isTestMode) {
      console.log('TEST_MODE enabled - returning mock response');
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionVersion: FUNCTION_VERSION,
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

    // Get Swychr credentials from environment variables
    const swychrEmail = process.env.SWYCHR_EMAIL;
    const swychrPassword = process.env.SWYCHR_PASSWORD;
    const swychrBaseURL = process.env.SWYCHR_BASE_URL || 'https://api.accountpe.com/api/payin';

    console.log('Swychr configuration:', {
      email: swychrEmail ? '***' : 'NOT_SET',
      password: swychrPassword ? '***' : 'NOT_SET',
      baseURL: swychrBaseURL
    });

    // Check if credentials are configured
    if (!swychrEmail || !swychrPassword) {
      console.error('Swychr credentials not configured');
      
      // Run in test mode when credentials are not configured
      console.log('Running in test mode - returning mock response');
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionVersion: FUNCTION_VERSION,
          success: true,
          data: {
            payment_url: 'https://example.com/test-payment',
            transaction_id: transaction_id,
            status: 'pending'
          },
          message: 'Test payment link created successfully (credentials not configured)',
          test_mode: true
        }),
      };
    }

    // If we reach here, credentials are configured, proceed with real Swychr integration
    console.log('Attempting Swychr authentication...');
    const authResponse = await fetch(`${swychrBaseURL}/admin/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ functionVersion: FUNCTION_VERSION,
        email: swychrEmail,
        password: swychrPassword,
      }),
    });

    console.log('Auth response status:', authResponse.status);
    console.log('Auth response headers:', Object.fromEntries(authResponse.headers.entries()));

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('Auth response error:', errorText);
      throw new Error(`Swychr authentication failed: ${authResponse.status} - ${errorText}`);
    }

    const authData = await authResponse.json();
    console.log('Auth response data:', JSON.stringify(authData, null, 2));

    // According to API docs, success is indicated by status: 0, not 200
    if (authData.status !== 0) {
      throw new Error(authData.message || 'Swychr authentication failed');
    }

    // Safely extract token with fallback
    const authToken = authData.data?.token || authData.token;
    if (!authToken) {
      console.error('No auth token found in response:', authData);
      throw new Error('Authentication token not found in response');
    }

    console.log('Authentication successful, token obtained');

    // Create payment link
    console.log('Creating payment link...');
    
    // Prepare payment data according to API spec
    const paymentPayload = {
      country_code,
      name,
      email,
      mobile: mobile || '', // Optional field
      amount: Math.round(amount), // API expects integer units
      transaction_id,
      description: description || `Payment for ${name}`,
      pass_digital_charge
    };
    
    console.log('Payment payload:', paymentPayload);
    
    const paymentResponse = await fetch(`${swychrBaseURL}/create_payment_links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(paymentPayload),
    });

    console.log('Payment response status:', paymentResponse.status);
    console.log('Payment response headers:', Object.fromEntries(paymentResponse.headers.entries()));

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error('Payment response error:', errorText);
      throw new Error(`Failed to create payment link: ${paymentResponse.status} - ${errorText}`);
    }

    const paymentData = await paymentResponse.json();
    console.log('Payment response data:', JSON.stringify(paymentData, null, 2));

    // According to API docs, success is indicated by status: 0, not 200
    if (paymentData.status !== 0) {
      throw new Error(paymentData.message || 'Failed to create payment link');
    }

    console.log('Payment link created successfully');

    // Return the payment link data
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ functionVersion: FUNCTION_VERSION,
        success: true,
        data: paymentData.data || {},
        message: 'Payment link created successfully',
        swychr_response: paymentData
      }),
    };

  } catch (error) {
    console.error('Swychr create payment error:', error);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ functionVersion: FUNCTION_VERSION,
        error: 'Failed to create payment link',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
    };
  }
};
