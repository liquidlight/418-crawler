# Building Site Crawler from Source

This guide explains how to build and package the Site Crawler application.

## Prerequisites

- **Node.js:** 18 or higher
- **npm:** 9 or higher (comes with Node.js)
- **Git** (optional, for cloning the repository)

## Installation

1. **Clone or download the repository:**
   ```bash
   git clone <repository-url>
   cd crawler
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Development

### Start Development Server

```bash
npm run start
```

This runs:
- Vite dev server on `http://localhost:5173`
- CORS proxy server on `http://localhost:8080`

Features:
- Hot Module Replacement (HMR) for instant updates
- Fast reloads during development
- Browsable at http://localhost:5173

### Preview Build

```bash
npm run build
npm run preview
```

This builds the app and previews it locally before packaging.

## Building for Production

### Option 1: Automated Build (Recommended)

#### macOS/Linux:
```bash
./build.sh
```

#### Windows:
```bash
build.bat
```

This will:
1. Verify Node.js version
2. Install all dependencies
3. Build the Vue app
4. Create a distribution package
5. Install proxy server dependencies
6. Generate a ZIP archive (if zip is available)

### Option 2: Manual Build Commands

```bash
# Build the production bundle
npm run build

# Create the distribution package
npm run package

# Install proxy dependencies
cd site-crawler-package/proxy-server
npm install --production
cd ../..
```

### Option 3: Single Command

```bash
npm run build:prod
```

## Build Output

### Vite Build (`npm run build`)

Produces:
- `dist/` directory with optimized production bundle
- Minified JavaScript and CSS
- Optimized assets
- Asset hash fingerprinting (for cache busting)

**Output size:** ~80KB gzipped

### Package (`npm run package`)

Produces:
- `site-crawler-package/` directory with:
  - `app/` - Built Vue application
  - `proxy-server/` - CORS proxy server
  - `start.js` - Single-command launcher
  - `package.json` - Production dependencies
  - `README.md` - User documentation
  - `LICENSE` - MIT License
  - Configuration files

## Distribution Formats

### ZIP Archive
```bash
zip -r site-crawler.zip site-crawler-package/
```

### TAR.GZ Archive
```bash
tar -czf site-crawler.tar.gz site-crawler-package/
```

### Docker Container
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY site-crawler-package/ .
RUN npm install
EXPOSE 5173 8080
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t site-crawler .
docker run -p 5173:5173 -p 8080:8080 site-crawler
```

## Project Structure

```
crawler/
├── src/
│   ├── App.vue                 # Main app component
│   ├── main.js                 # Entry point
│   ├── components/             # Vue components
│   ├── composables/            # Composition API hooks
│   ├── services/               # Business logic
│   ├── utils/                  # Utility functions
│   └── styles/                 # Global styles
├── proxy-server/
│   ├── server.js               # CORS proxy server
│   └── package.json
├── public/                      # Static assets
├── dist/                        # Build output (created)
├── site-crawler-package/        # Package output (created)
├── vite.config.js              # Vite configuration
├── package.json                # Project metadata
├── BUILDING.md                 # This file
├── PACKAGING.md                # Packaging guide
├── build.sh                    # Build script (macOS/Linux)
├── build.bat                   # Build script (Windows)
└── README.md                   # Project README
```

## Build Configuration

### Vite Configuration (`vite.config.js`)

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    strictPort: true
  },
  preview: {
    port: 5173
  }
})
```

### Build Options

To customize the build, edit `vite.config.js`:

```javascript
export default defineConfig({
  build: {
    outDir: 'dist',
    minify: 'terser',  // or 'esbuild'
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'idb']
        }
      }
    }
  }
})
```

## Troubleshooting

### Build Fails with "Cannot find module"

Clear and reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Port 5173 or 8080 Already in Use

Find and kill the process:
```bash
# macOS/Linux
lsof -ti:5173 | xargs kill -9
lsof -ti:8080 | xargs kill -9

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

Or change the port in `vite.config.js`.

### Package is Too Large

The package includes `node_modules` for the proxy server. To reduce size:

1. Use a pre-built binary package
2. Document Node.js/npm requirements
3. Provide installation instructions separately

### Build Output Not Optimized

Ensure you're building for production:
```bash
npm run build  # NOT npm run dev
```

Check the build output:
```bash
npm run preview
```

## Performance Optimization

### Current Optimizations

- ✅ Vue 3 with Composition API (smaller bundle)
- ✅ Tree shaking (unused code removed)
- ✅ Code minification (JS and CSS)
- ✅ Asset optimization (images, fonts)
- ✅ Lazy loading of components (if applicable)

### Further Optimization Options

1. **Code Splitting:**
   ```javascript
   // In a component
   const HeavyComponent = defineAsyncComponent(() =>
     import('./HeavyComponent.vue')
   )
   ```

2. **Image Optimization:**
   - Use WebP format with fallbacks
   - Compress with tools like TinyPNG

3. **Bundle Analysis:**
   ```bash
   npm install -D rollup-plugin-visualizer
   # Add to vite.config.js and rebuild
   ```

## Version Management

1. Update version in `package.json`:
   ```json
   "version": "0.2.0"
   ```

2. Tag the build:
   ```bash
   ./build.sh
   zip -r site-crawler-v0.2.0.zip site-crawler-package/
   git tag v0.2.0
   git push origin v0.2.0
   ```

3. Create a release on GitHub

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/build.yml`:

```yaml
name: Build Release
on:
  push:
    tags:
      - 'v*'
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run build:prod
      - uses: softprops/action-gh-release@v1
        with:
          files: site-crawler-*.zip
```

## Deployment

### Local Testing
```bash
cd site-crawler-package
npm install
npm start
```

### Server Deployment
1. Upload `site-crawler-package/` to server
2. Install Node.js 18+
3. Run: `npm install && npm start`

### Docker Deployment
```bash
docker build -t site-crawler .
docker run -d -p 5173:5173 -p 8080:8080 site-crawler
```

### Cloud Platforms

#### Heroku
```bash
# Add Procfile:
# web: npm start
git push heroku main
```

#### AWS/Azure/Google Cloud
Deploy the package directory as a Node.js application with necessary ports exposed.

## Maintenance

### Regular Updates

1. **Update dependencies:**
   ```bash
   npm update
   npm audit fix
   ```

2. **Test build:**
   ```bash
   npm run build
   ```

3. **Commit and tag:**
   ```bash
   git add .
   git commit -m "chore: update dependencies"
   git tag v0.2.1
   ```

## License

All build outputs and source code are released under the MIT License.

---

**For user installation instructions, see README.md**
