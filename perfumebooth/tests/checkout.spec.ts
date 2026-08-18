import { test, expect } from '@playwright/test';

test.describe('E2E Checkout Flow', () => {
  test('Full checkout with registration and COD payment', async ({ page }) => {
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });

    // 1. Navigate to http://localhost:3000/checkout
    await page.goto('/checkout');

    // 2. Verify redirect to auth/login page
    await page.waitForURL(/.*\/auth.*/);

    // 3. Switch to Signup mode and register a new account
    const signUpToggle = page.locator('button:has-text("Sign up")');
    if (await signUpToggle.count() > 0) {
      await signUpToggle.click();
    }
    
    // Generate a random test email
    const email = `test_user_${Math.floor(Math.random() * 100000)}@example.com`;
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'TestPassword123!');
    
    // Submit registration form
    await page.click('button:has-text("Sign Up")');
    
    // Wait for redirect to checkout (due to returnUrl=/checkout query param)
    await page.waitForURL(url => url.pathname === '/checkout', { timeout: 15000 });

    // 4. Go back to homepage/all, find a product, and click 'Add to Collection'
    await page.goto('/all');
    
    // Select the first product card
    const firstProduct = page.locator('.product-card').first();
    await firstProduct.waitFor({ state: 'visible' });
    await firstProduct.click();
    await page.waitForURL(/\/products\/.+/);

    // Add to Collection
    const addToCartBtn = page.locator('button:has-text("Add to Collection")').first();
    await addToCartBtn.waitFor({ state: 'visible' });
    await addToCartBtn.click();
    
    // Wait for the cart addition to finish
    await page.waitForTimeout(2000);

    // 5. Go back to http://localhost:3000/checkout
    await page.goto('/checkout');

    // 6. Fill in the shipping address details (valid Indian PIN code)
    await page.screenshot({ path: 'test-results/checkout-step6.png', fullPage: true });
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="address1"]', '70B/35A, Rama Road');
    await page.fill('input[name="city"]', 'New Delhi');
    await page.fill('input[name="state"]', 'Delhi');
    await page.fill('input[name="zip"]', '110015');
    await page.fill('input[name="phone"]', '9266030909');

    // 7. Verify Shipping Methods are calculated and selected
    const shippingRadio = page.locator('input[name="shipping_option"]').first();
    await shippingRadio.waitFor({ state: 'visible', timeout: 15000 });
    
    // Proceed to Summary step
    await page.click('button:has-text("Deliver to This Address")');

    // 8. Click through to the Summary step and then to the Payment step
    const confirmBtn = page.locator('button:has-text("Confirm Items & Continue")');
    await confirmBtn.waitFor({ state: 'visible' });
    await confirmBtn.click();

    // 9. Choose Cash on Delivery (COD)
    const codRadio = page.locator('input[type="radio"][value="cod"]');
    await codRadio.waitFor({ state: 'visible' });
    await codRadio.click();

    // 10. Click 'Complete Purchase' / 'Pay Now' and verify redirect to /order-successfully with order ID
    const completePurchaseBtn = page.locator('button:has-text("Complete Purchase")');
    await completePurchaseBtn.click();
    
    // Expect redirection to success page
    await page.waitForURL(/.*\/order-successfully.*/, { timeout: 20000 });
    
    // Confirm order confirmation details are visible
    const successTitle = page.locator('h1:has-text("Order Confirmed!")');
    await expect(successTitle).toBeVisible({ timeout: 15000 });
  });
});
