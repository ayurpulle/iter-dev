import * as React from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const FriendsList = () => {
  const friendsTrips = [
    {
      friend: {
        name: "Sarah Johnson",
        username: "sarahj",
        initials: "SJ",
      },
      trip: {
        title: "Japan Adventure",
        duration: "14 days",
        date: "March 2024",
        locations: ["Tokyo", "Kyoto", "Osaka"],
        companions: 3,
      },
    },
    {
      friend: {
        name: "Mike Chen",
        username: "mikechen",
        initials: "MC",
      },
      trip: {
        title: "Iceland Road Trip",
        duration: "8 days",
        date: "February 2024",
        locations: ["Reykjavik", "Blue Lagoon", "Northern Lights"],
        companions: 1,
      },
    },
    {
      friend: {
        name: "Emma Wilson",
        username: "emmaw",
        initials: "EW",
      },
      trip: {
        title: "Mediterranean Cruise",
        duration: "12 days",
        date: "January 2024",
        locations: ["Barcelona", "Rome", "Athens", "Santorini"],
        companions: 5,
      },
    },
    {
      friend: {
        name: "Alex Rodriguez",
        username: "alexr",
        initials: "AR",
      },
      trip: {
        title: "Thailand Backpacking",
        duration: "21 days",
        date: "December 2023",
        locations: ["Bangkok", "Chiang Mai", "Phuket"],
        companions: 2,
      },
    },
  ];

  return (
    <div className="px-4 py-6 max-w-md mx-auto">
      <div className="space-y-4">
        {friendsTrips.map((item, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {item.friend.initials}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{item.friend.name}</h3>
                    <p className="text-sm text-muted-foreground">@{item.friend.username}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">{item.trip.title}</h4>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{item.trip.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users size={12} />
                        <span>{item.trip.companions} people</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin size={12} />
                      <span>{item.trip.locations.join(" → ")}</span>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {item.trip.duration}
                    </div>
                  </div>
                </div>
              </div>
              <Button>Get planning!</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FriendsList;