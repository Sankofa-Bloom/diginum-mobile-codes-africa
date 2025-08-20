const { Collections } = require('mtn-momo');

let momoClient = null;

/**
 * Get or create MTN MoMo client instance
 * @returns {Collections} MoMo client instance
 */
function getMomoClient() {
  if (!momoClient) {
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
