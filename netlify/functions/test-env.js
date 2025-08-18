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

  try {
    // Get all environment variables
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      TEST_MODE: process.env.TEST_MODE,
      SWYCHR_EMAIL: process.env.SWYCHR_EMAIL ? 'SET' : 'NOT_SET',
      SWYCHR_PASSWORD: process.env.SWYCHR_PASSWORD ? 'SET' : 'NOT_SET',
      SWYCHR_BASE_URL: process.env.SWYCHR_BASE_URL,
      // Add a few more to check
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT_SET',
      PORT: process.env.PORT
    };

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Environment variables check',
        environment_variables: envVars,
        timestamp: new Date().toISOString(),
        function_name: 'test-env'
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Failed to check environment variables',
        message: error.message
      })
    };
  }
};
