import { type EmbeddingCache } from './types';

// ============================================================================
// Cache Configuration
// ============================================================================

const CACHE_TTL = 86400; // 24 hours in seconds
const MAX_MEMORY_CACHE_SIZE = 1000; // Maximum items in memory cache

// In-memory cache as fallback
const memoryCache = new Map<string, { data: any; expires: number }>();

// ============================================================================
// Redis Client (Optional)
// ============================================================================

let redisClient: any = null;

// Initialize Redis client if environment variables are available
async function initRedisClient(): Promise<any> {
  // Temporarily disable Redis for faster development
  console.log('Redis disabled for development, using in-memory cache');
  return null;
  
  // TODO: Re-enable Redis for production
  /*
  if (redisClient) return redisClient;
  
  const redisUrl = process.env.UPSTASH_REDIS_URL;
  const redisToken = process.env.UPSTASH_REDIS_TOKEN;
  
  if (!redisUrl || !redisToken) {
    console.log('Redis credentials not found, using in-memory cache');
    return null;
  }

  try {
    const { Redis } = require('@upstash/redis');
    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    
    await redisClient.ping();
    console.log('Redis client initialized successfully');
    return redisClient;
  } catch (error) {
    console.warn('Failed to initialize Redis client:', error);
    redisClient = null;
    return null;
  }
  */
}

// ============================================================================
// Generic Cache Functions
// ============================================================================

/**
 * Generate a cache key from text content
 */
function generateCacheKey(text: string, prefix: string = 'cache'): string {
  // Simple hash function for cache keys
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `${prefix}:${Math.abs(hash).toString(36)}`;
}

/**
 * Set a value in cache (Redis or memory fallback)
 */
export async function setCache(key: string, value: any, ttl: number = CACHE_TTL): Promise<void> {
  try {
    const redis = await initRedisClient();
    
    if (redis) {
      // Use Redis
      await redis.setex(key, ttl, JSON.stringify(value));
    } else {
      // Use memory cache
      const expires = Date.now() + (ttl * 1000);
      memoryCache.set(key, { data: value, expires });
      
      // Clean up old entries if cache is too large
      if (memoryCache.size > MAX_MEMORY_CACHE_SIZE) {
        cleanupMemoryCache();
      }
    }
  } catch (error) {
    console.error('Cache set error:', error);
    // Fail silently - caching is not critical
  }
}

/**
 * Get a value from cache (Redis or memory fallback)
 */
export async function getCache(key: string): Promise<any | null> {
  try {
    const redis = await initRedisClient();
    
    if (redis) {
      // Use Redis
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } else {
      // Use memory cache
      const cached = memoryCache.get(key);
      if (cached) {
        if (Date.now() < cached.expires) {
          return cached.data;
        } else {
          memoryCache.delete(key);
        }
      }
      return null;
    }
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Delete a value from cache
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    const redis = await initRedisClient();
    
    if (redis) {
      await redis.del(key);
    } else {
      memoryCache.delete(key);
    }
  } catch (error) {
    console.error('Cache delete error:', error);
    // Fail silently
  }
}

/**
 * Clear all cache entries
 */
export async function clearCache(): Promise<void> {
  try {
    const redis = await initRedisClient();
    
    if (redis) {
      await redis.flushall();
    } else {
      memoryCache.clear();
    }
  } catch (error) {
    console.error('Cache clear error:', error);
    // Fail silently
  }
}

// ============================================================================
// Embedding-Specific Cache Functions
// ============================================================================

/**
 * Cache an embedding for a given text
 */
export async function setCachedEmbedding(
  text: string, 
  embedding: number[], 
  model: string = 'text-embedding-3-small'
): Promise<void> {
  const cacheData: EmbeddingCache = {
    text,
    embedding,
    model,
    createdAt: new Date().toISOString(),
  };
  
  const cacheKey = generateCacheKey(text, `embedding:${model}`);
  await setCache(cacheKey, cacheData);
}

/**
 * Get a cached embedding for a given text
 */
export async function getCachedEmbedding(
  text: string, 
  model: string = 'text-embedding-3-small'
): Promise<number[] | null> {
  const cacheKey = generateCacheKey(text, `embedding:${model}`);
  const cached = await getCache(cacheKey);
  
  if (cached && cached.embedding) {
    return cached.embedding;
  }
  
  return null;
}

/**
 * Cache scraped content
 */
export async function setCachedContent(url: string, content: any): Promise<void> {
  const cacheKey = generateCacheKey(url, 'content');
  await setCache(cacheKey, content, CACHE_TTL);
}

/**
 * Get cached scraped content
 */
export async function getCachedContent(url: string): Promise<any | null> {
  const cacheKey = generateCacheKey(url, 'content');
  return await getCache(cacheKey);
}

/**
 * Cache analysis results
 */
export async function setCachedAnalysis(
  targetUrl: string, 
  competitorUrls: string[], 
  result: any
): Promise<void> {
  const cacheKey = generateCacheKey(
    `${targetUrl}:${competitorUrls.sort().join(',')}`, 
    'analysis'
  );
  await setCache(cacheKey, result, CACHE_TTL / 2); // Shorter TTL for analysis
}

/**
 * Get cached analysis results
 */
export async function getCachedAnalysis(
  targetUrl: string, 
  competitorUrls: string[]
): Promise<any | null> {
  const cacheKey = generateCacheKey(
    `${targetUrl}:${competitorUrls.sort().join(',')}`, 
    'analysis'
  );
  return await getCache(cacheKey);
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clean up expired entries from memory cache
 */
function cleanupMemoryCache(): void {
  const now = Date.now();
  const toDelete: string[] = [];
  
  for (const [key, value] of Array.from(memoryCache.entries())) {
    if (now >= value.expires) {
      toDelete.push(key);
    }
  }
  
  for (const key of toDelete) {
    memoryCache.delete(key);
  }
  
  // If still too large, remove oldest entries
  if (memoryCache.size > MAX_MEMORY_CACHE_SIZE) {
    const entries = Array.from(memoryCache.entries());
    entries.sort((a, b) => a[1].expires - b[1].expires);
    
    const toRemove = entries.slice(0, memoryCache.size - MAX_MEMORY_CACHE_SIZE);
    for (const [key] of toRemove) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  type: 'redis' | 'memory';
  size: number;
  hitRate?: number;
}> {
  try {
    const redis = await initRedisClient();
    
    if (redis) {
      try {
        const info = await redis.info('memory');
        const dbSize = await redis.dbsize();
        return {
          type: 'redis',
          size: dbSize,
        };
      } catch (error) {
        return {
          type: 'redis',
          size: 0,
        };
      }
    } else {
      // Clean up expired entries first
      cleanupMemoryCache();
      
      return {
        type: 'memory',
        size: memoryCache.size,
      };
    }
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      type: 'memory',
      size: 0,
    };
  }
}

/**
 * Periodic cleanup function for memory cache
 */
setInterval(() => {
  if (!redisClient) {
    cleanupMemoryCache();
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes 