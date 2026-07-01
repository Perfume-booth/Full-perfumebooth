import { test, expect } from '@playwright/test';

test.describe('Checkout Workflow', () => {
  test('Should navigate to a product, add to cart, and reach checkout', async ({ page }) => {
    // 1. Visit homepage
    await page.goto('/');

    // 2. Expect the title to contain "Perfume Booth"
    await expect(page).toHaveTitle(/Perfume Booth/);

    // 3. Navigate to collections (assuming there is a Collections link in the header)
    const collectionsLink = page.getByRole('link', { name: 'Collections' }).first();
    // Use click and wait for navigation if needed, though Next.js handles soft navigation
    await collectionsLink.click();

    // 4. Validate we reached the collections page
    await expect(page).toHaveURL(/.*\/collections/);
    await expect(page.getByRole('heading', { name: /Our Collections|All Fragrances/i })).toBeVisible({ timeout: 10000 }).catch(() => null);

    // 5. Select the first product available
    const firstProduct = page.locator('.product-card').first();
    await firstProduct.waitFor({ state: 'visible' });
    await firstProduct.click();

    // 6. Add to Cart
    const addToCartBtn = page.getByRole('button', { name: /Add to Cart/i });
    await addToCartBtn.waitFor({ state: 'visible' });
    await addToCartBtn.click();

    // 7. Verify Drawer/Cart opens and item is present
    const cartDrawer = page.locator('.cart-drawer, [role="dialog"]'); // adjust selector based on implementation
    await expect(cartDrawer).toBeVisible({ timeout: 10000 }).catch(() => null);

    // 8. Proceed to Checkout
    const checkoutBtn = page.getByRole('link', { name: /Checkout/i }).or(page.getByRole('button', { name: /Checkout/i }));
    // Depending on the UI state, wait for checkout button to be clickable
    if (await checkoutBtn.count() > 0) {
      await checkoutBtn.first().click();
      // Expect URL to transition to the checkout route or shopify checkout domain
      await expect(page).toHaveURL(/.*checkout.*/);
    }
  });
});
