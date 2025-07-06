import { ExtractedEntity } from './types';

export async function generateOptimizationRecommendations(
  entities: ExtractedEntity[],
  content: string,
  title: string,
  url: string
): Promise<Array<{ category: string; recommendation: string; why: string; priority: 'high' | 'medium' | 'low'; impact: string }>> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const topEntities = entities
      .sort((a, b) => (b.relevance * b.confidence) - (a.relevance * a.confidence))
      .slice(0, 8)
      .map(e => `${e.entity} (${e.type})`)
      .join(', ');

    const prompt = `Analyze this content and provide 8-12 highly specific, actionable SEO optimization recommendations. For each, include a short rationale (why this matters for this page). Be verbose and context-rich.
    
    URL: ${url}
    Title: ${title}
    Content length: ${content.length} characters
    Key entities: ${topEntities}
    
    Cover:
    - Content optimization (structure, depth, clarity, examples)
    - Technical SEO (site speed, schema, accessibility, internal linking)
    - Keyword strategy (targeting, density, gaps)
    - User experience (navigation, readability, engagement)
    - Structure improvements (headings, sections, multimedia)
    
    For each, provide:
    - category (Content|Technical|Keywords|UX|Structure)
    - recommendation (specific action)
    - why (short rationale for this recommendation)
    - priority (high|medium|low)
    - impact (expected result)
    
    Return ONLY a JSON array with this format (no markdown, no code blocks, just pure JSON):
    [{"category": "Content|Technical|Keywords|UX|Structure", "recommendation": "specific action", "why": "short rationale", "priority": "high|medium|low", "impact": "expected result"}]`;

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
            content: 'You are an SEO expert providing actionable optimization recommendations. Focus on specific, measurable improvements.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices[0]?.message?.content?.trim();

    if (!result) {
      return [];
    }

    try {
      // Clean the result to handle markdown code blocks
      const cleanResult = result
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const recommendations = JSON.parse(cleanResult);
      return Array.isArray(recommendations) ? recommendations.filter(r => 
        r.category && r.recommendation && r.why && r.priority && r.impact
      ) : [];
    } catch (parseError) {
      console.warn('Failed to parse optimization recommendations as JSON:', parseError);
      console.log('Raw result:', result);
      return [];
    }
  } catch (error) {
    console.error('Optimization recommendations error:', error);
    return [];
  }
} 