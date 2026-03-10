import { highlightMatches, getFieldMatchPositions } from './src/utils/searchHighlight';
const highlightedTitle = highlightMatches("<script>alert(1)</script>", [{start: 0, length: 7}], 120);
console.log(highlightedTitle);
