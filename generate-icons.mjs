import fs from 'fs';
import path from 'path';

const iconsDir = './assets/icons';

// Create directory
fs.mkdirSync(iconsDir, { recursive: true });

// Create a simple 1-byte placeholder file - this will be replaced anyway
const placeholder = Buffer.from([0x00]);

fs.writeFileSync(path.join(iconsDir, 'icon.png'), placeholder);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), placeholder);
fs.writeFileSync(path.join(iconsDir, 'icon.icns'), placeholder);

console.log('✓ Created placeholder icon files');
