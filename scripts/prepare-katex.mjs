import { mkdir, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const katexDistDir = path.join(rootDir, 'node_modules', 'katex', 'dist');
const targetDir = path.join(rootDir, 'apps', 'web', 'vendor', 'katex');

await mkdir(targetDir, { recursive: true });
await cp(path.join(katexDistDir, 'katex.min.css'), path.join(targetDir, 'katex.min.css'));
await cp(path.join(katexDistDir, 'katex.min.js'), path.join(targetDir, 'katex.min.js'));
await cp(path.join(katexDistDir, 'fonts'), path.join(targetDir, 'fonts'), { recursive: true });
