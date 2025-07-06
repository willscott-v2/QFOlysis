'use client';

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { type AnalyzeRequest } from '../lib/types';
import { Globe, Plus, Zap, Target, Users, Search } from 'lucide-react';

interface AnalysisFormProps {
  onSubmit: (data: AnalyzeRequest) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
}

export function AnalysisForm({ onSubmit, isLoading, disabled }: AnalysisFormProps) {
  const [targetUrl, setTargetUrl] = useState('');
  const [competitorUrls, setCompetitorUrls] = useState<string[]>(['']);
  const [customQueries, setCustomQueries] = useState('');
  const [options, setOptions] = useState({
    includeTopResults: true,
    resultCount: 5,
    generateQueries: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!targetUrl.trim()) {
      alert('Please enter a target URL');
      return;
    }

    const queries = customQueries
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0)
      .slice(0, 50);

    const competitorUrlsFiltered = competitorUrls
      .map(url => url.trim())
      .filter(url => url.length > 0)
      .slice(0, 5);

    const data: AnalyzeRequest = {
      targetUrl: targetUrl.trim(),
      competitorUrls: competitorUrlsFiltered,
      queries,
      options,
    };

    await onSubmit(data);
  };

  const addCompetitorUrl = () => {
    if (competitorUrls.length < 5) {
      setCompetitorUrls([...competitorUrls, '']);
    }
  };

  const removeCompetitorUrl = (index: number) => {
    if (competitorUrls.length > 1) {
      setCompetitorUrls(competitorUrls.filter((_, i) => i !== index));
    }
  };

  const updateCompetitorUrl = (index: number, value: string) => {
    const newUrls = [...competitorUrls];
    newUrls[index] = value;
    setCompetitorUrls(newUrls);
  };

  const clearForm = () => {
    setTargetUrl('');
    setCompetitorUrls(['']);
    setCustomQueries('');
    setOptions({
      includeTopResults: true,
      resultCount: 5,
      generateQueries: true,
    });
  };

  const queryCount = customQueries.split('\n').filter(q => q.trim().length > 0).length;

  const buttonEnabled = !!targetUrl.trim() && !isLoading && !disabled;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Zap className="h-6 w-6 text-blue-600" />
          <CardTitle className="text-2xl">AI Content Coverage Analysis</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Analyze your content against competitors using AI-powered semantic search. 
          Compare coverage across different topic categories and discover content gaps.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Target URL */}
          <div className="space-y-2">
            <Label htmlFor="targetUrl" className="text-sm font-medium flex items-center">
              <Globe className="h-4 w-4 mr-1" />
              Target URL *
            </Label>
            <Input
              type="url"
              id="targetUrl"
              placeholder="https://example.com/your-content"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              required
              disabled={disabled}
            />
          </div>

          {/* Competitor URLs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Competitor URLs (Optional)</Label>
              <Badge variant="secondary" className="text-xs">
                {competitorUrls.filter(url => url.trim().length > 0).length}/5
              </Badge>
            </div>
            <div className="space-y-2">
              {competitorUrls.map((url, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    type="url"
                    placeholder="https://competitor1.com"
                    value={url}
                    onChange={(e) => updateCompetitorUrl(index, e.target.value)}
                    disabled={disabled}
                  />
                  {competitorUrls.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeCompetitorUrl(index)}
                      disabled={disabled}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={addCompetitorUrl}
                disabled={competitorUrls.length >= 5 || disabled}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Competitor URL
              </Button>
            </div>
          </div>

          {/* Custom Queries */}
          <div className="space-y-2">
            <Label htmlFor="customQueries" className="text-sm font-medium">
              Custom Search Queries (Optional)
            </Label>
            <Textarea
              id="customQueries"
              placeholder="Enter one query per line, e.g.:&#10;content marketing strategies&#10;SEO best practices&#10;digital marketing trends"
              value={customQueries}
              onChange={(e) => setCustomQueries(e.target.value)}
              className="min-h-[100px]"
              disabled={disabled}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>One query per line</span>
              <span>{queryCount}/50 queries</span>
            </div>
          </div>

          {/* Analysis Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Analysis Options</Label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={options.generateQueries}
                  onChange={(e) => setOptions({ ...options, generateQueries: e.target.checked })}
                  disabled={disabled}
                />
                <span className="text-sm">Auto-generate additional queries using AI</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={options.includeTopResults}
                  onChange={(e) => setOptions({ ...options, includeTopResults: e.target.checked })}
                  disabled={disabled}
                />
                <span className="text-sm">Include detailed query matching results</span>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={clearForm}
              disabled={disabled}
            >
              Clear Form
            </Button>
            <Button
              type="submit"
              disabled={!buttonEnabled}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Analyzing...
                </>
              ) : (
                'Start Analysis'
              )}
            </Button>
          </div>
        </form>

        {/* Debug Panel */}
        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-900/20 rounded-lg text-xs text-gray-700 dark:text-gray-200">
          <div className="font-bold mb-1">Debug Info</div>
          <div>targetUrl: <span className="font-mono">{JSON.stringify(targetUrl)}</span></div>
          <div>isLoading: <span className="font-mono">{JSON.stringify(isLoading)}</span></div>
          <div>disabled: <span className="font-mono">{JSON.stringify(disabled)}</span></div>
          <div>buttonEnabled: <span className="font-mono">{JSON.stringify(buttonEnabled)}</span></div>
          {!buttonEnabled && (
            <div className="mt-2 text-red-600 dark:text-red-400 font-semibold">
              { !targetUrl.trim() && 'Target URL is required. '}
              { isLoading && 'Form is currently loading. '}
              { disabled && 'Form is disabled. '}
            </div>
          )}
        </div>

        {/* How it works info */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            💡 How it works:
          </h4>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
            <li>• We analyze your target URL content using AI embeddings</li>
            <li>• Compare against competitor URLs to identify content gaps</li>
            <li>• Generate semantic similarity scores across topic categories</li>
            <li>• Provide actionable recommendations for content improvement</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
