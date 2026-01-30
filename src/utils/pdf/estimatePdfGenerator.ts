import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import writtenNumber from 'written-number';
import { Estimate, Client, UserSettings, LineItem } from '../../../types';
// @ts-ignore - Image import
import backgroundImage from '../../templates/estimate/estimate-background.png';
// @ts-ignore - Image import
import termsBackgroundImage from '../../templates/estimate/estimatepage-additional.png';
import { addSpaceGroteskFont } from '../../templates/invoice/fonts/spaceGroteskFont';

/**
 * Simple PDF Generator using jsPDF with background image overlay
 * Uses exact positioning and proper fonts as specified
 */
export class EstimatePdfGenerator {
    // PNG template dimensions (using 1x scale for coordinate system, even though actual image is 3x)
    // This keeps all coordinates consistent with the original measurements
    private static readonly PNG_WIDTH = 1190;  // pixels (coordinate system)
    private static readonly PNG_HEIGHT = 1684; // pixels (coordinate system)

    // PDF dimensions in mm (A4)
    private static readonly PDF_WIDTH = 210;   // mm
    private static readonly PDF_HEIGHT = 297;  // mm

    /**
     * Convert pixel coordinates from PNG to PDF millimeters
     */
    private static pxToMm(x: number, y: number): { x: number; y: number } {
        return {
            x: (x / this.PNG_WIDTH) * this.PDF_WIDTH,
            y: (y / this.PNG_HEIGHT) * this.PDF_HEIGHT
        };
    }

    /**
     * Format currency in European format: X.XXX,XX
     */
    private static formatCurrency(amount: number): string {
        const parts = amount.toFixed(2).split('.');
        const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        const decimalPart = parts[1];
        return `${integerPart},${decimalPart}`;
    }

    /**
     * Convert amount to French words
     * Example: 1234.56 -> "mille deux cent trente-quatre virgule cinquante-six"
     */
    private static amountToFrenchWords(amount: number): string {
        const parts = amount.toFixed(2).split('.');
        const integerPart = parseInt(parts[0]);
        const decimalPart = parts[1];

        let result = writtenNumber(integerPart, { lang: 'fr' });

        if (decimalPart && decimalPart !== '00') {
            result += ` virgule ${writtenNumber(parseInt(decimalPart), { lang: 'fr' })}`;
        }

        result += ' dirhams';

        // Capitalize first letter
        return result.charAt(0).toUpperCase() + result.slice(1);
    }

    /**
     * Setup fonts - Now using actual Space Grotesk font!
     */
    private static async setupFonts(pdf: jsPDF) {
        // Add the Space Grotesk font to jsPDF (MUST AWAIT!)
        await addSpaceGroteskFont(pdf);

        // Set SpaceGrotesk as the default font (note: no space in font name for jsPDF)
        pdf.setFont('SpaceGrotesk', 'normal');
    }

    /**
     * Get the asterisk number (1, 2, 3...) for a specific item
     */
    private static getAsteriskNumber(estimate: Estimate, itemId: string): number {
        let counter = 0;
        for (const category of estimate.itemCategories) {
            for (const item of category.items) {
                if (item.hasAsterisk) {
                    counter++;
                    if (item.id === itemId) return counter;
                }
            }
        }
        return 0;
    }

