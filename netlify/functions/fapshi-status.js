exports.handler = async (event, context) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { reference } = event.queryStringParameters || {};

    if (!reference) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Reference is required' })
      };
    }

    // Check payment status with Fapshi
    const fapshiResponse = await fetch(`${process.env.FAPSHI_BASE_URL}/payments/status?reference=${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.FAPSHI_SECRET_KEY}`,
        'X-Public-Key': process.env.FAPSHI_PUBLIC_KEY,
      },
    });

    if (!fapshiResponse.ok) {
      const errorData = await fapshiResponse.json();
      throw new Error(errorData.message || 'Failed to check payment status');
    }

    const fapshiData = await fapshiResponse.json();

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        status: fapshiData.data.status,
        transaction_id: fapshiData.data.id,
        amount: fapshiData.data.amount / 100, // Convert from centimes
        currency: fapshiData.data.currency,
        reference: fapshiData.data.reference,
        message: 'Payment status retrieved successfully'
      })
    };

  } catch (error) {
    console.error('Fapshi status check error:', error);
    
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      })
    };
  }
};
