import fs from 'fs';

import react from '@vitejs/plugin-react';
import { NodePackageImporter } from 'sass';
import { defineConfig } from 'vite';
import YAML from 'yaml';

// Version/name come from THIS package's own package.json (no reach-up into the
// server repo), so the UI builds standalone.
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

// Dev-server settings come from this package's own config.yaml (not a dotfile,
// not hardcoded). They only affect the local dev server; the built SPA talks to
// whatever backend serves it at runtime.
const loadDevConfig = () => {
  const configPath = './config.yaml';
  if (fs.existsSync(configPath)) {
    return YAML.parse(fs.readFileSync(configPath, 'utf8'));
  }
  return {};
};

const devConfig = loadDevConfig();
const devPort = devConfig.server?.port || 3000;
const apiTarget = devConfig.server?.api_target || 'http://localhost:3443';

export default defineConfig({
  define: {
    // Replaced at build time from this package's own package.json
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_NAME__: JSON.stringify(pkg.name),
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern',
        importers: [new NodePackageImporter()],
      },
    },
  },
  plugins: [react()],
  base: '/ui/',
  publicDir: 'public',
  server: {
    port: devPort,
    host: '0.0.0.0',
    https: false, // Disable HTTPS for dev server during build
    hmr: {
      port: devPort,
      host: 'localhost',
    },
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    sourcemap: false, // Disable source maps for production to avoid source map errors
    chunkSizeWarningLimit: 1000, // Increase warning limit to 1MB for complex applications
    commonjsOptions: {
      defaultIsModuleExports: true, // Fix for Vite 4.0.3+ CommonJS handling changes
    },
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: assetInfo => {
          // Keep favicons at root level
          if (assetInfo.name === 'favicon.ico' || assetInfo.name === 'dark-favicon.ico') {
            return '[name][extname]';
          }
          return `assets/[name].[ext]`;
        },
        manualChunks: id => {
          // Simplify chunking to avoid dependency issues
          // Only split out the largest, most independent libraries

          // Highcharts (large, completely independent)
          // Include custom Highcharts wrapper to ensure proper loading order
          if (
            id.includes('node_modules/highcharts') ||
            id.includes('highcharts-react-official') ||
            id.includes('src/components/Highcharts.jsx')
          ) {
            return 'charts';
          }

          // Terminal libraries (large, independent)
          if (id.includes('node_modules/react-xtermjs')) {
            return 'terminal';
          }

          // IronRDP browser client (WASM-carrying, large, independent) —
          // loaded only by the RDP console.
          if (id.includes('node_modules/@devolutions')) {
            return 'rdp-console';
          }

          // Flow/diagram libraries (large, independent)
          if (
            id.includes('node_modules/@xyflow') ||
            id.includes('node_modules/elkjs') ||
            id.includes('node_modules/dagre')
          ) {
            return 'flow-diagrams';
          }

          // React-Bootstrap UI framework + its runtime deps. Used app-wide (shared modals,
          // dropdowns, forms, tabs, etc.), so split it out of vendor to keep that chunk
          // under the size limit.
          if (
            id.includes('node_modules/react-bootstrap') ||
            id.includes('node_modules/@restart') ||
            id.includes('node_modules/@popperjs') ||
            id.includes('node_modules/dom-helpers')
          ) {
            return 'react-bootstrap';
          }

          // Everything else stays together in vendor to avoid dependency issues
          // This includes React, Router, Axios, utilities, etc.
          if (id.includes('node_modules')) {
            return 'vendor';
          }

          return undefined;
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      // Terminal libraries that need special handling
      'react-xtermjs',
      '@xterm/addon-fit',
      '@xterm/addon-attach',
      '@xterm/addon-web-links',
      '@xterm/addon-serialize',
      '@xterm/addon-clipboard',
      '@xterm/addon-search',
      '@xterm/addon-webgl',
    ],
    // wasm-bindgen output resolves its .wasm beside the JS via
    // import.meta.url — dev prebundling would relocate the JS and break it.
    exclude: ['@devolutions/iron-remote-desktop', '@devolutions/iron-remote-desktop-rdp'],
  },
});
