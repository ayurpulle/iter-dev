import React, { createContext, useContext, useState, ReactNode } from 'react';

interface EditConversation {
  role: 'user' | 'assistant';
  content: string;
}

interface ItineraryEditContextType {
  conversations: { [itineraryId: string]: EditConversation[] };
  addMessage: (itineraryId: string, message: EditConversation) => void;
  clearConversation: (itineraryId: string) => void;
  getConversation: (itineraryId: string) => EditConversation[];
}

const ItineraryEditContext = createContext<ItineraryEditContextType | undefined>(undefined);

export const useItineraryEditContext = () => {
  const context = useContext(ItineraryEditContext);
  if (!context) {
    throw new Error('useItineraryEditContext must be used within an ItineraryEditProvider');
  }
  return context;
};

interface ItineraryEditProviderProps {
  children: ReactNode;
}

export const ItineraryEditProvider = ({ children }: ItineraryEditProviderProps) => {
  const [conversations, setConversations] = useState<{ [itineraryId: string]: EditConversation[] }>({});

  const addMessage = (itineraryId: string, message: EditConversation) => {
    setConversations(prev => ({
      ...prev,
      [itineraryId]: [...(prev[itineraryId] || []), message]
    }));
  };

  const clearConversation = (itineraryId: string) => {
    setConversations(prev => ({
      ...prev,
      [itineraryId]: []
    }));
  };

  const getConversation = (itineraryId: string) => {
    return conversations[itineraryId] || [];
  };

  return (
    <ItineraryEditContext.Provider value={{
      conversations,
      addMessage,
      clearConversation,
      getConversation
    }}>
      {children}
    </ItineraryEditContext.Provider>
  );
};