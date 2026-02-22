import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load .env, .env.local, .env.[mode], .env.[mode].local from project root.
    // process.env vars (e.g. from GitHub Actions secrets) take priority over .env files.
    const envFromFile = loadEnv(mode, process.cwd(), 'VITE_');

    // Merge: process.env takes priority (CI secrets), then .env file values
    const env = { ...envFromFile, ...Object.fromEntries(
      Object.entries(process.env).filter(([k]) => k.startsWith('VITE_'))
    )};

    return {
      envPrefix: 'VITE_',
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            secure: false,
          }
        }
      },
      plugins: [
        react(),
        // Rollup (production) enforces package exports maps strictly — these
        // BlockSuite deep paths exist on disk but are NOT listed in the exports
        // map, so Rollup rejects them with "Missing specifier" at build time.
        // Returning an absolute path from resolveId() bypasses the exports map
        // check entirely (Rollup only validates exports for bare specifiers).
        {
          name: 'blocksuite-deep-imports',
          enforce: 'pre' as const,
          resolveId(id: string) {
            const map: Record<string, string> = {
              '@blocksuite/presets/dist/editors/page-editor.js':
                path.resolve('./node_modules/@blocksuite/presets/dist/editors/page-editor.js'),
              '@blocksuite/presets/dist/editors/edgeless-editor.js':
                path.resolve('./node_modules/@blocksuite/presets/dist/editors/edgeless-editor.js'),
              '@blocksuite/blocks/dist/_specs/preset/page-specs.js':
                path.resolve('./node_modules/@blocksuite/blocks/dist/_specs/preset/page-specs.js'),
              '@blocksuite/blocks/dist/_specs/preset/edgeless-specs.js':
                path.resolve('./node_modules/@blocksuite/blocks/dist/_specs/preset/edgeless-specs.js'),
            };
            return map[id] ?? null;
          },
        },
      ],
      define: {
        // Always inject all VITE_ vars so both CI (process.env) and server (.env file) work
        'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY),
        'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
        'import.meta.env.VITE_FIREBASE_DATABASE_URL': JSON.stringify(env.VITE_FIREBASE_DATABASE_URL),
        'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
        'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
        'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
        'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID),
        'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        },
        // Force a single instance of these packages — BlockSuite sub-packages
        // (block-std, affine-components, etc.) each bundle their own copy of
        // @blocksuite/store and yjs, which breaks constructor identity checks
        // and causes "was already imported" errors at runtime.
        dedupe: [
          // BlockSuite core — one instance shared across all sub-packages
          '@blocksuite/store',
          '@blocksuite/block-std',
          '@blocksuite/global',
          '@blocksuite/sync',
          // affine-components defines Lit custom elements — must share the same
          // LitElement base and @blocksuite/store instance or "Illegal constructor" fires.
          '@blocksuite/affine-components',
          // Lit — all BlockSuite elements extend LitElement from this one copy.
          'lit',
          'lit-html',
          'lit-element',
          '@lit/reactive-element',
          // Signals — same singleton requirement as Lit
          '@preact/signals-core',
          'yjs',
          'y-protocols',
        ],
      },
      optimizeDeps: {
        // @blocksuite/* packages are pure native ESM and must NOT be pre-bundled —
        // doing so creates two separate module instances of @blocksuite/store which
        // breaks LitElement constructor identity → "Illegal constructor" at runtime.
        exclude: [
          '@blocksuite/presets',
          '@blocksuite/store',
          '@blocksuite/blocks',
          '@blocksuite/block-std',
          '@blocksuite/global',
          '@blocksuite/sync',
          '@blocksuite/inline',
          '@blocksuite/affine-components',
          '@blocksuite/affine-shared',
          '@blocksuite/affine-model',
          '@blocksuite/affine-block-surface',
          '@blocksuite/affine-block-list',
          '@blocksuite/affine-block-paragraph',
          '@blocksuite/affine-block-embed',
          '@blocksuite/affine-widget-scroll-anchoring',
          '@blocksuite/data-view',
          '@blocksuite/icons',
          // Deep internal paths used directly (not in package exports map)
          '@blocksuite/presets/dist/editors/page-editor.js',
          '@blocksuite/presets/dist/editors/edgeless-editor.js',
          '@blocksuite/blocks/dist/_specs/preset/page-specs.js',
          '@blocksuite/blocks/dist/_specs/preset/edgeless-specs.js',
        ],
        // Complete list of CJS-only packages transitively imported by @blocksuite/*.
        // Determined by scanning all @blocksuite/*/dist/*.js files for bare imports
        // and checking each package's package.json for ESM indicators (type:module,
        // module field, import condition in exports). These 7 are the only pure-CJS
        // packages — everything else (@preact/signals-core, yjs, y-protocols, lib0,
        // lit, etc.) is already native ESM and does not need explicit include.
        include: [
          // CJS-only packages transitively used by @blocksuite/* (pure ESM, excluded above).
          // Vite never crawls into excluded packages, so their CJS deps must be listed here
          // explicitly so Vite pre-bundles them into proper ESM wrappers.
          'lodash.chunk',
          'lodash.clonedeep',
          'lodash.ismatch',
          'lodash.merge',
          'lodash.mergewith',
          'lz-string',
          'simple-xml-to-json',
          // 'extend' is a pure-CJS package (no type:module, no module field, no exports map).
          // It is a dep of 'unified' (BlockSuite markdown) and Firebase's googleapis-common.
          // Without this entry Vite serves extend/index.js raw and the browser throws:
          //   SyntaxError: does not provide an export named 'default'
          'extend',
          // 'debug' is a pure-CJS package used by micromark (BlockSuite markdown).
          // 'ms' is debug's CJS dependency for time formatting.
          'debug',
          'ms',
        ],
      },
      build: {
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
            feedback: path.resolve(__dirname, 'src/feedback-tool/index.tsx')
          },
          output: {
            entryFileNames: assetInfo => {
              return assetInfo.name === 'feedback' ? 'feedback.js' : 'assets/[name]-[hash].js'
            },
            chunkFileNames: `assets/[name]-[hash].js`,
            assetFileNames: (assetInfo) => {
              if (assetInfo.name && (assetInfo.name === 'feedback.css' || assetInfo.name === 'index.css')) {
                 return 'feedback.css'; 
              }
              return `assets/[name]-[hash].[ext]`;
            }
          }
        }
      }
    };
});
