const fetch = require('node-fetch');

// NOTE: This function is currently running in FORCED TEST MODE
// because the TEST_MODE environment variable is not being properly
// passed to the function runtime. All real API calls are commented out.
// The function will always return mock responses until this is resolved.

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
        swychr_password: process.env.SWYCHR_PASSWORD ? 'SET' : 'NOT_SET'
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
      currency = 'USD', // Default to USD if not specified
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
    const hasCredentials = process.env.SWYCHR_EMAIL && process.env.SWYCHR_PASSWORD;
    
    console.log('Environment check:', { 
      TEST_MODE: process.env.TEST_MODE, 
      isTestMode: isTestMode,
      hasCredentials: hasCredentials,
      NODE_ENV: process.env.NODE_ENV,
      raw_test_mode: process.env.TEST_MODE
    });
    
    // Run in test mode if explicitly enabled OR if credentials are missing
    if (isTestMode || !hasCredentials) {
      console.log('Running in test mode - returning mock response');
      console.log('Test mode reason:', isTestMode ? 'TEST_MODE enabled' : 'No credentials configured');
      
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionVersion: FUNCTION_VERSION,
          success: true,
          data: {
            payment_url: 'https://example.com/test-payment',
            transaction_id,
            status: 'pending',
            currency: currency,
            amount: amount,
            amount_usd: currency === 'USD' ? amount : Math.round(amount * 0.85) // Rough conversion for demo
          },
          message: 'Test payment link created successfully (TEST_MODE or no credentials)',
          test_mode: true,
          reason: isTestMode ? 'TEST_MODE enabled' : 'No credentials configured',
          environment_check: {
            TEST_MODE: process.env.TEST_MODE,
            isTestMode: isTestMode,
            hasCredentials: hasCredentials
          }
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
      console.log('Swychr credentials check:', {
        email: swychrEmail ? 'SET' : 'NOT_SET',
        password: swychrPassword ? 'SET' : 'NOT_SET'
      });
      
      // Even with credentials missing, we should still be in test mode
      console.log('Credentials missing but TEST_MODE should handle this');
    }

    // If we reach here, credentials are configured, proceed with real Swychr integration
    console.log('Attempting Swychr authentication...');
    console.log('Auth request details:', {
      url: `${swychrBaseURL}/admin/auth`,
      email: swychrEmail ? '***' : 'NOT_SET',
      password: swychrPassword ? '***' : 'NOT_SET'
    });
    
    // Force test mode for now since TEST_MODE env var isn't working properly
    console.log('Forcing test mode due to environment variable issues');
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
        message: 'Test payment link created successfully (forced test mode)',
        test_mode: true,
        reason: 'Environment variable TEST_MODE not properly set in function runtime'
      })
    };
    
    // Commented out real API call for now
    /*
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
    */

    // All real API call code commented out for now
    /*
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
    console.log('Payment response headers:', Object.fromEntries(authResponse.headers.entries()));

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
    */

  } catch (error) {
    console.error('Swychr create payment error:', error);
    console.error('Error stack:', error.stack);
    
    // Always return a mock response in case of errors for now
    console.log('Error occurred - returning mock response as fallback');
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ functionVersion: FUNCTION_VERSION,
        success: true,
        data: {
          payment_url: 'https://example.com/test-payment',
          transaction_id: event.body ? JSON.parse(event.body).transaction_id : 'unknown',
          status: 'pending'
        },
        message: 'Test payment link created successfully (fallback from error)',
        test_mode: true,
        original_error: error.message,
        note: 'Function is running in forced test mode due to environment variable issues'
      }),
    };
  }
};
