'use client';

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileJson,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { type AnalysisResult } from '@/app/lib/types';

interface ExportButtonProps {
  analysisResult: AnalysisResult;
  onExport?: (format: 'csv' | 'json' | 'txt') => void;
}

export function ExportButton({ analysisResult, onExport }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleExport = async (format: 'csv' | 'json' | 'txt') => {
    setIsExporting(true);
    setShowDropdown(false);

    try {
      if (onExport) {
        await onExport(format);
      } else {
        // Default export implementation
        const response = await fetch('/api/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            analysisData: analysisResult,
            format,
            options: {
              includeRawData: format === 'json',
              includeMetadata: true,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Export failed');
        }

        // Get the filename from the response headers
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
          : `analysis-${Date.now()}.${format}`;

        // Create download link
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export error:', error);
      // You could show a toast notification here
    } finally {
      setIsExporting(false);
    }
  };

  const exportOptions = [
    {
      format: 'csv' as const,
      label: 'CSV',
      description: 'Spreadsheet format',
      icon: FileSpreadsheet,
      color: 'text-green-600',
    },
    {
      format: 'json' as const,
      label: 'JSON',
      description: 'Complete data',
      icon: FileJson,
      color: 'text-blue-600',
    },
    {
      format: 'txt' as const,
      label: 'Text',
      description: 'Summary report',
      icon: FileText,
      color: 'text-gray-600',
    },
  ];

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isExporting}
        className="flex items-center"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        Export
        <ChevronDown className="h-4 w-4 ml-1" />
      </Button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                Export Options
              </div>
              
              {exportOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.format}
                    onClick={() => handleExport(option.format)}
                    disabled={isExporting}
                    className="w-full flex items-center px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
                  >
                    <Icon className={`h-4 w-4 mr-3 ${option.color}`} />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {option.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Analysis ID:</span>
                <Badge variant="outline" className="text-xs font-mono">
                  {analysisResult.analysisId.slice(-8)}
                </Badge>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 