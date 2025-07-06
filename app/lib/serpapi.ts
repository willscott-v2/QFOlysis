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
 * Discover competitor URLs using SerpAPI with entity-based queries
 */
export async function discoverCompetitorsWithSerpAPI(
  businessEntities: {
    services: string[];
    industries: string[];
    technologies: string[];
    targetAudience: string[];
    businessType: string;
  },
  excludeDomain: string,
  resultCount: number = 5
): Promise<string[]> {
  const apiKey = process.env.SERPAPI_KEY;
  
  if (!apiKey) {
    console.warn('SerpAPI key not configured');
    return [];
  }

  try {
    const userDomain = new URL(excludeDomain).hostname.replace('www.', '');
    
    // Create focused search queries based on business entities
    const searchQueries = [];
    
    // Primary service + industry combinations
    if (businessEntities.services.length > 0 && businessEntities.industries.length > 0) {
      searchQueries.push(`${businessEntities.services[0]} ${businessEntities.industries[0]} agency`);
      searchQueries.push(`${businessEntities.services.slice(0,2).join(' ')} services ${businessEntities.industries[0]}`);
    }
    
    // Business type + target audience
    if (businessEntities.businessType && businessEntities.targetAudience.length > 0) {
      searchQueries.push(`${businessEntities.businessType} ${businessEntities.targetAudience[0]}`);
    }
    
    // Service combinations
    if (businessEntities.services.length >= 2) {
      searchQueries.push(`${businessEntities.services.slice(0,3).join(' ')} company`);
    }
    
    // Technology + service
    if (businessEntities.technologies.length > 0 && businessEntities.services.length > 0) {
      searchQueries.push(`${businessEntities.technologies[0]} ${businessEntities.services[0]} experts`);
    }

    console.log('Generated competitor search queries:', searchQueries);

    const allCompetitors = new Set<string>();

    for (const query of searchQueries.slice(0, 3)) { // Limit to 3 queries
      console.log(`Searching for competitors with query: "${query}"`);
      
      const searchQuery = encodeURIComponent(query);
      const url = `https://serpapi.com/search.json?engine=google&q=${searchQuery}&api_key=${apiKey}&num=10`;

      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Search failed for query: ${query}`);
        continue;
      }

      const data = await response.json();
      
      if (data.organic_results) {
        const validUrls = data.organic_results
          .map((result: any) => result.link)
          .filter((url: string) => {
            if (!url) return false;
            
            try {
              const domain = new URL(url).hostname.replace('www.', '');
              
              // Exclude the original domain and common non-competitor sites
              const excludePatterns = [
                userDomain,
                'linkedin.com',
                'wikipedia.org',
                'youtube.com',
                'facebook.com',
                'twitter.com',
                'instagram.com',
                'yelp.com',
                'glassdoor.com',
                'indeed.com',
                'crunchbase.com'
              ];
              
              return !excludePatterns.some(pattern => domain.includes(pattern));
            } catch {
              return false;
            }
          });

        validUrls.forEach((url: string) => allCompetitors.add(url));
        console.log(`Found ${validUrls.length} valid URLs for query: ${query}`);
      }

      // Delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const competitors = Array.from(allCompetitors).slice(0, resultCount);
    console.log(`Final competitor list (${competitors.length}):`, competitors);
    
    return competitors;
    
  } catch (error) {
    console.error('Enhanced competitor discovery failed:', error);
    return [];
  }
}

/**
 * Legacy function for backward compatibility
 */
export async function discoverCompetitorsWithSerpAPILegacy(
  query: string,
  resultCount: number = 5,
  excludeDomain?: string
): Promise<string[]> {
  const apiKey = process.env.SERPAPI_KEY;
  
  if (!apiKey) {
    console.warn('SerpAPI key not configured, skipping competitor discovery');
    return [];
  }

  try {
    // Clean the query - remove brand names and make it generic
    const cleanQuery = cleanSearchQuery(query);
    const searchQuery = encodeURIComponent(cleanQuery);
    const url = `https://serpapi.com/search.json?engine=google&q=${searchQuery}&api_key=${apiKey}&num=${resultCount + 3}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.organic_results) {
      console.warn('No organic results from SerpAPI');
      return [];
    }

    // Filter out the user's domain and get competitor URLs
    const userDomain = excludeDomain ? new URL(excludeDomain).hostname : null;
    
    const competitors = data.organic_results
      .map((result: any) => result.link)
      .filter((url: string) => {
        try {
          const domain = new URL(url).hostname;
          return domain !== userDomain && !domain.includes('wikipedia') && !domain.includes('youtube');
        } catch {
          return false;
        }
      })
      .slice(0, resultCount);

    console.log(`Found ${competitors.length} competitors for query: "${cleanQuery}"`);
    return competitors;
  } catch (error) {
    console.error('SerpAPI competitor discovery failed:', error);
    return [];
  }
}

// Clean search queries to remove brand-specific terms
function cleanSearchQuery(query: string): string {
  // Remove common brand indicators and make query more generic
  const cleanedQuery = query
    .toLowerCase()
    .replace(/\b(inc|llc|corp|corporation|company|ltd|limited)\b/g, '')
    .replace(/\b(the|a|an)\s+/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Focus on the core service/industry terms
  const words = cleanedQuery.split(' ');
  const serviceWords = words.filter(word => 
    !isCommonWord(word) && 
    word.length > 3 &&
    !isBrandSpecific(word)
  );
  
  return serviceWords.slice(0, 4).join(' '); // Limit to 4 most relevant words
}

function isCommonWord(word: string): boolean {
  const common = ['marketing', 'agency', 'services', 'solutions', 'company', 'business', 'digital', 'online'];
  return common.includes(word.toLowerCase());
}

function isBrandSpecific(word: string): boolean {
  // Add logic to detect brand-specific terms
  return word.length < 3 || /^\d+$/.test(word);
}

/**
 * Discover competitors for multiple keywords
 */
export async function discoverCompetitorsForKeywords(
  keywords: string[],
  resultsPerKeyword: number = 3,
  excludeDomain?: string
): Promise<string[]> {
  const allUrls: string[] = [];
  const seenUrls = new Set<string>();

  for (const keyword of keywords.slice(0, 5)) { // Limit to 5 keywords to avoid rate limits
    try {
      const urls = await discoverCompetitorsWithSerpAPILegacy(keyword, resultsPerKeyword, excludeDomain);
      
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