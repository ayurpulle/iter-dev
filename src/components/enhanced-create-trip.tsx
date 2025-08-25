import React, { useState } from 'react';
import { MapPin, Calendar, Users, DollarSign, Camera, Plus, X, Star, Globe, Navigation } from 'lucide-react';

export default function EnhancedCreateTrip() {
  const [country, setCountry] = useState('');
  const [title, setTitle] = useState('');
  const [cities, setCities] = useState([]);
  const [currentCity, setCurrentCity] = useState('');
  const [photos, setPhotos] = useState([]);
  const [companions, setCompanions] = useState([]);
  const [currentCompanion, setCurrentCompanion] = useState('');
  const [highlights, setHighlights] = useState([]);
  const [currentHighlight, setCurrentHighlight] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [budgetCurrency, setBudgetCurrency] = useState('USD');
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

  const removeCity = (cityToRemove) => {
    setCities(cities.filter(city => city !== cityToRemove));
  };

  const addCompanion = () => {
    if (currentCompanion.trim() && !companions.includes(currentCompanion.trim())) {
      setCompanions([...companions, currentCompanion.trim()]);
      setCurrentCompanion('');
    }
  };

  const removeCompanion = (companionToRemove) => {
    setCompanions(companions.filter(comp => comp !== companionToRemove));
  };

  const addHighlight = () => {
    if (currentHighlight.trim() && !highlights.includes(currentHighlight.trim())) {
      setHighlights([...highlights, currentHighlight.trim()]);
      setCurrentHighlight('');
    }
  };

  const removeHighlight = (highlightToRemove) => {
    setHighlights(highlights.filter(h => h !== highlightToRemove));
  };

  const handlePhotoUpload = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newPhotos = files.map(file => URL.createObjectURL(file));
      setPhotos([...photos, ...newPhotos].slice(0, 10)); // Max 10 photos
    }
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
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
    // Here you would submit to your backend
    alert('Trip posted successfully! 🎉');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="text-gray-600 dark:text-gray-400">
              <X size={24} />
            </button>
            <h1 className="text-lg font-semibold">Create Trip Post</h1>
          </div>
          <button 
            onClick={handleSubmit}
            className="bg-blue-500 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            Post
          </button>
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
            className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700"
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
            className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700"
          />
        </div>

        {/* Cities */}