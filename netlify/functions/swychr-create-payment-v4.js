const fetch = require('node-fetch');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// Helper to ensure URL doesn't have trailing slash
const cleanUrl = (url) => url.replace(/\/$/, '');

exports.handler = async (event, context) => {
  const FUNCTION_VERSION = 'v4.5';

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
    const swychrBaseURL = cleanUrl(process.env.SWYCHR_BASE_URL || 'https://api.accountpe.com/api/payin');

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
    console.log('Auth URL:', `${swychrBaseURL}/admin/auth`);
    
    let authResponse;
    try {
      authResponse = await fetch(`${swychrBaseURL}/admin/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: swychrEmail,
          password: swychrPassword
        })
      });

      console.log('Auth response status:', authResponse.status);
      console.log('Auth response headers:', Object.fromEntries(authResponse.headers.entries()));
      
      const authResponseText = await authResponse.text();
      console.log('Raw auth response:', authResponseText);
      
      try {
        const authData = JSON.parse(authResponseText);
        console.log('Parsed auth response:', {
          token: authData.token ? 'present' : 'missing',
          message: authData.message
        });

        // Check for auth token instead of status
        if (!authResponse.ok || !authData.token) {
          return {
            statusCode: authResponse.ok ? 400 : authResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 1,
              message: authData.message || 'Authentication failed',
              data: null
            })
          };
        }

        // Step 2: Create Payment Link
        console.log('Creating payment link...');
        console.log('Payment URL:', `${swychrBaseURL}/create_payment_links`);
        
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
        
        const paymentResponse = await fetch(`${swychrBaseURL}/create_payment_links`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${authData.token}`
          },
          body: JSON.stringify(paymentPayload)
        });

        console.log('Payment response status:', paymentResponse.status);
        console.log('Payment response headers:', Object.fromEntries(paymentResponse.headers.entries()));
        
        const paymentResponseText = await paymentResponse.text();
        console.log('Raw payment response:', paymentResponseText);
        
        try {
          const paymentData = JSON.parse(paymentResponseText);
          console.log('Parsed payment response:', {
            status: paymentData.status,
            message: paymentData.message,
            data: paymentData.data ? 'present' : 'missing'
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

          if (!paymentResponse.ok || !paymentData.data) {
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

          // Success response
          return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 0,
              message: 'Payment link created successfully',
              data: paymentData.data
            })
          };
          
        } catch (e) {
          console.error('Failed to parse payment response:', e);
          return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 1,
              message: 'Invalid payment gateway response',
              data: null
            })
          };
        }
        
      } catch (e) {
        console.error('Failed to parse auth response:', e);
        return {
          statusCode: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 1,
            message: 'Invalid authentication response format',
            data: null
          })
        };
      }
      
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