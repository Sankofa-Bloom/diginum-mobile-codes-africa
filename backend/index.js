import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const fastify = Fastify({ logger: true });

// Register CORS with specific configuration
await fastify.register(cors, {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
  maxAge: 600, // 10 minutes
});

// Health check route
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', time: new Date().toISOString() };
});

// Attach Supabase client to Fastify instance
import { supabase } from './supabase.js';
fastify.decorate('supabase', supabase);

// Register all DigiNum API routes with /api prefix
import routes from './routes.js';
await fastify.register(routes, { prefix: '/api' });

const PORT = process.env.PORT || 4000;

fastify.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Server listening at ${address}`);
});
