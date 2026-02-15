import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Debug logging
    console.log('[Vite Config] mode:', mode);
    console.log('[Vite Config] process.env.CI:', process.env.CI);
    console.log('[Vite Config] process.env.GITHUB_ACTIONS:', process.env.GITHUB_ACTIONS);
    console.log('[Vite Config] process.env.NODE_ENV:', process.env.NODE_ENV);

    // In production (CI/CD), use process.env (from GitHub Secrets)
    // In development, load from .env files
    // Check if we have Firebase env vars directly available (from GitHub Actions)
    const hasFirebaseEnvVars = !!(process.env.VITE_FIREBASE_PROJECT_ID);
    const isCI = hasFirebaseEnvVars || process.env.CI || process.env.GITHUB_ACTIONS;

    console.log('[Vite Config] hasFirebaseEnvVars:', hasFirebaseEnvVars);
    console.log('[Vite Config] isCI:', isCI);

    const env = mode === 'production' && isCI
      ? process.env
      : loadEnv(mode, '.', '');

    console.log('[Vite Config] Using env source:', mode === 'production' && isCI ? 'process.env (CI)' : 'loadEnv (local)');
    return {
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
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // Firebase environment variables for build-time replacement
        'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY),
        'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
        'import.meta.env.VITE_FIREBASE_DATABASE_URL': JSON.stringify(env.VITE_FIREBASE_DATABASE_URL),
        'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
        'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
        'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
        'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID)
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
