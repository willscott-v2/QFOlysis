import { ExtractedEntity } from './types';

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
 * Generate keywords from content using OpenAI API
 */
export async function generateKeywordsWithGemini(
  content: string,
  maxKeywords: number = 20
): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('OpenAI API key not configured, using fallback extraction');
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

Return ONLY a JSON array of strings (no markdown, no code blocks, just pure JSON):`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an SEO expert extracting keywords from web content. Return only valid JSON arrays of keyword strings.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 600,
      }),
    });


    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices[0]?.message?.content?.trim();
    
    if (!result) {
      throw new Error('No content in OpenAI response');
    }

    try {
      // Clean the result to handle markdown code blocks
      const cleanResult = result
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const keywords = JSON.parse(cleanResult);
      if (Array.isArray(keywords)) {
        return keywords
          .filter(k => typeof k === 'string' && k.length > 2 && k.length < 100)
          .slice(0, maxKeywords);
      }
    } catch (parseError) {
      console.warn('Failed to parse keywords as JSON:', parseError);
      // Fallback parsing if JSON fails
      return parseKeywordsFromText(result, maxKeywords);
    }

    return [];
  } catch (error) {
    console.error('OpenAI keyword extraction failed:', error);
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

// ============================================================================
// Enhanced Business Entity Extraction for QFOlysis
// ============================================================================

interface BusinessEntities {
  services: string[];
  industries: string[];
  technologies: string[];
  targetAudience: string[];
  businessType: string;
}

/**
 * Extract business entities instead of generic keywords
 */
export async function extractBusinessEntities(
  content: string,
  title: string,
  url: string
): Promise<BusinessEntities> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key required for entity extraction');
  }

  // Remove brand name to prevent pollution
  const domain = new URL(url).hostname.replace('www.', '');
  const brandName = domain.split('.')[0];
  const cleanContent = content.replace(new RegExp(brandName, 'gi'), '[BRAND]');

  const prompt = `Extract BUSINESS ENTITIES from this website content. Focus on WHAT they do, not WHO they are.

Website: ${title}
Content: ${cleanContent.slice(0, 3000)}

Extract these categories:

SERVICES (what they offer):
- Examples: "SEO", "Content Marketing", "Web Design", "PPC Management"
- NOT: company names, URLs, or generic words like "services"

INDUSTRIES (who they serve):
- Examples: "Healthcare", "E-commerce", "SaaS", "Higher Education"
- NOT: locations or demographics

TECHNOLOGIES (tools/platforms they use):
- Examples: "WordPress", "Google Ads", "HubSpot", "Shopify"
- NOT: generic terms like "technology"

TARGET_AUDIENCE (customer types):
- Examples: "Small Businesses", "Enterprise", "Startups"
- NOT: general terms like "customers"

BUSINESS_TYPE (what kind of company):
- Examples: "Digital Marketing Agency", "Software Company"

Return JSON:
{
  "services": ["SEO", "Content Marketing"],
  "industries": ["Healthcare", "E-commerce"],
  "technologies": ["Google Ads", "WordPress"],
  "targetAudience": ["Small Businesses"],
  "businessType": "Digital Marketing Agency"
}

Be specific. Avoid generic terms, URLs, or brand names.`;

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
            maxOutputTokens: 800,
          },
        }),
      }
    );

    const data: GeminiResponse = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (result) {
      try {
        const cleanJson = result.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        const entities = JSON.parse(cleanJson);
        
        return {
          services: entities.services?.filter((s: string) => 
            s && s.length > 2 && 
            !s.toLowerCase().includes('http') &&
            !s.toLowerCase().includes(brandName.toLowerCase())
          ) || [],
          industries: entities.industries?.filter((i: string) => i && i.length > 2) || [],
          technologies: entities.technologies?.filter((t: string) => t && t.length > 2) || [],
          targetAudience: entities.targetAudience?.filter((a: string) => a && a.length > 2) || [],
          businessType: entities.businessType || "Business"
        };
      } catch (parseError) {
        console.error('Entity extraction JSON parse failed:', parseError);
        return { services: [], industries: [], technologies: [], targetAudience: [], businessType: "Business" };
      }
    }
    
    return { services: [], industries: [], technologies: [], targetAudience: [], businessType: "Business" };
  } catch (error) {
    console.error('Entity extraction failed:', error);
    return { services: [], industries: [], technologies: [], targetAudience: [], businessType: "Business" };
  }
}

export async function extractBusinessEntitiesWithConfidence(
  content: string,
  title: string,
  url: string
): Promise<ExtractedEntity[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    console.log('🔑 OpenAI API Key available:', !!apiKey);
    console.log('📝 Content length:', content.length);
    console.log('🌐 URL:', url);

    const prompt = `Extract key business entities from this content. Focus on:
    - Companies and organizations
    - Products and services
    - Technologies and tools
    - Business concepts
    - Geographic locations
    - Key people/roles

    Content: "${content.slice(0, 3000)}"
    Title: "${title}"
    URL: "${url}"

    Return ONLY a JSON array with this exact format (no markdown, no code blocks, just pure JSON):
    [{"entity": "name", "type": "organization|product|technology|concept|location|person", "relevance": 1-10, "confidence": 0.1-1.0}]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting business entities from web content. Return only valid JSON arrays.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
    });

    console.log('🤖 OpenAI response status:', response.status);

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const result = data.choices[0]?.message?.content?.trim();

    if (!result) {
      throw new Error('No content in OpenAI response');
    }

    try {
      // Clean the result to handle markdown code blocks
      const cleanResult = result
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const entities = JSON.parse(cleanResult);
      if (Array.isArray(entities)) {
        return entities.filter(entity => 
          entity.entity && 
          entity.type && 
          typeof entity.relevance === 'number' &&
          typeof entity.confidence === 'number'
        );
      }
    } catch (parseError) {
      console.warn('Failed to parse entities as JSON:', parseError);
      console.log('Raw result:', result);
    }

    return [];
  } catch (error) {
    console.error('OpenAI entity extraction error:', error);
    throw new Error(`Failed to extract entities: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
