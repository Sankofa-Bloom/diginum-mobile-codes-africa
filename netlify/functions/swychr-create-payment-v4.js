const fetch = require('node-fetch');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

exports.handler = async (event, context) => {
  const FUNCTION_VERSION = 'v4.2';
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
        functionVersion: FUNCTION_VERSION, 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown',
        test_mode: process.env.TEST_MODE || 'false',
        swychr_email: process.env.SWYCHR_EMAIL ? 'SET' : 'NOT_SET',
        swychr_password: process.env.SWYCHR_PASSWORD ? 'SET' : 'NOT_SET',
        swychr_base_url: process.env.SWYCHR_BASE_URL || 'default'
      }),
    };
  }
  
  // Only allow POST requests for payment creation
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'X-Function-Version': FUNCTION_VERSION },
      body: JSON.stringify({ functionVersion: FUNCTION_VERSION, error: 'Method not allowed' }),
    };
  }

  try {
    console.log('=== SWYCHR CREATE PAYMENT FUNCTION START ===');
    console.log('Function version:', FUNCTION_VERSION);
    console.log('Environment variables:', {
      NODE_ENV: process.env.NODE_ENV,
      TEST_MODE: process.env.TEST_MODE,
      SWYCHR_EMAIL: process.env.SWYCHR_EMAIL ? 'SET' : 'NOT_SET',
      SWYCHR_PASSWORD: process.env.SWYCHR_PASSWORD ? 'SET' : 'NOT_SET',
      SWYCHR_BASE_URL: process.env.SWYCHR_BASE_URL || 'default'
    });
    
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
      console.log('Parsed request data:', {
        ...requestBody,
        // Mask sensitive data
        email: requestBody.email ? '***' : undefined,
        mobile: requestBody.mobile ? '***' : undefined
      });
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'X-Function-Version': FUNCTION_VERSION },
        body: JSON.stringify({
          functionVersion: FUNCTION_VERSION,
          error: 'Invalid request body',
          message: 'Failed to parse JSON body'
        })
      };
    }

    const {
      country_code,
      name,
      email,
      mobile,
      amount,
      currency = 'USD',
      transaction_id,
      description,
      pass_digital_charge
    } = requestBody;

    // Validate required fields
    if (!country_code || !name || !email || !amount || !transaction_id || pass_digital_charge === undefined) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'X-Function-Version': FUNCTION_VERSION },
        body: JSON.stringify({ 
          functionVersion: FUNCTION_VERSION, 
          error: 'Missing required fields',
          required: ['country_code', 'name', 'email', 'amount', 'transaction_id', 'pass_digital_charge'],
          received: {
            country_code: !!country_code,
            name: !!name,
            email: !!email,
            amount: !!amount,
            transaction_id: !!transaction_id,
            pass_digital_charge: pass_digital_charge !== undefined
          }
        }),
      };
    }

    // Get Swychr credentials from environment variables
    const swychrEmail = process.env.SWYCHR_EMAIL;
    const swychrPassword = process.env.SWYCHR_PASSWORD;
    const swychrBaseURL = process.env.SWYCHR_BASE_URL || 'https://api.accountpe.com/api/payin';

    // Check if credentials are configured
    if (!swychrEmail || !swychrPassword) {
      console.error('Swychr credentials not configured');
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'X-Function-Version': FUNCTION_VERSION },
        body: JSON.stringify({
          functionVersion: FUNCTION_VERSION,
          error: 'Payment gateway configuration error',
          message: 'Payment gateway credentials not configured'
        })
      };
    }

    // Attempt authentication
    console.log('Attempting Swychr authentication...');
    let authResponse;
    try {
      authResponse = await fetch(`${swychrBaseURL}/admin/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: swychrEmail,
          password: swychrPassword,
        }),
      });
    } catch (e) {
      console.error('Network error during authentication:', e);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'X-Function-Version': FUNCTION_VERSION },
        body: JSON.stringify({
          functionVersion: FUNCTION_VERSION,
          error: 'Payment gateway connection error',
          message: 'Failed to connect to payment gateway'
        })
      };
    }

    console.log('Auth response status:', authResponse.status);
    
    let authResponseText;
    try {
      authResponseText = await authResponse.text();
      console.log('Raw auth response:', authResponseText);
    } catch (e) {
      console.error('Failed to read auth response:', e);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'X-Function-Version': FUNCTION_VERSION },
        body: JSON.stringify({
          functionVersion: FUNCTION_VERSION,
          error: 'Payment gateway response error',
          message: 'Invalid response from payment gateway'
        })
      };
    }

    let authData;
    try {
      authData = JSON.parse(authResponseText);
      console.log('Parsed auth response:', JSON.stringify(authData, null, 2));
    } catch (e) {
      console.error('Failed to parse auth response:', e);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'X-Function-Version': FUNCTION_VERSION },
        body: JSON.stringify({
          functionVersion: FUNCTION_VERSION,
          error: 'Payment gateway response error',
          message: 'Invalid JSON response from payment gateway',
          details: authResponseText
        })
      };
    }

    if (!authResponse.ok || authData.status !== 0) {
      console.error('Auth failed:', authData);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'X-Function-Version': FUNCTION_VERSION },
        body: JSON.stringify({
          functionVersion: FUNCTION_VERSION,
          error: 'Payment gateway authentication failed',
          message: authData.message || 'Authentication failed',
          details: {
            status: authResponse.status,
            gateway_status: authData.status,
            gateway_message: authData.message
          }
        })
      };
    }

    const authToken = authData.data?.token || authData.token;
    if (!authToken) {
      console.error('No auth token in response:', authData);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'X-Function-Version': FUNCTION_VERSION },
        body: JSON.stringify({
          functionVersion: FUNCTION_VERSION,
          error: 'Payment gateway authentication error',
          message: 'Authentication token not found in response'
        })
      };
    }

    console.log('Authentication successful, creating payment link...');
    
    // Prepare payment data
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
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(paymentPayload),
      });
    } catch (e) {
      console.error('Network error creating payment:', e);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'X-Function-Version': FUNCTION_VERSION },
        body: JSON.stringify({
          functionVersion: FUNCTION_VERSION,
          error: 'Payment gateway connection error',
          message: 'Failed to connect to payment gateway while creating payment'
        })
      };
    }

    console.log('Payment response status:', paymentResponse.status);
    
    let paymentResponseText;
    try {
      paymentResponseText = await paymentResponse.text();
      console.log('Raw payment response:', paymentResponseText);
    } catch (e) {
      console.error('Failed to read payment response:', e);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'X-Function-Version': FUNCTION_VERSION },
        body: JSON.stringify({
          functionVersion: FUNCTION_VERSION,
          error: 'Payment gateway response error',
          message: 'Invalid response while creating payment'
        })
      };
    }

    let paymentData;
    try {
      paymentData = JSON.parse(paymentResponseText);
      console.log('Parsed payment response:', JSON.stringify(paymentData, null, 2));
    } catch (e) {
      console.error('Failed to parse payment response:', e);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'X-Function-Version': FUNCTION_VERSION },
        body: JSON.stringify({
          functionVersion: FUNCTION_VERSION,
          error: 'Payment gateway response error',
          message: 'Invalid JSON response while creating payment',
          details: paymentResponseText
        })
      };
    }

    if (!paymentResponse.ok || paymentData.status !== 0) {
      console.error('Payment creation failed:', paymentData);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'X-Function-Version': FUNCTION_VERSION },
        body: JSON.stringify({
          functionVersion: FUNCTION_VERSION,
          error: 'Failed to create payment',
          message: paymentData.message || 'Payment creation failed',
          details: {
            status: paymentResponse.status,
            gateway_status: paymentData.status,
            gateway_message: paymentData.message
          }
        })
      };
    }

    console.log('Payment link created successfully');

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        functionVersion: FUNCTION_VERSION,
        success: true,
        data: paymentData.data || {},
        message: 'Payment link created successfully'
      }),
    };

  } catch (error) {
    console.error('Unexpected error:', error);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        functionVersion: FUNCTION_VERSION,
        error: 'Internal server error',
        message: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? {
          error: error.message,
          stack: error.stack
        } : undefined
      }),
    };
  }
};