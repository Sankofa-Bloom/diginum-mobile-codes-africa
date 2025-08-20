const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

// Helper to generate API key
async function generateApiKey() {
  const apiUser = process.env.MTN_MOMO_USER_ID;
  const apiKey = process.env.MTN_MOMO_API_KEY;
  const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
  const baseUrl = process.env.MTN_MOMO_ENVIRONMENT === 'production'
    ? 'https://momodeveloper.mtn.com'
    : 'https://sandbox.momodeveloper.mtn.com';

  // Generate UUID for API key
  const referenceId = uuidv4();

  // Create API user if not exists
  const createUserResponse = await fetch(`${baseUrl}/v1_0/apiuser`, {
    method: 'POST',
    headers: {
      'X-Reference-Id': referenceId,
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': subscriptionKey
    },
    body: JSON.stringify({ providerCallbackHost: process.env.FRONTEND_URL })
  });

  if (!createUserResponse.ok && createUserResponse.status !== 409) {
    throw new Error('Failed to create API user');
  }

  // Create API key
  const createKeyResponse = await fetch(`${baseUrl}/v1_0/apiuser/${apiUser}/apikey`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': subscriptionKey
    }
  });

  if (!createKeyResponse.ok) {
    throw new Error('Failed to create API key');
  }

  const { apiKey: newApiKey } = await createKeyResponse.json();
  return newApiKey;
}

// Helper to get access token
async function getAccessToken() {
  const apiUser = process.env.MTN_MOMO_USER_ID;
  const apiKey = process.env.MTN_MOMO_API_KEY;
  const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
  const baseUrl = process.env.MTN_MOMO_ENVIRONMENT === 'production'
    ? 'https://momodeveloper.mtn.com'
    : 'https://sandbox.momodeveloper.mtn.com';

  // Get access token
  const tokenResponse = await fetch(`${baseUrl}/collection/token/`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${apiUser}:${apiKey}`).toString('base64')}`,
      'Ocp-Apim-Subscription-Key': subscriptionKey
    }
  });

  if (!tokenResponse.ok) {
    // If unauthorized, try to generate new API key
    if (tokenResponse.status === 401) {
      const newApiKey = await generateApiKey();
      // Store new API key (you should implement secure storage)
      console.log('Generated new API key:', newApiKey);
      
      // Retry with new API key
      const retryResponse = await fetch(`${baseUrl}/collection/token/`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${apiUser}:${newApiKey}`).toString('base64')}`,
          'Ocp-Apim-Subscription-Key': subscriptionKey
        }
      });

      if (!retryResponse.ok) {
        throw new Error('Failed to get access token with new API key');
      }

      return retryResponse.json();
    }

    throw new Error('Failed to get access token');
  }

  return tokenResponse.json();
}

module.exports = {
  getAccessToken,
  generateApiKey
};
