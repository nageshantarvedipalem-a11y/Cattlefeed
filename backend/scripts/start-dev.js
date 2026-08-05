import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

try {
  const pids = execSync('lsof -t -i:5001 2>/dev/null || true', { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
  for (const pid of pids) {
    try {
      process.kill(Number(pid), 'SIGTERM');
    } catch {
      /* already stopped */
    }
  }
  if (pids.length) {
    execSync('sleep 1');
  }
} catch {
  /* port free */
}

const server = spawn('node', ['src/server.js'], {
  cwd: root,
  stdio: 'inherit',
});

server.on('exit', (code) => process.exit(code ?? 0));
