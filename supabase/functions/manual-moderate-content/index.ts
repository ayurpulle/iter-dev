import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModerationRequest {
  content: string;
  contentType?: 'post' | 'comment' | 'bio' | 'message';
}

interface ModerationResponse {
  isAppropriate: boolean;
  reason?: string;
  flaggedCategories?: string[];
  severity?: 'low' | 'medium' | 'high';
  confidence: number;
}

// Comprehensive word lists for different categories
const HATE_SPEECH_WORDS = [
  // Racial slurs and discriminatory terms
  'n*gger', 'n*gga', 'ch*nk', 'sp*c', 'k*ke', 'g*ok', 'w*tback', 'sand n*gger',
  'rag head', 'camel jockey', 'dot head', 'curry muncher', 'beaner', 'wetback',
  
  // Religious discrimination
  'k*ke', 'christ killer', 'sand n*gger', 'towel head', 'muzzie', 'bible thumper',
  
  // LGBTQ+ slurs
  'f*ggot', 'f*g', 'd*ke', 'tr*nny', 'sh*male', 'he-she',
  
  // General hate terms
  'subhuman', 'vermin', 'parasite', 'cockroach', 'scum', 'trash',
];

const PROFANITY_HIGH = [
  'f*ck', 'sh*t', 'b*tch', 'a*shole', 'c*nt', 'p*ssy', 'c*ck', 'd*ck', 'tw*t',
  'motherf*cker', 'godd*mn', 'p*ss', 'cr*p', 'b*stard', 'wh*re', 'sl*t',
];

const PROFANITY_MEDIUM = [
  'd*mn', 'h*ll', 'p*ssed', 'cr*ppy', 's*cks', 'scr*w', 'fr*gging', 'bl*ody',
];

const VIOLENCE_THREATS = [
  'kill yourself', 'kys', 'die', 'murder', 'suicide', 'hang yourself', 'jump off',
  'shoot yourself', 'blow your brains', 'slit your throat', 'overdose',
  'i will kill', 'gonna kill', 'beat you up', 'kick your ass', 'destroy you',
];

const SPAM_PATTERNS = [
  // URLs and suspicious links
  /https?:\/\/[^\s]+\.(tk|ml|ga|cf|click|link)/gi,
  // Repeated characters
  /(.)\1{6,}/g,
  // Excessive caps
  /[A-Z]{10,}/g,
  // Money/crypto scams
  /\b(bitcoin|crypto|investment|roi|profit)\s+(guaranteed|easy|quick|instant)/gi,
  // Phone numbers in inappropriate contexts
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
];

const INAPPROPRIATE_SEXUAL = [
  's*x', 'p*rn', 'n*de', 'naked', 'horny', 'masturbate', 'orgasm', 'cum',
  'escort', 'hookup', 'one night stand', 'friends with benefits', 'booty call',
];

