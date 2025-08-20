const fetch = require('node-fetch');
const { getAccessToken } = require('./momo-auth');

exports.handler = async (event, context) => {
  try {
    console.log('=== MTN MOMO CALLBACK FUNCTION START ===');
    console.log('Callback headers:', event.headers);
    console.log('Callback body:', event.body);

    // Verify callback signature
    const signature = event.headers['x-reference-id'];
    if (!signature) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          status: 1,
          message: 'Missing callback signature',
          data: null
        })
      };
    }

    // Parse callback data
    let callbackData;
    try {
      callbackData = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          status: 1,
          message: 'Invalid callback data',
          data: null
        })
      };
    }

    // Get access token to verify payment status
    const { access_token } = await getAccessToken();

    // Check payment status
    const baseUrl = process.env.MTN_MOMO_ENVIRONMENT === 'production'
      ? 'https://momodeveloper.mtn.com'
      : 'https://sandbox.momodeveloper.mtn.com';

    const statusResponse = await fetch(`${baseUrl}/collection/v1_0/requesttopay/${signature}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'X-Target-Environment': process.env.MTN_MOMO_ENVIRONMENT,
        'Ocp-Apim-Subscription-Key': process.env.MTN_MOMO_SUBSCRIPTION_KEY
      }
    });

    if (!statusResponse.ok) {
      throw new Error('Failed to verify payment status');
    }

    const statusData = await statusResponse.json();
    console.log('Payment status:', statusData);

    // Handle payment status
    if (statusData.status === 'SUCCESSFUL') {
      // Update payment status in database
      try {
        const updateResponse = await fetch('/.netlify/functions/api/update-payment-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reference: statusData.externalId,
            status: 'completed',
            payment_data: {
              momo_reference: signature,
              amount: statusData.amount,
              currency: statusData.currency,
              payer: statusData.payer,
              status: statusData.status
            }
          })
        });

        if (!updateResponse.ok) {
          throw new Error('Failed to update payment status');
        }

        // Credit user balance
        const creditResponse = await fetch('/.netlify/functions/api/credit-balance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reference: statusData.externalId,
            amount: parseFloat(statusData.amount),
            currency: statusData.currency
          })
        });

        if (!creditResponse.ok) {
          throw new Error('Failed to credit user balance');
        }

      } catch (error) {
        console.error('Failed to process successful payment:', error);
        // Don't return error - we still want to acknowledge the callback
      }
    }

    // Always acknowledge callback
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 0,
        message: 'Callback processed successfully',
        data: {
          reference: signature,
          status: statusData.status
        }
      })
    };

  } catch (error) {
    console.error('Callback error:', error);
    
    // Always return 200 to acknowledge callback
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 1,
        message: 'Callback processed with errors',
        data: null
      })
    };
  }
};