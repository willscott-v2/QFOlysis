import { type ScrapedContent, ScrapingError } from './types';

// ============================================================================
// Scraping Configuration
// ============================================================================

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v0/scrape';
const USER_AGENT = 'Mozilla/5.0 (compatible; AI-Coverage-Tool/1.0)';
const TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;

interface FirecrawlResponse {
  success: boolean;
  data?: {
    content: string;
    markdown: string;
    html: string;
    metadata: {
      title: string;
      description?: string;
      author?: string;
      publishedTime?: string;
      [key: string]: any;
    };
  };
  error?: string;
}

// ============================================================================
// Main Scraping Functions
// ============================================================================

/**
 * Extract content from a URL using Firecrawl API (primary method)
 */
async function scrapeWithFirecrawl(url: string): Promise<ScrapedContent> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  
  if (!apiKey) {
    throw new ScrapingError('Firecrawl API key not configured', url);
  }

  try {
    const response = await fetch(FIRECRAWL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        includeTags: ['title', 'meta'],
        excludeTags: ['nav', 'footer', 'aside', 'script', 'style'],
        waitFor: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: FirecrawlResponse = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to scrape content');
    }

    const content = data.data.markdown || data.data.content || '';
    const wordCount = content.split(/\s+/).length;

    return {
      url,
      title: data.data.metadata.title || extractTitleFromContent(content),
      content: cleanContent(content),
      metadata: {
        author: data.data.metadata.author,
        publishDate: data.data.metadata.publishedTime,
        wordCount,
        description: data.data.metadata.description,
        keywords: extractKeywords(content),
      },
      extractedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Firecrawl scraping failed:', error);
    throw new ScrapingError(
      `Firecrawl scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      url
    );
  }
}

/**
 * Fallback content extraction using simple fetch and parsing
 */
async function scrapeWithFallback(url: string): Promise<ScrapedContent> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const content = extractTextFromHTML(html);
    const title = extractTitleFromHTML(html);
    const wordCount = content.split(/\s+/).length;

    return {
      url,
      title: title || extractTitleFromContent(content),
      content: cleanContent(content),
      metadata: {
        wordCount,
        description: extractMetaDescription(html),
        keywords: extractKeywords(content),
      },
      extractedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Fallback scraping failed:', error);
    throw new ScrapingError(
      `Fallback scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      url
    );
  }
}

/**
 * Main scraping function with retry logic
 */
export async function scrapeContent(url: string): Promise<ScrapedContent> {
  if (!isValidUrl(url)) {
    throw new ScrapingError('Invalid URL format', url);
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Try Firecrawl first (only on first attempt)
      if (process.env.FIRECRAWL_API_KEY && attempt === 1) {
        try {
          return await scrapeWithFirecrawl(url);
        } catch (firecrawlError) {
          console.warn(`Firecrawl failed:`, firecrawlError);
          lastError = firecrawlError as Error;
          // Continue to fallback
        }
      }
      
      // Use fallback scraping
      try {
        return await scrapeWithFallback(url);
      } catch (fallbackError) {
        console.warn(`Fallback attempt ${attempt} failed:`, fallbackError);
        lastError = fallbackError as Error;
      }

      // Wait before retry (exponential backoff)
      if (attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      lastError = error as Error;
    }
  }

  throw new ScrapingError(
    `Failed to scrape content after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`,
    url
  );
}

/**
 * Scrape multiple URLs concurrently with rate limiting
 */
export async function scrapeMultipleUrls(
  urls: string[],
  concurrency: number = 3
): Promise<(ScrapedContent | null)[]> {
  const results: (ScrapedContent | null)[] = new Array(urls.length).fill(null);
  const errors: string[] = [];

  // Process URLs in batches to respect rate limits
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchPromises = batch.map(async (url, batchIndex) => {
      try {
        const result = await scrapeContent(url);
        results[i + batchIndex] = result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${url}: ${errorMessage}`);
        console.error(`Failed to scrape ${url}:`, error);
      }
    });

    await Promise.all(batchPromises);

    // Add delay between batches
    if (i + concurrency < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  if (errors.length > 0) {
    console.warn(`Scraping completed with ${errors.length} errors:`, errors);
  }

  return results;
}

// ============================================================================
// Content Processing Utilities
// ============================================================================

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Extract text content from HTML
 */
function extractTextFromHTML(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, ' ');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'");
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Extract title from HTML
 */
function extractTitleFromHTML(html: string): string {
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim().replace(/\s+/g, ' ');
  }
  
  // Fallback to h1 tag
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1Match && h1Match[1]) {
    return extractTextFromHTML(h1Match[1]).trim();
  }
  
  return '';
}

/**
 * Extract meta description from HTML
 */
function extractMetaDescription(html: string): string {
  const descMatch = html.match(/<meta[^>]*name=['"]description['"][^>]*content=['"]([^'"]*)['"]/i);
  if (descMatch && descMatch[1]) {
    return descMatch[1].trim();
  }
  
  const ogDescMatch = html.match(/<meta[^>]*property=['"]og:description['"][^>]*content=['"]([^'"]*)['"]/i);
  if (ogDescMatch && ogDescMatch[1]) {
    return ogDescMatch[1].trim();
  }
  
  return '';
}

/**
 * Extract title from content (fallback)
 */
function extractTitleFromContent(content: string): string {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length > 0) {
    // Take the first substantial line as title
    const firstLine = lines[0].trim();
    if (firstLine.length > 10 && firstLine.length < 200) {
      return firstLine;
    }
  }
  return 'Untitled';
}

/**
 * Clean and normalize content
 */
function cleanContent(content: string): string {
  // Remove excessive whitespace
  content = content.replace(/\s+/g, ' ');
  
  // Remove common navigation and footer text
  const removePatterns = [
    /copyright\s+\d{4}/gi,
    /all rights reserved/gi,
    /privacy policy/gi,
    /terms of service/gi,
    /cookie policy/gi,
    /follow us on/gi,
    /subscribe to/gi,
  ];
  
  for (const pattern of removePatterns) {
    content = content.replace(pattern, '');
  }
  
  // Limit content length
  if (content.length > 50000) {
    content = content.slice(0, 50000) + '...';
  }
  
  return content.trim();
}

/**
 * Extract keywords from content
 */
function extractKeywords(content: string): string[] {
  // Simple keyword extraction based on word frequency
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  const wordCount = new Map<string, number>();
  
  for (const word of words) {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  }
  
  // Get top keywords (appearing more than once)
  const keywords = Array.from(wordCount.entries())
    .filter(([_, count]) => count > 1)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 10)
    .map(([word, _]) => word);
  
  return keywords;
}

/**
 * Check if content appears to be substantial
 */
export function validateContent(content: ScrapedContent): boolean {
  // More lenient validation for development
  if (!content.content || content.content.length < 50) {
    console.log('Content validation failed: content too short', content.content?.length);
    return false;
  }
  
  if (!content.title || content.title.length < 2) {
    console.log('Content validation failed: title too short', content.title?.length);
    return false;
  }
  
  // Check for common error pages (but be more lenient)
  const errorIndicators = [
    '404 not found',
    'page not found',
    'access denied',
    'forbidden',
    'server error'
  ];
  
  const lowerContent = content.content.toLowerCase();
  const lowerTitle = content.title.toLowerCase();
  
  for (const indicator of errorIndicators) {
    if (lowerTitle.includes(indicator) || lowerContent.includes(indicator)) {
      console.log('Content validation failed: error indicator found', indicator);
      return false;
    }
  }
  
  return true;
} 