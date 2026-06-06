import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the built app can be hosted from any static path
// (GitHub Pages project sites, subfolders, file servers, etc.).
export default defineConfig({
  base: './',
  plugins: [react()],
})
