import { ItemCategory, InvoiceItemsPerPage, InvoiceItemWithCategory } from '../../../types';

// Type alias for compatibility with existing code
type InvoiceItemCategory = ItemCategory;

/**
 * Paginate invoice items according to template constraints.
 * IMPORTANT: The row count includes category headers.
 * - Each category = 1 row for header + N rows for items
 * - Standard page capacity: 7 rows
 * - Additional page capacity: 10 rows
 */

/**
 * Calculate total number of rows (categories + items)
 */
export function calculateTotalRows(itemCategories: InvoiceItemCategory[]): number {
    return itemCategories.reduce((count, category) => {
        // 1 row for category header + N rows for items
        return count + 1 + category.items.length;
    }, 0);
}

/**
 * Calculate total number of pages needed
 */
export function calculateTotalPages(itemCategories: InvoiceItemCategory[]): number {
    const totalRows = calculateTotalRows(itemCategories);

    if (totalRows <= 7) {
        return 1; // Single standard page
    }

    const ADDITIONAL_PAGE_CAPACITY = 10;
    const STANDARD_PAGE_CAPACITY = 7;

    const remainingAfterFirst = totalRows - ADDITIONAL_PAGE_CAPACITY;
    const additionalPagesNeeded = Math.ceil(remainingAfterFirst / STANDARD_PAGE_CAPACITY);

    return 1 + additionalPagesNeeded;
}

/**
 * Paginate invoice items across pages
 * - ≤7 rows: Single page using standard template
 * - >7 rows: First page uses additional template (10 rows), remaining pages use standard template (7 rows each)
 */
export function paginateInvoiceItems(
    itemCategories: InvoiceItemCategory[]
): InvoiceItemsPerPage {
    // Flatten items with category info
    const allItems: InvoiceItemWithCategory[] = [];

    itemCategories.forEach(category => {
        category.items.forEach((item, index) => {
            allItems.push({
                // Only include category name on first item
                categoryName: index === 0 ? category.name : undefined,
                item: {
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice
                }
            });
        });
    });

    const totalRows = calculateTotalRows(itemCategories);

    // Case 1: ≤7 rows - use single standard page
    if (totalRows <= 7) {
        return {
            firstPage: allItems
        };
    }

    // Case 2: >7 rows - use additional page first, then standard pages
    const ADDITIONAL_PAGE_CAPACITY = 10;
    const STANDARD_PAGE_CAPACITY = 7;

    // Distribute items across pages respecting row limits
    const pages: InvoiceItemWithCategory[][] = [];
    let currentPage: InvoiceItemWithCategory[] = [];
    let currentPageRowCount = 0;
    let currentPageCapacity = ADDITIONAL_PAGE_CAPACITY; // First page

    for (const itemWithCategory of allItems) {
        // Calculate rows this item will take (1 for category header if present + 1 for item)
        const rowsNeeded = (itemWithCategory.categoryName ? 1 : 0) + 1;

        // Check if adding this item would exceed current page capacity
        if (currentPageRowCount + rowsNeeded > currentPageCapacity) {
            // Save current page and start new one
            if (currentPage.length > 0) {
                pages.push(currentPage);
                currentPage = [];
                currentPageRowCount = 0;
                // Subsequent pages use standard capacity
                currentPageCapacity = STANDARD_PAGE_CAPACITY;
            }
        }

        currentPage.push(itemWithCategory);
        currentPageRowCount += rowsNeeded;
    }

    // Add last page if it has items
    if (currentPage.length > 0) {
        pages.push(currentPage);
    }

    // Return first page and additional pages separately
    const [firstPage, ...additionalPages] = pages;

    return {
        firstPage,
        additionalPages: additionalPages.length > 0 ? additionalPages : undefined
    };
}
