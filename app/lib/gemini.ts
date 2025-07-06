// ============================================================================
// Gemini API Integration for Keyword Extraction
// ============================================================================

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

/**
 * Generate keywords from content using Google's Gemini API
 */
export async function generateKeywordsWithGemini(
  content: string,
  maxKeywords: number = 20
): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn('Gemini API key not configured, using fallback extraction');
    return extractFallbackKeywords(content, maxKeywords);
  }

  try {
    const prompt = `Analyze this content and extract ${maxKeywords} specific search keywords and entities that competitors might rank for. 

Focus on:
- Core business services and offerings
- Industry-specific terminology
- Problem statements and solutions
- Technical concepts and methods
- Target audience segments

Exclude:
- Brand names and company-specific terms
- Generic words like "services", "solutions", "company"
- Location-specific terms unless relevant to service

Content: ${content.slice(0, 4000)}

Return ONLY a JSON array of strings, no additional text:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2, // Lower temperature for more consistent results
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 800,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!result) {
      throw new Error('No content in Gemini response');
    }

    try {
      const keywords = JSON.parse(result);
      if (Array.isArray(keywords)) {
        return keywords
          .filter(k => typeof k === 'string' && k.length > 2 && k.length < 100)
          .slice(0, maxKeywords);
      }
    } catch {
      // Fallback parsing if JSON fails
      return parseKeywordsFromText(result, maxKeywords);
    }

    return [];
  } catch (error) {
    console.error('Gemini keyword extraction failed:', error);
    return extractFallbackKeywords(content, maxKeywords);
  }
}

function extractFallbackKeywords(content: string, maxKeywords: number): string[] {
  // Improved fallback keyword extraction
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && word.length < 20);

  const wordFreq = new Map<string, number>();
  words.forEach(word => {
    if (!isStopWord(word)) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  });

  return Array.from(wordFreq.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

function isStopWord(word: string): boolean {
  const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'these', 'those', 'services', 'solutions', 'company', 'business'];
  return stopWords.includes(word);
}

function parseKeywordsFromText(text: string, maxKeywords: number): string[] {
  // Parse keywords from text response if JSON parsing fails
  const lines = text
    .split('\n')
    .filter(line => line.trim() && !line.includes('[') && !line.includes(']'))
    .map(line => line.replace(/^\d+\.?\s*["\']?/, '').replace(/["\']?$/, ''))
    .filter(line => line.length > 2 && line.length < 100);
  
  return lines.slice(0, maxKeywords);
}

/**
 * Extract entities from content using Gemini
 */
export async function extractEntitiesWithGemini(
  content: string
): Promise<Array<{ entity: string; type: string; relevance: number }>> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  try {
    const prompt = `Extract key entities from the following content. 
    For each entity, identify:
    - The entity name
    - Entity type (person, organization, product, concept, etc.)
    - Relevance score (1-10)
    
    Return as JSON array: [{"entity": "name", "type": "type", "relevance": score}]
    
    Content: ${content.slice(0, 3000)}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 600,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data: GeminiResponse = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini API');
    }

    const result = data.candidates[0].content.parts[0].text.trim();
    
    try {
      const entities = JSON.parse(result);
      if (Array.isArray(entities)) {
        return entities.filter(entity => 
          entity.entity && 
          entity.type && 
          typeof entity.relevance === 'number'
        );
      }
    } catch {
      console.warn('Failed to parse entities as JSON, returning empty array');
    }

    return [];
  } catch (error) {
    console.error('Gemini entity extraction error:', error);
    throw new Error(`Failed to extract entities: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function extractBusinessEntities(
  content: string,
  title: string,
  url: string
): Promise<{
  services: string[];
  industries: string[];
  technologies: string[];
  targetAudience: string[];
  businessType: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key required for entity extraction');
  }

  // Remove brand name from analysis to avoid polluting results
  const domain = new URL(url).hostname.replace('www.', '');
  const brandName = domain.split('.')[0];
  const cleanContent = content.replace(new RegExp(brandName, 'gi'), '[COMPANY]');

  const prompt = `Analyze this business website and extract ONLY the core business entities. Ignore the company name and focus on what they DO, not who they are.

Website: ${title}
Content: ${cleanContent.slice(0, 3000)}

Extract these specific business categories:

SERVICES (what they offer):
- Examples: "SEO", "Content Marketing", "Web Design", "Digital Strategy"
- NOT: company names, generic words like "services" or "solutions"

INDUSTRIES (who they serve):
- Examples: "Healthcare", "E-commerce", "SaaS", "Higher Education" 
- NOT: geographic locations or company names

TECHNOLOGIES (what they use/specialize in):
- Examples: "WordPress", "Google Ads", "HubSpot", "React"
- NOT: generic terms like "technology" or "digital"

TARGET_AUDIENCE (who their customers are):
- Examples: "Small Businesses", "Enterprise", "Startups", "Universities"
- NOT: demographic terms like "people" or "customers"

BUSINESS_TYPE (what kind of business):
- Examples: "Digital Marketing Agency", "Software Company", "Consulting Firm"

Return JSON in this exact format:
{
  "services": ["SEO", "Content Marketing", "PPC Management"],
  "industries": ["Healthcare", "E-commerce"],
  "technologies": ["Google Ads", "WordPress", "Analytics"],
  "targetAudience": ["Small Businesses", "Enterprise"],
  "businessType": "Digital Marketing Agency"
}

Be specific and avoid generic terms. Focus on what makes this business searchable by competitors.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 800,
          },
        }),
      }
    );

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (result) {
      try {
        const cleanJson = result.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        const entities = JSON.parse(cleanJson);
        
        // Validate and clean the results
        return {
          services: entities.services?.filter((s: string) => s && s.length > 2 && !s.toLowerCase().includes('company')) || [],
          industries: entities.industries?.filter((i: string) => i && i.length > 2) || [],
          technologies: entities.technologies?.filter((t: string) => t && t.length > 2) || [],
          targetAudience: entities.targetAudience?.filter((a: string) => a && a.length > 2) || [],
          businessType: entities.businessType || "Business"
        };
      } catch (parseError) {
        console.error('Failed to parse entity JSON:', parseError);
        return {
          services: [],
          industries: [],
          technologies: [],
          targetAudience: [],
          businessType: "Business"
        };
      }
    }
    
    return {
      services: [],
      industries: [],
      technologies: [],
      targetAudience: [],
      businessType: "Business"
    };
  } catch (error) {
    console.error('Entity extraction failed:', error);
    return {
      services: [],
      industries: [],
      technologies: [],
      targetAudience: [],
      businessType: "Business"
    };
  }
} 