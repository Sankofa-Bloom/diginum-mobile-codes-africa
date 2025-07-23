
import rateLimit from '@fastify/rate-limit';
import { requireAuth } from './auth.js';
import securityMiddleware from './middleware/security.js';
import { supabase } from './supabase.js';

/**
 * Registers all DigiNum API routes on the provided Fastify instance.
 * @param {import('fastify').FastifyInstance} fastify 
 * @param {object} opts 
 */
export default async function routes(fastify, opts) {
  // Configure rate limiting
  await fastify.register(rateLimit, {
    max: 100, // limit each IP to 100 requests per time window
    timeWindow: '1 hour', // time window for rate limiting
    keyGenerator: (request) => request.ip, // use IP address for rate limiting
  });
  
  // Register security middleware
  await fastify.register(securityMiddleware);

  // Error handling middleware
  fastify.setErrorHandler((error, request, reply) => {
    if (error.statusCode) {
      reply.code(error.statusCode);
    } else if (error instanceof Error) {
      reply.code(500);
    } else {
      reply.code(400);
    }
  });

  // SMS provider initialization will be added here when implemented

  // Auth routes
  fastify.post('/api/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 }
        }
      }
    },
    attachValidation: true
  }, async (request, reply) => {
    try {
      if (request.validationError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: request.validationError.validation
        });
      }

      const { email, password } = request.body;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      fastify.log.error('Login error:', error);
      throw error;
    }
  });

  // Handle both /signup and /register for backward compatibility
  const handleSignup = async (request, reply) => {
    try {
      const { email, password } = request.body;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      fastify.log.error('Registration error:', error);
      throw error;
    }
  };

  // Logout endpoint
  fastify.post('/api/auth/logout', async (request, reply) => {
    try {
      // Clear any session tokens
      reply.clearCookie('sb-access-token');
      reply.clearCookie('sb-refresh-token');
      
      // Invalidate the session on the client side
      reply.header('Clear-Site-Data', '"cookies", "storage", "executionContexts"');
      
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      fastify.log.error('Logout error:', error);
      throw new Error('Failed to log out');
    }
  });

  // Register both endpoints pointing to the same handler
  fastify.post('/api/auth/signup', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 }
        }
      }
    },
    attachValidation: true
  }, handleSignup);

  fastify.post('/api/auth/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 }
        }
      }
    },
    attachValidation: true
  }, handleSignup);

  // Buy data route
  fastify.get('/api/buy-data', async (request, reply) => {
    // Implementation for buy-data
    return { message: 'Buy data endpoint' };
  });

  // Buy number route - Currently disabled as SMS provider is not implemented
  fastify.post('/api/buy-number', {
    schema: {
      body: {
        type: 'object',
        required: ['country', 'service'],
        properties: {
          country: { type: 'string' },
          service: { type: 'string' }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      // Return a 501 Not Implemented response
      reply.status(501).send({
        error: 'Not Implemented',
        message: 'Phone number purchasing is currently not available. Please check back later.'
      });
    } catch (error) {
      fastify.log.error('Error in buy-number route:', error);
      throw error;
    }
  });

  // Password reset endpoint
  fastify.post('/api/auth/forgot-password', async (request, reply) => {
    try {
      const { email } = request.body;
      if (!email) {
        return reply.code(400).send({ error: 'Email is required.' });
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`,
      });
      if (error) {
        return reply.code(400).send({ error: error.message });
      }
      return { message: 'Password reset email sent. Please check your inbox.' };
    } catch (err) {
      console.error('Password reset error:', err);
      return reply.code(500).send({ error: 'Failed to send password reset email' });
    }
  });

  // Numbers (list available numbers)
  fastify.get('/api/numbers', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { data, error } = await fastify.supabase
        .from('numbers')
        .select('*')
        .eq('available', true);
      if (error) throw error;
      return data;
    } catch (e) {
      // fallback mock if table doesn't exist
      return [{ id: 1, country: 'CM', service: 'WhatsApp', price: 500 }];
    }
  });

  // Numbers (buy - create order)
  fastify.post('/api/numbers/buy', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { user_id, number_id } = request.body;
      if (!user_id || !number_id) {
        return reply.code(400).send({ error: 'user_id and number_id required' });
      }
      // Mark number as unavailable and create order
      const { error: updateError } = await fastify.supabase
        .from('numbers')
        .update({ available: false })
        .eq('id', number_id);
      if (updateError) throw updateError;
      const { data: order, error: orderError } = await fastify.supabase
        .from('orders')
        .insert([{ user_id, number_id, status: 'pending' }])
        .select()
        .single();
      if (orderError) throw orderError;
      return order;
    } catch (e) {
      return { orderId: 123, status: 'pending', number: '+237612345678', error: e.message };
    }
  });

  // Campay Webhook endpoint
  fastify.post('/api/webhook/campay', async (request, reply) => {
    try {
      const { transactionId, status, amount, currency, phoneNumber, reference } = request.body;
      
      // Verify webhook key
      const webhookKey = request.headers['x-webhook-key'];
      if (!webhookKey || webhookKey !== process.env.CAMPAY_WEBHOOK_KEY) {
        return reply.code(401).send({ error: 'Invalid webhook key' });
      }

      // Find the order associated with this payment
      const { data: order, error: orderError } = await fastify.supabase
        .from('orders')
        .select('*')
        .eq('reference', reference)
        .single();

      // Only accept USD payments
      if (currency !== 'USD') {
        return reply.code(400).send({ error: 'Only USD payments are accepted' });
      }

      if (orderError || !order) {
        console.error('Order not found for reference:', reference);
        return reply.code(404).send({ error: 'Order not found' });
      }

      // Update order status based on payment status
      const newStatus = status === 'completed' ? 'completed' : 'failed';

      // Update order amount with Stripe fees if applicable
      if (status === 'completed') {
        const stripeFee = amount * 0.029 + 0.3;
        const finalAmount = amount + stripeFee;
        await fastify.supabase
          .from('orders')
          .update({ amount: finalAmount })
          .eq('id', order.id);
      }
      const { error: updateError } = await fastify.supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (updateError) {
        console.error('Failed to update order status:', updateError);
        return reply.code(500).send({ error: 'Failed to update order status' });
      }

      // Log the payment details
      console.log('Payment webhook received:', {
        transactionId,
        status,
        amount,
        phoneNumber,
        reference,
        orderId: order.id
      });

      return reply.code(200).send({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Admin routes
  fastify.post('/api/admin/transactions', async (request, reply) => {
    try {
      const { data, error } = await fastify.supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        return reply.code(500).send({ error: 'Failed to fetch transactions' });
      }

      return reply.code(200).send(data);
    } catch (error) {
      console.error('Error in admin transactions route:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Exchange rates management
  fastify.get('/api/admin/exchange-rates', async (request, reply) => {
    try {
      const { data, error } = await fastify.supabase
        .from('exchange_rates')
        .select('*')
        .order('currency');

      if (error) {
        console.error('Error fetching exchange rates:', error);
        return reply.code(500).send({ error: 'Failed to fetch exchange rates' });
      }

      return reply.code(200).send(data);
    } catch (error) {
      console.error('Error in exchange rates route:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/api/admin/exchange-rates', async (request, reply) => {
    try {
      const { currency, rate, markup } = request.body;
      
      if (!currency || !rate) {
        return reply.code(400).send({ error: 'Currency and rate are required' });
      }

      const { data, error } = await fastify.supabase
        .from('exchange_rates')
        .insert([
          {
            currency,
            rate,
            markup: markup || 0,
            updated_at: new Date().toISOString(),
          }
        ])
        .select();

      if (error) {
        console.error('Error updating exchange rate:', error);
        return reply.code(500).send({ error: 'Failed to update exchange rate' });
      }

      return reply.code(200).send(data[0]);
    } catch (error) {
      console.error('Error in update exchange rate route:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Price adjustments management
  fastify.get('/api/admin/price-adjustments', async (request, reply) => {
    try {
      const { data, error } = await fastify.supabase
        .from('price_adjustments')
        .select('*')
        .order('service', { ascending: true })
        .order('country', { ascending: true });

      if (error) {
        console.error('Error fetching price adjustments:', error);
        return reply.code(500).send({ error: 'Failed to fetch price adjustments' });
      }

      return reply.code(200).send(data);
    } catch (error) {
      console.error('Error in price adjustments route:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/api/admin/price-adjustments', async (request, reply) => {
    try {
      const { service, country, markup } = request.body;
      
      if (!service || !country || markup === undefined) {
        return reply.code(400).send({ error: 'Service, country, and markup are required' });
      }

      const { data, error } = await fastify.supabase
        .from('price_adjustments')
        .insert([
          {
            service,
            country,
            markup,
            updated_at: new Date().toISOString(),
          }
        ])
        .select();

      if (error) {
        console.error('Error updating price adjustment:', error);
        return reply.code(500).send({ error: 'Failed to update price adjustment' });
      }

      return reply.code(200).send(data[0]);
    } catch (error) {
      console.error('Error in update price adjustment route:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Numbers (fetch order by ID)
  fastify.get('/api/numbers/:orderId', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { orderId } = request.params;
      const { data, error } = await fastify.supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      return { orderId: request.params.orderId, status: 'active', number: '+237612345678', error: e.message };
    }
  });

  // Payments (wallet top-up, MoMo, status)
  fastify.post('/api/payment/topup', { preHandler: requireAuth }, async (request, reply) => {
    // TODO: Implement wallet top-up
    return { paymentId: 1, status: 'initiated', amount: request.body.amount };
  });
  fastify.post('/api/payment/momo', { preHandler: requireAuth }, async (request, reply) => {
    // TODO: Implement MTN/Orange MoMo payment
    return { paymentId: 2, status: 'pending', provider: request.body.provider };
  });
  fastify.get('/api/payment/status/:paymentId', { preHandler: requireAuth }, async (request, reply) => {
    // TODO: Fetch payment status
    return { paymentId: request.params.paymentId, status: 'completed' };
  });

  // SMS Activation Provider (callback/webhook)
  fastify.post('/api/sms/callback', { preHandler: requireAuth }, async (request, reply) => {
    // TODO: Handle SMS activation provider webhook
    return { received: true };
  });

  // User Dashboard (list user's numbers/orders)
  fastify.get('/api/dashboard', { preHandler: requireAuth }, async (request, reply) => {
    // Use authenticated user from JWT
    const user_id = request.user.sub; // sub is standard JWT user id field
    if (!user_id) {
      return reply.code(401).send({ error: 'Unauthorized: No user in token' });
    }
    try {
      const { data, error } = await fastify.supabase
        .from('orders')
        .select('*, numbers(*)')
        .eq('user_id', user_id);
      if (error) throw error;
      return data;
    } catch (e) {
      return [{ orderId: 1, number: '+237612345678', status: 'active', error: e.message }];
    }
  });

  // Admin Panel (list users)
  fastify.get('/api/admin/users', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { data, error } = await fastify.supabase
        .from('users')
        .select('*');
      if (error) throw error;
      return data;
    } catch (e) {
      return [{ id: 1, email: 'user@example.com', error: e.message }];
    }
  });

  // Admin Panel (list orders)
  fastify.get('/api/admin/orders', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { data, error } = await fastify.supabase
        .from('orders')
        .select('*, numbers(*), users(*)');
      if (error) throw error;
      return data;
    } catch (e) {
      return [{ orderId: 1, number: '+237612345678', status: 'active', error: e.message }];
    }
  });

  // Admin Panel (list payments)
  fastify.get('/api/admin/payments', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { data, error } = await fastify.supabase
        .from('payments')
        .select('*');
      if (error) throw error;
      return data;
    } catch (e) {
      return [{ paymentId: 1, amount: 500, status: 'completed', error: e.message }];
    }
  });
}
