import { requireAuth } from './middleware/security.js';

export default async function routes(fastify, opts) {
  // Fapshi Payment Helper Functions
  async function creditUserBalance(fastify, userId, amount, currency) {
    try {
      // Credit the user's balance in user_balances table
      const { data: existingBalance, error: balanceError } = await fastify.supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', userId)
        .eq('currency', currency)
        .single();

      let currentBalance = 0;
      let newBalance = amount;

      if (balanceError && balanceError.code === 'PGRST116') {
        // No existing balance record, create new one
        fastify.log.info(`Creating new balance record for user ${userId} with ${amount} ${currency}`);
        const { data: insertResult, error: insertError } = await fastify.supabase
          .from('user_balances')
          .insert([{
            user_id: userId,
            balance: amount,
            currency: currency
          }])
          .select('balance')
          .single();

        if (insertError) {
          fastify.log.error('Failed to create balance record:', insertError);
          return { success: false, error: insertError.message, newBalance: 0 };
        }
        
        newBalance = insertResult.balance;
        fastify.log.info(`New balance record created: ${newBalance} ${currency}`);
      } else if (balanceError) {
        // Other database error
        fastify.log.error('Error fetching existing balance:', balanceError);
        return { success: false, error: balanceError.message, newBalance: 0 };
      } else {
        // Update existing balance
        currentBalance = parseFloat(existingBalance.balance || 0);
        newBalance = currentBalance + amount;
        
        const { error: updateError } = await fastify.supabase
          .from('user_balances')
          .update({ 
            balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('currency', currency);

        if (updateError) {
          fastify.log.error('Failed to update balance:', updateError);
          return { success: false, error: updateError.message, newBalance: 0 };
        }
        
        fastify.log.info(`Balance updated successfully: ${newBalance} ${currency}`);
      }

      fastify.log.info(`User ${userId} balance credited: ${amount} ${currency}. New balance: ${newBalance}`);
      return { success: true, newBalance, error: null };
    } catch (error) {
      fastify.log.error('Error in creditUserBalance:', error);
      return { success: false, error: error.message, newBalance: 0 };
    }
  }

  // Simple Fapshi add funds endpoint
  fastify.post('/add-funds/fapshi', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { amount, currency = 'USD' } = request.body;
      const userId = request.user.id;

      if (!amount || amount <= 0) {
        return reply.code(400).send({ error: 'Invalid amount' });
      }

      // Create payment record
      const reference = `FAPSHI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { data: payment, error: paymentError } = await fastify.supabase
        .from('fapshi_payments')
        .insert([{
          user_id: userId,
          reference: reference,
          amount: amount,
          currency: currency,
          status: 'pending'
        }])
        .select()
        .single();

      if (paymentError) {
        fastify.log.error('Error creating payment record:', paymentError);
        return reply.code(500).send({ error: 'Failed to create payment record' });
      }

      return reply.code(200).send({
        success: true,
        payment: payment,
        message: 'Payment record created successfully'
      });

    } catch (error) {
      fastify.log.error('Error creating Fapshi payment:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Check Fapshi payment status
  fastify.get('/add-funds/status/:reference', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { reference } = request.params;
      const userId = request.user.id;

      // Get payment record
      const { data: payment, error: paymentError } = await fastify.supabase
        .from('fapshi_payments')
        .select('*')
        .eq('reference', reference)
        .eq('user_id', userId)
        .single();

      if (paymentError || !payment) {
        return reply.code(404).send({ error: 'Payment not found' });
      }

      return reply.code(200).send({
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        reference: payment.reference
      });

    } catch (error) {
      fastify.log.error('Error checking payment status:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Simple Fapshi payment verification
  fastify.get('/api/payment/fapshi/verify/:reference', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { reference } = request.params;
      const userId = request.user.id;

      // Get payment record from database
      const { data: payment, error: paymentError } = await fastify.supabase
        .from('fapshi_payments')
        .select('*')
        .eq('reference', reference)
        .eq('user_id', userId)
        .single();

      if (paymentError) {
        return reply.code(404).send({
          error: 'Payment not found',
        });
      }

      // Verify payment with Fapshi
      const verificationResponse = await fetch(`${process.env.FAPSHI_BASE_URL}/payments/status?reference=${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.FAPSHI_SECRET_KEY}`,
          'X-Public-Key': process.env.FAPSHI_PUBLIC_KEY,
        },
      });

      const result = await verificationResponse.json();

      if (!verificationResponse.ok) {
        return reply.code(400).send({
          error: result.message || 'Payment verification failed',
        });
      }

      // Update payment status
      await fastify.supabase
        .from('fapshi_payments')
        .update({
          status: result.data.status,
          fapshi_transaction_id: result.data.id,
          updated_at: new Date().toISOString(),
        })
        .eq('reference', reference);

      // If payment is successful, credit user balance
      if (result.data.status === 'completed') {
        const creditResult = await creditUserBalance(fastify, userId, result.data.amount / 100, result.data.currency);
        
        if (!creditResult.success) {
          return reply.code(500).send({
            error: 'Payment completed but failed to update balance',
            details: creditResult.error
          });
        }

        return reply.code(200).send({
          success: true,
          data: {
            reference: result.data.reference,
            amount: result.data.amount / 100,
            currency: result.data.currency,
            status: result.data.status,
            newBalance: creditResult.newBalance,
            message: 'Payment completed and balance updated successfully',
          },
        });
      }

      return reply.code(200).send({
        success: true,
        data: {
          reference: result.data.reference,
          amount: result.data.amount / 100,
          currency: result.data.currency,
          status: result.data.status,
          message: 'Payment verification completed',
        },
      });

    } catch (error) {
      fastify.log.error('Payment verification error:', error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  });

  // Simple Fapshi webhook endpoint
  fastify.post('/api/webhook/fapshi', async (request, reply) => {
    try {
      const { reference, status, amount, currency } = request.body;
      
      if (!reference || !status) {
        return reply.code(400).send({ error: 'Missing required fields' });
      }

      // Update payment status
      const { error: updateError } = await fastify.supabase
        .from('fapshi_payments')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('reference', reference);

      if (updateError) {
        fastify.log.error('Failed to update payment status:', updateError);
        return reply.code(500).send({ error: 'Failed to update payment status' });
      }

      return reply.code(200).send({ received: true });
    } catch (error) {
      fastify.log.error('Error processing Fapshi webhook:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get user balance
  fastify.get('/api/user/balance', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const userId = request.user.id;

      const { data: balance, error } = await fastify.supabase
        .from('user_balances')
        .select('balance, currency')
        .eq('user_id', userId)
        .eq('currency', 'USD')
        .single();

      if (error && error.code === 'PGRST116') {
        // No balance record exists, return 0
        return reply.code(200).send({
          balance: 0,
          currency: 'USD'
        });
      }

      if (error) {
        fastify.log.error('Error fetching balance:', error);
        return reply.code(500).send({ error: 'Failed to fetch balance' });
      }

      return reply.code(200).send({
        balance: balance.balance || 0,
        currency: balance.currency
      });

    } catch (error) {
      fastify.log.error('Error getting user balance:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
