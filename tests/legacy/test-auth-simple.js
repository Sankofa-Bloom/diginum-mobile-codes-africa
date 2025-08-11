#!/usr/bin/env node

/**
 * Simple DigiNum Authentication Test Script
 * 
 * This script checks environment variables and provides guidance
 * 
 * Usage: node test-auth-simple.js
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 DigiNum Authentication Test (Simple)\n');

// Test 1: Check if .env files exist
console.log('1. Checking environment files...');

const envFiles = [
  '.env',
  'backend/.env'
];

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    console.log(`   ✅ ${envFile}: Found`);
  } else {
    console.log(`   ❌ ${envFile}: Missing`);
  }
}

// Test 2: Check environment variables (basic check)
console.log('\n2. Checking environment variables...');

try {
  // Load .env file manually
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    const requiredVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'SUPABASE_URL',
      'SUPABASE_KEY',
      'VITE_API_BASE_URL'
    ];
    
    for (const varName of requiredVars) {
      const line = lines.find(line => line.startsWith(varName + '='));
      if (line) {
        const value = line.split('=')[1]?.trim();
        if (value && !value.includes('your-') && !value.includes('YOUR_') && value !== '') {
          console.log(`   ✅ ${varName}: Configured`);
        } else {
          console.log(`   ❌ ${varName}: Placeholder or empty value`);
        }
      } else {
        console.log(`   ❌ ${varName}: Missing`);
      }
    }
  }
} catch (error) {
  console.log(`   ❌ Error reading .env file: ${error.message}`);
}

// Test 3: Check backend .env
console.log('\n3. Checking backend environment...');

try {
  const backendEnvPath = path.resolve('backend/.env');
  if (fs.existsSync(backendEnvPath)) {
    const envContent = fs.readFileSync(backendEnvPath, 'utf8');
    const lines = envContent.split('\n');
    
    const requiredBackendVars = [
      'SUPABASE_URL',
      'SUPABASE_KEY',
      'SUPABASE_JWT_SECRET',
      'PORT'
    ];
    
    for (const varName of requiredBackendVars) {
      const line = lines.find(line => line.startsWith(varName + '='));
      if (line) {
        const value = line.split('=')[1]?.trim();
        if (value && !value.includes('your-') && !value.includes('YOUR_') && value !== '') {
          console.log(`   ✅ ${varName}: Configured`);
        } else {
          console.log(`   ❌ ${varName}: Placeholder or empty value`);
        }
      } else {
        console.log(`   ❌ ${varName}: Missing`);
      }
    }
  } else {
    console.log('   ❌ backend/.env: File not found');
  }
} catch (error) {
  console.log(`   ❌ Error reading backend .env file: ${error.message}`);
}

// Test 4: Check package.json files
console.log('\n4. Checking dependencies...');

const packageFiles = [
  'package.json',
  'backend/package.json'
];

for (const pkgFile of packageFiles) {
  if (fs.existsSync(pkgFile)) {
    try {
      const pkgContent = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
      console.log(`   ✅ ${pkgFile}: Found with ${Object.keys(pkgContent.dependencies || {}).length} dependencies`);
    } catch (error) {
      console.log(`   ❌ ${pkgFile}: Invalid JSON`);
    }
  } else {
    console.log(`   ❌ ${pkgFile}: Missing`);
  }
}

// Summary and next steps
console.log('\n📋 Summary and Next Steps:');
console.log('\n🔧 To fix authentication issues:');
console.log('   1. Get your Supabase credentials:');
console.log('      - Go to: https://supabase.com/dashboard');
console.log('      - Select project: xoivxzjhgjyvuzcmzcas');
console.log('      - Go to Settings → API');
console.log('      - Copy the anon key and service role key');
console.log('');
console.log('   2. Update your .env files:');
console.log('      - Replace placeholder values with actual keys');
console.log('      - Frontend: .env (VITE_SUPABASE_ANON_KEY)');
console.log('      - Backend: backend/.env (SUPABASE_KEY)');
console.log('');
console.log('   3. Install dependencies:');
console.log('      - npm install');
console.log('      - cd backend && npm install');
console.log('');
console.log('   4. Start the servers:');
console.log('      - Backend: cd backend && npm start');
console.log('      - Frontend: npm run dev (in new terminal)');
console.log('');
console.log('   5. Create test users:');
console.log('      - Go to Supabase dashboard → Authentication → Users');
console.log('      - Add a test user or use the signup form');
console.log('');
console.log('   6. Test login:');
console.log('      - Go to: http://localhost:5173/login');
console.log('      - Use your test user credentials');

console.log('\n🔗 Useful links:');
console.log('   - Supabase Dashboard: https://supabase.com/dashboard');
console.log('   - Project URL: https://xoivxzjhgjyvuzcmzcas.supabase.co');
console.log('   - Frontend: http://localhost:5173');
console.log('   - Backend: http://localhost:4000');

console.log('\n✨ Test completed!\n'); 