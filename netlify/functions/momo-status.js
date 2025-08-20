const { getMomoClient } = require('./utils/momoClient');

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

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 1,
        message: 'Method not allowed',
        data: null
      })
    };
  }

  try {
    console.log('=== MTN MOMO STATUS CHECK FUNCTION START ===');

    // Get reference ID from query parameters
    const referenceId = event.queryStringParameters?.reference_id;
    if (!referenceId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          status: 1,
          message: 'Missing reference ID',
          data: null
        })
      };
    }

    // Get MoMo client
    const collections = getMomoClient();

    try {
      // Check payment status
      const paymentStatus = await collections.getTransactionStatus(referenceId);
      console.log('Payment status:', paymentStatus);

      // Map MTN MoMo status to our status format
      const statusMap = {
        'SUCCESSFUL': 'SUCCESSFUL',
        'FAILED': 'FAILED',
        'PENDING': 'PENDING',
        'TIMEOUT': 'FAILED',
        'REJECTED': 'FAILED'
      };

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          status: 0,
          message: 'Payment status retrieved successfully',
          data: {
            reference_id: referenceId,
            status: statusMap[paymentStatus.status] || paymentStatus.status,
            amount: paymentStatus.amount,
            currency: paymentStatus.currency,
            payer: paymentStatus.payer,
            payerMessage: paymentStatus.payerMessage,
            payeeNote: paymentStatus.payeeNote,
            externalId: paymentStatus.externalId,
            reason: paymentStatus.reason
          }
        })
      };

    } catch (error) {
      console.error('MoMo API error:', error);
      
      return {
        statusCode: error.statusCode || 500,
        headers: corsHeaders,
        body: JSON.stringify({
          status: 1,
          message: error.message || 'Failed to check payment status',
          data: null
        })
      };
    }

  } catch (error) {
    console.error('Status check error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 1,
        message: error.message || 'Failed to check payment status',
        data: null
      })
    };
  }
};