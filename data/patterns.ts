const accentColor = 'rgba(163, 230, 53, 0.4)';

const createPattern = (pattern: string) => `url("data:image/svg+xml,${encodeURIComponent(pattern)}")`;

export const backgroundPatterns = [
    {
        id: 'dots',
        style: { backgroundImage: createPattern(`<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><circle fill='${accentColor}' cx='6' cy='6' r='1'/></svg>`) }
    },
    {
        id: 'lines-diagonal',
        style: { backgroundImage: createPattern(`<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><path d='M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2' stroke='${accentColor}' stroke-width='1'/></svg>`) }
    },
    {
        id: 'lines-cross',
        style: { backgroundImage: createPattern(`<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><path d='M0 0L10 10ZM10 0L0 10Z' stroke='${accentColor}' stroke-width='1'/></svg>`) }
    },
    {
        id: 'grid',
        style: { backgroundImage: createPattern(`<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><path d='M8 0V16M0 8H16' stroke='${accentColor}' stroke-width='0.5'/></svg>`) }
    },
    {
        id: 'zigzag',
        style: { backgroundImage: createPattern(`<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><path d='M0 10 L5 5 L10 10 L15 5 L20 10' fill='none' stroke='${accentColor}' stroke-width='1'/></svg>`) }
    },
];
