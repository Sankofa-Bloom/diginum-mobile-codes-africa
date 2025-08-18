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
    // Get all relevant environment variables
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      TEST_MODE: process.env.TEST_MODE,
      SWYCHR_EMAIL: process.env.SWYCHR_EMAIL ? 'SET' : 'NOT_SET',
      SWYCHR_PASSWORD: process.env.SWYCHR_PASSWORD ? 'SET' : 'NOT_SET',
      SWYCHR_BASE_URL: process.env.SWYCHR_BASE_URL,
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT_SET',
      PORT: process.env.PORT,
      // Check if we can access the function context
      function_name: context.functionName,
      function_version: context.functionVersion,
      request_id: context.awsRequestId
    };

    // Test if we can make a simple fetch request
    let fetchTest = 'NOT_TESTED';
    try {
      const testResponse = await fetch('https://httpbin.org/get');
      fetchTest = testResponse.ok ? 'SUCCESS' : `FAILED: ${testResponse.status}`;
    } catch (fetchError) {
      fetchTest = `ERROR: ${fetchError.message}`;
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Deployment check completed',
        environment_variables: envVars,
        fetch_test: fetchTest,
        timestamp: new Date().toISOString(),
        function_name: 'deploy-check',
        deployment_status: 'OK'
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
        error: 'Failed to complete deployment check',
        message: error.message,
        stack: error.stack
      })
    };
  }
};
