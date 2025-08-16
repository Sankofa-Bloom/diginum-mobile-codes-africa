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
    const {
      country_code,
      name,
      email,
      mobile,
      amount,
      transaction_id,
      description,
      pass_digital_charge
    } = JSON.parse(event.body);

    // Validate required fields
    if (!country_code || !name || !email || !amount || !transaction_id || pass_digital_charge === undefined) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          required: ['country_code', 'name', 'email', 'amount', 'transaction_id', 'pass_digital_charge']
        }),
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

    // Create payment link
    const paymentResponse = await fetch(`${swychrBaseURL}/create_payment_links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        country_code,
        name,
        email,
        mobile,
        amount: Math.round(amount * 100), // Convert to cents
        transaction_id,
        description: description || `Payment for ${name}`,
        pass_digital_charge,
      }),
    });

    if (!paymentResponse.ok) {
      throw new Error(`Failed to create payment link: ${paymentResponse.status}`);
    }

    const paymentData = await paymentResponse.json();

    if (paymentData.status !== 200) {
      throw new Error(paymentData.message || 'Failed to create payment link');
    }

    // Return the payment link data
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        data: paymentData.data,
        message: 'Payment link created successfully',
      }),
    };

  } catch (error) {
    console.error('Swychr create payment error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to create payment link',
        message: error.message,
      }),
    };
  }
};
