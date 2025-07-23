import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
import jwt from 'jsonwebtoken';

export function verifyAccessToken(token) {
  try {
    // Verifies a Supabase JWT (access_token)
    return jwt.verify(token, SUPABASE_JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export function requireAuth(request, reply, done) {
  const authHeader = request.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing or invalid Authorization header' });
    return;
  }
  const token = authHeader.split(' ')[1];
  const user = verifyAccessToken(token);
  if (!user) {
    reply.code(401).send({ error: 'Invalid or expired token' });
    return;
  }
  request.user = user;
  done();
}
