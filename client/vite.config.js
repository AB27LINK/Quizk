import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname),
  publicDir: path.resolve(__dirname, 'public'),
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    // Vercel serves static assets from the project-level public/ directory.
    // Keep the local Express build output in client/dist for npm start.
    outDir: process.env.VERCEL ? path.resolve(__dirname, '../public') : path.resolve(__dirname, 'dist'),
    emptyOutDir: true
  }
});

