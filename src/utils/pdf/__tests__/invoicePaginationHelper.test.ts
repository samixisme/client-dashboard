import { calculateTotalPages } from '../invoicePaginationHelper';
import { ItemCategory } from '../../../types';

// Alias to match the type used in the implementation
type InvoiceItemCategory = ItemCategory;

describe('calculateTotalPages', () => {
    // Helper to create categories with specific number of items
    const createCategories = (itemCounts: number[]): InvoiceItemCategory[] => {
        return itemCounts.map((count, index) => ({
            id: `cat-${index}`,
            name: `Category ${index}`,
            items: Array.from({ length: count }, (_, i) => ({
                id: `item-${index}-${i}`,
                name: `Item ${index}-${i}`,
                quantity: 1,
                unitPrice: 10
            }))
        }));
    };

    it('should return 1 page for 0 rows (no categories)', () => {
        expect(calculateTotalPages([])).toBe(1);
    });

    it('should return 1 page for exactly 7 rows (1 category + 6 items)', () => {
        // 1 category header + 6 items = 7 rows
        const categories = createCategories([6]);
        expect(calculateTotalPages(categories)).toBe(1);
    });

    it('should return 1 page for exactly 8 rows (1 category + 7 items)', () => {
        // 1 category header + 7 items = 8 rows
        // Note: >7 rows means it uses the additional page template which holds 10 rows
        const categories = createCategories([7]);
        expect(calculateTotalPages(categories)).toBe(1);
    });

    it('should return 1 page for exactly 10 rows (1 category + 9 items)', () => {
        // 1 category header + 9 items = 10 rows
        // Note: >7 rows means it uses the additional page template which holds 10 rows
        const categories = createCategories([9]);
        expect(calculateTotalPages(categories)).toBe(1);
    });

    it('should return 2 pages for exactly 11 rows (1 category + 10 items)', () => {
        // 1 category header + 10 items = 11 rows
        // 1st page holds 10 rows, remaining 1 row goes to 2nd page
        const categories = createCategories([10]);
        expect(calculateTotalPages(categories)).toBe(2);
    });

    it('should return 2 pages for exactly 17 rows (1 category + 16 items)', () => {
        // 1 category header + 16 items = 17 rows
        // 1st page holds 10 rows, 2nd page holds 7 rows
        const categories = createCategories([16]);
        expect(calculateTotalPages(categories)).toBe(2);
    });

    it('should return 3 pages for exactly 18 rows (1 category + 17 items)', () => {
        // 1 category header + 17 items = 18 rows
        // 1st page holds 10 rows, 2nd page holds 7 rows, 3rd page holds 1 row
        const categories = createCategories([17]);
        expect(calculateTotalPages(categories)).toBe(3);
    });

    it('should calculate correctly with multiple categories', () => {
        // 2 categories with 3 items each
        // cat1 (1) + items (3) = 4 rows
        // cat2 (1) + items (3) = 4 rows
        // total = 8 rows -> 1 page
        const categories = createCategories([3, 3]);
        expect(calculateTotalPages(categories)).toBe(1);

        // 3 categories with 5 items each
        // cat1 (1) + items (5) = 6 rows
        // cat2 (1) + items (5) = 6 rows
        // cat3 (1) + items (5) = 6 rows
        // total = 18 rows -> 3 pages
        const categories2 = createCategories([5, 5, 5]);
        expect(calculateTotalPages(categories2)).toBe(3);
    });
});
