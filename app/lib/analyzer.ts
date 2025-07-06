import OpenAI from 'openai';
import {
  type AnalysisResult,
  type CompetitorResult,
  type ScrapedContent,
  type QueryMatch,
  type CategoryScore,
  type RadarChartData,
  type CoverageGap,
  type SimilarityResult,
  AnalysisError,
} from './types';

// ============================================================================
// OpenAI Client Setup
// ============================================================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Core Analysis Functions
// ============================================================================

/**
 * Generate embedding for a given text using OpenAI's embedding model
 */
export async function generateEmbedding(
  text: string,
  model: string = 'text-embedding-3-small'
): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model,
      input: text.slice(0, 8000), // Limit input length
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new AnalysisError(
      'Failed to generate embedding',
      'EMBEDDING_ERROR',
      500
    );
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Generate relevant search queries for a given content/topic
 */
export async function generateQueries(
  content: string,
  count: number = 20
): Promise<string[]> {
  try {
    const prompt = `Based on the following content, generate ${count} specific, relevant search queries that competitors might rank for. Focus on:
    - Key topics and themes
    - Technical terms and concepts
    - Problem statements the content addresses
    - Related questions users might ask
    
    Content: ${content.slice(0, 3000)}
    
    Return ONLY a JSON array of strings, no additional text:`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
    });

    const result = response.choices[0].message.content;
    if (!result) {
      throw new Error('No response from OpenAI');
    }

    try {
      return JSON.parse(result);
    } catch {
      // Fallback: extract queries from text response
      const lines = result.split('\n').filter(line => 
        line.trim() && !line.includes('[') && !line.includes(']')
      );
      return lines.map(line => line.replace(/^\d+\.?\s*["\']?/, '').replace(/["\']?$/, '')).slice(0, count);
    }
  } catch (error) {
    console.error('Error generating queries:', error);
    // Return some default queries if generation fails
    return [
      'content marketing strategies',
      'SEO best practices',
      'digital marketing tips',
      'online business growth',
      'website optimization'
    ].slice(0, count);
  }
}

/**
 * Analyze content similarity between target and queries
 */
export async function analyzeContentSimilarity(
  targetContent: string,
  queries: string[],
  threshold: number = 0.7
): Promise<QueryMatch[]> {
  try {
    // Generate embedding for target content
    const targetEmbedding = await generateEmbedding(targetContent);

    const results: QueryMatch[] = [];

    // Process queries in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (query) => {
        try {
          const queryEmbedding = await generateEmbedding(query);
          const similarity = cosineSimilarity(targetEmbedding, queryEmbedding);
          
          return {
            query,
            similarity,
            category: categorizeQuery(query),
            matched: similarity >= threshold,
            context: extractRelevantContext(targetContent, query),
          };
        } catch (error) {
          console.error(`Error processing query "${query}":`, error);
          return {
            query,
            similarity: 0,
            category: 'general',
            matched: false,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to respect rate limits
      if (i + batchSize < queries.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity);
  } catch (error) {
    console.error('Error analyzing content similarity:', error);
    throw new AnalysisError(
      'Failed to analyze content similarity',
      'SIMILARITY_ERROR',
      500
    );
  }
}

/**
 * Categorize a query into a relevant topic category
 */
function categorizeQuery(query: string): string {
  const categories = {
    'Technical': ['api', 'code', 'programming', 'development', 'technical', 'software'],
    'Marketing': ['marketing', 'advertising', 'promotion', 'campaign', 'brand'],
    'SEO': ['seo', 'search', 'ranking', 'optimization', 'keywords'],
    'Content': ['content', 'blog', 'writing', 'article', 'copywriting'],
    'Business': ['business', 'strategy', 'growth', 'revenue', 'profit'],
    'Design': ['design', 'ui', 'ux', 'interface', 'visual'],
    'Analytics': ['analytics', 'data', 'metrics', 'tracking', 'measurement'],
  };

  const lowerQuery = query.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerQuery.includes(keyword))) {
      return category;
    }
  }

  return 'General';
}

/**
 * Extract relevant context from content for a given query
 */
function extractRelevantContext(content: string, query: string): string {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const queryWords = query.toLowerCase().split(/\s+/);
  
  // Find sentences that contain query words
  const relevantSentences = sentences.filter(sentence => {
    const lowerSentence = sentence.toLowerCase();
    return queryWords.some(word => lowerSentence.includes(word));
  });

  return relevantSentences.slice(0, 2).join('. ').slice(0, 200);
}

/**
 * Calculate category scores from query matches
 */
