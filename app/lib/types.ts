import { z } from 'zod';

// Import entity and query types
export interface ExtractedEntity {
  entity: string;
  type: 'service' | 'industry' | 'technology' | 'location' | 'organization' | 'concept';
  confidence: number;
  context?: string;
}

export interface FanOutQuery {
  question: string;
  intent: 'informational' | 'navigational' | 'transactional' | 'comparison';
  priority: 'high' | 'medium' | 'low';
  category: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export const AnalyzeRequestSchema = z.object({
  targetUrl: z.string().url('Invalid URL format'),
  competitorUrls: z.array(z.string().url()).optional().default([]),
  queries: z.array(z.string().min(1).max(200)).optional().default([]),
  options: z.object({
    includeTopResults: z.boolean().optional().default(true),
    resultCount: z.number().min(1).max(10).optional().default(5),
    generateQueries: z.boolean().optional().default(true),
  }).optional().default({}),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const ScrapeRequestSchema = z.object({
  url: z.string().url('Invalid URL format'),
  extractOptions: z.object({
    includeMetadata: z.boolean().optional().default(true),
    maxLength: z.number().min(100).max(50000).optional().default(10000),
  }).optional().default({}),
});

export type ScrapeRequest = z.infer<typeof ScrapeRequestSchema>;

// ============================================================================
// Core Data Types
// ============================================================================

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  metadata?: {
    author?: string;
    publishDate?: string;
    wordCount: number;
    description?: string;
    keywords?: string[];
  };
  extractedAt: string;
}

export interface CompetitorResult {
  url: string;
  title: string;
  overallScore: number;
  categoryScores: CategoryScore[];
  topQueries: QueryMatch[];
  recommendations: string[];
}

export interface CategoryScore {
  category: string;
  score: number;
  maxScore: number;
  matchedQueries: number;
  totalQueries: number;
}

export interface QueryMatch {
  query: string;
  similarity: number;
  category: string;
  matched: boolean;
  context?: string;
}

export interface AnalysisResult {
  analysisId: string;
  targetUrl: string;
  targetScore: number;
  targetTitle: string;
  competitorResults: CompetitorResult[];
  radarData: RadarChartData[];
  coverageGaps: CoverageGap[];
  recommendations: string[];
  queries: string[];
  timestamp: string;
  processingTime: number;
  // Enhanced entity-based analysis fields
  entities?: ExtractedEntity[];
  fanOutQueries?: FanOutQuery[];
  businessEntities?: {
    services: string[];
    industries: string[];
    technologies: string[];
    targetAudience: string[];
    businessType: string;
  };
}

export interface RadarChartData {
  category: string;
  targetScore: number;
  competitorAvg: number;
  maxScore: number;
}

export interface CoverageGap {
  category: string;
  missingQueries: string[];
  competitorUrls: string[];
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
}

// ============================================================================
// AI Processing Types
// ============================================================================

export interface EmbeddingCache {
  text: string;
  embedding: number[];
  model: string;
  createdAt: string;
}

export interface SimilarityResult {
  text1: string;
  text2: string;
  similarity: number;
  category?: string;
}

export interface AIAnalysisOptions {
  embeddingModel: 'text-embedding-3-small' | 'text-embedding-3-large';
  similarityThreshold: number;
  maxTokens: number;
  temperature: number;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface AnalysisFormProps {
  onSubmit: (data: AnalyzeRequest) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
}

export interface ResultsDisplayProps {
  result: AnalysisResult;
  onExport?: (format: 'csv' | 'json') => void;
  onNewAnalysis?: () => void;
}

export interface RadarChartProps {
  data: RadarChartData[];
  width?: number;
  height?: number;
  showLegend?: boolean;
}

export interface CompetitorCardProps {
  competitor: CompetitorResult;
  targetScore: number;
  onViewDetails?: (url: string) => void;
}

// ============================================================================
// Store Types (Zustand)
// ============================================================================

export interface AnalysisStore {
  // State
  isAnalyzing: boolean;
  currentAnalysis: AnalysisResult | null;
  analysisHistory: AnalysisResult[];
  error: string | null;
  
  // Actions
  setAnalyzing: (analyzing: boolean) => void;
  setCurrentAnalysis: (result: AnalysisResult | null) => void;
  addToHistory: (result: AnalysisResult) => void;
  setError: (error: string | null) => void;
  clearHistory: () => void;
  removeFromHistory: (analysisId: string) => void;
}

export interface UIStore {
  // State
  darkMode: boolean;
  sidebarOpen: boolean;
  activeTab: 'overview' | 'competitors' | 'gaps' | 'history';
  
  // Actions
  toggleDarkMode: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: UIStore['activeTab']) => void;
}

// ============================================================================
// Utility Types
// ============================================================================

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface RateLimitInfo {
  count: number;
  resetTime: number;
  limit: number;
}

export interface ProcessingStats {
  totalUrls: number;
  processedUrls: number;
  failedUrls: number;
  averageProcessingTime: number;
  startTime: string;
  endTime?: string;
}

// ============================================================================
// Export Types
// ============================================================================

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  includeMetadata: boolean;
  includeRawData: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface CSVExportData {
  url: string;
  title: string;
  overallScore: number;
  [key: string]: string | number; // Dynamic category columns
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AppConfig {
  api: {
    openaiApiKey: string;
    firecrawlApiKey: string;
    cohereApiKey?: string;
    redisUrl?: string;
    redisToken?: string;
  };
  limits: {
    maxUrlsPerAnalysis: number;
    maxCompetitors: number;
    maxQueriesPerCategory: number;
    rateLimitRequests: number;
    rateLimitWindow: number;
  };
  ai: {
    embeddingModel: string;
    similarityThreshold: number;
    maxTokens: number;
    temperature: number;
  };
  scraping: {
    timeout: number;
    maxRetries: number;
    userAgent: string;
  };
}

// ============================================================================
// Error Types
// ============================================================================

export class AnalysisError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}

export class ScrapingError extends Error {
  constructor(
    message: string,
    public url: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ScrapingError';
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
} 