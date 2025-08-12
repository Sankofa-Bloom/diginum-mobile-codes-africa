#!/bin/bash

echo "🚀 Running DigiNum Database Setup..."
echo "======================================"

echo "📋 This script will help you set up the missing database tables."
echo "   Make sure you have access to your Supabase SQL Editor."
echo ""

echo "📝 Copy the contents of 'quick_db_setup.sql' and run it in your Supabase SQL Editor."
echo ""

echo "🔍 The updated setup includes:"
echo "   ✅ orders table"
echo "   ✅ user_balances table" 
echo "   ✅ payments table (was missing!)"
echo "   ✅ add_funds_payments table (was missing!)"
echo "   ✅ Proper RLS policies for all tables"
echo "   ✅ Required indexes for performance"
echo "   ✅ Safe to run multiple times (uses IF NOT EXISTS)"
echo ""

echo "📖 To run the setup:"
echo "   1. Go to your Supabase dashboard"
echo "   2. Navigate to SQL Editor"
echo "   3. First run 'check_db_status.sql' to see what already exists"
echo "   4. Then run 'quick_db_setup.sql' to create missing tables/policies"
echo "   5. Click 'Run' to execute each script"
echo ""

echo "⚠️  After running the setup, the balance update issue should be resolved."
echo "   The missing 'payments' table was causing the 'Payment completed but failed to update balance' error."
echo ""

echo "🎯 Next steps:"
echo "   1. Run the database setup in Supabase"
echo "   2. Test a payment to verify balance updates work"
echo "   3. Check the logs for successful balance updates"
echo ""

echo "✨ Setup complete! Check 'quick_db_setup.sql' for the full setup script."
