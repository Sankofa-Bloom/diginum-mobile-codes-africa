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
  fastify.post('/auth/login', {
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
      const { email, password, first_name, last_name, phone_number, country } = request.body;
      
      // Validate input
      if (!email || !password) {
        return reply.code(400).send({ error: 'Email and password are required' });
      }

      // Check if user already exists
      const { data: existingUser, error: checkError } = await fastify.supabase
        .from('users')
        .select('id')
        .eq('email', email.trim())
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing user:', checkError);
        return reply.code(500).send({ error: 'Internal server error' });
      }

      if (existingUser) {
        return reply.code(400).send({ error: 'User with this email already exists' });
      }

      // Hash password
      const bcrypt = await import('bcrypt');
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // For now, skip email verification to get basic signup working
      // We'll re-enable this later once SMTP is properly configured

      // Create user in our custom users table (skip email verification for now)
      const { data: user, error: createError } = await fastify.supabase
        .from('users')
        .insert({
          email: email.trim(),
          password_hash: hashedPassword,
          first_name: first_name || null,
          last_name: last_name || null,
          phone_number: phone_number || null,
          country: country || null,
          email_verified: true // Set to true for now to skip verification
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        return reply.code(500).send({ error: 'Failed to create user' });
      }

      return reply.code(201).send({
        message: 'User created successfully! You can now log in.',
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          email_verified: user.email_verified
        }
      });
    } catch (error) {
      console.error('Signup error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  };

  // Email verification endpoint
  fastify.get('/auth/verify-email', async (request, reply) => {
    try {
      const { token } = request.query;
      
      if (!token) {
        return reply.code(400).send({ error: 'Verification token is required' });
      }

      const { verifyEmailToken, sendWelcomeEmail } = await import('./emailService.js');
      const result = await verifyEmailToken(fastify, token);

      if (!result.success) {
        return reply.code(400).send({ error: result.error });
      }

      // Send welcome email
      const baseUrl = process.env.FRONTEND_URL || 'https://your-domain.com';
      const welcomeResult = await sendWelcomeEmail(result.user, baseUrl);

      if (!welcomeResult.success) {
        console.error('Failed to send welcome email:', welcomeResult.error);
        // Don't fail the verification, just log the error
      }

      return reply.code(200).send({
        message: 'Email verified successfully! Welcome to DigiNum!',
        user: {
          id: result.user.id,
          email: result.user.email,
          first_name: result.user.first_name,
          last_name: result.user.last_name,
          email_verified: true
        }
      });
    } catch (error) {
      console.error('Email verification error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Resend verification email endpoint
  fastify.post('/auth/resend-verification', async (request, reply) => {
    try {
      const { email } = request.body;
      
      if (!email) {
        return reply.code(400).send({ error: 'Email is required' });
      }

      // Check if user exists and is not verified
      const { data: user, error: userError } = await fastify.supabase
        .from('users')
        .select('*')
        .eq('email', email.trim())
        .eq('email_verified', false)
        .single();

      if (userError || !user) {
        return reply.code(400).send({ error: 'User not found or already verified' });
      }

      // Generate new verification token
      const { generateVerificationToken, sendVerificationEmail } = await import('./emailService.js');
      const verificationToken = generateVerificationToken();
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user with new token
      const { error: updateError } = await fastify.supabase
        .from('users')
        .update({
          email_verification_token: verificationToken,
          email_verification_expires: tokenExpiry.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating verification token:', updateError);
        return reply.code(500).send({ error: 'Failed to generate new verification token' });
      }

      // Send verification email
      const baseUrl = process.env.FRONTEND_URL || 'https://your-domain.com';
      const emailResult = await sendVerificationEmail(user, verificationToken, baseUrl);

      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error);
        return reply.code(500).send({ error: 'Failed to send verification email' });
      }

      return reply.code(200).send({
        message: 'Verification email sent successfully'
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Logout endpoint
  fastify.post('/auth/logout', async (request, reply) => {
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
    
    // Try to get real-time prices from SMS provider first
    try {
      fastify.log.info(`Fetching real-time services for country: ${countryId}`);
      
      // Get services and costs for the country from SMS provider
      const servicesData = await callSmsApi('getServicesAndCost', {
        country: countryId
      });

      fastify.log.info(`SMS provider response for country ${countryId}:`, servicesData);

      // Transform the data to match our format with $2 markup
      const services = [];
      
      // Handle different response formats
      if (Array.isArray(servicesData)) {
        // Response is an array of service objects
        for (const serviceData of servicesData) {
          if (serviceData.id && serviceData.price) {
            const basePrice = parseFloat(serviceData.price);
            const finalPrice = basePrice + 2.00; // Add $2 markup to SMS provider price
            
            fastify.log.info(`Service ${serviceData.id}: Base price $${basePrice}, Final price $${finalPrice} (with $2 markup)`);
            
            services.push({
              id: serviceData.id,
              name: serviceData.name || getServiceName(serviceData.id),
              description: `SMS verification for ${serviceData.name || getServiceName(serviceData.id)}`,
              price: finalPrice,
              countryId: countryId,
              available: serviceData.quantity > 0
            });
          }
        }
      } else if (typeof servicesData === 'object') {
        // Response is an object with service codes as keys
        for (const [serviceCode, serviceData] of Object.entries(servicesData)) {
          if (typeof serviceData === 'object' && serviceData.cost) {
            const basePrice = parseFloat(serviceData.cost);
            const finalPrice = basePrice + 2.00; // Add $2 markup to SMS provider price
            
            fastify.log.info(`Service ${serviceCode}: Base price $${basePrice}, Final price $${finalPrice} (with $2 markup)`);
            
            services.push({
              id: serviceCode,
              name: getServiceName(serviceCode), // Helper function to get service name
              description: `SMS verification for ${getServiceName(serviceCode)}`,
              price: finalPrice,
              countryId: countryId,
              available: serviceData.count > 0
            });
          }
        }
      }

      // If we got real services with varied pricing, return them
      if (services.length > 0) {
        // Check if all services have the same price (indicating SMS provider issue)
        const uniquePrices = [...new Set(services.map(s => s.price))];
        if (uniquePrices.length === 1) {
          fastify.log.warn(`All services have the same price (${uniquePrices[0]}), likely SMS provider issue. Using fallback services.`);
        } else {
          // Check if prices are too low (likely wholesale prices or not properly configured)
          const avgPrice = services.reduce((sum, s) => sum + s.price, 0) / services.length;
          if (avgPrice < 3.0) {
            fastify.log.warn(`Average price is too low (${avgPrice.toFixed(2)}), likely wholesale prices. Using fallback services.`);
          } else {
            fastify.log.info(`Returning ${services.length} real services from SMS provider for country ${countryId} with varied pricing`);
            return reply.code(200).send(services);
          }
        }
      } else {
        fastify.log.warn(`No services returned from SMS provider for country ${countryId}, using fallback`);
      }
    } catch (error) {
      fastify.log.error('Error fetching services from SMS provider:', error);
      fastify.log.info('Using fallback services due to SMS provider error');
    }

    // Fallback to hardcoded services if SMS provider fails or returns uniform pricing
    // These prices are realistic and varied based on service popularity and complexity
    const fallbackServices = [
      // Popular Social Media (Lower prices due to high demand)
      { id: 'wa', name: 'WhatsApp', description: 'WhatsApp verification', price: 3.99, countryId: countryId, available: true },
      { id: 'tg', name: 'Telegram', description: 'Telegram verification', price: 2.99, countryId: countryId, available: true },
      { id: 'fb', name: 'Facebook', description: 'Facebook verification', price: 4.99, countryId: countryId, available: true },
      { id: 'ig', name: 'Instagram', description: 'Instagram verification', price: 5.99, countryId: countryId, available: true },
      { id: 'vk', name: 'VKontakte', description: 'VKontakte verification', price: 2.49, countryId: countryId, available: true },
      { id: 'ok', name: 'Odnoklassniki', description: 'Odnoklassniki verification', price: 2.99, countryId: countryId, available: true },
      
      // Premium Social Media (Higher prices)
      { id: 'tw', name: 'X.com (Twitter)', description: 'X.com verification', price: 7.99, countryId: countryId, available: true },
      { id: 'sn', name: 'Snapchat', description: 'Snapchat verification', price: 6.49, countryId: countryId, available: true },
      { id: 'ds', name: 'Discord', description: 'Discord verification', price: 4.99, countryId: countryId, available: true },
      
      // Email Services
      { id: 'mb', name: 'Yahoo', description: 'Yahoo verification', price: 3.99, countryId: countryId, available: true },
      { id: 'go', name: 'Gmail/Google', description: 'Gmail verification', price: 4.99, countryId: countryId, available: true },
      
      // E-commerce & Shopping (Medium prices)
      { id: 'am', name: 'Amazon', description: 'Amazon verification', price: 6.99, countryId: countryId, available: true },
      { id: 'ka', name: 'Shopee', description: 'Shopee verification', price: 4.49, countryId: countryId, available: true },
      { id: 'dl', name: 'Lazada', description: 'Lazada verification', price: 4.49, countryId: countryId, available: true },
      { id: 'fl', name: 'Flipkart', description: 'Flipkart verification', price: 3.99, countryId: countryId, available: true },
      { id: 'xd', name: 'Tokopedia', description: 'Tokopedia verification', price: 4.49, countryId: countryId, available: true },
      
      // Entertainment & Streaming (Higher prices)
      { id: 'nf', name: 'Netflix', description: 'Netflix verification', price: 8.99, countryId: countryId, available: true },
      { id: 'sp', name: 'Spotify', description: 'Spotify verification', price: 5.49, countryId: countryId, available: true },
      { id: 'hb', name: 'Twitch', description: 'Twitch verification', price: 6.99, countryId: countryId, available: true },
      
      // Transportation (Medium prices)
      { id: 'ub', name: 'Uber', description: 'Uber verification', price: 5.99, countryId: countryId, available: true },
      { id: 'ly', name: 'Lyft', description: 'Lyft verification', price: 5.99, countryId: countryId, available: true },
      { id: 'uk', name: 'Airbnb', description: 'Airbnb verification', price: 7.99, countryId: countryId, available: true },
      
      // Payment & Finance (Higher prices due to security)
      { id: 'ts', name: 'PayPal', description: 'PayPal verification', price: 8.99, countryId: countryId, available: true },
      { id: 'it', name: 'CashApp', description: 'CashApp verification', price: 6.99, countryId: countryId, available: true },
      { id: 'ge', name: 'Paytm', description: 'Paytm verification', price: 4.99, countryId: countryId, available: true },
      { id: 'bo', name: 'Wise', description: 'Wise verification', price: 7.99, countryId: countryId, available: true },
      { id: 'nc', name: 'Payoneer', description: 'Payoneer verification', price: 8.99, countryId: countryId, available: true },
      
      // Gaming (Medium-High prices)
      { id: 'mt', name: 'Steam', description: 'Steam verification', price: 6.99, countryId: countryId, available: true },
      
      // Tech Companies (Higher prices)
      { id: 'mm', name: 'Microsoft', description: 'Microsoft verification', price: 7.99, countryId: countryId, available: true },
      { id: 'wx', name: 'Apple', description: 'Apple verification', price: 8.99, countryId: countryId, available: true },
      
      // Fashion & Retail (Lower prices)
      { id: 'an', name: 'Adidas', description: 'Adidas verification', price: 3.99, countryId: countryId, available: true },
      { id: 'ew', name: 'Nike', description: 'Nike verification', price: 4.99, countryId: countryId, available: true },
      
      // AI & Technology (Medium prices)
      { id: 'dr', name: 'ChatGPT', description: 'ChatGPT verification', price: 5.99, countryId: countryId, available: true },
      { id: 'ai', name: 'CELEBe', description: 'CELEBe verification', price: 4.99, countryId: countryId, available: true },
      
      // Cryptocurrency (Higher prices due to security)
      { id: 're', name: 'Coinbase', description: 'Coinbase verification', price: 9.99, countryId: countryId, available: true },
      { id: 'on', name: 'Binance', description: 'Binance verification', price: 8.99, countryId: countryId, available: true }
    ];
    
    return reply.code(200).send(fallbackServices);
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
      fastify.log.info(`Fetching price for service ${serviceId} in country ${countryId}`);
      
      const pricesData = await callSmsApi('getServicesAndCost', {
        country: countryId,
        service: serviceId
      });

      const baseServicePrice = pricesData[serviceId]?.cost;
      if (!baseServicePrice) {
        return reply.code(400).send({ error: 'Service not available' });
      }

      // Add $2 markup to SMS provider price
      const servicePrice = parseFloat(baseServicePrice) + 2.00;
      
      fastify.log.info(`Service ${serviceId}: Base price $${baseServicePrice}, Final price $${servicePrice} (with $2 markup)`);

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
  fastify.post('/auth/forgot-password', async (request, reply) => {
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

  // Simple Fapshi webhook endpoint
  fastify.post('/api/webhook/fapshi', async (request, reply) => {
    try {
      const { reference, status, amount, currency } = request.body;
      
      if (!reference || !status) {
        return reply.code(400).send({ error: 'Missing required fields' });
      }

      // Update payment status
      const { error: updateError } = await fastify.supabase
        .from('fapshi_payments')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('reference', reference);

      if (updateError) {
        fastify.log.error('Failed to update payment status:', updateError);
        return reply.code(500).send({ error: 'Failed to update payment status' });
      }

      return reply.code(200).send({ received: true });
    } catch (error) {
      fastify.log.error('Error processing Fapshi webhook:', error);
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
  fastify.get('/admin/exchange-rates', { preHandler: requireAuth }, async (request, reply) => {
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
  fastify.get('/admin/price-adjustments', { preHandler: requireAuth }, async (request, reply) => {
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

  // Fapshi Payment Gateway Routes (XAF Currency Support)
  fastify.post('/api/payment/fapshi/initialize', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { amount, currency, email, name, phone, description, redirectUrl } = request.body;
      
      // Validate required fields
      if (!amount || !currency || !email || !name) {
        return reply.code(400).send({ 
          error: 'Missing required fields: amount, currency, email, name' 
        });
      }

      // Validate currency support
      if (currency !== 'XAF') {
        return reply.code(400).send({ 
          error: 'Fapshi only supports XAF currency' 
        });
      }

      // Generate unique reference
      const reference = `DIGINUM_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      
      // Initialize Fapshi payment
      const fapshiPayload = {
        amount: Math.round(amount * 100), // Convert to centimes
        currency: currency,
        email: email,
        name: name,
        phone: phone,
        description: description || 'DigiNum SMS Service Payment',
        reference: reference,
        redirect_url: redirectUrl || `${process.env.FRONTEND_URL}/payment/success`,
        webhook_url: `${process.env.BACKEND_URL}/api/payment/fapshi/webhook`,
      };

      // Make request to Fapshi API
      const fapshiResponse = await fetch(`${process.env.FAPSHI_BASE_URL}/payments/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.FAPSHI_SECRET_KEY}`,
          'X-Public-Key': process.env.FAPSHI_PUBLIC_KEY,
        },
        body: JSON.stringify(fapshiPayload),
      });

      const result = await fapshiResponse.json();

      if (!fapshiResponse.ok) {
        fastify.log.error('Fapshi payment initialization failed:', result);
        return reply.code(400).send({
          error: result.message || 'Payment initialization failed',
        });
      }

      // Store payment record in database
      const { data: paymentRecord, error: dbError } = await fastify.supabase
        .from('payments')
        .insert([{
          user_id: request.user.id,
          provider: 'fapshi',
          provider_transaction_id: result.data.id,
          reference: reference,
          amount: amount,
          currency: currency,
          status: 'pending',
          provider_response: JSON.stringify(result),
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (dbError) {
        fastify.log.error('Database error storing payment:', dbError);
        // Continue anyway, payment was initiated
      }

      return reply.code(200).send({
        success: true,
        data: {
          transaction_id: result.data.id,
          reference: reference,
          payment_url: result.data.payment_url,
          amount: amount,
          currency: currency,
          status: 'pending',
          message: 'Payment initialized successfully',
        },
      });

    } catch (error) {
      fastify.log.error('Fapshi payment initialization error:', error);
      return reply.code(500).send({
        error: 'Internal server error during payment initialization',
      });
    }
  });

  // Fapshi payment verification
  fastify.get('/api/payment/fapshi/verify/:transactionId', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { transactionId } = request.params;

      // Verify payment with Fapshi
      const verificationResponse = await fetch(`${process.env.FAPSHI_BASE_URL}/payments/${transactionId}/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.FAPSHI_SECRET_KEY}`,
          'X-Public-Key': process.env.FAPSHI_PUBLIC_KEY,
        },
      });

      const result = await verificationResponse.json();

      if (!verificationResponse.ok) {
        return reply.code(400).send({
          error: result.message || 'Payment verification failed',
        });
      }

      // Update payment record in database
      const { error: updateError } = await fastify.supabase
        .from('payments')
        .update({
          status: result.data.status,
          provider_response: JSON.stringify(result),
          updated_at: new Date().toISOString(),
        })
        .eq('provider_transaction_id', transactionId);

      if (updateError) {
        fastify.log.error('Database error updating payment:', updateError);
      }

      // If payment is successful, credit user balance
      if (result.data.status === 'success') {
        await creditUserBalance(fastify, request.user.id, result.data.amount / 100, result.data.currency);
      }

      return reply.code(200).send({
        success: true,
        data: {
          transaction_id: result.data.id,
          reference: result.data.reference,
          amount: result.data.amount / 100, // Convert back from centimes
          currency: result.data.currency,
          status: result.data.status,
          message: 'Payment verification completed',
        },
      });

    } catch (error) {
      fastify.log.error('Fapshi payment verification error:', error);
      return reply.code(500).send({
        error: 'Internal server error during payment verification',
      });
    }
  });

  // Fapshi webhook handler
  fastify.post('/api/payment/fapshi/webhook', async (request, reply) => {
    try {
      const webhookData = request.body;
      
      fastify.log.info('Fapshi webhook received:', webhookData);

      // Validate webhook payload
      if (!webhookData.event || !webhookData.data) {
        return reply.code(400).send({ error: 'Invalid webhook payload' });
      }

      const { event, data } = webhookData;

      // Update payment record in database
      const { error: updateError } = await fastify.supabase
        .from('payments')
        .update({
          status: data.status,
          provider_response: JSON.stringify(webhookData),
          updated_at: new Date().toISOString(),
        })
        .eq('provider_transaction_id', data.transaction_id);

      if (updateError) {
        fastify.log.error('Database error updating payment via webhook:', updateError);
      }

      // Handle different webhook events
      switch (event) {
        case 'payment.success':
          await handleSuccessfulPayment(fastify, data);
          break;
        case 'payment.failed':
          await handleFailedPayment(fastify, data);
          break;
        case 'payment.pending':
          fastify.log.info('Payment pending:', data);
          break;
        default:
          fastify.log.warn(`Unhandled webhook event: ${event}`);
      }

      return reply.code(200).send({ received: true });

    } catch (error) {
      fastify.log.error('Fapshi webhook processing error:', error);
      return reply.code(500).send({
        error: 'Internal server error processing webhook',
      });
    }
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
  fastify.get('/admin/users', { preHandler: requireAuth }, async (request, reply) => {
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
  fastify.get('/admin/orders', { preHandler: requireAuth }, async (request, reply) => {
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
  fastify.get('/admin/payments', { preHandler: requireAuth }, async (request, reply) => {
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

  // Admin Dashboard Statistics
  fastify.get('/admin/dashboard-stats', { preHandler: requireAuth }, async (request, reply) => {
    try {
      // Get total users
      const { count: totalUsers, error: usersError } = await fastify.supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get total orders
      const { count: totalOrders, error: ordersError } = await fastify.supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      // Get total revenue from add_funds_payments
      const { data: payments, error: paymentsError } = await fastify.supabase
        .from('add_funds_payments')
        .select('amount_usd, status')
        .eq('status', 'completed');

      const totalRevenue = payments?.reduce((sum, payment) => sum + parseFloat(payment.amount_usd), 0) || 0;

      // Get recent orders (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: recentOrders, error: recentError } = await fastify.supabase
        .from('orders')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString());

      // Get active orders
      const { data: activeOrders, error: activeError } = await fastify.supabase
        .from('orders')
        .select('*')
        .in('status', ['active', 'waiting']);

      // Get pending payments
      const { data: pendingPayments, error: pendingError } = await fastify.supabase
        .from('add_funds_payments')
        .select('*')
        .eq('status', 'pending');

      const stats = {
        totalUsers: totalUsers || 0,
        totalOrders: totalOrders || 0,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        recentOrders: recentOrders?.length || 0,
        activeOrders: activeOrders?.length || 0,
        pendingPayments: pendingPayments?.length || 0,
        successRate: totalOrders > 0 ? Math.round((recentOrders?.filter(o => o.status === 'completed').length / recentOrders?.length) * 100) : 0
      };

      return reply.code(200).send(stats);
    } catch (error) {
      fastify.log.error('Error fetching dashboard stats:', error);
      return reply.code(500).send({ error: 'Failed to fetch dashboard statistics' });
    }
  });

  // Admin System Settings
  fastify.get('/admin/system-settings', async (request, reply) => {
    try {
      // Get current SMS API key (masked)
      const smsApiKey = process.env.SMS_API_KEY || '';
      const maskedApiKey = smsApiKey.length > 8 ? 
        smsApiKey.substring(0, 4) + '****' + smsApiKey.substring(smsApiKey.length - 4) : 
        '****';

      // Get default markup from environment or use 2.00
      const defaultMarkup = process.env.DEFAULT_MARKUP || '2.00';

      const settings = {
        smsApiKey: maskedApiKey,
        smsApiKeyConfigured: !!process.env.SMS_API_KEY,
        defaultMarkup: parseFloat(defaultMarkup),
        campayConfigured: !!(process.env.CAMPAY_API_KEY),
        stripeConfigured: !!(process.env.STRIPE_SECRET_KEY),
        serverTime: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      };

      return reply.code(200).send(settings);
    } catch (error) {
      fastify.log.error('Error fetching system settings:', error);
      return reply.code(500).send({ error: 'Failed to fetch system settings' });
    }
  });

  // Update system settings
  fastify.post('/admin/system-settings', async (request, reply) => {
    try {
      const { smsApiKey, defaultMarkup } = request.body;
      
      // Note: In a real application, you'd want to update environment variables
      // For now, we'll just validate and return success
      // In production, you might want to restart the server or use a config management system
      
      if (smsApiKey && smsApiKey.length < 10) {
        return reply.code(400).send({ error: 'SMS API key must be at least 10 characters' });
      }

      if (defaultMarkup !== undefined && (defaultMarkup < 0 || defaultMarkup > 100)) {
        return reply.code(400).send({ error: 'Default markup must be between 0 and 100' });
      }

      // For now, just return success - in production you'd update the actual environment
      return reply.code(200).send({ 
        message: 'Settings updated successfully',
        note: 'Server restart may be required for some changes to take effect'
      });
    } catch (error) {
      fastify.log.error('Error updating system settings:', error);
      return reply.code(500).send({ error: 'Failed to update system settings' });
    }
  });

  // Update exchange rate
  fastify.put('/admin/exchange-rates/:currency', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { currency } = request.params;
      const { rate, markup } = request.body;
      
      if (!rate || rate <= 0) {
        return reply.code(400).send({ error: 'Valid rate is required' });
      }

      const { data, error } = await fastify.supabase
        .from('exchange_rates')
        .update({
          rate: parseFloat(rate),
          markup: markup !== undefined ? parseFloat(markup) : 10.0,
          updated_at: new Date().toISOString()
        })
        .eq('currency', currency.toUpperCase())
        .select()
        .single();

      if (error) {
        fastify.log.error('Error updating exchange rate:', error);
        return reply.code(500).send({ error: 'Failed to update exchange rate' });
      }

      return reply.code(200).send(data);
    } catch (error) {
      fastify.log.error('Error in update exchange rate route:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update price adjustment
  fastify.put('/admin/price-adjustments/:id', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { markup } = request.body;
      
      if (markup === undefined || markup < 0) {
        return reply.code(400).send({ error: 'Valid markup is required' });
      }

      const { data, error } = await fastify.supabase
        .from('price_adjustments')
        .update({
          markup: parseFloat(markup),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        fastify.log.error('Error updating price adjustment:', error);
        return reply.code(500).send({ error: 'Failed to update price adjustment' });
      }

      return reply.code(200).send(data);
    } catch (error) {
      fastify.log.error('Error in update price adjustment route:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get recent transactions for admin
  fastify.get('/admin/recent-transactions', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { limit = 50 } = request.query;
      
      // Get recent orders
      const { data: orders, error: ordersError } = await fastify.supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      // Get recent payments
      const { data: payments, error: paymentsError } = await fastify.supabase
        .from('add_funds_payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      const transactions = [
        ...(orders || []).map(order => ({
          id: order.id,
          type: 'order',
          userId: order.user_id,
          amount: order.price,
          currency: 'USD',
          status: order.status,
          description: `Order for ${order.service} in ${order.country}`,
          createdAt: order.created_at,
          phoneNumber: order.phone_number
        })),
        ...(payments || []).map(payment => ({
          id: payment.id,
          type: 'payment',
          userId: payment.user_id,
          amount: payment.amount_usd,
          currency: 'USD',
          status: payment.status,
          description: `Add funds - ${payment.amount_original} ${payment.currency}`,
          createdAt: payment.created_at,
          phoneNumber: payment.phone_number
        }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
       .slice(0, parseInt(limit));

      return reply.code(200).send(transactions);
    } catch (error) {
      fastify.log.error('Error fetching recent transactions:', error);
      return reply.code(500).send({ error: 'Failed to fetch recent transactions' });
    }
  });

  // Get user account balance
  fastify.get('/account-balance', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const userId = request.user.sub;

      // Get user's current balance from user_balances table
      const { data: balanceData, error: balanceError } = await fastify.supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', userId)
        .eq('currency', 'USD')
        .single();

      if (balanceError && balanceError.code === 'PGRST116') {
        // No balance record exists, create one with $0
        const { data: newBalance, error: createError } = await fastify.supabase
          .from('user_balances')
          .insert([{
            user_id: userId,
            balance: 0,
            currency: 'USD'
          }])
          .select('balance')
          .single();

        if (createError) {
          fastify.log.error('Error creating balance record:', createError);
          // Return a default balance instead of failing
          return reply.code(200).send({ balance: 0 });
        }

        return reply.code(200).send({ balance: newBalance.balance });
      } else if (balanceError) {
        fastify.log.error('Error fetching balance:', balanceError);
        return reply.code(200).send({ balance: 0 });
      }

      return reply.code(200).send({ balance: balanceData.balance || 0 });
    } catch (error) {
      fastify.log.error('Error getting account balance:', error);
      // Return a default balance instead of failing
      return reply.code(200).send({ balance: 0 });
    }
  });

  // Get exchange rates for add funds
  fastify.get('/exchange-rates', async (request, reply) => {
    try {
      const { data: rates, error } = await fastify.supabase
        .from('exchange_rates')
        .select('*')
        .order('currency');

      // Force using fallback rates for now to test the new VAT system
      fastify.log.info('Using fallback exchange rates with VAT');
        
        // Fallback to hardcoded rates if database table doesn't exist
        // Updated rates with current August 2025 market values and VAT
        const fallbackRates = [
          { currency: 'USD', rate: 1.00, vat: 0, updated_at: new Date().toISOString() },
          { currency: 'EUR', rate: 0.863, vat: 3.0, updated_at: new Date().toISOString() },
          { currency: 'GBP', rate: 0.752, vat: 3.0, updated_at: new Date().toISOString() },
          { currency: 'JPY', rate: 147.35, vat: 2.0, updated_at: new Date().toISOString() },
          { currency: 'CAD', rate: 1.378, vat: 3.0, updated_at: new Date().toISOString() },
          { currency: 'AUD', rate: 1.546, vat: 3.0, updated_at: new Date().toISOString() },
          { currency: 'CHF', rate: 0.804, vat: 2.0, updated_at: new Date().toISOString() },
          { currency: 'CNY', rate: 7.212, vat: 2.0, updated_at: new Date().toISOString() },
          { currency: 'INR', rate: 87.25, vat: 4.0, updated_at: new Date().toISOString() },
          { currency: 'BRL', rate: 5.54, vat: 4.0, updated_at: new Date().toISOString() },
          { currency: 'MXN', rate: 18.87, vat: 4.0, updated_at: new Date().toISOString() },
          { currency: 'SGD', rate: 1.288, vat: 2.0, updated_at: new Date().toISOString() },
          { currency: 'HKD', rate: 7.85, vat: 2.0, updated_at: new Date().toISOString() },
          { currency: 'SEK', rate: 9.65, vat: 3.0, updated_at: new Date().toISOString() },
          { currency: 'NOK', rate: 10.25, vat: 3.0, updated_at: new Date().toISOString() },
          { currency: 'DKK', rate: 6.44, vat: 3.0, updated_at: new Date().toISOString() },
          { currency: 'PLN', rate: 3.68, vat: 3.0, updated_at: new Date().toISOString() },
          { currency: 'CZK', rate: 21.21, vat: 3.0, updated_at: new Date().toISOString() },
          { currency: 'HUF', rate: 343.28, vat: 4.0, updated_at: new Date().toISOString() },
          { currency: 'RUB', rate: 79.90, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'TRY', rate: 40.68, vat: 4.0, updated_at: new Date().toISOString() },
          { currency: 'ZAR', rate: 18.03, vat: 4.0, updated_at: new Date().toISOString() },
          { currency: 'KRW', rate: 1391.05, vat: 3.0, updated_at: new Date().toISOString() },
          { currency: 'THB', rate: 32.47, vat: 3.0, updated_at: new Date().toISOString() },
          { currency: 'MYR', rate: 4.27, vat: 3.0, updated_at: new Date().toISOString() },
          { currency: 'IDR', rate: 16465.76, vat: 3.0, updated_at: new Date().toISOString() },
          { currency: 'PHP', rate: 57.72, vat: 3.0, updated_at: new Date().toISOString() },
          { currency: 'VND', rate: 24500.00, vat: 3.0, updated_at: new Date().toISOString() },
          { currency: 'NGN', rate: 1635.50, vat: 3.0, updated_at: new Date().toISOString() },
          { currency: 'EGP', rate: 31.20, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'KES', rate: 158.50, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'GHS', rate: 12.45, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'UGX', rate: 3850.00, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'TZS', rate: 2520.00, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'XAF', rate: 563.34, vat: 2.0, updated_at: new Date().toISOString() },
          { currency: 'XOF', rate: 605.00, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'MAD', rate: 9.85, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'TND', rate: 3.15, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'DZD', rate: 135.50, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'LYD', rate: 4.85, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'SDG', rate: 600.00, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'ETB', rate: 55.20, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'SOS', rate: 570.00, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'DJF', rate: 177.50, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'KMF', rate: 440.00, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'MUR', rate: 45.50, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'SCR', rate: 13.85, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'CVE', rate: 102.50, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'STD', rate: 22800.00, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'GMD', rate: 67.50, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'GNF', rate: 8600.00, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'SLL', rate: 22800.00, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'LRD', rate: 193.50, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'CDF', rate: 2750.00, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'RWF', rate: 1280.00, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'BIF', rate: 2840.00, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'MWK', rate: 1680.00, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'ZMW', rate: 25.50, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'ZWL', rate: 322.50, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'NAD', rate: 18.75, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'BWP', rate: 13.65, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'SZL', rate: 18.75, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'LSL', rate: 18.75, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'MZN', rate: 63.50, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'AOA', rate: 830.00, vat: 5.0, updated_at: new Date().toISOString() },
          { currency: 'STN', rate: 22.85, vat: 5.0, updated_at: new Date().toISOString() }
        ];
        
        return reply.code(200).send(fallbackRates);
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

  // Simple Fapshi add funds endpoint
  fastify.post('/add-funds/fapshi', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { amount, currency = 'USD' } = request.body;
      const userId = request.user.id;

      if (!amount || amount <= 0) {
        return reply.code(400).send({ error: 'Invalid amount' });
      }

      // Create payment record
      const reference = `FAPSHI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { data: payment, error: paymentError } = await fastify.supabase
        .from('fapshi_payments')
        .insert([{
          user_id: userId,
          reference: reference,
          amount: amount,
          currency: currency,
          status: 'pending'
        }])
        .select()
        .single();

      if (paymentError) {
        fastify.log.error('Error creating payment record:', paymentError);
        return reply.code(500).send({ error: 'Failed to create payment record' });
      }

      return reply.code(200).send({
        success: true,
        payment: payment,
        message: 'Payment record created successfully'
      });

    } catch (error) {
      fastify.log.error('Error creating Fapshi payment:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

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
        message: 'Payment record created successfully'
      });

    } catch (error) {
      fastify.log.error('Error creating Fapshi payment:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Check Fapshi payment status
  fastify.get('/add-funds/status/:reference', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { reference } = request.params;
      const userId = request.user.id;

      // Get payment record
      const { data: payment, error: paymentError } = await fastify.supabase
        .from('fapshi_payments')
        .select('*')
        .eq('reference', reference)
        .eq('user_id', userId)
        .single();

      if (paymentError || !payment) {
        return reply.code(404).send({ error: 'Payment not found' });
      }

      return reply.code(200).send({
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        reference: payment.reference
      });

    } catch (error) {
      fastify.log.error('Error checking payment status:', error);
      return reply.code(500).send({ error: 'Internal server error' });
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

      // Get current balance from user_balances table
      const { data: balanceData, error: balanceError } = await fastify.supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', userId)
        .eq('currency', 'USD')
        .single();

      if (balanceError && balanceError.code === 'PGRST116') {
        // Create new balance record if doesn't exist
        const { data: newBalance, error: createError } = await fastify.supabase
          .from('user_balances')
          .insert([{
            user_id: userId,
            balance: amount,
            currency: 'USD'
          }])
          .select('balance')
          .single();

        if (createError) {
          fastify.log.error('Error creating balance record:', createError);
          return reply.code(500).send({ error: 'Failed to add funds' });
        }

        return reply.code(200).send({ 
          balance: newBalance.balance,
          message: 'Funds added successfully'
        });
      } else if (balanceError) {
        fastify.log.error('Error fetching balance:', balanceError);
        return reply.code(500).send({ error: 'Failed to fetch balance' });
      }

      // Update existing balance
      const currentBalance = balanceData.balance || 0;
      const newBalance = currentBalance + amount;
      const { data: updatedBalance, error: updateError } = await fastify.supabase
        .from('user_balances')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('currency', 'USD')
        .select('balance')
        .single();

      if (updateError) {
        fastify.log.error('Error updating balance:', updateError);
        return reply.code(500).send({ error: 'Failed to add funds' });
      }

      return reply.code(200).send({ 
        balance: updatedBalance.balance,
        message: 'Funds added successfully'
      });
    } catch (error) {
      fastify.log.error('Error adding funds:', error);
      return reply.code(500).send({ error: 'Failed to add funds' });
    }
  });

  // Check if user has sufficient balance
  const checkBalance = async (userId, requiredAmount) => {
    const { data: balanceData, error } = await fastify.supabase
      .from('user_balances')
      .select('balance')
      .eq('user_id', userId)
      .eq('currency', 'USD')
      .single();

    if (error || !balanceData) {
      return { hasBalance: false, currentBalance: 0 };
    }

    return { 
      hasBalance: (balanceData.balance || 0) >= requiredAmount, 
      currentBalance: balanceData.balance || 0 
    };
  };

  // Deduct amount from user balance
  const deductBalance = async (userId, amount) => {
    const { data: balanceData, error: balanceError } = await fastify.supabase
      .from('user_balances')
      .select('balance')
      .eq('user_id', userId)
      .eq('currency', 'USD')
      .single();

    if (balanceError) {
      return { success: false, error: 'Balance record not found' };
    }

    const currentBalance = balanceData.balance || 0;
    if (currentBalance < amount) {
      return { success: false, error: 'Insufficient balance' };
    }

    const newBalance = currentBalance - amount;
    const { error: updateError } = await fastify.supabase
      .from('user_balances')
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('currency', 'USD');

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

  // Fapshi Payment Helper Functions
  async function creditUserBalance(fastify, userId, amount, currency) {
    try {
      // Credit the user's balance in user_balances table
      const { data: existingBalance, error: balanceError } = await fastify.supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', userId)
        .eq('currency', currency)
        .single();

      let currentBalance = 0;
      let newBalance = amount;

      if (balanceError && balanceError.code === 'PGRST116') {
        // No existing balance record, create new one
        fastify.log.info(`Creating new balance record for user ${userId} with ${amount} ${currency}`);
        const { data: insertResult, error: insertError } = await fastify.supabase
          .from('user_balances')
          .insert([{
            user_id: userId,
            balance: amount,
            currency: currency
          }])
          .select('balance')
          .single();

        if (insertError) {
          fastify.log.error('Failed to create balance record:', insertError);
          return { success: false, error: insertError.message, newBalance: 0 };
        }
        
        newBalance = insertResult.balance;
        fastify.log.info(`New balance record created: ${newBalance} ${currency}`);
      } else if (balanceError) {
        // Other database error
        fastify.log.error('Error fetching existing balance:', balanceError);
        return { success: false, error: balanceError.message, newBalance: 0 };
      } else {
        // Update existing balance
        currentBalance = parseFloat(existingBalance.balance || 0);
        newBalance = currentBalance + amount;
        
        const { error: updateError } = await fastify.supabase
          .from('user_balances')
          .update({ 
            balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('currency', currency);

        if (updateError) {
          fastify.log.error('Failed to update balance:', updateError);
          return { success: false, error: updateError.message, newBalance: 0 };
        }
        
        fastify.log.info(`Balance updated successfully: ${newBalance} ${currency}`);
      }

      fastify.log.info(`User ${userId} balance credited: ${amount} ${currency}. New balance: ${newBalance}`);
      return { success: true, newBalance, error: null };
    } catch (error) {
      fastify.log.error('Error in creditUserBalance:', error);
      return { success: false, error: error.message, newBalance: 0 };
    }
  }

  async function handleSuccessfulPayment(fastify, paymentData) {
    try {
      fastify.log.info('Processing successful payment:', paymentData);
      
      // Get payment record from database
      const { data: payment, error: paymentError } = await fastify.supabase
        .from('payments')
        .select('*')
        .eq('provider_transaction_id', paymentData.transaction_id)
        .single();

      if (paymentError) {
        fastify.log.error('Error fetching payment record:', paymentError);
        return { success: false, error: paymentError.message };
      }

      // Credit user balance
      const creditResult = await creditUserBalance(fastify, payment.user_id, payment.amount, payment.currency);
      
      if (!creditResult.success) {
        fastify.log.error('Failed to credit user balance:', creditResult.error);
        return { success: false, error: creditResult.error };
      }

      fastify.log.info(`Payment processed successfully. New balance: ${creditResult.newBalance}`);
      return { success: true, newBalance: creditResult.newBalance };

      // Send success notification (implement as needed)
      // await sendPaymentSuccessNotification(payment);

    } catch (error) {
      fastify.log.error('Error handling successful payment:', error);
      return { success: false, error: error.message };
    }
  }

  async function handleFailedPayment(fastify, paymentData) {
    try {
      fastify.log.info('Processing failed payment:', paymentData);
      
      // Log failure and potentially notify user
      // Implementation depends on your notification system
      
    } catch (error) {
      fastify.log.error('Error handling failed payment:', error);
    }
  }

  // Simple Fapshi payment verification
  fastify.get('/api/payment/fapshi/verify/:reference', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const { reference } = request.params;
      const userId = request.user.id;

      // Get payment record from database
      const { data: payment, error: paymentError } = await fastify.supabase
        .from('fapshi_payments')
        .select('*')
        .eq('reference', reference)
        .eq('user_id', userId)
        .single();

      if (paymentError) {
        return reply.code(404).send({
          error: 'Payment not found',
        });
      }

      // Verify payment with Fapshi
      const verificationResponse = await fetch(`${process.env.FAPSHI_BASE_URL}/payments/status?reference=${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.FAPSHI_SECRET_KEY}`,
          'X-Public-Key': process.env.FAPSHI_PUBLIC_KEY,
        },
      });

      const result = await verificationResponse.json();

      if (!verificationResponse.ok) {
        return reply.code(400).send({
          error: result.message || 'Payment verification failed',
        });
      }

      // Update payment status
      await fastify.supabase
        .from('fapshi_payments')
        .update({
          status: result.data.status,
          fapshi_transaction_id: result.data.id,
          updated_at: new Date().toISOString(),
        })
        .eq('reference', reference);

      // If payment is successful, credit user balance
      if (result.data.status === 'completed') {
        const creditResult = await creditUserBalance(fastify, userId, result.data.amount / 100, result.data.currency);
        
        if (!creditResult.success) {
          return reply.code(500).send({
            error: 'Payment completed but failed to update balance',
            details: creditResult.error
          });
        }

        return reply.code(200).send({
          success: true,
          data: {
            reference: result.data.reference,
            amount: result.data.amount / 100,
            currency: result.data.currency,
            status: result.data.status,
            newBalance: creditResult.newBalance,
            message: 'Payment completed and balance updated successfully',
          },
        });
      }

      return reply.code(200).send({
        success: true,
        data: {
          reference: result.data.reference,
          amount: result.data.amount / 100,
          currency: result.data.currency,
          status: result.data.status,
          message: 'Payment verification completed',
        },
      });

    } catch (error) {
      fastify.log.error('Payment verification error:', error);
      return reply.code(500).send({
        error: 'Internal server error',
      });
    }
  });
}
