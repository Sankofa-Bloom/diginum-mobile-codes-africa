
/**
 * Registers all DigiNum API routes on the provided Fastify instance.
 * @param {FastifyInstance} fastify 
 * @param {object} opts 
 */
import { requireAuth } from './auth.js';
import { securityMiddleware } from './middleware/security';

// Configure rate limiting
fastify.register(rateLimit, {
  max: 100, // limit each IP to 100 requests per time window
  timeWindow: '1 hour', // time window for rate limiting
  keyGenerator: (request) => request.ip, // use IP address for rate limiting
});

export default async function routes(fastify, opts) {
  // Security middleware
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

  // Import required modules
  const { SMSProvider } = require('../lib/smsProvider');
  const { supabase } = require('../supabase');
  const smsProvider = new SMSProvider({
    apiKey: process.env.SMS_PROVIDER_API_KEY,
    baseUrl: 'https://sms-verification-number.com/stubs/handler_api'
  });

  // Buy data route
  fastify.get('/api/buy-data', async (request, reply) => {
    try {
      const services = await smsProvider.getServices();
      const serviceData = await Promise.all(
        services.map(async (service) => {
          const countries = await smsProvider.getCountries(service);
          const countryData = await Promise.all(
            countries.map(async (country) => {
              const price = await smsProvider.getPrices(service, country);
              return {
                name: country,
                price,
                service,
              };
            })
          );
          return {
            name: service,
            countries: countryData,
          };
        })
      );
      return { services: serviceData };
    } catch (error) {
      fastify.log.error('Error fetching buy data:', error);
      throw error;
    }
  });

  // Buy number route
  fastify.post('/api/buy-number', requireAuth, async (request, reply) => {
    try {
      const { country, service } = request.body;
      const user = request.user;

      // Rent number from SMS provider
      const numberRequest = {
        service,
        country,
        duration: 30, // 30 minutes default duration
      };

      const numberResponse = await smsProvider.rentNumber(numberRequest);

      // Save order in Supabase
      const { data, error } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          number_id: numberResponse.id,
          phone_number: numberResponse.phoneNumber,
          country: numberResponse.country,
          service: numberResponse.service,
          price: numberResponse.price,
          status: 'active',
          expires_at: new Date(numberResponse.expiresAt),
        })
        .select()
        .single();

      if (error) {
        fastify.log.error('Error saving order:', error);
        throw error;
      }

      return {
        order: data,
        number: numberResponse,
      };
    } catch (error) {
      fastify.log.error('Error buying number:', error);
      throw error;
    }
  });

    // Never expose sensitive error details in production
    if (process.env.NODE_ENV === 'production') {
      return reply.send({ error: 'An error occurred' });
    }
    return reply.send({ error: error.message });
  });

  // Auth routes
  // Supabase-powered login
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
  schema: {
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8 }
      }
    }
  }
}, async (request, reply) => {
    const { email, password } = request.body;
    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password are required.' });
    }
    const { data, error } = await fastify.supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return reply.code(401).send({ error: error.message });
    }
    return { token: data.session?.access_token, user: data.user };
  });

  // Supabase-powered password reset
  fastify.post('/api/auth/forgot-password', async (request, reply) => {
    try {
      const { email } = request.body;
      if (!email) {
        return reply.code(400).send({ error: 'Email is required.' });
      }
      const { error } = await fastify.supabase.auth.resetPasswordForEmail(email, {
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

  // Supabase-powered registration
  fastify.post('/api/auth/register', {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { 
          type: 'string',
          minLength: 8,
          pattern: '^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$' // Require at least one letter and one number
        }
      }
    }
  },
  attachValidation: true
}, async (request, reply) => {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { 
          type: 'string',
          minLength: 8,
          pattern: '^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$' // Require at least one letter and one number
        }
      }
    }
  }
}, async (request, reply) => {
    try {
      const { email, password } = request.body;
      if (!email || !password) {
        return reply.code(400).send({ error: 'Email and password are required.' });
      }
      const { data, error } = await fastify.supabase.auth.signUp({ email, password });
      if (error) {
        return reply.code(400).send({ error: error.message });
      }
      const userId = data.user?.id;
      if (!userId) {
        return reply.code(500).send({ error: 'Failed to get user id from Supabase.' });
      }
      const { error: insertError } = await fastify.supabase
        .from('users')
        .insert([{ id: userId, email, wallet: 0 }]);
      if (insertError) {
        return reply.code(500).send({ error: 'User created in auth but failed to insert in users table: ' + insertError.message });
      }
      return { user: { id: userId, email, wallet: 0 }, message: 'Registration successful. Please check your email to confirm.' };
    } catch (err) {
      return reply.code(500).send({ error: err.message || 'Internal server error' });
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
