import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'backend');
process.chdir(backendDir);
await import('../backend/src/processGuards.js');
await import('../backend/src/server.js');
