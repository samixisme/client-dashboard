const fs = require('fs');
const path = require('path');

// This script converts TTF fonts to jsPDF format
// Run: node convertFonts.js

const fontsDir = path.join(__dirname, 'src/templates/invoice/fonts');

async function convertFont(fontPath, fontName, fontStyle) {
    const fontData = fs.readFileSync(fontPath);
    const base64 = fontData.toString('base64');

    const output = `
// Auto-generated font file for jsPDF
// Font: ${fontName} ${fontStyle}
// Generated: ${new Date().toISOString()}

export const ${fontName}${fontStyle} = {
    fontName: '${fontName}',
    fontStyle: '${fontStyle}',
    base64: '${base64}'
};
`;

    const outputPath = path.join(fontsDir, `${fontName}-${fontStyle}.js`);
    fs.writeFileSync(outputPath, output);
    console.log(`✅ Generated: ${outputPath}`);
}

// Convert both fonts
convertFont(
    path.join(fontsDir, 'SpaceGrotesk-Regular.ttf'),
    'SpaceGrotesk',
    'normal'
);

convertFont(
    path.join(fontsDir, 'SpaceGrotesk-Bold.ttf'),
    'SpaceGrotesk',
    'bold'
);

console.log('✅ Font conversion complete!');
