// src/lib/apiMock.ts
// Centralized mock API for DigiNum PWA frontend integration

export type NumberOrder = {
  id: string;
  phoneNumber: string;
  country: string;
  service: string;
  price: number;
  status: 'active' | 'waiting' | 'completed' | 'expired';
  smsCode?: string;
  createdAt: string;
  expiresAt: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  wallet: number;
};

// Mock user
export const mockUser: User = {
  id: 'user_001',
  name: 'John Doe',
  email: 'john@example.com',
  wallet: 5000,
};

// Mock numbers
export const mockNumbers: NumberOrder[] = [
  {
    id: 'order_001',
    phoneNumber: '+237650000001',
    country: 'Cameroon',
    service: 'WhatsApp',
    price: 500,
    status: 'active',
    smsCode: undefined,
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 20).toISOString(),
  },
  {
    id: 'order_002',
    phoneNumber: '+234810000002',
    country: 'Nigeria',
    service: 'Telegram',
    price: 300,
    status: 'waiting',
    smsCode: undefined,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
  },
  {
    id: 'order_003',
    phoneNumber: '+24106000003',
    country: 'Gabon',
    service: 'Facebook',
    price: 400,
    status: 'completed',
    smsCode: '123456',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    expiresAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
];

// Mock API functions
export const apiMock = {
  getUser: async (): Promise<User> => {
    await delay(300);
    return mockUser;
  },
  getNumbers: async (): Promise<NumberOrder[]> => {
    await delay(400);
    return mockNumbers;
  },
  buyNumber: async (country: string, service: string): Promise<NumberOrder> => {
    await delay(600);
    return {
      id: 'order_' + Math.floor(Math.random() * 10000),
      phoneNumber: '+237' + Math.floor(650000000 + Math.random() * 1000000),
      country,
      service,
      price: 500,
      status: 'waiting',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 20).toISOString(),
    };
  },
  payWithMoMo: async (amount: number): Promise<{ success: boolean; balance: number }> => {
    await delay(500);
    return { success: true, balance: mockUser.wallet - amount };
  },
  getSmsCode: async (orderId: string): Promise<{ smsCode: string }> => {
    await delay(1200);
    return { smsCode: '654321' };
  },
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
