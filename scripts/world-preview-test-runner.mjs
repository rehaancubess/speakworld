import { spawn } from 'node:child_process';
import { createServer } from 'vite';

const requested = process.argv.slice(2);
const tests = requested.length ? requested : [
  'scripts/japan-preview-test.mjs',
  'scripts/exploration-preview-test.mjs',
];

const server = await createServer({
  root: process.cwd(),
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  logLevel: 'warn',
});

async function runTest(filename) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [filename], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        BASE_URL: 'http://127.0.0.1:5173/',
        // SwiftShader is deliberately CPU-only and is used here for correctness,
        // not as a proxy for the user's hardware-accelerated WebGL frame rate.
        NIMBU_HEADLESS_FPS_FLOOR: process.env.NIMBU_HEADLESS_FPS_FLOOR ?? '4',
      },
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${filename} exited with code ${code}`));
    });
  });
}

try {
  await server.listen();
  for (const test of tests) await runTest(test);
} finally {
  await server.close();
}
