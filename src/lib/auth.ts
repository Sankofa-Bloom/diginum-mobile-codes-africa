import { supabase } from './supabaseClient';
import apiClient from './apiClient';
import { API_BASE_URL } from '@/config';

export async function signup(email: string, password: string) {
  try {
    if (import.meta.env.DEV) {
      console.log('Attempting signup for:', email);
    }
    
    // Use Supabase directly for signup instead of backend API
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    
    if (error) {
      console.error('Supabase signup error:', error);
      throw error;
    }
    
    if (!data.user) {
      throw new Error('No user data returned from signup');
    }
    
    if (import.meta.env.DEV) {
      console.log('Signup successful for:', email);
    }
    return { user: data.user };
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
}

export async function login(email: string, password: string) {
  try {
    if (import.meta.env.DEV) {
      console.log('Attempting login for:', email);
    }
    
    // Validate inputs
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    
    // Trim email to remove whitespace
    const trimmedEmail = email.trim();
    
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email: trimmedEmail, 
      password 
    });
    
    if (error) {
      console.error('Supabase login error:', error);
      throw error;
    }
    
    if (!data.user) {
      throw new Error('No user data returned from authentication');
    }
    
    if (import.meta.env.DEV) {
      console.log('Login successful for:', trimmedEmail);
    }
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function logout() {
  try {
    if (import.meta.env.DEV) {
      console.log('Attempting logout');
    }
    
    // Clear any local storage items that might be related to auth
    localStorage.removeItem('sb-auth-token');
    localStorage.removeItem('auth_token');
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    // Clear any remaining session data
    await apiClient.post('/auth/logout').catch(err => console.error('Error clearing server session:', err));
    
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
    
    if (import.meta.env.DEV) {
      console.log('Logout successful');
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
    if (import.meta.env.DEV) {
      console.log('Getting current user');
    }
    
    // First check if we have an active session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return null;
    }
    
    if (!sessionData.session) {
      if (import.meta.env.DEV) {
        console.log('No active session found');
      }
      return null;
    }

    // Get the current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting current user:', userError);
      // Clear invalid session
      await supabase.auth.signOut();
      return null;
    }
    
    if (!userData.user) {
      if (import.meta.env.DEV) {
        console.log('No user data found');
      }
      // Clear invalid session
      await supabase.auth.signOut();
      return null;
    }

          if (import.meta.env.DEV) {
        console.log('Current user found:', userData.user.email);
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
    if (import.meta.env.DEV) {
      console.log('Attempting password reset for:', email);
    }
    const response = await apiClient.post('/auth/forgot-password', { email });
    if (import.meta.env.DEV) {
      console.log('Password reset email sent');
    }
    return response;
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
}

// Helper function to check if user is authenticated
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return user !== null;
}
