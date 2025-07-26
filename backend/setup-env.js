import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), '.env');

if (!existsSync(envPath)) {
  const defaultEnv = `# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Backend Configuration
NODE_ENV=production
PORT=3000

# JWT Configuration
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=*
`;
  
  writeFileSync(envPath, defaultEnv, 'utf-8');
  console.log('Created default .env file. Please update it with your actual configuration.');
} else {
  console.log('.env file already exists');
}
