const fetch = require('node-fetch');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// Helper to get API token
async function getApiToken() {
  const apiUrl = process.env.MTN_MOMO_ENVIRONMENT === 'production' 
    ? 'https://momodeveloper.mtn.com'
    : 'https://sandbox.momodeveloper.mtn.com';

  const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
  const userId = process.env.MTN_MOMO_USER_ID;
  const apiKey = process.env.MTN_MOMO_API_KEY;

  const response = await fetch(`${apiUrl}/collection/token/`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${userId}:${apiKey}`).toString('base64')}`,
      'Ocp-Apim-Subscription-Key': subscriptionKey
    }
  });

  if (!response.ok) {
    throw new Error('Failed to get API token');
  }

  const { access_token } = await response.json();
  return access_token;
}

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 1,
        message: 'Method not allowed',
        data: null
      })
    };
  }

  try {
    console.log('=== MTN MOMO STATUS CHECK FUNCTION START ===');

    // Get reference ID from query parameters
    const referenceId = event.queryStringParameters?.reference_id;
    if (!referenceId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          status: 1,
          message: 'Missing reference ID',
          data: null
        })
      };
    }

    // Get API token
    const token = await getApiToken();

    // Check payment status
    const apiUrl = process.env.MTN_MOMO_ENVIRONMENT === 'production' 
      ? 'https://momodeveloper.mtn.com'
      : 'https://sandbox.momodeveloper.mtn.com';

    const statusResponse = await fetch(`${apiUrl}/collection/v1_0/requesttopay/${referenceId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Target-Environment': process.env.MTN_MOMO_ENVIRONMENT,
        'Ocp-Apim-Subscription-Key': process.env.MTN_MOMO_SUBSCRIPTION_KEY
      }
    });

    if (!statusResponse.ok) {
      throw new Error('Failed to check payment status');
    }

    const paymentStatus = await statusResponse.json();
    console.log('Payment status:', paymentStatus);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 0,
        message: 'Payment status retrieved successfully',
        data: {
          reference_id: referenceId,
          status: paymentStatus.status,
          ...paymentStatus
        }
      })
    };

  } catch (error) {
    console.error('Status check error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 1,
        message: error.message || 'Failed to check payment status',
        data: null
      })
    };
  }
};
