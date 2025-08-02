
import rateLimit from '@fastify/rate-limit';
import { requireAuth } from './auth.js';
import securityMiddleware from './middleware/security.js';
import { supabase } from './supabase.js';

/**
 * Registers all DigiNum API routes on the provided Fastify instance.
 * @param {import('fastify').FastifyInstance} fastify 
 * @param {object} opts 
 */
export default async function routes(fastify, opts) {
  // Configure rate limiting
  await fastify.register(rateLimit, {
    max: 100, // limit each IP to 100 requests per time window
    timeWindow: '1 hour', // time window for rate limiting
    keyGenerator: (request) => request.ip, // use IP address for rate limiting
  });
  
  // Register security middleware
  await fastify.register(securityMiddleware);

  // Error handling middleware
  fastify.setErrorHandler((error, request, reply) => {
    if (error.statusCode) {
      reply.code(error.statusCode);
    } else if (error instanceof Error) {
      reply.code(500);
    } else {
      reply.code(400);
    }
  });

  // SMS Provider API Configuration
  const SMS_API_BASE_URL = 'https://sms-verification-number.com/stubs/handler_api';
  const SMS_API_KEY = process.env.SMS_API_KEY || 'your-sms-api-key'; // Add this to your .env file
  const SMS_LANG = 'en'; // Use 'en' for English/dollars or 'ru' for Russian/rubles

  // Helper function to make SMS API calls
  const callSmsApi = async (action, params = {}) => {
    const url = new URL(SMS_API_BASE_URL);
    url.searchParams.append('api_key', SMS_API_KEY);
    url.searchParams.append('action', action);
    url.searchParams.append('lang', SMS_LANG);
    
    // Add additional parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    try {
      const response = await fetch(url.toString());
      const data = await response.text();
      
      // Try to parse as JSON, fallback to text
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    } catch (error) {
      console.error(`SMS API Error (${action}):`, error);
      throw new Error(`SMS API call failed: ${error.message}`);
    }
  };

  // Auth routes
  fastify.post('/api/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 }
        }
      }
    },
    attachValidation: true
  }, async (request, reply) => {
    try {
      if (request.validationError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: request.validationError.validation
        });
      }

      const { email, password } = request.body;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      fastify.log.error('Login error:', error);
      throw error;
    }
  });

  // Handle both /signup and /register for backward compatibility
  const handleSignup = async (request, reply) => {
    try {
      const { email, password } = request.body;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      fastify.log.error('Registration error:', error);
      throw error;
    }
  };

  // Logout endpoint
  fastify.post('/api/auth/logout', async (request, reply) => {
    try {
      // Clear any session tokens
      reply.clearCookie('sb-access-token');
      reply.clearCookie('sb-refresh-token');
      
      // Invalidate the session on the client side
      reply.header('Clear-Site-Data', '"cookies", "storage", "executionContexts"');
      
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      fastify.log.error('Logout error:', error);
      throw new Error('Failed to log out');
    }
  });

  // Register both endpoints pointing to the same handler
  fastify.post('/auth/signup', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 }
        }
      }
    },
    attachValidation: true
  }, handleSignup);

  fastify.post('/auth/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 }
        }
      }
    },
    attachValidation: true
  }, handleSignup);

  // Get available countries from SMS provider
  fastify.get('/countries', async (request, reply) => {
    try {
      const countriesData = await callSmsApi('getCountryAndOperators');
      
      // Transform the SMS provider data to match our format
      const countries = countriesData.map(country => ({
        id: country.id.toString(),
        name: country.name,
        code: getCountryCode(country.name), // Helper function to get country code
        operators: country.operators
      }));

      return reply.code(200).send(countries);
    } catch (error) {
      fastify.log.error('Error fetching countries:', error);
      
      // Fallback to hardcoded countries if API fails
      const fallbackCountries = [
        { id: '0', name: 'Russia', code: '+7' },
        { id: '1', name: 'Ukraine', code: '+380' },
        { id: '2', name: 'Kazakhstan', code: '+7' },
        { id: '3', name: 'China', code: '+86' },
        { id: '4', name: 'Philippines', code: '+63' },
        { id: '5', name: 'Myanmar', code: '+95' },
        { id: '6', name: 'Indonesia', code: '+62' },
        { id: '7', name: 'Malaysia', code: '+60' },
        { id: '8', name: 'Kenya', code: '+254' },
        { id: '9', name: 'Tanzania', code: '+255' },
        { id: '10', name: 'Vietnam', code: '+84' },
        { id: '11', name: 'Kyrgyzstan', code: '+996' },
        { id: '12', name: 'USA (Virtual)', code: '+1' },
        { id: '13', name: 'Israel', code: '+972' },
        { id: '14', name: 'Hong Kong (China)', code: '+852' },
        { id: '15', name: 'Poland', code: '+48' },
        { id: '16', name: 'England (UK)', code: '+44' },
        { id: '17', name: 'Madagascar', code: '+261' },
        { id: '18', name: 'Congo', code: '+242' },
        { id: '19', name: 'Nigeria', code: '+234' },
        { id: '20', name: 'Macau', code: '+853' },
        { id: '21', name: 'Egypt', code: '+20' },
        { id: '22', name: 'India', code: '+91' },
        { id: '23', name: 'Ireland', code: '+353' },
        { id: '24', name: 'Cambodia', code: '+855' },
        { id: '25', name: 'Laos', code: '+856' },
        { id: '26', name: 'Haiti', code: '+509' },
        { id: '27', name: 'Côte d\'Ivoire', code: '+225' },
        { id: '28', name: 'Gambia', code: '+220' },
        { id: '29', name: 'Serbia', code: '+381' },
        { id: '30', name: 'Yemen', code: '+967' },
        { id: '31', name: 'South Africa', code: '+27' },
        { id: '32', name: 'Romania', code: '+40' },
        { id: '33', name: 'Colombia', code: '+57' },
        { id: '34', name: 'Estonia', code: '+372' },
        { id: '35', name: 'Azerbaijan', code: '+994' },
        { id: '36', name: 'Canada (virtual)', code: '+1' },
        { id: '37', name: 'Morocco', code: '+212' },
        { id: '38', name: 'Ghana', code: '+233' },
        { id: '39', name: 'Argentina', code: '+54' },
        { id: '40', name: 'Uzbekistan', code: '+998' },
        { id: '41', name: 'Cameroon', code: '+237' },
        { id: '42', name: 'Chad', code: '+235' },
        { id: '43', name: 'Germany', code: '+49' },
        { id: '44', name: 'Lithuania', code: '+370' },
        { id: '45', name: 'Croatia', code: '+385' },
        { id: '46', name: 'Sweden', code: '+46' },
        { id: '47', name: 'Iraq', code: '+964' },
        { id: '48', name: 'Netherlands', code: '+31' },
        { id: '49', name: 'Latvia', code: '+371' },
        { id: '50', name: 'Austria', code: '+43' },
        { id: '51', name: 'Belarus', code: '+375' },
        { id: '52', name: 'Thailand', code: '+66' },
        { id: '53', name: 'Saudi Arabia', code: '+966' },
        { id: '54', name: 'Mexico', code: '+52' },
        { id: '55', name: 'Taiwan', code: '+886' },
        { id: '56', name: 'Spain', code: '+34' },
        { id: '57', name: 'Iran', code: '+98' },
        { id: '58', name: 'Algeria', code: '+213' },
        { id: '59', name: 'Slovenia', code: '+386' },
        { id: '60', name: 'Bangladesh', code: '+880' },
        { id: '61', name: 'Senegal', code: '+221' },
        { id: '62', name: 'Turkey', code: '+90' },
        { id: '63', name: 'Czech Republic', code: '+420' },
        { id: '64', name: 'Sri Lanka', code: '+94' },
        { id: '65', name: 'Peru', code: '+51' },
        { id: '66', name: 'Pakistan', code: '+92' },
        { id: '67', name: 'New Zealand', code: '+64' },
        { id: '68', name: 'Guinea', code: '+224' },
        { id: '69', name: 'Mali', code: '+223' },
        { id: '70', name: 'Venezuela', code: '+58' },
        { id: '71', name: 'Ethiopia', code: '+251' },
        { id: '72', name: 'Mongolia', code: '+976' },
        { id: '73', name: 'Brazil', code: '+55' },
        { id: '74', name: 'Afghanistan', code: '+93' },
        { id: '75', name: 'Uganda', code: '+256' },
        { id: '76', name: 'Angola', code: '+244' },
        { id: '77', name: 'Cyprus', code: '+357' },
        { id: '78', name: 'France', code: '+33' },
        { id: '79', name: 'Guinea', code: '+224' },
        { id: '80', name: 'Mozambique', code: '+258' },
        { id: '81', name: 'Nepal', code: '+977' },
        { id: '82', name: 'Belgium', code: '+32' },
        { id: '83', name: 'Bulgaria', code: '+359' },
        { id: '84', name: 'Hungary', code: '+36' },
        { id: '85', name: 'Moldova', code: '+373' },
        { id: '86', name: 'Italy', code: '+39' },
        { id: '87', name: 'Paraguay', code: '+595' },
        { id: '88', name: 'Honduras', code: '+504' },
        { id: '89', name: 'Tunisia', code: '+216' },
        { id: '90', name: 'Nicaragua', code: '+505' },
        { id: '91', name: 'Timor-Leste', code: '+670' },
        { id: '92', name: 'Bolivia', code: '+591' },
        { id: '93', name: 'Costa Rica', code: '+506' },
        { id: '94', name: 'Guatemala', code: '+502' },
        { id: '95', name: 'UNITED ARAB EMIRATES', code: '+971' },
        { id: '96', name: 'Zimbabwe', code: '+263' },
        { id: '97', name: 'Puerto Rico', code: '+1' },
        { id: '98', name: 'Sudan', code: '+249' },
        { id: '99', name: 'Togo', code: '+228' },
        { id: '100', name: 'Kuwait', code: '+965' },
        { id: '101', name: 'El Salvador', code: '+503' },
        { id: '102', name: 'Libya', code: '+218' },
        { id: '103', name: 'Jamaica', code: '+1' },
        { id: '104', name: 'Trinidad and Tobago', code: '+1' },
        { id: '105', name: 'Ecuador', code: '+593' },
        { id: '106', name: 'Swaziland', code: '+268' },
        { id: '107', name: 'Oman', code: '+968' },
        { id: '108', name: 'Bosnia and Herzegovina', code: '+387' },
        { id: '109', name: 'Dominican Republic', code: '+1' },
        { id: '111', name: 'Qatar', code: '+974' },
        { id: '112', name: 'Panama', code: '+507' },
        { id: '113', name: 'Cuba', code: '+53' },
        { id: '114', name: 'Mauritania', code: '+222' },
        { id: '115', name: 'Sierra Leone', code: '+232' },
        { id: '116', name: 'Jordan', code: '+962' },
        { id: '117', name: 'Portugal', code: '+351' },
        { id: '118', name: 'Barbados', code: '+1' },
        { id: '119', name: 'Burundi', code: '+257' },
        { id: '120', name: 'Benin', code: '+229' },
        { id: '121', name: 'Brunei', code: '+673' },
        { id: '122', name: 'Bahamas', code: '+1' },
        { id: '123', name: 'Botswana', code: '+267' },
        { id: '124', name: 'Belize', code: '+501' },
        { id: '125', name: 'CAR', code: '+236' },
        { id: '126', name: 'Dominica', code: '+1' },
        { id: '127', name: 'Grenada', code: '+1' },
        { id: '128', name: 'Georgia', code: '+995' },
        { id: '129', name: 'Greece', code: '+30' },
        { id: '130', name: 'Guinea-Bissau', code: '+245' },
        { id: '131', name: 'Guyana', code: '+592' },
        { id: '132', name: 'Iceland', code: '+354' },
        { id: '133', name: 'Comoros', code: '+269' },
        { id: '134', name: 'St. Kitts and Nevis', code: '+1' },
        { id: '135', name: 'Liberia', code: '+231' },
        { id: '136', name: 'Lesotho', code: '+266' },
        { id: '137', name: 'Malawi', code: '+265' },
        { id: '138', name: 'Namibia', code: '+264' },
        { id: '139', name: 'Niger', code: '+227' },
        { id: '140', name: 'Rwanda', code: '+250' },
        { id: '141', name: 'Slovakia', code: '+421' },
        { id: '142', name: 'Suriname', code: '+597' },
        { id: '143', name: 'Tajikistan', code: '+992' },
        { id: '144', name: 'Monaco', code: '+377' },
        { id: '145', name: 'Bahrain', code: '+973' },
        { id: '146', name: 'Reunion', code: '+262' },
        { id: '147', name: 'Zambia', code: '+260' },
        { id: '148', name: 'Armenia', code: '+374' },
        { id: '149', name: 'Somalia', code: '+252' },
        { id: '150', name: 'Congo', code: '+242' },
        { id: '151', name: 'Chile', code: '+56' },
        { id: '152', name: 'Burkina Faso', code: '+226' },
        { id: '153', name: 'Lebanon', code: '+961' },
        { id: '154', name: 'Gabon', code: '+241' },
        { id: '155', name: 'Albania', code: '+355' },
        { id: '156', name: 'Uruguay', code: '+598' },
        { id: '157', name: 'Mauritius', code: '+230' },
        { id: '158', name: 'Bhutan', code: '+975' },
        { id: '159', name: 'Maldives', code: '+960' },
        { id: '160', name: 'Guadeloupe', code: '+590' },
        { id: '161', name: 'Turkmenistan', code: '+993' },
        { id: '162', name: 'French Guiana', code: '+594' },
        { id: '163', name: 'Finland', code: '+358' },
        { id: '164', name: 'St. Lucia', code: '+1' },
        { id: '165', name: 'Luxembourg', code: '+352' },
        { id: '166', name: 'Saint Pierre and Miquelon', code: '+508' },
        { id: '167', name: 'Equatorial Guinea', code: '+240' },
        { id: '168', name: 'Djibouti', code: '+253' },
        { id: '169', name: 'Saint Kitts and Nevis', code: '+1' },
        { id: '170', name: 'Cayman Islands', code: '+1' },
        { id: '171', name: 'Montenegro', code: '+382' },
        { id: '172', name: 'Denmark', code: '+45' },
        { id: '173', name: 'Switzerland', code: '+41' },
        { id: '174', name: 'Norway', code: '+47' },
        { id: '175', name: 'Australia', code: '+61' },
        { id: '176', name: 'Eritrea', code: '+291' },
        { id: '177', name: 'South Sudan', code: '+211' },
        { id: '178', name: 'Sao Tome and Principe', code: '+239' },
        { id: '179', name: 'Aruba', code: '+297' },
        { id: '180', name: 'Montserrat', code: '+1' },
        { id: '181', name: 'Anguilla', code: '+1' },
        { id: '183', name: 'Northern Macedonia', code: '+389' },
        { id: '184', name: 'Republic of Seychelles', code: '+248' },
        { id: '185', name: 'New Caledonia', code: '+687' },
        { id: '186', name: 'Cape Verde', code: '+238' },
        { id: '187', name: 'USA (Real)', code: '+1' },
        { id: '188', name: 'Palestine', code: '+970' },
        { id: '189', name: 'Fiji', code: '+679' },
        { id: '190', name: 'South Korea', code: '+82' },
        { id: '192', name: 'Western Sahara', code: '+212' },
        { id: '193', name: 'Solomon Islands', code: '+677' },
        { id: '196', name: 'Singapore', code: '+65' },
        { id: '197', name: 'Tonga', code: '+676' },
        { id: '198', name: 'American Samoa', code: '+1' },
        { id: '199', name: 'Malta', code: '+356' },
        { id: '666', name: 'Gibraltar', code: '+350' },
        { id: '668', name: 'Bermuda', code: '+1' },
        { id: '670', name: 'Japan', code: '+81' },
        { id: '672', name: 'Syria', code: '+963' },
        { id: '673', name: 'Faroe Islands', code: '+298' },
        { id: '674', name: 'Martinique', code: '+596' },
        { id: '675', name: 'Turks and Caicos Islands', code: '+1' },
        { id: '676', name: 'St. Barthélemy', code: '+590' },
        { id: '678', name: 'Nauru', code: '+674' },
        { id: '680', name: 'Curaçao', code: '+599' },
        { id: '681', name: 'Samoa', code: '+685' },
        { id: '682', name: 'Vanuatu', code: '+678' },
        { id: '683', name: 'Greenland', code: '+299' },
        { id: '684', name: 'Kosovo', code: '+383' },
        { id: '685', name: 'Liechtenstein', code: '+423' },
        { id: '686', name: 'Sint Maarten', code: '+1' },
        { id: '687', name: 'Niue', code: '+683' }
      ];
      
      return reply.code(200).send(fallbackCountries);
    }
  });

  // Get services for a country
  // Get services for a specific country from SMS provider
  fastify.get('/services/:countryId', async (request, reply) => {
    const { countryId } = request.params;
    
    // For now, always use fallback services since we don't have a real SMS API key
    // This ensures users can test the functionality
    // All prices include a $2 markup on top of the base SMS provider cost
    const fallbackServices = [
      { id: 'wa', name: 'WhatsApp', description: 'WhatsApp verification', price: 7.99, countryId: countryId, available: true },
      { id: 'ig', name: 'Instagram', description: 'Instagram verification', price: 9.99, countryId: countryId, available: true },
      { id: 'tg', name: 'Telegram', description: 'Telegram verification', price: 6.99, countryId: countryId, available: true },
      { id: 'fb', name: 'Facebook', description: 'Facebook verification', price: 8.99, countryId: countryId, available: true },
      { id: 'tw', name: 'Twitter', description: 'Twitter verification', price: 10.99, countryId: countryId, available: true },
      { id: 'vk', name: 'VKontakte', description: 'VKontakte verification', price: 5.99, countryId: countryId, available: true },
      { id: 'ok', name: 'Odnoklassniki', description: 'Odnoklassniki verification', price: 6.49, countryId: countryId, available: true },
      { id: 'mb', name: 'Yahoo', description: 'Yahoo verification', price: 8.49, countryId: countryId, available: true },
      { id: 'am', name: 'Amazon', description: 'Amazon verification', price: 10.49, countryId: countryId, available: true },
      { id: 'nf', name: 'Netflix', description: 'Netflix verification', price: 11.99, countryId: countryId, available: true },
      { id: 'sp', name: 'Spotify', description: 'Spotify verification', price: 7.49, countryId: countryId, available: true },
      { id: 'ub', name: 'Uber', description: 'Uber verification', price: 9.49, countryId: countryId, available: true },
      { id: 'ly', name: 'Lyft', description: 'Lyft verification', price: 8.99, countryId: countryId, available: true },
      { id: 'uk', name: 'Airbnb', description: 'Airbnb verification', price: 10.99, countryId: countryId, available: true },
      { id: 'ts', name: 'PayPal', description: 'PayPal verification', price: 11.49, countryId: countryId, available: true },
      { id: 'it', name: 'CashApp', description: 'CashApp verification', price: 8.99, countryId: countryId, available: true },
      { id: 'ge', name: 'Paytm', description: 'Paytm verification', price: 6.99, countryId: countryId, available: true },
      { id: 'ka', name: 'Shopee', description: 'Shopee verification', price: 7.99, countryId: countryId, available: true },
      { id: 'dl', name: 'Lazada', description: 'Lazada verification', price: 7.49, countryId: countryId, available: true },
      { id: 'fl', name: 'Flipkart', description: 'Flipkart verification', price: 6.99, countryId: countryId, available: true },
      { id: 'xd', name: 'Tokopedia', description: 'Tokopedia verification', price: 7.49, countryId: countryId, available: true },
      { id: 'mt', name: 'Steam', description: 'Steam verification', price: 9.99, countryId: countryId, available: true },
      { id: 'hb', name: 'Twitch', description: 'Twitch verification', price: 8.99, countryId: countryId, available: true },
      { id: 'mm', name: 'Microsoft', description: 'Microsoft verification', price: 10.99, countryId: countryId, available: true },
      { id: 'wx', name: 'Apple', description: 'Apple verification', price: 11.99, countryId: countryId, available: true },
      { id: 'an', name: 'Adidas', description: 'Adidas verification', price: 6.99, countryId: countryId, available: true },
      { id: 'ew', name: 'Nike', description: 'Nike verification', price: 7.99, countryId: countryId, available: true },
      { id: 'bo', name: 'Wise', description: 'Wise verification', price: 9.99, countryId: countryId, available: true },
      { id: 'nc', name: 'Payoneer', description: 'Payoneer verification', price: 10.99, countryId: countryId, available: true },
      { id: 're', name: 'Coinbase', description: 'Coinbase verification', price: 11.99, countryId: countryId, available: true },
      { id: 'on', name: 'Binance', description: 'Binance verification', price: 10.49, countryId: countryId, available: true },
      { id: 'dr', name: 'ChatGPT', description: 'ChatGPT verification', price: 8.99, countryId: countryId, available: true },
      { id: 'ai', name: 'CELEBe', description: 'CELEBe verification', price: 7.99, countryId: countryId, available: true }
    ];
    
    return reply.code(200).send(fallbackServices);
    
    /* 
    // TODO: Uncomment this when you have a real SMS API key
    try {
      // Get services and costs for the country from SMS provider
      const servicesData = await callSmsApi('getServicesAndCost', {
        country: countryId
      });

      // Transform the data to match our format
      const services = [];
      for (const [serviceCode, serviceData] of Object.entries(servicesData)) {
        if (typeof serviceData === 'object' && serviceData.cost) {
          services.push({
            id: serviceCode,
            name: getServiceName(serviceCode), // Helper function to get service name
            description: `SMS verification for ${getServiceName(serviceCode)}`,
            price: parseFloat(serviceData.cost) + 2.00, // Add $2 markup to all prices
            countryId: countryId,
            available: serviceData.count > 0
          });
        }
      }

      return reply.code(200).send(services);
    } catch (error) {
      fastify.log.error('Error fetching services:', error);
      return reply.code(200).send(fallbackServices);
    }
    */
  });

  // Generate phone number using SMS provider
  fastify.post('/generate-number', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { serviceId, countryId } = request.body;
      const userId = request.user.sub;
      
      if (!serviceId || !countryId) {
        return reply.code(400).send({ error: 'Service ID and Country ID are required' });
      }

      // Get service price from SMS provider and add $2 markup
      const pricesData = await callSmsApi('getServicesAndCost', {
        country: countryId,
        service: serviceId
      });

      const baseServicePrice = pricesData[serviceId]?.cost;
      if (!baseServicePrice) {
        return reply.code(400).send({ error: 'Service not available' });
      }

      // Add $2 markup to all service prices
      const servicePrice = parseFloat(baseServicePrice) + 2.00;

      // Check if user has sufficient balance
      const balanceCheck = await checkBalance(userId, servicePrice);
      if (!balanceCheck.hasBalance) {
        return reply.code(402).send({ 
          error: 'Insufficient balance',
          currentBalance: balanceCheck.currentBalance,
          requiredAmount: servicePrice,
          shortfall: servicePrice - balanceCheck.currentBalance
        });
      }

      // Order number from SMS provider
      const orderData = await callSmsApi('getNumber', {
        country: countryId,
        service: serviceId
      });

      if (orderData.startsWith('ACCESS_NUMBER:')) {
        const [, phoneNumber, orderId] = orderData.split(':');
        
        // Deduct balance
        const deduction = await deductBalance(userId, servicePrice);
        if (!deduction.success) {
          return reply.code(500).send({ error: 'Failed to process payment' });
        }

        // Set expiration time (20 minutes from now)
        const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

        // Create order in our database
        const { data: order, error: orderError } = await fastify.supabase
          .from('orders')
          .insert([{
            user_id: userId,
            service_id: serviceId,
            country_id: countryId,
            phone_number: phoneNumber,
            sms_order_id: orderId, // Store SMS provider order ID
            status: 'pending',
            expires_at: expiresAt.toISOString(),
            amount_paid: servicePrice,
            created_at: new Date().toISOString(),
          }])
          .select()
          .single();

        if (orderError) {
          fastify.log.error('Error creating order:', orderError);
          return reply.code(500).send({ error: 'Failed to create order' });
        }

        return reply.code(200).send({
          orderId: order.id,
          phoneNumber: phoneNumber,
          expiresAt: expiresAt.toISOString(),
          timeRemaining: 20 * 60,
          amountPaid: servicePrice,
          newBalance: deduction.newBalance,
          message: 'Phone number generated successfully'
        });
      } else {
        // Handle SMS provider errors
        return reply.code(400).send({ error: `SMS provider error: ${orderData}` });
      }
    } catch (error) {
      fastify.log.error('Error generating number:', error);
      return reply.code(500).send({ error: 'Failed to generate phone number' });
    }
  });

  // Check number status and remaining time
  fastify.get('/number-status/:orderId', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { orderId } = request.params;
      const userId = request.user.sub;

      // Get the order
      const { data: order, error: orderError } = await fastify.supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', userId)
        .single();

      if (orderError || !order) {
        return reply.code(404).send({ error: 'Order not found' });
      }

      // Check if number has expired
      const now = new Date();
      const expiresAt = new Date(order.expires_at);
      const isExpired = now > expiresAt;
      
      // Calculate remaining time in seconds
      const timeRemaining = isExpired ? 0 : Math.max(0, Math.floor((expiresAt - now) / 1000));

      // Update status if expired
      if (isExpired && order.status !== 'expired') {
        await fastify.supabase
          .from('orders')
          .update({ status: 'expired' })
          .eq('id', orderId);
      }

      return reply.code(200).send({
        orderId: orderId,
        phoneNumber: order.phone_number,
        status: isExpired ? 'expired' : order.status,
        expiresAt: order.expires_at,
        timeRemaining: timeRemaining,
        isExpired: isExpired
      });
    } catch (error) {
      fastify.log.error('Error checking number status:', error);
      return reply.code(500).send({ error: 'Failed to check number status' });
    }
  });

  // Extend number expiration (optional feature)
  fastify.post('/extend-number/:orderId', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { orderId } = request.params;
      const userId = request.user.sub;

      // Get the order
      const { data: order, error: orderError } = await fastify.supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', userId)
        .single();

      if (orderError || !order) {
        return reply.code(404).send({ error: 'Order not found' });
      }

      // Check if already expired
      const now = new Date();
      const expiresAt = new Date(order.expires_at);
      if (now > expiresAt) {
        return reply.code(400).send({ error: 'Number has already expired' });
      }

      // Extend by 10 more minutes
      const newExpiresAt = new Date(expiresAt.getTime() + 10 * 60 * 1000); // 10 minutes

      const { error: updateError } = await fastify.supabase
        .from('orders')
        .update({ 
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        fastify.log.error('Error extending number:', updateError);
        return reply.code(500).send({ error: 'Failed to extend number' });
      }

      const newTimeRemaining = Math.floor((newExpiresAt - now) / 1000);

      return reply.code(200).send({
        orderId: orderId,
        phoneNumber: order.phone_number,
        expiresAt: newExpiresAt.toISOString(),
        timeRemaining: newTimeRemaining,
        message: 'Number extended by 10 minutes'
      });
    } catch (error) {
      fastify.log.error('Error extending number:', error);
      return reply.code(500).send({ error: 'Failed to extend number' });
    }
  });

  // Get verification code from SMS provider
  fastify.get('/verification-code/:orderId', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { orderId } = request.params;
      const userId = request.user.sub;

      // Get the order
      const { data: order, error: orderError } = await fastify.supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', userId)
        .single();

      if (orderError || !order) {
        return reply.code(404).send({ error: 'Order not found' });
      }

      // Check if number has expired
      const now = new Date();
      const expiresAt = new Date(order.expires_at);
      if (now > expiresAt) {
        return reply.code(400).send({ error: 'Phone number has expired' });
      }

      // Get SMS from provider
      const smsData = await callSmsApi('getStatus', {
        id: order.sms_order_id
      });

      if (smsData.startsWith('STATUS_OK:')) {
        const verificationCode = smsData.split(':')[1];
        
        // Update order with verification code
        const { error: updateError } = await fastify.supabase
          .from('orders')
          .update({ 
            verification_code: verificationCode,
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (updateError) {
          fastify.log.error('Error updating order:', updateError);
          return reply.code(500).send({ error: 'Failed to update order' });
        }

        return reply.code(200).send({
          orderId: orderId,
          phoneNumber: order.phone_number,
          verificationCode: verificationCode,
          message: 'Verification code received successfully'
        });
      } else if (smsData === 'STATUS_WAIT_CODE') {
        return reply.code(200).send({
          orderId: orderId,
          phoneNumber: order.phone_number,
          message: 'Waiting for SMS code...'
        });
      } else {
        return reply.code(400).send({ error: `SMS provider error: ${smsData}` });
      }
    } catch (error) {
      fastify.log.error('Error getting verification code:', error);
      return reply.code(500).send({ error: 'Failed to get verification code' });
    }
  });

  // Request another verification code (free for same number)
  fastify.post('/request-another-code/:orderId', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { orderId } = request.params;
      const userId = request.user.sub;

      // Get the order
      const { data: order, error: orderError } = await fastify.supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', userId)
        .single();

      if (orderError || !order) {
        return reply.code(404).send({ error: 'Order not found' });
      }

      // Check if number has expired
      const now = new Date();
      const expiresAt = new Date(order.expires_at);
      if (now > expiresAt) {
        return reply.code(400).send({ error: 'Phone number has expired' });
      }

      // Get latest SMS from provider
      const smsData = await callSmsApi('getStatus', {
        id: order.sms_order_id
      });

      if (smsData.startsWith('STATUS_OK:')) {
        const verificationCode = smsData.split(':')[1];
        
        // Update order with new verification code
        const { error: updateError } = await fastify.supabase
          .from('orders')
          .update({ 
            verification_code: verificationCode,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (updateError) {
          fastify.log.error('Error updating order:', updateError);
          return reply.code(500).send({ error: 'Failed to update verification code' });
        }

        return reply.code(200).send({
          orderId: orderId,
          phoneNumber: order.phone_number,
          verificationCode: verificationCode,
          message: 'New verification code received'
        });
      } else {
        return reply.code(400).send({ error: `SMS provider error: ${smsData}` });
      }
    } catch (error) {
      fastify.log.error('Error requesting another code:', error);
      return reply.code(500).send({ error: 'Failed to request another code' });
    }
  });

  // Buy data route
  fastify.get('/api/buy-data', async (request, reply) => {
    // Implementation for buy-data
    return { message: 'Buy data endpoint' };
  });

  // Buy number route - Currently disabled as SMS provider is not implemented
  fastify.post('/api/buy-number', {
    schema: {
      body: {
        type: 'object',
        required: ['country', 'service'],
        properties: {
          country: { type: 'string' },
          service: { type: 'string' }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      // Return a 501 Not Implemented response
      reply.status(501).send({
        error: 'Not Implemented',
        message: 'Phone number purchasing is currently not available. Please check back later.'
      });
    } catch (error) {
      fastify.log.error('Error in buy-number route:', error);
      throw error;
    }
  });

  // Password reset endpoint
  fastify.post('/api/auth/forgot-password', async (request, reply) => {
    try {
      const { email } = request.body;
      if (!email) {
        return reply.code(400).send({ error: 'Email is required.' });
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`,
      });
      if (error) {
        return reply.code(400).send({ error: error.message });
      }
      return { message: 'Password reset email sent. Please check your inbox.' };
    } catch (err) {
      console.error('Password reset error:', err);
      return reply.code(500).send({ error: 'Failed to send password reset email' });
    }
  });

  // Numbers (list available numbers)
  fastify.get('/api/numbers', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { data, error } = await fastify.supabase
        .from('numbers')
        .select('*')
        .eq('available', true);
      if (error) throw error;
      return data;
    } catch (e) {
      // fallback mock if table doesn't exist
      return [{ id: 1, country: 'CM', service: 'WhatsApp', price: 500 }];
    }
  });

  // Numbers (buy - create order)
  fastify.post('/api/numbers/buy', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { user_id, number_id } = request.body;
      if (!user_id || !number_id) {
        return reply.code(400).send({ error: 'user_id and number_id required' });
      }
      // Mark number as unavailable and create order
      const { error: updateError } = await fastify.supabase
        .from('numbers')
        .update({ available: false })
        .eq('id', number_id);
      if (updateError) throw updateError;
      const { data: order, error: orderError } = await fastify.supabase
        .from('orders')
        .insert([{ user_id, number_id, status: 'pending' }])
        .select()
        .single();
      if (orderError) throw orderError;
      return order;
    } catch (e) {
      return { orderId: 123, status: 'pending', number: '+237612345678', error: e.message };
    }
  });

  // Campay Webhook endpoint
  fastify.post('/api/webhook/campay', async (request, reply) => {
    try {
      const { transactionId, status, amount, currency, phoneNumber, reference } = request.body;
      
      // Verify webhook key
      const webhookKey = request.headers['x-webhook-key'];
      if (!webhookKey || webhookKey !== process.env.CAMPAY_WEBHOOK_KEY) {
        return reply.code(401).send({ error: 'Invalid webhook key' });
      }

      // Find the order associated with this payment
      const { data: order, error: orderError } = await fastify.supabase
        .from('orders')
        .select('*')
        .eq('reference', reference)
        .single();

      // Only accept USD payments
      if (currency !== 'USD') {
        return reply.code(400).send({ error: 'Only USD payments are accepted' });
      }

      if (orderError || !order) {
        console.error('Order not found for reference:', reference);
        return reply.code(404).send({ error: 'Order not found' });
      }

      // Update order status based on payment status
      const newStatus = status === 'completed' ? 'completed' : 'failed';

      // Update order amount with Stripe fees if applicable
      if (status === 'completed') {
        const stripeFee = amount * 0.029 + 0.3;
        const finalAmount = amount + stripeFee;
        await fastify.supabase
          .from('orders')
          .update({ amount: finalAmount })
          .eq('id', order.id);
      }
      const { error: updateError } = await fastify.supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (updateError) {
        console.error('Failed to update order status:', updateError);
        return reply.code(500).send({ error: 'Failed to update order status' });
      }

      // Log the payment details
      console.log('Payment webhook received:', {
        transactionId,
        status,
        amount,
        phoneNumber,
        reference,
        orderId: order.id
      });

      return reply.code(200).send({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Admin routes
  fastify.post('/api/admin/transactions', async (request, reply) => {
    try {
      const { data, error } = await fastify.supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        return reply.code(500).send({ error: 'Failed to fetch transactions' });
      }

      return reply.code(200).send(data);
    } catch (error) {
      console.error('Error in admin transactions route:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Exchange rates management
  fastify.get('/api/admin/exchange-rates', async (request, reply) => {
    try {
      const { data, error } = await fastify.supabase
        .from('exchange_rates')
        .select('*')
        .order('currency');

      if (error) {
        console.error('Error fetching exchange rates:', error);
        return reply.code(500).send({ error: 'Failed to fetch exchange rates' });
      }

      return reply.code(200).send(data);
    } catch (error) {
      console.error('Error in exchange rates route:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/api/admin/exchange-rates', async (request, reply) => {
    try {
      const { currency, rate, markup } = request.body;
      
      if (!currency || !rate) {
        return reply.code(400).send({ error: 'Currency and rate are required' });
      }

      const { data, error } = await fastify.supabase
        .from('exchange_rates')
        .insert([
          {
            currency,
            rate,
            markup: markup || 0,
            updated_at: new Date().toISOString(),
          }
        ])
        .select();

      if (error) {
        console.error('Error updating exchange rate:', error);
        return reply.code(500).send({ error: 'Failed to update exchange rate' });
      }

      return reply.code(200).send(data[0]);
    } catch (error) {
      console.error('Error in update exchange rate route:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Price adjustments management
  fastify.get('/api/admin/price-adjustments', async (request, reply) => {
    try {
      const { data, error } = await fastify.supabase
        .from('price_adjustments')
        .select('*')
        .order('service', { ascending: true })
        .order('country', { ascending: true });

      if (error) {
        console.error('Error fetching price adjustments:', error);
        return reply.code(500).send({ error: 'Failed to fetch price adjustments' });
      }

      return reply.code(200).send(data);
    } catch (error) {
      console.error('Error in price adjustments route:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/api/admin/price-adjustments', async (request, reply) => {
    try {
      const { service, country, markup } = request.body;
      
      if (!service || !country || markup === undefined) {
        return reply.code(400).send({ error: 'Service, country, and markup are required' });
      }

      const { data, error } = await fastify.supabase
        .from('price_adjustments')
        .insert([
          {
            service,
            country,
            markup,
            updated_at: new Date().toISOString(),
          }
        ])
        .select();

      if (error) {
        console.error('Error updating price adjustment:', error);
        return reply.code(500).send({ error: 'Failed to update price adjustment' });
      }

      return reply.code(200).send(data[0]);
    } catch (error) {
      console.error('Error in update price adjustment route:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Numbers (fetch order by ID)
  fastify.get('/api/numbers/:orderId', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { orderId } = request.params;
      const { data, error } = await fastify.supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      return { orderId: request.params.orderId, status: 'active', number: '+237612345678', error: e.message };
    }
  });

  // Payments (wallet top-up, MoMo, status)
  fastify.post('/api/payment/topup', { preHandler: requireAuth }, async (request, reply) => {
    // TODO: Implement wallet top-up
    return { paymentId: 1, status: 'initiated', amount: request.body.amount };
  });
  fastify.post('/api/payment/momo', { preHandler: requireAuth }, async (request, reply) => {
    // TODO: Implement MTN/Orange MoMo payment
    return { paymentId: 2, status: 'pending', provider: request.body.provider };
  });
  fastify.get('/api/payment/status/:paymentId', { preHandler: requireAuth }, async (request, reply) => {
    // TODO: Fetch payment status
    return { paymentId: request.params.paymentId, status: 'completed' };
  });

  // SMS Activation Provider (callback/webhook)
  fastify.post('/api/sms/callback', { preHandler: requireAuth }, async (request, reply) => {
    // TODO: Handle SMS activation provider webhook
    return { received: true };
  });

  // Create new order
  fastify.post('/api/orders', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { serviceId, buyerId, sellerId, price, status } = request.body;
      
      // Validate required fields
      if (!serviceId || !buyerId || !price) {
        return reply.code(400).send({ error: 'Missing required fields: serviceId, buyerId, price' });
      }

      // Create order in database
      const { data, error } = await fastify.supabase
        .from('orders')
        .insert([{
          service_id: serviceId,
          buyer_id: buyerId,
          seller_id: sellerId,
          price: price,
          status: status || 'pending',
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        fastify.log.error('Error creating order:', error);
        return reply.code(500).send({ error: 'Failed to create order' });
      }

      return reply.code(201).send(data);
    } catch (error) {
      fastify.log.error('Error in order creation:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // User Dashboard (list user's numbers/orders)
  fastify.get('/api/dashboard', { preHandler: requireAuth }, async (request, reply) => {
    // Use authenticated user from JWT
    const user_id = request.user.sub; // sub is standard JWT user id field
    if (!user_id) {
      return reply.code(401).send({ error: 'Unauthorized: No user in token' });
    }
    try {
      const { data, error } = await fastify.supabase
        .from('orders')
        .select('*, numbers(*)')
        .eq('user_id', user_id);
      if (error) throw error;
      return data;
    } catch (e) {
      return [{ orderId: 1, number: '+237612345678', status: 'active', error: e.message }];
    }
  });

  // Admin Panel (list users)
  fastify.get('/api/admin/users', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { data, error } = await fastify.supabase
        .from('users')
        .select('*');
      if (error) throw error;
      return data;
    } catch (e) {
      return [{ id: 1, email: 'user@example.com', error: e.message }];
    }
  });

  // Admin Panel (list orders)
  fastify.get('/api/admin/orders', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { data, error } = await fastify.supabase
        .from('orders')
        .select('*, numbers(*), users(*)');
      if (error) throw error;
      return data;
    } catch (e) {
      return [{ orderId: 1, number: '+237612345678', status: 'active', error: e.message }];
    }
  });

  // Admin Panel (list payments)
  fastify.get('/api/admin/payments', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { data, error } = await fastify.supabase
        .from('payments')
        .select('*');
      if (error) throw error;
      return data;
    } catch (e) {
      return [{ paymentId: 1, amount: 500, status: 'completed', error: e.message }];
    }
  });

  // Get user account balance
  fastify.get('/account-balance', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const userId = request.user.sub;

      // Get user's current balance
      const { data: user, error: userError } = await fastify.supabase
        .from('users')
        .select('balance')
        .eq('id', userId)
        .single();

      if (userError) {
        // If user doesn't exist, create with default balance
        const { data: newUser, error: createError } = await fastify.supabase
          .from('users')
          .insert([{
            id: userId,
            balance: 0,
            created_at: new Date().toISOString()
          }])
          .select('balance')
          .single();

        if (createError) {
          fastify.log.error('Error creating user:', createError);
          return reply.code(500).send({ error: 'Failed to get account balance' });
        }

        return reply.code(200).send({ balance: newUser.balance });
      }

      return reply.code(200).send({ balance: user.balance || 0 });
    } catch (error) {
      fastify.log.error('Error getting account balance:', error);
      return reply.code(500).send({ error: 'Failed to get account balance' });
    }
  });

  // Get exchange rates for add funds
  fastify.get('/exchange-rates', async (request, reply) => {
    try {
      const { data: rates, error } = await fastify.supabase
        .from('exchange_rates')
        .select('*')
        .order('currency');

      if (error) {
        fastify.log.error('Error fetching exchange rates:', error);
        
        // Fallback to hardcoded rates if database table doesn't exist
        // Rates are: 1 USD = X other currency (e.g., 1 USD = 0.85 EUR)
        const fallbackRates = [
          { currency: 'USD', rate: 1.00, markup: 0, updated_at: new Date().toISOString() },
          { currency: 'EUR', rate: 0.85, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'GBP', rate: 0.73, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'JPY', rate: 110.50, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'CAD', rate: 1.25, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'AUD', rate: 1.35, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'CHF', rate: 0.92, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'CNY', rate: 6.45, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'INR', rate: 74.50, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'BRL', rate: 5.20, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'MXN', rate: 20.50, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'SGD', rate: 1.35, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'HKD', rate: 7.80, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'SEK', rate: 8.60, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'NOK', rate: 8.80, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'DKK', rate: 6.30, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'PLN', rate: 3.80, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'CZK', rate: 21.50, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'HUF', rate: 300.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'RUB', rate: 75.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'TRY', rate: 8.50, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'ZAR', rate: 14.50, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'KRW', rate: 1150.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'THB', rate: 32.50, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'MYR', rate: 4.15, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'IDR', rate: 14200.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'PHP', rate: 50.50, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'VND', rate: 23000.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'NGN', rate: 410.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'EGP', rate: 15.70, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'KES', rate: 110.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'GHS', rate: 6.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'UGX', rate: 3500.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'TZS', rate: 2300.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'XAF', rate: 550.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'XOF', rate: 550.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'MAD', rate: 9.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'TND', rate: 2.80, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'DZD', rate: 135.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'LYD', rate: 4.50, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'SDG', rate: 55.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'ETB', rate: 45.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'SOS', rate: 580.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'DJF', rate: 177.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'KMF', rate: 440.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'MUR', rate: 40.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'SCR', rate: 13.50, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'CVE', rate: 95.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'STD', rate: 21000.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'GMD', rate: 52.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'GNF', rate: 10200.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'SLL', rate: 10300.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'LRD', rate: 150.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'CDF', rate: 2000.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'RWF', rate: 1000.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'BIF', rate: 2000.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'MWK', rate: 800.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'ZMW', rate: 18.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'ZWL', rate: 85.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'NAD', rate: 14.50, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'BWP', rate: 11.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'SZL', rate: 14.50, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'LSL', rate: 14.50, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'MZN', rate: 60.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'AOA', rate: 650.00, markup: 10.0, updated_at: new Date().toISOString() },
          { currency: 'STN', rate: 21.00, markup: 10.0, updated_at: new Date().toISOString() }
        ];
        
        return reply.code(200).send(fallbackRates);
      }

      // Add default USD rate if not present
      const usdRate = rates.find(r => r.currency === 'USD');
      if (!usdRate) {
        rates.unshift({
          currency: 'USD',
          rate: 1.00,
          markup: 0,
          updated_at: new Date().toISOString()
        });
      }

      return reply.code(200).send(rates);
    } catch (error) {
      fastify.log.error('Error fetching exchange rates:', error);
      return reply.code(500).send({ error: 'Failed to fetch exchange rates' });
    }
  });

  // Update exchange rates from live API
  fastify.post('/exchange-rates/update', async (request, reply) => {
    try {
      // Fetch live rates from a free API (using exchangerate-api.com as example)
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      
      if (!response.ok) {
        throw new Error('Failed to fetch live exchange rates');
      }

      const data = await response.json();
      const rates = data.rates;
      const updatedAt = new Date().toISOString();

      // Prepare rates for database update
      const exchangeRates = [];
      
      // Add USD as base currency
      exchangeRates.push({
        currency: 'USD',
        rate: 1.00,
        markup: 0,
        updated_at: updatedAt
      });

      // Add other currencies with their live rates
      for (const [currency, rate] of Object.entries(rates)) {
        if (currency !== 'USD') {
          exchangeRates.push({
            currency: currency.toUpperCase(),
            rate: rate,
            markup: 10.0, // Default 10% markup
            updated_at: updatedAt
          });
        }
      }

      // Update database with new rates
      const { error } = await fastify.supabase
        .from('exchange_rates')
        .upsert(exchangeRates, { 
          onConflict: 'currency',
          ignoreDuplicates: false 
        });

      if (error) {
        fastify.log.error('Error updating exchange rates:', error);
        return reply.code(500).send({ error: 'Failed to update exchange rates' });
      }

      return reply.code(200).send({ 
        message: 'Exchange rates updated successfully',
        updated_at: updatedAt,
        currencies_updated: exchangeRates.length
      });

    } catch (error) {
      fastify.log.error('Error updating exchange rates:', error);
      return reply.code(500).send({ error: 'Failed to update exchange rates' });
    }
  });

  // Initiate Campay payment for add funds
  fastify.post('/add-funds/campay', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { amount, currency, phoneNumber } = request.body;
      const userId = request.user.sub;

      if (!amount || amount <= 0) {
        return reply.code(400).send({ error: 'Invalid amount' });
      }

      if (!currency) {
        return reply.code(400).send({ error: 'Currency is required' });
      }

      if (!phoneNumber) {
        return reply.code(400).send({ error: 'Phone number is required' });
      }

      // Get exchange rate for the currency
      const { data: rateData, error: rateError } = await fastify.supabase
        .from('exchange_rates')
        .select('rate, markup')
        .eq('currency', currency.toUpperCase())
        .single();

      if (rateError || !rateData) {
        return reply.code(400).send({ error: 'Currency not supported' });
      }

      // Calculate USD amount with markup
      // If user pays 100 EUR and rate is 0.85 (1 USD = 0.85 EUR)
      // Then: 100 EUR ÷ 0.85 = 117.65 USD (base amount)
      // With 10% markup: 117.65 × 1.10 = 129.41 USD (final amount)
      const exchangeRate = rateData.rate;
      const markup = rateData.markup || 10.0; // Default 10% markup
      const baseUsdAmount = amount / exchangeRate; // Convert to USD
      const usdAmount = baseUsdAmount * (1 + markup / 100); // Add markup

      // Create a unique reference for this payment
      const reference = `ADDFUNDS_${userId}_${Date.now()}`;

      // Store the pending payment in database (with fallback if table doesn't exist)
      let payment = null;
      try {
        const { data: paymentData, error: paymentError } = await fastify.supabase
          .from('add_funds_payments')
          .insert([{
            user_id: userId,
            amount_usd: usdAmount,
            amount_original: amount,
            currency: currency.toUpperCase(),
            phone_number: phoneNumber,
            reference: reference,
            status: 'pending',
            exchange_rate: exchangeRate,
            markup: markup
          }])
          .select()
          .single();

        if (paymentError) {
          fastify.log.error('Error creating payment record:', paymentError);
          // Continue without database storage for now
          payment = {
            id: 'temp_' + Date.now(),
            user_id: userId,
            amount_usd: usdAmount,
            amount_original: amount,
            currency: currency.toUpperCase(),
            phone_number: phoneNumber,
            reference: reference,
            status: 'pending',
            exchange_rate: exchangeRate,
            markup: markup
          };
        } else {
          payment = paymentData;
        }
      } catch (error) {
        fastify.log.error('Error with payment database:', error);
        // Continue without database storage for now
        payment = {
          id: 'temp_' + Date.now(),
          user_id: userId,
          amount_usd: usdAmount,
          amount_original: amount,
          currency: currency.toUpperCase(),
          phone_number: phoneNumber,
          reference: reference,
          status: 'pending',
          exchange_rate: exchangeRate,
          markup: markup
        };
      }

      // Call Campay API to initiate payment
      const campayResponse = await fetch('https://www.campay.net/api/collect/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${process.env.CAMPAY_API_KEY}`
        },
        body: JSON.stringify({
          amount: usdAmount,
          currency: 'USD',
          phone_number: phoneNumber,
          reference: reference,
          description: `Add funds to DigiNum account - ${amount} ${currency.toUpperCase()}`
        })
      });

      const campayData = await campayResponse.json();

      if (!campayResponse.ok) {
        fastify.log.error('Campay API error:', campayData);
        return reply.code(500).send({ error: 'Failed to initiate payment' });
      }

      // Update payment record with Campay transaction ID
      await fastify.supabase
        .from('add_funds_payments')
        .update({ 
          campay_transaction_id: campayData.transaction_id,
          status: 'initiated'
        })
        .eq('id', payment.id);

      return reply.code(200).send({
        success: true,
        transaction_id: campayData.transaction_id,
        reference: reference,
        amount_usd: usdAmount,
        amount_original: amount,
        currency: currency.toUpperCase(),
        exchange_rate: exchangeRate,
        markup: markup,
        message: 'Payment initiated successfully'
      });

    } catch (error) {
      fastify.log.error('Error initiating Campay payment:', error);
      return reply.code(500).send({ error: 'Failed to initiate payment' });
    }
  });

  // Check add funds payment status
  fastify.get('/add-funds/status/:reference', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { reference } = request.params;
      const userId = request.user.sub;

      // Get payment record
      const { data: payment, error: paymentError } = await fastify.supabase
        .from('add_funds_payments')
        .select('*')
        .eq('reference', reference)
        .eq('user_id', userId)
        .single();

      if (paymentError || !payment) {
        return reply.code(404).send({ error: 'Payment not found' });
      }

      // Check status with Campay API
      if (payment.campay_transaction_id) {
        const campayResponse = await fetch(`https://www.campay.net/api/transaction/${payment.campay_transaction_id}/`, {
          headers: {
            'Authorization': `Token ${process.env.CAMPAY_API_KEY}`
          }
        });

        if (campayResponse.ok) {
          const campayData = await campayResponse.json();
          
          // Update payment status if changed
          if (campayData.status !== payment.status) {
            await fastify.supabase
              .from('add_funds_payments')
              .update({ status: campayData.status })
              .eq('id', payment.id);

            // If payment is completed, add funds to user account
            if (campayData.status === 'completed' && payment.status !== 'completed') {
              const { data: user, error: userError } = await fastify.supabase
                .from('users')
                .select('balance')
                .eq('id', userId)
                .single();

              if (userError) {
                // Create user if doesn't exist
                await fastify.supabase
                  .from('users')
                  .insert([{
                    id: userId,
                    balance: payment.amount_usd,
                    created_at: new Date().toISOString()
                  }]);
              } else {
                // Update existing user balance
                const newBalance = (user.balance || 0) + payment.amount_usd;
                await fastify.supabase
                  .from('users')
                  .update({ 
                    balance: newBalance,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', userId);
              }

              // Update payment status to completed
              await fastify.supabase
                .from('add_funds_payments')
                .update({ status: 'completed' })
                .eq('id', payment.id);
            }
          }

          return reply.code(200).send({
            status: campayData.status,
            amount_usd: payment.amount_usd,
            amount_original: payment.amount_original,
            currency: payment.currency,
            reference: payment.reference
          });
        }
      }

      return reply.code(200).send({
        status: payment.status,
        amount_usd: payment.amount_usd,
        amount_original: payment.amount_original,
        currency: payment.currency,
        reference: payment.reference
      });

    } catch (error) {
      fastify.log.error('Error checking payment status:', error);
      return reply.code(500).send({ error: 'Failed to check payment status' });
    }
  });

  // Add funds to account (direct method - for testing)
  fastify.post('/add-funds', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { amount } = request.body;
      const userId = request.user.sub;

      if (!amount || amount <= 0) {
        return reply.code(400).send({ error: 'Invalid amount' });
      }

      // Get current balance
      const { data: user, error: userError } = await fastify.supabase
        .from('users')
        .select('balance')
        .eq('id', userId)
        .single();

      if (userError) {
        // Create user if doesn't exist
        const { data: newUser, error: createError } = await fastify.supabase
          .from('users')
          .insert([{
            id: userId,
            balance: amount,
            created_at: new Date().toISOString()
          }])
          .select('balance')
          .single();

        if (createError) {
          fastify.log.error('Error creating user:', createError);
          return reply.code(500).send({ error: 'Failed to add funds' });
        }

        return reply.code(200).send({ 
          balance: newUser.balance,
          message: 'Funds added successfully'
        });
      }

      // Update balance
      const newBalance = (user.balance || 0) + amount;
      const { data: updatedUser, error: updateError } = await fastify.supabase
        .from('users')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('balance')
        .single();

      if (updateError) {
        fastify.log.error('Error updating balance:', updateError);
        return reply.code(500).send({ error: 'Failed to add funds' });
      }

      return reply.code(200).send({ 
        balance: updatedUser.balance,
        message: 'Funds added successfully'
      });
    } catch (error) {
      fastify.log.error('Error adding funds:', error);
      return reply.code(500).send({ error: 'Failed to add funds' });
    }
  });

  // Check if user has sufficient balance
  const checkBalance = async (userId, requiredAmount) => {
    const { data: user, error } = await fastify.supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return { hasBalance: false, currentBalance: 0 };
    }

    return { 
      hasBalance: (user.balance || 0) >= requiredAmount, 
      currentBalance: user.balance || 0 
    };
  };

  // Deduct amount from user balance
  const deductBalance = async (userId, amount) => {
    const { data: user, error: userError } = await fastify.supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();

    if (userError) {
      return { success: false, error: 'User not found' };
    }

    const currentBalance = user.balance || 0;
    if (currentBalance < amount) {
      return { success: false, error: 'Insufficient balance' };
    }

    const newBalance = currentBalance - amount;
    const { error: updateError } = await fastify.supabase
      .from('users')
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      return { success: false, error: 'Failed to update balance' };
    }

    return { success: true, newBalance };
  };

  // Helper functions for SMS provider integration
  function getCountryCode(countryName) {
    const countryCodes = {
      'Russia': '+7',
      'Ukraine': '+380',
      'Kazakhstan': '+7',
      'China': '+86',
      'Philippines': '+63',
      'Myanmar': '+95',
      'Indonesia': '+62',
      'Malaysia': '+60',
      'Kenya': '+254',
      'Tanzania': '+255',
      'Vietnam': '+84',
      'Kyrgyzstan': '+996',
      'USA (Virtual)': '+1',
      'Israel': '+972',
      'Hong Kong (China)': '+852',
      'Poland': '+48',
      'England (UK)': '+44',
      'Madagascar': '+261',
      'Congo': '+242',
      'Nigeria': '+234',
      'Macau': '+853',
      'Egypt': '+20',
      'India': '+91',
      'Ireland': '+353',
      'Cambodia': '+855',
      'Laos': '+856',
      'Haiti': '+509',
      'Côte d\'Ivoire': '+225',
      'Gambia': '+220',
      'Serbia': '+381',
      'Yemen': '+967',
      'South Africa': '+27',
      'Romania': '+40',
      'Colombia': '+57',
      'Estonia': '+372',
      'Azerbaijan': '+994',
      'Canada (virtual)': '+1',
      'Morocco': '+212',
      'Ghana': '+233',
      'Argentina': '+54',
      'Uzbekistan': '+998',
      'Cameroon': '+237',
      'Chad': '+235',
      'Germany': '+49',
      'Lithuania': '+370',
      'Croatia': '+385',
      'Sweden': '+46',
      'Iraq': '+964',
      'Netherlands': '+31',
      'Latvia': '+371',
      'Austria': '+43',
      'Belarus': '+375',
      'Thailand': '+66',
      'Saudi Arabia': '+966',
      'Mexico': '+52',
      'Taiwan': '+886',
      'Spain': '+34',
      'Iran': '+98',
      'Algeria': '+213',
      'Slovenia': '+386',
      'Bangladesh': '+880',
      'Senegal': '+221',
      'Turkey': '+90',
      'Czech Republic': '+420',
      'Sri Lanka': '+94',
      'Peru': '+51',
      'Pakistan': '+92',
      'New Zealand': '+64',
      'Guinea': '+224',
      'Mali': '+223',
      'Venezuela': '+58',
      'Ethiopia': '+251',
      'Mongolia': '+976',
      'Brazil': '+55',
      'Afghanistan': '+93',
      'Uganda': '+256',
      'Angola': '+244',
      'Cyprus': '+357',
      'France': '+33',
      'Mozambique': '+258',
      'Nepal': '+977',
      'Belgium': '+32',
      'Bulgaria': '+359',
      'Hungary': '+36',
      'Moldova': '+373',
      'Italy': '+39',
      'Paraguay': '+595',
      'Honduras': '+504',
      'Tunisia': '+216',
      'Nicaragua': '+505',
      'Timor-Leste': '+670',
      'Bolivia': '+591',
      'Costa Rica': '+506',
      'Guatemala': '+502',
      'UNITED ARAB EMIRATES': '+971',
      'Zimbabwe': '+263',
      'Puerto Rico': '+1',
      'Sudan': '+249',
      'Togo': '+228',
      'Kuwait': '+965',
      'El Salvador': '+503',
      'Libya': '+218',
      'Jamaica': '+1',
      'Trinidad and Tobago': '+1',
      'Ecuador': '+593',
      'Swaziland': '+268',
      'Oman': '+968',
      'Bosnia and Herzegovina': '+387',
      'Dominican Republic': '+1',
      'Qatar': '+974',
      'Panama': '+507',
      'Cuba': '+53',
      'Mauritania': '+222',
      'Sierra Leone': '+232',
      'Jordan': '+962',
      'Portugal': '+351',
      'Barbados': '+1',
      'Burundi': '+257',
      'Benin': '+229',
      'Brunei': '+673',
      'Bahamas': '+1',
      'Botswana': '+267',
      'Belize': '+501',
      'CAR': '+236',
      'Dominica': '+1',
      'Grenada': '+1',
      'Georgia': '+995',
      'Greece': '+30',
      'Guinea-Bissau': '+245',
      'Guyana': '+592',
      'Iceland': '+354',
      'Comoros': '+269',
      'St. Kitts and Nevis': '+1',
      'Liberia': '+231',
      'Lesotho': '+266',
      'Malawi': '+265',
      'Namibia': '+264',
      'Niger': '+227',
      'Rwanda': '+250',
      'Slovakia': '+421',
      'Suriname': '+597',
      'Tajikistan': '+992',
      'Monaco': '+377',
      'Bahrain': '+973',
      'Reunion': '+262',
      'Zambia': '+260',
      'Armenia': '+374',
      'Somalia': '+252',
      'Congo': '+242',
      'Chile': '+56',
      'Burkina Faso': '+226',
      'Lebanon': '+961',
      'Gabon': '+241',
      'Albania': '+355',
      'Uruguay': '+598',
      'Mauritius': '+230',
      'Bhutan': '+975',
      'Maldives': '+960',
      'Guadeloupe': '+590',
      'Turkmenistan': '+993',
      'French Guiana': '+594',
      'Finland': '+358',
      'St. Lucia': '+1',
      'Luxembourg': '+352',
      'Saint Pierre and Miquelon': '+508',
      'Equatorial Guinea': '+240',
      'Djibouti': '+253',
      'Cayman Islands': '+1',
      'Montenegro': '+382',
      'Denmark': '+45',
      'Switzerland': '+41',
      'Norway': '+47',
      'Australia': '+61',
      'Eritrea': '+291',
      'South Sudan': '+211',
      'Sao Tome and Principe': '+239',
      'Aruba': '+297',
      'Montserrat': '+1',
      'Anguilla': '+1',
      'Northern Macedonia': '+389',
      'Republic of Seychelles': '+248',
      'New Caledonia': '+687',
      'Cape Verde': '+238',
      'USA (Real)': '+1',
      'Palestine': '+970',
      'Fiji': '+679',
      'South Korea': '+82',
      'Western Sahara': '+212',
      'Solomon Islands': '+677',
      'Singapore': '+65',
      'Tonga': '+676',
      'American Samoa': '+1',
      'Malta': '+356',
      'Gibraltar': '+350',
      'Bermuda': '+1',
      'Japan': '+81',
      'Syria': '+963',
      'Faroe Islands': '+298',
      'Martinique': '+596',
      'Turks and Caicos Islands': '+1',
      'St. Barthélemy': '+590',
      'Nauru': '+674',
      'Curaçao': '+599',
      'Samoa': '+685',
      'Vanuatu': '+678',
      'Greenland': '+299',
      'Kosovo': '+383',
      'Liechtenstein': '+423',
      'Sint Maarten': '+1',
      'Niue': '+683'
    };
    return countryCodes[countryName] || '+1';
  }

  function getServiceName(serviceCode) {
    const serviceNames = {
      // Popular Social Media
      'wa': 'WhatsApp',
      'ig': 'Instagram',
      'tg': 'Telegram',
      'fb': 'Facebook',
      'tw': 'X.com (Twitter)',
      'vk': 'VKontakte',
      'ok': 'Odnoklassniki',
      'wb': 'WeChat',
      'lf': 'TikTok/Douyin',
      'oi': 'Tinder',
      'ds': 'Discord',
      'sn': 'Snapchat',
      'vi': 'Viber',
      'me': 'Line msg',
      'mm': 'Microsoft',
      'go': 'Google,youtube,Gmail',
      'mb': 'Yahoo',
      'wb': 'WeChat',
      
      // E-commerce & Services
      'am': 'Amazon',
      'nf': 'Netflix',
      'sp': 'Spotify',
      'ub': 'Uber',
      'ly': 'Lyft',
      'uk': 'Airbnb',
      'ts': 'PayPal',
      'it': 'CashApp',
      'ge': 'Paytm',
      'ka': 'Shopee',
      'dl': 'Lazada',
      'fl': 'Flipkart',
      'xd': 'Tokopedia',
      'uk': 'Airbnb',
      
      // Gaming & Entertainment
      'mt': 'Steam',
      'hb': 'Twitch',
      'mm': 'Microsoft',
      'wx': 'Apple',
      'an': 'Adidas',
      'ew': 'Nike',
      
      // Banking & Finance
      'ts': 'PayPal',
      'it': 'CashApp',
      'ge': 'Paytm',
      'bo': 'Wise',
      'nc': 'Payoneer',
      're': 'Coinbase',
      'on': 'Binance',
      
      // Other Popular Services
      'ot': 'Other',
      'dr': 'ChatGPT (openAI.com)',
      'ai': 'CELEBe',
      'uk': 'Airbnb',
      'ts': 'PayPal'
    };
    return serviceNames[serviceCode] || serviceCode.toUpperCase();
  }
}
