import { rateLimit } from 'fastify-rate-limit';
import helmet from 'fastify-helmet';
import cors from 'fastify-cors';

export default async function securityMiddleware(fastify, opts) {
  // Security headers
  fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", 'data:', 'https:', 'http:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'"],
        childSrc: ["'self'"],
        formAction: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
        blockAllMixedContent: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    dnsPrefetchControl: false,
    expectCt: false,
    frameguard: { action: 'DENY' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: false,
    permissionsPolicy: false,
    referrerPolicy: false,
    xssFilter: true,
  });

  // CORS policy
  fastify.register(cors, {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  });

  // Rate limiting
  fastify.register(rateLimit, {
    max: 100, // limit each IP to 100 requests per time window
    timeWindow: '1 hour', // time window for rate limiting
    keyGenerator: (request) => request.ip, // use IP address for rate limiting
  });

  // CSRF protection
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
      const csrfToken = request.headers['x-csrf-token'];
      const sessionToken = request.session.csrfToken;
      
      if (!csrfToken || csrfToken !== sessionToken) {
        return reply.code(403).send({ error: 'Invalid CSRF token' });
      }
    }
  });

  // Input sanitization
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.body) {
      request.body = sanitizeBody(request.body);
    }
  });

  function sanitizeBody(body) {
    if (typeof body === 'object') {
      return Object.entries(body).reduce((acc, [key, value]) => {
        acc[key] = sanitizeValue(value);
        return acc;
      }, {});
    }
    return sanitizeValue(body);
  }

  function sanitizeValue(value) {
    if (typeof value === 'string') {
      return value.replace(/[<>]/g, ''); // Remove HTML tags
    }
    return value;
  }
}
