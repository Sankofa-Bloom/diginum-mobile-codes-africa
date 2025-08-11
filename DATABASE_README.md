# 🗄️ DigiNum Database Setup

## Overview
This is the **single, comprehensive database setup file** for DigiNum with **advanced pricing and profit tracking**. All previous migration files have been cleaned up and consolidated into one file: `database_setup.sql`.

## 📁 Files
- **`database_setup.sql`** - Complete database setup with pricing management (ONLY file you need)

## 🚀 Quick Setup

### Step 1: Access Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select your project: `xoivxzjhgjyvuzcmzcas`
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Run the Setup
1. **Copy the entire content** from `database_setup.sql`
2. **Paste it into the SQL Editor**
3. **Click "Run"** to execute

### Step 3: Verify Success
You should see:
- ✅ "Database setup completed successfully!"
- ✅ List of 8 tables with column counts
- ✅ Data counts for countries, services, and exchange rates
- ✅ RLS status for all tables
- ✅ Profit calculation function test results

## 🏗️ What Gets Created

### Tables
- **`orders`** - User service orders with **dual pricing** (app + API)
- **`countries`** - Available countries
- **`services`** - Available services with **profit margin tracking**
- **`exchange_rates`** - Currency conversion rates
- **`user_balances`** - User account balances
- **`payments`** - Payment transactions
- **`pricing_history`** - **Historical pricing changes and tracking**
- **`profit_tracking`** - **Financial analytics and profit margins**

### Data
- **8 countries** (Cameroon, Nigeria, Ghana, Kenya, Senegal, Ivory Coast, Uganda, Tanzania)
- **8 currencies** with exchange rates
- **22 services** across all countries with **dual pricing structure**
- **Sample data** ready for testing

### Security
- **Row Level Security (RLS)** enabled on all tables
- **Access policies** for user data protection
- **Helper functions** for common operations

## 💰 **Advanced Pricing Features**

### Dual Pricing Structure
- **`app_price`** - Price charged to customer in the app
- **`api_price`** - Price charged by SMS provider/API
- **`markup_amount`** - Profit margin amount
- **`markup_percentage`** - Profit margin percentage

### Profit Tracking
- **Automatic profit calculation** when orders are created
- **Historical pricing tracking** for audit trails
- **Financial analytics** for business insights
- **Currency conversion** support

### Example Pricing
- **MTN Mobile Money (Cameroon)**: App: $10.00, API: $8.00, Profit: $2.00 (25%)
- **Airtel Money (Nigeria)**: App: $15.00, API: $11.54, Profit: $3.46 (30%)

## 🔧 Features

- **Performance indexes** on key columns
- **Helper functions** for balance, exchange rate, and profit operations
- **Comprehensive security** with RLS policies
- **Production-ready** schema design
- **Error handling** with conflict resolution
- **Profit margin calculations** and analytics

## 🚨 Troubleshooting

### If you get errors:
1. **Check the SQL Editor** for specific error messages
2. **Ensure you're in the correct project** in Supabase
3. **Run the script in one go** (don't split it)
4. **Check that all tables were created** before data insertion

### Common issues:
- **Permission errors** - Make sure you're using the service role key
- **Syntax errors** - Copy the entire file without modifications
- **Table already exists** - The script uses `IF NOT EXISTS` so this is safe

## 📊 After Setup

Once successful:
1. **Refresh your application**: https://diginum.netlify.app
2. **Dashboard should load** without database errors
3. **All basic functionality** should work
4. **Profit tracking** will be automatically enabled
5. **Ready for production** use with financial transparency

## 🔄 Updates

To modify the database later:
1. **Edit `database_setup.sql`** locally
2. **Test changes** in a development environment
3. **Run the updated script** in production
4. **Use `ALTER TABLE`** statements for existing tables

## 📈 **Business Intelligence Features**

### Profit Analytics
- **Revenue tracking** per order
- **Cost analysis** from SMS providers
- **Profit margin calculations** in real-time
- **Historical profit trends** over time

### Pricing Management
- **Flexible markup** percentages per service
- **Currency support** for international operations
- **Price change tracking** with audit trails
- **Competitive pricing** analysis

## 📞 Support

If you encounter issues:
1. **Check the error message** in Supabase SQL Editor
2. **Verify table creation** with the verification queries
3. **Ensure proper permissions** are set
4. **Contact development team** for complex issues

---

**Note**: This is the ONLY database file you need. All previous migration files have been removed for cleanliness. The new schema includes comprehensive pricing and profit tracking for better business management. 