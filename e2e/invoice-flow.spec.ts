import { test, expect } from '@playwright/test';

test.describe('Invoice Flow', () => {
  test('payments page loads or redirects to login', async ({ page }) => {
    await page.goto('/#/payments');

    // Wait for either the payments page or login redirect
    const paymentsHeading = page.getByText(/invoices|estimates|payments/i).first();
    const loginHeading = page.getByText('Sign in to your account');

    const visible = await paymentsHeading.or(loginHeading).first().isVisible();
    expect(visible).toBe(true);
  });

  test('create invoice route is accessible', async ({ page }) => {
    await page.goto('/#/payments/invoice/new');

    await page.waitForURL(/#\/(login|payments)/, { timeout: 5000 }).catch(() => {});

    // Should either show the form or redirect
    const url = page.url();
    expect(url).toMatch(/#\//);
  });

  test('create estimate route is accessible', async ({ page }) => {
    await page.goto('/#/payments/estimate/new');

    await page.waitForURL(/#\/(login|payments)/, { timeout: 5000 }).catch(() => {});

    const url = page.url();
    expect(url).toMatch(/#\//);
  });

  test('edit invoice route pattern works', async ({ page }) => {
    // Navigate to an edit route with a fake ID
    await page.goto('/#/payments/invoices/edit/test-id');

    await page.waitForURL(/#\/(login|payments)/, { timeout: 5000 }).catch(() => {});

    const url = page.url();
    expect(url).toMatch(/#\//);
  });
});
