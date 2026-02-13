import { Brand } from '../types';

export let brands: Brand[] = [
    {
        id: 'brand-1',
        name: 'Starlight Inc.',
        createdAt: new Date('2023-01-15T10:00:00.000Z'),
        memberIds: ['user-1', 'user-2'],
        logos: [
            // Primary Logos - Full Logo
            { 
                type: 'Full Logo', 
                variation: 'Color', 
                formats: [
                    { format: 'svg', url: 'https://via.placeholder.com/200x100/A3E635/111827.svg?text=Full+Logo' },
                    { format: 'png', url: 'https://via.placeholder.com/200x100/A3E635/111827.png?text=Full+Logo' },
                ]
            },
            // Primary Logos - Logomark
            { 
                type: 'Logomark', 
                variation: 'Color', 
                formats: [
                     { format: 'svg', url: 'https://via.placeholder.com/100x100/A3E635/111827.svg?text=Mark' },
                     { format: 'png', url: 'https://via.placeholder.com/100x100/A3E635/111827.png?text=Mark' },
                ]
            },
            // Primary Logos - Logotype
            { 
                type: 'Logotype', 
                variation: 'Color', 
                formats: [
                    { format: 'svg', url: 'https://via.placeholder.com/200x60/A3E635/111827.svg?text=Starlight' },
                ]
            },
            // Dark Background Variations
            { 
                type: 'Full Logo', 
                variation: 'Dark Background', 
                formats: [
                    { format: 'svg', url: 'https://via.placeholder.com/200x100/f9fafb/111827.svg?text=Full+Logo' },
                    { format: 'png', url: 'https://via.placeholder.com/200x100/f9fafb/111827.png?text=Full+Logo' },
                ]
            },
            // White Background Variations
            { 
                type: 'Full Logo', 
                variation: 'White Background', 
                formats: [
                    { format: 'svg', url: 'https://via.placeholder.com/200x100/111827/f9fafb.svg?text=Full+Logo' },
                    { format: 'png', url: 'https://via.placeholder.com/200x100/111827/f9fafb.png?text=Full+Logo' },
                ]
            },
            // Grayscale Variations
            { 
                type: 'Full Logo', 
                variation: 'Grayscale', 
                formats: [
                    { format: 'svg', url: 'https://via.placeholder.com/200x100/9ca3af/FFFFFF.svg?text=Full+Logo' },
                    { format: 'png', url: 'https://via.placeholder.com/200x100/9ca3af/FFFFFF.png?text=Full+Logo' },
                ]
            },
        ],
        colors: [
            { name: 'Primary Neon', type: 'Primary', hex: '#a3e635', rgb: '163, 230, 53', hsl: '84, 76%, 55%', cmyk: '29, 0, 77, 10' },
            { name: 'Background Dark', type: 'Primary', hex: '#111827', rgb: '17, 24, 39', hsl: '215, 39%, 11%', cmyk: '56, 38, 0, 85' },
            { name: 'Surface Gray', type: 'Secondary', hex: '#1f2937', rgb: '31, 41, 55', hsl: '215, 28%, 17%', cmyk: '44, 25, 0, 78' },
            { name: 'Text Primary', type: 'Secondary', hex: '#f9fafb', rgb: '249, 250, 251', hsl: '210, 17%, 98%', cmyk: '1, 0, 0, 2' },
        ],
        fonts: [
            { 
                name: 'Inter', 
                type: 'Primary', 
                url: 'https://fonts.google.com/specimen/Inter',
                styles: [
                    { name: 'H1 / Headline 1', size: '96px', weight: '300', letterSpacing: '-1.5px', lineHeight: '112px' },
                    { name: 'H2 / Headline 2', size: '60px', weight: '300', letterSpacing: '-0.5px', lineHeight: '72px' },
                    { name: 'H3 / Headline 3', size: '48px', weight: '400', letterSpacing: '0px', lineHeight: '56px' },
                    { name: 'H4 / Headline 4', size: '34px', weight: '400', letterSpacing: '0.25px', lineHeight: '42px' },
                    { name: 'Body 1', size: '16px', weight: '400', letterSpacing: '0.5px', lineHeight: '24px' },
                    { name: 'Body 2', size: '14px', weight: '400', letterSpacing: '0.25px', lineHeight: '20px' },
                ]
            },
            { 
                name: 'Roboto Mono', 
                type: 'Secondary', 
                url: 'https://fonts.google.com/specimen/Roboto+Mono',
                styles: [
                    { name: 'Code Snippet', size: '14px', weight: '400', letterSpacing: '0.1px', lineHeight: '20px' },
                    { name: 'Caption', size: '12px', weight: '400', letterSpacing: '0.4px', lineHeight: '16px' },
                ]
            },
        ],
        brandVoice: `**Confident & Competent:** We are experts in our field, and our language reflects that. We are direct, clear, and avoid jargon.\n\n**Empathetic & Supportive:** We understand our customers' challenges and speak to them with encouragement and understanding.`,
        brandPositioning: `For growing tech companies that need to scale their infrastructure, Starlight Inc. provides a managed cloud platform that is both powerful and easy to use. Unlike complex, a-la-carte cloud providers, we offer a streamlined experience with expert support, allowing development teams to focus on building products, not managing servers.`,
        imagery: [
            { name: 'Team Collaboration', url: 'https://picsum.photos/seed/img1/600/400' },
            { name: 'Abstract Tech Background', url: 'https://picsum.photos/seed/img2/600/400' },
            { name: 'Focused Developer', url: 'https://picsum.photos/seed/img3/600/400' },
            { name: 'Cityscape at Night', url: 'https://picsum.photos/seed/img4/600/400' },
        ],
        graphics: [
            { name: 'Data Flow Diagram', url: 'https://picsum.photos/seed/gfx1/400/300' },
            { name: 'UI Component Example', url: 'https://picsum.photos/seed/gfx2/400/300' },
        ],
    },
    {
        id: 'brand-2',
        name: 'Aperture Labs',
        createdAt: new Date('2023-05-20T10:00:00.000Z'),
        memberIds: ['user-1'],
        logos: [
             { 
                type: 'Full Logo', 
                variation: 'Color', 
                formats: [
                    { format: 'svg', url: 'https://via.placeholder.com/200x100/f59e0b/FFFFFF.svg?text=Aperture' }
                ]
            },
        ],
        colors: [
            { name: 'Warning Amber', type: 'Primary', hex: '#f59e0b', rgb: '245, 158, 11', hsl: '38, 92%, 50%', cmyk: '0, 36, 96, 4' },
        ],
        fonts: [],
        brandVoice: '',
        brandPositioning: '',
        imagery: [],
        graphics: []
    }
];