const DRUG_REFERENCES = [
  'cocaine', 'heroin', 'meth', 'crack', 'ecstasy', 'molly', 'lsd', 'acid',
  'shrooms', 'weed dealer', 'buy drugs', 'sell drugs', 'drug dealer',
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, contentType = 'post' }: ModerationRequest = await req.json();

    if (!content || typeof content !== 'string') {
      return new Response(JSON.stringify({ error: 'Content is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Moderating ${contentType} content: ${content.substring(0, 100)}...`);

    const result = moderateContent(content, contentType);
    
    console.log('Manual moderation result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in manual-moderate-content function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function moderateContent(content: string, contentType: string): ModerationResponse {
  const lowerContent = content.toLowerCase();
  const flaggedCategories: string[] = [];
  let severity: 'low' | 'medium' | 'high' = 'low';
  let confidence = 0;
  let reason = '';

  // Check for hate speech (highest priority)
  const hateWords = HATE_SPEECH_WORDS.filter(word => 
    lowerContent.includes(word.replace(/\*/g, ''))
  );
  if (hateWords.length > 0) {
    flaggedCategories.push('hate_speech');
    severity = 'high';
    confidence = 0.95;
    reason = 'Content contains hate speech or discriminatory language';
  }

  // Check for violence and threats
  const violenceWords = VIOLENCE_THREATS.filter(word => 
    lowerContent.includes(word)
  );
  if (violenceWords.length > 0) {
    flaggedCategories.push('violence_threats');
    severity = 'high';
    confidence = 0.9;
    reason = 'Content contains violent threats or harmful language';
  }

  // Check for high-level profanity
  const highProfanity = PROFANITY_HIGH.filter(word => 
    lowerContent.includes(word.replace(/\*/g, ''))
  );
  if (highProfanity.length > 0) {
    flaggedCategories.push('profanity');
    if (severity !== 'high') severity = 'medium';
    confidence = Math.max(confidence, 0.8);
    reason = reason || 'Content contains inappropriate language';
  }

  // Check for medium-level profanity
  const mediumProfanity = PROFANITY_MEDIUM.filter(word => 
    lowerContent.includes(word.replace(/\*/g, ''))
  );
  if (mediumProfanity.length > 1) { // Allow occasional mild profanity
    flaggedCategories.push('mild_profanity');
    if (severity === 'low') severity = 'medium';
    confidence = Math.max(confidence, 0.6);
    reason = reason || 'Content contains mild inappropriate language';
  }

  // Check for spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) {
      flaggedCategories.push('spam');
      if (severity === 'low') severity = 'medium';
      confidence = Math.max(confidence, 0.7);
      reason = reason || 'Content appears to be spam or promotional';
      break;
    }
  }

  // Check for inappropriate sexual content
  const sexualWords = INAPPROPRIATE_SEXUAL.filter(word => 
    lowerContent.includes(word.replace(/\*/g, ''))
  );
  if (sexualWords.length > 0) {
    flaggedCategories.push('sexual_content');
    if (severity === 'low') severity = 'medium';
    confidence = Math.max(confidence, 0.75);
    reason = reason || 'Content contains inappropriate sexual references';
  }

  // Check for drug references
  const drugWords = DRUG_REFERENCES.filter(word => 
    lowerContent.includes(word)
  );
  if (drugWords.length > 0) {
    flaggedCategories.push('drug_references');
    if (severity === 'low') severity = 'medium';
    confidence = Math.max(confidence, 0.8);
    reason = reason || 'Content contains drug-related references';
  }

  // Travel-specific checks
  const travelChecks = checkTravelSpecificContent(content);
  if (!travelChecks.isAppropriate) {
    flaggedCategories.push(...travelChecks.categories);
    if (severity === 'low') severity = 'medium';
    confidence = Math.max(confidence, 0.7);
    reason = reason || travelChecks.reason;
  }

  // Content quality checks
  const qualityChecks = checkContentQuality(content);
  if (!qualityChecks.isAppropriate) {
    flaggedCategories.push(...qualityChecks.categories);
    if (severity === 'low') severity = 'low';
    confidence = Math.max(confidence, 0.5);
    reason = reason || qualityChecks.reason;
  }

  const isAppropriate = flaggedCategories.length === 0 || 
    (flaggedCategories.length === 1 && flaggedCategories[0] === 'mild_profanity' && contentType !== 'bio');

  return {
    isAppropriate,
    reason: isAppropriate ? undefined : reason,
    flaggedCategories,
    severity,
    confidence: confidence || 0.1,
  };
}

function checkTravelSpecificContent(content: string): {
  isAppropriate: boolean;
  reason: string;
  categories: string[];
} {
  const lowerContent = content.toLowerCase();
  
  // Check for unsafe location sharing
  const unsafeLocationPatterns = [
    /\b\d+\s+[a-z]+\s+(street|road|avenue|drive|lane|way|court|place)\b/i,
    /\bhome\s+address\b/i,
    /\bmy\s+house\s+is\s+at\b/i,
    /\bexact\s+location\b/i,
    /\bgps\s+coordinates\b/i,
  ];

  for (const pattern of unsafeLocationPatterns) {
    if (pattern.test(content)) {
      return {
        isAppropriate: false,
        reason: 'Avoid sharing exact personal locations for safety',
        categories: ['unsafe_location_sharing'],
      };
    }
  }

  // Check for travel scams
  const scamPatterns = [
    /\bfree\s+(trip|vacation|hotel|flight)\b/i,
    /\btoo\s+good\s+to\s+be\s+true\b/i,
    /\bclick\s+here\s+to\s+(win|earn|get)\b/i,
    /\bguaranteed\s+(money|profit|income)\b/i,
    /\bwork\s+from\s+home\s+while\s+traveling\b/i,
  ];

  for (const pattern of scamPatterns) {
    if (pattern.test(content)) {
      return {
        isAppropriate: false,
        reason: 'Content may contain misleading travel offers',
        categories: ['travel_scam'],
      };
    }
  }

  return {
    isAppropriate: true,
    reason: '',
    categories: [],
  };
}

function checkContentQuality(content: string): {
  isAppropriate: boolean;
  reason: string;
  categories: string[];
} {
  // Check for excessive repetition
  if (content.length > 20) {
    const words = content.toLowerCase().split(/\s+/);
    const wordCount = words.length;
    const uniqueWords = new Set(words).size;
    
    if (wordCount > 10 && uniqueWords / wordCount < 0.3) {
      return {
        isAppropriate: false,
        reason: 'Content contains excessive repetition',
        categories: ['low_quality'],
      };
    }
  }

  // Check for excessive caps
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (content.length > 20 && capsRatio > 0.7) {
    return {
      isAppropriate: false,
      reason: 'Content contains excessive capital letters',
      categories: ['spam_like'],
    };
  }

  // Check for excessive special characters
  const specialChars = (content.match(/[!@#$%^&*()_+=\[\]{}|;':",./<>?~`]/g) || []).length;
  if (specialChars > content.length * 0.3) {
    return {
      isAppropriate: false,
      reason: 'Content contains too many special characters',
      categories: ['spam_like'],
    };
  }

  return {
    isAppropriate: true,
    reason: '',
    categories: [],
  };
}