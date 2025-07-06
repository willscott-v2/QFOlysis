'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Loader2, Globe, Brain, BarChart3 } from 'lucide-react';

export function LoadingState() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simple progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return Math.min(prev + Math.random() * 2, 95);
      });
    }, 300);

    return () => {
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-blue-100 dark:border-blue-900 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20">
                <Brain className="h-8 w-8 text-blue-600 animate-pulse" />
              </div>
              <div className="absolute -inset-1 rounded-full border-2 border-blue-200 dark:border-blue-800 animate-spin opacity-30" />
            </div>
          </div>
          
          <CardTitle className="text-xl">
            AI Analysis in Progress
          </CardTitle>
          <CardDescription>
            Our AI is performing deep semantic analysis of your content
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Tips */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 text-sm">
              💡 While you wait...
            </h4>
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Our AI is performing deep semantic analysis of your content. This typically takes 20-45 seconds 
              depending on the number of competitors and content length. Check the progress bar above for detailed status.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 