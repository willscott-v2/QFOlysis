'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Eye
} from 'lucide-react';
import { type CompetitorCardProps } from '@/app/lib/types';
import { extractDomain } from '@/app/lib/utils';

export function CompetitorCard({ 
  competitor, 
  targetScore, 
  onViewDetails 
}: CompetitorCardProps) {
  const {
    url,
    title,
    overallScore,
    categoryScores,
    topQueries,
  } = competitor;

  const scoreDifference = overallScore - targetScore;
  const isOutperforming = scoreDifference > 0;
  const domain = extractDomain(url);

  // Calculate performance metrics
  const performanceLevel = overallScore >= 80 ? 'Excellent' :
                          overallScore >= 60 ? 'Good' :
                          overallScore >= 40 ? 'Average' : 'Poor';

  const performanceColor = overallScore >= 80 ? 'text-green-600' :
                          overallScore >= 60 ? 'text-blue-600' :
                          overallScore >= 40 ? 'text-yellow-600' : 'text-red-600';

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2 mb-2">
              {title}
            </CardTitle>
            
            <div className="flex items-center text-sm text-gray-500 mb-3">
              <span className="truncate">{domain}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 ml-2"
                onClick={() => window.open(url, '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="text-right ml-4">
            <div className={`text-2xl font-bold ${performanceColor} mb-1`}>
              {overallScore}
            </div>
            <Badge variant="secondary" className="text-xs">
              {performanceLevel}
            </Badge>
          </div>
        </div>

        {/* Score Comparison */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-gray-600">vs Your Content</span>
          
          <div className="flex items-center">
            {Math.abs(scoreDifference) < 1 ? (
              <div className="flex items-center text-gray-500">
                <Minus className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Even</span>
              </div>
            ) : isOutperforming ? (
              <div className="flex items-center text-red-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">+{scoreDifference}</span>
              </div>
            ) : (
              <div className="flex items-center text-green-600">
                <TrendingDown className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">{scoreDifference}</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Category Scores */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Category Performance
          </h4>
          
          {categoryScores.slice(0, 4).map((category, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {category.category}
                </span>
                <span className="font-medium">
                  {category.score}/100
                </span>
              </div>
              
              <Progress 
                value={category.score} 
                className="h-2"
              />
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  {category.matchedQueries}/{category.totalQueries} matches
                </span>
                <span>
                  {Math.round((category.matchedQueries / category.totalQueries) * 100)}%
                </span>
              </div>
            </div>
          ))}
          
          {categoryScores.length > 4 && (
            <div className="text-center">
              <Badge variant="outline" className="text-xs">
                +{categoryScores.length - 4} more categories
              </Badge>
            </div>
          )}
        </div>

        {/* Top Queries */}
        {topQueries.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Top Matching Queries
            </h4>
            
            <div className="space-y-1">
              {topQueries.slice(0, 3).map((query, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded"
                >
                  <span className="truncate text-gray-700 dark:text-gray-300">
                    {query.query}
                  </span>
                  <Badge 
                    variant="secondary" 
                    className="ml-2 text-xs"
                  >
                    {Math.round(query.similarity * 100)}%
                  </Badge>
                </div>
              ))}
              
              {topQueries.length > 3 && (
                <div className="text-center pt-1">
                  <span className="text-xs text-gray-500">
                    +{topQueries.length - 3} more queries
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {onViewDetails && (
          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(url)}
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 