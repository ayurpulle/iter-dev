import React, { useState } from 'react';
import { Globe, MapPin, Clock, Navigation, Calendar, TrendingUp, Award, Camera, Settings, Grid, Map } from 'lucide-react';

// World Map Component
const WorldMap = ({ visitedCountries }) => {
  const countries = {
    // North America
    'USA': { x: 20, y: 35, width: 15, height: 10 },
    'Canada': { x: 20, y: 25, width: 15, height: 10 },
    'Mexico': { x: 22, y: 45, width: 8, height: 6 },
    
    // South America
    'Brazil': { x: 35, y: 60, width: 10, height: 12 },
    'Argentina': { x: 33, y: 72, width: 6, height: 10 },
    
    // Europe
    'France': { x: 48, y: 32, width: 4, height: 4 },
    'Spain': { x: 46, y: 36, width: 4, height: 3 },
    'Italy': { x: 51, y: 36, width: 3, height: 4 },
    'Germany': { x: 50, y: 30, width: 3, height: 3 },
    'United Kingdom': { x: 47, y: 28, width: 2, height: 3 },
    
    // Africa
    'Egypt': { x: 55, y: 45, width: 4, height: 4 },
    'South Africa': { x: 52, y: 75, width: 5, height: 5 },
    'Morocco': { x: 46, y: 42, width: 3, height: 3 },
    
    // Asia
    'Japan': { x: 82, y: 35, width: 3, height: 5 },
    'China': { x: 72, y: 35, width: 10, height: 8 },
    'India': { x: 68, y: 45, width: 6, height: 8 },
    'Thailand': { x: 72, y: 48, width: 3, height: 4 },
    'Indonesia': { x: 75, y: 58, width: 8, height: 3 },
    
    // Oceania
    'Australia': { x: 78, y: 70, width: 10, height: 8 },
    'New Zealand': { x: 90, y: 78, width: 3, height: 4 },
  };

  return (
    <div className="relative w-full h-64 bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-xl overflow-hidden">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Ocean background */}
        <rect width="100" height="100" fill="currentColor" className="text-blue-200 dark:text-blue-800 opacity-30" />
        
        {/* Countries */}
        {Object.entries(countries).map(([country, coords]) => (
          <rect
            key={country}
            x={coords.x}
            y={coords.y}
            width={coords.width}
            height={coords.height}
            fill={visitedCountries.includes(country) ? 'currentColor' : 'currentColor'}
            className={
              visitedCountries.includes(country) 
                ? 'text-green-500 dark:text-green-400' 
                : 'text-gray-300 dark:text-gray-600'
            }
            stroke="white"
            strokeWidth="0.5"
            rx="1"
          >
            <title>{country}</title>
          </rect>
        ))}
        
        {/* Labels for visited countries */}
        {visitedCountries.map(country => {
          const coords = countries[country];
          if (coords) {
            return (
              <text
                key={`label-${country}`}
                x={coords.x + coords.width / 2}
                y={coords.y + coords.height / 2}
                fill="white"
                fontSize="2"
                textAnchor="middle"
                className="font-bold"
              >
                ✓
              </text>
            );
          }
          return null;
        })}
      </svg>
      
      {/* Map Legend */}
      <div className="absolute bottom-2 right-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Visited</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <span>Not visited</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ icon: Icon, label, value, total }) => (
  <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
    <div className="flex items-start justify-between mb-2">
      <Icon className="text-blue-500" size={20} />
      {total && (
        <span className="text-xs text-gray-500">{Math.round((value/total) * 100)}%</span>
      )}
    </div>
    <div className="space-y-1">
      <p className="text-2xl font-bold">
        {value}{total && <span className="text-sm text-gray-500 font-normal">/{total}</span>}
      </p>
      <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
    </div>
    {total && (
      <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
        <div 
          className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${Math.min((value/total) * 100, 100)}%` }}
        ></div>
      </div>
    )}
  </div>
);

// Main Account Component
export default function EnhancedAccountPage() {
  const [activeTab, setActiveTab] = useState('posts');
  
  // User data
  const userData = {
    name: 'Alex Wanderer',
    username: '@alexwanderer',
    bio: 'Exploring the world one country at a time 🌍 | 32 countries and counting',
    stats: {
      posts: 24,
      followers: 1234,
      following: 567
    }
  };

  // Travel stats
  const travelStats = {
    countriesVisited: 32,
    totalCountries: 195,
    citiesVisited: 87,
    totalCities: 10000,
    totalDistance: 142850, // km
    totalDays: 286,
    continentsVisited: 5,
    totalContinents: 7,
    flightsTaken: 64,
    photosUploaded: 1847
  };

  // Visited countries
  const visitedCountries = [
    'USA', 'Canada', 'Mexico', 'Brazil', 'Argentina',
    'France', 'Spain', 'Italy', 'Germany', 'United Kingdom',
    'Egypt', 'Morocco', 'South Africa',
    'Japan', 'China', 'India', 'Thailand', 'Indonesia',
    'Australia', 'New Zealand'
  ];

  // User posts
  const userPosts = [
    { id: 1, country: 'Japan', title: 'Tokyo Adventures', photo: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400', likes: 234 },
    { id: 2, country: 'Italy', title: 'Roman Holiday', photo: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400', likes: 189 },
    { id: 3, country: 'Thailand', title: 'Island Paradise', photo: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400', likes: 312 },
    { id: 4, country: 'France', title: 'Parisian Dreams', photo: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400', likes: 276 },
    { id: 5, country: 'USA', title: 'NYC Skyline', photo: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400', likes: 198 },
    { id: 6, country: 'Indonesia', title: 'Bali Sunsets', photo: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400', likes: 421 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Profile Section */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                {userData.name[0]}
              </div>
              <div>
                <h1 className="text-xl font-bold">{userData.name}</h1>
                <p className="text-sm text-gray-500">{userData.username}</p>
              </div>
            </div>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <Settings size={20} />
            </button>
          </div>

          {/* Bio */}
          <p className="text-sm mb-4">{userData.bio}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <p className="font-bold text-lg">{userData.stats.posts}</p>
              <p className="text-xs text-gray-500">Posts</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{userData.stats.followers}</p>
              <p className="text-xs text-gray-500">Followers</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{userData.stats.following}</p>
              <p className="text-xs text-gray-500">Following</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'posts' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <Grid size={16} />
              My Posts
            </button>
            <button
              onClick={() => setActiveTab('world')}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'world' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <Map size={16} />
              My World
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'posts' ? (
          /* Posts Grid */
          <div className="grid grid-cols-3 gap-2">
            {userPosts.map(post => (
              <div key={post.id} className="relative aspect-square group cursor-pointer">
                <img 
                  src={post.photo} 
                  alt={post.title}
                  className="w-full h-full object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                  <div className="absolute bottom-2 left-2 right-2 text-white">
                    <p className="text-xs font-medium truncate">{post.title}</p>
                    <p className="text-xs opacity-80">{post.country}</p>
                  </div>
                </div>
                <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  ❤️ {post.likes}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* World Map & Stats */
          <div className="space-y-6">
            {/* World Map */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Globe size={20} />
                Countries I've Visited
              </h3>
              <WorldMap visitedCountries={visitedCountries} />
            </div>

            {/* Travel Stats Grid */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp size={20} />
                Travel Statistics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <StatsCard 
                  icon={Globe}
                  label="Countries visited"
                  value={travelStats.countriesVisited}
                  total={travelStats.totalCountries}
                />
                <StatsCard 
                  icon={MapPin}
                  label="Cities explored"
                  value={travelStats.citiesVisited}
                  total={null}
                />
                <StatsCard 
                  icon={Navigation}
                  label="Total distance"
                  value={`${Math.round(travelStats.totalDistance / 1000)}k`}
                  total={null}
                />
                <StatsCard 
                  icon={Calendar}
                  label="Days traveling"
                  value={travelStats.totalDays}
                  total={null}
                />
              </div>
            </div>

            {/* Achievement Badges */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Award size={20} />
                Travel Achievements
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white p-4 rounded-lg">
                  <div className="text-2xl mb-1">🌍</div>
                  <p className="font-semibold text-sm">World Explorer</p>
                  <p className="text-xs opacity-90">30+ countries visited</p>
                </div>
                <div className="bg-gradient-to-r from-blue-400 to-purple-400 text-white p-4 rounded-lg">
                  <div className="text-2xl mb-1">✈️</div>
                  <p className="font-semibold text-sm">Frequent Flyer</p>
                  <p className="text-xs opacity-90">50+ flights taken</p>
                </div>
                <div className="bg-gradient-to-r from-green-400 to-teal-400 text-white p-4 rounded-lg">
                  <div className="text-2xl mb-1">📸</div>
                  <p className="font-semibold text-sm">Memory Keeper</p>
                  <p className="text-xs opacity-90">1000+ photos shared</p>
                </div>
                <div className="bg-gradient-to-r from-pink-400 to-red-400 text-white p-4 rounded-lg">
                  <div className="text-2xl mb-1">🗺️</div>
                  <p className="font-semibold text-sm">Continental</p>
                  <p className="text-xs opacity-90">5 continents explored</p>
                </div>
              </div>
            </div>

            {/* Visited Countries List */}
            <div>
              <h3 className="font-semibold mb-3">All Visited Countries ({visitedCountries.length})</h3>
              <div className="flex flex-wrap gap-2">
                {visitedCountries.sort().map(country => (
                  <span key={country} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                    {country}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-2">
          <div className="flex items-center justify-around">
            <button className="p-2 text-gray-600 dark:text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </button>
            <button className="p-2 text-gray-600 dark:text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button className="p-2 text-gray-600 dark:text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button className="p-2 text-gray-600 dark:text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="p-2 text-blue-500">
              <svg className="w-6 h-6" fill="currentColor" stroke="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}