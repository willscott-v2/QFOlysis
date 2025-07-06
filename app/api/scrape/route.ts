import { NextRequest, NextResponse } from 'next/server';
import { ScrapeRequestSchema } from '../../lib/types';
import { scrapeContent } from '../../lib/scraper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ScrapeRequestSchema.parse(body);

    const scrapedContent = await scrapeContent(validatedData.url);

    return NextResponse.json({
      success: true,
      data: scrapedContent,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Scraping error:', error);
    
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
        error: 'An unexpected error occurred during scraping',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
} 