# Payment Integration Guide

This document provides instructions for setting up and maintaining the MoMo payment integration.

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# MoMo Payment Configuration
MOMO_API_KEY=your_momo_api_key
MOMO_API_SECRET=your_momo_api_secret
MOMO_API_ENDPOINT=https://sandbox.momodeveloper.mtn.com  # For production, use: https://api.mtn.com
MOMO_TARGET_ENVIRONMENT=sandbox  # Change to 'production' for live environment
MOMO_CALLBACK_URL=${NEXT_PUBLIC_APP_URL}/api/payments/momo/callback

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Database Schema

Ensure your database has the following tables:

### payments
```sql
create table public.payments (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) not null,
  user_id uuid references public.users(id) not null,
  amount numeric(10, 2) not null,
  currency varchar(3) default 'XAF' not null,
  payment_method varchar(50) not null,
  status varchar(20) not null,
  external_id varchar(100),
  external_reference varchar(100),
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  processed_at timestamp with time zone
);

-- Add indexes for better query performance
create index idx_payments_order_id on public.payments(order_id);
create index idx_payments_user_id on public.payments(user_id);
create index idx_payments_external_id on public.payments(external_id);
create index idx_payments_status on public.payments(status);
```

## API Endpoints

### 1. Initiate MoMo Payment
- **Endpoint**: `POST /api/payments/momo/initiate`
- **Request Body**:
  ```json
  {
    "amount": 1000.00,
    "phoneNumber": "2376XXXXXXXX",
    "orderId": "uuid-here",
    "userId": "user-uuid-here"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "paymentId": "uuid-here",
    "reference": "momo-reference-123",
    "status": "pending"
  }
  ```

### 2. MoMo Callback (Webhook)
- **Endpoint**: `POST /api/payments/momo/callback`
- **Request Body**: MoMo transaction details
- **Response**: HTTP 200 with success status

### 3. Check Payment Status
- **Endpoint**: `GET /api/payments/status?paymentId=:id`
- **Response**:
  ```json
  {
    "paymentId": "uuid-here",
    "status": "completed",
    "amount": 1000.00,
    "currency": "XAF",
    "orderId": "order-uuid-here",
    "processedAt": "2025-01-01T12:00:00Z"
  }
  ```

## Testing

### Sandbox Testing
1. Set `MOMO_TARGET_ENVIRONMENT=sandbox`
2. Use test credentials provided by MoMo
3. Test with test phone numbers (e.g., 2376XXXXXXX for MTN Cameroon)

### Production
1. Set `MOMO_TARGET_ENVIRONMENT=production`
2. Update API endpoint to production URL
3. Use live API credentials

## Error Handling

Common error responses:
- `400 Bad Request`: Missing or invalid parameters
- `404 Not Found`: Payment not found
- `500 Internal Server Error`: Server error during processing

## Security Considerations

1. Always use HTTPS for all API calls
2. Never expose API keys in client-side code
3. Validate all input data
4. Implement rate limiting on API endpoints
5. Log all payment transactions for auditing

## Troubleshooting

### Common Issues
1. **Payment not showing up in MoMo dashboard**
   - Verify API credentials
   - Check network connectivity to MoMo servers
   - Verify callback URL is accessible

2. **Webhook not being called**
   - Ensure your server is publicly accessible
   - Check MoMo dashboard for webhook delivery status
   - Verify webhook URL is correct

3. **Payment status not updating**
   - Check database connection
   - Verify webhook handler is processing requests
   - Check logs for errors

## Support

For issues with the MoMo integration, contact:
- Developer: [Your Contact Information]
- MoMo Support: [MoMo Support Contact]
