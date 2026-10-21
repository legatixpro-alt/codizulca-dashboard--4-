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
const watchedSourcePaths = [
  path.join(__dirname, 'index.html'),
  path.join(__dirname, 'server.ts'),
  path.join(__dirname, 'src', 'lib', 'supabase.ts'),
  path.join(__dirname, 'src', 'lib', 'campoService.ts'),
  path.join(__dirname, 'src', 'lib', 'checkinsService.ts'),
];

const needsRebuild = () => {
  if (!fs.existsSync(distServerPath) || !fs.existsSync(distIndexPath)) return true;
  try {
    const distServerTime = fs.statSync(distServerPath).mtimeMs;
    const distIndexTime = fs.statSync(distIndexPath).mtimeMs;
    const minDistTime = Math.min(distServerTime, distIndexTime);
    for (const srcPath of watchedSourcePaths) {
      if (fs.existsSync(srcPath) && fs.statSync(srcPath).mtimeMs > minDistTime) {
        return true;
      }
    }
    const serverCode = fs.readFileSync(distServerPath, 'utf8');
    if (serverCode.includes('import_meta.env.')) {
      return true;
    }
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
