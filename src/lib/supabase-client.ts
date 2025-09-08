import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

class SupabaseClientManager {
  private static instance: SupabaseClientManager;
  private client: ReturnType<typeof createClient<Database>>;
  private sessionCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.client = createClient<Database>(
      "https://lmsmnfjcmzqqmzdejztx.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxtc21uZmpjbXpxcW16ZGVqenR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzAxNzYsImV4cCI6MjA3MTU0NjE3Nn0.C9WteJnLCu30ga-Bw0vUDj-Mp6zrg7TI9smxNwDSarg",
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        },
        global: {
          headers: {
            'x-application-name': 'wayfarer-weave'
          }
        },
        db: {
          schema: 'public'
        }
      }
    );

    // Set up automatic session validation
    this.setupSessionMonitoring();
  }

  private setupSessionMonitoring() {
    // Check session validity every 30 seconds
    this.sessionCheckInterval = setInterval(async () => {
      const { data: { session }, error } = await this.client.auth.getSession();
      
      if (error || !session) {
        console.log('Session invalid, attempting refresh...');
        await this.client.auth.refreshSession();
      }
    }, 30000);

    // Clean up on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.sessionCheckInterval) {
          clearInterval(this.sessionCheckInterval);
        }
      });
    }
  }

  public static getInstance(): SupabaseClientManager {
    if (!SupabaseClientManager.instance) {
      SupabaseClientManager.instance = new SupabaseClientManager();
    }
    return SupabaseClientManager.instance;
  }

  public getClient() {
    return this.client;
  }

  // Ensure we have a valid session before any operation
  public async getAuthenticatedClient() {
    const { data: { session }, error } = await this.client.auth.getSession();
    
    if (!session || error) {
      // Try to refresh
      const { data: { session: newSession }, error: refreshError } = 
        await this.client.auth.refreshSession();
      
      if (!newSession || refreshError) {
        throw new Error('Authentication required. Please log in again.');
      }
    }
    
    return this.client;
  }
}

export const supabaseManager = SupabaseClientManager.getInstance();
export const supabase = supabaseManager.getClient();