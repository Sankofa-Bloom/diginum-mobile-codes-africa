/**
 * Simple test script to verify Fapshi integration
 * Run this to test the Fapshi API endpoints
 */

const API_BASE = 'http://localhost:4000';

async function testFapshiIntegration() {
  console.log('🧪 Testing Fapshi Integration...\n');

  // Test 1: Check if XAF currency is available
  console.log('1️⃣ Testing XAF currency availability...');
  try {
    const response = await fetch(`${API_BASE}/api/exchange-rates`);
    const rates = await response.json();
    const xafRate = rates.find(rate => rate.currency === 'XAF');
    
    if (xafRate) {
      console.log('✅ XAF currency found:', xafRate);
    } else {
      console.log('❌ XAF currency not found');
      return;
    }
  } catch (error) {
    console.error('❌ Error fetching exchange rates:', error.message);
    return;
  }

  // Test 2: Test Fapshi payment initialization (without auth for testing)
  console.log('\n2️⃣ Testing Fapshi payment routes accessibility...');
  try {
    const response = await fetch(`${API_BASE}/api/payment/fapshi/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 1000,
        currency: 'XAF',
        email: 'test@example.com',
        name: 'Test User'
      })
    });

    if (response.status === 401) {
      console.log('✅ Fapshi routes are accessible (authentication required as expected)');
    } else {
      console.log(`ℹ️ Unexpected response status: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error testing Fapshi routes:', error.message);
  }

  // Test 3: Test environment variables (placeholder test)
  console.log('\n3️⃣ Environment variables check...');
  console.log('ℹ️ Make sure to set the following in backend/.env:');
  console.log('   - FAPSHI_PUBLIC_KEY=your-fapshi-public-key');
  console.log('   - FAPSHI_SECRET_KEY=your-fapshi-secret-key');
  console.log('   - FAPSHI_BASE_URL=https://sandbox.fapshi.com/api/v1');
  console.log('   - FAPSHI_ENVIRONMENT=sandbox');

  console.log('\n🎉 Fapshi integration test completed!');
  console.log('\n📋 Next steps:');
  console.log('   1. Add Fapshi API keys to backend/.env');
  console.log('   2. Run the SQL script: backend/fapshi-payments.sql in Supabase');
  console.log('   3. Test with XAF currency in the frontend');
  console.log('   4. Switch to production keys when ready to go live');
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testFapshiIntegration().catch(console.error);
}

export { testFapshiIntegration };