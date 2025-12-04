/**
 * Simple fuzzy search implementation
 * @param term The search term
 * @param items Array of items to search through
 * @param keys Keys to search within each item
 * @returns Array of items that match the search term
 */
export const fuzzySearch = <T extends Record<string, any>>(
  term: string,
  items: T[],
  keys: (keyof T)[]
): T[] => {
  if (!term) return items;
  
  const normalizedTerm = term.toLowerCase().trim();
  
  return items.filter(item => {
    // Check each key for a match
    return keys.some(key => {
      const value = item[key];
      if (typeof value === 'string') {
        const normalizedValue = value.toLowerCase();
        // Exact match
        if (normalizedValue.includes(normalizedTerm)) {
          return true;
        }
        // Fuzzy match - check if all characters in term appear in order
        let termIndex = 0;
        for (let i = 0; i < normalizedValue.length; i++) {
          if (termIndex < normalizedTerm.length && normalizedValue[i] === normalizedTerm[termIndex]) {
            termIndex++;
          }
        }
        return termIndex === normalizedTerm.length;
      }
      return false;
    });
  });
};

/**
 * Enhanced fuzzy search with scoring
 * @param term The search term
 * @param items Array of items to search through
 * @param keys Keys to search within each item
 * @returns Array of items sorted by relevance score
 */
export const fuzzySearchWithScore = <T extends Record<string, any>>(
  term: string,
  items: T[],
  keys: (keyof T)[]
): T[] => {
  if (!term) return items;
  
  const normalizedTerm = term.toLowerCase().trim();
  
  const scoredItems = items.map(item => {
    let score = 0;
    
    keys.forEach(key => {
      const value = item[key];
      if (typeof value === 'string') {
        const normalizedValue = value.toLowerCase();
        
        // Exact match gets highest score
        if (normalizedValue === normalizedTerm) {
          score += 100;
        }
        // Starts with term
        else if (normalizedValue.startsWith(normalizedTerm)) {
          score += 50;
        }
        // Contains term
        else if (normalizedValue.includes(normalizedTerm)) {
          score += 25;
        }
        // Fuzzy match
        else {
          let termIndex = 0;
          for (let i = 0; i < normalizedValue.length; i++) {
            if (termIndex < normalizedTerm.length && normalizedValue[i] === normalizedTerm[termIndex]) {
              termIndex++;
            }
          }
          // Partial match score based on how much of the term was matched
          if (termIndex > 0) {
            score += (termIndex / normalizedTerm.length) * 20;
          }
        }
      }
    });
    
    return { item, score };
  });
  
  // Filter out items with no match and sort by score
  return scoredItems
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
};