import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Get Supabase URL and key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ahldmvotivoolnutvltm.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFobGRtdm90aXZvb2xudXR2bHRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNzgyODgsImV4cCI6MjA2Njg1NDI4OH0.p6_DaQBwa30b5VU-0NQQT2ZMiyaoOwE4De7_yRPD-t8';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

// Helper function to get the Supabase client with the current session
export const getSupabase = (accessToken) => {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};
