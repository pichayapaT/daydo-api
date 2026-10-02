import { spawn, spawnSync } from 'node:child_process';

const node = process.execPath;
const compilation = spawnSync(node, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], { stdio: 'inherit' });
if (compilation.status !== 0) process.exit(compilation.status || 1);
const children = [
  spawn(node, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json', '--watch', '--preserveWatchOutput'], { stdio: 'inherit' }),
  spawn(node, ['--watch', 'dist/main.js'], { stdio: 'inherit' }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => process.exit(code), 1000);
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
for (const child of children) child.on('exit', code => stop(code || 0));
