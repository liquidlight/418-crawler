import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to the app
    console.log('Navigating to localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 10000 });

    // Check for any console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
        console.error('Console error:', msg.text());
      }
    });

    page.on('pageerror', err => {
      errors.push(err.message);
      console.error('Page error:', err.message);
    });

    // Find the input field
    console.log('Finding URL input field...');
    const input = page.locator('input[type="text"]');
    const exists = await input.count() > 0;
    console.log(`Input field found: ${exists}`);

    if (exists) {
      // Type the URL
      console.log('Typing URL: https://www.mikestreety.co.uk/');
      await input.fill('https://www.mikestreety.co.uk/');
      await page.waitForTimeout(500);

      // Check domain extraction
      const domainText = await page.locator('text=www.mikestreety.co.uk').first();
      const domainExists = await domainText.count() > 0;
      console.log(`Base domain extracted: ${domainExists}`);

      // Find Crawl button
      console.log('Looking for Crawl button...');
      const button = page.locator('button:has-text("Crawl")').first();
      const buttonCount = await button.count();
      console.log(`Crawl button found: ${buttonCount > 0}`);

      if (buttonCount > 0) {
        const isDisabled = await button.isDisabled();
        console.log(`Crawl button disabled: ${isDisabled}`);

        if (!isDisabled) {
          console.log('Clicking Crawl button...');
          await button.click();

          // Wait for crawl to start
          await page.waitForTimeout(1000);

          // Check for pause button (indicates crawl started)
          const pauseButton = page.locator('button:has-text("Pause")').first();
          const hasPause = await pauseButton.count() > 0;
          console.log(`Crawl started (Pause button visible): ${hasPause}`);

          if (!hasPause) {
            // Wait a bit longer for the crawl to initialize
            await page.waitForTimeout(2000);
            const pauseButtonRetry = page.locator('button:has-text("Pause")').first();
            const hasPauseRetry = await pauseButtonRetry.count() > 0;
            console.log(`Crawl started (retry): ${hasPauseRetry}`);
          }

          // Take screenshot
          await page.screenshot({ path: '/tmp/crawl-test.png', fullPage: true });
          console.log('Screenshot saved to /tmp/crawl-test.png');
        } else {
          console.log('ERROR: Crawl button is disabled');
        }
      } else {
        console.log('ERROR: Crawl button not found');
      }
    } else {
      console.log('ERROR: Input field not found');
    }

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(err => console.log('  -', err));
    } else {
      console.log('\n✅ No console errors detected');
    }

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
})();
