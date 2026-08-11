import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

console.log('Installing Puppeteer Chrome for invoice PDF generation...');

try {
  execSync('npx puppeteer browsers install chrome', {
    stdio: 'inherit',
    cwd: root,
  });
  console.log('Puppeteer Chrome installed successfully.');
} catch (error) {
  console.warn('Could not install bundled Chrome. Server will use branded PDFKit fallback if needed.');
  console.warn(error.message);
}
