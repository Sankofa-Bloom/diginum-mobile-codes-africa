const fetch = require('node-fetch');

// Helper to verify payment status
async function verifyPayment(referenceId) {
  const apiUrl = process.env.MTN_MOMO_ENVIRONMENT === 'production' 
    ? 'https://momodeveloper.mtn.com'
    : 'https://sandbox.momodeveloper.mtn.com';

  const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
  const userId = process.env.MTN_MOMO_USER_ID;
  const apiKey = process.env.MTN_MOMO_API_KEY;

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

  // Check payment status
  const statusResponse = await fetch(`${apiUrl}/collection/v1_0/requesttopay/${referenceId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'X-Target-Environment': process.env.MTN_MOMO_ENVIRONMENT,
      'Ocp-Apim-Subscription-Key': subscriptionKey
    }
  });

  if (!statusResponse.ok) {
    throw new Error('Failed to check payment status');
  }

  return await statusResponse.json();
}

exports.handler = async (event, context) => {
  try {
    console.log('=== MTN MOMO CALLBACK FUNCTION START ===');
    console.log('Callback data:', event.body);

    // Parse callback data
    const callbackData = JSON.parse(event.body);
    const { referenceId } = callbackData;

    if (!referenceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          status: 1,
          message: 'Missing reference ID',
          data: null
        })
      };
    }

    // Verify payment status
    const paymentStatus = await verifyPayment(referenceId);
    console.log('Payment status:', paymentStatus);

    // Update payment status in your database
    // TODO: Implement database update

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 0,
        message: 'Callback processed successfully',
        data: {
          reference_id: referenceId,
          status: paymentStatus.status
        }
      })
    };

  } catch (error) {
    console.error('Callback error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 1,
        message: error.message || 'Failed to process callback',
        data: null
      })
    };
  }
};
