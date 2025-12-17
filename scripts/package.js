#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const packageDir = path.join(rootDir, 'site-crawler-package');

console.log('📦 Packaging Site Crawler for distribution...\n');

// Clean up old package directory
if (fs.existsSync(packageDir)) {
  fs.rmSync(packageDir, { recursive: true, force: true });
  console.log('✓ Cleaned old package directory');
}

// Create package structure
fs.mkdirSync(packageDir, { recursive: true });
fs.mkdirSync(path.join(packageDir, 'proxy-server'), { recursive: true });
fs.mkdirSync(path.join(packageDir, 'app'), { recursive: true });

// Copy built app
if (fs.existsSync(distDir)) {
  const files = fs.readdirSync(distDir);
  files.forEach(file => {
    const src = path.join(distDir, file);
    const dest = path.join(packageDir, 'app', file);
    if (fs.statSync(src).isDirectory()) {
      fs.cpSync(src, dest, { recursive: true });
    } else {
      fs.copyFileSync(src, dest);
    }
  });
  console.log('✓ Copied built Vue app to package');
} else {
  console.error('❌ dist directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Copy proxy server
const proxyFiles = ['server.js', 'package.json', 'node_modules'];
proxyFiles.forEach(file => {
  const src = path.join(rootDir, 'proxy-server', file);
  const dest = path.join(packageDir, 'proxy-server', file);
  if (fs.existsSync(src)) {
    if (fs.statSync(src).isDirectory()) {
      fs.cpSync(src, dest, { recursive: true });
    } else {
      fs.copyFileSync(src, dest);
    }
  }
});
console.log('✓ Copied proxy server');

// Create package.json for production
const prodPackageJson = {
  name: "site-crawler",
  version: "0.1.0",
  type: "module",
  description: "Site Crawler - Crawl websites locally without internet access",
  scripts: {
    "start": "node start.js",
    "proxy": "node proxy-server/server.js",
    "app": "npx http-server app -p 5173 --cors"
  },
  dependencies: {
    "http-server": "^14.1.0"
  }
};

fs.writeFileSync(
  path.join(packageDir, 'package.json'),
  JSON.stringify(prodPackageJson, null, 2)
);
console.log('✓ Created production package.json');

// Create start.js for easy launching
const startScript = `#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting Site Crawler...');
console.log('');
console.log('Starting CORS Proxy Server on port 8080...');
const proxy = spawn('node', ['proxy-server/server.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

console.log('Starting Web Server on port 5173...');
setTimeout(() => {
  const app = spawn('npx', ['http-server', 'app', '-p', '5173', '--cors'], {
    cwd: __dirname,
    stdio: 'inherit'
  });

  process.on('SIGINT', () => {
    console.log('\\n\\nShutting down servers...');
    proxy.kill();
    app.kill();
    process.exit(0);
  });
}, 1000);
`;

fs.writeFileSync(
  path.join(packageDir, 'start.js'),
  startScript
);
fs.chmodSync(path.join(packageDir, 'start.js'), '755');
console.log('✓ Created start.js launcher');

// Create README
const readme = `# Site Crawler - Packaged Distribution

A browser-based web crawler for analyzing website structure locally without internet access.

## Features

- ✅ Crawl websites with BFS algorithm
- ✅ Local-first - stores data in IndexedDB
- ✅ Persistent crawl state - resume from page refresh
- ✅ View crawl results in real-time
- ✅ Export results as JSON
- ✅ Filter by status codes and file types
- ✅ View page details including headers, links, and assets

## Installation

1. Extract this package
2. Install dependencies: \`npm install\`

## Running

### Option 1: Single Command (Recommended)
\`\`\`bash
npm start
\`\`\`

This will start both the proxy server and web app.

### Option 2: Manual
Start the proxy server:
\`\`\`bash
npm run proxy
\`\`\`

In a new terminal, start the web app:
\`\`\`bash
npm run app
\`\`\`

## Accessing the App

Once started, open your browser and navigate to:
- **App:** http://localhost:5173
- **Proxy Server:** http://localhost:8080/health

## How to Use

1. Enter a website URL (e.g., https://example.com)
2. Click "Crawl" to start the crawl
3. Monitor progress in real-time
4. Use Pause/Resume/Stop to control the crawl
5. View results in the table below
6. Export results as JSON using the Export button

## Architecture

- **Frontend:** Vue 3 with Composition API
- **Storage:** IndexedDB for local persistence
- **Proxy:** Node.js CORS proxy for cross-origin requests
- **Server:** Vite preview server for production serving

## System Requirements

- Node.js 18+
- Modern web browser with IndexedDB support
- Internet access during crawls (for the crawler to reach websites)

## Troubleshooting

### Port Already in Use
If port 8080 or 5173 is already in use, the services may fail to start.
Kill the processes:
- macOS/Linux: \`lsof -ti:8080 | xargs kill -9\`
- Windows: \`netstat -ano | findstr :8080\`

### Crawl Timeouts
Long-running crawls may experience network timeouts. Crawls are persisted, so you can pause and resume.

### Database Issues
Clear IndexedDB data:
- Open DevTools (F12)
- Go to Application/Storage > IndexedDB
- Delete the "site-crawler-db" database

## License

See LICENSE file in the root directory.

## Support

For issues or questions, refer to the project documentation.
`;

fs.writeFileSync(
  path.join(packageDir, 'README.md'),
  readme
);
console.log('✓ Created README.md');

// Create a simple LICENSE file
const license = `MIT License

Copyright (c) 2024 Site Crawler Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
`;

fs.writeFileSync(
  path.join(packageDir, 'LICENSE'),
  license
);
console.log('✓ Created LICENSE file');

// Create .gitignore for the package
const gitignore = `node_modules/
.DS_Store
*.log
.env
.env.local
`;

fs.writeFileSync(
  path.join(packageDir, '.gitignore'),
  gitignore
);
console.log('✓ Created .gitignore');

console.log('\n✅ Packaging complete!');
console.log(`\n📁 Package created at: ${packageDir}`);
console.log('\n📋 Next steps:');
console.log('  1. cd site-crawler-package');
console.log('  2. npm install');
console.log('  3. npm start');
console.log('\n🌐 Then open: http://localhost:5173\n');
