# SMS Provider Integration Documentation

## Overview

DigiNum now integrates with the [SMS Activation Service](https://sms-verification-number.com/en/api-sms-activate/) to provide real SMS verification numbers. This integration replaces the mock data with actual phone numbers and SMS delivery.

## API Integration

### Base URL
```
https://sms-verification-number.com/stubs/handler_api
```

### Required Parameters
- `api_key`: Your SMS provider API key
- `action`: The API method to call
- `lang`: Language/currency (en for English/dollars, ru for Russian/rubles)

### Supported API Methods

#### 1. Get Countries and Operators
```javascript
// Action: getCountryAndOperators
const countries = await callSmsApi('getCountryAndOperators');
```

**Response Format:**
```json
[
  {
    "id": 0,
    "name": "Russia",
    "operators": {
      "any": "any",
      "tele2": "tele2",
      "tinkoff": "tinkoff"
    }
  }
]
```

#### 2. Get Services and Costs
```javascript
// Action: getServicesAndCost
const services = await callSmsApi('getServicesAndCost', {
  country: countryId
});
```

**Response Format:**
```json
{
  "wa": {
    "cost": "5.99",
    "count": 150
  },
  "ig": {
    "cost": "7.99",
    "count": 75
  }
}
```

#### 3. Order Phone Number
```javascript
// Action: getNumber
const orderData = await callSmsApi('getNumber', {
  country: countryId,
  service: serviceId
});
```

**Response Format:**
```
ACCESS_NUMBER:phone_number:order_id
```

#### 4. Check SMS Status
```javascript
// Action: getStatus
const smsData = await callSmsApi('getStatus', {
  id: orderId
});
```

**Response Formats:**
- `STATUS_OK:verification_code` - SMS received
- `STATUS_WAIT_CODE` - Waiting for SMS
- `STATUS_CANCEL` - Order cancelled

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# SMS Provider Configuration
SMS_API_KEY=your_sms_provider_api_key_here
```

### Getting Your API Key

1. Visit [sms-verification-number.com](https://sms-verification-number.com/en/api-sms-activate/)
2. Sign up for an account
3. Go to your Profile section
4. Copy your API key
5. Add it to your `.env` file

## Database Schema Updates

The orders table now includes additional fields for SMS provider integration:

```sql
ALTER TABLE orders ADD COLUMN sms_order_id VARCHAR(255);
```

## API Endpoints

### Updated Endpoints

#### GET `/api/countries`
- **Before**: Returns hardcoded country list
- **After**: Fetches real countries from SMS provider
- **Fallback**: Returns hardcoded list if API fails

#### GET `/api/services/:countryId`
- **Before**: Returns hardcoded service list
- **After**: Fetches real services and prices from SMS provider
- **Fallback**: Returns hardcoded list if API fails

#### POST `/api/generate-number`
- **Before**: Generates random phone numbers
- **After**: Orders real phone numbers from SMS provider
- **Features**: Real-time pricing, availability checking

#### GET `/api/verification-code/:orderId`
- **Before**: Generates random verification codes
- **After**: Retrieves real SMS codes from provider
- **Features**: Real SMS delivery status checking

#### POST `/api/request-another-code/:orderId`
- **Before**: Generates new random codes
- **After**: Checks for new SMS codes from provider
- **Features**: Free additional codes for same number

## Error Handling

### SMS Provider Errors

The system handles various SMS provider error responses:

```javascript
// Common error responses
'NO_NUMBERS'           // No numbers available
'NO_BALANCE'           // Insufficient balance
'BAD_SERVICE'          // Invalid service
'BAD_COUNTRY'          // Invalid country
'BAD_ACTION'           // Invalid action
'BAD_KEY'              // Invalid API key
```

### Fallback Strategy

If the SMS provider API fails, the system falls back to:

1. **Countries**: Hardcoded list of supported countries
2. **Services**: Hardcoded list of common services
3. **Numbers**: Mock number generation (for testing)
4. **Codes**: Mock verification codes (for testing)

## Testing

### Development Mode

For development and testing, you can:

1. **Use mock data**: Don't set `SMS_API_KEY` in `.env`
2. **Test with real API**: Set your actual API key
3. **Monitor logs**: Check backend logs for API responses

### Production Mode

For production:

1. **Set real API key**: Use your actual SMS provider API key
2. **Monitor balance**: Check SMS provider account balance
3. **Handle errors**: Implement proper error handling for API failures

## Cost Management

### Pricing Structure

- **Real-time pricing**: Prices fetched from SMS provider
- **Dynamic availability**: Number availability checked in real-time
- **Balance integration**: User balance deducted for actual costs

### Balance Requirements

Users need sufficient balance to:
1. **Order numbers**: Pay actual SMS provider costs
2. **Receive codes**: No additional cost for receiving SMS
3. **Request more codes**: Free for same number

## Security Considerations

### API Key Security

- **Environment variables**: Never commit API keys to version control
- **Access control**: Limit API key access to necessary personnel
- **Rotation**: Regularly rotate API keys

### Rate Limiting

The SMS provider has rate limits:
- **150 RPS**: Maximum requests per second
- **Proper handling**: Implement rate limiting in your application

## Monitoring and Logging

### API Monitoring

Monitor the following metrics:
- **API response times**: Track SMS provider performance
- **Error rates**: Monitor API failure rates
- **Success rates**: Track successful number orders

### Logging

The system logs:
- **API calls**: All SMS provider API requests
- **Responses**: API response data
- **Errors**: Detailed error information
- **Fallbacks**: When fallback data is used

## Troubleshooting

### Common Issues

1. **API Key Invalid**
   - Check API key in `.env` file
   - Verify key is active in SMS provider dashboard

2. **No Numbers Available**
   - Check SMS provider balance
   - Try different countries or services
   - Wait for numbers to become available

3. **SMS Not Received**
   - Check order status with `getStatus`
   - Verify phone number is active
   - Wait for SMS delivery (can take 1-5 minutes)

4. **High Costs**
   - Check real-time pricing before ordering
   - Compare prices across countries
   - Use `getServicesAndCostWithStatistics` for best prices

### Support

For SMS provider issues:
- **Provider Support**: Contact SMS Activation Service support
- **Documentation**: Refer to [API documentation](https://sms-verification-number.com/en/api-sms-activate/)
- **Community**: Check provider forums for common issues

## Migration Guide

### From Mock to Real API

1. **Get API key**: Sign up for SMS provider account
2. **Update environment**: Add `SMS_API_KEY` to `.env`
3. **Test integration**: Verify API calls work
4. **Monitor performance**: Check response times and success rates
5. **Update documentation**: Inform users of real SMS delivery

### Backward Compatibility

The system maintains backward compatibility:
- **Fallback data**: Available when API fails
- **Same endpoints**: No changes to frontend API calls
- **Error handling**: Graceful degradation to mock data

## Future Enhancements

### Planned Features

1. **Multiple providers**: Support for multiple SMS providers
2. **Advanced pricing**: Dynamic pricing based on demand
3. **Bulk orders**: Support for ordering multiple numbers
4. **Webhook support**: Real-time SMS delivery notifications
5. **Analytics**: Detailed usage and cost analytics

### API Improvements

1. **Caching**: Cache country and service data
2. **Retry logic**: Automatic retry for failed API calls
3. **Circuit breaker**: Prevent cascade failures
4. **Health checks**: Monitor SMS provider health 