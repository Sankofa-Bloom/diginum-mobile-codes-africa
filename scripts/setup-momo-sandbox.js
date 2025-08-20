const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const SANDBOX_URL = 'https://sandbox.momodeveloper.mtn.com';

async function setupMoMoSandbox() {
  try {
    console.log('🚀 Starting MTN MoMo Sandbox Setup...');

    // Check for subscription key
    const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
    if (!subscriptionKey) {
      throw new Error('Please set MTN_MOMO_SUBSCRIPTION_KEY in your environment variables');
    }

    // Generate reference ID (API User ID)
    const referenceId = uuidv4();
    console.log('\n📝 Generated Reference ID:', referenceId);

    // Create API User
    console.log('\n🔧 Creating API User...');
    const createUserResponse = await fetch(`${SANDBOX_URL}/v1_0/apiuser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Reference-Id': referenceId,
        'Ocp-Apim-Subscription-Key': subscriptionKey
      },
      body: JSON.stringify({
        providerCallbackHost: process.env.MTN_MOMO_CALLBACK_URL || 'https://diginum.netlify.app'
      })
    });

    if (!createUserResponse.ok && createUserResponse.status !== 409) {
      throw new Error(`Failed to create API user: ${createUserResponse.status} ${await createUserResponse.text()}`);
    }

    // Get API Key
    console.log('🔑 Getting API Key...');
    const apiKeyResponse = await fetch(`${SANDBOX_URL}/v1_0/apiuser/${referenceId}/apikey`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey
      }
    });

    if (!apiKeyResponse.ok) {
      throw new Error(`Failed to get API key: ${apiKeyResponse.status} ${await apiKeyResponse.text()}`);
    }

    const { apiKey } = await apiKeyResponse.json();
    console.log('✅ API Key received');

    // Create or update .env file
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = `# MTN MoMo Sandbox Configuration
MTN_MOMO_SUBSCRIPTION_KEY=${subscriptionKey}
MTN_MOMO_USER_ID=${referenceId}
MTN_MOMO_API_KEY=${apiKey}
MTN_MOMO_API_SECRET=${apiKey}
MTN_MOMO_ENVIRONMENT=sandbox
MTN_MOMO_CALLBACK_URL=${process.env.MTN_MOMO_CALLBACK_URL || 'https://diginum.netlify.app/.netlify/functions/momo-callback'}
`;

    await fs.writeFile(envPath, envContent);
    console.log('\n📄 Created .env file with credentials');

    // Create Netlify environment variables file
    const netlifyEnvPath = path.join(__dirname, '..', '.env.production');
    await fs.writeFile(netlifyEnvPath, envContent);
    console.log('📄 Created .env.production for Netlify deployment');

    console.log('\n✨ Setup Complete! Here are your credentials:');
    console.log('==========================================');
    console.log('Subscription Key:', subscriptionKey);
    console.log('API User ID:', referenceId);
    console.log('API Key:', apiKey);
    console.log('Environment: sandbox');
    console.log('==========================================');
    console.log('\n📝 Next steps:');
    console.log('1. Add these environment variables to your Netlify dashboard');
    console.log('2. Deploy your application');
    console.log('3. Test the integration with a sandbox transaction');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupMoMoSandbox();
