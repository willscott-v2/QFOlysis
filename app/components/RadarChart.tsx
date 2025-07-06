'use client';

import React from 'react';
import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { type RadarChartProps } from '@/app/lib/types';

interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length && label) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center text-sm">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-300">
              {entry.name}: {entry.value}/100
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function RadarChart({ 
  data, 
  width = 400, 
  height = 300, 
  showLegend = true 
}: RadarChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Content Coverage Radar</CardTitle>
          <CardDescription>No data available to display</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <p>Coverage data will appear here after analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate overall performance metrics
  const avgTargetScore = Math.round(
    data.reduce((sum, item) => sum + item.targetScore, 0) / data.length
  );
  
  const avgCompetitorScore = Math.round(
    data.reduce((sum, item) => sum + item.competitorAvg, 0) / data.length
  );

  const scoreDiff = avgTargetScore - avgCompetitorScore;
  const performanceLevel = scoreDiff > 10 ? 'Excellent' : 
                          scoreDiff > 0 ? 'Good' : 
                          scoreDiff > -10 ? 'Average' : 'Needs Improvement';

  const performanceColor = scoreDiff > 10 ? 'bg-green-100 text-green-800' :
                          scoreDiff > 0 ? 'bg-blue-100 text-blue-800' :
                          scoreDiff > -10 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              📊 Content Coverage Radar
            </CardTitle>
            <CardDescription>
              Semantic similarity scores across content categories
            </CardDescription>
          </div>
          <Badge className={performanceColor}>
            {performanceLevel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{avgTargetScore}</div>
            <div className="text-sm text-blue-700 dark:text-blue-300">Your Average Score</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{avgCompetitorScore}</div>
            <div className="text-sm text-gray-700 dark:text-gray-300">Competitor Average</div>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="w-full" style={{ height: height }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsRadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <PolarGrid gridType="polygon" />
              <PolarAngleAxis 
                dataKey="category" 
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className="text-gray-600 dark:text-gray-300"
              />
              <PolarRadiusAxis 
                domain={[0, 100]} 
                tick={{ fontSize: 9, fill: 'currentColor' }}
                tickCount={6}
                className="text-gray-400"
              />
              
              <Radar
                name="Your Content"
                dataKey="targetScore"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.1}
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              />
              
              <Radar
                name="Competitors"
                dataKey="competitorAvg"
                stroke="#6b7280"
                fill="#6b7280"
                fillOpacity={0.05}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={{ fill: '#6b7280', strokeWidth: 1, r: 3 }}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {showLegend && (
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: '20px',
                    fontSize: '12px'
                  }}
                />
              )}
            </RechartsRadarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="mt-6 space-y-2">
          <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-3">
            Category Performance
          </h4>
          
          <div className="space-y-2">
            {data.map((item, index) => {
              const diff = item.targetScore - item.competitorAvg;
              const isWinning = diff > 0;
              
              return (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.category}
                    </span>
                    {isWinning ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                        +{diff}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                        {diff}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-blue-600 font-medium">
                      {item.targetScore}
                    </span>
                    <span className="text-gray-400">vs</span>
                    <span className="text-gray-600">
                      {item.competitorAvg}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Insights */}
        <div className="mt-6 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
          <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-2">
            📈 Performance Insights
          </h4>
          
          {scoreDiff > 10 && (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Great job! Your content outperforms competitors by an average of {scoreDiff} points.
              Continue leveraging your strong categories while maintaining quality.
            </p>
          )}
          
          {scoreDiff > 0 && scoreDiff <= 10 && (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              You're performing well with a {scoreDiff}-point advantage over competitors.
              Focus on expanding coverage in weaker categories to increase your lead.
            </p>
          )}
          
          {scoreDiff <= 0 && scoreDiff >= -10 && (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              You're competing closely with rivals. Identify your strongest categories and
              double down on content quality in those areas while addressing gaps.
            </p>
          )}
          
          {scoreDiff < -10 && (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              There's significant room for improvement. Focus on the categories where
              competitors outperform you the most - these represent your biggest opportunities.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 