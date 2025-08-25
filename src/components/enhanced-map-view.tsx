import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Globe, Calendar, Users, DollarSign, Sparkles, ChevronRight, X, Filter, Plane, Clock, Navigation, Search } from 'lucide-react';

// 3D Globe Component
const Globe3D = ({ pins, onPinClick }) => {
  const [rotation, setRotation] = useState(0);
  const globeRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => (prev + 0.5) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-96 bg-gradient-to-b from-blue-900 to-purple-900 rounded-2xl overflow-hidden">
      {/* Globe */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          ref={globeRef}
          className="w-64 h-64 rounded-full bg-gradient-to-br from-blue-400 to-green-400 relative shadow-2xl"
          style={{ transform: `rotateY(${rotation}deg)`, transformStyle: 'preserve-3d' }}
        >
          {/* Continent shapes (simplified) */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-20 h-16 bg-green-600 opacity-70 rounded-lg transform rotate-12"></div>
            <div className="absolute top-1/3 right-1/4 w-16 h-20 bg-green-600 opacity-70 rounded-lg transform -rotate-12"></div>
            <div className="absolute bottom-1/3 left-1/3 w-24 h-12 bg-green-600 opacity-70 rounded-lg"></div>
          </div>
          
          {/* Pins */}
          {pins.map((pin, idx) => (
            <button
              key={idx}
              onClick={() => onPinClick(pin)}
              className="absolute w-4 h-4 bg-red-500 rounded-full shadow-lg animate-pulse cursor-pointer hover:scale-150 transition-transform"
              style={{
                top: `${pin.lat}%`,
                left: `${pin.lng}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {pin.location}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Globe controls */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button className="bg-white/20 backdrop-blur p-2 rounded-lg text-white hover:bg-white/30 transition-colors">
          <Globe size={20} />
        </button>
        <button className="bg-white/20 backdrop-blur p-2 rounded-lg text-white hover:bg-white/30 transition-colors">
          <Filter size={20} />
        </button>
      </div>
    </div>
  );
};

// Trip Planning Component
const TripPlanning = () => {
  const [destination, setDestination] = useState('');
  const [dates, setDates] = useState({ start: '', end: '' });
  const [tripType, setTripType] = useState('');
  const [budget, setBudget] = useState('');
  const [savedTrips, setSavedTrips] = useState([]);
  const [generatedItinerary, setGeneratedItinerary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const tripTypes = ['Adventure', 'Relaxing', 'Cultural', 'Beach', 'City', 'Nature', 'Food', 'Luxury', 'Budget', 'Family'];

  const savedTripsList = [
    { id: 1, title: 'Japan Adventure', location: 'Japan', user: 'Sarah Chen' },
    { id: 2, title: 'Italian Renaissance', location: 'Italy', user: 'Alex Martinez' },
    { id: 3, title: 'Thai Island Paradise', location: 'Thailand', user: 'Maya Patel' },
  ];

  const generateItinerary = () => {
    setIsGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      setGeneratedItinerary({
        title: `Your Perfect ${destination} Itinerary`,
        duration: '7 days',
        dailyPlans: [
          {
            day: 1,
            title: 'Arrival & City Exploration',
            activities: [
              'Airport transfer to hotel',
              'Check-in and freshen up',
              'Walking tour of historic district',
              'Welcome dinner at local restaurant'
            ],
            tips: 'Jet lag tip: Stay awake until local bedtime'
          },
          {
            day: 2,
            title: 'Cultural Immersion',
            activities: [
              'Morning visit to main museum',
              'Traditional cooking class',
              'Afternoon temple tour',
              'Street food experience'
            ],
            tips: 'Book museum tickets online to skip lines'
          },
          {
            day: 3,
            title: 'Day Trip Adventure',
            activities: [
              'Early morning departure',
              'Scenic countryside tour',
              'Local village visit',
              'Return to city by evening'
            ],
            tips: 'Bring comfortable walking shoes'
          }
        ],
        estimatedBudget: '$1,500',
        basedOn: savedTrips
      });
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {!generatedItinerary ? (
        <>
          {/* Destination Input */}
          <div>
            <label className="text-sm font-medium mb-2 block">Where do you want to go?</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Enter destination (country or city)"
                className="w-full pl-10 pr-3 py-3 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <input 
                type="date"
                value={dates.start}
                onChange={(e) => setDates({...dates, start: e.target.value})}
                className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <input 
                type="date"
                value={dates.end}
                onChange={(e) => setDates({...dates, end: e.target.value})}
                className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700"
              />
            </div>
          </div>

          {/* Trip Type */}
          <div>
            <label className="text-sm font-medium mb-2 block">Trip Type</label>
            <div className="flex flex-wrap gap-2">
              {tripTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setTripType(type)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    tripType === type 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="text-sm font-medium mb-2 block">Budget (per person)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Enter your budget"
                className="w-full pl-10 pr-3 py-3 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700"
              />
            </div>
          </div>

          {/* Saved Trips for Inspiration */}
          <div>
            <label className="text-sm font-medium mb-2 block">Use saved trips for inspiration</label>
            <div className="space-y-2">
              {savedTripsList.map(trip => (
                <label key={trip.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <input 
                    type="checkbox"
                    checked={savedTrips.includes(trip.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSavedTrips([...savedTrips, trip.id]);
                      } else {
                        setSavedTrips(savedTrips.filter(id => id !== trip.id));
                      }
                    }}
                    className="w-4 h-4 text-blue-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{trip.title}</p>
                    <p className="text-xs text-gray-500">{trip.location} • by {trip.user}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button 
            onClick={generateItinerary}
            disabled={!destination || isGenerating}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>Generating your itinerary...</>
            ) : (
              <>
                <Sparkles size={20} />
                Generate AI Itinerary
              </>
            )}
          </button>
        </>
      ) : (
        /* Generated Itinerary Display */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">{generatedItinerary.title}</h3>
            <button 
              onClick={() => setGeneratedItinerary(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {generatedItinerary.duration}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign size={14} />
              {generatedItinerary.estimatedBudget}
            </span>
          </div>

          <div className="space-y-4">
            {generatedItinerary.dailyPlans.map(day => (
              <div key={day.day} className="border rounded-lg p-4 space-y-2">
                <h4 className="font-semibold">Day {day.day}: {day.title}</h4>
                <ul className="space-y-1">
                  {day.activities.map((activity, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-blue-500 mt-0.5">•</span>
                      {activity}
                    </li>
                  ))}
                </ul>
                {day.tips && (
                  <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                    💡 {day.tips}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors">
              Save Itinerary
            </button>
            <button className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Export as PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Map View Component
export default function EnhancedMapView() {
  const [activeTab, setActiveTab] = useState('friends');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showLocationDetails, setShowLocationDetails] = useState(false);

  // Mock pins data
  const friendPins = [
    { location: 'Tokyo', lat: 35, lng: 60, friends: ['Sarah Chen', 'Mike Johnson'], trips: 3 },
    { location: 'Paris', lat: 40, lng: 45, friends: ['Emma Wilson'], trips: 1 },
    { location: 'Bali', lat: 55, lng: 65, friends: ['Alex Martinez', 'Maya Patel'], trips: 2 },
    { location: 'Rome', lat: 42, lng: 48, friends: ['Sophie Brown'], trips: 1 },
    { location: 'Bangkok', lat: 50, lng: 62, friends: ['Maya Patel'], trips: 1 },
  ];

  const handlePinClick = (pin) => {
    setSelectedLocation(pin);
    setShowLocationDetails(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <h1 className="text-xl font-bold text-center">Explore</h1>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setActiveTab('friends')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'friends' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              Friends' Trips
            </button>
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'plan' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              Plan Trip
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'friends' ? (
          <div className="space-y-6">
            <Globe3D pins={friendPins} onPinClick={handlePinClick} />
            
            {/* Location Details Modal */}
            {showLocationDetails && selectedLocation && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">{selectedLocation.location}</h3>
                    <button 
                      onClick={() => setShowLocationDetails(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users size={16} />
                      <span>{selectedLocation.friends.length} friends visited</span>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Friends who visited:</h4>
                      <div className="space-y-2">
                        {selectedLocation.friends.map((friend, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-sm">{friend}</span>
                            <ChevronRight size={16} className="text-gray-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <button className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors">
                      View All {selectedLocation.trips} Trips
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Friends' Recent Trips */}
            <div>