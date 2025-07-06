export interface FanOutQuery {
  question: string;
  intent: 'informational' | 'navigational' | 'transactional' | 'comparison';
  priority: 'high' | 'medium' | 'low';
  category: string;
}

export async function generateQueryFanOut(
  businessEntities: {
    services: string[];
    industries: string[];
    technologies: string[];
    targetAudience: string[];
    businessType: string;
  },
  content: string,
  title: string
): Promise<FanOutQuery[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key required for query fan-out');
  }

  const prompt = `Based on this business profile, generate questions that potential customers would ask when researching these services. Think like Google's "People also ask" and AI Overview question expansion.

Business Profile:
- Services: ${businessEntities.services.join(', ')}
- Industries: ${businessEntities.industries.join(', ')}
- Technologies: ${businessEntities.technologies.join(', ')}
- Target Audience: ${businessEntities.targetAudience.join(', ')}
- Business Type: ${businessEntities.businessType}

Generate 15-20 questions across these categories:

WHAT questions (definitions, explanations):
- "What is [service] and how does it work?"
- "What makes a good [service] provider?"

HOW questions (processes, methods):
- "How to choose [service] for [industry]?"
- "How much does [service] cost?"

WHY questions (benefits, reasons):
- "Why do [target audience] need [service]?"
- "Why use [technology] for [service]?"

COMPARISON questions:
- "Best [service] companies for [industry]"
- "[Service] vs [alternative service]"

PROCESS questions:
- "How to get started with [service]"
- "What to expect from [service] process"

Return JSON array:
[
  {
    "question": "What is SEO and how does it work for healthcare companies?",
    "intent": "informational",
    "priority": "high",
    "category": "Service Definition"
  },
  {
    "question": "How much does digital marketing cost for small businesses?",
    "intent": "transactional", 
    "priority": "high",
    "category": "Pricing"
  }
]

Focus on questions that potential customers would actually search for when evaluating these services.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1500,
          },
        }),
      }
    );

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (result) {
      try {
        const cleanJson = result.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        const queries = JSON.parse(cleanJson);
        
        return queries.filter((q: any) => 
          q.question && 
          q.intent && 
          q.priority && 
          q.category
        );
      } catch (parseError) {
        console.error('Failed to parse query fan-out JSON:', parseError);
        return [];
      }
    }
    
    return [];
  } catch (error) {
    console.error('Query fan-out generation failed:', error);
    return [];
  }
}

function parseQueriesFromText(text: string): FanOutQuery[] {
  const queries: FanOutQuery[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (line.includes('"question"')) {
      try {
        const questionMatch = line.match(/"question":\s*"([^"]+)"/);
        const intentMatch = line.match(/"intent":\s*"([^"]+)"/);
        const priorityMatch = line.match(/"priority":\s*"([^"]+)"/);
        const categoryMatch = line.match(/"category":\s*"([^"]+)"/);
        
        if (questionMatch && intentMatch && priorityMatch && categoryMatch) {
          queries.push({
            question: questionMatch[1],
            intent: intentMatch[1] as any,
            priority: priorityMatch[1] as any,
            category: categoryMatch[1] as any
          });
        }
      } catch {
        // Skip malformed lines
      }
    }
  }
  
  return queries;
}

export function analyzeQueryCoverage(
  targetContent: string,
  competitorContents: string[],
  queries: FanOutQuery[]
): { query: string; targetCoverage: number; competitorCoverage: number; gap: number }[] {
  return queries.map(query => {
    // Simple keyword-based coverage analysis
    const targetCoverage = calculateCoverageScore(targetContent, query.question);
    const competitorCoverage = Math.max(
      ...competitorContents.map(content => calculateCoverageScore(content, query.question))
    );
    
    return {
      query: query.question,
      targetCoverage,
      competitorCoverage,
      gap: competitorCoverage - targetCoverage
    };
  });
}

function calculateCoverageScore(content: string, query: string): number {
  // Simple keyword matching for coverage calculation
  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 3);
  const contentLower = content.toLowerCase();
  
  let matches = 0;
  queryWords.forEach(word => {
    if (contentLower.includes(word)) {
      matches++;
    }
  });
  
  return Math.round((matches / queryWords.length) * 100);
} 