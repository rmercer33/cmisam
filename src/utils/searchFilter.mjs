/**
 * Normalizes text by converting to lowercase and stripping punctuation.
 * Removes any character that is not a word character or whitespace (and removes underscores).
 */
const normalizeText = (str) => {
  return str.toLowerCase().replace(/[^\w\s]|_/g, '');
};

/**
 * Helper to map the start and end indices of the match in normalized text
 * back to the original text (which contains punctuation and mixed case).
 */
const getOriginalIndices = (originalText, normalizedQuery, strictRegex) => {
  const normalizedText = normalizeText(originalText);
  let matchStart, matchEnd;

  if (strictRegex) {
    const match = strictRegex.exec(normalizedText);
    if (!match) return null;
    matchStart = match.index;
    matchEnd = match.index + match[0].length;
  } else {
    matchStart = normalizedText.indexOf(normalizedQuery);
    if (matchStart === -1) return null;
    matchEnd = matchStart + normalizedQuery.length;
  }

  let normIdx = 0;
  let origStart = -1;
  let origEnd = -1;

  for (let i = 0; i < originalText.length; i++) {
    const char = originalText[i];
    const isPreserved = !(/[^\w\s]|_/.test(char));

    if (isPreserved) {
      if (normIdx === matchStart && origStart === -1) {
        origStart = i;
      }
      if (normIdx === matchEnd - 1) {
        origEnd = i + 1;
      }
      normIdx++;
    }
  }

  if (origStart === -1 || origEnd === -1) {
    return null;
  }

  return { origStart, origEnd };
};

/**
 * Filters search results based on the provided query.
 * Matches the query as a case-insensitive substring against the 'text' attribute of each item.
 * Ignores punctuation in both the query and the item's text.
 * When strict is true, matches must be whole words (not parts of words).
 * Also adds a 'context' attribute to each matching item containing a snippet of text surrounding the match.
 *
 * @param {Array} items - The array of items to filter.
 * @param {string} query - The search query.
 * @param {boolean} strict - Whether to require exact whole-word matching.
 * @param {number} [width=30] - The desired width of the context snippet.
 * @returns {Array} - The filtered array of items.
 */
export const filterItemsByText = (items = [], query = "", strict = false, width = 30) => {
  if (!query) return items;

  console.log("filter(): %s items containing: %s (strict: %s, width: %s)", items.length, query, strict, width);

  const normalizedQuery = normalizeText(query);
  const strictRegex = strict ? new RegExp(`\\b${normalizedQuery}\\b`) : null;

  let parsedWidth = typeof width === 'number' ? width : 30;
  if (query.length > parsedWidth) {
    parsedWidth = query.length;
  }

  return items.filter((item) => {
    if (item.text && typeof item.text === "string") {
      const normalizedItemText = normalizeText(item.text);
      
      let hasMatch = false;
      if (strict) {
        hasMatch = strictRegex.test(normalizedItemText);
      } else {
        hasMatch = normalizedItemText.includes(normalizedQuery);
      }

      if (!hasMatch) return false;

      const indices = getOriginalIndices(item.text, normalizedQuery, strictRegex);
      if (!indices) {
        return true;
      }

      const { origStart, origEnd } = indices;
      const queryLength = origEnd - origStart;

      const contextPadding = Math.max(0, parsedWidth - queryLength);
      const padLeft = Math.floor(contextPadding / 2);
      const padRight = Math.ceil(contextPadding / 2);

      let startIdx = Math.max(0, origStart - padLeft);
      let endIdx = Math.min(item.text.length, origEnd + padRight);

      if (startIdx === 0) {
        endIdx = Math.min(item.text.length, endIdx + (padLeft - origStart));
      } else if (endIdx === item.text.length) {
        const overflowRight = (origEnd + padRight) - item.text.length;
        startIdx = Math.max(0, startIdx - overflowRight);
      }

      const before = item.text.substring(startIdx, origStart);
      const matchStr = item.text.substring(origStart, origEnd);
      const after = item.text.substring(origEnd, endIdx);

      item.context = `${before}<em>${matchStr}</em>${after}`;
      return true;
    }
    return false;
  });
};
