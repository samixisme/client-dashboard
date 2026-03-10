import React from 'react';
import { renderToString } from 'react-dom/server';
import { HighlightText } from './src/components/search/HighlightText';

const html = renderToString(<HighlightText text='<mark class="search-highlight">&lt;script</mark>&gt;alert(1)&lt;/script&gt;' className='result-card__title' />);

console.log(html);
