import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const root = path.resolve(__dirname)

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
    },
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  ssr: {
    noExternal: [],
    external: ['pdfjs-dist'],
  },
  server: {
    port: 5173,
    strictPort: false,
    watch: {
      // Chokidar patterns — use ** globs, not path.resolve strings
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**',
        '**/.env',
        '**/.env.local',
        '**/.env.*',
        '**/vite.config.ts',
        '**/vite.config.js',
        '**/tsconfig.json',
        '**/tsconfig.app.json',
        '**/tsconfig.node.json',
        '**/package-lock.json',
        '**/package.json',
      ],
    },
  },
})
