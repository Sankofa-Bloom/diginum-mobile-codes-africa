#!/usr/bin/env node

/**
 * DigiNum Authentication Test Script
 * 
 * This script helps test the authentication setup by checking:
 * 1. Environment variables
 * 2. Supabase connection
 * 3. Backend server status
 * 
 * Usage: node test-auth.js
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Load environment variables
dotenv.config();

console.log('🔍 DigiNum Authentication Test\n');

// Test 1: Check environment variables
console.log('1. Checking environment variables...');

const requiredEnvVars = {
  'VITE_SUPABASE_URL': process.env.VITE_SUPABASE_URL,
  'VITE_SUPABASE_ANON_KEY': process.env.VITE_SUPABASE_ANON_KEY,
  'SUPABASE_URL': process.env.SUPABASE_URL,
  'SUPABASE_KEY': process.env.SUPABASE_KEY,
  'VITE_API_BASE_URL': process.env.VITE_API_BASE_URL
};

let envErrors = 0;
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value || value.includes('your-') || value.includes('YOUR_')) {
    console.log(`   ❌ ${key}: Missing or placeholder value`);
    envErrors++;
  } else {
    console.log(`   ✅ ${key}: Configured`);
  }
}

if (envErrors > 0) {
  console.log(`\n   ⚠️  Found ${envErrors} environment variable issues.`);
  console.log('   Please update your .env files with actual values from your Supabase dashboard.\n');
} else {
  console.log('\n   ✅ All environment variables are properly configured.\n');
}

// Test 2: Test Supabase connection
console.log('2. Testing Supabase connection...');

try {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('   ❌ Missing Supabase credentials');
  } else {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection
    const { data, error } = await supabase.from('exchange_rates').select('count').limit(1);
    
    if (error) {
      console.log(`   ❌ Supabase connection failed: ${error.message}`);
    } else {
      console.log('   ✅ Supabase connection successful');
    }
  }
} catch (error) {
  console.log(`   ❌ Supabase test failed: ${error.message}`);
}

// Test 3: Test backend server
console.log('\n3. Testing backend server...');

try {
  const apiUrl = process.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
  const response = await axios.get(`${apiUrl.replace('/api', '')}/health`, {
    timeout: 5000
  });
  
  if (response.status === 200) {
    console.log('   ✅ Backend server is running');
  } else {
    console.log(`   ⚠️  Backend server responded with status: ${response.status}`);
  }
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    console.log('   ❌ Backend server is not running');
    console.log('   💡 Start the backend with: cd backend && npm start');
  } else {
    console.log(`   ❌ Backend test failed: ${error.message}`);
  }
}

// Test 4: Check for test users
console.log('\n4. Checking for test users...');
console.log('   💡 You can create test users in your Supabase dashboard:');
console.log('   📍 Go to: https://supabase.com/dashboard');
console.log('   📍 Select your project');
console.log('   📍 Go to Authentication → Users');
console.log('   📍 Click "Add User" or use the signup form in your app');

// Summary
console.log('\n📋 Summary:');
console.log('   To fix authentication issues:');
console.log('   1. Update .env files with actual Supabase credentials');
console.log('   2. Start the backend server: cd backend && npm start');
console.log('   3. Start the frontend: npm run dev');
console.log('   4. Create test users in Supabase dashboard');
console.log('   5. Test login at: http://localhost:5173/login');

console.log('\n🔗 Useful links:');
console.log('   - Supabase Dashboard: https://supabase.com/dashboard');
console.log('   - Project URL: https://xoivxzjhgjyvuzcmzcas.supabase.co');
console.log('   - Frontend: http://localhost:5173');
console.log('   - Backend: http://localhost:4000');

console.log('\n✨ Test completed!\n'); 