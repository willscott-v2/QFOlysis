import { QueryFanOut, ExtractedEntity } from './types';

export async function generateQueryFanOutWithCoverage(
  entities: ExtractedEntity[],
  content: string,
  title: string
): Promise<QueryFanOut[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const entityList = entities.map(e => e.entity).join(', ');

  const prompt = `Generate questions potential customers would ask about this business, then analyze if the content covers each question.

Business Entities: ${entityList}
Content: ${content.slice(0, 3000)}

Generate 10-15 questions across these patterns:
- "What is [entity]?" 
- "How does [entity] work?"
- "What services does [company] offer for [industry]?"
- "How much does [service] cost?"
- "How does [company] compare to competitors?"
- "What is [company]'s process for [service]?"

For each question, analyze the content and determine:
- Coverage: "Yes" (clearly answered), "No" (not addressed), "Partial" (mentioned but incomplete)
- Coverage details: Brief explanation of what's covered or missing

    Return ONLY a JSON array (no markdown, no code blocks, just pure JSON):
    [
      {
        "question": "What is Search Influence?",
        "coverage": "Yes", 
        "coverageDetails": "Company is clearly described as a higher education digital marketing agency",
        "intent": "informational",
        "priority": "high",
        "category": "Company Definition"
      },
      {
        "question": "How much does Search Influence charge for its services?",
        "coverage": "Partial",
        "coverageDetails": "mentions pricing transparency but lacks specifics", 
        "intent": "transactional",
        "priority": "high", 
        "category": "Pricing"
      }
    ]`;

  try {
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
            content: 'You are an SEO expert analyzing content coverage. Generate questions customers would ask and determine if the content answers them.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
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
      
      const queries = JSON.parse(cleanResult);
      return Array.isArray(queries) ? queries.filter(q => 
        q.question && q.coverage && q.intent && q.priority && q.category
      ) : [];
    } catch (parseError) {
      console.warn('Failed to parse query fan-out as JSON:', parseError);
      console.log('Raw result:', result);
      return [];
    }
  } catch (error) {
    console.error('Query fan-out generation failed:', error);
    return [];
  }
}

export function calculateCoverageScore(fanOutQueries: QueryFanOut[]): number {
  if (fanOutQueries.length === 0) return 0;
  
  const scores = fanOutQueries.map(q => {
    switch (q.coverage) {
      case 'Yes': return 1;
      case 'Partial': return 0.5;
      case 'No': return 0;
      default: return 0;
    }
  });
  
  const totalScore = scores.reduce((sum: number, score: number) => sum + score, 0);
  return Math.round((totalScore / fanOutQueries.length) * 100);
}

export async function generateSearchQueries(
  entities: ExtractedEntity[],
  originalUrl: string
): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const topEntities = entities
      .sort((a, b) => (b.relevance * b.confidence) - (a.relevance * a.confidence))
      .slice(0, 10)
      .map(e => `${e.entity} (${e.type})`)
      .join(', ');

    const prompt = `Generate 8-12 SEO-focused search queries based on these entities: ${topEntities}
    
    Original URL: ${originalUrl}
    
    Create queries that would help find:
    - Competitor analysis opportunities
    - Content gaps to fill
    - Keyword opportunities
    - Related topics to cover
    
    Return ONLY a JSON array of strings:
    ["query 1", "query 2", "query 3", ...]`;

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
            content: 'You are an SEO expert. Generate search queries that would help with competitive analysis and content optimization.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 400,
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
      const queries = JSON.parse(result);
      return Array.isArray(queries) ? queries.filter(q => typeof q === 'string') : [];
    } catch {
      return [];
    }
  } catch (error) {
    console.error('Query generation error:', error);
    return [];
  }
} 