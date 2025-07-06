import { NextRequest, NextResponse } from 'next/server';
import { type AnalysisResult } from '../../lib/types';

interface ExportRequest {
  analysisData: AnalysisResult;
  format: 'csv' | 'json';
  options: {
    includeRawData: boolean;
    includeMetadata: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json();
    const { analysisData, format, options } = body;

    if (!analysisData) {
      return NextResponse.json(
        { error: 'Analysis data is required' },
        { status: 400 }
      );
    }

    let content: string;
    let filename: string;
    let contentType: string;

    if (format === 'csv') {
      const csvData = convertToCSV(analysisData, options);
      content = csvData;
      filename = `analysis-${analysisData.analysisId}.csv`;
      contentType = 'text/csv';
    } else if (format === 'json') {
      const jsonData = convertToJSON(analysisData, options);
      content = JSON.stringify(jsonData, null, 2);
      filename = `analysis-${analysisData.analysisId}.json`;
      contentType = 'application/json';
    } else {
      return NextResponse.json(
        { error: 'Unsupported export format' },
        { status: 400 }
      );
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}

function convertToCSV(analysisData: AnalysisResult, options: ExportRequest['options']): string {
  const headers = [
    'URL',
    'Title',
    'Overall Score',
    'Category',
    'Category Score',
    'Matched Queries',
    'Total Queries',
    'Recommendations',
  ];

  const rows: string[][] = [headers];

  // Add target data
  rows.push([
    analysisData.targetUrl,
    analysisData.targetTitle,
    analysisData.targetScore.toString(),
    'Overall',
    analysisData.targetScore.toString(),
    analysisData.queries.length.toString(),
    analysisData.queries.length.toString(),
    analysisData.recommendations.join('; '),
  ]);

  // Add category scores for target
  for (const categoryScore of analysisData.radarData) {
    rows.push([
      analysisData.targetUrl,
      analysisData.targetTitle,
      analysisData.targetScore.toString(),
      categoryScore.category,
      categoryScore.targetScore.toString(),
      '', // Matched queries - would need to calculate
      '', // Total queries - would need to calculate
      '', // Recommendations
    ]);
  }

  // Add competitor data
  for (const competitor of analysisData.competitorResults) {
    rows.push([
      competitor.url,
      competitor.title,
      competitor.overallScore.toString(),
      'Overall',
      competitor.overallScore.toString(),
      competitor.topQueries.length.toString(),
      analysisData.queries.length.toString(),
      competitor.recommendations.join('; '),
    ]);

    // Add category scores for competitor
    for (const categoryScore of competitor.categoryScores) {
      rows.push([
        competitor.url,
        competitor.title,
        competitor.overallScore.toString(),
        categoryScore.category,
        categoryScore.score.toString(),
        categoryScore.matchedQueries.toString(),
        categoryScore.totalQueries.toString(),
        '', // Recommendations
      ]);
    }
  }

  return rows.map(row => 
    row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
  ).join('\n');
}

function convertToJSON(analysisData: AnalysisResult, options: ExportRequest['options']): any {
  const exportData: any = {
    metadata: {
      analysisId: analysisData.analysisId,
      targetUrl: analysisData.targetUrl,
      timestamp: analysisData.timestamp,
      processingTime: analysisData.processingTime,
    },
    target: {
      url: analysisData.targetUrl,
      title: analysisData.targetTitle,
      overallScore: analysisData.targetScore,
      categoryScores: analysisData.radarData.map(data => ({
        category: data.category,
        score: data.targetScore,
        maxScore: data.maxScore,
      })),
    },
    competitors: analysisData.competitorResults.map(competitor => ({
      url: competitor.url,
      title: competitor.title,
      overallScore: competitor.overallScore,
      categoryScores: competitor.categoryScores,
      topQueries: competitor.topQueries,
      recommendations: competitor.recommendations,
    })),
    analysis: {
      queries: analysisData.queries,
      coverageGaps: analysisData.coverageGaps,
      recommendations: analysisData.recommendations,
      radarData: analysisData.radarData,
    },
  };

  if (options.includeRawData) {
    exportData.rawData = {
      queries: analysisData.queries,
      radarData: analysisData.radarData,
      coverageGaps: analysisData.coverageGaps,
    };
  }

  return exportData;
} 