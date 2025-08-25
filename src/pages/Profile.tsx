import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InteractiveMap from "@/components/InteractiveMap";
import TripCard from "@/components/TripCard";
import { Card, CardContent } from "@/components/ui/card";
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";

const mockProfile = {
  posts: 12,
  followed: 45,
  following: 67,
  trips: [
    // Mock trips similar to Index.tsx
    {
      title: "Colombia — Solo Travel",
      duration: "25 hours",
      distance: "1000km",
      stops: [{ name: "Medellín", lat: 6.2442, lng: -75.5812 }, { name: "Bogotá", lat: 4.7110, lng: -74.0721 }],
      photoCount: 12,
    },
    // Add more mocks
  ],
  stats: {
    countries: 9,
    cities: 16,
    kmTravelled: 2222,
  },
  visitedLocations: [
    // Mock locations for map
    { latitude: 6.2442, longitude: -75.5812, name: "Medellín" },
    // Add more
  ],
};

const Profile = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <Tabs defaultValue="posts" className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts">#{mockProfile.posts} posts</TabsTrigger>
            <TabsTrigger value="followed">#{mockProfile.followed} followed</TabsTrigger>
            <TabsTrigger value="following">#{mockProfile.following} following</TabsTrigger>
          </TabsList>
          <TabsContent value="posts">
            <div className="space-y-4">
              {mockProfile.trips.map((trip, index) => (
                <TripCard key={index} trip={trip} user={{}} stats={{}} />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="followed">{/* Mock followed list */}</TabsContent>
          <TabsContent value="following">{/* Mock following list */}</TabsContent>
        </Tabs>

        <Card className="mb-6">
          <CardContent>
            <h2>Your Map</h2>
            <InteractiveMap /* Pass visitedLocations as prop if needed */ />
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent>{mockProfile.stats.countries}/ countries</CardContent></Card>
          <Card><CardContent>{mockProfile.stats.cities} cities</CardContent></Card>
          <Card><CardContent>{mockProfile.stats.kmTravelled} km travelled</CardContent></Card>
        </div>
      </main>
      
      <BottomTabBar />
    </div>
  );
};

export default Profile;
