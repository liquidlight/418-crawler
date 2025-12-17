# Available Scripts & Commands

Quick reference for all available npm scripts and shell commands.

## npm Scripts

### Development

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server with HMR (http://localhost:5173) |
| `npm run start` | Start both proxy and dev servers (recommended for development) |
| `npm run proxy` | Start only the CORS proxy server (http://localhost:8080) |
| `npm run preview` | Preview the built app locally |

### Building & Packaging

| Command | Purpose |
|---------|---------|
| `npm run build` | Build Vue app for production (creates `dist/` directory) |
| `npm run package` | Create distribution package (creates `site-crawler-package/`) |
| `npm run build:prod` | Run both `build` and `package` commands |
| `npm run start:prod` | Run production build preview (requires `npm run build` first) |

## Shell Scripts

### macOS/Linux: `./build.sh`

Complete automated build and packaging script:

```bash
./build.sh
```

**What it does:**
1. Checks Node.js version (requires 18+)
2. Installs npm dependencies
3. Builds production Vue app
4. Creates distribution package
5. Installs proxy server dependencies
6. Creates ZIP archive (if zip utility available)

**Output:** `site-crawler-package/` directory + optional ZIP file

### Windows: `build.bat`

Windows version of the build script:

```bash
build.bat
```

Same functionality as `build.sh` but for Windows command prompt.

## Workflow Examples

### 1. Development Workflow

Start fresh development:
```bash
npm install           # One time only
npm run start        # Runs dev server + proxy
# Open http://localhost:5173
```

### 2. Production Build & Test

```bash
npm run build        # Build production bundle
npm run preview      # Test the build locally
```

### 3. Complete Package Creation (Quick)

```bash
npm run build:prod   # Build + Package in one command
```

### 4. Complete Package Creation (Full)

macOS/Linux:
```bash
./build.sh          # Complete automated process
```

Windows:
```bash
build.bat           # Complete automated process
```

### 5. Create Distribution Archive

After packaging:

```bash
# ZIP archive
zip -r site-crawler.zip site-crawler-package/

# Or with version
zip -r site-crawler-v0.1.0.zip site-crawler-package/

# TAR.GZ archive (Unix/Linux/macOS)
tar -czf site-crawler.tar.gz site-crawler-package/
```

## Command Details

### Development Commands

#### `npm run dev`
- Starts Vite dev server on port 5173
- Enables Hot Module Replacement (HMR)
- Fast rebuild on file changes
- **Note:** Requires proxy server running separately
  ```bash
  npm run proxy  # In another terminal
  ```

#### `npm run start` (Recommended)
- Runs both `npm run proxy` and `npm run dev` concurrently
- Single terminal, both services running
- Automatic restart on exit

#### `npm run preview`
- Previews built production bundle
- Serves from `dist/` directory
- Useful for testing before packaging
- Requires `npm run build` first

### Build Commands

#### `npm run build`
Creates optimized production bundle:
- Minified JavaScript and CSS
- Asset optimization
- Hash-based file names (cache busting)
- Output: `dist/` directory (~80KB gzipped)

**Configuration:** See `vite.config.js`

#### `npm run package`
Creates distribution package directory:
- Copies built app to `site-crawler-package/app/`
- Copies proxy server code
- Generates documentation
- Creates launcher script

**Output:** `site-crawler-package/` directory (ready for distribution)

#### `npm run build:prod`
Convenience command that runs:
```bash
npm run build && npm run package
```

Use this for creating production packages.

## Using the Packaged App

After running build scripts, use the package:

```bash
cd site-crawler-package
npm install      # Install dependencies (first time only)
npm start        # Start the application
```

Then open: `http://localhost:5173`

## Environment Variables

Optional configuration via `.env` file:

```env
# Development
VITE_API_URL=http://localhost:8080

# Production
VITE_API_URL=http://your-domain.com:8080
```

## Debugging

### Enable Debug Output

```bash
# Debug Vite
DEBUG=vite npm run dev

# Debug npm
npm run build --loglevel=verbose
```

### View Build Analysis

Check what's in your bundle:

```bash
npm install -D rollup-plugin-visualizer

# Add to vite.config.js:
# import { visualizer } from "rollup-plugin-visualizer"
# Then run: npm run build
# Open dist/stats.html
```

## Troubleshooting Scripts

### Clear Cache & Rebuild

```bash
rm -rf node_modules dist site-crawler-package
npm install
npm run build:prod
```

### Check Node/npm Versions

```bash
node --version  # Should be 18+
npm --version   # Should be 9+
```

### Kill Process on Port

```bash
# Port 5173
lsof -ti:5173 | xargs kill -9

# Port 8080
lsof -ti:8080 | xargs kill -9
```

## CI/CD Integration

All scripts are compatible with CI/CD systems:

```bash
# GitHub Actions, GitLab CI, Jenkins, etc.
npm ci            # Clean install
npm run build:prod # Build for production
npm test          # Run tests (when available)
```

## Related Documentation

- **BUILDING.md** - Detailed build configuration guide
- **PACKAGING.md** - Packaging and distribution guide
- **README.md** - User documentation
- **vite.config.js** - Build configuration file

---

**Version:** 0.1.0
**Last Updated:** 2024
