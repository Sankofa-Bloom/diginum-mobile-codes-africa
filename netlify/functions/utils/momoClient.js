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
      
      console.log('MoMo client created successfully. Keys:', Object.keys(momoClient));
      
      // Based on the debugging info, we need to use the Collections property
      if (momoClient.Collections) {
        console.log('Using Collections client for payment operations');
        const collectionsClient = momoClient.Collections;
        console.log('Collections client type:', typeof collectionsClient);
        console.log('Collections client keys:', Object.keys(collectionsClient));
        
        // Check if it's a function that needs to be called
        if (typeof collectionsClient === 'function') {
          console.log('Collections is a function, calling it...');
          momoClient = collectionsClient();
          console.log('Collections() result keys:', Object.keys(momoClient));
        } else {
          momoClient = collectionsClient;
        }
        
        // Final check for requestToPay
        console.log('Final client has requestToPay?', typeof momoClient.requestToPay);
        if (!momoClient.requestToPay) {
          const methods = Object.keys(momoClient).filter(key => typeof momoClient[key] === 'function');
          throw new Error(`requestToPay still not found on Collections. Available methods: ${methods.join(', ')}`);
        }
      } else {
        throw new Error('Collections client not found in mtn-momo response');
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
