import { useState, useEffect } from 'react';
import TopBar from "@/components/TopBar";
import TripCard from "@/components/TripCard";
import BottomTabBar from "@/components/BottomTabBar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Mock trips data (keeping this as the main content)
  const mockTrips = [
    {
      user: {
        name: "Shreyas Athreya",
        username: "shreyasathreya",
        avatar: undefined,
      },
      trip: {
        title: "Colombia — Solo Travel",
        duration: "25 hours",
        distance: "1000km",
        stops: [
          { name: "Medellín", lat: 6.2442, lng: -75.5812 },
          { name: "Bogotá", lat: 4.7110, lng: -74.0721 },
        ],
        photoCount: 12,
      },
      stats: {
        likes: 24,
        comments: 3,
      },
      photoUrls: ["url1", "url2"],
      map: "mock map",
    },
    {
      user: {
        name: "Ayur Palle",
        username: "ayurpalle",
        avatar: undefined,
      },
      trip: {
        title: "Portugal — Summer and 3 others",
        duration: "3 hours",
        distance: "215 km",
        stops: [
          { name: "Porto", lat: 41.1579, lng: -8.6291 },
          { name: "Évora", lat: 38.5714, lng: -7.9036 },
          { name: "Lisbon", lat: 38.7223, lng: -9.1393 },
        ],
        photoCount: 18,
      },
      stats: {
        likes: 42,
        comments: 7,
      },
      photoUrls: ["url3", "url4"],
      map: "mock map 2",
    },
  ];

  // Simulate loading for consistent UX
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading trips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="space-y-6">
          {/* Trip Cards */}
          {mockTrips.map((trip, index) => (
            <TripCard key={index} user={trip.user} trip={{...trip.trip, id: `trip-${index}`}} stats={trip.stats} />
          ))}
        </div>
      </main>
      
      <BottomTabBar />
    </div>
  );
};

export default Index;
