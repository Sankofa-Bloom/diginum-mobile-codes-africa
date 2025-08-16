import { supabase } from './supabaseClient';
import apiClient from './apiClient';
import { API_BASE_URL } from '@/config';

export async function signup(email: string, password: string, userData?: {
  first_name?: string;
  last_name?: string;
  phone?: string;
}) {
  try {
    if (import.meta.env.DEV) {
      console.log('Attempting signup for:', email);
    }
    
    // Use Supabase for authentication
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

    // Don't create user record here - it will be created when they first log in
    // This avoids RLS policy issues during signup when the user isn't fully authenticated yet
    
    if (import.meta.env.DEV) {
      console.log('Signup successful for:', email);
      console.log('User record will be created on first login');
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

    // Get the current user from Supabase auth
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

    // Fetch additional user data from our custom users table
    try {
      const { data: customUserData, error: customUserError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userData.user.id)
        .single();

      if (customUserError && customUserError.code === 'PGRST116') {
        // User record doesn't exist in our table, create it
        if (import.meta.env.DEV) {
          console.log('Creating missing user record in users table');
        }
        
        // Try to get additional user data from localStorage (from signup)
        let additionalData: { full_name?: string; phone?: string } = {};
        try {
          const pendingEmail = localStorage.getItem('pendingVerificationEmail');
          if (pendingEmail === userData.user.email) {
            // This user just signed up, we might have additional data
            const signupData = localStorage.getItem('signupUserData');
            if (signupData) {
              additionalData = JSON.parse(signupData);
              // Clean up localStorage
              localStorage.removeItem('signupUserData');
            }
          }
        } catch (e) {
          console.error('Error parsing signup data:', e);
        }
        
        const { error: insertError } = await supabase
          .from('users')
          .insert([{
            id: userData.user.id,
            email: userData.user.email,
            full_name: additionalData.full_name || null,
            phone: additionalData.phone || null,
          }]);

        if (insertError) {
          console.error('Error creating user record:', insertError);
        } else {
          // Fetch the newly created record
          const { data: newUserData } = await supabase
            .from('users')
            .select('*')
            .eq('id', userData.user.id)
            .single();
          
          if (newUserData) {
            // Merge Supabase auth data with our custom user data
            return {
              ...userData.user,
              ...newUserData,
            };
          }
        }
      } else if (customUserData) {
        // Merge Supabase auth data with our custom user data
        return {
          ...userData.user,
          ...customUserData,
        };
      }
    } catch (customUserError) {
      console.error('Error fetching custom user data:', customUserError);
      // Continue with just Supabase auth data if custom table fails
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

// Function to update user profile in our custom users table
export async function updateUserProfile(userId: string, updates: {
  full_name?: string;
  phone?: string;
}) {
  try {
    if (import.meta.env.DEV) {
      console.log('Updating user profile for:', userId);
    }

    const { error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }

    if (import.meta.env.DEV) {
      console.log('User profile updated successfully');
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to update user profile:', error);
    throw error;
  }
}

// Function to get user profile from our custom users table
export async function getUserProfile(userId: string) {
  try {
    if (import.meta.env.DEV) {
      console.log('Getting user profile for:', userId);
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to get user profile:', error);
    throw error;
  }
}
