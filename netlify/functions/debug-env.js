exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // Check MTN MoMo environment variables
  const momoEnvVars = {
    MTN_MOMO_API_KEY: process.env.MTN_MOMO_API_KEY ? 'SET' : 'MISSING',
    MTN_MOMO_API_SECRET: process.env.MTN_MOMO_API_SECRET ? 'SET' : 'MISSING',
    MTN_MOMO_USER_ID: process.env.MTN_MOMO_USER_ID ? 'SET' : 'MISSING',
    MTN_MOMO_SUBSCRIPTION_KEY: process.env.MTN_MOMO_SUBSCRIPTION_KEY ? 'SET' : 'MISSING',
    MTN_MOMO_ENVIRONMENT: process.env.MTN_MOMO_ENVIRONMENT ? 'SET' : 'MISSING',
    MTN_MOMO_CALLBACK_URL: process.env.MTN_MOMO_CALLBACK_URL ? 'SET' : 'MISSING'
  };

  // Also show first few characters to verify
  const momoEnvValues = {
    MTN_MOMO_API_KEY: process.env.MTN_MOMO_API_KEY ? process.env.MTN_MOMO_API_KEY.substring(0, 8) + '...' : 'undefined',
    MTN_MOMO_API_SECRET: process.env.MTN_MOMO_API_SECRET ? process.env.MTN_MOMO_API_SECRET.substring(0, 8) + '...' : 'undefined',
    MTN_MOMO_USER_ID: process.env.MTN_MOMO_USER_ID ? process.env.MTN_MOMO_USER_ID.substring(0, 8) + '...' : 'undefined',
    MTN_MOMO_SUBSCRIPTION_KEY: process.env.MTN_MOMO_SUBSCRIPTION_KEY ? process.env.MTN_MOMO_SUBSCRIPTION_KEY.substring(0, 8) + '...' : 'undefined',
    MTN_MOMO_ENVIRONMENT: process.env.MTN_MOMO_ENVIRONMENT || 'undefined',
    MTN_MOMO_CALLBACK_URL: process.env.MTN_MOMO_CALLBACK_URL || 'undefined'
  };

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      message: 'Environment Variables Debug',
      variables_status: momoEnvVars,
      variables_preview: momoEnvValues,
      node_env: process.env.NODE_ENV || 'undefined'
    }, null, 2)
  };
};
