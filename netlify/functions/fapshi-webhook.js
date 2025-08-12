const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the webhook payload
    const webhookData = JSON.parse(event.body);
    console.log('Fapshi webhook received:', webhookData);

    // Verify webhook signature (recommended for production)
    // You should implement signature verification using Fapshi's webhook secret
    const signature = event.headers['x-fapshi-signature'] || event.headers['X-Fapshi-Signature'];
    
    // TODO: Verify webhook signature
    // if (!verifyWebhookSignature(event.body, signature, process.env.FAPSHI_WEBHOOK_SECRET)) {
    //   return {
    //     statusCode: 401,
    //     headers: corsHeaders,
    //     body: JSON.stringify({ error: 'Invalid webhook signature' })
    //   };
    // }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { 
      reference, 
      transaction_id, 
      status, 
      amount, 
      currency,
      customer_email,
      customer_name,
      customer_phone
    } = webhookData;

    if (!reference || !status) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required webhook data' })
      };
    }

    // Update payment status in database
    const { error: updateError } = await supabase
      .from('fapshi_payments')
      .update({
        status: status,
        fapshi_transaction_id: transaction_id,
        updated_at: new Date().toISOString(),
        webhook_received_at: new Date().toISOString()
      })
      .eq('reference', reference);

    if (updateError) {
      console.error('Error updating payment status:', updateError);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Failed to update payment status' })
      };
    }

    // If payment is completed, credit the user's account
    if (status === 'completed' || status === 'success') {
      try {
        // Get the payment record
        const { data: payment, error: paymentError } = await supabase
          .from('fapshi_payments')
          .select('*')
          .eq('reference', reference)
          .single();

        if (paymentError) {
          console.error('Error fetching payment:', paymentError);
          return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to fetch payment details' })
          };
        }

        // Convert amount to USD if needed (assuming Fapshi uses XAF)
        let usdAmount = payment.amount;
        if (currency === 'XAF') {
          // Convert XAF to USD (you might want to use a real exchange rate API)
          usdAmount = payment.amount / 600; // Approximate rate, adjust as needed
        }

        // Credit user balance
        const { data: balanceData, error: balanceError } = await supabase
          .from('user_balances')
          .select('balance')
          .eq('user_id', payment.user_id)
          .eq('currency', 'USD')
          .single();

        if (balanceError && balanceError.code === 'PGRST116') {
          // Create new balance record
          await supabase
            .from('user_balances')
            .insert([{
              user_id: payment.user_id,
              balance: usdAmount,
              currency: 'USD'
            }]);
        } else if (!balanceError) {
          // Update existing balance
          const newBalance = balanceData.balance + usdAmount;
          await supabase
            .from('user_balances')
            .update({ balance: newBalance })
            .eq('user_id', payment.user_id)
            .eq('currency', 'USD');
        }

        console.log(`Payment ${reference} completed. Credited $${usdAmount.toFixed(2)} USD to user ${payment.user_id}`);
      } catch (creditError) {
        console.error('Error crediting user balance:', creditError);
        // Don't fail the webhook, just log the error
      }
    }

    // Return success response
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        reference: reference,
        status: status
      })
    };

  } catch (error) {
    console.error('Fapshi webhook error:', error);
    
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

// Helper function to verify webhook signature (implement this for production)
function verifyWebhookSignature(payload, signature, secret) {
  // TODO: Implement signature verification
  // This should use crypto.createHmac() to verify the signature
  // For now, return true (not recommended for production)
  return true;
}
