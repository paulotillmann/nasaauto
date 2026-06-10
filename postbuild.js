import fs from 'fs';
import path from 'path';

const src = path.resolve('dist/index.html');
const dest = path.resolve('dist/404.html');

try {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('Successfully copied index.html to 404.html for Cloudflare SPA routing.');
  } else {
    console.warn('dist/index.html not found!');
  }
} catch (err) {
  console.error('Error copying index.html to 404.html:', err.message);
}
