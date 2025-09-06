import React, { useState } from 'react';
import { MapPin, Calendar, Users, DollarSign, Camera, Plus, X, Star, Globe, Navigation } from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

export default function EnhancedCreateTrip() {
  const navigate = useNavigate();
  const [country, setCountry] = useState('');
  const [title, setTitle] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [currentCity, setCurrentCity] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [companions, setCompanions] = useState<string[]>([]);
  const [currentCompanion, setCurrentCompanion] = useState('');
  const [highlights, setHighlights] = useState<string[]>([]);
  const [currentHighlight, setCurrentHighlight] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState(0); // 0 = not set, 1-5 = $ signs
  const [budgetCurrency, setBudgetCurrency] = useState('USD'); // Keep for future use
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');

  const countries = [
    'Japan', 'France', 'Italy', 'Spain', 'Thailand', 'Indonesia', 'USA', 'Mexico', 
    'Brazil', 'Argentina', 'Germany', 'United Kingdom', 'Australia', 'New Zealand',
    'India', 'China', 'South Korea', 'Vietnam', 'Egypt', 'Morocco', 'South Africa',
    'Greece', 'Turkey', 'Netherlands', 'Switzerland', 'Canada', 'Portugal'
  ];

  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR'];

  const addCity = () => {
    if (currentCity.trim() && !cities.includes(currentCity.trim())) {
      setCities([...cities, currentCity.trim()]);
      setCurrentCity('');
    }
  };

  const removeCity = (cityToRemove: string) => {
    setCities(cities.filter(city => city !== cityToRemove));
  };

  const addCompanion = () => {
    if (currentCompanion.trim() && !companions.includes(currentCompanion.trim())) {
      setCompanions([...companions, currentCompanion.trim()]);
      setCurrentCompanion('');
    }
  };

  const removeCompanion = (companionToRemove: string) => {
    setCompanions(companions.filter(comp => comp !== companionToRemove));
  };

  const addHighlight = () => {
    if (currentHighlight.trim() && !highlights.includes(currentHighlight.trim())) {
      setHighlights([...highlights, currentHighlight.trim()]);
      setCurrentHighlight('');
    }
  };

  const removeHighlight = (highlightToRemove: string) => {
    setHighlights(highlights.filter(h => h !== highlightToRemove));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newPhotos = files.map(file => URL.createObjectURL(file));
      setPhotos([...photos, ...newPhotos].slice(0, 10)); // Max 10 photos
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const getBudgetDisplay = (budget: number) => {
    if (budget === 0) return "Select budget level";
    return "$".repeat(budget);
  };

  const getBudgetDescription = (budget: number) => {
    const descriptions = {
      0: "",
      1: "Budget-friendly",
      2: "Moderate", 
      3: "Comfortable",
      4: "Luxury",
      5: "Ultra-luxury"
    };
    return descriptions[budget as keyof typeof descriptions] || "";
  };

  const handleSubmit = () => {
    const tripData = {
      country,
      title,
      cities,
      photos,
      companions,
      highlights,
      description,
      budget,
      budgetCurrency,
      startDate,
      endDate,
      duration,
      distance
    };
    console.log('Trip created:', tripData);
    alert('Trip posted successfully! 🎉');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <X size={24} />
            </Button>
            <h1 className="text-lg font-semibold">Create Trip Post</h1>
          </div>
          <Button onClick={handleSubmit} size="sm">
            Post
          </Button>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Country Selection */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Globe size={16} />
            Country *
          </label>
          <select 
            value={country} 
            onChange={(e) => setCountry(e.target.value)}
            className="w-full p-3 border rounded-lg bg-background"
          >
            <option value="">Select a country</option>
            {countries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Trip Title */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Trip Title *
          </label>
          <input 
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your trip a memorable title"
            className="w-full p-3 border rounded-lg bg-background"
          />
        </div>

        {/* Cities */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <MapPin size={16} />
            Cities Visited
          </label>
          <div className="flex gap-2 mb-2">
            <input 
              type="text"
              value={currentCity}
              onChange={(e) => setCurrentCity(e.target.value)}
              placeholder="Add a city"
              className="flex-1 p-3 border rounded-lg bg-background"
              onKeyPress={(e) => e.key === 'Enter' && addCity()}
            />
            <Button onClick={addCity} size="icon">
              <Plus size={16} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {cities.map((city, index) => (
              <span key={index} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-sm flex items-center gap-1">
                {city}
                <Button variant="ghost" size="sm" onClick={() => removeCity(city)}>
                  <X size={12} />
                </Button>
              </span>
            ))}
          </div>
        </div>

        {/* Photos */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Camera size={16} />
            Trip Photos
          </label>
          <input 
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            className="w-full p-3 border rounded-lg bg-background"
          />
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {photos.map((photo, index) => (
                <div key={index} className="relative">
                  <img src={photo} alt={`Trip photo ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-1 right-1 w-6 h-6"
                    onClick={() => removePhoto(index)}
                  >
                    <X size={12} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Travel Companions */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Users size={16} />
            Travel Companions
          </label>
          <div className="flex gap-2 mb-2">
            <input 
              type="text"
              value={currentCompanion}
              onChange={(e) => setCurrentCompanion(e.target.value)}
              placeholder="Add a companion"
              className="flex-1 p-3 border rounded-lg bg-background"
              onKeyPress={(e) => e.key === 'Enter' && addCompanion()}
            />
            <Button onClick={addCompanion} size="icon">
              <Plus size={16} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {companions.map((companion, index) => (
              <span key={index} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-sm flex items-center gap-1">
                {companion}
                <Button variant="ghost" size="sm" onClick={() => removeCompanion(companion)}>
                  <X size={12} />
                </Button>
              </span>
            ))}
          </div>
        </div>

        {/* Trip Highlights */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Star size={16} />
            Trip Highlights
          </label>
          <div className="flex gap-2 mb-2">
            <input 
              type="text"
              value={currentHighlight}
              onChange={(e) => setCurrentHighlight(e.target.value)}
              placeholder="Add a highlight"
              className="flex-1 p-3 border rounded-lg bg-background"
              onKeyPress={(e) => e.key === 'Enter' && addHighlight()}
            />
            <Button onClick={addHighlight} size="icon">
              <Plus size={16} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {highlights.map((highlight, index) => (
              <span key={index} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-sm flex items-center gap-1">
                {highlight}
                <Button variant="ghost" size="sm" onClick={() => removeHighlight(highlight)}>
                  <X size={12} />
                </Button>
              </span>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Trip Description
          </label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Share your travel story..."
            rows={4}
            className="w-full p-3 border rounded-lg bg-background resize-none"
          />
        </div>

        {/* Budget */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <DollarSign size={16} />
            Trip Budget Level
          </label>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  budget === level
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setBudget(level)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {"$".repeat(level)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getBudgetDescription(level)}
                    </p>
                  </div>
                  {budget === level && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Calendar size={16} />
              Start Date
            </label>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-3 border rounded-lg bg-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">
              End Date
            </label>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-3 border rounded-lg bg-background"
            />
          </div>
        </div>

        {/* Duration & Distance */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Trip Duration
            </label>
            <input 
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g., 7 days"
              className="w-full p-3 border rounded-lg bg-background"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Navigation size={16} />
              Distance Traveled
            </label>
            <input 
              type="text"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="e.g., 2000 km"
              className="w-full p-3 border rounded-lg bg-background"
            />
          </div>
        </div>
      </div>
    </div>
  );
}