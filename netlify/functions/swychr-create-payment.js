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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
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
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          required: ['country_code', 'name', 'email', 'amount', 'transaction_id', 'pass_digital_charge']
        }),
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

    if (!swychrEmail || !swychrPassword) {
      console.error('Swychr credentials not configured');
      
      // Test mode: return a mock response when credentials are not configured
      if (process.env.NODE_ENV === 'development' || process.env.TEST_MODE === 'true') {
        console.log('Running in test mode - returning mock response');
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
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
      
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Payment gateway not configured' }),
      };
    }

    // First authenticate with Swychr
    console.log('Attempting Swychr authentication...');
    const authResponse = await fetch(`${swychrBaseURL}/admin/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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

    if (authData.status !== 200) {
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
    const paymentResponse = await fetch(`${swychrBaseURL}/create_payment_links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        country_code,
        name,
        email,
        mobile,
        amount: Math.round(amount * 100), // Convert to cents
        transaction_id,
        description: description || `Payment for ${name}`,
        pass_digital_charge,
      }),
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

    if (paymentData.status !== 200) {
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
      body: JSON.stringify({
        success: true,
        data: paymentData.data,
        message: 'Payment link created successfully',
      }),
    };

  } catch (error) {
    console.error('Swychr create payment error:', error);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to create payment link',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
    };
  }
};
