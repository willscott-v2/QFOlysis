// ============================================================================
// SerpAPI Integration for Competitor Discovery
// ============================================================================

interface SerpAPIResponse {
  organic_results?: Array<{
    title: string;
    link: string;
    snippet: string;
    position: number;
  }>;
  error?: string;
}

/**
 * Discover competitor URLs using SerpAPI
 */
export async function discoverCompetitorsWithSerpAPI(
  query: string,
  resultCount: number = 5
): Promise<string[]> {
  const apiKey = process.env.SERPAPI_KEY;
  
  if (!apiKey) {
    throw new Error('SerpAPI key not configured');
  }

  try {
    const searchQuery = encodeURIComponent(query);
    const url = `https://serpapi.com/search.json?engine=google&q=${searchQuery}&api_key=${apiKey}&num=${resultCount}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status} ${response.statusText}`);
    }

    const data: SerpAPIResponse = await response.json();
    
    if (data.error) {
      throw new Error(`SerpAPI error: ${data.error}`);
    }

    if (!data.organic_results || data.organic_results.length === 0) {
      console.warn('No organic results found in SerpAPI response');
      return [];
    }

    // Extract URLs from organic results
    const urls = data.organic_results
      .map(result => result.link)
      .filter(url => url && isValidUrl(url))
      .slice(0, resultCount);

    return urls;
  } catch (error) {
    console.error('SerpAPI error:', error);
    throw new Error(`Failed to discover competitors: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Discover competitors for multiple keywords
 */
export async function discoverCompetitorsForKeywords(
  keywords: string[],
  resultsPerKeyword: number = 3
): Promise<string[]> {
  const allUrls: string[] = [];
  const seenUrls = new Set<string>();

  for (const keyword of keywords.slice(0, 5)) { // Limit to 5 keywords to avoid rate limits
    try {
      const urls = await discoverCompetitorsWithSerpAPI(keyword, resultsPerKeyword);
      
      for (const url of urls) {
        if (!seenUrls.has(url)) {
          allUrls.push(url);
          seenUrls.add(url);
        }
      }

      // Add delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.warn(`Failed to discover competitors for keyword "${keyword}":`, error);
      // Continue with other keywords
    }
  }

  return allUrls;
}

/**
 * Get search suggestions for a topic
 */
export async function getSearchSuggestions(
  topic: string,
  maxSuggestions: number = 10
): Promise<string[]> {
  const apiKey = process.env.SERPAPI_KEY;
  
  if (!apiKey) {
    throw new Error('SerpAPI key not configured');
  }

  try {
    const searchQuery = encodeURIComponent(topic);
    const url = `https://serpapi.com/search.json?engine=google&q=${searchQuery}&api_key=${apiKey}&num=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status} ${response.statusText}`);
    }

    const data: SerpAPIResponse = await response.json();
    
    if (data.error) {
      throw new Error(`SerpAPI error: ${data.error}`);
    }

    // Extract suggestions from snippets and titles
    const suggestions: string[] = [];
    
    if (data.organic_results) {
      for (const result of data.organic_results) {
        if (result.snippet) {
          const words = result.snippet
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3 && !commonWords.has(word));
          
          suggestions.push(...words.slice(0, 3));
        }
      }
    }

    // Remove duplicates and limit results
    const uniqueSuggestions = [...new Set(suggestions)].slice(0, maxSuggestions);
    
    return uniqueSuggestions;
  } catch (error) {
    console.error('SerpAPI suggestions error:', error);
    throw new Error(`Failed to get search suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to validate URLs
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Common words to filter out from suggestions
const commonWords = new Set([
  'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'this', 'that', 'these', 'those', 'a', 'an', 'as', 'if', 'then', 'else',
  'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'can', 'just', 'should', 'now'
]); 