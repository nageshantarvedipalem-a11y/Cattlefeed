import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(fileURLToPath(import.meta.url));
const publicIndex = join(root, '../public/index.html');

if (existsSync(publicIndex)) {
  console.log('SPA public/ is present — Hostinger will serve the ERP UI from this Node app.');
} else {
  console.log('No backend/public yet. API-only mode. Run the frontend build + copy before deploy if UI should be served here.');
}
