const { Router } = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = Router();

// Stripe webhook
router.post('/stripe', async (req, res) => {
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
      case 'charge.succeeded':
        const charge = event.data.object;
        await handleSuccessfulCharge(charge);
        break;
      case 'charge.failed':
        const failedCharge = event.data.object;
        await handleFailedCharge(failedCharge);
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

    // Update order status
    await db('orders')
      .where({ id: orderId })
      .update({
        status: 'paid',
        payment_method: 'stripe',
        payment_id: paymentIntent.id,
        updated_at: new Date(),
      });

    // Update user's balance
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

    // Update order status
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

async function handleSuccessfulCharge(charge) {
  try {
    const orderId = charge.metadata.orderId;
    const userId = charge.metadata.userId;

    // Update order status
    await db('orders')
      .where({ id: orderId })
      .update({
        status: 'completed',
        payment_method: 'stripe',
        payment_id: charge.id,
        updated_at: new Date(),
      });

    // Update user's balance
    await db('users')
      .where({ id: userId })
      .increment('credit', charge.amount / 100);

    // Send success notification
    await sendNotification(userId, 'Payment completed', `
      Your payment of ${charge.amount / 100} ${charge.currency.toUpperCase()} has been completed.
    `);
  } catch (error) {
    console.error('Error handling successful charge:', error);
    throw error;
  }
}

async function handleFailedCharge(failedCharge) {
  try {
    const orderId = failedCharge.metadata.orderId;
    const userId = failedCharge.metadata.userId;

    // Update order status
    await db('orders')
      .where({ id: orderId })
      .update({
        status: 'failed',
        payment_method: 'stripe',
        error_message: failedCharge.failure_message,
        updated_at: new Date(),
      });

    // Send failure notification
    await sendNotification(userId, 'Payment failed', `
      Your payment attempt failed. Please try again.
      Error: ${failedCharge.failure_message}
    `);
  } catch (error) {
    console.error('Error handling failed charge:', error);
    throw error;
  }
}

module.exports = router;
