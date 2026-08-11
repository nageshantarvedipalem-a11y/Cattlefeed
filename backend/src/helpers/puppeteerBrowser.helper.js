import { existsSync } from 'fs';
import puppeteer from 'puppeteer-core';

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

const BASE_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--single-process',
];

let chromiumModulePromise = null;

const loadChromiumModule = async () => {
  if (!chromiumModulePromise) {
    chromiumModulePromise = import('@sparticuz/chromium').catch((error) => {
      chromiumModulePromise = null;
      throw error;
    });
  }
  return chromiumModulePromise;
};

export const resolveChromeExecutable = async () => {
  for (const candidate of CHROME_CANDIDATES) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  if (process.platform === 'linux' || process.env.USE_SPARTICUZ_CHROMIUM === 'true') {
    try {
      const chromium = await loadChromiumModule();
      chromium.setGraphicsMode = false;
      const executablePath = await chromium.executablePath();
      if (executablePath && existsSync(executablePath)) {
        return executablePath;
      }
    } catch {
      /* bundled serverless chromium unavailable */
    }
  }

  return null;
};

export const launchBrowser = async () => {
  const executablePath = await resolveChromeExecutable();
  if (!executablePath) {
    throw new Error(
      'Chrome/Chromium is not available for styled invoice PDF generation. Install Chrome locally or redeploy backend with @sparticuz/chromium.'
    );
  }

  const launchOptions = {
    headless: true,
    executablePath,
    args: [...BASE_LAUNCH_ARGS],
  };

  if (process.platform === 'linux' || process.env.USE_SPARTICUZ_CHROMIUM === 'true') {
    try {
      const chromium = await loadChromiumModule();
      launchOptions.args = [...new Set([...chromium.args, ...launchOptions.args])];
      launchOptions.defaultViewport = chromium.defaultViewport;
      launchOptions.headless = chromium.headless;
    } catch {
      /* use base launch options */
    }
  }

  return puppeteer.launch(launchOptions);
};
