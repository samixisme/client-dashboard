import { test, expect } from '@playwright/test';

test.describe('Moodboard Creation Flow', () => {
  // Navigate to the moodboard route before each test
  // Uses HashRouter prefix as specified
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/#/moodboards');
  });

  // 1. Verify that the moodboard page content loads properly 
  // (or redirects to a login prompt if unauthenticated)
  test('moodboard page loads', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /moodboard|login/i }).first();
    await expect(heading).toBeVisible();
  });

  // 2. Verify that a user can create a new moodboard
  test('can create a new moodboard', async ({ page }) => {
    // Click create/new button
    const createButton = page.getByRole('button', { name: /new|create/i });
    await createButton.click();

    // Fill in the new moodboard name
    const nameInput = page.getByRole('textbox', { name: /name|title/i });
    await nameInput.fill('My Test Moodboard');

    // Confirm creation
    const confirmButton = page.getByRole('button', { name: /save|confirm|create/i });
    await confirmButton.click();

    // Assert the moodboard canvas or board renders
    const canvas = page.locator('canvas, [data-testid="moodboard-canvas"]').first();
    await expect(canvas).toBeVisible();
  });

  // 3. Verify that a text item can be added to the moodboard canvas
  test('can add a text item to canvas', async ({ page }) => {
    // Click the tool to add text
    const addTextButton = page.getByRole('button', { name: /add text|text/i });
    await addTextButton.click();

    // Assert that the text element appears on the canvas and type content into it
    const textElement = page.getByRole('textbox', { name: /text content|element/i }).or(page.locator('textarea')).first();
    await textElement.fill('Inspirational Text');
    await expect(textElement).toHaveValue('Inspirational Text');
  });

  // 4. Verify that an image item can be added to the canvas via file upload
  test('can add an image item', async ({ page }) => {
    // Use setInputFiles for test image
    const addImageInput = page.locator('input[type="file"]').first();
    
    // Create a dummy transparent 1x1 PNG buffer to simulate file upload
    const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    
    await addImageInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: buffer,
    });

    // Assert that the image appears on the canvas
    const addedImage = page.getByRole('img', { name: /moodboard item|uploaded/i }).first();
    await expect(addedImage).toBeVisible();
  });

  // 5. Verify that items on the canvas can be dragged and the board can be saved
  test('can drag items and save', async ({ page }) => {
    // Find an item to drag
    const draggableItem = page.locator('.moodboard-item, [data-draggable="true"]').first();
    
    // Use page.mouse sequence to drag item
    const box = await draggableItem.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100);
      await page.mouse.up();
    }

    // Save the moodboard
    const saveButton = page.getByRole('button', { name: /save/i });
    await saveButton.click();

    // Assert success feedback
    const successToast = page.getByText(/saved successfully|success/i).first();
    await expect(successToast).toBeVisible();
  });
});