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
      momoClient = create({
        product: 'collection',
        environment: process.env.MTN_MOMO_ENVIRONMENT || 'sandbox',
        primaryKey: process.env.MTN_MOMO_API_KEY,
        userSecret: process.env.MTN_MOMO_API_SECRET,
        userId: process.env.MTN_MOMO_USER_ID,
        callbackUrl: process.env.MTN_MOMO_CALLBACK_URL
      });
      
      console.log('MoMo client created successfully. Available methods:', Object.keys(momoClient));
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
