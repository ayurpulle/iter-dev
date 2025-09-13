import { useSearchParams } from 'react-router-dom';
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";
import TripPlanning from "@/components/TripPlanning";
import { useOptimizedPosts } from "@/hooks/useOptimizedPosts";
import OptimizedPostCard from "@/components/OptimizedPostCard";

interface Post {
  id: string;
  content: string;
  image_url?: string;
  user_id: string;
  trip_id?: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_private?: boolean;
}

interface Profile {
  id: string;
  user_id: string;
  name?: string;
  username?: string;
  avatar?: string;
}

interface Trip {
  id: string;
  title?: string;
  destination?: string;
  duration?: string;
  distance?: string;
  cost?: string;
  companions?: string;
  stops?: any; // JSON field from database
  images?: string[];
}

interface PostWithProfile extends Post {
  profiles?: Profile | null;
  trips?: Trip | null;
}

const Index = () => {
  const [searchParams] = useSearchParams();
  const { posts, loading, handleDeletePost } = useOptimizedPosts();
  
  // Check if we should show trip planning (saved trips view)
  const shouldShowTripPlanning = searchParams.get('view') === 'savedTrips';
  const openIterId = searchParams.get('openIter');

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <TopBar />
        <main className="px-4 py-6 max-w-md mx-auto">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-1"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="h-48 bg-gray-300 rounded mb-3"></div>
                <div className="flex gap-4">
                  <div className="h-8 bg-gray-300 rounded w-16"></div>
                  <div className="h-8 bg-gray-300 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </main>
        <BottomTabBar />
      </div>
    );
  }

  // Show trip planning component when view=savedTrips
  if (shouldShowTripPlanning) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <TripPlanning openIterId={openIterId} />
        <BottomTabBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="space-y-4 px-4 py-4 max-w-2xl mx-auto">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts yet. Start sharing your adventures!</p>
            </div>
          ) : (
            posts.map((post) => (
              <OptimizedPostCard
                key={post.id}
                post={post}
                onDelete={handleDeletePost}
              />
            ))
          )}
        </div>
      </main>
      <BottomTabBar />
    </div>
  );
};

export default Index;