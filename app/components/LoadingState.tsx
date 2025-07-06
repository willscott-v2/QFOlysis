'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Loader2, Globe, Brain, BarChart3 } from 'lucide-react';

export function LoadingState() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    {
      id: 'scraping',
      title: 'Scraping Content',
      description: 'Extracting content from target and competitor URLs',
      icon: Globe,
      duration: 8000,
    },
    {
      id: 'analyzing',
      title: 'AI Analysis',
      description: 'Generating embeddings and calculating similarity scores',
      icon: Brain,
      duration: 12000,
    },
    {
      id: 'processing',
      title: 'Processing Results',
      description: 'Identifying gaps and generating recommendations',
      icon: BarChart3,
      duration: 5000,
    },
  ];

  useEffect(() => {
    let totalTime = 0;
    const stepIntervals: NodeJS.Timeout[] = [];

    steps.forEach((step, index) => {
      const stepTimeout = setTimeout(() => {
        setCurrentStep(index);
      }, totalTime);
      
      stepIntervals.push(stepTimeout);
      totalTime += step.duration;
    });

    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return Math.min(prev + Math.random() * 3, 95);
      });
    }, 200);

    return () => {
      stepIntervals.forEach(clearTimeout);
      clearInterval(progressInterval);
    };
  }, []);

  const currentStepInfo = steps[currentStep];
  const CurrentIcon = currentStepInfo?.icon || Loader2;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-blue-100 dark:border-blue-900 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20">
                <CurrentIcon className="h-8 w-8 text-blue-600 animate-pulse" />
              </div>
              <div className="absolute -inset-1 rounded-full border-2 border-blue-200 dark:border-blue-800 animate-spin opacity-30" />
            </div>
          </div>
          
          <CardTitle className="text-xl">
            {currentStepInfo?.title || 'Processing...'}
          </CardTitle>
          <CardDescription>
            {currentStepInfo?.description || 'Please wait while we analyze your content'}
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

          {/* Step Indicators */}
          <div className="space-y-3">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const isPending = index > currentStep;

              return (
                <div
                  key={step.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                      : isCompleted
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isActive 
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' 
                      : isCompleted
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-600'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <StepIcon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${
                        isActive 
                          ? 'text-blue-900 dark:text-blue-100' 
                          : isCompleted
                          ? 'text-green-900 dark:text-green-100'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {step.title}
                      </p>
                      
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          isActive 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' 
                            : isCompleted
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {isCompleted ? 'Complete' : isActive ? 'Processing' : 'Pending'}
                      </Badge>
                    </div>
                    
                    <p className={`text-xs mt-1 ${
                      isActive 
                        ? 'text-blue-700 dark:text-blue-300' 
                        : isCompleted
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tips */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 text-sm">
              💡 While you wait...
            </h4>
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Our AI is performing deep semantic analysis of your content. This typically takes 20-45 seconds 
              depending on the number of competitors and content length.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 