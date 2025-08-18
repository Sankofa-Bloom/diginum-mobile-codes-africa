// Swychr Payment Gateway API Client
// Based on the Payin API V1 specification

export interface SwychrAuthResponse {
  data: {
    token: string;
  };
  status: number;
  message: string;
}

export interface SwychrPaymentLinkRequest {
  country_code: string;
  name: string;
  email: string;
  mobile?: string;
  amount: number;
  transaction_id: string;
  description?: string;
  pass_digital_charge: boolean;
}

export interface SwychrPaymentLinkResponse {
  data: {
    payment_url?: string;
    transaction_id: string;
  };
  status: number;
  message: string;
}

export interface SwychrPaymentStatusRequest {
  transaction_id: string;
}

export interface SwychrPaymentStatusResponse {
  data: {
    status: string;
    transaction_id: string;
    amount?: number;
    payment_method?: string;
  };
  status: number;
  message: string;
}

class SwychrAPI {
  private baseURL: string;
  private authToken: string | null = null;

  constructor() {
    this.baseURL = import.meta.env.VITE_SWYCHR_BASE_URL || 'https://api.accountpe.com/api/payin';
  }

  // Get authentication token
  async authenticate(email: string, password: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/admin/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data: SwychrAuthResponse = await response.json();
      
      if (data.status !== 200) {
        throw new Error(data.message || 'Authentication failed');
      }

      this.authToken = data.data.token;
      return this.authToken;
    } catch (error) {
      console.error('Swychr authentication error:', error);
      throw error;
    }
  }

  // Create payment link
  async createPaymentLink(paymentData: SwychrPaymentLinkRequest): Promise<SwychrPaymentLinkResponse> {
    if (!this.authToken) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    try {
      const response = await fetch(`${this.baseURL}/create_payment_links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          ...paymentData,
          amount: Math.round((paymentData as any).amount), // API expects integer units
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create payment link: ${response.status}`);
      }

      const data: SwychrPaymentLinkResponse = await response.json();
      
      if ((data as any).status !== 0) {
        throw new Error(data.message || 'Failed to create payment link');
      }

      return data;
    } catch (error) {
      console.error('Swychr create payment link error:', error);
      throw error;
    }
  }

  // Check payment status
  async checkPaymentStatus(transactionId: string): Promise<SwychrPaymentStatusResponse> {
    if (!this.authToken) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    try {
      const response = await fetch(`${this.baseURL}/payment_link_status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({ transaction_id: transactionId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to check payment status: ${response.status}`);
      }

      const data: SwychrPaymentStatusResponse = await response.json();
      
      if (data.status !== 200) {
        throw new Error(data.message || 'Failed to check payment status');
      }

      return data;
    } catch (error) {
      console.error('Swychr check payment status error:', error);
      throw error;
    }
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return !!this.authToken;
  }

  // Get current auth token
  getAuthToken(): string | null {
    return this.authToken;
  }

  // Clear auth token
  clearAuth(): void {
    this.authToken = null;
  }
}

// Export singleton instance
export const swychrAPI = new SwychrAPI();

// Helper function to format amount for Swychr (amount should be in cents/smallest currency unit)
export const formatAmountForSwychr = (amount: number): number => {
  // Convert USD dollars to cents (Swychr expects integer amount)
  return Math.round(amount * 100);
};

// Helper function to parse amount from Swychr response
export const parseAmountFromSwychr = (amount: number): number => {
  // Convert cents back to dollars
  return amount / 100;
};
