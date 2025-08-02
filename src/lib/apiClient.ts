import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Log the base URL being used
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api');

apiClient.interceptors.request.use((config) => {
  // Add auth token here if stored in localStorage or cookies
  const token = localStorage.getItem('auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized globally
    }
    return Promise.reject(error);
  }
);

export default apiClient;
