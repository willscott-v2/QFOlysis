import { NextRequest, NextResponse } from 'next/server';
import { AnalyzeRequestSchema, type AnalysisResult, type ScrapedContent, type ExtractedEntity } from '../../lib/types';
import { performContentAnalysis } from '../../lib/analyzer';
import { scrapeContent, scrapeMultipleUrls } from '../../lib/scraper';
import { generateKeywordsWithGemini } from '../../lib/gemini';
import { discoverCompetitorsWithSerpAPI, discoverCompetitorsWithSerpAPILegacy } from '../../lib/serpapi';
import { extractBusinessEntities, extractBusinessEntitiesWithConfidence } from '../../lib/gemini';
import { generateQueryFanOutWithCoverage, calculateCoverageScore } from '../../lib/queryFanOut';
import { generateOptimizationRecommendations } from '../../lib/optimizationRecommendations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = AnalyzeRequestSchema.parse(body);

    const startTime = Date.now();
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Track API usage
    let openaiTokens = 0;
    let serpapiRequests = 0;

    // Step 1: Scrape target content
    console.log('Scraping target content...');
    const targetContent = await scrapeContent(validatedData.targetUrl);

    // Step 2: Extract business entities
    console.log('Extracting business entities...');
    let extractedEntities: ExtractedEntity[] = [];
    try {
      extractedEntities = await extractBusinessEntitiesWithConfidence(
        targetContent.content,
        targetContent.title,
        validatedData.targetUrl
      );
      // Estimate tokens: ~4 chars per token for input, ~2 chars per token for output
      const inputTokens = Math.ceil((targetContent.content.length + targetContent.title.length) / 4);
      const outputTokens = Math.ceil(JSON.stringify(extractedEntities).length / 2);
      openaiTokens += inputTokens + outputTokens;
      console.log('Extracted entities:', extractedEntities);
    } catch (error) {
      console.warn('Entity extraction failed, using fallback:', error);
      // Create basic entities from the title and content
      const titleWords = targetContent.title.split(' ').filter(word => word.length > 3);
      extractedEntities = titleWords.slice(0, 3).map((word, index) => ({
        entity: word,
        type: 'concept' as const,
        confidence: 60 + (index * 10),
        relevance: 7 - index,
        context: 'extracted from title'
      }));
    }

    // Step 3: Generate query fan-out with coverage analysis
    console.log('Generating query fan-out with coverage analysis...');
    let queryFanOut: any[] = [];
    try {
      queryFanOut = await generateQueryFanOutWithCoverage(
        extractedEntities,
        targetContent.content,
        targetContent.title
      );
      // Estimate tokens for query fan-out
      const inputTokens = Math.ceil((targetContent.content.length + JSON.stringify(extractedEntities).length) / 4);
      const outputTokens = Math.ceil(JSON.stringify(queryFanOut).length / 2);
      openaiTokens += inputTokens + outputTokens;
      console.log(`Generated ${queryFanOut.length} fan-out queries`);
    } catch (error) {
      console.warn('Query fan-out generation failed:', error);
      // Create basic fan-out queries
      queryFanOut = [
        {
          question: `What is ${targetContent.title}?`,
          coverage: 'Yes',
          coverageDetails: 'Basic information available',
          intent: 'informational',
          priority: 'high',
          category: 'Company Information'
        }
      ];
    }

    // Step 4: Calculate coverage score
    const coverageScore = calculateCoverageScore(queryFanOut);
    console.log(`Coverage score: ${coverageScore}%`);

    // Step 5: Generate optimization recommendations
    console.log('Generating optimization recommendations...');
    let optimizationRecommendations: any[] = [];
    try {
      optimizationRecommendations = await generateOptimizationRecommendations(
        extractedEntities,
        targetContent.content,
        targetContent.title,
        validatedData.targetUrl
      );
      // Estimate tokens for optimization recommendations
      const inputTokens = Math.ceil((targetContent.content.length + JSON.stringify(extractedEntities).length) / 4);
      const outputTokens = Math.ceil(JSON.stringify(optimizationRecommendations).length / 2);
      openaiTokens += inputTokens + outputTokens;
      console.log(`Generated ${optimizationRecommendations.length} optimization recommendations`);
    } catch (error) {
      console.warn('Optimization recommendations generation failed:', error);
      // Create basic recommendations
      optimizationRecommendations = [
        {
          category: 'Content',
          recommendation: 'Add more detailed information about your services',
          priority: 'high',
          impact: 'Improve user understanding and search visibility'
        }
      ];
    }

    // Step 6: Discover competitors (keep existing logic but use extracted entities for better queries)
    let competitorUrls = validatedData.competitorUrls;
    if (competitorUrls.length === 0 && validatedData.options?.includeTopResults) {
      console.log('Discovering competitors with entity-based queries...');
      try {
        // Create business entities object from extracted entities
        const businessEntities = {
          services: extractedEntities.filter(e => e.type === 'service').map(e => e.entity),
          industries: extractedEntities.filter(e => e.type === 'industry').map(e => e.entity),
          technologies: extractedEntities.filter(e => e.type === 'technology').map(e => e.entity),
          targetAudience: extractedEntities.filter(e => e.type === 'person').map(e => e.entity),
          businessType: extractedEntities.find(e => e.type === 'organization')?.entity || 'business'
        };
        
        if (businessEntities.services.length > 0 || businessEntities.industries.length > 0) {
          const discoveredCompetitors = await discoverCompetitorsWithSerpAPI(
            businessEntities,
            validatedData.targetUrl,
            5
          );
          competitorUrls = discoveredCompetitors;
          serpapiRequests += 3; // Estimate 3 search queries
        } else {
          // Fallback: use title-based search
          const titleWords = targetContent.title.split(' ').filter(word => word.length > 3);
          if (titleWords.length > 0) {
            const searchQuery = `${titleWords.slice(0, 2).join(' ')} companies`;
            console.log('Using fallback search query:', searchQuery);
            try {
              const discoveredCompetitors = await discoverCompetitorsWithSerpAPILegacy(
                searchQuery,
                5,
                validatedData.targetUrl
              );
              competitorUrls = discoveredCompetitors;
              serpapiRequests += 1; // One search query
              console.log(`Found ${competitorUrls.length} competitors with fallback search`);
            } catch (fallbackError) {
              console.warn('Fallback competitor discovery failed:', fallbackError);
            }
          }
        }
      } catch (error) {
        console.warn('Enhanced competitor discovery failed:', error);
      }
    }

    // Step 7: Scrape competitor content
    let competitorContents: ScrapedContent[] = [];
    if (competitorUrls.length > 0) {
      console.log('Scraping competitor content...');
      const scrapedResults = await scrapeMultipleUrls(competitorUrls);
      competitorContents = scrapedResults.filter((result): result is ScrapedContent => result !== null);
    }

    // Step 7: Generate keywords
    console.log('Generating keywords...');
    let keywords: string[] = [];
    try {
      keywords = await generateKeywordsWithGemini(targetContent.content, 20);
      // Estimate tokens for keyword generation
      const inputTokens = Math.ceil(targetContent.content.length / 4);
      const outputTokens = Math.ceil(JSON.stringify(keywords).length / 2);
      openaiTokens += inputTokens + outputTokens;
      console.log(`Generated ${keywords.length} keywords`);
    } catch (error) {
      console.warn('Keyword generation failed:', error);
      // Fallback: extract basic keywords from content
      keywords = extractBasicKeywords(targetContent.content);
    }

    // Step 8: Perform AI analysis
    console.log('Performing AI analysis...');
    const analysisResult = await performContentAnalysis(
      targetContent,
      competitorContents,
      [...queryFanOut.map((q: any) => q.question), ...keywords]
    );

    // Step 9: Calculate estimated costs
    const estimatedCost = calculateEstimatedCost(openaiTokens, serpapiRequests);
    
    // Step 10: Prepare final result
    const finalResult: AnalysisResult = {
      ...analysisResult,
      extractedEntities,
      queryFanOut,
      optimizationRecommendations,
      coverageScore,
      analysisId,
      targetUrl: validatedData.targetUrl,
      queries: [...queryFanOut.map((q: any) => q.question), ...keywords],
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime,
      apiUsage: {
        openaiTokens,
        serpapiRequests,
        estimatedCost
      }
    };

    return NextResponse.json({
      success: true,
      data: finalResult,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Analysis error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred during analysis',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Fallback keyword extraction function
function extractBasicKeywords(content: string): string[] {
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3);

  const wordFreq: Record<string, number> = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  return Object.entries(wordFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([word]) => word);
}

// Calculate estimated API costs
function calculateEstimatedCost(openaiTokens: number, serpapiRequests: number): number {
  // OpenAI GPT-4o-mini pricing: $0.00015 per 1K input tokens, $0.0006 per 1K output tokens
  // Assuming 70% input, 30% output tokens
  const inputTokens = Math.floor(openaiTokens * 0.7);
  const outputTokens = Math.floor(openaiTokens * 0.3);
  const openaiCost = (inputTokens * 0.00015 / 1000) + (outputTokens * 0.0006 / 1000);
  
  // SerpAPI pricing: $50 for 5000 requests = $0.01 per request
  const serpapiCost = serpapiRequests * 0.01;
  
  return Math.round((openaiCost + serpapiCost) * 100) / 100; // Round to 2 decimal places
} 