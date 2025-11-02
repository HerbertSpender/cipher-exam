import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.join(__dirname, '..', 'out');

// Create a minimal routes-manifest.json for Vercel
const routesManifest = {
  version: 3,
  pages404: true,
  basePath: '',
  redirects: [],
  rewrites: [],
  headers: [],
};

const manifestPath = path.join(outDir, 'routes-manifest.json');

try {
  fs.writeFileSync(manifestPath, JSON.stringify(routesManifest, null, 2));
  console.log('✅ Created routes-manifest.json');
} catch (error) {
  console.error('❌ Failed to create routes-manifest.json:', error);
  process.exit(1);
}


