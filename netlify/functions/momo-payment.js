const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// MTN MoMo API Base URLs
const SANDBOX_URL = 'https://sandbox.momodeveloper.mtn.com';
const PRODUCTION_URL = 'https://momodeveloper.mtn.com';

// Helper to get API URL based on environment
const getApiUrl = () => {
  return process.env.MTN_MOMO_ENVIRONMENT === 'production' ? PRODUCTION_URL : SANDBOX_URL;
};

// Helper to generate UUID for X-Reference-Id
const generateTransactionId = () => uuidv4();

// Helper to get API user and token
async function getApiUserAndToken() {
  const apiUrl = getApiUrl();
  const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
  const userId = process.env.MTN_MOMO_USER_ID;
  const apiKey = process.env.MTN_MOMO_API_KEY;

  if (!subscriptionKey || !userId || !apiKey) {
    throw new Error('MTN MoMo API credentials not configured');
  }

  // Get API token
  const tokenResponse = await fetch(`${apiUrl}/collection/token/`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${userId}:${apiKey}`).toString('base64')}`,
      'Ocp-Apim-Subscription-Key': subscriptionKey
    }
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to get API token');
  }

  const { access_token } = await tokenResponse.json();
  return { userId, token: access_token };
}

// Helper to initiate payment request
async function initiatePayment(token, paymentData) {
  const apiUrl = getApiUrl();
  const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
  const referenceId = generateTransactionId();

  const response = await fetch(`${apiUrl}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Reference-Id': referenceId,
      'X-Target-Environment': process.env.MTN_MOMO_ENVIRONMENT,
      'Ocp-Apim-Subscription-Key': subscriptionKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: paymentData.amount,
      currency: paymentData.currency || 'EUR',
      externalId: paymentData.transaction_id,
      payer: {
        partyIdType: 'MSISDN',
        partyId: paymentData.phone_number
      },
      payerMessage: paymentData.description || 'Payment for DigiNum',
      payeeNote: 'Payment for DigiNum services'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Payment request failed: ${response.status} - ${errorText}`);
  }

  return referenceId;
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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
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
    console.log('=== MTN MOMO PAYMENT FUNCTION START ===');
    
    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
      console.log('Payment request:', {
        ...requestBody,
        phone_number: '***'
      });
    } catch (e) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          status: 1,
          message: 'Invalid request body',
          data: null
        })
      };
    }

    // Validate required fields
    const { amount, phone_number, transaction_id } = requestBody;
    if (!amount || !phone_number || !transaction_id) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          status: 1,
          message: 'Missing required fields',
          data: {
            required: ['amount', 'phone_number', 'transaction_id'],
            received: {
              amount: !!amount,
              phone_number: !!phone_number,
              transaction_id: !!transaction_id
            }
          }
        })
      };
    }

    // Get API credentials and token
    const { token } = await getApiUserAndToken();

    // Initiate payment
    const referenceId = await initiatePayment(token, requestBody);

    // Return success response
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 0,
        message: 'Payment request initiated',
        data: {
          reference_id: referenceId,
          transaction_id: transaction_id
        }
      })
    };

  } catch (error) {
    console.error('Payment error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 1,
        message: error.message || 'Payment request failed',
        data: null
      })
    };
  }
};
