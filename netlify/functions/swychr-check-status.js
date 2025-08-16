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
    const { transaction_id } = JSON.parse(event.body);

    if (!transaction_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Transaction ID is required' }),
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

    // First authenticate with Swychr
    const authResponse = await fetch(`${swychrBaseURL}/admin/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: swychrEmail,
        password: swychrPassword,
      }),
    });

    if (!authResponse.ok) {
      throw new Error(`Swychr authentication failed: ${authResponse.status}`);
    }

    const authData = await authResponse.json();

    if (authData.status !== 200) {
      throw new Error(authData.message || 'Swychr authentication failed');
    }

    const authToken = authData.data.token;

    // Check payment status
    const statusResponse = await fetch(`${swychrBaseURL}/payment_link_status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ transaction_id }),
    });

    if (!statusResponse.ok) {
      throw new Error(`Failed to check payment status: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();

    if (statusData.status !== 200) {
      throw new Error(statusData.message || 'Failed to check payment status');
    }

    // Return the payment status data
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        data: statusData.data,
        message: 'Payment status retrieved successfully',
      }),
    };

  } catch (error) {
    console.error('Swychr check status error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to check payment status',
        message: error.message,
      }),
    };
  }
};
