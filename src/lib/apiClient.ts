import axios from 'axios';
import { supabase } from './supabaseClient';
import { API_BASE_URL } from '../config';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Log the base URL being used
console.log('API Base URL:', API_BASE_URL);

apiClient.interceptors.request.use(async (config) => {
  try {
    // Get the current session from Supabase client
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token && config.headers) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    console.error('Error getting session:', error);
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