    /**
     * Render the terms and conditions page (page 2)
     */
    private static async renderTermsPage(pdf: jsPDF, estimate: Estimate, asteriskItems: LineItem[]): Promise<void> {
        // Setup fonts
        pdf.setFont('SpaceGrotesk', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(2, 46, 81); // #022E51

        // === HEADER SECTION - Add date and estimate number ===
        // Date - Same position as page 1
        const datePos = this.pxToMm(667, 141);
        const dateText = format(new Date(estimate.date), 'dd/MM/yyyy').toUpperCase();
        pdf.text(dateText, datePos.x, datePos.y);

        // Estimate Number - Same position as page 1
        const estimateNumPos = this.pxToMm(838, 141);
        const estimateNumText = estimate.estimateNumber.toUpperCase();
        pdf.text(estimateNumText, estimateNumPos.x, estimateNumPos.y);

        // Starting position and spacing
        let currentY = this.pxToMm(0, 400).y; // Starting Y position (adjust based on your PNG template)
        const lineHeight = 5; // Line height in mm
        const textStartX = this.pxToMm(124, 0).x;
        const lineStartX = this.pxToMm(124, 0).x;
        const lineEndX = this.pxToMm(1065, 0).x;
        const maxWidth = lineEndX - textStartX; // Maximum text width

        asteriskItems.forEach((item, index) => {
            // Get the asterisk number for this item
            const asteriskNum = this.getAsteriskNumber(estimate, item.id);

            // Render header: number and item name (bold)
            const headerText = `${asteriskNum}. ${item.name}`;
            pdf.setFont('SpaceGrotesk', 'bold');
            pdf.setFontSize(10);
            pdf.text(headerText, textStartX, currentY);
            currentY += lineHeight + 2;

            // Render the asterisk note text (normal weight, wrapped)
            pdf.setFont('SpaceGrotesk', 'normal');
            pdf.setFontSize(8);

            // Split text into multiple lines if needed
            const noteLines = pdf.splitTextToSize(item.asteriskNote || '', maxWidth);
            noteLines.forEach((line: string) => {
                pdf.text(line, textStartX, currentY);
                currentY += lineHeight;
            });

            // Add 50px padding before separator line
            currentY += this.pxToMm(0, 50).y;

            // Draw orange separator line ONLY if there are 2+ items AND this is not the last item
            if (asteriskItems.length >= 2 && index < asteriskItems.length - 1) {
                pdf.setDrawColor(255, 107, 0); // Orange color (RGB)
                pdf.setLineWidth(1 / 3.78); // 1px converted to mm (approximately 0.26mm)
                pdf.line(lineStartX, currentY, lineEndX, currentY);
            }

            // Add spacing after line for next item
            currentY += lineHeight + 3;
        });
    }

    /**
     * Generate and download estimate PDF with background image
     */
    static async generateEstimatePdf(
        estimate: Estimate,
        client: Client,
        userSettings: UserSettings
    ): Promise<void> {
        try {
            // Create PDF in A4 format (210mm x 297mm)
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Load background image
            const img = new Image();
            img.src = backgroundImage;

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            // Add background image to PDF (full page) with high quality
            // Using 'FAST' compression for better quality
            pdf.addImage(img, 'PNG', 0, 0, 210, 297, undefined, 'FAST');

            // Setup fonts (MUST AWAIT!)
            await this.setupFonts(pdf);

            // === HEADER SECTION - Space Grotesk Bold 16 UPPERCASE ===
            pdf.setFontSize(8);
            pdf.setFont('SpaceGrotesk', 'normal');
            pdf.setTextColor(2, 46, 81); // #022E51

            // Date - Pixel coords: (663, 141)
            const datePos = this.pxToMm(667, 141);
            const dateText = format(new Date(estimate.date), 'dd/MM/yyyy').toUpperCase();
            pdf.text(dateText, datePos.x, datePos.y);

            // Estimate Number - Pixel coords: (838, 141)
            const estimateNumPos = this.pxToMm(838, 141);
            const estimateNumText = estimate.estimateNumber.toUpperCase();
            pdf.text(estimateNumText, estimateNumPos.x, estimateNumPos.y);

            // === CLIENT INFO SECTION - Space Grotesk Bold 16 UPPERCASE ===
            pdf.setFontSize(8);
            pdf.setFont('SpaceGrotesk', 'bold');
            pdf.setTextColor(2, 46, 81); // #022E51

            // Client Name - Pixel coords: (125, 253)
            const clientNamePos = this.pxToMm(125, 253);
            const clientNameText = client.name.toUpperCase();
            pdf.text(clientNameText, clientNamePos.x, clientNamePos.y);

            // Client Address - Pixel coords: (663, 253)
            if (client.adresse) {
                const addressPos = this.pxToMm(663, 253);
                const addressText = client.adresse.toUpperCase();
                pdf.text(addressText, addressPos.x, addressPos.y);
            }

            // Client Address Line 2 - Pixel coords: (663, 272) - normal weight
            if (client.adresse2) {
                pdf.setFont('SpaceGrotesk', 'normal'); // Switch to normal weight for line 2
                const address2Pos = this.pxToMm(663, 272);
                const address2Text = client.adresse2.toUpperCase();
                pdf.text(address2Text, address2Pos.x, address2Pos.y);
                pdf.setFont('SpaceGrotesk', 'bold'); // Switch back to bold
            }

            // Client details (ICE, RC, IF) - smaller font
            pdf.setFontSize(8);
            pdf.setFont('SpaceGrotesk', 'normal');
            pdf.setTextColor(2, 46, 81); // #022E51

            // ICE - Pixel coords: (125, 313)
            if (client.ice) {
                const icePos = this.pxToMm(125, 313);
                pdf.text(client.ice, icePos.x, icePos.y);
            }

            // RC - Pixel coords: (344, 313)
            if (client.rc) {
                const rcPos = this.pxToMm(295, 313);
                pdf.text(client.rc, rcPos.x, rcPos.y);
            }

            // IF - Pixel coords: (475, 313)
            if (client.if) {
                const ifPos = this.pxToMm(399, 313);
                pdf.text(client.if, ifPos.x, ifPos.y);
            }

            // === LINE ITEMS TABLE ===
            // Get first category (since you're doing 1 bill per service type)
            const category = estimate.itemCategories[0];
            const items = category?.items || [];

            // Service type in first row - Space Grotesk Bold 16
            // Pixel coords: (133, 597)
            const serviceNamePos = this.pxToMm(133, 597);
            pdf.setFontSize(8);
            pdf.setFont('SpaceGrotesk', 'bold');
            pdf.setTextColor(2, 46, 81); // #022E51
            const serviceTypeText = category?.name || '';
            pdf.text(serviceTypeText, serviceNamePos.x, serviceNamePos.y);

            // Line items - Space Grotesk Regular 12
            pdf.setFont('SpaceGrotesk', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(2, 46, 81); // #022E51

            // Y pixel positions for each item row
            const itemYPixels = [651, 700, 755, 805, 859, 911, 961];

            items.slice(0, 7).forEach((item, index) => {
                const total = item.quantity * item.unitPrice;

                // Convert Y position for this row
                const yPos = this.pxToMm(0, itemYPixels[index]).y;

                // Designation - Pixel X: 133 - left aligned
                const designationX = this.pxToMm(133, 0).x;
                pdf.text(item.name, designationX, yPos);

                // Add superscript number if item has asterisk
                if (item.hasAsterisk) {
                    const asteriskNumber = this.getAsteriskNumber(estimate, item.id);
                    const textWidth = pdf.getTextWidth(item.name);
                    pdf.setFontSize(5); // Smaller for superscript
                    pdf.text(asteriskNumber.toString(), designationX + textWidth + 0.5, yPos - 1);
                    pdf.setFontSize(8); // Reset to normal
                }

                // Quantity - Pixel X: 523 - left aligned
                const quantityX = this.pxToMm(523, 0).x;
                pdf.text(item.quantity.toString(), quantityX, yPos);

                // Unit Price - Pixel X: 835 - RIGHT aligned with MAD prefix in bold
                const unitPriceX = this.pxToMm(835, 0).x;
                const unitPriceFormatted = this.formatCurrency(item.unitPrice);

                // Calculate widths for positioning
                pdf.setFont('SpaceGrotesk', 'bold');
                const madWidth = pdf.getTextWidth('MAD ');
                pdf.setFont('SpaceGrotesk', 'normal');
                const unitPriceWidth = pdf.getTextWidth(unitPriceFormatted);
                const totalUnitPriceWidth = madWidth + unitPriceWidth;

                // Position MAD so the entire "MAD X.XXX,XX" is right-aligned
                const madStartX = unitPriceX - totalUnitPriceWidth;
                pdf.setFont('SpaceGrotesk', 'bold');
                pdf.text('MAD ', madStartX, yPos);

                // Position price immediately after MAD
                pdf.setFont('SpaceGrotesk', 'normal');
                pdf.text(unitPriceFormatted, madStartX + madWidth, yPos);

                // Total - Pixel X: 1056 - RIGHT aligned with MAD prefix in bold
                const totalX = this.pxToMm(1056, 0).x;
                const totalFormatted = this.formatCurrency(total);

                // Calculate widths for positioning
                pdf.setFont('SpaceGrotesk', 'bold');
                const madWidthTotal = pdf.getTextWidth('MAD ');
                pdf.setFont('SpaceGrotesk', 'normal');
                const totalFormattedWidth = pdf.getTextWidth(totalFormatted);
                const totalCombinedWidth = madWidthTotal + totalFormattedWidth;

                // Position MAD so the entire "MAD X.XXX,XX" is right-aligned
                const madTotalStartX = totalX - totalCombinedWidth;
                pdf.setFont('SpaceGrotesk', 'bold');
                pdf.text('MAD ', madTotalStartX, yPos);

                // Position price immediately after MAD
                pdf.setFont('SpaceGrotesk', 'normal');
                pdf.text(totalFormatted, madTotalStartX + madWidthTotal, yPos);
            });

            // === TOTALS SECTION ===
            const subtotal = estimate.totals?.subtotal || 0;
            const totalNet = estimate.totals?.totalNet || 0;

            pdf.setFontSize(12);
            pdf.setFont('SpaceGrotesk', 'bold');
            pdf.setTextColor(2, 46, 81); // #022E51

            // Prix Total - Pixel coords: (914, 1068) - left aligned
            const totalPos = this.pxToMm(914, 1068);
            pdf.text(this.formatCurrency(totalNet), totalPos.x, totalPos.y);

            // === AMOUNT IN FRENCH WORDS ===
            // Price written in letters - Pixel coords: (455, 1138)
            const wordsPos = this.pxToMm(455, 1136);
            pdf.setFontSize(8);
            pdf.setFont('SpaceGrotesk', 'normal');
            pdf.setTextColor(2, 46, 81); // #022E51

            const amountInWords = this.amountToFrenchWords(totalNet);
            pdf.text(amountInWords, wordsPos.x, wordsPos.y);

            // === CONDITIONAL SECOND PAGE: TERMS & CONDITIONS ===
            // Check if any items have asterisks with notes
            const asteriskItems = estimate.itemCategories
                .flatMap(cat => cat.items)
                .filter(item => item.hasAsterisk && item.asteriskNote);

            if (asteriskItems.length > 0) {
                // Add second page
                pdf.addPage();

                // Load and add terms background
                const termsImg = new Image();
                termsImg.src = termsBackgroundImage;
                await new Promise((resolve, reject) => {
                    termsImg.onload = resolve;
                    termsImg.onerror = reject;
                });
                pdf.addImage(termsImg, 'PNG', 0, 0, 210, 297, undefined, 'FAST');

                // Render terms and conditions
                await this.renderTermsPage(pdf, estimate, asteriskItems);
            }

            // === DOWNLOAD PDF ===
            pdf.save(`devis_${estimate.estimateNumber}.pdf`);

        } catch (error) {
            console.error('PDF generation failed:', error);
            throw new Error('Failed to generate estimate PDF');
        }
    }
}
