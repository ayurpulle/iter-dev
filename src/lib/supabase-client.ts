import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

class SupabaseClientManager {
  private static instance: SupabaseClientManager;
  private client: ReturnType<typeof createClient<Database>>;
  private sessionCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.client = createClient<Database>(
      "https://pkoayabnnarrifzkvoqp.supabase.co",
      "sb_publishable_uHSW14M0TVmX44MxScy3aw_4JQfaGdx",
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
    
    // If we have a session and no error, use it
    if (session && !error) {
      return this.client;
    }
    
    // If no session or error, try to refresh but don't fail immediately
    console.log('Attempting session refresh...');
    const { data: { session: newSession }, error: refreshError } = 
      await this.client.auth.refreshSession();
    
    // If refresh succeeds, use the client
    if (newSession && !refreshError) {
      console.log('Session refresh successful');
      return this.client;
    }
    
    // Only throw error if both session check and refresh fail
    console.log('Session refresh failed, requiring re-authentication');
    throw new Error('Authentication required. Please log in again.');
  }
}

export const supabaseManager = SupabaseClientManager.getInstance();
export const supabase = supabaseManager.getClient();