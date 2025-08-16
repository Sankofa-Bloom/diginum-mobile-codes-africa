const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email and password are required' }),
      };
    }

    // Get Swychr credentials from environment variables
    const swychrEmail = process.env.SWYCHR_EMAIL;
    const swychrPassword = process.env.SWYCHR_PASSWORD;
    const swychrBaseURL = process.env.SWYCHR_BASE_URL || 'https://api.accountpe.com/api/payin';

    if (!swychrEmail || !swychrPassword) {
      console.error('Swychr credentials not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Payment gateway not configured' }),
      };
    }

    // Authenticate with Swychr
    const response = await fetch(`${swychrBaseURL}/admin/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: swychrEmail,
        password: swychrPassword,
      }),
    });

    if (!response.ok) {
      throw new Error(`Swychr authentication failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 200) {
      throw new Error(data.message || 'Swychr authentication failed');
    }

    // Return the auth token
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        token: data.data.token,
        message: 'Authentication successful',
      }),
    };

  } catch (error) {
    console.error('Swychr auth error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Authentication failed',
        message: error.message,
      }),
    };
  }
};
