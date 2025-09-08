import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Plus, MapPin, Calendar, Users, DollarSign, ChevronDown, ChevronUp, Navigation, Clock, Star } from 'lucide-react';

// Enhanced TripPost Component with country map and photo carousel
const TripPost = ({ trip }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const countryMaps = {
    'Japan': (
      <svg viewBox="0 0 200 150" className="w-full h-full">
        <path d="M120 30 Q140 25 145 35 L150 55 Q148 70 140 75 L125 70 Q115 50 120 30" 
              fill="currentColor" stroke="white" strokeWidth="1"/>
        <path d="M130 80 L135 95 Q130 100 125 95 L120 85 Q125 82 130 80" 
              fill="currentColor" stroke="white" strokeWidth="1"/>
        <path d="M110 100 L115 110 Q110 115 105 110 L100 105 Q105 102 110 100" 
              fill="currentColor" stroke="white" strokeWidth="1"/>
      </svg>
    ),
    'France': (
      <svg viewBox="0 0 200 150" className="w-full h-full">
        <path d="M80 40 L120 35 L125 45 L130 65 L125 85 L115 95 L95 100 L75 90 L70 70 L75 50 Z" 
              fill="currentColor" stroke="white" strokeWidth="1"/>
      </svg>
    ),
    'Italy': (
      <svg viewBox="0 0 200 150" className="w-full h-full">
        <path d="M95 20 L105 25 L110 40 L105 60 L100 80 L95 100 L90 120 L85 115 L80 95 L85 75 L90 55 L92 35 Z" 
              fill="currentColor" stroke="white" strokeWidth="1"/>
        <path d="M85 115 L90 125 L85 130 L80 125 Z" 
              fill="currentColor" stroke="white" strokeWidth="1"/>
      </svg>
    ),
    'Thailand': (
      <svg viewBox="0 0 200 150" className="w-full h-full">
        <path d="M90 30 L110 35 L105 55 L110 75 L105 95 L95 110 L85 105 L80 85 L85 65 L80 45 Z" 
              fill="currentColor" stroke="white" strokeWidth="1"/>
      </svg>
    ),
    'Spain': (
      <svg viewBox="0 0 200 150" className="w-full h-full">
        <path d="M70 50 L130 45 L135 55 L130 75 L125 85 L110 90 L90 95 L75 90 L65 75 L70 60 Z" 
              fill="currentColor" stroke="white" strokeWidth="1"/>
      </svg>
    )
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden mb-6">
      {/* User Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
            {trip.user.name[0]}
          </div>
          <div>
            <p className="font-semibold text-sm">{trip.user.name}</p>
            <p className="text-xs text-gray-500">@{trip.user.username}</p>
          </div>
        </div>
        <span className="text-xs text-gray-500">{trip.date}</span>
      </div>

      {/* Media Carousel */}
      <div className="w-full">
        <div className="h-64 bg-muted overflow-hidden">
          <div className="relative bg-gray-100 dark:bg-gray-800 h-full">
            <div className="h-full relative overflow-hidden">
              {currentPhotoIndex === 0 ? (
                // Journey Map - Always First
                <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 h-full">
                  <div className="absolute inset-0 flex items-center justify-center text-blue-500 dark:text-blue-400 opacity-20">
                    {countryMaps[trip.country] || countryMaps['Japan']}
                  </div>
                  <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2">
                    <p className="font-bold text-lg">{trip.country}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{trip.cities.join(' • ')}</p>
                  </div>
                  <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
                    {trip.duration}
                  </div>
                </div>
              ) : (
                // Photos
                trip.photos && trip.photos.length > 0 && (
                  <img 
                    src={trip.photos[currentPhotoIndex - 1]} 
                    alt={`Photo ${currentPhotoIndex}`}
                    className="w-full h-full object-cover"
                  />
                )
              )}
              
              {/* Navigation buttons - only show if there are photos */}
              {trip.photos && trip.photos.length > 0 && (
                <>
                  <button 
                    onClick={() => setCurrentPhotoIndex((prev) => {
                      const totalItems = 1 + trip.photos.length; // 1 for map + photos
                      return (prev - 1 + totalItems) % totalItems;
                    })}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  >
                    ←
                  </button>
                  <button 
                    onClick={() => setCurrentPhotoIndex((prev) => {
                      const totalItems = 1 + trip.photos.length; // 1 for map + photos
                      return (prev + 1) % totalItems;
                    })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  >
                    →
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {/* Map indicator */}
                    <div 
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        currentPhotoIndex === 0 ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                    {/* Photo indicators */}
                    {trip.photos.map((_, idx) => (
                      <div 
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          idx + 1 === currentPhotoIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trip Title & Quick Stats */}
      <div className="p-4">
        <h3 className="font-bold text-lg mb-2">{trip.title}</h3>
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
          <span className="flex items-center gap-1">
            <MapPin size={14} />
            {trip.cities.length} cities
          </span>
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {trip.duration}
          </span>
          <span className="flex items-center gap-1">
            <Navigation size={14} />
            {trip.distance}
          </span>
          {trip.companions && (
            <span className="flex items-center gap-1">
              <Users size={14} />
              {trip.companions.length} people
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsLiked(!isLiked)}
              className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                isLiked ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">{trip.likes}</span>
            
            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400 ml-2">
              <MessageCircle size={20} />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">{trip.comments}</span>
            
            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400 ml-2">
              <Share2 size={20} />
            </button>
          </div>
          
          <button 
            onClick={() => setIsSaved(!isSaved)}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              isSaved ? 'text-blue-500' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Expandable Details */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 transition-colors"
        >
          {isExpanded ? 'Hide details' : 'View trip details'}
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {isExpanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            {/* Description */}
            {trip.description && (
              <div>
                <h4 className="font-semibold text-sm mb-1">About this trip</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{trip.description}</p>
              </div>
            )}

            {/* Highlights */}
            {trip.highlights && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Highlights</h4>
                <div className="space-y-1">
                  {trip.highlights.map((highlight, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Star size={14} className="text-yellow-500 mt-0.5" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Companions */}
            {trip.companionNames && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Travel companions</h4>
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {trip.companionNames.join(', ')}
                  </span>
                </div>
              </div>
            )}

            {/* Budget */}
            {trip.budget && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Budget</h4>
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {trip.budget} per person
                  </span>
                </div>
              </div>
            )}

            {/* Dates */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Travel dates</h4>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {trip.startDate} - {trip.endDate}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Component
export default function EnhancedTravelApp() {
  // Sample trip data with all new fields
  const trips = [
    {
      id: 1,
      user: {
        name: 'Sarah Chen',
        username: 'sarahchen',
      },
      country: 'Japan',
      title: 'Land of the Rising Sun Adventure',
      cities: ['Tokyo', 'Kyoto', 'Osaka'],
      duration: '14 days',
      distance: '892 km',
      photos: [
        'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
        'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800',
        'https://images.unsplash.com/photo-1528360983277-1d36708df3a0?w=800',
      ],
      description: 'An incredible journey through Japan, from the bustling streets of Tokyo to the serene temples of Kyoto. We experienced traditional tea ceremonies, stayed in a ryokan, and even caught the cherry blossoms in full bloom!',
      highlights: [
        'Cherry blossom viewing in Ueno Park',
        'Traditional tea ceremony in Kyoto',
        'Street food tour in Osaka',
        'Mount Fuji day trip',
        'Stayed in traditional ryokan'
      ],
      companions: [2, 3],
      companionNames: ['Mike Johnson', 'Emma Wilson'],
      budget: '$2,500',
      startDate: 'Mar 15, 2024',
      endDate: 'Mar 29, 2024',
      date: '2 days ago',
      likes: 234,
      comments: 18
    },
    {
      id: 2,
      user: {
        name: 'Alex Martinez',
        username: 'alex_wanderer',
      },
      country: 'Italy',
      title: 'Italian Renaissance Tour',
      cities: ['Rome', 'Florence', 'Venice'],
      duration: '10 days',
      distance: '650 km',
      photos: [
        'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800',
        'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800',
        'https://images.unsplash.com/photo-1534445867742-43195f401b6c?w=800',
      ],
      description: 'Explored the rich history and culture of Italy. From the ancient ruins of Rome to the Renaissance art of Florence and the romantic canals of Venice.',
      highlights: [
        'Colosseum and Roman Forum tour',
        'Uffizi Gallery in Florence',
        'Gondola ride in Venice',
        'Authentic pasta making class',
        'Wine tasting in Tuscany'
      ],
      companions: [1],
      companionNames: ['Sophie Brown'],
      budget: '$3,000',
      startDate: 'Apr 5, 2024',
      endDate: 'Apr 15, 2024',
      date: '1 week ago',
      likes: 156,
      comments: 12
    },
    {
      id: 3,
      user: {
        name: 'Maya Patel',
        username: 'maya.explores',
      },
      country: 'Thailand',
      title: 'Thai Island Hopping Paradise',
      cities: ['Bangkok', 'Phuket', 'Koh Phi Phi', 'Chiang Mai'],
      duration: '12 days',
      distance: '1,200 km',
      photos: [
        'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800',
        'https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?w=800',
        'https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?w=800',
      ],
      description: 'From bustling Bangkok markets to pristine beaches and elephant sanctuaries. Thailand offered the perfect mix of adventure, relaxation, and cultural immersion.',
      highlights: [
        'Floating markets in Bangkok',
        'Island hopping in Phi Phi',
        'Elephant sanctuary visit',
        'Thai cooking class',
        'Full moon party experience'
      ],
      budget: '$1,800',
      startDate: 'Feb 10, 2024',
      endDate: 'Feb 22, 2024',
      date: '2 weeks ago',
      likes: 312,
      comments: 24
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            Wanderlust
          </h1>
          <div className="flex items-center gap-4">
            <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {trips.map(trip => (
          <TripPost key={trip.id} trip={trip} />
        ))}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-2">
          <div className="flex items-center justify-around">
            <button className="p-2 text-blue-500">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
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
            <button className="p-2 text-gray-600 dark:text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}