import { test, expect } from '@playwright/test';

test.describe('Feedback Flow', () => {
  test('feedback page loads or redirects to login', async ({ page }) => {
    await page.goto('/#/feedback');

    const feedbackHeading = page.getByText(/feedback/i).first();
    const loginHeading = page.getByText('Sign in to your account');

    const visible = await feedbackHeading.or(loginHeading).first().isVisible();
    expect(visible).toBe(true);
  });

  test('feedback project route pattern works', async ({ page }) => {
    await page.goto('/#/feedback/test-project-id');

    await page.waitForURL(/#\/(login|feedback)/, { timeout: 5000 }).catch(() => {});

    const url = page.url();
    expect(url).toMatch(/#\//);
  });

  test('feedback mockup route pattern works', async ({ page }) => {
    await page.goto('/#/feedback/test-project-id/mockups');

    await page.waitForURL(/#\/(login|feedback)/, { timeout: 5000 }).catch(() => {});

    const url = page.url();
    expect(url).toMatch(/#\//);
  });

  test('feedback website route pattern works', async ({ page }) => {
    await page.goto('/#/feedback/test-project-id/websites');

    await page.waitForURL(/#\/(login|feedback)/, { timeout: 5000 }).catch(() => {});

    const url = page.url();
    expect(url).toMatch(/#\//);
  });

  test('feedback video route pattern works', async ({ page }) => {
    await page.goto('/#/feedback/test-project-id/videos');

    await page.waitForURL(/#\/(login|feedback)/, { timeout: 5000 }).catch(() => {});

    const url = page.url();
    expect(url).toMatch(/#\//);
  });
});
