'use client';

import React, { useState, useCallback, useEffect } from 'react';

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  estimatedDuration: number;
}

const ANALYSIS_STEPS: ProgressStep[] = [
  {
    id: 'initializing',
    title: 'Initializing',
    description: 'Setting up analysis parameters and validating inputs',
    status: 'pending',
    estimatedDuration: 2000,
  },
  {
    id: 'scraping',
    title: 'Extracting Content',
    description: 'Scraping and analyzing your target page content',
    status: 'pending',
    estimatedDuration: 8000,
  },
  {
    id: 'keywords',
    title: 'Generating Keywords',
    description: 'Using AI to identify relevant search terms and entities',
    status: 'pending',
    estimatedDuration: 6000,
  },
  {
    id: 'competitors',
    title: 'Finding Competitors',
    description: 'Discovering top-ranking competitors for your keywords',
    status: 'pending',
    estimatedDuration: 10000,
  },
  {
    id: 'competitor-scraping',
    title: 'Analyzing Competitors',
    description: 'Extracting content from competitor websites',
    status: 'pending',
    estimatedDuration: 12000,
  },
  {
    id: 'ai-analysis',
    title: 'AI Content Analysis',
    description: 'Comparing semantic similarity and calculating scores',
    status: 'pending',
    estimatedDuration: 15000,
  },
  {
    id: 'recommendations',
    title: 'Generating Insights',
    description: 'Creating recommendations and gap analysis',
    status: 'pending',
    estimatedDuration: 5000,
  },
  {
    id: 'finalizing',
    title: 'Finalizing Results',
    description: 'Preparing your comprehensive analysis report',
    status: 'pending',
    estimatedDuration: 3000,
  },
];

export function useAnalysisProgress() {
  const [steps, setSteps] = useState<ProgressStep[]>(ANALYSIS_STEPS);
  const [currentStep, setCurrentStep] = useState<string>('initializing');
  const [overallProgress, setOverallProgress] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const startAnalysis = useCallback(() => {
    setSteps(ANALYSIS_STEPS.map(step => ({ ...step, status: 'pending' as const })));
    setCurrentStep('initializing');
    setOverallProgress(0);
    setStartTime(Date.now());
    setIsVisible(true);
  }, []);

  const updateStep = useCallback((stepId: string, status: 'active' | 'completed' | 'error', description?: string) => {
    setSteps(prevSteps => 
      prevSteps.map(step => 
        step.id === stepId 
          ? { ...step, status, description: description || step.description }
          : step
      )
    );
    
    if (status === 'active') {
      setCurrentStep(stepId);
    }
  }, []);

  const calculateProgress = useCallback(() => {
    const totalSteps = steps.length;
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    const activeStep = steps.find(step => step.status === 'active');
    
    let progress = (completedSteps / totalSteps) * 100;
    
    // Add partial progress for active step
    if (activeStep && startTime) {
      const elapsed = Date.now() - startTime;
      const stepProgress = Math.min(elapsed / activeStep.estimatedDuration, 1);
      progress += (stepProgress / totalSteps) * 100;
    }
    
    setOverallProgress(Math.min(progress, 100));
  }, [steps, startTime]);

  const getEstimatedTimeRemaining = useCallback(() => {
    if (!startTime) return null;
    
    const elapsed = Date.now() - startTime;
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    const totalSteps = steps.length;
    
    if (completedSteps === 0) {
      // Estimate based on first step
      const firstStep = steps[0];
      return Math.max(0, firstStep.estimatedDuration - elapsed);
    }
    
    // Calculate average time per step and estimate remaining
    const avgTimePerStep = elapsed / completedSteps;
    const remainingSteps = totalSteps - completedSteps;
    const estimatedRemaining = avgTimePerStep * remainingSteps;
    
    return Math.max(0, estimatedRemaining);
  }, [steps, startTime]);

  const completeAnalysis = useCallback(() => {
    setSteps(prevSteps => 
      prevSteps.map(step => ({ ...step, status: 'completed' as const }))
    );
    setOverallProgress(100);
    setCurrentStep('finalizing');
    
    // Hide progress bar after a delay
    setTimeout(() => {
      setIsVisible(false);
    }, 2000);
  }, []);

  const resetProgress = useCallback(() => {
    setSteps(ANALYSIS_STEPS);
    setCurrentStep('initializing');
    setOverallProgress(0);
    setStartTime(null);
    setIsVisible(false);
  }, []);

  // Update progress calculation when steps change
  useEffect(() => {
    if (isVisible) {
      calculateProgress();
    }
  }, [steps, isVisible, calculateProgress]);

  return {
    steps,
    currentStep,
    overallProgress,
    isVisible,
    estimatedTimeRemaining: getEstimatedTimeRemaining(),
    startAnalysis,
    updateStep,
    completeAnalysis,
    resetProgress,
  };
} 