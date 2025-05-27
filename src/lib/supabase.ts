import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Use environment variables from the .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY 
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE 

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);

// Helper functions for authentication
export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

export const signUp = async (email: string, password: string, metadata: { first_name: string, last_name: string, username: string, role: string }) => {
  console.log("Attempting signup with:", { email, metadata });
  try {
    // Validate and normalize the role
    const validRoles = ['recruiter', 'client'];
    const normalizedRole = validRoles.includes(metadata.role) ? metadata.role : 'administrator';
    
    // First create the user in auth.users using admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        ...metadata,
        role: normalizedRole
      }
    });
    
    if (authError) {
      console.error("Auth signup error:", authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error("No user data returned from signup");
    }

    // Then create the user in the public.users table
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email || '',
        first_name: metadata.first_name,
        last_name: metadata.last_name,
        username: metadata.username,
        role: normalizedRole,
        created_at: authData.user.created_at,
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error creating user in users table:", insertError);
      // If we fail to create the user in public.users, we should clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw insertError;
    }

    // Sign in the user after successful creation
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      console.error("Error signing in after registration:", signInError);
      throw signInError;
    }

    return { data: signInData, error: null };
  } catch (error) {
    console.error("Signup failed:", error);
    throw error;
  }
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user;
};

export const resetPassword = async (email: string) => {
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
};

// Get user count for auto-generating username
export const getUserCount = async () => {
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  return count || 0;
};

// Get user profile data directly from auth.users to avoid RLS issues
export const getUserProfile = async (userId: string) => {
  try {
    // First try to get user from public.users
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userData) {
      return userData;
    }
    
    // If that fails, fallback to auth.user metadata
    const { data: authUser } = await supabase.auth.getUser();
    if (authUser && authUser.user) {
      // Create a user profile from auth data
      return {
        id: authUser.user.id,
        email: authUser.user.email || '',
        first_name: authUser.user.user_metadata.first_name || '',
        last_name: authUser.user.user_metadata.last_name || '',
        username: authUser.user.user_metadata.username || '',
        role: authUser.user.user_metadata.role || 'administrator',
        created_at: authUser.user.created_at,
        updated_at: null,
        deleted_at: null
      };
    }
    
    throw new Error('User not found');
  } catch (err) {
    console.error('Error getting user profile:', err);
    throw err;
  }
};

// Update user profile with service role to bypass RLS
export const updateUserProfile = async (userId: string, updates: Partial<Database['public']['Tables']['users']['Update']>) => {
  return await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', userId);
};

// Sync user data from auth.users to users table
export const syncUserData = async (userId: string) => {
  try {
    // Get user data from auth.users
    const { data: authUser, error: authError } = await supabase.auth.getUser();
    
    if (authError) throw authError;
    if (!authUser.user) throw new Error('No user found');

    // Check if user exists in users table
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      // Create user in users table
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authUser.user.id,
          email: authUser.user.email || '',
          first_name: authUser.user.user_metadata.first_name || '',
          last_name: authUser.user.user_metadata.last_name || '',
          username: authUser.user.user_metadata.username || '',
          role: authUser.user.user_metadata.role || 'administrator',
          created_at: authUser.user.created_at,
          updated_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;
    } else {
      // Update existing user
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          email: authUser.user.email || '',
          first_name: authUser.user.user_metadata.first_name || '',
          last_name: authUser.user.user_metadata.last_name || '',
          username: authUser.user.user_metadata.username || '',
          role: authUser.user.user_metadata.role || 'administrator',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw updateError;
    }

    return { success: true };
  } catch (error) {
    console.error('Error syncing user data:', error);
    throw error;
  }
};

// Sync all users from auth.users to users table
export const syncAllUsers = async () => {
  try {
    // Get all users from auth.users
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) throw authError;
    
    // For each user, ensure they exist in the users table
    for (const authUser of users) {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', authUser.id)
        .single();

      if (!existingUser) {
        // Create user in users table
        const { error: insertError } = await supabaseAdmin
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email || '',
            first_name: authUser.user_metadata.first_name || '',
            last_name: authUser.user_metadata.last_name || '',
            username: authUser.user_metadata.username || '',
            role: authUser.user_metadata.role || 'administrator',
            created_at: authUser.created_at,
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error(`Error creating user ${authUser.id}:`, insertError);
        }
      } else {
        // Update existing user
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            email: authUser.email || '',
            first_name: authUser.user_metadata.first_name || '',
            last_name: authUser.user_metadata.last_name || '',
            username: authUser.user_metadata.username || '',
            role: authUser.user_metadata.role || 'administrator',
            updated_at: new Date().toISOString(),
          })
          .eq('id', authUser.id);

        if (updateError) {
          console.error(`Error updating user ${authUser.id}:`, updateError);
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error syncing all users:', error);
    throw error;
  }
};
