import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const distServerPath = path.join(__dirname, 'dist', 'server.cjs');
const distIndexPath = path.join(__dirname, 'dist', 'index.html');
const srcIndexPath = path.join(__dirname, 'index.html');

const needsRebuild = () => {
  if (!fs.existsSync(distServerPath) || !fs.existsSync(distIndexPath)) return true;
  try {
    const distTime = fs.statSync(distIndexPath).mtimeMs;
    const srcIndexTime = fs.statSync(srcIndexPath).mtimeMs;
    if (srcIndexTime > distTime) return true;
  } catch {
    return true;
  }
  return false;
};

if (needsRebuild()) {
  console.log('[Render Startup] dist/ desactualizado o no encontrado. Compilando proyecto automáticamente (npm run build)...');
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
  } catch (err) {
    console.error('[Render Startup] Error al compilar con npm run build:', err);
    process.exit(1);
  }
}

const require = createRequire(import.meta.url);
require(distServerPath);
