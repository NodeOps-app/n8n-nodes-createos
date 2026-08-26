import { build } from 'esbuild';
import { copyFile, rename } from 'node:fs/promises';

const entryPoint = 'dist/nodes/CreateOS/CreateOs.node.js';
const outfile = 'dist/nodes/CreateOS/CreateOs.node.bundle.js';

await build({
  bundle: true,
  entryPoints: [entryPoint],
  external: ['n8n-workflow'],
  format: 'cjs',
  outfile,
  platform: 'node',
  sourcemap: true,
  target: 'node20',
});

await rename(outfile, entryPoint);
await rename(`${outfile}.map`, `${entryPoint}.map`);
await copyFile('nodes/CreateOS/CreateOs.node.json', 'dist/nodes/CreateOS/CreateOs.node.json');