export function calculateCategoryScores(queryMatches: QueryMatch[]): CategoryScore[] {
  const categories = new Map<string, { matched: number; total: number; scores: number[] }>();

  for (const match of queryMatches) {
    if (!categories.has(match.category)) {
      categories.set(match.category, { matched: 0, total: 0, scores: [] });
    }

    const categoryData = categories.get(match.category)!;
    categoryData.total++;
    categoryData.scores.push(match.similarity);
    
    if (match.matched) {
      categoryData.matched++;
    }
  }

  return Array.from(categories.entries()).map(([category, data]) => ({
    category,
    score: Math.round((data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length) * 100),
    maxScore: 100,
    matchedQueries: data.matched,
    totalQueries: data.total,
  }));
}

/**
 * Generate radar chart data from category scores
 */
export function generateRadarData(
  targetScores: CategoryScore[],
  competitorResults: CompetitorResult[]
): RadarChartData[] {
  const categories = [...new Set(targetScores.map(s => s.category))];

  return categories.map(category => {
    const targetScore = targetScores.find(s => s.category === category)?.score || 0;
    
    const competitorScores = competitorResults.map(competitor => 
      competitor.categoryScores.find(s => s.category === category)?.score || 0
    );
    
    const competitorAvg = competitorScores.length > 0 
      ? Math.round(competitorScores.reduce((sum, score) => sum + score, 0) / competitorScores.length)
      : 0;

    return {
      category,
      targetScore,
      competitorAvg,
      maxScore: 100,
    };
  });
}

/**
 * Identify coverage gaps and generate recommendations
 */
