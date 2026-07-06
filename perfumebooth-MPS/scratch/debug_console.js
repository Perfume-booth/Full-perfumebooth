const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type().toUpperCase()}]: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`[UNCAUGHT ERROR]: ${err.message}`);
  });

  page.on('request', req => {
    if (req.url().includes('brands') || req.url().includes('products')) {
      console.log(`[REQUEST]: ${req.url()}`);
    }
  });

  page.on('response', res => {
    if (res.url().includes('brands') || res.url().includes('products')) {
      console.log(`[RESPONSE]: ${res.url()} -> Status ${res.status()}`);
    }
  });

  console.log("Navigating to http://localhost:3000 ...");
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
    console.log("Navigation successful. Waiting 3 seconds for client-side fetches...");
    await page.waitForTimeout(3000);
  } catch (err) {
    console.error("Navigation failed:", err.message);
  }

  await browser.close();
})();
