import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type AnalysisStore, type UIStore, type AnalysisResult } from './types';

// ============================================================================
// Analysis Store
// ============================================================================

export const useAnalysisStore = create<AnalysisStore>()(
  persist(
    (set, get) => ({
      // State
      isAnalyzing: false,
      currentAnalysis: null,
      analysisHistory: [],
      error: null,

      // Actions
      setAnalyzing: (analyzing: boolean) => 
        set({ isAnalyzing: analyzing, error: null }),

      setCurrentAnalysis: (result: AnalysisResult | null) => 
        set({ currentAnalysis: result }),

      addToHistory: (result: AnalysisResult) => 
        set((state) => {
          // Remove duplicate if exists
          const filtered = state.analysisHistory.filter(
            h => h.analysisId !== result.analysisId
          );
          
          // Add new result to the beginning and keep only last 20
          const newHistory = [result, ...filtered].slice(0, 20);
          
          return {
            analysisHistory: newHistory,
            currentAnalysis: result,
          };
        }),

      setError: (error: string | null) => 
        set({ error, isAnalyzing: false }),

      clearHistory: () => 
        set({ analysisHistory: [], currentAnalysis: null }),

      removeFromHistory: (analysisId: string) => 
        set((state) => ({
          analysisHistory: state.analysisHistory.filter(
            h => h.analysisId !== analysisId
          ),
          currentAnalysis: state.currentAnalysis?.analysisId === analysisId 
            ? null 
            : state.currentAnalysis,
        })),
    }),
    {
      name: 'ai-coverage-analysis',
      partialize: (state) => ({
        analysisHistory: state.analysisHistory,
        currentAnalysis: state.currentAnalysis,
      }),
    }
  )
);

// ============================================================================
// UI Store
// ============================================================================

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // State
      darkMode: false,
      sidebarOpen: true,
      activeTab: 'overview',

      // Actions
      toggleDarkMode: () => 
        set((state) => {
          const newDarkMode = !state.darkMode;
          
          // Update document class for dark mode
          if (typeof document !== 'undefined') {
            if (newDarkMode) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
          
          return { darkMode: newDarkMode };
        }),

      setSidebarOpen: (open: boolean) => 
        set({ sidebarOpen: open }),

      setActiveTab: (tab: UIStore['activeTab']) => 
        set({ activeTab: tab }),
    }),
    {
      name: 'ai-coverage-ui',
      partialize: (state) => ({
        darkMode: state.darkMode,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);

// ============================================================================
// Store Utilities
// ============================================================================

/**
 * Initialize dark mode on app load
 */
export function initializeDarkMode(): void {
  const isDark = useUIStore.getState().darkMode;
  
  if (typeof document !== 'undefined') {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

/**
 * Get analysis by ID from history
 */
export function getAnalysisById(analysisId: string): AnalysisResult | null {
  const { analysisHistory } = useAnalysisStore.getState();
  return analysisHistory.find(a => a.analysisId === analysisId) || null;
}

/**
 * Export analysis data for download
 */
export function exportAnalysisData(format: 'json' | 'csv' = 'json'): string {
  const { currentAnalysis } = useAnalysisStore.getState();
  
  if (!currentAnalysis) {
    throw new Error('No analysis data to export');
  }

  if (format === 'json') {
    return JSON.stringify(currentAnalysis, null, 2);
  }

  if (format === 'csv') {
    return convertToCSV(currentAnalysis);
  }

  throw new Error('Unsupported export format');
}

/**
 * Convert analysis result to CSV format
 */
function convertToCSV(analysis: AnalysisResult): string {
  const headers = [
    'URL',
    'Title',
    'Overall Score',
    'Technical Score',
    'Marketing Score',
    'SEO Score',
    'Content Score',
    'Business Score',
    'Design Score',
    'Analytics Score',
  ];

  const rows: string[][] = [headers];

  // Add target data
  const targetRow = [
    analysis.targetUrl,
    analysis.targetTitle,
    analysis.targetScore.toString(),
  ];

  // Add category scores for target
  const categories = ['Technical', 'Marketing', 'SEO', 'Content', 'Business', 'Design', 'Analytics'];
  for (const category of categories) {
    const radarItem = analysis.radarData.find(r => r.category === category);
    targetRow.push(radarItem?.targetScore.toString() || '0');
  }

  rows.push(targetRow);

  // Add competitor data
  for (const competitor of analysis.competitorResults) {
    const competitorRow = [
      competitor.url,
      competitor.title,
      competitor.overallScore.toString(),
    ];

    // Add category scores for competitor
    for (const category of categories) {
      const categoryScore = competitor.categoryScores.find(s => s.category === category);
      competitorRow.push(categoryScore?.score.toString() || '0');
    }

    rows.push(competitorRow);
  }

  // Convert to CSV string
  return rows.map(row => 
    row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
  ).join('\n');
}

/**
 * Calculate analysis statistics
 */
export function getAnalysisStats() {
  const { analysisHistory } = useAnalysisStore.getState();
  
  if (analysisHistory.length === 0) {
    return {
      totalAnalyses: 0,
      averageTargetScore: 0,
      averageCompetitorScore: 0,
      mostAnalyzedCategories: [],
      analysisFrequency: 0,
    };
  }

  const totalAnalyses = analysisHistory.length;
  const averageTargetScore = Math.round(
    analysisHistory.reduce((sum, a) => sum + a.targetScore, 0) / totalAnalyses
  );

  const allCompetitorScores = analysisHistory.flatMap(a => 
    a.competitorResults.map(c => c.overallScore)
  );
  const averageCompetitorScore = allCompetitorScores.length > 0
    ? Math.round(allCompetitorScores.reduce((sum, score) => sum + score, 0) / allCompetitorScores.length)
    : 0;

  // Count category frequency
  const categoryCount = new Map<string, number>();
  for (const analysis of analysisHistory) {
    for (const radarItem of analysis.radarData) {
      categoryCount.set(radarItem.category, (categoryCount.get(radarItem.category) || 0) + 1);
    }
  }

  const mostAnalyzedCategories = Array.from(categoryCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));

  // Calculate analysis frequency (analyses per day)
  const firstAnalysis = new Date(analysisHistory[analysisHistory.length - 1].timestamp);
  const lastAnalysis = new Date(analysisHistory[0].timestamp);
  const daysDiff = Math.max(1, (lastAnalysis.getTime() - firstAnalysis.getTime()) / (1000 * 60 * 60 * 24));
  const analysisFrequency = Math.round((totalAnalyses / daysDiff) * 100) / 100;

  return {
    totalAnalyses,
    averageTargetScore,
    averageCompetitorScore,
    mostAnalyzedCategories,
    analysisFrequency,
  };
} 