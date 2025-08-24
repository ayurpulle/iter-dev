import { useState } from "react";
import TripCard from "./TripCard";

interface CompactFriendsListProps {
  filterLocation?: string;
  onTripClick?: (trip: any) => void;
}

const CompactFriendsList = ({ filterLocation, onTripClick }: CompactFriendsListProps) => {
  const friendsTrips = [
    {
      user: {
        name: "Sarah Johnson",
        username: "sarahj",
        avatar: undefined,
      },
      trip: {
        title: "Japan Adventure",
        duration: "14 days",
        distance: "2,500km",
        date: "March 2024",
        stops: [
          { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
          { name: "Kyoto", lat: 35.0116, lng: 135.7681 },
          { name: "Osaka", lat: 34.6937, lng: 135.5023 },
        ],
        companions: 3,
        description: "Amazing cultural experience exploring ancient temples, modern cities, and incredible food.",
        highlights: ["Cherry blossom viewing", "Temple visits", "Sushi making class", "Bullet train rides"],
        cost: "$3,200",
        rating: 5,
        photoCount: 24,
        photos: [],
      },
      stats: {
        likes: 42,
        comments: 8,
      },
    },
    {
      user: {
        name: "Mike Chen",
        username: "mikechen",
        avatar: undefined,
      },
      trip: {
        title: "Iceland Road Trip",
        duration: "8 days",
        distance: "1,800km",
        date: "February 2024",
        stops: [
          { name: "Reykjavik", lat: 64.1466, lng: -21.9426 },
          { name: "Blue Lagoon", lat: 63.8804, lng: -22.4495 },
          { name: "Akureyri", lat: 65.6835, lng: -18.1262 },
        ],
        companions: 1,
        description: "Breathtaking landscapes and natural wonders around the Ring Road.",
        highlights: ["Northern Lights", "Blue Lagoon", "Geysir", "Waterfalls"],
        cost: "$2,100",
        rating: 4,
        photoCount: 18,
        photos: [],
      },
      stats: {
        likes: 35,
        comments: 5,
      },
    },
    {
      user: {
        name: "Emma Wilson",
        username: "emmaw",
        avatar: undefined,
      },
      trip: {
        title: "Mediterranean Cruise",
        duration: "12 days",
        distance: "3,200km",
        date: "January 2024",
        stops: [
          { name: "Barcelona", lat: 41.3851, lng: 2.1734 },
          { name: "Rome", lat: 41.9028, lng: 12.4964 },
          { name: "Athens", lat: 37.9838, lng: 23.7275 },
          { name: "Santorini", lat: 36.3932, lng: 25.4615 },
        ],
        companions: 5,
        description: "Luxurious cruise through historic Mediterranean ports.",
        highlights: ["Colosseum tour", "Santorini sunset", "Barcelona beaches", "Greek islands"],
        cost: "$2,800",
        rating: 5,
        photoCount: 31,
        photos: [],
      },
      stats: {
        likes: 67,
        comments: 12,
      },
    },
    {
      user: {
        name: "Alex Rodriguez",
        username: "alexr",
        avatar: undefined,
      },
      trip: {
        title: "Thailand Backpacking",
        duration: "21 days",
        distance: "2,100km",
        date: "December 2023",
        stops: [
          { name: "Bangkok", lat: 13.7563, lng: 100.5018 },
          { name: "Chiang Mai", lat: 18.7883, lng: 98.9853 },
          { name: "Phuket", lat: 7.8804, lng: 98.3923 },
        ],
        companions: 2,
        description: "Budget-friendly adventure through Thailand's diverse regions.",
        highlights: ["Street food tours", "Elephant sanctuary", "Beach hopping", "Temple visits"],
        cost: "$1,400",
        rating: 4,
        photoCount: 45,
        photos: [],
      },
      stats: {
        likes: 28,
        comments: 6,
      },
    },
  ];

  // Filter trips by location if specified
  const filteredTrips = filterLocation 
    ? friendsTrips.filter(item => 
        item.trip.stops.some(stop => 
          stop.name.toLowerCase().includes(filterLocation.toLowerCase()) || 
          filterLocation.toLowerCase().includes(stop.name.toLowerCase())
        )
      )
    : friendsTrips;

  return (
    <div className="max-w-md mx-auto">
      <div className="space-y-6">
        {filteredTrips.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No trips found for {filterLocation}</p>
          </div>
        ) : (
          filteredTrips.map((item, index) => (
            <TripCard
              key={index}
              user={item.user}
              trip={item.trip}
              stats={item.stats}
              expandable={true}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CompactFriendsList;