export function identifyCoverageGaps(
  targetScores: CategoryScore[],
  competitorResults: CompetitorResult[],
  queryMatches: QueryMatch[]
): CoverageGap[] {
  const gaps: CoverageGap[] = [];

  for (const targetCategory of targetScores) {
    const competitorAvg = competitorResults.reduce((sum, competitor) => {
      const score = competitor.categoryScores.find(s => s.category === targetCategory.category)?.score || 0;
      return sum + score;
    }, 0) / Math.max(competitorResults.length, 1);

    if (targetCategory.score < competitorAvg - 10) { // 10-point gap threshold
      const missingQueries = queryMatches
        .filter(q => q.category === targetCategory.category && !q.matched)
        .map(q => q.query)
        .slice(0, 5);

      const competitorUrls = competitorResults
        .filter(c => {
          const found = c.categoryScores.find(s => s.category === targetCategory.category);
          return found !== undefined && found.score > targetCategory.score;
        })
        .map(c => c.url);

      const priority = targetCategory.score < competitorAvg - 30 ? 'high' as const :
                      targetCategory.score < competitorAvg - 20 ? 'medium' as const : 'low' as const;

      gaps.push({
        category: targetCategory.category,
        missingQueries,
        competitorUrls,
        priority,
        recommendation: generateRecommendation(targetCategory.category, missingQueries),
      });
    }
  }

  return gaps.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

/**
 * Generate specific recommendations for coverage gaps
 */
function generateRecommendation(category: string, missingQueries: string[]): string {
  const recommendations: Record<string, string> = {
    'Technical': 'Consider adding technical documentation, code examples, and implementation guides',
    'Marketing': 'Develop marketing-focused content like case studies, campaign analyses, and strategy guides',
    'SEO': 'Create SEO-focused content including keyword research, optimization guides, and ranking strategies',
    'Content': 'Expand content variety with different formats, topics, and audience segments',
    'Business': 'Add business strategy content, growth tactics, and industry insights',
    'Design': 'Include design resources, UI/UX guides, and visual examples',
    'Analytics': 'Provide data analysis content, metrics guides, and tracking tutorials',
  };

  const baseRecommendation = recommendations[category] || 'Create more comprehensive content in this area';
  
  if (missingQueries.length > 0) {
    return `${baseRecommendation}. Focus on topics like: ${missingQueries.slice(0, 3).join(', ')}.`;
  }

  return baseRecommendation;
}

/**
 * Main analysis function that orchestrates the entire process
 */
export async function performContentAnalysis(
  targetContent: ScrapedContent,
  competitorContents: ScrapedContent[],
  customQueries: string[] = []
): Promise<AnalysisResult> {
  const startTime = Date.now();
  
  try {
    // Generate queries if not provided
    let allQueries = [...customQueries];
    if (allQueries.length < 10) {
      const generatedQueries = await generateQueries(targetContent.content, 20 - allQueries.length);
      allQueries = [...allQueries, ...generatedQueries];
    }

    // Analyze target content
    const targetMatches = await analyzeContentSimilarity(targetContent.content, allQueries);
    const targetCategoryScores = calculateCategoryScores(targetMatches);
    const targetOverallScore = Math.round(
      targetCategoryScores.reduce((sum, score) => sum + score.score, 0) / targetCategoryScores.length
    );

    // Analyze competitor content
    const competitorResults: CompetitorResult[] = [];
    
    for (const competitorContent of competitorContents) {
      try {
        const competitorMatches = await analyzeContentSimilarity(competitorContent.content, allQueries);
        const competitorCategoryScores = calculateCategoryScores(competitorMatches);
        const overallScore = Math.round(
          competitorCategoryScores.reduce((sum, score) => sum + score.score, 0) / competitorCategoryScores.length
        );

        competitorResults.push({
          url: competitorContent.url,
          title: competitorContent.title,
          overallScore,
          categoryScores: competitorCategoryScores,
          topQueries: competitorMatches.filter(m => m.matched).slice(0, 10),
          recommendations: [], // Could be enhanced with specific recommendations
        });
      } catch (error) {
        console.error(`Error analyzing competitor ${competitorContent.url}:`, error);
        // Continue with other competitors
      }
    }

    // Generate insights
    const radarData = generateRadarData(targetCategoryScores, competitorResults);
    const coverageGaps = identifyCoverageGaps(targetCategoryScores, competitorResults, targetMatches);

    const processingTime = Date.now() - startTime;

    return {
      analysisId: `analysis_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      targetUrl: targetContent.url,
      targetScore: targetOverallScore,
      targetTitle: targetContent.title,
      competitorResults,
      radarData,
      coverageGaps,
      recommendations: generateOverallRecommendations(coverageGaps, targetCategoryScores, allQueries),
      queries: allQueries,
      timestamp: new Date().toISOString(),
      processingTime,
    };
  } catch (error) {
    console.error('Error performing content analysis:', error);
    throw new AnalysisError(
      'Failed to complete content analysis',
      'ANALYSIS_ERROR',
      500
    );
  }
}

/**
 * Generate overall recommendations based on analysis
 */
function generateOverallRecommendations(
  gaps: CoverageGap[],
  categoryScores: CategoryScore[],
  queries: string[]
): string[] {
  const recommendations: string[] = [];

  // Specific, actionable recommendations based on gaps
  const highPriorityGaps = gaps.filter(g => g.priority === 'high');
  
  if (highPriorityGaps.length > 0) {
    highPriorityGaps.forEach(gap => {
      const topMissing = gap.missingQueries.slice(0, 3);
      recommendations.push(
        `Create comprehensive content covering ${gap.category.toLowerCase()} topics: ${topMissing.join(', ')}. Focus on practical guides and case studies.`
      );
    });
  }

  // Category-specific recommendations
  const weakCategories = categoryScores.filter(s => s.score < 60).sort((a, b) => a.score - b.score);
  
  weakCategories.forEach(category => {
    switch (category.category.toLowerCase()) {
      case 'technical':
        recommendations.push('Develop technical documentation, implementation guides, and code examples to establish thought leadership.');
        break;
      case 'marketing':
        recommendations.push('Publish case studies showcasing successful campaigns, ROI data, and strategic marketing frameworks.');
        break;
      case 'seo':
        recommendations.push('Create SEO-focused content including keyword research guides, ranking strategies, and algorithm update analyses.');
        break;
      case 'content':
        recommendations.push('Diversify content formats: add video tutorials, infographics, interactive tools, and downloadable resources.');
        break;
      case 'business':
        recommendations.push('Publish business strategy content: growth frameworks, market analysis, and industry trend reports.');
        break;
      default:
        recommendations.push(`Strengthen ${category.category.toLowerCase()} content with detailed guides, expert interviews, and practical templates.`);
    }
  });

  // Query-based recommendations
  const lowPerformanceQueries = queries.slice(0, 10); // Top queries that need attention
  if (lowPerformanceQueries.length > 3) {
    recommendations.push(
      `Target high-value search terms: ${lowPerformanceQueries.slice(0, 3).join(', ')}. Create landing pages optimized for these queries.`
    );
  }

  // Competitive positioning
  const avgScore = categoryScores.reduce((sum, s) => sum + s.score, 0) / categoryScores.length;
  if (avgScore > 75) {
    recommendations.push('Leverage your content strength by creating cornerstone content that links to your best-performing pieces.');
  } else if (avgScore < 40) {
    recommendations.push('Conduct a content audit and prioritize updating your top 10 most important pages with comprehensive, user-focused information.');
  }

  return recommendations.slice(0, 6); // Limit to 6 actionable recommendations
} 