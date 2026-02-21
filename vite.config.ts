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
      plugins: [react()],
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
        }
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
