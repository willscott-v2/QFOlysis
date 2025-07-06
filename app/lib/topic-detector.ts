import fetch from 'node-fetch';
import { ExtractedEntity } from './types';

export interface PrimaryTopic {
  entity: string;
  confidence: number;
  entityType: 'Person' | 'Organization' | 'Product' | 'Location' | 'Concept' | 'Event' | 'Service';
  source: 'title' | 'meta' | 'heading' | 'url' | 'body';
  subEntities: string[];
  combinedTopic?: string;
  debug?: any;
}

export interface ContentElements {
  title: string;
  metaDescription?: string;
  headings: { level: number; text: string }[];
  url: string;
  bodyText: string;
  extractedEntities?: ExtractedEntity[];
}

export class TopicDetector {
  private readonly WEIGHTS = {
    title: 0.3,
    meta: 0.25,
    headings: 0.2,
    url: 0.07,
    body: 0.05
  };

  private readonly COURSE_PATTERNS = [
    /(\w+\s+)*Course/i,
    /(\w+\s+)*Program/i,
    /(\w+\s+)*Training/i,
    /(\w+\s+)*Workshop/i,
    /(\w+\s+)*Bootcamp/i,
    /(\w+\s+)*Certification/i,
    /(\w+\s+)*Class/i,
    /(\w+\s+)*Tutorial/i
  ];

