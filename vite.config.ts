/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` genera la app normal en dist/ (para GitHub Pages u otro hosting).
// `npm run build:single` genera un único index.html autocontenido en dist-single/.
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    plugins: single ? [react(), viteSingleFile()] : [react()],
    define: {
      __SINGLE_FILE__: JSON.stringify(single),
    },
    build: {
      outDir: single ? 'dist-single' : 'dist',
    },
    test: {
      include: ['src/**/*.test.ts'],
    },
  };
});
