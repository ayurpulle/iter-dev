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
          
          {/* Realistic World Map */}
          <div className="relative bg-gradient-to-br from-sky-100 to-blue-200 dark:from-sky-900 dark:to-blue-800 rounded-lg p-4 mb-4">
            <svg viewBox="0 0 1000 500" className="w-full h-64">
              {/* North America */}
              <path
                d="M150 120 C170 100 200 95 230 100 C250 105 270 110 285 125 C295 140 290 160 285 180 C280 200 275 220 265 235 C250 245 230 250 210 245 C190 240 175 230 165 215 C155 200 150 180 145 160 C142 140 145 130 150 120 Z M200 140 C210 135 220 140 225 150 C220 155 210 160 200 155 C195 150 195 145 200 140 Z"
                fill={worldRegions[0].visited ? "#10b981" : "#e5e7eb"}
                stroke="#047857"
                strokeWidth="2"
                className="transition-colors duration-300 hover:brightness-110"
              />
              
              {/* South America */}
              <path
                d="M220 260 C235 250 250 255 260 270 C265 290 260 310 255 330 C250 350 245 370 240 390 C235 410 225 425 210 430 C195 425 185 410 180 390 C175 370 180 350 185 330 C190 310 195 290 200 275 C205 260 212 255 220 260 Z"
                fill={worldRegions[1].visited ? "#10b981" : "#e5e7eb"}
                stroke="#047857"
                strokeWidth="2"
                className="transition-colors duration-300 hover:brightness-110"
              />
              
              {/* Europe */}
              <path
                d="M480 110 C500 105 520 110 535 120 C545 130 550 145 545 160 C540 175 530 185 515 190 C500 185 485 175 475 160 C470 145 475 130 480 110 Z M490 130 C495 125 505 130 510 135 C505 140 495 145 490 140 C485 135 485 130 490 130 Z"
                fill={worldRegions[2].visited ? "#10b981" : "#e5e7eb"}
                stroke="#047857"
                strokeWidth="2"
                className="transition-colors duration-300 hover:brightness-110"
              />
              
              {/* Africa */}
              <path
                d="M460 200 C480 195 500 200 515 210 C525 225 530 245 535 265 C540 285 535 305 530 325 C525 345 515 360 500 370 C485 375 470 370 460 355 C450 340 445 320 450 300 C455 280 460 260 465 240 C467 220 463 210 460 200 Z M480 230 C485 225 495 230 500 235 C495 240 485 245 480 240 C475 235 475 230 480 230 Z"
                fill={worldRegions[3].visited ? "#10b981" : "#e5e7eb"}
                stroke="#047857"
                strokeWidth="2"
                className="transition-colors duration-300 hover:brightness-110"
              />
              
              {/* Asia */}
              <path
                d="M560 90 C590 85 620 90 650 95 C680 100 710 110 730 125 C750 140 760 160 755 180 C750 200 740 215 725 225 C710 235 690 240 670 235 C650 230 630 220 615 205 C600 190 590 170 585 150 C580 130 575 110 570 100 C565 95 562 92 560 90 Z M620 130 C630 125 640 130 645 140 C640 145 630 150 620 145 C615 140 615 135 620 130 Z M680 160 C685 155 695 160 700 165 C695 170 685 175 680 170 C675 165 675 160 680 160 Z"
                fill={worldRegions[4].visited ? "#10b981" : "#e5e7eb"}
                stroke="#047857"
                strokeWidth="2"
                className="transition-colors duration-300 hover:brightness-110"
              />
              
              {/* Australia/Oceania */}
              <path
                d="M740 320 C760 315 780 320 795 330 C805 340 810 355 805 370 C800 380 790 385 775 385 C760 380 750 370 745 355 C740 340 742 330 740 320 Z"
                fill={worldRegions[5].visited ? "#10b981" : "#e5e7eb"}
                stroke="#047857"
                strokeWidth="2"
                className="transition-colors duration-300 hover:brightness-110"
              />
              
              {/* Additional smaller countries/islands for realism */}
              <circle cx="550" cy="140" r="3" fill={worldRegions[2].visited ? "#10b981" : "#e5e7eb"} stroke="#047857" strokeWidth="1" />
              <circle cx="520" cy="160" r="2" fill={worldRegions[2].visited ? "#10b981" : "#e5e7eb"} stroke="#047857" strokeWidth="1" />
              <circle cx="580" cy="180" r="2" fill={worldRegions[4].visited ? "#10b981" : "#e5e7eb"} stroke="#047857" strokeWidth="1" />
              <circle cx="720" cy="250" r="3" fill={worldRegions[4].visited ? "#10b981" : "#e5e7eb"} stroke="#047857" strokeWidth="1" />
              <circle cx="750" cy="280" r="2" fill={worldRegions[4].visited ? "#10b981" : "#e5e7eb"} stroke="#047857" strokeWidth="1" />
              <circle cx="820" cy="350" r="4" fill={worldRegions[5].visited ? "#10b981" : "#e5e7eb"} stroke="#047857" strokeWidth="1" />
              
              {/* Visited country markers */}
              {worldRegions[0].visited && <circle cx="220" cy="150" r="4" fill="#dc2626" stroke="#fff" strokeWidth="2" />}
              {worldRegions[1].visited && <circle cx="235" cy="350" r="4" fill="#dc2626" stroke="#fff" strokeWidth="2" />}
              {worldRegions[2].visited && <circle cx="510" cy="145" r="4" fill="#dc2626" stroke="#fff" strokeWidth="2" />}
              {worldRegions[3].visited && <circle cx="490" cy="280" r="4" fill="#dc2626" stroke="#fff" strokeWidth="2" />}
              {worldRegions[4].visited && <circle cx="650" cy="160" r="4" fill="#dc2626" stroke="#fff" strokeWidth="2" />}
              {worldRegions[5].visited && <circle cx="770" cy="350" r="4" fill="#dc2626" stroke="#fff" strokeWidth="2" />}
            </svg>
            
            <div className="flex items-center justify-center gap-4 mt-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500 rounded border-2 border-emerald-700"></div>
                <span>Visited</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-300 rounded border-2 border-gray-500"></div>
                <span>Not Visited</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600 rounded-full border-2 border-white"></div>
                <span>Your Trips</span>
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