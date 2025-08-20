const fetch = require('node-fetch');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

exports.handler = async (event, context) => {
  const FUNCTION_VERSION = 'v4.3';

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'X-Function-Version': FUNCTION_VERSION },
      body: ''
    };
  }

  // Allow GET requests for health check
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'X-Function-Version': FUNCTION_VERSION },
      body: JSON.stringify({ 
        status: 0,
        message: 'Service is healthy',
        data: {
          version: FUNCTION_VERSION,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'unknown'
        }
      })
    };
  }
  
  // Only allow POST requests for payment creation
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'X-Function-Version': FUNCTION_VERSION },
      body: JSON.stringify({
        status: 1,
        message: 'Method not allowed',
        data: null
      })
    };
  }

  try {
    console.log('=== SWYCHR CREATE PAYMENT FUNCTION START ===');
    console.log('Function version:', FUNCTION_VERSION);
    
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
      console.log('Parsed request data:', {
        ...requestBody,
        email: requestBody.email ? '***' : undefined,
        mobile: requestBody.mobile ? '***' : undefined
      });
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 1,
          message: 'Invalid request body format',
          data: null
        })
      };
    }

    const {
      country_code,
      name,
      email,
      mobile,
      amount,
      transaction_id,
      description,
      pass_digital_charge
    } = requestBody;

    // Validate required fields as per API spec
    if (!country_code || !name || !email || !amount || !transaction_id || pass_digital_charge === undefined) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 1,
          message: 'Missing required fields',
          data: {
            required: ['country_code', 'name', 'email', 'amount', 'transaction_id', 'pass_digital_charge'],
            received: {
              country_code: !!country_code,
              name: !!name,
              email: !!email,
              amount: !!amount,
              transaction_id: !!transaction_id,
              pass_digital_charge: pass_digital_charge !== undefined
            }
          }
        })
      };
    }

    // Get Swychr credentials
    const swychrEmail = process.env.SWYCHR_EMAIL;
    const swychrPassword = process.env.SWYCHR_PASSWORD;
    const swychrBaseURL = process.env.SWYCHR_BASE_URL || 'https://api.accountpe.com/api/payin';

    if (!swychrEmail || !swychrPassword) {
      console.error('Swychr credentials not configured');
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 1,
          message: 'Payment gateway configuration error',
          data: null
        })
      };
    }

    // Step 1: Authentication
    console.log('Attempting Swychr authentication...');
    let authResponse;
    try {
      authResponse = await fetch(`${swychrBaseURL}/admin/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: swychrEmail,
          password: swychrPassword
        })
      });
    } catch (e) {
      console.error('Network error during authentication:', e);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 1,
          message: 'Failed to connect to payment gateway',
          data: null
        })
      };
    }

    if (!authResponse.ok) {
      console.error('Auth failed:', authResponse.status);
      return {
        statusCode: authResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 1,
          message: 'Authentication failed',
          data: null
        })
      };
    }

    const authData = await authResponse.json();
    console.log('Auth response:', { status: authData.status, message: authData.message });

    if (authData.status !== 0) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 1,
          message: authData.message || 'Authentication failed',
          data: null
        })
      };
    }

    const authToken = authData.data?.token || authData.token;
    if (!authToken) {
      console.error('No auth token in response');
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 1,
          message: 'Invalid authentication response',
          data: null
        })
      };
    }

    // Step 2: Create Payment Link
    console.log('Creating payment link...');
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
    
    console.log('Payment payload:', {
      ...paymentPayload,
      email: '***',
      mobile: '***'
    });
    
    let paymentResponse;
    try {
      paymentResponse = await fetch(`${swychrBaseURL}/create_payment_links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(paymentPayload)
      });
    } catch (e) {
      console.error('Network error creating payment:', e);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 1,
          message: 'Failed to connect to payment gateway',
          data: null
        })
      };
    }

    const paymentData = await paymentResponse.json();
    console.log('Payment response:', {
      status: paymentData.status,
      message: paymentData.message
    });

    // Handle 404 for country not found as per API spec
    if (paymentResponse.status === 404) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 1,
          message: 'Country not found',
          data: null
        })
      };
    }

    if (!paymentResponse.ok || paymentData.status !== 0) {
      return {
        statusCode: paymentResponse.ok ? 400 : paymentResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 1,
          message: paymentData.message || 'Failed to create payment link',
          data: null
        })
      };
    }

    // Success response as per API spec
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 0,
        message: 'Payment link created successfully',
        data: paymentData.data || {}
      })
    };

  } catch (error) {
    console.error('Unexpected error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 1,
        message: 'An unexpected error occurred',
        data: null
      })
    };
  }
};