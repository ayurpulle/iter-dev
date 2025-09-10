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
          
          {/* Cartoon World Map */}
          <div className="relative bg-gradient-to-br from-sky-200 via-blue-200 to-cyan-300 dark:from-sky-800 dark:via-blue-800 dark:to-cyan-700 rounded-2xl p-6 mb-4 overflow-hidden">
            {/* Floating clouds */}
            <div className="absolute top-2 left-8 w-12 h-6 bg-white/70 rounded-full"></div>
            <div className="absolute top-4 left-6 w-8 h-4 bg-white/50 rounded-full"></div>
            <div className="absolute top-3 right-12 w-10 h-5 bg-white/60 rounded-full"></div>
            <div className="absolute top-1 right-16 w-6 h-3 bg-white/40 rounded-full"></div>
            
            {/* Sun */}
            <div className="absolute top-4 right-4 w-8 h-8 bg-yellow-400 rounded-full">
              <div className="absolute inset-0 animate-pulse bg-yellow-300 rounded-full opacity-50"></div>
            </div>
            
            <svg viewBox="0 0 800 400" className="w-full h-48 relative z-10">
              {/* Ocean waves */}
              <defs>
                <pattern id="waves" x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse">
                  <path d="M0 10 Q10 5 20 10 T40 10" stroke="#0ea5e9" strokeWidth="1" fill="none" opacity="0.3"/>
                </pattern>
              </defs>
              <rect x="0" y="0" width="800" height="400" fill="url(#waves)"/>
              
              {/* North America - Cartoon style */}
              <g>
                <path
                  d="M50 80 Q80 70 120 75 Q160 70 200 60 Q180 100 180 150 Q140 155 100 160 Q70 155 50 140 Z"
                  fill={worldRegions[0].visited ? "#34d399" : "#f3f4f6"}
                  stroke="#059669"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  className="transition-all duration-300 hover:scale-105 cursor-pointer"
                  style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }}
                />
                {worldRegions[0].visited && (
                  <>
                    <circle cx="120" cy="110" r="3" fill="#dc2626" />
                    <text x="125" y="115" fontSize="8" fill="#374151">🏔️</text>
                  </>
                )}
              </g>
              
              {/* South America - Cartoon style */}
              <g>
                <path
                  d="M120 180 Q150 175 180 170 Q170 220 165 260 Q160 290 160 300 Q130 295 100 290 Q110 240 120 180 Z"
                  fill={worldRegions[1].visited ? "#34d399" : "#f3f4f6"}
                  stroke="#059669"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  className="transition-all duration-300 hover:scale-105 cursor-pointer"
                  style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }}
                />
                {worldRegions[1].visited && (
                  <>
                    <circle cx="140" cy="220" r="3" fill="#dc2626" />
                    <text x="145" y="225" fontSize="8" fill="#374151">🌴</text>
                  </>
                )}
              </g>
              
              {/* Europe - Cartoon style */}
              <g>
                <path
                  d="M350 70 Q400 65 450 60 Q460 80 460 120 Q420 125 380 130 Q350 125 340 100 Q345 85 350 70 Z"
                  fill={worldRegions[2].visited ? "#34d399" : "#f3f4f6"}
                  stroke="#059669"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  className="transition-all duration-300 hover:scale-105 cursor-pointer"
                  style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }}
                />
                {worldRegions[2].visited && (
                  <>
                    <circle cx="400" cy="95" r="3" fill="#dc2626" />
                    <text x="405" y="100" fontSize="8" fill="#374151">🏰</text>
                  </>
                )}
              </g>
              
              {/* Africa - Cartoon style */}
              <g>
                <path
                  d="M320 140 Q400 135 480 130 Q475 180 470 230 Q465 270 470 280 Q420 285 370 290 Q330 285 320 250 Q315 195 320 140 Z"
                  fill={worldRegions[3].visited ? "#34d399" : "#f3f4f6"}
                  stroke="#059669"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  className="transition-all duration-300 hover:scale-105 cursor-pointer"
                  style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }}
                />
                {worldRegions[3].visited && (
                  <>
                    <circle cx="400" cy="200" r="3" fill="#dc2626" />
                    <text x="405" y="205" fontSize="8" fill="#374151">🦁</text>
                  </>
                )}
              </g>
              
              {/* Asia - Cartoon style */}
              <g>
                <path
                  d="M480 50 Q600 45 720 40 Q715 80 710 120 Q705 160 710 200 Q650 205 590 210 Q530 205 490 200 Q485 150 480 100 Q482 75 480 50 Z"
                  fill={worldRegions[4].visited ? "#34d399" : "#f3f4f6"}
                  stroke="#059669"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  className="transition-all duration-300 hover:scale-105 cursor-pointer"
                  style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }}
                />
                {worldRegions[4].visited && (
                  <>
                    <circle cx="600" cy="120" r="3" fill="#dc2626" />
                    <text x="605" y="125" fontSize="8" fill="#374151">🏯</text>
                  </>
                )}
              </g>
              
              {/* Oceania - Cartoon style */}
              <g>
                <path
                  d="M600 250 Q660 245 720 240 Q715 270 710 300 Q705 315 710 320 Q660 325 620 330 Q590 325 600 300 Q598 275 600 250 Z"
                  fill={worldRegions[5].visited ? "#34d399" : "#f3f4f6"}
                  stroke="#059669"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  className="transition-all duration-300 hover:scale-105 cursor-pointer"
                  style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }}
                />
                {worldRegions[5].visited && (
                  <>
                    <circle cx="660" cy="285" r="3" fill="#dc2626" />
                    <text x="665" y="290" fontSize="8" fill="#374151">🦘</text>
                  </>
                )}
              </g>
              
              {/* Cartoon airplane trail */}
              {visitedCountries.length > 0 && (
                <g>
                  <path 
                    d="M100 120 Q300 100 500 140 Q650 160 700 280" 
                    stroke="#f59e0b" 
                    strokeWidth="2" 
                    strokeDasharray="5,5" 
                    fill="none"
                    opacity="0.7"
                  />
                  <text x="720" y="285" fontSize="12">✈️</text>
                </g>
              )}
            </svg>
            
            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2 bg-white/80 px-3 py-1 rounded-full">
                <div className="w-4 h-4 bg-emerald-400 rounded-full border-2 border-emerald-600"></div>
                <span className="font-medium">Explored! 🎉</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 px-3 py-1 rounded-full">
                <div className="w-4 h-4 bg-gray-300 rounded-full border-2 border-gray-500"></div>
                <span className="font-medium">Adventure Awaits! 🗺️</span>
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