import { NextRequest, NextResponse } from 'next/server';
import { AnalyzeRequestSchema, type AnalysisResult, type ScrapedContent } from '../../lib/types';
import { performContentAnalysis } from '../../lib/analyzer';
import { scrapeContent, scrapeMultipleUrls } from '../../lib/scraper';
import { generateKeywordsWithGemini } from '../../lib/gemini';
import { discoverCompetitorsWithSerpAPI } from '../../lib/serpapi';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = AnalyzeRequestSchema.parse(body);

    const startTime = Date.now();
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Step 1: Scrape target content
    console.log('Scraping target content...');
    const targetContent = await scrapeContent(validatedData.targetUrl);

    // Step 2: Generate keywords using Gemini if not provided
    let queries = validatedData.queries;
    if (queries.length === 0 && validatedData.options?.generateQueries) {
      console.log('Generating keywords with Gemini...');
      try {
        const generatedKeywords = await generateKeywordsWithGemini(targetContent.content);
        queries = generatedKeywords;
      } catch (error) {
        console.warn('Gemini keyword generation failed, using fallback:', error);
        // Fallback to basic keyword extraction
        queries = extractBasicKeywords(targetContent.content);
      }
    }

    // Step 3: Discover competitors if not provided
    let competitorUrls = validatedData.competitorUrls;
    if (competitorUrls.length === 0 && validatedData.options?.includeTopResults) {
      console.log('Discovering competitors with SerpAPI...');
      try {
        const discoveredCompetitors = await discoverCompetitorsWithSerpAPI(
          targetContent.title,
          validatedData.options?.resultCount || 5
        );
        competitorUrls = discoveredCompetitors;
      } catch (error) {
        console.warn('SerpAPI competitor discovery failed:', error);
        // Continue with empty competitor list
      }
    }

    // Step 4: Scrape competitor content
    let competitorContents: ScrapedContent[] = [];
    if (competitorUrls.length > 0) {
      console.log('Scraping competitor content...');
      const scrapedResults = await scrapeMultipleUrls(competitorUrls);
      competitorContents = scrapedResults.filter((result): result is ScrapedContent => result !== null);
    }

    // Step 5: Perform AI analysis
    console.log('Performing AI analysis...');
    const analysisResult = await performContentAnalysis(
      targetContent,
      competitorContents,
      queries
    );

    // Step 6: Prepare final result
    const finalResult: AnalysisResult = {
      ...analysisResult,
      analysisId,
      targetUrl: validatedData.targetUrl,
      queries,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime,
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