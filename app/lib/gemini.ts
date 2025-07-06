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
    throw new Error('Gemini API key not configured');
  }

  try {
    const prompt = `Extract ${maxKeywords} relevant keywords and search terms from the following content. 
    Focus on:
    - Main topics and themes
    - Technical terms and concepts
    - Problem statements
    - Related search queries users might use
    
    Return ONLY a JSON array of strings, no additional text or formatting.
    
    Content: ${content.slice(0, 4000)}`;

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
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 800,
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
      // Try to parse as JSON
      const keywords = JSON.parse(result);
      if (Array.isArray(keywords)) {
        return keywords.slice(0, maxKeywords);
      }
    } catch {
      // Fallback: extract keywords from text response
      const lines = result
        .split('\n')
        .filter(line => line.trim() && !line.includes('[') && !line.includes(']'))
        .map(line => line.replace(/^\d+\.?\s*["\']?/, '').replace(/["\']?$/, ''))
        .filter(line => line.length > 2);
      
      return lines.slice(0, maxKeywords);
    }

    return [];
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(`Failed to generate keywords: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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