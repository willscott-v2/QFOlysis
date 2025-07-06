# QFOlysis Setup Guide

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# OpenAI API Key (Required for embeddings and semantic analysis)
# Get your key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-api-key-here

# Firecrawl API Key (Required for content scraping)
# Get your key from: https://firecrawl.dev/
FIRECRAWL_API_KEY=fc-your-firecrawl-api-key-here

# Google Gemini API Key (Optional - for keyword extraction)
# Get your key from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your-gemini-api-key-here

# SerpAPI Key (Optional - for competitor discovery)
# Get your key from: https://serpapi.com/
SERPAPI_KEY=your-serpapi-key-here

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Required API Keys

### 1. OpenAI API Key (Required)
- **Purpose**: Generate embeddings for semantic similarity analysis
- **Get it**: https://platform.openai.com/api-keys
- **Cost**: ~$0.0001 per 1K tokens for embeddings

### 2. Firecrawl API Key (Required)
- **Purpose**: Extract content from web pages
- **Get it**: https://firecrawl.dev/
- **Cost**: Free tier available, then pay-per-use

### 3. Google Gemini API Key (Optional)
- **Purpose**: Extract keywords and entities from content
- **Get it**: https://makersuite.google.com/app/apikey
- **Cost**: Free tier available

### 4. SerpAPI Key (Optional)
- **Purpose**: Discover competitor URLs automatically
- **Get it**: https://serpapi.com/
- **Cost**: Free tier available, then pay-per-search

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file with your API keys

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Features

- ✅ **Content Scraping**: Extract content from target and competitor URLs
- ✅ **AI Analysis**: Use OpenAI embeddings for semantic similarity
- ✅ **Gemini Integration**: Extract entities/keywords from content
- ✅ **SerpAPI Integration**: Discover competitors automatically
- ✅ **Progress Tracking**: Real-time progress updates during analysis
- ✅ **Dark Mode**: UI toggle support
- ✅ **Export Functionality**: CSV and JSON export of results
- ✅ **Responsive Design**: Works on desktop and mobile

## Usage

1. Enter your target URL
2. Optionally add competitor URLs (or let AI discover them)
3. Optionally add custom search queries (or let AI generate them)
4. Click "Start Analysis"
5. View results and export data

## Architecture

```
app/
├── api/                    # API routes
│   ├── analyze/route.ts    # Main analysis endpoint
│   ├── scrape/route.ts     # Content scraping endpoint
│   └── export/route.ts     # Data export endpoint
├── components/             # React components
│   ├── AnalysisForm.tsx    # Main input form
│   ├── ResultsDisplay.tsx  # Results viewer
│   ├── RadarChart.tsx      # Visualization
│   └── LoadingState.tsx    # Progress indicator
├── lib/                    # Core logic
│   ├── analyzer.ts         # AI analysis functions
│   ├── scraper.ts          # Web scraping utilities
│   ├── gemini.ts           # Gemini API integration
│   ├── serpapi.ts          # SerpAPI integration
│   ├── types.ts            # TypeScript definitions
│   └── store.ts            # State management
└── page.tsx                # Main page
```

## Troubleshooting

### Common Issues

1. **"Cannot find module 'next/server'"**
   - Make sure you're using Next.js 14+
   - Run `npm install` to ensure all dependencies are installed

2. **API Key Errors**
   - Verify your API keys are correct in `.env.local`
   - Check that the environment variables are being loaded

3. **Scraping Failures**
   - Some websites block automated scraping
   - Try different URLs or check if the site is accessible

4. **Rate Limiting**
   - The app includes rate limiting and retry logic
   - If you hit limits, wait a few minutes and try again

### Development

- **TypeScript**: The project uses strict TypeScript
- **Linting**: Run `npm run lint` to check for issues
- **Building**: Run `npm run build` to create production build

## Deployment

The app is ready for deployment on:
- **Vercel**: Recommended for Next.js apps
- **Netlify**: Works well with static exports
- **Railway**: Good for full-stack deployment

Make sure to set environment variables in your deployment platform. 