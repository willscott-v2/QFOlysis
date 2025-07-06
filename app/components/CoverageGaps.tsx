'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  AlertTriangle, 
  Lightbulb, 
  ArrowRight,
  Target,
  TrendingUp
} from 'lucide-react';
import { type CoverageGap } from '@/app/lib/types';

interface CoverageGapsProps {
  gaps: CoverageGap[];
}

export function CoverageGaps({ gaps }: CoverageGapsProps) {
  if (!gaps || gaps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-green-600">
            <Target className="h-5 w-5 mr-2" />
            Excellent Coverage!
          </CardTitle>
          <CardDescription>
            No significant content gaps detected. Your content performs well across all analyzed categories.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const priorityOrder = { high: 3, medium: 2, low: 1 };
  const sortedGaps = [...gaps].sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          🎯 Content Coverage Gaps
        </CardTitle>
        <CardDescription>
          Areas where competitors outperform your content. Address these gaps to improve your competitive position.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {sortedGaps.map((gap, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getPriorityColor(gap.priority)}`}
            >
              {/* Gap Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  {getPriorityIcon(gap.priority)}
                  <h3 className="font-medium ml-2">{gap.category}</h3>
                </div>
                
                <Badge 
                  variant="secondary" 
                  className={`capitalize ${
                    gap.priority === 'high' ? 'bg-red-200 text-red-800' :
                    gap.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-blue-200 text-blue-800'
                  }`}
                >
                  {gap.priority} priority
                </Badge>
              </div>

              {/* Recommendation */}
              <div className="mb-3">
                <p className="text-sm mb-2 font-medium">Recommendation:</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {gap.recommendation}
                </p>
              </div>

              {/* Missing Queries */}
              {gap.missingQueries.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium mb-2">
                    Suggested topics to cover:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {gap.missingQueries.slice(0, 5).map((query, queryIndex) => (
                      <Badge
                        key={queryIndex}
                        variant="outline"
                        className="text-xs"
                      >
                        {query}
                      </Badge>
                    ))}
                    {gap.missingQueries.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{gap.missingQueries.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Competitor Examples */}
              {gap.competitorUrls.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium mb-2">
                    Learn from these competitors:
                  </p>
                  <div className="space-y-1">
                    {gap.competitorUrls.slice(0, 3).map((url, urlIndex) => (
                      <div key={urlIndex} className="flex items-center text-xs">
                        <ArrowRight className="h-3 w-3 mr-1 text-gray-400" />
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline truncate"
                        >
                          {new URL(url).hostname}
                        </a>
                      </div>
                    ))}
                    {gap.competitorUrls.length > 3 && (
                      <div className="text-xs text-gray-500 ml-4">
                        +{gap.competitorUrls.length - 3} more competitors
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="flex justify-end pt-2 border-t border-current border-opacity-20">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    // Could implement content planning feature
                    console.log(`Plan content for ${gap.category}`);
                  }}
                >
                  Plan Content
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            🚀 Quick Wins
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            Focus on {gaps.filter(g => g.priority === 'high').length > 0 ? 'high-priority' : 'top'} gaps first. 
            These represent the biggest opportunities to improve your competitive position.
          </p>
          
          <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
            <Lightbulb className="h-4 w-4 mr-1" />
            Tip: Start with categories where you have existing content that can be expanded or improved.
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 