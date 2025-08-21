const MtnMomo = require('mtn-momo');

let momoClient = null;

/**
 * Get or create MTN MoMo client instance
 * @returns {Object} MoMo client instance
 */
function getMomoClient() {
  if (!momoClient) {
    console.log('MTN MoMo module structure:', Object.keys(MtnMomo));
    
    // Try different ways to access Collections
    const Collections = MtnMomo.Collections || MtnMomo.default?.Collections || MtnMomo;
    
    if (typeof Collections !== 'function') {
      console.error('Collections is not a constructor. Available methods:', Object.keys(Collections || {}));
      throw new Error('Collections is not a constructor. Available: ' + Object.keys(Collections || {}).join(', '));
    }
    
    // Initialize client with environment variables
    momoClient = new Collections({
      callbackUrl: process.env.MTN_MOMO_CALLBACK_URL,
      baseUrl: process.env.MTN_MOMO_ENVIRONMENT === 'production'
        ? 'https://momodeveloper.mtn.com'
        : 'https://sandbox.momodeveloper.mtn.com',
      userSecret: process.env.MTN_MOMO_API_SECRET,
      userId: process.env.MTN_MOMO_USER_ID,
      primaryKey: process.env.MTN_MOMO_API_KEY
    });
  }
  return momoClient;
}

module.exports = {
  getMomoClient
};
