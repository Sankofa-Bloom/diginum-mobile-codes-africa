/**
 * Fapshi Payment Gateway Integration
 * Supports XAF payments via MTN MoMo and Orange Money
 */

export interface FapshiConfig {
  publicKey: string;
  secretKey: string;
  environment: 'sandbox' | 'live';
}

export interface FapshiPaymentRequest {
  amount: number;
  currency: 'XAF';
  email: string;
  name: string;
  phone?: string;
  redirectUrl?: string;
  description?: string;
  reference?: string;
}

export interface FapshiPaymentResponse {
  success: boolean;
  data?: {
    transaction_id: string;
    reference: string;
    amount: number;
    currency: string;
    status: 'pending' | 'success' | 'failed';
    payment_url?: string;
    message: string;
  };
  error?: string;
}

export interface FapshiWebhookPayload {
  event: 'payment.success' | 'payment.failed' | 'payment.pending';
  data: {
    transaction_id: string;
    reference: string;
    amount: number;
    currency: string;
    status: string;
    customer: {
      email: string;
      name: string;
      phone?: string;
    };
    created_at: string;
  };
}

class FapshiAPI {
  private config: FapshiConfig;
  private baseUrl: string;

  constructor(config: FapshiConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'sandbox' 
      ? 'https://sandbox.fapshi.com/api/v1'
      : 'https://api.fapshi.com/v1';
  }

  /**
   * Initialize a payment transaction
   */
  async initiatePayment(paymentData: FapshiPaymentRequest): Promise<FapshiPaymentResponse> {
    try {
      // Use local Netlify Functions API instead of external Fapshi API
      const response = await fetch('/.netlify/functions/fapshi-initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: paymentData.amount,
          currency: paymentData.currency,
          email: paymentData.email,
          name: paymentData.name,
          phone: paymentData.phone,
          redirect_url: paymentData.redirectUrl,
          description: paymentData.description || 'DigiNum SMS Service Payment',
          reference: paymentData.reference || this.generateReference(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.message || 'Payment initialization failed',
        };
      }

      return {
        success: true,
        data: {
          transaction_id: result.data.id,
          reference: result.data.reference,
          amount: result.data.amount,
          currency: result.data.currency,
          status: result.data.status,
          payment_url: result.data.payment_url,
          message: result.message || 'Payment initialized successfully',
        },
      };
    } catch (error) {
      console.error('Fapshi payment initialization error:', error);
      return {
        success: false,
        error: 'Network error occurred while initializing payment',
      };
    }
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(transactionId: string): Promise<FapshiPaymentResponse> {
    try {
      // Use local Netlify Functions API instead of external Fapshi API
      const response = await fetch('/.netlify/functions/api/fapshi/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transaction_id: transactionId }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.message || 'Payment verification failed',
        };
      }

      return {
        success: true,
        data: {
          transaction_id: result.data.id,
          reference: result.data.reference,
          amount: result.data.amount,
          currency: result.data.currency,
          status: result.data.status,
          message: result.message || 'Payment verified successfully',
        },
      };
    } catch (error) {
      console.error('Fapshi payment verification error:', error);
      return {
        success: false,
        error: 'Network error occurred while verifying payment',
      };
    }
  }

  /**
   * Handle webhook payload
   */
  async handleWebhook(payload: FapshiWebhookPayload): Promise<boolean> {
    try {
      // Verify webhook signature here if Fapshi provides one
      // For now, we'll just validate the payload structure
      
      if (!payload.event || !payload.data) {
        console.error('Invalid webhook payload structure');
        return false;
      }

      // Log webhook events in development only
      if (import.meta.env.DEV) {
        console.log(`Fapshi webhook received: ${payload.event}`, payload.data);
      }
      
      // Process the webhook based on event type
      switch (payload.event) {
        case 'payment.success':
          await this.handleSuccessfulPayment(payload.data);
          break;
        case 'payment.failed':
          await this.handleFailedPayment(payload.data);
          break;
        case 'payment.pending':
          await this.handlePendingPayment(payload.data);
          break;
        default:
          console.warn(`Unhandled webhook event: ${payload.event}`);
      }

      return true;
    } catch (error) {
      console.error('Error handling Fapshi webhook:', error);
      return false;
    }
  }

  /**
   * Generate a unique payment reference
   */
  private generateReference(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `FAPSHI_${timestamp}_${random}`;
  }

  /**
   * Handle successful payment
   */
  private async handleSuccessfulPayment(data: any): Promise<void> {
    // Implement successful payment logic
    if (import.meta.env.DEV) {
      console.log('Payment successful:', data);
    }
    // Update user balance, send SMS number, etc.
  }

  /**
   * Handle failed payment
   */
  private async handleFailedPayment(data: any): Promise<void> {
    // Implement failed payment logic
    if (import.meta.env.DEV) {
      console.log('Payment failed:', data);
    }
    // Notify user, log failure, etc.
  }

  /**
   * Handle pending payment
   */
  private async handlePendingPayment(data: any): Promise<void> {
    // Implement pending payment logic
    if (import.meta.env.DEV) {
      console.log('Payment pending:', data);
    }
    // Update status, wait for final confirmation, etc.
  }
}

// Fapshi configuration
export const fapshiConfig: FapshiConfig = {
  publicKey: import.meta.env.VITE_FAPSHI_PUBLIC_KEY || '',
  secretKey: import.meta.env.VITE_FAPSHI_SECRET_KEY || '',
  environment: import.meta.env.VITE_FAPSHI_ENVIRONMENT as 'sandbox' | 'live' || 'live',
};

// Export the Fapshi API instance
export const fapshiAPI = new FapshiAPI(fapshiConfig);

// Utility functions
export const formatFapshiAmount = (amount: number): number => {
  // Fapshi expects amounts in the smallest currency unit (e.g., centimes for XAF)
  return Math.round(amount * 100);
};

export const parseFapshiAmount = (amount: number): number => {
  // Convert from smallest currency unit back to main currency
  return amount / 100;
};

export const isFapshiSupported = (currency: string): boolean => {
  return currency === 'XAF';
};

export default FapshiAPI;