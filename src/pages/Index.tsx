import * as React from 'react';
import TopBar from "@/components/TopBar";
import TripCard from "@/components/TripCard";
import BottomTabBar from "@/components/BottomTabBar";

const Index = () => {
  // Update mocks to include photos and mini-maps
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

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />
      
      <div className="text-center py-4">
        <h1 className="text-3xl font-bold text-primary">Get Addicted to the Real World</h1>
      </div>
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="space-y-6">
          {mockTrips.map((trip, index) => (
            <TripCard key={index} user={trip.user} trip={trip.trip} stats={trip.stats} />
          ))}
        </div>
      </main>
      
      <BottomTabBar />
    </div>
  );
};

export default Index;
