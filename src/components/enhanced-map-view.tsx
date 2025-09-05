import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Globe, Calendar, Users, DollarSign, Sparkles, ChevronRight, X, Filter, Plane, Clock, Navigation, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import BottomTabBar from './BottomTabBar';
import InteractiveGlobe from './InteractiveGlobe';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';


// Trip Planning Component
const TripPlanning = () => {
  const { user } = useAuth();
  const [destination, setDestination] = useState('');
  const [dates, setDates] = useState({ start: '', end: '' });
  const [tripTypes, setTripTypes] = useState<string[]>([]);
  const [budget, setBudget] = useState('');
  const [useTripsForInspiration, setUseTripsForInspiration] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [folders, setFolders] = useState<{id: string, name: string}[]>([]);
  const [generatedItinerary, setGeneratedItinerary] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const availableTripTypes = ['Adventure', 'Relaxing', 'Cultural', 'Beach', 'City', 'Nature', 'Food', 'Luxury', 'Budget', 'Family'];

  const savedTripsList = [
    { id: 1, title: 'Japan Adventure', location: 'Japan', user: 'Sarah Chen' },
    { id: 2, title: 'Italian Renaissance', location: 'Italy', user: 'Alex Martinez' },
    { id: 3, title: 'Thai Island Paradise', location: 'Thailand', user: 'Maya Patel' },
  ];

  // Fetch folders when component mounts and user is authenticated
  useEffect(() => {
    if (user) {
      fetchFolders();
    }
  }, [user]);

  const fetchFolders = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('item_folders')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');
      
      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

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
        basedOn: useTripsForInspiration ? selectedFolder : null
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
              <input 
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Enter destination (country or city)"
                className="w-full pl-10 pr-3 py-3 border rounded-lg bg-background"
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
                className="w-full p-3 border rounded-lg bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <input 
                type="date"
                value={dates.end}
                onChange={(e) => setDates({...dates, end: e.target.value})}
                className="w-full p-3 border rounded-lg bg-background"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Trip Type (Select multiple)</label>
            <div className="flex flex-wrap gap-2">
              {availableTripTypes.map(type => (
                <Button
                  key={type}
                  variant={tripTypes.includes(type) ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setTripTypes(prev => 
                      prev.includes(type) 
                        ? prev.filter(t => t !== type)
                        : [...prev, type]
                    );
                  }}
                  className={tripTypes.includes(type) ? "bg-gradient-to-r from-primary to-primary-glow text-white shadow-lg" : ""}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="text-sm font-medium mb-2 block">Budget (per person)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
              <input 
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Enter your budget"
                className="w-full pl-10 pr-3 py-3 border rounded-lg bg-background"
              />
            </div>
          </div>

          {/* Use Saved Trips for Inspiration */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Use saved trips for inspiration</label>
              <Switch
                checked={useTripsForInspiration}
                onCheckedChange={setUseTripsForInspiration}
              />
            </div>
            
            {useTripsForInspiration && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Choose trips to use for inspiration
                  </label>
                  <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select folder or all trips" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All saved trips</SelectItem>
                      {folders.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id}>
                          {folder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedFolder && (
                  <div className="text-xs text-muted-foreground p-2 bg-accent/50 rounded">
                    💡 Your itinerary will be inspired by {selectedFolder === 'all' ? 'all your saved trips' : `trips in "${folders.find(f => f.id === selectedFolder)?.name}"`}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Generate Button */}
          <Button 
            onClick={generateItinerary}
            disabled={!destination || isGenerating}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
          >
            {isGenerating ? (
              <>Generating your itinerary...</>
            ) : (
              <>
                <Sparkles size={20} className="mr-2" />
                Generate AI Itinerary
              </>
            )}
          </Button>
        </>
      ) : (
        /* Generated Itinerary Display */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">{generatedItinerary.title}</h3>
            <Button 
              variant="ghost"
              size="icon"
              onClick={() => setGeneratedItinerary(null)}
            >
              <X size={20} />
            </Button>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
            {generatedItinerary.dailyPlans.map((day: any) => (
              <div key={day.day} className="border rounded-lg p-4 space-y-2">
                <h4 className="font-semibold">Day {day.day}: {day.title}</h4>
                <ul className="space-y-1">
                  {day.activities.map((activity: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-0.5">•</span>
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
            <Button className="flex-1">
              Save Itinerary
            </Button>
            <Button variant="outline" className="flex-1">
              Export as PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Map View Component
export default function EnhancedMapView() {
  const [activeTab, setActiveTab] = useState('friends');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [showLocationDetails, setShowLocationDetails] = useState(false);

  // Mock pins data
  const friendPins = [
    { location: 'Tokyo', lat: 35, lng: 60, friends: ['Sarah Chen', 'Mike Johnson'], trips: 3 },
    { location: 'Paris', lat: 40, lng: 45, friends: ['Emma Wilson'], trips: 1 },
    { location: 'Bali', lat: 55, lng: 65, friends: ['Alex Martinez', 'Maya Patel'], trips: 2 },
    { location: 'Rome', lat: 42, lng: 48, friends: ['Sophie Brown'], trips: 1 },
    { location: 'Bangkok', lat: 50, lng: 62, friends: ['Maya Patel'], trips: 1 },
  ];

  const handlePinClick = (pin: any) => {
    setSelectedLocation(pin);
    setShowLocationDetails(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <h1 className="text-xl font-bold text-center">Explore</h1>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex gap-2 justify-center">
            <Button
              variant={activeTab === 'friends' ? "default" : "ghost"}
              onClick={() => setActiveTab('friends')}
            >
              Friends' Trips
            </Button>
            <Button
              variant={activeTab === 'plan' ? "default" : "ghost"}
              onClick={() => setActiveTab('plan')}
            >
              Plan Trip
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'friends' ? (
          <div className="space-y-6">
            <InteractiveGlobe pins={friendPins} onPinClick={handlePinClick} />
            
            {/* Location Details Modal */}
            {showLocationDetails && selectedLocation && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-card rounded-xl p-6 max-w-md w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">{selectedLocation.location}</h3>
                    <Button 
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowLocationDetails(false)}
                    >
                      <X size={20} />
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users size={16} />
                      <span>{selectedLocation.friends.length} friends visited</span>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Friends who visited:</h4>
                      <div className="space-y-2">
                        {selectedLocation.friends.map((friend: string, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-accent rounded-lg">
                            <span className="text-sm">{friend}</span>
                            <ChevronRight size={16} className="text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <Button className="w-full">
                      View All {selectedLocation.trips} Trips
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Friends' Recent Trips */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Recent Trips from Friends</h2>
              <div className="space-y-4">
                {[
                  { user: 'Sarah Chen', location: 'Tokyo, Japan', time: '2 days ago', image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop' },
                  { user: 'Alex Martinez', location: 'Bali, Indonesia', time: '1 week ago', image: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=400&h=300&fit=crop' },
                  { user: 'Maya Patel', location: 'Bangkok, Thailand', time: '2 weeks ago', image: 'https://images.unsplash.com/photo-1563492065-c3a2e356a5e4?w=400&h=300&fit=crop' }
                ].map((trip, idx) => (
                  <div key={idx} className="border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer">
                    <div className="flex gap-3">
                      <img src={trip.image} alt={trip.location} className="w-16 h-16 rounded-lg object-cover" />
                      <div className="flex-1">
                        <h3 className="font-medium">{trip.user}</h3>
                        <p className="text-sm text-muted-foreground">{trip.location}</p>
                        <p className="text-xs text-muted-foreground">{trip.time}</p>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <TripPlanning />
        )}
      </div>
      
      <BottomTabBar />
    </div>
  );
}