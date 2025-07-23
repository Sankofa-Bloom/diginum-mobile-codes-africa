const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Router } = require('express');

const router = Router();

// Create payment intent
router.post('/', async (req, res) => {
  try {
    const { amount, currency } = req.body;

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      metadata: {
        userId: req.user.id, // Assuming user is authenticated
        orderId: req.body.orderId,
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Stripe payment intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Webhook for Stripe events
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await handleSuccessfulPayment(paymentIntent);
        break;
      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object;
        await handleFailedPayment(failedIntent);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

async function handleSuccessfulPayment(paymentIntent) {
  try {
    const orderId = paymentIntent.metadata.orderId;
    const userId = paymentIntent.metadata.userId;

    // Update order status in database
    await db('orders')
      .where({ id: orderId })
      .update({
        status: 'paid',
        payment_method: 'stripe',
        payment_id: paymentIntent.id,
        updated_at: new Date(),
      });

    // Update user's balance or credit
    await db('users')
      .where({ id: userId })
      .increment('credit', paymentIntent.amount / 100);

    // Send success notification
    await sendNotification(userId, 'Payment successful', `
      Your payment of ${paymentIntent.amount / 100} ${paymentIntent.currency.toUpperCase()} was successful.
    `);
  } catch (error) {
    console.error('Error handling successful payment:', error);
    throw error;
  }
}

async function handleFailedPayment(failedIntent) {
  try {
    const orderId = failedIntent.metadata.orderId;
    const userId = failedIntent.metadata.userId;

    // Update order status in database
    await db('orders')
      .where({ id: orderId })
      .update({
        status: 'failed',
        payment_method: 'stripe',
        error_message: failedIntent.last_payment_error?.message,
        updated_at: new Date(),
      });

    // Send failure notification
    await sendNotification(userId, 'Payment failed', `
      Your payment attempt failed. Please try again.
      Error: ${failedIntent.last_payment_error?.message}
    `);
  } catch (error) {
    console.error('Error handling failed payment:', error);
    throw error;
  }
}

module.exports = router;
