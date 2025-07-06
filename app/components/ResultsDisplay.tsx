'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { RadarChart } from './RadarChart';
import { CompetitorCard } from './CompetitorCard';
import { CoverageGaps } from './CoverageGaps';
import { ExportButton } from './ExportButton';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Users, 
  Clock,
  RefreshCw,
  Download,
  Search
} from 'lucide-react';
import { type ResultsDisplayProps } from '@/app/lib/types';
import { formatRelativeTime } from '@/app/lib/utils';

export function ResultsDisplay({ 
  result, 
  onExport, 
  onNewAnalysis 
}: ResultsDisplayProps) {
  if (!result) {
    return null;
  }

  const {
    targetUrl,
    targetTitle,
    targetScore,
    competitorResults,
    radarData,
    coverageGaps,
    recommendations,
    timestamp,
    processingTime,
  } = result;

  const avgCompetitorScore = competitorResults.length > 0
    ? Math.round(competitorResults.reduce((sum, comp) => sum + comp.overallScore, 0) / competitorResults.length)
    : 0;

  const scoreDifference = targetScore - avgCompetitorScore;
  const isOutperforming = scoreDifference > 0;

  const handleExport = (format: 'csv' | 'json' | 'txt') => {
    if (onExport) {
      if (format === 'csv' || format === 'json') {
        onExport(format);
      } else {
        // Optionally, show a message or do nothing
        // alert('TXT export not implemented');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl flex items-center">
                <Target className="h-6 w-6 mr-2 text-blue-600" />
                Analysis Results
              </CardTitle>
              <CardDescription className="text-base">
                Comprehensive content coverage analysis for{' '}
                <span className="font-medium text-blue-600">{targetTitle}</span>
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <ExportButton 
                analysisResult={result}
                onExport={handleExport}
              />
              
              {onNewAnalysis && (
                <Button
                  variant="outline"
                  onClick={onNewAnalysis}
                  className="flex items-center"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  New Analysis
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {targetScore}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Your Score
              </div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-3xl font-bold text-gray-600 mb-1">
                {avgCompetitorScore}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Competitor Avg
              </div>
            </div>
            
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center justify-center text-2xl font-bold text-green-600 mb-1">
                {isOutperforming ? (
                  <TrendingUp className="h-6 w-6 mr-1" />
                ) : (
                  <TrendingDown className="h-6 w-6 mr-1" />
                )}
                {isOutperforming ? '+' : ''}{scoreDifference}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">
                Difference
              </div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center justify-center text-2xl font-bold text-purple-600 mb-1">
                <Users className="h-6 w-6 mr-1" />
                {competitorResults.length}
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300">
                Competitors
              </div>
            </div>
          </div>

          {/* Performance Badge */}
          <div className="flex justify-center mb-6">
            {isOutperforming ? (
              <Badge className="bg-green-100 text-green-800 px-4 py-2 text-sm">
                🎉 Outperforming competitors by {scoreDifference} points
              </Badge>
            ) : scoreDifference >= -5 ? (
              <Badge className="bg-yellow-100 text-yellow-800 px-4 py-2 text-sm">
                ⚡ Competitive - Room for improvement
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800 px-4 py-2 text-sm">
                📈 Significant improvement opportunities
              </Badge>
            )}
          </div>

          {/* Meta Information */}
          <div className="flex items-center justify-between text-sm text-gray-500 border-t pt-4">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Analyzed {formatRelativeTime(timestamp)}
            </div>
            <div>
              Processing time: {processingTime}ms
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Radar Chart */}
      <RadarChart 
        data={radarData}
        showLegend={true}
        height={400}
      />

      {/* Coverage Gaps */}
      {coverageGaps.length > 0 && (
        <CoverageGaps gaps={coverageGaps} />
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              💡 Key Recommendations
            </CardTitle>
            <CardDescription>
              AI-generated insights to improve your content coverage
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500"
                >
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                      {index + 1}
                    </span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {recommendation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competitor Analysis */}
      {competitorResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              🏆 Competitor Analysis
            </CardTitle>
            <CardDescription>
              Detailed comparison with competitor content performance
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {competitorResults.map((competitor, index) => (
                <CompetitorCard
                  key={index}
                  competitor={competitor}
                  targetScore={targetScore}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Query Fan-Out Analysis Section */}
      {result.fanOutQueries && result.fanOutQueries.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Search className="h-5 w-5 mr-2 text-blue-600" />
            Query Fan-Out Analysis
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Questions potential customers might ask when researching your services:
          </p>
          <div className="grid gap-3">
            {result.fanOutQueries.map((query, index) => (
              <div key={index} className="border rounded p-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {query.question}
                  </p>
                  <div className="flex items-center space-x-2 ml-4">
                    <Badge 
                      variant={query.priority === 'high' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {query.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {query.intent}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {query.category}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Analysis Link */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                Need more detailed insights?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Export your analysis data for deeper examination in spreadsheet tools.
              </p>
            </div>
            
            <Button variant="outline" className="flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 