import { ExtractedEntity } from './types';

export async function extractEntitiesWithGemini(
  content: string,
  title: string
): Promise<ExtractedEntity[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn('Gemini API key not configured, using fallback extraction');
    return extractFallbackEntities(content, title);
  }

  const prompt = `Analyze this content and extract key semantic entities. Focus on:

SERVICES: What services/solutions are offered (e.g., "Digital Marketing", "SEO Services")
INDUSTRIES: What industries are served (e.g., "Higher Education", "Healthcare")
TECHNOLOGIES: What technologies/platforms are mentioned (e.g., "Google Analytics", "WordPress")
ORGANIZATIONS: What companies/institutions are referenced (e.g., "UPCEA", "Palo Alto University")
CONCEPTS: What key concepts/methodologies are discussed (e.g., "Search Engine Optimization", "Content Marketing")
LOCATIONS: Geographic locations mentioned (e.g., "New Orleans", "California")

Content Title: ${title}
Content: ${content.slice(0, 4000)}

Return JSON array with this exact format:
[
  {
    "entity": "Digital Marketing",
    "type": "service",
    "confidence": 95,
    "context": "brief context where found"
  }
]

Extract 10-15 most important entities. Exclude generic words like "services", "solutions", "company". Focus on specific, actionable entities that would be useful for competitor analysis and content gap identification.`;

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
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (result) {
      try {
        const entities = JSON.parse(result);
        return entities.filter((e: any) => 
          e.entity && 
          e.type && 
          typeof e.confidence === 'number' &&
          e.confidence > 70
        );
      } catch {
        return parseEntitiesFromText(result);
      }
    }
    
    return [];
  } catch (error) {
    console.error('Entity extraction failed:', error);
    return extractFallbackEntities(content, title);
  }
}

function extractFallbackEntities(content: string, title: string): ExtractedEntity[] {
  // Fallback entity extraction using NLP patterns
  const entities: ExtractedEntity[] = [];
  
  // Extract potential services (words ending in -ing, -ment, -tion)
  const servicePattern = /\b\w+(?:ing|ment|tion|sion)\b/gi;
  const services = content.match(servicePattern) || [];
  
  services.slice(0, 5).forEach(service => {
    if (service.length > 6 && !isCommonWord(service)) {
      entities.push({
        entity: service,
        type: 'service',
        confidence: 75,
        context: 'extracted from content patterns'
      });
    }
  });

  // Extract potential organizations (capitalized words)
  const orgPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  const orgs = content.match(orgPattern) || [];
  
  orgs.slice(0, 3).forEach(org => {
    if (org.length > 3 && !isCommonWord(org)) {
      entities.push({
        entity: org,
        type: 'organization',
        confidence: 70,
        context: 'extracted from capitalization patterns'
      });
    }
  });

  return entities;
}

function parseEntitiesFromText(text: string): ExtractedEntity[] {
  // Parse entities from text if JSON parsing fails
  const entities: ExtractedEntity[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (line.includes('"entity"') && line.includes('"type"')) {
      try {
        const match = line.match(/"entity":\s*"([^"]+)"/);
        const typeMatch = line.match(/"type":\s*"([^"]+)"/);
        
        if (match && typeMatch) {
          entities.push({
            entity: match[1],
            type: typeMatch[1] as any,
            confidence: 80,
            context: 'parsed from text response'
          });
        }
      } catch {
        // Skip malformed lines
      }
    }
  }
  
  return entities;
}

function isCommonWord(word: string): boolean {
  const common = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'these', 'those', 'services', 'solutions', 'company', 'business', 'marketing', 'digital', 'online'];
  return common.includes(word.toLowerCase());
} 