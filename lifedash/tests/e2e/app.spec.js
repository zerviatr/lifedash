/**
 * LifeDash — E2E Tests (Playwright + Electron)
 * Tests full user flows by launching the real Electron app.
 */

const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('path');

let electronApp;
let window;

test.beforeAll(async () => {
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../main.js')],
  });
  window = await electronApp.firstWindow();
  // Wait for app to fully load
  await window.waitForLoadState('domcontentloaded');
  await window.waitForTimeout(3000);
});

test.afterAll(async () => {
  if (electronApp) await electronApp.close();
});

// =============================================
// E1: Dashboard yüklenmesi
// =============================================
test('E1: Dashboard should render on app launch', async () => {
  // The titlebar should have the app name
  const titlebar = await window.locator('.titlebar-logo');
  await expect(titlebar).toBeVisible();
  
  // Content area should be loaded with Dashboard content
  const content = await window.locator('#content');
  await expect(content).toBeVisible();
  
  // Page title or XP bar should be present
  const xpBar = await window.locator('.xp-bar-container');
  await expect(xpBar).toBeVisible({ timeout: 5000 });
});

// =============================================
// E2: Sidebar navigasyon
// =============================================
test('E2: Sidebar navigation should switch pages', async () => {
  // Click on Finance nav button (3rd nav button)
  const navButtons = await window.locator('.nav-btn');
  const count = await navButtons.count();
  expect(count).toBeGreaterThanOrEqual(5);
  
  // Click finance button (index 2)
  await navButtons.nth(2).click();
  await window.waitForTimeout(500);
  
  // The finance button should be active
  await expect(navButtons.nth(2)).toHaveClass(/active/);
  
  // Page title should contain finance-related text
  const pageTitle = await window.locator('.page-title');
  const text = await pageTitle.textContent();
  expect(text).toBeTruthy();
  
  // Navigate back to dashboard
  await navButtons.nth(0).click();
  await window.waitForTimeout(500);
  await expect(navButtons.nth(0)).toHaveClass(/active/);
});

// =============================================
// E3: Hızlı harcama ekleme
// =============================================
test('E3: Quick expense should open modal and accept input', async () => {
  // Click the quick expense button
  const quickExpBtn = await window.locator('button', { hasText: '+ Harcama' });
  
  if (await quickExpBtn.isVisible()) {
    await quickExpBtn.click();
    await window.waitForTimeout(300);
    
    // Modal should be visible
    const modal = await window.locator('.modal-overlay');
    await expect(modal).toBeVisible({ timeout: 3000 });
    
    // Fill in amount
    const amountInput = await window.locator('#quick-amount');
    if (await amountInput.isVisible()) {
      await amountInput.fill('25.50');
      
      // Verify the input has the value
      await expect(amountInput).toHaveValue('25.50');
    }
    
    // Close modal via X button or clicking overlay
    const closeBtn = await window.locator('.modal-close');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
    await window.waitForTimeout(300);
  }
});

// =============================================
// E4: Sayfa geçiş animasyonu
// =============================================
test('E4: Page transitions should work for all navigation items', async () => {
  const navButtons = await window.locator('.nav-btn');
  const count = await navButtons.count();
  
  // Click through each nav button
  for (let i = 0; i < Math.min(count, 6); i++) {
    await navButtons.nth(i).click();
    await window.waitForTimeout(600); // Wait for transition
    
    // The clicked button should be active
    await expect(navButtons.nth(i)).toHaveClass(/active/);
    
    // Content should be visible
    const content = await window.locator('#content');
    await expect(content).toBeVisible();
  }
  
  // Return to dashboard
  await navButtons.nth(0).click();
  await window.waitForTimeout(500);
});

// =============================================
// E5: Ayarlar sayfası — tema değiştirme
// =============================================
test('E5: Settings page should allow theme changing', async () => {
  // Navigate to settings (last or second-to-last nav button)
  const navButtons = await window.locator('.nav-btn');
  const count = await navButtons.count();
  
  // Settings is typically the last button
  await navButtons.nth(count - 1).click();
  await window.waitForTimeout(800);
  
  // Check for theme swatches
  const themeSwatches = await window.locator('.theme-swatch');
  const swatchCount = await themeSwatches.count();
  
  if (swatchCount > 1) {
    // Click a different theme
    await themeSwatches.nth(1).click();
    await window.waitForTimeout(300);
    
    // Verify data-theme attribute was set
    const body = await window.locator('body');
    const theme = await body.getAttribute('data-theme');
    expect(theme).toBeTruthy();
    
    // Switch back to default
    await themeSwatches.nth(0).click();
    await window.waitForTimeout(300);
  }
  
  // Navigate back to dashboard
  await navButtons.nth(0).click();
  await window.waitForTimeout(500);
});
