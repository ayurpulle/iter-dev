// Route preloading utility for critical routes
export const preloadRoute = (routePath: string) => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = routePath;
  document.head.appendChild(link);
};

// Preload critical routes
export const preloadCriticalRoutes = () => {
  // Preload map route as it's likely to be visited
  preloadRoute('/map');
  
  // Preload chat route for social features
  preloadRoute('/messages');
  
  // Preload trip planning as it's a core feature
  preloadRoute('/?view=savedTrips');
};

// Preload critical data
export const preloadCriticalData = async () => {
  try {
    // Preload mapbox token in background
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Get current session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    // Preload mapbox token
    supabase.functions.invoke('get-mapbox-token', {
      headers: session ? {
        Authorization: `Bearer ${session.access_token}`,
      } : {}
    });
  } catch (error) {
    console.log('Preload failed silently:', error);
  }
};