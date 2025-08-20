const fetch = require('node-fetch');
const { getAccessToken } = require('./momo-auth');

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

    // Get access token
    const { access_token } = await getAccessToken();

    // Check payment status
    const baseUrl = process.env.MTN_MOMO_ENVIRONMENT === 'production'
      ? 'https://momodeveloper.mtn.com'
      : 'https://sandbox.momodeveloper.mtn.com';

    const statusResponse = await fetch(`${baseUrl}/collection/v1_0/requesttopay/${referenceId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'X-Target-Environment': process.env.MTN_MOMO_ENVIRONMENT,
        'Ocp-Apim-Subscription-Key': process.env.MTN_MOMO_SUBSCRIPTION_KEY
      }
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('Status check failed:', {
        status: statusResponse.status,
        error: errorText
      });

      return {
        statusCode: statusResponse.status,
        headers: corsHeaders,
        body: JSON.stringify({
          status: 1,
          message: 'Failed to check payment status',
          data: null
        })
      };
    }

    const statusData = await statusResponse.json();
    console.log('Payment status:', statusData);

    // Map MTN MoMo status to our status format
    const statusMap = {
      'SUCCESSFUL': 'SUCCESSFUL',
      'FAILED': 'FAILED',
      'PENDING': 'PENDING',
      'TIMEOUT': 'FAILED',
      'REJECTED': 'FAILED'
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 0,
        message: 'Payment status retrieved successfully',
        data: {
          reference_id: referenceId,
          status: statusMap[statusData.status] || statusData.status,
          amount: statusData.amount,
          currency: statusData.currency,
          payer: statusData.payer,
          payerMessage: statusData.payerMessage,
          payeeNote: statusData.payeeNote,
          externalId: statusData.externalId,
          reason: statusData.reason
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