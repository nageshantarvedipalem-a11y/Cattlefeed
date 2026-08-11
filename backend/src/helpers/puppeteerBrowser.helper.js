import { existsSync } from 'fs';
import puppeteer from 'puppeteer-core';
import puppeteerFull from 'puppeteer';
import { logger } from '../utils/logger.js';

const CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

const BASE_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
];

let chromiumModulePromise = null;

const loadChromiumModule = async () => {
  if (!chromiumModulePromise) {
    chromiumModulePromise = import('@sparticuz/chromium').then((mod) => mod.default || mod);
  }
  return chromiumModulePromise;
};

const tryLaunch = async (launchOptions) => puppeteer.launch(launchOptions);

export const resolveChromeExecutable = async () => {
  for (const candidate of CHROME_CANDIDATES) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    const bundled = puppeteerFull.executablePath();
    if (bundled && existsSync(bundled)) {
      return bundled;
    }
  } catch {
    /* bundled browser not installed */
  }

  if (process.platform === 'linux' || process.env.USE_SPARTICUZ_CHROMIUM === 'true') {
    try {
      const chromium = await loadChromiumModule();
      chromium.setGraphicsMode = false;
      return await chromium.executablePath();
    } catch {
      /* sparticuz unavailable */
    }
  }

  return null;
};

export const launchBrowser = async () => {
  const errors = [];

  for (const candidate of CHROME_CANDIDATES) {
    if (!candidate || !existsSync(candidate)) continue;
    try {
      return await tryLaunch({
        headless: true,
        executablePath: candidate,
        args: BASE_ARGS,
      });
    } catch (error) {
      errors.push(`system (${candidate}): ${error.message}`);
    }
  }

  try {
    const bundled = puppeteerFull.executablePath();
    if (bundled) {
      return await tryLaunch({
        headless: true,
        executablePath: bundled,
        args: BASE_ARGS,
      });
    }
  } catch (error) {
    errors.push(`puppeteer bundled: ${error.message}`);
  }

  if (process.platform === 'linux' || process.env.USE_SPARTICUZ_CHROMIUM === 'true') {
    try {
      const chromium = await loadChromiumModule();
      chromium.setGraphicsMode = false;
      const executablePath = await chromium.executablePath();
      return await tryLaunch({
        args: [...new Set([...chromium.args, ...BASE_ARGS])],
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: chromium.headless ?? true,
      });
    } catch (error) {
      errors.push(`sparticuz: ${error.message}`);
    }
  }

  const detail = errors.length ? errors.join('; ') : 'no browser candidates';
  logger.error(`Invoice PDF browser launch failed: ${detail}`);
  throw new Error(`Chrome/Chromium unavailable (${detail})`);
};
