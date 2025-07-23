import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const fastify = Fastify({ logger: true });

// Register CORS
await fastify.register(cors, {
  origin: '*',
});

// Health check route
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', time: new Date().toISOString() };
});

// Attach Supabase client to Fastify instance
import { supabase } from './supabase.js';
fastify.decorate('supabase', supabase);

// Register all DigiNum API routes
import routes from './routes.js';
await fastify.register(routes);

const PORT = process.env.PORT || 4000;

fastify.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Server listening at ${address}`);
});
