/**
 * Search Highlighting Utility
 *
 * Converts Meilisearch _matchesPosition data into safe React-renderable
 * text segments for match highlighting.
 *
 * Features:
 * - XSS prevention by returning structural segments instead of HTML strings
 * - Overlapping match merging
 * - Snippet cropping with ±50 char context around first match
 */

export interface MatchPosition {
  start: number;
  length: number;
}


/**
 * Merges overlapping match positions into non-overlapping ranges.
 * Input positions must be sorted by start ascending.
 */
function mergePositions(
  positions: MatchPosition[]
): Array<{ start: number; end: number }> {
  if (positions.length === 0) return [];

  const sorted = [...positions].sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];

  let current = { start: sorted[0].start, end: sorted[0].start + sorted[0].length };

  for (let i = 1; i < sorted.length; i++) {
    const next = { start: sorted[i].start, end: sorted[i].start + sorted[i].length };
    if (next.start <= current.end) {
      // Overlapping or adjacent — extend
      current.end = Math.max(current.end, next.end);
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);

  return merged;
}

/**
 * Crops text to maxLength characters while keeping the first match
 * visible with ±contextPadding characters of context.
 */
function cropSnippet(
  text: string,
  positions: MatchPosition[],
  maxLength: number,
  contextPadding = 50
): { croppedText: string; offset: number } {
  if (text.length <= maxLength) {
    return { croppedText: text, offset: 0 };
  }

  if (positions.length === 0) {
    return {
      croppedText: text.slice(0, maxLength) + '…',
      offset: 0,
    };
  }

  const firstMatch = positions[0];
  const matchCenter = firstMatch.start + Math.floor(firstMatch.length / 2);

  let start = Math.max(0, matchCenter - Math.floor(maxLength / 2));
  let end = start + maxLength;

  // Ensure we don't overflow
  if (end > text.length) {
    end = text.length;
    start = Math.max(0, end - maxLength);
  }

  // Ensure the first match is fully visible
  if (firstMatch.start < start) {
    start = Math.max(0, firstMatch.start - contextPadding);
    end = Math.min(text.length, start + maxLength);
  }
  if (firstMatch.start + firstMatch.length > end) {
    end = Math.min(text.length, firstMatch.start + firstMatch.length + contextPadding);
    start = Math.max(0, end - maxLength);
  }

  let croppedText = text.slice(start, end);
  if (start > 0) croppedText = '…' + croppedText;
  if (end < text.length) croppedText = croppedText + '…';

  return { croppedText, offset: start };
}

/**
 * Converts a text string and match positions into an array of text segments
 * indicating if each segment is a match.
 *
 * @param text - The raw text to highlight
 * @param matchPositions - Array of { start, length } from Meilisearch
 * @param maxSnippetLength - Maximum length of the output snippet (default: 200)
 * @returns Array of text segments
 */
export function highlightMatches(
  text: string,
  matchPositions: MatchPosition[] = [],
  maxSnippetLength = 200
): { text: string; isMatch: boolean }[] {
  if (!text) return [];
  if (!matchPositions || matchPositions.length === 0) {
    const cropped = text.length > maxSnippetLength
      ? text.slice(0, maxSnippetLength) + '…'
      : text;
    return [{ text: cropped, isMatch: false }];
  }

  // Crop the text first, then adjust positions
  const { croppedText, offset } = cropSnippet(text, matchPositions, maxSnippetLength);
  const prefixAdded = offset > 0 ? 1 : 0; // The '…' char

  // Adjust positions relative to the cropped text
  const adjustedPositions = matchPositions
    .map((p) => ({
      start: p.start - offset + prefixAdded,
      length: p.length,
    }))
    .filter((p) => p.start >= 0 && p.start < croppedText.length);

  // Merge overlapping positions
  const merged = mergePositions(adjustedPositions);

  // Build the output array
  const segments: { text: string; isMatch: boolean }[] = [];
  let lastEnd = 0;

  for (const range of merged) {
    const start = Math.max(0, range.start);
    const end = Math.min(croppedText.length, range.end);

    if (start > lastEnd) {
      segments.push({ text: croppedText.slice(lastEnd, start), isMatch: false });
    }
    segments.push({ text: croppedText.slice(start, end), isMatch: true });
    lastEnd = end;
  }

  if (lastEnd < croppedText.length) {
    segments.push({ text: croppedText.slice(lastEnd), isMatch: false });
  }

  return segments;
}

/**
 * Extracts match positions for a specific field from Meilisearch's
 * _matchesPosition response object.
 */
export function getFieldMatchPositions(
  matchesPosition: Record<string, MatchPosition[]> | undefined,
  field: string
): MatchPosition[] {
  if (!matchesPosition || !matchesPosition[field]) return [];
  return matchesPosition[field];
}
