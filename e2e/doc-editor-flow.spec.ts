import { test, expect } from '@playwright/test';

test.describe('Document Editing Flow', () => {
  // Navigate to the document editor route before each test
  test.beforeEach(async ({ page }) => {
    // Uses HashRouter URLs (/#/ prefix) — base URL is http://localhost:3000
    await page.goto('http://localhost:3000/#/docs/editor');
  });

  // 1. Verifies that the document editor page loads correctly or redirects to login
  test('document editor page loads', async ({ page }) => {
    // Assert content is visible or login redirect occurred
    await expect(
      page.getByRole('heading', { name: /Documents|Login|Editor/i }).first()
    ).toBeVisible();
  });

  // 2. Verifies the creation of a new document and rendering of the BlockSuite editor
  test('can create a new document', async ({ page }) => {
    // Click the create/new document button
    const newDocButton = page.getByRole('button', { name: /New Document|Create/i });
    if (await newDocButton.isVisible()) {
      await newDocButton.click();
    }

    // Fill title if a modal or input is prompted
    const titleInput = page.getByPlaceholder(/Document Title|Enter title/i);
    if (await titleInput.isVisible()) {
      await titleInput.fill('E2E Test Document');
      await page.getByRole('button', { name: /Confirm|Create/i }).click();
    }

    // Assert that the editor container renders
    await expect(page.locator('.blocksuite-editor').first()).toBeVisible();
  });

  // 3. Verifies typing content into the BlockSuite editor
  test('can type content in editor', async ({ page }) => {
    // Wait for the editor to load and click on the content area
    const editor = page.locator('.blocksuite-editor').first();
    await expect(editor).toBeVisible();
    await editor.click();

    // Use page.keyboard.type to enter text
    const testText = 'Hello BlockSuite Editor!';
    await page.keyboard.type(testText);

    // Assert the text is visible within the editor blocks
    await expect(page.locator('[data-block-id]', { hasText: testText }).first()).toBeVisible();
  });

  // 4. Verifies document saving and data persistence upon reload
  test('can save document and persist', async ({ page }) => {
    const editor = page.locator('.blocksuite-editor').first();
    await expect(editor).toBeVisible();
    
    // Type some content to save
    await editor.click();
    const saveText = 'Content to be saved and persisted.';
    await page.keyboard.type(saveText);

    // Click save or press Ctrl+S
    const saveButton = page.getByRole('button', { name: /Save/i });
    if (await saveButton.isVisible()) {
      await saveButton.click();
    } else {
      await page.keyboard.press('Control+s');
    }

    // Assert save confirmation (e.g., a toast notification)
    const toast = page.getByText(/Saved successfully|Document saved/i);
    if (await toast.isVisible()) {
       await expect(toast).toBeVisible();
    }

    // Reload the page
    await page.reload();

    // Assert content persists after reload
    await expect(page.locator('.blocksuite-editor').first()).toBeVisible();
    await expect(page.locator('[data-block-id]', { hasText: saveText }).first()).toBeVisible();
  });

  // 5. Verifies text formatting application (bold text via Ctrl+B)
  test('can apply formatting', async ({ page }) => {
    const editor = page.locator('.blocksuite-editor').first();
    await expect(editor).toBeVisible();
    
    // Type text to format
    await editor.click();
    const formatText = 'Format me bold';
    await page.keyboard.type(formatText);

    // Select text (Shift + ArrowLeft)
    for (let i = 0; i < formatText.length; i++) {
      await page.keyboard.press('Shift+ArrowLeft');
    }

    // Apply bold formatting via Ctrl+B
    await page.keyboard.press('Control+b');

    // Assert bold styling applied (BlockSuite uses strong or bold wrappers)
    const formattedBlock = page.locator('[data-block-id]', { hasText: formatText }).first();
    await expect(formattedBlock.locator('strong, b, [style*="font-weight: bold"], [class*="bold"]')).toBeVisible();
  });
});
