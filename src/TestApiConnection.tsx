import { useEffect, useState } from 'react';
import apiClient from './lib/apiClient';

const TestApiConnection = () => {
  const [healthStatus, setHealthStatus] = useState<string>('Checking...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Attempting to call API at:', `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'}/health`);
        const response = await apiClient.get('/health', {
          // Add timeout and other options here if needed
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });
        
        console.log('Health check response:', response);
        setHealthStatus(`Success! Status: ${response.status}`);
      } catch (err: any) {
        console.error('API connection error details:', {
          message: err.message,
          name: err.name,
          stack: err.stack,
          response: err.response ? {
            status: err.response.status,
            statusText: err.response.statusText,
            headers: err.response.headers,
            data: err.response.data
          } : 'No response',
          request: err.request ? 'Request was made but no response received' : 'No request was made',
          config: {
            url: err.config?.url,
            method: err.config?.method,
            headers: err.config?.headers,
            baseURL: err.config?.baseURL,
            timeout: err.config?.timeout,
          }
        });
        
        let errorMessage = 'Unknown error';
        if (err.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          errorMessage = `Server responded with status ${err.response.status}: ${err.response.statusText}`;
        } else if (err.request) {
          // The request was made but no response was received
          errorMessage = 'No response received from server. Check if the backend is running.';
        } else if (err.message) {
          // Something happened in setting up the request that triggered an Error
          errorMessage = `Request error: ${err.message}`;
        }
        
        setError(`Failed to connect to API: ${errorMessage}`);
      }
    };

    testConnection();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>API Connection Test</h2>
      <p>API Base URL: {import.meta.env.VITE_API_BASE_URL}</p>
      <p>Status: {error ? <span style={{ color: 'red' }}>{error}</span> : healthStatus}</p>
    </div>
  );
};

export default TestApiConnection;
