# Site Crawler - Packaging Guide

This guide explains how to build and package the Site Crawler application for distribution.

## Quick Start

```bash
npm run build:prod
```

This single command will:
1. Build the Vue app production bundle
2. Create a distributable package directory
3. Include all necessary files and documentation

## Available Commands

### `npm run build`
Builds the Vue app production bundle in the `dist/` directory.

### `npm run package`
Creates a `site-crawler-package/` directory with:
- Built app files
- Proxy server code
- All dependencies
- Documentation and license files

### `npm run build:prod`
Runs both build and package commands in sequence. **Use this for distribution.**

### `npm run start:prod`
Runs the production build locally for testing (requires `npm run build` first).

### `npm run preview`
Previews the built app locally before packaging.

## Package Structure

After running `npm run build:prod`, you'll find:

```
site-crawler-package/
├── app/                          # Built Vue app
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js      # Main app bundle
│   │   └── style-[hash].css     # App styles
│   └── favicon.ico
├── proxy-server/                 # CORS proxy server
│   ├── server.js
│   ├── package.json
│   └── node_modules/
├── start.js                      # Single-command launcher
├── package.json                  # Production dependencies
├── README.md                      # User documentation
├── LICENSE                        # MIT License
├── .gitignore
└── PACKAGING.md                   # This file
```

## Distribution Methods

### 1. ZIP Archive
```bash
# After packaging, create a ZIP file:
zip -r site-crawler.zip site-crawler-package/
```

### 2. TAR Archive
```bash
# For Unix/Linux/macOS:
tar -czf site-crawler.tar.gz site-crawler-package/
```

### 3. Docker Container (Optional)
Create a `Dockerfile` in the package directory:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 5173 8080

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t site-crawler .
docker run -p 5173:5173 -p 8080:8080 site-crawler
```

## Installation Instructions for Users

1. **Extract the package:**
   ```bash
   unzip site-crawler.zip
   cd site-crawler-package
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application:**
   ```bash
   npm start
   ```

4. **Access the app:**
   - Open browser to: http://localhost:5173
   - Proxy health check: http://localhost:8080/health

## Build Configuration

### Vite Configuration (`vite.config.js`)

The app uses Vite for fast development and optimized production builds:
- **Development:** Hot Module Replacement (HMR) for instant updates
- **Production:** Minified bundles, tree-shaking, code splitting

### Production Build Optimizations

The production build includes:
- JavaScript minification
- CSS minification
- Asset optimization
- Lazy loading for better performance
- Sourcemaps for debugging (optional)

## Version Management

When releasing a new version:

1. Update version in `package.json`:
   ```json
   "version": "0.2.0"
   ```

2. Build and package:
   ```bash
   npm run build:prod
   ```

3. Create distribution archive:
   ```bash
   zip -r site-crawler-v0.2.0.zip site-crawler-package/
   ```

4. Add release notes and publish

## Troubleshooting

### Build Fails
- Ensure Node.js 18+ is installed: `node --version`
- Clear node_modules: `rm -rf node_modules && npm install`
- Check for disk space issues

### Package Command Fails
- Ensure `npm run build` completed successfully first
- Check permissions on `site-crawler-package/` directory
- Verify proxy-server directory exists with all files

### App Won't Start After Packaging
- Run `npm install` in the package directory
- Verify ports 5173 and 8080 are available
- Check Node.js version compatibility

## Performance Notes

The packaged app:
- **App Bundle Size:** ~80KB (gzipped)
- **Startup Time:** <1 second
- **Memory Usage:** <50MB base + crawl data
- **Concurrent Requests:** 5 (configurable)

## Security Considerations

- CORS proxy is configured for localhost only by default
- IndexedDB data is browser-local (not transmitted)
- No analytics or telemetry
- No external API calls (except target website requests)

For production deployments:
- Configure CORS proxy origin restrictions
- Use HTTPS
- Review proxy-server/server.js for your use case

## Environment Variables (Optional)

Create a `.env` file in the package directory:

```env
# Proxy Server
PROXY_PORT=8080
PROXY_CORS_ORIGIN=http://localhost:5173

# App Server
APP_PORT=5173
```

## License

The packaged application is released under the MIT License.
All source code and built files retain their original licensing.

---

**For more information, see README.md in the package directory.**
