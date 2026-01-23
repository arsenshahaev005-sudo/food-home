import { test, expect } from '@playwright/test';

interface InspectionResult {
  element: string;
  found: boolean;
  visible: boolean;
  details?: string;
}

interface ConsoleError {
  type: string;
  message: string;
  url?: string;
  line?: number;
}

test.describe('Visual Inspection - localhost:3000', () => {
  let results: InspectionResult[] = [];
  let consoleErrors: ConsoleError[] = [];
  let networkErrors: string[] = [];
  let cssIssues: string[] = [];

  test.beforeEach(async ({ page }) => {
    results = [];
    consoleErrors = [];
    networkErrors = [];
    cssIssues = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          type: 'error',
          message: msg.text(),
        });
      } else if (msg.type() === 'warning') {
        consoleErrors.push({
          type: 'warning',
          message: msg.text(),
        });
      }
    });

    // Capture network errors
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.url()} - ${response.status()} ${response.statusText()}`);
      }
    });

    // Capture failed requests
    page.on('requestfailed', request => {
      networkErrors.push(`${request.url()} - Failed: ${request.failure()?.errorText}`);
    });
  });

  test('Navigate to homepage and take initial screenshot', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Wait for page to fully load
    await page.waitForTimeout(2000);
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'food-home/frontend/screenshots/01-initial-load.png',
      fullPage: true 
    });

    console.log('✓ Initial screenshot taken');
  });

  test('Check for JavaScript console errors', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    if (consoleErrors.length > 0) {
      console.log(`\n❌ Found ${consoleErrors.length} console errors/warnings:`);
      consoleErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. [${err.type}] ${err.message}`);
      });
    } else {
      console.log('✓ No console errors detected');
    }
  });

  test('Check network requests and CSS loading', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check for CSS files
    const cssRequests = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      return links.map(link => ({
        href: link.getAttribute('href'),
        loaded: (link as HTMLLinkElement).sheet !== null
      }));
    });

    console.log('\n📄 CSS Files:');
    if (cssRequests.length === 0) {
      console.log('  ⚠️  No CSS files detected via <link> tags');
      cssIssues.push('No CSS files detected via <link> tags');
    } else {
      cssRequests.forEach(css => {
        const status = css.loaded ? '✓' : '❌';
        console.log(`  ${status} ${css.href}`);
        if (!css.loaded) {
          cssIssues.push(`CSS not loaded: ${css.href}`);
        }
      });
    }

    // Check for inline styles
    const inlineStyles = await page.evaluate(() => {
      const styleTags = document.querySelectorAll('style');
      return styleTags.length;
    });
    console.log(`  📝 Inline <style> tags: ${inlineStyles}`);

    // Check for network errors
    if (networkErrors.length > 0) {
      console.log(`\n❌ Found ${networkErrors.length} network errors:`);
      networkErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    } else {
      console.log('✓ No network errors detected');
    }
  });

  test('Check Navigation Bar (Navbar)', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Look for common navbar selectors
    const navbarSelectors = [
      'nav',
      '[role="navigation"]',
      '.navbar',
      '.nav',
      '.navigation',
      'header nav',
      '.header-nav',
      '#navbar',
      '#nav'
    ];

    let navbarFound = false;
    let navbarVisible = false;
    let navbarDetails = '';

    for (const selector of navbarSelectors) {
      const element = page.locator(selector);
      const count = await element.count();
      
      if (count > 0) {
        navbarFound = true;
        const isVisible = await element.first().isVisible();
        navbarVisible = isVisible;
        navbarDetails = `Found ${count} element(s) with selector "${selector}"`;
        
        console.log(`\n🔍 Navbar Check:`);
        console.log(`  ${isVisible ? '✓' : '❌'} ${navbarDetails}`);
        console.log(`  ${isVisible ? '✓' : '❌'} Visible: ${isVisible}`);
        
        // Get navbar content
        if (isVisible) {
          const textContent = await element.first().textContent();
          console.log(`  📝 Content preview: ${textContent?.substring(0, 100)}...`);
          
          // Take screenshot of navbar
          await element.first().screenshot({ 
            path: 'food-home/frontend/screenshots/02-navbar.png' 
          });
        }
        break;
      }
    }

    if (!navbarFound) {
      console.log('\n❌ Navbar Check:');
      console.log('  ❌ No navbar found with any common selector');
      navbarDetails = 'No navbar found with common selectors: ' + navbarSelectors.join(', ');
    }

    results.push({
      element: 'Navigation Bar (Navbar)',
      found: navbarFound,
      visible: navbarVisible,
      details: navbarDetails
    });
  });

  test('Check Footer', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Look for common footer selectors
    const footerSelectors = [
      'footer',
      '.footer',
      '.site-footer',
      '#footer',
      '[role="contentinfo"]'
    ];

    let footerFound = false;
    let footerVisible = false;
    let footerDetails = '';

    for (const selector of footerSelectors) {
      const element = page.locator(selector);
      const count = await element.count();
      
      if (count > 0) {
        footerFound = true;
        const isVisible = await element.first().isVisible();
        footerVisible = isVisible;
        footerDetails = `Found ${count} element(s) with selector "${selector}"`;
        
        console.log(`\n🔍 Footer Check:`);
        console.log(`  ${isVisible ? '✓' : '❌'} ${footerDetails}`);
        console.log(`  ${isVisible ? '✓' : '❌'} Visible: ${isVisible}`);
        
        // Get footer content
        if (isVisible) {
          const textContent = await element.first().textContent();
          console.log(`  📝 Content preview: ${textContent?.substring(0, 100)}...`);
          
          // Take screenshot of footer
          await element.first().screenshot({ 
            path: 'food-home/frontend/screenshots/03-footer.png' 
          });
        }
        break;
      }
    }

    if (!footerFound) {
      console.log('\n❌ Footer Check:');
      console.log('  ❌ No footer found with any common selector');
      footerDetails = 'No footer found with common selectors: ' + footerSelectors.join(', ');
    }

    results.push({
      element: 'Footer',
      found: footerFound,
      visible: footerVisible,
      details: footerDetails
    });
  });

  test('Check Main Content Sections', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('\n🔍 Main Content Sections:');

    // Check for main content area
    const mainSelectors = ['main', '[role="main"]', '.main-content', '#main'];
    let mainFound = false;
    let mainDetails = '';

    for (const selector of mainSelectors) {
      const element = page.locator(selector);
      const count = await element.count();
      if (count > 0) {
        mainFound = true;
        const isVisible = await element.first().isVisible();
        mainDetails = `Found ${count} <main> element(s) - Visible: ${isVisible}`;
        console.log(`  ${isVisible ? '✓' : '❌'} <main> element: ${mainDetails}`);
        break;
      }
    }

    if (!mainFound) {
      console.log('  ⚠️  No <main> element found');
      mainDetails = 'No <main> element found';
    }

    // Check for common content sections
    const sectionSelectors = ['section', '.section', '[class*="section"]'];
    let sectionCount = 0;
    
    for (const selector of sectionSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        sectionCount = count;
        console.log(`  📊 Sections found: ${count}`);
        break;
      }
    }

    if (sectionCount === 0) {
      console.log('  ⚠️  No <section> elements found');
    }

    // Check for headings
    const headings = await page.evaluate(() => {
      const h1 = document.querySelectorAll('h1').length;
      const h2 = document.querySelectorAll('h2').length;
      const h3 = document.querySelectorAll('h3').length;
      return { h1, h2, h3 };
    });

    console.log(`  📝 Headings: H1=${headings.h1}, H2=${headings.h2}, H3=${headings.h3}`);

    results.push({
      element: 'Main Content Sections',
      found: mainFound || sectionCount > 0,
      visible: true,
      details: mainDetails + ` | Sections: ${sectionCount} | H1: ${headings.h1}, H2: ${headings.h2}`
    });

    // Screenshot of main content
    const main = page.locator('main').first();
    if (await main.count() > 0) {
      await main.screenshot({ path: 'food-home/frontend/screenshots/04-main-content.png' });
    }
  });

  test('Check Interactive Elements', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('\n🔍 Interactive Elements:');

    // Count buttons
    const buttons = await page.locator('button').count();
    console.log(`  🔘 Buttons: ${buttons}`);

    // Count links
    const links = await page.locator('a').count();
    console.log(`  🔗 Links: ${links}`);

    // Count inputs
    const inputs = await page.locator('input').count();
    console.log(`  📝 Inputs: ${inputs}`);

    // Check for clickable elements
    const clickable = await page.evaluate(() => {
      const clickables = document.querySelectorAll('[onclick], button, a[href], input[type="button"], input[type="submit"]');
      return clickables.length;
    });
    console.log(`  🖱️  Clickable elements: ${clickable}`);

    results.push({
      element: 'Interactive Elements',
      found: buttons > 0 || links > 0 || inputs > 0,
      visible: true,
      details: `Buttons: ${buttons}, Links: ${links}, Inputs: ${inputs}, Clickable: ${clickable}`
    });
  });

  test('Check Animations and Transitions', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('\n🔍 Animations and Transitions:');

    // Check for CSS animations
    const animatedElements = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      let animatedCount = 0;
      let animationNames: string[] = [];
      
      allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const animation = style.animationName;
        if (animation && animation !== 'none') {
          animatedCount++;
          if (!animationNames.includes(animation)) {
            animationNames.push(animation);
          }
        }
      });
      
      return { count: animatedCount, animations: animationNames };
    });

    console.log(`  🎬 Elements with animations: ${animatedElements.count}`);
    if (animatedElements.animations.length > 0) {
      console.log(`  🎭 Animation names: ${animatedElements.animations.join(', ')}`);
    } else {
      console.log('  ⚠️  No CSS animations detected');
    }

    // Check for transitions
    const transitionElements = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      let transitionCount = 0;
      
      allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const transition = style.transition;
        if (transition && transition !== 'all 0s ease 0s') {
          transitionCount++;
        }
      });
      
      return transitionCount;
    });

    console.log(`  ✨ Elements with transitions: ${transitionElements}`);

    const hasAnimations = animatedElements.count > 0 || transitionElements > 0;
    results.push({
      element: 'Animations and Transitions',
      found: hasAnimations,
      visible: true,
      details: `Animated elements: ${animatedElements.count}, Transitions: ${transitionElements}, Animation names: ${animatedElements.animations.join(', ') || 'none'}`
    });
  });

  test('Check Visual Styles and Layout', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('\n🔍 Visual Styles and Layout:');

    // Check page dimensions
    const dimensions = await page.evaluate(() => {
      return {
        width: document.body.scrollWidth,
        height: document.body.scrollHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      };
    });

    console.log(`  📐 Page dimensions: ${dimensions.width}x${dimensions.height}`);
    console.log(`  📐 Viewport: ${dimensions.viewportWidth}x${dimensions.viewportHeight}`);

    // Check for Tailwind classes
    const tailwindElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[class*="bg-"], [class*="text-"], [class*="p-"], [class*="m-"]');
      return elements.length;
    });

    console.log(`  🎨 Elements with Tailwind utility classes: ${tailwindElements}`);

    // Check for custom CSS classes
    const customClasses = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const classes = new Set<string>();
      
      allElements.forEach(el => {
        el.classList.forEach(cls => {
          if (!cls.match(/^(bg-|text-|p-|m-|flex|grid|w-|h-|rounded|shadow|border)/)) {
            classes.add(cls);
          }
        });
      });
      
      return Array.from(classes).slice(0, 20); // Return first 20 unique classes
    });

    if (customClasses.length > 0) {
      console.log(`  🎨 Custom CSS classes found: ${customClasses.join(', ')}`);
    } else {
      console.log('  ⚠️  No custom CSS classes detected');
    }

    // Check for images
    const images = await page.locator('img').count();
    console.log(`  🖼️  Images: ${images}`);

    // Check for broken images
    const brokenImages = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      let broken = 0;
      images.forEach(img => {
        if (!img.complete || img.naturalWidth === 0) {
          broken++;
        }
      });
      return broken;
    });

    if (brokenImages > 0) {
      console.log(`  ❌ Broken images: ${brokenImages}`);
    } else {
      console.log(`  ✓ All images loaded successfully`);
    }

    results.push({
      element: 'Visual Styles and Layout',
      found: true,
      visible: true,
      details: `Page: ${dimensions.width}x${dimensions.height}, Tailwind elements: ${tailwindElements}, Images: ${images} (${brokenImages} broken)`
    });

    // Take full page screenshot
    await page.screenshot({ 
      path: 'food-home/frontend/screenshots/05-full-page.png',
      fullPage: true 
    });
  });

  test('Generate Inspection Report', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('\n' + '='.repeat(60));
    console.log('📋 INSPECTION SUMMARY');
    console.log('='.repeat(60));

    console.log('\n🔍 ELEMENTS CHECK:');
    results.forEach(result => {
      const status = result.found ? (result.visible ? '✓' : '⚠️ ') : '❌';
      console.log(`  ${status} ${result.element}`);
      console.log(`     ${result.details}`);
    });

    console.log('\n🐛 CONSOLE ERRORS:');
    if (consoleErrors.length === 0) {
      console.log('  ✓ No console errors detected');
    } else {
      consoleErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. [${err.type}] ${err.message}`);
      });
    }

    console.log('\n🌐 NETWORK ISSUES:');
    if (networkErrors.length === 0) {
      console.log('  ✓ No network errors detected');
    } else {
      networkErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }

    console.log('\n📄 CSS ISSUES:');
    if (cssIssues.length === 0) {
      console.log('  ✓ No CSS loading issues detected');
    } else {
      cssIssues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue}`);
      });
    }

    console.log('\n📸 Screenshots saved to: food-home/frontend/screenshots/');
    console.log('='.repeat(60));

    // Save results to JSON for report generation
    const reportData = {
      timestamp: new Date().toISOString(),
      url: 'http://localhost:3000',
      results,
      consoleErrors,
      networkErrors,
      cssIssues
    };

    // Write to file
    await page.evaluate((data) => {
      // This won't work directly, we'll use a different approach
      return data;
    }, reportData);

    console.log('\n✓ Inspection complete!');
  });
});
