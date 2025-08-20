const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const { getAccessToken } = require('./momo-auth');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// Helper to format phone number
function formatPhoneNumber(phoneNumber) {
  // Remove any non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // If number starts with +, remove it
  const withoutPlus = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
  
  // If number starts with 00, remove it
  const withoutPrefix = withoutPlus.startsWith('00') ? withoutPlus.slice(2) : withoutPlus;
  
  return withoutPrefix;
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
    const { amount, phone_number, transaction_id, currency = 'EUR' } = requestBody;
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

    // Get access token
    const { access_token } = await getAccessToken();

    // Generate reference ID for this payment
    const referenceId = uuidv4();

    // Prepare payment request
    const baseUrl = process.env.MTN_MOMO_ENVIRONMENT === 'production'
      ? 'https://momodeveloper.mtn.com'
      : 'https://sandbox.momodeveloper.mtn.com';

    const paymentResponse = await fetch(`${baseUrl}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': process.env.MTN_MOMO_ENVIRONMENT,
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': process.env.MTN_MOMO_SUBSCRIPTION_KEY
      },
      body: JSON.stringify({
        amount: amount.toString(),
        currency,
        externalId: transaction_id,
        payer: {
          partyIdType: 'MSISDN',
          partyId: formatPhoneNumber(phone_number)
        },
        payerMessage: requestBody.description || 'Payment for DigiNum services',
        payeeNote: 'Payment for DigiNum services'
      })
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error('Payment request failed:', {
        status: paymentResponse.status,
        error: errorText
      });

      return {
        statusCode: paymentResponse.status,
        headers: corsHeaders,
        body: JSON.stringify({
          status: 1,
          message: 'Failed to initiate payment',
          data: null
        })
      };
    }

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
        message: error.message || 'Failed to process payment',
        data: null
      })
    };
  }
};