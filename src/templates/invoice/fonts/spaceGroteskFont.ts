import { jsPDF } from 'jspdf';
// @ts-ignore
import { SpaceGrotesknormal } from './SpaceGrotesk-normal.js';
// @ts-ignore
import { SpaceGroteskbold } from './SpaceGrotesk-bold.js';

/**
 * Add Space Grotesk font to jsPDF using properly converted font files
 * Fonts were converted using the official method that includes proper base64 encoding
 */
export async function addSpaceGroteskFont(pdf: jsPDF) {
    try {
        // Add Regular font
        pdf.addFileToVFS('SpaceGrotesk-normal.ttf', SpaceGrotesknormal.base64);
        pdf.addFont('SpaceGrotesk-normal.ttf', 'SpaceGrotesk', 'normal');

        // Add Bold font
        pdf.addFileToVFS('SpaceGrotesk-bold.ttf', SpaceGroteskbold.base64);
        pdf.addFont('SpaceGrotesk-bold.ttf', 'SpaceGrotesk', 'bold');

        return true;
    } catch (error) {
        console.error('❌ Failed to load Space Grotesk fonts:', error);
        console.warn('⚠️ Falling back to Helvetica');
        pdf.setFont('helvetica');
        return false;
    }
}
