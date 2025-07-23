import { createPayment, verifyPayment } from '../src/lib/campay';
import { PaymentRequest } from '../src/lib/campay';

describe('Campay Payment Integration', () => {
  const mockPaymentRequest: PaymentRequest = {
    amount: 1000,
    currency: 'USD',
    phoneNumber: '+237673289043',
    reference: 'TEST-123456',
    description: 'Test payment for Campay integration'
  };

  it('should successfully initiate a payment', async () => {
    try {
      const result = await createPayment(mockPaymentRequest);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.message).toBe('Payment initiated successfully');
    } catch (error) {
      console.error('Payment initiation failed:', error);
      throw error;
    }
  });

  it('should verify payment status', async () => {
    try {
      const result = await createPayment(mockPaymentRequest);
      const isPaid = await verifyPayment(result.transactionId);
      expect(isPaid).toBeDefined();
      // Note: In a real test, we would wait for the payment to be completed
      // and then verify the status. This is a basic test to ensure the API call works.
    } catch (error) {
      console.error('Payment verification failed:', error);
      throw error;
    }
  });

  it('should handle invalid phone numbers', async () => {
    const invalidRequest: PaymentRequest = {
      ...mockPaymentRequest,
      phoneNumber: 'invalid-phone-number'
    };

    await expect(createPayment(invalidRequest))
      .rejects
      .toThrow('Failed to initiate payment');
  });

  it('should handle invalid amounts', async () => {
    const invalidRequest: PaymentRequest = {
      ...mockPaymentRequest,
      amount: -100
    };

    await expect(createPayment(invalidRequest))
      .rejects
      .toThrow('Failed to initiate payment');
  });
});
