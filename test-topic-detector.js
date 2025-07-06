// Simple test for topic detector logic
console.log("🧪 Testing Topic Detector Logic...\n");

// Test the entity classification logic
function classifyEntityType(entity) {
  const lowerEntity = entity.toLowerCase();
  
  // Check for location patterns
  if (lowerEntity.includes('university') || lowerEntity.includes('college') || 
      lowerEntity.includes('school') || lowerEntity.includes('institute')) {
    return 'Organization';
  }
  
  // Check for product patterns
  if (lowerEntity.includes('course') || lowerEntity.includes('program') || 
      lowerEntity.includes('training') || lowerEntity.includes('workshop') ||
      lowerEntity.includes('software') || lowerEntity.includes('platform')) {
    return 'Product';
  }
  
  // Check for location patterns
  if (lowerEntity.includes('new york') || lowerEntity.includes('california') ||
      lowerEntity.includes('london') || lowerEntity.includes('paris') ||
      /^[A-Z][a-z]+$/.test(entity)) { // Single capitalized word might be location
    return 'Location';
  }
  
  // Check for person patterns (single name or "Dr.", "Mr.", etc.)
  if (/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s/.test(entity) || 
      /^[A-Z][a-z]+\s[A-Z][a-z]+$/.test(entity)) {
    return 'Person';
  }
  
  // Check for event patterns
  if (lowerEntity.includes('conference') || lowerEntity.includes('summit') ||
      lowerEntity.includes('meetup') || lowerEntity.includes('workshop')) {
    return 'Event';
  }
  
  // Default to concept
  return 'Concept';
}

// Test cases
const testEntities = [
  "Advanced React Development Course",
  "Digital Marketing Services for SaaS Companies", 
  "SEO Services in New York",
  "Dr. John Smith",
  "Harvard University",
  "Tech Conference 2024",
  "React Development"
];

console.log("Testing Entity Classification:");
testEntities.forEach(entity => {
  const type = classifyEntityType(entity);
  console.log(`  "${entity}" → ${type}`);
});

console.log("\n✅ Entity classification test completed!");

// Test URL extraction logic
function extractFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
    const entities = [];
    
    pathSegments.forEach(segment => {
      // Convert kebab-case or snake_case to words
      const words = segment.replace(/[-_]/g, ' ').split(' ');
      const capitalizedWords = words.map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      );
      
      // Filter out common technical terms
      const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
      const filteredWords = capitalizedWords.filter(word => 
        word.length > 2 && 
        !stopWords.has(word.toLowerCase()) &&
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

console.log("\nTesting URL Extraction:");
const testUrls = [
  "https://example.com/courses/advanced-react-development",
  "https://example.com/services/saas-marketing",
  "https://example.com/seo-services/new-york"
];

testUrls.forEach(url => {
  const entities = extractFromUrl(url);
  console.log(`  ${url} → [${entities.join(', ')}]`);
});

console.log("\n✅ URL extraction test completed!"); 