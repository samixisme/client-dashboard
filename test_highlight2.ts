import { highlightMatches, getFieldMatchPositions } from './src/utils/searchHighlight';
const testData = {
  _matchesPosition: {
    title: [{start: 0, length: 7}]
  },
  title: "<script>alert(1)</script>"
}
const titlePositions = getFieldMatchPositions(testData._matchesPosition, 'title');
const highlightedTitle = highlightMatches(testData.title, titlePositions, 120);
console.log(highlightedTitle);
