'use client';

import React, { useState, useEffect } from 'react';
import { AnalysisForm } from './components/AnalysisForm';
import { ResultsDisplay } from './components/ResultsDisplay';
import { LoadingState } from './components/LoadingState';
import { ProgressStatusBar } from './components/ProgressStatusBar';
import { useAnalysisStore, useUIStore } from './lib/store';
import { useAnalysisProgress } from './lib/useAnalysisProgress';
import { type AnalyzeRequest, type AnalysisResult } from './lib/types';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function HomePage() {
  const {
    isAnalyzing,
    currentAnalysis,
    error,
    setAnalyzing,
    setCurrentAnalysis,
    addToHistory,
    setError,
  } = useAnalysisStore();

  const { darkMode } = useUIStore();
  const [showResults, setShowResults] = useState(false);
  
  // Progress tracking
  const {
    steps,
    currentStep,
    overallProgress,
    isVisible: isProgressVisible,
    estimatedTimeRemaining,
    startAnalysis,
    updateStep,
    completeAnalysis,
    resetProgress,
  } = useAnalysisProgress();

  // Initialize dark mode on component mount
  useEffect(() => {
    if (darkMode && typeof document !== 'undefined') {
      document.documentElement.classList.add('dark');
    }
  }, [darkMode]);

  const handleAnalysisSubmit = async (data: AnalyzeRequest) => {
    setAnalyzing(true);
    setError(null);
    setShowResults(false);
    
    // Start progress tracking
    startAnalysis();

    try {
      // Step 1: Initializing
      updateStep('initializing', 'active');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStep('initializing', 'completed');
      
      // Step 2: Scraping
      updateStep('scraping', 'active');
      await new Promise(resolve => setTimeout(resolve, 2000));
      updateStep('scraping', 'completed');
      
      // Step 3: Keywords
      updateStep('keywords', 'active');
      await new Promise(resolve => setTimeout(resolve, 1500));
      updateStep('keywords', 'completed');
      
      // Step 4: Competitors
      updateStep('competitors', 'active');
      await new Promise(resolve => setTimeout(resolve, 2000));
      updateStep('competitors', 'completed');
      
      // Step 5: Competitor Scraping
      updateStep('competitor-scraping', 'active');
      await new Promise(resolve => setTimeout(resolve, 2500));
      updateStep('competitor-scraping', 'completed');
      
      // Step 6: AI Analysis
      updateStep('ai-analysis', 'active');
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      updateStep('ai-analysis', 'completed');
      
      // Step 7: Recommendations
      updateStep('recommendations', 'active');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStep('recommendations', 'completed');
      
      // Step 8: Finalizing
      updateStep('finalizing', 'active');
      
      const analysisResult: AnalysisResult = result.data;
      setCurrentAnalysis(analysisResult);
      addToHistory(analysisResult);
      setShowResults(true);
      
      // Complete progress
      completeAnalysis();

    } catch (error) {
      console.error('Analysis error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      // Mark current step as error
      updateStep(currentStep, 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleNewAnalysis = () => {
    setShowResults(false);
    setCurrentAnalysis(null);
    setError(null);
    resetProgress();
  };

  const handleExport = async (format: 'csv' | 'json') => {
    if (!currentAnalysis) return;

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisData: currentAnalysis,
          format,
          options: {
            includeRawData: format === 'json',
            includeMetadata: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analysis-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export analysis data');
    }
  };

  return (
    <ErrorBoundary>
      {/* Progress Status Bar */}
      <ProgressStatusBar
        steps={steps}
        currentStep={currentStep}
        overallProgress={overallProgress}
        isVisible={isProgressVisible}
        estimatedTimeRemaining={estimatedTimeRemaining || undefined}
      />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            <span className="text-blue-600">QFO</span>lysis AI Readiness Assistant
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Analyze your content's readiness for AI-powered search with advanced entity extraction and semantic coverage analysis. 
            Discover how Google AI Overviews and other AI systems understand your content.
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Analysis Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    {error}
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => setError(null)}
                      className="bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded text-sm text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/70 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isAnalyzing && (
            <LoadingState />
          )}

          {/* Analysis Form */}
          <div style={{ display: showResults || isAnalyzing ? 'none' : undefined }}>
            <AnalysisForm
              onSubmit={handleAnalysisSubmit}
              isLoading={isAnalyzing}
              disabled={isAnalyzing}
            />
          </div>

          {/* Results Display */}
          {showResults && currentAnalysis && !isAnalyzing && (
            <ResultsDisplay
              result={currentAnalysis}
              onExport={handleExport}
              onNewAnalysis={handleNewAnalysis}
            />
          )}
        </div>

        {/* Features Section */}
        {!showResults && !isAnalyzing && (
          <div className="mt-20 mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Powerful AI-Driven Analysis
              </h2>
              <p className="text-lg text-muted-foreground">
                Uncover hidden content opportunities with advanced semantic analysis
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6 rounded-lg border bg-card">
                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20 mb-4">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">AI Semantic Analysis</h3>
                <p className="text-muted-foreground">
                  Uses advanced embeddings to understand content meaning beyond simple keyword matching
                </p>
              </div>

              <div className="text-center p-6 rounded-lg border bg-card">
                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20 mb-4">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Competitive Insights</h3>
                <p className="text-muted-foreground">
                  Compare your content against competitors to identify gaps and opportunities
                </p>
              </div>

              <div className="text-center p-6 rounded-lg border bg-card">
                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20 mb-4">
                  <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Actionable Recommendations</h3>
                <p className="text-muted-foreground">
                  Get specific, AI-generated suggestions to improve your content strategy
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
} 