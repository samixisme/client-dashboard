import { test, expect } from '@playwright/test';

test.describe('Social Media Scheduling Flow', () => {
  const baseURL = 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    // Navigate to the social media dashboard page
    await page.goto(`${baseURL}/#/social-media`);
    // Wait for the page to be loaded
    await expect(page).toHaveURL(/.*\/#\/social-media/);
  });

  test('social media page loads', async ({ page }) => {
    // Verify that the main heading or relevant content is visible
    const heading = page.getByRole('heading', { name: /social media/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('can open connect account dialog', async ({ page }) => {
    // Click connect or add account button
    const connectButton = page.getByRole('button', { name: /connect|add account/i });
    await connectButton.click();

    // Verify that a modal/dialog with platform options appears
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(page.getByText(/select platform|choose platform/i)).toBeVisible();
  });

  test('can create a new post', async ({ page }) => {
    // Click button to create a new post
    const newPostButton = page.getByRole('button', { name: /new post|create post/i });
    await newPostButton.click();

    // Fill out the post content
    const textArea = page.getByRole('textbox', { name: /content|post body/i });
    await textArea.fill('This is a test post for E2E testing');

    // Select a platform to post to
    // In a generic UI, this might be a combobox or a dropdown trigger
    const platformSelect = page.getByRole('combobox', { name: /platform/i }).or(page.getByRole('button', { name: /select platform/i }));
    await platformSelect.click();
    await page.getByRole('option', { name: /twitter|x|facebook|linkedin/i }).first().click();

    // Verify that a post preview is rendered
    const preview = page.getByTestId('post-preview').or(page.getByText('This is a test post for E2E testing').nth(1));
    await expect(preview).toBeVisible();
  });

  test('can schedule a post for future date', async ({ page }) => {
    // Open new post dialog
    await page.getByRole('button', { name: /new post|create post/i }).click();

    // Fill post content
    await page.getByRole('textbox', { name: /content|post body/i }).fill('Test scheduled post');

    // Click the schedule button
    const scheduleButton = page.getByRole('button', { name: /schedule/i });
    await scheduleButton.click();

    // Confirm the scheduling (e.g., in a date picker or schedule dialog)
    const confirmScheduleButton = page.getByRole('button', { name: /confirm schedule|save|schedule post/i });
    await confirmScheduleButton.click();

    // Verify success toast/message appears
    const toast = page.getByRole('status').or(page.getByTestId('toast'));
    await expect(toast).toContainText(/success|scheduled/i, { timeout: 10000 });
  });

  test('scheduled post appears on calendar', async ({ page }) => {
    // First schedule a post
    await page.getByRole('button', { name: /new post|create post/i }).click();
    await page.getByRole('textbox', { name: /content|post body/i }).fill('Calendar sync test post');
    await page.getByRole('button', { name: /schedule/i }).click();
    await page.getByRole('button', { name: /confirm schedule|save|schedule post/i }).click();
    
    // Wait for the scheduling to finish
    const toast = page.getByRole('status').or(page.getByTestId('toast'));
    await expect(toast).toContainText(/success|scheduled/i, { timeout: 10000 });

    // Navigate to the calendar page using HashRouter URL
    await page.goto(`${baseURL}/#/calendar`);

    // Verify that the scheduled post appears on the calendar
    // We expect the post content or title to be visible on the calendar page
    const calendarEvent = page.getByText('Calendar sync test post');
    await expect(calendarEvent).toBeVisible({ timeout: 10000 });
  });
});
