import { useEffect, useState } from 'react';

export function useCSRFToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Generate CSRF token on mount
    const csrfToken = generateCSRFToken();
    setToken(csrfToken);

    // Add CSRF token to meta tag for AJAX requests
    const meta = document.createElement('meta');
    meta.name = 'csrf-token';
    meta.content = csrfToken;
    document.head.appendChild(meta);
  }, []);

  return token;
}

function generateCSRFToken(): string {
  // Generate a cryptographically secure random token
  return window.crypto.getRandomValues(new Uint8Array(32))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
