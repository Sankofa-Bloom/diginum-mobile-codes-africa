import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Buy } from '@/pages/Buy';
import { getCurrentUser } from '@/lib/auth';
import { useStripe, useElements } from '@stripe/react-stripe-js';
import { useToast } from '@/components/ui/use-toast';

// Mock dependencies
jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(() => ({
    t: (key: string) => key,
  })),
}));

jest.mock('@stripe/react-stripe-js', () => ({
  useStripe: jest.fn(),
  useElements: jest.fn(),
}));

jest.mock('@/components/ui/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}));

describe('Buy Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect to login if user is not authenticated', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    
    render(
      <BrowserRouter>
        <Buy />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getCurrentUser).toHaveBeenCalled();
    });
  });

  it('should display error message if user is not authenticated', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    
    render(
      <BrowserRouter>
        <Buy />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('buy.requireLogin')).toBeInTheDocument();
    });
  });

  it('should handle Stripe payment flow correctly', async () => {
    const mockStripe = {
      createPaymentMethod: jest.fn().mockResolvedValue({ error: null, paymentMethod: { id: 'pm_123' } }),
    };
    const mockElements = {
      getElement: jest.fn().mockReturnValue({}),
    };

    (useStripe as jest.Mock).mockReturnValue(mockStripe);
    (useElements as jest.Mock).mockReturnValue(mockElements);
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: 'user_123' });

    render(
      <BrowserRouter>
        <Buy />
      </BrowserRouter>
    );

    // Select Stripe payment method
    fireEvent.change(screen.getByLabelText('buy.paymentMethod'), {
      target: { value: 'stripe' },
    });

    // Fill card details
    fireEvent.change(screen.getByPlaceholderText('buy.phonePlaceholder'), {
      target: { value: '4242424242424242' },
    });

    // Click pay button
    fireEvent.click(screen.getByText('buy.payNow'));

    await waitFor(() => {
      expect(mockStripe.createPaymentMethod).toHaveBeenCalled();
    });
  });

  it('should handle MoMo payment flow correctly', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: 'user_123' });

    render(
      <BrowserRouter>
        <Buy />
      </BrowserRouter>
    );

    // Select MoMo payment method
    fireEvent.change(screen.getByLabelText('buy.paymentMethod'), {
      target: { value: 'momo' },
    });

    // Fill phone number
    fireEvent.change(screen.getByPlaceholderText('buy.phonePlaceholder'), {
      target: { value: '+237673289043' },
    });

    // Click pay button
    fireEvent.click(screen.getByText('buy.payNow'));

    await waitFor(() => {
      expect(screen.getByText('buy.processing')).toBeInTheDocument();
    });
  });

  it('should display error message for invalid phone number', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: 'user_123' });

    render(
      <BrowserRouter>
        <Buy />
      </BrowserRouter>
    );

    // Select MoMo payment method
    fireEvent.change(screen.getByLabelText('buy.paymentMethod'), {
      target: { value: 'momo' },
    });

    // Click pay button without phone number
    fireEvent.click(screen.getByText('buy.payNow'));

    await waitFor(() => {
      expect(screen.getByText('error.momo.invalidNumber')).toBeInTheDocument();
    });
  });
});
