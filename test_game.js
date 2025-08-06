import puppeteer from 'puppeteer';

async function testGame() {
  console.log('🎮 Starting automated game test...');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless mode
    defaultViewport: { width: 1280, height: 720 }
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Console error:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.log('❌ Page error:', error.message);
  });
  
  try {
    console.log('📡 Loading game...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    // Wait for canvas to be ready
    await page.waitForSelector('#game-canvas', { timeout: 5000 });
    console.log('✅ Game canvas loaded');
    
    // Take screenshot of menu
    await page.screenshot({ path: 'test_screenshots/menu.png' });
    console.log('📸 Menu screenshot saved');
    
    // Start game by pressing Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    
    // Take screenshot of gameplay
    await page.screenshot({ path: 'test_screenshots/gameplay.png' });
    console.log('📸 Gameplay screenshot saved');
    
    // Test player movement
    console.log('🏃 Testing player movement...');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);
    
    // Check if player sprite is visible
    const playerVisible = await page.evaluate(() => {
      const canvas = document.getElementById('game-canvas');
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Check if there are non-transparent pixels in the center area
      let hasContent = false;
      for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i + 3] > 0) { // Alpha channel
          hasContent = true;
          break;
        }
      }
      return hasContent;
    });
    
    console.log(playerVisible ? '✅ Game rendering content' : '❌ No visible content');
    
    // Check for errors
    const errors = await page.evaluate(() => {
      return window.gameErrors || [];
    });
    
    if (errors.length > 0) {
      console.log('❌ Game errors:', errors);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
    console.log('🏁 Test complete');
  }
}

// Run the test
testGame();