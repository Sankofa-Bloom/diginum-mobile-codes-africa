/**
 * Format phone number to include country code
 * @param phoneNumber - The phone number to format
 * @returns Formatted phone number with country code
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove any non-digit characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // If number already starts with +237, return as is
  if (cleaned.startsWith('+237')) {
    return cleaned;
  }

  // If number starts with 237, add +
  if (cleaned.startsWith('237')) {
    return '+' + cleaned;
  }

  // If number starts with +, add 237 after +
  if (cleaned.startsWith('+')) {
    return '+237' + cleaned.slice(1);
  }

  // Otherwise, add +237
  return '+237' + cleaned;
}

/**
 * Validate MTN Cameroon phone number
 * @param phoneNumber - The phone number to validate
 * @returns boolean indicating if number is valid
 */
export function isValidMTNNumber(phoneNumber: string): boolean {
  // Remove any non-digit characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Should be either +237XXXXXXXXX or 237XXXXXXXXX or XXXXXXXXX
  // where X is 9 digits starting with MTN prefixes (67, 68, 650-653)
  const mtnPrefixes = ['67', '68', '650', '651', '652', '653'];
  
  // Extract the number part without country code
  let numberPart = cleaned;
  if (cleaned.startsWith('+237')) {
    numberPart = cleaned.slice(4);
  } else if (cleaned.startsWith('237')) {
    numberPart = cleaned.slice(3);
  }

  // Check if it's 9 digits
  if (numberPart.length !== 9) {
    return false;
  }

  // Check if it starts with valid MTN prefix
  return mtnPrefixes.some(prefix => numberPart.startsWith(prefix));
}

/**
 * Format phone number for display
 * @param phoneNumber - The phone number to format
 * @returns Formatted phone number for display
 */
export function formatPhoneNumberForDisplay(phoneNumber: string): string {
  // Remove any non-digit characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // If empty, return empty string
  if (!cleaned) {
    return '';
  }

  // Format as +237 XX XX XX XX XX
  let formatted = formatPhoneNumber(cleaned);
  if (formatted.startsWith('+237')) {
    const number = formatted.slice(4);
    return `+237 ${number.match(/.{1,2}/g)?.join(' ') || number}`;
  }

  return formatted;
}
