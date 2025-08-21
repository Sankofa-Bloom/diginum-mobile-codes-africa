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
      
      console.log('MoMo client created successfully. Available methods:', Object.keys(momoClient));
      
      // Check if client has collection property
      if (momoClient.collection) {
        console.log('Found collection property. Collection methods:', Object.keys(momoClient.collection));
        // Return the collection instead of the main client
        momoClient = momoClient.collection;
      } else if (momoClient.collections) {
        console.log('Found collections property. Collections methods:', Object.keys(momoClient.collections));
        // Return the collections instead of the main client
        momoClient = momoClient.collections;
      } else {
        console.log('No collection/collections property found. Client methods:', Object.keys(momoClient));
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
