import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SMSProvider } from '@/lib/smsProvider';
import axios from 'axios';

// Mock axios
vi.mock('axios');

const mockConfig = {
  apiKey: 'test-api-key',
  baseUrl: 'https://api.sms-provider.com/v1'
};

const mockNumberResponse = {
  id: '123',
  phoneNumber: '+1234567890',
  country: 'US',
  service: 'whatsapp',
  price: 1.99,
  expiresAt: new Date().toISOString(),
  status: 'pending'
};

const mockSMSResponse = {
  code: '123456',
  receivedAt: new Date().toISOString()
};

describe('SMSProvider', () => {
  let smsProvider: SMSProvider;
  let axiosMock: any;

  beforeEach(() => {
    smsProvider = new SMSProvider(mockConfig);
    axiosMock = axios as any;
    axiosMock.request.mockReset();
  });

  describe('rentNumber', () => {
    it('should successfully rent a number', async () => {
      axiosMock.request.mockResolvedValue({ data: mockNumberResponse });
      
      const request = {
        service: 'whatsapp',
        country: 'US',
        duration: 30
      };

      const response = await smsProvider.rentNumber(request);
      
      expect(response).toEqual(mockNumberResponse);
      expect(axiosMock.request).toHaveBeenCalledWith({
        url: `${mockConfig.baseUrl}/numbers/rent`,
        method: 'POST',
        data: request,
        headers: {
          'Authorization': `Bearer ${mockConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
    });

    it('should throw error on failed request', async () => {
      const error = new Error('API Error');
      axiosMock.request.mockRejectedValue(error);

      await expect(
        smsProvider.rentNumber({ service: 'whatsapp', country: 'US' })
      ).rejects.toThrow(error);
    });
  });

  describe('checkSMS', () => {
    it('should successfully check SMS', async () => {
      axiosMock.request.mockResolvedValue({ data: mockSMSResponse });
      
      const response = await smsProvider.checkSMS('123');
      
      expect(response).toEqual(mockSMSResponse);
      expect(axiosMock.request).toHaveBeenCalledWith({
        url: `${mockConfig.baseUrl}/numbers/123/sms`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
    });

    it('should return null when no SMS received', async () => {
      axiosMock.request.mockResolvedValue({ data: null });
      
      const response = await smsProvider.checkSMS('123');
      
      expect(response).toBeNull();
    });
  });

  describe('releaseNumber', () => {
    it('should successfully release a number', async () => {
      axiosMock.request.mockResolvedValue({ data: {} });
      
      await smsProvider.releaseNumber('123');
      
      expect(axiosMock.request).toHaveBeenCalledWith({
        url: `${mockConfig.baseUrl}/numbers/123`,
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${mockConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('getNumberStatus', () => {
    it('should successfully get number status', async () => {
      axiosMock.request.mockResolvedValue({ data: mockNumberResponse });
      
      const response = await smsProvider.getNumberStatus('123');
      
      expect(response).toEqual(mockNumberResponse);
    });
  });

  describe('getServices', () => {
    it('should successfully get available services', async () => {
      const mockServices = ['whatsapp', 'telegram', 'instagram'];
      axiosMock.request.mockResolvedValue({ data: mockServices });
      
      const response = await smsProvider.getServices();
      
      expect(response).toEqual(mockServices);
    });
  });

  describe('getCountries', () => {
    it('should successfully get countries for a service', async () => {
      const mockCountries = ['US', 'UK', 'CA'];
      axiosMock.request.mockResolvedValue({ data: mockCountries });
      
      const response = await smsProvider.getCountries('whatsapp');
      
      expect(response).toEqual(mockCountries);
    });
  });

  describe('getPrices', () => {
    it('should successfully get price for a service and country', async () => {
      const mockPrice = 1.99;
      axiosMock.request.mockResolvedValue({ data: mockPrice });
      
      const response = await smsProvider.getPrices('whatsapp', 'US');
      
      expect(response).toBe(mockPrice);
    });
  });
});
