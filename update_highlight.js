const fs = require('fs');

const filePath = 'src/utils/searchHighlight.ts';
let code = fs.readFileSync(filePath, 'utf8');

const newFunction = `
/**
 * Converts a text string and match positions into an array of text segments
 * indicating whether each segment is a match.
 *
 * @param text - The raw text to highlight
 * @param matchPositions - Array of { start, length } from Meilisearch
 * @param maxSnippetLength - Maximum length of the output snippet (default: 200)
 * @returns Array of { text, isMatch }
 */
export function getHighlightedSegments(
  text: string,
  matchPositions: MatchPosition[] = [],
  maxSnippetLength = 200
): Array<{ text: string; isMatch: boolean }> {
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
  const segments: Array<{ text: string; isMatch: boolean }> = [];
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
`;

code = code.replace(
  'export function highlightMatches(',
  newFunction + '\nexport function highlightMatches('
);

fs.writeFileSync(filePath, code, 'utf8');
