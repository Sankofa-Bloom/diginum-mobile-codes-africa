import axios from 'axios';

interface SMSProviderConfig {
  apiKey: string;
  baseUrl: string;
}

export interface NumberRequest {
  service: string;
  country: number; // Country code as per SMS-Activate documentation
  operator?: string; // Optional operator
  maxPrice?: number; // Optional maximum price
}

export interface NumberResponse {
  id: string;
  phoneNumber: string;
  country: number;
  service: string;
  status: 'pending' | 'active' | 'completed' | 'canceled';
  expiresAt: string;
}

export interface SMSResponse {
  code: string;
  receivedAt: string;
}

export class SMSProvider {
  private config: SMSProviderConfig;

  constructor(config: SMSProviderConfig) {
    this.config = config;
  }

  private async request(params: { [key: string]: any }): Promise<any> {
    try {
      const response = await axios.get(this.config.baseUrl, {
        params: {
          ...params,
          api_key: this.config.apiKey,
          lang: 'en'
        }
      });
      return response.data;
    } catch (error) {
      console.error('SMS Provider Error:', error);
      throw error;
    }
  }

  async rentNumber(request: NumberRequest): Promise<NumberResponse> {
    const response = await this.request({
      action: 'getNumber',
      service: request.service,
      country: request.country,
      operator: request.operator,
      maxPrice: request.maxPrice
    });

    if (response.startsWith('NO_BALANCE')) {
      throw new Error('Insufficient balance');
    }
    if (response.startsWith('NO_NUMBERS')) {
      throw new Error('No numbers available');
    }
    if (response.startsWith('WRONG_MAX_PRICE')) {
      throw new Error('Maximum price too low');
    }

    const [_, id, phoneNumber] = response.split(':');
    return {
      id,
      phoneNumber,
      country: request.country,
      service: request.service,
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes expiry
    };
  }

  async checkSMS(numberId: string): Promise<SMSResponse | null> {
    const response = await this.request({
      action: 'getStatus',
      id: numberId
    });

    if (response === 'STATUS_WAIT_CODE') {
      return null;
    }
    if (response === 'STATUS_CANCEL') {
      return null;
    }
    if (response.startsWith('STATUS_OK')) {
      const code = response.split(':')[1];
      return {
        code,
        receivedAt: new Date().toISOString()
      };
    }

    throw new Error('Invalid SMS status response');
  }

  async releaseNumber(numberId: string): Promise<void> {
    await this.request({
      action: 'setStatus',
      id: numberId,
      status: 6 // Complete activation
    });
  }

  async getNumberStatus(numberId: string): Promise<NumberResponse> {
    const response = await this.request({
      action: 'getStatus',
      id: numberId
    });

    let status: 'pending' | 'active' | 'completed' | 'canceled';
    if (response === 'STATUS_WAIT_CODE') {
      status = 'pending';
    } else if (response === 'STATUS_CANCEL') {
      status = 'canceled';
    } else if (response.startsWith('STATUS_OK')) {
      status = 'completed';
    } else {
      throw new Error('Invalid status response');
    }

    return {
      id: numberId,
      phoneNumber: '', // Will be fetched from DB
      country: 0, // Will be fetched from DB
      service: '', // Will be fetched from DB
      status,
      expiresAt: new Date().toISOString()
    };
  }

  async getServices(): Promise<string[]> {
    // Get services from SMS-Activate API
    const response = await this.request({
      action: 'getServicesAndCost'
    });
    
    return Object.keys(response.services);
  }

  async getCountries(service: string): Promise<{ code: number; name: string }[]> {
    // Get countries from SMS-Activate API
    const response = await this.request({
      action: 'getServicesAndCost'
    });
    
    const serviceData = response.services[service];
    return Object.entries(serviceData).map(([countryCode, countryData]) => ({
      code: parseInt(countryCode),
      name: countryData.name
    }));
  }

  async getPrices(service: string, country: number): Promise<number> {
    const response = await this.request({
      action: 'getServicesAndCost'
    });
    
    return response.services[service][country.toString()].cost;
  }
}
