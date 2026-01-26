import { chromium } from 'playwright-core';
import { readdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

function getTokenFromConfig() {
  const configPath = join(process.env.HOME, '.clawdbot/clawdbot.json');
  if (!existsSync(configPath)) {
    throw new Error('Config file not found at ~/.clawdbot/clawdbot.json');
  }
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  const token = config?.gateway?.auth?.token;
  if (!token) {
    throw new Error('No gateway.auth.token found in config');
  }
  return token;
}

const TOKEN = getTokenFromConfig();
const BASE_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:18789';

function findChromiumExecutable() {
  const cacheDir = join(process.env.HOME, '.cache/ms-playwright');
  if (!existsSync(cacheDir)) return undefined;

  const dirs = readdirSync(cacheDir)
    .filter(d => d.startsWith('chromium-') && !d.includes('headless'))
    .sort()
    .reverse();

  if (dirs.length === 0) return undefined;

  const chromiumDir = join(cacheDir, dirs[0]);
  const linuxPath = join(chromiumDir, 'chrome-linux64/chrome');
  const macPath = join(chromiumDir, 'chrome-mac/Chromium.app/Contents/MacOS/Chromium');

  if (existsSync(linuxPath)) return linuxPath;
  if (existsSync(macPath)) return macPath;

  return undefined;
}

async function takeScreenshot() {
  const executablePath = findChromiumExecutable();
  console.log('Using chromium:', executablePath || 'bundled');

  const launchOptions = { headless: true };
  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });

  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE:', msg.text()));

  // Navigate and set token
  await page.goto(`${BASE_URL}/?token=${TOKEN}`);
  await page.waitForTimeout(2000);

  await page.evaluate((token) => {
    const settings = JSON.parse(localStorage.getItem('clawdbot-control-ui-settings') || '{}');
    settings.token = token;
    localStorage.setItem('clawdbot-control-ui-settings', JSON.stringify(settings));
  }, TOKEN);

  // Navigate to analytics
  await page.goto(`${BASE_URL}/analytics`);
  await page.waitForTimeout(4000);

  // Click refresh
  const refreshButton = page.locator('button', { hasText: 'Refresh' });
  try {
    await refreshButton.click();
    console.log('Clicked refresh');
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log('Could not click refresh:', e.message);
  }

  const outputPath = process.argv[2] || '/tmp/analytics-screenshot.png';
  await page.screenshot({ path: outputPath, fullPage: false });
  console.log('Screenshot saved to', outputPath);

  await browser.close();
}

takeScreenshot().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
