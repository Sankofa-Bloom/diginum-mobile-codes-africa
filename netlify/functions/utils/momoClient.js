const { create } = require('mtn-momo');

let momoClient = null;

/**
 * Get or create MTN MoMo client instance
 * @returns {Object} MoMo client instance
 */
function getMomoClient() {
  if (!momoClient) {
    try {
      // Use the create function to initialize Collections client
      const callbackUrl = process.env.MTN_MOMO_CALLBACK_URL;
      const callbackHost = callbackUrl ? new URL(callbackUrl).hostname : 'diginum.netlify.app';
      
      momoClient = create({
        product: 'collection',
        environment: process.env.MTN_MOMO_ENVIRONMENT || 'sandbox',
        primaryKey: process.env.MTN_MOMO_API_KEY,
        userSecret: process.env.MTN_MOMO_API_SECRET,
        userId: process.env.MTN_MOMO_USER_ID,
        callbackHost: callbackHost,
        callbackUrl: callbackUrl
      });
      
      console.log('MoMo client created successfully');
      console.log('Client keys:', Object.keys(momoClient));
      console.log('Client type:', typeof momoClient);
      
      // Try different ways to find the requestToPay method
      if (momoClient.requestToPay) {
        console.log('requestToPay found directly on client');
      } else if (momoClient.collection && momoClient.collection.requestToPay) {
        console.log('requestToPay found on client.collection');
        momoClient = momoClient.collection;
      } else if (momoClient.collections && momoClient.collections.requestToPay) {
        console.log('requestToPay found on client.collections');
        momoClient = momoClient.collections;
      } else {
        // Let's try to find any method that might be the payment method
        const allMethods = [];
        
        function findMethods(obj, prefix = '') {
          if (!obj || typeof obj !== 'object') return;
          
          Object.keys(obj).forEach(key => {
            const value = obj[key];
            const fullKey = prefix ? `${prefix}.${key}` : key;
            
            if (typeof value === 'function') {
              allMethods.push(fullKey);
            } else if (typeof value === 'object' && value !== null) {
              findMethods(value, fullKey);
            }
          });
        }
        
        findMethods(momoClient);
        console.log('All available methods:', allMethods);
        
        // Common alternatives for requestToPay
        const alternatives = [
          'pay', 'requestPayment', 'charge', 'createPayment', 
          'requestToPay', 'request_to_pay', 'requestToPayV2'
        ];
        
        for (const alt of alternatives) {
          if (allMethods.includes(alt)) {
            console.log(`Found alternative method: ${alt}`);
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error creating MoMo client:', error);
      throw error;
    }
  }
  return momoClient;
}

module.exports = {
  getMomoClient
};
