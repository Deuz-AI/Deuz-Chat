import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a custom Supabase client with error handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  global: {
    fetch: (...args) => fetch(...args),
  },
});

// Helper function to check if storage bucket exists and is accessible
export const checkStorageAccess = async () => {
  try {
    const { data, error } = await supabase.storage.getBucket('attachments');
    if (error) {
      console.error('Storage bucket access error:', error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (e) {
    console.error('Storage check error:', e);
    return { success: false, error: e };
  }
};

// Function to upload file with better error handling
export const uploadFile = async (path: string, file: File) => {
  try {
    const { data, error } = await supabase.storage
      .from('attachments')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true, // Try to update if exists
      });
      
    if (error) {
      if (error.message.includes('row-level security') || error.message.includes('permission denied')) {
        console.error('RLS policy error:', error);
        return { success: false, error: new Error('Güvenlik politikası hatası: Supabase projenizde storage için doğru izinler ayarlanmamış.') };
      }
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e };
  }
};

export type Session = {
  id: string;
  title: string;
  created_at: string;
}

export type Message = {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  response_time?: number;
  file_id?: string;
  file_name?: string;
  attachments?: string[]; // Image URLs array
  image_url?: string;     // Geriye dönük uyumluluk için tekil resim URL'i
  
  // Deep Search fields
  research_plan?: any;
  search_results?: any;
  analysis_results?: any;
  research_status?: 'planning' | 'searching' | 'analyzing' | 'complete';
  research_progress?: number;
  research_steps?: any;
  research_plan_links?: {
    plan_id: string;
    created_at: string;
    searches: Array<{
      step: number;
      query: string;
      priority: number;
      links: Array<{
        title: string;
        url: string;
        relevance: number;
        domain: string;
        found_at: string;
      }>;
      status: 'running' | 'completed' | 'failed';
      result_count: number;
    }>;
    analyses: Array<{
      step: number;
      type: string;
      description: string;
      key_sources: Array<{
        title: string;
        url: string;
        relevance: number;
      }>;
      findings_count: number;
      status: 'running' | 'completed' | 'failed';
    }>;
    total_links: number;
    unique_domains: string[];
    completion_rate: number;
  };
}