  private readonly STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
  ]);

  async extractPrimaryTopic(content: ContentElements): Promise<PrimaryTopic & { debug?: any }> {
    const candidates = new Map<string, { score: number; sources: string[]; frequency: number, entityType: string }>();
    const debugInfo: any = { title: content.title, meta: content.metaDescription, headings: content.headings, url: content.url, bodySample: content.bodyText?.slice(0, 200), candidateEntities: [], openaiPrimary: null, openaiPrompt: null, openaiRaw: null, openaiUsed: false };

    // --- Step 1: Try OpenAI for primary topic detection ---
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        // Improved prompt: prefer main subject/concept/service over organization unless the page is about the company itself
        const prompt = `Given the following web page elements, identify the main subject or topic (service, concept, product, etc.) that best represents the page. Only return the organization if the page is about the company itself. If both a brand/organization and a salient concept/service are present, prefer the concept/service. If the title or H1 contains both a brand and a topic, prefer the non-brand segment. Return a JSON object with fields: entity, entityType (organization|product|person|concept|service|location|event), confidence (0-1), and a short reason. Do not return a URL as the entity. If you cannot determine, return {"entity": "Unknown", "entityType": "Concept", "confidence": 0.1, "reason": "Insufficient information"}.

Title: ${content.title}
Meta: ${content.metaDescription}
Headings: ${content.headings.map(h => h.text).join(' | ')}
URL: ${content.url}
Body (first 500 chars): ${content.bodyText?.slice(0, 500)}
`;
        debugInfo.openaiPrompt = prompt;
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an expert at identifying the main topic or entity of a web page for SEO and semantic analysis. Return only valid JSON.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 200,
          }),
        });
        debugInfo.openaiStatus = response.status;
        if (response.ok) {
          const data = await response.json();
          const result = data.choices[0]?.message?.content?.trim();
          debugInfo.openaiRaw = result;
          if (result) {
            try {
              const cleanResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
              const obj = JSON.parse(cleanResult);
              debugInfo.openaiPrimary = obj;
              // --- Post-processing: prefer salient concept/service over organization ---
              if (obj && obj.entity && obj.entity.length > 2 && !/^https?:\/\//i.test(obj.entity)) {
                let mainEntity = obj.entity;
                let mainType = obj.entityType || 'Concept';
                let mainConfidence = Math.max(0.1, Math.min(1, Number(obj.confidence) || 0.7));
                // If the detected entity is the organization, but a more salient concept/service is present, use that
                if (mainType === 'organization' && content.extractedEntities && Array.isArray(content.extractedEntities)) {
                  const bestConcept = (content.extractedEntities as ExtractedEntity[])
                    .filter((e: ExtractedEntity) => e.type === 'concept' || e.type === 'service')
                    .sort((a: ExtractedEntity, b: ExtractedEntity) => (b.relevance * b.confidence) - (a.relevance * a.confidence))[0];
                  if (bestConcept && bestConcept.entity && bestConcept.confidence > 0.7) {
                    mainEntity = bestConcept.entity;
                    mainType = bestConcept.type === 'service' ? 'Service' : 'Concept';
                    mainConfidence = bestConcept.confidence;
                    debugInfo.topicOverride = 'Used salient concept/service entity instead of organization';
                  }
                }
                return {
                  entity: mainEntity,
                  confidence: mainConfidence,
                  entityType: mainType,
                  source: 'title',
                  subEntities: [],
                  combinedTopic: undefined,
                  debug: debugInfo
                };
              }
            } catch (err) {
              debugInfo.openaiParseError = err instanceof Error ? err.message : String(err);
            }
          }
        } else {
          debugInfo.openaiError = `OpenAI API error: ${response.status}`;
        }
      } catch (err) {
        debugInfo.openaiError = err instanceof Error ? err.message : String(err);
      }
    } else {
      debugInfo.openaiError = 'No OpenAI API key';
    }

    // --- Ontologizer-inspired: Always include capitalized n-grams and exact phrase matches from title/meta/headings/URL ---
    const allSources: Array<{text: string, source: string}> = [];
    if (content.title && content.title.length > 2) allSources.push({text: content.title, source: 'title'});
    if (content.metaDescription && content.metaDescription.length > 2) allSources.push({text: content.metaDescription, source: 'meta'});
    if (content.headings && content.headings.length > 0) {
      content.headings.forEach(h => allSources.push({text: h.text, source: 'heading'}));
    }
    if (content.url && content.url.length > 2) allSources.push({text: content.url, source: 'url'});

    // Helper: extract capitalized n-grams (2+ consecutive capitalized words)
    function extractCapitalizedNGrams(text: string): string[] {
      const matches = text.match(/([A-Z][a-z]+(?: [A-Z][a-z]+)+)/g);
      return matches ? matches.map(s => s.trim()) : [];
    }

    // Helper: extract all n-grams (up to 5 words)
    function extractAllNGrams(text: string, maxN = 5): string[] {
      const words = text.split(/\s+/).filter(Boolean);
      const ngrams: string[] = [];
      for (let n = 2; n <= Math.min(maxN, words.length); n++) {
        for (let i = 0; i <= words.length - n; i++) {
          const gram = words.slice(i, i + n).join(' ');
          if (/^[A-Z][a-z]+/.test(words[i])) ngrams.push(gram);
        }
      }
      return ngrams;
    }

    // Helper: extract frequent noun phrases (simple version: most common 2-5 word phrases)
    function extractFrequentPhrases(text: string, maxN = 5): string[] {
      const words = text.split(/\s+/).filter(Boolean);
      const phraseCounts: Record<string, number> = {};
      for (let n = 2; n <= Math.min(maxN, words.length); n++) {
        for (let i = 0; i <= words.length - n; i++) {
          const gram = words.slice(i, i + n).join(' ');
          if (/^[A-Z][a-z]+/.test(words[i])) {
            phraseCounts[gram] = (phraseCounts[gram] || 0) + 1;
          }
        }
      }
      return Object.entries(phraseCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([phrase]) => phrase);
    }

    // --- Collect all candidate entities from all sources ---
    for (const {text, source} of allSources) {
      // Add the full text as a candidate
      if (text.length > 2) {
        if (!candidates.has(text)) candidates.set(text, {score: this.WEIGHTS[source as keyof typeof this.WEIGHTS], sources: [source], frequency: 0, entityType: ''});
      }
      // Add capitalized n-grams
      for (const gram of extractCapitalizedNGrams(text)) {
        if (!candidates.has(gram)) candidates.set(gram, {score: this.WEIGHTS[source as keyof typeof this.WEIGHTS] + 0.05, sources: [source], frequency: 0, entityType: ''});
      }
      // Add all n-grams (up to 5 words, starting with capital)
      for (const gram of extractAllNGrams(text)) {
        if (!candidates.has(gram)) candidates.set(gram, {score: this.WEIGHTS[source as keyof typeof this.WEIGHTS] + 0.02, sources: [source], frequency: 0, entityType: ''});
      }
    }

    // --- Boost Person/Organization entities in title/headings ---
    for (const [entity, data] of candidates.entries()) {
      const type = this.classifyEntityType(entity, content.url);
      data.entityType = type;
      if ((type === 'Person' || type === 'Organization') && (data.sources.includes('title') || data.sources.includes('heading'))) {
        data.score += 0.15;
      }
    }

    // --- Analyze body frequency for all candidates ---
    const bodyFrequencies = this.analyzeBodyFrequency(content.bodyText, Array.from(candidates.keys()));
    bodyFrequencies.forEach((frequency, entity) => {
      const candidate = candidates.get(entity);
      if (candidate) {
        candidate.frequency = frequency;
        candidate.score += this.WEIGHTS.body * Math.min(frequency / 10, 1); // Diminishing returns
      }
    });

    // --- If no strong candidate, extract from body as fallback ---
    let fallbackBodyEntities: string[] = [];
    if (candidates.size === 0 || Array.from(candidates.values()).every(c => c.score < 0.15)) {
      fallbackBodyEntities = [
        ...extractCapitalizedNGrams(content.bodyText),
        ...extractFrequentPhrases(content.bodyText)
      ];
      for (const gram of fallbackBodyEntities) {
        if (!candidates.has(gram)) candidates.set(gram, {score: 0.12, sources: ['body'], frequency: 0, entityType: this.classifyEntityType(gram, content.url)});
      }
    }

    // --- Prefer exact phrase matches for main topic selection ---
    let bestEntity = '';
    let bestScore = 0;
    let bestSources: string[] = [];
    let bestFrequency = 0;
    let bestType: string = '';
    for (const [entity, data] of candidates.entries()) {
      // Prefer exact phrase matches from title/meta/headings
      if ((data.sources.includes('title') || data.sources.includes('meta') || data.sources.includes('heading')) && data.score > bestScore) {
        bestEntity = entity;
        bestScore = data.score;
        bestSources = data.sources;
        bestFrequency = data.frequency;
        bestType = data.entityType;
      }
    }
    // Fallback: pick highest score
    if (!bestEntity) {
      for (const [entity, data] of candidates.entries()) {
        if (data.score > bestScore) {
          bestEntity = entity;
          bestScore = data.score;
          bestSources = data.sources;
          bestFrequency = data.frequency;
          bestType = data.entityType;
        }
      }
    }

    // --- Ensure sub-entities present in title/meta/headings/body are included ---
    const subEntities = Array.from(candidates.entries())
      .filter(([entity, data]) => entity !== bestEntity && (data.sources.includes('title') || data.sources.includes('meta') || data.sources.includes('heading') || data.sources.includes('body')) && data.score > 0.1)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 5)
      .map(([entity]) => entity);

    // --- Never use the raw URL as the main topic ---
    function isUrl(str: string) {
      return /^https?:\/\//i.test(str);
    }
    function extractDomain(url: string): string {
      try {
        return new URL(url).hostname.replace(/^www\./, '');
      } catch {
        return url;
      }
    }
    function domainToBrand(domain: string): string {
      // Remove TLD, split on dash/dot, capitalize words
      const base = domain.split('.')[0];
      return base
        .split(/[-_]/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    // If bestEntity is a URL or domain, try to extract a brand/organization name
    if (isUrl(bestEntity) || bestEntity === extractDomain(content.url)) {
      const domain = extractDomain(content.url);
      // Try to find a candidate entity that matches the domain or is contained in the domain
      let brandCandidate = '';
      for (const [entity, data] of candidates.entries()) {
        if (
          entity.toLowerCase() === domainToBrand(domain).toLowerCase() ||
          domain.toLowerCase().includes(entity.toLowerCase()) ||
          entity.toLowerCase().includes(domainToBrand(domain).toLowerCase())
        ) {
          brandCandidate = entity;
          break;
        }
      }
      if (brandCandidate) {
        bestEntity = brandCandidate;
        bestType = candidates.get(brandCandidate)?.entityType || 'Organization';
        bestSources = candidates.get(brandCandidate)?.sources || ['url'];
        bestScore = candidates.get(brandCandidate)?.score || 0.2;
      } else {
        // Use the domain as a brand name
        bestEntity = domainToBrand(domain);
        bestType = 'Organization';
        bestSources = ['url'];
        bestScore = 0.1;
      }
    }
    // If still nothing meaningful, fallback as before
    if (!bestEntity || bestEntity.length < 2) {
      const fallback = content.title && content.title.length > 2 ? content.title : (content.headings[0]?.text || content.metaDescription || fallbackBodyEntities[0] || domainToBrand(extractDomain(content.url)) || 'Untitled');
      debugInfo.fallbackUsed = true;
      debugInfo.fallbackEntity = fallback;
      debugInfo.candidates = Array.from(candidates.entries());
      return {
        entity: fallback,
        confidence: 0.1,
        entityType: 'Concept',
        source: 'title',
        subEntities: [],
        debug: debugInfo
      };
    }

    // --- Combined topic logic (if two high-salience entities present) ---
    const combinedTopic = this.detectCombinedTopics([bestEntity, ...subEntities]) || undefined;

    // --- Add debug info ---
    debugInfo.candidates = Array.from(candidates.entries());
    debugInfo.bestEntity = bestEntity;
    debugInfo.combinedTopic = combinedTopic;
    debugInfo.subEntities = subEntities;

    return {
      entity: bestEntity,
      confidence: this.calculateConfidence(bestEntity, bestSources, bestFrequency),
      entityType: bestType as PrimaryTopic['entityType'],
      source: bestSources[0] as PrimaryTopic['source'],
      subEntities,
      combinedTopic,
      debug: debugInfo
    };
  }

  private extractFromTitle(title: string, url?: string): { entities: string[]; phrases: string[] } {
    const entities: string[] = [];
    const phrases: string[] = [];

    // Always include the full title
    if (title && title.length > 2) {
      entities.push(title.trim());
    }

    // Split title on common delimiters and add each segment
    const delimiters = [':', '|', '-', '–', '—', '·', '•'];
    let segments = [title];
    delimiters.forEach(delim => {
      segments = segments.flatMap(seg => seg.split(delim));
    });
    segments = segments.map(s => s.trim()).filter(s => s.length > 2);
    segments.forEach(seg => {
      if (!entities.includes(seg)) entities.push(seg);
    });

    // Check for course/program patterns (existing logic)
    for (const pattern of this.COURSE_PATTERNS) {
      const match = title.match(pattern);
      if (match) {
        const fullMatch = match[0];
        phrases.push(fullMatch);
        const beforeCourse = title.substring(0, title.indexOf(fullMatch)).trim();
        if (beforeCourse) {
          entities.push(beforeCourse);
        }
      }
    }

    // Extract capitalized consecutive words (existing logic)
    const words = title.split(' ');
    let currentEntity: string[] = [];
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^\w]/g, '');
      if (word && word[0] === word[0].toUpperCase() && !this.STOP_WORDS.has(word.toLowerCase())) {
        currentEntity.push(word);
      } else {
        if (currentEntity.length > 0) {
          const entity = currentEntity.join(' ');
          if (entity.length > 2) {
            entities.push(entity);
          }
          currentEntity = [];
        }
      }
    }
    if (currentEntity.length > 0) {
      const entity = currentEntity.join(' ');
      if (entity.length > 2) {
        entities.push(entity);
      }
    }

    // Remove duplicates
    const uniqueEntities = [...new Set(entities)].filter(entity => entity.length > 2);
    return {
      entities: uniqueEntities,
      phrases
    };
  }

  private extractFromMeta(meta: string): string[] {
    const entities: string[] = [];
    const words = meta.split(' ');
    
    // Extract noun phrases (consecutive capitalized words)
    let currentPhrase: string[] = [];
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^\w]/g, '');
      if (word && word[0] === word[0].toUpperCase() && !this.STOP_WORDS.has(word.toLowerCase())) {
        currentPhrase.push(word);
      } else {
        if (currentPhrase.length > 0) {
          const phrase = currentPhrase.join(' ');
          if (phrase.length > 2) {
            entities.push(phrase);
          }
          currentPhrase = [];
        }
      }
    }
    
    if (currentPhrase.length > 0) {
      const phrase = currentPhrase.join(' ');
      if (phrase.length > 2) {
        entities.push(phrase);
      }
    }

    return [...new Set(entities)].filter(entity => entity.length > 2);
  }

  private extractFromHeadings(headings: { level: number; text: string }[]): string[] {
    const entities: string[] = [];
    
    headings.forEach(heading => {
      const words = heading.text.split(' ');
      let currentPhrase: string[] = [];
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i].replace(/[^\w]/g, '');
        if (word && word[0] === word[0].toUpperCase() && !this.STOP_WORDS.has(word.toLowerCase())) {
          currentPhrase.push(word);
        } else {
          if (currentPhrase.length > 0) {
            const phrase = currentPhrase.join(' ');
            if (phrase.length > 2) {
              entities.push(phrase);
            }
            currentPhrase = [];
          }
        }
      }
      
      if (currentPhrase.length > 0) {
        const phrase = currentPhrase.join(' ');
        if (phrase.length > 2) {
          entities.push(phrase);
        }
      }
    });

    return [...new Set(entities)].filter(entity => entity.length > 2);
  }

  private extractFromUrl(url: string): string[] {
    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
      const entities: string[] = [];
      
      pathSegments.forEach(segment => {
        // Convert kebab-case or snake_case to words
        const words = segment.replace(/[-_]/g, ' ').split(' ');
        const capitalizedWords = words.map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        );
        
        // Filter out common technical terms
        const filteredWords = capitalizedWords.filter(word => 
          word.length > 2 && 
          !this.STOP_WORDS.has(word.toLowerCase()) &&
          !['html', 'php', 'js', 'css', 'api', 'www'].includes(word.toLowerCase())
        );
        
        if (filteredWords.length > 0) {
          entities.push(filteredWords.join(' '));
        }
      });
      
      return entities;
    } catch {
      return [];
    }
  }

  private analyzeBodyFrequency(body: string, candidateEntities: string[]): Map<string, number> {
    const frequencies = new Map<string, number>();
    const lowerBody = body.toLowerCase();
    
    candidateEntities.forEach(entity => {
      const lowerEntity = entity.toLowerCase();
      const regex = new RegExp(`\\b${lowerEntity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      const matches = lowerBody.match(regex);
      frequencies.set(entity, matches ? matches.length : 0);
    });
    
    return frequencies;
  }

  private detectCombinedTopics(entities: string[]): string | null {
    if (entities.length < 2) return null;
    
    // Look for patterns like "X for Y" or "Y X"
    const combinedPatterns = [
      /(.+)\s+for\s+(.+)/i,
      /(.+)\s+in\s+(.+)/i,
      /(.+)\s+with\s+(.+)/i
    ];
    
    for (const entity of entities) {
      for (const pattern of combinedPatterns) {
        const match = entity.match(pattern);
        if (match) {
          return entity;
        }
      }
    }
    
    // If no clear pattern, combine top 2 entities if they're different types
    if (entities.length >= 2) {
      const entity1 = entities[0];
      const entity2 = entities[1];
      
      // Check if they're different enough to combine
      const words1 = entity1.toLowerCase().split(' ');
      const words2 = entity2.toLowerCase().split(' ');
      const overlap = words1.filter(word => words2.includes(word));
      
      if (overlap.length === 0) {
        return `${entity1} ${entity2}`;
      }
    }
    
    return null;
  }

  private classifyEntityType(entity: string, url?: string): PrimaryTopic['entityType'] {
    const lowerEntity = entity.toLowerCase();
    // Use domain for organization detection
    let domain = '';
    if (url) {
      try {
        domain = new URL(url).hostname.replace('www.', '').split('.')[0];
      } catch {}
    }
    // If entity matches domain or is a proper noun, return Organization
    if (domain && entity.toLowerCase().includes(domain)) {
      return 'Organization';
    }
    // Business/agency keywords
    const orgKeywords = ['agency', 'company', 'group', 'firm', 'influence', 'consulting', 'solutions', 'partners', 'media', 'marketing', 'seo'];
    if (orgKeywords.some(k => lowerEntity.includes(k))) {
      return 'Organization';
    }
    // Existing logic
    if (lowerEntity.includes('university') || lowerEntity.includes('college') || 
        lowerEntity.includes('school') || lowerEntity.includes('institute')) {
      return 'Organization';
    }
    if (lowerEntity.includes('course') || lowerEntity.includes('program') || 
        lowerEntity.includes('training') || lowerEntity.includes('workshop') ||
        lowerEntity.includes('software') || lowerEntity.includes('platform')) {
      return 'Product';
    }
    if (lowerEntity.includes('new york') || lowerEntity.includes('california') ||
        lowerEntity.includes('london') || lowerEntity.includes('paris') ||
        lowerEntity.includes('chicago') || lowerEntity.includes('boston')) {
      return 'Location';
    }
    if (/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s/.test(entity) || 
        /^[A-Z][a-z]+\s[A-Z][a-z]+$/.test(entity) && entity.split(' ').length === 2) {
      return 'Person';
    }
    if (lowerEntity.includes('conference') || lowerEntity.includes('summit') ||
        lowerEntity.includes('meetup') || lowerEntity.includes('workshop')) {
      return 'Event';
    }
    return 'Concept';
  }

  private calculateConfidence(entity: string, sources: string[], frequency: number): number {
    let confidence = 0;
    
    // Base confidence from sources
    sources.forEach(source => {
      switch (source) {
        case 'title':
          confidence += 0.4;
          break;
        case 'meta':
          confidence += 0.25;
          break;
        case 'heading':
          confidence += 0.2;
          break;
        case 'url':
          confidence += 0.1;
          break;
        case 'body':
          confidence += 0.05;
          break;
      }
    });
    
    // Boost confidence for frequency
    if (frequency > 0) {
      confidence += Math.min(frequency / 20, 0.2); // Max 0.2 boost from frequency
    }
    
    // Boost confidence for longer, more specific entities
    if (entity.split(' ').length > 2) {
      confidence += 0.1;
    }
    
    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }
}

export async function extractPrimaryTopicSafely(content: ContentElements): Promise<PrimaryTopic> {
  try {
    const topicDetector = new TopicDetector();
    return await topicDetector.extractPrimaryTopic(content);
  } catch (error) {
    console.warn('Primary topic detection failed, using fallback:', error);
    
    // Fallback: Use title or first heading
    const fallbackEntity = content.title.split(' ').slice(0, 3).join(' ');
    return {
      entity: fallbackEntity,
      confidence: 0.3,
      entityType: 'Concept',
      source: 'title',
      subEntities: []
    };
  }
} 