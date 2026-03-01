import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('unauthenticated users are redirected to login', async ({ page }) => {
    // The app uses HashRouter, so routes have #/ prefix
    await page.goto('/#/dashboard');

    // Should redirect to login since there's no auth session
    await expect(page).toHaveURL(/#\/login/);
  });

  test('login page renders sign-in form with all auth methods', async ({ page }) => {
    await page.goto('/#/login');

    // Heading
    await expect(page.getByText('Sign in to your account')).toBeVisible();
    await expect(page.getByText('Welcome back.')).toBeVisible();

    // Google sign-in button
    await expect(page.getByText('Sign in with Google')).toBeVisible();

    // Auth method tabs
    await expect(page.getByText('Email', { exact: true })).toBeVisible();
    await expect(page.getByText('Phone', { exact: true })).toBeVisible();
    await expect(page.getByText('Magic Link', { exact: true })).toBeVisible();

    // Email form fields (default tab)
    await expect(page.getByPlaceholder('Email address')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();

    // Submit button
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

    // Sign up link
    await expect(page.getByText("Don't have an account?")).toBeVisible();
    await expect(page.getByText('Sign up')).toBeVisible();
  });

  test('can switch to sign-up view', async ({ page }) => {
    await page.goto('/#/login');

    await page.getByText('Sign up').click();

    await expect(page.getByText('Create an account')).toBeVisible();
    await expect(page.getByPlaceholder('First Name')).toBeVisible();
    await expect(page.getByPlaceholder('Last Name')).toBeVisible();
    await expect(page.getByPlaceholder('Email address')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByPlaceholder('Confirm Password')).toBeVisible();
  });

  test('can switch to password reset view', async ({ page }) => {
    await page.goto('/#/login');

    await page.getByText('Forgot password?').click();

    await expect(page.getByText('Reset your password')).toBeVisible();
    await expect(page.getByPlaceholder('Email address')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send Reset Link' })).toBeVisible();
    await expect(page.getByText('Back to Sign in')).toBeVisible();
  });

  test('email sign-in shows validation for empty fields', async ({ page }) => {
    await page.goto('/#/login');

    // Try submitting empty form — HTML5 validation should prevent submission
    const emailInput = page.getByPlaceholder('Email address');
    await emailInput.click();

    // Submit with empty fields
    await page.getByRole('button', { name: 'Sign in' }).click();

    // The email input should show HTML5 required validation
    const isInvalid = await emailInput.evaluate(
      (el: HTMLInputElement) => !el.checkValidity()
    );
    expect(isInvalid).toBe(true);
  });

  test('magic link tab shows email-only input', async ({ page }) => {
    await page.goto('/#/login');

    await page.getByText('Magic Link', { exact: true }).click();

    // Should show email input but NOT password
    await expect(page.getByPlaceholder('Email address')).toBeVisible();
    // Password field should not be visible in magic link mode
    await expect(page.getByPlaceholder('Password')).not.toBeVisible();

    // Submit button changes text
    await expect(page.getByRole('button', { name: 'Send Magic Link' })).toBeVisible();
  });

  test('sign-up form validates password mismatch', async ({ page }) => {
    await page.goto('/#/login');

    // Switch to sign up
    await page.getByText('Sign up').click();
    await expect(page.getByText('Create an account')).toBeVisible();

    // Fill form with mismatched passwords
    await page.getByPlaceholder('First Name').fill('Test');
    await page.getByPlaceholder('Last Name').fill('User');
    await page.getByPlaceholder('Email address').fill('test@example.com');
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByPlaceholder('Confirm Password').fill('different456');

    // Submit
    await page.getByRole('button', { name: 'Sign up' }).click();

    // Should show password mismatch error
    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('can navigate back from sign-up to sign-in', async ({ page }) => {
    await page.goto('/#/login');

    // Go to sign up
    await page.getByText('Sign up').click();
    await expect(page.getByText('Create an account')).toBeVisible();

    // Go back to sign in
    await page.getByText('Sign in', { exact: true }).last().click();
    await expect(page.getByText('Sign in to your account')).toBeVisible();
  });
});
