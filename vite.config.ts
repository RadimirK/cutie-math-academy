import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages serves the site from /<repo-name>/. The deploy workflow sets VITE_BASE.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  server: {
    fs: { allow: ['.'] },
  },
  worker: { format: 'es' },
});
