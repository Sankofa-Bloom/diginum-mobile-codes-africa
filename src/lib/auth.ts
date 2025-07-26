import { supabase } from './supabaseClient';
import { API_BASE_URL } from '@/config';

export async function signup(email: string, password: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    // Use the new API route
    const apiUrl = '/api/auth/signup';
    
    console.log('Making request to:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ 
        email: email.trim(), 
        password: password.trim() 
      }),
      credentials: 'same-origin',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('Response status:', response.status);
    
    const responseData = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      const errorMessage = responseData.message || 'Registration failed';
      console.error('Signup error:', errorMessage);
      throw new Error(errorMessage);
    }
    
    // If we have a session, set it in the client
    if (responseData.session) {
      const { data: { session } } = await supabase.auth.setSession(responseData.session);
      return { user: session?.user };
    }
    
    return { user: responseData.user };
  } catch (error) {
    console.error('Signup error:', error);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    throw error;
  }
}

export async function login(email: string, password: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email: email.trim(), 
      password 
    });
    
    clearTimeout(timeoutId);
    
    if (error) {
      console.error('Supabase login error:', error);
      // Provide more user-friendly error messages
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please try again.');
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Please verify your email before logging in.');
      }
      throw new Error(error.message || 'Failed to log in. Please try again.');
    }
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw error;
  }
}

export async function logout() {
  try {
    // Clear any local storage items that might be related to auth
    localStorage.removeItem('sb-auth-token');
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    // Clear any remaining session data
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(err => console.error('Error clearing server session:', err));
    
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
    
    // Refresh the page to ensure all state is cleared
    window.location.href = '/';
  } catch (error) {
    console.error('Error during logout:', error);
    // Even if there was an error, we should still redirect to home
    window.location.href = '/';
    throw new Error('Failed to log out completely. Please try again.');
  }
}

export async function getCurrentUser() {
  try {
    // First check if we have an active session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData.session) {
      console.error('No active session:', sessionError);
      return null;
    }

    // Get the current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('Error getting current user:', userError);
      // Clear invalid session
      await supabase.auth.signOut();
      return null;
    }

    return userData.user;
    
  } catch (error) {
    console.error('Failed to get current user:', error);
    // Clear session on error to prevent infinite loops
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.error('Error during sign out:', signOutError);
    }
    return null;
  }
}

export async function forgotPassword(email: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const result = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send password reset email');
    }
    
    return result;
  } catch (error) {
    console.error('Password reset error:', error);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw new Error(error.message || 'Failed to process password reset request');
  }
}
