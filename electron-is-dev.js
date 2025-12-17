// Simple check for development environment
const isDev = process.env.NODE_ENV === 'development' ||
              (process.defaultApp === true) ||
              (/[\\/]electron/.test(process.execPath));

export default isDev;
