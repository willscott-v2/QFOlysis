'use client';

import React from 'react';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress?: number;
  duration?: number;
}

interface ProgressStatusBarProps {
  steps: ProgressStep[];
  currentStep: string;
  overallProgress: number;
  isVisible: boolean;
  estimatedTimeRemaining?: number;
}

export function ProgressStatusBar({
  steps,
  currentStep,
  overallProgress,
  isVisible,
  estimatedTimeRemaining
}: ProgressStatusBarProps) {
  if (!isVisible) return null;

  const currentStepData = steps.find(step => step.id === currentStep);
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const completedSteps = steps.filter(step => step.status === 'completed').length;

  return (
    <div className="fixed top-16 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="w-full px-4 py-3 overflow-hidden">
        <div className="max-w-full min-w-0">
          {/* Current Step Status */}
          <div className="flex items-center justify-between mb-3 min-w-0">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="flex items-center space-x-2 min-w-0">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 flex-shrink-0" />
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                  {currentStepData?.title || 'Processing...'}
                </span>
              </div>
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                Step {currentStepIndex + 1} of {steps.length}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
              {estimatedTimeRemaining && (
                <span className="hidden sm:block">~{Math.ceil(estimatedTimeRemaining / 1000)}s remaining</span>
              )}
              <span>{completedSteps}/{steps.length} completed</span>
            </div>
          </div>

          {/* Current Step Description */}
          {currentStepData?.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              {currentStepData.description}
            </p>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Overall Progress
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {Math.round(overallProgress)}%
              </span>
            </div>
            <Progress value={overallProgress} className="h-2 w-full" />
          </div>

          {/* Step Timeline - Made scrollable on small screens */}
          <div className="mt-4">
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center space-x-2 min-w-0 flex-shrink-0">
                  <div className="flex items-center space-x-1 min-w-0">
                    {step.status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : step.status === 'active' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500 flex-shrink-0" />
                    ) : step.status === 'error' ? (
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
                    )}
                    <span className={`text-xs font-medium whitespace-nowrap ${
                      step.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                      step.status === 'active' ? 'text-blue-600 dark:text-blue-400' :
                      step.status === 'error' ? 'text-red-600 dark:text-red-400' :
                      'text-gray-500 dark:text-gray-400'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`h-px w-6 flex-shrink-0 ${
                      step.status === 'completed' ? 'bg-green-300' : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 