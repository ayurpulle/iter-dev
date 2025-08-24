import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Clock, Route, Globe } from "lucide-react";

interface TravelMapProps {
  visitedCountries: string[];
  travelStats: {
    countriesVisited: number;
    totalCountries: number;
    citiesVisited: number;
    totalCities: number;
    totalDistance: number;
    totalDays: number;
  };
}

const TravelMap = ({ visitedCountries, travelStats }: TravelMapProps) => {
  // Simplified world map regions with visited status
  const worldRegions = [
    { name: "North America", visited: visitedCountries.includes("USA") || visitedCountries.includes("Canada") || visitedCountries.includes("Mexico") },
    { name: "South America", visited: visitedCountries.includes("Brazil") || visitedCountries.includes("Argentina") },
    { name: "Europe", visited: visitedCountries.includes("France") || visitedCountries.includes("Germany") || visitedCountries.includes("Italy") || visitedCountries.includes("Spain") },
    { name: "Africa", visited: visitedCountries.includes("Egypt") || visitedCountries.includes("South Africa") },
    { name: "Asia", visited: visitedCountries.includes("Japan") || visitedCountries.includes("Thailand") || visitedCountries.includes("Indonesia") },
    { name: "Oceania", visited: visitedCountries.includes("Australia") || visitedCountries.includes("New Zealand") },
  ];

  return (
    <div className="space-y-4">
      {/* 2D World Map */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Globe size={18} />
            Travel Map
          </h3>
          
          {/* Simplified SVG World Map */}
          <div className="relative bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg p-4 mb-4">
            <svg viewBox="0 0 800 400" className="w-full h-48">
              {/* North America */}
              <path
                d="M50 80 L200 60 L180 150 L80 160 Z"
                fill={worldRegions[0].visited ? "#22c55e" : "#e5e7eb"}
                stroke="#374151"
                strokeWidth="1"
                className="transition-colors"
              />
              
              {/* South America */}
              <path
                d="M120 180 L180 170 L160 300 L100 290 Z"
                fill={worldRegions[1].visited ? "#22c55e" : "#e5e7eb"}
                stroke="#374151"
                strokeWidth="1"
                className="transition-colors"
              />
              
              {/* Europe */}
              <path
                d="M350 70 L450 60 L460 120 L340 130 Z"
                fill={worldRegions[2].visited ? "#22c55e" : "#e5e7eb"}
                stroke="#374151"
                strokeWidth="1"
                className="transition-colors"
              />
              
              {/* Africa */}
              <path
                d="M320 140 L480 130 L470 280 L330 290 Z"
                fill={worldRegions[3].visited ? "#22c55e" : "#e5e7eb"}
                stroke="#374151"
                strokeWidth="1"
                className="transition-colors"
              />
              
              {/* Asia */}
              <path
                d="M480 50 L720 40 L710 200 L490 210 Z"
                fill={worldRegions[4].visited ? "#22c55e" : "#e5e7eb"}
                stroke="#374151"
                strokeWidth="1"
                className="transition-colors"
              />
              
              {/* Oceania */}
              <path
                d="M600 250 L720 240 L710 320 L590 330 Z"
                fill={worldRegions[5].visited ? "#22c55e" : "#e5e7eb"}
                stroke="#374151"
                strokeWidth="1"
                className="transition-colors"
              />
            </svg>
            
            <div className="flex items-center justify-center gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Visited</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-300 rounded"></div>
                <span>Not Visited</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Travel Statistics */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Travel Statistics</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Countries */}
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Globe size={16} className="text-blue-600" />
                <span className="text-sm font-medium">Countries</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {travelStats.countriesVisited}
              </div>
              <div className="text-sm text-muted-foreground">
                of {travelStats.totalCountries}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(travelStats.countriesVisited / travelStats.totalCountries) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Cities */}
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-2">
                <MapPin size={16} className="text-green-600" />
                <span className="text-sm font-medium">Cities</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {travelStats.citiesVisited}
              </div>
              <div className="text-sm text-muted-foreground">
                of {travelStats.totalCities.toLocaleString()}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((travelStats.citiesVisited / travelStats.totalCities) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Distance */}
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Route size={16} className="text-purple-600" />
                <span className="text-sm font-medium">Distance</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {travelStats.totalDistance.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">kilometers</div>
            </div>

            {/* Time */}
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Clock size={16} className="text-orange-600" />
                <span className="text-sm font-medium">Time</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {travelStats.totalDays}
              </div>
              <div className="text-sm text-muted-foreground">days</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TravelMap;