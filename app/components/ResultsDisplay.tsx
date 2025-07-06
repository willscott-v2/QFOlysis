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

  const handleExport = (format: 'csv' | 'json' | 'markdown') => {
    if (onExport) {
      onExport(format);
    }
  };

  // Log debug info from primary topic extraction if available
  if (result.primaryTopic && result.primaryTopic.debug) {
    // eslint-disable-next-line no-console
    console.log('[QFOlysis PrimaryTopic Debug]', result.primaryTopic.debug);
  }

  // Log chunk-based analysis info if available
  if (result.competitorResults && result.competitorResults.length > 0) {
    // eslint-disable-next-line no-console
    console.log('[QFOlysis Chunk Analysis]', {
      targetUrl: result.targetUrl,
      competitorCount: result.competitorResults.length,
      // Log sample chunk data from first competitor if available
      sampleChunkData: result.competitorResults[0]?.topQueries?.slice(0, 3).map(q => ({
        query: q.query,
        similarity: q.similarity,
        bestChunkIndex: q.bestChunkIndex,
        topChunkMatches: q.allChunkSimilarities?.slice(0, 2)
      }))
    });
  }

  return (
    <div className="space-y-6">
      {/* Primary Topic Section */}
      {result.primaryTopic && (
        <div className="bg-blue-50 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Primary Topic Detected</h3>
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold text-blue-700">{result.primaryTopic.entity}</span>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              {result.primaryTopic.entityType}
            </span>
            <span className="text-sm text-blue-600">
              Confidence: {Math.round(result.primaryTopic.confidence * 100)}%
            </span>
          </div>
          {result.primaryTopic.combinedTopic && (
            <p className="text-blue-700 mt-2">Combined Topic: {result.primaryTopic.combinedTopic}</p>
          )}
          {result.primaryTopic.subEntities && result.primaryTopic.subEntities.length > 0 && (
            <div className="mt-3">
              <span className="text-sm text-blue-600">Related Entities: </span>
              {result.primaryTopic.subEntities.map(entity => (
                <span key={entity} className="inline-block bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs mr-2">
                  {entity}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* Extracted Entities Section */}
      {result.extractedEntities && result.extractedEntities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🎯 Extracted Entities</CardTitle>
            <CardDescription>
              Business entities identified from your content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {result.extractedEntities.map((entity, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <span className="font-medium">{entity.entity}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {entity.type}
                    </Badge>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {Math.round(entity.confidence * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discovered Keywords Section */}
      {result.queries && result.queries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🔍 Discovered Keywords</CardTitle>
            <CardDescription>
              SEO keywords and search terms extracted from your content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {result.queries.slice(0, 30).map((keyword, index) => (
                <Badge key={index} variant="secondary" className="text-sm">
                  {keyword}
                </Badge>
              ))}
              {result.queries.length > 30 && (
                <Badge variant="outline" className="text-sm">
                  +{result.queries.length - 30} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coverage Gaps */}
      {coverageGaps.length > 0 && (
        <CoverageGaps gaps={coverageGaps} />
      )}

      {/* Unified Optimization Recommendations Section */}
      {((recommendations && recommendations.length > 0) || (result.optimizationRecommendations && result.optimizationRecommendations.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              💡 Optimization Recommendations
            </CardTitle>
            <CardDescription>
              AI-generated, actionable insights to improve your content coverage and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                ...(recommendations || []).map((rec, i) => ({
                  type: 'string' as const,
                  value: rec,
                  key: `string-${i}`
                })),
                ...((result.optimizationRecommendations || []).map((rec, i) => ({
                  type: 'structured' as const,
                  value: rec,
                  key: `structured-${i}`
                })) || [])
              ].map((item, index) => {
                // Unified rendering for both types
                const isStructured = item.type === 'structured';
                const badge = isStructured ? item.value.category : 'General';
                const recommendation = isStructured ? item.value.recommendation : item.value;
                const why = isStructured ? item.value.why : undefined;
                const impact = isStructured ? item.value.impact : undefined;
                const priority = isStructured ? item.value.priority : undefined;
                return (
                  <div key={item.key} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500 flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                        {index + 1}
                      </span>
                      <Badge variant="outline">{badge}</Badge>
                    </div>
                    <h4 className="font-medium mb-1">{recommendation}</h4>
                    {why && <p className="text-xs text-blue-700 dark:text-blue-300 mb-1">Why: {why}</p>}
                    {impact && <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{impact}</p>}
                    {priority && (
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge 
                          variant={
                            priority === 'high' ? 'destructive' : 
                            priority === 'medium' ? 'default' : 'secondary'
                          }
                          className="text-xs"
                        >
                          {priority} priority
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })}
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="h-5 w-5 mr-2 text-blue-600" />
              Query Fan-Out Analysis
            </CardTitle>
            <CardDescription>
              Questions potential customers might ask when researching your services
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  {/* Chunk-level similarity info */}
                  {typeof query.bestChunkIndex === 'number' && query.bestChunkIndex >= 0 && (
                    <div className="text-gray-400 mt-1 flex items-center gap-2 text-xs">
                      <span>Chunk #{query.bestChunkIndex + 1}</span>
                      {typeof query.similarity === 'number' && (
                        <span>Similarity: {Math.round(query.similarity * 100)}%</span>
                      )}
                      {query.context && (
                        <span className="italic truncate max-w-xs">{query.context.slice(0, 60)}...</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Query Fan-Out Analysis */}
      {result.queryFanOut && result.queryFanOut.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🔍 Query Fan-Out Analysis</CardTitle>
            <CardDescription>
              Questions potential customers might ask and how well your content covers them
            </CardDescription>
            <div className="text-right">
              <Badge className="text-lg px-3 py-1">
                {result.coverageScore}% Coverage
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.queryFanOut.map((query, index) => (
                <div key={index} className="border rounded p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-sm">{query.question}</p>
                    <Badge 
                      variant={
                        query.coverage === 'Yes' ? 'default' : 
                        query.coverage === 'Partial' ? 'secondary' : 'destructive'
                      }
                      className="ml-2"
                    >
                      {query.coverage}
                    </Badge>
                  </div>
                  {query.coverageDetails && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {query.coverageDetails}
                    </p>
                  )}
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="outline" className="text-xs">{query.category}</Badge>
                    <Badge variant="outline" className="text-xs">{query.priority}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Usage Stats */}
      {result.apiUsage && (
        <Card className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-gray-600" />
              API Usage & Cost Analysis
            </CardTitle>
            <CardDescription>
              Estimated API usage and costs for this analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {result.apiUsage.openaiTokens.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  OpenAI Tokens
                </div>
              </div>
              
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {result.apiUsage.serpapiRequests}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  SerpAPI Requests
                </div>
              </div>
              
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  ${result.apiUsage.estimatedCost}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Estimated Cost
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                💡 <strong>Cost Breakdown:</strong> OpenAI GPT-4o-mini tokens (~${(result.apiUsage.openaiTokens * 0.00015 / 1000).toFixed(4)}) + 
                SerpAPI search requests (~${(result.apiUsage.serpapiRequests * 0.01).toFixed(2)})
              </p>
            </div>
          </CardContent>
        </Card>
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
            
            <Button 
              variant="outline" 
              className="flex items-center"
              onClick={() => handleExport('markdown')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 