const fetch = require('node-fetch');

// Helper function to send CORS headers
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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { transaction_id } = JSON.parse(event.body);

    if (!transaction_id) {
      return {
        statusCode: 400,
        headers: corsHeaders,
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
        headers: corsHeaders,
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

    // According to API docs, success is indicated by status: 0, not 200
    if (authData.status !== 0) {
      throw new Error(authData.message || 'Swychr authentication failed');
    }

    const authToken = authData.data?.token || authData.token;

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

    // According to API docs, success is indicated by status: 0, not 200
    if (statusData.status !== 0) {
      throw new Error(statusData.message || 'Failed to check payment status');
    }

    // Return the payment status
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        data: statusData.data || {},
        message: 'Payment status retrieved successfully',
      }),
    };

  } catch (error) {
    console.error('Swychr check status error:', error);
    
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Failed to check payment status',
        message: error.message,
      }),
    };
  }
};
