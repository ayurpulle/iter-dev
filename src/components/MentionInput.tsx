import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFriends } from '@/hooks/useFriends';

interface MentionInputProps {
  value: string;
  onChange: (value: string, taggedFriends: string[]) => void;
  placeholder?: string;
  id?: string;
}

interface Mention {
  id: string;
  name: string;
  username: string;
  avatar?: string;
}

export const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  placeholder,
  id
}) => {
  const { friends } = useFriends();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Mention[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Extract mentioned usernames from text
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(match => match.slice(1)) : [];
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    // Check if user is typing a mention
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const mentionQuery = mentionMatch[1].toLowerCase();
      setMentionStart(mentionMatch.index!);
      
      // Filter friends based on the query
      const filteredSuggestions = friends
        .filter(friend => 
          friend.profile?.username?.toLowerCase().includes(mentionQuery) ||
          friend.profile?.name?.toLowerCase().includes(mentionQuery)
        )
        .map(friend => ({
          id: friend.friend_id === friend.user_id ? friend.user_id : friend.friend_id,
          name: friend.profile?.name || 'Unknown',
          username: friend.profile?.username || '',
          avatar: friend.profile?.avatar
        }))
        .slice(0, 5); // Limit to 5 suggestions
      
      setSuggestions(filteredSuggestions);
      setShowSuggestions(filteredSuggestions.length > 0);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
      setMentionStart(null);
    }
    
    const taggedFriends = extractMentions(newValue);
    onChange(newValue, taggedFriends);
  };

  // Handle suggestion selection
  const selectSuggestion = (suggestion: Mention) => {
    if (mentionStart === null) return;
    
    const beforeMention = value.substring(0, mentionStart);
    const afterCursor = value.substring(inputRef.current?.selectionStart || 0);
    const newValue = `${beforeMention}@${suggestion.username} ${afterCursor}`;
    
    const taggedFriends = extractMentions(newValue);
    onChange(newValue, taggedFriends);
    
    setShowSuggestions(false);
    setMentionStart(null);
    
    // Focus back to input
    setTimeout(() => {
      inputRef.current?.focus();
      const newPosition = beforeMention.length + suggestion.username.length + 2;
      inputRef.current?.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          selectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      
      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-accent ${
                index === selectedIndex ? 'bg-accent' : ''
              }`}
              onClick={() => selectSuggestion(suggestion)}
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={suggestion.avatar} />
                <AvatarFallback>
                  {suggestion.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {suggestion.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  @{suggestion.username}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};