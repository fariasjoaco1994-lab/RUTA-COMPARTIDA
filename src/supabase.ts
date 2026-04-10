import { createClient } from '@supabase/supabase-js';

let rawUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If only the project ID is provided (e.g., "etfbsvrfjrsddmwuqwje"), construct the full URL
if (rawUrl && !rawUrl.startsWith('http') && !rawUrl.includes('.')) {
  rawUrl = `https://${rawUrl}.supabase.co`;
}

const supabaseUrl = rawUrl;

const isValidUrl = (url: string | undefined): url is string => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl));

if (!isSupabaseConfigured) {
  console.warn('Supabase configuration is missing or invalid. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the Settings menu.');
}

// Provide a valid URL format fallback to prevent the SDK from throwing an error during initialization
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
