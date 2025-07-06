import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/app/lib/utils';
import { DarkModeToggle } from './components/DarkModeToggle';

export const metadata: Metadata = {
  title: 'QFOlysis AI Readiness Assistant',
  description: 'Analyze your content\'s readiness for AI-powered search with advanced entity extraction and semantic coverage analysis.',
  keywords: ['AI readiness', 'content analysis', 'entity extraction', 'semantic search', 'Google AI Overviews', 'content optimization'],
  authors: [{ name: 'QFOlysis' }],
  creator: 'QFOlysis',
  publisher: 'QFOlysis',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://qfolysis.vercel.app',
    title: 'QFOlysis AI Readiness Assistant',
    description: 'Analyze your content\'s readiness for AI-powered search with advanced entity extraction and semantic coverage analysis.',
    siteName: 'QFOlysis',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'QFOlysis AI Readiness Assistant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QFOlysis AI Readiness Assistant',
    description: 'Analyze your content\'s readiness for AI-powered search with advanced entity extraction and semantic coverage analysis.',
    images: ['/og-image.png'],
    creator: '@qfolysis',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased"
      )}>
        <div className="relative flex min-h-screen flex-col">
          {/* Header */}
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-sm">
                  QFO
                </div>
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  <span className="text-blue-600">QFO</span>lysis AI Readiness Assistant
                </span>
              </div>
              
              <div className="flex flex-1 items-center justify-end space-x-4">
                <DarkModeToggle />
                <nav className="flex items-center space-x-1">
                  <a
                    href="https://github.com/your-repo/ai-coverage-tool"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                  >
                    GitHub
                  </a>
                  <a
                    href="/docs"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                  >
                    Docs
                  </a>
                </nav>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t py-6 md:py-0">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
              <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
                <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                  Built with Next.js, OpenAI, and modern web technologies.
                </p>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <a
                  href="/privacy"
                  className="hover:text-foreground transition-colors"
                >
                  Privacy
                </a>
                <a
                  href="/terms"
                  className="hover:text-foreground transition-colors"
                >
                  Terms
                </a>
                <a
                  href="mailto:support@ai-coverage-tool.com"
                  className="hover:text-foreground transition-colors"
                >
                  Support
                </a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
} 